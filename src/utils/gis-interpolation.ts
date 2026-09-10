/**
 * ==============================================================================
 * 📐 PARTIU — GIS & SMOOTH POLYLINE INTERPOLATION ENGINE
 * ==============================================================================
 * Motor matemático e geoespacial de alta performance (sem dependências pesadas):
 * - Conversão de coordenadas para WKT PostGIS Geography(Point, 4326).
 * - Snap to Route: projeta coordenadas GPS ruidosas exatamente sobre a rua.
 * - Interpolação suave (Lerp along route) para evitar saltos visuais no mapa.
 * - Cálculo de Azimute / Heading tangencial da via para alinhar o bico do veículo.
 * ==============================================================================
 */

const EARTH_RADIUS_METERS = 6371008.8;

/**
 * Converte [longitude, latitude] para representação WKT PostGIS Geography Point
 * Ex: [-41.888, -21.205] -> "POINT(-41.888 -21.205)"
 */
export function toPostGISPoint(coords: [number, number]): string {
  if (!coords || coords.length < 2) return "POINT(0 0)";
  return `POINT(${coords[0]} ${coords[1]})`;
}

/**
 * Converte [longitude, latitude] para formato SRID PostGIS
 */
export function toPostGISSridPoint(coords: [number, number]): string {
  return `SRID=4326;POINT(${coords[0]} ${coords[1]})`;
}

/**
 * Decodifica WKT "POINT(lng lat)" para tupla [lng, lat]
 */
export function fromPostGISPoint(wkt: string): [number, number] | null {
  if (!wkt) return null;
  const match = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (!match) return null;
  return [parseFloat(match[1]), parseFloat(match[2])];
}

/**
 * Distância geodésica em metros (Fórmula de Haversine)
 */
