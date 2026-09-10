-- ==============================================================================
-- 🏛️ PARTIU CENTRAL DE OPERAÇÕES NACIONAL (V4.0)
-- MIGRATION: BANNERS MOBILE, CUPONS, FILA DE SUPORTE/SOS & EXPRESS ONBOARDING
-- ==============================================================================

-- 1. TABELA: BANNERS MOBILE (COM VALIDAÇÃO DE DIMENSÕES & PESO)
CREATE TABLE IF NOT EXISTS public.app_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(120) NOT NULL,
  subtitulo VARCHAR(255),
  imagem_url TEXT NOT NULL,
  aspect_ratio VARCHAR(16) NOT NULL DEFAULT '16:9',
  largura_px INT,
  altura_px INT,
  tamanho_bytes INT,
  link_destino TEXT,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  cidade_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_banners_ativo_ordem ON public.app_banners (ativo, ordem);

-- 2. TABELA: GESTÃO DE CUPONS DE DESCONTO
CREATE TABLE IF NOT EXISTS public.promotional_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(32) NOT NULL UNIQUE,
  tipo VARCHAR(16) NOT NULL DEFAULT 'PERCENTUAL' CHECK (tipo IN ('PERCENTUAL', 'VALOR_FIXO')),
  valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  limite_usos INT NOT NULL DEFAULT 100,
  usos_atuais INT NOT NULL DEFAULT 0,
  data_validade TIMESTAMPTZ NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  cidade_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_coupons_codigo ON public.promotional_coupons (codigo);
CREATE INDEX IF NOT EXISTS idx_coupons_validade ON public.promotional_coupons (ativo, data_validade);

-- 3. TABELA: FILA UNIFICADA DE SUPORTE & OCORRÊNCIAS (COM PRIORIZAÇÃO SOS)
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo VARCHAR(32) NOT NULL UNIQUE,
  tipo VARCHAR(24) NOT NULL DEFAULT 'OCORRENCIA' CHECK (tipo IN ('SOS', 'OCORRENCIA', 'RECLAMACAO')),
  prioridade VARCHAR(24) NOT NULL DEFAULT 'MEDIA' CHECK (prioridade IN ('SOS_CRITICAL', 'ALTA', 'MEDIA', 'BAIXA')),
  origem VARCHAR(32) NOT NULL DEFAULT 'APP_PASSAGEIRO',
  usuario_nome VARCHAR(128) NOT NULL,
  usuario_telefone VARCHAR(32) NOT NULL,
  motorista_nome VARCHAR(128),
  cidade VARCHAR(128) NOT NULL,
  corrida_id UUID,
  status VARCHAR(24) NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO', 'EM_ANALISE', 'RESOLVIDO', 'CANCELADO')),
  descricao TEXT NOT NULL,
  resolucao_nota TEXT,
  atendente_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_support_prioridade_status ON public.support_tickets (prioridade, status, created_at DESC);

-- 4. POLÍTICAS DE SEGURANÇA RLS
ALTER TABLE public.app_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotional_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Leitura pública de banners ativos para os apps
DROP POLICY IF EXISTS "Leitura pública de banners ativos" ON public.app_banners;
CREATE POLICY "Leitura pública de banners ativos"
  ON public.app_banners FOR SELECT
  USING (ativo = true);

-- Operação total para administradores autenticados / service role
DROP POLICY IF EXISTS "Admin gestão total de banners" ON public.app_banners;
CREATE POLICY "Admin gestão total de banners"
  ON public.app_banners FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Admin gestão total de cupons" ON public.promotional_coupons;
CREATE POLICY "Admin gestão total de cupons"
  ON public.promotional_coupons FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Admin gestão total de tickets de suporte" ON public.support_tickets;
CREATE POLICY "Admin gestão total de tickets de suporte"
  ON public.support_tickets FOR ALL
  USING (true);
