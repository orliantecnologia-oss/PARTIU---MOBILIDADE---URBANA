/**
 * ==============================================================================
 * 🏷️ PARTIU WHITE LABEL ENTERPRISE PLATFORM — CORE ENGINE (v1.0)
 * ==============================================================================
 * Motor central de governança White Label, multi-tenant e personalização em tempo real:
 * - Injeção atômica de variáveis CSS no elemento :root
 * - Alternador e isolamento completo de Tenants (Cidades/Franquias)
 * - Presets de marcas mundiais consagradas
 * - Exportação, importação e backup JSON
 * - Sincronização reativa via BroadcastChannel e CustomEvents
 * ==============================================================================
 */

import { silentCatchWarn } from "@/lib/structured-logger";
import {
  type WhiteLabelFullConfig,
  type WhiteLabelTenantRecord,
  type BusinessVerticalId,
  type HomeBlockItem,
  type BorderRadiusOption,
} from "./white-label-types";

const STORAGE_KEY_ACTIVE_TENANT = "partiu_whitelabel_active_tenant_id_v1";
const STORAGE_KEY_TENANTS_MAP = "partiu_whitelabel_tenants_registry_v1";

// ------------------------------------------------------------------------------
// CONFIGURAÇÃO PADRÃO CANÔNICA (PARTIU OFICIAL)
// ------------------------------------------------------------------------------
export const DEFAULT_WHITELABEL_CONFIG: WhiteLabelFullConfig = {
  versaoSchema: 1,
  tenantId: "tenant-itaperuna",
  atualizadoEm: 1773014400000,
  brandCenter: {
    nomePlataforma: "PARTIU",
    slogan: "Mobilidade inteligente para sua cidade",
    descricaoInstitucional:
      "A plataforma de mobilidade urbana e entregas rápidas que valoriza motoristas parceiros e conecta passageiros com rapidez, segurança e tarifas transparentes.",
    logos: {
      logoPrincipalUrl: "/favicon.svg",
      logoReduzidaUrl: "/favicon.svg",
      logoBrancaUrl: "/favicon.svg",
      logoEscuraUrl: "/favicon.svg",
      logoHorizontalUrl: "/favicon.svg",
      logoQuadradaUrl: "/favicon.svg",
    },
    favicons: {
      faviconDesktopUrl: "/favicon.svg",
      faviconMobileUrl: "/favicon.svg",
      appleTouchIconUrl: "/favicon.svg",
    },
    splash: {
      splashAndroidUrl: "/favicon.svg",
      splashIosUrl: "/favicon.svg",
      splashBackgroundColor: "#0088FF",
    },
    siteInstitucionalUrl: "https://partiumobilidade.com.br",
    emailContato: "contato@partiumobilidade.com.br",
    telefoneSuporte: "0800 700 8090",
    whatsappSuporte: "(22) 99876-5432",
  },
  designSystem: {
    paletaPrimaria: {
      corPrincipal: "#003366",
      corPrincipalHover: "#002244",
      corSecundaria: "#0088FF",
      corSecundariaHover: "#006ACC",
      corTerciaria: "#0A2342",
      corTextoPrincipal: "#0A2342",
      corFundoApp: "#F8FAFC",
      corSuperficieCard: "#FFFFFF",
    },
    paletaSemantica: {
      sucesso: "#10B981",
      sucessoSoft: "#ECFDF5",
      erro: "#EF4444",
      erroSoft: "#FEF2F2",
      alerta: "#F59E0B",
      alertaSoft: "#FFFBEB",
      informacao: "#3B82F6",
      informacaoSoft: "#EFF6FF",
    },
    gradienteHero: {
      nome: "Ocean Tech",
      anguloGraus: 135,
      corInicio: "#0088FF",
      corFim: "#003366",
      ativo: true,
    },
    sombraCards: "medium",
    sombraBotoes: "light",
    raioBordas: "xl",
    escalaEspacamento: "DEFAULT",
  },
  typography: {
    familiaPrincipal: "Plus Jakarta Sans",
    familiaTitulos: "Plus Jakarta Sans",
    tamanhoTitulosRem: 1.5,
    tamanhoSubtitulosRem: 1.125,
    tamanhoTextoBaseRem: 0.875,
    tamanhoBotoesRem: 0.875,
    tamanhoMenusRem: 0.75,
    pesoTitulos: "bold",
    pesoBotoes: "semibold",
    alturaLinhaMultiplicador: 1.5,
  },
  homePage: {
    blocos: [
      { id: "b1", tipo: "HEADER_PERFIL", titulo: "Cabeçalho com Perfil", ordem: 1, ativo: true },
      { id: "b2", tipo: "MAP_WIDGET", titulo: "Radar de Veículos no Mapa", ordem: 2, ativo: true },
      { id: "b3", tipo: "SEARCH_DESTINATION_CARD", titulo: "Busca de Destino Rápida", ordem: 3, ativo: true },
      { id: "b4", tipo: "BUSINESS_SERVICES_GRID", titulo: "Grade de Categorias & Serviços", ordem: 4, ativo: true },
      { id: "b5", tipo: "PROMO_CAROUSEL", titulo: "Carrossel de Banners Promocionais", ordem: 5, ativo: true },
      { id: "b6", tipo: "FEATURED_ADVANTAGES", titulo: "Vantagens e Diferenciais da Cidade", ordem: 6, ativo: true },
      { id: "b7", tipo: "ANNOUNCEMENT_BANNER", titulo: "Avisos e Comunicados Importantes", ordem: 7, ativo: true },
      { id: "b8", tipo: "PROMO_POPUP", titulo: "Popup de Desconto em Primeira Viagem", ordem: 8, ativo: false },
    ],
    banners: [
      {
        id: "banner-1",
        titulo: "Vá de PARTIU Pop com 20% OFF",
        subtitulo: "Use o cupom PARTIU10 na sua próxima corrida urbana com ar-condicionado",
        badge: "CORRIDAS COM DESCONTO",
        imagemUrl: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&auto=format&fit=crop&q=80",
        linkDestino: "/app",
        prioridade: 1,
        ativo: true,
      },
      {
        id: "banner-2",
        titulo: "Envie Documentos e Pacotes em Minutos",
        subtitulo: "Motoboys com rastreamento GPS e confirmação via PIN",
        badge: "ENTREGAS FLASH",
        imagemUrl: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80",
        linkDestino: "/app/encomendas",
        prioridade: 2,
        ativo: true,
      },
      {
        id: "banner-3",
        titulo: "Passe Taxa Zero: 100% Repasse no PIX D+0",
        subtitulo: "Fature sem comissões abusivas no Plano Ouro",
        badge: "MOTORISTAS & ENTREGADORES",
        imagemUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80",
        linkDestino: "/app/motorista",
        prioridade: 3,
        ativo: true,
      },
    ],
    carrosselConfig: {
      velocidadeSegundos: 4,
      autoplay: true,
      quantidadeCardsVisiveis: 1,
      loopInfinito: true,
    },
    cardsDestaque: [
      {
        id: "card-1",
        badge: "SEGURANÇA",
        titulo: "Viagens Seguras com PIN",
        subtitulo: "Código de 4 dígitos para validação do motorista",
        corFundo: "#EFF6FF",
        corTexto: "#1E3A8A",
        icone: "ShieldCheck",
        linkDestino: "/app",
        ativo: true,
      },
      {
        id: "card-2",
        badge: "ECONOMIA",
        titulo: "Preço Justo Sem Surpresas",
        subtitulo: "Tarifas calculadas de forma justa e transparente",
        corFundo: "#F0FDF4",
        corTexto: "#14532D",
        icone: "Zap",
        linkDestino: "/app",
        ativo: true,
      },
    ],
  },
  menuBuilder: {
    itensDrawer: [
      { id: "m1", rotulo: "Corridas & Destinos", icone: "Car", rota: "/app", ordem: 1, visivel: true },
      { id: "m2", rotulo: "Envios & Entregas", icone: "Package", rota: "/app/encomendas", ordem: 2, visivel: true },
      { id: "m3", rotulo: "Minhas Viagens & Histórico", icone: "Clock", rota: "/app/bilhetes", ordem: 3, visivel: true },
      { id: "m4", rotulo: "Cupons & Descontos", icone: "Tag", rota: "/app", ordem: 4, visivel: true, badge: "Novo", badgeCor: "bg-primary-600 text-slate-950" },
      { id: "m5", rotulo: "Meu Perfil", icone: "UserCheck", rota: "/app/perfil", ordem: 5, visivel: true },
      { id: "m6", rotulo: "Painel do Motorista", icone: "Sparkles", rota: "/app/motorista", ordem: 6, visivel: true, badge: "Taxa 0%" },
      { id: "m7", rotulo: "Painel Administrativo", icone: "Sliders", rota: "/app/admin", ordem: 7, visivel: true, permissao: "ADMIN" },
    ],
    abasNavegacaoInferior: [
      { id: "nav-corridas", rotulo: "Corridas", icone: "Car", rota: "/app", ordem: 1, ativo: true },
      { id: "nav-entregas", rotulo: "Entregas", icone: "Package", rota: "/app/encomendas", ordem: 2, ativo: true },
    ],
  },
  businessModels: {
    verticais: {
      MOBILITY_CAR: {
        id: "MOBILITY_CAR",
        nomeExibicao: "Carro Pop",
        descricao: "Carros urbanos confortáveis com ar-condicionado",
        icone: "Car",
        rota: "/app",
        tarifaBaseBrl: 5.5,
        comissaoPadraoPercentual: 5.0,
        ativo: true,
        destaqueBadge: "Mais Popular",
      },
      MOBILITY_MOTO: {
        id: "MOBILITY_MOTO",
        nomeExibicao: "Moto Rápida",
        descricao: "Transporte ágil para fugir do trânsito",
        icone: "Bike",
        rota: "/app",
        tarifaBaseBrl: 3.5,
        comissaoPadraoPercentual: 5.0,
        ativo: true,
        destaqueBadge: "Econômico",
      },
      DELIVERY_FLASH: {
        id: "DELIVERY_FLASH",
        nomeExibicao: "Entrega Flash",
        descricao: "Envio de encomendas leves de até 15kg",
        icone: "Package",
        rota: "/app/encomendas",
        tarifaBaseBrl: 4.5,
        comissaoPadraoPercentual: 5.0,
        ativo: true,
      },
      DELIVERY_CAR: {
        id: "DELIVERY_CAR",
        nomeExibicao: "Entrega Utilitário",
        descricao: "Transporte de cargas médias e compras",
        icone: "Truck",
        rota: "/app/encomendas",
        tarifaBaseBrl: 12.0,
        comissaoPadraoPercentual: 5.0,
        ativo: true,
      },
      SCHOOL_BUS: {
        id: "SCHOOL_BUS",
        nomeExibicao: "Transporte Escolar",
        descricao: "Vans e motoristas credenciados com monitoramento",
        icone: "GraduationCap",
        rota: "/app",
        tarifaBaseBrl: 180.0,
        comissaoPadraoPercentual: 3.0,
        ativo: false,
      },
      VANS_COLLECTIVE: {
        id: "VANS_COLLECTIVE",
        nomeExibicao: "Vans & Lotação",
        descricao: "Linhas regulares interbairros e distritos",
        icone: "Bus",
        rota: "/app",
        tarifaBaseBrl: 4.0,
        comissaoPadraoPercentual: 3.0,
        ativo: true,
      },
      TOURISM_CHARTER: {
        id: "TOURISM_CHARTER",
        nomeExibicao: "Turismo & Fretamento",
        descricao: "Viagens intermunicipais sob agendamento",
        icone: "Compass",
        rota: "/app",
        tarifaBaseBrl: 250.0,
        comissaoPadraoPercentual: 2.5,
        ativo: false,
      },
      EXECUTIVE_BLACK: {
        id: "EXECUTIVE_BLACK",
        nomeExibicao: "Executivo Black",
        descricao: "Sedans premium e condutores bilíngues",
        icone: "Crown",
        rota: "/app",
        tarifaBaseBrl: 15.0,
        comissaoPadraoPercentual: 5.0,
        ativo: false,
      },
      FREIGHT_CARGO: {
        id: "FREIGHT_CARGO",
        nomeExibicao: "Fretes & Mudanças",
        descricao: "Caminhonetes e caminhões baú com ajudante",
        icone: "Boxes",
        rota: "/app",
        tarifaBaseBrl: 120.0,
        comissaoPadraoPercentual: 5.0,
        ativo: false,
      },
      LOCAL_MARKETPLACE: {
        id: "LOCAL_MARKETPLACE",
        nomeExibicao: "Comércio Local",
        descricao: "Lojas e restaurantes da cidade com entrega própria",
        icone: "ShoppingBag",
        rota: "/app",
        tarifaBaseBrl: 0.0,
        comissaoPadraoPercentual: 4.0,
        ativo: false,
      },
      COMMERCIAL_GUIDE: {
        id: "COMMERCIAL_GUIDE",
        nomeExibicao: "Guia Comercial",
        descricao: "Telefones úteis, farmácias e serviços da cidade",
        icone: "BookOpen",
        rota: "/app",
        tarifaBaseBrl: 0.0,
        comissaoPadraoPercentual: 0.0,
        ativo: false,
      },
    },
  },
  monetization: {
    planos: [
      {
        id: "plano-livre",
        nome: "Livre (FREE)",
        descricao: "Sem mensalidade fixa, pague apenas 5% por corrida concluída",
        mensalidadeBrl: 0,
        diariaBrl: 0,
        semanalBrl: 0,
        comissaoPercentual: 5.0,
        pesoDespacho: 1.0,
        beneficios: ["Repasse D+0 via PIX", "Acesso ao Trip Radar", "Sem mensalidade"],
        ativo: true,
        badgeCor: "bg-slate-500 text-white",
      },
      {
        id: "plano-bronze",
        nome: "Bronze",
        descricao: "Taxa reduzida de 3% e prioridade leve no Trip Radar",
        mensalidadeBrl: 19.9,
        diariaBrl: 1.5,
        semanalBrl: 6.9,
        comissaoPercentual: 3.0,
        pesoDespacho: 1.15,
        beneficios: ["Taxa de apenas 3.0%", "Prioridade leve de despacho", "Repasse D+0 via PIX"],
        ativo: true,
        badgeCor: "bg-amber-700 text-white",
      },
      {
        id: "plano-prata",
        nome: "Prata",
        descricao: "Taxa de 1% e prioridade intermediária no Trip Radar",
        mensalidadeBrl: 49.9,
        diariaBrl: 3.5,
        semanalBrl: 16.9,
        comissaoPercentual: 1.0,
        pesoDespacho: 1.30,
        beneficios: ["Taxa mínima de 1.0%", "Prioridade intermediária", "Atendimento VIP WhatsApp"],
        ativo: true,
        badgeCor: "bg-slate-300 text-slate-950",
      },
      {
        id: "plano-ouro",
        nome: "Ouro (VIP)",
        descricao: "Zero comissão (0%) até R$ 8.000/mês e 100% de repasse líquido ao motorista",
        mensalidadeBrl: 99.9,
        diariaBrl: 6.9,
        semanalBrl: 34.9,
        comissaoPercentual: 0.0,
        pesoDespacho: 1.50,
        beneficios: ["ZERO COMISSÃO (0.0% até R$ 8.000/mês)", "100% do valor da corrida é seu", "Prioridade equilibrada VIP"],
        ativo: true,
        badgeCor: "bg-primary-600 text-slate-950",
      },
      {
        id: "plano-platina",
        nome: "Platina Frota",
        descricao: "Para operadores de frotas e cooperativas multi-veículos",
        mensalidadeBrl: 249.9,
        diariaBrl: 14.9,
        semanalBrl: 79.9,
        comissaoPercentual: 0.0,
        pesoDespacho: 1.50,
        beneficios: ["Gestão de até 5 veículos", "ZERO comissão", "Suporte telefônico dedicado 24h"],
        ativo: true,
        badgeCor: "bg-indigo-600 text-white",
      },
    ],
    permitirTrocaPeloMotorista: true,
    diasCarenciaInadimplencia: 3,
    tetoDebitoMaximoBrl: 80.0,
    fundoProtecaoTetoBrl: 30.0,
  },
  cms: {
    campanhas: [
      {
        id: "camp-01",
        tipo: "CUPOM",
        titulo: "Cupom PARTIU10",
        descricao: "Desconto de 10% nas primeiras 3 viagens na cidade",
        cupomCodigo: "PARTIU10",
        descontoPercentual: 10,
        cidadesAlvo: ["*"],
        segmentoPublico: "NOVOS_USUARIOS",
        dataInicio: 1772928000000,
        dataFim: 1775520000000,
        cliquesTotais: 1420,
        ativo: true,
      },
      {
        id: "camp-02",
        tipo: "AVISO",
        titulo: "Operação Chuva Ativada",
        descricao: "Dirija com cautela e use o cinto de segurança",
        cidadesAlvo: ["itaperuna-rj"],
        segmentoPublico: "TODOS",
        dataInicio: 1772928000000,
        dataFim: 1775520000000,
        cliquesTotais: 310,
        ativo: true,
      },
    ],
  },
  geo: {
    cidadeSede: "Itaperuna",
    estadoUf: "RJ",
    paisNome: "Brasil",
    paisCodigoIso: "BRA",
    moedaSimbolo: "R$",
    moedaCodigo: "BRL",
    idiomaPadrao: "pt-BR",
    fusoHorario: "America/Sao_Paulo",
    formatoTelefone: "(99) 99999-9999",
    coordenadasCentroLat: -21.2054,
    coordenadasCentroLng: -41.8892,
    raioOperacaoPadraoKm: 15.0,
  },
  nativeApp: {
    nomeAppExibicao: "PARTIU",
    pacoteAndroid: "br.com.partiumobilidade.app",
    bundleIos: "br.com.partiumobilidade.ios",
    versaoApp: "3.4.0",
    termosUsoUrl: "https://partiumobilidade.com.br/termos",
    politicaPrivacidadeLgpdUrl: "https://partiumobilidade.com.br/privacidade",
    suporteUrl: "https://wa.me/5522998765432",
  },
};

