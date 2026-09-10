/**
 * ==============================================================================
 * 🔄 PARTIU DELIVERY OS — RETURN & REVERSE LOGISTICS ENGINE (v1.0)
 * ==============================================================================
 * Gerenciamento do protocolo de "Destinatário Não Localizado", tolerância de
 * espera obrigatória (5 minutos), registro de tentativas de contato e rota reversa
 * de devolução do pacote ao remetente com tarifação e compensação do condutor.
 * Padrão operacional 99Entrega.
 * ==============================================================================
 */

import { DeliveryContact, ReturnDetails } from "./delivery-domain";
import { deliveryStateMachine } from "./delivery-state-machine";
import { deliveryMultiStopEngine } from "./delivery-multistop-engine";
import { deliveryPinEngine } from "./delivery-pin-engine";
import { deliveryProofEngine } from "./delivery-proof-engine";

export interface RecipientWaitStatus {
  deliveryId: string;
  stopId: string;
  startedAt: number;
  elapsedSeconds: number;
  gracePeriodSeconds: number;
  canInitiateReturn: boolean;
  contactAttempts: {
    channel: "CALL" | "MESSAGE" | "BUZZER";
    timestamp: number;
  }[];
}

const DEFAULT_RETURN_GRACE_SECONDS = 300; // 5 minutos de espera no local de entrega
const BASE_RETURN_FEE_BRL = 9.5; // Taxa base de retorno ao remetente

export class DeliveryReturnEngine {
  private waitSessions = new Map<string, RecipientWaitStatus>();
  private returnSessions = new Map<string, ReturnDetails>();

  /**
   * Inicia o cronômetro de espera no destino quando o destinatário não atende
   */
  public startRecipientWait(
    deliveryId: string,
    stopId: string,
    gracePeriodSeconds: number = DEFAULT_RETURN_GRACE_SECONDS
  ): RecipientWaitStatus {
    const session: RecipientWaitStatus = {
      deliveryId,
      stopId,
      startedAt: Date.now(),
      elapsedSeconds: 0,
      gracePeriodSeconds,
      canInitiateReturn: false,
      contactAttempts: [],
    };

    this.waitSessions.set(deliveryId, session);
    return session;
  }

  /**
   * Registra uma tentativa comprovada de contato com o destinatário
   */
  public recordContactAttempt(
    deliveryId: string,
    channel: "CALL" | "MESSAGE" | "BUZZER"
  ): RecipientWaitStatus | null {
    const session = this.waitSessions.get(deliveryId);
    if (!session) return null;

    session.contactAttempts.push({
      channel,
      timestamp: Date.now(),
    });

    return this.updateWaitStatus(deliveryId);
  }

  /**
   * Atualiza o status do tempo de espera no destino
   */
  public updateWaitStatus(deliveryId: string): RecipientWaitStatus | null {
    const session = this.waitSessions.get(deliveryId);
    if (!session) return null;

    const now = Date.now();
    session.elapsedSeconds = Math.max(0, Math.floor((now - session.startedAt) / 1000));

    // Para liberar devolução, o condutor deve ter aguardado a carência e tentado contato
    session.canInitiateReturn =
      session.elapsedSeconds >= session.gracePeriodSeconds &&
      session.contactAttempts.length > 0;

    return session;
  }

  /**
   * Calcula a taxa de devolução ao remetente com base na comissão do plano do entregador (0% Ouro a 5% Free)
   */
  public calculateReturnFee(distanceKm: number, courierCommissionPercent: number = 5.0): {
    totalFeeBrl: number;
    driverCompensationBrl: number;
  } {
    const returnDistanceFare = distanceKm * 2.2;
    const totalFeeBrl = Number((BASE_RETURN_FEE_BRL + returnDistanceFare).toFixed(2));
    const driverPayoutRatio = (100 - courierCommissionPercent) / 100;
    const driverCompensationBrl = Number((totalFeeBrl * driverPayoutRatio).toFixed(2));

    return { totalFeeBrl, driverCompensationBrl };
  }

