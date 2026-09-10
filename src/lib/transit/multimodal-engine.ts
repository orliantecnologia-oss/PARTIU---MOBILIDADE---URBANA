/**
 * MULTIMODAL TRANSIT ENGINE — UNIFIED TRANSIT LAYER
 * 
 * Camada Unificada de Trânsito Urbano e Regional:
 * - Integração operacional de Carros, Motos, Vans Cooperadas, Ônibus e Fretamento
 * - Bilhete Único Multimodal com desconto automático em conexões
 * - Sincronização de transferências em terminais e hubs
 */

import { vanNetworkEngine, UrbanVanLine } from './van-network';
import { busNetworkEngine, UrbanBusLine } from './bus-network';
import { routeOptimizerEngine, MultimodalTripItinerary, TransitModalType } from './route-optimizer';

export interface UnifiedTransitLayerState {
  cityId: string;
  cityName: string;
  activeVanLinesCount: number;
  activeBusLinesCount: number;
  availableAppDriversCount: number;
  availableMotorcyclesCount: number;
  integratedStationsCount: number;
  dailyPassengersCarriedEstimate: number;
  transferDiscountEnabled: boolean;
  transferDiscountWindowMinutes: number; // Ex: 90 minutos
  status: 'OPERACAO_NORMAL' | 'CONTINGENCIA' | 'FROTA_EXPANDIDA';
  lastSynchronizedAt: number;
}

export interface MultimodalTicket {
  ticketId: string;
  passengerId: string;
  initialLegModal: TransitModalType;
  issuedAt: number;
  expiresAt: number;
  farePaidBrl: number;
  transfersAllowed: number;
  transfersUsed: number;
  status: 'VALIDO' | 'UTILIZADO' | 'EXPIRADO';
}

export class MultimodalEngine {
  private tickets: Map<string, MultimodalTicket> = new Map();

  public getVanEngine() {
    return vanNetworkEngine;
  }

  public getBusEngine() {
    return busNetworkEngine;
  }

  public getOptimizerEngine() {
    return routeOptimizerEngine;
  }

  /**
   * Obtém o estado consolidado da Unified Transit Layer para um município
   */
  public getUnifiedTransitLayerState(cityId: string, cityName: string): UnifiedTransitLayerState {
    const vanLines = vanNetworkEngine.getVanLinesByCity(cityId);
    const busLines = busNetworkEngine.getBusLinesByCity(cityId);

    return {
      cityId,
      cityName,
      activeVanLinesCount: vanLines.length,
      activeBusLinesCount: busLines.length,
      availableAppDriversCount: 142,
      availableMotorcyclesCount: 88,
      integratedStationsCount: 6,
      dailyPassengersCarriedEstimate: 28400,
      transferDiscountEnabled: true,
      transferDiscountWindowMinutes: 90,
      status: 'OPERACAO_NORMAL',
      lastSynchronizedAt: Date.now()
    };
  }

  /**
   * Emite um Bilhete Único Multimodal com janela de transferência de 90 minutos
   */
  public issueUnifiedTransitTicket(passengerId: string, initialModal: TransitModalType, fareBrl: number): MultimodalTicket {
    const ticket: MultimodalTicket = {
      ticketId: `TICK-MULTI-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      passengerId,
      initialLegModal: initialModal,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 90 * 60 * 1000, // 90 min
      farePaidBrl: fareBrl,
      transfersAllowed: 2,
      transfersUsed: 0,
      status: 'VALIDO'
    };

    this.tickets.set(ticket.ticketId, ticket);
    return ticket;
  }

  /**
   * Valida transbordo de bilhete multimodal (desconto de até 100% no segundo modal ou tarifa complementar)
   */
  public validateTransfer(ticketId: string, nextModalFareBrl: number): {
    authorized: boolean;
    complementBrl: number;
    message: string;
  } {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      return { authorized: false, complementBrl: nextModalFareBrl, message: 'Bilhete multimodal não encontrado.' };
    }

    if (ticket.status !== 'VALIDO' || Date.now() > ticket.expiresAt) {
      ticket.status = 'EXPIRADO';
      return { authorized: false, complementBrl: nextModalFareBrl, message: 'Janela de 90 min de transferência expirada.' };
    }

    if (ticket.transfersUsed >= ticket.transfersAllowed) {
      return { authorized: false, complementBrl: nextModalFareBrl, message: 'Limite de transferências atingido.' };
    }

    ticket.transfersUsed += 1;
    // Se a tarifa do próximo modal for maior, paga apenas a diferença (complemento)
    const complement = Math.max(0, nextModalFareBrl - ticket.farePaidBrl);

    return {
      authorized: true,
      complementBrl: Number(complement.toFixed(2)),
      message: complement === 0 
        ? 'Transbordo 100% gratuito integrado!'
        : `Transbordo autorizado com complemento tarifário de R$ ${complement.toFixed(2)}.`
    };
  }
}

export const multimodalTransitEngine = new MultimodalEngine();
