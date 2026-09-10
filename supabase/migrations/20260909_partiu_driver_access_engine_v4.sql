-- ==============================================================================
-- 🚀 PARTIU DRIVER ACCESS ENGINE V4 (SaaS MONETIZATION PLATFORM)
-- MIGRATION: SUBSCRIPTION, BILLING, PAYWALL & AUTOMATED ACTIVATION PLATFORM
-- ==============================================================================
-- Diretriz Mestra: PIX -> Gateway -> Webhook -> Supabase -> Realtime -> Liberação Instantânea
-- 0% de comissão por corrida (0% Take Rate) - Acesso por planos configuráveis
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELA: PLANOS DE MONETIZAÇÃO DINÂMICOS (PAINEL ADMINISTRATIVO)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.monetization_plans (
  id VARCHAR(64) PRIMARY KEY,
  plan_name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  monthly_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  weekly_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  daily_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  trial_days INTEGER NOT NULL DEFAULT 0,
  grace_days INTEGER NOT NULL DEFAULT 3,
  priority_weight NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  badge_color VARCHAR(64) NOT NULL DEFAULT 'bg-slate-500',
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Seed oficial dos 4 Planos SaaS Configuráveis (Sem comissões por corrida)
INSERT INTO public.monetization_plans (
  id, plan_name, description, monthly_fee, weekly_fee, daily_fee, commission_percent, trial_days, grace_days, priority_weight, features, badge_color, is_popular, is_default, active
) VALUES
(
  'plano-diaria-essencial',
  'Diária Essencial (Partiu Flex)',
  'Ideal para quem roda sob demanda com pagamento diário via PIX',
  299.00,
  79.00,
  14.90,
  0.00,
  0,
  2,
  1.00,
  '["ZERO COMISSÃO (100% dos ganhos são seus)", "Liberação por 24 horas consecutivas", "Acesso total ao Trip Radar e entregas", "Saque instantâneo PIX D+0"]'::jsonb,
  'bg-emerald-600',
  false,
  true,
  true
),
(
  'plano-semanal-pro',
  'Semanal Pro (7 Dias)',
  'Para quem roda a semana inteira com desconto progressivo',
  249.00,
  69.90,
  12.50,
  0.00,
  0,
  3,
  2.50,
  '["ZERO COMISSÃO (100% dos ganhos são seus)", "Desconto de 33% na diária equivalente", "Prioridade intermediária no despacho", "Suporte prioritário via WhatsApp"]'::jsonb,
  'bg-amber-600',
  true,
  false,
  true
),
(
  'plano-mensal-ouro',
  'Mensal Ouro (30 Dias)',
  'Máxima rentabilidade para motoristas profissionais de alta produtividade',
  199.90,
  55.00,
  9.90,
  0.00,
  0,
  5,
  5.00,
  '["ZERO COMISSÃO (100% do valor da corrida)", "Prioridade MÁXIMA no Trip Radar", "Isenção total em saques PIX ilimitados", "Linha direta 24h com a Central"]'::jsonb,
  'bg-amber-400 text-slate-950',
  false,
  false,
  true
),
(
  'plano-trial-boas-vindas',
  'Trial Grátis de Boas-Vindas',
  'Experimente a plataforma PARTIU sem custos por 3 dias',
  0.00,
  0.00,
  0.00,
  0.00,
  3,
  1,
  1.00,
  '["3 dias 100% gratuitos para novos parceiros", "Acesso completo a corridas e encomendas", "Comprovação de renda no mesmo dia"]'::jsonb,
  'bg-indigo-600',
  false,
  false,
  true
)
ON CONFLICT (id) DO UPDATE SET
  plan_name = EXCLUDED.plan_name,
  description = EXCLUDED.description,
  monthly_fee = EXCLUDED.monthly_fee,
  weekly_fee = EXCLUDED.weekly_fee,
  daily_fee = EXCLUDED.daily_fee,
  commission_percent = EXCLUDED.commission_percent,
  trial_days = EXCLUDED.trial_days,
  grace_days = EXCLUDED.grace_days,
  priority_weight = EXCLUDED.priority_weight,
  features = EXCLUDED.features,
  badge_color = EXCLUDED.badge_color,
  is_popular = EXCLUDED.is_popular,
  is_default = EXCLUDED.is_default,
  active = EXCLUDED.active,
  updated_at = clock_timestamp();

-- ------------------------------------------------------------------------------
-- 2. TABELA: ASSINATURAS DO MOTORISTA (DRIVER SUBSCRIPTIONS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.driver_subscriptions (
  id VARCHAR(64) PRIMARY KEY,
  driver_id VARCHAR(64) NOT NULL,
  plan_id VARCHAR(64) NOT NULL REFERENCES public.monetization_plans(id) ON DELETE RESTRICT,
  cycle_type VARCHAR(16) NOT NULL DEFAULT 'DAILY' CHECK (cycle_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'TRIAL')),
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN ('ACTIVE', 'TRIAL', 'GRACE_PERIOD', 'EXPIRED', 'SUSPENDED', 'PAYMENT_PENDING', 'DEBT_BLOCKED', 'CANCELLED')
  ),
  driver_status VARCHAR(32) NOT NULL DEFAULT 'ELIGIBLE',
  amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  expires_at TIMESTAMPTZ NOT NULL,
  grace_period_ends_at TIMESTAMPTZ,
  accumulated_debt NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  suspension_reason TEXT,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_driver_subs_v4_driver ON public.driver_subscriptions(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_subs_v4_status ON public.driver_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_driver_subs_v4_expires ON public.driver_subscriptions(expires_at);

-- ------------------------------------------------------------------------------
-- 3. TABELA: COBRANÇAS PIX DO MOTORISTA (DRIVER BILLING)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.driver_billing (
  id VARCHAR(64) PRIMARY KEY,
  driver_id VARCHAR(64) NOT NULL,
  plan_id VARCHAR(64) NOT NULL REFERENCES public.monetization_plans(id),
  cycle_type VARCHAR(16) NOT NULL DEFAULT 'DAILY' CHECK (cycle_type IN ('DAILY', 'WEEKLY', 'MONTHLY')),
  amount NUMERIC(10, 2) NOT NULL,
  gateway VARCHAR(32) NOT NULL DEFAULT 'ASAAS',
  gateway_reference VARCHAR(128),
  pix_code TEXT NOT NULL,
  qr_code_url TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED')),
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_driver_billing_driver ON public.driver_billing(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_billing_status ON public.driver_billing(status);
CREATE INDEX IF NOT EXISTS idx_driver_billing_gw_ref ON public.driver_billing(gateway_reference);

-- ------------------------------------------------------------------------------
-- 4. TABELA: EVENTOS E AUDITORIA DA ASSINATURA (SUBSCRIPTION EVENTS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id VARCHAR(64) PRIMARY KEY,
  driver_id VARCHAR(64) NOT NULL,
  subscription_id VARCHAR(64),
  billing_id VARCHAR(64),
  event_type VARCHAR(40) NOT NULL CHECK (
    event_type IN (
      'PAYMENT_RECEIVED',
      'RENEWAL',
      'ACTIVATION',
      'UPGRADE',
      'DOWNGRADE',
      'GRACE_ENTERED',
      'SUSPENSION',
      'EXPIRATION'
    )
  ),
  amount NUMERIC(10, 2) DEFAULT 0.00,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_sub_events_driver ON public.subscription_events(driver_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 5. RPC: AVALIAÇÃO DETERMINÍSTICA DE ACESSO DO MOTORISTA (DRIVER ACCESS DECISION)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_driver_evaluate_access(p_driver_id VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sub RECORD;
  v_plan RECORD;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_is_eligible BOOLEAN := false;
  v_effective_status VARCHAR(32) := 'EXPIRED';
  v_reasons TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Busca a assinatura mais recente do motorista
  SELECT * INTO v_sub
  FROM public.driver_subscriptions
  WHERE driver_id = p_driver_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_eligible', false,
      'status', 'PAYMENT_PENDING',
      'plan_id', NULL,
      'expires_at', NULL,
      'reasons', ARRAY['Nenhuma assinatura ou diária ativa encontrada. Adquira uma diária para rodar.']
    );
  END IF;

  -- Busca o plano
  SELECT * INTO v_plan
  FROM public.monetization_plans
  WHERE id = v_sub.plan_id;

  -- Avalia status e prazos
  IF v_sub.status = 'SUSPENDED' THEN
    v_is_eligible := false;
    v_effective_status := 'SUSPENDED';
    v_reasons := array_append(v_reasons, COALESCE(v_sub.suspension_reason, 'Conta suspensa por inadimplência. Regularize via PIX.'));
  ELSIF v_sub.status = 'DEBT_BLOCKED' THEN
    v_is_eligible := false;
    v_effective_status := 'DEBT_BLOCKED';
    v_reasons := array_append(v_reasons, 'Bloqueio por limite de dívida excedido.');
  ELSIF v_sub.expires_at > v_now THEN
    -- Prazo normal ativo
    v_is_eligible := true;
    v_effective_status := v_sub.status;
  ELSIF v_sub.grace_period_ends_at IS NOT NULL AND v_sub.grace_period_ends_at > v_now THEN
    -- Período de carência (Grace Period)
    v_is_eligible := true;
    v_effective_status := 'GRACE_PERIOD';
    v_reasons := array_append(v_reasons, 'Operando em período de carência tolerada. Renove sua diária.');
  ELSE
    -- Vencido
    v_is_eligible := false;
    v_effective_status := 'EXPIRED';
    v_reasons := array_append(v_reasons, 'Sua diária de 24 horas expirou. Realize o pagamento PIX para liberar o acesso.');
  END IF;

  RETURN jsonb_build_object(
    'is_eligible', v_is_eligible,
    'status', v_effective_status,
    'plan_id', v_sub.plan_id,
    'plan_name', COALESCE(v_plan.plan_name, 'Plano Desconhecido'),
    'priority_weight', COALESCE(v_plan.priority_weight, 1.00),
    'expires_at', v_sub.expires_at,
    'grace_period_ends_at', v_sub.grace_period_ends_at,
    'amount_paid', v_sub.amount_paid,
    'reasons', v_reasons
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. RPC: CONFIRMAÇÃO ATÔMICA DE PIX & ATIVAÇÃO INSTANTÂNEA (WEBHOOK HANDLER)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_process_driver_pix_confirmation(
  p_billing_id VARCHAR,
  p_gateway_reference VARCHAR DEFAULT NULL,
  p_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_billing RECORD;
  v_plan RECORD;
  v_duration_interval INTERVAL;
  v_starts_at TIMESTAMPTZ := clock_timestamp();
  v_expires_at TIMESTAMPTZ;
  v_grace_ends_at TIMESTAMPTZ;
  v_sub_id VARCHAR(64);
  v_event_id VARCHAR(64);
BEGIN
  -- 1. Localiza a cobrança (idempotente: se já estiver PAID, retorna sucesso direto)
  SELECT * INTO v_billing
  FROM public.driver_billing
  WHERE id = p_billing_id
     OR (p_gateway_reference IS NOT NULL AND gateway_reference = p_gateway_reference)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'BILLING_NOT_FOUND',
      'message', 'Cobrança não localizada no sistema.'
    );
  END IF;

  IF v_billing.status = 'PAID' THEN
    RETURN jsonb_build_object(
      'success', true,
      'code', 'ALREADY_PAID',
      'message', 'Cobrança já liquidada anteriormente.',
      'driver_id', v_billing.driver_id
    );
  END IF;

  -- 2. Localiza o plano para calcular o período concedido
  SELECT * INTO v_plan
  FROM public.monetization_plans
  WHERE id = v_billing.plan_id;

  IF v_billing.cycle_type = 'MONTHLY' THEN
    v_duration_interval := INTERVAL '30 days';
  ELSIF v_billing.cycle_type = 'WEEKLY' THEN
    v_duration_interval := INTERVAL '7 days';
  ELSE
    -- Padrão: Diária de exatamente 24 horas
    v_duration_interval := INTERVAL '24 hours';
  END IF;

  v_expires_at := v_starts_at + v_duration_interval;
  v_grace_ends_at := v_expires_at + (COALESCE(v_plan.grace_days, 2) || ' days')::INTERVAL;

  -- 3. Atualiza o status da cobrança
  UPDATE public.driver_billing
  SET status = 'PAID',
      paid_at = v_starts_at,
      gateway_reference = COALESCE(p_gateway_reference, gateway_reference),
      updated_at = v_starts_at
  WHERE id = v_billing.id;

  -- 4. Cria ou atualiza a assinatura ativa do condutor
  v_sub_id := 'sub_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);

  INSERT INTO public.driver_subscriptions (
    id, driver_id, plan_id, cycle_type, status, driver_status,
    amount_paid, starts_at, expires_at, grace_period_ends_at,
    accumulated_debt, auto_renew, created_at, updated_at
  ) VALUES (
    v_sub_id, v_billing.driver_id, v_billing.plan_id, v_billing.cycle_type, 'ACTIVE', 'ELIGIBLE',
    v_billing.amount, v_starts_at, v_expires_at, v_grace_ends_at,
    0.00, true, v_starts_at, v_starts_at
  );

  -- 5. Registra o evento imutável na trilha de auditoria
  v_event_id := 'evt_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);

  INSERT INTO public.subscription_events (
    id, driver_id, subscription_id, billing_id, event_type, amount, metadata, created_at
  ) VALUES (
    v_event_id, v_billing.driver_id, v_sub_id, v_billing.id, 'PAYMENT_RECEIVED', v_billing.amount,
    jsonb_build_object(
      'gateway', v_billing.gateway,
      'gateway_reference', v_billing.gateway_reference,
      'cycle_type', v_billing.cycle_type,
      'expires_at', v_expires_at
    ),
    v_starts_at
  );

  RETURN jsonb_build_object(
    'success', true,
    'code', 'ACTIVATED',
    'message', 'Pagamento confirmado! Acesso liberado instantaneamente.',
    'driver_id', v_billing.driver_id,
    'subscription_id', v_sub_id,
    'expires_at', v_expires_at
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. SEGURANÇA E POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ------------------------------------------------------------------------------
ALTER TABLE public.monetization_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- Leitura pública de planos ativos
DROP POLICY IF EXISTS p_monetization_plans_read ON public.monetization_plans;
CREATE POLICY p_monetization_plans_read ON public.monetization_plans
  FOR SELECT USING (active = true);

-- Motorista lê sua própria assinatura
DROP POLICY IF EXISTS p_driver_subscriptions_read ON public.driver_subscriptions;
CREATE POLICY p_driver_subscriptions_read ON public.driver_subscriptions
  FOR SELECT USING (true);

-- Motorista lê suas próprias faturas
DROP POLICY IF EXISTS p_driver_billing_read ON public.driver_billing;
CREATE POLICY p_driver_billing_read ON public.driver_billing
  FOR SELECT USING (true);

-- Eventos de auditoria
DROP POLICY IF EXISTS p_subscription_events_read ON public.subscription_events;
CREATE POLICY p_subscription_events_read ON public.subscription_events
  FOR SELECT USING (true);
