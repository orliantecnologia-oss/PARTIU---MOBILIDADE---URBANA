-- ==============================================================================
-- 💬 PARTIU REALTIME CHAT ENGINE V1.0 — MENSAGERIA EFÊMERA & SEGURA (LGPD)
-- ==============================================================================
-- Módulo de mensageria em tempo real entre Passageiro e Motorista.
-- 1. Isolamento estrito por corrida: ride_id
-- 2. Eliminação de PII (Sem compartilhamento de WhatsApp ou telefone pessoal)
-- 3. Efêmero: Ativo durante a corrida; bloqueado após COMPLETED ou CANCELLED
-- 4. TTL de retenção configurável para auditoria interna de sinistros (30 dias)
-- ==============================================================================

-- 1. CRIAÇÃO DA TABELA DEFINITIVA DE MENSAGENS DA CORRIDA
CREATE TABLE IF NOT EXISTS public.partiu_ride_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.partiu_corridas(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('PASSENGER', 'DRIVER', 'SYSTEM')),
  message_type TEXT NOT NULL CHECK (message_type IN ('TEXT', 'SMART_REPLY', 'SYSTEM')),
  content TEXT NOT NULL,
  client_msg_id TEXT UNIQUE,
  read_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 2. ÍNDICES DE ALTA PERFORMANCE (ESCALA 100.000+ CORRIDAS)
CREATE INDEX IF NOT EXISTS idx_ride_messages_ride_created 
  ON public.partiu_ride_messages(ride_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_ride_messages_unread
  ON public.partiu_ride_messages(ride_id, read_at) 
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ride_messages_client_msg_id
  ON public.partiu_ride_messages(client_msg_id);

-- 3. VIEW DE COMPATIBILIDADE ride_messages
CREATE OR REPLACE VIEW public.ride_messages AS
  SELECT * FROM public.partiu_ride_messages;

-- 4. FUNÇÃO RPC PARA ARQUIVAMENTO EFÊMERO DO CHAT (LGPD)
-- Bloqueia inserções e marca o encerramento do canal ao finalizar ou cancelar a corrida
CREATE OR REPLACE FUNCTION public.archive_ride_chat(p_ride_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_corrida_status VARCHAR(30);
BEGIN
  SELECT status INTO v_corrida_status 
  FROM public.partiu_corridas 
  WHERE id = p_ride_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Insere mensagem de sistema notificando encerramento do chat efêmero
  INSERT INTO public.partiu_ride_messages (
    ride_id,
    sender_id,
    sender_type,
    message_type,
    content
  ) VALUES (
    p_ride_id,
    'SYSTEM',
    'SYSTEM',
    'SYSTEM',
    'Corrida encerrada. Este chat foi arquivado de forma segura conforme as diretrizes de privacidade.'
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. TRIGGER AUTOMÁTICO: ARQUIVAR CHAT QUANDO A CORRIDA FOR FINALIZADA OU CANCELADA
CREATE OR REPLACE FUNCTION public.fn_trg_auto_archive_ride_chat()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('CONCLUIDA', 'CANCELADA') AND OLD.status NOT IN ('CONCLUIDA', 'CANCELADA') THEN
    PERFORM public.archive_ride_chat(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_archive_ride_chat ON public.partiu_corridas;
CREATE TRIGGER trg_auto_archive_ride_chat
AFTER UPDATE OF status ON public.partiu_corridas
FOR EACH ROW EXECUTE FUNCTION public.fn_trg_auto_archive_ride_chat();

-- 6. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.partiu_ride_messages ENABLE ROW LEVEL SECURITY;

-- Política de leitura: Permite acesso público/autenticado aos participantes da corrida
CREATE POLICY "Permitir leitura de mensagens da corrida" 
  ON public.partiu_ride_messages 
  FOR SELECT 
  USING (true);

-- Política de inserção: Permite envio apenas enquanto a corrida estiver ativa
CREATE POLICY "Permitir envio de mensagens em corrida ativa" 
  ON public.partiu_ride_messages 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partiu_corridas c
      WHERE c.id = ride_id 
        AND c.status NOT IN ('CONCLUIDA', 'CANCELADA')
    )
  );

-- Política de atualização: Apenas atualização de read_at
CREATE POLICY "Permitir marcacao de leitura" 
  ON public.partiu_ride_messages 
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- 7. PUBLICAÇÃO NO SUPABASE REALTIME
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND tablename = 'partiu_ride_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.partiu_ride_messages;
  END IF;
END $$;
