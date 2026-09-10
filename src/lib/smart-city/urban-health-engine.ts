/**
 * URBAN HEALTH ENGINE
 * 
 * Avaliação contínua da saúde e resiliência da malha urbana:
 * - Capacidade de absorção de picos de tráfego
 * - Velocidade de dissipação de congestionamento
 * - Equilíbrio dinâmico oferta/demanda
 * - Índice de sustentabilidade e descarbonização da mobilidade
 */

import { urbanMetricsEngine, CityUrbanSummary } from './urban-metrics';
import { cityHeatmapEngine } from './city-heatmap';
import { cityAlertsEngine } from './city-alerts';

export interface UrbanHealthAssessment {
  cityId: string;
  cityName: string;
  healthIndexPct: number; // 0% crítico a 100% ideal
  status: 'EXCELENTE' | 'ESTAVEL' | 'VULNERAVEL' | 'CRITICO';
  fluidezScore: number;       // 0 a 100
  segurancaScore: number;     // 0 a 100
  atendimentoScore: number;   // 0 a 100 (taxa de corridas atendidas sem cancelamento)
  sustentabilidadeScore: number; // 0 a 100
  activeAlertsCount: number;
  criticalBottlenecksCount: number;
  recommendations: string[];
  assessedAt: number;
}

export class UrbanHealthEngine {
  public assessUrbanHealth(cityId: string, cityName: string): UrbanHealthAssessment {
    const summary = urbanMetricsEngine.getCitySummary(cityId, cityName);
    const heatmap = cityHeatmapEngine.getCityHeatmap(cityId);
    const alerts = cityAlertsEngine.getActiveAlertsByCity(cityId);

    // 1. Fluidez (inversamente proporcional ao congestionamento)
    const fluidezScore = Math.max(0, Math.min(100, Number((100 - summary.overallCongestionPct * 1.5).toFixed(1))));

    // 2. Segurança operacional (penalizada por alertas ativos críticos)
    const criticalAlerts = alerts.filter(a => a.severity === 'CRITICO' || a.severity === 'ALTO').length;
    const segurancaScore = Math.max(40, Number((96 - criticalAlerts * 8).toFixed(1)));

    // 3. Atendimento e equilíbrio
    const supplyDemandRatio = heatmap.averageSupply / Math.max(0.1, heatmap.averageDemand);
    const atendimentoScore = Math.min(100, Number((Math.min(1.0, supplyDemandRatio) * 95).toFixed(1)));

    // 4. Sustentabilidade (proporcional ao transporte coletivo / compartilhado)
    const sustentabilidadeScore = Math.min(100, Number((80 + Math.min(20, summary.co2SavedBySharedMobilityKg / 25)).toFixed(1)));

    // Índice consolidado
    const healthIndex = Number((
      fluidezScore * 0.35 +
      segurancaScore * 0.25 +
      atendimentoScore * 0.25 +
      sustentabilidadeScore * 0.15
    ).toFixed(1));

    let status: UrbanHealthAssessment['status'] = 'ESTAVEL';
    if (healthIndex >= 88) status = 'EXCELENTE';
    else if (healthIndex >= 70) status = 'ESTAVEL';
    else if (healthIndex >= 50) status = 'VULNERAVEL';
    else status = 'CRITICO';

    const recommendations: string[] = [];
    if (fluidezScore < 70) recommendations.push('Ativar semáforos inteligentes nos corredores centrais e redirecionar vans alimentadoras.');
    if (criticalAlerts > 0) recommendations.push(`Mitigar ${criticalAlerts} alerta(s) de alta severidade com desvios preventivos.`);
    if (supplyDemandRatio < 0.8) recommendations.push('Incentivar entrada de motoristas parceiros nas zonas de alta demanda.');

    return {
      cityId,
      cityName,
      healthIndexPct: healthIndex,
      status,
      fluidezScore,
      segurancaScore,
      atendimentoScore,
      sustentabilidadeScore,
      activeAlertsCount: alerts.length,
      criticalBottlenecksCount: heatmap.bottleneckZones.length,
      recommendations,
      assessedAt: Date.now()
    };
  }
}

export const urbanHealthEngine = new UrbanHealthEngine();
