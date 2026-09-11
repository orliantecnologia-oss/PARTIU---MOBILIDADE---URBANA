import { silentCatchWarn } from "@/lib/structured-logger";

/**
 * ==============================================================================
 * 🎖️ PARTIU REVENUE OS — DRIVER LOYALTY & PROGRESSION ENGINE (FASE 5)
 * ==============================================================================
 * Sistema de Progressão e Fidelidade Baseado em Atividade e Qualidade:
 * - Tiers: INICIANTE | PROFISSIONAL | ELITE | LENDÁRIO
 * - Critérios: Corridas concluídas, Avaliação (★), Taxa de cancelamento, Tempo ativo
 * - Benefícios: Selo visual no cockpit, destaque no perfil, suporte VIP, campanhas exclusivas
 * - REGRA FUNDAMENTAL: SEM alterar comissão. SEM alterar ganhos. SEM prejudicar outros condutores.
 * ==============================================================================
 */

export type DriverLoyaltyTier = "INICIANTE" | "PROFISSIONAL" | "ELITE" | "LENDARIO";

export interface LoyaltyTierThreshold {
  tier: DriverLoyaltyTier;
  name: string;
  minCompletedTrips: number;
  minRating: number;
  maxCancellationRatePercent: number;
  minOnlineHours: number;
  badgeLabel: string;
  badgeColor: string;
  badgeIcon: string;
  description: string;
  benefits: string[];
}

export interface DriverLoyaltyProfile {
  driverId: string;
  tier: DriverLoyaltyTier;
  tierName: string;
  badgeLabel: string;
  badgeColor: string;
  badgeIcon: string;
  completedTrips: number;
  rating: number;
  cancellationRatePercent: number;
  onlineHoursTotal: number;
  benefits: string[];
  nextTierProgressPercent: number;
  tripsToNextTier: number;
  hasPrioritySupport: boolean;
  hasExclusiveCampaigns: boolean;
  updatedAt: number;
}

export const LOYALTY_TIER_THRESHOLDS: LoyaltyTierThreshold[] = [
  {
    tier: "INICIANTE",
    name: "Iniciante",
    minCompletedTrips: 0,
    minRating: 4.0,
    maxCancellationRatePercent: 20.0,
    minOnlineHours: 0,
    badgeLabel: "🥉 Iniciante",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
    badgeIcon: "🥉",
    description: "Boas-vindas ao PARTIU! Primeiros passos com suporte guiado e trip radar.",
    benefits: [
      "Selo visual Bronze Iniciante no cockpit",
      "Acesso completo a todas as chamadas do radar",
      "Recebimento instantâneo via PIX D+0",
      "Central de Ajuda via aplicativo",
    ],
  },
  {
    tier: "PROFISSIONAL",
    name: "Profissional",
    minCompletedTrips: 50,
    minRating: 4.80,
    maxCancellationRatePercent: 8.0,
    minOnlineHours: 40,
    badgeLabel: "🥈 Profissional",
    badgeColor: "bg-slate-200 text-slate-900 border-slate-400",
    badgeIcon: "🥈",
    description: "Condutor experiente com alto padrão de pontualidade e excelência.",
    benefits: [
      "Selo visual Prata Profissional destacado",
      "Fila preferencial no atendimento do suporte",
      "Convite para campanhas promocionais sazonais",
      "Acesso antecipado a novas regiões de demanda",
    ],
  },
  {
    tier: "ELITE",
    name: "Elite",
    minCompletedTrips: 200,
    minRating: 4.90,
    maxCancellationRatePercent: 4.0,
    minOnlineHours: 150,
    badgeLabel: "🥇 Elite",
    badgeColor: "bg-primary-50 text-amber-900 border-primary-500",
    badgeIcon: "🥇",
    description: "Top 10% dos condutores da cidade em avaliações e consistência.",
    benefits: [
      "Selo Dourado Elite com brilho visual no cockpit",
      "Suporte humano dedicado via WhatsApp direto",
      "Participação em missões com bônus de fidelidade",
      "Reconhecimento institucional no ranking da cidade",
    ],
  },
  {
    tier: "LENDARIO",
    name: "Lendário",
    minCompletedTrips: 500,
    minRating: 4.96,
    maxCancellationRatePercent: 2.0,
    minOnlineHours: 400,
    badgeLabel: "💎 Lendário",
    badgeColor: "bg-sky-100 text-sky-950 border-sky-400",
    badgeIcon: "💎",
    description: "Embaixador de mobilidade urbana com nota quase perfeita e dedicação máxima.",
    benefits: [
      "Selo Diamante Lendário exclusivo e distintivo VIP",
      "Linha direta 24/7 com a Diretoria Operacional",
      "Bônus de indicação com multiplicador exclusivo",
      "Participação no Comitê Consultivo de Condutores",
    ],
  },
];

const STORAGE_LOYALTY_KEY = "partiu_driver_loyalty_profiles_v1";

