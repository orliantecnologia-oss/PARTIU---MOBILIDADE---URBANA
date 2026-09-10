/**
 * ==============================================================================
 * ⚙️ PARTIU DRIVER OS — DRIVER STATE MACHINE (v1.0)
 * ==============================================================================
 * Máquina de estados finita formal para motoristas e entregadores parceiros.
 * Impede transições ilegais ou saltos fantasmas (ex: ONLINE -> COMPLETED).
 * ==============================================================================
 */

export type RideDriverState =
  | "OFFLINE"
  | "ONLINE"
  | "OFFER_RECEIVED"
  | "OFFER_EXPIRED"
  | "OFFER_ACCEPTED"
  | "HEADING_TO_PICKUP"
  | "ARRIVED"
  | "WAITING"
  | "BOARDING"
  | "IN_TRIP"
  | "COMPLETING"
  | "COMPLETED";

export type DeliveryDriverState =
  | "DELIVERY_OFFER"
  | "DELIVERY_ACCEPTED"
  | "HEADING_TO_PICKUP"
  | "AT_PICKUP"
  | "WAITING_PICKUP"
  | "PACKAGE_VERIFIED"
  | "COLLECTED"
  | "IN_DELIVERY"
  | "AT_DROPOFF"
  | "RECIPIENT_VERIFICATION"
  | "DELIVERY_PROOF"
  | "DELIVERED"
  | "COMPLETED";

export class InvalidDriverStateTransitionError extends Error {
  constructor(
    public readonly currentState: string,
    public readonly targetState: string,
    public readonly reason: string
  ) {
    super(`TRANSIÇÃO_INVÁLIDA: Não é permitido mover o condutor de [${currentState}] para [${targetState}]. Razão: ${reason}`);
    this.name = "InvalidDriverStateTransitionError";
  }
}

export interface DriverStateTransitionLog {
  id: string;
  driverId: string;
  entityId: string; // rideId ou deliveryId
  fromState: string;
  toState: string;
  timestamp: number;
  actor: "DRIVER" | "PASSENGER" | "SYSTEM" | "ADMIN";
  metadata?: Record<string, unknown> | undefined;
}

export class DriverStateMachine {
  // Matriz de transições permitidas para corridas
  private static readonly ALLOWED_RIDE_TRANSITIONS: Record<RideDriverState, RideDriverState[]> = {
    OFFLINE: ["ONLINE"],
    ONLINE: ["OFFLINE", "OFFER_RECEIVED", "HEADING_TO_PICKUP"], // HEADING_TO_PICKUP permite promoção consecutiva e despacho direto
    OFFER_RECEIVED: ["OFFER_ACCEPTED", "OFFER_EXPIRED", "ONLINE"], // Recusa volta para ONLINE
    OFFER_EXPIRED: ["ONLINE"],
    OFFER_ACCEPTED: ["HEADING_TO_PICKUP", "ONLINE"], // Cancelamento antes de iniciar volta para ONLINE
    HEADING_TO_PICKUP: ["ARRIVED", "ONLINE"], // Cancelamento volta para ONLINE
    ARRIVED: ["WAITING", "BOARDING", "ONLINE"],
    WAITING: ["BOARDING", "ONLINE"], // Cancelamento por ausência do passageiro volta para ONLINE
    BOARDING: ["IN_TRIP", "ARRIVED", "ONLINE"], // Permite cancelamento e aborto seguro durante embarque
    IN_TRIP: ["COMPLETING", "ONLINE"], // Desvio de emergência pode cancelar
    COMPLETING: ["COMPLETED"],
    COMPLETED: ["ONLINE", "OFFLINE", "HEADING_TO_PICKUP"], // HEADING_TO_PICKUP permite encadeamento consecutivo (back-to-back)
  };

  private static readonly MAX_TRANSITION_HISTORY = 100;

  // Matriz de transições permitidas para entregas
  private static readonly ALLOWED_DELIVERY_TRANSITIONS: Record<DeliveryDriverState, DeliveryDriverState[]> = {
    DELIVERY_OFFER: ["DELIVERY_ACCEPTED", "COMPLETED"], // Recusa volta para COMPLETED/ONLINE
    DELIVERY_ACCEPTED: ["HEADING_TO_PICKUP"],
    HEADING_TO_PICKUP: ["AT_PICKUP"],
    AT_PICKUP: ["WAITING_PICKUP", "PACKAGE_VERIFIED"],
    WAITING_PICKUP: ["PACKAGE_VERIFIED", "COMPLETED"],
    PACKAGE_VERIFIED: ["COLLECTED"],
    COLLECTED: ["IN_DELIVERY"],
    IN_DELIVERY: ["AT_DROPOFF"],
    AT_DROPOFF: ["RECIPIENT_VERIFICATION"],
    RECIPIENT_VERIFICATION: ["DELIVERY_PROOF"],
    DELIVERY_PROOF: ["DELIVERED"],
    DELIVERED: ["COMPLETED"],
    COMPLETED: ["DELIVERY_OFFER"],
  };

  private currentState: RideDriverState = "OFFLINE";
  private currentDeliveryState: DeliveryDriverState = "DELIVERY_OFFER";
  private transitionHistory: DriverStateTransitionLog[] = [];

  constructor(initialState: RideDriverState = "OFFLINE") {
    this.currentState = initialState;
  }

