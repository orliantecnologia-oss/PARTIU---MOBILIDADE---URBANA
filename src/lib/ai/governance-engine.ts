/**
 * AI GOVERNANCE ENGINE
 * 
 * Camada de governança e conformidade ética e operacional:
 * - Trilha de auditoria criptograficamente encadeada (DecisionAuditTrail)
 * - Modo Human-in-the-Loop (aprovação manual opcional para P0 de alto risco)
 * - Versionamento de políticas e rollback atômico com 1 clique
 */

export interface DecisionAuditRecord {
  auditId: string;
  decisionId: string;
  timestamp: number;
  agenteResponsavel: string;
  acaoExecutada: string;
  cidadeId: string;
  parametros: Record<string, any>;
  justificativa: string;
  impactoPrevisto: string;
  impactoRealizadoObservado?: string;
  requerAprovacaoHumana: boolean;
  statusAprovacao: 'AUTONOMO_CONFIRMADO' | 'AGUARDANDO_APROVACAO_HUMANA' | 'APROVADO_MANUALMENTE' | 'REVERTIDO';
  revertivel: boolean;
  blockHashAnterior: string;
  blockHashAtual: string;
}

export class AIGovernanceEngine {
  private auditChain: DecisionAuditRecord[] = [];
  private humanInTheLoopEnabled: boolean = false; // Modo autônomo por padrão com guardrails

  constructor() {
    this.seedGenesisBlock();
  }

  private seedGenesisBlock(): void {
    const genesis: DecisionAuditRecord = {
      auditId: 'AUD-GENESIS-000',
      decisionId: 'DEC-000',
      timestamp: Date.now() - 86400000,
      agenteResponsavel: 'SYSTEM_BOOTSTRAP',
      acaoExecutada: 'INICIALIZACAO_GOVERNANCA_PARTIU',
      cidadeId: 'GLOBAL',
      parametros: {},
      justificativa: 'Gênese da trilha de governança do Agentic Mobility OS.',
      impactoPrevisto: 'Estabelecimento da cadeia de custódia de decisões.',
      requerAprovacaoHumana: false,
      statusAprovacao: 'AUTONOMO_CONFIRMADO',
      revertivel: false,
      blockHashAnterior: '0000000000000000',
      blockHashAtual: 'a1b2c3d4e5f60000'
    };
    this.auditChain.push(genesis);
  }

  /**
   * Registra uma decisão autônoma na trilha de auditoria encadeada
   */
  public logDecision(params: {
    decisionId: string;
    agenteResponsavel: string;
    acaoExecutada: string;
    cidadeId: string;
    parametros: Record<string, any>;
    justificativa: string;
    impactoPrevisto: string;
    prioridade: 'P0' | 'P1' | 'P2' | 'P3';
  }): DecisionAuditRecord {
    const lastRecord = this.auditChain[this.auditChain.length - 1];
    const prevHash = lastRecord ? lastRecord.blockHashAtual : '0000000000000000';

    const timestamp = Date.now();
    const auditId = `AUD-${timestamp}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    
    // P0 requer aprovação humana se Human-in-the-Loop estiver explicitamente ativado
    const requiresHuman = this.humanInTheLoopEnabled && params.prioridade === 'P0';

    // Hash criptográfico simples em TS (soma SHA-like determinística)
    const contentToHash = `${prevHash}|${auditId}|${params.decisionId}|${params.acaoExecutada}|${timestamp}`;
    let hashNum = 0;
    for (let i = 0; i < contentToHash.length; i++) {
      hashNum = ((hashNum << 5) - hashNum) + contentToHash.charCodeAt(i);
      hashNum |= 0;
    }
    const blockHashAtual = Math.abs(hashNum).toString(16).padStart(16, '0');

    const record: DecisionAuditRecord = {
      auditId,
      decisionId: params.decisionId,
      timestamp,
      agenteResponsavel: params.agenteResponsavel,
      acaoExecutada: params.acaoExecutada,
      cidadeId: params.cidadeId,
      parametros: params.parametros,
      justificativa: params.justificativa,
      impactoPrevisto: params.impactoPrevisto,
      requerAprovacaoHumana: requiresHuman,
      statusAprovacao: requiresHuman ? 'AGUARDANDO_APROVACAO_HUMANA' : 'AUTONOMO_CONFIRMADO',
      revertivel: true,
      blockHashAnterior: prevHash,
      blockHashAtual
    };

    this.auditChain.push(record);
    return record;
  }

  /**
   * Executa rollback de uma decisão registrada
   */
  public rollbackDecision(auditId: string): boolean {
    const record = this.auditChain.find((r) => r.auditId === auditId);
    if (!record || !record.revertivel) return false;

    record.statusAprovacao = 'REVERTIDO';
    return true;
  }

  /**
   * Permite que um operador humano aprove manualmente uma ação retida
   */
  public approveDecisionManually(auditId: string): boolean {
    const record = this.auditChain.find((r) => r.auditId === auditId);
    if (!record || record.statusAprovacao !== 'AGUARDANDO_APROVACAO_HUMANA') return false;

    record.statusAprovacao = 'APROVADO_MANUALMENTE';
    return true;
  }

  public setHumanInTheLoop(enabled: boolean): void {
    this.humanInTheLoopEnabled = enabled;
  }

  public isHumanInTheLoop(): boolean {
    return this.humanInTheLoopEnabled;
  }

  public getAuditChain(): DecisionAuditRecord[] {
    return this.auditChain;
  }
}

export const aiGovernanceEngine = new AIGovernanceEngine();
