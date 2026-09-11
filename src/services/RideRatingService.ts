/**
 * ==============================================================================
 * ⭐ PARTIU SOCIAL SAFETY & QUALITATIVE REPUTATION ENGINE (PADRÃO 99)
 * ==============================================================================
 * Sistema de avaliações mútuas com notas de 1 a 5 estrelas e chips qualitativos
 * com tags de elogios e pontos de melhoria, alimentando o score de reputação.
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { silentCatchWarn } from "@/lib/structured-logger";

export type RatingRole = "PASSENGER_TO_DRIVER" | "DRIVER_TO_PASSENGER";

export interface RideRating {
  id: string;
  rideId: string;
  fromUserId: string;
  toUserId: string;
  role: RatingRole;
  score: number; // 1 a 5
  tags: string[];
  comment?: string | null;
  tenantId: string;
  createdAt: string;
}

export interface SubmitRatingInput {
  rideId: string;
  fromUserId: string;
  toUserId: string;
  role: RatingRole;
  score: number;
  tags: string[];
  comment?: string;
  tenantId?: string;
}

export const TAGS_99_PASSENGER_TO_DRIVER_POSITIVE = [
  "Carro limpo",
  "Ar-condicionado ligado",
  "Direção segura",
  "Excelente conversa",
  "Música agradável",
  "Veículo cheiroso",
  "Rota rápida",
  "Gentil e educado",
];

export const TAGS_99_PASSENGER_TO_DRIVER_IMPROVEMENT = [
  "Direção brusca",
  "Carro sujo",
  "Não ligou o ar",
  "Desvio de trajeto",
  "Celular ao volante",
  "Música alta",
];

export const TAGS_99_DRIVER_TO_PASSENGER = [
  "Pontual no embarque",
  "Gentil e educado",
  "Local de fácil parada",
  "Respeitou o veículo",
  "Excelente passageiro",
];

export class RideRatingService {
  private static instance: RideRatingService;
  private localRatings: Map<string, RideRating> = new Map();

  private constructor() {}

  public static getInstance(): RideRatingService {
    if (!RideRatingService.instance) {
      RideRatingService.instance = new RideRatingService();
    }
    return RideRatingService.instance;
  }

  /**
   * Envia uma avaliação mútua
   */
  public async submitRating(input: SubmitRatingInput): Promise<RideRating> {
    const id = `rate-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const rating: RideRating = {
      id,
      rideId: input.rideId,
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      role: input.role,
      score: Math.min(Math.max(Math.round(input.score), 1), 5),
      tags: input.tags || [],
      comment: input.comment || null,
      tenantId: input.tenantId || "default",
      createdAt: now,
    };

    // Salva no store em memória
    this.localRatings.set(rating.id, rating);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await (supabase as any).from("ride_ratings").insert({
          id: rating.id,
          ride_id: rating.rideId,
          from_user_id: rating.fromUserId,
          to_user_id: rating.toUserId,
          role: rating.role,
          score: rating.score,
          tags: rating.tags,
          comment: rating.comment,
          tenant_id: rating.tenantId,
          created_at: rating.createdAt,
        });

        if (error) {
          silentCatchWarn("RideRatingService.submitRating", error);
        }
      } catch (err) {
        silentCatchWarn("RideRatingService.submitRating", err);
      }
    }

    return rating;
  }

  /**
   * Obtém histórico e média calculada de um condutor ou passageiro
   */
  public async getUserRatingSummary(toUserId: string): Promise<{
    averageScore: number;
    totalRatings: number;
    topTags: { tag: string; count: number }[];
    recentRatings: RideRating[];
  }> {
    let list: RideRating[] = [];

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await (supabase as any)
          .from("ride_ratings")
          .select("*")
          .eq("to_user_id", toUserId)
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          list = data.map(this.mapRowToRating);
        }
      } catch (err) {
        silentCatchWarn("RideRatingService.getUserRatingSummary", err);
      }
    }

    if (list.length === 0) {
      list = Array.from(this.localRatings.values()).filter((r) => r.toUserId === toUserId);
    }

    if (list.length === 0) {
      return {
        averageScore: 5.0,
        totalRatings: 0,
        topTags: [],
        recentRatings: [],
      };
    }

    const total = list.length;
    const sum = list.reduce((acc, curr) => acc + curr.score, 0);
    const averageScore = Math.round((sum / total) * 100) / 100;

    // Contagem de frequência de tags
    const tagCountMap = new Map<string, number>();
    for (const r of list) {
      for (const t of r.tags) {
        tagCountMap.set(t, (tagCountMap.get(t) || 0) + 1);
      }
    }

    const topTags = Array.from(tagCountMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      averageScore,
      totalRatings: total,
      topTags,
      recentRatings: list.slice(0, 10),
    };
  }

  private mapRowToRating(row: any): RideRating {
    return {
      id: row.id,
      rideId: row.ride_id,
      fromUserId: row.from_user_id,
      toUserId: row.to_user_id,
      role: row.role,
      score: row.score,
      tags: row.tags || [],
      comment: row.comment,
      tenantId: row.tenant_id,
      createdAt: row.created_at,
    };
  }

  public resetLocalStore(): void {
    this.localRatings.clear();
  }
}

export const rideRatingService = RideRatingService.getInstance();
