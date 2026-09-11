/**
 * ==============================================================================
 * 🏷️ PARTIU WHITE LABEL ENTERPRISE PLATFORM — CANONICAL TYPES (v1.0)
 * ==============================================================================
 * Modelagem estrutural rigorosa para a plataforma White Label 100% configurável:
 * - Brand Center (Nome, Slogan, Logotipos e Favicons)
 * - Design System Manager (Cores, Semântica, Gradientes, Sombras, Bordas, Espaçamentos)
 * - Typography Center (Famílias, Escalas, Pesos e Entrelinhas)
 * - Home Page Builder (Ordem e visibilidade dos blocos, Banners e Carrosséis)
 * - Menu Builder (Menu lateral e navegação inferior dinâmica com permissões)
 * - Business Model Engine (Multi-negócio: Carro, Moto, Delivery, Vans, Turismo, etc.)
 * - Planos & Monetização (Controle sem código de preços e taxas)
 * - Banner CMS Enterprise (Segmentação por cidade, datas e público)
 * - Geo Configuration (Cidade, Estado, Moeda, Idioma, Fuso Horário)
 * - App Configuration Center (Pacotes iOS/Android, LGPD, Termos de Uso)
 * - Franquia e Multi-Tenant (Isolamento completo e clonagem de cidades)
 * ==============================================================================
 */

export type FontFamilyOption =
  | "Plus Jakarta Sans"
  | "Inter"
  | "Poppins"
  | "Roboto"
  | "Montserrat"
  | "Nunito"
  | "Open Sans";

export type SpacingScale = "COMPACT" | "DEFAULT" | "SPACIOUS";

export type BorderRadiusOption = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";

export type ShadowOption = "none" | "light" | "medium" | "strong" | "elevated";

export type CurrencyCode = "BRL" | "USD" | "EUR" | "ARS" | "CLP" | "PYG";

export type LocaleCode = "pt-BR" | "en-US" | "es-ES";

export type ViewportDevice = "MOBILE" | "TABLET" | "DESKTOP";

// ------------------------------------------------------------------------------
// MÓDULO 1: BRAND CENTER
// ------------------------------------------------------------------------------
export interface BrandLogosConfig {
  logoPrincipalUrl: string;
  logoReduzidaUrl: string;
  logoBrancaUrl: string;
  logoEscuraUrl: string;
  logoHorizontalUrl: string;
  logoQuadradaUrl: string;
}

export interface BrandFaviconsConfig {
  faviconDesktopUrl: string;
  faviconMobileUrl: string;
  appleTouchIconUrl: string;
}

export interface BrandSplashScreensConfig {
  splashAndroidUrl: string;
  splashIosUrl: string;
  splashBackgroundColor: string;
}

export interface BrandCenterConfig {
  nomePlataforma: string;
  slogan: string;
  descricaoInstitucional: string;
  logos: BrandLogosConfig;
  favicons: BrandFaviconsConfig;
  splash: BrandSplashScreensConfig;
  siteInstitucionalUrl?: string | undefined;
  emailContato: string;
  telefoneSuporte: string;
  whatsappSuporte: string;
}

// ------------------------------------------------------------------------------
// MÓDULO 2: DESIGN SYSTEM MANAGER
// ------------------------------------------------------------------------------
export interface PrimaryPaletteConfig {
  corPrincipal: string; // ex: #0088FF
  corPrincipalHover: string; // ex: #006ACC
  corSecundaria: string; // ex: #00C6FF
  corSecundariaHover: string;
  corTerciaria: string; // ex: #0F172A
  corTextoPrincipal: string; // ex: #0F172A
  corFundoApp: string; // ex: #F8FAFC
  corSuperficieCard: string; // ex: #FFFFFF
}

export interface SemanticPaletteConfig {
  sucesso: string; // ex: #10B981
  sucessoSoft: string; // ex: #ECFDF5
  erro: string; // ex: #EF4444
  erroSoft: string; // ex: #FEF2F2
  alerta: string; // ex: #F59E0B
  alertaSoft: string; // ex: #FFFBEB
  informacao: string; // ex: #3B82F6
  informacaoSoft: string; // ex: #EFF6FF
}

export interface GradientConfig {
  nome: string;
  anguloGraus: number;
  corInicio: string;
  corFim: string;
  ativo: boolean;
}

export interface DesignSystemManagerConfig {
  paletaPrimaria: PrimaryPaletteConfig;
  paletaSemantica: SemanticPaletteConfig;
  gradienteHero: GradientConfig;
  sombraCards: ShadowOption;
  sombraBotoes: ShadowOption;
  raioBordas: BorderRadiusOption;
  escalaEspacamento: SpacingScale;
}

