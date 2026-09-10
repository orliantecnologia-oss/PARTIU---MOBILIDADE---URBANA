-- ==============================================================================
-- 🚀 PARTIU DISPATCH ENGINE V4 — PROGRESSIVE RADIUS EXPANSION & STATE MACHINE
-- ==============================================================================
-- Arquitetura PostGIS de Despacho em Ondas Progressivas (R1 2km -> R2 4km -> R3 6km)
-- com Máquina de Estados Estrita, Validação de Diária Ativa e Fast Recovery.
-- Padrão de Engenharia: Uber Apollo / 99 Matching.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA PRINCIPAL DE CORRIDAS (RIDES) COM MÁQUINA DE ESTADOS EXPLÍCITA
CREATE TABLE IF NOT EXISTS public.rides (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  passenger_id VARCHAR(64) NOT NULL DEFAULT 'guest-passenger',
  passenger_name TEXT NOT NULL DEFAULT 'Passageiro',
  passenger_phone TEXT DEFAULT '',
  driver_id VARCHAR(64) DEFAULT NULL,
  
  -- Categorias estritas oficiais: MOTO ou CARRO
  category VARCHAR(32) NOT NULL DEFAULT 'CARRO' CHECK (
    category IN ('MOTO', 'CARRO', 'PARTIU_MOTO', 'PARTIU_CARRO', 'POP')
  ),
  
  -- Máquina de Estados Canônica
  status VARCHAR(32) NOT NULL DEFAULT 'REQUESTED' CHECK (
    status IN (
      'REQUESTED',
      'SEARCHING_R1',
      'SEARCHING_R2',
      'SEARCHING_R3',
      'DRIVER_ASSIGNED',
      'DRIVER_ARRIVING',
      'IN_PROGRESS',
      'COMPLETED',
      'TIMEOUT',
      'CANCELLED'
    )
  ),
  
  -- Ondas Progressivas de Busca
  current_wave INTEGER NOT NULL DEFAULT 1 CHECK (current_wave IN (1, 2, 3)),
  current_radius_meters DOUBLE PRECISION NOT NULL DEFAULT 2000.0,
  
  -- Coordenadas e Geometrias PostGIS
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  pickup_address TEXT NOT NULL,
  destination_lat DOUBLE PRECISION NOT NULL,
  destination_lng DOUBLE PRECISION NOT NULL,
  destination_address TEXT NOT NULL,
  
  -- FinOps e Tarifa
  fare_brl NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  distance_km NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  payment_method VARCHAR(16) NOT NULL DEFAULT 'pix' CHECK (payment_method IN ('pix', 'dinheiro', 'cartao')),
  
  -- Cascata de Despacho e Exclusão de Rejeitados
  offered_driver_id VARCHAR(64) DEFAULT NULL,
  offered_at TIMESTAMPTZ DEFAULT NULL,
  offer_expires_at TIMESTAMPTZ DEFAULT NULL,
  rejected_driver_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  
  -- Timestamps de Controle
  search_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  wave_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ DEFAULT NULL,
  cancelled_at TIMESTAMPTZ DEFAULT NULL,
  cancellation_reason TEXT DEFAULT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Coluna PostGIS gerada para geolocalização do embarque
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rides' AND column_name = 'pickup_location'
  ) THEN
    ALTER TABLE public.rides
    ADD COLUMN pickup_location geography(Point, 4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(pickup_lng, pickup_lat), 4326)::geography) STORED;
  END IF;
END $$;

-- Índices de Alta Performance para rides
CREATE INDEX IF NOT EXISTS idx_rides_status_wave ON public.rides(status, current_wave);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON public.rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_pickup_location_gist ON public.rides USING GIST(pickup_location);

