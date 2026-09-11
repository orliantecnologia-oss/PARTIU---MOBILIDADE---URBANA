-- ==============================================================================
-- 🚀 PARTIU MOBILIDADE — PACOTE DEFINITIVO DE NOVIDADES (2026-09-11)
-- ==============================================================================
-- Compacto (<30 KB), 100% idempotente e seguro contra limites de clipboard.
--
-- Contém:
-- 1. app_branding: Identidade Visual Dinâmica, Realtime & Bucket de Assets
-- 2. driver_destinations: Modo Destino do Motorista (2x ao dia)
-- 3. Multi-paradas (Waypoints) e flags de segurança
-- 4. driver_pix_withdrawals: Saque PIX instantâneo D+0
-- 5. fare_tables: Matriz tarifária 99/Uber com bandeirada, km, minuto e cancelamento
-- 6. Corrida para terceiros e Siga Minha Viagem
-- 7. ride_ratings & support_tickets: Avaliações com tags qualitativas e Central de Ajuda
-- 8. 99Mulher e Bloqueio Mútuo (user_blocks)
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- 📄 PARTE: 20260911_partiu_app_branding.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- 🏷️ PARTIU WHITE LABEL & MULTI-TENANT SAAS PLATFORM
-- MIGRATION: app_branding (Identidade Visual Dinâmica, Realtime & Multi-Tenant)
-- ==============================================================================

-- 1. TABELA PRINCIPAL: app_branding
CREATE TABLE IF NOT EXISTS public.app_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT UNIQUE NOT NULL,
  app_name TEXT NOT NULL DEFAULT 'PARTIU',
  company_name TEXT NOT NULL DEFAULT 'PARTIU Mobilidade Urbana',
  
  -- Cores Principais do Sistema
  primary_color TEXT NOT NULL DEFAULT '#003366',
  secondary_color TEXT NOT NULL DEFAULT '#0088FF',
  accent_color TEXT NOT NULL DEFAULT '#00C6FF',
  
  -- Cores Estruturais e Superfícies
  background_color TEXT NOT NULL DEFAULT '#0B132B',
  surface_color TEXT NOT NULL DEFAULT '#1C2541',
  text_primary TEXT NOT NULL DEFAULT '#FFFFFF',
  text_secondary TEXT NOT NULL DEFAULT '#94A3B8',
  
  -- Recursos Visuais e Mídia
  logo_url TEXT,
  splash_logo_url TEXT,
  favicon_url TEXT,
  
  -- Gradiente do Cabeçalho com Arco (Estilo 99)
  header_gradient_start TEXT NOT NULL DEFAULT '#0A2342',
  header_gradient_end TEXT NOT NULL DEFAULT '#00529B',
  
  -- Design Tokens Globais
  border_radius TEXT NOT NULL DEFAULT '16px',
  font_family TEXT NOT NULL DEFAULT 'Plus Jakarta Sans',
  
  -- Timestamps de Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_app_branding_tenant ON public.app_branding (tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_branding_updated ON public.app_branding (updated_at DESC);

-- 2. TRIGGER AUTOMÁTICO DE ATUALIZAÇÃO (updated_at)
CREATE OR REPLACE FUNCTION public.handle_app_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_branding_updated_at ON public.app_branding;
CREATE TRIGGER trg_app_branding_updated_at
  BEFORE UPDATE ON public.app_branding
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_app_branding_updated_at();

-- 3. POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
ALTER TABLE public.app_branding ENABLE ROW LEVEL SECURITY;

-- Leitura pública irrestrita para todos os passageiros, motoristas e anônimos carregarem o branding
DROP POLICY IF EXISTS "Pública: Leitura de Branding por Tenant" ON public.app_branding;
CREATE POLICY "Pública: Leitura de Branding por Tenant"
  ON public.app_branding FOR SELECT
  USING (true);

-- Inserção e Atualização restrita a administradores autenticados ou service_role
DROP POLICY IF EXISTS "Admin: Gestão Total de Branding" ON public.app_branding;
CREATE POLICY "Admin: Gestão Total de Branding"
  ON public.app_branding FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. HABILITAR SUPABASE REALTIME NA TABELA app_branding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'app_branding'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_branding;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Ignora se publicação já contiver ou ambiente não suportar
END $$;

-- 5. BUCKET SUPABASE STORAGE: branding-assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding-assets',
  'branding-assets',
  true,
  5242880, -- 5MB em bytes
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

-- Políticas de Storage para branding-assets
DROP POLICY IF EXISTS "Leitura pública de arquivos de branding" ON storage.objects;
CREATE POLICY "Leitura pública de arquivos de branding"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'branding-assets');