  private recordTransition(log: DriverStateTransitionLog): void {
    this.transitionHistory.push(log);
    if (this.transitionHistory.length > DriverStateMachine.MAX_TRANSITION_HISTORY) {
      this.transitionHistory = this.transitionHistory.slice(-DriverStateMachine.MAX_TRANSITION_HISTORY);
    }
  }

  public getCurrentState(): RideDriverState {
    return this.currentState;
  }

  public getCurrentDeliveryState(): DeliveryDriverState {
    return this.currentDeliveryState;
  }

  public getHistory(): DriverStateTransitionLog[] {
    return [...this.transitionHistory];
  }

  public clearHistory(): void {
    this.transitionHistory = [];
  }

  public initDriverSession(driverId: string, state: RideDriverState = "ONLINE"): void {
    const fromState = this.currentState;
    this.currentState = state;
    this.recordTransition({
      id: `TD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      driverId,
      entityId: "SYSTEM",
      fromState,
      toState: state,
      timestamp: Date.now(),
      actor: "DRIVER",
    });
  }

  private static readonly VALID_RIDE_STATES = new Set<string>([
    "OFFLINE",
    "ONLINE",
    "OFFER_RECEIVED",
    "OFFER_EXPIRED",
    "OFFER_ACCEPTED",
    "HEADING_TO_PICKUP",
    "ARRIVED",
    "WAITING",
    "BOARDING",
    "IN_TRIP",
    "COMPLETING",
    "COMPLETED",
  ]);

  /**
   * Valida e executa uma transição para corrida de passageiro
   */
  public transitionRide(
    arg1: RideDriverState | string,
    arg2: string,
    arg3: string | RideDriverState,
    actor: "DRIVER" | "PASSENGER" | "SYSTEM" | "ADMIN" = "DRIVER",
    metadata?: Record<string, unknown> | undefined
  ): RideDriverState {
    let targetState: RideDriverState;
    let driverId: string;
    let rideId: string;

    if (DriverStateMachine.VALID_RIDE_STATES.has(arg1)) {
      targetState = arg1 as RideDriverState;
      driverId = arg2;
      rideId = arg3 as string;
    } else {
      driverId = arg1;
      rideId = arg2;
      targetState = arg3 as RideDriverState;
    }
    const allowed = DriverStateMachine.ALLOWED_RIDE_TRANSITIONS[this.currentState];

    if (!allowed || !allowed.includes(targetState)) {
      throw new InvalidDriverStateTransitionError(
        this.currentState,
        targetState,
        `Transição fora da ordem operacional permitida (${allowed?.join(", ") || "nenhuma"}).`
      );
    }

    const fromState = this.currentState;
    this.currentState = targetState;

    this.recordTransition({
      id: `TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      driverId,
      entityId: rideId,
      fromState,
      toState: targetState,
      timestamp: Date.now(),
      actor,
      metadata,
    });

    return this.currentState;
  }

  /**
   * Executa transição defensiva: tenta transitionRide; se falhar, recupera para ONLINE registrando contingência
   */
  public safeTransitionRide(
    targetState: RideDriverState,
    driverId: string,
    rideId: string,
    actor: "DRIVER" | "PASSENGER" | "SYSTEM" | "ADMIN" = "DRIVER",
    metadata?: Record<string, unknown> | undefined
  ): RideDriverState {
    try {
      return this.transitionRide(targetState, driverId, rideId, actor, metadata);
    } catch (err) {
      console.warn(`[DriverStateMachine] Transição arriscada [${this.currentState} -> ${targetState}] interceptada:`, err);
      const fromState = this.currentState;
      this.currentState = targetState === "ONLINE" || targetState === "OFFLINE" ? targetState : "ONLINE";
      this.recordTransition({
        id: `SAFE-TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        driverId,
        entityId: rideId,
        fromState,
        toState: this.currentState,
        timestamp: Date.now(),
        actor: "SYSTEM",
        metadata: { ...metadata, contingencyRecovery: true, originalTarget: targetState },
      });
      return this.currentState;
    }
  }

  /**
   * Valida e executa uma transição para entrega expressa
   */
  public transitionDelivery(
    targetState: DeliveryDriverState,
    driverId: string,
    deliveryId: string,
    actor: "DRIVER" | "PASSENGER" | "SYSTEM" | "ADMIN" = "DRIVER",
    metadata?: Record<string, unknown> | undefined
  ): DeliveryDriverState {
    const allowed = DriverStateMachine.ALLOWED_DELIVERY_TRANSITIONS[this.currentDeliveryState];

    if (!allowed || !allowed.includes(targetState)) {
      throw new InvalidDriverStateTransitionError(
        this.currentDeliveryState,
        targetState,
        `Transição fora da ordem logística de entrega permitida (${allowed?.join(", ") || "nenhuma"}).`
      );
    }

    const fromState = this.currentDeliveryState;
    this.currentDeliveryState = targetState;

    this.recordTransition({
      id: `TD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      driverId,
      entityId: deliveryId,
      fromState,
      toState: targetState,
      timestamp: Date.now(),
      actor,
      metadata,
    });

    return this.currentDeliveryState;
  }

  /**
   * Força sincronização de estado a partir do Supabase / backend
   */
  public syncFromRemote(remoteState: RideDriverState): void {
    this.currentState = remoteState;
  }
}

export const driverStateMachine = new DriverStateMachine();

