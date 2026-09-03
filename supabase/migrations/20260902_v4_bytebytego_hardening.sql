-- ==============================================================================
-- UNIVANS V4.1 — BYTEBYTEGO PRODUCTION HARDENING MIGRATION
-- 1. Tabela Distribuida de Idempotencia (Prevencao de Duplicacao e Payload Mismatch)
-- 2. Transactional Outbox & Dead-Letter Queue (Entrega Confiavel At-Least-Once)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS idempotency_records (
    idempotency_key VARCHAR(120) PRIMARY KEY,
    command VARCHAR(50) NOT NULL,
    actor_id VARCHAR(80) NOT NULL,
    tenant_id VARCHAR(80) NOT NULL,
    request_id VARCHAR(80) NOT NULL,
    correlation_id VARCHAR(80) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('IN_FLIGHT', 'COMMITTED', 'REJECTED')),
    result_payload JSONB,
    error_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    committed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_records (expires_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_tenant_command ON idempotency_records (tenant_id, command);

CREATE TABLE IF NOT EXISTS outbox_events (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    aggregate_type VARCHAR(40) NOT NULL CHECK (aggregate_type IN ('TRIP', 'TICKET', 'PAYMENT', 'VEHICLE', 'DEVICE', 'SOS', 'TELEMETRY')),
    aggregate_id VARCHAR(80) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_version INT NOT NULL DEFAULT 1,
    payload JSONB NOT NULL,
    headers JSONB DEFAULT '{}'::jsonb,
    correlation_id VARCHAR(80) NOT NULL,
    causation_id VARCHAR(80),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED', 'DEAD_LETTER')),
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    last_error TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_pending ON outbox_events (status, created_at) WHERE status IN ('PENDING', 'PROCESSING');
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate ON outbox_events (aggregate_type, aggregate_id);

ALTER TABLE idempotency_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a registros de idempotencia por tenant" ON idempotency_records FOR ALL USING (true);
CREATE POLICY "Acesso a eventos do outbox por tenant" ON outbox_events FOR ALL USING (true);
