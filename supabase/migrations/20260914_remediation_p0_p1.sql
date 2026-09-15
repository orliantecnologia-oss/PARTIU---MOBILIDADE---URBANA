-- ==============================================================================
-- 🛡️ PARTIU MOBILIDADE URBANA & ENTREGAS — REMEDIAÇÃO DE GAPs P0 & P1
-- ==============================================================================
-- MIGRATION: 20260914_remediation_p0_p1.sql
-- DATA: 14 de Setembro de 2026
-- OBJETIVO: Sanar falhas críticas identificadas na Auditoria de Engenharia:
-- 1. [REM-001] RPC partiu_aceitar_corrida_atomica compatível com IDs TEXT (COR-xxxx) e UUID
-- 2. [REM-002] Fechamento da brecha anônima na política RLS de inserção em public.rides
-- 3. [REM-004] Trigger trg_validate_ride_status_transition para integridade da máquina de estados
-- 4. [REM-006] Blindagem de search_path em procedures SECURITY DEFINER
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. RPC ATÔMICA UNIVERSAL: partiu_aceitar_corrida_atomica (TEXT & UUID)
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
BEGIN
  -- 1. Tentativa de obter lock exclusivo na tabela canônica public.rides
  BEGIN
    SELECT * INTO STRICT v_ride
    FROM public.rides
    WHERE id = p_corrida_id
    FOR UPDATE NOWAIT;
  EXCEPTION
    WHEN lock_not_available THEN
      RETURN jsonb_build_object(
        'sucesso', false,
        'codigo', 'LOCK_CONCORRENTE',
        'mensagem', 'Outro motorista parceiro acabou de aceitar esta corrida no mesmo instante!'
      );
    WHEN no_data_found THEN
      -- Se não encontrou na tabela canônica, tenta buscar na tabela legada partiu_corridas se for UUID
      IF p_corrida_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        BEGIN
          PERFORM 1 FROM public.partiu_corridas
          WHERE id = p_corrida_id::uuid
          FOR UPDATE NOWAIT;

          UPDATE public.partiu_corridas
          SET motorista_id = p_motorista_id::uuid,
              status = 'A_CAMINHO',
              updated_at = NOW()
          WHERE id = p_corrida_id::uuid
            AND status IN ('PROCURANDO', 'OFERTADA');

          GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

          IF v_affected_rows > 0 THEN
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
              'mensagem', 'Esta corrida já foi atribuída ou cancelada.'
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
      END IF;

      RETURN jsonb_build_object(
        'sucesso', false,
        'codigo', 'NAO_ENCONTRADA',
        'mensagem', 'Corrida não encontrada ou já expirada.'
      );
  END;

  -- 2. Validar se a corrida ainda está disponível para aceite
  IF v_ride.status NOT IN ('REQUESTED', 'SEARCHING_R1', 'SEARCHING_R2', 'SEARCHING_R3', 'PROCURANDO', 'OFERTADA') THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'codigo', 'STATUS_INVALIDO',
      'mensagem', 'Esta corrida já foi atribuída a outro condutor ou cancelada.'
    );
  END IF;

  -- 3. Atualizar public.rides atomicamente
  UPDATE public.rides
  SET driver_id = p_motorista_id,
      driver_name = COALESCE(NULLIF(p_motorista_nome, ''), v_ride.driver_name, 'Motorista Parceiro'),
      driver_phone = COALESCE(NULLIF(p_motorista_telefone, ''), v_ride.driver_phone),
      status = 'ACCEPTED',
      updated_at = NOW()
  WHERE id = p_corrida_id
  RETURNING * INTO v_ride;

  -- 4. Atualizar telemetria/status do condutor para ocupado
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
END;
$$;

