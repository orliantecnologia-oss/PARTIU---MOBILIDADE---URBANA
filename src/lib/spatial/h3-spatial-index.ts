/**
 * ==============================================================================
 * 🔷 PARTIU H3 SPATIAL INDEX ENGINE (UBER H3 CORE)
 * ==============================================================================
 * Wrapper oficial de alta performance construído sobre a biblioteca oficial h3-js.
 * Divide a malha urbana em hexágonos equidistantes perfeitos, eliminando distorções
 * de raios circulares euclidianos.
 *
 * Resoluções padrão de mobilidade urbana (Uber / 99):
 * - Resolução 7: ~1.4 km de raio (Zonas metropolitanas / Macrorregiões)
 * - Resolução 8: ~460 m de raio (Bairros e áreas de despacho agrupado)
 * - Resolução 9: ~170 m de raio (Micro-células de matching de alta precisão)
 * ==============================================================================
 */

import * as h3 from "h3-js";

export const DEFAULT_H3_MATCHING_RESOLUTION = 9; // ~170m
export const DEFAULT_H3_SURGE_RESOLUTION = 8;     // ~460m
export const DEFAULT_H3_MACRO_RESOLUTION = 7;     // ~1.4km

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface H3HexCell {
  cellIndex: string;
  resolution: number;
  center: GeoPoint;
  boundary: GeoPoint[];
}

export class H3SpatialIndex {
  private static instance: H3SpatialIndex;

  private constructor() {}

  public static getInstance(): H3SpatialIndex {
    if (!H3SpatialIndex.instance) {
      H3SpatialIndex.instance = new H3SpatialIndex();
    }
    return H3SpatialIndex.instance;
  }

  /**
   * Converte coordenadas geográficas (lat, lng) para o índice H3 da célula hexagonal
   */
  public latLngToCell(lat: number, lng: number, resolution: number = DEFAULT_H3_MATCHING_RESOLUTION): string {
    return h3.latLngToCell(lat, lng, resolution);
  }

  /**
   * Converte um índice H3 de célula para as coordenadas de seu centróide (lat, lng)
   */
  public cellToLatLng(cellIndex: string): GeoPoint {
    const [lat, lng] = h3.cellToLatLng(cellIndex);
    return { lat, lng };
  }

  /**
   * Retorna os 6 vértices do polígono hexagonal para renderização no mapa (Mapbox/Leaflet)
   * Ordenado como [lat, lng]
   */
  public cellToBoundary(cellIndex: string): GeoPoint[] {
    const coords = h3.cellToBoundary(cellIndex);
    return coords.map(([lat, lng]) => ({ lat, lng }));
  }

  /**
   * Retorna os vértices no formato GeoJSON [longitude, latitude] para camadas Mapbox
   */
  public cellToGeoJsonPolygon(cellIndex: string): [number, number][] {
    const coords = h3.cellToBoundary(cellIndex, true); // true = format as GeoJson [lng, lat]
    // Garante que o polígono feche no primeiro vértice
    if (coords.length > 0) {
      const first = coords[0];
      if (first && (coords[coords.length - 1]?.[0] !== first[0] || coords[coords.length - 1]?.[1] !== first[1])) {
        coords.push([first[0], first[1]]);
      }
    }
    return coords as [number, number][];
  }

  /**
   * Retorna todos os hexágonos vizinhos até k anéis de distância (Disco Hexagonal)
   * k=1: célula central + 6 vizinhos (7 células)
   * k=2: 19 células
   * k=3: 37 células
   * k=4: 61 células
   */
  public gridDisk(cellIndex: string, ringSize: number): string[] {
    return h3.gridDisk(cellIndex, ringSize);
  }

  /**
   * Distância em passos hexagonais entre duas células
   */
  public gridDistance(originCell: string, destinationCell: string): number {
    return h3.gridDistance(originCell, destinationCell);
  }

  /**
   * Verifica se duas células são vizinhas imediatas (compartilham aresta)
   */
  public areNeighborCells(cellA: string, cellB: string): boolean {
    return h3.areNeighborCells(cellA, cellB);
  }

  /**
   * Retorna uma lista ordenada de anéis concêntricos (do anel 0 até o anel maxK)
   * Ideal para disparo progressivo de ondas de despacho (Wave Dispatch)
   */
  public kRingCellsOrdered(originCell: string, maxK: number): string[] {
    const list: string[] = [originCell];
    const visited = new Set<string>([originCell]);

    for (let k = 1; k <= maxK; k++) {
      const disk = h3.gridDisk(originCell, k);
      for (const cell of disk) {
        if (!visited.has(cell)) {
          visited.add(cell);
          list.push(cell);
        }
      }
    }

    return list;
  }

  /**
   * Retorna a resolução de um índice H3
   */
  public getResolution(cellIndex: string): number {
    return h3.getResolution(cellIndex);
  }

  /**
   * Valida se uma string é um identificador H3 válido
   */
  public isValidCell(cellIndex: string): boolean {
    return h3.isValidCell(cellIndex);
  }
}

export const h3SpatialIndex = H3SpatialIndex.getInstance();