-- 2. FUNÇÃO RPC: BUSCA PROGRESSIVA DE MOTORISTAS (dispatch_find_progressive_drivers)
CREATE OR REPLACE FUNCTION public.dispatch_find_progressive_drivers(
  p_pickup_lat DOUBLE PRECISION,
  p_pickup_lng DOUBLE PRECISION,
  p_category TEXT DEFAULT 'CARRO',
  p_wave INTEGER DEFAULT 1,
  p_radius_meters DOUBLE PRECISION DEFAULT 2000,
  p_exclude_driver_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  driver_id TEXT,
  name TEXT,
  phone TEXT,
  avatar_url TEXT,
  vehicle_model TEXT,
  license_plate TEXT,
  category TEXT,
  status TEXT,
  subscription_plan TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  rating NUMERIC,
  acceptance_rate NUMERIC,
  cancellation_rate NUMERIC,
  distance_meters DOUBLE PRECISION,
  eta_minutes INTEGER,
  dispatch_score DOUBLE PRECISION,
  wave_tier INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_passenger_geo geography := ST_SetSRID(ST_MakePoint(p_pickup_lng, p_pickup_lat), 4326)::geography;
  v_effective_radius DOUBLE PRECISION;
BEGIN
  IF p_radius_meters IS NOT NULL AND p_radius_meters > 0 THEN
    v_effective_radius := p_radius_meters;
  ELSIF p_wave = 1 THEN
    v_effective_radius := 2000.0;
  ELSIF p_wave = 2 THEN
    v_effective_radius := 4000.0;
  ELSE
    v_effective_radius := 6000.0;
  END IF;

  RETURN QUERY
  WITH eligible_drivers AS (
    SELECT
      ad.driver_id,
      ad.name,
      ad.phone,
      ad.avatar_url,
      ad.vehicle_model,
      ad.license_plate,
      ad.category,
      ad.status,
      ad.subscription_plan,
      ad.lat,
      ad.lng,
      ad.heading,
      ad.speed,
      ad.rating,
      ad.acceptance_rate,
      ad.cancellation_rate,
      ST_Distance(ad.location, v_passenger_geo) AS dist_m,
      GREATEST(1, CEIL((ST_Distance(ad.location, v_passenger_geo) / 400.0)))::INTEGER AS eta_min,
      CASE ad.subscription_plan
        WHEN 'OURO' THEN 1.0
        WHEN 'PRATA' THEN 0.7
        WHEN 'BRONZE' THEN 0.4
        ELSE 0.2
      END AS plan_weight
    FROM public.active_drivers ad
    WHERE
      ad.status IN ('ONLINE_IDLE', 'ONLINE_MOVING')
      AND ad.last_seen_at >= NOW() - INTERVAL '60 seconds'
      AND (ad.tenant_id = p_tenant_id OR p_tenant_id = '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        ad.category = p_category
        OR (p_category IN ('CARRO', 'POP', 'PARTIU_CARRO') AND ad.category IN ('PARTIU_CARRO', 'CARRO', 'POP'))
        OR (p_category IN ('MOTO', 'PARTIU_MOTO') AND ad.category IN ('PARTIU_MOTO', 'MOTO'))
      )
      AND NOT (ad.driver_id = ANY(p_exclude_driver_ids))
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.driver_subscriptions ds 
          WHERE ds.driver_id = ad.driver_id
        )
        OR EXISTS (
          SELECT 1 FROM public.driver_subscriptions ds
          WHERE ds.driver_id = ad.driver_id
            AND ds.status IN ('ACTIVE', 'TRIAL', 'GRACE_PERIOD')
            AND ds.expires_at > NOW()
            AND ds.accumulated_debt <= 0
        )
      )
      AND ST_DWithin(ad.location, v_passenger_geo, v_effective_radius)
  )
  SELECT
    ed.driver_id,
    ed.name,
    ed.phone,
    ed.avatar_url,
    ed.vehicle_model,
    ed.license_plate,
    ed.category,
    ed.status,
    ed.subscription_plan,
    ed.lat,
    ed.lng,
    ed.heading,
    ed.speed,
    ed.rating,
    ed.acceptance_rate,
    ed.cancellation_rate,
    ROUND(ed.dist_m::numeric, 1)::DOUBLE PRECISION AS distance_meters,
    ed.eta_min AS eta_minutes,
    ROUND((
      (GREATEST(0, (1.0 - (ed.dist_m / v_effective_radius))) * 40.0) +
      (GREATEST(0, (1.0 - (ed.eta_min / 30.0))) * 25.0) +
      (ed.plan_weight * 15.0) +
      ((ed.acceptance_rate / 100.0) * 10.0) +
      ((ed.rating / 5.0) * 5.0) +
      (GREATEST(0, (1.0 - (ed.cancellation_rate / 100.0))) * 5.0)
    )::numeric, 2)::DOUBLE PRECISION AS dispatch_score,
    p_wave AS wave_tier
  FROM eligible_drivers ed
  ORDER BY ed.dist_m ASC, dispatch_score DESC
  LIMIT p_limit;
