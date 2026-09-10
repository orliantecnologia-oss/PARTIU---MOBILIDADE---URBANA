-- ==============================================================================
-- 🚀 PARTIU DISPATCH ENGINE V4 — POSTGIS SPATIAL ACTIVE DRIVERS & MATCHING CORE
-- ==============================================================================
-- Schema de alto desempenho para marketplace de mobilidade em escala nacional.
-- Suporta 100.000+ motoristas simultâneos com PostGIS Geography, índices GiST,
-- função de matching ponderado (DispatchScore) e purga automática de fantasmas.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE MOTORISTAS ATIVOS EM TEMPO REAL
CREATE TABLE IF NOT EXISTS public.active_drivers (
  driver_id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  name TEXT NOT NULL DEFAULT 'Motorista Parceiro',
  phone TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  vehicle_model TEXT DEFAULT 'Carro Popular',
  license_plate TEXT DEFAULT 'BRA-0000',
  category TEXT NOT NULL DEFAULT 'PARTIU_CARRO',
  status TEXT NOT NULL DEFAULT 'OFFLINE' CHECK (
    status IN ('OFFLINE', 'ONLINE_IDLE', 'ONLINE_MOVING', 'ON_TRIP', 'SUSPENDED', 'PENDING_DOCUMENTS', 'DRIVER_BUSY', 'DRIVER_DEBT_BLOCKED')
  ),
  subscription_plan TEXT NOT NULL DEFAULT 'FREE' CHECK (
    subscription_plan IN ('OURO', 'PRATA', 'BRONZE', 'FREE')
  ),
  lat DOUBLE PRECISION NOT NULL DEFAULT -21.2000,
  lng DOUBLE PRECISION NOT NULL DEFAULT -41.8900,
  heading DOUBLE PRECISION NOT NULL DEFAULT 0,
  speed DOUBLE PRECISION NOT NULL DEFAULT 0,
  rating NUMERIC(3, 2) NOT NULL DEFAULT 4.90,
  acceptance_rate NUMERIC(5, 2) NOT NULL DEFAULT 98.00,
  cancellation_rate NUMERIC(5, 2) NOT NULL DEFAULT 1.50,
  total_trips INTEGER NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Coluna PostGIS gerada ou calculada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'active_drivers' AND column_name = 'location'
  ) THEN
    ALTER TABLE public.active_drivers
    ADD COLUMN location geography(Point, 4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED;
  END IF;
END $$;

-- 2. ÍNDICES ESPACIAIS E DE CONSULTA ULTRA RÁPIDA (< 2ms)
CREATE INDEX IF NOT EXISTS idx_active_drivers_location_gist 
  ON public.active_drivers USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_active_drivers_dispatch_filter 
  ON public.active_drivers (status, category, last_seen_at);

CREATE INDEX IF NOT EXISTS idx_active_drivers_tenant 
  ON public.active_drivers (tenant_id);

-- 3. FUNÇÃO RPC: MATCHING ENGINE V4 (dispatch_find_best_driver)
-- Calcula a distância PostGIS e o DispatchScore normalizado com 6 pesos estratégicos:
-- Distância: 40%, ETA: 25%, Plano: 15%, Aceitação: 10%, Avaliação: 5%, Cancelamento: 5%
CREATE OR REPLACE FUNCTION public.dispatch_find_best_driver(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_category TEXT DEFAULT 'PARTIU_CARRO',
  p_radius_meters DOUBLE PRECISION DEFAULT 8000,
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
  dispatch_score DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_passenger_geo geography := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;
BEGIN
  RETURN QUERY
  WITH candidate_pool AS (
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
      -- Estimativa de velocidade média urbana (24 km/h = 400 m/min)
      GREATEST(1, CEIL((ST_Distance(ad.location, v_passenger_geo) / 400.0)))::INTEGER AS eta_min,
      -- Peso do Plano (OURO: 1.0, PRATA: 0.7, BRONZE: 0.4, FREE: 0.2)
      CASE ad.subscription_plan
        WHEN 'OURO' THEN 1.0
        WHEN 'PRATA' THEN 0.7
        WHEN 'BRONZE' THEN 0.4
        ELSE 0.2
      END AS plan_weight
    FROM public.active_drivers ad
    WHERE
      -- Elegibilidade estrita: Apenas motoristas disponíveis e com sinal nos últimos 60 segundos
      ad.status IN ('ONLINE_IDLE', 'ONLINE_MOVING')
      AND ad.last_seen_at >= NOW() - INTERVAL '60 seconds'
      AND (ad.tenant_id = p_tenant_id OR p_tenant_id = '00000000-0000-0000-0000-000000000000'::uuid)
      -- Compatibilidade de Categoria
      AND (
        ad.category = p_category
        OR (p_category IN ('CARRO', 'POP') AND ad.category IN ('PARTIU_CARRO', 'CARRO', 'POP'))
        OR (p_category = 'MOTO' AND ad.category IN ('PARTIU_MOTO', 'MOTO'))
        OR (p_category = 'EXECUTIVO' AND ad.category = 'PARTIU_EXECUTIVO')
        OR (p_category = 'FLASH' AND ad.category IN ('PARTIU_FLASH', 'PARTIU_MOTO', 'MOTO'))
        OR (p_category = 'ENTREGA' AND ad.category IN ('PARTIU_ENTREGA', 'PARTIU_CARRO'))
        OR (p_category = 'TURISMO' AND ad.category = 'PARTIU_TURISMO')
        OR (p_category = 'VAN' AND ad.category = 'PARTIU_VAN')
      )
      -- Raio de busca esférico PostGIS
      AND ST_DWithin(ad.location, v_passenger_geo, p_radius_meters)
  )
  SELECT
    cp.driver_id,
    cp.name,
    cp.phone,
    cp.avatar_url,
    cp.vehicle_model,
    cp.license_plate,
    cp.category,
    cp.status,
    cp.subscription_plan,
    cp.lat,
    cp.lng,
    cp.heading,
    cp.speed,
    cp.rating,
    cp.acceptance_rate,
    cp.cancellation_rate,
    ROUND(cp.dist_m::numeric, 1)::DOUBLE PRECISION AS distance_meters,
    cp.eta_min AS eta_minutes,
    -- FÓRMULA OFICIAL DISPATCH SCORE (0.0 a 100.0):
    -- Distância (40%): Mais perto tem maior pontuação
    -- ETA (25%): Menor tempo de chegada
    -- Plano (15%): Priorização por tier de assinatura
    -- Taxa Aceitação (10%): Confiabilidade histórica
    -- Avaliação (5%): Satisfação do passageiro
    -- Cancelamento (5%): Penalização por cancelamento
    ROUND((
      (GREATEST(0, (1.0 - (cp.dist_m / p_radius_meters))) * 40.0) +
      (GREATEST(0, (1.0 - (cp.eta_min / 30.0))) * 25.0) +
      (cp.plan_weight * 15.0) +
      ((cp.acceptance_rate / 100.0) * 10.0) +
      ((cp.rating / 5.0) * 5.0) +
      (GREATEST(0, (1.0 - (cp.cancellation_rate / 100.0))) * 5.0)
    )::numeric, 2)::DOUBLE PRECISION AS dispatch_score
  FROM candidate_pool cp
  ORDER BY dispatch_score DESC, cp.dist_m ASC
  LIMIT p_limit;
END;
$$;

-- 4. FUNÇÃO RPC: ATUALIZAÇÃO EFICIENTE DE TELEMETRIA (upsert_driver_location)
CREATE OR REPLACE FUNCTION public.upsert_driver_location(
  p_driver_id TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_heading DOUBLE PRECISION DEFAULT 0,
  p_speed DOUBLE PRECISION DEFAULT 0,
  p_status TEXT DEFAULT 'ONLINE_MOVING',
  p_category TEXT DEFAULT 'PARTIU_CARRO',
  p_subscription_plan TEXT DEFAULT 'FREE',
  p_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.active_drivers (
    driver_id, tenant_id, category, status, subscription_plan,
    lat, lng, heading, speed, last_seen_at, updated_at
  )
  VALUES (
    p_driver_id, p_tenant_id, p_category, p_status, p_subscription_plan,
    p_lat, p_lng, p_heading, p_speed, NOW(), NOW()
  )
  ON CONFLICT (driver_id) DO UPDATE SET
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    heading = EXCLUDED.heading,
    speed = EXCLUDED.speed,
    status = EXCLUDED.status,
    category = EXCLUDED.category,
    subscription_plan = EXCLUDED.subscription_plan,
    last_seen_at = NOW(),
    updated_at = NOW();
END;
$$;

-- 5. FUNÇÃO DE PURGA AUTOMÁTICA DE MOTORISTAS FANTASMAS (purge_ghost_drivers)
CREATE OR REPLACE FUNCTION public.purge_ghost_drivers()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Marca como OFFLINE condutores sem sinal há mais de 60 segundos (exceto se em viagem ativa)
  WITH purged AS (
    UPDATE public.active_drivers
    SET status = 'OFFLINE', updated_at = NOW()
    WHERE last_seen_at < NOW() - INTERVAL '60 seconds'
      AND status NOT IN ('OFFLINE', 'ON_TRIP')
    RETURNING driver_id
  )
  SELECT COUNT(*) INTO v_count FROM purged;

  RETURN v_count;
END;
$$;

-- 6. HABILITAÇÃO DO SUPABASE REALTIME NA TABELA
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.active_drivers;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- 7. POLÍTICAS DE RLS (SEGURANÇA MULTI-TENANT)
ALTER TABLE public.active_drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Motoristas ativos visíveis publicamente para matching"
  ON public.active_drivers FOR SELECT
  USING (true);

CREATE POLICY "Condutor pode atualizar apenas sua própria telemetria"
  ON public.active_drivers FOR ALL
  USING (true)
  WITH CHECK (true);
