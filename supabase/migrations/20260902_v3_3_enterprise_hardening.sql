-- ==============================================================================
-- 🛡️ UNIVANS TOS — MIGRATION DE HARDENING & ENTERPRISE CERTIFICATION (v3.3)
-- Outbox Pattern, Inbox Idempotency, Money Constraints, RLS Multi-Tenant Isolation
-- ==============================================================================

-- 1. Tabela de Outbox Pattern para Garantia de Entrega Transacional
CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_type VARCHAR(80) NOT NULL,
    aggregate_type VARCHAR(80) NOT NULL,
    aggregate_id VARCHAR(80) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER')),
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    error_log TEXT,
    idempotency_key VARCHAR(120) UNIQUE NOT NULL,
    correlation_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_next ON outbox_events (status, next_attempt_at) WHERE status IN ('PENDING', 'FAILED');

-- 2. Tabela de Inbox Pattern para Deduplicação de Webhooks Externos
CREATE TABLE IF NOT EXISTS inbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(40) NOT NULL,
    external_event_id VARCHAR(120) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(30) DEFAULT 'PROCESSED' CHECK (status IN ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'DUPLICATE_REJECTED')),
    received_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    correlation_id VARCHAR(100) NOT NULL,
    CONSTRAINT uq_inbox_provider_event UNIQUE (provider, external_event_id)
);

-- 3. Constraints de Integridade Monetária e Geográfica
ALTER TABLE payments ADD CONSTRAINT chk_payment_amount_positive CHECK (amount > 0);
ALTER TABLE financial_journals ADD CONSTRAINT chk_debit_credit_positive CHECK (total_debit >= 0 AND total_credit >= 0);
ALTER TABLE financial_journal_entries ADD CONSTRAINT chk_entry_amount_positive CHECK (amount >= 0);

-- 4. RLS e Isolamento Multi-Tenant Completo
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Isolamento de outbox por cooperativa" ON outbox_events
    FOR ALL USING (organization_id = (current_setting('app.current_organization_id', true))::uuid);

CREATE POLICY "Isolamento de vehicles por cooperativa" ON vehicles
    FOR ALL USING (organization_id = (current_setting('app.current_organization_id', true))::uuid);

CREATE POLICY "Isolamento de trips por cooperativa" ON trips
    FOR ALL USING (organization_id = (current_setting('app.current_organization_id', true))::uuid);

CREATE POLICY "Isolamento de tickets por cooperativa" ON tickets
    FOR ALL USING (organization_id = (current_setting('app.current_organization_id', true))::uuid);

CREATE POLICY "Isolamento de payments por cooperativa" ON payments
    FOR ALL USING (organization_id = (current_setting('app.current_organization_id', true))::uuid);
