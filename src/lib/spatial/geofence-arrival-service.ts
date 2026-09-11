/**
 * ==============================================================================
 * 🛰️ PARTIU SPATIAL ENGINE — GEOFENCE ARRIVAL SERVICE (v1.0)
 * ==============================================================================
 * Detecção automática de chegada do condutor ao ponto de embarque (Pick-up)
 * ou ponto de entrega (< 50 metros), padrão Uber e 99.
 *
 * Elimina a necessidade de o motorista tirar as mãos do volante para clicar
 * manualmente em "Cheguei ao Local", disparando notificação e áudio ao passageiro.
 * ==============================================================================
 */

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface GeofenceCheckResult {
  isWithinThreshold: boolean;
  distanceMeters: number;
  thresholdMeters: number;
}

export class GeofenceArrivalService {
  private static instance: GeofenceArrivalService;
  private triggeredRides: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): GeofenceArrivalService {
    if (!GeofenceArrivalService.instance) {
      GeofenceArrivalService.instance = new GeofenceArrivalService();
    }
    return GeofenceArrivalService.instance;
  }

  /**
   * Calcula a distância geodésica em metros (Haversine) entre dois pontos
   */
  public calculateDistanceMeters(a: LatLngPoint, b: LatLngPoint): number {
    const R = 6371000; // Raio da Terra em metros
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;

    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);

    const x =
      sinDLat * sinDLat +
      Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

    return Math.round(R * c);
  }

  /**
   * Avalia se a localização atual do motorista cruzou o limiar de proximidade
   */
  public checkArrival(
    driverLoc: LatLngPoint,
    targetLoc: LatLngPoint,
    thresholdMeters = 50
  ): GeofenceCheckResult {
    const distanceMeters = this.calculateDistanceMeters(driverLoc, targetLoc);
    return {
      isWithinThreshold: distanceMeters <= thresholdMeters,
      distanceMeters,
      thresholdMeters,
    };
  }

  /**
   * Verifica e consome o evento de chegada para uma corrida (garante acionamento único)
   */
  public shouldTriggerArrival(
    rideId: string,
    driverLoc: LatLngPoint,
    targetLoc: LatLngPoint,
    thresholdMeters = 50
  ): boolean {
    if (this.triggeredRides.has(rideId)) {
      return false; // Já acionado anteriormente
    }

    const { isWithinThreshold } = this.checkArrival(driverLoc, targetLoc, thresholdMeters);
    if (isWithinThreshold) {
      this.triggeredRides.add(rideId);
      return true;
    }

    return false;
  }

  /**
   * Limpa o estado de uma corrida concluída ou cancelada
   */
  public clearRide(rideId: string): void {
    this.triggeredRides.delete(rideId);
  }

  /**
   * Reseta o histórico (útil para testes unitários)
   */
  public reset(): void {
    this.triggeredRides.clear();
  }
}

export const geofenceArrivalService = GeofenceArrivalService.getInstance();
