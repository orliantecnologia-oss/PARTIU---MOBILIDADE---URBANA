-- ==============================================================================
-- 🚗 PARTIU MOBILIDADE URBANA — CORRIDA PARA TERCEIROS (PADRÃO 99 / UBER)
-- ==============================================================================
-- Permite que um usuário chame uma corrida indicando outra pessoa para embarcar,
-- com nome e telefone específicos para contato direto pelo motorista via ligação/WhatsApp.
-- ==============================================================================

DO $$
BEGIN
    -- Adiciona campos na tabela corridas se a tabela existir
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'corridas') THEN
        ALTER TABLE public.corridas ADD COLUMN IF NOT EXISTS is_for_other_person BOOLEAN DEFAULT false;
        ALTER TABLE public.corridas ADD COLUMN IF NOT EXISTS other_person_name TEXT;
        ALTER TABLE public.corridas ADD COLUMN IF NOT EXISTS other_person_phone TEXT;
        ALTER TABLE public.corridas ADD COLUMN IF NOT EXISTS solicitante_nome TEXT;
        ALTER TABLE public.corridas ADD COLUMN IF NOT EXISTS solicitante_telefone TEXT;
    END IF;

    -- Adiciona campos na tabela rides se a tabela existir (compatibilidade esquema em inglês)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rides') THEN
        ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS is_for_other_person BOOLEAN DEFAULT false;
        ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS other_person_name TEXT;
        ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS other_person_phone TEXT;
        ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS solicitante_nome TEXT;
        ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS solicitante_telefone TEXT;
    END IF;
END $$;
