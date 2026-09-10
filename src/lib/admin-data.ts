export type VanAtiva = {
  id: string;
  placa: string;
  motorista: string;
  fotoMotorista: string;
  rota: string;
  velocidade: number;
  telemetria: "online" | "instavel" | "offline";
  x: number;
  y: number;
  corPin: "verde" | "amarelo" | "escuro";
  modelo: string;
};

export type Alerta = {
  id: string;
  titulo: string;
  detalhe: string;
  prioridade: "critico" | "atencao" | "info";
  quando: string;
  categoria: "manutencao" | "trafego" | "atraso";
};

export type Despesa = {
  id: string;
  descricao: string;
  subcategoria: string;
  categoria:
    | "Combustível"
    | "Manutenção Preventiva"
    | "Manutenção Carta"
    | "Manutenção Corretiva"
    | "Pedágio";
  valor: number;
  data: string;
  conciliado: boolean;
};

export type RotaHistorico = {
  id: string;
  nome: string;
  modalidade: "Rotas Escolares" | "Shuttles de Empresa" | "Intermunicipal";
  trajeto: string;
  data: string;
  paradas: number;
  inicio: string;
  fim: string;
  tipoRegistro: "Rota corrida" | "Rota observada";
  status: "Concluído" | "Agendado";
};

export type Motorista = {
  id: string;
  nome: string;
  iniciais: string;
  fotoUrl: string;
  rating: number;
  etaMin: number;
  veiculo: string;
  fotoVeiculo: string;
  favorito: boolean;
  telefone: string;
};

export const vansAtivas: VanAtiva[] = [
  {
    id: "va1",
    placa: "MOB-8K99",
    motorista: "Carlos Eduardo Silva",
    fotoMotorista:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    rota: "Centro ➔ Shopping (Partiu Pop)",
    velocidade: 48,
    telemetria: "online",
    x: 28,
    y: 35,
    corPin: "verde",
    modelo: "Chevrolet Onix Plus 2024 (Prata)",
  },
  {
    id: "va2",
    placa: "MOT-7799",
    motorista: "Lucas Fernandes",
    fotoMotorista:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    rota: "Vinhosa ➔ Centro (Partiu Moto)",
    velocidade: 38,
    telemetria: "online",
    x: 52,
    y: 48,
    corPin: "verde",
    modelo: "Honda CG 160 Titan (Preta)",
  },
  {
    id: "va3",
    placa: "PRT-9900",
    motorista: "Roberto Fonseca",
    fotoMotorista:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    rota: "Aeroporto ➔ Zona Sul (Partiu Plus)",
    velocidade: 62,
    telemetria: "online",
    x: 72,
    y: 22,
    corPin: "escuro",
    modelo: "Toyota Corolla XEi 2024 (Preto)",
  },
  {
    id: "va4",
    placa: "FLS-3321",
    motorista: "Marcos Vinicius",
    fotoMotorista:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    rota: "Zona Norte ➔ Polo Comercial (Partiu Flash)",
    velocidade: 32,
    telemetria: "online",
    x: 38,
    y: 68,
    corPin: "amarelo",
    modelo: "Yamaha Fazer 250 (Vermelha)",
  },
];

export const alertas: Alerta[] = [
  {
    id: "a1",
    titulo: "Manutenção alerts",
    detalhe: "Manutenção agendada",
    prioridade: "atencao",
    quando: "há 10 min",
    categoria: "manutencao",
  },
  {
    id: "a2",
    titulo: "Atrasos e tráfego intenso",
    detalhe: "Rota 2 com atrasos",
    prioridade: "critico",
    quando: "há 4 min",
    categoria: "trafego",
  },
  {
    id: "a3",
    titulo: "Inspeção semestral pendente",
    detalhe: "Van MTQ-9J07 vence em 5 dias",
    prioridade: "info",
    quando: "há 2 h",
    categoria: "manutencao",
  },
];

