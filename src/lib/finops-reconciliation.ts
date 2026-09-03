/**
 * ==============================================================================
 * ⚖️ UNIVANS FINOPS RECONCILIATION & AUDIT ENGINE (v3.3)
 * Conciliação PSP vs Payments vs Ledger vs Settlement & Invariantes Contábeis
 * ==============================================================================
 */

import {
  CHART_OF_ACCOUNTS,
  JournalTransacaoContabil,
  TransacaoPixDetalhada,
  getJournalsContabeis,
  getTransacoesPixLocais,
} from "./finops-pix-engine";
import { DomainError, createDomainError } from "./domain-contracts";

export interface ReconciliationException {
  id: string;
  type:
    | "PAYMENT_WITHOUT_LEDGER"
    | "LEDGER_WITHOUT_PAYMENT"
    | "AMOUNT_DIVERGENCE"
    | "FEE_DIVERGENCE"
    | "LEDGER_IMBALANCE"
    | "SETTLEMENT_MISSING";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  referenceId: string;
  expectedAmount: number;
  foundAmount: number;
  details: string;
  detectedAt: string;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED";
}

export interface ReconciliationReport {
  timestamp: string;
  totalPaymentsAudited: number;
  totalLedgerJournalsAudited: number;
  totalVolumePayments: number;
  totalVolumeLedger: number;
  isFullyReconciled: boolean;
  exceptions: ReconciliationException[];
}

/**
 * Validação estrita de Invariante: Total Débitos === Total Créditos
 */
export function assertLedgerBalanced(journal: JournalTransacaoContabil): {
  balanced: boolean;
  debitTotal: number;
  creditTotal: number;
  difference: number;
  error?: DomainError | undefined;
} {
  const debitTotal = Number(
    journal.entradas
      .filter((e) => e.natureza === "DEBIT")
      .reduce((acc, e) => acc + e.valor, 0)
      .toFixed(2),
  );

  const creditTotal = Number(
    journal.entradas
      .filter((e) => e.natureza === "CREDIT")
      .reduce((acc, e) => acc + e.valor, 0)
      .toFixed(2),
  );

  const difference = Number(Math.abs(debitTotal - creditTotal).toFixed(2));
  const balanced = difference < 0.001;

  if (!balanced) {
    return {
      balanced: false,
      debitTotal,
      creditTotal,
      difference,
      error: createDomainError(
        "LEDGER_IMBALANCE",
        `Invariante violada no Journal '${journal.id}': Débitos (R$ ${debitTotal}) != Créditos (R$ ${creditTotal}). Diferença: R$ ${difference}`,
      ),
    };
  }

  return { balanced: true, debitTotal, creditTotal, difference: 0 };
}

/**
 * Criação de Lançamento de Estorno Contábil (Reversal Entry)
 */
export function criarLancamentoEstornoContabil(
  journalOriginal: JournalTransacaoContabil,
  motivo: string,
): JournalTransacaoContabil {
  const agora = new Date().toISOString();
  const reversalJournalId = "jou_rev_" + Math.random().toString(36).substring(2, 10);

  // Inverte naturezas para anular o lançamento original sem apagar histórico (Append-Only)
  const entradasEstorno = journalOriginal.entradas.map((e) => ({
    ...e,
    id: "led_rev_" + Math.random().toString(36).substring(2, 10),
    journalId: reversalJournalId,
    natureza: (e.natureza === "DEBIT" ? "CREDIT" : "DEBIT") as "DEBIT" | "CREDIT",
    descricao: `[ESTORNO] ${e.descricao} - Motivo: ${motivo}`,
    registradoEm: agora,
  }));

  const totalDebitos = Number(
    entradasEstorno
      .filter((e) => e.natureza === "DEBIT")
      .reduce((acc, e) => acc + e.valor, 0)
      .toFixed(2),
  );

  const totalCreditos = Number(
    entradasEstorno
      .filter((e) => e.natureza === "CREDIT")
      .reduce((acc, e) => acc + e.valor, 0)
      .toFixed(2),
  );

  return {
    id: reversalJournalId,
    transactionId: journalOriginal.transactionId,
    organizationId: journalOriginal.organizationId,
    dataHora: agora,
    descricaoHistorico: `Estorno de Lançamento #${journalOriginal.id}: ${motivo}`,
    totalDebitos,
    totalCreditos,
    balanceado: Math.abs(totalDebitos - totalCreditos) < 0.001,
    entradas: entradasEstorno,
  };
}

