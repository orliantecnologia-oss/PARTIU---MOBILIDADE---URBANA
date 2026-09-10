/**
 * ==============================================================================
 * 📦 PARTIU DELIVERY OS — DOMAIN CONTRACTS & ENTITIES (v1.0)
 * ==============================================================================
 * Contratos formais e entidades de domínio para last-mile delivery, homologados
 * no benchmark operacional do 99Entrega.
 * ==============================================================================
 */

export type DeliveryVehicleType =
  | "MOTO"
  | "CARRO"
  | "UTILITARIO"
  | "VAN"
  | "CARRETO";

export type PackageCategory =
  | "DOCUMENTO"
  | "PACOTE_PEQUENO"
  | "MEDIO"
  | "GRANDE"
  | "ALIMENTOS"
  | "FRAGIL"
  | "ELETRONICOS"
  | "MUDANCA"
  | "OUTROS";

export interface PackageSpec {
  description: string;
  category: PackageCategory;
  weightKg: number;
  dimensionsCm: {
    length: number;
    width: number;
    height: number;
  };
  cargoVolumeLiters: number;
  declaredValueBrl: number;
  isFragile: boolean;
  packagingType?: "ENVELOPE" | "CAIXA" | "SACOLA" | "AVULSO" | undefined;
  specialInstructions?: string | undefined;
}

export type DeliveryStopType = "PICKUP" | "DROPOFF" | "RETURN";

export type DeliveryStopStatus =
  | "PENDING"
  | "HEADING"
  | "ARRIVED"
  | "VERIFYING"
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED";

export interface DeliveryContact {
  name: string;
  phone: string;
  email?: string | undefined;
  documentCpf?: string | undefined;
}

export interface DeliveryStop {
  id: string;
  deliveryId: string;
  sequence: number; // 0 = Coleta, 1 = Primeira Parada, 2 = Segunda Parada...
  type: DeliveryStopType;
  address: string;
  complement?: string | undefined;
  reference?: string | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
  contact: DeliveryContact;
  instructions?: string | undefined;
  status: DeliveryStopStatus;
  arrivedAt?: number | undefined;
  completedAt?: number | undefined;
  otpExpected: string; // 4 dígitos
  otpVerified: boolean;
  otpFailedAttempts: number;
  proofId?: string | undefined;
  notes?: string | undefined;
}

export type DeliveryProofType = "PICKUP" | "DELIVERY" | "RETURN" | "EXCEPTION";

export interface DeliveryProof {
  id: string;
  deliveryId: string;
  stopId: string;
  type: DeliveryProofType;
  photoUrl: string;
  capturedAt: number;
  latitude: number;
  longitude: number;
  capturedByDriverId: string;
  metadata?: Record<string, unknown> | undefined;
  createdAt: number;
}

export interface VehicleCapability {
  vehicleType: DeliveryVehicleType;
  maxWeightKg: number;
  maxLengthCm: number;
  maxWidthCm: number;
  maxHeightCm: number;
  maxVolumeLiters: number;
  allowedCategories: PackageCategory[];
  multipleStopsAllowed: boolean;
  maxStops: number; // Ex: Moto = 1, Carro = 3, Utilitário = 5
}

export type DeliveryNominalState =
  | "DRAFT"
  | "REQUESTED"
  | "SEARCHING_DRIVER"
  | "DRIVER_ASSIGNED"
  | "DRIVER_ACCEPTED"
  | "HEADING_TO_PICKUP"
  | "ARRIVED_PICKUP"
  | "PICKUP_VERIFICATION"
  | "PACKAGE_COLLECTED"
  | "PICKUP_PROOF"
  | "IN_TRANSIT"
  | "ARRIVED_DROPOFF"
  | "RECIPIENT_VERIFICATION"
  | "DELIVERY_PROOF"
  | "DELIVERED"
  | "PAYMENT_SETTLED"
  | "COMPLETED";

export type DeliveryExceptionState =
  | "CANCELLED"
  | "DRIVER_CANCELLED"
  | "FAILED_PICKUP"
  | "RECIPIENT_NOT_FOUND"
  | "ADDRESS_PROBLEM"
  | "PACKAGE_PROBLEM"
  | "VERIFICATION_FAILED"
  | "RETURN_REQUIRED"
  | "RETURNING_TO_PICKUP"
  | "RETURNED"
  | "SUPPORT_REVIEW"
  | "PAYMENT_FAILED"
  | "SYSTEM_ERROR";

export type DeliveryState = DeliveryNominalState | DeliveryExceptionState;

export interface ReturnDetails {
  reason: "RECIPIENT_ABSENT" | "WRONG_ADDRESS" | "PACKAGE_REJECTED" | "SECURITY_CONCERN";
  startedAt: number;
  arrivedPickupAt?: number | undefined;
  completedAt?: number | undefined;
  returnFeeBrl: number;
  driverReturnCompensationBrl: number;
  returnOtpExpected: string;
  returnOtpVerified: boolean;
  returnProofPhotoUrl?: string | undefined;
  notes?: string | undefined;
}

export interface DeliveryPricingQuote {
  baseFareBrl: number;
  distanceKm: number;
  distanceFareBrl: number;
  durationMin: number;
  additionalStopsCount: number;
  additionalStopsFareBrl: number;
  insuranceFareBrl: number;
  returnFareBrl: number;
  grossTotalBrl: number;
  driverEarningsBrl: number;
  platformRevenueBrl: number;
  baseFareCents?: number | undefined;
  distanceFareCents?: number | undefined;
  additionalStopsFareCents?: number | undefined;
  insuranceFareCents?: number | undefined;
  grossTotalCents?: number | undefined;
  driverEarningsCents?: number | undefined;
  platformRevenueCents?: number | undefined;
}

export interface DeliveryOrder {
  id: string;
  trackingCode: string; // Ex: "DEL-84920"
  trackingToken: string; // 32 caracteres criptográficos para o link público
  senderId: string;
  senderContact: DeliveryContact;
  vehicleType: DeliveryVehicleType;
  packageSpec: PackageSpec;
  status: DeliveryState;
  stops: DeliveryStop[]; // Coleta (index 0) + Paradas de Entrega
  currentStopIndex: number;
  driverId?: string | undefined;
  driverName?: string | undefined;
  driverPhone?: string | undefined;
  driverVehicleModel?: string | undefined;
  driverVehiclePlate?: string | undefined;
  driverRating?: number | undefined;
  driverLocation?: { lat: number; lng: number; updatedAt: number } | undefined;
  pricing: DeliveryPricingQuote;
  proofs: DeliveryProof[];
  returnDetails?: ReturnDetails | undefined;
  cancellationReason?: string | undefined;
  createdAt: number;
  updatedAt: number;
}