export const despesas: Despesa[] = [
  {
    id: "d1",
    descricao: "Combustivel",
    subcategoria: "Manutenção Preventiva",
    categoria: "Combustível",
    valor: 480.5,
    data: "Hoje, 14:20",
    conciliado: true,
  },
  {
    id: "d2",
    descricao: "Combustivel",
    subcategoria: "Manutenção Carta",
    categoria: "Combustível",
    valor: 320.0,
    data: "Ontem, 09:15",
    conciliado: true,
  },
  {
    id: "d3",
    descricao: "Troca de Pastilhas e Fluido",
    subcategoria: "Manutenção Preventiva",
    categoria: "Manutenção Preventiva",
    valor: 750.0,
    data: "26 ago",
    conciliado: true,
  },
  {
    id: "d4",
    descricao: "Reparo Injeção Eletrônica",
    subcategoria: "Manutenção Corretiva",
    categoria: "Manutenção Corretiva",
    valor: 1890.9,
    data: "22 ago",
    conciliado: false,
  },
];

export const rotasHistorico: RotaHistorico[] = [
  {
    id: "rh1",
    nome: "Linha Maceió ➔ Arapiraca",
    modalidade: "Intermunicipal",
    trajeto: "Terminal Rodoviário Maceió → Terminal Central Arapiraca",
    data: "Hoje",
    paradas: 6,
    inicio: "06:30",
    fim: "08:45",
    tipoRegistro: "Rota corrida",
    status: "Concluído",
  },
  {
    id: "rh2",
    nome: "Shuttle Moda Center Toritama",
    modalidade: "Intermunicipal",
    trajeto: "São José da Tapera → Polo das Confecções Toritama",
    data: "Hoje",
    paradas: 5,
    inicio: "04:30",
    fim: "08:40",
    tipoRegistro: "Rota observada",
    status: "Concluído",
  },
  {
    id: "rh3",
    nome: "Linha Baixo São Francisco",
    modalidade: "Intermunicipal",
    trajeto: "Igreja Nova (Centro) → Maceió (Feitosa)",
    data: "Ontem",
    paradas: 7,
    inicio: "14:30",
    fim: "17:18",
    tipoRegistro: "Rota observada",
    status: "Concluído",
  },
  {
    id: "rh4",
    nome: "Rota Feira da Sulanca Caruaru",
    modalidade: "Intermunicipal",
    trajeto: "Maceió (Ponta Verde) → Caruaru (Polo da Moda)",
    data: "Ontem",
    paradas: 4,
    inicio: "05:00",
    fim: "08:10",
    tipoRegistro: "Rota corrida",
    status: "Concluído",
  },
];

export const motoristas: Motorista[] = [
  {
    id: "m1",
    nome: "Carlos Eduardo Santos",
    iniciais: "CS",
    fotoUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    rating: 4.95,
    etaMin: 3,
    veiculo: "Sprinter 516 CDI Executive",
    fotoVeiculo:
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=200&auto=format&fit=crop&q=80",
    favorito: true,
    telefone: "+5582998412940",
  },
  {
    id: "m2",
    nome: "Fernando Costa",
    iniciais: "FC",
    fotoUrl:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80",
    rating: 4.92,
    etaMin: 6,
    veiculo: "Renault Master Executive L3H2",
    fotoVeiculo:
      "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=200&auto=format&fit=crop&q=80",
    favorito: false,
    telefone: "+5582996114020",
  },
  {
    id: "m3",
    nome: "Antônio Marcos Ferreira",
    iniciais: "AF",
    fotoUrl:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    rating: 4.88,
    etaMin: 3,
    veiculo: "Sprinter 416 CDI Turismo",
    fotoVeiculo:
      "https://images.unsplash.com/photo-1559297434-fae8a1916a79?w=200&auto=format&fit=crop&q=80",
    favorito: true,
    telefone: "+5582997031288",
  },
  {
    id: "m4",
    nome: "Severino José de Lima",
    iniciais: "SL",
    fotoUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    rating: 4.91,
    etaMin: 7,
    veiculo: "Fiat Ducato Maxi Minibus",
    fotoVeiculo:
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=200&auto=format&fit=crop&q=80",
    favorito: false,
    telefone: "+5582996124411",
  },
  {
    id: "m5",
    nome: "Clara Albuquerque Lima",
    iniciais: "CL",
    fotoUrl:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    rating: 4.97,
    etaMin: 2,
    veiculo: "Mercedes-Benz Sprinter 416 VIP",
    fotoVeiculo:
      "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=200&auto=format&fit=crop&q=80",
    favorito: true,
    telefone: "+5582998415522",
  },
];

export type ItemConforto =
  "ar_condicionado" | "wifi_starlink" | "tomada_usb" | "acessibilidade_pcd" | "bagageiro";

