/**
 * ==============================================================================
 * ⚖️ UNIVANS DOUBLE-ENTRY BOOKKEEPING ENGINE (PARTIDAS DOBRADAS)
 * Invariante Contábil Estrita: SUM(Débitos) === SUM(Créditos)
 * ==============================================================================
 */

import crypto from "crypto";
import { supabase } from "@/integrations/supabase/client";

export type EntryType = "DEBIT" | "CREDIT";

export interface LedgerEntry {
  id: string;
  transactionId: string;
  entryType: EntryType;
  accountId: string;
  amountCents: number;
  description: string;
  createdAt: string;
}

export interface BalancedTransaction {
  transactionId: string;
  referenceId: string;
  description: string;
  entries: LedgerEntry[];
  totalDebitCents: number;
  totalCreditCents: number;
  balanced: boolean;
  createdAt: string;
}

/**
 * Contas Oficiais do Plano Contábil da Cooperativa
 */
export const CONTAS_CONTABEIS = {
  CLEARING_PSP: "1.1.01_CLEARING_PSP", // Ativo (Recebimento de Pix em trânsito)
  ESCROW_PASSAGENS: "2.1.01_ESCROW_PASSAGENS", // Passivo (Custódia até a conclusão da viagem)
  REPASSE_MOTORISTAS: "2.1.02_REPASSE_MOTORISTAS", // Passivo (Obrigação líquida de repasse)
  TAXA_COOPERATIVA: "3.1.01_TAXA_COOPERATIVA", // Receita (Margem operacional)
  TAXAS_GATEWAY: "4.1.01_TAXAS_GATEWAY", // Despesa (Custo PSP / Adyen / MP)
} as const;

/**
 * Validador estrito de integridade contábil de partidas dobradas
 */
export function assertDoubleEntryBalanced(entries: LedgerEntry[]): boolean {
  if (!entries || entries.length < 2) {
    throw new Error("TRANSACTION_MALFORMED: Uma transação contábil exige no mínimo dois lançamentos.");
  }

  const debits = entries
    .filter((e) => e.entryType === "DEBIT")
    .reduce((acc, e) => acc + e.amountCents, 0);

  const credits = entries
    .filter((e) => e.entryType === "CREDIT")
    .reduce((acc, e) => acc + e.amountCents, 0);

  if (debits !== credits) {
    throw new Error(
      `UNBALANCED_TRANSACTION: Desbalanceamento contábil detectado! Débitos (${debits}) !== Créditos (${credits}). Lançamento rejeitado.`,
    );
  }

  return true;
}

/**
 * 1. Entrada de Pagamento de Passagem (Inflow em Custódia / Escrow)
 * Débito: Caixa/Clearing (+Ativo)
 * Crédito: Escrow (+Passivo)
 */
export async function registrarEntradaEscrow(
  referenceId: string,
  amountCents: number,
  descricao: string = "Recebimento de passagem via PIX (Custódia Escrow)",
): Promise<BalancedTransaction> {
  const transactionId = "tx_inflow_" + crypto.randomUUID();
  const agora = new Date().toISOString();

  const entries: LedgerEntry[] = [
    {
      id: "ent_" + crypto.randomUUID(),
      transactionId,
      entryType: "DEBIT",
      accountId: CONTAS_CONTABEIS.CLEARING_PSP,
      amountCents,
      description: descricao,
      createdAt: agora,
    },
    {
      id: "ent_" + crypto.randomUUID(),
      transactionId,
      entryType: "CREDIT",
      accountId: CONTAS_CONTABEIS.ESCROW_PASSAGENS,
      amountCents,
      description: descricao,
      createdAt: agora,
    },
  ];

  // Validação matemática mandatória
  assertDoubleEntryBalanced(entries);

  // Persistência no PostgreSQL
  try {
    const payload = entries.map((e) => ({
      id: e.id,
      transaction_id: e.transactionId,
      entry_type: e.entryType,
      account_id: e.accountId,
      amount_cents: e.amountCents,
      description: e.description,
    }));
    await supabase.from("financial_ledger_entries").insert(payload);
  } catch (err) {
    console.warn("Aviso na gravação do ledger:", err);
  }

  return {
    transactionId,
    referenceId,
    description: descricao,
    entries,
    totalDebitCents: amountCents,
    totalCreditCents: amountCents,
    balanced: true,
    createdAt: agora,
  };
}

