-- ==============================================================================
-- 🚀 PARTIU MOBILIDADE URBANA — PASSENGER DRAWER SERVICES & SCHEMAS (V1.0)
-- Migração: user_addresses, user_payment_methods, campaigns_coupons,
-- user_coupons, driver_applications e extensão de app_settings
-- ==============================================================================

-- 1. ENDEREÇOS FAVORITOS DOS PASSAGEIROS (user_addresses)
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  label VARCHAR(64) NOT NULL, -- Ex: "Casa", "Trabalho", "Faculdade"
  address TEXT NOT NULL,
  latitude NUMERIC(10, 7) NOT NULL DEFAULT -21.2050,
  longitude NUMERIC(10, 7) NOT NULL DEFAULT -41.8880,
  icon VARCHAR(32) NOT NULL DEFAULT 'map-pin', -- 'home', 'briefcase', 'map-pin'
  is_favorite BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON public.user_addresses(user_id);

-- 2. MÉTODOS DE PAGAMENTO TOKENIZADOS (user_payment_methods)
-- Zero Custódia: Apenas metadados do cartão e token retornado pelo Gateway
CREATE TABLE IF NOT EXISTS public.user_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token_id VARCHAR(128) NOT NULL, -- Token emitido pelo PSP/Gateway
  brand VARCHAR(32) NOT NULL DEFAULT 'mastercard', -- 'visa', 'mastercard', 'elo', 'amex'
  last_four_digits VARCHAR(4) NOT NULL,
  cardholder_name VARCHAR(128) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_user_payment_methods_user ON public.user_payment_methods(user_id);

-- 3. CAMPANHAS E CUPONS GERENCIADOS PELO ADMIN (campaigns_coupons)
CREATE TABLE IF NOT EXISTS public.campaigns_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  discount_type VARCHAR(16) NOT NULL DEFAULT 'PERCENT' CHECK (discount_type IN ('PERCENT', 'FIXED_CENTS')),
  discount_value NUMERIC(10, 2) NOT NULL, -- Ex: 20 (para 20%) ou 10.00 (para R$ 10)
  min_trip_cents BIGINT NOT NULL DEFAULT 0,
  max_redemptions INT DEFAULT 1000,
  redeemed_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_coupons_code ON public.campaigns_coupons(code);
CREATE INDEX IF NOT EXISTS idx_campaigns_coupons_active ON public.campaigns_coupons(is_active);

-- Seed de Cupons Oficiais da Operação
INSERT INTO public.campaigns_coupons (
  id, code, description, discount_type, discount_value, min_trip_cents, is_active
) VALUES 
(
  gen_random_uuid(), 'PARTIU20', '20% OFF na sua próxima corrida urbana', 'PERCENT', 20.00, 0, true
),
(
  gen_random_uuid(), 'PARTIU10', 'R$ 10 de desconto em corridas ou entregas', 'FIXED_CENTS', 10.00, 1500, true
),
(
  gen_random_uuid(), 'RODRIGO10', 'R$ 10 OFF bônus exclusivo de indicação', 'FIXED_CENTS', 10.00, 1000, true
)
ON CONFLICT (code) DO NOTHING;

-- 4. CUPONS RESGATADOS POR USUÁRIOS (user_coupons)
CREATE TABLE IF NOT EXISTS public.user_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  coupon_id UUID REFERENCES public.campaigns_coupons(id) ON DELETE CASCADE,
  code VARCHAR(32) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_user_coupon UNIQUE (user_id, code)
);

CREATE INDEX IF NOT EXISTS idx_user_coupons_user ON public.user_coupons(user_id, is_active);

-- 5. CAPTAÇÃO DE NOVOS MOTORISTAS (driver_applications)
-- Funil de conversão para o modelo SaaS Diária Fixa
CREATE TABLE IF NOT EXISTS public.driver_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name VARCHAR(128) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  email VARCHAR(128),
  vehicle_type VARCHAR(16) NOT NULL DEFAULT 'CARRO' CHECK (vehicle_type IN ('MOTO', 'CARRO')),
  vehicle_model VARCHAR(64) NOT NULL,
  vehicle_plate VARCHAR(16) NOT NULL,
  vehicle_year VARCHAR(8) NOT NULL DEFAULT '2022',
  cnh_number VARCHAR(32),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'EM_ANALISE', 'APROVADO', 'REJEITADO')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_driver_applications_status ON public.driver_applications(status);
CREATE INDEX IF NOT EXISTS idx_driver_applications_created ON public.driver_applications(created_at DESC);

-- 6. EXTENSÃO DA TABELA app_settings COM CONTATOS SUPORTE 24H E VERSÃO
ALTER TABLE public.app_settings 
  ADD COLUMN IF NOT EXISTS whatsapp_support VARCHAR(32) DEFAULT '(22) 99605-1620',
  ADD COLUMN IF NOT EXISTS phone_emergency VARCHAR(32) DEFAULT '190',
  ADD COLUMN IF NOT EXISTS app_version VARCHAR(16) DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS support_hours VARCHAR(64) DEFAULT '24 Horas por dia • 7 dias por semana';

-- Atualiza linha padrão global
UPDATE public.app_settings 
SET 
  whatsapp_support = COALESCE(whatsapp_support, '(22) 99605-1620'),
  phone_emergency = COALESCE(phone_emergency, '190'),
  app_version = COALESCE(app_version, '1.0.0')
WHERE id = 'global';

-- 7. PREFERÊNCIAS DO USUÁRIO NA TABELA partiu_passageiros
ALTER TABLE public.partiu_passageiros
  ADD COLUMN IF NOT EXISTS pref_push_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS pref_whatsapp_alerts BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS pref_ac BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS pref_quiet_trip BOOLEAN DEFAULT false;

-- 8. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura e Escrita
CREATE POLICY "user_addresses_select" ON public.user_addresses FOR SELECT USING (true);
CREATE POLICY "user_addresses_all" ON public.user_addresses FOR ALL USING (true);

CREATE POLICY "user_payment_methods_select" ON public.user_payment_methods FOR SELECT USING (true);
CREATE POLICY "user_payment_methods_all" ON public.user_payment_methods FOR ALL USING (true);

CREATE POLICY "campaigns_coupons_select" ON public.campaigns_coupons FOR SELECT USING (true);
CREATE POLICY "campaigns_coupons_all" ON public.campaigns_coupons FOR ALL USING (true);

CREATE POLICY "user_coupons_select" ON public.user_coupons FOR SELECT USING (true);
CREATE POLICY "user_coupons_all" ON public.user_coupons FOR ALL USING (true);

CREATE POLICY "driver_applications_select" ON public.driver_applications FOR SELECT USING (true);
CREATE POLICY "driver_applications_all" ON public.driver_applications FOR ALL USING (true);
