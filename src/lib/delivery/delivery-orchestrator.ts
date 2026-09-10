/**
 * PARTIU MOBILIDADE URBANA — DELIVERY ORCHESTRATOR ENGINE
 * Bridges partiu-flash-engine.ts ↔ partiu-engine.ts
 * 
 * Manages the full delivery lifecycle:
 * SOLICITADO → A_CAMINHO_COLETA → COLETADO → EM_ROTA_ENTREGA → ENTREGUE | CANCELADO
 * 
 * Provides: Pickup OTP validation, Delivery OTP validation, Geofence enforcement,
 * Proof of Delivery (POD), Insurance calculation, and forensic audit trail.
 */

import type { GeoCoordinate } from "../partiu-dispatch-engine";
import { calculateHaversineKm } from "../partiu-dispatch-engine";
import {
  createFlashDeliveryOrder,
  confirmDeliveryWithProof,
  type FlashDeliveryOrder,
  type FlashPackageSize,
} from "../partiu-flash-engine";

// ─── Delivery Status (superset of FlashDeliveryOrder.status) ───────────────

export type DeliveryStatus =
  | "SOLICITADO"
  | "A_CAMINHO_COLETA"
  | "AGUARDANDO_COLETA"
  | "COLETADO"
  | "EM_ROTA_ENTREGA"
  | "AGUARDANDO_ENTREGA"
  | "ENTREGUE"
  | "CANCELADO"
  | "DEVOLVIDO";

// ─── Delivery Session ──────────────────────────────────────────────────────

export interface DeliverySession {
  id: string;
  flashOrder: FlashDeliveryOrder;
  corridaId: string; // Maps to CorridaPartiu.id
  status: DeliveryStatus;

  // Pickup phase
  pickupOtpValidated: boolean;
  pickupPhotoUrl?: string | undefined;
  pickupGeofencePassed: boolean;
  pickupTimestamp?: number | undefined;
  pickupDriverLocation?: GeoCoordinate | undefined;

  // Delivery phase
  deliveryOtpValidated: boolean;
  deliveryPhotoUrl?: string | undefined;
  deliveryGeofencePassed: boolean;
  deliveryTimestamp?: number | undefined;
  deliveryDriverLocation?: GeoCoordinate | undefined;

  // Metadata
  createdAt: number;
  updatedAt: number;
  auditLog: DeliveryAuditEntry[];
}

export interface DeliveryAuditEntry {
  id: string;
  timestamp: number;
  action: string;
  actor: "SISTEMA" | "MOTORISTA" | "REMETENTE" | "DESTINATARIO";
  details: string;
  location?: GeoCoordinate | undefined;
}

// ─── Geofence Config ───────────────────────────────────────────────────────

const PICKUP_GEOFENCE_METERS = 300;
const DELIVERY_GEOFENCE_METERS = 350;

// ─── Storage ───────────────────────────────────────────────────────────────

const STORAGE_KEY_DELIVERY_SESSION = "partiu_delivery_session_ativa";
let inMemorySession: DeliverySession | null = null;

function persistSession(session: DeliverySession | null): void {
  inMemorySession = session;
  if (typeof window === "undefined") return;
  if (session) {
    localStorage.setItem(STORAGE_KEY_DELIVERY_SESSION, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY_DELIVERY_SESSION);
  }
  window.dispatchEvent(
    new CustomEvent("partiu:delivery-atualizada", { detail: session })
  );
}

export function getActiveDeliverySession(): DeliverySession | null {
  if (typeof window === "undefined") return inMemorySession;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELIVERY_SESSION);
    if (!raw) return inMemorySession;
    return JSON.parse(raw) as DeliverySession;
  } catch {
    return inMemorySession;
  }
}

// ─── Audit Logger ──────────────────────────────────────────────────────────

function addAuditEntry(
  session: DeliverySession,
  action: string,
  actor: DeliveryAuditEntry["actor"],
  details: string,
  location?: GeoCoordinate | undefined,
): void {
  session.auditLog.push({
    id: `DLV-${Date.now().toString().slice(-6)}`,
    timestamp: Date.now(),
    action,
    actor,
    details,
    location,
  });
  session.updatedAt = Date.now();
}

// ─── 1. CREATE DELIVERY SESSION ────────────────────────────────────────────

export interface CreateDeliveryParams {
  corridaId: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  senderCoordinates?: GeoCoordinate | undefined;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCoordinates?: GeoCoordinate | undefined;
  packageSize: FlashPackageSize;
  description: string;
  declaredValueBrl?: number | undefined;
  hasInsurance?: boolean | undefined;
}

