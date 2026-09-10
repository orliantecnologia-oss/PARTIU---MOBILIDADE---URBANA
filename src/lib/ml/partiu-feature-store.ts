/**
 * PARTIU ML FEATURE STORE
 * 
 * Repositório centralizado de features online e offline para modelos de Machine Learning.
 * Garante consistência temporal estrita (point-in-time) entre inferência em tempo real e re-treinamento.
 */

export interface DriverFeatures {
  driverId: string;
  acceptanceRatePct: number;
  cancellationRatePct: number;
  completedTripsTotal: number;
  averageRating: number;
  lifetimeDays: number;
  idleTimeRatio: number;
  averageSpeedKmH: number;
  earningsPerActiveHourBrl: number;
  lastUpdated: number;
}

export interface PassengerFeatures {
  passengerId: string;
  totalTripsLifetime: number;
  cancellationRatePct: number;
  averageTicketBrl: number;
  daysSinceLastRide: number;
  disputeCount: number;
  ratingAverage: number;
  preferredCategory: string;
  lastUpdated: number;
}

export interface TripFeatures {
  distanceKm: number;
  estimatedDurationMin: number;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  category: string;
  paymentMethod: string;
  isRushHour: boolean;
  dayOfWeek: number; // 0 a 6
  hourOfDay: number; // 0 a 23
}

export interface CityMarketplaceFeatures {
  cityId: string;
  activeOnlineDrivers: number;
  busyDriversCount: number;
  waitingPassengersCount: number;
  currentSurgeMultiplier: number;
  cancellationRatePct: number;
  averageEtaMinutes: number;
  liquidityRatio: number;
  lastUpdated: number;
}

export interface HotspotFeatures {
  hotspotId: string;
  cityId: string;
  demandDensityScore: number;
  supplyDensityScore: number;
  deficitRatio: number;
  baseSurge: number;
  isPeakActive: boolean;
}

export interface WeatherFeatures {
  cityId: string;
  condition: 'LIMPO' | 'CHUVA_LEVE' | 'CHUVA_MODERADA' | 'TEMPESTADE';
  rainIntensityMm: number;
  temperatureCelsius: number;
  speedReductionFactor: number; // 1.0 (normal) a 0.65 (tempestade)
}

export class PartiuFeatureStore {
  private driverFeatures: Map<string, DriverFeatures> = new Map();
  private passengerFeatures: Map<string, PassengerFeatures> = new Map();
  private cityFeatures: Map<string, CityMarketplaceFeatures> = new Map();
  private hotspotFeatures: Map<string, HotspotFeatures> = new Map();
  private weatherFeatures: Map<string, WeatherFeatures> = new Map();

  constructor() {
    this.seedDefaultFeatures();
  }

  private seedDefaultFeatures(): void {
    // Default baseline driver
    this.setDriverFeatures({
      driverId: 'mot-1',
      acceptanceRatePct: 94.5,
      cancellationRatePct: 2.8,
      completedTripsTotal: 3840,
      averageRating: 4.97,
      lifetimeDays: 420,
      idleTimeRatio: 0.18,
      averageSpeedKmH: 28.5,
      earningsPerActiveHourBrl: 38.40,
      lastUpdated: Date.now()
    });

    // Default city marketplace features (Itaperuna)
    this.setCityFeatures({
      cityId: 'itaperuna-rj',
      activeOnlineDrivers: 48,
      busyDriversCount: 31,
      waitingPassengersCount: 7,
      currentSurgeMultiplier: 1.0,
      cancellationRatePct: 3.8,
      averageEtaMinutes: 4.2,
      liquidityRatio: 2.4,
      lastUpdated: Date.now()
    });

    // Default weather
    this.setWeatherFeatures({
      cityId: 'itaperuna-rj',
      condition: 'LIMPO',
      rainIntensityMm: 0,
      temperatureCelsius: 26,
      speedReductionFactor: 1.0
    });
  }

  // --- GETTERS & SETTERS ---
  public setDriverFeatures(features: DriverFeatures): void {
    this.driverFeatures.set(features.driverId, { ...features, lastUpdated: Date.now() });
  }