/**
 * Executa a conciliação completa entre Pagamentos e o Livro-Razão
 */
export function executarConciliacaoFinOps(
  pagamentos?: TransacaoPixDetalhada[],
  journals?: JournalTransacaoContabil[],
): ReconciliationReport {
  const txs = pagamentos || getTransacoesPixLocais();
  const jrnls = journals || getJournalsContabeis();
  const exceptions: ReconciliationException[] = [];

  let totalVolumePayments = 0;
  let totalVolumeLedger = 0;

  const pagamentosPagos = txs.filter((t) => t.status === "paid");

  // 1. Verificar se todo pagamento 'paid' possui Journal Contábil correspondente
  for (const p of pagamentosPagos) {
    totalVolumePayments += p.valorTotal;
    const journalCorrespondente = jrnls.find((j) => j.transactionId === p.id);

    if (!journalCorrespondente) {
      exceptions.push({
        id: "exc_" + Math.random().toString(36).substring(2, 10),
        type: "PAYMENT_WITHOUT_LEDGER",
        severity: "CRITICAL",
        referenceId: p.id,
        expectedAmount: p.valorTotal,
        foundAmount: 0,
        details: `Pagamento PIX #${p.id} aprovado mas sem Journal correspondente no Ledger.`,
        detectedAt: new Date().toISOString(),
        status: "OPEN",
      });
      continue;
    }

    // Verificar se o valor bate
    const entradaBruta = journalCorrespondente.entradas.find(
      (e) =>
        e.tipo === "ticket_sale_gross" ||
        e.contaCodigo === CHART_OF_ACCOUNTS.ATIVO_TRANSITORIO_PSP.codigo,
    );

    if (!entradaBruta || Math.abs(entradaBruta.valor - p.valorTotal) > 0.001) {
      exceptions.push({
        id: "exc_" + Math.random().toString(36).substring(2, 10),
        type: "AMOUNT_DIVERGENCE",
        severity: "HIGH",
        referenceId: p.id,
        expectedAmount: p.valorTotal,
        foundAmount: entradaBruta ? entradaBruta.valor : 0,
        details: `Divergência de valor no Journal #${journalCorrespondente.id} para o Pagamento #${p.id}.`,
        detectedAt: new Date().toISOString(),
        status: "OPEN",
      });
    }
  }

  // 2. Verificar invariantes de todos os Journals
  for (const j of jrnls) {
    const invariantCheck = assertLedgerBalanced(j);
    totalVolumeLedger += invariantCheck.debitTotal;

    if (!invariantCheck.balanced) {
      exceptions.push({
        id: "exc_" + Math.random().toString(36).substring(2, 10),
        type: "LEDGER_IMBALANCE",
        severity: "CRITICAL",
        referenceId: j.id,
        expectedAmount: invariantCheck.debitTotal,
        foundAmount: invariantCheck.creditTotal,
        details: `Desbalanceamento contábil no Journal #${j.id}. Débitos=${invariantCheck.debitTotal}, Créditos=${invariantCheck.creditTotal}`,
        detectedAt: new Date().toISOString(),
        status: "OPEN",
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    totalPaymentsAudited: pagamentosPagos.length,
    totalLedgerJournalsAudited: jrnls.length,
    totalVolumePayments: Number(totalVolumePayments.toFixed(2)),
    totalVolumeLedger: Number(totalVolumeLedger.toFixed(2)),
    isFullyReconciled: exceptions.length === 0,
    exceptions,
  };
}
