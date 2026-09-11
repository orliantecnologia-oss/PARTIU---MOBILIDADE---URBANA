-- ==============================================================================
-- 🛡️ PARTIU MOBILIDADE — SEGURANÇA 99 & DESPACHO EM ONDAS
-- ==============================================================================
-- 1. Gênero nos perfis e motoristas (para filtro 99Mulher)
-- 2. Flag is_female_only nas corridas e viagens
-- 3. Tabela user_blocks (Bloqueio Mútuo de Pareamento anti-reincidência)
-- ==============================================================================

-- 1. Gênero nos motoristas e perfis (tolerante à existência de tabelas)
DO $$
BEGIN
    -- Se existir partiu_motoristas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partiu_motoristas') THEN
        ALTER TABLE public.partiu_motoristas
            ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'UNSPECIFIED' CHECK (gender IN ('FEMALE', 'MALE', 'OTHER', 'UNSPECIFIED'));
    END IF;

    -- Se existir profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE public.profiles
            ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'UNSPECIFIED' CHECK (gender IN ('FEMALE', 'MALE', 'OTHER', 'UNSPECIFIED'));
    ELSE
        -- Cria tabela public.profiles para interoperabilidade caso ainda não exista
        CREATE TABLE IF NOT EXISTS public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            full_name TEXT,
            phone TEXT,
            avatar_url TEXT,
            role TEXT DEFAULT 'PASSENGER',
            gender VARCHAR(20) DEFAULT 'UNSPECIFIED',
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Profiles self select" ON public.profiles;
        CREATE POLICY "Profiles self select" ON public.profiles FOR SELECT USING (true);
        DROP POLICY IF EXISTS "Profiles self all" ON public.profiles;
        CREATE POLICY "Profiles self all" ON public.profiles FOR ALL USING (auth.uid() = id);
    END IF;

    -- Se existir partiu_passageiros
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partiu_passageiros') THEN
        ALTER TABLE public.partiu_passageiros
            ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'UNSPECIFIED' CHECK (gender IN ('FEMALE', 'MALE', 'OTHER', 'UNSPECIFIED'));
    END IF;

    -- 2. Flag 99Mulher nas corridas e viagens
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partiu_corridas') THEN
        ALTER TABLE public.partiu_corridas
            ADD COLUMN IF NOT EXISTS is_female_only BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'viagens') THEN
        ALTER TABLE public.viagens
            ADD COLUMN IF NOT EXISTS is_female_only BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'corridas') THEN
        ALTER TABLE public.corridas
            ADD COLUMN IF NOT EXISTS is_female_only BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rides') THEN
        ALTER TABLE public.rides
            ADD COLUMN IF NOT EXISTS is_female_only BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- 3. Tabela de Bloqueio Mútuo (user_blocks)
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  reason TEXT,
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_user_blocks_pair UNIQUE (blocker_id, blocked_id)
);

-- Índices de performance para busca bidirecional em O(log n)
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_tenant ON public.user_blocks(tenant_id);

-- 4. Políticas de Segurança (Row Level Security)
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem visualizar seus próprios bloqueios" ON public.user_blocks;
CREATE POLICY "Usuários podem visualizar seus próprios bloqueios"
  ON public.user_blocks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Usuários podem criar bloqueios" ON public.user_blocks;
CREATE POLICY "Usuários podem criar bloqueios"
  ON public.user_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Usuários podem remover seus próprios bloqueios" ON public.user_blocks;
CREATE POLICY "Usuários podem remover seus próprios bloqueios"
  ON public.user_blocks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Leitura de serviço (para RPC e motor de despacho)
DROP POLICY IF EXISTS "Service role possui acesso irrestrito aos bloqueios" ON public.user_blocks;
CREATE POLICY "Service role possui acesso irrestrito aos bloqueios"
  ON public.user_blocks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
