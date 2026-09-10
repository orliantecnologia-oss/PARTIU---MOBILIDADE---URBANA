/**
 * ==============================================================================
 * 📦 PARTIU DRIVER OS — DRIVER OFFER ENGINE (v1.0)
 * ==============================================================================
 * Entidade e ciclo de vida formal da oferta de corrida/entrega para o condutor:
 * - TTL estrito de 15 segundos (contagem regressiva no Trip Radar)
 * - Transparência total (Origem, Destino, Distância, Duração, Ganho Líquido, Ganho/km)
 * - Validação de expiração server-authoritative (expiresAt < now)
 * - Resolução atômica de concorrência com idempotência
 * ==============================================================================
 */

import { atomicMatchingEngine } from "../dispatch-atomic/atomic-matching";
import { MOTORISTA_PADRAO, type CorridaPartiu, type MotoristaInfo } from "../partiu-engine";
import { commissionEngine } from "../revenue/commission-engine";
import { subscriptionEngine } from "../revenue/subscription-engine";
import { driverWalletEngine } from "../revenue/driver-wallet";

export type DriverOfferStatus =
  | "CREATED"
  | "SENT"
  | "VIEWED"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED"
  | "SUPERSEDED";

export interface DriverOffer {
  id: string;
  rideId: string;
  driverId: string;
  status: DriverOfferStatus;
  createdAt: number;
  expiresAt: number;
  pickupAddress: string;
  pickupCoords?: { lat: number; lng: number } | undefined;
  destinationAddress: string;
  destinationCoords?: { lat: number; lng: number } | undefined;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  grossFare: number;
  driverEarnings: number;
  platformFee: number;
  platformCommissionPercent: number;
  planName: string;
  protectionContribution?: number | undefined;
  savingsVersusUber: number;
  farePerKm: number;
  category: string;
  passengerName: string;
  passengerRating: number;
  passengerTotalRides: number;
  passengerTrustScore: number;
  passengerTrustTier: string;
  idempotencyKey: string;
  isEntrega?: boolean | undefined;
  destinatarioNome?: string | undefined;
  destinatarioTelefone?: string | undefined;
  descricaoPacote?: string | undefined;
  pickupOtp?: string | undefined;
  deliveryOtp?: string | undefined;
}

export interface AcceptOfferResult {
  success: boolean;
  offer?: DriverOffer | undefined;
  assignedRideId?: string | undefined;
  error?: "OFFER_NOT_FOUND" | "OFFER_EXPIRED" | "ALREADY_CLAIMED" | "INVALID_STATUS" | undefined;
  message: string;
  fencingToken?: number | undefined;
}

