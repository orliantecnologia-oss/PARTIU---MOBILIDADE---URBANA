/**
 * PARTIU TITANIUM SHIELD — BANKING GRADE TRANSACTIONAL LEDGER (2PC)
 * 
 * Motor Contábil Estrito de Partidas Dobradas (Double-Entry Bookkeeping):
 * - Plano de Contas: Ativo (Assets), Passivo (Liabilities), Patrimônio Líquido (Equity), Receitas (Revenue), Despesas (Expense).
 * - Invariante Contábil Inegociável: SUM(Débitos) === SUM(Créditos)
 * - Protocolo Two-Phase Commit (2PC): PREPARE -> COMMIT / ROLLBACK
 * - Idempotency Keys obrigatórias (UUID v4 / SHA-256)
 * - PROIBIDO supressão de erros via console.warn ou retorno de sucesso falso.
 */

import { supabase } from "@/integrations/supabase/client";

export type AccountCategory = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type EntryType = 'DEBIT' | 'CREDIT';

export interface ChartOfAccount {
  accountNumber: string;
  accountName: string;
  category: AccountCategory;
  normalBalance: EntryType;
  description: string;
}

export const OFFICIAL_CHART_OF_ACCOUNTS: Record<string, ChartOfAccount> = {
  // 1. ATIVO (ASSETS)
  '1.1.01_PSP_CLEARING': {
    accountNumber: '1.1.01',
    accountName: 'PSP Clearing Pix em Trânsito',
    category: 'ASSET',
    normalBalance: 'DEBIT',
    description: 'Recursos recebidos via PIX em custódia no banco liquidante'
  },
  '1.1.02_BANK_RESERVE': {
    accountNumber: '1.1.02',
    accountName: 'Conta Reserva Operacional',
    category: 'ASSET',
    normalBalance: 'DEBIT',
    description: 'Saldo bancário disponível em conta corrente da plataforma'
  },

  // 2. PASSIVO (LIABILITIES)
  '2.1.01_ESCROW_TRIPS': {
    accountNumber: '2.1.01',
    accountName: 'Custódia de Viagens em Andamento (Escrow)',
    category: 'LIABILITY',
    normalBalance: 'CREDIT',
    description: 'Valores pagos por passageiros retidos até a conclusão do trajeto'
  },
  '2.1.02_DRIVER_PAYABLE': {
    accountNumber: '2.1.02',
    accountName: 'Repasse a Motoristas e Entregadores Parceiros (D+0)',
    category: 'LIABILITY',
    normalBalance: 'CREDIT',
    description: 'Obrigação líquida de repasse aos condutores'
  },
  '2.1.03_PASSENGER_CASHBACK_PAYABLE': {
    accountNumber: '2.1.03',
    accountName: 'Saldo de Cashback a Pagar',
    category: 'LIABILITY',
    normalBalance: 'CREDIT',
    description: 'Créditos de fidelidade emitidos aos passageiros'
  },

  // 3. RECEITA (REVENUE)
  '3.1.01_PLATFORM_TAKE_RATE': {
    accountNumber: '3.1.01',
    accountName: 'Receita Operacional de Intermediação (Take Rate)',
    category: 'REVENUE',
    normalBalance: 'CREDIT',
    description: 'Margem líquida da plataforma por corrida intermediada'
  },
  '3.1.02_FRANCHISE_ROYALTIES': {
    accountNumber: '3.1.02',
    accountName: 'Royalties de Franquias Municipais',
    category: 'REVENUE',
    normalBalance: 'CREDIT',
    description: 'Taxa de tecnologia sobre o faturamento de praças franqueadas'
  },

  // 4. DESPESA (EXPENSE)
  '4.1.01_PSP_GATEWAY_FEES': {
    accountNumber: '4.1.01',
    accountName: 'Taxas e Tarifas de PSP / Gateway Pix',
    category: 'EXPENSE',
    normalBalance: 'DEBIT',
    description: 'Custo bancário de emissão de QR Code e transferência instantânea'
  },
  '4.1.02_FUEL_STABILIZATION_DISBURSEMENT': {
    accountNumber: '4.1.02',
    accountName: 'Subsívdio do Fundo de Estabilização de Combustível',
    category: 'EXPENSE',
    normalBalance: 'DEBIT',
    description: 'Aporte de proteção contra volatilidade da gasolina'
  },

  // 5. PATRIMÔNIO LÍQUIDO (EQUITY)
  '5.1.01_RETAINED_EARNINGS': {
    accountNumber: '5.1.01',
    accountName: 'Lucros Retidos e Reservas de Capital',
    category: 'EQUITY',
    normalBalance: 'CREDIT',
    description: 'Patrimônio acumulado para reinvestimento e liquidez'
  }
};

export interface JournalPosting {
  accountId: string;
  entryType: EntryType;
  amountCents: number;
  description: string;
}

export interface PreparedTransaction {
  transactionId: string;
  idempotencyKey: string;
  referenceId: string;
  postings: JournalPosting[];
  totalDebitCents: number;
  totalCreditCents: number;
  status: 'PREPARED' | 'COMMITTED' | 'ROLLED_BACK';
  preparedAt: number;
}