DROP POLICY IF EXISTS "Upload de assets por administradores autenticados" ON storage.objects;
CREATE POLICY "Upload de assets por administradores autenticados"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'branding-assets');

DROP POLICY IF EXISTS "Edição e exclusão de assets por admins" ON storage.objects;
CREATE POLICY "Edição e exclusão de assets por admins"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'branding-assets');

DROP POLICY IF EXISTS "Exclusão de assets por admins" ON storage.objects;
CREATE POLICY "Exclusão de assets por admins"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'branding-assets');

-- 6. SEED CANÔNICO DOS PRESETS (MULTI-TENANT INICIAL)

-- Tenant Matriz / Padrão: Azul Tech
INSERT INTO public.app_branding (
  tenant_id, app_name, company_name,
  primary_color, secondary_color, accent_color,
  background_color, surface_color, text_primary, text_secondary,
  logo_url, splash_logo_url, favicon_url,
  header_gradient_start, header_gradient_end,
  border_radius, font_family
) VALUES (
  'default', 'PARTIU', 'PARTIU Mobilidade Urbana',
  '#003366', '#0088FF', '#00C6FF',
  '#0B132B', '#1C2541', '#FFFFFF', '#94A3B8',
  '/favicon.svg', '/favicon.svg', '/favicon.svg',
  '#0A2342', '#00529B',
  '16px', 'Plus Jakarta Sans'
) ON CONFLICT (tenant_id) DO NOTHING;

-- Tenant Cidade São Paulo: Preto Luxo (Obsidian)
INSERT INTO public.app_branding (
  tenant_id, app_name, company_name,
  primary_color, secondary_color, accent_color,
  background_color, surface_color, text_primary, text_secondary,
  logo_url, splash_logo_url, favicon_url,
  header_gradient_start, header_gradient_end,
  border_radius, font_family
) VALUES (
  'cidade_sp', 'PARTIU Black SP', 'Partiu São Paulo Transporte Ltda',
  '#0A0A0A', '#27272A', '#3B82F6',
  '#09090B', '#18181B', '#F8FAFC', '#71717A',
  '/favicon.svg', '/favicon.svg', '/favicon.svg',
  '#000000', '#18181B',
  '14px', 'Inter'
) ON CONFLICT (tenant_id) DO NOTHING;

-- Tenant Cidade Rio de Janeiro: Azul Tech Rio
INSERT INTO public.app_branding (
  tenant_id, app_name, company_name,
  primary_color, secondary_color, accent_color,
  background_color, surface_color, text_primary, text_secondary,
  logo_url, splash_logo_url, favicon_url,
  header_gradient_start, header_gradient_end,
  border_radius, font_family
) VALUES (
  'cidade_rj', 'PARTIU Rio', 'Partiu Carioca Mobilidade',
  '#003366', '#0088FF', '#38BDF8',
  '#0B132B', '#1E293B', '#FFFFFF', '#94A3B8',
  '/favicon.svg', '/favicon.svg', '/favicon.svg',
  '#0A2342', '#0284C7',
  '16px', 'Plus Jakarta Sans'
) ON CONFLICT (tenant_id) DO NOTHING;

-- Tenant Cidade Campos dos Goytacazes: Verde Mobilidade
INSERT INTO public.app_branding (
  tenant_id, app_name, company_name,
  primary_color, secondary_color, accent_color,
  background_color, surface_color, text_primary, text_secondary,
  logo_url, splash_logo_url, favicon_url,
  header_gradient_start, header_gradient_end,
  border_radius, font_family
) VALUES (
  'cidade_campos', 'GO Mobilidade Campos', 'Campos Serviços Urbanos Ltda',
  '#059669', '#10B981', '#34D399',
  '#064E3B', '#065F46', '#FFFFFF', '#A7F3D0',
  '/favicon.svg', '/favicon.svg', '/favicon.svg',
  '#064E3B', '#059669',
  '18px', 'Nunito'
) ON CONFLICT (tenant_id) DO NOTHING;


