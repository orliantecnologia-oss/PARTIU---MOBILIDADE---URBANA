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