export function createDeliverySession(params: CreateDeliveryParams): DeliverySession {
  const senderCoords = params.senderCoordinates || { latitude: -21.205, longitude: -41.888 };
  const recipientCoords = params.recipientCoordinates || { latitude: -21.209, longitude: -41.892 };

  const flashOrder = createFlashDeliveryOrder({
    senderName: params.senderName,
    senderPhone: params.senderPhone,
    senderAddress: params.senderAddress,
    senderCoordinates: senderCoords,
    recipientName: params.recipientName,
    recipientPhone: params.recipientPhone,
    recipientAddress: params.recipientAddress,
    recipientCoordinates: recipientCoords,
    packageSize: params.packageSize,
    description: params.description,
    declaredValueBrl: params.declaredValueBrl,
    hasInsurance: params.hasInsurance,
  });

  const session: DeliverySession = {
    id: flashOrder.id,
    flashOrder,
    corridaId: params.corridaId,
    status: "SOLICITADO",
    pickupOtpValidated: false,
    pickupGeofencePassed: false,
    deliveryOtpValidated: false,
    deliveryGeofencePassed: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    auditLog: [],
  };

  addAuditEntry(session, "DELIVERY_CREATED", "SISTEMA",
    `Entrega ${flashOrder.id} criada. Pickup OTP: ${flashOrder.pickupOtp}, Delivery OTP: ${flashOrder.deliveryOtp}`);

  persistSession(session);
  return session;
}

// ─── 2. COURIER HEADING TO PICKUP ──────────────────────────────────────────

export function courierHeadingToPickup(
  driverId: string,
  driverName: string,
): DeliverySession | null {
  const session = getActiveDeliverySession();
  if (!session || session.status !== "SOLICITADO") return null;

  session.status = "A_CAMINHO_COLETA";
  session.flashOrder.status = "A_CAMINHO_COLETA";
  session.flashOrder.driverId = driverId;
  session.flashOrder.driverName = driverName;

  addAuditEntry(session, "COURIER_HEADING_PICKUP", "MOTORISTA",
    `Entregador ${driverName} (${driverId}) a caminho da coleta`);

  persistSession(session);
  return session;
}

// ─── 3. COURIER ARRIVED AT PICKUP ─────────────────────────────────────────

export function courierArrivedAtPickup(
  driverLocation?: GeoCoordinate | undefined,
): DeliverySession | null {
  const session = getActiveDeliverySession();
  if (!session || (session.status !== "A_CAMINHO_COLETA" && session.status !== "SOLICITADO")) return null;

  session.status = "AGUARDANDO_COLETA";

  // Geofence check for pickup
  if (driverLocation) {
    const dist = calculateHaversineKm(driverLocation, session.flashOrder.senderCoordinates) * 1000;
    session.pickupGeofencePassed = dist <= PICKUP_GEOFENCE_METERS;
    session.pickupDriverLocation = driverLocation;

    addAuditEntry(session, "PICKUP_GEOFENCE_CHECK", "SISTEMA",
      `Geofence de coleta: ${dist.toFixed(0)}m (limite: ${PICKUP_GEOFENCE_METERS}m). ${session.pickupGeofencePassed ? "APROVADO" : "FORA DO PERÍMETRO"}`,
      driverLocation);
  } else {
    session.pickupGeofencePassed = true;
    addAuditEntry(session, "PICKUP_GEOFENCE_SKIP", "SISTEMA",
      "Geofence de coleta ignorado — GPS do motorista indisponível");
  }

  addAuditEntry(session, "COURIER_ARRIVED_PICKUP", "MOTORISTA",
    `Entregador chegou ao local de coleta: ${session.flashOrder.senderAddress}`);

  persistSession(session);
  return session;
}

// ─── 4. CONFIRM PICKUP WITH OTP ───────────────────────────────────────────

export interface PickupConfirmationResult {
  success: boolean;
  message: string;
  session?: DeliverySession | undefined;
}

