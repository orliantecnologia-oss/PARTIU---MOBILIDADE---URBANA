/**
 * ==============================================================================
 * 📍 PARTIU — SMART PICKUP POINTS ENGINE (PONTOS ESTRATÉGICOS DE EMBARQUE)
 * ==============================================================================
 * Identifica e gera pontos de encontro seguros, esquinas de fácil acesso e
 * baias de parada próximas à localização atual do passageiro.
 *
 * Princípios de Design:
 * - Evitar paradas perigosas ou vias de trânsito rápido sem recuo.
 * - Priorizar locais iluminados, esquinas amplas e pontos de referência reconhecidos.
 * - Indicar tempo de caminhada a pé (~80 metros/minuto).
 * ==============================================================================
 */

export type SmartPickupType = "esquina" | "avenida" | "referencia" | "seguro";

export interface StrategicPickupPoint {
  id: string;
  nome: string;
  endereco: string;
  descricao: string;
  tipo: SmartPickupType;
  coords: [number, number]; // [lng, lat]
  distanciaMetros: number;
  tempoCaminhadaMin: number;
  badge: string;
}

// Catálogo curado de pontos de referência e paradas estratégicas em Itaperuna, RJ
const PONTOS_ESTRATEGICOS_BASE = [
  {
    id: "sp-dutra-buarque",
    nome: "Esquina Av. Pres. Dutra x Buarque de Nazareth",
    endereco: "Av. Presidente Dutra, 390 - Centro",
    descricao: "Calçada ampla com recuo para embarque rápido sem trancar o trânsito",
    tipo: "esquina" as const,
    offset: [0.0007, 0.0004], // ~65m
    badge: "Esquina de Fácil Parada",
  },
  {
    id: "sp-shell-camelos",
    nome: "Posto Shell / Praça dos Camelôs",
    endereco: "Rua Buarque de Nazareth, 112 - Centro",
    descricao: "Área bem iluminada com baia de parada e alta visibilidade",
    tipo: "seguro" as const,
    offset: [-0.0008, 0.0006], // ~100m
    badge: "Ponto Seguro e Iluminado",
  },
  {
    id: "sp-sao-jose-avai",
    nome: "Baia do Hospital São José do Avaí",
    endereco: "Rua Coronel Luís Ferraz, 397 - Centro",
    descricao: "Baia oficial de embarque e desembarque, fora da faixa de retenção",
    tipo: "referencia" as const,
    offset: [0.0012, -0.0009], // ~150m
    badge: "Ponto de Referência",
  },
  {
    id: "sp-cardoso-dez-maio",
    nome: "Av. Cardoso Moreira x Rua Dez de Maio",
    endereco: "Av. Cardoso Moreira, 510 - Centro",
    descricao: "Esquina sinalizada com recuo para parada curta de veículos",
    tipo: "avenida" as const,
    offset: [-0.0005, -0.0011], // ~130m
    badge: "Avenida Principal",
  },
  {
    id: "sp-rodoviaria-app",
    nome: "Rodoviária - Plataforma de Carros por Aplicativo",
    endereco: "Av. Presidente Dutra, s/n - Cidade Nova",
    descricao: "Ponto designado para embarque de passageiros de aplicativo",
    tipo: "seguro" as const,
    offset: [0.0016, 0.0014], // ~230m
    badge: "Ponto Oficial",
  },
];

/**
 * Calcula distância geodésica aproximada em metros entre dois pontos [lng, lat]
 */
export function calcularDistanciaMetros(
  p1: [number, number],
  p2: [number, number]
): number {
  const [lng1, lat1] = p1;
  const [lng2, lat2] = p2;
  const R = 6371000; // Raio da terra em metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Retorna os pontos estratégicos de embarque próximos às coordenadas do usuário
 * @param currentLocation Coordenadas atuais [lng, lat]
 */
export function getStrategicPickupPoints(
  currentLocation: [number, number] = [-41.8880, -21.2050]
): StrategicPickupPoint[] {
  const [currentLng, currentLat] = currentLocation;

  const points: StrategicPickupPoint[] = PONTOS_ESTRATEGICOS_BASE.map((base) => {
    // Coordenadas calculadas baseadas no offset contextual ao redor da localização do usuário
    const offLng = base.offset[0] ?? 0;
    const offLat = base.offset[1] ?? 0;
    const coords: [number, number] = [
      Number((currentLng + offLng).toFixed(6)),
      Number((currentLat + offLat).toFixed(6)),
    ];

    const distanciaMetros = Math.max(35, calcularDistanciaMetros(currentLocation, coords));
    // Velocidade de caminhada média de 80 metros por minuto
    const tempoCaminhadaMin = Math.max(1, Math.round(distanciaMetros / 80));

    return {
      id: base.id,
      nome: base.nome,
      endereco: base.endereco,
      descricao: base.descricao,
      tipo: base.tipo,
      coords,
      distanciaMetros,
      tempoCaminhadaMin,
      badge: base.badge,
    };
  });

  // Ordena pelo ponto mais próximo do usuário
  return points.sort((a, b) => a.distanciaMetros - b.distanciaMetros);
}
