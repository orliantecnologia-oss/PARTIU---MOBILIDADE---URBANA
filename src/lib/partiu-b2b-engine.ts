/**
 * PARTIU MOBILIDADE URBANA — ENTERPRISE B2B ENGINE (PARTIU EMPRESAS)
 * Gestão Corporativa de Mobilidade Urbana, Centros de Custo, Políticas de Viagem,
 * Aprovações Automatizadas e Faturamento Consolidado (Boleto/Fatura).
 */

export interface CorporateCompany {
  id: string;
  corporateName: string;
  cnpj: string;
  billingEmail: string;
  monthlyCreditLimitBrl: number;
  currentMonthSpentBrl: number;
  billingCycle: "QUINZENAL" | "MENSAL";
  convenienceFeePercent: number; // 14% a 16%
  status: "ATIVA" | "BLOQUEADA_FINANCEIRO" | "ANALISE";
}

export interface CostCenter {
  id: string;
  companyId: string;
  code: string;
  name: string; // Ex: "TI", "Comercial", "Operações", "Diretoria"
  monthlyBudgetBrl: number;
  allocatedSpendBrl: number;
}

export interface CorporateEmployee {
  id: string;
  companyId: string;
  costCenterId: string;
  fullName: string;
  workEmail: string;
  phone: string;
  monthlySpendLimitBrl: number;
  allowedHours: "COMMERCIAL_ONLY" | "24_HOURS" | "CUSTOM";
  requireReasonForRide: boolean;
  isActive: boolean;
}

export interface CorporateTripValidationResult {
  isAllowed: boolean;
  rejectReason?: string;
  costCenterName?: string;
  remainingEmployeeBudgetBrl?: number;
}

export interface CorporateInvoice {
  id: string;
  companyId: string;
  periodStart: string;
  periodEnd: string;
  totalTripsCount: number;
  grossTripsAmountBrl: number;
  convenienceFeeAmountBrl: number;
  totalInvoiceAmountBrl: number;
  dueDate: string;
  status: "PENDENTE" | "PAGA" | "VENCIDA";
  pdfInvoiceUrl?: string;
}

/**
 * 1. VALIDADOR DE POLÍTICAS DE VIAGEM CORPORATIVA (B2B POLICY CHECK)
 */
export function validateCorporateRidePolicy(
  company: CorporateCompany,
  employee: CorporateEmployee,
  costCenter: CostCenter,
  estimatedRideCostBrl: number,
  rideHour: number, // 0 a 23
  providedReason?: string
): CorporateTripValidationResult {
  if (company.status !== "ATIVA") {
    return { isAllowed: false, rejectReason: "Conta corporativa da empresa com restrição administrativa ou financeira." };
  }

  if (company.currentMonthSpentBrl + estimatedRideCostBrl > company.monthlyCreditLimitBrl) {
    return { isAllowed: false, rejectReason: "Limite de crédito corporativo global da empresa atingido para este ciclo." };
  }

  if (!employee.isActive) {
    return { isAllowed: false, rejectReason: "Colaborador inativo nas políticas corporativas da empresa." };
  }

  // Validação de horário comercial (07h às 20h)
  if (employee.allowedHours === "COMMERCIAL_ONLY" && (rideHour < 7 || rideHour > 20)) {
    return {
      isAllowed: false,
      rejectReason: "Horário não autorizado pelas diretrizes da sua empresa (apenas horário comercial das 07h às 20h).",
    };
  }

  // Validação de justificativa obrigatória
  if (employee.requireReasonForRide && (!providedReason || providedReason.trim().length < 5)) {
    return {
      isAllowed: false,
      rejectReason: "Esta empresa exige justificativa de negócio para autorizar a corrida (mínimo 5 caracteres).",
    };
  }

  // Validação de orçamento do centro de custo
  if (costCenter.allocatedSpendBrl + estimatedRideCostBrl > costCenter.monthlyBudgetBrl) {
    return {
      isAllowed: false,
      rejectReason: `Centro de Custo "${costCenter.name}" ultrapassou o teto orçamentário aprovado.`,
    };
  }

  return {
    isAllowed: true,
    costCenterName: costCenter.name,
    remainingEmployeeBudgetBrl: employee.monthlySpendLimitBrl - (costCenter.allocatedSpendBrl + estimatedRideCostBrl),
  };
}

/**
 * 2. GERADOR DE FATURA CONSOLIDADA CORPORATIVA
 */
export function generateCorporateInvoice(
  company: CorporateCompany,
  tripsAmountBrl: number,
  tripsCount: number,
  periodStart: string,
  periodEnd: string,
  dueDate: string
): CorporateInvoice {
  const convenienceFee = tripsAmountBrl * (company.convenienceFeePercent / 100);
  const total = tripsAmountBrl + convenienceFee;

  return {
    id: `FAT-${company.id.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-6)}`,
    companyId: company.id,
    periodStart,
    periodEnd,
    totalTripsCount: tripsCount,
    grossTripsAmountBrl: Number(tripsAmountBrl.toFixed(2)),
    convenienceFeeAmountBrl: Number(convenienceFee.toFixed(2)),
    totalInvoiceAmountBrl: Number(total.toFixed(2)),
    dueDate,
    status: "PENDENTE",
  };
}