export function confirmPickup(
  enteredOtp: string,
  photoUrl?: string | undefined,
  driverLocation?: GeoCoordinate | undefined,
): PickupConfirmationResult {
  const session = getActiveDeliverySession();
  if (!session) {
    return { success: false, message: "Nenhuma entrega ativa encontrada." };
  }

  if (session.status !== "AGUARDANDO_COLETA" && session.status !== "A_CAMINHO_COLETA") {
    return { success: false, message: `Status inválido para confirmação de coleta: ${session.status}` };
  }

  // Validate OTP
  if (enteredOtp.trim() !== session.flashOrder.pickupOtp) {
    addAuditEntry(session, "PICKUP_OTP_FAILED", "MOTORISTA",
      `PIN de coleta incorreto: "${enteredOtp}" (esperado: ${session.flashOrder.pickupOtp})`, driverLocation);
    persistSession(session);
    return { success: false, message: "PIN de coleta incorreto! Solicite o código de 4 dígitos ao remetente." };
  }

  // Mark pickup as confirmed
  session.status = "COLETADO";
  session.flashOrder.status = "COLETADO";
  session.pickupOtpValidated = true;
  session.pickupTimestamp = Date.now();
  session.pickupPhotoUrl = photoUrl;

  if (driverLocation) {
    session.pickupDriverLocation = driverLocation;
  }

  addAuditEntry(session, "PICKUP_CONFIRMED", "MOTORISTA",
    `Coleta confirmada com PIN ${enteredOtp}. Foto: ${photoUrl ? "SIM" : "NÃO"}. Timestamp: ${new Date().toISOString()}`,
    driverLocation);

  persistSession(session);
  return { success: true, message: "Coleta confirmada! Dirija-se ao destinatário.", session };
}

// ─── 5. COURIER HEADING TO DELIVERY ───────────────────────────────────────

export function courierHeadingToDelivery(): DeliverySession | null {
  const session = getActiveDeliverySession();
  if (!session || session.status !== "COLETADO") return null;

  session.status = "EM_ROTA_ENTREGA";
  session.flashOrder.status = "EM_ROTA_ENTREGA";

  addAuditEntry(session, "COURIER_HEADING_DELIVERY", "MOTORISTA",
    `Entregador a caminho do destino: ${session.flashOrder.recipientAddress}`);

  persistSession(session);
  return session;
}

// ─── 6. COURIER ARRIVED AT DELIVERY ───────────────────────────────────────

export function courierArrivedAtDelivery(
  driverLocation?: GeoCoordinate | undefined,
): DeliverySession | null {
  const session = getActiveDeliverySession();
  if (!session || (session.status !== "EM_ROTA_ENTREGA" && session.status !== "COLETADO")) return null;

  session.status = "AGUARDANDO_ENTREGA";

  // Geofence check for delivery
  if (driverLocation) {
    const dist = calculateHaversineKm(driverLocation, session.flashOrder.recipientCoordinates) * 1000;
    session.deliveryGeofencePassed = dist <= DELIVERY_GEOFENCE_METERS;
    session.deliveryDriverLocation = driverLocation;

    addAuditEntry(session, "DELIVERY_GEOFENCE_CHECK", "SISTEMA",
      `Geofence de entrega: ${dist.toFixed(0)}m (limite: ${DELIVERY_GEOFENCE_METERS}m). ${session.deliveryGeofencePassed ? "APROVADO" : "FORA DO PERÍMETRO"}`,
      driverLocation);
  } else {
    session.deliveryGeofencePassed = true;
    addAuditEntry(session, "DELIVERY_GEOFENCE_SKIP", "SISTEMA",
      "Geofence de entrega ignorado — GPS indisponível");
  }

  addAuditEntry(session, "COURIER_ARRIVED_DELIVERY", "MOTORISTA",
    `Entregador chegou ao local de entrega: ${session.flashOrder.recipientAddress}`);

  persistSession(session);
  return session;
}

// ─── 7. CONFIRM DELIVERY WITH OTP + PROOF ────────────────────────────────

export interface DeliveryConfirmationResult {
  success: boolean;
  message: string;
  session?: DeliverySession | undefined;
}

export function confirmDelivery(
  enteredOtp: string,
  photoUrl?: string | undefined,
  driverLocation?: GeoCoordinate | undefined,
): DeliveryConfirmationResult {
  const session = getActiveDeliverySession();
  if (!session) {
    return { success: false, message: "Nenhuma entrega ativa encontrada." };
  }

  if (session.status !== "AGUARDANDO_ENTREGA" && session.status !== "EM_ROTA_ENTREGA") {
    return { success: false, message: `Status inválido para confirmação de entrega: ${session.status}` };
  }

  // Validate delivery OTP
  if (enteredOtp.trim() !== session.flashOrder.deliveryOtp) {
    addAuditEntry(session, "DELIVERY_OTP_FAILED", "MOTORISTA",
      `PIN de entrega incorreto: "${enteredOtp}" (esperado: ${session.flashOrder.deliveryOtp})`, driverLocation);
    persistSession(session);
    return { success: false, message: "PIN de entrega incorreto! Solicite o código de 4 dígitos ao destinatário." };
  }

  // Use flash engine's proof function
  const proofResult = confirmDeliveryWithProof(session.flashOrder, enteredOtp, photoUrl);
  if (!proofResult.success) {
    return { success: false, message: proofResult.errorMessage || "Falha na confirmação de entrega." };
  }

  // Mark delivery as completed
  session.status = "ENTREGUE";
  session.flashOrder = proofResult.updatedOrder!;
  session.deliveryOtpValidated = true;
  session.deliveryTimestamp = Date.now();
  session.deliveryPhotoUrl = photoUrl;

  if (driverLocation) {
    session.deliveryDriverLocation = driverLocation;
  }

  addAuditEntry(session, "DELIVERY_CONFIRMED", "MOTORISTA",
    `Entrega confirmada com PIN ${enteredOtp}. Foto POD: ${photoUrl ? "SIM" : "NÃO"}. Timestamp: ${new Date().toISOString()}`,
    driverLocation);

  persistSession(session);
  return { success: true, message: "Entrega confirmada com sucesso!", session };
}

