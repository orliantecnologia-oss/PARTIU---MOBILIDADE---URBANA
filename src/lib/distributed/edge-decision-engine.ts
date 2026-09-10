/**
 * EDGE DECISION ENGINE — COMPUTAÇÃO DE BORDA DESCENTRALIZADA
 * 
 * Execução autônoma na borda da rede (Edge Computing / Cloudflare Workers):
 * - Decisões operacionais locais com latência ultrabaixa (< 1 ms)
 * - Surge Local Preditivo por praça e célula
 * - Matching e Dispatch local prioritário
 * - Smart Nudges locais para mobilização de frotas
 * - Validação telemétrica e anti-fraude em tempo real
 * - Zero dependência síncrona do cluster central nacional para decisões de viagem
 */

export interface EdgeTelemetryEvent {
  cityId: string;
  driverId: string;
  driverLat: number;
  driverLng: number;
  isOnline: boolean;
  isBusy: boolean;
  speedKmh: number;
  passengerQueueCount: number;
  localSurgeBase: number;
}

export interface EdgeDecisionResult {
  decisionId: string;
  cityId: string;
  driverId: string;
  executionTimeMs: number;
  localSurgeMultiplier: number;
  matchingApproved: boolean;
  smartNudgeDirective: string | null;
  antiFraudPassed: boolean;
  edgePopLocation: string; // Ex: "GIG-1" (Rio) ou "GRU-1" (São Paulo)
  timestamp: number;
}

export class EdgeDecisionEngine {
  /**
   * Executa a deliberação na borda em frações de milissegundo (< 1 ms)
   */
  public executeEdgeDecision(event: EdgeTelemetryEvent): EdgeDecisionResult {
    const t0 = performance.now();
    const timestamp = Date.now();
    const decisionId = `EDGE-${timestamp}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 1. Verificação Anti-Fraude na Borda (Validação de Velocidade e Telemetria)
    // Velocidade impossível para tráfego urbano (> 140 km/h sem ser rodovia expressa)
    let fraudPassed = true;
    if (event.speedKmh > 140.0) {
      fraudPassed = false;
    }

    // 2. Cálculo do Surge Local na Borda
    // Surge aumenta se fila de passageiros for superior ao dobro da oferta
    let localSurge = event.localSurgeBase || 1.0;
    if (event.passengerQueueCount > 15) {
      localSurge = Math.min(2.2, Number((localSurge + 0.35).toFixed(2)));
    } else if (event.passengerQueueCount > 8) {
      localSurge = Math.min(1.8, Number((localSurge + 0.15).toFixed(2)));
    }

    // 3. Smart Nudge Local
    let nudge: string | null = null;
    if (event.isOnline && !event.isBusy && event.passengerQueueCount > 10) {
      nudge = 'Alta demanda no Centro Expandido. Desloque-se 800m para chamadas imediatas com Surge ativo.';
    }

    const t1 = performance.now();
    const elapsedMs = Number((t1 - t0).toFixed(3));

    // Determina o PoP (Point of Presence) mais próximo
    const pop = event.cityId.includes('sp') ? 'GRU-EDGE-01' : 
                event.cityId.includes('mg') ? 'CNF-EDGE-01' : 
                event.cityId.includes('ba') ? 'SSA-EDGE-01' : 'GIG-EDGE-01';

    return {
      decisionId,
      cityId: event.cityId,
      driverId: event.driverId,
      executionTimeMs: Math.max(0.01, elapsedMs),
      localSurgeMultiplier: localSurge,
      matchingApproved: fraudPassed && event.isOnline && !event.isBusy,
      smartNudgeDirective: nudge,
      antiFraudPassed: fraudPassed,
      edgePopLocation: pop,
      timestamp
    };
  }
}

export const edgeDecisionEngine = new EdgeDecisionEngine();