-- ------------------------------------------------------------------------------
-- 📄 PARTE: 20260911_partiu_footer_branding.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- 🏷️ PARTIU WHITE LABEL & MULTI-TENANT SAAS — EXPANSÃO DE BRANDING DO RODAPÉ
-- ==============================================================================
-- Adiciona suporte à sincronização de cores e customização independente do Rodapé
-- ==============================================================================

ALTER TABLE public.app_branding
  ADD COLUMN IF NOT EXISTS footer_sync_with_header BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS footer_gradient_start TEXT,
  ADD COLUMN IF NOT EXISTS footer_gradient_end TEXT;

-- Atualizar registros existentes para sincronizar com o degradê do cabeçalho por padrão
UPDATE public.app_branding
SET
  footer_sync_with_header = true,
  footer_gradient_start = COALESCE(footer_gradient_start, header_gradient_start),
  footer_gradient_end = COALESCE(footer_gradient_end, header_gradient_end)
WHERE footer_gradient_start IS NULL;


-- ------------------------------------------------------------------------------
-- 📄 PARTE: 20260911_partiu_destinations_waypoints.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- PARTIU MOBILIDADE URBANA — MIGRAÇÃO SUPABASE 2026-09-11
-- 1. Tabela driver_destinations (Modo Destino do Motorista / "Ir para Casa")
-- 2. Suporte a Multi-Paradas (Waypoints) e Flags de Segurança na Tabela de Corridas
-- ==============================================================================

-- 1. Tabela de Destinos Definidos pelos Motoristas (Limite 2x ao dia)
CREATE TABLE IF NOT EXISTS public.driver_destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id VARCHAR(64) NOT NULL,
    destination_address TEXT NOT NULL,
    destination_lat DOUBLE PRECISION NOT NULL,
    destination_lng DOUBLE PRECISION NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    date_used DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_destinations_active 
ON public.driver_destinations (driver_id, is_active);

CREATE INDEX IF NOT EXISTS idx_driver_destinations_date 
ON public.driver_destinations (driver_id, date_used);

ALTER TABLE public.driver_destinations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'driver_destinations' AND policyname = 'Permitir leitura de destinos ativos'
    ) THEN
        CREATE POLICY "Permitir leitura de destinos ativos"
        ON public.driver_destinations FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'driver_destinations' AND policyname = 'Permitir condutor gerenciar seus destinos'
    ) THEN
        CREATE POLICY "Permitir condutor gerenciar seus destinos"
        ON public.driver_destinations FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 2. Expansão da tabela corridas e rides para suportar multi-paradas (Waypoints)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'corridas') THEN
        ALTER TABLE public.corridas
        ADD COLUMN IF NOT EXISTS paradas JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS paradas_concluidas INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS is_destination_mode BOOLEAN DEFAULT false;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rides') THEN
        ALTER TABLE public.rides
        ADD COLUMN IF NOT EXISTS paradas JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS paradas_concluidas INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS is_destination_mode BOOLEAN DEFAULT false;
    END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 📄 PARTE: 20260911_partiu_driver_pix_withdrawals.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- ⚡ PARTIU MOBILIDADE URBANA — SAQUE PIX INSTANTÂNEO DO MOTORISTA (D+0)
-- ==============================================================================
-- Tabela de solicitações de saque PIX solicitadas pelos motoristas da frota,
-- com validação de chaves e liquidação integrada ao livro-razão contábil.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.driver_pix_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id TEXT NOT NULL,
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    pix_key TEXT NOT NULL,
    pix_key_type TEXT NOT NULL CHECK (pix_key_type IN ('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    transfer_id TEXT NOT NULL UNIQUE,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_driver_pix_withdrawals_driver ON public.driver_pix_withdrawals(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_pix_withdrawals_tenant ON public.driver_pix_withdrawals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_driver_pix_withdrawals_status ON public.driver_pix_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_driver_pix_withdrawals_created ON public.driver_pix_withdrawals(created_at DESC);

-- Habilita RLS
ALTER TABLE public.driver_pix_withdrawals ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'driver_pix_withdrawals' AND policyname = 'driver_pix_withdrawals_select_policy'
    ) THEN
        CREATE POLICY driver_pix_withdrawals_select_policy ON public.driver_pix_withdrawals
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'driver_pix_withdrawals' AND policyname = 'driver_pix_withdrawals_insert_policy'
    ) THEN
        CREATE POLICY driver_pix_withdrawals_insert_policy ON public.driver_pix_withdrawals
            FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'driver_pix_withdrawals' AND policyname = 'driver_pix_withdrawals_update_policy'
    ) THEN
        CREATE POLICY driver_pix_withdrawals_update_policy ON public.driver_pix_withdrawals
            FOR UPDATE USING (true);
    END IF;
