/**
 * SMART PASSENGER BOARDING ENGINE — ORCHESTRATOR
 * 
 * Motor central de embarque inteligente sem dependência de PIN obrigatório.
 * Modelo profissional centrado no motorista (Uber / 99), com verificação de identidade,
 * geofence anti-fraude e integração ao Passenger Trust Score.
 */

import {
  PassengerVerificationResult,
  passengerVerificationEngine,
  PassengerIdentityInput,
} from './passenger-verification';
import {
  BoardingChecklistState,
  boardingChecklistEngine,
} from './boarding-checklist';
import {
  RideStartTelemetry,
  rideStartValidator,
  RideCoordinates,
} from './ride-start-validator';
import {
  TrustBoardingPolicy,
  trustAssistedBoardingEngine,
} from './trust-assisted-boarding';

export interface BoardingAuditRecord {
  id: string;
  rideId: string;
  driverId: string;
  passengerId: string;
  timestamp: number;
  boardingMethod: 'ONE_TAP_SMART' | 'ASSISTED_TRUST' | 'OPTIONAL_PIN';
  trustScore: number;
  trustTier: string;
  riskLevel: string;
  distanceToPickupMeters: number | null;
  geofencePassed: boolean;
  statusBefore: string;
  statusAfter: string;
  fraudFlags: string[];
}

export interface BoardingSession {
  rideId: string;
  passengerVerification: PassengerVerificationResult;
  boardingPolicy: TrustBoardingPolicy;
  checklistState: BoardingChecklistState;
  isReadyForOneTapStart: boolean;
  pinFallbackAllowed: boolean;
  pinFallbackValue: string;
}

export interface ConfirmBoardingInput {
  rideId: string;
  driverId: string;
  passengerId: string;
  currentRideStatus: string;
  driverLocation?: RideCoordinates | undefined;
  pickupLocation?: RideCoordinates | undefined;
  arrivedAtTimestamp?: number | undefined;
  isManualOverride?: boolean | undefined;
  pinProvided?: string | undefined;
  expectedPin?: string | undefined;
  passengerInput?: Partial<PassengerIdentityInput> | undefined;
}

export interface BoardingConfirmationResult {
  success: boolean;
  rideId: string;
  status: 'EM_VIAGEM' | 'CHEGOU' | 'CANCELADA';
  message: string;
  telemetry: RideStartTelemetry;
  auditRecord?: BoardingAuditRecord | undefined;
}

export class SmartPassengerBoardingEngine {
  private auditLogs: BoardingAuditRecord[] = [];
  private pinAttempts: Map<string, { count: number; lockedUntil: number }> = new Map();

  /**
   * Verifica se o PIN está bloqueado por excesso de tentativas
   */
  public getPinLockStatus(rideId: string): { isLocked: boolean; remainingSeconds: number; attempts: number } {
    const record = this.pinAttempts.get(rideId);
    if (!record) return { isLocked: false, remainingSeconds: 0, attempts: 0 };
    const now = Date.now();
    if (record.lockedUntil > now) {
      return {
        isLocked: true,
        remainingSeconds: Math.ceil((record.lockedUntil - now) / 1000),
        attempts: record.count,
      };
    }
    return { isLocked: false, remainingSeconds: 0, attempts: record.count };
  }