export type HorarioSaidaVan = {
  id: string;
  linhaId: string;
  origem: string;
  destino: string;
  pontoEmbarquePrincipal: string;
  pontoDesembarquePrincipal: string;
  horarioSaida: string;
  previsaoChegada: string;
  duracaoEstimada: string;
  preco: number;
  motoristaNome: string;
  motoristaFoto: string;
  motoristaTelefone: string;
  motoristaRating: number;
  veiculoModelo: string;
  veiculoPlaca: string;
  VagasTotais: number;
  VagasDisponiveis: number;
  status: "embarque_iniciado" | "saindo_em_breve" | "confirmado" | "lotado" | "em_transito";
  conforto: ItemConforto[];
  paradasIntermediarias: string[];
};

export type SolicitacaoMotorista = {
  id: string;
  nomeCompleto: string;
  cpf: string;
  whatsapp: string;
  email: string;
  cnhNumero: string;
  cnhCategoria: string;
  possuiEAR: boolean;
  veiculoMarcaModelo: string;
  veiculoAno: string;
  veiculoPlaca: string;
  veiculoCapacidade: number;
  orgaoRegulador: string; // Ex: ARSAL, DETRO, ANTT, EMTU
  numeroAutorizacao: string;
  linhaOrigem: string;
  linhaDestino: string;
  diasOperacao: string[];
  horariosSaida: string[];
  chavePix: string;
  tipoChavePix: "cpf" | "celular" | "email" | "aleatoria";
  status: "pendente" | "aprovado" | "rejeitado";
  dataSolicitacao: string;
  conforto: ItemConforto[];
};

export type VagaVan = {
  numero: number;
  status: "livre" | "ocupado" | "reservado";
  passageiroNome?: string | undefined;
  passageiroTelefone?: string | undefined;
  pontoEmbarque?: string | undefined;
};

export type EncomendaVan = {
  id: string;
  codigoRastreio: string;
  pinEntrega: string; // PIN de segurança de 4 dígitos para confirmação na entrega (Estilo 99)
  remetenteNome: string;
  remetenteTelefone: string;
  destinatarioNome: string;
  destinatarioTelefone: string;
  origem: string;
  destino: string;
  tipo: "envelope" | "pacote_pequeno" | "caixa_media" | "caixa_grande";
  descricao: string;
  valorFrete: number;
  status: "aguardando_coleta" | "em_transito" | "entregue_no_terminal" | "a_caminho" | "entregue";
  dataEnvio: string;
  dataEntrega?: string | undefined;
  entreguePor?: string | undefined;
  motoristaNome?: string | undefined;
  vanPlaca?: string | undefined;
};

export type EncomendaFlash = EncomendaVan;

export type DemandaRota = {
  id: string;
  origem: string;
  destino: string;
  horarioDesejado: string;
  diasSemana: string;
  apoiadoresQtd: number;
  metaApoiadores: number;
  status: "em_votacao" | "em_analise_cooperativa" | "em_analise_operacional" | "rota_criada";
  dataCriacao: string;
};

export type AlertaSOS = {
  id: string;
  tipo: "seguranca" | "pane_mecanica" | "emergencia_medica" | "acidente_rodovia";
  solicitanteNome: string;
  solicitanteTelefone: string;
  vanPlaca: string;
  motoristaNome: string;
  rodovia: string;
  coordenadas: string;
  status: "ativo" | "em_atendimento" | "resolvido";
  dataHora: string;
  descricao?: string | undefined;
};

export type LocalAtendido = {
  id: string;
  nome: string;
  estado: string;
  tipo: "terminal_rodoviario" | "posto_apoio" | "trevo_acesso" | "centro_urbano";
  endereco: string;
  ativo: boolean;
  latitude: number;
  longitude: number;
};