END;
$$;

-- 3. FUNÇÃO RPC: AVANÇO ATÔMICO DE ONDA (dispatch_advance_wave)
CREATE OR REPLACE FUNCTION public.dispatch_advance_wave(
  p_ride_id VARCHAR(64),
  p_max_wave3_radius_meters DOUBLE PRECISION DEFAULT 6000.0
)
RETURNS TABLE (
  ride_id VARCHAR(64),
  new_status VARCHAR(32),
  new_wave INTEGER,
  new_radius_meters DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ride RECORD;
  v_next_status VARCHAR(32);
  v_next_wave INTEGER;
  v_next_radius DOUBLE PRECISION;
BEGIN
  SELECT * INTO v_ride FROM public.rides WHERE id = p_ride_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Corrida % não encontrada', p_ride_id;
  END IF;
  
  IF v_ride.status NOT IN ('REQUESTED', 'SEARCHING_R1', 'SEARCHING_R2', 'SEARCHING_R3') THEN
    RETURN QUERY SELECT v_ride.id, v_ride.status, v_ride.current_wave, v_ride.current_radius_meters;
    RETURN;
  END IF;

  IF v_ride.status = 'REQUESTED' OR v_ride.status = 'SEARCHING_R1' THEN
    v_next_status := 'SEARCHING_R2';
    v_next_wave := 2;
    v_next_radius := 4000.0;
  ELSIF v_ride.status = 'SEARCHING_R2' THEN
    v_next_status := 'SEARCHING_R3';
    v_next_wave := 3;
    v_next_radius := COALESCE(p_max_wave3_radius_meters, 6000.0);
  ELSE
    v_next_status := 'TIMEOUT';
    v_next_wave := 3;
    v_next_radius := v_ride.current_radius_meters;
  END IF;

  UPDATE public.rides
  SET
    status = v_next_status,
    current_wave = v_next_wave,
    current_radius_meters = v_next_radius,
    wave_updated_at = NOW(),
    updated_at = NOW()
  WHERE id = p_ride_id;

  RETURN QUERY SELECT p_ride_id, v_next_status, v_next_wave, v_next_radius;
END;
$$;

-- 4. FUNÇÃO RPC: FAST RECOVERY (dispatch_check_fast_recovery)
CREATE OR REPLACE FUNCTION public.dispatch_check_fast_recovery(
  p_ride_id VARCHAR(64),
  p_search_radius_meters DOUBLE PRECISION DEFAULT 6000.0
)
RETURNS TABLE (
  available BOOLEAN,
  driver_id TEXT,
  driver_name TEXT,
  category TEXT,
  distance_meters DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ride RECORD;
BEGIN
  SELECT * INTO v_ride FROM public.rides WHERE id = p_ride_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::DOUBLE PRECISION;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    TRUE AS available,
    ad.driver_id,
    ad.name AS driver_name,
    ad.category,
    ROUND(ST_Distance(ad.location, v_ride.pickup_location)::numeric, 1)::DOUBLE PRECISION AS distance_meters
  FROM public.active_drivers ad
  WHERE
    ad.status IN ('ONLINE_IDLE', 'ONLINE_MOVING')
    AND ad.last_seen_at >= NOW() - INTERVAL '60 seconds'
    AND (
      ad.category = v_ride.category
      OR (v_ride.category IN ('CARRO', 'POP') AND ad.category IN ('PARTIU_CARRO', 'CARRO', 'POP'))
      OR (v_ride.category = 'MOTO' AND ad.category IN ('PARTIU_MOTO', 'MOTO'))
    )
    AND ST_DWithin(ad.location, v_ride.pickup_location, p_search_radius_meters)
  ORDER BY ST_Distance(ad.location, v_ride.pickup_location) ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::DOUBLE PRECISION;
  END IF;
END;
$$;

-- 5. HABILITA SUPABASE REALTIME NA TABELA RIDES
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;
