/**
 * PARTIU GRAPH AI V2 — INTERCITY MULTI-LAYER GRAPH ENGINE
 * 
 * Grafo Viário e Logístico Multi-Camada:
 * - Camada 1: Mobilidade Urbana (ruas locais, tráfego intra-urbano)
 * - Camada 2: Transporte Regional (rodovias arteriais, conexões entre cidades)
 * - Camada 3: Logística de Cargas (restrições de tonelagem, pedágios, desvios)
 * - Camada 4: Hubs de Distribuição & Terminais (pontos de transbordo, cross-docking)
 * 
 * Capaz de calcular rotas sob 4 funções objetivo:
 * - MENOR_TEMPO (minutos)
 * - MENOR_CUSTO (reais)
 * - MAIOR_RENTABILIDADE (margem líquida)
 * - MENOR_EMISSAO (gramas de CO2)
 */

import { MultimodalType } from '../multimodal/multimodal-network-engine';

export type GraphLayerType =
  | 'CAMADA_1_MOBILIDADE_URBANA'
  | 'CAMADA_2_TRANSPORTE_REGIONAL'
  | 'CAMADA_3_LOGISTICA'
  | 'CAMADA_4_HUBS_DISTRIBUICAO';

export type RoutingObjective =
  | 'MENOR_TEMPO'
  | 'MENOR_CUSTO'
  | 'MAIOR_RENTABILIDADE'
  | 'MENOR_EMISSAO';

export interface MultiLayerNode {
  nodeId: string;
  name: string;
  cityId: string;
  layer: GraphLayerType;
  latitude: number;
  longitude: number;
  isHubOrTerminal: boolean;
}

export interface MultiLayerEdge {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  layer: GraphLayerType;
  distanceKm: number;
  freeFlowSpeedKmh: number;
  currentFrictionFactor: number; // 1.0 (livre) a 2.5 (congestionado)
  tollCostBrl: number;
  pavementQualityIndex: number; // 1.0 (ótimo) a 0.5 (ruim)
  fuelConsumptionFactor: number; // litros/km
  co2EmissionFactorGramsPerKm: number;
  allowedModalities: MultimodalType[];
}

export interface MultiLayerRouteResult {
  routeId: string;
  objective: RoutingObjective;
  pathNodes: MultiLayerNode[];
  pathEdges: MultiLayerEdge[];
  layersCrossed: GraphLayerType[];
  totalDistanceKm: number;
  estimatedDurationMinutes: number;
  totalCostBrl: number;
  projectedRevenueBrl: number;
  projectedProfitBrl: number;
  estimatedCo2EmissionsGrams: number;
  carbonEcoRating: 'A+' | 'A' | 'B' | 'C';
}

export class IntercityGraphEngine {
  private nodes: Map<string, MultiLayerNode> = new Map();
  private edges: Map<string, MultiLayerEdge[]> = new Map();

  constructor() {
    this.initializeRegionalIntercityGraph();
  }

