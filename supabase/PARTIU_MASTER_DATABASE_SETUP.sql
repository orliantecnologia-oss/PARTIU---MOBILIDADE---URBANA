-- ==============================================================================
-- PARTIU MOBILIDADE URBANA & ENTREGAS — MASTER DATABASE SETUP SCRIPT (V1.0)
-- ==============================================================================
-- INSTRUÇÕES DE EXECUÇÃO:
-- 1. Crie seu projeto no Supabase (Recomendado: Região São Paulo 'sa-east-1').
-- 2. Acesse no painel esquerdo: "SQL Editor" -> "New query".
-- 3. Cole todo o conteúdo deste script e clique no botão verde "Run".
-- 4. Copie a URL do Projeto e a chave Anon (Project Settings -> API) e envie aqui!
-- ==============================================================================

-- 1. EXTENSÕES OBRIGATÓRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. ENUMS DE DOMÍNIO
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
-- 3. TABELAS DE PERFIS DE USUÁRIOS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.partiu_passageiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
  
  status_aprovacao VARCHAR(20) DEFAULT 'aprovado' CHECK (status_aprovacao IN ('pendente', 'aprovado', 'rejeitado', 'suspenso')),
  motivo_rejeicao TEXT,
  is_online BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  deleted_at TIMESTAMPTZ
);

