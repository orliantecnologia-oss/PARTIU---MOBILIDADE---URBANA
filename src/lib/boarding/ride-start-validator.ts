/**
 * SMART PASSENGER BOARDING ENGINE — RIDE START VALIDATOR
 * 
 * Validador anti-fraude para autorização de início de viagem.
 * Previne corridas fantasmas (ghost rides), início prematuro e desvios de geofence.
 */

export interface RideCoordinates {
  lat: number;
  lng: number;
}

export interface RideValidationInput {
  rideId: string;
  currentStatus: string;
  driverLocation?: RideCoordinates | undefined;
  pickupLocation?: RideCoordinates | undefined;
  arrivedAtTimestamp?: number | undefined;
  maxGeofenceMeters?: number | undefined; // Padrão: 250m
  isManualOverride?: boolean | undefined;
}

export interface RideStartTelemetry {
  rideId: string;
  timestamp: number;
  distanceToPickupMeters: number | null;
  geofencePassed: boolean;
  statusValid: boolean;
  dwellTimeSeconds: number;
  fraudFlags: string[];
  isApproved: boolean;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
}

export class RideStartValidator {
  /**
   * Distância Haversine em metros entre duas coordenadas geográficas
   */
  public calculateDistanceMeters(coord1: RideCoordinates, coord2: RideCoordinates): number {
    const R = 6371000; // Raio da Terra em metros
    const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
    const dLon = ((coord2.lng - coord1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coord1.lat * Math.PI) / 180) *
        Math.cos((coord2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  /**
   * Valida se uma corrida pode ser iniciada com segurança
   */
  public validateRideStart(input: RideValidationInput): RideStartTelemetry {
    const fraudFlags: string[] = [];
    const now = Date.now();
    const maxGeofence = input.maxGeofenceMeters || 250;

    // 1. Verificação de Status da Corrida
    // Apenas status CHEGOU (ou WAITING_PIN) permite início imediato
    const validStatuses = ['CHEGOU', 'WAITING_PIN', 'AGUARDANDO_EMBARQUE'];
    const statusValid = validStatuses.includes(input.currentStatus);

    if (!statusValid) {
      fraudFlags.push('STATUS_INVALIDO_PARA_INICIO');
    }

    // 2. Verificação de Dwell Time (Tempo de permanência no local)
    let dwellTimeSeconds = 0;
    if (input.arrivedAtTimestamp) {
      dwellTimeSeconds = Math.max(0, Math.floor((now - input.arrivedAtTimestamp) / 1000));
    }

    // 3. Verificação de Geofence (Anti-Ghost Ride)
    let distanceToPickupMeters: number | null = null;
    let geofencePassed = true;

    if (input.driverLocation && input.pickupLocation) {
      distanceToPickupMeters = this.calculateDistanceMeters(input.driverLocation, input.pickupLocation);

      if (distanceToPickupMeters > maxGeofence) {
        if (input.isManualOverride) {
          fraudFlags.push('GEOFENCE_OVERRIDE_GPS_DRIFT');
          geofencePassed = true;
        } else {
          fraudFlags.push('GEOFENCE_EXCEEDED');
          geofencePassed = false;
        }
      }
    }

    // 4. Decisão de Aprovação
    const isApproved = statusValid && geofencePassed;
    let errorCode: string | undefined;
    let errorMessage: string | undefined;

    if (!isApproved) {
      if (!statusValid) {
        errorCode = 'ERR_RIDE_NOT_ARRIVED';
        errorMessage = 'O motorista deve confirmar a chegada ao local antes de iniciar a viagem.';
      } else if (!geofencePassed) {
        errorCode = 'ERR_GEOFENCE_OUT_OF_BOUNDS';
        errorMessage = `Distância do ponto de embarque (${distanceToPickupMeters}m) excede a cerca eletrônica (${maxGeofence}m).`;
      }
    }

    return {
      rideId: input.rideId,
      timestamp: now,
      distanceToPickupMeters,
      geofencePassed,
      statusValid,
      dwellTimeSeconds,
      fraudFlags,
      isApproved,
      errorCode,
      errorMessage,
    };
  }
}

export const rideStartValidator = new RideStartValidator();
