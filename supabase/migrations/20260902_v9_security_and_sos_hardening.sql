-- ==============================================================================
-- 🛡️ MIGRATION V9 — ENTERPRISE HARDENING & PRODUCTION READINESS V6.0
-- 1. Funções SECURITY DEFINER para checagem de roles sem recursão infinita RLS
-- 2. Trava atômica anti-concorrência para reserva de assentos (Anti-Overbooking)
-- 3. Criação e blindagem estrutural da tabela public.alertas_sos
-- ==============================================================================

-- 1. TABELA DE ROLES DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'passageiro',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_roles UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Funções SECURITY DEFINER com search_path seguro (Zero Recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'superadmin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, anon, service_role;

-- Política simples em user_roles sem auto-referência direta
DROP POLICY IF EXISTS "Leitura de roles proprias ou admin" ON public.user_roles;
DROP POLICY IF EXISTS "Leitura de roles proprias" ON public.user_roles;
CREATE POLICY "Leitura de roles proprias" ON public.user_roles
    FOR SELECT
    USING (
        auth.uid() = user_id OR public.is_admin(auth.uid())
    );


-- 2. PROCEDURE ATÔMICA POSTGRESQL PARA RESERVA DE ASSENTOS COM FOR UPDATE
CREATE OR REPLACE FUNCTION public.reservar_vagas_viagem_atomica(
    p_viagem_id UUID,
    p_quantidade INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_vagas_ocupadas INTEGER;
    v_vagas_totais INTEGER;
BEGIN
    -- Validação de entrada
    IF p_quantidade <= 0 THEN
        RETURN jsonb_build_object('sucesso', false, 'erro', 'QUANTIDADE_INVALIDA');
    END IF;

    -- Bloqueio pessimista de linha com FOR UPDATE (impede race conditions concorrentes)
    SELECT vagas_ocupadas, vagas_totais
    INTO v_vagas_ocupadas, v_vagas_totais
    FROM public.viagens
    WHERE id = p_viagem_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('sucesso', false, 'erro', 'VIAGEM_NAO_ENCONTRADA');
    END IF;

    -- Invariante mandatória: se ultrapassar o total de assentos, aborta sem alterar
    IF (v_vagas_ocupadas + p_quantidade) > v_vagas_totais THEN
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'VAGAS_INSUFICIENTES',
            'vagas_disponiveis', (v_vagas_totais - v_vagas_ocupadas),
            'solicitadas', p_quantidade
        );
    END IF;

    -- Atualização estritamente atômica
    UPDATE public.viagens
    SET vagas_ocupadas = vagas_ocupadas + p_quantidade
    WHERE id = p_viagem_id;

    RETURN jsonb_build_object(
        'sucesso', true,
        'viagem_id', p_viagem_id,
        'vagas_reservadas', p_quantidade,
        'novas_vagas_ocupadas', v_vagas_ocupadas + p_quantidade,
        'vagas_restantes', v_vagas_totais - (v_vagas_ocupadas + p_quantidade)
    );
END;
$$;

-- Permissões de execução da RPC
GRANT EXECUTE ON FUNCTION public.reservar_vagas_viagem_atomica(UUID, INTEGER) TO authenticated, anon, service_role;


-- 3. CRIAÇÃO E HARDENING ESTRUTURAL DE ALERTAS_SOS
CREATE TABLE IF NOT EXISTS public.alertas_sos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(50) NOT NULL,
    solicitante_nome VARCHAR(255) NOT NULL,
    solicitante_telefone VARCHAR(50),
    van_placa VARCHAR(20),
    motorista_nome VARCHAR(255),
    rodovia VARCHAR(255),
    coordenadas VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'ativo',
    descricao TEXT,
    tenant_id VARCHAR(50) NOT NULL DEFAULT 'COOP_ALAGOAS_CENTRAL',
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_origem VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantia de colunas caso a tabela já existisse em versão anterior
ALTER TABLE public.alertas_sos ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'COOP_ALAGOAS_CENTRAL';
ALTER TABLE public.alertas_sos ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.alertas_sos ADD COLUMN IF NOT EXISTS ip_origem VARCHAR(45);

-- Habilitar RLS rigoroso
ALTER TABLE public.alertas_sos ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Qualquer passageiro ou motorista pode acionar SOS" ON public.alertas_sos;
DROP POLICY IF EXISTS "Leitura pública de chamados ativos e central" ON public.alertas_sos;
DROP POLICY IF EXISTS "Admins e motoristas gerenciam status do SOS" ON public.alertas_sos;
DROP POLICY IF EXISTS "SOS_INSERT_PROTEGIDO" ON public.alertas_sos;
DROP POLICY IF EXISTS "SOS_SELECT_ISOLADO" ON public.alertas_sos;
DROP POLICY IF EXISTS "SOS_UPDATE_RESTRITO_ADMIN" ON public.alertas_sos;

-- Política de Inserção Protegida: exige identificação do solicitante (impede bots anônimos sem dados)
CREATE POLICY "SOS_INSERT_PROTEGIDO" ON public.alertas_sos
    FOR INSERT
    WITH CHECK (
        solicitante_nome IS NOT NULL AND
        length(trim(solicitante_nome)) >= 2 AND
        solicitante_telefone IS NOT NULL AND
        length(trim(solicitante_telefone)) >= 8
    );

-- Política de Visualização (sem recursão: utiliza as funções SECURITY DEFINER)
CREATE POLICY "SOS_SELECT_ISOLADO" ON public.alertas_sos
    FOR SELECT
    USING (
        (auth.uid() IS NOT NULL AND auth.uid() = usuario_id) OR
        public.is_admin(auth.uid()) OR
        public.has_role(auth.uid(), 'motorista') OR
        (auth.role() = 'anon' AND status = 'ativo')
    );

-- Política de Atualização (apenas admins via SECURITY DEFINER)
CREATE POLICY "SOS_UPDATE_RESTRITO_ADMIN" ON public.alertas_sos
    FOR UPDATE
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Índices de consulta otimizada por cooperativa e status
CREATE INDEX IF NOT EXISTS idx_alertas_sos_tenant_status ON public.alertas_sos(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_alertas_sos_created_at ON public.alertas_sos(created_at DESC);

-- Habilitar replicação em tempo real no Supabase Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'alertas_sos'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.alertas_sos;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
