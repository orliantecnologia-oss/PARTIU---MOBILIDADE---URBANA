-- ====================================================================
-- MIGRATION MESTRE UNIVANS MOBILITY PLATFORM - SUPABASE POSTGRESQL
-- PROJETO: lbpfwbnhkyhgaeflzuno
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  cpf TEXT,
  role TEXT NOT NULL DEFAULT 'passageiro' CHECK (role IN ('passageiro', 'motorista', 'admin', 'superadmin')),
  avatar_url TEXT,
  ponto_embarque_padrao_id UUID,
  cidade_origem_padrao TEXT,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.linhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origem TEXT NOT NULL,
  origem_sigla TEXT,
  origem_lat DOUBLE PRECISION NOT NULL,
  origem_lng DOUBLE PRECISION NOT NULL,
  destino TEXT NOT NULL,
  destino_sigla TEXT,
  destino_lat DOUBLE PRECISION NOT NULL,
  destino_lng DOUBLE PRECISION NOT NULL,
  distancia_km NUMERIC(6,2) NOT NULL,
  duracao_base_minutos INTEGER NOT NULL,
  valor_passagem NUMERIC(10,2) NOT NULL,
  tipo_van_padrao TEXT DEFAULT 'Mercedes Sprinter VIP Executiva',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pontos_embarque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linha_id UUID REFERENCES public.linhas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cidade TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('trevo_rodoviario', 'posto_combustivel', 'terminal_rodoviario', 'praca_central', 'ponto_urbano_vip')),
  tipo_rotulo TEXT NOT NULL,
  referencia TEXT NOT NULL,
  endereco_completo TEXT,
  comodidades TEXT[] DEFAULT ARRAY['🛋️ Abrigo Coberto', '🛡️ Iluminação 24h'],
  minutos_apos_saida INTEGER NOT NULL DEFAULT 0,
  distancia_km_estimada NUMERIC(6,2) DEFAULT 0,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  foto_url TEXT,
  observacao_operacional TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  placa TEXT NOT NULL UNIQUE,
  modelo TEXT NOT NULL,
  ano INTEGER,
  capacidade_vagas INTEGER NOT NULL DEFAULT 16,
  starlink_wifi_ssid TEXT DEFAULT 'UniVans_Starlink_VIP',
  status_aprovacao TEXT NOT NULL DEFAULT 'pendente' CHECK (status_aprovacao IN ('pendente', 'aprovado', 'rejeitado', 'bloqueado')),
  crlv_foto_url TEXT,
  cnh_foto_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.viagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linha_id UUID NOT NULL REFERENCES public.linhas(id) ON DELETE RESTRICT,
  motorista_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
  data_viagem DATE NOT NULL DEFAULT CURRENT_DATE,
  horario_saida TIME NOT NULL,
  horario_chegada_previsto TIME NOT NULL,
  vagas_totais INTEGER NOT NULL DEFAULT 16,
  vagas_ocupadas INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada', 'embarque_imediato', 'em_transito', 'concluida', 'cancelada')),
  posicao_lat_atual DOUBLE PRECISION,
  posicao_lng_atual DOUBLE PRECISION,
  ultimo_ponto_passado_id UUID REFERENCES public.pontos_embarque(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.passagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_bilhete TEXT NOT NULL UNIQUE,
  viagem_id UUID NOT NULL REFERENCES public.viagens(id) ON DELETE RESTRICT,
  passageiro_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ponto_embarque_id UUID REFERENCES public.pontos_embarque(id) ON DELETE SET NULL,
  passageiro_nome TEXT NOT NULL,
  passageiro_whatsapp TEXT NOT NULL,
  passageiro_cpf TEXT NOT NULL,
  quantidade_passagens INTEGER NOT NULL DEFAULT 1,
  valor_total NUMERIC(10,2) NOT NULL,
  forma_pagamento TEXT NOT NULL DEFAULT 'PIX' CHECK (forma_pagamento IN ('PIX', 'CARTAO')),
  status_pagamento TEXT NOT NULL DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'pago', 'expirado', 'cancelado')),
  status_embarque TEXT NOT NULL DEFAULT 'aguardando' CHECK (status_embarque IN ('aguardando', 'embarcado', 'ausente')),
  pix_txid TEXT,
  pix_copia_cola TEXT,
  pix_expira_em TIMESTAMPTZ NOT NULL,
  codigo_qr TEXT NOT NULL,
  embarcado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fechamento_caixa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  viagem_id UUID REFERENCES public.viagens(id) ON DELETE SET NULL,
  data_referencia DATE NOT NULL DEFAULT CURRENT_DATE,
  total_bruto NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  taxa_cooperativa_pct NUMERIC(4,2) NOT NULL DEFAULT 8.00,
  valor_cooperativa NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  valor_liquido_motorista NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado', 'pago_ao_motorista')),
  fechado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  imagem_url TEXT NOT NULL,
  link_destino TEXT,
  tag TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pontos_embarque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fechamento_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura publica de linhas" ON public.linhas FOR SELECT USING (true);
CREATE POLICY "Leitura publica de pontos de embarque" ON public.pontos_embarque FOR SELECT USING (true);
CREATE POLICY "Leitura publica de viagens" ON public.viagens FOR SELECT USING (true);
CREATE POLICY "Leitura publica de banners" ON public.banners FOR SELECT USING (true);

CREATE POLICY "Usuario ve seu perfil" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Usuario atualiza seu perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Usuario insere seu perfil" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Passageiro ve suas passagens" ON public.passagens FOR SELECT USING (auth.uid() = passageiro_id);
CREATE POLICY "Passageiro cria suas passagens" ON public.passagens FOR INSERT WITH CHECK (auth.uid() = passageiro_id);

