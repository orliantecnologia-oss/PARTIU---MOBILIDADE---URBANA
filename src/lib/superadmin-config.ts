export type ProvedorMapa = "openstreetmap" | "google_maps" | "mapbox" | "cartodb";
export type TipoDispositivoGPS = "starlink" | "rastreador_4g_barato" | "app_motorista";

export interface ConfigMapas {
  provedorAtivo: ProvedorMapa;
  googleMapsApiKey: string;
  googleMapsMapId?: string;
  mapboxAccessToken: string;
  mapboxStyleId: string;
  osmTileUrl: string;
  transitoAtivo: boolean;
  sateliteAtivo: boolean;
}

export interface ConfigPix {
  gateway: "mercadopago" | "asaas" | "efi" | "manual";
  chavePixManual: string;
  tipoChave: "cnpj" | "cpf" | "email" | "telefone" | "aleatoria";
  beneficiario: string;
  cidade: string;
  apiKey: string;
  sandbox: boolean;
}

export interface ConfigWhatsApp {
  provedor: "evolution" | "zapi" | "whatsapp_cloud";
  apiUrl: string;
  apiToken: string;
  instanciaNome: string;
  ativo: boolean;
  notificarCompraPix: boolean;
  notificarEmbarque: boolean;
}

export interface BannerApp {
  id: string;
  badge: string;
  titulo: string;
  subtitulo: string;
  extra: string;
  imagem: string;
  linkDestino: string;
  ordem: number;
  ativo: boolean;
}

export interface TelemetriaVeiculo {
  id: string;
  placa: string;
  modelo: string;
  motorista: string;
  telefoneMotorista: string;
  fotoMotorista: string;
  linhaOrigem: string;
  linhaDestino: string;
  tipoDispositivo: TipoDispositivoGPS;
  imeiDispositivo: string;
  lat: number;
  lng: number;
  velocidadeKmH: number;
  rumoGraus: number;
  status: "em_rota" | "parado" | "embarcando" | "socorro_sos" | "garagem";
  VagasOcupados: number;
  VagasTotal: number;
  arCondicionado: boolean;
  nivelCombustivel: number;
  tensaoBateriaVolts: number;
  temperaturaMotor: number;
  proximaParada: string;
  previsaoChegadaMin: number;
  distanciaRestanteKm: number;
  satelitesVisiveis?: number | undefined;
  latenciaMs?: number | undefined;
  ultimaAtualizacao: string;
}

export interface ConfigModulosEstrategicos {
  splitPixAutomatico: boolean;
  repasseMotoristaPercent: number;
  taxaCooperativaPercent: number;
  clubeVipPassAtivo: boolean;
  descontoVipPassPercent: number;
  whatsappSmartEtaAtivo: boolean;
  minutosAlertaProximidade: number;
  saquePixMotoristaAtivo: boolean;
  saqueMinimoReais: number;
  fretamentoB2BAtivo: boolean;
  descontoFretamentoCompletoPercent: number;
}

export interface ConfigTarifas {
  partiuPop: {
    tarifaBase: number;
    valorKm: number;
    valorMinuto: number;
    tarifaMinima: number;
    taxaCancelamento: number;
  };
  partiuMoto: {
    tarifaBase: number;
    valorKm: number;
    valorMinuto: number;
    tarifaMinima: number;
    taxaCancelamento: number;
  };
  partiuFlash: {
    tarifaBase: number;
    valorKm: number;
    tarifaMinima: number;
    taxaCancelamento: number;
  };
  multiplicadorDinamicoMaximo: number;
  raioBuscaKm: number;
}

export interface BannerFinanca {
  id: string;
  badge: string;
  titulo: string;
  subtitulo: string;
  corFundo: string;
  corDestaque: string;
  tipoIcone?: "calendario" | "cashback" | "desconto" | "estrela";
  linkDestino: string;
  ativo: boolean;
}