// ─── 8. CANCEL DELIVERY ───────────────────────────────────────────────────

export function cancelDeliverySession(
  reason: string,
  actor: DeliveryAuditEntry["actor"] = "REMETENTE",
): DeliverySession | null {
  const session = getActiveDeliverySession();
  if (!session) return null;

  const previousStatus = session.status;
  session.status = "CANCELADO";
  session.flashOrder.status = "CANCELADO";

  addAuditEntry(session, "DELIVERY_CANCELLED", actor,
    `Entrega cancelada. Motivo: ${reason}. Status anterior: ${previousStatus}`);

  persistSession(null);
  return session;
}

// ─── 9. GET DELIVERY STATUS FOR TRACKING ──────────────────────────────────

export interface DeliveryTrackingInfo {
  id: string;
  trackingCode: string;
  status: DeliveryStatus;
  statusLabel: string;
  senderName: string;
  recipientName: string;
  recipientAddress: string;
  packageDescription: string;
  courierName?: string | undefined;
  courierPhone?: string | undefined;
  pickupConfirmed: boolean;
  pickupTimestamp?: number | undefined;
  deliveryConfirmed: boolean;
  deliveryTimestamp?: number | undefined;
  hasInsurance: boolean;
  shareableUrl: string;
  pickupOtp: string;
  deliveryOtp: string;
  progress: number; // 0-100
}

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  SOLICITADO: "Entrega Solicitada",
  A_CAMINHO_COLETA: "Entregador a Caminho da Coleta",
  AGUARDANDO_COLETA: "Entregador no Local de Coleta",
  COLETADO: "Pacote Coletado",
  EM_ROTA_ENTREGA: "Em Rota para o Destinatário",
  AGUARDANDO_ENTREGA: "Entregador no Local de Entrega",
  ENTREGUE: "Entregue com Sucesso",
  CANCELADO: "Entrega Cancelada",
  DEVOLVIDO: "Devolvido ao Remetente",
};

const STATUS_PROGRESS: Record<DeliveryStatus, number> = {
  SOLICITADO: 10,
  A_CAMINHO_COLETA: 20,
  AGUARDANDO_COLETA: 30,
  COLETADO: 50,
  EM_ROTA_ENTREGA: 70,
  AGUARDANDO_ENTREGA: 85,
  ENTREGUE: 100,
  CANCELADO: 0,
  DEVOLVIDO: 0,
};

export function getDeliveryTrackingInfo(session: DeliverySession): DeliveryTrackingInfo {
  const trackingCode = `PT-${session.corridaId.slice(-4)}-EXP`;

  return {
    id: session.id,
    trackingCode,
    status: session.status,
    statusLabel: STATUS_LABELS[session.status],
    senderName: session.flashOrder.senderName,
    recipientName: session.flashOrder.recipientName,
    recipientAddress: session.flashOrder.recipientAddress,
    packageDescription: session.flashOrder.description,
    courierName: session.flashOrder.driverName,
    courierPhone: session.flashOrder.driverPhone,
    pickupConfirmed: session.pickupOtpValidated,
    pickupTimestamp: session.pickupTimestamp,
    deliveryConfirmed: session.deliveryOtpValidated,
    deliveryTimestamp: session.deliveryTimestamp,
    hasInsurance: session.flashOrder.hasInsurance,
    shareableUrl: session.flashOrder.shareableTrackingUrl,
    pickupOtp: session.flashOrder.pickupOtp,
    deliveryOtp: session.flashOrder.deliveryOtp,
    progress: STATUS_PROGRESS[session.status],
  };
}
