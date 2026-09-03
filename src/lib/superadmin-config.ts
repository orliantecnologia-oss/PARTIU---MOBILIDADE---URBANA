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

export interface ConfigStarlinkCentral {
  modeloAntenaPadrao:
    "Starlink Mini 12V" | "Starlink Standard V4 / Motorizada" | "Starlink Enterprise";
  ssidWifiPadrao: string;
  senhaWifiPadrao: string;
  bloqueioSitesAdultos: boolean;
  limiteVelocidadePorPassageiroMbps: number;
  alertaDesconexaoSatMin: number;
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
  starlinkAntenaId: string;
  starlinkWifiSsid: string;
  starlinkWifiSenha: string;
  lat: number;
  lng: number;
  velocidadeKmH: number;
  rumoGraus: number;
  status: "em_rota" | "parado" | "embarcando" | "socorro_sos" | "garagem";
  VagasOcupados: number;
  VagasTotal: number;
  starlinkConectada: boolean;
  satelitesVisiveis: number;
  latenciaMs: number;
  downloadMbps: number;
  arCondicionado: boolean;
  nivelCombustivel: number;
  tensaoBateriaVolts: number;
  temperaturaMotor: number;
  proximaParada: string;
  previsaoChegadaMin: number;
  distanciaRestanteKm: number;
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

export interface ConfigSuperAdmin {
  estrategicos: ConfigModulosEstrategicos;
  nomeCooperativa: string;
  cnpj: string;
  telefoneCentral: string;
  taxaAdministrativaPercent: number;
  mapas: ConfigMapas;
  starlink: ConfigStarlinkCentral;
  pix: ConfigPix;
  whatsapp: ConfigWhatsApp;
  banners: BannerApp[];
}

export const bannersIniciais: BannerApp[] = [
  {
    id: "banner-1",
    badge: "FROTA STARLINK VIP",
    titulo: "Embarque com Wi-Fi Satélite",
    subtitulo: "Internet de 150 Mbps sem quedas em toda a rota",
    extra: "QR Code no Celular",
    imagem: "/banners/banner-univans-starlink-embarque.jpg",
    linkDestino: "/app/linhas",
    ordem: 1,
    ativo: true,
  },
  {
    id: "banner-2",
    badge: "INTERIOR EXECUTIVO VIP",
    titulo: "Conforto de Primeira Classe",
    subtitulo: "16 passagens Soft Reclináveis • Ar Dual Zone & USB",
    extra: "Trabalhe & Navegue a Bordo",
    imagem: "/banners/banner-univans-interior-vip.jpg",
    linkDestino: "/app/linhas",
    ordem: 2,
    ativo: true,
  },
  {
    id: "banner-3",
    badge: "ROTA DAS CONFECÇÕES",
    titulo: "Excursões & Compras de Moda",
    subtitulo: "Maceió & Tapera ➔ Toritama • Santa Cruz • Caruaru",
    extra: "Bagageiro Amplo & Seguro",
    imagem: "/banners/banner-univans-compras-turismo.jpg",
    linkDestino: "/app/linhas",
    ordem: 3,
    ativo: true,
  },
  {
    id: "banner-4",
    badge: "CONECTIVIDADE TOTAL",
    titulo: "Viagens Intermunicipais UniVans",
    subtitulo: "Pontualidade, segurança e atendimento humanizado",
    extra: "100% Legalizada",
    imagem: "/banners/banner-univans-starlink-conforto.jpg",
    linkDestino: "/app/linhas",
    ordem: 4,
    ativo: true,
  },
];

export const telemetriaVeiculosIniciais: TelemetriaVeiculo[] = [
  {
    id: "van-01",
    placa: "RJP-2F14",
    modelo: "Mercedes-Benz Sprinter 516 CDI Executive",
    motorista: "Carlos Eduardo Santos",
    telefoneMotorista: "(82) 99841-2290",
    fotoMotorista:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    linhaOrigem: "Maceió (Trevo Tabuleiro)",
    linhaDestino: "Arapiraca (Rodoviária)",
    tipoDispositivo: "starlink",
    imeiDispositivo: "STARLINK-MINI-01-SN8412",
    starlinkAntenaId: "STARLINK-MINI-SN8412",
    starlinkWifiSsid: "UniVans_Starlink_01",
    starlinkWifiSenha: "UniVans_Starlink_01",
    lat: -9.5714,
    lng: -36.1428,
    velocidadeKmH: 84,
    rumoGraus: 275,
    status: "em_rota",
    VagasOcupados: 14,
    VagasTotal: 16,
    starlinkConectada: true,
    satelitesVisiveis: 34,
    latenciaMs: 35,
    downloadMbps: 165.4,
    arCondicionado: true,
    nivelCombustivel: 78,
    tensaoBateriaVolts: 13.8,
    temperaturaMotor: 88,
    proximaParada: "Posto Pichilau (São Miguel)",
    previsaoChegadaMin: 18,
    distanciaRestanteKm: 42.5,
    ultimaAtualizacao: "Agora mesmo (Satélite)",
  },
  {
    id: "van-02",
    placa: "QLD-8821",
    modelo: "Renault Master Executive L3H2 Vip",
    motorista: "Marcos Vinícius Silva",
    telefoneMotorista: "(82) 99612-4411",
    fotoMotorista:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    linhaOrigem: "Tapera (Praça Central)",
    linhaDestino: "Toritama (Polo de Confecções)",
    tipoDispositivo: "starlink",
    imeiDispositivo: "STARLINK-MINI-02-SN9182",
    starlinkAntenaId: "STARLINK-MINI-SN9182",
    starlinkWifiSsid: "UniVans_Starlink_02",
    starlinkWifiSenha: "UniVans_Starlink_01",
    lat: -9.2841,
    lng: -36.4192,
    velocidadeKmH: 76,
    rumoGraus: 15,
    status: "em_rota",
    VagasOcupados: 16,
    VagasTotal: 16,
    starlinkConectada: true,
    satelitesVisiveis: 38,
    latenciaMs: 38,
    downloadMbps: 182.0,
    arCondicionado: true,
    nivelCombustivel: 62,
    tensaoBateriaVolts: 14.1,
    temperaturaMotor: 90,
    proximaParada: "Trevo de Caruaru / BR-104",
    previsaoChegadaMin: 32,
    distanciaRestanteKm: 68.0,
    ultimaAtualizacao: "Há 2s (Satélite)",
  },
  {
    id: "van-03",
    placa: "MZA-4091",
    modelo: "Fiat Ducato Maxi Cargo Vip Turismo",
    motorista: "Severino José de Lima",
    telefoneMotorista: "(82) 98711-3040",
    fotoMotorista:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    linhaOrigem: "Maceió (Rodoviária Central)",
    linhaDestino: "Maragogi (Orla Turística)",
    tipoDispositivo: "starlink",
    imeiDispositivo: "STARLINK-STD-03-SN9914",
    starlinkAntenaId: "STARLINK-STD-SN9914",
    starlinkWifiSsid: "UniVans_Starlink_03",
    starlinkWifiSenha: "UniVans_Starlink_01",
    lat: -9.0412,
    lng: -35.2214,
    velocidadeKmH: 68,
    rumoGraus: 45,
    status: "em_rota",
    VagasOcupados: 12,
    VagasTotal: 16,
    starlinkConectada: true,
    satelitesVisiveis: 41,
    latenciaMs: 32,
    downloadMbps: 210.5,
    arCondicionado: true,
    nivelCombustivel: 91,
    tensaoBateriaVolts: 13.9,
    temperaturaMotor: 86,
    proximaParada: "São Luís do Quitunde",
    previsaoChegadaMin: 14,
    distanciaRestanteKm: 28.3,
    ultimaAtualizacao: "Agora mesmo (Satélite)",
  },
  {
    id: "van-04",
    placa: "ORD-5192",
    modelo: "Mercedes-Benz Sprinter 415 CDI",
    motorista: "Antônio Ferreira dos Santos",
    telefoneMotorista: "(82) 99182-9900",
    fotoMotorista:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    linhaOrigem: "Arapiraca (Terminal Intermunicipal)",
    linhaDestino: "Santa Cruz do Capibaribe (Moda Center)",
    tipoDispositivo: "starlink",
    imeiDispositivo: "STARLINK-MINI-04-SN7721",
    starlinkAntenaId: "STARLINK-MINI-SN7721",
    starlinkWifiSsid: "UniVans_Starlink_04",
    starlinkWifiSenha: "univansviajar",
    lat: -8.9214,
    lng: -36.2911,
    velocidadeKmH: 0,
    rumoGraus: 0,
    status: "embarcando",
    VagasOcupados: 9,
    VagasTotal: 16,
    starlinkConectada: true,
    satelitesVisiveis: 36,
    latenciaMs: 40,
    downloadMbps: 145.0,
    arCondicionado: true,
    nivelCombustivel: 55,
    tensaoBateriaVolts: 12.6,
    temperaturaMotor: 75,
    proximaParada: "Ponto de Embarque Central",
    previsaoChegadaMin: 5,
    distanciaRestanteKm: 110.0,
    ultimaAtualizacao: "Agora mesmo (Satélite)",
  },
];

export const configSuperAdminInicial: ConfigSuperAdmin = {
  nomeCooperativa: "UniVans - Cooperativa de Transporte Complementar",
  cnpj: "14.829.102/0001-84",
  telefoneCentral: "(82) 3521-4090",
  taxaAdministrativaPercent: 8.5,
  estrategicos: {
    splitPixAutomatico: true,
    repasseMotoristaPercent: 88,
    taxaCooperativaPercent: 12,
    clubeVipPassAtivo: true,
    descontoVipPassPercent: 15,
    whatsappSmartEtaAtivo: true,
    minutosAlertaProximidade: 15,
    saquePixMotoristaAtivo: true,
    saqueMinimoReais: 50,
    fretamentoB2BAtivo: true,
    descontoFretamentoCompletoPercent: 10,
  },
  mapas: {
    provedorAtivo: "openstreetmap",
    googleMapsApiKey: "AIzaSyD_EXAMPLE_KEY_GOOGLE_MAPS_2026",
    mapboxAccessToken: "pk.eyJ1IjoiY29vcHZhbiIsImEiOiJjbHNleGFtcGxlMjAyNiJ9.demoToken",
    mapboxStyleId: "mapbox://styles/mapbox/navigation-day-v1",
    osmTileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    transitoAtivo: true,
    sateliteAtivo: false,
  },
  starlink: {
    modeloAntenaPadrao: "Starlink Mini 12V",
    ssidWifiPadrao: "UniVans_Starlink_VIP",
    senhaWifiPadrao: "univansviajar",
    bloqueioSitesAdultos: true,
    limiteVelocidadePorPassageiroMbps: 15,
    alertaDesconexaoSatMin: 2,
  },
  pix: {
    gateway: "mercadopago",
    chavePixManual: "financeiro@univans.com.br",
    tipoChave: "email",
    beneficiario: "UniVans Coop Alagoas de Transportes Ltda",
    cidade: "Arapiraca",
    apiKey: "APP_USR-78419284719284-082914-demo",
    sandbox: false,
  },
  whatsapp: {
    provedor: "evolution",
    apiUrl: "https://api.whatsapp.univans.com.br",
    apiToken: "••••••••••••••••••••••••",
    instanciaNome: "univans-central-alagoas",
    ativo: true,
    notificarCompraPix: true,
    notificarEmbarque: true,
  },
  banners: bannersIniciais,
};

const STORAGE_KEY_ADMIN_CONFIG = "univans_superadmin_config_v4";
const STORAGE_KEY_TELEMETRIA = "univans_telemetria_veiculos_v4";

export function getSuperAdminConfig(): ConfigSuperAdmin {
  if (typeof window === "undefined") return configSuperAdminInicial;
  const saved = localStorage.getItem(STORAGE_KEY_ADMIN_CONFIG);
  if (saved) {
    try {
      return { ...configSuperAdminInicial, ...JSON.parse(saved) };
    } catch {
      return configSuperAdminInicial;
    }
  }
  return configSuperAdminInicial;
}

export function saveSuperAdminConfig(config: ConfigSuperAdmin) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_ADMIN_CONFIG, JSON.stringify(config));
  }
}

export function getTelemetriaVeiculos(): TelemetriaVeiculo[] {
  if (typeof window === "undefined") return telemetriaVeiculosIniciais;
  const saved = localStorage.getItem(STORAGE_KEY_TELEMETRIA);
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
