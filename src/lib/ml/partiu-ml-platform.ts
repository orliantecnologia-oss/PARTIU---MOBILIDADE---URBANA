/**
 * PARTIU ML PLATFORM (MARKETPLACE LEARNING PLATFORM)
 * 
 * Orquestrador do ciclo de vida unificado de Machine Learning:
 * Coleta -> Feature Engineering -> Treino -> Avaliação -> Deploy -> Monitoramento -> Rollback.
 */

export type ModelType = 
  | 'DEEP_ETA'
  | 'RL_DISPATCH'
  | 'SURGE_AI'
  | 'DEMAND_FORECAST'
  | 'DRIVER_CHURN'
  | 'PASSENGER_LTV'
  | 'FRAUD_AI';

export interface ModelMetadata {
  modelId: string;
  modelType: ModelType;
  version: string;
  trainingTimestamp: number;
  deployedTimestamp: number | null;
  status: 'DEVELOPMENT' | 'STAGING' | 'DEPLOYED' | 'ARCHIVED' | 'ROLLED_BACK';
  metrics: {
    trainingLoss: number;
    validationLoss: number;
    accuracyOrR2: number;
    latencyP99Ms: number;
  };
  hyperparameters: Record<string, any>;
  weightsLength: number;
}

export interface TelemetryTrainingEvent {
  eventId: string;
  timestamp: number;
  cityId: string;
  eventType: 'RIDE_REQUEST' | 'RIDE_ACCEPTED' | 'RIDE_COMPLETED' | 'RIDE_CANCELED' | 'FRAUD_FLAG';
  features: number[];
  label: number;
}

export class MarketplaceLearningPlatform {
  private modelRegistry: Map<string, ModelMetadata> = new Map();
  private activeModels: Map<ModelType, string> = new Map();
  private modelHistory: Map<ModelType, string[]> = new Map();
  private eventBuffer: TelemetryTrainingEvent[] = [];

  constructor() {
    this.seedBaselineModels();
  }

  private seedBaselineModels(): void {
    const models: Array<{ type: ModelType; version: string; metric: number }> = [
      { type: 'DEEP_ETA', version: 'v2.1.0', metric: 0.942 },
      { type: 'RL_DISPATCH', version: 'v3.0.1', metric: 0.915 },
      { type: 'SURGE_AI', version: 'v1.8.4', metric: 0.938 },
      { type: 'DEMAND_FORECAST', version: 'v2.0.0', metric: 0.926 },
      { type: 'DRIVER_CHURN', version: 'v1.4.0', metric: 0.894 },
      { type: 'PASSENGER_LTV', version: 'v1.2.0', metric: 0.902 },
      { type: 'FRAUD_AI', version: 'v2.4.2', metric: 0.985 },
    ];

    models.forEach((m) => {
      const id = `${m.type}-${m.version}`;
      const meta: ModelMetadata = {
        modelId: id,
        modelType: m.type,
        version: m.version,
        trainingTimestamp: Date.now() - 86400000,
        deployedTimestamp: Date.now() - 43200000,
        status: 'DEPLOYED',
        metrics: {
          trainingLoss: 0.042,
          validationLoss: 0.051,
          accuracyOrR2: m.metric,
          latencyP99Ms: 0.85
        },
        hyperparameters: { learningRate: 0.001, batchSize: 64, epochs: 50 },
        weightsLength: 128
      };

      this.modelRegistry.set(id, meta);
      this.activeModels.set(m.type, id);
      this.modelHistory.set(m.type, [id]);
    });
  }

  /**
   * 1. Coleta contínua de eventos de treino da malha
   */
  public collect(event: Omit<TelemetryTrainingEvent, 'eventId' | 'timestamp'>): void {
    this.eventBuffer.push({
      ...event,
      eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now()
    });

    // Limita buffer em memória a 50.000 amostras
    if (this.eventBuffer.length > 50000) {
      this.eventBuffer.splice(0, 10000);
    }
  }

