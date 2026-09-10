-- ==============================================================================
-- 🚀 PARTIU ECOSYSTEM END-TO-END SCHEMA & GLOBAL SETTINGS
-- MIGRATION: app_settings, driver_subscriptions, banners, drivers
-- ==============================================================================

-- 1. TABELA: CONFIGURAÇÕES GLOBAIS DA OPERAÇÃO (app_settings)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id VARCHAR(64) PRIMARY KEY DEFAULT 'global',
  daily_fee_car NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
  daily_fee_moto NUMERIC(10, 2) NOT NULL DEFAULT 5.00,
  base_fare_ride NUMERIC(10, 2) NOT NULL DEFAULT 6.00,
  base_fare_delivery NUMERIC(10, 2) NOT NULL DEFAULT 5.00,
  price_per_km NUMERIC(10, 2) NOT NULL DEFAULT 1.80,
  price_per_minute NUMERIC(10, 2) NOT NULL DEFAULT 0.30,
  is_delivery_active BOOLEAN NOT NULL DEFAULT true,
  is_ride_active BOOLEAN NOT NULL DEFAULT true,
  currency_symbol VARCHAR(8) NOT NULL DEFAULT 'R$',
  pix_key VARCHAR(128) NOT NULL DEFAULT 'financeiro@partiumobilidade.com.br',
  pix_receiver_name VARCHAR(128) NOT NULL DEFAULT 'PARTIU MOBILIDADE URBANA LTDA',
  pix_receiver_city VARCHAR(64) NOT NULL DEFAULT 'ITAPERUNA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Inserir ou atualizar linha única global
INSERT INTO public.app_settings (
  id, daily_fee_car, daily_fee_moto, base_fare_ride, base_fare_delivery,
  price_per_km, price_per_minute, is_delivery_active, is_ride_active,
  pix_key, pix_receiver_name, pix_receiver_city
) VALUES (
  'global', 10.00, 5.00, 6.00, 5.00,
  1.80, 0.30, true, true,
  'financeiro@partiumobilidade.com.br', 'PARTIU MOBILIDADE URBANA LTDA', 'ITAPERUNA'
) ON CONFLICT (id) DO UPDATE SET
  daily_fee_car = EXCLUDED.daily_fee_car,
  daily_fee_moto = EXCLUDED.daily_fee_moto,
  base_fare_ride = EXCLUDED.base_fare_ride,
  base_fare_delivery = EXCLUDED.base_fare_delivery,
  price_per_km = EXCLUDED.price_per_km,
  price_per_minute = EXCLUDED.price_per_minute,
  is_delivery_active = EXCLUDED.is_delivery_active,
  is_ride_active = EXCLUDED.is_ride_active,
  updated_at = clock_timestamp();