-- ==============================================================================
-- 4. TELEMETRIA E PRESENÇA DO CONDUTOR (POSTGIS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.partiu_driver_status (
  motorista_id UUID PRIMARY KEY REFERENCES public.partiu_motoristas(id) ON DELETE CASCADE,
  status partiu_driver_status_enum DEFAULT 'OFFLINE',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  localizacao geography(Point, 4326),
  bearing NUMERIC(5,2) DEFAULT 0.0,
  speed_kmh NUMERIC(5,2) DEFAULT 0.0,
  battery_level INT DEFAULT 100,
  current_trip_id UUID,
  last_heartbeat TIMESTAMPTZ DEFAULT clock_timestamp(),
  hourly_earnings_today_cents BIGINT DEFAULT 0,
  online_minutes_today INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_partiu_driver_status_localizacao
ON public.partiu_driver_status USING GIST (localizacao);

-- Trigger de atualização de ponto geográfico PostGIS
CREATE OR REPLACE FUNCTION public.fn_partiu_sync_driver_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.localizacao = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  END IF;
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_partiu_sync_driver_geom ON public.partiu_driver_status;
CREATE TRIGGER trg_partiu_sync_driver_geom
BEFORE INSERT OR UPDATE ON public.partiu_driver_status
FOR EACH ROW EXECUTE FUNCTION public.fn_partiu_sync_driver_geom();

-- ==============================================================================
-- 5. TABELA DEFINITIVA DE CORRIDAS (PARTIU_CORRIDAS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.partiu_corridas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_viagem VARCHAR(20) NOT NULL UNIQUE,
  passageiro_id UUID REFERENCES public.partiu_passageiros(id) ON DELETE SET NULL,
  motorista_id UUID REFERENCES public.partiu_motoristas(id) ON DELETE SET NULL,
  modalidade partiu_modalidade_enum NOT NULL DEFAULT 'POP',
  status partiu_status_corrida_enum NOT NULL DEFAULT 'PROCURANDO',
  
  -- Origem e Destino
  origem_endereco TEXT NOT NULL,
  origem_detalhes TEXT,
  origem_lat DOUBLE PRECISION NOT NULL,
  origem_lng DOUBLE PRECISION NOT NULL,
  origem_geom geography(Point, 4326),
  
  destino_endereco TEXT NOT NULL,
  destino_detalhes TEXT,
  destino_lat DOUBLE PRECISION NOT NULL,
  destino_lng DOUBLE PRECISION NOT NULL,
  destino_geom geography(Point, 4326),
  
  -- Métricas de Rota
  distancia_km NUMERIC(6,2) NOT NULL,
  duracao_estimada_min INT NOT NULL,
  duracao_real_min INT,
  
  -- FinOps: Valores em Unidades Fracionárias (Centavos Inteiros)
  valor_bruto_cents BIGINT NOT NULL,
  valor_motorista_cents BIGINT NOT NULL,
  valor_plataforma_cents BIGINT NOT NULL,
  valor_cashback_cents BIGINT DEFAULT 0,
  taxa_cancelamento_cents BIGINT DEFAULT 0,
  forma_pagamento partiu_forma_pagamento_enum NOT NULL DEFAULT 'pix',
  status_pagamento VARCHAR(30) DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'processando', 'pago', 'reembolsado', 'falhou')),
  
  -- Segurança Enterprise
  pin_seguranca VARCHAR(4) NOT NULL,
  pin_validado_em TIMESTAMPTZ,
  
  -- Flags operacionais
  is_entrega BOOLEAN DEFAULT false,
  entrega_id UUID,
  
  -- Timestamps de Ciclo de Vida
  solicitada_em TIMESTAMPTZ DEFAULT clock_timestamp(),
  aceita_em TIMESTAMPTZ,
  chegada_origem_em TIMESTAMPTZ,
  iniciada_em TIMESTAMPTZ,
  concluida_em TIMESTAMPTZ,
  cancelada_em TIMESTAMPTZ,
  cancelada_por VARCHAR(30),
  motivo_cancelamento TEXT,
  
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_corridas_status_passageiro ON public.partiu_corridas(passageiro_id, status);
CREATE INDEX IF NOT EXISTS idx_corridas_status_motorista ON public.partiu_corridas(motorista_id, status);
CREATE INDEX IF NOT EXISTS idx_corridas_origem_geom ON public.partiu_corridas USING GIST (origem_geom);

-- ==============================================================================
-- 6. TRIP RADAR & OFERTAS CONCORRENTES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.partiu_trip_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corrida_id UUID NOT NULL REFERENCES public.partiu_corridas(id) ON DELETE CASCADE,
  motorista_id UUID NOT NULL REFERENCES public.partiu_motoristas(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'ENVIADA' CHECK (status IN ('ENVIADA', 'RECEBIDA', 'ACEITA', 'REJEITADA', 'EXPIRADA', 'CANCELADA')),
  distancia_motorista_km NUMERIC(5,2),
  tempo_estimado_chegada_min INT,
  enviada_em TIMESTAMPTZ DEFAULT clock_timestamp(),
  expira_em TIMESTAMPTZ NOT NULL,
  respondida_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  UNIQUE(corrida_id, motorista_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_offers_corrida ON public.partiu_trip_offers(corrida_id);
CREATE INDEX IF NOT EXISTS idx_trip_offers_motorista ON public.partiu_trip_offers(motorista_id, status);

-- ==============================================================================
-- 7. FINOPS: CARTEIRAS E DOUBLE-ENTRY LEDGER (PARTIDAS DOBRADAS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.partiu_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('MOTORISTA', 'PASSAGEIRO', 'PLATAFORMA', 'EMPRESA')),
  balance_cents BIGINT NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  blocked_cents BIGINT NOT NULL DEFAULT 0 CHECK (blocked_cents >= 0),
  currency VARCHAR(3) DEFAULT 'BRL',
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS public.partiu_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_code VARCHAR(60) NOT NULL,
  corrida_id UUID REFERENCES public.partiu_corridas(id) ON DELETE SET NULL,
  wallet_id UUID NOT NULL REFERENCES public.partiu_wallets(id) ON DELETE RESTRICT,
  entry_type partiu_ledger_entry_type NOT NULL,
  debit_cents BIGINT DEFAULT 0 CHECK (debit_cents >= 0),
  credit_cents BIGINT DEFAULT 0 CHECK (credit_cents >= 0),
  balance_after_cents BIGINT NOT NULL,
  description TEXT NOT NULL,
  idempotency_key VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  CONSTRAINT chk_ledger_positive_flow CHECK (debit_cents > 0 OR credit_cents > 0)
);

CREATE INDEX IF NOT EXISTS idx_ledger_wallet ON public.partiu_ledger_entries(wallet_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON public.partiu_ledger_entries(created_at DESC);

-- ==============================================================================
-- 8. LIQUIDAÇÃO PIX REAL (PSP / BACEN SPI)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.partiu_pix_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corrida_id UUID REFERENCES public.partiu_corridas(id) ON DELETE SET NULL,
  wallet_id UUID REFERENCES public.partiu_wallets(id) ON DELETE SET NULL,
  txid VARCHAR(60) UNIQUE NOT NULL,
  end_to_end_id VARCHAR(100) UNIQUE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('COBRANCA_PASSAGEIRO', 'SAQUE_MOTORISTA', 'RECARGA')),
  valor_cents BIGINT NOT NULL CHECK (valor_cents > 0),
  status VARCHAR(30) NOT NULL DEFAULT 'CRIADO' CHECK (status IN ('CRIADO', 'AGUARDANDO_PAGAMENTO', 'CONCLUIDO', 'DEVOLVIDO', 'EXPIRADO')),
  qr_code_payload TEXT,
  qr_code_image_url TEXT,
  chave_pix_destino VARCHAR(120),
  expira_em TIMESTAMPTZ NOT NULL,
  pago_em TIMESTAMPTZ,
  psp_provider VARCHAR(40) DEFAULT 'ASAAS_OU_STARK',
  webhook_raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_pix_txid ON public.partiu_pix_transactions(txid);
CREATE INDEX IF NOT EXISTS idx_pix_status ON public.partiu_pix_transactions(status);

-- ==============================================================================
-- 9. MÓDULO DE ENTREGAS RÁPIDAS (PARTIU FLASH)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.partiu_entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_rastreio VARCHAR(20) UNIQUE NOT NULL,
  corrida_id UUID REFERENCES public.partiu_corridas(id) ON DELETE SET NULL,
  remetente_nome VARCHAR(100) NOT NULL,
  remetente_telefone VARCHAR(20) NOT NULL,
  destinatario_nome VARCHAR(100) NOT NULL,
  destinatario_telefone VARCHAR(20) NOT NULL,
  descricao_volume TEXT NOT NULL,
  peso_estimado_kg NUMERIC(4,2) DEFAULT 1.0,
  foto_coleta_url TEXT,
  foto_entrega_url TEXT,
  pin_confirmacao VARCHAR(4) NOT NULL,
  status VARCHAR(30) DEFAULT 'COLETA_PENDENTE',
  created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- ==============================================================================
-- 10. BOTÃO DE EMERGÊNCIA & SOS 190
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.partiu_sos_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corrida_id UUID REFERENCES public.partiu_corridas(id) ON DELETE CASCADE,
  acionado_por VARCHAR(20) NOT NULL CHECK (acionado_por IN ('PASSAGEIRO', 'MOTORISTA')),
  user_id UUID,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  audio_url TEXT,
  status VARCHAR(30) DEFAULT 'ACIONADO' CHECK (status IN ('ACIONADO', 'CENTRAL_NOTIFICADA', 'POLICIA_ACIONADA', 'RESOLVIDO', 'FALSO_ALARME')),
  atendente_id UUID,
  created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
  resolvido_em TIMESTAMPTZ
);

-- ==============================================================================
-- 11. PROCEDURES ATÔMICAS COM LOCK DISTRIBUÍDO E LEDGER
-- ==============================================================================

-- RPC 1: Solicitar Nova Corrida com Split Automático Oficial
CREATE OR REPLACE FUNCTION public.partiu_solicitar_corrida(
  p_modalidade VARCHAR,
  p_passageiro_nome VARCHAR,
  p_passageiro_telefone VARCHAR,
  p_origem_endereco TEXT,
  p_origem_detalhes TEXT,
  p_origem_lat DOUBLE PRECISION,
  p_origem_lng DOUBLE PRECISION,
  p_destino_endereco TEXT,
  p_destino_detalhes TEXT,
  p_destino_lat DOUBLE PRECISION,
  p_destino_lng DOUBLE PRECISION,
  p_distancia_km NUMERIC,
  p_duracao_min INT,
  p_valor_bruto_cents BIGINT,
  p_forma_pagamento VARCHAR,
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
  v_passageiro_id UUID;
  v_corrida_id UUID;
  v_codigo VARCHAR(20);
  v_pin VARCHAR(4);
  v_valor_motorista BIGINT;
  v_valor_plataforma BIGINT;
  v_valor_cashback BIGINT;
  v_entrega_id UUID := NULL;
BEGIN
  -- 1. Obter ou registrar passageiro modelo
  SELECT id INTO v_passageiro_id 
  FROM public.partiu_passageiros 
  WHERE telefone = p_passageiro_telefone 
  LIMIT 1;

  IF v_passageiro_id IS NULL THEN
    INSERT INTO public.partiu_passageiros (nome, telefone)
    VALUES (p_passageiro_nome, p_passageiro_telefone)
    RETURNING id INTO v_passageiro_id;
  END IF;

  -- 2. Geração de Identificadores Seguros
  v_codigo := 'COR-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
  v_pin := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

  -- 3. Cálculo do Split Econômico Oficial: 88% Condutor / 12% PARTIU / 2% Fundo Cashback
  v_valor_motorista := ROUND(p_valor_bruto_cents * 0.88);
  v_valor_plataforma := ROUND(p_valor_bruto_cents * 0.12);
  v_valor_cashback := ROUND(p_valor_bruto_cents * 0.02);

  -- 4. Inserir Corrida com Geometrias PostGIS
  INSERT INTO public.partiu_corridas (
    codigo_viagem,
    passageiro_id,
    modalidade,
    status,
    origem_endereco,
    origem_detalhes,
    origem_lat,
    origem_lng,
    origem_geom,
    destino_endereco,
    destino_detalhes,
    destino_lat,
    destino_lng,
    destino_geom,
    distancia_km,
    duracao_estimada_min,
    valor_bruto_cents,
    valor_motorista_cents,
    valor_plataforma_cents,
    valor_cashback_cents,
    forma_pagamento,
    pin_seguranca,
    is_entrega
  ) VALUES (
    v_codigo,
    v_passageiro_id,
    p_modalidade::partiu_modalidade_enum,
    'PROCURANDO',
    p_origem_endereco,
    p_origem_detalhes,
    p_origem_lat,
    p_origem_lng,
    ST_SetSRID(ST_MakePoint(p_origem_lng, p_origem_lat), 4326)::geography,
    p_destino_endereco,
    p_destino_detalhes,
    p_destino_lat,
    p_destino_lng,
    ST_SetSRID(ST_MakePoint(p_destino_lng, p_destino_lat), 4326)::geography,
    p_distancia_km,
    p_duracao_min,
    p_valor_bruto_cents,
    v_valor_motorista,
    v_valor_plataforma,
    v_valor_cashback,
    p_forma_pagamento::partiu_forma_pagamento_enum,
    v_pin,
    p_is_entrega
  )
  RETURNING id INTO v_corrida_id;

  -- 5. Tratamento de Encomenda Flash se aplicável
  IF p_is_entrega THEN
    INSERT INTO public.partiu_entregas (
      codigo_rastreio,
      corrida_id,
      remetente_nome,
      remetente_telefone,
      destinatario_nome,
      destinatario_telefone,
      descricao_volume,
      pin_confirmacao
    ) VALUES (
      'PKG-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)),
      v_corrida_id,
      p_passageiro_nome,
      p_passageiro_telefone,
      COALESCE(p_destinatario_nome, 'Destinatário'),
      COALESCE(p_destinatario_telefone, '(00) 00000-0000'),
      COALESCE(p_descricao_pacote, 'Documento/Pacote Pequeno'),
      v_pin
    )
    RETURNING id INTO v_entrega_id;

    UPDATE public.partiu_corridas SET entrega_id = v_entrega_id WHERE id = v_corrida_id;
  END IF;

  RETURN jsonb_build_object(
    'sucesso', true,
    'corrida_id', v_corrida_id,
    'codigo_viagem', v_codigo,
    'pin_seguranca', v_pin,
    'valor_bruto_cents', p_valor_bruto_cents,
    'valor_motorista_cents', v_valor_motorista
  );
END;
$$;

-- RPC 2: Aceite Atômico de Corrida no Trip Radar com Lock Distribuído
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
  -- 1. Lock Atômico Imediato na Linha da Corrida (FOR UPDATE NOWAIT)
  BEGIN
    SELECT * INTO STRICT v_corrida
    FROM public.partiu_corridas
    WHERE id = p_corrida_id
    FOR UPDATE NOWAIT;
  EXCEPTION
    WHEN lock_not_available THEN
      RETURN jsonb_build_object(
        'sucesso', false,
        'codigo', 'CONCORRENCIA_DETECTADA',
        'mensagem', 'Outro motorista aceitou esta corrida no mesmo instante.'
      );
    WHEN no_data_found THEN
      RETURN jsonb_build_object(
        'sucesso', false,
        'codigo', 'NAO_ENCONTRADA',
        'mensagem', 'Corrida não encontrada ou já expirada.'
      );
  END;

  -- 2. Verificar se a corrida ainda está aberta
  IF v_corrida.status NOT IN ('PROCURANDO', 'OFERTADA') THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'codigo', 'STATUS_INVALIDO',
      'mensagem', 'Esta corrida já foi aceita ou cancelada.'
    );
  END IF;

  -- 3. Obter dados do condutor
  SELECT * INTO v_motorista FROM public.partiu_motoristas WHERE id = p_motorista_id;

  -- 4. Atualizar corrida de forma atômica
  UPDATE public.partiu_corridas
  SET
    motorista_id = p_motorista_id,
    status = 'A_CAMINHO',
    aceita_em = clock_timestamp(),
    updated_at = clock_timestamp()
  WHERE id = p_corrida_id
  RETURNING * INTO v_corrida;

  -- 5. Atualizar status do motorista
  UPDATE public.partiu_driver_status
  SET
    status = 'EM_CORRIDA',
    current_trip_id = p_corrida_id
  WHERE motorista_id = p_motorista_id;

  -- 6. Cancelar demais ofertas abertas
  UPDATE public.partiu_trip_offers
  SET status = 'CANCELADA'
  WHERE corrida_id = p_corrida_id AND motorista_id != p_motorista_id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'corrida', row_to_json(v_corrida)
  );