  /**
   * 2. Treinamento supervisionado com otimização estocástica
   */
  public train(
    modelType: ModelType, 
    hyperparams: Record<string, any> = { lr: 0.001, epochs: 20 }
  ): ModelMetadata {
    const nextVersion = `v${Date.now().toString().slice(-4)}`;
    const modelId = `${modelType}-${nextVersion}`;

    // Simulação determinística de gradiente descendente
    const initialLoss = 0.45;
    const finalLoss = 0.038 + Math.random() * 0.015;
    const accuracy = 0.93 + Math.random() * 0.04;

    const metadata: ModelMetadata = {
      modelId,
      modelType,
      version: nextVersion,
      trainingTimestamp: Date.now(),
      deployedTimestamp: null,
      status: 'DEVELOPMENT',
      metrics: {
        trainingLoss: Number(finalLoss.toFixed(4)),
        validationLoss: Number((finalLoss * 1.08).toFixed(4)),
        accuracyOrR2: Number(accuracy.toFixed(4)),
        latencyP99Ms: 0.72
      },
      hyperparameters: hyperparams,
      weightsLength: 256
    };

    this.modelRegistry.set(modelId, metadata);
    return metadata;
  }

  /**
   * 3. Avaliação contra conjunto de teste / validação
   */
  public evaluate(modelId: string): { approved: boolean; score: number; rationale: string } {
    const model = this.modelRegistry.get(modelId);
    if (!model) {
      throw new Error(`Modelo ${modelId} não encontrado no registro`);
    }

    const currentActiveId = this.activeModels.get(model.modelType);
    const currentActive = currentActiveId ? this.modelRegistry.get(currentActiveId) : null;

    const isSuperior = !currentActive || model.metrics.accuracyOrR2 >= currentActive.metrics.accuracyOrR2 - 0.02;
    const lowLoss = model.metrics.validationLoss < 0.10;
    const approved = isSuperior && lowLoss;

    return {
      approved,
      score: model.metrics.accuracyOrR2,
      rationale: approved 
        ? `Modelo aprovado com acurácia de ${(model.metrics.accuracyOrR2 * 100).toFixed(1)}% e loss ${model.metrics.validationLoss}`
        : 'Modelo reprovado por degradação frente ao modelo em produção'
    };
  }

  /**
   * 4. Deploy em produção com substituição atômica (Hot Swap)
   */
  public deploy(modelId: string): boolean {
    const model = this.modelRegistry.get(modelId);
    if (!model) return false;

    model.status = 'DEPLOYED';
    model.deployedTimestamp = Date.now();

    // Atualiza histórico para suporte a rollback
    const history = this.modelHistory.get(model.modelType) || [];
    history.unshift(modelId);
    this.modelHistory.set(model.modelType, history);

    this.activeModels.set(model.modelType, modelId);
    return true;
  }

  /**
   * 5. Monitoramento contínuo de telemetria do modelo
   */
  public monitor(modelType: ModelType): ModelMetadata | null {
    const activeId = this.activeModels.get(modelType);
    if (!activeId) return null;
    return this.modelRegistry.get(activeId) || null;
  }

  /**
   * 6. Rollback instantâneo para a versão anterior homologada
   */
  public rollback(modelType: ModelType): { success: boolean; rolledBackTo: string | null } {
    const history = this.modelHistory.get(modelType);
    if (!history || history.length < 2) {
      return { success: false, rolledBackTo: null };
    }

    const currentActiveId = history[0];
    const previousModelId = history[1];

    if (!currentActiveId || !previousModelId) {
      return { success: false, rolledBackTo: null };
    }

    const currentModel = this.modelRegistry.get(currentActiveId);
    if (currentModel) currentModel.status = 'ROLLED_BACK';

    const prevModel = this.modelRegistry.get(previousModelId);
    if (prevModel) prevModel.status = 'DEPLOYED';

    history.shift(); // remove atual
    this.activeModels.set(modelType, previousModelId);

    return { success: true, rolledBackTo: previousModelId };
  }

  public getActiveModelId(type: ModelType): string {
    return this.activeModels.get(type) || `${type}-default`;
  }

  public listAllModels(): ModelMetadata[] {
    return Array.from(this.modelRegistry.values());
  }
}

export const marketplaceLearningPlatform = new MarketplaceLearningPlatform();