export interface CardMobilidadeVantagem {
  id: string;
  badge: string;
  titulo: string;
  subtitulo: string;
  corFundo: string;
  corDestaque: string;
  tipoIcone?: "pin_seguranca" | "entrega_flash" | "rota_ao_vivo" | "agendamento" | "desconto" | "personalizado" | "mulher" | "suporte";
  imagemUrl?: string;
  linkDestino: string;
  ativo: boolean;
}

export interface BannerComunicacao {
  id?: string;
  ativo: boolean;
  badge: string;
  titulo: string;
  subtitulo: string;
  botaoTexto: string;
  linkDestino: string;
  imagemUrl?: string;
}

export interface ConfigIdentidadeVisual {
  nomeApp: string;
  sloganApp: string;
  corPrimaria: string;
  corPrimariaHover: string;
  corSecundaria: string;
  corTextoPrimaria: string;
  corFundoApp: string;
  logoUrl?: string;
  iconeAppUrl?: string;
  nomeModuloEntrega: string;
  // Banner de Comunicação, Patrocinadores e Avisos
  bannerComunicacao: BannerComunicacao;
  bannersComunicacao?: BannerComunicacao[];
  // Vantagens da Mobilidade Urbana (Corrida e Entrega)
  cardsMobilidade: CardMobilidadeVantagem[];
  // Compatibilidade legada
  nomeModuloPay?: string;
  bannerCredito?: any;
  cardsFinancas?: BannerFinanca[];
}

export interface ConfigSuperAdmin {
  identidade?: ConfigIdentidadeVisual | undefined;
  estrategicos: ConfigModulosEstrategicos;
  tarifas?: ConfigTarifas | undefined;
  nomeCooperativa: string;
  cnpj: string;
  telefoneCentral: string;
  taxaAdministrativaPercent: number;
  mapas: ConfigMapas;
  pix: ConfigPix;
  whatsapp: ConfigWhatsApp;
  banners: BannerApp[];
}

export const bannersIniciais: BannerApp[] = [
  {
    id: "banner-1",
    badge: "CORRIDAS COM DESCONTO",
    titulo: "Vá de PARTIU Pop com 20% OFF",
    subtitulo: "Use o cupom PARTIU10 na sua próxima corrida urbana com ar-condicionado",
    extra: "Carros Confortáveis",
    imagem: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&auto=format&fit=crop&q=80",
    linkDestino: "/app",
    ordem: 1,
    ativo: true,
  },
  {
    id: "banner-2",
    badge: "ENTREGAS URBANAS FLASH",
    titulo: "Envie Documentos e Pacotes em Minutos",
    subtitulo: "Motoboys com rastreamento GPS e confirmação de entrega via PIN",
    extra: "A partir de R$ 9,90",
    imagem: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80",
    linkDestino: "/app/encomendas",
    ordem: 2,
    ativo: true,
  },
  {
    id: "banner-3",
    badge: "MOTORISTAS & ENTREGADORES",
    titulo: "Passe Taxa Zero: 100% Repasse no PIX D+0",
    subtitulo: "Fature sem comissões abusivas e receba seus ganhos no mesmo dia",
    extra: "Saque Instantâneo",
    imagem: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80",
    linkDestino: "/app/motorista",
    ordem: 3,
    ativo: true,
  },
  {
    id: "banner-4",
    badge: "SEGURANÇA EXCLUSIVA",
    titulo: "Partiu Mulher: Conexão Entre Elas",
    subtitulo: "Passageiras e condutoras mulheres com botão SOS 190 monitorado",
    extra: "100% Monitorado",
    imagem: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80",
    linkDestino: "/app",
    ordem: 4,
    ativo: true,
  },
];

