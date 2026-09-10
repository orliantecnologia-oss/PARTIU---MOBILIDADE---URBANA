/**
 * PARTIU MOBILIDADE URBANA — DELIVERY TRACKING SERVICE
 * 
 * Provides public and private tracking lookups for recipients and senders.
 * Resolves tracking codes (e.g., PT-4829-EXP or FLS-928172), provides real-time
 * telemetry updates, and formats progress milestones.
 */

import {
  getActiveDeliverySession,
  getDeliveryTrackingInfo,
  type DeliverySession,
  type DeliveryTrackingInfo,
} from "./delivery-orchestrator";
import { getEncomendasStore, type EncomendaVan } from "../admin-data";

export interface DeliverySearchResult {
  found: boolean;
  trackingInfo?: DeliveryTrackingInfo | undefined;
  encomendaLegacy?: EncomendaVan | undefined;
  errorMessage?: string | undefined;
}

/**
 * Searches for an active or recorded delivery by tracking code or ID.
 * Supports:
 * - "PT-XXXX-EXP"
 * - "FLS-XXXXXX"
 * - "COR-XXXXXX"
 * - Plain numeric ID
 */
export function searchDeliveryByCode(rawCode: string): DeliverySearchResult {
  const query = rawCode.trim().toUpperCase();
  if (!query) {
    return { found: false, errorMessage: "Digite um código de rastreio válido." };
  }

  // 1. Check active session first
  const activeSession = getActiveDeliverySession();
  if (activeSession) {
    const tracking = getDeliveryTrackingInfo(activeSession);
    const idMatch = activeSession.id.toUpperCase().includes(query) || query.includes(activeSession.id.toUpperCase());
    const codeMatch = tracking.trackingCode.toUpperCase().includes(query) || query.includes(tracking.trackingCode.toUpperCase());
    const corridaMatch = activeSession.corridaId.toUpperCase().includes(query);

    if (idMatch || codeMatch || corridaMatch) {
      return {
        found: true,
        trackingInfo: tracking,
      };
    }
  }

  // 2. Check Encomendas Store (legacy and persistent store)
  const storeList = getEncomendasStore();
  const matched = storeList.find((item) => {
    const cMatch = item.codigoRastreio.toUpperCase().includes(query);
    const idMatch = item.id.toUpperCase().includes(query);
    const pinMatch = item.pinEntrega === query;
    return cMatch || idMatch || pinMatch;
  });

  if (matched) {
    // Construct tracking info from store item
    const legacyTracking: DeliveryTrackingInfo = {
      id: matched.id,
      trackingCode: matched.codigoRastreio,
      status:
        matched.status === "aguardando_coleta"
          ? "AGUARDANDO_COLETA"
          : matched.status === "a_caminho"
          ? "EM_ROTA_ENTREGA"
          : matched.status === "entregue"
          ? "ENTREGUE"
          : "SOLICITADO",
      statusLabel:
        matched.status === "aguardando_coleta"
          ? "Aguardando Coleta do Pacote"
          : matched.status === "a_caminho"
          ? "Em Transporte para Entrega"
          : matched.status === "entregue"
          ? "Pacote Entregue"
          : "Solicitação Recebida",
      senderName: matched.remetenteNome,
      recipientName: matched.destinatarioNome,
      recipientAddress: matched.destino,
      packageDescription: matched.descricao,
      courierName: matched.motoristaNome,
      pickupConfirmed: matched.status !== "aguardando_coleta",
      deliveryConfirmed: matched.status === "entregue",
      hasInsurance: true,
      shareableUrl: `https://partiu.mobi/rastreio/${matched.codigoRastreio}`,
      pickupOtp: matched.pinEntrega,
      deliveryOtp: matched.pinEntrega,
      progress:
        matched.status === "entregue"
          ? 100
          : matched.status === "a_caminho"
          ? 65
          : 25,
    };

    return {
      found: true,
      trackingInfo: legacyTracking,
      encomendaLegacy: matched,
    };
  }

  return {
    found: false,
    errorMessage: `Nenhum pacote encontrado com o código "${query}". Verifique e tente novamente.`,
  };
}

/**
 * React hook or listener helper for delivery status synchronization
 */
export function subscribeToDeliveryUpdates(
  callback: (session: DeliverySession | null) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleUpdate = (e: any) => {
    callback(e.detail);
  };

  window.addEventListener("partiu:delivery-atualizada", handleUpdate);
  return () => {
    window.removeEventListener("partiu:delivery-atualizada", handleUpdate);
  };
}
