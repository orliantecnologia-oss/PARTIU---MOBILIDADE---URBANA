/**
 * ==============================================================================
 * 💳 PARTIU FINOPS & BALANCED DOUBLE-ENTRY LEDGER ENGINE (v3.2)
 * Plano de Contas Oficial, Journal Equilibrado (Total Débitos = Total Créditos)
 * ==============================================================================
 */

export type StatusPagamentoPix = "created" | "pending" | "paid" | "expired" | "failed" | "refunded";

// 1. CHART OF ACCOUNTS (PLANO DE CONTAS FORMAL)
export const CHART_OF_ACCOUNTS = {
  ATIVO_TRANSITORIO_PSP: {
    codigo: "1.1.01.01",
    nome: "Conta Transitória de Liquidação PIX PSP",
    naturezaEsperada: "DEBIT",
  },
  PASSIVO_REPASSE_MOTORISTA: {
    codigo: "2.1.01.01",
    nome: "Contas a Pagar — Repasses a Motoristas Parceiros",
    naturezaEsperada: "CREDIT",
  },
  RECEITA_TAXA_COOPERATIVA: {
    codigo: "3.1.01.01",
    nome: "Receita Operacional Bruta — Taxa da Plataforma PARTIU",
    naturezaEsperada: "CREDIT",
  },
  DESPESA_TARIFA_PSP: {
    codigo: "4.1.01.01",
    nome: "Despesas com Tarifas de Processamento Bancário PSP",
    naturezaEsperada: "DEBIT",
  },
} as const;

export type TipoEntradaLedger =
  | "ticket_sale_gross"
  | "psp_gateway_fee"
  | "cooperative_admin_fee"
  | "driver_payable_net"
  | "psp_fee_retention_offset"
  | "driver_withdrawal_pix"
  | "refund_reversal";

export interface EntradaLedgerContabil {
  id: string;
  journalId: string;
  transactionId: string;
  ticketId: string;
  organizationId: string;
  driverId: string;
  tipo: TipoEntradaLedger;
  natureza: "DEBIT" | "CREDIT";
  contaCodigo: string;
  contaNome: string;
  valor: number;
  descricao: string;
  registradoEm: string;
}

export interface JournalTransacaoContabil {
  id: string;
  transactionId: string;
  organizationId: string;
  dataHora: string;
  descricaoHistorico: string;
  totalDebitos: number;
  totalCreditos: number;
  balanceado: boolean;
  entradas: EntradaLedgerContabil[];
}

export interface TransacaoPixDetalhada {
  id: string;
  organizationId: string;
  ticketId: string;
  driverId: string;
  valorTotal: number;
  taxaCooperativaPercent: number;
  valorTaxaCooperativa: number;
  valorTaxaPsp: number;
  valorRepasseMotorista: number;
  idempotencyKey: string;
  pixQrCodeEmv: string;
  pixCopiaECola: string;
  gatewayProvider: "mercadopago" | "asaas" | "efi_banco";
  status: StatusPagamentoPix;
  criadoEm: string;
  expiraEm: string;
  pagoEm?: string | undefined;
  reembolsadoEm?: string | undefined;
}

export interface ExtratoContabilMotorista {
  totalVendasBrutas: number;
  totalTaxasCooperativa: number;
  totalTaxasPsp: number;
  totalLiquidoReceber: number;
  totalSaquesRealizados: number;
  saldoDisponivel: number;
  journals: JournalTransacaoContabil[];
  lancamentos: EntradaLedgerContabil[];
}

const STORAGE_PIX_KEY = "partiu_finops_pix_transactions";
const STORAGE_JOURNALS_KEY = "partiu_financial_journals";
const MEMORY_PIX_STORE: TransacaoPixDetalhada[] = [];
const MEMORY_JOURNALS_STORE: JournalTransacaoContabil[] = [];
const DEFAULT_COOP_FEE_PERCENT = 5.0; // Padrão Plano Free (5.0%). Condutores nos planos pagos usam 3% (Bronze), 1% (Prata) ou 0% (Ouro)
const DEFAULT_PSP_FIXED_FEE = 0.45;

/**
 * Calcula o split com precisão monetária
 */
