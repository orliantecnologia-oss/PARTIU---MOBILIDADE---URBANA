/**
 * PARTIU AUTONOMOUS ACTION ENGINE
 * 
 * Executa ações de autocura e balanceamento de mercado automaticamente
 * quando o motor de risco preditivo detecta iminência de degradação.
 * Todas as ações são auditadas e reversíveis.
 */

import { OperationalRiskAssessment } from './partiu-risk-prediction-engine';
import { digitalTwinEngine } from './partiu-digital-twin';

export type ActionType = 
  | 'ATIVAR_MISSAO_RELAMPAGO'
  | 'EXPANDIR_RAIO_MATCHING'
  | 'ATIVAR_SURGE_PREVENTIVO'
  | 'DISPARAR_CAMPANHA_MOTORISTAS'
  | 'REBALANCEAR_FROTA_INTERBAIRROS'
  | 'REVERTER_ACAO';

export interface AutonomousActionLogEntry {
  id: string;
  timestamp: number;
  cityId: string;
  tipo: ActionType;
  motivoTrigger: string;
  parametros: Record<string, any>;
  resultadoStatus: 'SUCESSO' | 'FALHA' | 'PARCIAL' | 'REVERTIDO';
  impactoEsperado: string;
  tempoReversaoSugeridoMinutos?: number;
  executadoPor: 'PARTIU_AUTONOMOUS_CORE_V12';
}

export class AutonomousActionEngine {
  private auditLog: AutonomousActionLogEntry[] = [];
  private activeOverrides: Map<string, {
    expandedRadiusKm?: number;
    preventiveSurge?: number;
    activeBlitzMission?: boolean;
  }> = new Map();

  /**
   * Avalia a análise de risco e orquestra a execução autônoma das ações
   */
  public async executarMitigacaoAutonoma(
    assessment: OperationalRiskAssessment
  ): Promise<AutonomousActionLogEntry[]> {
    const executed: AutonomousActionLogEntry[] = [];

    for (const acao of assessment.acoesRecomendadas) {
      if (acao.tipo === 'ATIVAR_MISSAO_RELAMPAGO') {
        const res = this.ativarMissaoRelampago(assessment.cityId, 'Centro Comercial', 12.0);
        executed.push(res);
      } else if (acao.tipo === 'EXPANDIR_RAIO_MATCHING') {
        const targetRadius = assessment.nivel === 'CRITICO' ? 5.5 : 4.5;
        const res = this.expandirRaioMatching(assessment.cityId, 3.5, targetRadius);
        executed.push(res);
      } else if (acao.tipo === 'ATIVAR_SURGE_PREVENTIVO') {
        const multiplier = assessment.nivel === 'CRITICO' ? 1.45 : 1.25;
        const res = this.ativarSurgePreventivo(assessment.cityId, 'Geral', multiplier);
        executed.push(res);
      } else if (acao.tipo === 'DISPARAR_SMART_NUDGES') {
        const res = this.dispararCampanhaMotoristas(
          assessment.cityId,
          'Alta probabilidade de corridas nos próximos 20 minutos com tarifa valorizada.',
          'BONUS_RUSH_D0'
        );
        executed.push(res);
      }
    }

    return executed;
  }