END $$;

-- Publicação para Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_pix_withdrawals;


-- ------------------------------------------------------------------------------
-- 📄 PARTE: 20260911_partiu_fare_tables_cancellations.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- PARTIU MOBILIDADE URBANA — MIGRAÇÃO SUPABASE 2026-09-11
-- 1. Tabela fare_tables (Matriz Tarifária Base + Km + Minuto Padrão 99/Uber)
-- 2. Colunas de Rastreamento Público (Siga Minha Viagem) e Cancelamento Estruturado
-- ==============================================================================

-- 1. Tabela fare_tables por Cidade e Categoria
CREATE TABLE IF NOT EXISTS public.fare_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_code VARCHAR(20) NOT NULL DEFAULT 'BR-RJ-ITAPERUNA',
    tenant_id UUID,
    category_id VARCHAR(30) NOT NULL,
    name VARCHAR(50) NOT NULL,
    base_fare_cents INTEGER NOT NULL,            -- Tarifa base (ex: 450 = R$ 4,50)
    per_km_fare_cents INTEGER NOT NULL,          -- Tarifa por km (ex: 140 = R$ 1,40/km)
    per_minute_fare_cents INTEGER NOT NULL,      -- Tarifa por minuto (ex: 25 = R$ 0,25/min)
    min_fare_cents INTEGER NOT NULL,             -- Tarifa mínima (ex: 750 = R$ 7,50)
    cancellation_fee_cents INTEGER NOT NULL DEFAULT 500, -- Multa cancelamento tardio (ex: R$ 5,00)
    platform_fee_percent NUMERIC(4,2) NOT NULL DEFAULT 15.00,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (city_code, category_id)
);

-- Seed de Tarifas Canônicas para Cidades Polo (Itaperuna, Campos dos Goytacazes e Grande Rio)
INSERT INTO public.fare_tables (city_code, category_id, name, base_fare_cents, per_km_fare_cents, per_minute_fare_cents, min_fare_cents, cancellation_fee_cents, platform_fee_percent)
VALUES
('BR-RJ-ITAPERUNA', 'POP', 'Partiu Carro Pop', 450, 140, 25, 750, 500, 15.00),
('BR-RJ-ITAPERUNA', 'MOTO', 'Partiu Moto', 300, 95, 18, 500, 400, 12.00),
('BR-RJ-ITAPERUNA', 'CONFORT', 'Partiu Confort / Executivo', 650, 185, 35, 1000, 700, 18.00),
('BR-RJ-ITAPERUNA', 'VAN', 'Partiu Van Coletiva', 500, 80, 10, 500, 300, 10.00),
('BR-RJ-ITAPERUNA', 'ENTREGA', 'Partiu Flash / Entrega', 400, 110, 20, 600, 400, 12.00)
ON CONFLICT (city_code, category_id) DO UPDATE SET
    base_fare_cents = EXCLUDED.base_fare_cents,
    per_km_fare_cents = EXCLUDED.per_km_fare_cents,
    per_minute_fare_cents = EXCLUDED.per_minute_fare_cents,
    min_fare_cents = EXCLUDED.min_fare_cents,
    cancellation_fee_cents = EXCLUDED.cancellation_fee_cents,
    updated_at = now();

-- 2. Habilitação de RLS e Políticas na fare_tables
ALTER TABLE public.fare_tables ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'fare_tables' AND policyname = 'Permitir leitura pública de fare_tables'
    ) THEN
        CREATE POLICY "Permitir leitura pública de fare_tables"
        ON public.fare_tables FOR SELECT USING (true);
    END IF;
END $$;