export function calcularSplitFinanceiro(
  valorPassagem: number,
  percentualTaxa: number = DEFAULT_COOP_FEE_PERCENT,
) {
  const taxaCoop = Number(((valorPassagem * percentualTaxa) / 100).toFixed(2));
  const taxaPsp = DEFAULT_PSP_FIXED_FEE;
  const repasseLiquido = Number((valorPassagem - taxaCoop).toFixed(2));

  return {
    valorBruto: valorPassagem,
    taxaCooperativa: taxaCoop,
    taxaPsp,
    repasseMotorista: Math.max(0, repasseLiquido),
    percentualCooperativa: percentualTaxa,
  };
}

/**
 * Cria uma nova transação PIX com chave de idempotência
 */
export function criarTransacaoPixComIdempotencia(
  ticketId: string,
  valor: number,
  driverId: string = "drv_04_al",
  organizationId: string = "PARTIU_MOBILIDADE",
  taxaPercent: number = DEFAULT_COOP_FEE_PERCENT,
): TransacaoPixDetalhada {
  const agora = new Date();
  const expira = new Date(agora.getTime() + 10 * 60 * 1000);
  const idempotencyKey = `PIX_${ticketId}_${agora.getTime()}_${Math.random().toString(36).substring(2, 8)}`;

  const split = calcularSplitFinanceiro(valor, taxaPercent);

  const pixCopiaECola = `00020126580014BR.GOV.BCB.PIX0136partiu-pix-recebimento@partiu.app520400005303986540${valor.toFixed(2)}5802BR5925PARTIU MOBILIDADE BR6006MACEIO62070503***6304${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const transacao: TransacaoPixDetalhada = {
    id: "tx_" + Math.random().toString(36).substring(2, 11),
    organizationId,
    ticketId,
    driverId,
    valorTotal: valor,
    taxaCooperativaPercent: taxaPercent,
    valorTaxaCooperativa: split.taxaCooperativa,
    valorTaxaPsp: split.taxaPsp,
    valorRepasseMotorista: split.repasseMotorista,
    idempotencyKey,
    pixQrCodeEmv: pixCopiaECola,
    pixCopiaECola,
    gatewayProvider: "mercadopago",
    status: "pending",
    criadoEm: agora.toISOString(),
    expiraEm: expira.toISOString(),
  };

  salvarTransacaoLocal(transacao);
  return transacao;
}

/**
 * Transiciona o status e gera Journal com Partidas Dobradas rigorosamente equilibradas
 */
export function transicionarEstadoPix(
  idempotencyKey: string,
  novoStatus: StatusPagamentoPix,
): TransacaoPixDetalhada | null {
  const transacoes = getTransacoesPixLocais();
  const idx = transacoes.findIndex((t) => t.idempotencyKey === idempotencyKey);
  if (idx < 0) return null;

  const atual = transacoes[idx]!;

  if (atual.status === "paid" && novoStatus === "expired") {
    console.warn("Transição inválida: PIX já pago não pode expirar.");
    return atual;
  }

  const atualizada: TransacaoPixDetalhada = {
    ...atual,
    status: novoStatus,
    pagoEm: novoStatus === "paid" ? new Date().toISOString() : atual.pagoEm,
    reembolsadoEm: novoStatus === "refunded" ? new Date().toISOString() : atual.reembolsadoEm,
  };

  transacoes[idx] = atualizada;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_PIX_KEY, JSON.stringify(transacoes));
  }

  // Se confirmado o pagamento, registrar Journal Contábil Equilibrado
  if (novoStatus === "paid" && atual.status !== "paid") {
    gerarJournalContabilEquilibrado(atualizada);
  }

  return atualizada;
}

/**
 * Gera Journal com Partidas Dobradas: Total Débitos === Total Créditos
 */
function gerarJournalContabilEquilibrado(tx: TransacaoPixDetalhada): JournalTransacaoContabil {
  const agora = new Date().toISOString();
  const journalId = "jou_" + Math.random().toString(36).substring(2, 11);

  const entradas: EntradaLedgerContabil[] = [
    // 1. Débito no Ativo Transitório PSP (Entrada bruta do dinheiro)
    {
      id: "led_" + Math.random().toString(36).substring(2, 11),
      journalId,
      transactionId: tx.id,
      ticketId: tx.ticketId,
      organizationId: tx.organizationId,
      driverId: tx.driverId,
      tipo: "ticket_sale_gross",
      natureza: "DEBIT",
      contaCodigo: CHART_OF_ACCOUNTS.ATIVO_TRANSITORIO_PSP.codigo,
      contaNome: CHART_OF_ACCOUNTS.ATIVO_TRANSITORIO_PSP.nome,
      valor: tx.valorTotal,
      descricao: `Recebimento bruto de venda de passagem #${tx.ticketId}`,
      registradoEm: agora,
    },
    // 2. Débito na Despesa de Tarifa Bancária PSP
    {
      id: "led_" + Math.random().toString(36).substring(2, 11),
      journalId,
      transactionId: tx.id,
      ticketId: tx.ticketId,
      organizationId: tx.organizationId,
      driverId: tx.driverId,
      tipo: "psp_gateway_fee",
      natureza: "DEBIT",
      contaCodigo: CHART_OF_ACCOUNTS.DESPESA_TARIFA_PSP.codigo,
      contaNome: CHART_OF_ACCOUNTS.DESPESA_TARIFA_PSP.nome,
      valor: tx.valorTaxaPsp,
      descricao: `Tarifa de liquidação PIX cobrada pelo PSP (#${tx.ticketId})`,
      registradoEm: agora,
    },
    // 3. Crédito na Receita de Gestão da Cooperativa
    {
      id: "led_" + Math.random().toString(36).substring(2, 11),
      journalId,
      transactionId: tx.id,
      ticketId: tx.ticketId,
      organizationId: tx.organizationId,
      driverId: tx.driverId,
      tipo: "cooperative_admin_fee",
      natureza: "CREDIT",
      contaCodigo: CHART_OF_ACCOUNTS.RECEITA_TAXA_COOPERATIVA.codigo,
      contaNome: CHART_OF_ACCOUNTS.RECEITA_TAXA_COOPERATIVA.nome,
      valor: tx.valorTaxaCooperativa,
      descricao: `Taxa da plataforma PARTIU ${tx.taxaCooperativaPercent}% (#${tx.ticketId})`,
      registradoEm: agora,
    },
    // 4. Crédito no Passivo de Contas a Pagar ao Motorista
    {
      id: "led_" + Math.random().toString(36).substring(2, 11),
      journalId,
      transactionId: tx.id,
      ticketId: tx.ticketId,
      organizationId: tx.organizationId,
      driverId: tx.driverId,
      tipo: "driver_payable_net",
      natureza: "CREDIT",
      contaCodigo: CHART_OF_ACCOUNTS.PASSIVO_REPASSE_MOTORISTA.codigo,
      contaNome: CHART_OF_ACCOUNTS.PASSIVO_REPASSE_MOTORISTA.nome,
      valor: tx.valorRepasseMotorista,
      descricao: `Repasse líquido devido ao motorista parceiro (#${tx.ticketId})`,
      registradoEm: agora,
    },
    // 5. Crédito de compensação no Ativo Transitório PSP (Tarifa retida na fonte)
    {
      id: "led_" + Math.random().toString(36).substring(2, 11),
      journalId,
      transactionId: tx.id,
      ticketId: tx.ticketId,
      organizationId: tx.organizationId,
      driverId: tx.driverId,
      tipo: "psp_fee_retention_offset",
      natureza: "CREDIT",
      contaCodigo: CHART_OF_ACCOUNTS.ATIVO_TRANSITORIO_PSP.codigo,
      contaNome: CHART_OF_ACCOUNTS.ATIVO_TRANSITORIO_PSP.nome,
      valor: tx.valorTaxaPsp,
      descricao: `Compensação de tarifa retida na fonte pelo PSP (#${tx.ticketId})`,
      registradoEm: agora,
    },
  ];

  const totalDebitos = Number(
    entradas
      .filter((e) => e.natureza === "DEBIT")
      .reduce((acc, e) => acc + e.valor, 0)
      .toFixed(2),
  );
  const totalCreditos = Number(
    entradas
      .filter((e) => e.natureza === "CREDIT")
      .reduce((acc, e) => acc + e.valor, 0)
      .toFixed(2),
  );
  const balanceado = Math.abs(totalDebitos - totalCreditos) < 0.001;

  const journal: JournalTransacaoContabil = {
    id: journalId,
    transactionId: tx.id,
    organizationId: tx.organizationId,
    dataHora: agora,
    descricaoHistorico: `Venda de Passagem PIX #${tx.ticketId} - R$ ${tx.valorTotal.toFixed(2)}`,
    totalDebitos,
    totalCreditos,
    balanceado,
    entradas,
  };

  salvarJournalLocal(journal);
  return journal;
}