  /**
   * Inicia a operação formal de devolução (Logística Reversa)
   */
  public initiateReturn(params: {
    deliveryId: string;
    stopId: string;
    reason: "RECIPIENT_ABSENT" | "WRONG_ADDRESS" | "PACKAGE_REJECTED" | "SECURITY_CONCERN";
    senderContact: DeliveryContact;
    pickupAddress: string;
    distanceKm: number;
    notes?: string | undefined;
  }): { success: boolean; returnDetails: ReturnDetails; message: string } {
    const wait = this.waitSessions.get(params.deliveryId);
    if (wait && !wait.canInitiateReturn && params.reason === "RECIPIENT_ABSENT") {
      const waitRemaining = Math.max(0, wait.gracePeriodSeconds - wait.elapsedSeconds);
      if (waitRemaining > 0) {
        throw new Error(
          `Aguarde o término da tolerância obrigatória de espera (${waitRemaining}s restantes) antes de iniciar a devolução.`
        );
      }
    }

    const { totalFeeBrl, driverCompensationBrl } = this.calculateReturnFee(params.distanceKm);
    const returnOtp = deliveryPinEngine.generateOtp();

    const returnDetails: ReturnDetails = {
      reason: params.reason,
      startedAt: Date.now(),
      returnFeeBrl: totalFeeBrl,
      driverReturnCompensationBrl: driverCompensationBrl,
      returnOtpExpected: returnOtp,
      returnOtpVerified: false,
      notes: params.notes,
    };

    this.returnSessions.set(params.deliveryId, returnDetails);

    // Registra parada reversa no multi-stop engine
    deliveryMultiStopEngine.appendReturnStop(
      params.deliveryId,
      params.pickupAddress,
      params.senderContact,
      returnOtp
    );

    // Transiciona máquina de estados
    deliveryStateMachine.transition(
      params.deliveryId,
      "RETURN_REQUIRED",
      "DRIVER",
      `Devolução iniciada pelo condutor. Motivo: ${params.reason}`
    );
    deliveryStateMachine.transition(
      params.deliveryId,
      "RETURNING_TO_PICKUP",
      "DRIVER",
      "Condutor em deslocamento de retorno ao ponto de coleta"
    );

    return {
      success: true,
      returnDetails,
      message: "Devolução ao remetente autorizada. Desloque-se de volta ao local de coleta.",
    };
  }

  /**
   * Finaliza a devolução com PIN do remetente e comprovante fotográfico
   */
  public completeReturn(params: {
    deliveryId: string;
    returnOtp: string;
    photoUrl: string;
    driverId: string;
    latitude: number;
    longitude: number;
  }): { success: boolean; message: string } {
    const session = this.returnSessions.get(params.deliveryId);
    if (!session) {
      throw new Error("Nenhuma sessão de devolução ativa para esta entrega.");
    }

    // 1. Valida PIN do remetente
    const pinRes = deliveryPinEngine.verifyOtp(
      `RETURN-${params.deliveryId}`,
      params.returnOtp,
      session.returnOtpExpected
    );

    if (!pinRes.success) {
      return { success: false, message: pinRes.message };
    }

    session.returnOtpVerified = true;

    // 2. Registra foto de comprovação da devolução
    deliveryProofEngine.registerProof({
      deliveryId: params.deliveryId,
      stopId: `RETURN-${params.deliveryId}`,
      type: "RETURN",
      photoUrl: params.photoUrl,
      latitude: params.latitude,
      longitude: params.longitude,
      capturedByDriverId: params.driverId,
      metadata: { reason: session.reason, returnFeeBrl: session.returnFeeBrl },
    });

    session.returnProofPhotoUrl = params.photoUrl;
    session.completedAt = Date.now();

    // 3. Transiciona máquina de estados para RETURNED -> COMPLETED
    deliveryStateMachine.transition(
      params.deliveryId,
      "RETURNED",
      "DRIVER",
      "Pacote entregue de volta ao remetente com validação de PIN e foto"
    );
    deliveryStateMachine.transition(
      params.deliveryId,
      "COMPLETED",
      "SYSTEM",
      "Ciclo de devolução finalizado e liquidado"
    );

    return {
      success: true,
      message: "Devolução concluída com sucesso! Taxa de retorno creditada ao condutor.",
    };
  }

  /**
   * Obtém os detalhes de devolução de uma entrega
   */
  public getReturnDetails(deliveryId: string): ReturnDetails | undefined {
    return this.returnSessions.get(deliveryId);
  }
}

export const deliveryReturnEngine = new DeliveryReturnEngine();