export const encomendasMock: EncomendaVan[] = [
  {
    id: "enc-1",
    codigoRastreio: "UV-8942-AL",
    pinEntrega: "4819",
    remetenteNome: "Auto Peças Nordeste",
    remetenteTelefone: "+5582998412940",
    destinatarioNome: "Oficina do Beto",
    destinatarioTelefone: "+5582996114020",
    origem: "Maceió (Trevo Tabuleiro)",
    destino: "Arapiraca (Centro)",
    tipo: "caixa_media",
    descricao: "Peças automotivas e correia dentada (8kg)",
    valorFrete: 35.0,
    status: "em_transito",
    dataEnvio: "Hoje, 08:30",
    motoristaNome: "Carlos Eduardo Santos",
    vanPlaca: "RJP-2F14",
  },
  {
    id: "enc-2",
    codigoRastreio: "UV-3319-PE",
    pinEntrega: "7320",
    remetenteNome: "Confecções Sulanca Tapera",
    remetenteTelefone: "+5582997031288",
    destinatarioNome: "Boutique Moda Toritama",
    destinatarioTelefone: "+5581992223344",
    origem: "São José da Tapera",
    destino: "Toritama (Moda Center)",
    tipo: "caixa_grande",
    descricao: "Fardos de jeans e bermudas atacado (18kg)",
    valorFrete: 50.0,
    status: "em_transito",
    dataEnvio: "Hoje, 05:15",
    motoristaNome: "Severino José de Lima",
    vanPlaca: "PXD-1B08",
  },
];

/**
 * 📦 GERENCIAMENTO DE ENCOMENDAS EXPRESS COM PIN SEGURO
 */
export function getEncomendasStore(): EncomendaVan[] {
  if (typeof window === "undefined") return encomendasMock;
  try {
    const raw = localStorage.getItem("partiu_encomendas_store") || localStorage.getItem("univans_encomendas_store");
    if (!raw) {
      localStorage.setItem("partiu_encomendas_store", JSON.stringify(encomendasMock));
      return encomendasMock;
    }
    return JSON.parse(raw);
  } catch {
    return encomendasMock;
  }
}

export function salvarNovaEncomendaStore(nova: EncomendaVan): EncomendaVan[] {
  if (typeof window === "undefined") return [nova, ...encomendasMock];
  try {
    const atuais = getEncomendasStore();
    const atualizadas = [nova, ...atuais];
    localStorage.setItem("partiu_encomendas_store", JSON.stringify(atualizadas));
    return atualizadas;
  } catch {
    return [nova, ...encomendasMock];
  }
}

export function validarPinEntregaEncomenda(
  encomendaId: string,
  pinDigitado: string,
  motoristaNome = "Carlos Eduardo Santos",
): { sucesso: boolean; mensagem: string; encomenda?: EncomendaVan } {
  if (typeof window === "undefined") {
    return { sucesso: false, mensagem: "Ambiente inválido" };
  }

  try {
    const atuais = getEncomendasStore();
    const enc = atuais.find((e) => e.id === encomendaId || e.codigoRastreio === encomendaId);

    if (!enc) {
      return { sucesso: false, mensagem: "Encomenda não encontrada no manifesto." };
    }

    if (enc.status === "entregue_no_terminal") {
      return {
        sucesso: false,
        mensagem: "Esta encomenda já foi entregue e finalizada anteriormente.",
      };
    }

    if (enc.pinEntrega.trim() !== pinDigitado.trim()) {
      return {
        sucesso: false,
        mensagem:
          "PIN INCORRETO! O destinatário deve apresentar o código de 4 dígitos gerado no envio.",
      };
    }

    const agora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const atualizadas = atuais.map((item) => {
      if (item.id === enc.id) {
        return {
          ...item,
          status: "entregue_no_terminal" as const,
          dataEntrega: `Hoje, às ${agora}`,
          entreguePor: motoristaNome,
        };
      }
      return item;
    });

    localStorage.setItem("partiu_encomendas_store", JSON.stringify(atualizadas));
    const final = atualizadas.find((e) => e.id === enc.id);

    return {
      sucesso: true,
      mensagem: "Entrega confirmada com sucesso mediante PIN validado!",
      ...(final ? { encomenda: final } : {}),
    };
  } catch {
    return { sucesso: false, mensagem: "Erro ao processar baixa da encomenda." };
  }
}

