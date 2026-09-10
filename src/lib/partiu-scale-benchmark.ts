/**
 * PARTIU NATIONAL SCALE BENCHMARK ENGINE
 * 
 * Simula e afere estresse computacional em escala nacional:
 * - 1 a 100 cidades simultâneas
 * - 100.000 a 1.000.000 de motoristas simultâneos
 * - Métricas: Throughput (ops/s), Memória (MB), Latência de Matching (ms), Percentis P50-P99.
 * 
 * Meta Arquitetural Uber/99: < 500ms para 1.000.000 de motoristas.
 */

import { H3SpatialEngine } from './partiu-h3-engine';

export interface NationalScaleBenchmarkResult {
  tamanhoFrota: number;
  totalCidades: number;
  tempoTotalMs: number;
  tempoPorMotoristaUs: number; // microssegundos
  throughputOpsSec: number;
  latenciaMatchingMs: {
    p50: number;
    p90: number;
    p99: number;
    max: number;
  };
  memoriaUtilizadaMb: number;
  status: 'EXCELENTE' | 'APROVADO' | 'DEGRADADO';
  metaAlcancada: boolean;
}

export class NationalScaleBenchmark {
  private h3 = new H3SpatialEngine();

  /**
   * Executa teste de estresse sintético parametrizado
   */
  public runBenchmark(totalMotoristas: number, totalCidades: number): NationalScaleBenchmarkResult {
    // Alocação de TypedArrays de alto desempenho para evitar GC pause em escala milionária
    const lats = new Float32Array(totalMotoristas);
    const lngs = new Float32Array(totalMotoristas);
    const scores = new Float32Array(totalMotoristas);
    const cityIds = new Uint8Array(totalMotoristas);

    const baseLat = -21.205;
    const baseLng = -41.888;

    // Inicialização de dados sintéticos
    for (let i = 0; i < totalMotoristas; i++) {
      cityIds[i] = i % totalCidades;
      lats[i] = baseLat + ((i % 1000) * 0.0005);
      lngs[i] = baseLng + (((i / 1000) | 0) * 0.0005);
      scores[i] = 70 + (i % 30);
    }

    const getMem = () => {
      try {
        return typeof process !== 'undefined' && process.memoryUsage ? process.memoryUsage().heapUsed : 0;
      } catch {
        return 0;
      }
    };

    const t0 = performance.now();
    const memBefore = getMem();

    // Simulação do Loop de Matching e Indexação Espacial
    // Cada condutor é avaliado por score com ponderação multicritério
    let matchedCandidates = 0;
    const sampleLat = -21.208;
    const sampleLng = -41.890;
    const matchingTimes: number[] = [];

    // Avalia 100 chamadas de matching de passageiros em praças aleatórias
    const numPassengerCalls = 100;
    for (let call = 0; call < numPassengerCalls; call++) {
      const callStart = performance.now();
      const targetCity = call % totalCidades;
      
      let bestScore = -1;
      let bestIdx = -1;

      // Scan de partição da cidade (spatial partition)
      const step = totalCidades;
      for (let i = targetCity; i < totalMotoristas; i += step) {
        const latI = lats[i] ?? 0;
        const lngI = lngs[i] ?? 0;
        const scoreI = scores[i] ?? 70;

        // Cálculo de distância manhattan / euclidiana ultrarrápida
        const dLat = latI - sampleLat;
        const dLng = lngI - sampleLng;
        const distSq = dLat * dLat + dLng * dLng;

        // Se dentro do raio de ~5km (0.0025 deg²)
        if (distSq < 0.0025) {
          const finalScore = scoreI - distSq * 1000;
          if (finalScore > bestScore) {
            bestScore = finalScore;
            bestIdx = i;
          }
        }
      }

      if (bestIdx !== -1) matchedCandidates++;
      matchingTimes.push(performance.now() - callStart);
    }

    // Avaliação global de scoring de 1M de motoristas para refresh de mapa
    for (let i = 0; i < totalMotoristas; i++) {
      const s = scores[i] ?? 70;
      const lt = lats[i] ?? 0;
      scores[i] = (s * 0.95) + (lt * 0.1);
    }

    const t1 = performance.now();
    const memAfter = getMem();
    const elapsedMs = t1 - t0;

    // Métricas de percentis das chamadas de matching
    matchingTimes.sort((a, b) => a - b);
    const p50 = matchingTimes[Math.floor(matchingTimes.length * 0.50)] ?? 0;
    const p90 = matchingTimes[Math.floor(matchingTimes.length * 0.90)] ?? 0;
    const p99 = matchingTimes[Math.min(matchingTimes.length - 1, Math.floor(matchingTimes.length * 0.99))] ?? 0;
    const max = matchingTimes[matchingTimes.length - 1] ?? 0;

    const throughput = Math.round((totalMotoristas / Math.max(1, elapsedMs)) * 1000);
    const usPerDriver = Number(((elapsedMs / totalMotoristas) * 1000).toFixed(2));
    const memUsedMb = Math.max(1, Math.round((memAfter - memBefore) / (1024 * 1024)));

    const metaAlcancada = elapsedMs < 500;
    let status: NationalScaleBenchmarkResult['status'] = 'EXCELENTE';
    if (!metaAlcancada && elapsedMs > 1000) status = 'DEGRADADO';
    else if (!metaAlcancada) status = 'APROVADO';

    return {
      tamanhoFrota: totalMotoristas,
      totalCidades,
      tempoTotalMs: Number(elapsedMs.toFixed(2)),
      tempoPorMotoristaUs: usPerDriver,
      throughputOpsSec: throughput,
      latenciaMatchingMs: {
        p50: Number(p50.toFixed(3)),
        p90: Number(p90.toFixed(3)),
        p99: Number(p99.toFixed(3)),
        max: Number(max.toFixed(3))
      },
      memoriaUtilizadaMb: memUsedMb,
      status,
      metaAlcancada
    };
  }
}

export const nationalScaleBenchmark = new NationalScaleBenchmark();
