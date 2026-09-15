-- ==============================================================================
-- 🏛️ PARTIU MOBILIDADE URBANA — MIGRATION 20260914
-- GESTÃO DE PERFIL/VEÍCULO DO MOTORISTA & MOTOR DE PUSH NOTIFICATIONS REAIS
-- ==============================================================================

-- 1. ADICIONA PUSH TOKEN NAS TABELAS DE PERFIL
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fcm_token TEXT;
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_status VARCHAR(40) DEFAULT 'APROVADO';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partiu_motoristas') THEN
        ALTER TABLE public.partiu_motoristas ADD COLUMN IF NOT EXISTS push_token TEXT;
        ALTER TABLE public.partiu_motoristas ADD COLUMN IF NOT EXISTS vehicle_status VARCHAR(40) DEFAULT 'APROVADO';
        ALTER TABLE public.partiu_motoristas ADD COLUMN IF NOT EXISTS pending_vehicle_data JSONB DEFAULT '{}'::jsonb;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'drivers') THEN
        ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS push_token TEXT;
        ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS vehicle_status VARCHAR(40) DEFAULT 'APROVADO';
    END IF;
END $$;

-- 2. TABELA DE NOTIFICAÇÕES (SUPABASE REALTIME & IN-APP NOTIFICATIONS)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    recipient_user_id UUID,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'sistema',
    is_read BOOLEAN DEFAULT false,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
    read_at TIMESTAMPTZ
);

-- Adequação de colunas caso a tabela já existisse com schema v3
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_user_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title VARCHAR(200);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'sistema';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Índices de alta performance para busca e contagem de não lidos
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON public.notifications(recipient_user_id, is_read, created_at DESC);

-- 3. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ler suas próprias notificações" ON public.notifications;
CREATE POLICY "Usuários podem ler suas próprias notificações" ON public.notifications
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = recipient_user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar status de suas próprias notificações" ON public.notifications;
CREATE POLICY "Usuários podem atualizar status de suas próprias notificações" ON public.notifications
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = recipient_user_id);

DROP POLICY IF EXISTS "Serviço e sistema podem inserir notificações" ON public.notifications;
CREATE POLICY "Serviço e sistema podem inserir notificações" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Permite leitura anônima em ambiente de demonstração/testes se necessário
DROP POLICY IF EXISTS "Acesso público controlado a notificações para demo" ON public.notifications;
CREATE POLICY "Acesso público controlado a notificações para demo" ON public.notifications
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);

-- 4. ATIVAÇÃO DE SUPABASE REALTIME
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- 5. BUCKET DE AVATARES NO SUPABASE STORAGE
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('avatars', 'avatars', true)
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO storage.buckets (id, name, public)
        VALUES ('avatares', 'avatares', true)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Políticas de Storage para upload de avatar
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
        DROP POLICY IF EXISTS "Avatares são publicamente acessíveis" ON storage.objects;
        CREATE POLICY "Avatares são publicamente acessíveis" ON storage.objects
            FOR SELECT USING (bucket_id IN ('avatars', 'avatares'));

        DROP POLICY IF EXISTS "Usuários podem enviar seus próprios avatares" ON storage.objects;
        CREATE POLICY "Usuários podem enviar seus próprios avatares" ON storage.objects
            FOR INSERT WITH CHECK (bucket_id IN ('avatars', 'avatares'));

        DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios avatares" ON storage.objects;
        CREATE POLICY "Usuários podem atualizar seus próprios avatares" ON storage.objects
            FOR UPDATE USING (bucket_id IN ('avatars', 'avatares'));
    END IF;
END $$;