export const telemetriaVeiculosIniciais: TelemetriaVeiculo[] = [
  {
    id: "veic-01",
    placa: "MOB-8K99",
    modelo: "Chevrolet Onix Plus 2024 (Prata)",
    motorista: "Carlos Eduardo Silva",
    telefoneMotorista: "(22) 99876-5432",
    fotoMotorista:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    linhaOrigem: "Centro",
    linhaDestino: "Vinhosa",
    tipoDispositivo: "app_motorista",
    imeiDispositivo: "PARTIU-APP-MOT-01",
    lat: -21.2054,
    lng: -41.8892,
    velocidadeKmH: 42,
    rumoGraus: 90,
    status: "em_rota",
    VagasOcupados: 1,
    VagasTotal: 4,
    arCondicionado: true,
    nivelCombustivel: 82,
    tensaoBateriaVolts: 14.1,
    temperaturaMotor: 88,
    proximaParada: "Rua Amadeu Tinoco Lacerda, 492",
    previsaoChegadaMin: 4,
    distanciaRestanteKm: 1.8,
    ultimaAtualizacao: "Agora mesmo (App Motorista)",
  },
  {
    id: "veic-02",
    placa: "MOT-7799",
    modelo: "Honda CG 160 Titan (Preta)",
    motorista: "Lucas Fernandes",
    telefoneMotorista: "(22) 99765-4321",
    fotoMotorista:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    linhaOrigem: "Aeroporto",
    linhaDestino: "Centro",
    tipoDispositivo: "app_motorista",
    imeiDispositivo: "PARTIU-APP-MOTO-02",
    lat: -21.2112,
    lng: -41.8945,
    velocidadeKmH: 48,
    rumoGraus: 180,
    status: "em_rota",
    VagasOcupados: 1,
    VagasTotal: 1,
    arCondicionado: false,
    nivelCombustivel: 70,
    tensaoBateriaVolts: 12.8,
    temperaturaMotor: 85,
    proximaParada: "Terminal Urbano",
    previsaoChegadaMin: 3,
    distanciaRestanteKm: 1.2,
    ultimaAtualizacao: "Há 1s (GPS)",
  },
  {
    id: "veic-03",
    placa: "COR-9X10",
    modelo: "Toyota Corolla XEi 2.0 (Preto)",
    motorista: "Marcos Vinicius",
    telefoneMotorista: "(22) 99612-4411",
    fotoMotorista:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    linhaOrigem: "Polo Universitário",
    linhaDestino: "Centro",
    tipoDispositivo: "app_motorista",
    imeiDispositivo: "PARTIU-APP-PLUS-03",
    lat: -21.2018,
    lng: -41.8798,
    velocidadeKmH: 35,
    rumoGraus: 270,
    status: "parado",
    VagasOcupados: 0,
    VagasTotal: 4,
    arCondicionado: true,
    nivelCombustivel: 95,
    tensaoBateriaVolts: 14.2,
    temperaturaMotor: 82,
    proximaParada: "Aguardando Corrida",
    previsaoChegadaMin: 0,
    distanciaRestanteKm: 0,
    ultimaAtualizacao: "Agora mesmo",
  },
  {
    id: "veic-04",
    placa: "PAR-5P20",
    modelo: "Hyundai HB20 Sedan (Branco)",
    motorista: "Mariana Santos (Partiu Mulher)",
    telefoneMotorista: "(22) 99888-9900",
    fotoMotorista:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    linhaOrigem: "Shopping Calçadão",
    linhaDestino: "Bairro Novo",
    tipoDispositivo: "app_motorista",
    imeiDispositivo: "PARTIU-APP-MULHER-04",
    lat: -21.2089,
    lng: -41.8841,
    velocidadeKmH: 28,
    rumoGraus: 45,
    status: "em_rota",
    VagasOcupados: 2,
    VagasTotal: 4,
    arCondicionado: true,
    nivelCombustivel: 65,
    tensaoBateriaVolts: 13.9,
    temperaturaMotor: 87,
    proximaParada: "Supermercados Fluminense",
    previsaoChegadaMin: 5,
    distanciaRestanteKm: 2.1,
    ultimaAtualizacao: "Há 2s",
  },
];

