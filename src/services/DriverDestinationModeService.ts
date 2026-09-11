/**
 * ==============================================================================
 * 🎯 PARTIU DRIVER DESTINATION MODE SERVICE (v1.0) — UBER / 99 STANDARD
 * ==============================================================================
 * Permite que o motorista defina um destino (ex: "Ir para Casa" ou volta de turno)
 * e receba apenas corridas cujo trajeto convirja para a direção desejada.
 * Limite estrito de 2 utilizações por dia por condutor.
 * ==============================================================================
 */

export interface DriverDestination {
  driverId: string;
  address: string;
  coords: { lat: number; lng: number };
  activatedAt: string;
  dateStr: string;
}

export interface DestinationModeUsage {
  dateStr: string;
  count: number;
}

const STORAGE_KEY_DESTINATION = "partiu_driver_destination_active";
const STORAGE_KEY_USAGE = "partiu_driver_destination_usage";
const MAX_DAILY_USES = 2;

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class DriverDestinationModeService {
  private static instance: DriverDestinationModeService;
  private activeDestinations: Map<string, DriverDestination> = new Map();
  private usageHistory: Map<string, DestinationModeUsage> = new Map();

  private constructor() {
    this.restoreCache();
  }

  public static getInstance(): DriverDestinationModeService {
    if (!DriverDestinationModeService.instance) {
      DriverDestinationModeService.instance = new DriverDestinationModeService();
    }
    return DriverDestinationModeService.instance;
  }

  private getTodayStr(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private restoreCache(): void {
    if (typeof window === "undefined") return;
    try {
      const rawDest = localStorage.getItem(STORAGE_KEY_DESTINATION);
      if (rawDest) {
        const parsed = JSON.parse(rawDest);
        Object.entries(parsed).forEach(([driverId, dest]) => {
          this.activeDestinations.set(driverId, dest as DriverDestination);
        });
      }

      const rawUsage = localStorage.getItem(STORAGE_KEY_USAGE);
      if (rawUsage) {
        const parsed = JSON.parse(rawUsage);
        Object.entries(parsed).forEach(([driverId, usage]) => {
          this.usageHistory.set(driverId, usage as DestinationModeUsage);
        });
      }
    } catch {
      // Fallback silencioso
    }
  }

  private persistCache(): void {
    if (typeof window === "undefined") return;
    try {
      const destObj: Record<string, DriverDestination> = {};
      this.activeDestinations.forEach((v, k) => {
        destObj[k] = v;
      });
      localStorage.setItem(STORAGE_KEY_DESTINATION, JSON.stringify(destObj));

      const usageObj: Record<string, DestinationModeUsage> = {};
      this.usageHistory.forEach((v, k) => {
        usageObj[k] = v;
      });
      localStorage.setItem(STORAGE_KEY_USAGE, JSON.stringify(usageObj));
    } catch {
      // Fallback silencioso
    }
  }

  /**
   * Retorna os usos restantes no dia de hoje (Máximo 2)
   */
  public getRemainingUses(driverId: string): number {
    const today = this.getTodayStr();
    const usage = this.usageHistory.get(driverId);
    if (!usage || usage.dateStr !== today) {
      return MAX_DAILY_USES;
    }
    return Math.max(0, MAX_DAILY_USES - usage.count);
  }

  /**
   * Retorna o destino ativo do motorista se houver
   */
  public getActiveDestination(driverId: string): DriverDestination | null {
    const dest = this.activeDestinations.get(driverId);
    if (!dest) return null;
    return dest;
  }

  /**
   * Ativa o Modo Destino para o motorista
   */
  public setDestination(
    driverId: string,
    address: string,
    coords: { lat: number; lng: number }
  ): { success: boolean; message?: string; destination?: DriverDestination } {
    const remaining = this.getRemainingUses(driverId);
    const today = this.getTodayStr();

    // Se já estiver com este destino ativo, apenas confirma
    const current = this.getActiveDestination(driverId);
    if (current && current.address === address) {
      return { success: true, destination: current };
    }

    if (remaining <= 0) {
      return {
        success: false,
        message: "Limite diário de 2 corridas direcionadas atingido para hoje.",
      };
    }

    const destination: DriverDestination = {
      driverId,
      address,
      coords,
      activatedAt: new Date().toISOString(),
      dateStr: today,
    };

    this.activeDestinations.set(driverId, destination);

    // Incrementa contagem diária
    const usage = this.usageHistory.get(driverId);
    if (!usage || usage.dateStr !== today) {
      this.usageHistory.set(driverId, { dateStr: today, count: 1 });
    } else {
      usage.count += 1;
      this.usageHistory.set(driverId, usage);
    }

    this.persistCache();

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("partiu:driver-destination-updated", {
          detail: { driverId, destination },
        })
      );
    }

    return { success: true, destination };
  }

  /**
   * Desativa o Modo Destino
   */
  public clearDestination(driverId: string): void {
    this.activeDestinations.delete(driverId);
    this.persistCache();

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("partiu:driver-destination-updated", {
          detail: { driverId, destination: null },
        })
      );
    }
  }

  /**
   * Algoritmo de filtragem espacial: verifica se a corrida converge para o destino desejado
   */
  public isRideConverging(
    driverCoords: { lat: number; lng: number },
    rideOrigem: { lat: number; lng: number },
    rideDestino: { lat: number; lng: number },
    targetDestination: { lat: number; lng: number }
  ): boolean {
    const dMotoristaAteAlvo = haversineDistanceKm(
      driverCoords.lat,
      driverCoords.lng,
      targetDestination.lat,
      targetDestination.lng
    );

    const dDesembarqueAteAlvo = haversineDistanceKm(
      rideDestino.lat,
      rideDestino.lng,
      targetDestination.lat,
      targetDestination.lng
    );

    const dEmbarqueAteMotorista = haversineDistanceKm(
      driverCoords.lat,
      driverCoords.lng,
      rideOrigem.lat,
      rideOrigem.lng
    );

    // 1. Bônus de Hiper-Proximidade: Se o desembarque for a menos de 3.5 km do destino final
    if (dDesembarqueAteAlvo <= 3.5) {
      // O embarque não pode ser muito longe na direção oposta (máx 5 km)
      return dEmbarqueAteMotorista <= 5.0;
    }

    // 2. Convergência Vetorial: A corrida deve encurtar a distância restante até o destino
    // Ex: Motorista está a 15 km de casa, e a corrida o deixa a 8 km de casa.
    const encurtaDistancia = dDesembarqueAteAlvo < dMotoristaAteAlvo;
    const embarqueViavel = dEmbarqueAteMotorista <= Math.max(3.5, dMotoristaAteAlvo * 0.4);

    return encurtaDistancia && embarqueViavel;
  }
}

export const driverDestinationModeService = DriverDestinationModeService.getInstance();
