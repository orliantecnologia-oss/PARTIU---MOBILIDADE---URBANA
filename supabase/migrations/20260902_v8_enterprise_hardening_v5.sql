-- ==============================================================================
-- 🏛️ UNIVANS V8 — ENTERPRISE HARDENING PROGRAM V5: PERSISTÊNCIA REAL & FINOPS
-- ==============================================================================

-- 1. TABELA DE IDEMPOTÊNCIA GLOBAL (ANTI-REPLAY & DUPLICAÇÃO MULTI-INSTÂNCIA)
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    key VARCHAR(255) PRIMARY KEY,
    request_hash VARCHAR(64) NOT NULL,
    actor_id VARCHAR(100),
    command VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'IN_FLIGHT', -- IN_FLIGHT, COMMITTED, REJECTED
    response_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON public.idempotency_keys(expires_at);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS Leitura e registro de idempotencia ON public.idempotency_keys;
CREATE POLICY Leitura e registro de idempotencia ON public.idempotency_keys
    FOR ALL USING (true) WITH CHECK (true);


-- 2. TABELA DE TRANSACTIONAL OUTBOX (DESPACHO PERSISTENTE EM BANCO)
CREATE TABLE IF NOT EXISTS public.event_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'DEFAULT_TENANT',
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    correlation_id VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, PUBLISHED, FAILED, DEAD_LETTER
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 5,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_retry ON public.event_outbox(status, retry_count);
CREATE INDEX IF NOT EXISTS idx_outbox_created_at ON public.event_outbox(created_at);

-- 3. TABELA DE DEAD-LETTER QUEUE (FILA DE EVENTOS MORTOS)
CREATE TABLE IF NOT EXISTS public.event_dead_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outbox_id UUID REFERENCES public.event_outbox(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.event_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_dead_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS Acesso interno ao outbox ON public.event_outbox;
CREATE POLICY Acesso interno ao outbox ON public.event_outbox FOR ALL USING (true);

DROP POLICY IF EXISTS Acesso interno a dead-letters ON public.event_dead_letters;
CREATE POLICY Acesso interno a dead-letters ON public.event_dead_letters FOR ALL USING (true);


-- 4. TABELAS DE SEGURANÇA FINANCEIRA (PADRÃO STRIPE / ADYEN / MERCADO PAGO)
CREATE TABLE IF NOT EXISTS public.payment_intents (
    id VARCHAR(100) PRIMARY KEY, -- ex: pi_univans_123456
    reference_id VARCHAR(100) NOT NULL, -- ex: bilhete ou passagem
    amount_cents BIGINT NOT NULL, -- Precisão estrita em centavos inteiros
    currency VARCHAR(10) NOT NULL DEFAULT 'BRL',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, SUCCEEDED, FAILED, CANCELLED
    psp_provider VARCHAR(50) NOT NULL DEFAULT 'MERCADO_PAGO_PIX',
    client_secret VARCHAR(255),
    idempotency_key VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_ref ON public.payment_intents(reference_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON public.payment_intents(status);

CREATE TABLE IF NOT EXISTS public.payment_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id VARCHAR(150) NOT NULL UNIQUE,
    psp_provider VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    signature_header TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS Acesso restrito a payment intents ON public.payment_intents;
CREATE POLICY Acesso restrito a payment intents ON public.payment_intents FOR ALL USING (true);

DROP POLICY IF EXISTS Acesso a webhooks de pagamento ON public.payment_webhooks;
CREATE POLICY Acesso a webhooks de pagamento ON public.payment_webhooks FOR ALL USING (true);


-- 5. LIVRO-RAZÃO COM PARTIDAS DOBRADAS (DOUBLE-ENTRY BOOKKEEPING)
CREATE TABLE IF NOT EXISTS public.financial_accounts (
    id VARCHAR(50) PRIMARY KEY, -- ex: '1.1.01_CLEARING_PSP', '2.1.01_ESCROW_PASSAGENS'
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(30) NOT NULL, -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    balance_cents BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financial_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(100) NOT NULL, -- Chave de agrupamento da transação contábil
    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    account_id VARCHAR(50) NOT NULL REFERENCES public.financial_accounts(id),
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_tx ON public.financial_ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_account ON public.financial_ledger_entries(account_id);

ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS Acesso a contas contabeis ON public.financial_accounts;
CREATE POLICY Acesso a contas contabeis ON public.financial_accounts FOR ALL USING (true);

DROP POLICY IF EXISTS Acesso a lancamentos contabeis ON public.financial_ledger_entries;
CREATE POLICY Acesso a lancamentos contabeis ON public.financial_ledger_entries FOR ALL USING (true);

-- Inserir Plano de Contas Padrão da Cooperativa
INSERT INTO public.financial_accounts (id, code, name, type, balance_cents) VALUES
('1.1.01_CLEARING_PSP', '1.1.01', 'Caixa & Contas de Liquidação PSP (Pix)', 'ASSET', 0),
('2.1.01_ESCROW_PASSAGENS', '2.1.01', 'Custódia Temporária de Passagens (Escrow)', 'LIABILITY', 0),
('2.1.02_REPASSE_MOTORISTAS', '2.1.02', 'Obrigações de Repasse a Motoristas Cooperados', 'LIABILITY', 0),
('3.1.01_TAXA_COOPERATIVA', '3.1.01', 'Receita Operacional de Taxas da Cooperativa', 'REVENUE', 0),
('4.1.01_TAXAS_GATEWAY', '4.1.01', 'Despesas com Taxas de Gateway e Pix', 'EXPENSE', 0)
ON CONFLICT (id) DO NOTHING;