export function haversineDistanceMeters(p1: [number, number], p2: [number, number]): number {
  const [lng1, lat1] = p1;
  const [lng2, lat2] = p2;

  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Calcula o azimute / heading geográfico (0° a 360°) de p1 para p2
 */
export function calculateBearing(p1: [number, number], p2: [number, number]): number {
  const [lng1, lat1] = p1;
  const [lng2, lat2] = p2;

  const y1 = (lat1 * Math.PI) / 180;
  const y2 = (lat2 * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(y2);
  const x = Math.cos(y1) * Math.sin(y2) - Math.sin(y1) * Math.cos(y2) * Math.cos(dLng);

  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Projeta um ponto p sobre o segmento viário [a, b]
 */
export function pointToSegmentProjection(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): { point: [number, number]; distanceMeters: number; t: number } {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;

  const dx = bx - ax;
  const dy = by - ay;

  if (dx === 0 && dy === 0) {
    return {
      point: a,
      distanceMeters: haversineDistanceMeters(p, a),
      t: 0,
    };
  }

  // Projeção escalar com correção de latitude para metros planos locais
  const latFactor = Math.cos(((ay + by) / 2 * Math.PI) / 180);
  const dxMeters = dx * latFactor;
  const dyMeters = dy;

  const dpxMeters = (px - ax) * latFactor;
  const dpyMeters = py - ay;

  const dot = dpxMeters * dxMeters + dpyMeters * dyMeters;
  const lenSq = dxMeters * dxMeters + dyMeters * dyMeters;

  let t = dot / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projPoint: [number, number] = [ax + t * dx, ay + t * dy];
  return {
    point: projPoint,
    distanceMeters: haversineDistanceMeters(p, projPoint),
    t,
  };
}

export interface SnapToRouteResult {
  snappedCoords: [number, number]; // Coordenada projetada na rua
  bearing: number; // Ângulo da via (0-360°)
  distanceFromLineMeters: number; // Distância do GPS até o asfalto
  segmentIndex: number;
  progressPercent: number; // 0.0 a 1.0
}

/**
 * SNAP TO ROUTE:
 * Garante que o ícone do veículo deslize exatamente sobre o traçado da via,
 * impedindo o carro de voar sobre casas ou cortar quarteirões.
 */
export function snapPointToPolyline(
  rawCoords: [number, number],
  routeCoords: [number, number][]
): SnapToRouteResult {
  if (!routeCoords || routeCoords.length === 0) {
    return {
      snappedCoords: rawCoords,
      bearing: 0,
      distanceFromLineMeters: 0,
      segmentIndex: 0,
      progressPercent: 0,
    };
  }

  if (routeCoords.length === 1) {
    return {
      snappedCoords: routeCoords[0],
      bearing: 0,
      distanceFromLineMeters: haversineDistanceMeters(rawCoords, routeCoords[0]),
      segmentIndex: 0,
      progressPercent: 1.0,
    };
  }

  let minDistance = Infinity;
  let bestPoint: [number, number] = routeCoords[0];
  let bestSegmentIndex = 0;
  let bestSegmentBearing = 0;
  let accumulatedDistance = 0;
  let bestDistanceAlongRoute = 0;

  // Calcula comprimentos de cada segmento
  const segmentLengths: number[] = [];
  let totalRouteLength = 0;

  for (let i = 0; i < routeCoords.length - 1; i++) {
    const pA = routeCoords[i];
    const pB = routeCoords[i + 1];
    const len = haversineDistanceMeters(pA, pB);
    segmentLengths.push(len);
    totalRouteLength += len;
  }

  // Procura o segmento mais próximo
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const pA = routeCoords[i];
    const pB = routeCoords[i + 1];
    const proj = pointToSegmentProjection(rawCoords, pA, pB);

    if (proj.distanceMeters < minDistance) {
      minDistance = proj.distanceMeters;
      bestPoint = proj.point;
      bestSegmentIndex = i;
      bestSegmentBearing = calculateBearing(pA, pB);
      bestDistanceAlongRoute = accumulatedDistance + proj.t * segmentLengths[i];
    }

    accumulatedDistance += segmentLengths[i];
  }

  const progressPercent =
    totalRouteLength > 0 ? Math.min(1.0, bestDistanceAlongRoute / totalRouteLength) : 0;

  return {
    snappedCoords: bestPoint,
    bearing: bestSegmentBearing,
    distanceFromLineMeters: minDistance,
    segmentIndex: bestSegmentIndex,
    progressPercent,
  };
}

/**
 * Calcula o comprimento total de uma polyline em metros
 */
export function calculatePolylineLength(coordinates: [number, number][]): number {
  if (!coordinates || coordinates.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    total += haversineDistanceMeters(coordinates[i], coordinates[i + 1]);
  }
  return total;
}

/**
 * Interpola um ponto ao longo de uma polyline a uma distância específica em metros
 */
export function interpolateAlongPolyline(
  coordinates: [number, number][],
  targetDistanceMeters: number
): { coords: [number, number]; bearing: number; finished: boolean } {
  if (!coordinates || coordinates.length === 0) {
    return { coords: [0, 0], bearing: 0, finished: true };
  }
  if (coordinates.length === 1 || targetDistanceMeters <= 0) {
    const bearing = coordinates.length > 1 ? calculateBearing(coordinates[0], coordinates[1]) : 0;
    return { coords: coordinates[0], bearing, finished: false };
  }

  let accumulated = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const pA = coordinates[i];
    const pB = coordinates[i + 1];
    const segLen = haversineDistanceMeters(pA, pB);

    if (accumulated + segLen >= targetDistanceMeters) {
      const remaining = targetDistanceMeters - accumulated;
      const t = segLen > 0 ? remaining / segLen : 0;

      const coords: [number, number] = [
        pA[0] + t * (pB[0] - pA[0]),
        pA[1] + t * (pB[1] - pA[1]),
      ];
      const bearing = calculateBearing(pA, pB);

      return { coords, bearing, finished: false };
    }

    accumulated += segLen;
  }

  const lastIndex = coordinates.length - 1;
  const lastBearing =
    coordinates.length > 1
      ? calculateBearing(coordinates[lastIndex - 1], coordinates[lastIndex])
      : 0;

  return { coords: coordinates[lastIndex], bearing: lastBearing, finished: true };
}

/**
 * Calcula a distância restante ao longo do traçado da rota a partir da posição atual
 */
export function calculateRemainingRouteDistance(
  currentCoords: [number, number],
  routeCoords: [number, number][]
): number {
  if (!routeCoords || routeCoords.length < 2) return 0;
  const snap = snapPointToPolyline(currentCoords, routeCoords);
  const totalLength = calculatePolylineLength(routeCoords);
  const remaining = totalLength * (1 - snap.progressPercent);
  return Math.max(0, Math.round(remaining));
}

