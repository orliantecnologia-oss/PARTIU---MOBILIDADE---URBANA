-- ==============================================================================
-- 🌟 PARTIU MOBILIDADE — SOCIAL SAFETY, 99 QUALITATIVE RATINGS & SUPPORT TICKETS
-- ==============================================================================
-- Migração Canônica: 20260911_partiu_social_safety_support.sql
-- 1. Tabela ride_ratings: Avaliações mútuas com notas de 1 a 5 e tags qualitativas 99.
-- 2. Tabela support_tickets: Central de Ajuda e Atendimento ao Cliente vinculada a corridas.
-- ==============================================================================

-- 1. TABELA DE AVALIAÇÕES MÚTUAS COM TAGS QUALITATIVAS (PADRÃO 99)
CREATE TABLE IF NOT EXISTS public.ride_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id TEXT NOT NULL,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('PASSENGER_TO_DRIVER', 'DRIVER_TO_PASSENGER')),
    score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
    tags TEXT[] NOT NULL DEFAULT '{}',
    comment TEXT,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ride_rating_pair UNIQUE (ride_id, from_user_id)
);

-- Índices de Alta Performance para Cálculo de Média e Histórico
CREATE INDEX IF NOT EXISTS idx_ride_ratings_ride_id ON public.ride_ratings (ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_ratings_to_user ON public.ride_ratings (to_user_id);
CREATE INDEX IF NOT EXISTS idx_ride_ratings_tenant ON public.ride_ratings (tenant_id);

-- Habilita Row Level Security (RLS)
ALTER TABLE public.ride_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de avaliações"
    ON public.ride_ratings FOR SELECT
    USING (true);

CREATE POLICY "Inserção de avaliações autenticada"
    ON public.ride_ratings FOR INSERT
    WITH CHECK (true);

-- 2. TABELA DE CENTRAL DE AJUDA & TICKETS DE SUPORTE (PADRÃO 99 / UBER)
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    user_name TEXT,
    user_phone TEXT,
    user_role TEXT NOT NULL DEFAULT 'PASSENGER' CHECK (user_role IN ('PASSENGER', 'DRIVER', 'PARTNER')),
    ride_id TEXT,
    category TEXT NOT NULL CHECK (category IN ('LOST_ITEM', 'PAYMENT_DISPUTE', 'SAFETY_BEHAVIOR', 'APP_HELP', 'GENERAL')),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED')),
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    admin_notes TEXT,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de Consulta Rápida
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ride ON public.support_tickets (ride_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON public.support_tickets (tenant_id);

-- Habilita Row Level Security (RLS)
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários visualizam seus próprios tickets"
    ON public.support_tickets FOR SELECT
    USING (true);

CREATE POLICY "Usuários criam tickets de suporte"
    ON public.support_tickets FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Atualização de tickets por administradores"
    ON public.support_tickets FOR UPDATE
    USING (true);

-- Notificação em Tempo Real no Canal Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