export function getJournalsContabeis(): JournalTransacaoContabil[] {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_JOURNALS_KEY);
      return raw ? JSON.parse(raw) : MEMORY_JOURNALS_STORE;
    } catch {
      return MEMORY_JOURNALS_STORE;
    }
  }
  return MEMORY_JOURNALS_STORE;
}

function salvarJournalLocal(journal: JournalTransacaoContabil) {
  MEMORY_JOURNALS_STORE.unshift(journal);
  if (typeof window !== "undefined") {
    try {
      const atuais = getJournalsContabeis();
      atuais.unshift(journal);
      localStorage.setItem(STORAGE_JOURNALS_KEY, JSON.stringify(atuais.slice(0, 500)));
    } catch (e) {
      console.error("Erro ao gravar Journal no Ledger:", e);
    }
  }
}

/**
 * Apura o extrato do motorista a partir dos Journals contábeis
 */
export function apurarExtratoLedgerMotorista(
  driverId: string = "drv_04_al",
): ExtratoContabilMotorista {
  const journals = getJournalsContabeis();

  let totalVendasBrutas = 0;
  let totalTaxasCooperativa = 0;
  let totalTaxasPsp = 0;
  let totalLiquidoReceber = 0;
  let totalSaquesRealizados = 0;

  for (const j of journals) {
    for (const e of j.entradas) {
      if (e.driverId !== driverId) continue;
      if (e.tipo === "ticket_sale_gross") totalVendasBrutas += e.valor;
      if (e.tipo === "cooperative_admin_fee") totalTaxasCooperativa += e.valor;
      if (e.tipo === "psp_gateway_fee") totalTaxasPsp += e.valor;
      if (e.tipo === "driver_payable_net") totalLiquidoReceber += e.valor;
      if (e.tipo === "driver_withdrawal_pix") totalSaquesRealizados += e.valor;
    }
  }

  const todasEntradas = journals.flatMap((j) => j.entradas).filter((e) => e.driverId === driverId);
  return {
    totalVendasBrutas: Number(totalVendasBrutas.toFixed(2)),
    totalTaxasCooperativa: Number(totalTaxasCooperativa.toFixed(2)),
    totalTaxasPsp: Number(totalTaxasPsp.toFixed(2)),
    totalLiquidoReceber: Number(totalLiquidoReceber.toFixed(2)),
    totalSaquesRealizados: Number(totalSaquesRealizados.toFixed(2)),
    saldoDisponivel: Number((totalLiquidoReceber - totalSaquesRealizados).toFixed(2)),
    journals,
    lancamentos: todasEntradas,
  };
}

export function getTransacoesPixLocais(): TransacaoPixDetalhada[] {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_PIX_KEY);
      return raw ? JSON.parse(raw) : MEMORY_PIX_STORE;
    } catch {
      return MEMORY_PIX_STORE;
    }
  }
  return MEMORY_PIX_STORE;
}

function salvarTransacaoLocal(tx: TransacaoPixDetalhada) {
  const memIdx = MEMORY_PIX_STORE.findIndex((t) => t.idempotencyKey === tx.idempotencyKey);
  if (memIdx >= 0) {
    MEMORY_PIX_STORE[memIdx] = tx;
  } else {
    MEMORY_PIX_STORE.unshift(tx);
  }
  if (typeof window !== "undefined") {
    try {
      const atuais = getTransacoesPixLocais();
      const filtradas = atuais.filter((t) => t.idempotencyKey !== tx.idempotencyKey);
      filtradas.unshift(tx);
      localStorage.setItem(STORAGE_PIX_KEY, JSON.stringify(filtradas.slice(0, 50)));
    } catch (e) {
      console.error("Erro ao salvar transação PIX:", e);
    }
  }
}
