/**
 * REGIONAL STREAM PROCESSOR
 * 
 * Processador de fluxos de eventos em tempo real:
 * - Janelas deslizantes (tumbling / sliding windows)
 * - Detecção instantânea de anomalias operacionais
 * - Cálculo de médias móveis de demanda e velocidade
 */

export interface StreamAnomalyAlert {
  anomalyId: string;
  metricName: string;
  cityId: string;
  currentValue: number;
  expectedThreshold: number;
  deviationSigma: number;
  detectedAt: number;
}

export class StreamProcessorEngine {
  private windowValues: number[] = [];
  private maxWindowSize: number = 100;

  public ingestValue(value: number): void {
    this.windowValues.push(value);
    if (this.windowValues.length > this.maxWindowSize) {
      this.windowValues.shift();
    }
  }

  public getMovingAverage(): number {
    if (this.windowValues.length === 0) return 0;
    const sum = this.windowValues.reduce((acc, v) => acc + v, 0);
    return Number((sum / this.windowValues.length).toFixed(2));
  }

  public detectAnomalies(cityId: string, currentRate: number, expectedBaseRate: number): StreamAnomalyAlert | null {
    const deviation = Math.abs(currentRate - expectedBaseRate) / Math.max(1, expectedBaseRate);
    if (deviation > 0.65) {
      return {
        anomalyId: `ANOM-${Date.now()}`,
        metricName: 'DEMANDA_PICO_ANOMALO',
        cityId,
        currentValue: currentRate,
        expectedThreshold: expectedBaseRate * 1.65,
        deviationSigma: Number((deviation * 2.5).toFixed(1)),
        detectedAt: Date.now()
      };
    }
    return null;
  }
}

export const streamProcessorEngine = new StreamProcessorEngine();
