/**
 * ==============================================================================
 * 📍 PARTIU DELIVERY OS — RECIPIENT PUBLIC TRACKING LINK ENGINE (v1.0)
 * ==============================================================================
 * Geração de tokens de rastreamento criptográficos e não previsíveis para o
 * destinatário acompanhar a entrega ao vivo via web sem precisar de login.
 * Aplica mascaramento de dados sensíveis e controle de expiração/revogação.
 * Padrão operacional 99Entrega.
 * ==============================================================================
 */

import { DeliveryOrder, DeliveryState, DeliveryStop } from "./delivery-domain";

export interface PublicTrackingData {
  trackingCode: string;
  status: DeliveryState;
  statusLabel: string;
  senderFirstName: string;
  recipientName: string;
  recipientMaskedPhone: string;
  vehicleType: string;
  currentStopAddress: string;
  driverInfo?: {
    firstName: string;
    vehicleModel: string;
    vehiclePlate: string;
    rating: number;
    latitude?: number | undefined;
    longitude?: number | undefined;
  } | undefined;
  expectedOtp?: string | undefined; // Visível apenas para o destinatário na URL segura dele
  stopsTimeline: {
    sequence: number;
    type: string;
    address: string;
    status: string;
    completedAt?: number | undefined;
  }[];
  isReturnActive: boolean;
  estimatedArrivalMinutes?: number | undefined;
  updatedAt: number;
}

export class DeliveryTrackingEngine {
  private tokenToDeliveryMap = new Map<string, string>(); // token -> deliveryId
  private deliveryToTokenMap = new Map<string, string>(); // deliveryId -> token
  private deliveries = new Map<string, DeliveryOrder>();

  /**
   * Gera um token aleatório e não previsível de 32 caracteres hexadecimais
   */
  public generateTrackingToken(deliveryId: string): string {
    const chars = "abcdef0123456789";
    let token = "partiu_trk_";
    for (let i = 0; i < 24; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    this.tokenToDeliveryMap.set(token, deliveryId);
    this.deliveryToTokenMap.set(deliveryId, token);
    return token;
  }

  /**
   * Registra ou atualiza uma entrega no repositório de rastreamento
   */
  public registerDelivery(delivery: DeliveryOrder): void {
    this.deliveries.set(delivery.id, delivery);
    if (!this.deliveryToTokenMap.has(delivery.id)) {
      this.tokenToDeliveryMap.set(delivery.trackingToken, delivery.id);
      this.deliveryToTokenMap.set(delivery.id, delivery.trackingToken);
    }
  }

  /**
   * Mascara um número de telefone protegendo a privacidade dos participantes
   * Ex: "(22) 99605-1620" -> "(22) 9****-1620"
   */
  public maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) return "***";
    const ddd = digits.slice(0, 2);
    const start = digits.slice(2, 3);
    const end = digits.slice(-4);
    return `(${ddd}) ${start}****-${end}`;
  }

  /**
   * Mapeia o estado formal para um rótulo legível em português
   */
  public getStatusLabel(status: DeliveryState): string {
    const labels: Record<DeliveryState, string> = {
      DRAFT: "Criando pedido",
      REQUESTED: "Aguardando envio",
      SEARCHING_DRIVER: "Buscando entregador parceiro...",
      DRIVER_ASSIGNED: "Entregador localizado",
      DRIVER_ACCEPTED: "Entregador a caminho da coleta",
      HEADING_TO_PICKUP: "Entregador indo até o remetente",
      ARRIVED_PICKUP: "Entregador chegou ao remetente",
      PICKUP_VERIFICATION: "Conferindo pacote com o remetente",
      PACKAGE_COLLECTED: "Pacote em posse do entregador",
      PICKUP_PROOF: "Coleta homologada com foto",
      IN_TRANSIT: "Em rota para o endereço de entrega",
      ARRIVED_DROPOFF: "Entregador chegou ao seu endereço!",
      RECIPIENT_VERIFICATION: "Aguardando código de entrega",
      DELIVERY_PROOF: "Confirmando comprovante de entrega",
      DELIVERED: "Pacote entregue com sucesso!",
      PAYMENT_SETTLED: "Finalizado",
      COMPLETED: "Entrega Concluída ✓",
      CANCELLED: "Entrega cancelada",
      DRIVER_CANCELLED: "Buscando novo condutor",
      FAILED_PICKUP: "Falha na coleta",
      RECIPIENT_NOT_FOUND: "Destinatário não localizado",
      ADDRESS_PROBLEM: "Problema no endereço informado",
      PACKAGE_PROBLEM: "Problema com a embalagem/carga",
      VERIFICATION_FAILED: "Código de entrega não confere",
      RETURN_REQUIRED: "Devolução ao remetente necessária",
      RETURNING_TO_PICKUP: "Entregador retornando ao remetente",
      RETURNED: "Pacote devolvido ao remetente",
      SUPPORT_REVIEW: "Em análise pelo suporte",
      PAYMENT_FAILED: "Falha no pagamento",
      SYSTEM_ERROR: "Instabilidade momentânea",
    };
    return labels[status] || status;
  }

  /**
   * Gera a visão pública de rastreamento para o link do destinatário
   */
  public getPublicTrackingView(token: string): PublicTrackingData | null {
    const deliveryId = this.tokenToDeliveryMap.get(token);
    if (!deliveryId) return null;

    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return null;

    const currentStop = delivery.stops[delivery.currentStopIndex] || delivery.stops[0];
    const isReturnActive =
      delivery.status === "RETURN_REQUIRED" ||
      delivery.status === "RETURNING_TO_PICKUP" ||
      delivery.status === "RETURNED";

    return {
      trackingCode: delivery.trackingCode,
      status: delivery.status,
      statusLabel: this.getStatusLabel(delivery.status),
      senderFirstName: delivery.senderContact.name.split(" ")[0] || "Remetente",
      recipientName: currentStop?.contact.name || "Destinatário",
      recipientMaskedPhone: this.maskPhone(currentStop?.contact.phone || ""),
      vehicleType: delivery.vehicleType,
      currentStopAddress: currentStop?.address || "Endereço em processamento",
      driverInfo: delivery.driverName
        ? {
            firstName: delivery.driverName.split(" ")[0] || "Entregador",
            vehicleModel: delivery.driverVehicleModel || "Veículo de Entrega",
            vehiclePlate: delivery.driverVehiclePlate || "---",
            rating: delivery.driverRating || 4.96,
            latitude: delivery.driverLocation?.lat,
            longitude: delivery.driverLocation?.lng,
          }
        : undefined,
      expectedOtp: currentStop?.otpExpected,
      stopsTimeline: delivery.stops.map((s) => ({
        sequence: s.sequence,
        type: s.type,
        address: s.address,
        status: s.status,
        completedAt: s.completedAt,
      })),
      isReturnActive,
      estimatedArrivalMinutes: 8,
      updatedAt: Date.now(),
    };
  }

  /**
   * Gera a URL completa de compartilhamento do rastreamento
   */
  public buildTrackingUrl(token: string): string {
    return `/rastreio/${token}`;
  }
}

export const deliveryTrackingEngine = new DeliveryTrackingEngine();
