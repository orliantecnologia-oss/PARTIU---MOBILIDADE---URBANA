/**
 * ==============================================================================
 * 🛡️ PARTIU LIVE RIDE TRACKING SERVICE (v1.0) — SIGA MINHA VIAGEM
 * ==============================================================================
 * Motor de compartilhamento público e rastreamento ao vivo de corridas.
 * Permite que passageiros compartilhem com familiares e amigos um link web
 * seguro que exibe o veículo se movendo no mapa em tempo real, sem necessidade
 * de autenticação ou instalação do aplicativo.
 * ==============================================================================
 */

export interface PublicRideTrackingData {
  trackingToken: string;
  rideId: string;
  status: "PROCURANDO" | "A_CAMINHO" | "CHEGOU" | "EM_VIAGEM" | "CONCLUIDA" | "CANCELADA";
  statusLabel: string;
  origem: string;
  destino: string;
  origemCoords?: { lat: number; lng: number };
  destinoCoords?: { lat: number; lng: number };
  driverCoords?: { lat: number; lng: number };
  driverName?: string;
  driverPhoto?: string;
  driverRating?: number;
  vehicleModel?: string;
  vehiclePlate?: string;
  passengerFirstName: string;
  etaMinutes?: number;
  distanceKm?: number;
  isExpired: boolean;
  expiresAt: string;
  lastUpdated: string;
}

const STORAGE_KEY_TRACKING_CACHE = "partiu_ride_tracking_cache_v1";

export class RideLiveTrackingService {
  private static instance: RideLiveTrackingService;
  private trackingCache: Map<string, PublicRideTrackingData> = new Map();

  private constructor() {
    this.restoreCache();
  }

  public static getInstance(): RideLiveTrackingService {
    if (!RideLiveTrackingService.instance) {
      RideLiveTrackingService.instance = new RideLiveTrackingService();
    }
    return RideLiveTrackingService.instance;
  }

  private restoreCache(): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TRACKING_CACHE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null) {
          Object.entries(parsed).forEach(([token, data]) => {
            this.trackingCache.set(token, data as PublicRideTrackingData);
          });
        }
      }
    } catch {
      // Fallback gracioso
    }
  }

  private persistCache(): void {
    if (typeof window === "undefined") return;
    try {
      const obj: Record<string, PublicRideTrackingData> = {};
      this.trackingCache.forEach((v, k) => {
        obj[k] = v;
      });
      localStorage.setItem(STORAGE_KEY_TRACKING_CACHE, JSON.stringify(obj));
    } catch {
      // Fallback gracioso
    }
  }

  /**
   * Gera um token de rastreamento seguro curto no padrão 'TRK-XXXXXX'
   */
  public generateTrackingToken(rideId: string): string {
    const cleanId = rideId.replace(/[^a-zA-Z0-9]/g, "").slice(-4);
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TRK-${cleanId}${randomChars}`;
  }

  /**
   * Registra ou atualiza os dados públicos da corrida para compartilhamento
   */
  public registerRideTracking(params: {
    rideId: string;
    status: PublicRideTrackingData["status"];
    origem: string;
    destino: string;
    origemCoords?: { lat: number; lng: number };
    destinoCoords?: { lat: number; lng: number };
    driverCoords?: { lat: number; lng: number };
    driverName?: string;
    driverPhoto?: string;
    driverRating?: number;
    vehicleModel?: string;
    vehiclePlate?: string;
    passengerName: string;
    distanceKm?: number;
    durationMin?: number;
    existingToken?: string;
  }): PublicRideTrackingData {
    const token = params.existingToken || this.generateTrackingToken(params.rideId);

    // 2 horas de validade após a criação ou atualização
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const firstName = (params.passengerName || "Passageiro").trim().split(" ")[0];

    const statusLabel = this.getStatusLabel(params.status);

    const trackingData: PublicRideTrackingData = {
      trackingToken: token,
      rideId: params.rideId,
      status: params.status,
      statusLabel,
      origem: params.origem,
      destino: params.destino,
      origemCoords: params.origemCoords,
      destinoCoords: params.destinoCoords,
      driverCoords: params.driverCoords,
      driverName: params.driverName,
      driverPhoto: params.driverPhoto,
      driverRating: params.driverRating || 4.9,
      vehicleModel: params.vehicleModel || "Carro Particular",
      vehiclePlate: params.vehiclePlate || "PLACA-CONF",
      passengerFirstName: firstName,
      distanceKm: params.distanceKm,
      etaMinutes: params.durationMin,
      isExpired: false,
      expiresAt,
      lastUpdated: new Date().toISOString(),
    };

    this.trackingCache.set(token, trackingData);
    this.persistCache();

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("partiu:ride-tracking-updated", {
          detail: trackingData,
        })
      );
    }

    return trackingData;
  }

  /**
   * Atualiza a posição em tempo real do motorista no link de rastreamento
   */
  public updateDriverLocation(tokenOrRideId: string, coords: { lat: number; lng: number }): void {
    for (const [token, data] of this.trackingCache.entries()) {
      if (token === tokenOrRideId || data.rideId === tokenOrRideId) {
        data.driverCoords = coords;
        data.lastUpdated = new Date().toISOString();
        this.trackingCache.set(token, data);
        this.persistCache();
        return;
      }
    }
  }

  /**
   * Consulta os dados de rastreamento público pelo token
   */
  public getPublicTrackingView(token: string): PublicRideTrackingData | null {
    if (!token) return null;
    const data = this.trackingCache.get(token);
    if (!data) return null;

    const isExpired = new Date(data.expiresAt).getTime() < Date.now();
    return {
      ...data,
      isExpired,
    };
  }

  /**
   * Constrói a URL pública canônica para compartilhamento
   */
  public buildShareUrl(token: string): string {
    const origin = typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://partiumobilidade.com.br";
    return `${origin}/rastreio/${encodeURIComponent(token)}`;
  }

  /**
   * Constrói a mensagem padrão 99/Uber formatada para WhatsApp / SMS
   */
  public buildShareMessage(
    token: string,
    vehicleModel = "Carro Parceiro",
    vehiclePlate?: string
  ): string {
    const url = this.buildShareUrl(token);
    const plateText = vehiclePlate ? ` (Placa ${vehiclePlate})` : "";
    return `Estou em viagem no PARTIU em um ${vehicleModel}${plateText}. Acompanhe meu trajeto em tempo real no mapa: ${url}`;
  }

  private getStatusLabel(status: PublicRideTrackingData["status"]): string {
    switch (status) {
      case "PROCURANDO":
        return "Buscando motorista parceiro...";
      case "A_CAMINHO":
        return "Motorista a caminho do embarque";
      case "CHEGOU":
        return "Motorista chegou ao local de embarque";
      case "EM_VIAGEM":
        return "Viagem em andamento";
      case "CONCLUIDA":
        return "Viagem concluída com segurança";
      case "CANCELADA":
        return "Viagem cancelada";
      default:
        return "Acompanhamento ao vivo";
    }
  }
}

export const rideLiveTrackingService = RideLiveTrackingService.getInstance();
