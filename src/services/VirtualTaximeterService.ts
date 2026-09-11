/**
 * ==============================================================================
 * ⏱️ PARTIU DRIVER OS — VIRTUAL TAXIMETER ENGINE ("CORRIDA DE RUA")
 * ==============================================================================
 * Motor de taxímetro digital em tempo real com telemetria contínua via GPS.
 * Permite que condutores parceiros peguem passageiros que acenam diretamente na
 * rua (sem solicitação prévia pelo app), calculando bandeirada inicial, quilômetros
 * rodados e tempo no trânsito, com emissão de QR Code PIX instantâneo e registro
 * contábil no livro-razão (FinOps Double-Entry Ledger).
 * ==============================================================================
 */

export interface TaximeterConfig {
  baseFareBrl: number; // Bandeirada (ex: R$ 6.00)
  kmRateBrl: number; // Valor por km (ex: R$ 2.50)
  minuteRateBrl: number; // Valor por minuto (ex: R$ 0.35)
  minFareBrl: number; // Tarifa mínima (ex: R$ 10.00)
}

export const DEFAULT_TAXIMETER_CONFIG: TaximeterConfig = {
  baseFareBrl: 6.0,
  kmRateBrl: 2.5,
  minuteRateBrl: 0.35,
  minFareBrl: 10.0,
};

export type TaximeterStatus = "IDLE" | "RUNNING" | "PAUSED" | "FINISHED";

export interface TaximeterState {
  status: TaximeterStatus;
  elapsedSeconds: number;
  distanceMeters: number;
  distanceKm: number;
  currentSpeedKmH: number;
  currentFareBrl: number;
  currentFareCents: number;
  baseFareBrl: number;
  kmRateBrl: number;
  minuteRateBrl: number;
  minFareBrl: number;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface TaximeterReceipt {
  id: string;
  driverId: string;
  startedAt: number;
  finishedAt: number;
  durationSeconds: number;
  durationMinutes: number;
  distanceKm: number;
  fareBrl: number;
  fareCents: number;
  platformFeeBrl: number; // Taxa da cooperativa/plataforma (ex: 10%)
  netDriverBrl: number;
  pixQrCodePayload?: string;
  pixCopiaECola?: string;
}

export class VirtualTaximeterService {
  private static instance: VirtualTaximeterService;
  private config: TaximeterConfig = { ...DEFAULT_TAXIMETER_CONFIG };
  private status: TaximeterStatus = "IDLE";
  private elapsedSeconds: number = 0;
  private distanceMeters: number = 0;
  private currentSpeedKmH: number = 0;
  private startedAt: number | null = null;
  private finishedAt: number | null = null;
  private lastCoords: { lat: number; lng: number } | null = null;
  private watchId: number | null = null;
  private timerInterval: any = null;
  private listeners: Set<(state: TaximeterState) => void> = new Set();
  private lastReceipt: TaximeterReceipt | null = null;

  private constructor() {
    this.loadPersistedConfig();
  }

  public static getInstance(): VirtualTaximeterService {
    if (!VirtualTaximeterService.instance) {
      VirtualTaximeterService.instance = new VirtualTaximeterService();
    }
    return VirtualTaximeterService.instance;
  }

  private loadPersistedConfig(): void {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("partiu:taximeter:config");
      if (saved) {
        this.config = { ...DEFAULT_TAXIMETER_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      this.config = { ...DEFAULT_TAXIMETER_CONFIG };
    }
  }

  public updateConfig(newConfig: Partial<TaximeterConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("partiu:taximeter:config", JSON.stringify(this.config));
      } catch {
        // Ignora erro de cota
      }
    }
    this.notify();
  }

  public getConfig(): TaximeterConfig {
    return { ...this.config };
  }

  public getState(): TaximeterState {
    const durationMinutes = this.elapsedSeconds / 60;
    const distanceKm = this.distanceMeters / 1000;

    let computedFare =
      this.config.baseFareBrl +
      distanceKm * this.config.kmRateBrl +
      durationMinutes * this.config.minuteRateBrl;

    computedFare = Math.max(computedFare, this.config.minFareBrl);
    const currentFareBrl = Math.round(computedFare * 100) / 100;
    const currentFareCents = Math.round(currentFareBrl * 100);

    return {
      status: this.status,
      elapsedSeconds: this.elapsedSeconds,
      distanceMeters: Math.round(this.distanceMeters),
      distanceKm: Math.round(distanceKm * 100) / 100,
      currentSpeedKmH: Math.round(this.currentSpeedKmH),
      currentFareBrl: this.status === "IDLE" ? this.config.baseFareBrl : currentFareBrl,
      currentFareCents: this.status === "IDLE" ? Math.round(this.config.baseFareBrl * 100) : currentFareCents,
      baseFareBrl: this.config.baseFareBrl,
      kmRateBrl: this.config.kmRateBrl,
      minuteRateBrl: this.config.minuteRateBrl,
      minFareBrl: this.config.minFareBrl,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
    };
  }

