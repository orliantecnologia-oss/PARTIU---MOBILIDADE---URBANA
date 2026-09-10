/**
 * PARTIU COST CENTER ENGINE
 * 
 * Gestão de Centros de Custo e Dotação Orçamentária Corporativa.
 * Permite rateio de despesas de viagens corporativas e auditoria contábil.
 */

export interface CorporateCostCenter {
  costCenterCode: string;
  corporateId: string;
  name: string;
  department: string;
  monthlyBudgetBrl: number;
  currentSpendBrl: number;
  availableBudgetBrl: number;
  managerEmail: string;
  isOverBudget: boolean;
  isActive: boolean;
}

export class CorporateCostCenterEngine {
  private costCenters: Map<string, CorporateCostCenter> = new Map();

  constructor() {
    this.initializeDefaultCorporateCostCenters();
  }

  private initializeDefaultCorporateCostCenters(): void {
    const defaultCCs: CorporateCostCenter[] = [
      {
        costCenterCode: 'CC-ENG-2026',
        corporateId: 'CORP-PETRO-01',
        name: 'Centro de Custos Engenharia de Campo',
        department: 'Engenharia',
        monthlyBudgetBrl: 25000.0,
        currentSpendBrl: 8420.0,
        availableBudgetBrl: 16580.0,
        managerEmail: 'rodrigo.alvarenga@petroserv.com.br',
        isOverBudget: false,
        isActive: true
      },
      {
        costCenterCode: 'CC-OPS-2026',
        corporateId: 'CORP-PETRO-01',
        name: 'Centro de Custos Operações Portuárias',
        department: 'Operações Offshore',
        monthlyBudgetBrl: 40000.0,
        currentSpendBrl: 12300.0,
        availableBudgetBrl: 27700.0,
        managerEmail: 'operacoes@petroserv.com.br',
        isOverBudget: false,
        isActive: true
      }
    ];

    defaultCCs.forEach(cc => this.registerCorporateCostCenter(cc));
  }

  public registerCorporateCostCenter(costCenter: CorporateCostCenter): void {
    this.costCenters.set(`${costCenter.corporateId}_${costCenter.costCenterCode}`, costCenter);
  }

  public getCorporateCostCenter(corporateId: string, costCenterCode: string): CorporateCostCenter | undefined {
    return this.costCenters.get(`${corporateId}_${costCenterCode}`);
  }

  public debitCorporateCostCenter(corporateId: string, costCenterCode: string, amountBrl: number): boolean {
    const cc = this.getCorporateCostCenter(corporateId, costCenterCode);
    if (!cc || !cc.isActive) return false;

    cc.currentSpendBrl = Number((cc.currentSpendBrl + amountBrl).toFixed(2));
    cc.availableBudgetBrl = Number((cc.monthlyBudgetBrl - cc.currentSpendBrl).toFixed(2));
    cc.isOverBudget = cc.availableBudgetBrl < 0;
    return true;
  }

  public getCorporateCostCentersByCorporate(corporateId: string): CorporateCostCenter[] {
    return Array.from(this.costCenters.values()).filter(cc => cc.corporateId === corporateId);
  }

  // Aliases for seamless compatibility
  public registerCostCenter(costCenter: CorporateCostCenter): void {
    this.registerCorporateCostCenter(costCenter);
  }

  public getCostCenter(corporateId: string, costCenterCode: string): CorporateCostCenter | undefined {
    return this.getCorporateCostCenter(corporateId, costCenterCode);
  }

  public debitCostCenter(corporateId: string, costCenterCode: string, amountBrl: number): boolean {
    return this.debitCorporateCostCenter(corporateId, costCenterCode, amountBrl);
  }
}

export const costCenterEngine = new CorporateCostCenterEngine();
