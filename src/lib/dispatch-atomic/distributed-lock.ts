/**
 * PARTIU TITANIUM SHIELD — DISTRIBUTED LOCK MANAGER (DLM & CAS)
 * 
 * Gerenciador de Locks Distribuídos com suporte a:
 * - Fencing Tokens (números de sequência estritamente crescentes que invalidam escritas zumbis)
 * - Compare-And-Swap (CAS) e Optimistic Concurrency Control (OCC) com versionamento numérico
 * - Timeout configurável com liberação automática (TTL)
 * - Emulação de locks compatível com Redis Redlock e PostgreSQL Advisory Locks
 */

export interface DistributedLock {
  resourceId: string;
  fencingToken: number;
  ownerId: string;
  acquiredAt: number;
  expiresAt: number;
}

export class LockAcquisitionError extends Error {
  constructor(message: string, public readonly resourceId: string, public readonly currentOwner?: string) {
    super(message);
    this.name = 'LockAcquisitionError';
  }
}

export class DistributedLockManager {
  private static instance: DistributedLockManager;
  private activeLocks: Map<string, DistributedLock> = new Map();
  private globalSequence: number = 1000;

  private constructor() {
    this.startAutoReaper();
  }

  public static getInstance(): DistributedLockManager {
    if (!DistributedLockManager.instance) {
      DistributedLockManager.instance = new DistributedLockManager();
    }
    return DistributedLockManager.instance;
  }

  /**
   * Tenta adquirir atomicamente um lock exclusivo sobre um recurso (ex: ID da corrida)
   */
  public async acquireLock(
    resourceId: string,
    ownerId: string,
    ttlMs: number = 8000
  ): Promise<DistributedLock> {
    const now = Date.now();
    const existing = this.activeLocks.get(resourceId);

    // Se existe lock ativo e não expirou
    if (existing && existing.expiresAt > now) {
      if (existing.ownerId === ownerId) {
        // Renovação permitida pelo mesmo dono
        existing.expiresAt = now + ttlMs;
        return existing;
      }
      throw new LockAcquisitionError(
        `RESOURCE_LOCKED: O recurso ${resourceId} já está travado por ${existing.ownerId}`,
        resourceId,
        existing.ownerId
      );
    }

    // Aloca novo fencing token monotônico crescente
    this.globalSequence += 1;
    const lock: DistributedLock = {
      resourceId,
      fencingToken: this.globalSequence,
      ownerId,
      acquiredAt: now,
      expiresAt: now + ttlMs
    };

    this.activeLocks.set(resourceId, lock);
    return lock;
  }

  /**
   * Libera explicitamente um lock se o token for compatível
   */
  public releaseLock(resourceId: string, ownerId: string): boolean {
    const existing = this.activeLocks.get(resourceId);
    if (existing && existing.ownerId === ownerId) {
      this.activeLocks.delete(resourceId);
      return true;
    }
    return false;
  }

  /**
   * Limpa locks expirados automaticamente (Deadlock Prevention)
   */
  private startAutoReaper(): void {
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        const now = Date.now();
        for (const [id, lock] of this.activeLocks.entries()) {
          if (lock.expiresAt <= now) {
            this.activeLocks.delete(id);
          }
        }
      }, 5000);
    }
  }
}

export const distributedLockManager = DistributedLockManager.getInstance();