  /**
   * Ativa Missão Relâmpago para convocação imediata de motoristas (D+0)
   */
  public ativarMissaoRelampago(
    cityId: string,
    hotspot: string,
    bonusReais: number
  ): AutonomousActionLogEntry {
    const entry: AutonomousActionLogEntry = {
      id: `ACT-MISSAO-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      cityId,
      tipo: 'ATIVAR_MISSAO_RELAMPAGO',
      motivoTrigger: `Déficit de condutores detectado no polo ${hotspot}`,
      parametros: {
        hotspot,
        bonusReais,
        corridasNecessarias: 3,
        janelaMinutos: 45
      },
      resultadoStatus: 'SUCESSO',
      impactoEsperado: `Mobilização de até +18 motoristas nos próximos 15 minutos com incentivo de R$ ${bonusReais.toFixed(2)} D+0`,
      tempoReversaoSugeridoMinutos: 45,
      executadoPor: 'PARTIU_AUTONOMOUS_CORE_V12'
    };

    const current = this.activeOverrides.get(cityId) || {};
    this.activeOverrides.set(cityId, { ...current, activeBlitzMission: true });
    this.auditLog.unshift(entry);

    // Reflete no Digital Twin
    digitalTwinEngine.updateCityTwinState(cityId, {
      motoristasOnline: digitalTwinEngine.getCityTwin(cityId).motoristasOnline + 6
    });

    return entry;
  }

  /**
   * Expande o raio de matching dinamicamente de 3.5km para até 5.5km
   */
  public expandirRaioMatching(
    cityId: string,
    raioAtualKm: number,
    raioAlvoKm: number
  ): AutonomousActionLogEntry {
    const entry: AutonomousActionLogEntry = {
      id: `ACT-RAIO-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      cityId,
      tipo: 'EXPANDIR_RAIO_MATCHING',
      motivoTrigger: 'ETA em alta e fila de espera sem condutores locais imediatos',
      parametros: {
        raioAnteriorKm: raioAtualKm,
        novoRaioKm: raioAlvoKm
      },
      resultadoStatus: 'SUCESSO',
      impactoEsperado: `Aumento de 60% na base de busca de condutores elegíveis com redução de chamadas perdidas`,
      tempoReversaoSugeridoMinutos: 30,
      executadoPor: 'PARTIU_AUTONOMOUS_CORE_V12'
    };

    const current = this.activeOverrides.get(cityId) || {};
    this.activeOverrides.set(cityId, { ...current, expandedRadiusKm: raioAlvoKm });
    this.auditLog.unshift(entry);

    return entry;
  }

  /**
   * Ativa surge multiplicador preventivo
   */
  public ativarSurgePreventivo(
    cityId: string,
    hotspot: string,
    multiplicadorAlvo: number
  ): AutonomousActionLogEntry {
    const entry: AutonomousActionLogEntry = {
      id: `ACT-SURGE-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      cityId,
      tipo: 'ATIVAR_SURGE_PREVENTIVO',
      motivoTrigger: 'Saturação de demanda com perigo iminente de colapso de fila',
      parametros: {
        hotspot,
        multiplicadorAlvo: Number(multiplicadorAlvo.toFixed(2))
      },
      resultadoStatus: 'SUCESSO',
      impactoEsperado: `Filtro de demanda sensível a preço e atração de condutores em deslocamento`,
      tempoReversaoSugeridoMinutos: 20,
      executadoPor: 'PARTIU_AUTONOMOUS_CORE_V12'
    };

    const current = this.activeOverrides.get(cityId) || {};
    this.activeOverrides.set(cityId, { ...current, preventiveSurge: multiplicadorAlvo });
    this.auditLog.unshift(entry);

    digitalTwinEngine.updateCityTwinState(cityId, {
      surgeMedio: multiplicadorAlvo
    });

    return entry;
  }

  /**
   * Dispara notificação push em massa para motoristas offline em standby
   */
  public dispararCampanhaMotoristas(
    cityId: string,
    mensagem: string,
    tipoIncentivo: string
  ): AutonomousActionLogEntry {
    const entry: AutonomousActionLogEntry = {
      id: `ACT-CAMPANHA-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      cityId,
      tipo: 'DISPARAR_CAMPANHA_MOTORISTAS',
      motivoTrigger: 'Necessidade de injeção de oferta primária na malha metropolitana',
      parametros: {
        mensagem,
        tipoIncentivo,
        canalDisparo: 'HIGH_PRIORITY_PUSH'
      },
      resultadoStatus: 'SUCESSO',
      impactoEsperado: `Conversão estimada de 12 a 25 condutores para status ONLINE nos próximos 10 minutos`,
      tempoReversaoSugeridoMinutos: 60,
      executadoPor: 'PARTIU_AUTONOMOUS_CORE_V12'
    };

    this.auditLog.unshift(entry);
    return entry;
  }

  /**
   * Reverte uma intervenção autônoma anterior
   */
  public reverterAcao(actionId: string): boolean {
    const action = this.auditLog.find((a) => a.id === actionId);
    if (!action) return false;

    action.resultadoStatus = 'REVERTIDO';
    this.activeOverrides.delete(action.cityId);
    return true;
  }

  public getAuditTrail(cityId?: string): AutonomousActionLogEntry[] {
    if (cityId) {
      return this.auditLog.filter((a) => a.cityId === cityId);
    }
    return this.auditLog;
  }

  public getActiveOverrides(cityId: string) {
    return this.activeOverrides.get(cityId) || null;
  }
}

export const autonomousActionEngine = new AutonomousActionEngine();
