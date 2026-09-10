-- ==============================================================================
-- PARTIU MOBILIDADE URBANA — SECURITY & RLS HARDENING MIGRATION (V1.1)
-- 1. Anti-Brute-Force Rate Limiting no PIN de 4 Dígitos do Embarque
-- 2. Restrição de Políticas RLS para Carteiras (partiu_wallets) e Corridas
-- ==============================================================================

-- 1. ADICIONAR COLUNAS DE CONTROLE DE TENTATIVAS DE PIN
ALTER TABLE public.partiu_corridas
  ADD COLUMN IF NOT EXISTS tentativas_pin INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_bloqueado_ate TIMESTAMPTZ;

-- 2. ATUALIZAR STORED PROCEDURE DE VALIDAÇÃO DE PIN COM ANTI-BRUTE-FORCE
CREATE OR REPLACE FUNCTION public.partiu_validar_pin_embarque(
  p_corrida_id UUID,
  p_pin_digitado VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_corrida public.partiu_corridas%ROWTYPE;
BEGIN
  SELECT * INTO v_corrida FROM public.partiu_corridas WHERE id = p_corrida_id;
  
  IF v_corrida.id IS NULL THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'codigo', 'NAO_ENCONTRADA',
      'mensagem', 'Corrida não encontrada.'
    );
  END IF;

  -- 2.1 Verifica bloqueio temporário por tentativas excedidas
  IF v_corrida.pin_bloqueado_ate IS NOT NULL AND v_corrida.pin_bloqueado_ate > clock_timestamp() THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'codigo', 'PIN_BLOQUEADO_TEMPORARIAMENTE',
      'mensagem', 'PIN bloqueado temporariamente por 15 minutos após 3 tentativas incorretas.'
    );
  END IF;

  -- 2.2 Validação de PIN de 4 dígitos
  IF trim(v_corrida.pin_seguranca) != trim(p_pin_digitado) THEN
    UPDATE public.partiu_corridas
    SET
      tentativas_pin = coalesce(tentativas_pin, 0) + 1,
      pin_bloqueado_ate = CASE 
        WHEN coalesce(tentativas_pin, 0) + 1 >= 3 THEN clock_timestamp() + interval '15 minutes'
        ELSE NULL
      END
    WHERE id = p_corrida_id;

    IF coalesce(v_corrida.tentativas_pin, 0) + 1 >= 3 THEN
      RETURN jsonb_build_object(
        'sucesso', false,
        'codigo', 'PIN_BLOQUEADO_TEMPORARIAMENTE',
        'mensagem', 'PIN incorreto pela 3ª vez! O embarque foi temporariamente bloqueado por 15 minutos.'
      );
    END IF;

    RETURN jsonb_build_object(
      'sucesso', false,
      'codigo', 'PIN_INCORRETO',
      'tentativas_restantes', 3 - (coalesce(v_corrida.tentativas_pin, 0) + 1),
      'mensagem', 'PIN incorreto! Tentativa ' || (coalesce(v_corrida.tentativas_pin, 0) + 1) || ' de 3.'
    );
  END IF;

  -- 2.3 Sucesso: Reseta tentativas e inicia corrida
  UPDATE public.partiu_corridas
  SET
    status = 'EM_VIAGEM',
    pin_validado_em = clock_timestamp(),
    iniciada_em = clock_timestamp(),
    tentativas_pin = 0,
    pin_bloqueado_ate = NULL,
    updated_at = clock_timestamp()
  WHERE id = p_corrida_id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'mensagem', 'Embarque confirmado e viagem iniciada com sucesso!'
  );
END;
$$;

-- ==============================================================================
-- 3. HARDENING DAS POLÍTICAS ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Remover política irrestrita prévia de carteiras
DROP POLICY IF EXISTS "Permitir leitura de carteira do proprio usuario" ON public.partiu_wallets;

-- Nova política restrita: Usuário só lê sua própria carteira ou Admin autorizado
CREATE POLICY "Leitura estrita da propria carteira ou admin" ON public.partiu_wallets
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
    OR auth.role() = 'service_role'
  );

-- Bloquear mutações diretas em carteiras fora das RPCs seguras
DROP POLICY IF EXISTS "Bloquear mutacoes diretas em carteiras" ON public.partiu_wallets;
CREATE POLICY "Bloquear mutacoes diretas em carteiras" ON public.partiu_wallets
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Bloquear updates diretos em carteiras" ON public.partiu_wallets;
CREATE POLICY "Bloquear updates diretos em carteiras" ON public.partiu_wallets
  FOR UPDATE USING (auth.role() = 'service_role');