export const demandasRotasMock: DemandaRota[] = [
  {
    id: "dem-1",
    origem: "Maceió",
    destino: "Penedo",
    horarioDesejado: "06:00 e 17:30",
    diasSemana: "Segunda a Sexta",
    apoiadoresQtd: 48,
    metaApoiadores: 50,
    status: "em_votacao",
    dataCriacao: "Há 2 dias",
  },
  {
    id: "dem-2",
    origem: "Arapiraca",
    destino: "Delmiro Gouveia (Sertão)",
    horarioDesejado: "06:30 e 16:00 (Universitário)",
    diasSemana: "Segunda a Sexta",
    apoiadoresQtd: 62,
    metaApoiadores: 50,
    status: "em_analise_cooperativa",
    dataCriacao: "Há 4 dias",
  },
  {
    id: "dem-3",
    origem: "Igreja Nova",
    destino: "Arapiraca (Feira Livre)",
    horarioDesejado: "05:30",
    diasSemana: "Segunda e Quinta",
    apoiadoresQtd: 34,
    metaApoiadores: 50,
    status: "em_votacao",
    dataCriacao: "Ontem",
  },
];

export const alertasSOSMock: AlertaSOS[] = [
  {
    id: "sos-1",
    tipo: "pane_mecanica",
    solicitanteNome: "Carlos Eduardo Santos (Motorista)",
    solicitanteTelefone: "+5582998412940",
    vanPlaca: "RJP-2F14",
    motoristaNome: "Carlos Eduardo Santos",
    rodovia: "AL-101 Sul · Km 88 (Trevo de São Miguel dos Campos)",
    coordenadas: "-9.7745, -36.1420",
    status: "em_atendimento",
    dataHora: "Hoje, 09:12",
    descricao:
      "Pneu traseiro furado com 12 passageiros a bordo. Van no acostamento seguro aguardando apoio do borracheiro conveniado.",
  },
];

export const locaisAtendidosMock: LocalAtendido[] = [
  {
    id: "loc-1",
    nome: "Maceió (Terminal Rodoviário João Paulo II)",
    estado: "AL",
    tipo: "terminal_rodoviario",
    endereco: "Av. Leste-Oeste, Feitosa, Maceió - AL",
    ativo: true,
    latitude: -9.62,
    longitude: -35.73,
  },
  {
    id: "loc-2",
    nome: "Arapiraca (Terminal Rodoviário Urbano)",
    estado: "AL",
    tipo: "terminal_rodoviario",
    endereco: "R. São José, Centro, Arapiraca - AL",
    ativo: true,
    latitude: -9.75,
    longitude: -36.66,
  },
  {
    id: "loc-3",
    nome: "Penedo (Terminal Rodoviário & Histórico)",
    estado: "AL",
    tipo: "terminal_rodoviario",
    endereco: "Av. Beira Rio, Centro Histórico, Penedo - AL",
    ativo: true,
    latitude: -10.29,
    longitude: -36.58,
  },
  {
    id: "loc-4",
    nome: "Toritama (Polo das Confecções Moda Center)",
    estado: "PE",
    tipo: "centro_urbano",
    endereco: "BR-104, Km 32, Toritama - PE",
    ativo: true,
    latitude: -8.006,
    longitude: -36.056,
  },
  {
    id: "loc-5",
    nome: "Maragogi (Ponto Turístico / Orla Central)",
    estado: "AL",
    tipo: "centro_urbano",
    endereco: "Av. Senador Rui Palmeira, Centro, Maragogi - AL",
    ativo: true,
    latitude: -9.012,
    longitude: -35.22,
  },
  {
    id: "loc-6",
    nome: "Igreja Nova (Terminal Central Praça Agapito)",
    estado: "AL",
    tipo: "terminal_rodoviario",
    endereco: "Praça Agapito Soares, Centro, Igreja Nova - AL",
    ativo: true,
    latitude: -10.127,
    longitude: -36.656,
  },
];

