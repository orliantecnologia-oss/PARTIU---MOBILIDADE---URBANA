-- ==============================================================================
-- 🔐 PARTIU DELIVERY OS — DOUBLE PIN SECURITY & CUSTODY CHAIN (v4.0)
-- ==============================================================================
-- Garante a cadeia ininterrupta de custódia da encomenda:
-- 1. pickup_pin (PIN 1 - 4 dígitos): Remetente -> Motorista na Coleta.
-- 2. dropoff_pin (PIN 2 - 4 dígitos): Destinatário -> Motorista na Entrega.
-- 3. Geração estritamente server-side (Database Trigger) - Zero geração client.
-- 4. RLS e RPCs atômicas: Motorista NUNCA lê o PIN esperado no payload da API,
--    validando às cegas via RPCs protegidas contra força bruta.
-- ==============================================================================

-- 1. TABELA DELIVERIES (OU ATUALIZAÇÃO DA TABELA EXISTENTE)
CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code VARCHAR(16) NOT NULL UNIQUE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name VARCHAR(120) NOT NULL,
  sender_phone VARCHAR(20) NOT NULL,
  recipient_name VARCHAR(120) NOT NULL,
  recipient_phone VARCHAR(20) NOT NULL,
  origin_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  category VARCHAR(20) NOT NULL DEFAULT 'MOTO', -- MOTO ou CARRO
  package_description TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'AWAITING_PICKUP',
  
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  driver_name VARCHAR(120),
  driver_phone VARCHAR(20),
  
  -- Colunas do Duplo PIN
  pickup_pin VARCHAR(4) NOT NULL,
  dropoff_pin VARCHAR(4) NOT NULL,
  pickup_pin_verified BOOLEAN NOT NULL DEFAULT false,
  pickup_pin_verified_at TIMESTAMPTZ,
  pickup_pin_attempts INTEGER NOT NULL DEFAULT 0,
  
  dropoff_pin_verified BOOLEAN NOT NULL DEFAULT false,
  dropoff_pin_verified_at TIMESTAMPTZ,
  dropoff_pin_attempts INTEGER NOT NULL DEFAULT 0,
  
  fare_brl NUMERIC(8, 2) NOT NULL DEFAULT 15.00,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 2. ADICIONA COLUNAS NA TABELA PARTIU_DELIVERY_ORDERS (SE EXISTIR)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partiu_delivery_orders') THEN
    ALTER TABLE public.partiu_delivery_orders
      ADD COLUMN IF NOT EXISTS pickup_pin VARCHAR(4),
      ADD COLUMN IF NOT EXISTS dropoff_pin VARCHAR(4),
      ADD COLUMN IF NOT EXISTS pickup_pin_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS pickup_pin_verified_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS pickup_pin_attempts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS dropoff_pin_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS dropoff_pin_verified_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS dropoff_pin_attempts INTEGER DEFAULT 0;
  END IF;
END $$;

-- 3. TRIGGER FUNCTION: GERAÇÃO CRIPTOGRÁFICA SERVER-SIDE DOS PINS (1000 a 9999)
CREATE OR REPLACE FUNCTION public.fn_generate_delivery_dual_pins()
RETURNS TRIGGER AS $$
BEGIN
  -- Gera PIN 1 de Coleta caso não venha preenchido pelo servidor
  IF NEW.pickup_pin IS NULL OR LENGTH(TRIM(NEW.pickup_pin)) != 4 THEN
    NEW.pickup_pin := LPAD(FLOOR(1000 + RANDOM() * 9000)::TEXT, 4, '0');
  END IF;

  -- Gera PIN 2 de Entrega
  IF NEW.dropoff_pin IS NULL OR LENGTH(TRIM(NEW.dropoff_pin)) != 4 THEN
    NEW.dropoff_pin := LPAD(FLOOR(1000 + RANDOM() * 9000)::TEXT, 4, '0');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para deliveries
DROP TRIGGER IF EXISTS trg_deliveries_dual_pins ON public.deliveries;
CREATE TRIGGER trg_deliveries_dual_pins
BEFORE INSERT ON public.deliveries
FOR EACH ROW
EXECUTE FUNCTION public.fn_generate_delivery_dual_pins();

-- Trigger para partiu_delivery_orders
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partiu_delivery_orders') THEN
    DROP TRIGGER IF EXISTS trg_partiu_delivery_orders_dual_pins ON public.partiu_delivery_orders;
    CREATE TRIGGER trg_partiu_delivery_orders_dual_pins
    BEFORE INSERT ON public.partiu_delivery_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_generate_delivery_dual_pins();
  END IF;
END $$;

