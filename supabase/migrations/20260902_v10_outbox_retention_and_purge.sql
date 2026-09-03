-- ==============================================================================
-- 🧹 MIGRATION V10 — POLÍTICA DE RETENÇÃO E PURGA AUTOMÁTICA DE EVENTOS (FINOPS)
-- 1. Procedure para limpeza de eventos já publicados/processados com sucesso há mais de N dias
-- 2. Procedure para expurgo seguro de falhas arquivadas na Dead Letter Queue
-- ==============================================================================

-- 1. Criação das tabelas de outbox e dead-letters caso ainda não existam no ambiente
CREATE TABLE IF NOT EXISTS public.event_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'DEFAULT_TENANT',
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    correlation_id VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 5,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.event_dead_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outbox_id UUID REFERENCES public.event_outbox(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_retry ON public.event_outbox(status, retry_count);
CREATE INDEX IF NOT EXISTS idx_outbox_created_at ON public.event_outbox(created_at);

-- 2. Procedure de purga automática
CREATE OR REPLACE FUNCTION public.limpar_outbox_antiga(
    p_dias_retencao INTEGER DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_eventos_deletados INTEGER;
    v_dlq_deletados INTEGER;
BEGIN
    -- Deleta eventos com status PUBLISHED mais antigos que o período de retenção
    DELETE FROM public.event_outbox
    WHERE status = 'PUBLISHED'
      AND published_at < (NOW() - (p_dias_retencao || ' days')::INTERVAL);
    
    GET DIAGNOSTICS v_eventos_deletados = ROW_COUNT;

    -- Deleta registros arquivados da DLQ mais antigos que 30 dias
    DELETE FROM public.event_dead_letters
    WHERE failed_at < (NOW() - INTERVAL '30 days');

    GET DIAGNOSTICS v_dlq_deletados = ROW_COUNT;

    RETURN jsonb_build_object(
        'sucesso', true,
        'eventos_outbox_purgados', v_eventos_deletados,
        'eventos_dlq_purgados', v_dlq_deletados,
        'executado_em', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.limpar_outbox_antiga(INTEGER) TO authenticated, service_role;