CREATE POLICY "Motorista gerencia seu veiculo" ON public.veiculos FOR ALL USING (auth.uid() = motorista_id);
CREATE POLICY "Motorista ve seu caixa" ON public.fechamento_caixa FOR SELECT USING (auth.uid() = motorista_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Usuário UniVans'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'passageiro'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.linhas (id, origem, origem_sigla, origem_lat, origem_lng, destino, destino_sigla, destino_lat, destino_lng, distancia_km, duracao_base_minutos, valor_passagem, tipo_van_padrao, ativo)
VALUES 
('a0000000-0000-0000-0000-000000000001', 'Igreja Nova (Terminal Central)', 'IGN', -10.1279, -36.6565, 'Maceió (Rodoviária do Feitosa)', 'MCZ', -9.6459, -35.7255, 172.00, 168, 38.00, 'Mercedes Sprinter VIP Executiva', true),
('a0000000-0000-0000-0000-000000000002', 'Maceió (Terminal do Tabuleiro)', 'MCZ', -9.6459, -35.7255, 'Arapiraca (Terminal Rodoviário)', 'ARA', -9.7517, -36.6603, 134.00, 125, 35.00, 'Renault Master Executiva', true),
('a0000000-0000-0000-0000-000000000003', 'Tapera', 'TPR', -9.6200, -36.8000, 'Toritama (Moda Center)', 'TOR', -8.0069, -36.0569, 210.00, 210, 60.00, 'Mercedes Sprinter Polo Têxtil', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.pontos_embarque (id, linha_id, nome, cidade, tipo, tipo_rotulo, referencia, endereco_completo, comodidades, minutos_apos_saida, distancia_km_estimada, foto_url, ativo, ordem)
VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Terminal Central de Igreja Nova', 'Igreja Nova', 'terminal_rodoviario', 'Terminal Rodoviário Oficial', 'Praça Agapito Soares', 'Praça Agapito Soares, Centro, Igreja Nova - AL', ARRAY['🛋️ Abrigo Coberto', '🚻 Banheiro', '☕ Lanchonete'], 0, 0.0, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=300&auto=format&fit=crop&q=80', true, 1),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Penedo • Trevo da Rodoviária', 'Penedo', 'trevo_rodoviario', 'Trevo Rodoviário Estratégico', 'Próximo à Rodovia AL-110', 'AL-110, Entrada de Penedo - AL', ARRAY['🛋️ Abrigo Coberto', '🛡️ Iluminação 24h'], 25, 25.0, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=300&auto=format&fit=crop&q=80', true, 2),
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Coruripe • Praça Central', 'Coruripe', 'praca_central', 'Praça Central Urbana', 'AL-349 • Centro de Coruripe', 'Av. Central, Coruripe - AL', ARRAY['🛋️ Abrigo Coberto', '☕ Café & Lanchonete', '🛰️ Wi-Fi'], 75, 78.0, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=300&auto=format&fit=crop&q=80', true, 3),
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Barra de São Miguel • Trevo Posto Shell', 'Barra de São Miguel', 'posto_combustivel', 'Posto com Apoio & Lanchonete', 'Trevo de entrada AL-101 Sul • Posto Shell', 'Rodovia AL-101 Sul, Trevo da Barra - AL', ARRAY['🛋️ Abrigo Coberto', '⛽ Posto de Gasolina', '🚻 Banheiro', '☕ Lanchonete 24h'], 120, 130.0, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=300&auto=format&fit=crop&q=80', true, 4),
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Marechal Deodoro • Trevo da Praia do Francês', 'Marechal Deodoro', 'trevo_rodoviario', 'Trevo Rodoviário Estratégico', 'Posto Shell do Trevo do Francês', 'AL-101 Sul, Trevo da Praia do Francês - AL', ARRAY['🛋️ Abrigo Coberto', '🛡️ Segurança 24h', '⛽ Posto'], 135, 148.0, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=300&auto=format&fit=crop&q=80', true, 5),
('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Maceió • Trevo do Tabuleiro', 'Maceió', 'trevo_rodoviario', 'Trevo Rodoviário Estratégico', 'Av. Fernandes Lima (Antigo Makro / Passarela)', 'Av. Fernandes Lima, Tabuleiro do Martins, Maceió - AL', ARRAY['🛋️ Abrigo Coberto', '🛡️ Iluminação 24h', '🛰️ Wi-Fi'], 155, 165.0, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=300&auto=format&fit=crop&q=80', true, 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.banners (id, titulo, subtitulo, imagem_url, link_destino, tag, ativo, ordem)
VALUES
('c0000000-0000-0000-0000-000000000001', 'Vans Executivas com Wi-Fi Starlink', 'Conexão ultra rápida de 150 Mbps durante toda a sua viagem', '/banners/banner-univans-starlink-conforto.jpg', '/app/linhas', 'Exclusivo', true, 1),
('c0000000-0000-0000-0000-000000000002', 'Viagens para o Polo Têxtil de Toritama', 'Compras e turismo com saída diária e bagageiro amplo', '/banners/banner-univans-compras-turismo.jpg', '/app/linhas', 'Turismo & Compras', true, 2),
('c0000000-0000-0000-0000-000000000003', 'Embarque Seguro nos Trevos Oficiais', 'Acompanhe a chegada da sua van no mapa em tempo real', '/banners/banner-univans-starlink-embarque.jpg', '/app/viagem', 'Segurança', true, 3)
ON CONFLICT (id) DO NOTHING;