// ------------------------------------------------------------------------------
// PRESETS DE MARCAS MUNDIAIS CONSAGRADAS (FIGMA THEME PRESETS)
// ------------------------------------------------------------------------------
export interface WhiteLabelThemePreset {
  id: string;
  nome: string;
  descricao: string;
  tagline: string;
  paleta: {
    corPrincipal: string;
    corPrincipalHover: string;
    corSecundaria: string;
    corTerciaria: string;
    corTextoPrincipal: string;
    corFundoApp: string;
    corSuperficieCard: string;
  };
  typography: {
    familiaPrincipal: any;
    familiaTitulos: any;
  };
  raioBorda: BorderRadiusOption;
}

export const WHITELABEL_PRESETS: WhiteLabelThemePreset[] = [
  {
    id: "preset-partiu",
    nome: "PARTIU Oficial (Ocean Tech)",
    descricao: "Identidade premium com azul profundo e degradê tech de alta confiança",
    tagline: "Para onde você for, Partiu!",
    paleta: {
      corPrincipal: "#003366",
      corPrincipalHover: "#002244",
      corSecundaria: "#0088FF",
      corTerciaria: "#0A2342",
      corTextoPrincipal: "#0A2342",
      corFundoApp: "#F8FAFC",
      corSuperficieCard: "#FFFFFF",
    },
    typography: {
      familiaPrincipal: "Plus Jakarta Sans",
      familiaTitulos: "Plus Jakarta Sans",
    },
    raioBorda: "xl",
  },
  {
    id: "preset-99",
    nome: "99 Amarelo Ouro & Laranja",
    descricao: "Visual consagrado da 99 com botões arredondados e calor humano",
    tagline: "Vá de 99, chegue rápido.",
    paleta: {
      corPrincipal: "#0088FF",
      corPrincipalHover: "#006ACC",
      corSecundaria: "#00C6FF",
      corTerciaria: "#111827",
      corTextoPrincipal: "#111827",
      corFundoApp: "#F9FAFB",
      corSuperficieCard: "#FFFFFF",
    },
    typography: {
      familiaPrincipal: "Inter",
      familiaTitulos: "Inter",
    },
    raioBorda: "2xl",
  },
  {
    id: "preset-uber",
    nome: "Uber Tech Black & Blue",
    descricao: "Minimalismo premium corporativo com tipografia geométrica e visual escuro",
    tagline: "Move the way you want.",
    paleta: {
      corPrincipal: "#000000",
      corPrincipalHover: "#1F2937",
      corSecundaria: "#276EF1",
      corTerciaria: "#FFFFFF",
      corTextoPrincipal: "#FFFFFF",
      corFundoApp: "#F3F4F6",
      corSuperficieCard: "#FFFFFF",
    },
    typography: {
      familiaPrincipal: "Roboto",
      familiaTitulos: "Roboto",
    },
    raioBorda: "lg",
  },
  {
    id: "preset-indrive",
    nome: "inDrive Dinâmico (Verde Limão)",
    descricao: "Contraste arrojado em verde neon com proposta de negociação direta",
    tagline: "Preço justo negociado por você.",
    paleta: {
      corPrincipal: "#B2F35F",
      corPrincipalHover: "#9FE04C",
      corSecundaria: "#10B981",
      corTerciaria: "#0F172A",
      corTextoPrincipal: "#0F172A",
      corFundoApp: "#F9FAFB",
      corSuperficieCard: "#FFFFFF",
    },
    typography: {
      familiaPrincipal: "Poppins",
      familiaTitulos: "Poppins",
    },
    raioBorda: "2xl",
  },
  {
    id: "preset-cabify",
    nome: "Cabify Roxo & Coral",
    descricao: "Elegância europeia com acabamento sedoso e paleta de tons sofisticados",
    tagline: "Sua cidade em suas mãos.",
    paleta: {
      corPrincipal: "#7145D6",
      corPrincipalHover: "#5F35C2",
      corSecundaria: "#FF0055",
      corTerciaria: "#FFFFFF",
      corTextoPrincipal: "#FFFFFF",
      corFundoApp: "#F8F9FA",
      corSuperficieCard: "#FFFFFF",
    },
    typography: {
      familiaPrincipal: "Montserrat",
      familiaTitulos: "Montserrat",
    },
    raioBorda: "xl",
  },
  {
    id: "preset-citydrive",
    nome: "CityDrive Emerald & White",
    descricao: "Sustentabilidade e ecologia urbana com tons de esmeralda e floresta",
    tagline: "Mobilidade limpa e conectada.",
    paleta: {
      corPrincipal: "#059669",
      corPrincipalHover: "#047857",
      corSecundaria: "#10B981",
      corTerciaria: "#FFFFFF",
      corTextoPrincipal: "#FFFFFF",
      corFundoApp: "#F0FDF4",
      corSuperficieCard: "#FFFFFF",
    },
    typography: {
      familiaPrincipal: "Nunito",
      familiaTitulos: "Nunito",
    },
    raioBorda: "2xl",
  },
  {
    id: "preset-motorapido",
    nome: "MotoRápido Crimson & Orange",
    descricao: "Velocidade e entrega expressa com alta energia em tons de vermelho",
    tagline: "Piscou, chegou!",
    paleta: {
      corPrincipal: "#DC2626",
      corPrincipalHover: "#B91C1C",
      corSecundaria: "#F97316",
      corTerciaria: "#FFFFFF",
      corTextoPrincipal: "#FFFFFF",
      corFundoApp: "#FEF2F2",
      corSuperficieCard: "#FFFFFF",
    },
    typography: {
      familiaPrincipal: "Open Sans",
      familiaTitulos: "Open Sans",
    },
    raioBorda: "lg",
  },
];

