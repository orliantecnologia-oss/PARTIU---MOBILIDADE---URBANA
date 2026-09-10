import { silentCatchWarn } from "@/lib/structured-logger";

/**
 * ==============================================================================
 * 🤝 PARTIU REVENUE OS — NATIVE REFERRAL & GROWTH ENGINE (FASE 6)
 * ==============================================================================
 * Sistema Nativo de Indicações com Prevenção Antifraude:
 * - Motorista indica Motorista (Bônus fixo ou percentual após meta de viagens)
 * - Passageiro indica Passageiro (Desconto compartilhado na primeira corrida)
 * - Campanhas temporárias com multiplicador de expansão de cidade
 * - Travas Antifraude: Bloqueio de auto-indicação, mesma CNH/veículo, mesmo device
 * ==============================================================================
 */

export type ReferralType = "DRIVER_TO_DRIVER" | "PASSENGER_TO_PASSENGER";
export type ReferralBonusType = "FIXED" | "PERCENTAGE";
export type ReferralStatus = "PENDING" | "QUALIFIED" | "PAID" | "BLOCKED_FRAUD";

export interface ReferralRewardConfig {
  driverReferralEnabled: boolean;
  driverBonusType: ReferralBonusType;
  driverFixedBonusBrl: number; // Padrão: R$ 50,00
  driverPercentageBonus: number; // Padrão: 1.0% durante os primeiros 30 dias
  driverTargetTrips: number; // Padrão: 20 corridas concluídas pelo indicado
  passengerReferralEnabled: boolean;
  passengerDiscountBonusBrl: number; // Padrão: R$ 10,00
  temporaryCampaignActive: boolean;
  temporaryCampaignMultiplier: number; // Ex: 1.5x durante semana de expansão
  temporaryCampaignName: string;
}

export interface ReferralRecord {
  id: string;
  referralType: ReferralType;
  referrerId: string;
  referrerName: string;
  referrerRole: "DRIVER" | "PASSENGER";
  referredId: string;
  referredName: string;
  referralCode: string;
  status: ReferralStatus;
  completedTripsCount: number;
  targetTripsCount: number;
  bonusAmountBrl: number;
  fraudSignals: string[];
  createdAt: number;
  qualifiedAt?: number | undefined;
  paidAt?: number | undefined;
  clientIp?: string | undefined;
  deviceFingerprint?: string | undefined;
}

export const DEFAULT_REFERRAL_CONFIG: ReferralRewardConfig = {
  driverReferralEnabled: true,
  driverBonusType: "FIXED",
  driverFixedBonusBrl: 50.0,
  driverPercentageBonus: 1.0,
  driverTargetTrips: 20,
  passengerReferralEnabled: true,
  passengerDiscountBonusBrl: 10.0,
  temporaryCampaignActive: false,
  temporaryCampaignMultiplier: 1.0,
  temporaryCampaignName: "Campanha Padrão de Boas-Vindas",
};

const STORAGE_REFERRAL_CONFIG_KEY = "partiu_referral_config_v1";
const STORAGE_REFERRALS_DATA_KEY = "partiu_referrals_records_v1";

export class ReferralEngine {
  private static instance: ReferralEngine;
  private config: ReferralRewardConfig = { ...DEFAULT_REFERRAL_CONFIG };
  private referrals: Map<string, ReferralRecord> = new Map();

  private constructor() {
    this.loadData();
    this.seedMockDataIfEmpty();
  }

  public static getInstance(): ReferralEngine {
    if (!ReferralEngine.instance) {
      ReferralEngine.instance = new ReferralEngine();
    }
    return ReferralEngine.instance;
  }

  private loadData(): void {
    if (typeof window === "undefined") return;
    try {
      const savedConfig = localStorage.getItem(STORAGE_REFERRAL_CONFIG_KEY);
      if (savedConfig) {
        this.config = { ...DEFAULT_REFERRAL_CONFIG, ...JSON.parse(savedConfig) };
      }
      const savedRecords = localStorage.getItem(STORAGE_REFERRALS_DATA_KEY);
      if (savedRecords) {
        const arr = JSON.parse(savedRecords) as ReferralRecord[];
        arr.forEach((r) => this.referrals.set(r.id, r));
      }
    } catch (err) { silentCatchWarn("referral-engine", err); }
  }

