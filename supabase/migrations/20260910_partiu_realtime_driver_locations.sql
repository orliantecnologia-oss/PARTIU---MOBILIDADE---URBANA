-- ==============================================================================
-- 🛰️ PARTIU REALTIME DRIVER LOCATIONS — UNIFIED POSTGIS TELEMETRY
-- ==============================================================================
-- Tabela canônica de telemetria de alta frequência para rastreamento em tempo real
-- Padrão Uber/99: Suporta pings de 3s a 15s, índices espaciais GiST,
-- e compatibilidade bidirecional com a esteira de despacho (active_drivers).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA CANÔNICA DE TELEMETRIA EM TEMPO REAL
CREATE TABLE IF NOT EXISTS public.driver_locations (
  driver_id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION NOT NULL DEFAULT 0,
  speed DOUBLE PRECISION NOT NULL DEFAULT 0,
  accuracy DOUBLE PRECISION NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (
    status IN ('OFFLINE', 'ONLINE', 'AVAILABLE', 'HEADING_TO_PICKUP', 'WAITING_PASSENGER', 'IN_PROGRESS', 'ONLINE_IDLE', 'ONLINE_MOVING', 'ON_TRIP')
  ),
  category TEXT NOT NULL DEFAULT 'CARRO',
  current_ride_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Coluna PostGIS gerada automaticamente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_locations' AND column_name = 'location'
  ) THEN
    ALTER TABLE public.driver_locations
    ADD COLUMN location geography(Point, 4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED;
  END IF;
END $$;

-- 2. ÍNDICES ESPACIAIS E DE CONSULTA ULTRA-RÁPIDA
CREATE INDEX IF NOT EXISTS idx_driver_locations_gist 
  ON public.driver_locations USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_driver_locations_status_cat 
  ON public.driver_locations (status, category, updated_at);

CREATE INDEX IF NOT EXISTS idx_driver_locations_tenant 
  ON public.driver_locations (tenant_id);

-- 3. HABILITAÇÃO NO SUPABASE REALTIME
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- 4. SEGURANÇA E RLS
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_locations_public_read"
  ON public.driver_locations FOR SELECT
  USING (true);

CREATE POLICY "driver_locations_write"
  ON public.driver_locations FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. RPC CANÔNICA DE TELEMETRIA: upsert_driver_location
-- Atualiza simultaneamente driver_locations e active_drivers para compatibilidade 100%
CREATE OR REPLACE FUNCTION public.upsert_driver_location(
  p_driver_id TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_heading DOUBLE PRECISION DEFAULT 0,
  p_speed DOUBLE PRECISION DEFAULT 0,
  p_status TEXT DEFAULT 'AVAILABLE',
  p_category TEXT DEFAULT 'CARRO',
  p_subscription_plan TEXT DEFAULT 'FREE',
  p_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  p_accuracy DOUBLE PRECISION DEFAULT 10,
  p_ride_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 5.1. Atualiza a tabela canônica de telemetria rápida
  INSERT INTO public.driver_locations (
    driver_id, tenant_id, latitude, longitude, heading, speed, accuracy,
    status, category, current_ride_id, updated_at
  )
  VALUES (
    p_driver_id, p_tenant_id, p_lat, p_lng, p_heading, p_speed, p_accuracy,
    p_status, p_category, p_ride_id, NOW()
  )
  ON CONFLICT (driver_id) DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    heading = EXCLUDED.heading,
    speed = EXCLUDED.speed,
    accuracy = EXCLUDED.accuracy,
    status = EXCLUDED.status,
    category = EXCLUDED.category,
    current_ride_id = EXCLUDED.current_ride_id,
    updated_at = NOW();

  -- 5.2. Se a tabela active_drivers existir, sincroniza para a esteira de matching
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'active_drivers') THEN
    INSERT INTO public.active_drivers (
      driver_id, tenant_id, category, status, subscription_plan,
      lat, lng, heading, speed, last_seen_at, updated_at
    )
    VALUES (
      p_driver_id, p_tenant_id, p_category,
      CASE 
        WHEN p_status IN ('OFFLINE') THEN 'OFFLINE'
        WHEN p_status IN ('HEADING_TO_PICKUP', 'IN_PROGRESS', 'ON_TRIP') THEN 'ON_TRIP'
        WHEN p_speed >= 3 THEN 'ONLINE_MOVING'
        ELSE 'ONLINE_IDLE'
      END,
      p_subscription_plan,
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
  END IF;
END;
$$;
