/**
 * PARTIU FRANCHISE GOVERNANCE & COMPLIANCE
 * 
 * Auditoria Operacional, Verificação de SLAs e Conformidade Regulatória de Franquias.
 */

export interface FranchiseAuditReport {
  franchiseId: string;
  cityName: string;
  auditDate: number;
  slaSupportResponseTimeSeconds: number; // SLA meta < 180s
  cancellationRatePct: number; // Meta < 4.5%
  fleetInspectionCompliancePct: number; // Meta > 90%
  regulatoryPermitValid: boolean;
  governanceScore: number; // 0 a 100
  auditStatus: 'CONFORME' | 'EM_OBSERVACAO' | 'NOTIFICADA' | 'NAO_CONFORME';
  recommendations: string[];
}

export class FranchiseGovernanceEngine {
  /**
   * Executa auditoria mensal de conformidade e qualidade da franquia
   */
  public conductAudit(
    franchiseId: string,
    cityName: string,
    supportResponseSeconds: number,
    cancellationRatePct: number,
    fleetInspectionCompliancePct: number,
    regulatoryPermitValid: boolean
  ): FranchiseAuditReport {
    const recommendations: string[] = [];

    // Critérios de Pontuação
    let scoreSla = supportResponseSeconds <= 180 ? 25 : Math.max(5, 25 - (supportResponseSeconds - 180) / 10);
    let scoreCancel = cancellationRatePct <= 4.0 ? 25 : Math.max(5, 25 - (cancellationRatePct - 4.0) * 5);
    let scoreFleet = (fleetInspectionCompliancePct / 100) * 25;
    let scoreReg = regulatoryPermitValid ? 25 : 0;

    if (supportResponseSeconds > 180) {
      recommendations.push(`Reduzir tempo de resposta do suporte de ${supportResponseSeconds}s para menos de 180s.`);
    }
    if (cancellationRatePct > 4.5) {
      recommendations.push(`Taxa de cancelamento em ${cancellationRatePct}% está acima do teto de 4.5%. Intensificar missões aos motoristas.`);
    }
    if (fleetInspectionCompliancePct < 90) {
      recommendations.push(`Vistoria veicular em ${fleetInspectionCompliancePct}%. Concluir vistorias pendentes da frota.`);
    }
    if (!regulatoryPermitValid) {
      recommendations.push('Alvará/decreto municipal de mobilidade urbana pendente de renovação com a prefeitura.');
    }

    const governanceScore = Math.min(100, Math.round(scoreSla + scoreCancel + scoreFleet + scoreReg));

    let auditStatus: FranchiseAuditReport['auditStatus'] = 'CONFORME';
    if (governanceScore < 60) auditStatus = 'NAO_CONFORME';
    else if (governanceScore < 75) auditStatus = 'NOTIFICADA';
    else if (governanceScore < 85) auditStatus = 'EM_OBSERVACAO';

    return {
      franchiseId,
      cityName,
      auditDate: Date.now(),
      slaSupportResponseTimeSeconds: supportResponseSeconds,
      cancellationRatePct,
      fleetInspectionCompliancePct,
      regulatoryPermitValid,
      governanceScore,
      auditStatus,
      recommendations
    };
  }
}

export const franchiseGovernanceEngine = new FranchiseGovernanceEngine();
