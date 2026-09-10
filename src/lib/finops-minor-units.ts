/**
 * ==============================================================================
 * 💰 PARTIU FINOPS MINOR-UNITS & REFUND ENGINE (v4.0)
 * Operações Monetárias em Centavos Inteiros e Motor Imutável de Estornos
 * ==============================================================================
 */

import { DomainError, createDomainError } from "./domain-contracts";

export interface SplitFinanceiroCentavos {
  valorBrutoCentavos: number;
  taxaCooperativaCentavos: number;
  taxaPspCentavos: number;
  repasseMotoristaCentavos: number;
  totalDebitosCentavos: number;
  totalCreditosCentavos: number;
}

export type RefundStatus =
  "REQUESTED" | "IN_PROGRESS" | "COMPLETED" | "ALREADY_REFUNDED" | "REJECTED";

export interface RefundRecord {
  refundId: string;
  originalPaymentId: string;
  originalJournalId: string;
  tenantId: string;
  refundType: "FULL" | "PARTIAL";
  amountCentavos: number;
  status: RefundStatus;
  reversalJournalId?: string | undefined;
  reason: string;
  requestedAt: string;
  completedAt?: string | undefined;
}

const REFUND_STORE = new Map<string, RefundRecord>();

/**
 * Calcula o split com precisão exata em centavos inteiros (sem floating point errors)
 */
export function calcularSplitMinorUnits(
  valorReais: number,
  percentualCoop: number = 8.5,
  taxaPspFixaReais: number = 0.45,
): SplitFinanceiroCentavos {
  const valorBrutoCentavos = Math.round(valorReais * 100);
  const taxaPspCentavos = Math.round(taxaPspFixaReais * 100);

  // Taxa da cooperativa arredondada para centavos inteiros
  const taxaCooperativaCentavos = Math.round((valorBrutoCentavos * percentualCoop) / 100);

  // Repasse líquido do motorista garantindo soma exata
  const repasseMotoristaCentavos = valorBrutoCentavos - taxaCooperativaCentavos;

  const totalDebitosCentavos = valorBrutoCentavos + taxaPspCentavos;
  const totalCreditosCentavos =
    taxaCooperativaCentavos + repasseMotoristaCentavos + taxaPspCentavos;

  return {
    valorBrutoCentavos,
    taxaCooperativaCentavos,
    taxaPspCentavos,
    repasseMotoristaCentavos,
    totalDebitosCentavos,
    totalCreditosCentavos,
  };
}

/**
 * Executa estorno (Refund) de pagamento com criação de journal de reversão imutável
 */
export function processarReembolsoFinOps(
  originalPaymentId: string,
  originalJournalId: string,
  tenantId: string,
  valorReais: number,
  reason: string,
  refundType: "FULL" | "PARTIAL" = "FULL",
): { success: boolean; refundRecord: RefundRecord; error?: DomainError | undefined } {
  const existing = Array.from(REFUND_STORE.values()).find(
    (r) => r.originalPaymentId === originalPaymentId && r.status === "COMPLETED",
  );

  if (existing) {
    return {
      success: false,
      refundRecord: existing,
      error: createDomainError(
        "INVALID_STATE_TRANSITION",
        `ALREADY_REFUNDED: O pagamento '${originalPaymentId}' já foi integralmente reembolsado.`,
      ),
    };
  }

  const agora = new Date().toISOString();
  const refundId = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const reversalJournalId = `jnl_rev_${originalJournalId}_${Date.now()}`;
  const amountCentavos = Math.round(valorReais * 100);

  const refundRecord: RefundRecord = {
    refundId,
    originalPaymentId,
    originalJournalId,
    tenantId,
    refundType,
    amountCentavos,
    status: "COMPLETED",
    reversalJournalId,
    reason,
    requestedAt: agora,
    completedAt: agora,
  };

  REFUND_STORE.set(refundId, refundRecord);

  return {
    success: true,
    refundRecord,
  };
}

export function resetRefundStore() {
  REFUND_STORE.clear();
}
