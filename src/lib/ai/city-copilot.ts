/**
 * CITY COPILOT ENGINE
 * 
 * Instancia agentes copilotos dedicados 24/7 para cada município da rede PARTIU:
 * Itaperuna Copilot, Campos Copilot, Macaé Copilot, Cabo Frio Copilot, etc.
 * Monitora a saúde local, antecipa gargalos e aciona mitigações autônomas autorizadas.
 */

import { listAllCities, CityOperationConfig } from '../partiu-city-os';
import { digitalTwinEngine, CityTwinState } from '../partiu-digital-twin';
import { mobilityFoundationModel } from './partiu-foundation-model';
import { executiveAIBoard, NationalDecision } from './executive-board';
import { explainabilityEngine, DecisionExplanation } from './explainability-engine';

export interface LocalCopilotTelemetry {
  cityId: string;
  cityName: string;
  copilotStatus: 'ATIVO' | 'STANDBY' | 'INTERVENCAO_EM_ANDAMENTO';
  localHealthScore: number; // 0 a 100
  alertaImediato: string | null;
  gargalosDetectados: string[];
  acoesRecomendadas: string[];
  ultimaDecisaoExecutada: string | null;
  explicacoesUltimaDecisao: DecisionExplanation[];
  lastHeartbeat: number;
}

export class SingleCityCopilot {
  constructor(public readonly cityConfig: CityOperationConfig) {}

  public getCopilotName(): string {
    return `${this.cityConfig.cityName} AI Copilot`;
  }

  /**
   * Monitora continuamente a saúde da praça local
   */
  public monitorLocalHealth(): LocalCopilotTelemetry {
    const twin = digitalTwinEngine.getCityTwin(this.cityConfig.cityId);
    
    // Converte estado em vetor e delibera no board
    const stateVector = mobilityFoundationModel.encode({
      cityId: this.cityConfig.cityId,
      cityName: this.cityConfig.cityName,
      activeOnlineDrivers: twin.motoristasOnline,
      busyDriversCount: twin.motoristasOcupados,
      waitingPassengersCount: twin.passageirosAguardando,
      activeTripsCount: twin.corridasEmAndamento,
      averageEtaMinutes: twin.etaMedioMinutos,
      acceptanceRatePct: twin.taxaAceitePercentual,
      cancellationRatePct: twin.taxaCancelamentoPercentual,
      currentSurgeMultiplier: twin.surgeMedio,
      platformTakeRatePct: 5.0,
      dailyRevenueBrl: Math.round(twin.corridasEmAndamento * 22.0),
      liquidityRatio: twin.motoristasOnline / Math.max(1, twin.passageirosAguardando),
      clima: twin.climaAtual === 'TEMPESTADE' ? 'TEMPESTADE' : twin.climaAtual === 'CHUVA_LEVE' ? 'CHUVA_LEVE' : 'LIMPO',
      eventosAtivosCount: twin.eventosAtivos.length,
      acidentesViariosCount: 0,
      cityHealthScore: Math.round(twin.taxaAceitePercentual * 0.5 + (100 - twin.taxaCancelamentoPercentual * 3) * 0.5),
      nationalHealthScore: 85,
      driverChurnRiskAvg: 0.12,
      fraudAttempts24h: 0,
      hotspotMaxDeficitRatio: 1.2,
      timestamp: Date.now()
    });

    const decision: NationalDecision = executiveAIBoard.deliberate(stateVector);
    const explanations = explainabilityEngine.explainNationalDecision(decision);

    const gargalos: string[] = [];
    if (twin.etaMedioMinutos > 5.0) gargalos.push(`ETA elevado (${twin.etaMedioMinutos}m).`);
    if (twin.passageirosAguardando > 10) gargalos.push(`Fila com ${twin.passageirosAguardando} chamadas.`);

    const alerta = decision.overallPriority === 'P0' 
      ? 'Intervenção crítica necessária: Escassez de condutores no polo central.' 
      : null;

    return {
      cityId: this.cityConfig.cityId,
      cityName: this.cityConfig.cityName,
      copilotStatus: decision.overallPriority === 'P0' ? 'INTERVENCAO_EM_ANDAMENTO' : 'ATIVO',
      localHealthScore: Math.round(stateVector.embedding[20]! * 100),
      alertaImediato: alerta,
      gargalosDetectados: gargalos,
      acoesRecomendadas: decision.approvedActions.map((a) => a.actionType),
      ultimaDecisaoExecutada: decision.decisionId,
      explicacoesUltimaDecisao: explanations,
      lastHeartbeat: Date.now()
    };
  }
}

export class CityCopilotManager {
  private copilots: Map<string, SingleCityCopilot> = new Map();

  constructor() {
    this.refreshCopilots();
  }

  /**
   * Instancia automaticamente copilotos para todas as cidades registradas
   */
  public refreshCopilots(): void {
    const cities = listAllCities();
    cities.forEach((city) => {
      if (!this.copilots.has(city.cityId)) {
        this.copilots.set(city.cityId, new SingleCityCopilot(city));
      }
    });
  }

  public getCopilot(cityId: string): SingleCityCopilot | null {
    this.refreshCopilots();
    return this.copilots.get(cityId) || null;
  }

  public monitorAllCopilots(): LocalCopilotTelemetry[] {
    this.refreshCopilots();
    const results: LocalCopilotTelemetry[] = [];
    this.copilots.forEach((copilot) => {
      results.push(copilot.monitorLocalHealth());
    });
    return results;
  }
}

export const cityCopilotManager = new CityCopilotManager();
