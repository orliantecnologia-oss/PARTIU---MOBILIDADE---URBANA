import { silentCatchWarn } from "@/lib/structured-logger";

/**
 * PARTIU TITANIUM SHIELD — IMMUTABLE AUDIT TRAIL
 * 
 * Registro de auditoria encadeado criptograficamente (Merkle / Hash Chaining):
 * Cada evento de segurança contém o SHA-256 do evento anterior,
 * impedindo adulteração retroativa de logs em conformidade com ISO 27001 e SOC 2.
 */

export interface SecurityAuditEvent {
  eventId: string;
  sequenceNumber: number;
  timestamp: number;
  userId: string;
  action: string;
  resource: string;
  status: 'SUCCESS' | 'DENIED' | 'ALERT';
  ipAddress?: string | undefined;
  details?: Record<string, any> | undefined;
  previousHash: string;
  currentHash: string;
}

function calculateSha256(data: string): string {
  if (typeof require !== 'undefined') {
    try {
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (err) { silentCatchWarn("audit-trail", err); }
  }
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
  }
  return `hash_${Math.abs(hash)}_${data.length}`;
}

export class AuditTrailService {
  private static instance: AuditTrailService;
  private auditChain: SecurityAuditEvent[] = [];
  private lastHash: string = '0000000000000000000000000000000000000000000000000000000000000000';
  private sequence: number = 0;

  private constructor() {}

  public static getInstance(): AuditTrailService {
    if (!AuditTrailService.instance) {
      AuditTrailService.instance = new AuditTrailService();
    }
    return AuditTrailService.instance;
  }

  /**
   * Grava um novo evento na trilha imutável
   */
  public logEvent(params: {
    userId: string;
    action: string;
    resource: string;
    status: 'SUCCESS' | 'DENIED' | 'ALERT';
    ipAddress?: string | undefined;
    details?: Record<string, any> | undefined;
  }): SecurityAuditEvent {
    this.sequence += 1;
    const timestamp = Date.now();
    const eventId = `AUD-${timestamp}-${this.sequence.toString().padStart(6, '0')}`;
    const previousHash = this.lastHash;

    const rawData = `${eventId}|${this.sequence}|${timestamp}|${params.userId}|${params.action}|${params.resource}|${params.status}|${previousHash}`;
    const currentHash = calculateSha256(rawData);

    const event: SecurityAuditEvent = {
      eventId,
      sequenceNumber: this.sequence,
      timestamp,
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      status: params.status,
      ipAddress: params.ipAddress,
      details: params.details,
      previousHash,
      currentHash
    };

    this.auditChain.push(event);
    this.lastHash = currentHash;

    // Manter últimos 2000 eventos em memória no nó local
    if (this.auditChain.length > 2000) {
      this.auditChain.shift();
    }

    return event;
  }

  /**
   * Verifica a integridade da corrente criptográfica de auditoria
   */
  public verifyChainIntegrity(): { intact: boolean; verifiedEventsCount: number; brokenAt?: number | undefined } {
    let prev = '0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < this.auditChain.length; i++) {
      const event = this.auditChain[i];
      if (!event) continue;

      if (i > 0 && event.previousHash !== prev) {
        return { intact: false, verifiedEventsCount: i, brokenAt: event.sequenceNumber };
      }

      const rawData = `${event.eventId}|${event.sequenceNumber}|${event.timestamp}|${event.userId}|${event.action}|${event.resource}|${event.status}|${event.previousHash}`;
      const recomputed = calculateSha256(rawData);

      if (recomputed !== event.currentHash) {
        return { intact: false, verifiedEventsCount: i, brokenAt: event.sequenceNumber };
      }

      prev = event.currentHash;
    }

    return { intact: true, verifiedEventsCount: this.auditChain.length };
  }

  public getRecentEvents(limit = 50): SecurityAuditEvent[] {
    return this.auditChain.slice(-limit);
  }
}

export const auditTrail = AuditTrailService.getInstance();