export class DriverLoyaltyEngine {
  private static instance: DriverLoyaltyEngine;
  private profiles: Map<string, DriverLoyaltyProfile> = new Map();

  private constructor() {
    this.loadProfiles();
  }

  public static getInstance(): DriverLoyaltyEngine {
    if (!DriverLoyaltyEngine.instance) {
      DriverLoyaltyEngine.instance = new DriverLoyaltyEngine();
    }
    return DriverLoyaltyEngine.instance;
  }

  private loadProfiles(): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_LOYALTY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, DriverLoyaltyProfile>;
        Object.entries(parsed).forEach(([id, prof]) => this.profiles.set(id, prof));
      }
    } catch (err) { silentCatchWarn("driver-loyalty-engine", err); }
  }

  private saveProfiles(): void {
    if (typeof window === "undefined") return;
    try {
      const obj: Record<string, DriverLoyaltyProfile> = {};
      this.profiles.forEach((p, id) => {
        obj[id] = p;
      });
      localStorage.setItem(STORAGE_LOYALTY_KEY, JSON.stringify(obj));
    } catch (err) { silentCatchWarn("driver-loyalty-engine", err); }
  }

  public getAllTiers(): LoyaltyTierThreshold[] {
    return [...LOYALTY_TIER_THRESHOLDS];
  }

  /**
   * Avalia as estatísticas do condutor e calcula o Tier de Fidelidade
   */
  public evaluateProgression(params: {
    driverId: string;
    completedTrips: number;
    rating: number;
    cancellationRatePercent?: number | undefined;
    onlineHoursTotal?: number | undefined;
  }): DriverLoyaltyProfile {
    const { driverId, completedTrips, rating } = params;
    const cancelRate = params.cancellationRatePercent ?? 3.5;
    const onlineHours = params.onlineHoursTotal ?? Math.max(10, completedTrips * 0.45);

    // Determina o maior Tier que o condutor preenche todos os requisitos
    let currentTierThreshold: LoyaltyTierThreshold = LOYALTY_TIER_THRESHOLDS[0]!;

    for (let i = LOYALTY_TIER_THRESHOLDS.length - 1; i >= 0; i--) {
      const candidate = LOYALTY_TIER_THRESHOLDS[i];
      if (
        candidate &&
        completedTrips >= candidate.minCompletedTrips &&
        rating >= candidate.minRating &&
        cancelRate <= candidate.maxCancellationRatePercent &&
        onlineHours >= candidate.minOnlineHours
      ) {
        currentTierThreshold = candidate;
        break;
      }
    }

    // Identifica o próximo Tier para meta de progresso
    const currentIndex = LOYALTY_TIER_THRESHOLDS.findIndex((t) => t.tier === currentTierThreshold.tier);
    const nextTier: LoyaltyTierThreshold | null =
      currentIndex >= 0 && currentIndex < LOYALTY_TIER_THRESHOLDS.length - 1
        ? (LOYALTY_TIER_THRESHOLDS[currentIndex + 1] ?? null)
        : null;

    let nextTierProgressPercent = 100;
    let tripsToNextTier = 0;

    if (nextTier) {
      const prevMin = currentTierThreshold.minCompletedTrips;
      const targetMin = nextTier.minCompletedTrips;
      const progressRange = targetMin - prevMin;
      const currentProgress = Math.max(0, completedTrips - prevMin);
      nextTierProgressPercent = Math.min(99, Math.round((currentProgress / progressRange) * 100));
      tripsToNextTier = Math.max(0, targetMin - completedTrips);
    }

    const profile: DriverLoyaltyProfile = {
      driverId,
      tier: currentTierThreshold.tier,
      tierName: currentTierThreshold.name,
      badgeLabel: currentTierThreshold.badgeLabel,
      badgeColor: currentTierThreshold.badgeColor,
      badgeIcon: currentTierThreshold.badgeIcon,
      completedTrips,
      rating,
      cancellationRatePercent: cancelRate,
      onlineHoursTotal: Math.round(onlineHours),
      benefits: [...currentTierThreshold.benefits],
      nextTierProgressPercent,
      tripsToNextTier,
      hasPrioritySupport: currentTierThreshold.tier !== "INICIANTE",
      hasExclusiveCampaigns: currentTierThreshold.tier === "ELITE" || currentTierThreshold.tier === "LENDARIO",
      updatedAt: Date.now(),
    };

    this.profiles.set(driverId, profile);
    this.saveProfiles();
    return profile;
  }

  public getProfile(driverId: string): DriverLoyaltyProfile {
    const existing = this.profiles.get(driverId);
    if (existing) return existing;

    // Perfil padrão inicial para novo condutor
    return this.evaluateProgression({
      driverId,
      completedTrips: 120, // Demonstração realista
      rating: 4.92,
      cancellationRatePercent: 2.8,
      onlineHoursTotal: 65,
    });
  }
}

export const driverLoyaltyEngine = DriverLoyaltyEngine.getInstance();