export const bannersComunicacaoIniciais: BannerComunicacao[] = [
  {
    id: "parceiro-1",
    ativo: true,
    badge: "PARCERIA OFICIAL",
    titulo: "Postos Ipiranga & Shell: Desconto Exclusivo",
    subtitulo: "Passageiros e motoristas da cidade têm até R$ 0,20 de desconto por litro.",
    botaoTexto: "Ver Oferta",
    linkDestino: "/app",
    imagemUrl: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "parceiro-2",
    ativo: true,
    badge: "SAÚDE & BEM-ESTAR",
    titulo: "Farmácias Pacheco: 15% OFF em Remédios",
    subtitulo: "Desconto imediato em medicamentos e perfumaria apresentando seu app.",
    botaoTexto: "Ativar Cupom",
    linkDestino: "/app",
    imagemUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "parceiro-3",
    ativo: true,
    badge: "OFICINA & MECÂNICA VIP",
    titulo: "Auto Peças VIP: Revisão Grátis",
    subtitulo: "Alinhamento computadorizado e troca de óleo com condições facilitadas.",
    botaoTexto: "Agendar Agora",
    linkDestino: "/app",
    imagemUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "parceiro-4",
    ativo: true,
    badge: "PROTEÇÃO VEICULAR 24H",
    titulo: "Seguro Auto & Guincho Ilimitado",
    subtitulo: "Proteção veicular com socorro 24h para motoristas e passageiros.",
    botaoTexto: "Simular Proteção",
    linkDestino: "/app",
    imagemUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=500&auto=format&fit=crop&q=80",
  },
];

export const cardsMobilidadeIniciais: CardMobilidadeVantagem[] = [
  {
    id: "mob-1",
    badge: "SEGURANÇA TOTAL",
    titulo: "PIN 4 Dígitos",
    subtitulo: "A viagem só inicia após conferência do código com o motorista.",
    corFundo: "#EFF6FF",
    corDestaque: "#2563EB",
    tipoIcone: "pin_seguranca",
    imagemUrl: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=500&auto=format&fit=crop&q=80",
    linkDestino: "/app",
    ativo: true,
  },
  {
    id: "mob-2",
    badge: "LOGÍSTICA FLASH",
    titulo: "Envio em Minutos",
    subtitulo: "Entregas urbanas rápidas de pacotes com rastreamento ao vivo.",
    corFundo: "#ECFDF5",
    corDestaque: "#059669",
    tipoIcone: "entrega_flash",
    imagemUrl: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=500&auto=format&fit=crop&q=80",
    linkDestino: "/app/encomendas",
    ativo: true,
  },
  {
    id: "mob-3",
    badge: "VIAGEM EM FAMÍLIA",
    titulo: "Rota ao Vivo",
    subtitulo: "Compartilhe seu trajeto GPS em tempo real pelo WhatsApp com quem ama.",
    corFundo: "#FEF3C7",
    corDestaque: "#D97706",
    tipoIcone: "rota_ao_vivo",
    imagemUrl: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=500&auto=format&fit=crop&q=80",
    linkDestino: "/app",
    ativo: true,
  },
  {
    id: "mob-4",
    badge: "INDIQUE & GANHE",
    titulo: "R$ 10 OFF",
    subtitulo: "Ganhe descontos nas suas corridas ao convidar amigos para a plataforma.",
    corFundo: "#F3E8FF",
    corDestaque: "#7C3AED",
    tipoIcone: "desconto",
    imagemUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=500&auto=format&fit=crop&q=80",
    linkDestino: "/app",
    ativo: true,
  },
  {
    id: "mob-5",
    badge: "MODO MULHER",
    titulo: "Elas por Elas",
    subtitulo: "Passageiras podem optar por viajar exclusivamente com motoristas mulheres.",
    corFundo: "#FDF2F8",
    corDestaque: "#DB2777",
    tipoIcone: "mulher",
    imagemUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80",
    linkDestino: "/app",
    ativo: true,
  },
  {
    id: "mob-6",
    badge: "ATENDIMENTO 24H",
    titulo: "Suporte Humano",
    subtitulo: "Central local pronta para ajudar você em qualquer situação pelo WhatsApp.",
    corFundo: "#F0FDF4",
    corDestaque: "#16A34A",
    tipoIcone: "suporte",
    imagemUrl: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=500&auto=format&fit=crop&q=80",
    linkDestino: "/app",
    ativo: true,
  },
];

