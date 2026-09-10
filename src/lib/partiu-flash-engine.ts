/**
 * PARTIU MOBILIDADE URBANA — ENTERPRISE PARTIU FLASH ENGINE
 * Logística Expressa sob Demanda: Pickup Verification, Proof of Delivery (POD),
 * Rastreamento Web em Tempo Real para Destinatário e Entregas Corporativas com Seguro.
 */

import { GeoCoordinate } from "./partiu-dispatch-engine";

export type FlashPackageSize = "ENVELOPE" | "PEQUENO" | "MEDIO" | "GRANDE";

export interface FlashDeliveryOrder {
  id: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  senderCoordinates: GeoCoordinate;
  pickupOtp: string; // 4 dígitos para coleta segura
  
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCoordinates: GeoCoordinate;
  deliveryOtp: string; // 4 dígitos no recebimento (POD)
  
  packageSize: FlashPackageSize;
  description: string;
  declaredValueBrl: number;
  hasInsurance: boolean;
  insuranceCostBrl: number;
  
  status: "SOLICITADO" | "A_CAMINHO_COLETA" | "COLETADO" | "EM_ROTA_ENTREGA" | "ENTREGUE" | "CANCELADO";
  driverId?: string | undefined;
  driverName?: string | undefined;
  driverVehiclePlate?: string | undefined;
  driverPhone?: string | undefined;
  
  proofOfDeliveryPhotoUrl?: string | undefined;
  deliveredAtTimestamp?: number | undefined;
  shareableTrackingUrl: string;
}

export function createFlashDeliveryOrder(params: {
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  senderCoordinates: GeoCoordinate;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCoordinates: GeoCoordinate;
  packageSize: FlashPackageSize;
  description: string;
  declaredValueBrl?: number | undefined;
  hasInsurance?: boolean | undefined;
}): FlashDeliveryOrder {
  const pickupOtp = Math.floor(1000 + Math.random() * 9000).toString();
  const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
  const id = `FLS-${Date.now().toString().slice(-6)}`;
  
  const declaredVal = params.declaredValueBrl || 50;
  const insuranceCost = params.hasInsurance ? Number((declaredVal * 0.015).toFixed(2)) : 0;

  return {
    id,
    senderName: params.senderName,
    senderPhone: params.senderPhone,
    senderAddress: params.senderAddress,
    senderCoordinates: params.senderCoordinates,
    pickupOtp,
    
    recipientName: params.recipientName,
    recipientPhone: params.recipientPhone,
    recipientAddress: params.recipientAddress,
    recipientCoordinates: params.recipientCoordinates,
    deliveryOtp,
    
    packageSize: params.packageSize,
    description: params.description,
    declaredValueBrl: declaredVal,
    hasInsurance: !!params.hasInsurance,
    insuranceCostBrl: insuranceCost,
    
    status: "SOLICITADO",
    shareableTrackingUrl: `https://partiu.mobi/rastreio/${id}`,
  };
}

export function confirmDeliveryWithProof(
  order: FlashDeliveryOrder,
  enteredDeliveryOtp: string,
  proofPhotoUrl?: string | undefined
): { success: boolean; updatedOrder?: FlashDeliveryOrder | undefined; errorMessage?: string | undefined } {
  if (enteredDeliveryOtp.trim() !== order.deliveryOtp) {
    return {
      success: false,
      errorMessage: "Código de entrega incorreto! Solicite o PIN de 4 dígitos ao destinatário.",
    };
  }

  const updatedOrder: FlashDeliveryOrder = {
    ...order,
    status: "ENTREGUE",
    deliveredAtTimestamp: Date.now(),
    proofOfDeliveryPhotoUrl: proofPhotoUrl || "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=300",
  };

  return {
    success: true,
    updatedOrder,
  };
}
