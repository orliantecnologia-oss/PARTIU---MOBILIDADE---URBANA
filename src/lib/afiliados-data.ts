export interface ProdutoAfiliado {
  id: string;
  titulo: string;
  loja: "shopee" | "mercadolivre";
  preco: number;
  precoOriginal?: number;
  desconto?: string;
  imagem: string;
  categoria: "viagem" | "acessorios_van" | "eletronicos" | "moda";
  linkAfiliado: string;
  avaliacao: number;
  vendas: string;
  comissaoEstimada: string;
  ativo: boolean;
}

export interface VideoShop {
  id: string;
  titulo: string;
  descricao: string;
  loja: "shopee" | "mercadolivre";
  thumbnail: string;
  videoUrl: string;
  produtoId: string;
  produtoNome: string;
  preco: number;
  linkAfiliado: string;
  likes: number;
}

export interface ConfigAfiliados {
  shopeeAppId: string;
  shopeeSecretKey: string;
  shopeeAffiliateTag: string;
  shopeeAtivo: boolean;
  meliClientId: string;
  meliClientSecret: string;
  meliAffiliateTag: string;
  meliAtivo: boolean;
  bannerPrincipalAtivo: boolean;
}

export const configAfiliadosInicial: ConfigAfiliados = {
  shopeeAppId: "shp_live_98412847192",
  shopeeSecretKey: "••••••••••••••••••••••••",
  shopeeAffiliateTag: "univans-shopee-20",
  shopeeAtivo: true,
  meliClientId: "meli_prod_664192841",
  meliClientSecret: "••••••••••••••••••••••••",
  meliAffiliateTag: "univans-meli-2026",
  meliAtivo: true,
  bannerPrincipalAtivo: true,
};

export const produtosAfiliadosIniciais: ProdutoAfiliado[] = [
  {
    id: "prod-1",
    titulo: "Almofada de Pescoço Espuma Viscoelástica c/ Suporte Ergonômico de Viagem",
    loja: "shopee",
    preco: 34.9,
    precoOriginal: 59.9,
    desconto: "-42%",
    imagem:
      "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500&auto=format&fit=crop&q=80",
    categoria: "viagem",
    linkAfiliado: "https://shopee.com.br/universal-link?aff_id=univans",
    avaliacao: 4.9,
    vendas: "3.4k vendidos",
    comissaoEstimada: "12%",
    ativo: true,
  },
  {
    id: "prod-2",
    titulo: "Suporte Veicular Celular Magnético Universal com Rotação 360° para Vans",
    loja: "mercadolivre",
    preco: 42.5,
    precoOriginal: 68.0,
    desconto: "-37%",
    imagem:
      "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=500&auto=format&fit=crop&q=80",
    categoria: "acessorios_van",
    linkAfiliado: "https://mercadolivre.com.br/sec/univans-afiliados",
    avaliacao: 4.8,
    vendas: "1.8k vendidos",
    comissaoEstimada: "9%",
    ativo: true,
  },
  {
    id: "prod-3",
    titulo: "Carregador Veicular Rápido USB-C Turbo 65W Metal para Passageiros",
    loja: "shopee",
    preco: 29.9,
    precoOriginal: 49.9,
    desconto: "-40%",
    imagem:
      "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&auto=format&fit=crop&q=80",
    categoria: "eletronicos",
    linkAfiliado: "https://shopee.com.br/universal-link?aff_id=univans",
    avaliacao: 4.9,
    vendas: "5.1k vendidos",
    comissaoEstimada: "14%",
    ativo: true,
  },
  {
    id: "prod-4",
    titulo: "Mochila Executiva Impermeável Antifurto c/ Entrada USB p/ Viagens Curtas",
    loja: "mercadolivre",
    preco: 119.9,
    precoOriginal: 189.9,
    desconto: "-36%",
    imagem:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=80",
    categoria: "viagem",
    linkAfiliado: "https://mercadolivre.com.br/sec/univans-afiliados",
    avaliacao: 5.0,
    vendas: "890 vendidos",
    comissaoEstimada: "10%",
    ativo: true,
  },
  {
    id: "prod-5",
    titulo: "Kit 50 Cabides de Veludo Antideslizante para Compras no Moda Center Santa Cruz",
    loja: "shopee",
    preco: 69.9,
    precoOriginal: 99.0,
    desconto: "-29%",
    imagem:
      "https://images.unsplash.com/photo-1591085686350-798c0f9faa7f?w=500&auto=format&fit=crop&q=80",
    categoria: "moda",
    linkAfiliado: "https://shopee.com.br/universal-link?aff_id=univans",
    avaliacao: 4.8,
    vendas: "2.2k vendidos",
    comissaoEstimada: "11%",
    ativo: true,
  },
  {
    id: "prod-6",
    titulo: "Garrafa Térmica Inox 1 Litro com Display Digital de Temperatura LED",
    loja: "mercadolivre",
    preco: 48.9,
    precoOriginal: 79.9,
    desconto: "-38%",
    imagem:
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&auto=format&fit=crop&q=80",
    categoria: "viagem",
    linkAfiliado: "https://mercadolivre.com.br/sec/univans-afiliados",
    avaliacao: 4.9,
    vendas: "4.7k vendidos",
    comissaoEstimada: "8.5%",
    ativo: true,
  },
];

export const videosShopIniciais: VideoShop[] = [
  {
    id: "vid-1",
    titulo: "Achadinhos para Viagem de Van na Shopee 🚐✨",
    descricao:
      "Olha essa almofada de pescoço com memória! Salvou minha viagem de Maceió para Arapiraca.",
    loja: "shopee",
    thumbnail:
      "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500&auto=format&fit=crop&q=80",
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-traveling-by-bus-in-the-city-4098-large.mp4",
    produtoId: "prod-1",
    produtoNome: "Almofada de Pescoço Espuma Viscoelástica",
    preco: 34.9,
    linkAfiliado: "https://shopee.com.br/universal-link?aff_id=univans",
    likes: 1240,
  },
  {
    id: "vid-2",
    titulo: "Compras no Moda Center Santa Cruz & Caruaru 🛍️",
    descricao: "Dicas dos melhores produtos e acessórios para carregar suas compras no bagageiro.",
    loja: "mercadolivre",
    thumbnail:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=80",
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-people-walking-in-a-crowded-market-42998-large.mp4",
    produtoId: "prod-4",
    produtoNome: "Mochila Executiva Impermeável Antifurto",
    preco: 119.9,
    linkAfiliado: "https://mercadolivre.com.br/sec/univans-afiliados",
    likes: 890,
  },
];

const LOCAL_STORAGE_KEY_CONFIG = "univans_afiliados_config";
const LOCAL_STORAGE_KEY_PRODUTOS = "univans_afiliados_produtos";

export function getAfiliadosConfig(): ConfigAfiliados {
  if (typeof window === "undefined") return configAfiliadosInicial;
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY_CONFIG);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return configAfiliadosInicial;
    }
  }
  return configAfiliadosInicial;
}

export function saveAfiliadosConfig(config: ConfigAfiliados) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_KEY_CONFIG, JSON.stringify(config));
  }
}

export function getProdutosAfiliados(): ProdutoAfiliado[] {
  if (typeof window === "undefined") return produtosAfiliadosIniciais;
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PRODUTOS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return produtosAfiliadosIniciais;
    }
  }
  return produtosAfiliadosIniciais;
}

export function saveProdutosAfiliados(produtos: ProdutoAfiliado[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_KEY_PRODUTOS, JSON.stringify(produtos));
  }
}
