/**
 * PARTIU TRAVEL POLICY ENGINE
 * 
 * Motor de Governança e Validação de Políticas de Viagem Corporativas.
 * Verifica limites orçamentários, horários permitidos e rotas autorizadas.
 */

export interface CorporateTravelPolicy {
  policyId: string;
  corporateId: string;
  policyName: string;
  maxFarePerTripBrl: number;
  maxDailySpendBrl: number;
  maxMonthlySpendBrl: number;
  allowedModalities: Array<'POP' | 'MOTO' | 'PLUS'>;
  operatingHours: { startHour: number; endHour: number }; // Ex: 7 a 20h
  allowWeekendTrips: boolean;
  allowedOriginCities: string[];
  allowedDestinationCities: string[];
  requireJustificationAboveBrl: number;
  autoApproveWithinLimits: boolean;
  isActive: boolean;
}

export interface TravelPolicyValidationResult {
  isCompliant: boolean;
  requiresManagerApproval: boolean;
  violations: string[];
  justificationRequired: boolean;
}

export class TravelPolicyEngine {
  private policies: Map<string, CorporateTravelPolicy> = new Map();

  constructor() {
    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies(): void {
    const defaultPolicy: CorporateTravelPolicy = {
      policyId: 'POL-CORP-STD-01',
      corporateId: 'CORP-PETRO-01',
      policyName: 'Política Geral de Deslocamento Operacional',
      maxFarePerTripBrl: 150.0,
      maxDailySpendBrl: 300.0,
      maxMonthlySpendBrl: 3500.0,
      allowedModalities: ['POP', 'PLUS'],
      operatingHours: { startHour: 6, endHour: 22 },
      allowWeekendTrips: false,
      allowedOriginCities: ['Macaé', 'Campos dos Goytacazes', 'Rio das Ostras'],
      allowedDestinationCities: ['Macaé', 'Campos dos Goytacazes', 'Rio das Ostras', 'Itaperuna'],
      requireJustificationAboveBrl: 80.0,
      autoApproveWithinLimits: true,
      isActive: true
    };

    this.registerPolicy(defaultPolicy);
  }

  public registerPolicy(policy: CorporateTravelPolicy): void {
    this.policies.set(policy.corporateId, policy);
  }

  public getPolicy(corporateId: string): CorporateTravelPolicy | undefined {
    return this.policies.get(corporateId);
  }

  /**
   * Valida uma solicitação de viagem corporativa contra as políticas ativas
   */
  public validateTrip(
    corporateId: string,
    fareBrl: number,
    currentDaySpendBrl: number,
    modalidade: 'POP' | 'MOTO' | 'PLUS',
    originCity: string,
    destinationCity: string,
    tripDate: Date = new Date()
  ): TravelPolicyValidationResult {
    const policy = this.policies.get(corporateId);
    if (!policy || !policy.isActive) {
      return { isCompliant: true, requiresManagerApproval: false, violations: [], justificationRequired: false };
    }

    const violations: string[] = [];
    let requiresApproval = false;

    // 1. Limite por corrida
    if (fareBrl > policy.maxFarePerTripBrl) {
      violations.push(`Tarifa de R$ ${fareBrl.toFixed(2)} excede o limite máximo permitido de R$ ${policy.maxFarePerTripBrl.toFixed(2)} por viagem.`);
      requiresApproval = true;
    }

    // 2. Limite diário
    if (currentDaySpendBrl + fareBrl > policy.maxDailySpendBrl) {
      violations.push(`Gasto diário projetado de R$ ${(currentDaySpendBrl + fareBrl).toFixed(2)} excede o limite diário de R$ ${policy.maxDailySpendBrl.toFixed(2)}.`);
      requiresApproval = true;
    }

    // 3. Modalidade permitida
    if (!policy.allowedModalities.includes(modalidade)) {
      violations.push(`Modalidade '${modalidade}' não é autorizada para esta conta corporativa.`);
      requiresApproval = true;
    }

    // 4. Horário de funcionamento
    const currentHour = tripDate.getHours();
    if (currentHour < policy.operatingHours.startHour || currentHour >= policy.operatingHours.endHour) {
      violations.push(`Viagem solicitada às ${currentHour}h está fora da janela autorizada (${policy.operatingHours.startHour}h às ${policy.operatingHours.endHour}h).`);
      requiresApproval = true;
    }

    // 5. Final de semana
    const isWeekend = tripDate.getDay() === 0 || tripDate.getDay() === 6;
    if (isWeekend && !policy.allowWeekendTrips) {
      violations.push('Viagens em fins de semana exigem aprovação prévia expressa do gestor.');
      requiresApproval = true;
    }

    const justificationRequired = fareBrl >= policy.requireJustificationAboveBrl;

    return {
      isCompliant: violations.length === 0,
      requiresManagerApproval: requiresApproval,
      violations,
      justificationRequired
    };
  }
}

export const travelPolicyEngine = new TravelPolicyEngine();
