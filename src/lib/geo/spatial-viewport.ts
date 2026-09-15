/**
 * ==============================================================================
 * 🌐 PARTIU — SPATIAL VIEWPORT VIRTUALIZATION ENGINE
 * ==============================================================================
 * Otimização de renderização de alta escala (Padrão Uber / 99):
 * 1. Filtra em O(1) apenas os motoristas e entidades dentro do Bounding Box visível.
 * 2. Aplica margem de buffer (ex: 20-25%) para evitar pop-in nas bordas da tela.
 * 3. Previne o envio de dezenas de milhares de coordenadas distantes para a GPU.
 * ==============================================================================
 */

export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface SpatialPoint {
  id: string;
  longitude: number;
  latitude: number;
  [key: string]: any;
}

/**
 * Expande uma BoundingBox com um fator de margem (ex: 0.25 = 25% de margem ao redor)
 */
export function expandBoundingBox(bbox: BoundingBox, bufferFactor = 0.25): BoundingBox {
  const dLng = Math.abs(bbox.maxLng - bbox.minLng) * bufferFactor;
  const dLat = Math.abs(bbox.maxLat - bbox.minLat) * bufferFactor;

  return {
    minLng: Math.max(-180, bbox.minLng - dLng),
    maxLng: Math.min(180, bbox.maxLng + dLng),
    minLat: Math.max(-85.051129, bbox.minLat - dLat),
    maxLat: Math.min(85.051129, bbox.maxLat + dLat),
  };
}

/**
 * Verifica em O(1) se uma coordenada está dentro da BoundingBox
 */
export function isPointInBoundingBox(lng: number, lat: number, bbox: BoundingBox): boolean {
  return (
    lng >= bbox.minLng &&
    lng <= bbox.maxLng &&
    lat >= bbox.minLat &&
    lat <= bbox.maxLat
  );
}

/**
 * Filtra uma lista massiva de pontos, retornando apenas os visíveis no viewport com buffer
 */
export function filterPointsInViewport<T extends SpatialPoint>(
  points: T[],
  rawBbox: BoundingBox | null | undefined,
  bufferFactor = 0.25
): T[] {
  if (!rawBbox || !Number.isFinite(rawBbox.minLng) || !Number.isFinite(rawBbox.maxLng)) {
    return points;
  }

  const bufferedBbox = expandBoundingBox(rawBbox, bufferFactor);
  return points.filter((p) =>
    isPointInBoundingBox(p.longitude, p.latitude, bufferedBbox)
  );
}

/**
 * Extrai a BoundingBox a partir dos cantos do Mapbox GL (getBounds())
 */
export function getBoundingBoxFromMap(map: any): BoundingBox | null {
  if (!map || typeof map.getBounds !== "function") return null;

  try {
    const bounds = map.getBounds();
    if (!bounds) return null;

    return {
      minLng: bounds.getWest(),
      minLat: bounds.getSouth(),
      maxLng: bounds.getEast(),
      maxLat: bounds.getNorth(),
    };
  } catch {
    return null;
  }
}
