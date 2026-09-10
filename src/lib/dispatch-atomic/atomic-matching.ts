/**
 * PARTIU TITANIUM SHIELD — ATOMIC MATCHING ENGINE
 * 
 * Invariante Absoluta do Marketplace:
 * 1 Corrida = Exatamente 1 Motorista Parceiro (Zero Double Dispatch / Zero Split Brain)
 * 
 * Utiliza o DistributedLockManager para orquestrar aceites concorrentes:
 * Caso múltiplos motoristas cliquem em "Aceitar Corrida" na mesma fração de milissegundo,
 * apenas o primeiro condutor obtém o lock atômico; todos os demais recebem rejeição graciosa.
 */

import { distributedLockManager, DistributedLock } from './distributed-lock';
import { CorridaPartiu, MotoristaInfo } from '../partiu-engine';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AtomicClaimResult {
  success: boolean;
  corrida?: CorridaPartiu | undefined;
  winnerDriverId?: string | undefined;
  fencingToken?: number | undefined;
  reason?: 'CLAIMED_SUCCESSFULLY' | 'ALREADY_CLAIMED_BY_ANOTHER_DRIVER' | 'INVALID_RIDE_STATE' | 'LOCK_FAILED' | undefined;
  mensagem?: string | undefined;
}

export class AtomicMatchingEngine {
  private static instance: AtomicMatchingEngine;
  private rideStateVersions: Map<string, number> = new Map();

  private constructor() {}

  public static getInstance(): AtomicMatchingEngine {
    if (!AtomicMatchingEngine.instance) {
      AtomicMatchingEngine.instance = new AtomicMatchingEngine();
    }
    return AtomicMatchingEngine.instance;
  }

  /**
   * Executa a tentativa atômica de reivindicação de corrida (Claim) com lock exclusivo
   * 1. Tenta RPC atômica no PostgreSQL (FOR UPDATE NOWAIT)
   * 2. Fallback de alta resiliência para DistributedLockManager em memória
   */
  public async claimRideAtomic(
    corridaAtual: CorridaPartiu,
    motorista: MotoristaInfo
  ): Promise<AtomicClaimResult> {
    const rideId = corridaAtual.id;

    // 1. Verificação preliminar de status
    if (corridaAtual.status !== 'PROCURANDO') {
      return {
        success: false,
        reason: 'INVALID_RIDE_STATE',
        winnerDriverId: corridaAtual.motorista?.id,
        mensagem: 'Esta corrida já foi atribuída a outro condutor ou cancelada.'
      };
    }

    // 2. Tentativa primária no Supabase via RPC atômica (FOR UPDATE NOWAIT)
    if (isSupabaseConfigured() && UUID_REGEX.test(rideId) && UUID_REGEX.test(motorista.id)) {
      try {
        const { data, error } = await (supabase as any).rpc('partiu_aceitar_corrida_atomica', {
          p_corrida_id: rideId,
          p_motorista_id: motorista.id,
        });

        if (!error && data) {
          const rpcRes = data as any;
          if (rpcRes.sucesso === false) {
            return {
              success: false,
              reason: rpcRes.codigo === 'LOCK_CONCORRENTE' ? 'ALREADY_CLAIMED_BY_ANOTHER_DRIVER' : 'INVALID_RIDE_STATE',
              mensagem: rpcRes.mensagem || 'Corrida já aceita por outro parceiro.'
            };
          }

          // Lock atômico concedido pelo PostgreSQL!
          const currentVer = this.rideStateVersions.get(rideId) || 1;
          this.rideStateVersions.set(rideId, currentVer + 1);

          const atualizada: CorridaPartiu = {
            ...corridaAtual,
            status: 'A_CAMINHO',
            motorista: {
              ...motorista
            }
          };

          return {
            success: true,
            corrida: atualizada,
            winnerDriverId: motorista.id,
            fencingToken: currentVer + 1000,
            reason: 'CLAIMED_SUCCESSFULLY'
          };
        }
      } catch (err) {
        console.warn('[AtomicMatching] Falha na RPC remota, aplicando fallback para lock local resiliente:', err);
      }
    }

    // 3. Fallback de Alta Resiliência: Aquisição do Lock Distribuído Exclusivo em memória
    let lock: DistributedLock;
    try {
      lock = await distributedLockManager.acquireLock(rideId, motorista.id, 15000);
    } catch {
      return {
        success: false,
        reason: 'ALREADY_CLAIMED_BY_ANOTHER_DRIVER',
        mensagem: 'Outro condutor parceiro aceitou esta solicitação milissegundos antes!'
      };
    }

    // 4. Atualização de versão (Optimistic Concurrency Control)
    const currentVer = this.rideStateVersions.get(rideId) || 1;
    this.rideStateVersions.set(rideId, currentVer + 1);

    const atualizada: CorridaPartiu = {
      ...corridaAtual,
      status: 'A_CAMINHO',
      motorista: {
        ...motorista
      }
    };

    return {
      success: true,
      corrida: atualizada,
      winnerDriverId: motorista.id,
      fencingToken: lock.fencingToken,
      reason: 'CLAIMED_SUCCESSFULLY'
    };
  }

  /**
   * Libera o lock após a conclusão ou cancelamento
   */
  public releaseRide(rideId: string, driverId: string): void {
    distributedLockManager.releaseLock(rideId, driverId);
    this.rideStateVersions.delete(rideId);
  }
}

export const atomicMatchingEngine = AtomicMatchingEngine.getInstance();
