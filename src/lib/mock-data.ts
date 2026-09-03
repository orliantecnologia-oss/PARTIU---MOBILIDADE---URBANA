export type Van = {
  id: string;
  motorista: string;
  placa: string;
  modelo: string;
  rating: number;
  Vagas: number;
  chegadaMin: number;
  starlink: "online" | "fraco" | "offline";
};

export type Rota = {
  id: string;
  origem: string;
  destino: string;
  preco: number;
  duracaoMin: number;
  tipo: "rapido" | "economico";
  saida: string;
};

export const vansProximas: Van[] = [
  {
    id: "v1",
    motorista: "Carlos Eduardo Santos",
    placa: "RJP-2F14",
    modelo: "Sprinter 516 CDI Executive VIP",
    rating: 4.95,
    Vagas: 5,
    chegadaMin: 4,
    starlink: "online",
  },
  {
    id: "v2",
    motorista: "Fernando Costa",
    placa: "LVK-7C22",
    modelo: "Renault Master Executive L3H2",
    rating: 4.92,
    Vagas: 3,
    chegadaMin: 8,
    starlink: "online",
  },
  {
    id: "v3",
    motorista: "Antônio Marcos Ferreira",
    placa: "MTQ-9J07",
    modelo: "Sprinter 416 CDI Turismo",
    rating: 4.88,
    Vagas: 7,
    chegadaMin: 14,
    starlink: "online",
  },
];

export const rotas: Rota[] = [
  {
    id: "r1",
    origem: "Maceió (Terminal Rodoviário)",
    destino: "Arapiraca (Terminal Urbano)",
    preco: 35.0,
    duracaoMin: 135,
    tipo: "rapido",
    saida: "14:00",
  },
  {
    id: "r2",
    origem: "Igreja Nova (Terminal Central)",
    destino: "Maceió (Feitosa)",
    preco: 38.0,
    duracaoMin: 168,
    tipo: "economico",
    saida: "14:30",
  },
];

export const historico = [
  { id: "h1", trajeto: "Maceió → Arapiraca", data: "Hoje", valor: 35.0, status: "Concluída" },
  { id: "h2", trajeto: "Tapera → Toritama", data: "Ontem", valor: 60.0, status: "Concluída" },
  { id: "h3", trajeto: "Igreja Nova → Maceió", data: "28 ago", valor: 38.0, status: "Concluída" },
];

export function brl(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
