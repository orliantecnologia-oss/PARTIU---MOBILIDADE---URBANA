-- ==============================================================================
-- 🚀 PARTIU LIVE RINGING & DRIVER TRUST ENGINE V4 — REALTIME DELTA UPDATES
-- ==============================================================================
-- Colunas de micro-estados de notificação e despacho em tempo real (Padrão 99/Uber)
-- Transmite apenas payloads mínimos para alta escala (100.000+ motoristas online).
-- ==============================================================================

-- 1. ADICIONA COLUNAS DE LIVE RINGING À TABELA RIDES
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS current_notified_driver_id VARCHAR(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dispatch_attempt INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS dispatch_status VARCHAR(32) NOT NULL DEFAULT 'SEARCHING_R1';

-- 2. CONSTRAINT DE ESTADOS DE DESPACHO
DO $$
BEGIN
  ALTER TABLE public.rides DROP CONSTRAINT IF EXISTS chk_rides_dispatch_status;
  ALTER TABLE public.rides ADD CONSTRAINT chk_rides_dispatch_status
    CHECK (dispatch_status IN (
      'SEARCHING_R1',
      'SEARCHING_R2',
      'SEARCHING_R3',
      'DRIVER_NOTIFIED',
      'DRIVER_VIEWING',
      'DRIVER_DECLINED',
      'ACCEPTED',
      'TIMEOUT'
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. ÍNDICE DE NOTIFICAÇÃO ATIVA PARA CONSULTA SUB-MILISSEGUNDO
CREATE INDEX IF NOT EXISTS idx_rides_current_notified_driver
  ON public.rides (current_notified_driver_id, dispatch_status);

-- 4. FUNÇÃO RPC: ATUALIZAÇÃO ATÔMICA DE RINGING (dispatch_update_ringing_status)
-- Atualiza o micro-estado da chamada e emite notificação Realtime com payload delta mínimo
CREATE OR REPLACE FUNCTION public.dispatch_update_ringing_status(
  p_ride_id VARCHAR(64),
  p_driver_id VARCHAR(64),
  p_dispatch_status VARCHAR(32),
  p_dispatch_attempt INTEGER DEFAULT 1
)
RETURNS TABLE (
  ride_id VARCHAR(64),
  driver_id VARCHAR(64),
  dispatch_status VARCHAR(32),
  dispatch_attempt INTEGER,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
BEGIN
  UPDATE public.rides
  SET
    current_notified_driver_id = p_driver_id,
    dispatch_status = p_dispatch_status,
    dispatch_attempt = p_dispatch_attempt,
    updated_at = v_now
  WHERE id = p_ride_id;

  RETURN QUERY
  SELECT p_ride_id, p_driver_id, p_dispatch_status, p_dispatch_attempt, v_now;
END;
$$;
