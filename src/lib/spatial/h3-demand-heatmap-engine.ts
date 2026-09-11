/**
 * ==============================================================================
 * 🔥 PARTIU H3 DEMAND SURGE HEATMAP ENGINE (UBER H3 RESOLUTION 8)
 * ==============================================================================
 * Agrega a demanda de chamadas e intenções de viagem em células hexagonais H3,
 * gerando camadas térmicas GeoJSON dinâmicas com multiplicadores de tarifa dinâmica
 * para exibição em tempo real no mapa dos condutores parceiros.
 * ==============================================================================
 */

import { h3SpatialIndex, DEFAULT_H3_SURGE_RESOLUTION } from "./h3-spatial-index";

export interface DemandEvent {
  cell: string;
  lat: number;
  lng: number;
  weight: number;
  timestamp: number;
}

export interface DemandCellSummary {
  cell: string;
  count: number;
  intensity: number; // 0.0 a 1.0
  multiplier: number; // 1.0x a 2.0x
  fillColor: string;
  fillOpacity: number;
  label: string;
}

export class H3DemandHeatmapEngine {
  private static instance: H3DemandHeatmapEngine;
  private demandEvents: DemandEvent[] = [];
  private readonly WINDOW_MS = 15 * 60 * 1000; // Janela móvel de 15 minutos

  private constructor() {
    this.seedDefaultDemandHotspots();
  }

  public static getInstance(): H3DemandHeatmapEngine {
    if (!H3DemandHeatmapEngine.instance) {
      H3DemandHeatmapEngine.instance = new H3DemandHeatmapEngine();
    }
    return H3DemandHeatmapEngine.instance;
  }

  /**
   * Registra uma intenção ou solicitação de corrida em uma célula H3
   */
  public recordDemandEvent(lat: number, lng: number, weight = 1, timestamp = Date.now()): string {
    const cell = h3SpatialIndex.latLngToCell(lat, lng, DEFAULT_H3_SURGE_RESOLUTION);
    this.demandEvents.push({ cell, lat, lng, weight, timestamp });
    this.pruneExpiredEvents();
    return cell;
  }

  /**
   * Limpa eventos fora da janela de 15 minutos
   */
  private pruneExpiredEvents(): void {
    const cutoff = Date.now() - this.WINDOW_MS;
    this.demandEvents = this.demandEvents.filter((e) => e.timestamp >= cutoff);
  }

  /**
   * Calcula o multiplicador dinâmico de tarifa para uma célula
   */
  public calculateSurgeMultiplier(demandCount: number): {
    multiplier: number;
    intensity: number;
    fillColor: string;
    fillOpacity: number;
    label: string;
  } {
    if (demandCount >= 10) {
      return {
        multiplier: 2.0,
        intensity: 1.0,
        fillColor: "#EF4444", // Vermelho
        fillOpacity: 0.50,
        label: "Pico Extremo (+100%)",
      };
    }
    if (demandCount >= 6) {
      return {
        multiplier: 1.5,
        intensity: 0.75,
        fillColor: "#F97316", // Laranja
        fillOpacity: 0.38,
        label: "Alta Demanda (+50%)",
      };
    }
    if (demandCount >= 3) {
      return {
        multiplier: 1.2,
        intensity: 0.45,
        fillColor: "#F59E0B", // Âmbar
        fillOpacity: 0.28,
        label: "Demanda Moderada (+20%)",
      };
    }
    return {
      multiplier: 1.0,
      intensity: 0.15,
      fillColor: "#10B981", // Verde
      fillOpacity: 0.15,
      label: "Demanda Normal (1.0x)",
    };
  }

  /**
   * Agrega os dados atuais por célula H3
   */
  public getDemandSummaries(): DemandCellSummary[] {
    this.pruneExpiredEvents();

    if (this.demandEvents.length === 0) {
      this.seedDefaultDemandHotspots();
    }

    const countMap = new Map<string, number>();
    for (const ev of this.demandEvents) {
      countMap.set(ev.cell, (countMap.get(ev.cell) || 0) + ev.weight);
    }

    const results: DemandCellSummary[] = [];
    for (const [cell, count] of countMap.entries()) {
      const surge = this.calculateSurgeMultiplier(count);
      results.push({
        cell,
        count,
        intensity: surge.intensity,
        multiplier: surge.multiplier,
        fillColor: surge.fillColor,
        fillOpacity: surge.fillOpacity,
        label: surge.label,
      });
    }

    return results.sort((a, b) => b.multiplier - a.multiplier);
  }

  /**
   * Gera o FeatureCollection GeoJSON pronto para renderização na camada Mapbox
   */
  public generateDemandHeatmapGeoJson(): GeoJSON.FeatureCollection {
    const summaries = this.getDemandSummaries();
    const features: GeoJSON.Feature[] = [];

    for (const summary of summaries) {
      try {
        const polygonRing = h3SpatialIndex.cellToGeoJsonPolygon(summary.cell);
        if (polygonRing.length < 3) continue;

        features.push({
          type: "Feature",
          id: summary.cell,
          geometry: {
            type: "Polygon",
            coordinates: [polygonRing],
          },
          properties: {
            cell: summary.cell,
            count: summary.count,
            intensity: summary.intensity,
            multiplier: summary.multiplier,
            fillColor: summary.fillColor,
            fillOpacity: summary.fillOpacity,
            label: summary.label,
          },
        });
      } catch {
        // Ignora célula com erro topológico
      }
    }

    return {
      type: "FeatureCollection",
      features,
    };
  }

  /**
   * Popula pontos quentes de demonstração ao redor do centro urbano
   */
  public seedDefaultDemandHotspots(): void {
    const baseLat = -21.205;
    const baseLng = -41.888;
    const now = Date.now();

    // Hotspot 1: Centro Comercial (Alta Demanda 1.5x)
    for (let i = 0; i < 7; i++) {
      this.demandEvents.push({
        cell: h3SpatialIndex.latLngToCell(baseLat, baseLng, DEFAULT_H3_SURGE_RESOLUTION),
        lat: baseLat + (Math.random() - 0.5) * 0.003,
        lng: baseLng + (Math.random() - 0.5) * 0.003,
        weight: 1,
        timestamp: now - Math.random() * 300000,
      });
    }

    // Hotspot 2: Rodoviária / Aeroporto (Pico Extremo 2.0x)
    const h2Lat = baseLat - 0.012;
    const h2Lng = baseLng + 0.010;
    for (let i = 0; i < 11; i++) {
      this.demandEvents.push({
        cell: h3SpatialIndex.latLngToCell(h2Lat, h2Lng, DEFAULT_H3_SURGE_RESOLUTION),
        lat: h2Lat + (Math.random() - 0.5) * 0.003,
        lng: h2Lng + (Math.random() - 0.5) * 0.003,
        weight: 1,
        timestamp: now - Math.random() * 300000,
      });
    }

    // Hotspot 3: Bairro Universitário (Moderada 1.2x)
    const h3Lat = baseLat + 0.015;
    const h3Lng = baseLng - 0.008;
    for (let i = 0; i < 4; i++) {
      this.demandEvents.push({
        cell: h3SpatialIndex.latLngToCell(h3Lat, h3Lng, DEFAULT_H3_SURGE_RESOLUTION),
        lat: h3Lat + (Math.random() - 0.5) * 0.003,
        lng: h3Lng + (Math.random() - 0.5) * 0.003,
        weight: 1,
        timestamp: now - Math.random() * 300000,
      });
    }
  }

  public reset(): void {
    this.demandEvents = [];
  }
}

export const h3DemandHeatmapEngine = H3DemandHeatmapEngine.getInstance();
