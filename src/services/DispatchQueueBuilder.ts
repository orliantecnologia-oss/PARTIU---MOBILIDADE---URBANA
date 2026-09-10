/**
 * ==============================================================================
 * ⚡ PARTIU CASCADE DISPATCH ENGINE (v4.0) — QUEUE BUILDER
 * ==============================================================================
 * Orquestrador sequencial de despacho em cascata padrão Uber/99.
 *
 * Funcionamento:
 * 1. Seleciona o Top 10 de condutores ordenados pelo DispatchScore.
 * 2. Despacha a oferta para o Motorista 1 com janela de 10 segundos.
 * 3. Se o motorista recusar, expirar o timeout de 10s ou ficar offline,
 *    avança automaticamente para o Motorista 2 (10s) -> Motorista 3 (10s)...
 * 4. Ao ocorrer o aceite com lock atômico, finaliza a cascata e notifica a praça.
 * 5. Se todos os 10 rejeitarem, emite evento de fila esgotada (Queue Exhausted).
 * ==============================================================================
 */

import { matchingEngine, type CandidateDriverProfile, type MatchRequest } from "./MatchingEngine";

export interface DispatchSession {
  rideId: string;
  category: string;
  pickupCoords: [number, number];
  destinationCoords: [number, number];
  fareBrl: number;
  candidates: CandidateDriverProfile[];
  currentIndex: number;
  currentCandidate: CandidateDriverProfile | null;
  secondsRemaining: number;
  status: "IDLE" | "DISPATCHING" | "ACCEPTED" | "REJECTED_ADVANCED" | "EXHAUSTED" | "CANCELLED";
  acceptedDriver?: CandidateDriverProfile | undefined;
  startedAt: number;
}

export type DispatchEventListener = (session: DispatchSession) => void;

export class DispatchQueueBuilder {
  private static instance: DispatchQueueBuilder;

  private activeSessions = new Map<string, DispatchSession>();
  private sessionTimers = new Map<string, NodeJS.Timeout>();
  private listeners: Set<DispatchEventListener> = new Set();
  private cancelledRideIds: Set<string> = new Set();

  private readonly DRIVER_TIMEOUT_SECONDS = 10; // Janela estrita de 10 segundos por condutor

  private constructor() {}

  public static getInstance(): DispatchQueueBuilder {
    if (!DispatchQueueBuilder.instance) {
      DispatchQueueBuilder.instance = new DispatchQueueBuilder();
    }
    return DispatchQueueBuilder.instance;
  }

