/**
 * PARTIU APPROVAL ENGINE
 * 
 * Motor de Fluxo de Aprovações para Viagens Corporativas.
 * Executa aprovação automática para viagens em conformidade ou encaminha para deliberação do gestor.
 */

import { travelPolicyEngine, TravelPolicyValidationResult } from './travel-policy-engine';
import { costCenterEngine } from './cost-center-engine';

export interface CorporateTripApprovalRequest {
  requestId: string;
  corporateId: string;
  employeeId: string;
  employeeName: string;
  costCenterCode: string;
  managerEmail: string;
  modalidade: 'POP' | 'MOTO' | 'PLUS';
  origin: string;
  destination: string;
  estimatedFareBrl: number;
  justificationText?: string | undefined;
  policyValidation: TravelPolicyValidationResult;
  status: 'APROVADA_AUTOMATICA' | 'PENDENTE_APROVACAO_GESTOR' | 'APROVADA_GESTOR' | 'REJEITADA_GESTOR';
  approverComments?: string | undefined;
  decidedAt?: number | undefined;
  createdAt: number;
}

export class ApprovalEngine {
  private requests: Map<string, CorporateTripApprovalRequest> = new Map();

  /**
   * Submete uma solicitação de viagem corporativa para aprovação
   */
  public submitTripRequest(
    corporateId: string,
    employeeId: string,
    employeeName: string,
    costCenterCode: string,
    managerEmail: string,
    modalidade: 'POP' | 'MOTO' | 'PLUS',
    origin: string,
    destination: string,
    estimatedFareBrl: number,
    currentDaySpendBrl: number,
    justificationText?: string
  ): CorporateTripApprovalRequest {
    const requestId = `APV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const validation = travelPolicyEngine.validateTrip(
      corporateId,
      estimatedFareBrl,
      currentDaySpendBrl,
      modalidade,
      origin,
      destination
    );

    let status: CorporateTripApprovalRequest['status'] = 'APROVADA_AUTOMATICA';
    if (validation.requiresManagerApproval) {
      status = 'PENDENTE_APROVACAO_GESTOR';
    } else {
      // Já debita no centro de custo
      costCenterEngine.debitCostCenter(corporateId, costCenterCode, estimatedFareBrl);
    }

    const request: CorporateTripApprovalRequest = {
      requestId,
      corporateId,
      employeeId,
      employeeName,
      costCenterCode,
      managerEmail,
      modalidade,
      origin,
      destination,
      estimatedFareBrl,
      justificationText,
      policyValidation: validation,
      status,
      createdAt: Date.now(),
      decidedAt: status === 'APROVADA_AUTOMATICA' ? Date.now() : undefined
    };

    this.requests.set(requestId, request);
    return request;
  }

  /**
   * Gestor aprova a solicitação pendente
   */
  public approveRequest(requestId: string, comments: string = 'Aprovado pelo gestor de departamento.'): CorporateTripApprovalRequest {
    const req = this.requests.get(requestId);
    if (!req) throw new Error(`Solicitação '${requestId}' não encontrada.`);

    req.status = 'APROVADA_GESTOR';
    req.approverComments = comments;
    req.decidedAt = Date.now();

    costCenterEngine.debitCostCenter(req.corporateId, req.costCenterCode, req.estimatedFareBrl);
    return req;
  }

  /**
   * Gestor rejeita a solicitação pendente
   */
  public rejectRequest(requestId: string, reason: string): CorporateTripApprovalRequest {
    const req = this.requests.get(requestId);
    if (!req) throw new Error(`Solicitação '${requestId}' não encontrada.`);

    req.status = 'REJEITADA_GESTOR';
    req.approverComments = reason;
    req.decidedAt = Date.now();
    return req;
  }

  public getRequest(requestId: string): CorporateTripApprovalRequest | undefined {
    return this.requests.get(requestId);
  }

  public getPendingRequestsByManager(managerEmail: string): CorporateTripApprovalRequest[] {
    return Array.from(this.requests.values()).filter(r =>
      r.managerEmail.toLowerCase() === managerEmail.toLowerCase() &&
      r.status === 'PENDENTE_APROVACAO_GESTOR'
    );
  }
}

export const approvalEngine = new ApprovalEngine();
