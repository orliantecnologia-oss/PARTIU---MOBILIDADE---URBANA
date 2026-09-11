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