/**
 * 2. Liquidação da Viagem (Settlement / Split Contábil Completo)
 * Débito: Escrow (-Passivo: R$ 38,00)
 * Créditos:
 *   - Repasse Motorista: R$ 34,32
 *   - Taxa Cooperativa: R$ 3,23
 *   - Taxa Gateway PSP: R$ 0,45
 * Total Débitos (3800) === Total Créditos (3432 + 323 + 45 = 3800)
 */
export async function liquidarSplitViagem(
  referenceId: string,
  amountCents: number,
  taxaCoopPct: number = 8.5,
  taxaGatewayCents: number = 45,
): Promise<BalancedTransaction> {
  const transactionId = "tx_settle_" + crypto.randomUUID();
  const agora = new Date().toISOString();

  // Cálculo de precisão em inteiros (Minor Units)
  const taxaCoopCents = Math.round((amountCents * taxaCoopPct) / 100);
  const repasseMotoristaCents = amountCents - taxaCoopCents - taxaGatewayCents;

  const entries: LedgerEntry[] = [
    // 1. Liberação do Escrow
    {
      id: "ent_" + crypto.randomUUID(),
      transactionId,
      entryType: "DEBIT",
      accountId: CONTAS_CONTABEIS.ESCROW_PASSAGENS,
      amountCents,
      description: `Liquidação de viagem concluída - Ref: ${referenceId}`,
      createdAt: agora,
    },
    // 2. Reconhecimento da obrigação com o motorista
    {
      id: "ent_" + crypto.randomUUID(),
      transactionId,
      entryType: "CREDIT",
      accountId: CONTAS_CONTABEIS.REPASSE_MOTORISTAS,
      amountCents: repasseMotoristaCents,
      description: "Crédito a repassar ao motorista da van",
      createdAt: agora,
    },
    // 3. Receita da Cooperativa
    {
      id: "ent_" + crypto.randomUUID(),
      transactionId,
      entryType: "CREDIT",
      accountId: CONTAS_CONTABEIS.TAXA_COOPERATIVA,
      amountCents: taxaCoopCents,
      description: `Taxa de manutenção e tecnologia da cooperativa (${taxaCoopPct}%)`,
      createdAt: agora,
    },
    // 4. Taxa do Processador de Pagamento
    {
      id: "ent_" + crypto.randomUUID(),
      transactionId,
      entryType: "CREDIT",
      accountId: CONTAS_CONTABEIS.TAXAS_GATEWAY,
      amountCents: taxaGatewayCents,
      description: "Tarifa de intermediação PIX / Gateway bancário",
      createdAt: agora,
    },
  ];

  // Assegura invariante fundamental
  assertDoubleEntryBalanced(entries);

  // Persistência no PostgreSQL
  try {
    const payload = entries.map((e) => ({
      id: e.id,
      transaction_id: e.transactionId,
      entry_type: e.entryType,
      account_id: e.accountId,
      amount_cents: e.amountCents,
      description: e.description,
    }));
    await supabase.from("financial_ledger_entries").insert(payload);
  } catch (err) {
    console.warn("Aviso na gravação do split no ledger:", err);
  }

  return {
    transactionId,
    referenceId,
    description: `Split contábil da viagem ${referenceId}`,
    entries,
    totalDebitCents: amountCents,
    totalCreditCents: amountCents,
    balanced: true,
    createdAt: agora,
  };
}
