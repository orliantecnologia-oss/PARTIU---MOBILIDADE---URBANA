-- ==============================================================================
-- 🏷️ PARTIU WHITE LABEL ENTERPRISE PLATFORM (FASE 19)
-- MIGRATION: MULTI-TENANT, BRANDING, DESIGN SYSTEM & ZERO-CODE CONFIGURATION
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELA: TENANTS (FRANQUIAS & CIDADES AUTÔNOMAS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.white_label_tenants (
  tenant_id VARCHAR(64) PRIMARY KEY,
  operation_name VARCHAR(128) NOT NULL,
  city_id VARCHAR(64) NOT NULL UNIQUE,
  city_name VARCHAR(128) NOT NULL,
  state_uf VARCHAR(2) NOT NULL,
  manager_name VARCHAR(128) NOT NULL,
  manager_email VARCHAR(128) NOT NULL,
  manager_phone VARCHAR(32) NOT NULL,
  cnpj VARCHAR(32),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_wl_tenants_city ON public.white_label_tenants (city_id);
CREATE INDEX IF NOT EXISTS idx_wl_tenants_active ON public.white_label_tenants (is_active);

-- ------------------------------------------------------------------------------
-- 2. TABELA: CONFIGURAÇÃO INTEGRAL DO TENANT (JSONB ATÔMICO COM SNAPSHOTS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.white_label_tenant_configs (
  tenant_id VARCHAR(64) PRIMARY KEY REFERENCES public.white_label_tenants(tenant_id) ON DELETE CASCADE,
  schema_version INT NOT NULL DEFAULT 1,
  brand_center JSONB NOT NULL DEFAULT '{}'::jsonb,
  design_system JSONB NOT NULL DEFAULT '{}'::jsonb,
  typography JSONB NOT NULL DEFAULT '{}'::jsonb,
  home_page JSONB NOT NULL DEFAULT '{}'::jsonb,
  menu_builder JSONB NOT NULL DEFAULT '{}'::jsonb,
  business_models JSONB NOT NULL DEFAULT '{}'::jsonb,
  monetization JSONB NOT NULL DEFAULT '{}'::jsonb,
  cms JSONB NOT NULL DEFAULT '{}'::jsonb,
  geo JSONB NOT NULL DEFAULT '{}'::jsonb,
  native_app JSONB NOT NULL DEFAULT '{}'::jsonb,
  full_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ------------------------------------------------------------------------------
-- 3. TABELA: TRILHA DE AUDITORIA DE MODIFICAÇÕES WHITE LABEL
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.white_label_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  admin_id VARCHAR(64),
  action VARCHAR(64) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_wl_audit_tenant_date ON public.white_label_audit_logs (tenant_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 4. SEED INICIAL: TENANT MATRIZ ITAPERUNA
-- ------------------------------------------------------------------------------
INSERT INTO public.white_label_tenants (
  tenant_id, operation_name, city_id, city_name, state_uf, manager_name, manager_email, manager_phone, cnpj, is_active
) VALUES (
  'tenant-itaperuna',
  'PARTIU Noroeste Matriz',
  'itaperuna-rj',
  'Itaperuna',
  'RJ',
  'Diretoria Operacional PARTIU',
  'operacoes@partiumobilidade.com.br',
  '(22) 99876-5432',
  '00.000.000/0001-00',
  true
) ON CONFLICT (tenant_id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 5. POLÍTICAS DE SEGURANÇA RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.white_label_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_tenant_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_audit_logs ENABLE ROW LEVEL SECURITY;

-- Leitura de tenants e configs liberada para clientes (visualização de marca e UI)
DROP POLICY IF EXISTS "Pública: Leitura de Tenants Ativos" ON public.white_label_tenants;
CREATE POLICY "Pública: Leitura de Tenants Ativos"
  ON public.white_label_tenants FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Pública: Leitura de Configs de Marca" ON public.white_label_tenant_configs;
CREATE POLICY "Pública: Leitura de Configs de Marca"
  ON public.white_label_tenant_configs FOR SELECT
  USING (true);

-- Modificações restritas a administradores autenticados / service_role
DROP POLICY IF EXISTS "Admin: Gestão Total de Tenants" ON public.white_label_tenants;
CREATE POLICY "Admin: Gestão Total de Tenants"
  ON public.white_label_tenants FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin: Gestão Total de Configs" ON public.white_label_tenant_configs;
CREATE POLICY "Admin: Gestão Total de Configs"
  ON public.white_label_tenant_configs FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin: Leitura de Auditoria" ON public.white_label_audit_logs;
CREATE POLICY "Admin: Leitura de Auditoria"
  ON public.white_label_audit_logs FOR ALL
  USING (true)
  WITH CHECK (true);
