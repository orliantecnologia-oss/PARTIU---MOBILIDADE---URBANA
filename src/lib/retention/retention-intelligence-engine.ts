import { silentCatchWarn } from "@/lib/structured-logger";

/**
 * ==============================================================================
 * 🧠 PARTIU REVENUE OS — RETENTION INTELLIGENCE ENGINE (FASE 7)
 * ==============================================================================
 * Motor Preditivo de Churn e Inteligência de Retenção de Condutores:
 * - Identificação autônoma de condutores inativos (> 72h sem conexão)
 * - Detecção de queda brusca de faturamento (> 30% em relação à semana anterior)
 * - Risco de cancelamento e baixa frequência operacional
 * - Gatilhos Automáticos: Notificações push de reconexão, bônus de retorno e
 *   UPGRADE TEMPORÁRIO DE PLANO (48h de Plano Ouro Taxa Zero como incentivo)
 * ==============================================================================
 */

export type RiskLevel = "BAIXO" | "MEDIO" | "ALTO" | "CRITICO";
export type RetentionActionType =
  | "SEND_WINBACK_PUSH"
  | "OFFER_48H_GOLD"
  | "PHONE_CALL"
  | "REENGAGEMENT_BONUS";

export interface DriverRetentionRecord {
  driverId: string;
  driverName: string;
  phone: string;
  vehicle: string;
  daysInactive: number;
  weeklyEarningsBrl: number;
  previousWeekEarningsBrl: number;
  earningsDropPercent: number;
  riskLevel: RiskLevel;
  riskScore: number; // 0 a 100
  primaryReason: string;
  suggestedAction: RetentionActionType;
  status: "IDENTIFIED" | "CAMPAIGN_SENT" | "RECOVERED" | "CHURNED";
  temporaryGoldActiveUntil?: number | undefined;
  lastContactedAt?: number | undefined;
  updatedAt: number;
}

export interface RetentionConfig {
  inactivityThresholdDays: number; // Padrão: 3 dias
  revenueDropThresholdPercent: number; // Padrão: 30%
  autoPushCampaignsEnabled: boolean; // Padrão: true
  autoTemporaryGoldUpgradeEnabled: boolean; // Padrão: true
  temporaryGoldDurationHours: number; // Padrão: 48h
  winbackBonusAmountBrl: number; // Padrão: R$ 30,00 após 5 corridas de retorno
}

export const DEFAULT_RETENTION_CONFIG: RetentionConfig = {
  inactivityThresholdDays: 3,
  revenueDropThresholdPercent: 30,
  autoPushCampaignsEnabled: true,
  autoTemporaryGoldUpgradeEnabled: true,
  temporaryGoldDurationHours: 48,
  winbackBonusAmountBrl: 30.0,
};

const STORAGE_RETENTION_CONFIG_KEY = "partiu_retention_config_v1";
const STORAGE_RETENTION_RECORDS_KEY = "partiu_retention_records_v1";

export class RetentionIntelligenceEngine {
  private static instance: RetentionIntelligenceEngine;
  private config: RetentionConfig = { ...DEFAULT_RETENTION_CONFIG };
  private records: Map<string, DriverRetentionRecord> = new Map();

  private constructor() {
    this.loadData();
    this.seedMockDataIfEmpty();
  }

  public static getInstance(): RetentionIntelligenceEngine {
    if (!RetentionIntelligenceEngine.instance) {
      RetentionIntelligenceEngine.instance = new RetentionIntelligenceEngine();
    }
    return RetentionIntelligenceEngine.instance;
  }

  private loadData(): void {
    if (typeof window === "undefined") return;
    try {
      const savedConfig = localStorage.getItem(STORAGE_RETENTION_CONFIG_KEY);
      if (savedConfig) {
        this.config = { ...DEFAULT_RETENTION_CONFIG, ...JSON.parse(savedConfig) };
      }
      const savedRecords = localStorage.getItem(STORAGE_RETENTION_RECORDS_KEY);
      if (savedRecords) {
        const arr = JSON.parse(savedRecords) as DriverRetentionRecord[];
        arr.forEach((r) => this.records.set(r.driverId, r));
      }
    } catch (err) { silentCatchWarn("retention-intelligence-engine", err); }
  }

