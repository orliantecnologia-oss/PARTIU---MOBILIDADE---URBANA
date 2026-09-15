/**
 * ==============================================================================
 * 🧭 PARTIU NAVIGATION ENGINE — LIVE GUIDANCE & ROUTE SNAPPING
 * ==============================================================================
 * Motor de navegação curva a curva para o aplicativo do condutor.
 *
 * Principais recursos:
 * 1. Projeção ortogonal no segmento da rota (snapToRoute) — elimina saltos
 *    e desalinhamentos do veículo em relação à via.
 * 2. Pré-cálculo cumulativo de vértices (cumulativeDistances) para cálculos O(1).
 * 3. Detecção precisa de desvio de rota (offRoute > 45m) e chegada (arrived <= 35m).
 * 4. Máquina de estados de anúncios curva a curva (Turn-by-Turn Spoken Guidance)
 *    com bandas de 1000m, 400m, 150m e 30m calibrada para Português (Brasil).
 * 5. Extração da via principal ("Via Av. Paulista") e decodificador de polylines.
 * ==============================================================================
 */

export interface NavStep {
  instruction: string;
  distance: number; // metros
  duration: number; // segundos
  location: [number, number]; // [lng, lat]
  type: string;
}

export interface NavFix {
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
}

export interface NavProgress {
  /** Índice da manobra atual à frente */
  stepIndex: number;
  /** Metros até a próxima manobra */
  distanceToStep: number;
  /** Metros restantes até o destino ao longo da rota */
  distanceRemaining: number;
  /** Segundos restantes estimados */
  durationRemaining: number;
  /** Desvio perpendicular em metros entre o GPS e a linha da rota */
  deviation: number;
  /** Verdadeiro se o desvio ultrapassar o limite seguro (45m) */
  offRoute: boolean;
  /** Verdadeiro se estiver dentro do raio de chegada do destino (35m) */
  arrived: boolean;
  /** Ponto GPS projetado com precisão milimétrica sobre a via [lng, lat] */
  snapped: [number, number];
  /** Fração concluída da corrida (0.0 a 1.0) */
  fraction: number;
}

const R = 6371000; // Raio médio da Terra em metros

/** Escala local de metros por grau de latitude/longitude */
function scale(lat: number): { mx: number; my: number } {
  const p = Math.PI / 180;
  return { mx: Math.cos(lat * p) * R * p, my: R * p };
}

/**
 * Distância rápida em metros via aproximação equirretangular local.
 */
export function distanceM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const { mx, my } = scale((aLat + bLat) / 2);
  const dx = (bLng - aLng) * mx;
  const dy = (bLat - aLat) * my;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Distâncias acumuladas ao longo de cada vértice da rota.
 * Permite que a navegação seja uma busca indexada e não um escaneamento completo O(N).
 */
export function cumulativeDistances(coords: [number, number][]): number[] {
  const out = new Array(coords.length).fill(0);
  for (let i = 1; i < coords.length; i++) {
    out[i] = out[i - 1] + distanceM(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]);
  }
  return out;
}

/**
 * Projeta a posição GPS ortogonalmente no segmento mais próximo da rota.
 * Calcula a distância perpendicular real até a linha do segmento (e não até o vértice),
 * prevenindo erros em retas longas com vértices espaçados.
 */
export function snapToRoute(
  coords: [number, number][],
  lat: number,
  lng: number,
  cum?: number[],
): { index: number; deviation: number; along: number; point: [number, number] } {
  if (coords.length === 0) return { index: 0, deviation: 0, along: 0, point: [lng, lat] };
  if (coords.length === 1) {
    return {
      index: 0,
      deviation: distanceM(lat, lng, coords[0][1], coords[0][0]),
      along: 0,
      point: coords[0],
    };
  }

  const { mx, my } = scale(lat);
  const px = lng * mx;
  const py = lat * my;

  let best = { index: 0, deviation: Infinity, t: 0 };
  for (let i = 0; i < coords.length - 1; i++) {
    const ax = coords[i][0] * mx, ay = coords[i][1] * my;
    const bx = coords[i + 1][0] * mx, by = coords[i + 1][1] * my;
    const vx = bx - ax, vy = by - ay;
    const len2 = vx * vx + vy * vy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len2));
    const cx = ax + t * vx, cy = ay + t * vy;
    const d = Math.hypot(px - cx, py - cy);
    if (d < best.deviation) best = { index: i, deviation: d, t };
  }

  const a = coords[best.index];
  const b = coords[best.index + 1];
  const point: [number, number] = [
    a[0] + (b[0] - a[0]) * best.t,
    a[1] + (b[1] - a[1]) * best.t,
  ];
  const c = cum ?? cumulativeDistances(coords);
  const segLen = c[best.index + 1] - c[best.index];
  return { index: best.index, deviation: best.deviation, along: c[best.index] + segLen * best.t, point };
}