// ------------------------------------------------------------------------------
// SINGLETON: WHITE LABEL ENTERPRISE ENGINE
// ------------------------------------------------------------------------------
export class WhiteLabelEngine {
  private static instance: WhiteLabelEngine;
  private activeTenantId: string = "tenant-itaperuna";
  private tenantsMap: Map<string, WhiteLabelTenantRecord> = new Map();
  private broadcastChannel?: BroadcastChannel | undefined;

  private constructor() {
    this.initStorage();
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.broadcastChannel = new BroadcastChannel("partiu_whitelabel_channel");
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === "TENANT_OR_THEME_UPDATED") {
            this.initStorage();
            this.applyTheme(this.getActiveConfig());
          }
        };
      } catch (err) { silentCatchWarn("white-label-engine", err); }
    }
  }

  public static getInstance(): WhiteLabelEngine {
    if (!WhiteLabelEngine.instance) {
      WhiteLabelEngine.instance = new WhiteLabelEngine();
    }
    return WhiteLabelEngine.instance;
  }

  private initStorage(): void {
    if (typeof window === "undefined") {
      this.tenantsMap.set("tenant-itaperuna", {
        tenantId: "tenant-itaperuna",
        nomeOperacao: "PARTIU Itaperuna (Sede Noroeste)",
        cidadeId: "itaperuna-rj",
        cidadeNome: "Itaperuna",
        uf: "RJ",
        responsavelNome: "Operador Regional",
        responsavelEmail: "itaperuna@partiumobilidade.com.br",
        responsavelTelefone: "(22) 99876-5432",
        cnpjFranqueado: "34.567.890/0001-12",
        ativo: true,
        criadoEm: 1772928000000,
        configuracaoCompleta: DEFAULT_WHITELABEL_CONFIG,
      });
      return;
    }

    try {
      const savedTenantId = localStorage.getItem(STORAGE_KEY_ACTIVE_TENANT);
      if (savedTenantId) {
        this.activeTenantId = savedTenantId;
      }

      const rawTenants = localStorage.getItem(STORAGE_KEY_TENANTS_MAP);
      if (rawTenants) {
        const parsed = JSON.parse(rawTenants) as WhiteLabelTenantRecord[];
        parsed.forEach((t) => this.tenantsMap.set(t.tenantId, t));
      }

      // Garante pelo menos Itaperuna e Campos cadastrados
      if (this.tenantsMap.size === 0) {
        const tenantItaperuna: WhiteLabelTenantRecord = {
          tenantId: "tenant-itaperuna",
          nomeOperacao: "PARTIU Itaperuna (Sede Noroeste)",
          cidadeId: "itaperuna-rj",
          cidadeNome: "Itaperuna",
          uf: "RJ",
          responsavelNome: "Operador Regional",
          responsavelEmail: "itaperuna@partiumobilidade.com.br",
          responsavelTelefone: "(22) 99876-5432",
          cnpjFranqueado: "34.567.890/0001-12",
          ativo: true,
          criadoEm: 1772928000000,
          configuracaoCompleta: DEFAULT_WHITELABEL_CONFIG,
        };

        const tenantCampos: WhiteLabelTenantRecord = {
          tenantId: "tenant-campos",
          nomeOperacao: "GO Mobilidade Campos",
          cidadeId: "campos-rj",
          cidadeNome: "Campos dos Goytacazes",
          uf: "RJ",
          responsavelNome: "Campos Serviços Urbanos Ltda",
          responsavelEmail: "campos@gomobilidade.com.br",
          responsavelTelefone: "(22) 99765-4321",
          cnpjFranqueado: "45.678.901/0001-23",
          ativo: true,
          criadoEm: 1772928000000,
          configuracaoCompleta: {
            ...DEFAULT_WHITELABEL_CONFIG,
            tenantId: "tenant-campos",
            brandCenter: {
              ...DEFAULT_WHITELABEL_CONFIG.brandCenter,
              nomePlataforma: "GO MOBILIDADE",
              slogan: "Sua viagem rápida em Campos",
            },
            designSystem: {
              ...DEFAULT_WHITELABEL_CONFIG.designSystem,
              paletaPrimaria: {
                ...DEFAULT_WHITELABEL_CONFIG.designSystem.paletaPrimaria,
                corPrincipal: "#2563EB",
                corPrincipalHover: "#1D4ED8",
                corSecundaria: "#F59E0B",
                corTextoPrincipal: "#FFFFFF",
              },
            },
            geo: {
              ...DEFAULT_WHITELABEL_CONFIG.geo,
              cidadeSede: "Campos dos Goytacazes",
              coordenadasCentroLat: -21.7545,
              coordenadasCentroLng: -41.3244,
            },
          },
        };

        this.tenantsMap.set(tenantItaperuna.tenantId, tenantItaperuna);
        this.tenantsMap.set(tenantCampos.tenantId, tenantCampos);
        this.saveTenantsRegistry();
      }
    } catch (err) { silentCatchWarn("white-label-engine", err); }
  }

  private saveTenantsRegistry(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        STORAGE_KEY_TENANTS_MAP,
        JSON.stringify(Array.from(this.tenantsMap.values()))
      );
      localStorage.setItem(STORAGE_KEY_ACTIVE_TENANT, this.activeTenantId);
    } catch (err) { silentCatchWarn("white-label-engine", err); }
  }

  private broadcastUpdate(): void {
    if (typeof window === "undefined") return;
    try {
      const config = this.getActiveConfig();
      window.dispatchEvent(
        new CustomEvent("partiu:whitelabel-updated", { detail: config })
      );
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: "TENANT_OR_THEME_UPDATED", tenantId: this.activeTenantId });
      }
    } catch (err) { silentCatchWarn("white-label-engine", err); }
  }

  // ============================================================================
  // GESTÃO DO TENANT ATIVO
  // ============================================================================

  public getActiveTenantId(): string {
    return this.activeTenantId;
  }

  public getActiveTenant(): WhiteLabelTenantRecord {
    const existing = this.tenantsMap.get(this.activeTenantId);
    if (existing) return existing;
    return (
      Array.from(this.tenantsMap.values())[0] || {
        tenantId: "tenant-itaperuna",
        nomeOperacao: "PARTIU Itaperuna",
        cidadeId: "itaperuna-rj",
        cidadeNome: "Itaperuna",
        uf: "RJ",
        responsavelNome: "Admin",
        responsavelEmail: "admin@partiu.app",
        responsavelTelefone: "(22) 99876-5432",
        cnpjFranqueado: "00.000.000/0001-00",
        ativo: true,
        criadoEm: Date.now(),
        configuracaoCompleta: DEFAULT_WHITELABEL_CONFIG,
      }
    );
  }

  public getActiveConfig(): WhiteLabelFullConfig {
    return this.getActiveTenant().configuracaoCompleta;
  }

  public getAllTenants(): WhiteLabelTenantRecord[] {
    return Array.from(this.tenantsMap.values());
  }

  public switchTenant(tenantId: string): WhiteLabelTenantRecord {
    const tenant = this.tenantsMap.get(tenantId);
    if (!tenant) throw new Error(`Tenant '${tenantId}' não encontrado.`);
    this.activeTenantId = tenantId;
    this.saveTenantsRegistry();
    this.applyTheme(tenant.configuracaoCompleta);
    this.broadcastUpdate();
    return tenant;
  }

  public updateActiveConfig(partialConfig: Partial<WhiteLabelFullConfig>): WhiteLabelFullConfig {
    const tenant = this.getActiveTenant();
    const updated: WhiteLabelFullConfig = {
      ...tenant.configuracaoCompleta,
      ...partialConfig,
      atualizadoEm: Date.now(),
    };

    tenant.configuracaoCompleta = updated;
    this.tenantsMap.set(tenant.tenantId, tenant);
    this.saveTenantsRegistry();
    this.applyTheme(updated);
    this.broadcastUpdate();
    return updated;
  }

  // ============================================================================
  // MULTI-TENANT: CLONAGEM E CRIAÇÃO DE NOVAS CIDADES
  // ============================================================================

  public cloneTenant(
    sourceTenantId: string,
    targetTenantIdOrCityName: string,
    newCityNameOrUf: string,
    newUfOrOperatorName?: string,
    newOperatorName?: string
  ): WhiteLabelTenantRecord {
    const source = this.tenantsMap.get(sourceTenantId) || this.getActiveTenant();

    let cleanId: string;
    let newCityName: string;
    let newUf: string;
    let operatorName: string | undefined;

    if (newUfOrOperatorName && newUfOrOperatorName.length <= 3) {
      cleanId = targetTenantIdOrCityName.startsWith("tenant-")
        ? targetTenantIdOrCityName
        : `tenant-${targetTenantIdOrCityName}`;
      newCityName = newCityNameOrUf;
      newUf = newUfOrOperatorName;
      operatorName = newOperatorName;
    } else {
      newCityName = targetTenantIdOrCityName;
      newUf = newCityNameOrUf;
      cleanId = `tenant-${newCityName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36)}`;
      operatorName = newUfOrOperatorName;
    }

    const clonedConfig: WhiteLabelFullConfig = {
      ...JSON.parse(JSON.stringify(source.configuracaoCompleta)),
      tenantId: cleanId,
      atualizadoEm: Date.now(),
      geo: {
        ...source.configuracaoCompleta.geo,
        cidadeSede: newCityName,
        estadoUf: newUf,
      },
      brandCenter: {
        ...source.configuracaoCompleta.brandCenter,
        slogan: `Mobilidade inteligente em ${newCityName}`,
      },
    };

    const newTenant: WhiteLabelTenantRecord = {
      tenantId: cleanId,
      nomeOperacao: operatorName || `${source.configuracaoCompleta.brandCenter.nomePlataforma} ${newCityName}`,
      cidadeId: `${newCityName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${newUf.toLowerCase()}`,
      cidadeNome: newCityName,
      uf: newUf,
      responsavelNome: source.responsavelNome,
      responsavelEmail: source.responsavelEmail,
      responsavelTelefone: source.responsavelTelefone,
      cnpjFranqueado: source.cnpjFranqueado,
      ativo: true,
      criadoEm: Date.now(),
      configuracaoCompleta: clonedConfig,
    };

    this.tenantsMap.set(cleanId, newTenant);
    this.saveTenantsRegistry();
    this.broadcastUpdate();
    return newTenant;
  }

  // ============================================================================
  // APLICAÇÃO ATÔMICA DE CSS VARIABLES NO :ROOT
  // ============================================================================

  public applyTheme(config: WhiteLabelFullConfig): void {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const prim = config.designSystem.paletaPrimaria;
    const sem = config.designSystem.paletaSemantica;
    const typ = config.typography;

    // 1. Variáveis Canônicas de Marca
    root.style.setProperty("--brand-primary", prim.corPrincipal);
    root.style.setProperty("--brand-primary-hover", prim.corPrincipalHover);
    root.style.setProperty("--brand-secondary", prim.corSecundaria);
    root.style.setProperty("--brand-text", prim.corTextoPrincipal);
    root.style.setProperty("--brand-tertiary", prim.corTerciaria);

    // 2. Cores do Tailwind Theme Inline
    root.style.setProperty("--color-primary", prim.corPrincipal);
    root.style.setProperty("--color-primary-foreground", prim.corTextoPrincipal);
    root.style.setProperty("--color-secondary", prim.corSecundaria);
    root.style.setProperty("--color-background", prim.corFundoApp);
    root.style.setProperty("--color-card", prim.corSuperficieCard);

    // 3. Paleta Semântica
    root.style.setProperty("--color-success", sem.sucesso);
    root.style.setProperty("--color-success-soft", sem.sucessoSoft);
    root.style.setProperty("--color-danger", sem.erro);
    root.style.setProperty("--color-danger-soft", sem.erroSoft);
    root.style.setProperty("--color-warning", sem.alerta);
    root.style.setProperty("--color-warning-soft", sem.alertaSoft);
    root.style.setProperty("--color-info", sem.informacao);
    root.style.setProperty("--color-info-soft", sem.informacaoSoft);

    // 4. Raio de Bordas
    const radiusMap: Record<BorderRadiusOption, string> = {
      sm: "0.375rem",
      md: "0.5rem",
      lg: "0.75rem",
      xl: "1rem",
      "2xl": "1.25rem",
      "3xl": "1.5rem",
      full: "9999px",
    };
    root.style.setProperty("--radius", radiusMap[config.designSystem.raioBordas] || "0.75rem");

    // 5. Família Tipográfica
    root.style.setProperty(
      "--font-sans",
      `"${typ.familiaPrincipal}", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    );

    // 6. Atualiza dinamicamente o título e o favicon da aba se configurados
    try {
      if (config.brandCenter.nomePlataforma) {
        document.title = `${config.brandCenter.nomePlataforma} — ${config.brandCenter.slogan}`;
      }
      if (config.brandCenter.favicons.faviconDesktopUrl) {
        const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
        if (link) {
          link.href = config.brandCenter.favicons.faviconDesktopUrl;
        }
      }
    } catch (err) { silentCatchWarn("white-label-engine", err); }
  }

  // ============================================================================
  // PRESETS DE DESIGN SYSTEM (FIGMA-LIKE ONE-CLICK APPLY)
  // ============================================================================

  public applyPreset(presetId: string): WhiteLabelFullConfig {
    const norm = presetId.toLowerCase().replace(/^preset-/, "").replace(/[^a-z0-9]/g, "");
    const preset = WHITELABEL_PRESETS.find((p) => {
      const pNorm = p.id.toLowerCase().replace(/^preset-/, "").replace(/[^a-z0-9]/g, "");
      return p.id === presetId || pNorm === norm || pNorm.includes(norm) || norm.includes(pNorm);
    });
    if (!preset) throw new Error(`Preset '${presetId}' não encontrado.`);

    return this.updateActiveConfig({
      designSystem: {
        ...this.getActiveConfig().designSystem,
        paletaPrimaria: {
          ...this.getActiveConfig().designSystem.paletaPrimaria,
          corPrincipal: preset.paleta.corPrincipal,
          corPrincipalHover: preset.paleta.corPrincipalHover,
          corSecundaria: preset.paleta.corSecundaria,
          corTerciaria: preset.paleta.corTerciaria,
          corTextoPrincipal: preset.paleta.corTextoPrincipal,
          corFundoApp: preset.paleta.corFundoApp,
          corSuperficieCard: preset.paleta.corSuperficieCard,
        },
        raioBordas: preset.raioBorda,
      },
      typography: {
        ...this.getActiveConfig().typography,
        familiaPrincipal: preset.typography.familiaPrincipal,
        familiaTitulos: preset.typography.familiaTitulos,
      },
    });
  }

  // ============================================================================
  // BUSINESS MODEL TOGGLE & HOME BLOCKS REORDERING
  // ============================================================================

  public toggleBusinessModel(modelId: BusinessVerticalId, ativo: boolean): WhiteLabelFullConfig {
    const current = this.getActiveConfig();
    const verticais = { ...current.businessModels.verticais };
    if (verticais[modelId]) {
      verticais[modelId] = {
        ...verticais[modelId],
        ativo,
      };
    }
    return this.updateActiveConfig({
      businessModels: {
        verticais,
      },
    });
  }

  public reorderHomeBlocks(blocks: HomeBlockItem[]): WhiteLabelFullConfig {
    return this.updateActiveConfig({
      homePage: {
        ...this.getActiveConfig().homePage,
        blocos: blocks,
      },
    });
  }

  // ============================================================================
  // EXPORTAÇÃO, IMPORTAÇÃO & BACKUP
  // ============================================================================

  public exportThemeJson(): string {
    const active = this.getActiveConfig();
    return JSON.stringify(
      {
        meta: {
          generator: "PARTIU White Label Enterprise OS v1.0",
          exportedAt: new Date().toISOString(),
          tenantId: active.tenantId,
        },
        themeConfig: active,
      },
      null,
      2
    );
  }

  public importThemeJson(jsonString: string): WhiteLabelFullConfig {
    try {
      const parsed = JSON.parse(jsonString);
      const targetConfig = parsed.themeConfig || parsed;
      if (!targetConfig.brandCenter || !targetConfig.designSystem) {
        throw new Error("Arquivo JSON inválido: nós essenciais 'brandCenter' ou 'designSystem' ausentes.");
      }
      return this.updateActiveConfig(targetConfig);
    } catch (e: any) {
      throw new Error(`Falha ao importar tema: ${e.message}`);
    }
  }

  public resetToDefaults(): WhiteLabelFullConfig {
    return this.updateActiveConfig(DEFAULT_WHITELABEL_CONFIG);
  }
}

export const whiteLabelEngine = WhiteLabelEngine.getInstance();
