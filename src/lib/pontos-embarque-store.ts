export type TipoPontoEmbarque =
  | "terminal_rodoviario"
  | "posto_combustivel"
  | "trevo_rodoviario"
  | "praca_central"
  | "ponto_urbano_vip";

export interface PontoEmbarqueConfig {
  id: string;
  nome: string; // Ex: "Maceió (Trevo do Tabuleiro • Makro)"
  cidade: string; // "Maceió"
  linhaAssociada: string; // "Igreja Nova ➔ Maceió" ou "Todas"
  tipo: TipoPontoEmbarque;
  tipoRotulo: string; // "Posto com Apoio & Lanchonete"
  referencia: string; // "Avenida Fernandes Lima, em frente à passarela / Makro"
  enderecoCompleto: string;
  comodidades: string[]; // ["🛡️ Segurança 24h", "🚻 Banheiro", "☕ Lanchonete", "🛋️ Abrigo Coberto", "🛰️ Wi-Fi"]
  minutosAposSaida: number; // Minutos desde a partida da van
  distanciaKmEstimada: number;
  fotoUrl: string;
  lat?: number | undefined;
  lng?: number | undefined;
  ativo: boolean;
  ordem: number;
  observacaoOperacional?: string;
}

export const PONTOS_EMBARQUE_PADRAO: PontoEmbarqueConfig[] = [
  {
    id: "emb-mcz-01",
    lat: -9.6,
    lng: -35.75,
    nome: "Maceió • Trevo do Tabuleiro",
    cidade: "Maceió",
    linhaAssociada: "Todas",
    tipo: "trevo_rodoviario",
    tipoRotulo: "Trevo Rodoviário Estratégico",
    referencia: "Av. Fernandes Lima / Antigo Makro",
    enderecoCompleto: "Av. Fernandes Lima, s/n - Tabuleiro dos Martins, Maceió - AL",
    comodidades: [
      "🛋️ Abrigo Coberto",
      "🛡️ Ponto Iluminado",
      "☕ Café & Conveniência",
      "🛰️ Wi-Fi Starlink",
    ],
    minutosAposSaida: 8,
    distanciaKmEstimada: 3.2,
    fotoUrl:
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=300&auto=format&fit=crop&q=80",
    ativo: true,
    ordem: 1,
    observacaoOperacional: "A van para no recuo lateral seguro para embarque de passageiros.",
  },
  {
    id: "emb-mcz-02",
    lat: -9.6459,
    lng: -35.7255,
    nome: "Maceió • Terminal Rodoviário (Feitosa)",
    cidade: "Maceió",
    linhaAssociada: "Todas",
    tipo: "terminal_rodoviario",
    tipoRotulo: "Terminal Rodoviário Oficial",
    referencia: "Terminal João Paulo II • Plataforma Executiva",
    enderecoCompleto: "Av. Leste-Oeste, Feitosa, Maceió - AL",
    comodidades: [
      "🛋️ Sala de Espera VIP",
      "🚻 Banheiros Limpos",
      "☕ Praça de Alimentação",
      "🛡️ Segurança 24h",
    ],
    minutosAposSaida: 0,
    distanciaKmEstimada: 1.5,
    fotoUrl:
      "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=300&auto=format&fit=crop&q=80",
    ativo: true,
    ordem: 2,
  },
  {
    id: "emb-ign-01",
    nome: "Igreja Nova • Terminal Central",
    cidade: "Igreja Nova",
    linhaAssociada: "Igreja Nova ➔ Maceió",
    tipo: "terminal_rodoviario",
    tipoRotulo: "Terminal Central",
    referencia: "Praça Agapito Soares • Em frente à Matriz",
    enderecoCompleto: "Praça Agapito Soares, Centro, Igreja Nova - AL",
    comodidades: ["🛋️ Bancos Cobertos", "☕ Lanchonete Central", "🛡️ Ponto Seguro"],
    minutosAposSaida: 0,
    distanciaKmEstimada: 0.8,
    fotoUrl:
      "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=300&auto=format&fit=crop&q=80",
    ativo: true,
    ordem: 3,
  },
  {
    id: "emb-cor-01",
    nome: "Coruripe • Praça Central & Rodoviária",
    cidade: "Coruripe",
    linhaAssociada: "Igreja Nova ➔ Maceió",
    tipo: "praca_central",
    tipoRotulo: "Ponto Central Urbano",
    referencia: "AL-349 • Próximo ao Centro Comercial",
    enderecoCompleto: "Av. Linduarte Batista, Centro, Coruripe - AL",
    comodidades: ["☕ Padaria & Conveniência", "🛋️ Cobertura", "🚻 Banheiros"],
    minutosAposSaida: 45,
    distanciaKmEstimada: 5.4,
    fotoUrl:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&auto=format&fit=crop&q=80",
    ativo: true,
    ordem: 4,
  },
  {
    id: "emb-bsm-01",
    nome: "Barra de São Miguel • Trevo Posto Shell",
    cidade: "Barra de São Miguel",
    linhaAssociada: "Todas",
    tipo: "posto_combustivel",
    tipoRotulo: "Posto de Apoio com Conveniência",
    referencia: "AL-101 Sul • Posto Shell da Entrada",
    enderecoCompleto: "Rodovia AL-101 Sul, Trevo da Barra, Barra de São Miguel - AL",
    comodidades: ["☕ Loja de Conveniência", "🚻 Banheiro", "🛡️ Vigilância 24h", "⛽ Posto Shell"],
    minutosAposSaida: 75,
    distanciaKmEstimada: 2.1,
    fotoUrl:
      "https://images.unsplash.com/photo-1527018606416-a674e140c03f?w=300&auto=format&fit=crop&q=80",
    ativo: true,
    ordem: 5,
  },
  {
    id: "emb-mde-01",
    nome: "Marechal Deodoro • Trevo do Francês",
    cidade: "Marechal Deodoro",
    linhaAssociada: "Todas",
    tipo: "trevo_rodoviario",
    tipoRotulo: "Trevo do Francês",
    referencia: "Posto Shell da Rotatória da Praia do Francês",
    enderecoCompleto: "AL-101 Sul, Rotatória do Francês, Marechal Deodoro - AL",
    comodidades: ["☕ Restaurante & Lanches", "🛋️ Parada Coberta", "🚻 Banheiro"],
    minutosAposSaida: 85,
    distanciaKmEstimada: 4.8,
    fotoUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80",
    ativo: true,
    ordem: 6,
  },
  {
    id: "emb-ara-01",
    nome: "Arapiraca • Terminal Urbano do Centro",
    cidade: "Arapiraca",
    linhaAssociada: "Maceió ⇄ Arapiraca",
    tipo: "terminal_rodoviario",
    tipoRotulo: "Terminal Central",
    referencia: "Praça Marques da Silva",
    enderecoCompleto: "Centro, Arapiraca - AL",
    comodidades: ["🛋️ Sala de Espera", "☕ Cafeteria", "🚻 Banheiros", "🛡️ Segurança"],
    minutosAposSaida: 0,
    distanciaKmEstimada: 1.2,
    fotoUrl:
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=300&auto=format&fit=crop&q=80",
    ativo: true,
    ordem: 7,
  },
  {
    id: "emb-pen-01",
    nome: "Penedo • Terminal das Balsas (São Francisco)",
    cidade: "Penedo",
    linhaAssociada: "Todas",
    tipo: "ponto_urbano_vip",
    tipoRotulo: "Orla Histórica & Porto",
    referencia: "Orla do Rio São Francisco",
    enderecoCompleto: "Av. Beira Rio, Centro Histórico, Penedo - AL",
    comodidades: ["🛋️ Bancos na Orla", "☕ Lanchonete", "🛡️ Área Turística Segura"],
    minutosAposSaida: 30,
    distanciaKmEstimada: 0.9,
    fotoUrl:
      "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=300&auto=format&fit=crop&q=80",
    ativo: true,
    ordem: 8,
  },
];