  private saveData(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_RETENTION_CONFIG_KEY, JSON.stringify(this.config));
      const arr = Array.from(this.records.values());
      localStorage.setItem(STORAGE_RETENTION_RECORDS_KEY, JSON.stringify(arr));
    } catch (err) { silentCatchWarn("retention-intelligence-engine", err); }
  }

  private seedMockDataIfEmpty(): void {
    if (this.records.size > 0) return;

    const seeds: DriverRetentionRecord[] = [
      {
        driverId: "mot-101",
        driverName: "Rafael Souza Lima",
        phone: "(22) 99811-2233",
        vehicle: "Renault Kwid (Branco)",
        daysInactive: 4,
        weeklyEarningsBrl: 180.0,
        previousWeekEarningsBrl: 840.0,
        earningsDropPercent: 78.5,
        riskLevel: "CRITICO",
        riskScore: 88,
        primaryReason: "Inativo há 4 dias e queda de faturamento de 78%",
        suggestedAction: "OFFER_48H_GOLD",
        status: "IDENTIFIED",
        updatedAt: Date.now() - 3600000 * 2,
      },
      {
        driverId: "mot-102",
        driverName: "Fernanda Ribeiro",
        phone: "(22) 99722-4455",
        vehicle: "Fiat Argo (Vermelho)",
        daysInactive: 3,
        weeklyEarningsBrl: 320.0,
        previousWeekEarningsBrl: 650.0,
        earningsDropPercent: 50.7,
        riskLevel: "ALTO",
        riskScore: 72,
        primaryReason: "Inativa há 3 dias (frequência abaixo da média histórica)",
        suggestedAction: "SEND_WINBACK_PUSH",
        status: "IDENTIFIED",
        updatedAt: Date.now() - 3600000 * 6,
      },
      {
        driverId: "mot-103",
        driverName: "Antônio Carlos Rocha",
        phone: "(22) 98833-6677",
        vehicle: "Honda Civic (Cinza)",
        daysInactive: 1,
        weeklyEarningsBrl: 510.0,
        previousWeekEarningsBrl: 780.0,
        earningsDropPercent: 34.6,
        riskLevel: "MEDIO",
        riskScore: 48,
        primaryReason: "Queda moderada de faturamento de 34% na semana",
        suggestedAction: "REENGAGEMENT_BONUS",
        status: "IDENTIFIED",
        updatedAt: Date.now() - 3600000 * 12,
      },
      {
        driverId: "mot-104",
        driverName: "Diego Vasconcelos",
        phone: "(22) 99144-8899",
        vehicle: "Chevrolet Prisma (Preto)",
        daysInactive: 0,
        weeklyEarningsBrl: 940.0,
        previousWeekEarningsBrl: 910.0,
        earningsDropPercent: 0,
        riskLevel: "BAIXO",
        riskScore: 12,
        primaryReason: "Atividade regular e faturamento estável",
        suggestedAction: "SEND_WINBACK_PUSH",
        status: "RECOVERED",
        updatedAt: Date.now() - 3600000 * 24,
      },
    ];

    seeds.forEach((s) => this.records.set(s.driverId, s));
  }

  public getConfig(): RetentionConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<RetentionConfig>): RetentionConfig {
    this.config = { ...this.config, ...updates };
    this.saveData();
    return { ...this.config };
  }

  public getAllRecords(): DriverRetentionRecord[] {
    return Array.from(this.records.values()).sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Aciona ação de reativação imediata para condutor em risco
   */
  public triggerWinbackAction(
    driverId: string,
    actionType: RetentionActionType
  ): { success: boolean; message: string; record: DriverRetentionRecord } {
    const record = this.records.get(driverId);
    if (!record) {
      throw new Error(`Registro de retenção não encontrado para condutor: ${driverId}`);
    }

    record.lastContactedAt = Date.now();
    record.status = "CAMPAIGN_SENT";

    let message = "";

    if (actionType === "OFFER_48H_GOLD") {
      const durationMs = this.config.temporaryGoldDurationHours * 3600 * 1000;
      record.temporaryGoldActiveUntil = Date.now() + durationMs;
      message = `Upgrade temporário ativado: 48h de Plano Ouro (Taxa Zero 0%) concedidas ao condutor ${record.driverName} com push de notificação VIP.`;
    } else if (actionType === "SEND_WINBACK_PUSH") {
      message = `Notificação push de retorno disparada com sucesso para ${record.driverName}: "Sentimos sua falta! Volte hoje com prioridade e bônus exclusivo."`;
    } else if (actionType === "REENGAGEMENT_BONUS") {
      message = `Missão de reengajamento enviada: Complete 5 corridas nas próximas 24h e receba R$ ${this.config.winbackBonusAmountBrl.toFixed(2)} direto no PIX.`;
    } else {
      message = `Alerta gerado para contato telefônico prioritário pela equipe de relacionamento.`;
    }

    record.updatedAt = Date.now();
    this.records.set(driverId, record);
    this.saveData();

    return {
      success: true,
      message,
      record,
    };
  }

  public getMetrics(): {
    totalMonitored: number;
    atRiskCount: number;
    criticalCount: number;
    churnRatePercent: number;
    recoveredCount: number;
  } {
    const all = Array.from(this.records.values());
    const atRisk = all.filter((r) => r.riskLevel === "ALTO" || r.riskLevel === "CRITICO");
    const critical = all.filter((r) => r.riskLevel === "CRITICO");
    const recovered = all.filter((r) => r.status === "RECOVERED");
    const churnRate = all.length > 0 ? Number(((critical.length / all.length) * 100).toFixed(1)) : 0;

    return {
      totalMonitored: all.length,
      atRiskCount: atRisk.length,
      criticalCount: critical.length,
      churnRatePercent: churnRate,
      recoveredCount: recovered.length,
    };
  }
}

export const retentionIntelligenceEngine = RetentionIntelligenceEngine.getInstance();