  /**
   * Inicializa o grafo regional interligando Noroeste Fluminense, Norte Fluminense,
   * Região dos Lagos, Zona da Mata Mineira e Sul Capixaba.
   */
  private initializeRegionalIntercityGraph(): void {
    const defaultNodes: MultiLayerNode[] = [
      // Nós de Hub / Terminais (Camada 4)
      { nodeId: 'NODE-HUB-ITA', name: 'Hub Central Itaperuna (BR-356)', cityId: 'itaperuna-rj', layer: 'CAMADA_4_HUBS_DISTRIBUICAO', latitude: -21.198, longitude: -41.875, isHubOrTerminal: true },
      { nodeId: 'NODE-HUB-CMP', name: 'Hub Integrado Campos dos Goytacazes (BR-101)', cityId: 'campos-rj', layer: 'CAMADA_4_HUBS_DISTRIBUICAO', latitude: -21.761, longitude: -41.332, isHubOrTerminal: true },
      { nodeId: 'NODE-HUB-MAC', name: 'Hub Offshore & Cargas Macaé (BR-101/RJ-168)', cityId: 'macae-rj', layer: 'CAMADA_4_HUBS_DISTRIBUICAO', latitude: -22.376, longitude: -41.784, isHubOrTerminal: true },
      { nodeId: 'NODE-HUB-MUR', name: 'Hub Logístico Muriaé (BR-356/BR-116)', cityId: 'muriae-mg', layer: 'CAMADA_4_HUBS_DISTRIBUICAO', latitude: -21.134, longitude: -42.368, isHubOrTerminal: true },
      { nodeId: 'NODE-HUB-JFO', name: 'Terminal Intermodal Juiz de Fora (BR-040)', cityId: 'juiz-de-fora-mg', layer: 'CAMADA_4_HUBS_DISTRIBUICAO', latitude: -21.764, longitude: -43.349, isHubOrTerminal: true },
      { nodeId: 'NODE-HUB-CAC', name: 'Terminal Sul Capixaba Cachoeiro (BR-101/ES-482)', cityId: 'cachoeiro-es', layer: 'CAMADA_4_HUBS_DISTRIBUICAO', latitude: -20.848, longitude: -41.112, isHubOrTerminal: true },
      { nodeId: 'NODE-HUB-CBF', name: 'Hub Lagos Cabo Frio (RJ-140/RJ-106)', cityId: 'cabo-frio-rj', layer: 'CAMADA_4_HUBS_DISTRIBUICAO', latitude: -22.889, longitude: -42.028, isHubOrTerminal: true },
      { nodeId: 'NODE-HUB-RDO', name: 'Hub Rio das Ostras (RJ-106)', cityId: 'rio-das-ostras-rj', layer: 'CAMADA_4_HUBS_DISTRIBUICAO', latitude: -22.526, longitude: -41.944, isHubOrTerminal: true },

      // Nós Intermediários Regionais (Camada 2)
      { nodeId: 'NODE-REG-ITA-CMP-ITV', name: 'Entroncamento Italva (BR-356)', cityId: 'italva-rj', layer: 'CAMADA_2_TRANSPORTE_REGIONAL', latitude: -21.428, longitude: -41.689, isHubOrTerminal: false },
      { nodeId: 'NODE-REG-ITA-CMP-CDM', name: 'Trevo Cardoso Moreira (BR-356)', cityId: 'cardoso-moreira-rj', layer: 'CAMADA_2_TRANSPORTE_REGIONAL', latitude: -21.488, longitude: -41.615, isHubOrTerminal: false },
      { nodeId: 'NODE-REG-BR101-CAS', name: 'Entroncamento Casimiro de Abreu (BR-101)', cityId: 'casimiro-rj', layer: 'CAMADA_2_TRANSPORTE_REGIONAL', latitude: -22.481, longitude: -42.204, isHubOrTerminal: false }
    ];

    defaultNodes.forEach(n => this.addNode(n));

    // Arestas de Conexão (Camada 2 e 3)
    const defaultEdges: MultiLayerEdge[] = [
      // Itaperuna <-> Italva (BR-356)
      {
        edgeId: 'EDGE-ITA-ITV',
        fromNodeId: 'NODE-HUB-ITA',
        toNodeId: 'NODE-REG-ITA-CMP-ITV',
        layer: 'CAMADA_2_TRANSPORTE_REGIONAL',
        distanceKm: 38.0,
        freeFlowSpeedKmh: 80,
        currentFrictionFactor: 1.05,
        tollCostBrl: 0,
        pavementQualityIndex: 0.90,
        fuelConsumptionFactor: 0.085,
        co2EmissionFactorGramsPerKm: 145,
        allowedModalities: ['CARRO', 'VAN', 'MICRO_ONIBUS', 'ONIBUS_EXECUTIVO', 'TRANSPORTE_INTERMUNICIPAL']
      },
      // Italva <-> Cardoso Moreira (BR-356)
      {
        edgeId: 'EDGE-ITV-CDM',
        fromNodeId: 'NODE-REG-ITA-CMP-ITV',
        toNodeId: 'NODE-REG-ITA-CMP-CDM',
        layer: 'CAMADA_2_TRANSPORTE_REGIONAL',
        distanceKm: 28.0,
        freeFlowSpeedKmh: 80,
        currentFrictionFactor: 1.02,
        tollCostBrl: 0,
        pavementQualityIndex: 0.88,
        fuelConsumptionFactor: 0.085,
        co2EmissionFactorGramsPerKm: 145,
        allowedModalities: ['CARRO', 'VAN', 'MICRO_ONIBUS', 'ONIBUS_EXECUTIVO', 'TRANSPORTE_INTERMUNICIPAL']
      },
      // Cardoso Moreira <-> Campos (BR-356)
      {
        edgeId: 'EDGE-CDM-CMP',
        fromNodeId: 'NODE-REG-ITA-CMP-CDM',
        toNodeId: 'NODE-HUB-CMP',
        layer: 'CAMADA_2_TRANSPORTE_REGIONAL',
        distanceKm: 44.5,
        freeFlowSpeedKmh: 85,
        currentFrictionFactor: 1.10,
        tollCostBrl: 0,
        pavementQualityIndex: 0.92,
        fuelConsumptionFactor: 0.082,
        co2EmissionFactorGramsPerKm: 140,
        allowedModalities: ['CARRO', 'VAN', 'MICRO_ONIBUS', 'ONIBUS_EXECUTIVO', 'TRANSPORTE_INTERMUNICIPAL']
      },
      // Campos <-> Macaé (BR-101 com pedágio)
      {
        edgeId: 'EDGE-CMP-MAC',
        fromNodeId: 'NODE-HUB-CMP',
        toNodeId: 'NODE-HUB-MAC',
        layer: 'CAMADA_3_LOGISTICA',
        distanceKm: 105.0,
        freeFlowSpeedKmh: 95,
        currentFrictionFactor: 1.15,
        tollCostBrl: 7.80,
        pavementQualityIndex: 0.95,
        fuelConsumptionFactor: 0.080,
        co2EmissionFactorGramsPerKm: 135,
        allowedModalities: ['CARRO', 'VAN', 'MICRO_ONIBUS', 'ONIBUS_EXECUTIVO', 'TRANSPORTE_INTERMUNICIPAL', 'TRANSPORTE_CORPORATIVO']
      },
      // Macaé <-> Rio das Ostras
      {
        edgeId: 'EDGE-MAC-RDO',
        fromNodeId: 'NODE-HUB-MAC',
        toNodeId: 'NODE-HUB-RDO',
        layer: 'CAMADA_2_TRANSPORTE_REGIONAL',
        distanceKm: 28.0,
        freeFlowSpeedKmh: 70,
        currentFrictionFactor: 1.25,
        tollCostBrl: 0,
        pavementQualityIndex: 0.85,
        fuelConsumptionFactor: 0.090,
        co2EmissionFactorGramsPerKm: 155,
        allowedModalities: ['CARRO', 'VAN', 'MICRO_ONIBUS', 'ONIBUS_EXECUTIVO', 'TRANSPORTE_INTERMUNICIPAL']
      },
      // Rio das Ostras <-> Cabo Frio
      {
        edgeId: 'EDGE-RDO-CBF',
        fromNodeId: 'NODE-HUB-RDO',
        toNodeId: 'NODE-HUB-CBF',
        layer: 'CAMADA_2_TRANSPORTE_REGIONAL',
        distanceKm: 56.0,
        freeFlowSpeedKmh: 75,
        currentFrictionFactor: 1.18,
        tollCostBrl: 0,
        pavementQualityIndex: 0.87,
        fuelConsumptionFactor: 0.086,
        co2EmissionFactorGramsPerKm: 148,
        allowedModalities: ['CARRO', 'VAN', 'MICRO_ONIBUS', 'ONIBUS_EXECUTIVO', 'TRANSPORTE_INTERMUNICIPAL']
      },
      // Itaperuna <-> Muriaé (BR-356 MG)
      {
        edgeId: 'EDGE-ITA-MUR',
        fromNodeId: 'NODE-HUB-ITA',
        toNodeId: 'NODE-HUB-MUR',
        layer: 'CAMADA_2_TRANSPORTE_REGIONAL',
        distanceKm: 62.0,
        freeFlowSpeedKmh: 75,
        currentFrictionFactor: 1.05,
        tollCostBrl: 0,
        pavementQualityIndex: 0.88,
        fuelConsumptionFactor: 0.088,
        co2EmissionFactorGramsPerKm: 150,
        allowedModalities: ['CARRO', 'VAN', 'MICRO_ONIBUS', 'ONIBUS_EXECUTIVO', 'TRANSPORTE_INTERMUNICIPAL']
      },
      // Muriaé <-> Juiz de Fora (BR-116 / BR-267)
      {
        edgeId: 'EDGE-MUR-JFO',
        fromNodeId: 'NODE-HUB-MUR',
        toNodeId: 'NODE-HUB-JFO',
        layer: 'CAMADA_2_TRANSPORTE_REGIONAL',
        distanceKm: 154.0,
        freeFlowSpeedKmh: 80,
        currentFrictionFactor: 1.10,
        tollCostBrl: 0,
        pavementQualityIndex: 0.84,
        fuelConsumptionFactor: 0.089,
        co2EmissionFactorGramsPerKm: 152,
        allowedModalities: ['CARRO', 'VAN', 'MICRO_ONIBUS', 'ONIBUS_EXECUTIVO', 'TRANSPORTE_INTERMUNICIPAL']
      },
      // Itaperuna <-> Cachoeiro de Itapemirim (RJ-186 / ES-482)
      {
        edgeId: 'EDGE-ITA-CAC',
        fromNodeId: 'NODE-HUB-ITA',
        toNodeId: 'NODE-HUB-CAC',
        layer: 'CAMADA_2_TRANSPORTE_REGIONAL',
        distanceKm: 102.0,
        freeFlowSpeedKmh: 75,
        currentFrictionFactor: 1.08,
        tollCostBrl: 0,
        pavementQualityIndex: 0.86,
        fuelConsumptionFactor: 0.087,
        co2EmissionFactorGramsPerKm: 148,
        allowedModalities: ['CARRO', 'VAN', 'MICRO_ONIBUS', 'ONIBUS_EXECUTIVO', 'TRANSPORTE_INTERMUNICIPAL']
      }
    ];

    defaultEdges.forEach(e => this.addEdge(e));
  }