// ------------------------------------------------------------------------------
// MÓDULO 3: TYPOGRAPHY CENTER
// ------------------------------------------------------------------------------
export interface TypographyCenterConfig {
  familiaPrincipal: FontFamilyOption;
  familiaTitulos: FontFamilyOption;
  tamanhoTitulosRem: number; // ex: 1.5 (24px)
  tamanhoSubtitulosRem: number; // ex: 1.125 (18px)
  tamanhoTextoBaseRem: number; // ex: 0.875 (14px)
  tamanhoBotoesRem: number; // ex: 0.875 (14px)
  tamanhoMenusRem: number; // ex: 0.75 (12px)
  pesoTitulos: "medium" | "semibold" | "bold" | "black";
  pesoBotoes: "regular" | "medium" | "semibold" | "bold";
  alturaLinhaMultiplicador: number; // ex: 1.5
}

// ------------------------------------------------------------------------------
// MÓDULO 4: HOME PAGE BUILDER
// ------------------------------------------------------------------------------
export type HomeBlockType =
  | "HEADER_PERFIL"
  | "MAP_WIDGET"
  | "SEARCH_DESTINATION_CARD"
  | "BUSINESS_SERVICES_GRID"
  | "PROMO_CAROUSEL"
  | "FEATURED_ADVANTAGES"
  | "ANNOUNCEMENT_BANNER"
  | "PROMO_POPUP";

export interface HomeBlockItem {
  id: string;
  tipo: HomeBlockType;
  titulo: string;
  ordem: number;
  ativo: boolean;
}

export interface HomeHeroBanner {
  id: string;
  titulo: string;
  subtitulo: string;
  badge: string;
  imagemUrl: string;
  linkDestino: string;
  prioridade: number;
  dataInicio?: number | undefined;
  dataFim?: number | undefined;
  ativo: boolean;
}

export interface HomeCarouselSettings {
  velocidadeSegundos: number;
  autoplay: boolean;
  quantidadeCardsVisiveis: number;
  loopInfinito: boolean;
}

export interface HomeFeaturedCard {
  id: string;
  badge: string;
  titulo: string;
  subtitulo: string;
  corFundo: string;
  corTexto: string;
  icone: string;
  imagemUrl?: string | undefined;
  linkDestino: string;
  ativo: boolean;
}

export interface HomePopupNotice {
  id: string;
  titulo: string;
  conteudoHtml: string;
  imagemUrl?: string | undefined;
  botaoTexto: string;
  botaoLink: string;
  exibirUmaVezPorSessao: boolean;
  dataInicio?: number | undefined;
  dataFim?: number | undefined;
  ativo: boolean;
}

export interface HomePageBuilderConfig {
  blocos: HomeBlockItem[];
  banners: HomeHeroBanner[];
  carrosselConfig: HomeCarouselSettings;
  cardsDestaque: HomeFeaturedCard[];
  popupAviso?: HomePopupNotice | undefined;
}

// ------------------------------------------------------------------------------
// MÓDULO 5: MENU BUILDER
// ------------------------------------------------------------------------------
export interface DrawerMenuItem {
  id: string;
  rotulo: string;
  icone: string;
  rota: string;
  ordem: number;
  visivel: boolean;
  badge?: string | undefined;
  badgeCor?: string | undefined;
  permissao?: "TODOS" | "PASSAGEIRO" | "MOTORISTA" | "ADMIN" | undefined;
  isExterno?: boolean | undefined;
}

export interface BottomNavTabItem {
  id: string;
  rotulo: string;
  icone: string;
  rota: string;
  ordem: number;
  ativo: boolean;
}

export interface MenuBuilderConfig {
  itensDrawer: DrawerMenuItem[];
  abasNavegacaoInferior: BottomNavTabItem[];
}

// ------------------------------------------------------------------------------
// MÓDULO 6: BUSINESS MODEL ENGINE (MULTI-NEGÓCIO)
// ------------------------------------------------------------------------------
export type BusinessVerticalId =
  | "MOBILITY_CAR"
  | "MOBILITY_MOTO"
  | "DELIVERY_FLASH"
  | "DELIVERY_CAR"
  | "SCHOOL_BUS"
  | "VANS_COLLECTIVE"
  | "TOURISM_CHARTER"
  | "EXECUTIVE_BLACK"
  | "FREIGHT_CARGO"
  | "LOCAL_MARKETPLACE"
  | "COMMERCIAL_GUIDE";

export interface BusinessVerticalItem {
  id: BusinessVerticalId;
  nomeExibicao: string;
  descricao: string;
  icone: string;
  rota: string;
  tarifaBaseBrl: number;
  comissaoPadraoPercentual: number;
  ativo: boolean;
  destaqueBadge?: string | undefined;
}

export interface BusinessModelEngineConfig {
  verticais: Record<BusinessVerticalId, BusinessVerticalItem>;
}

