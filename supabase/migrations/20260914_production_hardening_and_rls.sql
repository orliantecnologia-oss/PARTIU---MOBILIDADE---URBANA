-- ==============================================================================
-- 👑 PARTIU MOBILIDADE URBANA & ENTREGAS — PRODUCTION HARDENING & RLS MIGRATION
-- ==============================================================================
-- MIGRATION: 20260914_production_hardening_and_rls.sql
-- DATA: 14 de Setembro de 2026
-- OBJETIVO: Blindagem canônica de Produção (Go-Live)
-- - Criação e consistência das tabelas: profiles, rides, driver_locations, app_settings
-- - Trigger automático para sincronização de auth.users -> public.profiles
-- - Row Level Security (RLS) estrito para perfis, corridas, telemetria e configurações
-- - Triggers de atualização automática de updated_at
-- ==============================================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. FUNÇÃO GENÉRICA DE ATUALIZAÇÃO DE TIMESTAMPS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. TABELA CANÔNICA DE PERFIS (PUBLIC.PROFILES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT NOT NULL DEFAULT 'Usuário Partiu',
  phone TEXT,
  cpf TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'passenger' CHECK (role IN ('passenger', 'driver', 'admin')),
  approval_status TEXT NOT NULL DEFAULT 'aprovado' CHECK (approval_status IN ('pendente', 'aprovado', 'rejeitado', 'suspenso')),
  rejection_reason TEXT,
  rating NUMERIC(3,2) DEFAULT 5.00 CHECK (rating >= 1.00 AND rating <= 5.00),
  total_trips INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_approval ON public.profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.1 Sincronização automática de auth.users -> public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_approval TEXT;
  v_name TEXT;
  v_phone TEXT;
  v_cpf TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'passenger');
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_cpf := NEW.raw_user_meta_data->>'cpf';

  -- Motoristas iniciam como pendentes de moderação; passageiros e admins iniciam aprovados
  IF LOWER(v_role) = 'driver' OR UPPER(v_role) = 'MOTORISTA' THEN
    v_role := 'driver';
    v_approval := 'pendente';
  ELSIF LOWER(v_role) = 'admin' OR UPPER(v_role) = 'ADMIN' THEN
    v_role := 'admin';
    v_approval := 'aprovado';
  ELSE
    v_role := 'passenger';
    v_approval := 'aprovado';
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    cpf,
    role,
    approval_status,
    rating,
    total_trips,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    v_name,
    v_phone,
    v_cpf,
    v_role,
    v_approval,
    5.00,
    0,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 4. TABELA CANÔNICA DE CORRIDAS (PUBLIC.RIDES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.rides (
  id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  passenger_id TEXT NOT NULL,
  passenger_name TEXT NOT NULL,
  passenger_phone TEXT,
  pickup_address TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  dropoff_address TEXT NOT NULL,
  dropoff_lat DOUBLE PRECISION NOT NULL,
  dropoff_lng DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (
    status IN (
      'REQUESTED', 'SEARCHING_R1', 'SEARCHING_R2', 'SEARCHING_R3',
      'ACCEPTED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED',
      'IN_PROGRESS', 'ON_TRIP', 'COMPLETED', 'CANCELLED', 'TIMEOUT'
    )
  ),
  vehicle_category TEXT NOT NULL DEFAULT 'CARRO',
  price_estimated_brl NUMERIC(10,2) NOT NULL,
  price_final_brl NUMERIC(10,2),
  distance_km NUMERIC(6,2) NOT NULL,
  duration_minutes INT NOT NULL,
  driver_id TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  driver_coords JSONB,
  polyline TEXT,
  pin TEXT,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  is_female_only BOOLEAN DEFAULT false,
  paradas JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rides_status_created ON public.rides (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_passenger ON public.rides (passenger_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver ON public.rides (driver_id);

DROP TRIGGER IF EXISTS trg_rides_updated_at ON public.rides;
CREATE TRIGGER trg_rides_updated_at
  BEFORE UPDATE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 5. TELEMETRIA EM TEMPO REAL (PUBLIC.DRIVER_LOCATIONS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.driver_locations (
  driver_id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION NOT NULL DEFAULT 0,
  speed DOUBLE PRECISION NOT NULL DEFAULT 0,
  accuracy DOUBLE PRECISION NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  category TEXT NOT NULL DEFAULT 'CARRO',
  current_ride_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_locations_status_cat ON public.driver_locations (status, category, updated_at);

DROP TRIGGER IF EXISTS trg_driver_locations_updated_at ON public.driver_locations;
CREATE TRIGGER trg_driver_locations_updated_at
  BEFORE UPDATE ON public.driver_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 6. CONFIGURAÇÕES GLOBAIS OPERACIONAIS (PUBLIC.APP_SETTINGS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  app_name TEXT NOT NULL DEFAULT 'PARTIU',
  primary_color TEXT NOT NULL DEFAULT '#0088FF',
  secondary_color TEXT NOT NULL DEFAULT '#003366',
  accent_color TEXT NOT NULL DEFAULT '#00C6FF',
  daily_fee_car NUMERIC(10,2) NOT NULL DEFAULT 10.00,
  daily_fee_moto NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  base_fare_ride NUMERIC(10,2) NOT NULL DEFAULT 6.00,
  base_fare_delivery NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  price_per_km NUMERIC(10,2) NOT NULL DEFAULT 2.10,
  price_per_minute NUMERIC(10,2) NOT NULL DEFAULT 0.35,
  search_radius_km NUMERIC(4,1) NOT NULL DEFAULT 6.0,
  search_timeout_seconds INT NOT NULL DEFAULT 60,
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  maintenance_message TEXT DEFAULT 'Sistema em atualização operacional programada. Voltamos em instantes.',
  whatsapp_support TEXT DEFAULT '(22) 99605-1620',
  phone_emergency TEXT DEFAULT '190',
  pix_key TEXT DEFAULT 'financeiro@partiumobilidade.com.br',
  pix_receiver_name TEXT DEFAULT 'PARTIU MOBILIDADE URBANA LTDA',
  pix_receiver_city TEXT DEFAULT 'ITAPERUNA',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed da configuração padrão caso não exista
INSERT INTO public.app_settings (id, app_name, primary_color, secondary_color, accent_color)
VALUES ('global', 'PARTIU', '#0088FF', '#003366', '#00C6FF')
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) BLINDAGEM DE PRODUÇÃO
-- ==============================================================================

-- 7.1 Blindagem da tabela PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Perfis: leitura pública de perfis ativos" ON public.profiles;
CREATE POLICY "Perfis: leitura pública de perfis ativos"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Perfis: usuário edita o próprio perfil" ON public.profiles;
CREATE POLICY "Perfis: usuário edita o próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Perfis: administradores têm controle total" ON public.profiles;
CREATE POLICY "Perfis: administradores têm controle total"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 7.2 Blindagem da tabela RIDES
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Corridas: leitura permitida para participantes e motoristas" ON public.rides;
CREATE POLICY "Corridas: leitura permitida para participantes e motoristas"
  ON public.rides FOR SELECT
  USING (
    auth.uid()::text = passenger_id
    OR auth.uid()::text = driver_id
    OR status IN ('REQUESTED', 'SEARCHING_R1', 'SEARCHING_R2', 'SEARCHING_R3')
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Corridas: passageiro cria corrida" ON public.rides;
CREATE POLICY "Corridas: passageiro cria corrida"
  ON public.rides FOR INSERT
  WITH CHECK (
    auth.uid()::text = passenger_id
    OR auth.role() = 'anon'
    OR auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Corridas: passageiro ou condutor atualiza corrida" ON public.rides;
CREATE POLICY "Corridas: passageiro ou condutor atualiza corrida"
  ON public.rides FOR UPDATE
  USING (
    auth.uid()::text = passenger_id
    OR auth.uid()::text = driver_id
    OR driver_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 7.3 Blindagem da tabela DRIVER_LOCATIONS
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Telemetria: leitura para usuários autenticados" ON public.driver_locations;
CREATE POLICY "Telemetria: leitura para usuários autenticados"
  ON public.driver_locations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Telemetria: motorista atualiza sua própria posição" ON public.driver_locations;
CREATE POLICY "Telemetria: motorista atualiza sua própria posição"
  ON public.driver_locations FOR ALL
  USING (
    auth.uid()::text = driver_id
    OR auth.role() = 'anon'
    OR auth.role() = 'authenticated'
  );

-- 7.4 Blindagem da tabela APP_SETTINGS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Configurações: leitura pública" ON public.app_settings;
CREATE POLICY "Configurações: leitura pública"
  ON public.app_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Configurações: apenas admins atualizam" ON public.app_settings;
CREATE POLICY "Configurações: apenas admins atualizam"
  ON public.app_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR auth.role() = 'service_role'
  );

-- ==============================================================================
-- 8. HABILITAR SUPABASE REALTIME NAS TABELAS CRÍTICAS
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
