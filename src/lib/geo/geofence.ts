/**
 * ==============================================================================
 * 🌐 PARTIU GEOSPATIAL ENGINE — CLIENT GEOFENCE & GEODESIC MATH
 * ==============================================================================
 * Algoritmos geodésicos de alta precisão e verificação instantânea de Geofencing
 * no cliente (Ray-Casting com pré-filtro de Bounding Box).
 *
 * Utilizado para:
 * - Validação instantânea de Zonas H3 e áreas de Preço Dinâmico (Surge).
 * - Círculos geodésicos reais imunes à distorção Mercator.
 * - Cálculo de área de zonas operacionais.
 * ==============================================================================
 */

export type LngLat = [number, number];

export const EARTH_RADIUS_KM = 6371;
export const EARTH_RADIUS_M = 6371000;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/**
 * Distância esférica do grande círculo em quilômetros (Haversine).
 */
export function haversine(a: LngLat, b: LngLat): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Ângulo de rumo (bearing) inicial de 'a' para 'b' em graus (0–360°).
 */
export function bearing(a: LngLat, b: LngLat): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lng2 - lng1);
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Ponto de destino a partir de uma origem, rumo em graus e distância em km.
 */
export function destination(origin: LngLat, bearingDeg: number, distKm: number): LngLat {
  const [lng, lat] = origin;
  const delta = distKm / EARTH_RADIUS_KM;
  const theta = toRad(bearingDeg);
  const phi1 = toRad(lat);
  const lambda1 = toRad(lng);

  const sinPhi2 = Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta);
  const phi2 = Math.asin(Math.min(1, Math.max(-1, sinPhi2)));
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
      Math.cos(delta) - Math.sin(phi1) * sinPhi2,
    );

  // Normaliza longitude para o intervalo [-180, 180]
  return [((toDeg(lambda2) + 540) % 360) - 180, toDeg(phi2)];
}

/**
 * Retorna o Bounding Box [minLng, minLat, maxLng, maxLat] de um anel.
 */
export function ringBbox(ring: number[][]): [number, number, number, number] {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    if (p[0] < minLng) minLng = p[0];
    if (p[0] > maxLng) maxLng = p[0];
    if (p[1] < minLat) minLat = p[1];
    if (p[1] > maxLat) maxLat = p[1];
  }
  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Ray-Casting (Algoritmo de Jordan) com pré-filtro O(1) de Bounding Box.
 * Determina se a coordenada [lng, lat] está dentro do polígono especificado.
 */
export function pointInPolygon(lng: number, lat: number, ring: number[][]): boolean {
  if (!ring || ring.length < 3) return false;

  // 1. Pré-rejeição ultrarrápida via Bounding Box
  const [minLng, minLat, maxLng, maxLat] = ringBbox(ring);
  if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) {
    return false;
  }

  // 2. Ray-Casting com regra de bordas semi-abertas para estabilidade
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const straddles = (yi > lat) !== (yj > lat);
    if (straddles && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Gera um polígono circular geodésico verdadeiro a partir de um centro e raio em km.
 * Imune à distorção Mercator em diferentes latitudes.
 */
export function circleToRing(center: LngLat, radiusKm: number, steps = 32): number[][] {
  const ring: number[][] = [];
  for (let i = 0; i < steps; i++) {
    ring.push(destination(center, (360 / steps) * i, radiusKm));
  }
  ring.push(ring[0]);
  return ring;
}

/**
 * Calcula a área de um anel poligonal em km² utilizando a fórmula esférica de Chamberlain–Duquette.
 */
export function polygonArea(ring: number[][]): number {
  const n = ring.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const lat1 = toRad(ring[i][1]);
    const lat2 = toRad(ring[j][1]);
    const dLng = toRad(ring[j][0] - ring[i][0]);
    sum += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.abs((sum * EARTH_RADIUS_KM * EARTH_RADIUS_KM) / 2);
}

/**
 * Formata distância para exibição humana compacta (m ou km).
 */
export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
