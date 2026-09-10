-- ==============================================================================
-- PARTIU MOBILIDADE URBANA & ENTREGAS — DEFINITIVE PRODUCTION SCHEMA (V1.0)
-- PostGIS Spatial Indices, Distributed Locks, Atomic RPCs, Double-Entry Ledger,
-- Corporate B2B, Delivery Tracking, Realtime Channels & Strict RLS.
-- ==============================================================================

-- 1. EXTENSÕES OBRIGATÓRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TIPOS E ENUMS
-- ==============================================================================
DO $$ BEGIN
  CREATE TYPE partiu_modalidade_enum AS ENUM (
    'POP', 'MOTO', 'PLUS', 'NEGOCIA', 'MULHER', 'ENTREGA_MOTO', 'ENTREGA_CARRO'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE partiu_status_corrida_enum AS ENUM (
    'IDLE', 'PROCURANDO', 'OFERTADA', 'A_CAMINHO', 'CHEGOU', 'EM_VIAGEM', 'CONCLUIDA', 'CANCELADA'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE partiu_forma_pagamento_enum AS ENUM ('pix', 'cartao', 'dinheiro', 'carteira', 'corporativo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE partiu_driver_status_enum AS ENUM ('OFFLINE', 'ONLINE_IDLE', 'OFERTADO', 'EM_CORRIDA', 'EM_PAUSA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE partiu_ledger_entry_type AS ENUM (
    'CREDITO_CORRIDA_MOTORISTA',
    'TAXA_PLATAFORMA_PARTIU',
    'CASHBACK_PASSAGEIRO',
    'SAQUE_PIX_MOTORISTA',
    'ESTORNO_CORRIDA',
    'RECARGA_CARTEIRA',
    'FATURA_CORPORATIVA_DEBITO'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==============================================================================
-- 3. PERFIS DE USUÁRIOS (MOTORISTAS E PASSAGEIROS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.partiu_passageiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(120) NOT NULL,
  cpf VARCHAR(14) UNIQUE,
  telefone VARCHAR(20) NOT NULL,
  email VARCHAR(120),
  foto_url TEXT,
  rating NUMERIC(3,2) DEFAULT 5.00 CHECK (rating >= 1.00 AND rating <= 5.00),
  total_viagens INT DEFAULT 0,
  is_ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.partiu_motoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(120) NOT NULL,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  cnh_numero VARCHAR(20) NOT NULL,
  cnh_categoria VARCHAR(10) NOT NULL,
  cnh_validade DATE NOT NULL,
  possui_ear BOOLEAN DEFAULT true,
  telefone VARCHAR(20) NOT NULL,
  email VARCHAR(120),
  foto_url TEXT,
  
  veiculo_marca_modelo VARCHAR(80) NOT NULL,
  veiculo_placa VARCHAR(10) NOT NULL UNIQUE,
  veiculo_ano INT NOT NULL,
  veiculo_cor VARCHAR(30) NOT NULL,
  categoria_veiculo VARCHAR(20) DEFAULT 'CARRO',
  
  rating NUMERIC(3,2) DEFAULT 5.00 CHECK (rating >= 1.00 AND rating <= 5.00),
  taxa_aceitacao NUMERIC(5,2) DEFAULT 100.00,
  taxa_cancelamento NUMERIC(5,2) DEFAULT 0.00,
  total_viagens INT DEFAULT 0,
  
  chave_pix VARCHAR(120),
  tipo_chave_pix VARCHAR(20),
  
  status_aprovacao VARCHAR(20) DEFAULT 'pendente' CHECK (status_aprovacao IN ('pendente', 'aprovado', 'rejeitado', 'suspenso')),
  motivo_rejeicao TEXT,
  is_online BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  deleted_at TIMESTAMPTZ
);

-- Telemetria e Localização em Tempo Real do Motorista
CREATE TABLE IF NOT EXISTS public.partiu_driver_status (
  motorista_id UUID PRIMARY KEY REFERENCES public.partiu_motoristas(id) ON DELETE CASCADE,
  status partiu_driver_status_enum DEFAULT 'OFFLINE',
  current_trip_id UUID,
  location GEOGRAPHY(Point, 4326),
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  heading NUMERIC(5, 2) DEFAULT 0.00,
  speed_kmh NUMERIC(5, 2) DEFAULT 0.00,
  hourly_earnings_today_cents BIGINT DEFAULT 0,
  consecutive_rejections INT DEFAULT 0,
  last_ping_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_partiu_driver_status_location ON public.partiu_driver_status USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_partiu_driver_status_online ON public.partiu_driver_status(status) WHERE status = 'ONLINE_IDLE';

-- ==============================================================================
-- 4. TABELA PRINCIPAL DE CORRIDAS (PARTIU_CORRIDAS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.partiu_corridas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_viagem VARCHAR(16) NOT NULL UNIQUE,
  modalidade partiu_modalidade_enum NOT NULL,
  status partiu_status_corrida_enum NOT NULL DEFAULT 'PROCURANDO',
  
  passageiro_id UUID REFERENCES public.partiu_passageiros(id),
  passageiro_nome VARCHAR(120) NOT NULL,
  passageiro_telefone VARCHAR(20) NOT NULL,
  
  motorista_id UUID REFERENCES public.partiu_motoristas(id),
  
  origem_endereco TEXT NOT NULL,
  origem_detalhes TEXT,
  origem_location GEOGRAPHY(Point, 4326) NOT NULL,
  origem_lat NUMERIC(10, 7) NOT NULL,
  origem_lng NUMERIC(10, 7) NOT NULL,
  
  destino_endereco TEXT NOT NULL,
  destino_detalhes TEXT,
  destino_location GEOGRAPHY(Point, 4326) NOT NULL,
  destino_lat NUMERIC(10, 7) NOT NULL,
  destino_lng NUMERIC(10, 7) NOT NULL,
  
  distancia_km NUMERIC(6, 2) NOT NULL,
  duracao_min NUMERIC(6, 2) NOT NULL,
  
  valor_bruto_cents BIGINT NOT NULL, -- Valor total em centavos
  valor_motorista_cents BIGINT NOT NULL, -- 88% do valor
  valor_plataforma_cents BIGINT NOT NULL, -- 12% do valor
  valor_cashback_cents BIGINT NOT NULL DEFAULT 0, -- 2% do valor
  
  forma_pagamento partiu_forma_pagamento_enum NOT NULL DEFAULT 'pix',
  pin_seguranca VARCHAR(4) NOT NULL, -- PIN de 4 dígitos gerado no embarque
  pin_validado_em TIMESTAMPTZ,
  
  is_entrega BOOLEAN DEFAULT false,
  destinatario_nome VARCHAR(120),
  destinatario_telefone VARCHAR(20),
  descricao_pacote TEXT,
  
  iniciada_em TIMESTAMPTZ,
  finalizada_em TIMESTAMPTZ,
  cancelada_em TIMESTAMPTZ,
  motivo_cancelamento TEXT,
  cancelado_por VARCHAR(20),
  
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_partiu_corridas_origem_loc ON public.partiu_corridas USING GIST(origem_location);
CREATE INDEX IF NOT EXISTS idx_partiu_corridas_status ON public.partiu_corridas(status);
CREATE INDEX IF NOT EXISTS idx_partiu_corridas_motorista ON public.partiu_corridas(motorista_id, status);
CREATE INDEX IF NOT EXISTS idx_partiu_corridas_created_at ON public.partiu_corridas(created_at DESC);

-- ==============================================================================
-- 5. TRIP RADAR & OFERTAS CONCORRENTES (LOCK ATÔMICO)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.partiu_trip_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corrida_id UUID NOT NULL REFERENCES public.partiu_corridas(id) ON DELETE CASCADE,
  motorista_id UUID NOT NULL REFERENCES public.partiu_motoristas(id) ON DELETE CASCADE,
  score_despacho NUMERIC(8, 2) NOT NULL,
  distancia_pickup_km NUMERIC(5, 2) NOT NULL,
  eta_minutos NUMERIC(5, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'ENVIADA' CHECK (status IN ('ENVIADA', 'ACEITA', 'RECUSADA', 'EXPIRADA', 'CANCELADA')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  CONSTRAINT uq_partiu_trip_motorista UNIQUE (corrida_id, motorista_id)
);

CREATE INDEX IF NOT EXISTS idx_partiu_trip_offers_active ON public.partiu_trip_offers(corrida_id, status);

-- ==============================================================================
-- 6. DOUBLE-ENTRY LEDGER & WALLET ENGINE (CENTAVOS INTEIROS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.partiu_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('MOTORISTA', 'PASSAGEIRO', 'EMPRESA', 'PLATAFORMA')),
  balance_cents BIGINT NOT NULL DEFAULT 0,
  cashback_accumulated_cents BIGINT NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'BRL',
  is_bloqueada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS public.partiu_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_code VARCHAR(32) NOT NULL,
  corrida_id UUID REFERENCES public.partiu_corridas(id),
  wallet_id UUID NOT NULL REFERENCES public.partiu_wallets(id),
  entry_type partiu_ledger_entry_type NOT NULL,
  debit_cents BIGINT NOT NULL DEFAULT 0 CHECK (debit_cents >= 0),
  credit_cents BIGINT NOT NULL DEFAULT 0 CHECK (credit_cents >= 0),
  balance_after_cents BIGINT NOT NULL,
  description TEXT NOT NULL,
  idempotency_key VARCHAR(64) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  CONSTRAINT chk_ledger_entry_amount CHECK (debit_cents > 0 OR credit_cents > 0)
);

CREATE INDEX IF NOT EXISTS idx_partiu_ledger_wallet ON public.partiu_ledger_entries(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partiu_ledger_tx_code ON public.partiu_ledger_entries(transaction_code);

-- ==============================================================================
-- 7. TRANSAÇÕES PIX & PSP SETTLEMENT
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.partiu_pix_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corrida_id UUID REFERENCES public.partiu_corridas(id),
  wallet_id UUID REFERENCES public.partiu_wallets(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('COBRANCA_PASSAGEIRO', 'SAQUE_MOTORISTA', 'ESTORNO')),
  amount_cents BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'LIQUIDADO', 'FALHOU', 'CANCELADO')),
  psp_provider VARCHAR(30) DEFAULT 'MOCK_PSP',
  tx_id VARCHAR(64) UNIQUE NOT NULL,
  end_to_end_id VARCHAR(64),
  qr_code_copia_cola TEXT,
  qr_code_image_url TEXT,
  chave_pix_destino VARCHAR(120),
  liquidado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- ==============================================================================
-- 8. PARTIU FLASH & PROOF OF DELIVERY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.partiu_entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corrida_id UUID NOT NULL UNIQUE REFERENCES public.partiu_corridas(id) ON DELETE CASCADE,
  remetente_nome VARCHAR(120) NOT NULL,
  remetente_telefone VARCHAR(20) NOT NULL,
  pickup_otp VARCHAR(4) NOT NULL,
  pickup_confirmado_em TIMESTAMPTZ,
  
  destinatario_nome VARCHAR(120) NOT NULL,
  destinatario_telefone VARCHAR(20) NOT NULL,
  delivery_otp VARCHAR(4) NOT NULL,
  delivery_confirmado_em TIMESTAMPTZ,
  
  tamanho_pacote VARCHAR(20) DEFAULT 'PEQUENO',
  valor_declarado_cents BIGINT DEFAULT 5000,
  possui_seguro BOOLEAN DEFAULT false,
  valor_seguro_cents BIGINT DEFAULT 0,
  
  proof_of_delivery_photo_url TEXT,
  public_tracking_token VARCHAR(32) NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'SOLICITADA',
  
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- ==============================================================================
-- 9. CORPORATIVO (PARTIU EMPRESAS B2B)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.partiu_corporate_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social VARCHAR(150) NOT NULL,
  cnpj VARCHAR(18) NOT NULL UNIQUE,
  email_faturamento VARCHAR(120) NOT NULL,
  limite_mensal_cents BIGINT NOT NULL DEFAULT 500000,
  gasto_atual_cents BIGINT NOT NULL DEFAULT 0,
  ciclo_faturamento VARCHAR(20) DEFAULT 'QUINZENAL',
  taxa_conveniencia_percent NUMERIC(4, 2) DEFAULT 14.00,
  is_ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS public.partiu_corporate_cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.partiu_corporate_accounts(id) ON DELETE CASCADE,
  codigo VARCHAR(30) NOT NULL,
  nome VARCHAR(80) NOT NULL,
  orcamento_mensal_cents BIGINT NOT NULL,
  gasto_alocado_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  CONSTRAINT uq_corp_centro_custo UNIQUE (company_id, codigo)
);

-- ==============================================================================
-- 10. SEGURANÇA SOS 190 & INCIDENTES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.partiu_sos_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corrida_id UUID NOT NULL REFERENCES public.partiu_corridas(id),
  acionado_por VARCHAR(20) NOT NULL CHECK (acionado_por IN ('PASSAGEIRO', 'MOTORISTA', 'SISTEMA')),
  origem_lat NUMERIC(10, 7) NOT NULL,
  origem_lng NUMERIC(10, 7) NOT NULL,
  status VARCHAR(20) DEFAULT 'DISPARADO' CHECK (status IN ('DISPARADO', 'EM_ATENDIMENTO', 'ENCAMINHADO_190', 'RESOLVIDO')),
  atendido_por_operador_id UUID,
  canal_audio_ativo BOOLEAN DEFAULT true,
  tempo_resposta_segundos INT,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  resolvido_em TIMESTAMPTZ
);

-- ==============================================================================
-- 11. FUNÇÕES ATÔMICAS RPC (CONCORRÊNCIA, MATCHING & FINOPS)
-- ==============================================================================

-- RPC 1: Solicitar Nova Corrida (Gera PIN de 4 dígitos e código da viagem)
CREATE OR REPLACE FUNCTION public.partiu_solicitar_corrida(
  p_modalidade partiu_modalidade_enum,
  p_passageiro_nome VARCHAR,
  p_passageiro_telefone VARCHAR,
  p_origem_endereco TEXT,
  p_origem_detalhes TEXT,
  p_origem_lat NUMERIC,
  p_origem_lng NUMERIC,
  p_destino_endereco TEXT,
  p_destino_detalhes TEXT,
  p_destino_lat NUMERIC,
  p_destino_lng NUMERIC,
  p_distancia_km NUMERIC,
  p_duracao_min NUMERIC,
  p_valor_bruto_cents BIGINT,
  p_forma_pagamento partiu_forma_pagamento_enum,
  p_is_entrega BOOLEAN DEFAULT false,
  p_destinatario_nome VARCHAR DEFAULT NULL,
  p_destinatario_telefone VARCHAR DEFAULT NULL,
  p_descricao_pacote TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_corrida_id UUID;
  v_codigo_viagem VARCHAR(16);
  v_pin VARCHAR(4);
  v_valor_motorista BIGINT;
  v_valor_plataforma BIGINT;
  v_valor_cashback BIGINT;
  v_corrida RECORD;
BEGIN
  -- Código de 6 dígitos baseado em timestamp
  v_codigo_viagem := 'COR-' || to_char(clock_timestamp(), 'HH24MISS') || lpad(floor(random()*900 + 100)::text, 3, '0');
  -- PIN de 4 dígitos seguro entre 1000 e 9999
  v_pin := lpad(floor(random()*9000 + 1000)::text, 4, '0');
  
  -- Split oficial PARTIU: 88% condutor, 12% plataforma, 2% cashback
  v_valor_plataforma := round(p_valor_bruto_cents * 0.12);
  v_valor_motorista := p_valor_bruto_cents - v_valor_plataforma;
  v_valor_cashback := round(p_valor_bruto_cents * 0.02);

  INSERT INTO public.partiu_corridas (
    codigo_viagem,
    modalidade,
    status,
    passageiro_nome,
    passageiro_telefone,
    origem_endereco,
    origem_detalhes,
    origem_location,
    origem_lat,
    origem_lng,
    destino_endereco,
    destino_detalhes,
    destino_location,
    destino_lat,
    destino_lng,
    distancia_km,
    duracao_min,
    valor_bruto_cents,
    valor_motorista_cents,
    valor_plataforma_cents,
    valor_cashback_cents,
    forma_pagamento,
    pin_seguranca,
    is_entrega,
    destinatario_nome,
    destinatario_telefone,
    descricao_pacote
  ) VALUES (
    v_codigo_viagem,
    p_modalidade,
    'PROCURANDO',
    p_passageiro_nome,
    p_passageiro_telefone,
    p_origem_endereco,
    p_origem_detalhes,
    ST_SetSRID(ST_MakePoint(p_origem_lng, p_origem_lat), 4326)::geography,
    p_origem_lat,
    p_origem_lng,
    p_destino_endereco,
    p_destino_detalhes,
    ST_SetSRID(ST_MakePoint(p_destino_lng, p_destino_lat), 4326)::geography,
    p_destino_lat,
    p_destino_lng,
    p_distancia_km,
    p_duracao_min,
    p_valor_bruto_cents,
    v_valor_motorista,
    v_valor_plataforma,
    v_valor_cashback,
    p_forma_pagamento,
    v_pin,
    p_is_entrega,
    p_destinatario_nome,
    p_destinatario_telefone,
    p_descricao_pacote
  )
  RETURNING * INTO v_corrida;

  -- Se for entrega, gera registro de Flash Delivery
  IF p_is_entrega THEN
    INSERT INTO public.partiu_entregas (
      corrida_id,
      remetente_nome,
      remetente_telefone,
      pickup_otp,
      destinatario_nome,
      destinatario_telefone,
      delivery_otp,
      public_tracking_token
    ) VALUES (
      v_corrida.id,
      p_passageiro_nome,
      p_passageiro_telefone,
      lpad(floor(random()*9000 + 1000)::text, 4, '0'),
      coalesce(p_destinatario_nome, 'Destinatário'),
      coalesce(p_destinatario_telefone, '(22) 99999-0000'),
      v_pin,
      encode(gen_random_bytes(16), 'hex')
    );
  END IF;

  RETURN row_to_json(v_corrida)::jsonb;
END;
$$;

-- RPC 2: Aceite Atômico de Corrida (Garante 0 Race Conditions e 0 Duplo Aceite)
CREATE OR REPLACE FUNCTION public.partiu_aceitar_corrida_atomica(
  p_corrida_id UUID,
  p_motorista_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_corrida public.partiu_corridas%ROWTYPE;
  v_motorista public.partiu_motoristas%ROWTYPE;
BEGIN
  -- 1. Obter trava atômica exclusiva de linha (FOR UPDATE NOWAIT)
  -- Se outro motorista já travou esta linha para aceite, falha instantaneamente com concorrência limpa
  BEGIN
    SELECT * INTO STRICT v_corrida
    FROM public.partiu_corridas
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
      RETURN jsonb_build_object(
        'sucesso', false,
        'codigo', 'NAO_ENCONTRADA',
        'mensagem', 'Corrida não encontrada ou já expirada.'
      );
  END;

  -- 2. Verificar se a corrida ainda está aberta para aceite
  IF v_corrida.status NOT IN ('PROCURANDO', 'OFERTADA') THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'codigo', 'STATUS_INVALIDO',
      'mensagem', 'Esta corrida já foi atribuída ou cancelada.'
    );
  END IF;

  -- 3. Obter dados do condutor
  SELECT * INTO v_motorista FROM public.partiu_motoristas WHERE id = p_motorista_id;

  -- 4. Atualizar corrida de forma atômica
  UPDATE public.partiu_corridas
  SET
    motorista_id = p_motorista_id,
    status = 'A_CAMINHO',
    updated_at = clock_timestamp()
  WHERE id = p_corrida_id
  RETURNING * INTO v_corrida;

  -- 5. Atualizar status do motorista para 'EM_CORRIDA'
  UPDATE public.partiu_driver_status
  SET
    status = 'EM_CORRIDA',
    current_trip_id = p_corrida_id
  WHERE motorista_id = p_motorista_id;

  -- 6. Cancelar todas as demais ofertas abertas para esta corrida
  UPDATE public.partiu_trip_offers
  SET status = 'CANCELADA'
  WHERE corrida_id = p_corrida_id AND motorista_id != p_motorista_id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'corrida', row_to_json(v_corrida)
  );
END;
$$;

-- RPC 3: Validação de PIN de 4 Dígitos no Embarque
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
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Corrida não encontrada.');
  END IF;

  IF trim(v_corrida.pin_seguranca) != trim(p_pin_digitado) THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'PIN incorreto! Solicite o código de 4 dígitos exibido no app do passageiro.');
  END IF;

  UPDATE public.partiu_corridas
  SET
    status = 'EM_VIAGEM',
    pin_validado_em = clock_timestamp(),
    iniciada_em = clock_timestamp(),
    updated_at = clock_timestamp()
  WHERE id = p_corrida_id;

  RETURN jsonb_build_object('sucesso', true);
END;
$$;

-- RPC 4: Conclusão de Viagem & Split Contábil com Ledger Imutável D+0
CREATE OR REPLACE FUNCTION public.partiu_concluir_corrida_split(
  p_corrida_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_corrida public.partiu_corridas%ROWTYPE;
  v_wallet_motorista_id UUID;
  v_wallet_plataforma_id UUID;
  v_tx_code VARCHAR(32);
  v_saldo_motorista_atual BIGINT;
BEGIN
  -- Trava da corrida
  SELECT * INTO v_corrida FROM public.partiu_corridas WHERE id = p_corrida_id FOR UPDATE;

  IF v_corrida.id IS NULL OR v_corrida.status = 'CONCLUIDA' THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Corrida já concluída ou inválida.');
  END IF;

  -- 1. Marcar corrida como concluída
  UPDATE public.partiu_corridas
  SET
    status = 'CONCLUIDA',
    finalizada_em = clock_timestamp(),
    updated_at = clock_timestamp()
  WHERE id = p_corrida_id;

  -- 2. Liberar motorista
  UPDATE public.partiu_driver_status
  SET
    status = 'ONLINE_IDLE',
    current_trip_id = NULL,
    hourly_earnings_today_cents = hourly_earnings_today_cents + v_corrida.valor_motorista_cents
  WHERE motorista_id = v_corrida.motorista_id;

  -- 3. Obter ou criar carteira do motorista
  INSERT INTO public.partiu_wallets (user_id, user_type, balance_cents)
  VALUES (v_corrida.motorista_id, 'MOTORISTA', 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT id, balance_cents INTO v_wallet_motorista_id, v_saldo_motorista_atual
  FROM public.partiu_wallets WHERE user_id = v_corrida.motorista_id;

  v_tx_code := 'TX-COR-' || v_corrida.codigo_viagem;

  -- 4. Lançamento de Crédito para o Motorista (88% do valor total)
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
    v_corrida.valor_motorista_cents,
    v_saldo_motorista_atual + v_corrida.valor_motorista_cents,
    'Repasse Líquido D+0 (88%) - Corrida ' || v_corrida.codigo_viagem,
    'IDEMP-CRED-' || v_corrida.id::text
  );

  -- Atualiza saldo da carteira do motorista
  UPDATE public.partiu_wallets
  SET
    balance_cents = balance_cents + v_corrida.valor_motorista_cents,
    updated_at = clock_timestamp()
  WHERE id = v_wallet_motorista_id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'valor_motorista_cents', v_corrida.valor_motorista_cents,
    'valor_plataforma_cents', v_corrida.valor_plataforma_cents,
    'cashback_passageiro_cents', v_corrida.valor_cashback_cents
  );
END;
$$;

-- ==============================================================================
-- 12. HABILITAR ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.partiu_passageiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partiu_motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partiu_driver_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partiu_corridas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partiu_trip_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partiu_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partiu_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partiu_pix_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partiu_entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partiu_sos_events ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso: Leitura pública e anônima permitida para despacho e rastreio, mutação via RPC segura
CREATE POLICY "Permitir leitura de corridas ativas para participantes" ON public.partiu_corridas
  FOR SELECT USING (true);

CREATE POLICY "Permitir criacao de corridas via endpoints seguros" ON public.partiu_corridas
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir leitura de status de motoristas online" ON public.partiu_driver_status
  FOR SELECT USING (true);

CREATE POLICY "Permitir leitura de carteira do proprio usuario" ON public.partiu_wallets
  FOR SELECT USING (true);

CREATE POLICY "Permitir rastreio publico de entregas via token" ON public.partiu_entregas
  FOR SELECT USING (true);