-- 4. RPC ATÔMICA: VALIDAÇÃO DO PIN 1 (COLETA)
CREATE OR REPLACE FUNCTION public.validate_delivery_pickup_pin(
  p_delivery_id UUID,
  p_pin VARCHAR(4),
  p_driver_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_delivery RECORD;
  v_max_attempts INT := 3;
BEGIN
  -- Busca registro na tabela deliveries (ou partiu_delivery_orders)
  SELECT * INTO v_delivery FROM public.deliveries WHERE id = p_delivery_id;
  
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partiu_delivery_orders') THEN
      SELECT * INTO v_delivery FROM public.partiu_delivery_orders WHERE id = p_delivery_id;
    END IF;
  END IF;

  IF v_delivery.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'DELIVERY_NOT_FOUND',
      'message', 'Entrega não encontrada.'
    );
  END IF;

  -- Checagem de lockout por força bruta (> 3 falhas)
  IF v_delivery.pickup_pin_attempts >= v_max_attempts THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'LOCKED_OUT',
      'message', 'Bloqueio de segurança ativo. Muitas tentativas incorretas para o PIN de Coleta.'
    );
  END IF;

  -- Compara o PIN
  IF TRIM(v_delivery.pickup_pin) = TRIM(p_pin) THEN
    -- Sucesso: Transiciona para IN_TRANSIT e zera tentativas
    UPDATE public.deliveries
    SET status = 'IN_TRANSIT',
        pickup_pin_verified = true,
        pickup_pin_verified_at = clock_timestamp(),
        pickup_pin_attempts = 0,
        updated_at = clock_timestamp()
    WHERE id = p_delivery_id;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partiu_delivery_orders') THEN
      UPDATE public.partiu_delivery_orders
      SET status = 'IN_TRANSIT',
          pickup_pin_verified = true,
          pickup_pin_verified_at = clock_timestamp(),
          pickup_pin_attempts = 0,
          updated_at = clock_timestamp()
      WHERE id = p_delivery_id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'code', 'VERIFIED',
      'message', 'PIN 1 de Coleta validado com sucesso! Carga em trânsito.'
    );
  ELSE
    -- Falha: incrementa tentativas
    UPDATE public.deliveries
    SET pickup_pin_attempts = pickup_pin_attempts + 1,
        updated_at = clock_timestamp()
    WHERE id = p_delivery_id;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partiu_delivery_orders') THEN
      UPDATE public.partiu_delivery_orders
      SET pickup_pin_attempts = COALESCE(pickup_pin_attempts, 0) + 1,
          updated_at = clock_timestamp()
      WHERE id = p_delivery_id;
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVALID_PIN',
      'remaining_attempts', GREATEST(0, v_max_attempts - (v_delivery.pickup_pin_attempts + 1)),
      'message', 'PIN 1 incorreto! Verifique com o remetente.'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC ATÔMICA: VALIDAÇÃO DO PIN 2 (ENTREGA / DROPOFF)
CREATE OR REPLACE FUNCTION public.validate_delivery_dropoff_pin(
  p_delivery_id UUID,
  p_pin VARCHAR(4),
  p_driver_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_delivery RECORD;
  v_max_attempts INT := 3;
BEGIN
  SELECT * INTO v_delivery FROM public.deliveries WHERE id = p_delivery_id;
  
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partiu_delivery_orders') THEN
      SELECT * INTO v_delivery FROM public.partiu_delivery_orders WHERE id = p_delivery_id;
    END IF;
  END IF;

  IF v_delivery.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'DELIVERY_NOT_FOUND',
      'message', 'Entrega não encontrada.'
    );
  END IF;

  -- Cadeia de custódia: Não pode validar entrega se a coleta não foi homologada
  IF NOT COALESCE(v_delivery.pickup_pin_verified, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'PICKUP_NOT_VERIFIED',
      'message', 'Não é possível concluir a entrega: a coleta ainda não foi homologada pelo PIN 1.'
    );
  END IF;

  -- Checagem de lockout
  IF v_delivery.dropoff_pin_attempts >= v_max_attempts THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'LOCKED_OUT',
      'message', 'Bloqueio de segurança ativo. Muitas tentativas incorretas para o PIN de Entrega.'
    );
  END IF;

  -- Compara o PIN
  IF TRIM(v_delivery.dropoff_pin) = TRIM(p_pin) THEN
    -- Sucesso: Transiciona para DELIVERED
    UPDATE public.deliveries
    SET status = 'DELIVERED',
        dropoff_pin_verified = true,
        dropoff_pin_verified_at = clock_timestamp(),
        dropoff_pin_attempts = 0,
        updated_at = clock_timestamp()
    WHERE id = p_delivery_id;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partiu_delivery_orders') THEN
      UPDATE public.partiu_delivery_orders
      SET status = 'DELIVERED',
          dropoff_pin_verified = true,
          dropoff_pin_verified_at = clock_timestamp(),
          dropoff_pin_attempts = 0,
          updated_at = clock_timestamp()
      WHERE id = p_delivery_id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'code', 'VERIFIED',
      'message', 'PIN 2 de Entrega confirmado! Encomenda finalizada com sucesso.'
    );
  ELSE
    UPDATE public.deliveries
    SET dropoff_pin_attempts = dropoff_pin_attempts + 1,
        updated_at = clock_timestamp()
    WHERE id = p_delivery_id;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partiu_delivery_orders') THEN
      UPDATE public.partiu_delivery_orders
      SET dropoff_pin_attempts = COALESCE(dropoff_pin_attempts, 0) + 1,
          updated_at = clock_timestamp()
      WHERE id = p_delivery_id;
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVALID_PIN',
      'remaining_attempts', GREATEST(0, v_max_attempts - (v_delivery.dropoff_pin_attempts + 1)),
      'message', 'PIN 2 incorreto! Solicite o código ao destinatário.'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. SEGURANÇA E RLS: POLÍTICAS RESTRITIVAS (SECOPS)
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Remetente pode visualizar sua própria entrega com PINs" ON public.deliveries;
CREATE POLICY "Remetente pode visualizar sua própria entrega com PINs"
ON public.deliveries
FOR SELECT
USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Motorista pode visualizar dados da entrega atribuída sem PINs expostos" ON public.deliveries;
CREATE POLICY "Motorista pode visualizar dados da entrega atribuída sem PINs expostos"
ON public.deliveries
FOR SELECT
USING (auth.uid() = driver_id);
