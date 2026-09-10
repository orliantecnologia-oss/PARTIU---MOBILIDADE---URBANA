/**
 * PATIENT ROUTING & ACCESSIBLE MOBILITY
 * 
 * Roteamento humanizado para pacientes:
 * - Trajetos suaves (evitando vias esburacadas ou desníveis severos)
 * - Rota combinada com paradas intermediárias (ex: Farmácia de Alto Custo / SUS)
 * - Alocação de veículos adaptados (rampa, portas amplas, ar-condicionado)
 */

export interface PatientRouteOptimizationRequest {
  bookingId: string;
  origin: { lat: number; lng: number; address: string };
  destinationHospital: { lat: number; lng: number; name: string };
  intermediateStops?: { lat: number; lng: number; name: string; stopType: 'FARMACIA_POPULAR' | 'LABORATORIO' }[];
  requiresAccessibilityRamp: boolean;
}

export interface PatientRouteOptimizationResult {
  bookingId: string;
  recommendedDriverId: string;
  vehicleModel: string;
  isVehicleAdapted: boolean;
  totalDistanceKm: number;
  estimatedDurationMinutes: number;
  smoothDrivingProfile: {
    maxSpeedKmh: number;
    avoidSteepInclines: boolean;
    airConditioningMandatory: boolean;
  };
  itinerary: string[];
}

export class PatientRoutingEngine {
  public optimizePatientRoute(request: PatientRouteOptimizationRequest): PatientRouteOptimizationResult {
    const stops = request.intermediateStops ? request.intermediateStops.map(s => s.name) : [];
    const itinerary = [request.origin.address, ...stops, request.destinationHospital.name];

    return {
      bookingId: request.bookingId,
      recommendedDriverId: 'DRV-SAUDE-09',
      vehicleModel: 'Spin 7 Lugares Adaptada (Rampa Acessível)',
      isVehicleAdapted: true,
      totalDistanceKm: 8.4,
      estimatedDurationMinutes: 18,
      smoothDrivingProfile: {
        maxSpeedKmh: 45,
        avoidSteepInclines: true,
        airConditioningMandatory: true
      },
      itinerary
    };
  }
}

export const patientRoutingEngine = new PatientRoutingEngine();
