export interface PromoBannerItem {
  id: string;
  badge: string;
  titulo: string;
  subtitulo: string;
  cupom?: string;
  corGradiente: string;
  tagCor: string;
  imagemUrl?: string;
  acaoUrl?: string;
}

export interface RecentAddressItem {
  id: string;
  titulo: string;
  endereco: string;
  coords: [number, number]; // [lng, lat]
}

export interface UserProfileMock {
  nome: string;
  avatarUrl: string;
  iniciais: string;
}

// 1. Mock do Perfil do Usuário
export const USER_PROFILE_MOCK: UserProfileMock = {
  nome: "Rodrigo",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  iniciais: "RO",
};

// 2. Mock dos Últimos Destinos Pesquisados em Itaperuna, RJ
export const RECENT_SEARCH_MOCKS: RecentAddressItem[] = [
  {
    id: "rec-1",
    titulo: "Centro",
    endereco: "Av. Cardoso Moreira, 310 - Centro",
    coords: [-41.8835, -21.2080],
  },
  {
    id: "rec-2",
    titulo: "Supermercado Fluminense",
    endereco: "Rua Dez de Maio, 188 - Centro",
    coords: [-41.8860, -21.2065],
  },
];

// 3. Mock do Carrossel de Banners de Marketing (Estritamente Mobilidade e Entregas)
export const PROMO_BANNERS_MOCK: PromoBannerItem[] = [
  {
    id: "banner-1",
    badge: "20% OFF",
    titulo: "Primeira Corrida com Desconto",
    subtitulo: "Economize em viagens de Moto ou Carro em Itaperuna",
    cupom: "PARTIU20",
    corGradiente: "from-amber-400 via-amber-500 to-yellow-500 text-slate-950",
    tagCor: "bg-black text-amber-300",
    imagemUrl: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "banner-2",
    badge: "ENTREGA FLASH",
    titulo: "Envio Expresso a partir de R$ 7,90",
    subtitulo: "Segurança total com verificação por Duplo PIN",
    cupom: "FLASHENVIO",
    corGradiente: "from-slate-900 via-slate-800 to-slate-900 text-white",
    tagCor: "bg-amber-400 text-slate-950",
    imagemUrl: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "banner-3",
    badge: "INDIQUE & GANHE",
    titulo: "Ganhe R$ 10 em cada indicação",
    subtitulo: "Convide amigos para usar o Partiu e acumule bônus",
    cupom: "AMIGOPARTIU",
    corGradiente: "from-blue-600 via-indigo-600 to-indigo-800 text-white",
    tagCor: "bg-white text-blue-900",
    imagemUrl: "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=800&auto=format&fit=crop&q=80",
  },
];