  public addNode(node: MultiLayerNode): void {
    this.nodes.set(node.nodeId, node);
  }

  public getNode(nodeId: string): MultiLayerNode | undefined {
    return this.nodes.get(nodeId);
  }

  public getAllNodes(): MultiLayerNode[] {
    return Array.from(this.nodes.values());
  }

  public addEdge(edge: MultiLayerEdge): void {
    // Grafo bidirecional para transporte viário
    const listFrom = this.edges.get(edge.fromNodeId) || [];
    listFrom.push(edge);
    this.edges.set(edge.fromNodeId, listFrom);

    const reverseEdge: MultiLayerEdge = {
      ...edge,
      edgeId: `${edge.edgeId}-REV`,
      fromNodeId: edge.toNodeId,
      toNodeId: edge.fromNodeId
    };
    const listTo = this.edges.get(edge.toNodeId) || [];
    listTo.push(reverseEdge);
    this.edges.set(edge.toNodeId, listTo);
  }

  /**
   * Calcula rota ótima em multi-camada considerando o objetivo operacional
   */
  public findOptimalMultiLayerRoute(
    originNodeId: string,
    destNodeId: string,
    objective: RoutingObjective = 'MENOR_TEMPO',
    modalType: MultimodalType = 'VAN'
  ): MultiLayerRouteResult | null {
    const startNode = this.nodes.get(originNodeId);
    const endNode = this.nodes.get(destNodeId);
    if (!startNode || !endNode) {
      return null;
    }

    // Dijkstra com ponderação dinâmica pela função objetivo
    const distances: Map<string, number> = new Map();
    const previousNode: Map<string, { node: MultiLayerNode; edge: MultiLayerEdge }> = new Map();
    const unvisited = new Set<string>();

    this.nodes.forEach(n => {
      distances.set(n.nodeId, Infinity);
      unvisited.add(n.nodeId);
    });

    distances.set(originNodeId, 0);

    while (unvisited.size > 0) {
      let currentId: string | null = null;
      let smallestDist = Infinity;

      unvisited.forEach(id => {
        const d = distances.get(id)!;
        if (d < smallestDist) {
          smallestDist = d;
          currentId = id;
        }
      });

      if (!currentId || smallestDist === Infinity) break;
      if (currentId === destNodeId) break;

      unvisited.delete(currentId);
      const outgoingEdges = (this.edges.get(currentId) || []).filter(e =>
        e.allowedModalities.includes(modalType)
      );

      for (const edge of outgoingEdges) {
        const neighborId = edge.toNodeId;
        if (!unvisited.has(neighborId)) continue;

        // Calcula peso da aresta baseado no objetivo
        let edgeWeight = 0;
        const effectiveSpeed = Math.max(20, edge.freeFlowSpeedKmh / edge.currentFrictionFactor);
        const durationMinutes = (edge.distanceKm / effectiveSpeed) * 60;
        const fuelCostBrl = edge.distanceKm * edge.fuelConsumptionFactor * 6.15; // R$ 6.15/L
        const monetaryCost = fuelCostBrl + edge.tollCostBrl;
        const co2Grams = edge.distanceKm * edge.co2EmissionFactorGramsPerKm;

        switch (objective) {
          case 'MENOR_TEMPO':
            edgeWeight = durationMinutes;
            break;
          case 'MENOR_CUSTO':
            edgeWeight = monetaryCost;
            break;
          case 'MAIOR_RENTABILIDADE':
            // Pondera custo menor com velocidade razoável
            edgeWeight = (monetaryCost * 0.7) + (durationMinutes * 0.3);
            break;
          case 'MENOR_EMISSAO':
            edgeWeight = co2Grams;
            break;
        }

        const newDist = smallestDist + edgeWeight;
        if (newDist < (distances.get(neighborId) || Infinity)) {
          distances.set(neighborId, newDist);
          const currNode = this.nodes.get(currentId)!;
          previousNode.set(neighborId, { node: currNode, edge });
        }
      }
    }

    // Reconstrói caminho
    const pathNodes: MultiLayerNode[] = [];
    const pathEdges: MultiLayerEdge[] = [];
    let curr: string | undefined = destNodeId;

    while (curr && curr !== originNodeId) {
      const step = previousNode.get(curr);
      if (!step) break;
      const targetNode = this.nodes.get(curr)!;
      pathNodes.unshift(targetNode);
      pathEdges.unshift(step.edge);
      curr = step.node.nodeId;
    }

    if (pathNodes.length === 0 && originNodeId !== destNodeId) {
      return null;
    }

    pathNodes.unshift(startNode);

    // Métricas Consolidadas da Rota
    let totalDistanceKm = 0;
    let estimatedDurationMinutes = 0;
    let totalCostBrl = 0;
    let estimatedCo2EmissionsGrams = 0;
    const layersCrossedSet = new Set<GraphLayerType>();

    pathEdges.forEach(e => {
      totalDistanceKm += e.distanceKm;
      const effectiveSpeed = Math.max(20, e.freeFlowSpeedKmh / e.currentFrictionFactor);
      estimatedDurationMinutes += (e.distanceKm / effectiveSpeed) * 60;
      totalCostBrl += (e.distanceKm * e.fuelConsumptionFactor * 6.15) + e.tollCostBrl;
      estimatedCo2EmissionsGrams += e.distanceKm * e.co2EmissionFactorGramsPerKm;
      layersCrossedSet.add(e.layer);
    });

    totalDistanceKm = Number(totalDistanceKm.toFixed(1));
    estimatedDurationMinutes = Number(estimatedDurationMinutes.toFixed(1));
    totalCostBrl = Number(totalCostBrl.toFixed(2));
    estimatedCo2EmissionsGrams = Math.round(estimatedCo2EmissionsGrams);

    // Receita estimada com passageiros e encomendas: ~R$ 3.80 por km bruto da rota
    const projectedRevenueBrl = Number((totalDistanceKm * 3.80).toFixed(2));
    const projectedProfitBrl = Number((projectedRevenueBrl - totalCostBrl).toFixed(2));

    let carbonEcoRating: MultiLayerRouteResult['carbonEcoRating'] = 'B';
    const gramsPerKm = estimatedCo2EmissionsGrams / Math.max(1, totalDistanceKm);
    if (gramsPerKm < 135) carbonEcoRating = 'A+';
    else if (gramsPerKm < 145) carbonEcoRating = 'A';
    else if (gramsPerKm > 160) carbonEcoRating = 'C';

    return {
      routeId: `MLR-${Date.now()}-${originNodeId.slice(5, 8)}-${destNodeId.slice(5, 8)}`,
      objective,
      pathNodes,
      pathEdges,
      layersCrossed: Array.from(layersCrossedSet),
      totalDistanceKm,
      estimatedDurationMinutes,
      totalCostBrl,
      projectedRevenueBrl,
      projectedProfitBrl,
      estimatedCo2EmissionsGrams,
      carbonEcoRating
    };
  }
}

export const intercityGraphEngine = new IntercityGraphEngine();
