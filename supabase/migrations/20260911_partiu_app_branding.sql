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
