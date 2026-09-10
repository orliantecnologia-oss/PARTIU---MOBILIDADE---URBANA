/**
 * PARTIU H3 SPATIAL INDEX & HEXAGONAL CLUSTERING ENGINE
 * 
 * Implementação algorítmica pura de tesselação hexagonal compatível com a lógica Uber H3.
 * Divide a malha urbana em hexágonos equidistantes, eliminando distorções de raio circular
 * e permitindo balanceamento preciso de liquidez célula a célula.
 */

export interface H3Coord {
  lat: number;
  lng: number;
}

export interface H3CellLiquidity {
  cellIndex: string;
  resolution: number;
  centerCoord: H3Coord;
  motoristasPresentes: number;
  passageirosAguardando: number;
  taxaLiquidez: number; // motoristas / passageiros
  statusLiquidez: 'DEFICIT_CRITICO' | 'DEFICIT_MODERADO' | 'EQUILIBRADO' | 'EXCESSO_OFERTA';
  surgeRecomendado: number;
  densidadeDemanda: number; // 0.0 a 1.0
}

export interface H3HeatmapCell {
  cellIndex: string;
  boundary: H3Coord[]; // 6 vértices do hexágono
  center: H3Coord;
  intensity: number;
  tipo: 'DEMANDA' | 'OFERTA';
}

export class H3SpatialEngine {
  // Constantes de escala por resolução (~área de célula)
  private static readonly RES_SPACING: Record<number, number> = {
    7: 0.015, // ~1.5 km
    8: 0.005, // ~500 metros (Resolução padrão de Matching)
    9: 0.002  // ~180 metros (Micro-hotspots)
  };

  private cellsData: Map<string, {
    motoristasIds: Set<string>;
    passageirosIds: Set<string>;
    resolution: number;
  }> = new Map();

  /**
   * Converte coordenadas geográficas (lat, lng) para índice de célula hexagonal
   */
  public latLngToH3Index(lat: number, lng: number, resolution: number = 8): string {
    const spacing = H3SpatialEngine.RES_SPACING[resolution] || 0.005;
    
    // Projeção axial hexagonal sobre coordenadas planas aproximadas
    const x = (lng * Math.cos(lat * (Math.PI / 180))) / spacing;
    const y = lat / spacing;

    // Matriz de conversão para coordenadas cúbicas de hexágono
    const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y);
    const r = (2 / 3 * y);

    // Arredondamento hexagonal cúbico
    let rx = Math.round(q);
    let ry = Math.round(-q - r);
    let rz = Math.round(r);

    const xDiff = Math.abs(rx - q);
    const yDiff = Math.abs(ry - (-q - r));
    const zDiff = Math.abs(rz - r);

    if (xDiff > yDiff && xDiff > zDiff) {
      rx = -ry - rz;
    } else if (yDiff > zDiff) {
      ry = -rx - rz;
    } else {
      rz = -rx - ry;
    }

