-- ==============================================================================
-- 🚀 UNIVANS TOS — CRIAÇÃO DOS BUCKETS DE STORAGE & POLÍTICAS DE ACESSO
-- Execute este script no SQL Editor do Supabase (projeto: lbpfwbnhkyhgaeflzuno)
-- ==============================================================================

-- 1. Inserir os 3 Buckets de Armazenamento
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('cnh', 'cnh', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('crlv', 'crlv', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('avatares', 'avatares', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Políticas de Segurança (Row-Level Security) para o Storage

-- Avatares: Leitura pública (para exibir a foto do motorista no mapa e nos cartões)
DROP POLICY IF EXISTS "Avatares leitura publica" ON storage.objects;
CREATE POLICY "Avatares leitura publica" ON storage.objects
FOR SELECT USING (bucket_id = 'avatares');

DROP POLICY IF EXISTS "Avatares upload liberado" ON storage.objects;
CREATE POLICY "Avatares upload liberado" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatares');

-- CNH: Documento sensível (upload e leitura)
DROP POLICY IF EXISTS "CNH upload liberado" ON storage.objects;
CREATE POLICY "CNH upload liberado" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'cnh');

DROP POLICY IF EXISTS "CNH leitura liberada" ON storage.objects;
CREATE POLICY "CNH leitura liberada" ON storage.objects
FOR SELECT USING (bucket_id = 'cnh');

-- CRLV: Documento do veículo
DROP POLICY IF EXISTS "CRLV upload liberado" ON storage.objects;
CREATE POLICY "CRLV upload liberado" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'crlv');

DROP POLICY IF EXISTS "CRLV leitura liberada" ON storage.objects;
CREATE POLICY "CRLV leitura liberada" ON storage.objects
FOR SELECT USING (bucket_id = 'crlv');
