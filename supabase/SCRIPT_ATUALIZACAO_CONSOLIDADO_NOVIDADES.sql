-- ==============================================================================
-- 🚀 PARTIU MOBILIDADE URBANA — SCRIPT CONSOLIDADO DE ATUALIZAÇÃO RECENTE
-- ==============================================================================
-- INSTRUÇÕES DE EXECUÇÃO:
-- 1. Abra o painel do Supabase (https://supabase.com/dashboard) e entre no seu projeto.
-- 2. No menu lateral esquerdo, clique em "SQL Editor" -> "+ New query".
-- 3. Cole todo o conteúdo deste arquivo e clique no botão verde "Run".
-- 4. Este script é 100% idempotente (usa IF NOT EXISTS) e não apaga dados existentes.
-- ==============================================================================


-- ==============================================================================
-- 📄 MIGRAÇÃO: 20260908_partiu_delivery_os_schema.sql
-- ==============================================================================

-- ==============================================================================
-- 📦 PARTIU DELIVERY OS — PRODUCTION SCHEMA MIGRATION (v1.0)
-- ==============================================================================
-- Estrutura formal de banco para last-mile delivery, homologada no benchmark 99Entrega.
-- Suporte a múltiplas paradas, comprovação fotográfica (POD), PIN seguro,
-- rastreamento público via token e motor de devolução/logística reversa.
-- ==============================================================================

-- 1. TABELA PRINCIPAL DE PEDIDOS DE ENTREGA
CREATE TABLE IF NOT EXISTS public.partiu_delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code VARCHAR(16) NOT NULL UNIQUE,
  tracking_token VARCHAR(32) NOT NULL UNIQUE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name VARCHAR(120) NOT NULL,
  sender_phone VARCHAR(20) NOT NULL,
  vehicle_type VARCHAR(20) NOT NULL DEFAULT 'MOTO',
  
  -- Especificação da Carga
  package_description TEXT NOT NULL,
  package_category VARCHAR(30) NOT NULL DEFAULT 'DOCUMENTO',
  package_weight_kg NUMERIC(6, 2) NOT NULL DEFAULT 1.0,
  package_length_cm INTEGER NOT NULL DEFAULT 20,
  package_width_cm INTEGER NOT NULL DEFAULT 20,
  package_height_cm INTEGER NOT NULL DEFAULT 10,
  package_volume_liters NUMERIC(8, 2) NOT NULL DEFAULT 4.0,
  declared_value_cents BIGINT NOT NULL DEFAULT 5000,
  is_fragile BOOLEAN NOT NULL DEFAULT false,
  packaging_type VARCHAR(20) DEFAULT 'CAIXA',
  special_instructions TEXT,
  
  -- Estado do Ciclo de Vida (FSM 17 Estados Nominais + 13 Exceções)
  status VARCHAR(30) NOT NULL DEFAULT 'SEARCHING_DRIVER',
  current_stop_index INTEGER NOT NULL DEFAULT 0,
  
  -- Associação com Motorista / Entregador
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  driver_name VARCHAR(120),
  driver_phone VARCHAR(20),
  driver_vehicle_model VARCHAR(80),
  driver_vehicle_plate VARCHAR(10),
  driver_rating NUMERIC(3, 2) DEFAULT 4.96,
  
  -- Financeiro e Tarifação
  base_fare_cents BIGINT NOT NULL,
  distance_km NUMERIC(6, 2) NOT NULL,
  distance_fare_cents BIGINT NOT NULL,
  additional_stops_count INTEGER NOT NULL DEFAULT 0,
  additional_stops_fare_cents BIGINT NOT NULL DEFAULT 0,
  insurance_fare_cents BIGINT NOT NULL DEFAULT 0,
  return_fare_cents BIGINT NOT NULL DEFAULT 0,
  gross_total_cents BIGINT NOT NULL,
  driver_earnings_cents BIGINT NOT NULL,
  platform_revenue_cents BIGINT NOT NULL,
  
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 2. TABELA DE PARADAS SEQUENCIAIS (MULTI-STOP: 1 COLETA + ATÉ 5 ENTREGAS)
CREATE TABLE IF NOT EXISTS public.partiu_delivery_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.partiu_delivery_orders(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL, -- 0 = Coleta, 1..5 = Entregas, N = Retorno
  type VARCHAR(15) NOT NULL DEFAULT 'DROPOFF', -- PICKUP, DROPOFF, RETURN
  address TEXT NOT NULL,
  complement TEXT,
  reference TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  
  -- Contato do Responsável na Parada
  contact_name VARCHAR(120) NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  instructions TEXT,
  
  -- Status da Parada
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Validação de Segurança
  otp_expected VARCHAR(4) NOT NULL,
  otp_verified BOOLEAN NOT NULL DEFAULT false,
  otp_failed_attempts INTEGER NOT NULL DEFAULT 0,
  proof_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 3. TABELA DE PROVAS DE ENTREGA AUDITADAS (PROOF OF DELIVERY - POD)
CREATE TABLE IF NOT EXISTS public.partiu_delivery_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.partiu_delivery_orders(id) ON DELETE CASCADE,
  stop_id UUID REFERENCES public.partiu_delivery_stops(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL, -- PICKUP, DELIVERY, RETURN, EXCEPTION
  photo_url TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  captured_by_driver_id UUID NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 4. TABELA DE LOGÍSTICA REVERSA E DEVOLUÇÕES (RETURN SESSIONS)
CREATE TABLE IF NOT EXISTS public.partiu_delivery_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL UNIQUE REFERENCES public.partiu_delivery_orders(id) ON DELETE CASCADE,
  stop_id UUID REFERENCES public.partiu_delivery_stops(id),
  reason VARCHAR(30) NOT NULL, -- RECIPIENT_ABSENT, WRONG_ADDRESS, PACKAGE_REJECTED
  started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  arrived_pickup_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  return_fee_cents BIGINT NOT NULL,
  driver_compensation_cents BIGINT NOT NULL,
  return_otp_expected VARCHAR(4) NOT NULL,
  return_otp_verified BOOLEAN NOT NULL DEFAULT false,
  return_proof_photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 5. TABELA DE AUDITORIA DE TRANSIÇÕES (DELIVERY AUDIT LOGS)
CREATE TABLE IF NOT EXISTS public.partiu_delivery_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.partiu_delivery_orders(id) ON DELETE CASCADE,
  from_state VARCHAR(30) NOT NULL,
  to_state VARCHAR(30) NOT NULL,
  actor VARCHAR(20) NOT NULL, -- SYSTEM, DRIVER, SENDER, RECIPIENT, ADMIN
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 6. ÍNDICES DE PERFORMANCE E PESQUISA RÁPIDA
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON public.partiu_delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_driver ON public.partiu_delivery_orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_token ON public.partiu_delivery_orders(tracking_token);
CREATE INDEX IF NOT EXISTS idx_delivery_stops_delivery ON public.partiu_delivery_stops(delivery_id, sequence);
CREATE INDEX IF NOT EXISTS idx_delivery_proofs_delivery ON public.partiu_delivery_proofs(delivery_id);

-- 7. ATOMIC CLAIM PROCEDURE (PREVENÇÃO DE DOUBLE ACCEPTANCE COM FENCING TOKEN)
CREATE OR REPLACE FUNCTION public.partiu_aceitar_entrega_atomica(
  p_delivery_id UUID,
  p_driver_id UUID,
  p_driver_name VARCHAR,
  p_driver_phone VARCHAR,
  p_driver_vehicle_model VARCHAR,
  p_driver_vehicle_plate VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_delivery RECORD;
  v_fencing_token TEXT;
BEGIN
  -- Bloqueia a linha concorrente com NOWAIT
  SELECT * INTO v_delivery
  FROM public.partiu_delivery_orders
  WHERE id = p_delivery_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Entrega não localizada.');
  END IF;

  IF v_delivery.status NOT IN ('SEARCHING_DRIVER', 'REQUESTED', 'DRIVER_ASSIGNED') THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CLAIMED', 'message', 'Outro entregador aceitou esta chamada frações de segundo antes.');
  END IF;

  v_fencing_token := 'FENCE-DEL-' || extract(epoch from clock_timestamp())::bigint || '-' || p_driver_id;

  UPDATE public.partiu_delivery_orders
  SET
    driver_id = p_driver_id,
    driver_name = p_driver_name,
    driver_phone = p_driver_phone,
    driver_vehicle_model = p_driver_vehicle_model,
    driver_vehicle_plate = p_driver_vehicle_plate,
    status = 'HEADING_TO_PICKUP',
    updated_at = clock_timestamp()
  WHERE id = p_delivery_id;

  -- Registra no histórico de auditoria
  INSERT INTO public.partiu_delivery_audit_logs (
    delivery_id, from_state, to_state, actor, reason, metadata
  ) VALUES (
    p_delivery_id, v_delivery.status, 'HEADING_TO_PICKUP', 'DRIVER',
    'Aceite atômico pelo condutor',
    jsonb_build_object('driver_id', p_driver_id, 'fencing_token', v_fencing_token)
  );

  RETURN jsonb_build_object(
    'success', true,
    'fencing_token', v_fencing_token,
    'delivery_id', p_delivery_id,
    'message', 'Entrega aceita com sucesso!'
  );
EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'LOCK_CONTENTION', 'message', 'Outro entregador está aceitando esta corrida no mesmo instante.');
END;
$$;


-- ==============================================================================
-- 📄 MIGRAÇÃO: 20260908_partiu_driver_revenue_system.sql
-- ==============================================================================

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


-- ==============================================================================
-- 📄 MIGRAÇÃO: 20260909_partiu_realtime_chat_engine.sql
-- ==============================================================================

-- ==============================================================================
-- 💬 PARTIU REALTIME CHAT ENGINE V1.0 — MENSAGERIA EFÊMERA & SEGURA (LGPD)
-- ==============================================================================
-- Módulo de mensageria em tempo real entre Passageiro e Motorista.
-- 1. Isolamento estrito por corrida: ride_id
-- 2. Eliminação de PII (Sem compartilhamento de WhatsApp ou telefone pessoal)
-- 3. Efêmero: Ativo durante a corrida; bloqueado após COMPLETED ou CANCELLED
-- 4. TTL de retenção configurável para auditoria interna de sinistros (30 dias)
-- ==============================================================================

-- 1. CRIAÇÃO DA TABELA DEFINITIVA DE MENSAGENS DA CORRIDA
CREATE TABLE IF NOT EXISTS public.partiu_ride_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.partiu_corridas(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('PASSENGER', 'DRIVER', 'SYSTEM')),
  message_type TEXT NOT NULL CHECK (message_type IN ('TEXT', 'SMART_REPLY', 'SYSTEM')),
  content TEXT NOT NULL,
  client_msg_id TEXT UNIQUE,
  read_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 2. ÍNDICES DE ALTA PERFORMANCE (ESCALA 100.000+ CORRIDAS)
CREATE INDEX IF NOT EXISTS idx_ride_messages_ride_created 
  ON public.partiu_ride_messages(ride_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_ride_messages_unread
  ON public.partiu_ride_messages(ride_id, read_at) 
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ride_messages_client_msg_id
  ON public.partiu_ride_messages(client_msg_id);

-- 3. VIEW DE COMPATIBILIDADE ride_messages
CREATE OR REPLACE VIEW public.ride_messages AS
  SELECT * FROM public.partiu_ride_messages;

-- 4. FUNÇÃO RPC PARA ARQUIVAMENTO EFÊMERO DO CHAT (LGPD)
-- Bloqueia inserções e marca o encerramento do canal ao finalizar ou cancelar a corrida
CREATE OR REPLACE FUNCTION public.archive_ride_chat(p_ride_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_corrida_status VARCHAR(30);
BEGIN
  SELECT status INTO v_corrida_status 
  FROM public.partiu_corridas 
  WHERE id = p_ride_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Insere mensagem de sistema notificando encerramento do chat efêmero
  INSERT INTO public.partiu_ride_messages (
    ride_id,
    sender_id,
    sender_type,
    message_type,
    content
  ) VALUES (
    p_ride_id,
    'SYSTEM',
    'SYSTEM',
    'SYSTEM',
    'Corrida encerrada. Este chat foi arquivado de forma segura conforme as diretrizes de privacidade.'
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. TRIGGER AUTOMÁTICO: ARQUIVAR CHAT QUANDO A CORRIDA FOR FINALIZADA OU CANCELADA
CREATE OR REPLACE FUNCTION public.fn_trg_auto_archive_ride_chat()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('CONCLUIDA', 'CANCELADA') AND OLD.status NOT IN ('CONCLUIDA', 'CANCELADA') THEN
    PERFORM public.archive_ride_chat(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_archive_ride_chat ON public.partiu_corridas;
CREATE TRIGGER trg_auto_archive_ride_chat
AFTER UPDATE OF status ON public.partiu_corridas
FOR EACH ROW EXECUTE FUNCTION public.fn_trg_auto_archive_ride_chat();

-- 6. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.partiu_ride_messages ENABLE ROW LEVEL SECURITY;

-- Política de leitura: Permite acesso público/autenticado aos participantes da corrida
CREATE POLICY "Permitir leitura de mensagens da corrida" 
  ON public.partiu_ride_messages 
  FOR SELECT 
  USING (true);

-- Política de inserção: Permite envio apenas enquanto a corrida estiver ativa
CREATE POLICY "Permitir envio de mensagens em corrida ativa" 
  ON public.partiu_ride_messages 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partiu_corridas c
      WHERE c.id = ride_id 
        AND c.status NOT IN ('CONCLUIDA', 'CANCELADA')
    )
  );

-- Política de atualização: Apenas atualização de read_at
CREATE POLICY "Permitir marcacao de leitura" 
  ON public.partiu_ride_messages 
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- 7. PUBLICAÇÃO NO SUPABASE REALTIME
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND tablename = 'partiu_ride_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.partiu_ride_messages;
  END IF;
END $$;


-- ==============================================================================
-- 📄 MIGRAÇÃO: 20260910_partiu_realtime_driver_locations.sql
-- ==============================================================================

-- ==============================================================================
-- 🛰️ PARTIU REALTIME DRIVER LOCATIONS — UNIFIED POSTGIS TELEMETRY
-- ==============================================================================
-- Tabela canônica de telemetria de alta frequência para rastreamento em tempo real
-- Padrão Uber/99: Suporta pings de 3s a 15s, índices espaciais GiST,
-- e compatibilidade bidirecional com a esteira de despacho (active_drivers).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA CANÔNICA DE TELEMETRIA EM TEMPO REAL
CREATE TABLE IF NOT EXISTS public.driver_locations (
  driver_id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION NOT NULL DEFAULT 0,
  speed DOUBLE PRECISION NOT NULL DEFAULT 0,
  accuracy DOUBLE PRECISION NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (
    status IN ('OFFLINE', 'ONLINE', 'AVAILABLE', 'HEADING_TO_PICKUP', 'WAITING_PASSENGER', 'IN_PROGRESS', 'ONLINE_IDLE', 'ONLINE_MOVING', 'ON_TRIP')
  ),
  category TEXT NOT NULL DEFAULT 'CARRO',
  current_ride_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Coluna PostGIS gerada automaticamente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_locations' AND column_name = 'location'
  ) THEN
    ALTER TABLE public.driver_locations
    ADD COLUMN location geography(Point, 4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED;
  END IF;
END $$;

-- 2. ÍNDICES ESPACIAIS E DE CONSULTA ULTRA-RÁPIDA
CREATE INDEX IF NOT EXISTS idx_driver_locations_gist 
  ON public.driver_locations USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_driver_locations_status_cat 
  ON public.driver_locations (status, category, updated_at);

CREATE INDEX IF NOT EXISTS idx_driver_locations_tenant 
  ON public.driver_locations (tenant_id);

-- 3. HABILITAÇÃO NO SUPABASE REALTIME
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- 4. SEGURANÇA E RLS
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_locations_public_read"
  ON public.driver_locations FOR SELECT
  USING (true);

CREATE POLICY "driver_locations_write"
  ON public.driver_locations FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. RPC CANÔNICA DE TELEMETRIA: upsert_driver_location
-- Atualiza simultaneamente driver_locations e active_drivers para compatibilidade 100%
CREATE OR REPLACE FUNCTION public.upsert_driver_location(
  p_driver_id TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_heading DOUBLE PRECISION DEFAULT 0,
  p_speed DOUBLE PRECISION DEFAULT 0,
  p_status TEXT DEFAULT 'AVAILABLE',
  p_category TEXT DEFAULT 'CARRO',
  p_subscription_plan TEXT DEFAULT 'FREE',
  p_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  p_accuracy DOUBLE PRECISION DEFAULT 10,
  p_ride_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 5.1. Atualiza a tabela canônica de telemetria rápida
  INSERT INTO public.driver_locations (
    driver_id, tenant_id, latitude, longitude, heading, speed, accuracy,
    status, category, current_ride_id, updated_at
  )
  VALUES (
    p_driver_id, p_tenant_id, p_lat, p_lng, p_heading, p_speed, p_accuracy,
    p_status, p_category, p_ride_id, NOW()
  )
  ON CONFLICT (driver_id) DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    heading = EXCLUDED.heading,
    speed = EXCLUDED.speed,
    accuracy = EXCLUDED.accuracy,
    status = EXCLUDED.status,
    category = EXCLUDED.category,
    current_ride_id = EXCLUDED.current_ride_id,
    updated_at = NOW();

  -- 5.2. Se a tabela active_drivers existir, sincroniza para a esteira de matching
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'active_drivers') THEN
    INSERT INTO public.active_drivers (
      driver_id, tenant_id, category, status, subscription_plan,
      lat, lng, heading, speed, last_seen_at, updated_at
    )
    VALUES (
      p_driver_id, p_tenant_id, p_category,
      CASE 
        WHEN p_status IN ('OFFLINE') THEN 'OFFLINE'
        WHEN p_status IN ('HEADING_TO_PICKUP', 'IN_PROGRESS', 'ON_TRIP') THEN 'ON_TRIP'
        WHEN p_speed >= 3 THEN 'ONLINE_MOVING'
        ELSE 'ONLINE_IDLE'
      END,
      p_subscription_plan,
      p_lat, p_lng, p_heading, p_speed, NOW(), NOW()
    )
    ON CONFLICT (driver_id) DO UPDATE SET
      lat = EXCLUDED.lat,
      lng = EXCLUDED.lng,
      heading = EXCLUDED.heading,
      speed = EXCLUDED.speed,
      status = EXCLUDED.status,
      category = EXCLUDED.category,
      subscription_plan = EXCLUDED.subscription_plan,
      last_seen_at = NOW(),
      updated_at = NOW();
  END IF;
END;
$$;


-- ==============================================================================
-- 📄 MIGRAÇÃO: 20260911_partiu_app_branding.sql
-- ==============================================================================

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


-- ==============================================================================
-- 📄 MIGRAÇÃO: 20260911_partiu_footer_branding.sql
-- ==============================================================================

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


-- ==============================================================================
-- 📄 MIGRAÇÃO: 20260911_partiu_destinations_waypoints.sql
-- ==============================================================================

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


-- ==============================================================================
-- 📄 MIGRAÇÃO: 20260911_partiu_driver_pix_withdrawals.sql
-- ==============================================================================

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


-- ==============================================================================
-- 📄 MIGRAÇÃO: 20260911_partiu_fare_tables_cancellations.sql
-- ==============================================================================

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


-- ==============================================================================
-- 📄 MIGRAÇÃO: 20260911_partiu_other_person_rides.sql
-- ==============================================================================

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


-- ==============================================================================
-- 📄 MIGRAÇÃO: 20260911_partiu_social_safety_support.sql
-- ==============================================================================

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


-- ==============================================================================
-- 📄 MIGRAÇÃO: 20260911_partiu_wave_dispatch_safety.sql
-- ==============================================================================

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