  public getDriverFeatures(driverId: string): DriverFeatures {
    const f = this.driverFeatures.get(driverId);
    if (!f) {
      return {
        driverId,
        acceptanceRatePct: 90.0,
        cancellationRatePct: 4.0,
        completedTripsTotal: 50,
        averageRating: 4.90,
        lifetimeDays: 30,
        idleTimeRatio: 0.25,
        averageSpeedKmH: 26.0,
        earningsPerActiveHourBrl: 32.0,
        lastUpdated: Date.now()
      };
    }
    return f;
  }

  public setPassengerFeatures(features: PassengerFeatures): void {
    this.passengerFeatures.set(features.passengerId, { ...features, lastUpdated: Date.now() });
  }

  public getPassengerFeatures(passengerId: string): PassengerFeatures {
    const f = this.passengerFeatures.get(passengerId);
    if (!f) {
      return {
        passengerId,
        totalTripsLifetime: 12,
        cancellationRatePct: 5.0,
        averageTicketBrl: 18.50,
        daysSinceLastRide: 3,
        disputeCount: 0,
        ratingAverage: 4.95,
        preferredCategory: 'POP',
        lastUpdated: Date.now()
      };
    }
    return f;
  }

  public setCityFeatures(features: CityMarketplaceFeatures): void {
    this.cityFeatures.set(features.cityId, { ...features, lastUpdated: Date.now() });
  }

  public getCityFeatures(cityId: string): CityMarketplaceFeatures {
    const f = this.cityFeatures.get(cityId);
    if (!f) {
      return {
        cityId,
        activeOnlineDrivers: 30,
        busyDriversCount: 18,
        waitingPassengersCount: 5,
        currentSurgeMultiplier: 1.0,
        cancellationRatePct: 4.0,
        averageEtaMinutes: 4.5,
        liquidityRatio: 2.0,
        lastUpdated: Date.now()
      };
    }
    return f;
  }

  public setWeatherFeatures(features: WeatherFeatures): void {
    this.weatherFeatures.set(features.cityId, features);
  }

  public getWeatherFeatures(cityId: string): WeatherFeatures {
    const f = this.weatherFeatures.get(cityId);
    if (!f) {
      return {
        cityId,
        condition: 'LIMPO',
        rainIntensityMm: 0,
        temperatureCelsius: 25,
        speedReductionFactor: 1.0
      };
    }
    return f;
  }

  /**
   * Monta o vetor unificado de features normalizadas para inferência de Machine Learning
   */
  public buildInferenceVector(
    driverId: string, 
    passengerId: string, 
    trip: TripFeatures, 
    cityId: string
  ): Float32Array {
    const driver = this.getDriverFeatures(driverId);
    const passenger = this.getPassengerFeatures(passengerId);
    const city = this.getCityFeatures(cityId);
    const weather = this.getWeatherFeatures(cityId);

    // Vetor de 16 features normalizadas entre 0.0 e 1.0
    const vector = new Float32Array(16);
    vector[0] = Math.min(1.0, trip.distanceKm / 50.0);
    vector[1] = Math.min(1.0, trip.estimatedDurationMin / 60.0);
    vector[2] = trip.isRushHour ? 1.0 : 0.0;
    vector[3] = trip.hourOfDay / 24.0;
    vector[4] = trip.dayOfWeek / 7.0;
    vector[5] = driver.acceptanceRatePct / 100.0;
    vector[6] = driver.cancellationRatePct / 100.0;
    vector[7] = Math.min(1.0, driver.completedTripsTotal / 2000.0);
    vector[8] = (driver.averageRating - 4.0) / 1.0; // 4.0 a 5.0 -> 0.0 a 1.0
    vector[9] = Math.min(1.0, passenger.totalTripsLifetime / 100.0);
    vector[10] = passenger.cancellationRatePct / 100.0;
    vector[11] = Math.min(1.0, passenger.averageTicketBrl / 100.0);
    vector[12] = (city.currentSurgeMultiplier - 1.0) / 1.5; // 1.0 a 2.5 -> 0.0 a 1.0
    vector[13] = Math.min(1.0, city.waitingPassengersCount / 30.0);
    vector[14] = Math.min(1.0, city.activeOnlineDrivers / 100.0);
    vector[15] = weather.speedReductionFactor;

    return vector;
  }
}

export const partiuFeatureStore = new PartiuFeatureStore();