export const identidadeVisualInicial: ConfigIdentidadeVisual = {
  nomeApp: "PARTIU",
  sloganApp: "Para onde você for, Partiu!",
  corPrimaria: "#FFDE00",
  corPrimariaHover: "#FACC15",
  corSecundaria: "#FA6400",
  corTextoPrimaria: "#0F172A",
  corFundoApp: "#F8F9FA",
  logoUrl: "",
  iconeAppUrl: "",
  nomeModuloEntrega: "Entrega",
  bannerComunicacao: bannersComunicacaoIniciais[0]!,
  bannersComunicacao: bannersComunicacaoIniciais,
  cardsMobilidade: cardsMobilidadeIniciais,
  // Fallbacks legados
  nomeModuloPay: "Pay",
  bannerCredito: {
    ativo: true,
    titulo: "Postos Ipiranga & Shell: Desconto Exclusivo",
    subtitulo: "Passageiros e motoristas da cidade têm até R$ 0,20 de desconto por litro",
    botaoTexto: "Ver Oferta",
    linkDestino: "/app",
  },
  cardsFinancas: [],
};

export const configSuperAdminInicial: ConfigSuperAdmin = {
  identidade: identidadeVisualInicial,
  nomeCooperativa: "PARTIU Tecnologia & Mobilidade Urbana",
  cnpj: "48.291.834/0001-90",
  telefoneCentral: "(22) 99605-1620",
  taxaAdministrativaPercent: 12.0,
  estrategicos: {
    splitPixAutomatico: true,
    repasseMotoristaPercent: 88,
    taxaCooperativaPercent: 12,
    clubeVipPassAtivo: true,
    descontoVipPassPercent: 10,
    whatsappSmartEtaAtivo: true,
    minutosAlertaProximidade: 3,
    saquePixMotoristaAtivo: true,
    saqueMinimoReais: 10,
    fretamentoB2BAtivo: false,
    descontoFretamentoCompletoPercent: 0,
  },
  tarifas: {
    partiuPop: {
      tarifaBase: 5.5,
      valorKm: 2.1,
      valorMinuto: 0.35,
      tarifaMinima: 8.0,
      taxaCancelamento: 5.0,
    },
    partiuMoto: {
      tarifaBase: 3.5,
      valorKm: 1.4,
      valorMinuto: 0.2,
      tarifaMinima: 6.0,
      taxaCancelamento: 4.0,
    },
    partiuFlash: {
      tarifaBase: 4.5,
      valorKm: 1.6,
      tarifaMinima: 7.5,
      taxaCancelamento: 5.0,
    },
    multiplicadorDinamicoMaximo: 2.5,
    raioBuscaKm: 5,
  },
  mapas: {
    provedorAtivo: "openstreetmap",
    googleMapsApiKey: "",
    mapboxAccessToken: "",
    mapboxStyleId: "mapbox://styles/mapbox/navigation-day-v1",
    osmTileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    transitoAtivo: true,
    sateliteAtivo: false,
  },
  pix: {
    gateway: "manual",
    chavePixManual: "financeiro@partiu.app",
    tipoChave: "email",
    beneficiario: "PARTIU Mobilidade Urbana Ltda",
    cidade: "Itaperuna",
    apiKey: "",
    sandbox: false,
  },
  whatsapp: {
    provedor: "evolution",
    apiUrl: "https://api.whatsapp.partiu.app",
    apiToken: "",
    instanciaNome: "partiu-central",
    ativo: true,
    notificarCompraPix: true,
    notificarEmbarque: true,
  },
  banners: bannersIniciais,
};

