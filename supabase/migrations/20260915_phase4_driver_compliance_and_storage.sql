-- ==============================================================================
-- 🚀 FASE 4: ONBOARDING COMPLIANCE (CNH/CRLV STORAGE) E OBSERVABILIDADE SRE
-- Data de Criação: 2026-09-15
-- Compatibilidade: Supabase PostgreSQL 15+ / Lovable Sync
-- ==============================================================================

-- 1. Colunas para Armazenamento de Documentos Reais de Motoristas
ALTER TABLE public.partiu_motoristas 
  ADD COLUMN IF NOT EXISTS cnh_url TEXT,
  ADD COLUMN IF NOT EXISTS crlv_url TEXT;

-- 2. Garantir Criação de Bucket de Documentos de Motoristas (driver-documents)
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-documents', 'driver-documents', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de RLS para o Storage de Documentos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Permitir upload de documentos de motoristas'
  ) THEN
    CREATE POLICY "Permitir upload de documentos de motoristas"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'driver-documents');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Permitir leitura de documentos de motoristas'
  ) THEN
    CREATE POLICY "Permitir leitura de documentos de motoristas"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'driver-documents');
  END IF;
END $$;
