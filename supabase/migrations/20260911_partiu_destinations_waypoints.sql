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
