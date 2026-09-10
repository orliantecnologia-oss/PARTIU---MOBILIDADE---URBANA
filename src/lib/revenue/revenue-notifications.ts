/**
 * ==============================================================================
 * 🔔 PARTIU REVENUE OS — NOTIFICATION & REVENUE EVENT DISPATCHER (v1.0)
 * ==============================================================================
 * Centralizador de Notificações de Receitas, Cobrança e Inadimplência:
 * - 1. Plano vencendo (lembrete amigável pré-vencimento)
 * - 2. Plano vencido (entrada em período de carência de 3 dias)
 * - 3. Cobrança realizada (sucesso na baixa contábil)
 * - 4. Cobrança falhou (saldo insuficiente / tentativa em cascata)
 * - 5. Upgrade disponível (oportunidade de migração para taxa menor)
 * - 6. Saldo negativo (débito acumulado na carteira)
 * - 7. Bloqueio aplicado (trava operacional pós-carência)
 * - 8. Bloqueio removido (reativação imediata no Trip Radar)
 * ==============================================================================
 */

import { salvarNotificacaoBroadcast } from "../broadcast-notifications";

export interface RevenueNotificationPayload {
  driverId: string;
  planName?: string | undefined;
  amountBrl?: number | undefined;
  remainingDays?: number | undefined;
  pixCopiaECola?: string | undefined;
}

export class RevenueNotificationEngine {
  private static instance: RevenueNotificationEngine;

  private constructor() {}

  public static getInstance(): RevenueNotificationEngine {
    if (!RevenueNotificationEngine.instance) {
      RevenueNotificationEngine.instance = new RevenueNotificationEngine();
    }
    return RevenueNotificationEngine.instance;
  }

  /**
   * 1. Plano Vencendo (Lembrete 2 dias antes do ciclo)
   */
  public notifyPlanExpiring(payload: RevenueNotificationPayload): void {
    salvarNotificacaoBroadcast({
      id: `NOTIF-EXP-${Date.now()}`,
      titulo: `⏰ Seu Plano ${payload.planName || "PARTIU"} vence em breve`,
      mensagem: `Faltam ${payload.remainingDays ?? 2} dias para a renovação. Garanta saldo em conta para manter sua taxa de comissão reduzida.`,
      categoria: "motorista",
      urgencia: "info",
      rotaDestino: "/app/motorista",
      enviadoPor: "PARTIU FinOps",
      totalDestinatariosEstimados: 1,
    });
  }

  /**
   * 2. Plano Vencido (Entrada no Período de Carência de 3 Dias)
   */
  public notifyPlanExpired(payload: RevenueNotificationPayload): void {
    salvarNotificacaoBroadcast({
      id: `NOTIF-DUE-${Date.now()}`,
      titulo: `⚠️ Mensalidade em Aberto • Carência de 3 Dias Ativa`,
      mensagem: `Seu plano ${payload.planName || "PARTIU"} venceu. Você continua recebendo corridas normalmente por mais 3 dias. Pague via PIX para regularizar.`,
      categoria: "motorista",
      urgencia: "alerta",
      rotaDestino: "/app/motorista",
      enviadoPor: "PARTIU FinOps",
      totalDestinatariosEstimados: 1,
    });
  }

  /**
   * 3. Cobrança Realizada com Sucesso
   */
  public notifyChargeSuccess(payload: RevenueNotificationPayload): void {
    salvarNotificacaoBroadcast({
      id: `NOTIF-PAID-${Date.now()}`,
      titulo: `✓ Mensalidade Liquidada com Sucesso!`,
      mensagem: `A cobrança de ${payload.amountBrl ? payload.amountBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "seu plano"} foi compensada. Seus benefícios e taxa reduzida continuam 100% ativos!`,
      categoria: "motorista",
      urgencia: "info",
      rotaDestino: "/app/motorista",
      enviadoPor: "PARTIU FinOps",
      totalDestinatariosEstimados: 1,
    });
  }

