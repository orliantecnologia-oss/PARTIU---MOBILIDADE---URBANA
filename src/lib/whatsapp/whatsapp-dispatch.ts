/**
 * PARTIU WHATSAPP DISPATCH & TRACKING
 * 
 * Orquestrador de Despacho, Pagamento PIX e Rastreamento ao Vivo para corridas via WhatsApp.
 */

import { pixEngine } from '../finance/pix-engine';
import { partiuWalletEngine } from '../finance/partiu-wallet';

export interface WhatsAppDispatchedRide {
  rideId: string;
  phoneNumber: string;
  passengerName: string;
  modalidade: 'POP' | 'MOTO' | 'PLUS';
  origin: string;
  destination: string;
  distanceKm: number;
  fareBrl: number;
  driverId: string;
  driverName: string;
  driverPhone: string;
  vehiclePlate: string;
  vehicleModel: string;
  driverRating: number;
  pixTxId: string;
  pixQrCodePayload: string;
  trackingUrl: string;
  status: 'PAGAMENTO_PENDENTE' | 'MOTORISTA_A_CAMINHO' | 'MOTORISTA_NO_LOCAL' | 'EM_VIAGEM' | 'CONCLUIDA' | 'CANCELADA';
  createdAt: number;
  etaArrivalMinutes: number;
}

export class WhatsAppDispatchEngine {
  private activeWhatsAppRides: Map<string, WhatsAppDispatchedRide> = new Map();

  /**
   * Executa o despacho da corrida, gera PIX instantâneo e URL de rastreamento
   */
  public dispatchRide(
    phoneNumber: string,
    passengerName: string,
    modalidade: 'POP' | 'MOTO' | 'PLUS',
    origin: string,
    destination: string,
    distanceKm: number,
    fareBrl: number
  ): WhatsAppDispatchedRide {
    const rideId = `WPP-RIDE-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Gera ordem PIX dinâmica através do pixEngine
    const pixOrder = pixEngine.createPixCashInOrder({
      payerId: phoneNumber,
      amountBrl: fareBrl,
      description: `Corrida PARTIU WhatsApp ${modalidade} - ${rideId}`
    });

    // Motoristas virtuais parceiros para alocação instantânea
    const mockDrivers = [
      { id: 'DRV-WPP-01', name: 'Leandro Silveira', phone: '+55 22 99881-2233', plate: 'KRP-4A12', model: 'Chevrolet Onix Prata', rating: 4.96 },
      { id: 'DRV-WPP-02', name: 'Tiago Bernardes', phone: '+55 22 99712-4455', plate: 'RIO-9B88', model: 'Honda CG 160 Vermelha', rating: 4.91 },
      { id: 'DRV-WPP-03', name: 'Cláudia Fontes', phone: '+55 22 99933-7788', plate: 'BRA-2C34', model: 'Toyota Yaris Sedan Branco', rating: 4.98 }
    ];

    const driverIndex = modalidade === 'MOTO' ? 1 : modalidade === 'PLUS' ? 2 : 0;
    const assignedDriver = mockDrivers[driverIndex]!;

    const trackingUrl = `https://partiu.app/live/${rideId}?auth=${Math.random().toString(36).substring(2, 10)}`;

    const ride: WhatsAppDispatchedRide = {
      rideId,
      phoneNumber,
      passengerName,
      modalidade,
      origin,
      destination,
      distanceKm,
      fareBrl,
      driverId: assignedDriver.id,
      driverName: assignedDriver.name,
      driverPhone: assignedDriver.phone,
      vehiclePlate: assignedDriver.plate,
      vehicleModel: assignedDriver.model,
      driverRating: assignedDriver.rating,
      pixTxId: pixOrder.orderId,
      pixQrCodePayload: pixOrder.qrCodePayload,
      trackingUrl,
      status: 'PAGAMENTO_PENDENTE',
      createdAt: Date.now(),
      etaArrivalMinutes: modalidade === 'MOTO' ? 2 : 4
    };

    this.activeWhatsAppRides.set(rideId, ride);
    return ride;
  }

  public getRide(rideId: string): WhatsAppDispatchedRide | undefined {
    return this.activeWhatsAppRides.get(rideId);
  }

  public confirmPayment(rideId: string): WhatsAppDispatchedRide | undefined {
    const ride = this.activeWhatsAppRides.get(rideId);
    if (!ride) return undefined;

    ride.status = 'MOTORISTA_A_CAMINHO';

    // Executa split atômico no ledger financeiro PARTIU Pay
    partiuWalletEngine.executeRideSplit({
      rideId: ride.rideId,
      driverId: ride.driverId,
      passengerId: ride.phoneNumber,
      totalAmountBrl: ride.fareBrl,
      cashbackPercent: 2.5,
      idempotencyKey: `WPP-${ride.rideId}`
    });

    return ride;
  }

  public completeRide(rideId: string): WhatsAppDispatchedRide | undefined {
    const ride = this.activeWhatsAppRides.get(rideId);
    if (!ride) return undefined;
    ride.status = 'CONCLUIDA';
    return ride;
  }

  public cancelRide(rideId: string): WhatsAppDispatchedRide | undefined {
    const ride = this.activeWhatsAppRides.get(rideId);
    if (!ride) return undefined;
    ride.status = 'CANCELADA';
    return ride;
  }
}

export const whatsAppDispatchEngine = new WhatsAppDispatchEngine();