export const linhasEHorarios: HorarioSaidaVan[] = [
  {
    id: "h1",
    linhaId: "l1",
    origem: "Maceió",
    destino: "Arapiraca",
    pontoEmbarquePrincipal: "Terminal Rodoviário João Paulo II (Feitosa)",
    pontoDesembarquePrincipal: "Terminal Rodoviário de Arapiraca",
    horarioSaida: "06:30",
    previsaoChegada: "08:15",
    duracaoEstimada: "1h 45m",
    preco: 35.0,
    motoristaNome: "Carlos Eduardo Santos",
    motoristaFoto:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    motoristaTelefone: "+5582998412940",
    motoristaRating: 4.95,
    veiculoModelo: "Mercedes-Benz Sprinter 516 VIP",
    veiculoPlaca: "RJP-2F14",
    VagasTotais: 16,
    VagasDisponiveis: 4,
    status: "embarque_iniciado",
    conforto: ["ar_condicionado", "wifi_starlink", "tomada_usb", "bagageiro"],
    paradasIntermediarias: ["Trevo Tabuleiro", "Pilar", "São Miguel dos Campos", "Junqueiro"],
  },
  {
    id: "h2",
    linhaId: "l1",
    origem: "Maceió",
    destino: "Arapiraca",
    pontoEmbarquePrincipal: "Trevo do Tabuleiro • Antigo Makro",
    pontoDesembarquePrincipal: "Centro — Praça Marques de Paranaguá",
    horarioSaida: "08:00",
    previsaoChegada: "09:40",
    duracaoEstimada: "1h 40m",
    preco: 35.0,
    motoristaNome: "Fernando Costa",
    motoristaFoto:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    motoristaTelefone: "+5582996114020",
    motoristaRating: 4.92,
    veiculoModelo: "Renault Master Executive L3H2",
    veiculoPlaca: "LVK-7C22",
    VagasTotais: 16,
    VagasDisponiveis: 7,
    status: "saindo_em_breve",
    conforto: ["ar_condicionado", "wifi_starlink", "bagageiro"],
    paradasIntermediarias: ["Atalaia", "Palmeira dos Índios"],
  },
  {
    id: "h3",
    linhaId: "l2",
    origem: "Igreja Nova",
    destino: "Maceió",
    pontoEmbarquePrincipal: "Terminal Central de Igreja Nova (Praça Agapito)",
    pontoDesembarquePrincipal: "Maceió (Rodoviária do Feitosa)",
    horarioSaida: "05:30",
    previsaoChegada: "08:18",
    duracaoEstimada: "2h 48m",
    preco: 38.0,
    motoristaNome: "Clara Albuquerque Lima",
    motoristaFoto:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    motoristaTelefone: "+5582998415522",
    motoristaRating: 4.97,
    veiculoModelo: "Sprinter 416 VIP",
    veiculoPlaca: "MTQ-9J07",
    VagasTotais: 18,
    VagasDisponiveis: 3,
    status: "saindo_em_breve",
    conforto: ["ar_condicionado", "wifi_starlink", "tomada_usb", "acessibilidade_pcd", "bagageiro"],
    paradasIntermediarias: ["Penedo", "Coruripe", "Barra de São Miguel", "Trevo do Francês"],
  },
  {
    id: "h4",
    linhaId: "l3",
    origem: "Maceió",
    destino: "Maragogi",
    pontoEmbarquePrincipal: "Orla Pajuçara / Rodoviária Feitosa",
    pontoDesembarquePrincipal: "Centro Turístico Maragogi (Orla)",
    horarioSaida: "11:30",
    previsaoChegada: "13:30",
    duracaoEstimada: "2h 00m",
    preco: 45.0,
    motoristaNome: "Severino José de Lima",
    motoristaFoto:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    motoristaTelefone: "+5582996124411",
    motoristaRating: 4.91,
    veiculoModelo: "Mercedes Minibus 515 VIP",
    veiculoPlaca: "PXD-1B08",
    VagasTotais: 20,
    VagasDisponiveis: 11,
    status: "confirmado",
    conforto: ["ar_condicionado", "wifi_starlink", "tomada_usb", "bagageiro"],
    paradasIntermediarias: ["Paripueira", "Barra de Santo Antônio", "Porto Calvo"],
  },
];

