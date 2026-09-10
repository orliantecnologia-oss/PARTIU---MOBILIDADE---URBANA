/**
 * CIVIC CONTRACTS & MUNICIPAL COOPERATION
 * 
 * Gestão de contratos administrativos, termos de cooperação técnica,
 * dotações orçamentárias (LOA / PPA) e limites de empenho com prefeituras e órgãos públicos.
 */

export type CivicContractType = 
  | 'TRANSPORTE_SUBSIDIADO_GERAL'
  | 'VALE_TRANSPORTE_MUNICIPAL'
  | 'TRANSPORTE_SAUDE_PACIENTES'
  | 'TRANSPORTE_ESCOLAR_RURAL_URBANO'
  | 'TRANSPORTE_UNIVERSITARIO'
  | 'TRANSPORTE_EVENTOS_PUBLICOS';

export type CivicContractStatus = 'ATIVO' | 'SUSPENSO' | 'EM_REVISAO' | 'ENCERRADO';

export interface CivicMunicipalContract {
  contractId: string;
  contractNumber: string; // Ex: "PREF-ITAP-2026/04"
  cityId: string;
  cityName: string;
  contractType: CivicContractType;
  managingEntity: string; // Ex: "Secretaria Municipal de Transportes e Mobilidade"
  startDate: string;
  endDate: string;
  budgetAllocatedBrl: number; // Dotação total autorizada
  budgetDisbursedBrl: number;  // Valor já liquidado/pago
  budgetCommittedBrl: number;  // Valor empenhado em reservas ativas
  maxMonthlyCapBrl: number;    // Limite mensal de empenho
  currentMonthSpendBrl: number; // Consumo no mês corrente
  status: CivicContractStatus;
  subsidizedRatePct: number;   // Ex: 100% (gratuidade total) ou 50% (meia tarifa)
  eligibleCitizensCount: number;
  auditRegistrationCode: string; // Registro no Tribunal de Contas (TCE)
}

export interface CivicBudgetCommitmentRequest {
  contractId: string;
  citizenId: string;
  estimatedAmountBrl: number;
  purpose: string;
  serviceCategory: CivicContractType;
}

export interface CivicBudgetCommitmentResult {
  isApproved: boolean;
  commitmentId?: string;
  rejectionReason?: string;
  subsidizedAmountBrl: number;
  citizenOutflowAmountBrl: number;
  remainingContractMonthlyCapBrl: number;
}

export class CivicContractsEngine {
  private contracts: Map<string, CivicMunicipalContract> = new Map();
  private commitments: Map<string, {
    commitmentId: string;
    contractId: string;
    citizenId: string;
    amountBrl: number;
    timestamp: number;
    status: 'EMPENHADO' | 'LIQUIDADO' | 'ESTORNADO';
  }> = new Map();

  constructor() {
    this.seedDefaultContracts();
  }

  private seedDefaultContracts(): void {
    const contracts: CivicMunicipalContract[] = [
      {
        contractId: 'CIV-ITAP-001',
        contractNumber: 'PNT-ITAP-2026/01',
        cityId: 'itaperuna-rj',
        cityName: 'Itaperuna',
        contractType: 'VALE_TRANSPORTE_MUNICIPAL',
        managingEntity: 'Secretaria Municipal de Assistência Social e Trabalho',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        budgetAllocatedBrl: 1200000.0,
        budgetDisbursedBrl: 215400.0,
        budgetCommittedBrl: 45000.0,
        maxMonthlyCapBrl: 100000.0,
        currentMonthSpendBrl: 38200.0,
        status: 'ATIVO',
        subsidizedRatePct: 100.0,
        eligibleCitizensCount: 3850,
        auditRegistrationCode: 'TCE-RJ-CONV-2026-9912',
      },
      {
        contractId: 'CIV-ITAP-002',
        contractNumber: 'SMS-ITAP-2026/08',
        cityId: 'itaperuna-rj',
        cityName: 'Itaperuna',
        contractType: 'TRANSPORTE_SAUDE_PACIENTES',
        managingEntity: 'Secretaria Municipal de Saúde',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        budgetAllocatedBrl: 850000.0,
        budgetDisbursedBrl: 142000.0,
        budgetCommittedBrl: 28000.0,
        maxMonthlyCapBrl: 75000.0,
        currentMonthSpendBrl: 31400.0,
        status: 'ATIVO',
        subsidizedRatePct: 100.0,
        eligibleCitizensCount: 1420,
        auditRegistrationCode: 'TCE-RJ-CONV-2026-9944',
      },
      {
        contractId: 'CIV-CAMPOS-001',
        contractNumber: 'PMCG-TRANS-2026/12',
        cityId: 'campos-dos-goytacazes-rj',
        cityName: 'Campos dos Goytacazes',
        contractType: 'TRANSPORTE_UNIVERSITARIO',
        managingEntity: 'Fundação Municipal de Apoio Universitário',
        startDate: '2026-02-01',
        endDate: '2026-12-31',
        budgetAllocatedBrl: 2400000.0,
        budgetDisbursedBrl: 480000.0,
        budgetCommittedBrl: 85000.0,
        maxMonthlyCapBrl: 200000.0,
        currentMonthSpendBrl: 92000.0,
        status: 'ATIVO',
        subsidizedRatePct: 70.0,
        eligibleCitizensCount: 7900,
        auditRegistrationCode: 'TCE-RJ-CONV-2026-8831',
      },
      {
        contractId: 'CIV-MACAE-001',
        contractNumber: 'PMM-TURISMO-2026/03',
        cityId: 'macae-rj',
        cityName: 'Macaé',
        contractType: 'TRANSPORTE_EVENTOS_PUBLICOS',
        managingEntity: 'Secretaria Municipal de Turismo e Eventos',
        startDate: '2026-03-01',
        endDate: '2026-12-31',
        budgetAllocatedBrl: 600000.0,
        budgetDisbursedBrl: 85000.0,
        budgetCommittedBrl: 15000.0,
        maxMonthlyCapBrl: 60000.0,
        currentMonthSpendBrl: 19500.0,
        status: 'ATIVO',
        subsidizedRatePct: 100.0,
        eligibleCitizensCount: 12000,
        auditRegistrationCode: 'TCE-RJ-CONV-2026-7755',
      }
    ];

    contracts.forEach(c => this.contracts.set(c.contractId, c));
  }