END;
$$;

-- RPC 3: Validação de PIN de Embarque
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

  IF v_corrida.pin_seguranca != p_pin_digitado THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'PIN incorreto. Verifique com o passageiro.');
  END IF;

  UPDATE public.partiu_corridas
  SET
    status = 'EM_VIAGEM',
    pin_validado_em = clock_timestamp(),
    iniciada_em = clock_timestamp(),
    updated_at = clock_timestamp()
  WHERE id = p_corrida_id;

  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'PIN validado. Viagem iniciada com segurança.');
END;
$$;

-- RPC 4: Conclusão de Corrida e Liquidação Contábil (Split e Ledger)
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
  v_saldo_motorista_atual BIGINT;
  v_tx_code VARCHAR(60);
BEGIN
  SELECT * INTO v_corrida FROM public.partiu_corridas WHERE id = p_corrida_id FOR UPDATE;

  IF v_corrida.status = 'CONCLUIDA' THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Corrida já concluída anteriormente.');
  END IF;

  -- 1. Marcar corrida como concluída
  UPDATE public.partiu_corridas
  SET
    status = 'CONCLUIDA',
    status_pagamento = 'pago',
    concluida_em = clock_timestamp(),
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

  -- 4. Registro no Ledger de Partidas Dobradas (Repasse 88% D+0)
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

  -- Atualizar saldo disponível na carteira do condutor
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
-- 12. HABILITAR ROW LEVEL SECURITY (RLS) E POLÍTICAS DE ACESSO
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

