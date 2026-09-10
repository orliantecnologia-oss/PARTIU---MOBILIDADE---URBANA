/**
 * SMART PASSENGER BOARDING ENGINE — BOARDING CHECKLIST
 * 
 * Checklist operacional para motoristas no momento do embarque.
 * Suporta modo 1-tap simplificado (estilo Uber/99) e modo detalhado para perfis sob observação.
 */

import { PassengerTrustTier } from '../trust/trust-score';
import { PassengerRiskLevel } from './passenger-verification';

export interface BoardingChecklistItem {
  id: 'passenger_identified' | 'passenger_boarded' | 'destination_confirmed' | 'safety_belt_checked';
  label: string;
  description: string;
  isCompleted: boolean;
  isRequired: boolean;
}

export interface BoardingChecklistState {
  rideId: string;
  passengerId: string;
  items: BoardingChecklistItem[];
  isReadyToStart: boolean;
  autoPassEligible: boolean;
  completedCount: number;
  totalCount: number;
  completedAt?: number | undefined;
}

export class BoardingChecklistEngine {
  /**
   * Inicializa o checklist de embarque baseado no nível de risco e tier de confiança
   */
  public initializeChecklist(
    rideId: string,
    passengerId: string,
    riskLevel: PassengerRiskLevel,
    trustTier: PassengerTrustTier
  ): BoardingChecklistState {
    const isAutoPass = riskLevel === 'LOW_RISK' && (trustTier === 'ELITE' || trustTier === 'PREMIUM' || trustTier === 'CONFIAVEL');

    const items: BoardingChecklistItem[] = [
      {
        id: 'passenger_identified',
        label: 'Identificação Confirmada',
        description: 'Nome e fisionomia do passageiro conferidos',
        isCompleted: isAutoPass,
        isRequired: true,
      },
      {
        id: 'passenger_boarded',
        label: 'Passageiro no Veículo',
        description: 'Passageiro acomodado com segurança no veículo',
        isCompleted: isAutoPass,
        isRequired: true,
      },
      {
        id: 'destination_confirmed',
        label: 'Destino Conferido',
        description: 'Destino final alinhado com o passageiro',
        isCompleted: isAutoPass,
        isRequired: riskLevel !== 'LOW_RISK',
      },
      {
        id: 'safety_belt_checked',
        label: 'Cinto de Segurança',
        description: 'Cinto afivelado antes do acionamento veicular',
        isCompleted: isAutoPass,
        isRequired: false,
      },
    ];

    const completedCount = items.filter((i) => i.isCompleted).length;
    const requiredItems = items.filter((i) => i.isRequired);
    const isReadyToStart = requiredItems.every((i) => i.isCompleted);

    return {
      rideId,
      passengerId,
      items,
      isReadyToStart,
      autoPassEligible: isAutoPass,
      completedCount,
      totalCount: items.length,
      completedAt: isReadyToStart ? Date.now() : undefined,
    };
  }

  /**
   * Alterna ou marca um item do checklist
   */
  public toggleChecklistItem(
    currentState: BoardingChecklistState,
    itemId: BoardingChecklistItem['id'],
    completed?: boolean
  ): BoardingChecklistState {
    const items = currentState.items.map((item) => {
      if (item.id === itemId) {
        const isCompleted = completed !== undefined ? completed : !item.isCompleted;
        return { ...item, isCompleted };
      }
      return item;
    });

    const completedCount = items.filter((i) => i.isCompleted).length;
    const requiredItems = items.filter((i) => i.isRequired);
    const isReadyToStart = requiredItems.every((i) => i.isCompleted);

    return {
      ...currentState,
      items,
      isReadyToStart,
      completedCount,
      completedAt: isReadyToStart ? Date.now() : undefined,
    };
  }

  /**
   * Conclui todos os itens de checklist em 1 clique (Ação rápida de motorista 99 / Uber)
   */
  public completeAllInOneTap(currentState: BoardingChecklistState): BoardingChecklistState {
    const items = currentState.items.map((item) => ({
      ...item,
      isCompleted: true,
    }));

    return {
      ...currentState,
      items,
      isReadyToStart: true,
      completedCount: items.length,
      completedAt: Date.now(),
    };
  }
}

export const boardingChecklistEngine = new BoardingChecklistEngine();
