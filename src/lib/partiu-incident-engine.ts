/**
 * PARTIU INCIDENT COMMAND SYSTEM (ICS)
 * 
 * Classificação rigorosa P0 a P3 com detecção automatizada de incidentes,
 * acionamento autônomo de runbooks de contingência e geração de Incident Reports.
 */

export type IncidentSeverity = 'P0' | 'P1' | 'P2' | 'P3';

export type IncidentStatus = 'DETECTADO' | 'EM_MITIGACAO_AUTONOMA' | 'ESTABILIZADO' | 'RESOLVIDO';

export interface IncidentReport {
  id: string;
  severity: IncidentSeverity;
  title: string;
  summary: string;
  status: IncidentStatus;
  detectedAt: number;
  resolvedAt: number | null;
  mttrSeconds: number | null; // Mean Time To Recover
  affectedCities: string[];
  affectedSubsystems: string[];
  rootCauseHypothesis: string;
  autoMitigationsTaken: string[];
  postMortemSummary: string;
}

export interface IncidentRule {
  id: string;
  severity: IncidentSeverity;
  name: string;
  evaluator: (telemetry: Record<string, any>) => boolean;
  autoMitigationAction: string;
}

export class IncidentCommandEngine {
  private activeIncidents: Map<string, IncidentReport> = new Map();
  private historicalIncidents: IncidentReport[] = [];

  constructor() {
    this.seedRecentResolvedIncidents();
  }

  private seedRecentResolvedIncidents(): void {
    const resolvedP2: IncidentReport = {
      id: 'INC-20260907-001',
      severity: 'P2',
      title: 'Queda de Aceite Temporária em Campos dos Goytacazes',
      summary: 'Taxa de aceite caiu para 64% na saída de evento universitário',
      status: 'RESOLVIDO',
      detectedAt: Date.now() - 3600000,
      resolvedAt: Date.now() - 3360000,
      mttrSeconds: 240,
      affectedCities: ['campos'],
      affectedSubsystems: ['Matching', 'DriverScore'],
      rootCauseHypothesis: 'Demanda concentrada de curta distância sem bônus de partida',
      autoMitigationsTaken: ['EXPANDIR_RAIO_MATCHING', 'ATIVAR_SURGE_PREVENTIVO_1.3X'],
      postMortemSummary: 'Expansão de raio normalizou o tempo de aceite em 4 minutos sem perda de passageiros.'
    };
    this.historicalIncidents.push(resolvedP2);
  }

