-- =========================
-- 0. ROLES (tabela dedicada, evita escalonamento de privilégio)
-- =========================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('passageiro','motorista','admin','superadmin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'passageiro',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','superadmin'));
$$;

CREATE POLICY "Usuário vê seus papéis" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- =========================
-- 1. PROFILES (extensão)
-- =========================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS ponto_embarque_padrao_id uuid,
  ADD COLUMN IF NOT EXISTS cidade_origem_padrao text,
  ADD COLUMN IF NOT EXISTS gps_lat double precision,
  ADD COLUMN IF NOT EXISTS gps_lng double precision;

DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.profiles;
CREATE POLICY "Admins podem ver todos os perfis" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- =========================
-- 2. LINHAS
-- =========================
CREATE TABLE IF NOT EXISTS public.linhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origem text NOT NULL,
  origem_sigla text,
  origem_lat double precision NOT NULL,
  origem_lng double precision NOT NULL,
  destino text NOT NULL,
  destino_sigla text,
  destino_lat double precision NOT NULL,
  destino_lng double precision NOT NULL,
  distancia_km numeric(6,2) NOT NULL,
  duracao_base_minutos integer NOT NULL,
  valor_passagem numeric(10,2) NOT NULL,
  tipo_van_padrao text DEFAULT 'Mercedes Sprinter VIP Executiva',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.linhas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.linhas TO authenticated;
GRANT ALL ON public.linhas TO service_role;
ALTER TABLE public.linhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Linhas leitura pública" ON public.linhas FOR SELECT USING (true);
CREATE POLICY "Linhas admin gerencia" ON public.linhas FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =========================
-- 3. PONTOS DE EMBARQUE
-- =========================
CREATE TABLE IF NOT EXISTS public.pontos_embarque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linha_id uuid REFERENCES public.linhas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cidade text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('trevo_rodoviario','posto_combustivel','terminal_rodoviario','praca_central','ponto_urbano_vip')),
  tipo_rotulo text NOT NULL,
  referencia text NOT NULL,
  endereco_completo text,
  comodidades text[] DEFAULT ARRAY['🛋️ Abrigo Coberto','🛡️ Iluminação 24h'],
  minutos_apos_saida integer NOT NULL DEFAULT 0,
  distancia_km_estimada numeric(6,2) DEFAULT 0,
  lat double precision,
  lng double precision,
  foto_url text,
  observacao_operacional text,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pontos_embarque TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pontos_embarque TO authenticated;
GRANT ALL ON public.pontos_embarque TO service_role;
ALTER TABLE public.pontos_embarque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pontos leitura pública" ON public.pontos_embarque FOR SELECT USING (true);
CREATE POLICY "Pontos admin gerencia" ON public.pontos_embarque FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =========================
-- 4. VEICULOS
-- =========================
CREATE TABLE IF NOT EXISTS public.veiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  placa text NOT NULL UNIQUE,
  modelo text NOT NULL,
  ano integer,
  capacidade_vagas integer NOT NULL DEFAULT 16,
  starlink_wifi_ssid text DEFAULT 'UniVans_Starlink_VIP',
  status_aprovacao text NOT NULL DEFAULT 'pendente' CHECK (status_aprovacao IN ('pendente','aprovado','rejeitado','bloqueado')),
  crlv_foto_url text,
  cnh_foto_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.veiculos TO authenticated;
GRANT ALL ON public.veiculos TO service_role;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Motorista gerencia seus veículos" ON public.veiculos FOR ALL TO authenticated
  USING (auth.uid() = motorista_id) WITH CHECK (auth.uid() = motorista_id);
CREATE POLICY "Admin audita veículos" ON public.veiculos FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =========================
-- 5. VIAGENS
-- =========================
CREATE TABLE IF NOT EXISTS public.viagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linha_id uuid NOT NULL REFERENCES public.linhas(id) ON DELETE RESTRICT,
  motorista_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  veiculo_id uuid REFERENCES public.veiculos(id) ON DELETE SET NULL,
  data_viagem date NOT NULL DEFAULT CURRENT_DATE,
  horario_saida time NOT NULL,
  horario_chegada_previsto time NOT NULL,
  vagas_totais integer NOT NULL DEFAULT 16,
  vagas_ocupadas integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada','embarque_imediato','em_transito','concluida','cancelada')),
  posicao_lat_atual double precision,
  posicao_lng_atual double precision,
  ultimo_ponto_passado_id uuid REFERENCES public.pontos_embarque(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.viagens TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.viagens TO authenticated;
GRANT ALL ON public.viagens TO service_role;
ALTER TABLE public.viagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Viagens leitura pública" ON public.viagens FOR SELECT USING (true);
CREATE POLICY "Motorista atualiza sua viagem" ON public.viagens FOR UPDATE TO authenticated
  USING (auth.uid() = motorista_id) WITH CHECK (auth.uid() = motorista_id);
CREATE POLICY "Admin gerencia viagens" ON public.viagens FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =========================
-- 6. PASSAGENS
-- =========================
CREATE TABLE IF NOT EXISTS public.passagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_bilhete text NOT NULL UNIQUE,
  viagem_id uuid NOT NULL REFERENCES public.viagens(id) ON DELETE RESTRICT,
  passageiro_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ponto_embarque_id uuid REFERENCES public.pontos_embarque(id) ON DELETE SET NULL,
  passageiro_nome text NOT NULL,
  passageiro_whatsapp text NOT NULL,
  passageiro_cpf text NOT NULL,
  quantidade_passagens integer NOT NULL DEFAULT 1,
  valor_total numeric(10,2) NOT NULL,
  forma_pagamento text NOT NULL DEFAULT 'PIX' CHECK (forma_pagamento IN ('PIX','CARTAO')),
  status_pagamento text NOT NULL DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente','pago','expirado','cancelado')),
  status_embarque text NOT NULL DEFAULT 'aguardando' CHECK (status_embarque IN ('aguardando','embarcado','ausente')),
  pix_txid text,
  pix_copia_cola text,
  pix_expira_em timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  codigo_qr text NOT NULL,
  embarcado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.passagens TO authenticated;
GRANT ALL ON public.passagens TO service_role;
ALTER TABLE public.passagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Passageiro vê suas passagens" ON public.passagens FOR SELECT TO authenticated
  USING (auth.uid() = passageiro_id);
CREATE POLICY "Passageiro cria passagem" ON public.passagens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = passageiro_id);
CREATE POLICY "Passageiro atualiza sua passagem" ON public.passagens FOR UPDATE TO authenticated
  USING (auth.uid() = passageiro_id) WITH CHECK (auth.uid() = passageiro_id);