export const solicitacoesMotoristasPendentes: SolicitacaoMotorista[] = [
  {
    id: "sol-1",
    nomeCompleto: "Marcos Aurelio Silveira",
    cpf: "123.456.789-00",
    whatsapp: "+5582991234567",
    email: "marcos.van@gmail.com",
    cnhNumero: "04987654321",
    cnhCategoria: "D (Com EAR)",
    possuiEAR: true,
    veiculoMarcaModelo: "Mercedes-Benz Sprinter 415 CDI",
    veiculoAno: "2024",
    veiculoPlaca: "BRA-4E29",
    veiculoCapacidade: 16,
    orgaoRegulador: "ARSAL (Alagoas)",
    numeroAutorizacao: "ARSAL-2026/8942",
    linhaOrigem: "Maceió",
    linhaDestino: "Palmeira dos Índios",
    diasOperacao: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"],
    horariosSaida: ["06:00", "10:30", "15:00"],
    chavePix: "12345678900",
    tipoChavePix: "cpf",
    status: "pendente",
    dataSolicitacao: "Hoje, 11:45",
    conforto: ["ar_condicionado", "wifi_starlink", "tomada_usb", "bagageiro"],
  },
  {
    id: "sol-2",
    nomeCompleto: "Regina Coeli Barreto",
    cpf: "321.654.987-11",
    whatsapp: "+5582998765432",
    email: "regina.transporte@hotmail.com",
    cnhNumero: "08765432109",
    cnhCategoria: "D (Com EAR)",
    possuiEAR: true,
    veiculoMarcaModelo: "Fiat Ducato Maxi Minibus",
    veiculoAno: "2025",
    veiculoPlaca: "QLD-9A12",
    veiculoCapacidade: 18,
    orgaoRegulador: "ARSAL (Alagoas)",
    numeroAutorizacao: "ARSAL-AL/2026-441",
    linhaOrigem: "Arapiraca",
    linhaDestino: "Maceió (Via Trevo do Tabuleiro)",
    diasOperacao: ["Segunda", "Quarta", "Sexta", "Domingo"],
    horariosSaida: ["05:30", "14:00"],
    chavePix: "regina.transporte@hotmail.com",
    tipoChavePix: "email",
    status: "pendente",
    dataSolicitacao: "Ontem, 16:20",
    conforto: ["ar_condicionado", "acessibilidade_pcd", "wifi_starlink", "bagageiro"],
  },
];

export const VagasMockVan: VagaVan[] = [
  {
    numero: 1,
    status: "ocupado",
    passageiroNome: "Lucas Andrade",
    passageiroTelefone: "+5582988112233",
    pontoEmbarque: "Rodoviária Central",
  },
  {
    numero: 2,
    status: "ocupado",
    passageiroNome: "Maria Eduarda",
    passageiroTelefone: "+5582988223344",
    pontoEmbarque: "Rodoviária Central",
  },
  {
    numero: 3,
    status: "reservado",
    passageiroNome: "Carlos Alberto",
    passageiroTelefone: "+5582988334455",
    pontoEmbarque: "Posto Shell Tabuleiro",
  },
  { numero: 4, status: "livre" },
  {
    numero: 5,
    status: "ocupado",
    passageiroNome: "Juliana Santos",
    passageiroTelefone: "+5582988445566",
    pontoEmbarque: "Trevo Rio Largo",
  },
  { numero: 6, status: "livre" },
  {
    numero: 7,
    status: "ocupado",
    passageiroNome: "Pedro Henrique",
    passageiroTelefone: "+5582988556677",
    pontoEmbarque: "Rodoviária Central",
  },
  {
    numero: 8,
    status: "reservado",
    passageiroNome: "Fernanda Lima",
    passageiroTelefone: "+5582988667788",
    pontoEmbarque: "Entrada São Miguel",
  },
  { numero: 9, status: "livre" },
  { numero: 10, status: "livre" },
  {
    numero: 11,
    status: "ocupado",
    passageiroNome: "Rodrigo Costa",
    passageiroTelefone: "+5582988778899",
    pontoEmbarque: "Rodoviária Central",
  },
  { numero: 12, status: "livre" },
  {
    numero: 13,
    status: "ocupado",
    passageiroNome: "Camila Rocha",
    passageiroTelefone: "+5582988889900",
    pontoEmbarque: "Teotônio Vilela",
  },
  { numero: 14, status: "livre" },
  { numero: 15, status: "livre" },
  { numero: 16, status: "livre" },
];

export const paradasRota = [
  {
    id: "p1",
    nome: "Partida • Garagem Central",
    endereco: "Terminal Rodoviário de Maceió (Feitosa)",
    horario: "06:30",
    status: "concluido",
  },
  {
    id: "p2",
    nome: "Trevo do Tabuleiro (Makro)",
    endereco: "Av. Fernandes Lima • Trevo Tabuleiro",
    horario: "06:50",
    status: "concluido",
  },
  {
    id: "p3",
    nome: "São Miguel dos Campos (Posto Trevo)",
    endereco: "BR-101 Sul • Trevo de Acesso",
    horario: "07:35",
    status: "em_andamento",
  },
  {
    id: "p4",
    nome: "Terminal Central de Arapiraca",
    endereco: "Terminal Urbano de Integração — Destino Final",
    horario: "08:45",
    status: "pendente",
  },
];
