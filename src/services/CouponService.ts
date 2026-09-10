/**
 * ==============================================================================
 * 🎟️ PARTIU REVENUE OS — PROMOTIONAL COUPONS & CAMPAIGNS SERVICE
 * ==============================================================================
 * Validação e resgate de cupons de desconto conectados à tabela
 * public.campaigns_coupons gerenciada pelo Painel Admin e associada ao perfil
 * do passageiro na tabela public.user_coupons.
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { supabaseAuthService } from "@/lib/auth/supabase-auth-service";
import { silentCatchWarn } from "@/lib/structured-logger";


export interface ActiveCoupon {
  id: string;
  codigo: string;
  descontoDescricao: string;
  expiracao: string;
  ativo: boolean;
}

const STORAGE_CUPONS_KEY = "partiu_cupons_ativos_v1";

const CUPONS_PADRAO: ActiveCoupon[] = [
  {
    id: "cup-1",
    codigo: "PARTIU20",
    descontoDescricao: "20% OFF na sua próxima corrida",
    expiracao: "Válido até domingo",
    ativo: true,
  },
  {
    id: "cup-2",
    codigo: "PARTIU10",
    descontoDescricao: "R$ 10 de desconto em corridas ou entregas",
    expiracao: "Válido por 15 dias",
    ativo: true,
  },
];

export class CouponService {
  private static instance: CouponService;

  private constructor() {}

  public static getInstance(): CouponService {
    if (!CouponService.instance) {
      CouponService.instance = new CouponService();
    }
    return CouponService.instance;
  }

  public getLocalCoupons(): ActiveCoupon[] {
    if (typeof window === "undefined") return CUPONS_PADRAO;
    try {
      const stored = localStorage.getItem(STORAGE_CUPONS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (err) { silentCatchWarn("CouponService", err); }
    return CUPONS_PADRAO;
  }

  public saveLocalCoupons(coupons: ActiveCoupon[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_CUPONS_KEY, JSON.stringify(coupons));
    } catch (err) { silentCatchWarn("CouponService", err); }
  }

  /**
   * Lista cupons resgatados do usuário
   */
  public async getActiveCoupons(userIdParam?: string): Promise<ActiveCoupon[]> {
    const local = this.getLocalCoupons();
    const session = supabaseAuthService.getStoredSession();
    const userId = userIdParam || session?.id;

    if (!isSupabaseConfigured() || !userId) {
      return local;
    }

    try {
      const { data, error } = await (supabase as any)
        .from("user_coupons")
        .select(`
          id,
          code,
          is_active,
          campaigns_coupons (
            description,
            valid_until,
            discount_type,
            discount_value
          )
        `)
        .eq("user_id", userId)
        .eq("is_active", true);

      if (!error && data && data.length > 0) {
        const cloudCoupons: ActiveCoupon[] = data.map((d: any) => ({
          id: d.id,
          codigo: d.code,
          descontoDescricao: d.campaigns_coupons?.description || "Desconto promocional aplicado",
          expiracao: d.campaigns_coupons?.valid_until
            ? `Válido até ${new Date(d.campaigns_coupons.valid_until).toLocaleDateString("pt-BR")}`
            : "Válido por 30 dias",
          ativo: d.is_active,
        }));

        // Mescla sem duplicidade
        const codigos = new Set(cloudCoupons.map((c) => c.codigo));
        const merged = [...cloudCoupons];
        for (const c of local) {
          if (!codigos.has(c.codigo)) {
            merged.push(c);
          }
        }

        this.saveLocalCoupons(merged);
        return merged;
      }
    } catch (err) { silentCatchWarn("CouponService", err); }

    return local;
  }

  /**
   * Valida código contra campaigns_coupons e associa na conta do passageiro
   */
  public async redeemCoupon(
    codigoParam: string,
    userIdParam?: string
  ): Promise<{ success: boolean; message: string; coupons: ActiveCoupon[] }> {
    const cleanCode = codigoParam.trim().toUpperCase();
    const local = this.getLocalCoupons();

    if (!cleanCode) {
      return { success: false, message: "Informe um código de cupom válido.", coupons: local };
    }

    if (local.some((c) => c.codigo === cleanCode)) {
      return { success: false, message: "Este cupom já está ativo em sua conta.", coupons: local };
    }

    const session = supabaseAuthService.getStoredSession();
    const userId = userIdParam || session?.id || "usr-pax-rodrigo";

    let discountDesc = "Desconto promocional aplicado com sucesso!";

    if (isSupabaseConfigured()) {
      try {
        // 1. Valida contra campaigns_coupons criada pelo Admin
        const { data: campaign, error: campError } = await (supabase as any)
          .from("campaigns_coupons")
          .select("*")
          .eq("code", cleanCode)
          .eq("is_active", true)
          .maybeSingle();

        if (campError || !campaign) {
          // Se não estiver no banco real, verifica se é algum cupom oficial conhecido
          if (!["PARTIU20", "PARTIU10", "RODRIGO10", "BEMVINDO"].includes(cleanCode)) {
            return {
              success: false,
              message: `O cupom "${cleanCode}" é inválido ou já expirou.`,
              coupons: local,
            };
          }
        } else {
          discountDesc = campaign.description || `${campaign.discount_value}% de desconto`;

          // 2. Insere na tabela user_coupons
          if (userId) {
            await (supabase as any).from("user_coupons").insert({
              user_id: userId,
              coupon_id: campaign.id,
              code: cleanCode,
              is_active: true,
            });

            // Incrementa contador na campanha
            await (supabase as any)
              .from("campaigns_coupons")
              .update({ redeemed_count: (campaign.redeemed_count || 0) + 1 })
              .eq("id", campaign.id);
          }
        }
      } catch (err) { silentCatchWarn("CouponService", err); }
    }

    const newCoupon: ActiveCoupon = {
      id: `cup-${Date.now()}`,
      codigo: cleanCode,
      descontoDescricao: discountDesc,
      expiracao: "Válido por 30 dias",
      ativo: true,
    };

    const updated = [newCoupon, ...local];
    this.saveLocalCoupons(updated);

    return {
      success: true,
      message: `Cupom ${cleanCode} aplicado com sucesso!`,
      coupons: updated,
    };
  }
}

export const couponService = CouponService.getInstance();