  public subscribe(callback: (state: TaximeterState) => void): () => void {
    this.listeners.add(callback);
    callback(this.getState());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch {
        // Ignora falhas em listeners
      }
    }
  }

  /**
   * Inicia o taxímetro (corrida de rua)
   */
  public start(customConfig?: Partial<TaximeterConfig>): void {
    if (this.status === "RUNNING") return;

    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    this.status = "RUNNING";
    this.elapsedSeconds = 0;
    this.distanceMeters = 0;
    this.currentSpeedKmH = 0;
    this.startedAt = Date.now();
    this.finishedAt = null;
    this.lastCoords = null;
    this.lastReceipt = null;

    this.startTimer();
    this.startGeolocationWatch();
    this.notify();
  }

  /**
   * Pausa o taxímetro (ex: parada aguardando cliente)
   */
  public pause(): void {
    if (this.status !== "RUNNING") return;
    this.status = "PAUSED";
    this.stopTimer();
    this.currentSpeedKmH = 0;
    this.notify();
  }

  /**
   * Retoma a corrida
   */
  public resume(): void {
    if (this.status !== "PAUSED") return;
    this.status = "RUNNING";
    this.startTimer();
    this.notify();
  }

  /**
   * Finaliza o taxímetro e gera recibo com split financeiro
   */
  public finish(driverId: string = "motorista-padrao"): TaximeterReceipt {
    if (this.status === "IDLE") {
      throw new Error("Taxímetro não está em execução.");
    }

    this.status = "FINISHED";
    this.finishedAt = Date.now();
    this.stopTimer();
    this.stopGeolocationWatch();

    const state = this.getState();
    const durationMinutes = Math.ceil(state.elapsedSeconds / 60);
    const platformFeeBrl = Math.round(state.currentFareBrl * 0.1 * 100) / 100; // 10% comissão padrão
    const netDriverBrl = Math.round((state.currentFareBrl - platformFeeBrl) * 100) / 100;

    const receiptId = `TX-${Date.now()}`;
    const pixCopiaECola = `00020126580014br.gov.bcb.pix0136${receiptId}520400005303986540${state.currentFareBrl.toFixed(2)}5802BR5913PARTIU DRIVER6008SAO PAULO62070503***6304`;

    const receipt: TaximeterReceipt = {
      id: receiptId,
      driverId,
      startedAt: this.startedAt || Date.now(),
      finishedAt: this.finishedAt,
      durationSeconds: state.elapsedSeconds,
      durationMinutes,
      distanceKm: state.distanceKm,
      fareBrl: state.currentFareBrl,
      fareCents: state.currentFareCents,
      platformFeeBrl,
      netDriverBrl,
      pixCopiaECola,
    };

    this.lastReceipt = receipt;
    this.notify();
    return receipt;
  }

  /**
   * Reseta o taxímetro de volta ao estado IDLE
   */
  public reset(): void {
    this.stopTimer();
    this.stopGeolocationWatch();
    this.status = "IDLE";
    this.elapsedSeconds = 0;
    this.distanceMeters = 0;
    this.currentSpeedKmH = 0;
    this.startedAt = null;
    this.finishedAt = null;
    this.lastCoords = null;
    this.lastReceipt = null;
    this.notify();
  }

  public getLastReceipt(): TaximeterReceipt | null {
    return this.lastReceipt;
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds += 1;
      this.notify();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private startGeolocationWatch(): void {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    this.stopGeolocationWatch();

    try {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (this.status !== "RUNNING") return;
          const { latitude, longitude, speed } = pos.coords;

          if (speed !== null && speed !== undefined && speed >= 0) {
            this.currentSpeedKmH = speed * 3.6; // m/s para km/h
          }

          if (this.lastCoords) {
            const dist = this.calculateHaversineMeters(
              this.lastCoords.lat,
              this.lastCoords.lng,
              latitude,
              longitude
            );
            // Deadband de precisão: ignora oscilações de GPS menores que 5 metros
            // e descarta saltos anômalos maiores que 300 metros em 1 segundo
            if (dist >= 5 && dist < 300) {
              this.distanceMeters += dist;
            }
          }

          this.lastCoords = { lat: latitude, lng: longitude };
          this.notify();
        },
        (err) => {
          console.warn("[VirtualTaximeter] Erro na leitura do GPS:", err);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 5000,
        }
      );
    } catch (e) {
      console.warn("[VirtualTaximeter] Falha ao registrar watchPosition:", e);
    }
  }

  private stopGeolocationWatch(): void {
    if (this.watchId !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Fórmula Geodésica Haversine para cálculo preciso da distância em metros
   */
  private calculateHaversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Raio da Terra em metros
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
}

export const virtualTaximeterService = VirtualTaximeterService.getInstance();
