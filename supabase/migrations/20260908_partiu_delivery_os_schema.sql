-- ==============================================================================
-- 📦 PARTIU DELIVERY OS — PRODUCTION SCHEMA MIGRATION (v1.0)
-- ==============================================================================
-- Estrutura formal de banco para last-mile delivery, homologada no benchmark 99Entrega.
-- Suporte a múltiplas paradas, comprovação fotográfica (POD), PIN seguro,
-- rastreamento público via token e motor de devolução/logística reversa.
-- ==============================================================================

-- 1. TABELA PRINCIPAL DE PEDIDOS DE ENTREGA
CREATE TABLE IF NOT EXISTS public.partiu_delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code VARCHAR(16) NOT NULL UNIQUE,
  tracking_token VARCHAR(32) NOT NULL UNIQUE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name VARCHAR(120) NOT NULL,
  sender_phone VARCHAR(20) NOT NULL,
  vehicle_type VARCHAR(20) NOT NULL DEFAULT 'MOTO',
  
  -- Especificação da Carga
  package_description TEXT NOT NULL,
  package_category VARCHAR(30) NOT NULL DEFAULT 'DOCUMENTO',
  package_weight_kg NUMERIC(6, 2) NOT NULL DEFAULT 1.0,
  package_length_cm INTEGER NOT NULL DEFAULT 20,
  package_width_cm INTEGER NOT NULL DEFAULT 20,
  package_height_cm INTEGER NOT NULL DEFAULT 10,
  package_volume_liters NUMERIC(8, 2) NOT NULL DEFAULT 4.0,
  declared_value_cents BIGINT NOT NULL DEFAULT 5000,
  is_fragile BOOLEAN NOT NULL DEFAULT false,
  packaging_type VARCHAR(20) DEFAULT 'CAIXA',
  special_instructions TEXT,
  
  -- Estado do Ciclo de Vida (FSM 17 Estados Nominais + 13 Exceções)
  status VARCHAR(30) NOT NULL DEFAULT 'SEARCHING_DRIVER',
  current_stop_index INTEGER NOT NULL DEFAULT 0,
  
  -- Associação com Motorista / Entregador
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  driver_name VARCHAR(120),
  driver_phone VARCHAR(20),
  driver_vehicle_model VARCHAR(80),
  driver_vehicle_plate VARCHAR(10),
  driver_rating NUMERIC(3, 2) DEFAULT 4.96,
  
  -- Financeiro e Tarifação
  base_fare_cents BIGINT NOT NULL,
  distance_km NUMERIC(6, 2) NOT NULL,
  distance_fare_cents BIGINT NOT NULL,
  additional_stops_count INTEGER NOT NULL DEFAULT 0,
  additional_stops_fare_cents BIGINT NOT NULL DEFAULT 0,
  insurance_fare_cents BIGINT NOT NULL DEFAULT 0,
  return_fare_cents BIGINT NOT NULL DEFAULT 0,
  gross_total_cents BIGINT NOT NULL,
  driver_earnings_cents BIGINT NOT NULL,
  platform_revenue_cents BIGINT NOT NULL,
  
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 2. TABELA DE PARADAS SEQUENCIAIS (MULTI-STOP: 1 COLETA + ATÉ 5 ENTREGAS)
CREATE TABLE IF NOT EXISTS public.partiu_delivery_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.partiu_delivery_orders(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL, -- 0 = Coleta, 1..5 = Entregas, N = Retorno
  type VARCHAR(15) NOT NULL DEFAULT 'DROPOFF', -- PICKUP, DROPOFF, RETURN
  address TEXT NOT NULL,
  complement TEXT,
  reference TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  
  -- Contato do Responsável na Parada
  contact_name VARCHAR(120) NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  instructions TEXT,
  
  -- Status da Parada
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Validação de Segurança
  otp_expected VARCHAR(4) NOT NULL,
  otp_verified BOOLEAN NOT NULL DEFAULT false,
  otp_failed_attempts INTEGER NOT NULL DEFAULT 0,
  proof_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 3. TABELA DE PROVAS DE ENTREGA AUDITADAS (PROOF OF DELIVERY - POD)
CREATE TABLE IF NOT EXISTS public.partiu_delivery_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.partiu_delivery_orders(id) ON DELETE CASCADE,
  stop_id UUID REFERENCES public.partiu_delivery_stops(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL, -- PICKUP, DELIVERY, RETURN, EXCEPTION
  photo_url TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  captured_by_driver_id UUID NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 4. TABELA DE LOGÍSTICA REVERSA E DEVOLUÇÕES (RETURN SESSIONS)
CREATE TABLE IF NOT EXISTS public.partiu_delivery_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL UNIQUE REFERENCES public.partiu_delivery_orders(id) ON DELETE CASCADE,
  stop_id UUID REFERENCES public.partiu_delivery_stops(id),
  reason VARCHAR(30) NOT NULL, -- RECIPIENT_ABSENT, WRONG_ADDRESS, PACKAGE_REJECTED
  started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  arrived_pickup_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  return_fee_cents BIGINT NOT NULL,
  driver_compensation_cents BIGINT NOT NULL,
  return_otp_expected VARCHAR(4) NOT NULL,
  return_otp_verified BOOLEAN NOT NULL DEFAULT false,
  return_proof_photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 5. TABELA DE AUDITORIA DE TRANSIÇÕES (DELIVERY AUDIT LOGS)
CREATE TABLE IF NOT EXISTS public.partiu_delivery_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.partiu_delivery_orders(id) ON DELETE CASCADE,
  from_state VARCHAR(30) NOT NULL,
  to_state VARCHAR(30) NOT NULL,
  actor VARCHAR(20) NOT NULL, -- SYSTEM, DRIVER, SENDER, RECIPIENT, ADMIN
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 6. ÍNDICES DE PERFORMANCE E PESQUISA RÁPIDA
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON public.partiu_delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_driver ON public.partiu_delivery_orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_token ON public.partiu_delivery_orders(tracking_token);
CREATE INDEX IF NOT EXISTS idx_delivery_stops_delivery ON public.partiu_delivery_stops(delivery_id, sequence);
CREATE INDEX IF NOT EXISTS idx_delivery_proofs_delivery ON public.partiu_delivery_proofs(delivery_id);

-- 7. ATOMIC CLAIM PROCEDURE (PREVENÇÃO DE DOUBLE ACCEPTANCE COM FENCING TOKEN)
CREATE OR REPLACE FUNCTION public.partiu_aceitar_entrega_atomica(
  p_delivery_id UUID,
  p_driver_id UUID,
  p_driver_name VARCHAR,
  p_driver_phone VARCHAR,
  p_driver_vehicle_model VARCHAR,
  p_driver_vehicle_plate VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_delivery RECORD;
  v_fencing_token TEXT;
BEGIN
  -- Bloqueia a linha concorrente com NOWAIT
  SELECT * INTO v_delivery
  FROM public.partiu_delivery_orders
  WHERE id = p_delivery_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Entrega não localizada.');
  END IF;

  IF v_delivery.status NOT IN ('SEARCHING_DRIVER', 'REQUESTED', 'DRIVER_ASSIGNED') THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CLAIMED', 'message', 'Outro entregador aceitou esta chamada frações de segundo antes.');
  END IF;

  v_fencing_token := 'FENCE-DEL-' || extract(epoch from clock_timestamp())::bigint || '-' || p_driver_id;

  UPDATE public.partiu_delivery_orders
  SET
    driver_id = p_driver_id,
    driver_name = p_driver_name,
    driver_phone = p_driver_phone,
    driver_vehicle_model = p_driver_vehicle_model,
    driver_vehicle_plate = p_driver_vehicle_plate,
    status = 'HEADING_TO_PICKUP',
    updated_at = clock_timestamp()
  WHERE id = p_delivery_id;

  -- Registra no histórico de auditoria
  INSERT INTO public.partiu_delivery_audit_logs (
    delivery_id, from_state, to_state, actor, reason, metadata
  ) VALUES (
    p_delivery_id, v_delivery.status, 'HEADING_TO_PICKUP', 'DRIVER',
    'Aceite atômico pelo condutor',
    jsonb_build_object('driver_id', p_driver_id, 'fencing_token', v_fencing_token)
  );

  RETURN jsonb_build_object(
    'success', true,
    'fencing_token', v_fencing_token,
    'delivery_id', p_delivery_id,
    'message', 'Entrega aceita com sucesso!'
  );
EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'LOCK_CONTENTION', 'message', 'Outro entregador está aceitando esta corrida no mesmo instante.');
END;
$$;
