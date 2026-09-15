-- ==============================================================================
-- 🚀 FASE 3: BLINDAGEM DE FINOPS, SPLIT D+0, BACEN CRC-16 E FILA DE SAQUES PIX
-- Data de Criação: 2026-09-15
-- Compatibilidade: Supabase PostgreSQL 15+ / Lovable Sync
-- ==============================================================================

-- 1. Ampliação de restrição de status na tabela de saques do motorista (driver_pix_withdrawals)
-- Garante que o status 'PROCESSING' seja formalmente aceito para saques assíncronos
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'driver_pix_withdrawals'
  ) THEN
    ALTER TABLE public.driver_pix_withdrawals 
      DROP CONSTRAINT IF EXISTS driver_pix_withdrawals_status_check;
      
    ALTER TABLE public.driver_pix_withdrawals 
      ADD CONSTRAINT driver_pix_withdrawals_status_check 
      CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'));
  END IF;
END $$;

-- 2. Sobrecarga da Função Canônica de Liquidação de Corrida (Split D+0 no Ledger)
-- Aceita TEXT (tanto UUID nativo quanto código alfa-numérico 'COR-xxxxxx' do aplicativo)
CREATE OR REPLACE FUNCTION public.partiu_concluir_corrida_split(
  p_corrida_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_corrida public.partiu_corridas%ROWTYPE;
  v_wallet_motorista_id UUID;
  v_saldo_motorista_atual BIGINT := 0;
  v_valor_motorista BIGINT;
  v_tx_code VARCHAR(60);
  v_corrida_uuid UUID := NULL;
  v_driver_user_id UUID := NULL;
BEGIN
  -- 1. Tenta identificar se o identificador é um UUID válido
  BEGIN
    v_corrida_uuid := p_corrida_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_corrida_uuid := NULL;
  END;

  -- 2. Busca na tabela partiu_corridas por codigo_viagem ou id UUID
  SELECT * INTO v_corrida 
  FROM public.partiu_corridas 
  WHERE (codigo_viagem = p_corrida_id OR (v_corrida_uuid IS NOT NULL AND id = v_corrida_uuid))
  FOR UPDATE;

  -- Se encontrou na partiu_corridas:
  IF v_corrida.id IS NOT NULL THEN
    IF v_corrida.status = 'CONCLUIDA' THEN
      RETURN jsonb_build_object('sucesso', true, 'aviso', 'Corrida já havia sido concluída.');
    END IF;

    -- Conclui a corrida
    UPDATE public.partiu_corridas
    SET
      status = 'CONCLUIDA',
      status_pagamento = 'pago',
      concluida_em = clock_timestamp(),
      updated_at = clock_timestamp()
    WHERE id = v_corrida.id;

    -- Espelha conclusão em public.rides
    UPDATE public.rides
    SET
      status = 'COMPLETED',
      price_final_brl = (v_corrida.valor_bruto_cents::NUMERIC / 100.0),
      updated_at = clock_timestamp()
    WHERE id = p_corrida_id OR (v_corrida_uuid IS NOT NULL AND id = v_corrida_uuid::text);

    -- Libera motorista
    IF v_corrida.motorista_id IS NOT NULL THEN
      UPDATE public.partiu_driver_status
      SET
        status = 'ONLINE_IDLE',
        current_trip_id = NULL,
        hourly_earnings_today_cents = hourly_earnings_today_cents + COALESCE(v_corrida.valor_motorista_cents, 0)
      WHERE motorista_id = v_corrida.motorista_id;

      -- Obtém user_id do motorista se existir
      SELECT user_id INTO v_driver_user_id 
      FROM public.partiu_motoristas 
      WHERE id = v_corrida.motorista_id;
      
      IF v_driver_user_id IS NULL THEN
        v_driver_user_id := v_corrida.motorista_id;
      END IF;

      -- Garante carteira em partiu_wallets
      INSERT INTO public.partiu_wallets (user_id, user_type, balance_cents)
      VALUES (v_driver_user_id, 'MOTORISTA', 0)
      ON CONFLICT (user_id) DO NOTHING;

      SELECT id, balance_cents INTO v_wallet_motorista_id, v_saldo_motorista_atual
      FROM public.partiu_wallets 
      WHERE user_id = v_driver_user_id;

      v_valor_motorista := COALESCE(v_corrida.valor_motorista_cents, ROUND(v_corrida.valor_bruto_cents * 0.88));
      v_tx_code := 'TX-COR-' || COALESCE(v_corrida.codigo_viagem, p_corrida_id);

      -- Lançamento contábil no Ledger de Partidas Dobradas
      INSERT INTO public.partiu_ledger_entries (
        transaction_code,
        corrida_id,
        wallet_id,
        entry_type,
        credit_cents,
        balance_after_cents,
        description,
        idempotency_key
      ) VALUES (
        v_tx_code,
        v_corrida.id,
        v_wallet_motorista_id,
        'CREDITO_CORRIDA_MOTORISTA',
        v_valor_motorista,
        v_saldo_motorista_atual + v_valor_motorista,
        'Repasse Líquido D+0 - Corrida ' || COALESCE(v_corrida.codigo_viagem, p_corrida_id),
        'IDEMP-CRED-' || v_corrida.id::text
      )
      ON CONFLICT (idempotency_key) DO NOTHING;

      -- Atualiza saldo da carteira do condutor
      UPDATE public.partiu_wallets
      SET
        balance_cents = balance_cents + v_valor_motorista,
        updated_at = clock_timestamp()
      WHERE id = v_wallet_motorista_id;
    END IF;

    RETURN jsonb_build_object(
      'sucesso', true,
      'corrida_id', v_corrida.id,
      'valor_motorista_cents', v_valor_motorista
    );
  END IF;

  -- 3. Caso não conste em partiu_corridas, conclui diretamente em public.rides
  UPDATE public.rides
  SET
    status = 'COMPLETED',
    updated_at = clock_timestamp()
  WHERE id = p_corrida_id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'origem', 'public.rides',
    'id', p_corrida_id
  );
