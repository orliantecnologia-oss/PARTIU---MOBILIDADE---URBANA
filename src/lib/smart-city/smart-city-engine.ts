/**
 * SMART CITY COMMAND CENTER — ORCHESTRATOR ENGINE
 * 
 * Centro de Comando Integrado de Cidade Inteligente:
 * - Monitoramento em tempo real de mobilidade e tráfego
 * - Detecção precoce de congestionamentos e gargalos
 * - Monitoramento de demanda e segurança operacional
 * - Gestão de densidade urbana e sustentabilidade
 * - Cálculo do Urban Intelligence Score (0–100) para cada município
 */

import { urbanMetricsEngine, UrbanCorridorMetrics, CityUrbanSummary } from './urban-metrics';
import { cityHeatmapEngine, CityHeatmapSnapshot, CityHeatmapPoint } from './city-heatmap';
import { cityAlertsEngine, CityAlert } from './city-alerts';
import { urbanHealthEngine, UrbanHealthAssessment } from './urban-health-engine';

export interface UrbanIntelligenceScore {
  cityId: string;
  cityName: string;
  score: number; // 0 a 100
  tier: 'SMART_CITY_TIER_1' | 'SMART_CITY_TIER_2' | 'SMART_CITY_TIER_3' | 'EM_ADAPTACAO';
  pillars: {
    mobilidadeScore: number;     // 0 a 25 (velocidade média, oferta multimodal e tempo de espera)
    fluidezScore: number;        // 0 a 25 (controle de congestionamento e gargalos)
    segurancaScore: number;      // 0 a 25 (índice de incidentes viários e resolução de alertas)
    densidadeInteligenteScore: number; // 0 a 25 (distribuição equilibrada da frota no espaço urbano)
  };
  metrics: {
    overallCongestionPct: number;
    averageSpeedKmh: number;
    activeTripsCount: number;
    healthIndexPct: number;
    activeAlertsCount: number;
  };
  generatedAt: number;
}

export class SmartCityEngine {
  public getMetricsEngine() {
    return urbanMetricsEngine;
  }

  public getHeatmapEngine() {
    return cityHeatmapEngine;
  }

  public getAlertsEngine() {
    return cityAlertsEngine;
  }

  public getHealthEngine() {
    return urbanHealthEngine;
  }

  /**
   * Calcula o Urban Intelligence Score (0 a 100) para uma cidade
   */
  public calculateUrbanIntelligenceScore(cityId: string, cityName: string): UrbanIntelligenceScore {
    const summary = urbanMetricsEngine.getCitySummary(cityId, cityName);
    const health = urbanHealthEngine.assessUrbanHealth(cityId, cityName);
    const alerts = cityAlertsEngine.getActiveAlertsByCity(cityId);
    const heatmap = cityHeatmapEngine.getCityHeatmap(cityId);

    // 1. Pilar Mobilidade (0 a 25): velocidade média ideal de 35 a 50 km/h e volume ativo
    const speedRatio = Math.min(1.0, summary.averageCitySpeedKmh / 40.0);
    const mobilidadeScore = Math.min(25, Number((speedRatio * 25).toFixed(1)));

    // 2. Pilar Fluidez (0 a 25): penaliza congestionamento elevado
    const congestionFactor = Math.max(0, 1 - summary.overallCongestionPct / 100);
    const fluidezScore = Math.min(25, Number((congestionFactor * 25).toFixed(1)));

    // 3. Pilar Segurança Operacional (0 a 25): baseado na ausência de alertas críticos
    const alertPenalty = alerts.reduce((acc, a) => acc + (a.severity === 'CRITICO' ? 4 : a.severity === 'ALTO' ? 2 : 1), 0);
    const segurancaScore = Math.max(8, Math.min(25, Number((25 - alertPenalty * 1.5).toFixed(1))));

    // 4. Pilar Densidade Inteligente (0 a 25): equilíbrio espacial de oferta e demanda
    const densityBalance = Math.min(1.0, heatmap.averageSupply / Math.max(0.1, heatmap.averageDemand));
    const densidadeInteligenteScore = Math.min(25, Number((densityBalance * 25).toFixed(1)));

    const totalScore = Number((mobilidadeScore + fluidezScore + segurancaScore + densidadeInteligenteScore).toFixed(1));

    let tier: UrbanIntelligenceScore['tier'] = 'EM_ADAPTACAO';
    if (totalScore >= 88) tier = 'SMART_CITY_TIER_1';
    else if (totalScore >= 75) tier = 'SMART_CITY_TIER_2';
    else if (totalScore >= 60) tier = 'SMART_CITY_TIER_3';

    return {
      cityId,
      cityName,
      score: totalScore,
      tier,
      pillars: {
        mobilidadeScore,
        fluidezScore,
        segurancaScore,
        densidadeInteligenteScore
      },
      metrics: {
        overallCongestionPct: summary.overallCongestionPct,
        averageSpeedKmh: summary.averageCitySpeedKmh,
        activeTripsCount: summary.totalTripsActive,
        healthIndexPct: health.healthIndexPct,
        activeAlertsCount: alerts.length
      },
      generatedAt: Date.now()
    };
  }
}

export const smartCityEngine = new SmartCityEngine();
