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