const STORAGE_KEY = "univans_pontos_embarque_config";

export function getPontosEmbarqueConfig(): PontoEmbarqueConfig[] {
  if (typeof window === "undefined") return PONTOS_EMBARQUE_PADRAO;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PONTOS_EMBARQUE_PADRAO));
      return PONTOS_EMBARQUE_PADRAO;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return PONTOS_EMBARQUE_PADRAO;
  } catch {
    return PONTOS_EMBARQUE_PADRAO;
  }
}

export function salvarPontoEmbarque(ponto: PontoEmbarqueConfig): PontoEmbarqueConfig[] {
  const atuais = getPontosEmbarqueConfig();
  const index = atuais.findIndex((p) => p.id === ponto.id);
  let atualizados: PontoEmbarqueConfig[];

  if (index >= 0) {
    atualizados = atuais.map((p) => (p.id === ponto.id ? ponto : p));
  } else {
    atualizados = [ponto, ...atuais];
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(atualizados));
    } catch (e) {
      console.error("Erro ao salvar pontos de embarque:", e);
    }
  }

  return atualizados;
}

export function removerPontoEmbarque(id: string): PontoEmbarqueConfig[] {
  const atuais = getPontosEmbarqueConfig();
  const atualizados = atuais.filter((p) => p.id !== id);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(atualizados));
    } catch (e) {
      console.error("Erro ao remover ponto de embarque:", e);
    }
  }
  return atualizados;
}

export function toggleAtivoPontoEmbarque(id: string): PontoEmbarqueConfig[] {
  const atuais = getPontosEmbarqueConfig();
  const atualizados = atuais.map((p) => (p.id === id ? { ...p, ativo: !p.ativo } : p));
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(atualizados));
    } catch (e) {
      console.error("Erro ao alterar status do ponto:", e);
    }
  }
  return atualizados;
}

export function resetarPontosEmbarquePadrao(): PontoEmbarqueConfig[] {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PONTOS_EMBARQUE_PADRAO));
    } catch (e) {
      console.error("Erro ao resetar pontos de embarque:", e);
    }
  }
  return PONTOS_EMBARQUE_PADRAO;
}
