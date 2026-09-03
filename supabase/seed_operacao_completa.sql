-- ==============================================================================
-- 🚀 UNIVANS TOS — SCRIPT DE CARGA OPERACIONAL REAL PARA SUPABASE (V3 HEX VÁLIDO)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Criação do Enum e da Tabela de Papéis de Usuário (user_roles)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('passageiro','motorista','admin','superadmin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'passageiro',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT ON public.user_roles TO anon;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura publica de user_roles" ON public.user_roles;
CREATE POLICY "Leitura publica de user_roles" ON public.user_roles FOR SELECT USING (true);

-- 2. Inserir Usuários em auth.users (necessários para as chaves estrangeiras)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    'd0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'motorista1@univans.com.br',
    crypt('univans123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Carlos Eduardo Santos","phone":"(82) 99123-4567","role":"motorista"}'::jsonb,
    now(),
    now()
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'motorista2@univans.com.br',
    crypt('univans123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Marcos Vinicius Lima","phone":"(82) 99876-5432","role":"motorista"}'::jsonb,
    now(),
    now()
  ),
  (
    'd0000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'motorista3@univans.com.br',
    crypt('univans123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"José Roberto Alencar","phone":"(81) 98765-4321","role":"motorista"}'::jsonb,
    now(),
    now()
  ),
  (
    'd0000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'motorista4@univans.com.br',
    crypt('univans123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Antônio Carlos Ferreira","phone":"(82) 99654-7890","role":"motorista"}'::jsonb,
    now(),
    now()
  ),
  (
    'd0000000-0000-0000-0000-000000000099',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'passageiro@univans.com.br',
    crypt('univans123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Mariana Costa Lima","phone":"(82) 99124-8821","role":"passageiro"}'::jsonb,
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Inserir Perfis em public.profiles
INSERT INTO public.profiles (id, full_name, phone, role)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'Carlos Eduardo Santos', '(82) 99123-4567', 'motorista'),
  ('d0000000-0000-0000-0000-000000000002', 'Marcos Vinicius Lima', '(82) 99876-5432', 'motorista'),
  ('d0000000-0000-0000-0000-000000000003', 'José Roberto Alencar', '(81) 98765-4321', 'motorista'),
  ('d0000000-0000-0000-0000-000000000004', 'Antônio Carlos Ferreira', '(82) 99654-7890', 'motorista'),
  ('d0000000-0000-0000-0000-000000000099', 'Mariana Costa Lima', '(82) 99124-8821', 'passageiro')
ON CONFLICT (id) DO NOTHING;

-- 4. Inserir Papéis em public.user_roles
INSERT INTO public.user_roles (user_id, role)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'motorista'),
  ('d0000000-0000-0000-0000-000000000002', 'motorista'),
  ('d0000000-0000-0000-0000-000000000003', 'motorista'),
  ('d0000000-0000-0000-0000-000000000004', 'motorista'),
  ('d0000000-0000-0000-0000-000000000099', 'passageiro')
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Veículos, Viagens de Hoje, Passagens e Fechamento de Caixa
DO $$ 
DECLARE
  v_mot1 UUID := 'd0000000-0000-0000-0000-000000000001';
  v_mot2 UUID := 'd0000000-0000-0000-0000-000000000002';
  v_mot3 UUID := 'd0000000-0000-0000-0000-000000000003';
  v_mot4 UUID := 'd0000000-0000-0000-0000-000000000004';
  v_pass UUID := 'd0000000-0000-0000-0000-000000000099';
  v_linha1 UUID := 'a0000000-0000-0000-0000-000000000001';
  v_linha2 UUID := 'a0000000-0000-0000-0000-000000000002';
  v_linha3 UUID := 'a0000000-0000-0000-0000-000000000003';
  v_veic1 UUID := 'e0000000-0000-0000-0000-000000000001';
  v_veic2 UUID := 'e0000000-0000-0000-0000-000000000002';
  v_veic3 UUID := 'e0000000-0000-0000-0000-000000000003';
  v_veic4 UUID := 'e0000000-0000-0000-0000-000000000004';
  v_viag1 UUID := 'f0000000-0000-0000-0000-000000000001';
  v_viag2 UUID := 'f0000000-0000-0000-0000-000000000002';
  v_viag3 UUID := 'f0000000-0000-0000-0000-000000000003';
  v_hoje DATE := CURRENT_DATE;
BEGIN

  -- Inserir Veículos Reais da Cooperativa
  INSERT INTO public.veiculos (id, motorista_id, placa, modelo, ano, capacidade_vagas, starlink_wifi_ssid, status_aprovacao)
  VALUES
    (v_veic1, v_mot1, 'QTT-4A82', 'Mercedes-Benz Sprinter 516 CDI VIP', 2024, 16, 'UniVans_Starlink_01', 'aprovado'),
    (v_veic2, v_mot2, 'RGZ-9F10', 'Renault Master Grand L3H2 Executiva', 2023, 16, 'UniVans_Starlink_02', 'aprovado'),
    (v_veic3, v_mot3, 'SAH-3C45', 'Mercedes-Benz Sprinter 415 CDI', 2024, 19, 'UniVans_Starlink_03', 'aprovado'),
    (v_veic4, v_mot4, 'NMD-8821', 'Fiat Ducato Maxi Cargo Executiva', 2022, 16, 'UniVans_Starlink_04', 'pendente')
  ON CONFLICT (id) DO UPDATE SET
    status_aprovacao = EXCLUDED.status_aprovacao,
    modelo = EXCLUDED.modelo;

  -- Inserir Viagens em Tempo Real para a Data de Hoje
  INSERT INTO public.viagens (
    id, linha_id, motorista_id, veiculo_id, data_viagem, 
    horario_saida, horario_chegada_previsto, status, 
    vagas_ocupadas, vagas_totais, posicao_lat_atual, posicao_lng_atual
  )
  VALUES
    (
      v_viag1, v_linha1, v_mot1, v_veic1, v_hoje,
      '06:30', '09:18', 'em_transito',
      14, 16, -10.0254, -36.1842
    ),
    (
      v_viag2, v_linha2, v_mot2, v_veic2, v_hoje,
      '07:00', '09:05', 'em_transito',
      16, 16, -9.7821, -35.9540
    ),
    (
      v_viag3, v_linha3, v_mot3, v_veic3, v_hoje,
      '05:00', '08:30', 'embarque_imediato',
      12, 19, -9.6200, -36.8000
    )
  ON CONFLICT (id) DO UPDATE SET
    data_viagem = EXCLUDED.data_viagem,
    status = EXCLUDED.status,
    posicao_lat_atual = EXCLUDED.posicao_lat_atual,
    posicao_lng_atual = EXCLUDED.posicao_lng_atual;

  -- Inserir Passagens Reais Emitidas e Pagas via PIX (UUIDs hex válidos com prefixo 11111111)
  INSERT INTO public.passagens (
    id, codigo_bilhete, viagem_id, passageiro_id, 
    passageiro_nome, passageiro_cpf, passageiro_whatsapp, 
    quantidade_passagens, valor_total, forma_pagamento, 
    status_pagamento, status_embarque, pix_txid, pix_expira_em, codigo_qr
  )
  VALUES
    ('11111111-0000-0000-0000-000000000001', 'CVAN-841920', v_viag1, v_pass, 'Mariana Costa Lima', '084.291.844-12', '(82) 99124-8821', 1, 38.00, 'PIX', 'pago', 'embarcado', 'TXID-841920', now() + interval '1 hour', 'QR-CVAN-841920'),
    ('11111111-0000-0000-0000-000000000002', 'CVAN-841921', v_viag1, v_pass, 'Lucas Gabriel Farias', '102.394.582-90', '(82) 99654-1234', 2, 76.00, 'PIX', 'pago', 'embarcado', 'TXID-841921', now() + interval '1 hour', 'QR-CVAN-841921'),
    ('11111111-0000-0000-0000-000000000003', 'CVAN-841922', v_viag1, v_pass, 'Dra. Camila Nogueira', '054.123.987-45', '(82) 98877-2233', 1, 38.00, 'PIX', 'pago', 'aguardando', 'TXID-841922', now() + interval '1 hour', 'QR-CVAN-841922'),
    ('11111111-0000-0000-0000-000000000004', 'CVAN-910231', v_viag2, v_pass, 'Rodrigo Albuquerque', '019.283.475-66', '(82) 99911-0022', 1, 35.00, 'PIX', 'pago', 'embarcado', 'TXID-910231', now() + interval '1 hour', 'QR-CVAN-910231'),
    ('11111111-0000-0000-0000-000000000005', 'CVAN-910232', v_viag2, v_pass, 'Ana Beatriz Medeiros', '077.345.123-88', '(82) 99344-5566', 2, 70.00, 'PIX', 'pago', 'embarcado', 'TXID-910232', now() + interval '1 hour', 'QR-CVAN-910232'),
    ('11111111-0000-0000-0000-000000000006', 'CVAN-734112', v_viag3, v_pass, 'José Wellington Silva', '033.456.789-01', '(81) 98122-3344', 1, 60.00, 'PIX', 'pago', 'aguardando', 'TXID-734112', now() + interval '1 hour', 'QR-CVAN-734112')
  ON CONFLICT (id) DO UPDATE SET
    status_pagamento = EXCLUDED.status_pagamento;

  -- Inserir Fechamento de Caixa Real (Conciliado)
  INSERT INTO public.fechamento_caixa (
    id, motorista_id, viagem_id, data_referencia, 
    total_bruto, taxa_cooperativa_pct, valor_cooperativa, 
    valor_liquido_motorista, status, fechado_em
  )
  VALUES
    (
      'c0000000-0000-0000-0000-000000000001', v_mot1, v_viag1, v_hoje,
      608.00, 8.50, 51.68, 556.32, 'fechado', now()
    ),
    (
      'c0000000-0000-0000-0000-000000000002', v_mot2, v_viag2, v_hoje,
      560.00, 8.50, 47.60, 512.40, 'fechado', now()
    )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status;

END $$;
