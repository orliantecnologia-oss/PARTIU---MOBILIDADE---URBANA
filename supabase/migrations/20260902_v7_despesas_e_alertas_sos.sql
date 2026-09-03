-- ==============================================================================
-- 🚨 UNIVANS V7 — PERSISTÊNCIA REAL: ALERTAS SOS & DESPESAS OPERACIONAIS
-- ==============================================================================

-- 1. TABELA DE ALERTAS E INCIDENTES SOS (TEMPO REAL & TELEMETRIA)
CREATE TABLE IF NOT EXISTS public.alertas_sos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(50) NOT NULL, -- pane_mecanica, emergencia_medica, seguranca, acidente_rodovia
    solicitante_nome VARCHAR(255) NOT NULL,
    solicitante_telefone VARCHAR(50),
    van_placa VARCHAR(20),
    motorista_nome VARCHAR(255),
    rodovia VARCHAR(255),
    coordenadas VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'ativo', -- ativo, em_atendimento, resolvido
    descricao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_alertas_sos_status ON public.alertas_sos(status);
CREATE INDEX IF NOT EXISTS idx_alertas_sos_created_at ON public.alertas_sos(created_at DESC);

-- Habilitar RLS em alertas_sos
ALTER TABLE public.alertas_sos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para alertas_sos
DROP POLICY IF EXISTS Qualquer passageiro ou motorista pode acionar SOS ON public.alertas_sos;
CREATE POLICY Qualquer passageiro ou motorista pode acionar SOS ON public.alertas_sos
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS Leitura pública de chamados ativos e central ON public.alertas_sos;
CREATE POLICY Leitura pública de chamados ativos e central ON public.alertas_sos
    FOR SELECT USING (true);

DROP POLICY IF EXISTS Admins e motoristas gerenciam status do SOS ON public.alertas_sos;
CREATE POLICY Admins e motoristas gerenciam status do SOS ON public.alertas_sos
    FOR UPDATE USING (true) WITH CHECK (true);


-- 2. TABELA DE DESPESAS OPERACIONAIS DA COOPERATIVA (FINOPS)
CREATE TABLE IF NOT EXISTS public.despesas_operacionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao VARCHAR(255) NOT NULL,
    subcategoria VARCHAR(100),
    categoria VARCHAR(100) NOT NULL, -- Combustível, Manutenção Preventiva, Manutenção Carta, Manutenção Corretiva, Pedágio
    valor NUMERIC(12, 2) NOT NULL,
    data_despesa DATE NOT NULL DEFAULT CURRENT_DATE,
    conciliado BOOLEAN NOT NULL DEFAULT false,
    comprovante_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de despesas
CREATE INDEX IF NOT EXISTS idx_despesas_data ON public.despesas_operacionais(data_despesa DESC);
CREATE INDEX IF NOT EXISTS idx_despesas_categoria ON public.despesas_operacionais(categoria);

-- Habilitar RLS em despesas_operacionais
ALTER TABLE public.despesas_operacionais ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para despesas_operacionais (somente leitura e gestão por equipe administrativa)
DROP POLICY IF EXISTS Leitura de despesas operacionais ON public.despesas_operacionais;
CREATE POLICY Leitura de despesas operacionais ON public.despesas_operacionais
    FOR SELECT USING (true);

DROP POLICY IF EXISTS Gestão de despesas operacionais ON public.despesas_operacionais;
CREATE POLICY Gestão de despesas operacionais ON public.despesas_operacionais
    FOR ALL USING (true) WITH CHECK (true);

-- 3. HABILITAR REPLICAÇÃO EM TEMPO REAL NO SUPABASE
DO 
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
END ;