/**
 * Posição ao longo da rota para cada etapa/manobra.
 */
export function stepPositions(coords: [number, number][], steps: NavStep[], cum?: number[]): number[] {
  const c = cum ?? cumulativeDistances(coords);
  return steps.map((s) => snapToRoute(coords, s.location[1], s.location[0], c).along);
}

/** Limite de desvio em metros para considerar saída de rota (45m) */
export const OFF_ROUTE_THRESHOLD_M = 45;
/** Limite de raio em metros para considerar chegada ao destino (35m) */
export const ARRIVAL_THRESHOLD_M = 35;

/**
 * Calcula o progresso em tempo real da navegação do motorista.
 */
export function computeProgress(
  coords: [number, number][],
  steps: NavStep[],
  stepAlong: number[],
  totalDuration: number,
  fix: NavFix,
  cum?: number[],
): NavProgress {
  const c = cum ?? cumulativeDistances(coords);
  const snap = snapToRoute(coords, fix.lat, fix.lng, c);
  const total = c[c.length - 1] || 0;
  const remaining = Math.max(0, total - snap.along);

  // Primeira manobra ainda à frente
  let stepIndex = stepAlong.findIndex((a) => a > snap.along + 1);
  if (stepIndex === -1) stepIndex = Math.max(0, steps.length - 1);

  const distanceToStep = Math.max(0, (stepAlong[stepIndex] ?? total) - snap.along);
  const fraction = total > 0 ? Math.min(1, snap.along / total) : 0;

  const destination = coords[coords.length - 1];
  const toDestination = distanceM(fix.lat, fix.lng, destination[1], destination[0]);

  return {
    stepIndex,
    distanceToStep,
    distanceRemaining: remaining,
    durationRemaining: total > 0 ? Math.round(totalDuration * (remaining / total)) : 0,
    deviation: snap.deviation,
    offRoute: snap.deviation > OFF_ROUTE_THRESHOLD_M,
    arrived: toDestination <= ARRIVAL_THRESHOLD_M || remaining <= ARRIVAL_THRESHOLD_M,
    snapped: snap.point,
    fraction,
  };
}

/**
 * Bandas de distância (em metros) para anunciar manobras ao condutor.
 */
export const ANNOUNCE_BANDS = [1000, 400, 150, 30] as const;

/**
 * Identifica a faixa de proximidade mais próxima para anúncio.
 */
export function announcementBand(distance: number): number | null {
  let match: number | null = null;
  for (const b of ANNOUNCE_BANDS) {
    if (distance <= b && (match === null || b < match)) match = b;
  }
  return match;
}

/**
 * Formata o texto de voz da instrução para Português (Brasil).
 */
export function announcementText(instruction: string, band: number): string {
  const clean = instruction.trim().replace(/\.$/, '');
  if (band <= 30) {
    return clean;
  }
  if (band < 1000) {
    return `Em ${band} metros, ${clean.charAt(0).toLowerCase()}${clean.slice(1)}`;
  }
  return `Em 1 quilômetro, ${clean.charAt(0).toLowerCase()}${clean.slice(1)}`;
}

/**
 * Avalia se a manobra deve ser verbalizada evitando repetições sonoras.
 */
export function shouldAnnounce(
  stepIndex: number,
  distance: number,
  spoken: Record<number, number>,
): number | null {
  const band = announcementBand(distance);
  if (band === null) return null;
  const last = spoken[stepIndex];
  if (last !== undefined && last <= band) return null;
  return band;
}

/**
 * Identifica a via principal na qual a rota passa mais tempo ("Via Av. Brasil").
 */
export function viaRoad(steps: NavStep[]): string | null {
  let best: { road: string; dist: number } | null = null;
  for (const s of steps) {
    const m = s.instruction.match(/\b(?:em|na|no|pela|pelo|onto|on)\s+(.+?)(?:\.|,|$)/i);
    if (!m) continue;
    const road = m[1].trim().replace(/\s+/g, ' ');
    if (!road || road.length < 3) continue;
    if (!best || s.distance > best.dist) best = { road, dist: s.distance };
  }
  return best?.road ?? null;
}

/**
 * Decodifica polylines compactadas com precisão configurável (5 para OSRM / Google, 6 para Valhalla).
 */
export function decodePolyline(encoded: string, precision = 5): [number, number][] {
  const factor = Math.pow(10, precision);
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lng / factor, lat / factor]);
  }

  return coords;
}