CREATE POLICY "Motorista vê manifesto" ON public.passagens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.viagens v WHERE v.id = passagens.viagem_id AND v.motorista_id = auth.uid()));
CREATE POLICY "Motorista atualiza embarque" ON public.passagens FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.viagens v WHERE v.id = passagens.viagem_id AND v.motorista_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.viagens v WHERE v.id = passagens.viagem_id AND v.motorista_id = auth.uid()));
CREATE POLICY "Admin audita passagens" ON public.passagens FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =========================
-- 7. FECHAMENTO DE CAIXA
-- =========================
CREATE TABLE IF NOT EXISTS public.fechamento_caixa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  viagem_id uuid REFERENCES public.viagens(id) ON DELETE SET NULL,
  data_referencia date NOT NULL DEFAULT CURRENT_DATE,
  total_bruto numeric(10,2) NOT NULL DEFAULT 0.00,
  taxa_cooperativa_pct numeric(4,2) NOT NULL DEFAULT 8.00,
  valor_cooperativa numeric(10,2) NOT NULL DEFAULT 0.00,
  valor_liquido_motorista numeric(10,2) NOT NULL DEFAULT 0.00,
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','fechado','pago_ao_motorista')),
  fechado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fechamento_caixa TO authenticated;
GRANT ALL ON public.fechamento_caixa TO service_role;
ALTER TABLE public.fechamento_caixa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Motorista vê seu caixa" ON public.fechamento_caixa FOR SELECT TO authenticated
  USING (auth.uid() = motorista_id);
CREATE POLICY "Admin gerencia caixa" ON public.fechamento_caixa FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =========================
-- 8. BANNERS
-- =========================
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  subtitulo text,
  imagem_url text NOT NULL,
  link_destino text,
  tag text,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Banners leitura pública" ON public.banners FOR SELECT USING (true);
CREATE POLICY "Banners admin gerencia" ON public.banners FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =========================
-- 9. ÍNDICES
-- =========================
CREATE INDEX IF NOT EXISTS idx_pontos_linha ON public.pontos_embarque(linha_id, ordem);
CREATE INDEX IF NOT EXISTS idx_veiculos_motorista ON public.veiculos(motorista_id);
CREATE INDEX IF NOT EXISTS idx_viagens_linha_data ON public.viagens(linha_id, data_viagem);
CREATE INDEX IF NOT EXISTS idx_viagens_motorista ON public.viagens(motorista_id);
CREATE INDEX IF NOT EXISTS idx_passagens_viagem ON public.passagens(viagem_id);
CREATE INDEX IF NOT EXISTS idx_passagens_passageiro ON public.passagens(passageiro_id);
CREATE INDEX IF NOT EXISTS idx_passagens_status ON public.passagens(status_pagamento, pix_expira_em);
CREATE INDEX IF NOT EXISTS idx_caixa_motorista ON public.fechamento_caixa(motorista_id, data_referencia);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);

-- =========================
-- 10. TRIGGERS
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'passageiro'))
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_vagas_viagem()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status_pagamento = 'pago' AND (TG_OP = 'INSERT' OR OLD.status_pagamento IS DISTINCT FROM 'pago') THEN
    UPDATE public.viagens
      SET vagas_ocupadas = LEAST(vagas_totais, vagas_ocupadas + NEW.quantidade_passagens)
      WHERE id = NEW.viagem_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status_pagamento = 'pago' AND NEW.status_pagamento <> 'pago' THEN
    UPDATE public.viagens
      SET vagas_ocupadas = GREATEST(0, vagas_ocupadas - OLD.quantidade_passagens)
      WHERE id = NEW.viagem_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_atualizar_vagas ON public.passagens;
CREATE TRIGGER trg_atualizar_vagas
  AFTER INSERT OR UPDATE OF status_pagamento ON public.passagens
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_vagas_viagem();

CREATE OR REPLACE FUNCTION public.expirar_passagens_pendentes()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE afetadas integer;
BEGIN
  UPDATE public.passagens
    SET status_pagamento = 'expirado'
    WHERE status_pagamento = 'pendente' AND pix_expira_em < now();
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  RETURN afetadas;
END;
$$;

-- updated_at em todas as tabelas novas
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['linhas','pontos_embarque','veiculos','viagens','passagens','fechamento_caixa','banners'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- =========================
-- 11. REALTIME
-- =========================
ALTER TABLE public.viagens REPLICA IDENTITY FULL;
ALTER TABLE public.passagens REPLICA IDENTITY FULL;
ALTER TABLE public.pontos_embarque REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.viagens;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.passagens;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pontos_embarque;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;