export class LedgerPersistenceError extends Error {
  constructor(message: string, public readonly transactionId: string, public override readonly cause?: any) {
    super(message);
    this.name = 'LedgerPersistenceError';
  }
}

export class TransactionalLedger {
  private static instance: TransactionalLedger;
  private preparedTransactions: Map<string, PreparedTransaction> = new Map();
  private committedKeys: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): TransactionalLedger {
    if (!TransactionalLedger.instance) {
      TransactionalLedger.instance = new TransactionalLedger();
    }
    return TransactionalLedger.instance;
  }

  /**
   * FASE 1 DO 2PC: PREPARE
   * Valida o balanceamento matemático e registra intenção transacional com Idempotency Key
   */
  public prepareTransaction(params: {
    idempotencyKey: string;
    referenceId: string;
    description: string;
    postings: JournalPosting[];
  }): PreparedTransaction {
    if (!params.idempotencyKey || params.idempotencyKey.trim().length < 8) {
      throw new Error('IDEMPOTENCY_KEY_INVALID: Chave de idempotência obrigatória.');
    }

    if (this.committedKeys.has(params.idempotencyKey)) {
      throw new Error(`IDEMPOTENCY_CONFLICT: Transação com chave ${params.idempotencyKey} já foi efetivada.`);
    }

    if (!params.postings || params.postings.length < 2) {
      throw new Error('POSTINGS_MALFORMED: Uma transação contábil exige no mínimo duas pernas.');
    }

    let sumDebit = 0;
    let sumCredit = 0;

    for (const post of params.postings) {
      if (post.amountCents <= 0 || !Number.isInteger(post.amountCents)) {
        throw new Error(`INVALID_AMOUNT_CENTS: O valor deve ser inteiro e positivo (${post.amountCents}).`);
      }
      if (post.entryType === 'DEBIT') {
        sumDebit += post.amountCents;
      } else if (post.entryType === 'CREDIT') {
        sumCredit += post.amountCents;
      }
    }

    // Invariante inegociável de partidas dobradas
    if (sumDebit !== sumCredit) {
      throw new Error(`UNBALANCED_TRANSACTION: Débitos (${sumDebit} cents) !== Créditos (${sumCredit} cents).`);
    }

    const transactionId = `TX-LEDGER-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const prepared: PreparedTransaction = {
      transactionId,
      idempotencyKey: params.idempotencyKey,
      referenceId: params.referenceId,
      postings: params.postings,
      totalDebitCents: sumDebit,
      totalCreditCents: sumCredit,
      status: 'PREPARED',
      preparedAt: Date.now()
    };

    this.preparedTransactions.set(transactionId, prepared);
    return prepared;
  }

  /**
   * FASE 2 DO 2PC: COMMIT
   * Persiste atomicamente no banco relacional. Se houver falha, aciona rollback e lança exceção.
   */
  public async commitTransaction(transactionId: string): Promise<PreparedTransaction> {
    const prepared = this.preparedTransactions.get(transactionId);
    if (!prepared) {
      throw new Error(`TRANSACTION_NOT_FOUND: ${transactionId}`);
    }

    if (prepared.status !== 'PREPARED') {
      throw new Error(`INVALID_TRANSACTION_STATE: Status atual é ${prepared.status}`);
    }

    try {
      const payload = prepared.postings.map((p, idx) => ({
        id: `ENT-${prepared.transactionId}-${idx}`,
        transaction_id: prepared.transactionId,
        account_id: p.accountId,
        entry_type: p.entryType,
        amount_cents: p.amountCents,
        description: `[${prepared.idempotencyKey}] ${p.description}`,
        created_at: new Date().toISOString()
      }));

      // Inserção atômica
      const { error } = await supabase.from('financial_ledger_entries').insert(payload);

      if (error) {
        // Se houver erro de banco de dados, aciona rollback imediato
        this.rollbackTransaction(transactionId, `Supabase Error: ${error.message}`);
        throw new LedgerPersistenceError(
          `Falha na persistência atômica do ledger: ${error.message}`,
          transactionId,
          error
        );
      }

      prepared.status = 'COMMITTED';
      this.committedKeys.add(prepared.idempotencyKey);
      return prepared;
    } catch (err: any) {
      this.rollbackTransaction(transactionId, err?.message || 'Erro inesperado');
      if (err instanceof LedgerPersistenceError) throw err;
      throw new LedgerPersistenceError(`Falha de commit no ledger: ${err?.message}`, transactionId, err);
    }
  }

  /**
   * ROLLBACK
   * Cancela a transação preparada e libera os recursos
   */
  public rollbackTransaction(transactionId: string, reason: string): void {
    const prepared = this.preparedTransactions.get(transactionId);
    if (prepared) {
      prepared.status = 'ROLLED_BACK';
      console.error(`[TransactionalLedger] ROLLBACK acionado para ${transactionId}. Motivo: ${reason}`);
    }
  }
}

export const transactionalLedger = TransactionalLedger.getInstance();