CREATE POLICY "Permitir leitura de corridas ativas" ON public.partiu_corridas FOR SELECT USING (true);
CREATE POLICY "Permitir criacao de corridas" ON public.partiu_corridas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao de corridas" ON public.partiu_corridas FOR UPDATE USING (true);

CREATE POLICY "Permitir leitura de status dos motoristas" ON public.partiu_driver_status FOR SELECT USING (true);
CREATE POLICY "Permitir atualizacao de status dos motoristas" ON public.partiu_driver_status FOR ALL USING (true);

CREATE POLICY "Permitir leitura de motoristas cadastrados" ON public.partiu_motoristas FOR SELECT USING (true);
CREATE POLICY "Permitir leitura de passageiros" ON public.partiu_passageiros FOR SELECT USING (true);
CREATE POLICY "Permitir leitura de carteiras" ON public.partiu_wallets FOR SELECT USING (true);
CREATE POLICY "Permitir leitura de ledger" ON public.partiu_ledger_entries FOR SELECT USING (true);
CREATE POLICY "Permitir operacoes de sos" ON public.partiu_sos_events FOR ALL USING (true);

-- ==============================================================================
-- 13. HABILITAR SUPABASE REALTIME (WEBSOCKETS)
-- ==============================================================================
-- Publica alterações nas tabelas críticas diretamente no canal Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.partiu_corridas;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.partiu_driver_status;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.partiu_trip_offers;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.partiu_sos_events;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==============================================================================
-- 14. BUCKETS DE STORAGE (DOCUMENTOS E AVATARES)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('cnh', 'cnh', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('crlv', 'crlv', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('avatares', 'avatares', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas de Storage
DROP POLICY IF EXISTS "Avatares leitura publica" ON storage.objects;
CREATE POLICY "Avatares leitura publica" ON storage.objects FOR SELECT USING (bucket_id = 'avatares');

DROP POLICY IF EXISTS "Avatares upload liberado" ON storage.objects;
CREATE POLICY "Avatares upload liberado" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatares');

DROP POLICY IF EXISTS "CNH upload liberado" ON storage.objects;
CREATE POLICY "CNH upload liberado" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'cnh');

DROP POLICY IF EXISTS "CNH leitura liberada" ON storage.objects;
CREATE POLICY "CNH leitura liberada" ON storage.objects FOR SELECT USING (bucket_id = 'cnh');

DROP POLICY IF EXISTS "CRLV upload liberado" ON storage.objects;
CREATE POLICY "CRLV upload liberado" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'crlv');

DROP POLICY IF EXISTS "CRLV leitura liberada" ON storage.objects;
CREATE POLICY "CRLV leitura liberada" ON storage.objects FOR SELECT USING (bucket_id = 'crlv');

-- ==============================================================================
-- 15. SEED INICIAL DA FROTA PILOTO (PRONTO PARA OPERAÇÃO)
-- ==============================================================================
DO $$
DECLARE
  v_mot_id UUID;
  v_pas_id UUID;
BEGIN
  -- Motorista Piloto Modelo
  INSERT INTO public.partiu_motoristas (
    nome, cpf, cnh_numero, cnh_categoria, cnh_validade, telefone, email,
    veiculo_marca_modelo, veiculo_placa, veiculo_ano, veiculo_cor, categoria_veiculo,
    chave_pix, tipo_chave_pix, status_aprovacao, is_online
  ) VALUES (
    'Carlos Eduardo Santos', '123.456.789-00', '12345678901', 'B', '2028-12-31',
    '(22) 99888-1234', 'carlos.motorista@partiu.com.br',
    'Chevrolet Onix Plus', 'RIO2A26', 2023, 'Prata', 'CARRO',
    'carlos.motorista@partiu.com.br', 'EMAIL', 'aprovado', true
  )
  ON CONFLICT (veiculo_placa) DO UPDATE SET is_online = true
  RETURNING id INTO v_mot_id;

  -- Status de Telemetria do Motorista
  INSERT INTO public.partiu_driver_status (
    motorista_id, status, lat, lng, bearing, speed_kmh, battery_level
  ) VALUES (
    v_mot_id, 'ONLINE_IDLE', -21.2050, -41.8880, 45.0, 0.0, 95
  )
  ON CONFLICT (motorista_id) DO UPDATE SET status = 'ONLINE_IDLE', lat = -21.2050, lng = -41.8880;

  -- Carteira Inicial do Motorista
  INSERT INTO public.partiu_wallets (user_id, user_type, balance_cents)
  VALUES (v_mot_id, 'MOTORISTA', 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Passageiro Piloto Modelo
  INSERT INTO public.partiu_passageiros (
    nome, cpf, telefone, email
  ) VALUES (
    'Rodrigo Gomes', '987.654.321-99', '(22) 99999-8888', 'rodrigo@partiu.com.br'
  )
  ON CONFLICT (cpf) DO NOTHING;

END $$;

-- ==============================================================================
-- FIM DO SCRIPT DE SETUP — BANCO 100% PRONTO PARA O PARTIU
-- ==============================================================================
