/**
 * CIVIC MOBILITY PLATFORM — ORCHESTRATOR ENGINE
 * 
 * Integração dos serviços cívicos:
 * - Contratos e convênios municipais
 * - Emissão e resgate de vouchers sociais
 * - Linhas e transporte subsidiado
 * - Auditoria pública e relatórios de impacto
 * - Cálculo do Civic Mobility Score (0–100)
 */

import { civicContractsEngine, CivicMunicipalContract, CivicContractType } from './civic-contracts';
import { civicVouchersEngine, CivicVoucher, RedeemVoucherRequest, RedeemVoucherResult } from './civic-vouchers';
import { civicTransportEngine, CivicRoute, CivicRideManifest } from './civic-transport';
import { civicAnalyticsEngine, CivicImpactReport } from './civic-analytics';

export interface CivicMobilityScore {
  cityId: string;
  cityName: string;
  score: number; // 0 a 100
  tier: 'EXCELENCIA_CIVICA' | 'ALTA_EFICIENCIA' | 'OPERACAO_PADRAO' | 'EM_DESENVOLVIMENTO';
  breakdown: {
    coberturaScore: number;   // 0 a 25 (extensão geográfica e distritos atendidos)
    utilizacaoScore: number;  // 0 a 25 (taxa de vouchers e assentos utilizados)
    eficienciaScore: number;  // 0 a 25 (custo por km e pontualidade)
    economiaScore: number;    // 0 a 25 (economia gerada aos cofres públicos vs modelos tradicionais)
  };
  metrics: {
    coberturaPct: number;
    utilizacaoPct: number;
    custoKmBrl: number;
    economiaGeradaBrl: number;
    totalCidadaosAtendidos: number;
  };
  timestamp: number;
}

export class CivicEngine {
  public getContractsEngine() {
    return civicContractsEngine;
  }

  public getVouchersEngine() {
    return civicVouchersEngine;
  }

  public getTransportEngine() {
    return civicTransportEngine;
  }

  public getAnalyticsEngine() {
    return civicAnalyticsEngine;
  }

  /**
   * Calcula o Civic Mobility Score (0 a 100) para um município
   */
  public calculateCivicMobilityScore(cityId: string, cityName: string): CivicMobilityScore {
    const report = civicAnalyticsEngine.generateMunicipalReport(cityId, cityName);
    const contracts = civicContractsEngine.getContractsByCity(cityId);

    // 1. Cobertura (0 a 25)
    const coberturaScore = Math.min(25, Number(((report.coberturaTerritorialPct / 100) * 25).toFixed(1)));

    // 2. Utilização (0 a 25)
    const utilizacaoScore = Math.min(25, Number(((report.utilizationRatePct / 100) * 25).toFixed(1)));

    // 3. Eficiência (0 a 25) - benchmark: R$ 2,00 a R$ 3,50 por km
    const targetCostKm = 2.0;
    const efficiencyRatio = Math.max(0, 1 - Math.max(0, report.avgCostPerKmBrl - targetCostKm) / 3.0);
    const eficienciaScore = Math.min(25, Number((efficiencyRatio * 25).toFixed(1)));

    // 4. Economia Gerada (0 a 25) - proporção de economia vs investimento total
    const savingsRatio = Math.min(1.0, report.savingsVsTraditionalFleetBrl / (report.totalPublicInvestmentBrl * 0.4));
    const economiaScore = Math.min(25, Number((savingsRatio * 25).toFixed(1)));

    const totalScore = Number((coberturaScore + utilizacaoScore + eficienciaScore + economiaScore).toFixed(1));

    let tier: CivicMobilityScore['tier'] = 'EM_DESENVOLVIMENTO';
    if (totalScore >= 90) tier = 'EXCELENCIA_CIVICA';
    else if (totalScore >= 75) tier = 'ALTA_EFICIENCIA';
    else if (totalScore >= 60) tier = 'OPERACAO_PADRAO';

    return {
      cityId,
      cityName,
      score: totalScore,
      tier,
      breakdown: {
        coberturaScore,
        utilizacaoScore,
        eficienciaScore,
        economiaScore
      },
      metrics: {
        coberturaPct: report.coberturaTerritorialPct,
        utilizacaoPct: report.utilizationRatePct,
        custoKmBrl: report.avgCostPerKmBrl,
        economiaGeradaBrl: report.savingsVsTraditionalFleetBrl,
        totalCidadaosAtendidos: report.totalBenefitedCitizens
      },
      timestamp: Date.now()
    };
  }

  /**
   * Executa a emissão e validação completa de uma corrida cívica subsidiada
   */
  public requestCivicRide(params: {
    cityId: string;
    cityName: string;
    citizenId: string;
    contractType: CivicContractType;
    origin: string;
    destination: string;
    estimatedFareBrl: number;
    voucherCode?: string;
  }): {
    approved: boolean;
    subsidizedAmountBrl: number;
    citizenOutflowAmountBrl: number;
    commitmentId?: string | undefined;
    reason?: string | undefined;
  } {
    // Se tiver voucher nominal, valida via motor de vouchers
    if (params.voucherCode) {
      const voucherRes = civicVouchersEngine.redeemVoucher({
        voucherCode: params.voucherCode,
        citizenId: params.citizenId,
        rideValueBrl: params.estimatedFareBrl,
        originAddress: params.origin,
        destinationAddress: params.destination
      });

      if (voucherRes.success) {
        return {
          approved: true,
          subsidizedAmountBrl: voucherRes.subsidizedValueBrl,
          citizenOutflowAmountBrl: voucherRes.copayValueBrl,
          commitmentId: voucherRes.redemptionToken
        };
      }
    }

    // Se não tiver voucher ou voucher falhou, busca contrato direto da cidade
    const activeContracts = civicContractsEngine.getActiveContractsByType(params.cityId, params.contractType);
    const targetContract = activeContracts[0];
    if (!targetContract) {
      return {
        approved: false,
        subsidizedAmountBrl: 0,
        citizenOutflowAmountBrl: params.estimatedFareBrl,
        reason: `Nenhum convênio municipal ativo para a categoria ${params.contractType} em ${params.cityName}.`
      };
    }

    const commitment = civicContractsEngine.commitBudget({
      contractId: targetContract.contractId,
      citizenId: params.citizenId,
      estimatedAmountBrl: params.estimatedFareBrl,
      purpose: `Corrida cívica ${params.origin} -> ${params.destination}`,
      serviceCategory: params.contractType
    });

    return {
      approved: commitment.isApproved,
      subsidizedAmountBrl: commitment.subsidizedAmountBrl,
      citizenOutflowAmountBrl: commitment.citizenOutflowAmountBrl,
      commitmentId: commitment.commitmentId,
      reason: commitment.rejectionReason
    };
  }
}

export const civicEngine = new CivicEngine();