// ------------------------------------------------------------------------------
// MÓDULO 7: PLANOS E MONETIZAÇÃO
// ------------------------------------------------------------------------------
export interface WhiteLabelDriverPlanConfig {
  id: string;
  nome: string;
  descricao: string;
  mensalidadeBrl: number;
  diariaBrl: number;
  semanalBrl: number;
  comissaoPercentual: number;
  pesoDespacho: number;
  beneficios: string[];
  ativo: boolean;
  badgeCor: string;
}

export interface MonetizationManagerConfig {
  planos: WhiteLabelDriverPlanConfig[];
  permitirTrocaPeloMotorista: boolean;
  diasCarenciaInadimplencia: number;
  tetoDebitoMaximoBrl: number;
  fundoProtecaoTetoBrl: number;
}

// ------------------------------------------------------------------------------
// MÓDULO 8: BANNER CMS ENTERPRISE
// ------------------------------------------------------------------------------
export type CmsItemType = "BANNER" | "POPUP" | "CUPOM" | "CAMPANHA" | "AVISO" | "NOTIFICACAO";

export type CmsAudienceSegment = "TODOS" | "PASSAGEIROS" | "MOTORISTAS" | "NOVOS_USUARIOS" | "VIP";

export interface CmsCampaignRecord {
  id: string;
  tipo: CmsItemType;
  titulo: string;
  descricao: string;
  cupomCodigo?: string | undefined;
  descontoPercentual?: number | undefined;
  valorDescontoFixoBrl?: number | undefined;
  imagemUrl?: string | undefined;
  linkDestino?: string | undefined;
  cidadesAlvo: string[]; // ["itaperuna-rj", "campos-rj"] ou ["*"] para todas
  segmentoPublico: CmsAudienceSegment;
  dataInicio: number;
  dataFim: number;
  cliquesTotais: number;
  ativo: boolean;
}

export interface BannerCmsEnterpriseConfig {
  campanhas: CmsCampaignRecord[];
}

// ------------------------------------------------------------------------------
// MÓDULO 9: GEO CONFIGURATION
// ------------------------------------------------------------------------------
export interface GeoConfiguration {
  cidadeSede: string;
  estadoUf: string;
  paisNome: string;
  paisCodigoIso: string; // "BRA"
  moedaSimbolo: string; // "R$"
  moedaCodigo: CurrencyCode;
  idiomaPadrao: LocaleCode;
  fusoHorario: string; // "America/Sao_Paulo"
  formatoTelefone: string; // "(99) 99999-9999"
  coordenadasCentroLat: number;
  coordenadasCentroLng: number;
  raioOperacaoPadraoKm: number;
}

// ------------------------------------------------------------------------------
// MÓDULO 10: APP CONFIGURATION CENTER (NATIVO & POLÍTICAS)
// ------------------------------------------------------------------------------
export interface AppConfigurationCenterConfig {
  nomeAppExibicao: string;
  pacoteAndroid: string; // ex: "com.partiumobilidade.app"
  bundleIos: string; // ex: "com.partiumobilidade.ios"
  versaoApp: string; // ex: "3.4.0"
  linkAppStoreIos?: string | undefined;
  linkGooglePlayStore?: string | undefined;
  termosUsoUrl: string;
  politicaPrivacidadeLgpdUrl: string;
  suporteUrl: string;
}

// ------------------------------------------------------------------------------
// MÓDULO 11: FRANQUIA E MULTI-TENANT
// ------------------------------------------------------------------------------
export interface WhiteLabelTenantRecord {
  tenantId: string; // ex: "tenant-itaperuna"
  nomeOperacao: string; // ex: "PARTIU Noroeste"
  cidadeId: string; // ex: "itaperuna-rj"
  cidadeNome: string;
  uf: string;
  responsavelNome: string;
  responsavelEmail: string;
  responsavelTelefone: string;
  cnpjFranqueado: string;
  ativo: boolean;
  criadoEm: number;
  configuracaoCompleta: WhiteLabelFullConfig;
}

// ------------------------------------------------------------------------------
// CONFIGURAÇÃO COMPLETA UNIFICADA (SNAPSHOT ATÔMICO)
// ------------------------------------------------------------------------------
export interface WhiteLabelFullConfig {
  versaoSchema: number; // 1
  tenantId: string;
  atualizadoEm: number;
  brandCenter: BrandCenterConfig;
  designSystem: DesignSystemManagerConfig;
  typography: TypographyCenterConfig;
  homePage: HomePageBuilderConfig;
  menuBuilder: MenuBuilderConfig;
  businessModels: BusinessModelEngineConfig;
  monetization: MonetizationManagerConfig;
  cms: BannerCmsEnterpriseConfig;
  geo: GeoConfiguration;
  nativeApp: AppConfigurationCenterConfig;
}