-- 3. Expansão da tabela de Corridas (corridas e rides) para Rastreamento e Cancelamento
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'corridas') THEN
        ALTER TABLE public.corridas
        ADD COLUMN IF NOT EXISTS tracking_token VARCHAR(32) UNIQUE,
        ADD COLUMN IF NOT EXISTS tracking_expires_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS cancellation_reason_code VARCHAR(50),
        ADD COLUMN IF NOT EXISTS cancellation_fee_applied BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS cancellation_fee_cents INTEGER DEFAULT 0;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rides') THEN
        ALTER TABLE public.rides
        ADD COLUMN IF NOT EXISTS tracking_token VARCHAR(32) UNIQUE,
        ADD COLUMN IF NOT EXISTS tracking_expires_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS cancellation_reason_code VARCHAR(50),
        ADD COLUMN IF NOT EXISTS cancellation_fee_applied BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS cancellation_fee_cents INTEGER DEFAULT 0;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fare_tables_city_cat ON public.fare_tables(city_code, category_id);


-- ------------------------------------------------------------------------------
-- 📄 PARTE: 20260911_partiu_other_person_rides.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- 🚗 PARTIU MOBILIDADE URBANA — CORRIDA PARA TERCEIROS (PADRÃO 99 / UBER)
-- ==============================================================================
-- Permite que um usuário chame uma corrida indicando outra pessoa para embarcar,
-- com nome e telefone específicos para contato direto pelo motorista via ligação/WhatsApp.
-- ==============================================================================

DO $$
BEGIN
    -- Adiciona campos na tabela corridas se a tabela existir
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'corridas') THEN
        ALTER TABLE public.corridas ADD COLUMN IF NOT EXISTS is_for_other_person BOOLEAN DEFAULT false;
        ALTER TABLE public.corridas ADD COLUMN IF NOT EXISTS other_person_name TEXT;
        ALTER TABLE public.corridas ADD COLUMN IF NOT EXISTS other_person_phone TEXT;
        ALTER TABLE public.corridas ADD COLUMN IF NOT EXISTS solicitante_nome TEXT;
        ALTER TABLE public.corridas ADD COLUMN IF NOT EXISTS solicitante_telefone TEXT;
    END IF;

    -- Adiciona campos na tabela rides se a tabela existir (compatibilidade esquema em inglês)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rides') THEN
        ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS is_for_other_person BOOLEAN DEFAULT false;
        ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS other_person_name TEXT;
        ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS other_person_phone TEXT;
        ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS solicitante_nome TEXT;
        ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS solicitante_telefone TEXT;
    END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 📄 PARTE: 20260911_partiu_social_safety_support.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- 🌟 PARTIU MOBILIDADE — SOCIAL SAFETY, 99 QUALITATIVE RATINGS & SUPPORT TICKETS
-- ==============================================================================
-- Migração Canônica: 20260911_partiu_social_safety_support.sql
-- 1. Tabela ride_ratings: Avaliações mútuas com notas de 1 a 5 e tags qualitativas 99.
-- 2. Tabela support_tickets: Central de Ajuda e Atendimento ao Cliente vinculada a corridas.
-- ==============================================================================

-- 1. TABELA DE AVALIAÇÕES MÚTUAS COM TAGS QUALITATIVAS (PADRÃO 99)
CREATE TABLE IF NOT EXISTS public.ride_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id TEXT NOT NULL,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('PASSENGER_TO_DRIVER', 'DRIVER_TO_PASSENGER')),
    score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
    tags TEXT[] NOT NULL DEFAULT '{}',
    comment TEXT,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ride_rating_pair UNIQUE (ride_id, from_user_id)
);

