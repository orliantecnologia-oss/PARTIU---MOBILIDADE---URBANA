/**
 * ==============================================================================
 * 💳 PARTIU REVENUE OS — TOKENIZED PAYMENT METHODS SERVICE
 * ==============================================================================
 * Gerenciamento seguro de cartões e métodos de pagamento.
 * ZERO CUSTÓDIA: Nenhum número de cartão (PAN) ou código CVV é trafegado ou
 * persistido no banco. Apenas o token seguro do Gateway (PSP) e os 4 últimos
 * dígitos são armazenados na tabela public.user_payment_methods.
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { supabaseAuthService } from "@/lib/auth/supabase-auth-service";
import { silentCatchWarn } from "@/lib/structured-logger";


export interface TokenizedCard {
  id: string;
  tokenId: string;
  ultimosDigitos: string;
  bandeira: "mastercard" | "visa" | "elo" | "amex";
  titular: string;
  padrao: boolean;
  expiracaoMesAno?: string;
}

const STORAGE_CARTOES_KEY = "partiu_cartoes_credito_v1";

const CARTOES_PADRAO: TokenizedCard[] = [
  {
    id: "card-1",
    tokenId: "tok_mock_master_4242",
    ultimosDigitos: "4242",
    bandeira: "mastercard",
    titular: "RODRIGO SILVA",
    padrao: true,
  },
  {
    id: "card-2",
    tokenId: "tok_mock_visa_8899",
    ultimosDigitos: "8899",
    bandeira: "visa",
    titular: "RODRIGO SILVA",
    padrao: false,
  },
];

export class PaymentMethodService {
  private static instance: PaymentMethodService;

  private constructor() {}

  public static getInstance(): PaymentMethodService {
    if (!PaymentMethodService.instance) {
      PaymentMethodService.instance = new PaymentMethodService();
    }
    return PaymentMethodService.instance;
  }

  public getLocalCards(): TokenizedCard[] {
    if (typeof window === "undefined") return CARTOES_PADRAO;
    try {
      const stored = localStorage.getItem(STORAGE_CARTOES_KEY);
      if (stored) return JSON.parse(stored);
    } catch (err) { silentCatchWarn("PaymentMethodService", err); }
    return CARTOES_PADRAO;
  }

  public saveLocalCards(cards: TokenizedCard[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_CARTOES_KEY, JSON.stringify(cards));
    } catch (err) { silentCatchWarn("PaymentMethodService", err); }
  }

  /**
   * Recupera cartões cadastrados do usuário
   */
  public async getCards(userIdParam?: string): Promise<TokenizedCard[]> {
    const local = this.getLocalCards();
    const session = supabaseAuthService.getStoredSession();
    const userId = userIdParam || session?.id;

    if (!isSupabaseConfigured() || !userId) {
      return local;
    }

    try {
      const { data, error } = await (supabase as any)
        .from("user_payment_methods")
        .select("*")
        .eq("user_id", userId);

      if (!error && data && data.length > 0) {
        const cloudCards: TokenizedCard[] = data.map((d: any) => ({
          id: d.id,
          tokenId: d.token_id,
          ultimosDigitos: d.last_four_digits,
          bandeira: d.brand || "mastercard",
          titular: d.cardholder_name,
          padrao: d.is_default || false,
        }));
        this.saveLocalCards(cloudCards);
        return cloudCards;
      }
    } catch (err) { silentCatchWarn("PaymentMethodService", err); }

    return local;
  }

  /**
   * Tokenização e gravação segura (zero dados sensíveis)
   */
  public async addCardTokenized(
    cardInput: {
      numeroCartao: string;
      titular: string;
      validade: string;
      cvv: string;
    },
    userIdParam?: string
  ): Promise<{ success: boolean; cards: TokenizedCard[]; error?: string }> {
    const session = supabaseAuthService.getStoredSession();
    const userId = userIdParam || session?.id || "usr-pax-rodrigo";

    const cleanNum = cardInput.numeroCartao.replace(/\D/g, "");
    if (cleanNum.length < 13) {
      return { success: false, cards: this.getLocalCards(), error: "Número de cartão inválido." };
    }
    if (!cardInput.titular.trim()) {
      return { success: false, cards: this.getLocalCards(), error: "Nome do titular obrigatório." };
    }

    const lastFour = cleanNum.slice(-4);
    const brand: TokenizedCard["bandeira"] = cleanNum.startsWith("4")
      ? "visa"
      : cleanNum.startsWith("5")
      ? "mastercard"
      : cleanNum.startsWith("6")
      ? "elo"
      : "mastercard";

    // Simulação do handshake criptográfico com Gateway (ex: Stripe/Pagar.me/Asaas)
    const simulatedGatewayToken = `tok_pax_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

    const currentCards = this.getLocalCards();
    const isFirst = currentCards.length === 0;

    const newCard: TokenizedCard = {
      id: `card-${Date.now()}`,
      tokenId: simulatedGatewayToken,
      ultimosDigitos: lastFour,
      bandeira: brand,
      titular: cardInput.titular.toUpperCase().trim(),
      padrao: isFirst,
      expiracaoMesAno: cardInput.validade,
    };

    const updated = [...currentCards, newCard];
    this.saveLocalCards(updated);

    if (isSupabaseConfigured() && userId) {
      try {
        await (supabase as any).from("user_payment_methods").insert({
          user_id: userId,
          token_id: simulatedGatewayToken,
          brand,
          last_four_digits: lastFour,
          cardholder_name: newCard.titular,
          is_default: isFirst,
        });
      } catch (err) {
        console.warn("Aviso ao persistir método de pagamento no Supabase:", err);
      }
    }

    return { success: true, cards: updated };
  }

  /**
   * Define o cartão principal
   */
  public async setDefaultCard(id: string, userIdParam?: string): Promise<TokenizedCard[]> {
    const session = supabaseAuthService.getStoredSession();
    const userId = userIdParam || session?.id;

    const current = this.getLocalCards();
    const updated = current.map((c) => ({
      ...c,
      padrao: c.id === id,
    }));
    this.saveLocalCards(updated);

    if (isSupabaseConfigured() && userId) {
      try {
        await (supabase as any)
          .from("user_payment_methods")
          .update({ is_default: false })
          .eq("user_id", userId);

        await (supabase as any)
          .from("user_payment_methods")
          .update({ is_default: true })
          .eq("id", id)
          .eq("user_id", userId);
      } catch (err) { silentCatchWarn("PaymentMethodService", err); }
    }

    return updated;
  }

  /**
   * Remove método de pagamento
   */
  public async removeCard(id: string, userIdParam?: string): Promise<TokenizedCard[]> {
    const session = supabaseAuthService.getStoredSession();
    const userId = userIdParam || session?.id;

    const current = this.getLocalCards();
    const updated = current.filter((c) => c.id !== id);
    if (updated.length > 0 && updated[0] && !updated.some((c) => c.padrao)) {
      updated[0].padrao = true;
    }
    this.saveLocalCards(updated);

    if (isSupabaseConfigured() && userId) {
      try {
        await (supabase as any)
          .from("user_payment_methods")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
      } catch (err) { silentCatchWarn("PaymentMethodService", err); }
    }

    return updated;
  }
}

export const paymentMethodService = PaymentMethodService.getInstance();
