/**
 * ENTERPRISE POLICY ENGINE — GOVERNANÇA & GUARDRAILS INVIOLÁVEIS
 * 
 * Regras estritas de conformidade regulatória, financeira e de risco:
 * - Limite Máximo de Subsídios (% da receita bruta)
 * - Limite Mínimo e Máximo de Take-Rate (0% a 10%)
 * - Limite Máximo de Exposição a Crédito por Motorista
 * - Limite de Orçamento de Expansão Territorial
 * - Limite Teto de Preço Dinâmico (Surge Cap)
 * - Nenhum agente de IA pode ultrapassar os limites parametrizados
 */

export interface EnterprisePolicyGuardrails {
  maxSubsidioPercentualReceita: number; // Ex: 18.0%
  minTakeRatePercentual: number; // Ex: 0.0% (Plano Ouro)
  maxTakeRatePercentual: number; // Ex: 10.0% (Teto híbrido)
  maxCreditoPorCondutorBrl: number; // Ex: R$ 8.000,00
  maxOrcamentoLancamentoPracaBrl: number; // Ex: R$ 50.000,00
  maxSurgeMultiplier: number; // Ex: 2.5x
  minReservaLiquidezPixPercentual: number; // Ex: 20.0%
}

export interface PolicyValidationRequest {
  actionType: string;
  targetCityId?: string;
  proposedTakeRatePct?: number;
  proposedSubsidioBrl?: number;
  proposedCreditAmountBrl?: number;
  proposedExpansionBudgetBrl?: number;
  proposedSurgeMultiplier?: number;
  receitaBrutaCidadeOuNacionalBrl?: number;
  driverCreditScore?: number;
}

export interface PolicyValidationResult {
  isCompliant: boolean;
  actionType: string;
  timestamp: number;
  violacoesDetectadas: string[];
  alertasConformidade: string[];
  statusAprovacao: 'CONFORME_APROVADO' | 'BLOQUEADO_VIOLACAO_POLITICA' | 'APROVADO_COM_AVISO';
  assinaturaGovernança: string;
}

export class EnterprisePolicyEngine {
  private guardrails: EnterprisePolicyGuardrails = {
    maxSubsidioPercentualReceita: 18.0,
    minTakeRatePercentual: 0.0,
    maxTakeRatePercentual: 10.0,
    maxCreditoPorCondutorBrl: 8000.0,
    maxOrcamentoLancamentoPracaBrl: 50000.0,
    maxSurgeMultiplier: 2.5,
    minReservaLiquidezPixPercentual: 20.0
  };

  public getGuardrails(): EnterprisePolicyGuardrails {
    return { ...this.guardrails };
  }

  /**
   * Valida deterministicamente se a ação proposta respeita as guardrails institucionais
   */
  public validateActionPolicy(req: PolicyValidationRequest): PolicyValidationResult {
    const timestamp = Date.now();
    const violacoes: string[] = [];
    const alertas: string[] = [];

    // 1. Verificação de Take-Rate
    if (req.proposedTakeRatePct !== undefined) {
      if (req.proposedTakeRatePct < this.guardrails.minTakeRatePercentual) {
        violacoes.push(`Take-rate de ${req.proposedTakeRatePct}% é inferior ao mínimo permitido (${this.guardrails.minTakeRatePercentual}%).`);
      }
      if (req.proposedTakeRatePct > this.guardrails.maxTakeRatePercentual) {
        violacoes.push(`Take-rate de ${req.proposedTakeRatePct}% excede o teto regulatório (${this.guardrails.maxTakeRatePercentual}%).`);
      }
    }

    // 2. Verificação de Subsídios vs Receita
    if (req.proposedSubsidioBrl !== undefined && req.receitaBrutaCidadeOuNacionalBrl !== undefined) {
      const pct = (req.proposedSubsidioBrl / Math.max(1, req.receitaBrutaCidadeOuNacionalBrl)) * 100.0;
      if (pct > this.guardrails.maxSubsidioPercentualReceita) {
        violacoes.push(`Subsídio de R$ ${req.proposedSubsidioBrl} representa ${pct.toFixed(1)}% da receita (teto: ${this.guardrails.maxSubsidioPercentualReceita}%).`);
      } else if (pct > 14.0) {
        alertas.push(`Subsídio elevado (${pct.toFixed(1)}% da receita). Exige acompanhamento de payback.`);
      }
    }

    // 3. Verificação de Crédito para Condutor
    if (req.proposedCreditAmountBrl !== undefined) {
      if (req.proposedCreditAmountBrl > this.guardrails.maxCreditoPorCondutorBrl) {
        violacoes.push(`Crédito de R$ ${req.proposedCreditAmountBrl} excede o limite máximo por parceiro (R$ ${this.guardrails.maxCreditoPorCondutorBrl}).`);
      }
      if (req.driverCreditScore !== undefined && req.driverCreditScore < 500 && req.proposedCreditAmountBrl > 0) {
        violacoes.push(`Concessão de crédito negada para condutor com Score ${req.driverCreditScore} (< 500).`);
      }
    }

    // 4. Verificação de Orçamento de Expansão
    if (req.proposedExpansionBudgetBrl !== undefined) {
      if (req.proposedExpansionBudgetBrl > this.guardrails.maxOrcamentoLancamentoPracaBrl) {
        violacoes.push(`Orçamento de expansão de R$ ${req.proposedExpansionBudgetBrl} excede o limite de R$ ${this.guardrails.maxOrcamentoLancamentoPracaBrl} por praça.`);
      }
    }

    // 5. Verificação de Teto de Surge
    if (req.proposedSurgeMultiplier !== undefined) {
      if (req.proposedSurgeMultiplier > this.guardrails.maxSurgeMultiplier) {
        violacoes.push(`Multiplicador de Surge de ${req.proposedSurgeMultiplier}x ultrapassa o teto de segurança de ${this.guardrails.maxSurgeMultiplier}x.`);
      }
    }

    const isCompliant = violacoes.length === 0;
    const status: PolicyValidationResult['statusAprovacao'] = 
      !isCompliant ? 'BLOQUEADO_VIOLACAO_POLITICA' : 
      alertas.length > 0 ? 'APROVADO_COM_AVISO' : 'CONFORME_APROVADO';

    const sig = `POL-SIG-${timestamp.toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    return {
      isCompliant,
      actionType: req.actionType,
      timestamp,
      violacoesDetectadas: violacoes,
      alertasConformidade: alertas,
      statusAprovacao: status,
      assinaturaGovernança: sig
    };
  }
}

export const enterprisePolicyEngine = new EnterprisePolicyEngine();