  public registerContract(contract: CivicMunicipalContract): void {
    this.contracts.set(contract.contractId, contract);
  }

  public getContract(contractId: string): CivicMunicipalContract | undefined {
    return this.contracts.get(contractId);
  }

  public getContractsByCity(cityId: string): CivicMunicipalContract[] {
    return Array.from(this.contracts.values()).filter(c => c.cityId === cityId);
  }

  public getActiveContractsByType(cityId: string, type: CivicContractType): CivicMunicipalContract[] {
    return Array.from(this.contracts.values()).filter(
      c => c.cityId === cityId && c.contractType === type && c.status === 'ATIVO'
    );
  }

  public commitBudget(request: CivicBudgetCommitmentRequest): CivicBudgetCommitmentResult {
    const contract = this.contracts.get(request.contractId);
    if (!contract) {
      return {
        isApproved: false,
        rejectionReason: `Contrato cívico ${request.contractId} não localizado.`,
        subsidizedAmountBrl: 0,
        citizenOutflowAmountBrl: request.estimatedAmountBrl,
        remainingContractMonthlyCapBrl: 0
      };
    }

    if (contract.status !== 'ATIVO') {
      return {
        isApproved: false,
        rejectionReason: `Contrato ${contract.contractNumber} está no status ${contract.status}.`,
        subsidizedAmountBrl: 0,
        citizenOutflowAmountBrl: request.estimatedAmountBrl,
        remainingContractMonthlyCapBrl: Math.max(0, contract.maxMonthlyCapBrl - contract.currentMonthSpendBrl)
      };
    }

    const subsidizedAmount = Number(((request.estimatedAmountBrl * contract.subsidizedRatePct) / 100).toFixed(2));
    const citizenAmount = Number((request.estimatedAmountBrl - subsidizedAmount).toFixed(2));

    const prospectiveMonthSpend = contract.currentMonthSpendBrl + subsidizedAmount;
    if (prospectiveMonthSpend > contract.maxMonthlyCapBrl) {
      return {
        isApproved: false,
        rejectionReason: `Dotação mensal máxima excedida (Teto: R$ ${contract.maxMonthlyCapBrl}, Atual: R$ ${contract.currentMonthSpendBrl}).`,
        subsidizedAmountBrl: 0,
        citizenOutflowAmountBrl: request.estimatedAmountBrl,
        remainingContractMonthlyCapBrl: Math.max(0, contract.maxMonthlyCapBrl - contract.currentMonthSpendBrl)
      };
    }

    if (contract.budgetDisbursedBrl + contract.budgetCommittedBrl + subsidizedAmount > contract.budgetAllocatedBrl) {
      return {
        isApproved: false,
        rejectionReason: `Orçamento total do convênio municipal esgotado.`,
        subsidizedAmountBrl: 0,
        citizenOutflowAmountBrl: request.estimatedAmountBrl,
        remainingContractMonthlyCapBrl: 0
      };
    }

    const commitmentId = `COMM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    contract.budgetCommittedBrl += subsidizedAmount;
    contract.currentMonthSpendBrl += subsidizedAmount;

    this.commitments.set(commitmentId, {
      commitmentId,
      contractId: contract.contractId,
      citizenId: request.citizenId,
      amountBrl: subsidizedAmount,
      timestamp: Date.now(),
      status: 'EMPENHADO'
    });

    return {
      isApproved: true,
      commitmentId,
      subsidizedAmountBrl: subsidizedAmount,
      citizenOutflowAmountBrl: citizenAmount,
      remainingContractMonthlyCapBrl: Number((contract.maxMonthlyCapBrl - contract.currentMonthSpendBrl).toFixed(2))
    };
  }

  public liquidateCommitment(commitmentId: string, finalSubsidizedAmountBrl: number): boolean {
    const commitment = this.commitments.get(commitmentId);
    if (!commitment || commitment.status !== 'EMPENHADO') return false;

    const contract = this.contracts.get(commitment.contractId);
    if (!contract) return false;

    contract.budgetCommittedBrl -= commitment.amountBrl;
    contract.budgetDisbursedBrl += finalSubsidizedAmountBrl;
    commitment.status = 'LIQUIDADO';
    commitment.amountBrl = finalSubsidizedAmountBrl;
    return true;
  }
}

export const civicContractsEngine = new CivicContractsEngine();
