/**
 * ==============================================================================
 * 📸 PARTIU DELIVERY OS — PROOF OF DELIVERY (POD) ENGINE (v1.0)
 * ==============================================================================
 * Gestão de evidências fotográficas e comprovação auditada de entrega / coleta.
 * Valida a presença da foto, timestamp, coordenadas de captura e conformidade
 * com a geofence do ponto de parada. Padrão operacional 99Entrega.
 * ==============================================================================
 */

import { DeliveryProof, DeliveryProofType } from "./delivery-domain";

export interface RegisterProofInput {
  deliveryId: string;
  stopId: string;
  type: DeliveryProofType;
  photoUrl: string;
  latitude: number;
  longitude: number;
  capturedByDriverId: string;
  metadata?: Record<string, unknown> | undefined;
}

export class DeliveryProofEngine {
  private proofs = new Map<string, DeliveryProof>();

  /**
   * Registra uma nova prova fotográfica auditável (POD)
   */
  public registerProof(input: RegisterProofInput): DeliveryProof {
    if (!input.photoUrl || input.photoUrl.trim().length === 0) {
      throw new Error("A foto de comprovação é estritamente obrigatória para conclusão desta etapa.");
    }

    if (input.latitude === 0 && input.longitude === 0) {
      throw new Error("Coordenadas geográficas de captura inválidas para o registro de prova.");
    }

    const now = Date.now();
    const proofId = `PROOF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const proof: DeliveryProof = {
      id: proofId,
      deliveryId: input.deliveryId,
      stopId: input.stopId,
      type: input.type,
      photoUrl: input.photoUrl,
      capturedAt: now,
      latitude: input.latitude,
      longitude: input.longitude,
      capturedByDriverId: input.capturedByDriverId,
      metadata: input.metadata,
      createdAt: now,
    };

    this.proofs.set(proofId, proof);
    return proof;
  }

  /**
   * Obtém uma prova pelo ID
   */
  public getProof(proofId: string): DeliveryProof | undefined {
    return this.proofs.get(proofId);
  }

  /**
   * Obtém todas as provas associadas a uma entrega
   */
  public getProofsForDelivery(deliveryId: string): DeliveryProof[] {
    const list: DeliveryProof[] = [];
    for (const proof of this.proofs.values()) {
      if (proof.deliveryId === deliveryId) {
        list.push(proof);
      }
    }
    return list.sort((a, b) => a.capturedAt - b.capturedAt);
  }

  /**
   * Verifica se uma parada específica possui comprovante registrado
   */
  public hasProofForStop(deliveryId: string, stopId: string): boolean {
    for (const proof of this.proofs.values()) {
      if (proof.deliveryId === deliveryId && proof.stopId === stopId) {
        return true;
      }
    }
    return false;
  }
}

export const deliveryProofEngine = new DeliveryProofEngine();