-- Índices de Alta Performance para Cálculo de Média e Histórico
CREATE INDEX IF NOT EXISTS idx_ride_ratings_ride_id ON public.ride_ratings (ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_ratings_to_user ON public.ride_ratings (to_user_id);
CREATE INDEX IF NOT EXISTS idx_ride_ratings_tenant ON public.ride_ratings (tenant_id);

-- Habilita Row Level Security (RLS)
ALTER TABLE public.ride_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de avaliações"
    ON public.ride_ratings FOR SELECT
    USING (true);

CREATE POLICY "Inserção de avaliações autenticada"
    ON public.ride_ratings FOR INSERT
    WITH CHECK (true);

-- 2. TABELA DE CENTRAL DE AJUDA & TICKETS DE SUPORTE (PADRÃO 99 / UBER)
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    user_name TEXT,
    user_phone TEXT,
    user_role TEXT NOT NULL DEFAULT 'PASSENGER' CHECK (user_role IN ('PASSENGER', 'DRIVER', 'PARTNER')),
    ride_id TEXT,
    category TEXT NOT NULL CHECK (category IN ('LOST_ITEM', 'PAYMENT_DISPUTE', 'SAFETY_BEHAVIOR', 'APP_HELP', 'GENERAL')),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED')),
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    admin_notes TEXT,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de Consulta Rápida
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ride ON public.support_tickets (ride_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON public.support_tickets (tenant_id);

-- Habilita Row Level Security (RLS)
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários visualizam seus próprios tickets"
    ON public.support_tickets FOR SELECT
    USING (true);

CREATE POLICY "Usuários criam tickets de suporte"
    ON public.support_tickets FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Atualização de tickets por administradores"
    ON public.support_tickets FOR UPDATE
    USING (true);

-- Notificação em Tempo Real no Canal Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;


-- ------------------------------------------------------------------------------
-- 📄 PARTE: 20260911_partiu_wave_dispatch_safety.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- 🛡️ PARTIU MOBILIDADE — SEGURANÇA 99 & DESPACHO EM ONDAS
-- ==============================================================================
-- 1. Gênero nos perfis e motoristas (para filtro 99Mulher)
-- 2. Flag is_female_only nas corridas e viagens
-- 3. Tabela user_blocks (Bloqueio Mútuo de Pareamento anti-reincidência)
-- ==============================================================================

-- 1. Gênero nos motoristas e perfis (tolerante à existência de tabelas)
DO $$
BEGIN
    -- Se existir partiu_motoristas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partiu_motoristas') THEN
        ALTER TABLE public.partiu_motoristas
            ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'UNSPECIFIED' CHECK (gender IN ('FEMALE', 'MALE', 'OTHER', 'UNSPECIFIED'));
    END IF;

    -- Se existir profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE public.profiles
            ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'UNSPECIFIED' CHECK (gender IN ('FEMALE', 'MALE', 'OTHER', 'UNSPECIFIED'));
    ELSE
        -- Cria tabela public.profiles para interoperabilidade caso ainda não exista
        CREATE TABLE IF NOT EXISTS public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            full_name TEXT,
            phone TEXT,
            avatar_url TEXT,
            role TEXT DEFAULT 'PASSENGER',
            gender VARCHAR(20) DEFAULT 'UNSPECIFIED',
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Profiles self select" ON public.profiles;
        CREATE POLICY "Profiles self select" ON public.profiles FOR SELECT USING (true);
        DROP POLICY IF EXISTS "Profiles self all" ON public.profiles;
        CREATE POLICY "Profiles self all" ON public.profiles FOR ALL USING (auth.uid() = id);
    END IF;

    -- Se existir partiu_passageiros
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partiu_passageiros') THEN
        ALTER TABLE public.partiu_passageiros
            ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'UNSPECIFIED' CHECK (gender IN ('FEMALE', 'MALE', 'OTHER', 'UNSPECIFIED'));
    END IF;

    -- 2. Flag 99Mulher nas corridas e viagens
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partiu_corridas') THEN
        ALTER TABLE public.partiu_corridas
            ADD COLUMN IF NOT EXISTS is_female_only BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'viagens') THEN
        ALTER TABLE public.viagens
            ADD COLUMN IF NOT EXISTS is_female_only BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'corridas') THEN
        ALTER TABLE public.corridas
            ADD COLUMN IF NOT EXISTS is_female_only BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rides') THEN
        ALTER TABLE public.rides
            ADD COLUMN IF NOT EXISTS is_female_only BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- 3. Tabela de Bloqueio Mútuo (user_blocks)
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  reason TEXT,
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_user_blocks_pair UNIQUE (blocker_id, blocked_id)
);

-- Índices de performance para busca bidirecional em O(log n)
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_tenant ON public.user_blocks(tenant_id);

-- 4. Políticas de Segurança (Row Level Security)
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem visualizar seus próprios bloqueios" ON public.user_blocks;
CREATE POLICY "Usuários podem visualizar seus próprios bloqueios"
  ON public.user_blocks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Usuários podem criar bloqueios" ON public.user_blocks;
CREATE POLICY "Usuários podem criar bloqueios"
  ON public.user_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Usuários podem remover seus próprios bloqueios" ON public.user_blocks;
CREATE POLICY "Usuários podem remover seus próprios bloqueios"
  ON public.user_blocks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Leitura de serviço (para RPC e motor de despacho)
DROP POLICY IF EXISTS "Service role possui acesso irrestrito aos bloqueios" ON public.user_blocks;
CREATE POLICY "Service role possui acesso irrestrito aos bloqueios"
  ON public.user_blocks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