  /**
   * Avalia telemetria e cria incidentes automaticamente se limiares forem violados
   */
  public evaluateTelemetryAndDetect(telemetry: {
    cityId: string;
    cityName: string;
    etaMedioMinutos: number;
    taxaAceite: number;
    taxaCancelamento: number;
    realtimeConnected: boolean;
    matchingLatencyMs: number;
    hotspotSaturationPct: number;
  }): IncidentReport | null {
    // 1. P0: Falha de Matching ou Queda de Realtime
    if (!telemetry.realtimeConnected || telemetry.matchingLatencyMs > 250) {
      return this.declareIncident({
        severity: 'P0',
        title: `P0: Falha Crítica de Conectividade ou Latência de Matching (${telemetry.cityName})`,
        summary: `Latência de matching atingiu ${telemetry.matchingLatencyMs}ms ou conexão realtime perdida.`,
        affectedCities: [telemetry.cityId],
        affectedSubsystems: ['Matching', 'Realtime'],
        rootCauseHypothesis: 'Sobrecarga de WebSocket ou partição de cluster de despacho',
        autoMitigationsTaken: ['REINICIAR_CANAL_REALTIME', 'ATIVAR_FAILOVER_HTTP_POLLING']
      });
    }

    // 2. P1: ETA acima de 10 minutos ou cancelamento > 25%
    if (telemetry.etaMedioMinutos > 10.0 || telemetry.taxaCancelamento > 25) {
      return this.declareIncident({
        severity: 'P1',
        title: `P1: Degradação Severa de SLA - ETA em ${telemetry.etaMedioMinutos.toFixed(1)}m (${telemetry.cityName})`,
        summary: `ETA médio ultrapassou 10 minutos ou cancelamentos atingiram ${telemetry.taxaCancelamento}%.`,
        affectedCities: [telemetry.cityId],
        affectedSubsystems: ['DriverScore', 'Matching'],
        rootCauseHypothesis: 'Esgotamento de condutores livres na área metropolitana',
        autoMitigationsTaken: ['ATIVAR_MISSAO_RELAMPAGO', 'EXPANDIR_RAIO_MATCHING_5.5KM', 'SURGE_DEFENSIVO_1.5X']
      });
    }

    // 3. P2: Queda de Aceite < 65%
    if (telemetry.taxaAceite < 65) {
      return this.declareIncident({
        severity: 'P2',
        title: `P2: Queda Anômala de Aceite em ${telemetry.cityName} (${telemetry.taxaAceite}%)`,
        summary: 'Condutores rejeitando chamadas consecutivas acima do desvio padrão tolerado.',
        affectedCities: [telemetry.cityId],
        affectedSubsystems: ['DriverScore'],
        rootCauseHypothesis: 'Tarifa desfavorável para trajetos com tráfego denso',
        autoMitigationsTaken: ['ATIVAR_INCENTIVO_D0_RUSH', 'EXPANDIR_RAIO_MATCHING']
      });
    }

    // 4. P3: Hotspot Degradado
    if (telemetry.hotspotSaturationPct > 85) {
      return this.declareIncident({
        severity: 'P3',
        title: `P3: Saturação Espacial de Hotspot (${telemetry.cityName})`,
        summary: 'Volume de chamadas no polo excede a capacidade de atendimento imediato em 85%.',
        affectedCities: [telemetry.cityId],
        affectedSubsystems: ['Geolocalizacao'],
        rootCauseHypothesis: 'Término de expediente em polo comercial ou universitário',
        autoMitigationsTaken: ['DISPARAR_SMART_NUDGES_REPOSICIONAMENTO']
      });
    }

    return null;
  }

  public declareIncident(params: {
    severity: IncidentSeverity;
    title: string;
    summary: string;
    affectedCities: string[];
    affectedSubsystems: string[];
    rootCauseHypothesis: string;
    autoMitigationsTaken: string[];
  }): IncidentReport {
    const existing = Array.from(this.activeIncidents.values()).find(
      (inc) => inc.title === params.title && inc.status !== 'RESOLVIDO'
    );
    if (existing) return existing;

    const id = `INC-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const report: IncidentReport = {
      id,
      severity: params.severity,
      title: params.title,
      summary: params.summary,
      status: 'EM_MITIGACAO_AUTONOMA',
      detectedAt: Date.now(),
      resolvedAt: null,
      mttrSeconds: null,
      affectedCities: params.affectedCities,
      affectedSubsystems: params.affectedSubsystems,
      rootCauseHypothesis: params.rootCauseHypothesis,
      autoMitigationsTaken: params.autoMitigationsTaken,
      postMortemSummary: 'Execução autônoma de contingência iniciada sem interferência manual.'
    };

    this.activeIncidents.set(id, report);
    return report;
  }

  public resolveIncident(id: string, postMortemNotes: string): IncidentReport | null {
    const inc = this.activeIncidents.get(id);
    if (!inc) return null;

    inc.status = 'RESOLVIDO';
    inc.resolvedAt = Date.now();
    inc.mttrSeconds = Math.round((inc.resolvedAt - inc.detectedAt) / 1000);
    inc.postMortemSummary = postMortemNotes;

    this.activeIncidents.delete(id);
    this.historicalIncidents.unshift(inc);
    return inc;
  }

  public getActiveIncidents(): IncidentReport[] {
    return Array.from(this.activeIncidents.values());
  }

  public getHistoricalIncidents(): IncidentReport[] {
    return this.historicalIncidents;
  }
}

export const incidentCommandEngine = new IncidentCommandEngine();
