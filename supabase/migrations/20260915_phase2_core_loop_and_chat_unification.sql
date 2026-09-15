-- ==============================================================================
-- 🚀 FASE 2: REMEDIAÇÃO DO CORE LOOP, DESPACHO, CHAT REALTIME E DUAL SCHEMA
-- ==============================================================================
-- 1. Compatibilização de IDs COR-xxxxxx e UUID na RPC partiu_aceitar_corrida_atomica
-- 2. Suporte a chat em tempo real unificado (partiu_ride_messages aceita public.rides)
-- 3. Overload de resiliência na procedure de despacho dispatch_find_best_driver
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ATUALIZAÇÃO DA RPC ATÔMICA UNIVERSAL: partiu_aceitar_corrida_atomica
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.partiu_aceitar_corrida_atomica(
  p_corrida_id TEXT,
  p_motorista_id TEXT,
  p_motorista_nome TEXT DEFAULT 'Motorista Parceiro',
  p_motorista_telefone TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ride public.rides%ROWTYPE;
  v_affected_rows INT := 0;
  v_is_uuid BOOLEAN;
BEGIN
  v_is_uuid := p_corrida_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  -- 1. Tentativa de obter lock exclusivo na tabela canônica public.rides
  BEGIN
    SELECT * INTO STRICT v_ride
    FROM public.rides
    WHERE id = p_corrida_id
    FOR UPDATE NOWAIT;

    -- Validar se a corrida ainda está disponível para aceite
    IF v_ride.status NOT IN ('REQUESTED', 'SEARCHING_R1', 'SEARCHING_R2', 'SEARCHING_R3', 'PROCURANDO', 'OFERTADA') THEN
      RETURN jsonb_build_object(
        'sucesso', false,
        'codigo', 'STATUS_INVALIDO',
        'mensagem', 'Esta corrida já foi atribuída a outro condutor ou cancelada.'
      );
    END IF;

    -- Atualizar public.rides atomicamente
    UPDATE public.rides
    SET driver_id = p_motorista_id,
        driver_name = COALESCE(NULLIF(p_motorista_nome, ''), v_ride.driver_name, 'Motorista Parceiro'),
        driver_phone = COALESCE(NULLIF(p_motorista_telefone, ''), v_ride.driver_phone),
        status = 'ACCEPTED',
        updated_at = NOW()
    WHERE id = p_corrida_id
    RETURNING * INTO v_ride;

    -- Espelha atualização em partiu_corridas se existir
    UPDATE public.partiu_corridas
    SET status = 'A_CAMINHO',
        updated_at = NOW()
    WHERE codigo_viagem = p_corrida_id
       OR (v_is_uuid AND id = p_corrida_id::uuid);

    -- Atualizar telemetria/status do condutor para ocupado
    UPDATE public.driver_locations
    SET status = 'ON_TRIP',
        current_ride_id = p_corrida_id,
        updated_at = NOW()
    WHERE driver_id = p_motorista_id;

    RETURN jsonb_build_object(
      'sucesso', true,
      'codigo', 'ACEITO_COM_SUCESSO',
      'corrida_id', v_ride.id,
      'status', v_ride.status,
      'driver_id', v_ride.driver_id,
      'driver_name', v_ride.driver_name
    );

  EXCEPTION
    WHEN lock_not_available THEN
      RETURN jsonb_build_object(
        'sucesso', false,
        'codigo', 'LOCK_CONCORRENTE',
        'mensagem', 'Outro motorista parceiro acabou de aceitar esta corrida no mesmo instante!'
      );

    WHEN no_data_found THEN
      -- Se não encontrou em public.rides, busca em public.partiu_corridas
      BEGIN
        IF v_is_uuid THEN
          PERFORM 1 FROM public.partiu_corridas
          WHERE id = p_corrida_id::uuid
          FOR UPDATE NOWAIT;

          UPDATE public.partiu_corridas
          SET motorista_id = CASE WHEN p_motorista_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN p_motorista_id::uuid ELSE motorista_id END,
              status = 'A_CAMINHO',
              updated_at = NOW()
          WHERE id = p_corrida_id::uuid
            AND status IN ('PROCURANDO', 'OFERTADA', 'REQUESTED', 'SEARCHING_R1');
        ELSE
          PERFORM 1 FROM public.partiu_corridas
          WHERE codigo_viagem = p_corrida_id
          FOR UPDATE NOWAIT;

          UPDATE public.partiu_corridas
          SET motorista_id = CASE WHEN p_motorista_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN p_motorista_id::uuid ELSE motorista_id END,
              status = 'A_CAMINHO',
              updated_at = NOW()
          WHERE codigo_viagem = p_corrida_id
            AND status IN ('PROCURANDO', 'OFERTADA', 'REQUESTED', 'SEARCHING_R1');
        END IF;

        GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

        IF v_affected_rows > 0 THEN
          UPDATE public.driver_locations
          SET status = 'ON_TRIP',
              current_ride_id = p_corrida_id,
              updated_at = NOW()
          WHERE driver_id = p_motorista_id;

          RETURN jsonb_build_object(
            'sucesso', true,
            'codigo', 'ACEITO_COM_SUCESSO',
            'corrida_id', p_corrida_id,
            'status', 'A_CAMINHO'
          );
        ELSE
          RETURN jsonb_build_object(
            'sucesso', false,
            'codigo', 'STATUS_INVALIDO',
            'mensagem', 'Esta corrida já foi atribuída a outro condutor ou cancelada.'
          );
        END IF;

      EXCEPTION
        WHEN lock_not_available THEN
          RETURN jsonb_build_object(
            'sucesso', false,
            'codigo', 'LOCK_CONCORRENTE',
            'mensagem', 'Outro motorista parceiro acabou de aceitar esta corrida no mesmo instante!'
          );
        WHEN OTHERS THEN
          NULL;
      END;

      RETURN jsonb_build_object(
        'sucesso', false,
        'codigo', 'NAO_ENCONTRADA',
        'mensagem', 'Corrida não encontrada ou já expirada.'
      );
  END;
END;
$$;


-- ------------------------------------------------------------------------------
-- 2. DESACOPLAMENTO E RESILIÊNCIA DA TABELA DE CHAT: partiu_ride_messages
-- ------------------------------------------------------------------------------
-- Remove a restrição rígida de FK que impedia mensagens para corridas em public.rides
ALTER TABLE IF EXISTS public.partiu_ride_messages
  DROP CONSTRAINT IF EXISTS partiu_ride_messages_ride_id_fkey;

-- Permite identificadores textuais alfanuméricos (COR-xxxxxx e UUIDs)
ALTER TABLE IF EXISTS public.partiu_ride_messages
  ALTER COLUMN ride_id TYPE VARCHAR(64);

-- Atualiza a política de RLS para aceitar mensagens de corridas ativas em qualquer das duas tabelas
DROP POLICY IF EXISTS "Permitir envio de mensagens em corrida ativa" ON public.partiu_ride_messages;
CREATE POLICY "Permitir envio de mensagens em corrida ativa"
  ON public.partiu_ride_messages FOR INSERT
  WITH CHECK (
    -- Corrida ativa na tabela canônica public.rides
    EXISTS (
      SELECT 1 FROM public.rides r
      WHERE r.id = ride_id
        AND r.status NOT IN ('COMPLETED', 'CANCELLED', 'TIMEOUT')
    )
    -- Ou corrida ativa na tabela legada public.partiu_corridas
    OR EXISTS (
      SELECT 1 FROM public.partiu_corridas c
      WHERE (c.id::text = ride_id OR c.codigo_viagem = ride_id)
        AND c.status NOT IN ('CONCLUIDA', 'CANCELADA')
    )
    -- Ou emissão interna administrativa / service_role
    OR auth.role() = 'service_role'
    OR (auth.jwt() ->> 'role') = 'service_role'
  );

-- Atualização da função de arquivamento de chat para aceitar ride_id TEXT
CREATE OR REPLACE FUNCTION public.archive_ride_chat(p_ride_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
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

-- Trigger automático de arquivamento de chat ao concluir ou cancelar corrida em public.rides
CREATE OR REPLACE FUNCTION public.fn_trg_auto_archive_rides_chat()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('COMPLETED', 'CANCELLED') AND OLD.status NOT IN ('COMPLETED', 'CANCELLED') THEN
    PERFORM public.archive_ride_chat(NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_archive_rides_chat ON public.rides;
CREATE TRIGGER trg_auto_archive_rides_chat
  AFTER UPDATE OF status ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.fn_trg_auto_archive_rides_chat();


-- ------------------------------------------------------------------------------
-- 3. OVERLOAD DE RESILIÊNCIA EM dispatch_find_best_driver
-- ------------------------------------------------------------------------------
-- Garante que chamadas antigas ou com nomes de parâmetros alternativos funcionem 100%
CREATE OR REPLACE FUNCTION public.dispatch_find_best_driver(
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  p_category TEXT DEFAULT 'CARRO',
  max_radius_km DOUBLE PRECISION DEFAULT 8,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  driver_id TEXT,
  name TEXT,
  phone TEXT,
  avatar_url TEXT,
  vehicle_model TEXT,
  license_plate TEXT,
  category TEXT,
  status TEXT,
  subscription_plan TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  rating NUMERIC,
  acceptance_rate NUMERIC,
  cancellation_rate NUMERIC,
  distance_meters DOUBLE PRECISION,
  eta_minutes INTEGER,
  dispatch_score DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.dispatch_find_best_driver(
    p_lat := pickup_lat,
    p_lng := pickup_lng,
    p_category := p_category,
    p_radius_meters := max_radius_km * 1000.0,
    p_tenant_id := '00000000-0000-0000-0000-000000000000'::uuid,
    p_limit := max_results
  );
END;
$$;


-- ------------------------------------------------------------------------------
-- 4. UNIFICAÇÃO DE COLUNAS DE CATEGORIA NA TABELA public.rides
-- ------------------------------------------------------------------------------
-- Garante que queries usando 'category' ou 'vehicle_category' não falhem
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rides' AND column_name = 'vehicle_category'
  ) THEN
    ALTER TABLE public.rides ADD COLUMN vehicle_category TEXT NOT NULL DEFAULT 'CARRO';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rides' AND column_name = 'category'
  ) THEN
    ALTER TABLE public.rides ADD COLUMN category TEXT NOT NULL DEFAULT 'CARRO';
  END IF;
END $$;