-- 2. TABELA: ASSINATURAS / DIÁRIAS DOS MOTORISTAS (driver_subscriptions)
-- Modelo SaaS Puro: 100% da corrida para o motorista, 0% de comissão retida.
CREATE TABLE IF NOT EXISTS public.driver_subscriptions (
  id VARCHAR(64) PRIMARY KEY,
  driver_id VARCHAR(64) NOT NULL,
  vehicle_type VARCHAR(16) NOT NULL CHECK (vehicle_type IN ('MOTO', 'CARRO')),
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('ACTIVE', 'EXPIRED', 'PENDING', 'CANCELLED')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  expires_at TIMESTAMPTZ NOT NULL,
  pix_txid VARCHAR(128),
  amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_driver_subscriptions_driver ON public.driver_subscriptions(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_subscriptions_status ON public.driver_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_driver_subscriptions_expires ON public.driver_subscriptions(expires_at DESC);

-- 3. TABELA: BANNERS PROMOCIONAIS (banners)
-- Suporte aos novos campos do Ecossistema e aos campos legados para retrocompatibilidade
CREATE TABLE IF NOT EXISTS public.banners (
  id VARCHAR(64) PRIMARY KEY,
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL DEFAULT '/app',
  order_index INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  category VARCHAR(32) NOT NULL DEFAULT 'PASSENGER' CHECK (category IN ('PASSENGER', 'DRIVER', 'ALL')),
  title TEXT NOT NULL,
  subtitle TEXT,
  badge TEXT,
  -- Colunas legadas para retrocompatibilidade
  imagem_url TEXT,
  link_destino TEXT,
  ordem INTEGER,
  ativo BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_banners_category_active ON public.banners(category, is_active, order_index ASC);

-- Seed de Banners Iniciais Oficiais
INSERT INTO public.banners (
  id, image_url, link_url, order_index, is_active, category, title, subtitle, badge,
  imagem_url, link_destino, ordem, ativo
) VALUES
(
  'banner-corridas-seguras',
  'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&auto=format&fit=crop&q=80',
  '/app',
  1,
  true,
  'PASSENGER',
  'Partiu Mobilidade',
  'Carros confortáveis e motoristas auditados 24h',
  'VIAGENS SEGURAS',
  'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&auto=format&fit=crop&q=80',
  '/app',
  1,
  true
),
(
  'banner-entregas-flash',
  'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80',
  '/app/encomendas',
  2,
  true,
  'PASSENGER',
  'Partiu Entregas com Duplo PIN',
  'Envie documentos e pacotes com segurança total',
  'ENTREGA FLASH',
  'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80',
  '/app/encomendas',
  2,
  true
),
(
  'banner-motorista-saas',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
  '/cadastro-motorista',
  3,
  true,
  'DRIVER',
  'Seja Motorista Parceiro',
  'Diária fixa e 100% do ganho da corrida para você',
  '0% DE COMISSÃO',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
  '/cadastro-motorista',
  3,
  true
)
ON CONFLICT (id) DO UPDATE SET
  image_url = EXCLUDED.image_url,
  link_url = EXCLUDED.link_url,
  order_index = EXCLUDED.order_index,
  is_active = EXCLUDED.is_active,
  category = EXCLUDED.category,
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  badge = EXCLUDED.badge,
  updated_at = clock_timestamp();

-- 4. TABELA: MOTORISTAS DA PLATAFORMA (drivers)
-- Bimodalidade Estrita: MOTO ou CARRO.
CREATE TABLE IF NOT EXISTS public.drivers (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  cnh VARCHAR(32) NOT NULL,
  vehicle_type VARCHAR(16) NOT NULL CHECK (vehicle_type IN ('MOTO', 'CARRO')),
  license_plate VARCHAR(16) NOT NULL,
  vehicle_model VARCHAR(64) NOT NULL DEFAULT 'Veículo Parceiro',
  vehicle_color VARCHAR(32) NOT NULL DEFAULT 'Prata',
  status VARCHAR(32) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'APROVADO', 'REJEITADO')),
  is_online BOOLEAN NOT NULL DEFAULT false,
  current_lat NUMERIC(10, 7) DEFAULT -21.2050,
  current_lng NUMERIC(10, 7) DEFAULT -41.8880,
  cnh_image_url TEXT,
  vehicle_doc_url TEXT,
  avatar_url TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_vehicle ON public.drivers(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_drivers_online ON public.drivers(is_online);

-- Seed de Motoristas Padrão (1 Moto e 1 Carro para testes imediatos)
INSERT INTO public.drivers (
  id, name, phone, cnh, vehicle_type, license_plate, vehicle_model, vehicle_color, status, is_online
) VALUES
(
  'drv-carlos-onix',
  'Carlos Eduardo Silva',
  '(22) 99876-5432',
  '04987654321',
  'CARRO',
  'BRA-4E29',
  'Chevrolet Onix 1.0 LT',
  'Prata',
  'APROVADO',
  true
),
(
  'drv-lucas-cg160',
  'Lucas Mendes Oliveira',
  '(22) 99881-2244',
  '07891234560',
  'MOTO',
  'MOT-7799',
  'Honda CG 160 Fan',
  'Vermelha',
  'APROVADO',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  status = EXCLUDED.status,
  updated_at = clock_timestamp();

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura Pública
CREATE POLICY "app_settings_public_read" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "banners_public_read" ON public.banners FOR SELECT USING (true);
CREATE POLICY "drivers_public_read" ON public.drivers FOR SELECT USING (true);
CREATE POLICY "driver_subs_public_read" ON public.driver_subscriptions FOR SELECT USING (true);

-- Políticas de Escrita para Service Role / Admin
CREATE POLICY "app_settings_admin_write" ON public.app_settings FOR ALL USING (true);
CREATE POLICY "banners_admin_write" ON public.banners FOR ALL USING (true);
CREATE POLICY "drivers_admin_write" ON public.drivers FOR ALL USING (true);
CREATE POLICY "driver_subs_admin_write" ON public.driver_subscriptions FOR ALL USING (true);
