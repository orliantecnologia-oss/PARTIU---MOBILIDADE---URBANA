/**
 * PARTIU CORPORATE MOBILITY ENGINE
 * 
 * Plataforma Corporativa B2B de Gestão de Mobilidade Empresarial.
 * Responsável por:
 * - Empresas parceiras e filiais
 * - Departamentos e estrutura organizacional
 * - Colaboradores e perfis de acesso
 */

export interface CorporateAccountEmployee {
  employeeId: string;
  corporateId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  costCenterCode: string;
  role: 'COLABORADOR' | 'GESTOR_DEPARTAMENTO' | 'ADMIN_EMPRESA';
  monthlyAllowanceBrl: number;
  currentMonthSpentBrl: number;
  isActive: boolean;
}

export interface CorporateAccount {
  corporateId: string;
  cnpj: string;
  companyName: string;
  tradeName: string;
  headquartersCity: string;
  billingEmail: string;
  billingCycle: 'SEMANAL' | 'QUINZENAL' | 'MENSAL';
  creditLimitBrl: number;
  currentOutstandingBrl: number;
  departments: string[];
  activeEmployeesCount: number;
  paymentTermDays: number; // Ex: D+15, D+30
  isActive: boolean;
  createdAt: number;
}

export class CorporateEngine {
  private accounts: Map<string, CorporateAccount> = new Map();
  private employees: Map<string, CorporateAccountEmployee> = new Map();

  constructor() {
    this.initializeDefaultCorporateAccounts();
  }

  private initializeDefaultCorporateAccounts(): void {
    const defaultCorp: CorporateAccount = {
      corporateId: 'CORP-PETRO-01',
      cnpj: '12.345.678/0001-90',
      companyName: 'PetroServ Offshore Logística S.A.',
      tradeName: 'PetroServ Macaé',
      headquartersCity: 'Macaé',
      billingEmail: 'financeiro@petroserv.com.br',
      billingCycle: 'MENSAL',
      creditLimitBrl: 75000.0,
      currentOutstandingBrl: 18450.0,
      departments: ['Operações Offshore', 'Engenharia', 'Diretoria', 'RH'],
      activeEmployeesCount: 145,
      paymentTermDays: 30,
      isActive: true,
      createdAt: Date.now() - 90 * 86400 * 1000
    };

    this.registerCorporateAccount(defaultCorp);

    const defaultEmp: CorporateAccountEmployee = {
      employeeId: 'EMP-9001',
      corporateId: 'CORP-PETRO-01',
      name: 'Dr. Rodrigo Alvarenga',
      email: 'rodrigo.alvarenga@petroserv.com.br',
      phone: '+55 22 99777-1122',
      department: 'Engenharia',
      costCenterCode: 'CC-ENG-2026',
      role: 'GESTOR_DEPARTAMENTO',
      monthlyAllowanceBrl: 3500.0,
      currentMonthSpentBrl: 1120.0,
      isActive: true
    };

    this.registerEmployee(defaultEmp);
  }

  public registerCorporateAccount(account: CorporateAccount): void {
    this.accounts.set(account.corporateId, account);
  }

  public getCorporateAccount(corporateId: string): CorporateAccount | undefined {
    return this.accounts.get(corporateId);
  }

  public getAllCorporateAccounts(): CorporateAccount[] {
    return Array.from(this.accounts.values());
  }

  public registerEmployee(employee: CorporateAccountEmployee): void {
    this.employees.set(employee.employeeId, employee);
  }

  public getEmployee(employeeId: string): CorporateAccountEmployee | undefined {
    return this.employees.get(employeeId);
  }

  public getEmployeesByCorporate(corporateId: string): CorporateAccountEmployee[] {
    return Array.from(this.employees.values()).filter(e => e.corporateId === corporateId);
  }
}

export const corporateEngine = new CorporateEngine();
