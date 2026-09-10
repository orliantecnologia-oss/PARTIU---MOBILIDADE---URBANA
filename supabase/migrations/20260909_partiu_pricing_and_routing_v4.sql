-- ==============================================================================
-- 🚀 PARTIU MOBILIDADE URBANA — ROUTING, PRICING RULES & AUDIT V4.0 SCHEMA
-- MIGRATION: pricing_rules, app_settings extension, surge bounds & category multipliers
-- ==============================================================================

-- 1. EXTENSÃO DA TABELA app_settings COM MULTIPLICADORES E TARIFAS MÍNIMAS
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS minimum_fare NUMERIC(10, 2) NOT NULL DEFAULT 8.00,
  ADD COLUMN IF NOT EXISTS surge_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS motorcycle_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 0.75,
  ADD COLUMN IF NOT EXISTS car_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS executive_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.40,
  ADD COLUMN IF NOT EXISTS flash_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 0.85,
  ADD COLUMN IF NOT EXISTS delivery_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.25,
  ADD COLUMN IF NOT EXISTS turismo_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.60,
  ADD COLUMN IF NOT EXISTS van_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.90,
  ADD COLUMN IF NOT EXISTS night_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.15;

-- Atualizar linha global existente com os valores calibrados
UPDATE public.app_settings
SET
  minimum_fare = 8.00,
  surge_multiplier = 1.00,
  motorcycle_multiplier = 0.75,
  car_multiplier = 1.00,
  executive_multiplier = 1.40,
  flash_multiplier = 0.85,
  delivery_multiplier = 1.25,
  turismo_multiplier = 1.60,
  van_multiplier = 1.90,
  night_multiplier = 1.15,
  updated_at = clock_timestamp()
WHERE id = 'global';

-- 2. TABELA ESPECÍFICA DE REGRAS DE PRECIFICAÇÃO POR CATEGORIA E REGIÃO (pricing_rules)
CREATE TABLE IF NOT EXISTS public.pricing_rules (
  id VARCHAR(64) PRIMARY KEY,
  category_code VARCHAR(32) NOT NULL,
  region_code VARCHAR(32) NOT NULL DEFAULT 'GLOBAL',
  base_fare NUMERIC(10, 2) NOT NULL,
  price_per_km NUMERIC(10, 2) NOT NULL,
  price_per_minute NUMERIC(10, 2) NOT NULL,
  minimum_fare NUMERIC(10, 2) NOT NULL,
  category_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
  max_surge_cap NUMERIC(4, 2) NOT NULL DEFAULT 2.50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Inserir as 7 categorias oficiais
INSERT INTO public.pricing_rules (
  id, category_code, region_code, base_fare, price_per_km, price_per_minute,
  minimum_fare, category_multiplier, max_surge_cap, is_active
) VALUES
  ('rule_moto_global', 'PARTIU_MOTO', 'GLOBAL', 4.50, 1.40, 0.22, 7.00, 0.75, 2.50, true),
  ('rule_carro_global', 'PARTIU_CARRO', 'GLOBAL', 6.00, 1.80, 0.30, 10.00, 1.00, 2.50, true),
  ('rule_executivo_global', 'PARTIU_EXECUTIVO', 'GLOBAL', 8.50, 2.50, 0.42, 15.00, 1.40, 2.50, true),
  ('rule_flash_global', 'PARTIU_FLASH', 'GLOBAL', 5.50, 1.50, 0.25, 8.50, 0.85, 2.00, true),
  ('rule_entrega_global', 'PARTIU_ENTREGA', 'GLOBAL', 10.00, 2.20, 0.38, 16.00, 1.25, 2.20, true),
  ('rule_turismo_global', 'PARTIU_TURISMO', 'GLOBAL', 15.00, 3.00, 0.50, 25.00, 1.60, 2.00, true),
  ('rule_van_global', 'PARTIU_VAN', 'GLOBAL', 20.00, 3.50, 0.60, 35.00, 1.90, 2.00, true)
ON CONFLICT (id) DO UPDATE SET
  base_fare = EXCLUDED.base_fare,
  price_per_km = EXCLUDED.price_per_km,
  price_per_minute = EXCLUDED.price_per_minute,
  minimum_fare = EXCLUDED.minimum_fare,
  category_multiplier = EXCLUDED.category_multiplier,
  updated_at = clock_timestamp();

-- 3. RLS E SEGURANÇA
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_rules_public_read" ON public.pricing_rules
  FOR SELECT USING (true);

CREATE POLICY "pricing_rules_admin_write" ON public.pricing_rules
  FOR ALL USING (true);