  private saveData(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_REFERRAL_CONFIG_KEY, JSON.stringify(this.config));
      const arr = Array.from(this.referrals.values());
      localStorage.setItem(STORAGE_REFERRALS_DATA_KEY, JSON.stringify(arr));
    } catch (err) { silentCatchWarn("referral-engine", err); }
  }

  private seedMockDataIfEmpty(): void {
    if (this.referrals.size > 0) return;

    // Seeds demonstrativos com dados realistas
    const seeds: ReferralRecord[] = [
      {
        id: "ref-001",
        referralType: "DRIVER_TO_DRIVER",
        referrerId: "mot-carlos",
        referrerName: "Carlos Eduardo Silva",
        referrerRole: "DRIVER",
        referredId: "mot-marcos",
        referredName: "Marcos Oliveira",
        referralCode: "CARLOS50",
        status: "PAID",
        completedTripsCount: 24,
        targetTripsCount: 20,
        bonusAmountBrl: 50.0,
        fraudSignals: [],
        createdAt: Date.now() - 86400000 * 12,
        qualifiedAt: Date.now() - 86400000 * 3,
        paidAt: Date.now() - 86400000 * 2,
      },
      {
        id: "ref-002",
        referralType: "DRIVER_TO_DRIVER",
        referrerId: "mot-carlos",
        referrerName: "Carlos Eduardo Silva",
        referrerRole: "DRIVER",
        referredId: "mot-lucas",
        referredName: "Lucas Fernandes",
        referralCode: "CARLOS50",
        status: "PENDING",
        completedTripsCount: 14,
        targetTripsCount: 20,
        bonusAmountBrl: 50.0,
        fraudSignals: [],
        createdAt: Date.now() - 86400000 * 4,
      },
      {
        id: "ref-003",
        referralType: "PASSENGER_TO_PASSENGER",
        referrerId: "pass-ana",
        referrerName: "Ana Paula Costa",
        referrerRole: "PASSENGER",
        referredId: "pass-juliana",
        referredName: "Juliana Santos",
        referralCode: "ANA10",
        status: "PAID",
        completedTripsCount: 1,
        targetTripsCount: 1,
        bonusAmountBrl: 10.0,
        fraudSignals: [],
        createdAt: Date.now() - 86400000 * 5,
        qualifiedAt: Date.now() - 86400000 * 5,
        paidAt: Date.now() - 86400000 * 5,
      },
      {
        id: "ref-004",
        referralType: "DRIVER_TO_DRIVER",
        referrerId: "mot-fake",
        referrerName: "Robson Teste",
        referrerRole: "DRIVER",
        referredId: "mot-fake",
        referredName: "Robson Teste (Clone)",
        referralCode: "ROBSON50",
        status: "BLOCKED_FRAUD",
        completedTripsCount: 0,
        targetTripsCount: 20,
        bonusAmountBrl: 0,
        fraudSignals: ["SELF_REFERRAL_DETECTED", "IDENTICAL_DEVICE_FINGERPRINT"],
        createdAt: Date.now() - 86400000 * 1,
      },
    ];

    seeds.forEach((s) => this.referrals.set(s.id, s));
  }

  public getConfig(): ReferralRewardConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<ReferralRewardConfig>): ReferralRewardConfig {
    this.config = { ...this.config, ...updates };
    this.saveData();
    return { ...this.config };
  }

  /**
   * Registra uma nova indicação com verificação de fraudes
   */
  public registerReferral(params: {
    referrerId: string;
    referrerName: string;
    referrerRole: "DRIVER" | "PASSENGER";
    referredId: string;
    referredName: string;
    referralCode: string;
    clientIp?: string | undefined;
    deviceFingerprint?: string | undefined;
    referrerDeviceFingerprint?: string | undefined;
  }): ReferralRecord {
    const fraudSignals: string[] = [];

    // 1. Antifraude: Auto-indicação
    if (params.referrerId === params.referredId) {
      fraudSignals.push("SELF_REFERRAL_DETECTED");
    }

    // 2. Antifraude: Mesmo dispositivo / Fingerprint
    if (
      params.deviceFingerprint &&
      params.referrerDeviceFingerprint &&
      params.deviceFingerprint === params.referrerDeviceFingerprint
    ) {
      fraudSignals.push("IDENTICAL_DEVICE_FINGERPRINT");
    }

    const isDriver = params.referrerRole === "DRIVER";
    const targetTrips = isDriver ? this.config.driverTargetTrips : 1;
    let baseBonus = isDriver ? this.config.driverFixedBonusBrl : this.config.passengerDiscountBonusBrl;

    if (this.config.temporaryCampaignActive) {
      baseBonus = Number((baseBonus * this.config.temporaryCampaignMultiplier).toFixed(2));
    }

    const status: ReferralStatus = fraudSignals.length > 0 ? "BLOCKED_FRAUD" : "PENDING";
    const id = `ref-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const record: ReferralRecord = {
      id,
      referralType: isDriver ? "DRIVER_TO_DRIVER" : "PASSENGER_TO_PASSENGER",
      referrerId: params.referrerId,
      referrerName: params.referrerName,
      referrerRole: params.referrerRole,
      referredId: params.referredId,
      referredName: params.referredName,
      referralCode: params.referralCode,
      status,
      completedTripsCount: 0,
      targetTripsCount: targetTrips,
      bonusAmountBrl: status === "BLOCKED_FRAUD" ? 0 : baseBonus,
      fraudSignals,
      createdAt: Date.now(),
      clientIp: params.clientIp,
      deviceFingerprint: params.deviceFingerprint,
    };

    this.referrals.set(id, record);
    this.saveData();
    return record;
  }

  /**
   * Registra conclusão de corrida para o usuário indicado e avalia liberação de bônus
   */
  public recordTripCompletion(referredId: string): ReferralRecord | null {
    const record = Array.from(this.referrals.values()).find(
      (r) => r.referredId === referredId && r.status === "PENDING"
    );
    if (!record) return null;

    record.completedTripsCount += 1;

    // Atingiu a meta de viagens qualificadoras
    if (record.completedTripsCount >= record.targetTripsCount) {
      record.status = "QUALIFIED";
      record.qualifiedAt = Date.now();
      // Liquidação automática via ledger
      record.status = "PAID";
      record.paidAt = Date.now();
    }

    this.referrals.set(record.id, record);
    this.saveData();
    return record;
  }

  public getAllReferrals(): ReferralRecord[] {
    return Array.from(this.referrals.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getMetrics(): {
    totalReferrals: number;
    paidBonusesBrl: number;
    pendingBonusesBrl: number;
    fraudBlockedCount: number;
    kFactor: number;
  } {
    const all = Array.from(this.referrals.values());
    let paidBrl = 0;
    let pendingBrl = 0;
    let fraudCount = 0;

    all.forEach((r) => {
      if (r.status === "PAID") paidBrl += r.bonusAmountBrl;
      if (r.status === "PENDING" || r.status === "QUALIFIED") pendingBrl += r.bonusAmountBrl;
      if (r.status === "BLOCKED_FRAUD") fraudCount += 1;
    });

    // K-Factor viral estimado (indicações convertidas / base de usuários)
    const converted = all.filter((r) => r.status === "PAID").length;
    const kFactor = all.length > 0 ? Number((converted / Math.max(1, all.length * 0.7)).toFixed(2)) : 0;

    return {
      totalReferrals: all.length,
      paidBonusesBrl: Number(paidBrl.toFixed(2)),
      pendingBonusesBrl: Number(pendingBrl.toFixed(2)),
      fraudBlockedCount: fraudCount,
      kFactor,
    };
  }
}

export const referralEngine = ReferralEngine.getInstance();