  /**
   * Prepara uma sessão de embarque ativa para o cockpit do motorista
   */
  public prepareBoardingSession(
    rideId: string,
    passengerName: string,
    passengerPhone?: string | undefined,
    pin?: string | undefined,
    passengerDetails?: Partial<PassengerIdentityInput> | undefined,
    driverLocation?: RideCoordinates | undefined,
    pickupLocation?: RideCoordinates | undefined
  ): BoardingSession {
    const passengerId = passengerDetails?.passengerId || `pass-${rideId}`;

    // 1. Verificação de Identidade e Risco
    const verification = passengerVerificationEngine.verifyPassenger({
      passengerId,
      name: passengerName,
      cpfVerified: passengerDetails?.cpfVerified ?? true,
      rating: passengerDetails?.rating ?? 4.96,
      totalCompletedRides: passengerDetails?.totalCompletedRides ?? 48,
      accountAgeDays: passengerDetails?.accountAgeDays ?? 240,
      trustScore: passengerDetails?.trustScore ?? 88,
      trustTier: passengerDetails?.trustTier ?? 'PREMIUM',
      photoUrl: passengerDetails?.photoUrl,
      severeReportsCount: passengerDetails?.severeReportsCount ?? 0,
      cancellationRate: passengerDetails?.cancellationRate ?? 0.02,
    });

    // 2. Diretriz de Confiança
    const policy = trustAssistedBoardingEngine.getPolicy(
      verification.trustTier,
      verification.trustScore
    );

    // 3. Checklist de Embarque
    const checklist = boardingChecklistEngine.initializeChecklist(
      rideId,
      passengerId,
      verification.riskLevel,
      verification.trustTier
    );

    // 4. Validação Prévia de Geofence se localizações forem fornecidas
    let geofenceOk = true;
    if (driverLocation && pickupLocation) {
      const dist = rideStartValidator.calculateDistanceMeters(driverLocation, pickupLocation);
      if (dist > 300) geofenceOk = false;
    }

    const isReadyForOneTapStart =
      policy.allowOneTapStart &&
      verification.canOneTapBoard &&
      checklist.isReadyToStart &&
      geofenceOk;

    return {
      rideId,
      passengerVerification: verification,
      boardingPolicy: policy,
      checklistState: checklist,
      isReadyForOneTapStart,
      pinFallbackAllowed: true, // Sempre disponível como opção secundária
      pinFallbackValue: pin || '4829',
    };
  }

