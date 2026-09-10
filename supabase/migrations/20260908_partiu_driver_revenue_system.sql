-- ==============================================================================
-- 🚀 PARTIU DRIVER REVENUE SYSTEM V1 (FASE 19)
-- MIGRATION: DRIVER SUBSCRIPTION, COMMISSION & REVENUE GOVERNANCE PLATFORM
-- ==============================================================================
-- Modelo Híbrido:
-- 1. Assinaturas Recorrentes (Driver SaaS)
-- 2. Comissões Variáveis por Corrida (1.5% a 7.0%)
-- 3. Carteira Financeira Integrada (Ledger D+0)
-- 4. Fundo de Proteção Operacional (Reserva Mútua / Sinistralidade)
-- 5. Cascata de Cobrança em 4 Níveis
-- 6. Gestão de Inadimplência e Carência (Grace Period)
-- 7. Trilha de Auditoria com Invariante Contábil Zero-Sum
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELA: PLANOS DE ASSINATURA DO MOTORISTA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partiu_driver_plans (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  monthly_fee_cents BIGINT NOT NULL DEFAULT 0,
  daily_fee_cents BIGINT NOT NULL DEFAULT 0,
  weekly_fee_cents BIGINT NOT NULL DEFAULT 0,
  billing_cycle VARCHAR(16) NOT NULL DEFAULT 'MONTHLY',
  commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
  dispatch_weight_percent NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  badge_color VARCHAR(64) NOT NULL DEFAULT 'bg-slate-500',
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Seed Inicial dos 4 Planos Oficiais da Plataforma
INSERT INTO public.partiu_driver_plans (
  id, name, description, monthly_fee_cents, daily_fee_cents, weekly_fee_cents, billing_cycle, commission_percent, dispatch_weight_percent, features, badge_color, is_popular, is_default, active
) VALUES
(
  'plano-livre',
  'Livre (Gratuito)',
  'Sem mensalidade fixa, ideal para quem roda ocasionalmente',
  0,
  0,
  0,
  'MONTHLY',
  5.00,
  1.00,
  '["Taxa justa de 5.0% por corrida", "Repasse instantâneo via PIX D+0", "Acesso ao Trip Radar", "Sem mensalidade fixa"]'::jsonb,
  'bg-slate-500',
  false,
  true,
  true
),
(
  'plano-bronze',
  'Bronze',
  'Para quem roda com frequência e busca economia imediata',
  1990,
  150,
  690,
  'MONTHLY',
  3.00,
  2.00,
  '["Taxa reduzida de 3.0% por corrida", "Economia a partir de 10 corridas/mês", "Repasse instantâneo via PIX D+0", "Prioridade leve no Trip Radar", "Descontos em postos parceiros"]'::jsonb,
  'bg-amber-700',
  true,
  false,
  true
),
(
  'plano-prata',
  'Prata',
  'Para profissionais dedicados que passam boa parte do dia online',
  4990,
  350,
  1690,
  'MONTHLY',
  1.00,
  3.50,
  '["Taxa ultra reduzida de apenas 1.0% por corrida", "99% do valor da corrida fica com o motorista", "Atendimento prioritário no suporte WhatsApp", "Descontos exclusivos em manutenção mecânica"]'::jsonb,
  'bg-slate-300 text-slate-950',
  false,
  false,
  true
),
(
  'plano-ouro',
  'Ouro',
  'Máxima rentabilidade para motoristas de alta produtividade: ZERO COMISSÃO',
  9990,
  690,
  3490,
  'MONTHLY',
  0.00,
  5.00,
  '["ZERO COMISSÃO (0.0% por corrida)", "100% do valor da corrida é do motorista", "Prioridade máxima no Trip Radar", "Linha direta 24h com a Central", "Isenção total de taxas em saques PIX"]'::jsonb,
  'bg-amber-400 text-slate-950',
  false,
  false,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_fee_cents = EXCLUDED.monthly_fee_cents,
  daily_fee_cents = EXCLUDED.daily_fee_cents,
  weekly_fee_cents = EXCLUDED.weekly_fee_cents,
  billing_cycle = EXCLUDED.billing_cycle,
  commission_percent = EXCLUDED.commission_percent,
  dispatch_weight_percent = EXCLUDED.dispatch_weight_percent,
  features = EXCLUDED.features,
  badge_color = EXCLUDED.badge_color,
  is_popular = EXCLUDED.is_popular,
  is_default = EXCLUDED.is_default,
  active = EXCLUDED.active,
  updated_at = clock_timestamp();

-- ------------------------------------------------------------------------------
-- 2. TABELA: ASSINATURAS ATIVAS E HISTÓRICO DE CONDUTORES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partiu_driver_subscriptions (
  id VARCHAR(64) PRIMARY KEY,
  driver_id VARCHAR(64) NOT NULL,
  plan_id VARCHAR(64) NOT NULL REFERENCES public.partiu_driver_plans(id) ON DELETE RESTRICT,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'GRACE_PERIOD', 'SUSPENDED', 'REACTIVATION_REQUIRED', 'CANCELLED')),
  monthly_fee_cents BIGINT NOT NULL DEFAULT 0,
  current_cycle_start TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  current_cycle_end TIMESTAMPTZ NOT NULL,
  next_billing_date TIMESTAMPTZ NOT NULL,
  grace_period_days INTEGER NOT NULL DEFAULT 3,
  grace_period_ends_at TIMESTAMPTZ,
  accumulated_debt_cents BIGINT NOT NULL DEFAULT 0,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  preferred_payment_method VARCHAR(32) NOT NULL DEFAULT 'BALANCE',
  suspension_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_driver_subs_driver_id ON public.partiu_driver_subscriptions(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_subs_status ON public.partiu_driver_subscriptions(status);

-- ------------------------------------------------------------------------------
-- 3. TABELA: CARTEIRA FINANCEIRA UNIFICADA (LEDGER PRINCIPAL)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partiu_driver_wallets (
  driver_id VARCHAR(64) PRIMARY KEY,
  available_balance_cents BIGINT NOT NULL DEFAULT 0,
  pending_balance_cents BIGINT NOT NULL DEFAULT 0,
  protection_fund_balance_cents BIGINT NOT NULL DEFAULT 0,
  total_withdrawn_cents BIGINT NOT NULL DEFAULT 0,
  total_gross_earned_cents BIGINT NOT NULL DEFAULT 0,
  total_platform_fees_paid_cents BIGINT NOT NULL DEFAULT 0,
  total_savings_versus_uber_cents BIGINT NOT NULL DEFAULT 0,
  last_settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ------------------------------------------------------------------------------
-- 4. TABELA: APURAÇÃO TRANSPARENTE DE COMISSÕES POR CORRIDA (PER-RIDE SPLIT)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partiu_driver_commissions (
  id VARCHAR(64) PRIMARY KEY,
  ride_id VARCHAR(64) NOT NULL,
  driver_id VARCHAR(64) NOT NULL,
  plan_id VARCHAR(64) NOT NULL REFERENCES public.partiu_driver_plans(id),
  plan_name VARCHAR(64) NOT NULL,
  commission_percent NUMERIC(5, 2) NOT NULL,
  gross_fare_cents BIGINT NOT NULL,
  platform_commission_cents BIGINT NOT NULL,
  protection_fund_cents BIGINT NOT NULL DEFAULT 0,
  total_platform_deduction_cents BIGINT NOT NULL,
  driver_net_earnings_cents BIGINT NOT NULL,
  competitor_benchmark_take_rate NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
  savings_versus_competitor_cents BIGINT NOT NULL DEFAULT 0,
  settlement_status VARCHAR(32) NOT NULL DEFAULT 'SETTLED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

  -- Invariante Contábil Mandatória
  CONSTRAINT chk_commission_invariant CHECK (
    gross_fare_cents = driver_net_earnings_cents + total_platform_deduction_cents
  ),
  CONSTRAINT chk_deduction_sum CHECK (
    total_platform_deduction_cents = platform_commission_cents + protection_fund_cents
  )
);

CREATE INDEX IF NOT EXISTS idx_driver_commissions_driver ON public.partiu_driver_commissions(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_commissions_ride ON public.partiu_driver_commissions(ride_id);

-- ------------------------------------------------------------------------------
-- 5. TABELA: TRANSAÇÕES DA CARTEIRA DO MOTORISTA (EXTRATO DETALHADO)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partiu_driver_transactions (
  id VARCHAR(64) PRIMARY KEY,
  driver_id VARCHAR(64) NOT NULL,
  type VARCHAR(40) NOT NULL CHECK (
    type IN (
      'RIDE_FARE',
      'PLATFORM_COMMISSION',
      'PROTECTION_FUND_CONTRIBUTION',
      'SUBSCRIPTION_FEE',
      'PIX_WITHDRAWAL',
      'DEBT_DEDUCTION',
      'BONUS_CREDIT',
      'ADJUSTMENT'
    )
  ),
  amount_cents BIGINT NOT NULL,
  balance_before_cents BIGINT NOT NULL,
  balance_after_cents BIGINT NOT NULL,
  description TEXT NOT NULL,
  reference_id VARCHAR(64),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_driver_trans_driver_created ON public.partiu_driver_transactions(driver_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 6. TABELA: FATURAS MENSAIS DE ASSINATURA (INVOICES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partiu_driver_invoices (
  id VARCHAR(64) PRIMARY KEY,
  subscription_id VARCHAR(64) NOT NULL REFERENCES public.partiu_driver_subscriptions(id),
  driver_id VARCHAR(64) NOT NULL,
  plan_id VARCHAR(64) NOT NULL REFERENCES public.partiu_driver_plans(id),
  amount_cents BIGINT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'VOID')),
  payment_method_used VARCHAR(32),
  paid_at TIMESTAMPTZ,
  cascade_attempts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_driver_invoices_driver ON public.partiu_driver_invoices(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_invoices_status ON public.partiu_driver_invoices(status);

-- ------------------------------------------------------------------------------
-- 7. TABELA: CONTROLE GRANULAR DE DÍVIDAS E INADIMPLÊNCIA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partiu_driver_debts (
  id VARCHAR(64) PRIMARY KEY,
  driver_id VARCHAR(64) NOT NULL,
  original_amount_cents BIGINT NOT NULL,
  remaining_amount_cents BIGINT NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PARTIALLY_PAID', 'PAID', 'FORGIVEN')),
  incurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  settled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_driver_debts_driver_status ON public.partiu_driver_debts(driver_id, status);

-- ------------------------------------------------------------------------------
-- 8. TABELA: RESERVA MUTUALISTA DO FUNDO DE PROTEÇÃO (PROTECTION FUND)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partiu_driver_protection_fund (
  id VARCHAR(64) PRIMARY KEY,
  driver_id VARCHAR(64) NOT NULL,
  ride_id VARCHAR(64),
  contribution_cents BIGINT NOT NULL DEFAULT 0,
  payout_cents BIGINT NOT NULL DEFAULT 0,
  current_pool_balance_cents BIGINT NOT NULL,
  payout_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_protection_fund_driver ON public.partiu_driver_protection_fund(driver_id);

-- ------------------------------------------------------------------------------
-- 9. TABELA: AUDITORIA FINANCEIRA IMUTÁVEL (ZERO-SUM VERIFICATION)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partiu_driver_financial_audits (
  id VARCHAR(64) PRIMARY KEY,
  transaction_type VARCHAR(40) NOT NULL,
  reference_id VARCHAR(64) NOT NULL,
  debit_total_cents BIGINT NOT NULL,
  credit_total_cents BIGINT NOT NULL,
  invariant_zero_sum_verified BOOLEAN NOT NULL DEFAULT true,
  checksum VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

  CONSTRAINT chk_audit_zero_sum CHECK (debit_total_cents = credit_total_cents)
);

CREATE INDEX IF NOT EXISTS idx_audit_ref ON public.partiu_driver_financial_audits(reference_id);

-- ------------------------------------------------------------------------------
-- 10. TABELA: MÉTRICAS HISTÓRICAS CONSOLIDADAS (SAAS REVENUE ANALYTICS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partiu_driver_revenue_metrics (
  id VARCHAR(64) PRIMARY KEY,
  reference_date DATE NOT NULL UNIQUE,
  mrr_cents BIGINT NOT NULL DEFAULT 0,
  arr_cents BIGINT NOT NULL DEFAULT 0,
  total_gmv_cents BIGINT NOT NULL DEFAULT 0,
  monthly_commission_revenue_cents BIGINT NOT NULL DEFAULT 0,
  monthly_subscription_revenue_cents BIGINT NOT NULL DEFAULT 0,
  monthly_protection_fund_cents BIGINT NOT NULL DEFAULT 0,
  total_net_revenue_cents BIGINT NOT NULL DEFAULT 0,
  effective_take_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  total_rides_count INTEGER NOT NULL DEFAULT 0,
  average_ticket_cents BIGINT NOT NULL DEFAULT 0,
  active_drivers_count INTEGER NOT NULL DEFAULT 0,
  defaulting_drivers_count INTEGER NOT NULL DEFAULT 0,
  delinquency_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  churn_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  driver_ltv_cents BIGINT NOT NULL DEFAULT 0,
  driver_cac_cents BIGINT NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ------------------------------------------------------------------------------
-- POLÍTICAS DE SEGURANÇA ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.partiu_driver_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partiu_driver_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partiu_driver_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partiu_driver_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partiu_driver_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partiu_driver_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partiu_driver_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partiu_driver_protection_fund ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partiu_driver_financial_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partiu_driver_revenue_metrics ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura Pública para Planos de Assinatura
CREATE POLICY "Planos visíveis publicamente"
  ON public.partiu_driver_plans
  FOR SELECT
  USING (true);

-- Motorista lê sua própria carteira e assinaturas
CREATE POLICY "Motorista lê sua carteira"
  ON public.partiu_driver_wallets
  FOR SELECT
  USING (auth.uid()::text = driver_id OR auth.role() = 'service_role');

CREATE POLICY "Motorista lê suas assinaturas"
  ON public.partiu_driver_subscriptions
  FOR SELECT
  USING (auth.uid()::text = driver_id OR auth.role() = 'service_role');

CREATE POLICY "Motorista lê suas transações"
  ON public.partiu_driver_transactions
  FOR SELECT
  USING (auth.uid()::text = driver_id OR auth.role() = 'service_role');

CREATE POLICY "Motorista lê suas comissões"
  ON public.partiu_driver_commissions
  FOR SELECT
  USING (auth.uid()::text = driver_id OR auth.role() = 'service_role');

-- Service Role / Admin possui controle total
CREATE POLICY "Service Role possui acesso total a receitas"
  ON public.partiu_driver_wallets
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service Role gerencia assinaturas"
  ON public.partiu_driver_subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');