export class DriverOfferEngine {
  private static instance: DriverOfferEngine;
  private offers: Map<string, DriverOffer> = new Map();
  private processedIdempotencies: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): DriverOfferEngine {
    if (!DriverOfferEngine.instance) {
      DriverOfferEngine.instance = new DriverOfferEngine();
    }
    return DriverOfferEngine.instance;
  }

  /**
   * Converte uma solicitação de corrida em uma oferta formal para o condutor
   */
  public createOffer(params: {
    ride: CorridaPartiu;
    driverId: string;
    ttlSeconds?: number | undefined;
  }): DriverOffer {
    const ttl = (params.ttlSeconds || 15) * 1000;
    const now = Date.now();
    const offerId = `OFF-${now}-${Math.floor(100 + Math.random() * 900)}`;

    // Consulta plano ativo do condutor e saldo do fundo de proteção
    const sub = subscriptionEngine.getDriverSubscription(params.driverId);
    const plan = subscriptionEngine.getPlanById(sub.planId);
    const wallet = driverWalletEngine.getWallet(params.driverId);

    const settlement = commissionEngine.calculateRideSplit({
      rideId: params.ride.id,
      driverId: params.driverId,
      grossFareBrl: params.ride.valor,
      plan: plan
        ? {
            planId: plan.id,
            planName: plan.name,
            commissionPercent: plan.commissionPercent,
            monthlyFeeBrl: plan.monthlyFeeBrl,
          }
        : undefined,
      currentProtectionBalanceCents: wallet.protectionFundBalanceCents,
    });

    const driverEarnings = settlement.driverNetEarningsBrl;
    const farePerKm = params.ride.distanciaKm > 0
      ? Number((driverEarnings / params.ride.distanciaKm).toFixed(2))
      : 0;

    const offer: DriverOffer = {
      id: offerId,
      rideId: params.ride.id,
      driverId: params.driverId,
      status: "SENT",
      createdAt: now,
      expiresAt: now + ttl,
      pickupAddress: params.ride.origem,
      destinationAddress: params.ride.destino,
      estimatedDistanceKm: params.ride.distanciaKm,
      estimatedDurationMin: params.ride.duracaoMin,
      grossFare: settlement.grossFareBrl,
      driverEarnings,
      platformFee: settlement.totalPlatformDeductionBrl,
      platformCommissionPercent: settlement.commissionPercent,
      planName: settlement.planName,
      protectionContribution: settlement.protectionFundContributionBrl,
      savingsVersusUber: settlement.savingsVersusCompetitorBrl,
      farePerKm,
      category: params.ride.modalidade,
      passengerName: params.ride.passageiroNome,
      passengerRating: (params.ride as any).passageiroAvaliacao ?? 4.97,
      passengerTotalRides: (params.ride as any).passageiroTotalCorridas ?? 42,
      passengerTrustScore: (params.ride as any).passageiroTrustScore ?? 88,
      passengerTrustTier: (params.ride as any).passageiroTrustTier ?? "PREMIUM",
      idempotencyKey: `IDEM-ACCEPT-${offerId}`,
      isEntrega: params.ride.isEntrega,
      destinatarioNome: params.ride.destinatarioNome,
      destinatarioTelefone: params.ride.destinatarioTelefone,
      descricaoPacote: params.ride.descricaoPacote,
      pickupOtp: params.ride.pin,
      deliveryOtp: params.ride.pin,
    };

    this.offers.set(offerId, offer);
    return offer;
  }

  /**
   * Aceita uma oferta com validação de expiração e bloqueio de concorrência
   */
  public async acceptOffer(
    offerId: string,
    driverId: string,
    idempotencyKey: string,
    motoristaInfo: MotoristaInfo = MOTORISTA_PADRAO
  ): Promise<AcceptOfferResult> {
    // 1. Proteção de Idempotência
    if (this.processedIdempotencies.has(idempotencyKey)) {
      const existing = this.offers.get(offerId);
      return {
        success: true,
        offer: existing,
        assignedRideId: existing?.rideId,
        message: "Oferta já aceita anteriormente com chave de idempotência válida.",
      };
    }

    const offer = this.offers.get(offerId);
    if (!offer) {
      return {
        success: false,
        error: "OFFER_NOT_FOUND",
        message: "Oferta de corrida não localizada no radar.",
      };
    }

    // 2. Validação estrita de Timeout (TTL)
    const now = Date.now();
    if (now > offer.expiresAt || offer.status === "EXPIRED") {
      offer.status = "EXPIRED";
      return {
        success: false,
        error: "OFFER_EXPIRED",
        message: "Tempo para aceitar a oferta expirou.",
      };
    }

    if (offer.status !== "SENT" && offer.status !== "VIEWED") {
      return {
        success: false,
        error: "INVALID_STATUS",
        message: `A oferta está no status [${offer.status}] e não pode ser aceita.`,
      };
    }

    // 3. Reivindicação Atômica com Fencing Token (Lock Concorrente)
    const claimResult = await atomicMatchingEngine.claimRideAtomic(
      {
        id: offer.rideId,
        modalidade: offer.category as any,
        origem: offer.pickupAddress,
        destino: offer.destinationAddress,
        passageiroNome: offer.passengerName,
        passageiroTelefone: "(22) 99999-0000",
        valor: offer.grossFare,
        distanciaKm: offer.estimatedDistanceKm,
        duracaoMin: offer.estimatedDurationMin,
        formaPagamento: "pix",
        pin: offer.pickupOtp || "4829",
        status: "PROCURANDO",
        criadoEm: offer.createdAt,
      },
      motoristaInfo
    );

    if (!claimResult.success) {
      offer.status = "SUPERSEDED";
      return {
        success: false,
        error: "ALREADY_CLAIMED",
        message: "Outro motorista parceiro aceitou esta chamada frações de segundo antes.",
      };
    }

    // 4. Marca oferta como ACEITA
    offer.status = "ACCEPTED";
    this.processedIdempotencies.add(idempotencyKey);

    return {
      success: true,
      offer,
      assignedRideId: offer.rideId,
      fencingToken: claimResult.fencingToken,
      message: "Corrida aceita com sucesso!",
    };
  }

  /**
   * Atalho para reivindicar/aceitar oferta
   */
  public async claimOffer(
    offerId: string,
    driverId: string,
    idempotencyKey?: string | undefined,
    motoristaInfo?: MotoristaInfo | undefined
  ): Promise<AcceptOfferResult> {
    return this.acceptOffer(
      offerId,
      driverId,
      idempotencyKey || `IDEM-CLAIM-${offerId}-${driverId}`,
      motoristaInfo || MOTORISTA_PADRAO
    );
  }

  /**
   * Recusa explicitamente uma oferta
   */
  public rejectOffer(
    offerId: string,
    driverId?: string | undefined,
    reason?: string | undefined
  ): void {
    const offer = this.offers.get(offerId);
    if (offer) {
      offer.status = "REJECTED";
    }
  }

  /**
   * Cancela ou expira uma oferta
   */
  public expireOffer(offerId: string): void {
    const offer = this.offers.get(offerId);
    if (offer) {
      offer.status = "EXPIRED";
    }
  }

  public getOffer(offerId: string): DriverOffer | undefined {
    return this.offers.get(offerId);
  }

  public getActiveOfferForDriver(driverId: string): DriverOffer | null {
    const now = Date.now();
    for (const offer of this.offers.values()) {
      if (offer.driverId === driverId && (offer.status === "SENT" || offer.status === "VIEWED")) {
        if (offer.expiresAt > now) {
          return offer;
        } else {
          offer.status = "EXPIRED";
        }
      }
    }
    return null;
  }
}

export const driverOfferEngine = DriverOfferEngine.getInstance();