  public onDispatchEvent(listener: DispatchEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(session: DispatchSession): void {
    this.listeners.forEach((fn) => fn({ ...session }));

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("partiu:dispatch_session_updated", {
          detail: { ...session },
        })
      );
    }
  }

  /**
   * Inicia o despacho em cascata para uma corrida
   */
  public async startCascadeDispatch(params: {
    rideId: string;
    category: string;
    pickupCoords: [number, number];
    destinationCoords: [number, number];
    fareBrl: number;
    initialCandidates?: CandidateDriverProfile[] | undefined;
  }): Promise<DispatchSession> {
    const { rideId, category, pickupCoords, destinationCoords, fareBrl, initialCandidates } = params;

    // Cancela sessão prévia se houver
    this.cancelCascade(rideId);
    this.cancelledRideIds.delete(rideId);

    // 1. Busca os Top 10 candidatos ordenados pelo score
    let candidates = initialCandidates;
    if (!candidates || candidates.length === 0) {
      const matchRequest: MatchRequest = {
        passengerLat: pickupCoords[1],
        passengerLng: pickupCoords[0],
        category,
        radiusMeters: 8000,
        limit: 10,
      };
      candidates = await matchingEngine.findBestDrivers(matchRequest);
    }

    if (this.cancelledRideIds.has(rideId)) {
      return {
        rideId,
        category,
        pickupCoords,
        destinationCoords,
        fareBrl,
        candidates: [],
        currentIndex: 0,
        currentCandidate: null,
        secondsRemaining: 0,
        status: "CANCELLED",
        startedAt: Date.now(),
      };
    }

    const session: DispatchSession = {
      rideId,
      category,
      pickupCoords,
      destinationCoords,
      fareBrl,
      candidates,
      currentIndex: 0,
      currentCandidate: candidates[0] || null,
      secondsRemaining: this.DRIVER_TIMEOUT_SECONDS,
      status: candidates.length > 0 ? "DISPATCHING" : "EXHAUSTED",
      startedAt: Date.now(),
    };

    this.activeSessions.set(rideId, session);

    if (session.status === "DISPATCHING") {
      this.dispatchToCurrentDriver(session);
    } else {
      this.notify(session);
    }

    return session;
  }

  /**
   * Despacha a oferta para o condutor atual da fila
   */
  private dispatchToCurrentDriver(session: DispatchSession): void {
    const candidate = session.candidates[session.currentIndex];
    if (!candidate) {
      this.finalizeExhausted(session);
      return;
    }

    session.currentCandidate = candidate;
    session.secondsRemaining = this.DRIVER_TIMEOUT_SECONDS;
    session.status = "DISPATCHING";
    this.notify(session);

    // Dispara evento específico da oferta ao motorista da vez
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("partiu:driver_offer_received", {
          detail: {
            rideId: session.rideId,
            driverId: candidate.driverId,
            driverName: candidate.name,
            fareBrl: session.fareBrl,
            etaMinutes: candidate.etaMinutes,
            distanceMeters: candidate.distanceMeters,
            countdownSeconds: this.DRIVER_TIMEOUT_SECONDS,
          },
        })
      );
    }

    // Timer regressivo a cada 1 segundo
    this.clearTimer(session.rideId);

    const timer = setInterval(() => {
      const current = this.activeSessions.get(session.rideId);
      if (!current || current.status !== "DISPATCHING") {
        this.clearTimer(session.rideId);
        return;
      }

      current.secondsRemaining -= 1;
      this.notify(current);

      if (current.secondsRemaining <= 0) {
        // Esgotou os 10s sem aceite: Avança para o próximo condutor
        this.clearTimer(session.rideId);
        this.advanceToNextDriver(session.rideId, "TIMEOUT");
      }
    }, 1000);

    this.sessionTimers.set(session.rideId, timer);
  }

  /**
   * Avança a fila para o próximo motorista da cascata
   */
  public advanceToNextDriver(rideId: string, reason: "TIMEOUT" | "DECLINED" | "OFFLINE" = "TIMEOUT"): void {
    const session = this.activeSessions.get(rideId);
    if (!session || session.status !== "DISPATCHING") return;

    this.clearTimer(rideId);

    const nextIndex = session.currentIndex + 1;
    if (nextIndex >= session.candidates.length) {
      // Fila de 10 condutores esgotada
      this.finalizeExhausted(session);
      return;
    }

    session.currentIndex = nextIndex;
    session.status = "REJECTED_ADVANCED";
    this.notify(session);

    // Despacha imediatamente para o próximo motorista
    this.dispatchToCurrentDriver(session);
  }

  /**
   * Motorista atual aceita a corrida (Garante encerramento da fila)
   */
  public acceptRide(rideId: string, driverId?: string): boolean {
    const session = this.activeSessions.get(rideId);
    if (!session || session.status !== "DISPATCHING") return false;

    this.clearTimer(rideId);

    const acceptedDriver =
      session.candidates.find((c) => c.driverId === driverId) || session.currentCandidate || session.candidates[0];

    session.status = "ACCEPTED";
    session.acceptedDriver = acceptedDriver;
    session.secondsRemaining = 0;
    this.notify(session);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("partiu:dispatch_ride_accepted", {
          detail: {
            rideId,
            driver: acceptedDriver,
          },
        })
      );
    }

    return true;
  }

  /**
   * Motorista atual recusa a corrida (Avança imediatamente)
   */
  public declineRide(rideId: string, driverId?: string): void {
    this.advanceToNextDriver(rideId, "DECLINED");
  }

  /**
   * Cancela a sessão de despacho (Passageiro cancelou busca)
   */
  public cancelCascade(rideId: string): void {
    this.cancelledRideIds.add(rideId);
    this.clearTimer(rideId);
    const session = this.activeSessions.get(rideId);
    if (session) {
      session.status = "CANCELLED";
      this.notify(session);
      this.activeSessions.delete(rideId);
    }
  }

  public getSession(rideId: string): DispatchSession | undefined {
    return this.activeSessions.get(rideId);
  }

  private finalizeExhausted(session: DispatchSession): void {
    this.clearTimer(session.rideId);
    session.status = "EXHAUSTED";
    session.currentCandidate = null;
    session.secondsRemaining = 0;
    this.notify(session);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("partiu:dispatch_queue_exhausted", {
          detail: { rideId: session.rideId },
        })
      );
    }
  }

  private clearTimer(rideId: string): void {
    const timer = this.sessionTimers.get(rideId);
    if (timer) {
      clearInterval(timer);
      this.sessionTimers.delete(rideId);
    }
  }
}

export const dispatchQueueBuilder = DispatchQueueBuilder.getInstance();