  /**
   * Confirma o embarque do passageiro e autoriza a transição imediata para EM_VIAGEM
   * Sem bloqueio de PIN obrigatório
   */
  public confirmBoardingAndStartTrip(input: ConfirmBoardingInput): BoardingConfirmationResult {
    // 1. Validação de Regras Anti-Fraude e Status
    const telemetry = rideStartValidator.validateRideStart({
      rideId: input.rideId,
      currentStatus: input.currentRideStatus,
      driverLocation: input.driverLocation,
      pickupLocation: input.pickupLocation,
      arrivedAtTimestamp: input.arrivedAtTimestamp,
      isManualOverride: input.isManualOverride,
    });

    if (!telemetry.isApproved) {
      return {
        success: false,
        rideId: input.rideId,
        status: 'CHEGOU',
        message: telemetry.errorMessage || 'Condições de segurança não atendidas para início da viagem.',
        telemetry,
      };
    }

    // 2. Avaliação de Perfil de Confiança
    const verification = passengerVerificationEngine.verifyPassenger({
      passengerId: input.passengerId,
      name: input.passengerInput?.name || 'Passageiro',
      cpfVerified: input.passengerInput?.cpfVerified ?? true,
      rating: input.passengerInput?.rating ?? 4.95,
      totalCompletedRides: input.passengerInput?.totalCompletedRides ?? 32,
      accountAgeDays: input.passengerInput?.accountAgeDays ?? 180,
      trustScore: input.passengerInput?.trustScore ?? 85,
      trustTier: input.passengerInput?.trustTier ?? 'PREMIUM',
    });

    if (verification.riskLevel === 'BLOCKED') {
      return {
        success: false,
        rideId: input.rideId,
        status: 'CHEGOU',
        message: 'Passageiro com restrição severa de segurança. Embarque não autorizado.',
        telemetry: {
          ...telemetry,
          isApproved: false,
          errorCode: 'ERR_PASSENGER_BLOCKED',
          errorMessage: 'Passageiro bloqueado por diretriz de segurança.',
        },
      };
    }

    // 3. Método de Embarque Utilizado & Proteção Anti-Brute-Force
    let method: BoardingAuditRecord['boardingMethod'] = 'ONE_TAP_SMART';
    if (input.pinProvided && input.expectedPin) {
      method = 'OPTIONAL_PIN';

      // 3.1 Verifica bloqueio por tentativas excedidas
      const lockStatus = this.getPinLockStatus(input.rideId);
      if (lockStatus.isLocked) {
        return {
          success: false,
          rideId: input.rideId,
          status: 'CHEGOU',
          message: `PIN temporariamente bloqueado por ${Math.ceil(lockStatus.remainingSeconds / 60)} min devido a 3 tentativas incorretas.`,
          telemetry: {
            ...telemetry,
            isApproved: false,
            errorCode: 'ERR_PIN_LOCKED',
            errorMessage: 'PIN temporariamente bloqueado.',
          },
        };
      }

      // 3.2 Validação do PIN
      if (input.pinProvided.trim() !== input.expectedPin.trim()) {
        const prevRecord = this.pinAttempts.get(input.rideId) || { count: 0, lockedUntil: 0 };
        const newCount = prevRecord.count + 1;
        const lockedUntil = newCount >= 3 ? Date.now() + 15 * 60 * 1000 : 0;
        this.pinAttempts.set(input.rideId, { count: newCount, lockedUntil });

        const msg = newCount >= 3
          ? 'PIN incorreto pela 3ª vez! O embarque por PIN foi temporariamente bloqueado por 15 minutos.'
          : `PIN incorreto! Tentativa ${newCount} de 3.`;

        return {
          success: false,
          rideId: input.rideId,
          status: 'CHEGOU',
          message: msg,
          telemetry: {
            ...telemetry,
            isApproved: false,
            errorCode: 'ERR_INVALID_PIN',
            errorMessage: msg,
          },
        };
      }

      // 3.3 Sucesso no PIN: Reseta tentativas
      this.pinAttempts.delete(input.rideId);
    } else if (verification.trustTier === 'ELITE' || verification.trustTier === 'PREMIUM') {
      method = 'ASSISTED_TRUST';
    }

    // 4. Criação do Registro Forense de Auditoria
    const auditRecord: BoardingAuditRecord = {
      id: `BRD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      rideId: input.rideId,
      driverId: input.driverId,
      passengerId: input.passengerId,
      timestamp: Date.now(),
      boardingMethod: method,
      trustScore: verification.trustScore,
      trustTier: verification.trustTier,
      riskLevel: verification.riskLevel,
      distanceToPickupMeters: telemetry.distanceToPickupMeters,
      geofencePassed: telemetry.geofencePassed,
      statusBefore: input.currentRideStatus,
      statusAfter: 'EM_VIAGEM',
      fraudFlags: telemetry.fraudFlags,
    };

    this.auditLogs.push(auditRecord);

    // 5. Emitir evento distribuído no navegador se disponível
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('partiu:boarding-confirmed', {
          detail: auditRecord,
        })
      );
    }

    return {
      success: true,
      rideId: input.rideId,
      status: 'EM_VIAGEM',
      message: 'Embarque confirmado com sucesso! Viagem iniciada.',
      telemetry,
      auditRecord,
    };
  }

  /**
   * Valida o PIN fornecido contra o esperado, aplicando rate limiting anti-brute-force
   */
  public validatePin(
    rideId: string,
    pinProvided: string,
    expectedPin: string
  ): { success: boolean; isLockedOut: boolean; attemptsRemaining: number; message: string } {
    const lockStatus = this.getPinLockStatus(rideId);
    if (lockStatus.isLocked) {
      return {
        success: false,
        isLockedOut: true,
        attemptsRemaining: 0,
        message: `PIN temporariamente bloqueado por ${Math.ceil(lockStatus.remainingSeconds / 60)} min após 3 tentativas incorretas.`,
      };
    }

    if (pinProvided.trim() !== expectedPin.trim()) {
      const prevRecord = this.pinAttempts.get(rideId) || { count: 0, lockedUntil: 0 };
      const newCount = prevRecord.count + 1;
      const lockedUntil = newCount >= 3 ? Date.now() + 15 * 60 * 1000 : 0;
      this.pinAttempts.set(rideId, { count: newCount, lockedUntil });

      const isLockedOut = newCount >= 3;
      const remaining = Math.max(0, 3 - newCount);
      const message = isLockedOut
        ? 'PIN incorreto pela 3ª vez! O embarque foi temporariamente bloqueado por 15 minutos.'
        : `PIN incorreto! Tentativa ${newCount} de 3. Restam ${remaining} tentativas.`;

      return {
        success: false,
        isLockedOut,
        attemptsRemaining: remaining,
        message,
      };
    }

    // Sucesso: reseta tentativas
    this.pinAttempts.delete(rideId);
    return {
      success: true,
      isLockedOut: false,
      attemptsRemaining: 3,
      message: 'PIN validado com sucesso!',
    };
  }
}

export const smartPassengerBoardingEngine = new SmartPassengerBoardingEngine();

export function validateRidePinWithLockout(
  rideId: string,
  pinProvided: string,
  expectedPin: string
): { success: boolean; isLockedOut: boolean; attemptsRemaining: number; message: string } {
  return smartPassengerBoardingEngine.validatePin(rideId, pinProvided, expectedPin);
}