END;
$$;

-- 3. RPC Atômica para Solicitação de Saque PIX (Prevenção de Race Conditions)
CREATE OR REPLACE FUNCTION public.partiu_solicitar_saque_pix(
  p_driver_id TEXT,
  p_amount_cents BIGINT,
  p_pix_key TEXT,
  p_pix_key_type TEXT,
  p_transfer_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_driver_uuid UUID := NULL;
  v_wallet_id UUID;
  v_saldo_atual BIGINT;
BEGIN
  -- Tenta converter p_driver_id para UUID se possível
  BEGIN
    v_driver_uuid := p_driver_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_driver_uuid := NULL;
  END;

  -- 1. Verifica se já existe saque em andamento para este motorista
  IF EXISTS (
    SELECT 1 FROM public.driver_pix_withdrawals
    WHERE driver_id = p_driver_id AND status IN ('PENDING', 'PROCESSING')
  ) THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'mensagem', 'Já existe uma solicitação de saque em processamento para este motorista.'
    );
  END IF;

  -- 2. Localiza carteira do condutor
  IF v_driver_uuid IS NOT NULL THEN
    SELECT id, balance_cents INTO v_wallet_id, v_saldo_atual
    FROM public.partiu_wallets
    WHERE user_id = v_driver_uuid
    FOR UPDATE;

    IF v_wallet_id IS NOT NULL THEN
      IF v_saldo_atual < p_amount_cents THEN
        RETURN jsonb_build_object(
          'sucesso', false,
          'mensagem', 'Saldo insuficiente na carteira para o saque solicitado.'
        );
      END IF;

      -- Debita da carteira do motorista
      UPDATE public.partiu_wallets
      SET
        balance_cents = balance_cents - p_amount_cents,
        updated_at = clock_timestamp()
      WHERE id = v_wallet_id;

      -- Lançamento contábil no Ledger
      INSERT INTO public.partiu_ledger_entries (
        transaction_code,
        wallet_id,
        entry_type,
        debit_cents,
        balance_after_cents,
        description,
        idempotency_key
      ) VALUES (
        p_transfer_id,
        v_wallet_id,
        'SAQUE_PIX_MOTORISTA',
        p_amount_cents,
        v_saldo_atual - p_amount_cents,
        'Saque PIX Solicitado: ' || p_transfer_id,
        'IDEMP-WD-' || p_transfer_id
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
  END IF;

  -- 3. Insere a solicitação de saque na fila
  INSERT INTO public.driver_pix_withdrawals (
    driver_id,
    amount_cents,
    pix_key,
    pix_key_type,
    status,
    transfer_id,
    created_at
  ) VALUES (
    p_driver_id,
    p_amount_cents,
    p_pix_key,
    p_pix_key_type,
    'PROCESSING',
    p_transfer_id,
    clock_timestamp()
  );

  RETURN jsonb_build_object(
    'sucesso', true,
    'transfer_id', p_transfer_id,
    'status', 'PROCESSING'
  );
END;
$$;