const STORAGE_KEY_ADMIN_CONFIG = "partiu_superadmin_config_v2";
const STORAGE_KEY_TELEMETRIA = "partiu_telemetria_veiculos_v2";

export function aplicarTemaVisual(identidade?: ConfigIdentidadeVisual) {
  if (typeof window === "undefined") return;
  const config = identidade || getSuperAdminConfig().identidade || identidadeVisualInicial;
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", config.corPrimaria);
  root.style.setProperty("--brand-primary-hover", config.corPrimariaHover || config.corPrimaria);
  root.style.setProperty("--brand-secondary", config.corSecundaria);
  root.style.setProperty("--brand-text", config.corTextoPrimaria);
}

export function getIdentidadeVisual(): ConfigIdentidadeVisual {
  const conf = getSuperAdminConfig();
  return conf.identidade || identidadeVisualInicial;
}

export function getSuperAdminConfig(): ConfigSuperAdmin {
  if (typeof window === "undefined") return configSuperAdminInicial;
  const saved =
    localStorage.getItem(STORAGE_KEY_ADMIN_CONFIG) ||
    localStorage.getItem("univans_superadmin_config_v4");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        ...configSuperAdminInicial,
        ...parsed,
        identidade: {
          ...identidadeVisualInicial,
          ...(parsed.identidade || {}),
          bannerComunicacao: {
            ...identidadeVisualInicial.bannerComunicacao,
            ...(parsed.identidade?.bannerComunicacao || {}),
          },
          bannersComunicacao: parsed.identidade?.bannersComunicacao?.length
            ? parsed.identidade.bannersComunicacao
            : (parsed.identidade?.bannerComunicacao
                ? [parsed.identidade.bannerComunicacao, ...bannersComunicacaoIniciais.slice(1)]
                : bannersComunicacaoIniciais),
          cardsMobilidade: parsed.identidade?.cardsMobilidade?.length
            ? parsed.identidade.cardsMobilidade.map((c: any, i: number) => ({
                ...cardsMobilidadeIniciais[i % cardsMobilidadeIniciais.length],
                ...c,
                imagemUrl: c.imagemUrl || cardsMobilidadeIniciais[i % cardsMobilidadeIniciais.length]?.imagemUrl,
              }))
            : cardsMobilidadeIniciais,
          bannerCredito: {
            ...identidadeVisualInicial.bannerCredito,
            ...(parsed.identidade?.bannerCredito || {}),
          },
          cardsFinancas: parsed.identidade?.cardsFinancas?.length
            ? parsed.identidade.cardsFinancas
            : identidadeVisualInicial.cardsFinancas,
        },
      };
    } catch {
      return configSuperAdminInicial;
    }
  }
  return configSuperAdminInicial;
}

export function saveSuperAdminConfig(config: ConfigSuperAdmin) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_ADMIN_CONFIG, JSON.stringify(config));
    if (config.identidade) {
      aplicarTemaVisual(config.identidade);
      window.dispatchEvent(
        new CustomEvent("partiu:identidade-atualizada", { detail: config.identidade })
      );
    }
    window.dispatchEvent(
      new CustomEvent("partiu:banners-atualizados", { detail: config.banners })
    );
  }
}

export function getTelemetriaVeiculos(): TelemetriaVeiculo[] {
  if (typeof window === "undefined") return telemetriaVeiculosIniciais;
  const saved =
    localStorage.getItem(STORAGE_KEY_TELEMETRIA) ||
    localStorage.getItem("univans_telemetria_veiculos_v4");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return telemetriaVeiculosIniciais;
    }
  }
  return telemetriaVeiculosIniciais;
}

export function saveTelemetriaVeiculos(veiculos: TelemetriaVeiculo[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_TELEMETRIA, JSON.stringify(veiculos));
  }
}