  /**
   * 4. Cobrança Falhou (Tentativa de Saldo sem Sucesso)
   */
  public notifyChargeFailed(payload: RevenueNotificationPayload): void {
    salvarNotificacaoBroadcast({
      id: `NOTIF-FAIL-${Date.now()}`,
      titulo: `⚠️ Saldo Insuficiente para Débito do Plano`,
      mensagem: `Não foi possível debitar ${payload.amountBrl ? payload.amountBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "a mensalidade"}. Um QR Code PIX foi gerado na sua carteira para pagamento avulso.`,
      categoria: "motorista",
      urgencia: "alerta",
      rotaDestino: "/app/motorista",
      enviadoPor: "PARTIU FinOps",
      totalDestinatariosEstimados: 1,
    });
  }

  /**
   * 5. Upgrade Disponível (Oportunidade de Maior Margem)
   */
  public notifyUpgradeAvailable(payload: { driverId: string; suggestedPlan: string; potentialSavingsBrl: number }): void {
    salvarNotificacaoBroadcast({
      id: `NOTIF-UPG-${Date.now()}`,
      titulo: `🚀 Economize até R$ ${payload.potentialSavingsBrl.toFixed(2)} mudando para o Plano ${payload.suggestedPlan}`,
      mensagem: `Com o volume de corridas que você realizou esta semana, o Plano ${payload.suggestedPlan} colocará mais dinheiro no seu bolso!`,
      categoria: "motorista",
      urgencia: "promocao",
      rotaDestino: "/app/motorista",
      enviadoPor: "PARTIU Driver Growth",
      totalDestinatariosEstimados: 1,
    });
  }

  /**
   * 6. Saldo Negativo / Pendência Acumulada
   */
  public notifyNegativeBalance(payload: RevenueNotificationPayload): void {
    salvarNotificacaoBroadcast({
      id: `NOTIF-DEBT-${Date.now()}`,
      titulo: `⚠️ Saldo Devedor Registrado`,
      mensagem: `Você possui um saldo devedor de ${payload.amountBrl ? payload.amountBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "pendências"}. Ele será liquidado automaticamente nas próximas corridas ou no próximo saque.`,
      categoria: "motorista",
      urgencia: "alerta",
      rotaDestino: "/app/motorista",
      enviadoPor: "PARTIU FinOps",
      totalDestinatariosEstimados: 1,
    });
  }

  /**
   * 7. Bloqueio Operacional Aplicado (Pós-Carência)
   */
  public notifyBlockApplied(payload: RevenueNotificationPayload): void {
    salvarNotificacaoBroadcast({
      id: `NOTIF-BLOCK-${Date.now()}`,
      titulo: `🚫 Acesso ao Trip Radar Temporariamente Pausado`,
      mensagem: `O prazo de carência de 3 dias expirou. Efetue o pagamento da pendência via PIX para reativar seu acesso imediatamente.`,
      categoria: "motorista",
      urgencia: "urgente",
      rotaDestino: "/app/motorista",
      enviadoPor: "PARTIU Operações",
      totalDestinatariosEstimados: 1,
    });
  }

  /**
   * 8. Bloqueio Removido (Reativação Imediata)
   */
  public notifyBlockRemoved(payload: RevenueNotificationPayload): void {
    salvarNotificacaoBroadcast({
      id: `NOTIF-UNBLOCK-${Date.now()}`,
      titulo: `🎉 Conta Reativada • Boas Corridas!`,
      mensagem: `Sua pendência foi quitada com sucesso. Seu acesso ao Trip Radar está 100% liberado com taxa regular.`,
      categoria: "motorista",
      urgencia: "info",
      rotaDestino: "/app/motorista",
      enviadoPor: "PARTIU Operações",
      totalDestinatariosEstimados: 1,
    });
  }
}

export const revenueNotifications = RevenueNotificationEngine.getInstance();