    return `h3_res${resolution}_${rx}_${rz}`;
  }

  /**
   * Converte um índice de célula hexagonal para sua coordenada central (lat, lng)
   */
  public h3ToGeo(cellIndex: string): H3Coord {
    const parts = cellIndex.split('_');
    const p1 = parts[1] ?? 'res8';
    const p2 = parts[2] ?? '0';
    const p3 = parts[3] ?? '0';
    const resolution = parseInt(p1.replace('res', ''), 10) || 8;
    const q = parseInt(p2, 10) || 0;
    const r = parseInt(p3, 10) || 0;

    const spacing = H3SpatialEngine.RES_SPACING[resolution] || 0.005;

    const y = (3 / 2 * r) * spacing;
    const lat = y;
    const cosLat = Math.cos(lat * (Math.PI / 180)) || 1;
    const x = (Math.sqrt(3) * (q + r / 2)) * spacing;
    const lng = x / cosLat;

    return {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6))
    };
  }

  /**
   * Retorna os 6 vértices de fronteira para renderização precisa do hexágono no mapa
   */
  public getH3HexagonBoundary(cellIndex: string): H3Coord[] {
    const center = this.h3ToGeo(cellIndex);
    const parts = cellIndex.split('_');
    const p1 = parts[1] ?? 'res8';
    const resolution = parseInt(p1.replace('res', ''), 10) || 8;
    const radius = (H3SpatialEngine.RES_SPACING[resolution] || 0.005) * 0.58;

    const boundary: H3Coord[] = [];
    for (let i = 0; i < 6; i++) {
      const angleRad = (Math.PI / 180) * (60 * i - 30);
      const lat = center.lat + radius * Math.sin(angleRad);
      const cosLat = Math.cos(lat * (Math.PI / 180)) || 1;
      const lng = center.lng + (radius * Math.cos(angleRad)) / cosLat;
      boundary.push({
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6))
      });
    }

    return boundary;
  }

  /**
   * Retorna os vizinhos imediatos (anel k-ring 1) de uma célula hexagonal
   */
  public getH3Neighbors(cellIndex: string): string[] {
    const parts = cellIndex.split('_');
    const p1 = parts[1] ?? 'res8';
    const p2 = parts[2] ?? '0';
    const p3 = parts[3] ?? '0';
    const resolution = parseInt(p1.replace('res', ''), 10) || 8;
    const q = parseInt(p2, 10) || 0;
    const r = parseInt(p3, 10) || 0;

    // 6 direções vizinhas no grid axial
    const directions: [number, number][] = [
      [1, 0], [1, -1], [0, -1],
      [-1, 0], [-1, 1], [0, 1]
    ];

    return directions.map(([dq, dr]) => `h3_res${resolution}_${q + dq}_${r + dr}`);
  }

  /**
   * Indexa a posição de um motorista em tempo real
   */
  public indexDriverLocation(driverId: string, lat: number, lng: number, resolution: number = 8): string {
    const cell = this.latLngToH3Index(lat, lng, resolution);
    
    // Remove de célula anterior se houver
    this.cellsData.forEach((data) => data.motoristasIds.delete(driverId));

    if (!this.cellsData.has(cell)) {
      this.cellsData.set(cell, {
        motoristasIds: new Set([driverId]),
        passageirosIds: new Set(),
        resolution
      });
    } else {
      this.cellsData.get(cell)!.motoristasIds.add(driverId);
    }

    return cell;
  }

  /**
   * Indexa a chamada de um passageiro em tempo real
   */
  public indexPassengerRequest(passengerId: string, lat: number, lng: number, resolution: number = 8): string {
    const cell = this.latLngToH3Index(lat, lng, resolution);

    if (!this.cellsData.has(cell)) {
      this.cellsData.set(cell, {
        motoristasIds: new Set(),
        passageirosIds: new Set([passengerId]),
        resolution
      });
    } else {
      this.cellsData.get(cell)!.passageirosIds.add(passengerId);
    }

    return cell;
  }

  /**
   * Calcula a taxa de liquidez e recomendações para uma célula hexagonal
   */
  public calculateCellLiquidity(cellIndex: string): H3CellLiquidity {
    const cellData = this.cellsData.get(cellIndex);
    const motoristas = cellData ? cellData.motoristasIds.size : 0;
    const passageiros = cellData ? cellData.passageirosIds.size : 0;

    const taxa = passageiros > 0 ? motoristas / passageiros : motoristas > 0 ? 3.0 : 1.0;

    let statusLiquidez: H3CellLiquidity['statusLiquidez'] = 'EQUILIBRADO';
    let surgeRecomendado = 1.0;

    if (passageiros > 0 && taxa < 0.4) {
      statusLiquidez = 'DEFICIT_CRITICO';
      surgeRecomendado = 1.6;
    } else if (passageiros > 0 && taxa < 0.8) {
      statusLiquidez = 'DEFICIT_MODERADO';
      surgeRecomendado = 1.25;
    } else if (motoristas >= 4 && passageiros === 0) {
      statusLiquidez = 'EXCESSO_OFERTA';
      surgeRecomendado = 1.0;
    }

    const centerCoord = this.h3ToGeo(cellIndex);
    const densidadeDemanda = Math.min(1.0, passageiros / 10);

    return {
      cellIndex,
      resolution: cellData ? cellData.resolution : 8,
      centerCoord,
      motoristasPresentes: motoristas,
      passageirosAguardando: passageiros,
      taxaLiquidez: Number(taxa.toFixed(2)),
      statusLiquidez,
      surgeRecomendado,
      densidadeDemanda
    };
  }

  /**
   * Detecta todas as células hexagonais com déficit de oferta
   */
  public detectSupplyDeficit(): H3CellLiquidity[] {
    const deficits: H3CellLiquidity[] = [];
    this.cellsData.forEach((_, cellIndex) => {
      const liq = this.calculateCellLiquidity(cellIndex);
      if (liq.statusLiquidez === 'DEFICIT_CRITICO' || liq.statusLiquidez === 'DEFICIT_MODERADO') {
        deficits.push(liq);
      }
    });
    return deficits;
  }

  /**
   * Detecta células com excesso de oferta (ociosidade de motoristas)
   */
  public detectSupplySurplus(): H3CellLiquidity[] {
    const surplus: H3CellLiquidity[] = [];
    this.cellsData.forEach((_, cellIndex) => {
      const liq = this.calculateCellLiquidity(cellIndex);
      if (liq.statusLiquidez === 'EXCESSO_OFERTA') {
        surplus.push(liq);
      }
    });
    return surplus;
  }

  /**
   * Gera heatmap hexagonal estruturado com os 6 vértices de cada célula
   */
  public generateH3Heatmap(): H3HeatmapCell[] {
    const heatmapCells: H3HeatmapCell[] = [];

    this.cellsData.forEach((data, cellIndex) => {
      const center = this.h3ToGeo(cellIndex);
      const boundary = this.getH3HexagonBoundary(cellIndex);

      if (data.passageirosIds.size > 0) {
        heatmapCells.push({
          cellIndex,
          boundary,
          center,
          intensity: Math.min(1.0, data.passageirosIds.size / 8),
          tipo: 'DEMANDA'
        });
      }

      if (data.motoristasIds.size > 0) {
        heatmapCells.push({
          cellIndex,
          boundary,
          center,
          intensity: Math.min(1.0, data.motoristasIds.size / 12),
          tipo: 'OFERTA'
        });
      }
    });

    return heatmapCells;
  }
}

export const h3SpatialEngine = new H3SpatialEngine();
