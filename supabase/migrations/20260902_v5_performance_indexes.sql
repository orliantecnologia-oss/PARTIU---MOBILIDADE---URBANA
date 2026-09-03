-- ==============================================================================
-- UNIVANS TOS v5.0 — PERFORMANCE, INDEXING & CONCURRENCY HARDENING
-- Elimina Seq Scans e implementa row-locking contra race conditions
-- ==============================================================================

-- 1. ÍNDICES DE ALTA PERFORMANCE (B-TREE)

-- Viagens do Dia e Telemetria: Usado a cada 15-30s por todos os passageiros e admins
CREATE INDEX IF NOT EXISTS idx_viagens_data_status 
ON public.viagens (data_viagem, status);

CREATE INDEX IF NOT EXISTS idx_viagens_linha_data 
ON public.viagens (linha_id, data_viagem);

CREATE INDEX IF NOT EXISTS idx_viagens_motorista 
ON public.viagens (motorista_id);

-- Passagens: Consultas por viagem e por passageiro
CREATE INDEX IF NOT EXISTS idx_passagens_viagem_status 
ON public.passagens (viagem_id, status_pagamento);

CREATE INDEX IF NOT EXISTS idx_passagens_passageiro_data 
ON public.passagens (passageiro_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_passagens_codigo_bilhete 
ON public.passagens (codigo_bilhete);

-- Pontos de Embarque: Ordenação de itinerário
CREATE INDEX IF NOT EXISTS idx_pontos_embarque_linha_ordem 
ON public.pontos_embarque (linha_id, ordem) 
WHERE ativo = true;

-- Veículos: Busca por motorista e aprovação
CREATE INDEX IF NOT EXISTS idx_veiculos_motorista 
ON public.veiculos (motorista_id);

-- Fechamento de Caixa: Histórico financeiro por motorista
CREATE INDEX IF NOT EXISTS idx_fechamento_caixa_motorista 
ON public.fechamento_caixa (motorista_id, data_referencia DESC);


-- 2. FUNÇÃO ATÔMICA DE RESERVA DE VAGAS COM ROW-LEVEL LOCK (ANTI-OVERBOOKING)
CREATE OR REPLACE FUNCTION public.reservar_vagas_viagem_atomica(
  p_viagem_id UUID,
  p_quantidade INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_ocupadas INT;
  v_totais INT;
  v_resultado JSONB;
BEGIN
  -- Bloqueio exclusivo da linha da viagem no nível de transação (FOR UPDATE)
  SELECT vagas_ocupadas, vagas_totais 
  INTO v_ocupadas, v_totais
  FROM public.viagens
  WHERE id = p_viagem_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'erro', 'VIAGEM_NAO_ENCONTRADA');
  END IF;

  -- Validação de lotação física da van
  IF (v_ocupadas + p_quantidade) <= v_totais THEN
    UPDATE public.viagens
    SET 
      vagas_ocupadas = v_ocupadas + p_quantidade,
      status = CASE 
        WHEN (v_ocupadas + p_quantidade) >= v_totais THEN 'embarque_imediato'
        ELSE status 
      END
    WHERE id = p_viagem_id;

    RETURN jsonb_build_object(
      'sucesso', true, 
      'vagas_restantes', (v_totais - (v_ocupadas + p_quantidade)),
      'vagas_ocupadas', (v_ocupadas + p_quantidade)
    );
  ELSE
    RETURN jsonb_build_object(
      'sucesso', false, 
      'erro', 'VAGAS_INSUFICIENTES', 
      'vagas_disponiveis', (v_totais - v_ocupadas)
    );
  END IF;
END;
$func$;