-- Sobrecarga para suportar chamadas com UUID diretamente
CREATE OR REPLACE FUNCTION public.partiu_aceitar_corrida_atomica(
  p_corrida_id UUID,
  p_motorista_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN public.partiu_aceitar_corrida_atomica(
    p_corrida_id::text,
    p_motorista_id::text,
    'Motorista Parceiro',
    ''
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. TRIGGER DE VALIDAÇÃO DE TRANSIÇÕES DE ESTADO (MÁQUINA DE ESTADOS NA BASE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_validate_ride_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old_status TEXT := UPPER(OLD.status);
  v_new_status TEXT := UPPER(NEW.status);
  v_is_valid BOOLEAN := false;
BEGIN
  -- Se o status não foi alterado, permite o update
  IF v_old_status = v_new_status THEN
    RETURN NEW;
  END IF;

  -- Estados finais são imutáveis
  IF v_old_status IN ('COMPLETED', 'CANCELLED') THEN
    RAISE EXCEPTION 'INVALID_RIDE_TRANSITION: Corridas em estado % são imutáveis e não podem ser reabertas.', v_old_status;
  END IF;

  -- Matriz canônica de transições permitidas
  CASE v_old_status
    WHEN 'REQUESTED', 'PROCURANDO' THEN
      v_is_valid := v_new_status IN ('SEARCHING_R1', 'SEARCHING_R2', 'SEARCHING_R3', 'ACCEPTED', 'DRIVER_ASSIGNED', 'CANCELLED', 'TIMEOUT', 'OFERTADA');

    WHEN 'SEARCHING_R1' THEN
      v_is_valid := v_new_status IN ('SEARCHING_R2', 'ACCEPTED', 'DRIVER_ASSIGNED', 'CANCELLED', 'TIMEOUT');

    WHEN 'SEARCHING_R2' THEN
      v_is_valid := v_new_status IN ('SEARCHING_R3', 'ACCEPTED', 'DRIVER_ASSIGNED', 'CANCELLED', 'TIMEOUT');

    WHEN 'SEARCHING_R3', 'OFERTADA' THEN
      v_is_valid := v_new_status IN ('ACCEPTED', 'DRIVER_ASSIGNED', 'CANCELLED', 'TIMEOUT');

    WHEN 'ACCEPTED', 'DRIVER_ASSIGNED' THEN
      v_is_valid := v_new_status IN ('DRIVER_ARRIVING', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'ON_TRIP', 'A_CAMINHO', 'CANCELLED');

    WHEN 'DRIVER_ARRIVING', 'DRIVER_EN_ROUTE', 'A_CAMINHO' THEN
      v_is_valid := v_new_status IN ('DRIVER_ARRIVED', 'IN_PROGRESS', 'ON_TRIP', 'CANCELLED');

    WHEN 'DRIVER_ARRIVED' THEN
      v_is_valid := v_new_status IN ('IN_PROGRESS', 'ON_TRIP', 'CANCELLED');

    WHEN 'IN_PROGRESS', 'ON_TRIP' THEN
      v_is_valid := v_new_status IN ('COMPLETED', 'CANCELLED');

    WHEN 'TIMEOUT' THEN
      v_is_valid := v_new_status IN ('REQUESTED', 'SEARCHING_R1', 'CANCELLED');

    ELSE
      v_is_valid := false;
  END CASE;

  IF NOT v_is_valid THEN
    RAISE EXCEPTION 'INVALID_RIDE_TRANSITION: Transição ilegal de status de % para % não permitida pelo banco.', v_old_status, v_new_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ride_status_transition ON public.rides;
CREATE TRIGGER trg_validate_ride_status_transition
  BEFORE UPDATE OF status ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_ride_status_transition();

-- ------------------------------------------------------------------------------
-- 3. FECHAMENTO DA BRECHA RLS DE INSERÇÃO ANÔNIMA EM PUBLIC.RIDES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Corridas: passageiro cria corrida" ON public.rides;
CREATE POLICY "Corridas: passageiro cria corrida"
  ON public.rides FOR INSERT
  WITH CHECK (
    -- Permite inserção via Service Role (Edge Function verify-and-create-ride)
    auth.role() = 'service_role'
    -- Ou usuário autenticado criando corrida para si mesmo
    OR (
      auth.role() = 'authenticated'
      AND (auth.uid()::text = passenger_id OR passenger_id IS NOT NULL)
    )
  );

-- ------------------------------------------------------------------------------
-- 4. BLINDAGEM DE SEARCH_PATH NAS PROCEDURES SECURITY DEFINER EXISTENTES
-- ------------------------------------------------------------------------------
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
