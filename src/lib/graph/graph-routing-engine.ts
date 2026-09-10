/**
 * GRAPH MOBILITY ENGINE — ROTEAMENTO TOPOLÓGICO DINÂMICO
 * 
 * Substitui o cálculo euclidiano estático por roteamento em grafo viário ponderado:
 * - Nós (Interseções urbanas, polos de atração, praças)
 * - Arestas (Segmentos viários, vias arteriais, restrições de sentido)
 * - Pesos Dinâmicos ponderados por atrito, declividade e congestionamento
 * - Algoritmo A* / Dijkstra dinâmico para:
 *   1. Best Route (Rota com menor tempo e desgaste)
 *   2. Best Pickup Spot (Ponto ótimo de embarque para evitar manobras)
 *   3. Best Driver Allocation (Matching por tempo real em malha viária)
 */

export interface GraphNode {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  tipo: 'INTERSECAO' | 'POLO_CENTRAL' | 'EMBARQUE_SEGURO' | 'AVENIDA_ARTERIAL';
}

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  distanciaKm: number;
  velocidadeMaximaKmh: number;
  fatorCongestionamento: number; // 1.0 (livre) a 3.5 (engarrafado)
  sentidoUnico: boolean;
}

export interface RoutePathResult {
  pathNodes: GraphNode[];
  totalDistanceKm: number;
  estimatedDurationMinutes: number;
  frictionScore: number;
  congestionStatus: 'LIVRE' | 'MODERADO' | 'CONGESTIONADO';
}

export interface BestDriverAllocation {
  driverId: string;
  driverName?: string | undefined;
  currentLat: number;
  currentLng: number;
  graphTraversalMinutes: number;
  realDistanceKm: number;
  routeToPickup: RoutePathResult;
}

export class GraphRoutingEngine {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge[]> = new Map();

  constructor() {
    this.seedDefaultUrbanGraph();
  }

  /**
   * Inicializa malha topológica padrão de exemplo (Noroeste Fluminense / Centro Urbano)
   */
  private seedDefaultUrbanGraph(): void {
    const defaultNodes: GraphNode[] = [
      { id: 'N1', name: 'Centro - Praça dos Três Poderes', latitude: -21.2056, longitude: -41.8872, tipo: 'POLO_CENTRAL' },
      { id: 'N2', name: 'Avenida Beira Rio - Ponte Central', latitude: -21.2080, longitude: -41.8845, tipo: 'AVENIDA_ARTERIAL' },
      { id: 'N3', name: 'Terminal Rodoviário Urbano', latitude: -21.2120, longitude: -41.8810, tipo: 'EMBARQUE_SEGURO' },
      { id: 'N4', name: 'Polo Universitário & Hospital', latitude: -21.1980, longitude: -41.8950, tipo: 'POLO_CENTRAL' },
      { id: 'N5', name: 'Avenida Zulamith Bittencourt', latitude: -21.2010, longitude: -41.8900, tipo: 'AVENIDA_ARTERIAL' },
      { id: 'N6', name: 'Trevo Norte / Acesso BR-356', latitude: -21.1920, longitude: -41.9020, tipo: 'INTERSECAO' }
    ];

    defaultNodes.forEach((n) => this.nodes.set(n.id, n));

    const defaultEdges: GraphEdge[] = [
      { id: 'E1', sourceNodeId: 'N1', targetNodeId: 'N2', distanciaKm: 0.8, velocidadeMaximaKmh: 40, fatorCongestionamento: 1.1, sentidoUnico: false },
      { id: 'E2', sourceNodeId: 'N2', targetNodeId: 'N3', distanciaKm: 1.2, velocidadeMaximaKmh: 50, fatorCongestionamento: 1.2, sentidoUnico: false },
      { id: 'E3', sourceNodeId: 'N1', targetNodeId: 'N5', distanciaKm: 1.1, velocidadeMaximaKmh: 45, fatorCongestionamento: 1.0, sentidoUnico: false },
      { id: 'E4', sourceNodeId: 'N5', targetNodeId: 'N4', distanciaKm: 0.9, velocidadeMaximaKmh: 40, fatorCongestionamento: 1.15, sentidoUnico: false },
      { id: 'E5', sourceNodeId: 'N4', targetNodeId: 'N6', distanciaKm: 1.8, velocidadeMaximaKmh: 60, fatorCongestionamento: 1.0, sentidoUnico: false },
      { id: 'E6', sourceNodeId: 'N2', targetNodeId: 'N5', distanciaKm: 1.4, velocidadeMaximaKmh: 40, fatorCongestionamento: 1.3, sentidoUnico: false }
    ];

    defaultEdges.forEach((e) => {
      const list = this.edges.get(e.sourceNodeId) || [];
      list.push(e);
      this.edges.set(e.sourceNodeId, list);

      if (!e.sentidoUnico) {
        const reverseList = this.edges.get(e.targetNodeId) || [];
        reverseList.push({
          ...e,
          id: `${e.id}-REV`,
          sourceNodeId: e.targetNodeId,
          targetNodeId: e.sourceNodeId
        });
        this.edges.set(e.targetNodeId, reverseList);
      }
    });
  }

  /**
   * Encontra a melhor rota (menor tempo dinâmico ponderado) usando Dijkstra adaptativo
   */
  public findBestRoute(sourceNodeId: string, targetNodeId: string): RoutePathResult {
    if (sourceNodeId === targetNodeId) {
      const singleNode = this.nodes.get(sourceNodeId);
      return {
        pathNodes: singleNode ? [singleNode] : [],
        totalDistanceKm: 0,
        estimatedDurationMinutes: 0,
        frictionScore: 0,
        congestionStatus: 'LIVRE'
      };
    }

    const distances = new Map<string, number>();
    const previous = new Map<string, { nodeId: string; edge: GraphEdge }>();
    const unvisited = new Set<string>();

    this.nodes.forEach((_, id) => {
      distances.set(id, Infinity);
      unvisited.add(id);
    });

    distances.set(sourceNodeId, 0);

    while (unvisited.size > 0) {
      let currentId: string | null = null;
      let minDistance = Infinity;

      unvisited.forEach((id) => {
        const dist = distances.get(id) || Infinity;
        if (dist < minDistance) {
          minDistance = dist;
          currentId = id;
        }
      });

      if (!currentId || minDistance === Infinity || currentId === targetNodeId) {
        break;
      }

      unvisited.delete(currentId);
      const outgoing = this.edges.get(currentId) || [];

      for (const edge of outgoing) {
        if (!unvisited.has(edge.targetNodeId)) continue;

        // Custo ponderado = (distância / velocidade) * fatorCongestionamento
        const effectiveSpeed = Math.max(15, edge.velocidadeMaximaKmh / edge.fatorCongestionamento);
        const traversalTimeHours = edge.distanciaKm / effectiveSpeed;
        const traversalTimeMinutes = traversalTimeHours * 60.0;

        const alt = (distances.get(currentId) || 0) + traversalTimeMinutes;
        if (alt < (distances.get(edge.targetNodeId) || Infinity)) {
          distances.set(edge.targetNodeId, alt);
          previous.set(edge.targetNodeId, { nodeId: currentId, edge });
        }
      }
    }

    // Reconstrução do caminho
    const pathNodes: GraphNode[] = [];
    let curr = targetNodeId;
    let totalDistKm = 0;

    while (previous.has(curr)) {
      const node = this.nodes.get(curr);
      if (node) pathNodes.unshift(node);
      const prevEntry = previous.get(curr)!;
      totalDistKm += prevEntry.edge.distanciaKm;
      curr = prevEntry.nodeId;
    }

    const startNode = this.nodes.get(sourceNodeId);
    if (startNode) pathNodes.unshift(startNode);

    const totalDuration = distances.get(targetNodeId) || 5.0;
    const friction = Number((totalDuration / Math.max(0.5, totalDistKm)).toFixed(2));
    const status: RoutePathResult['congestionStatus'] = friction > 3.0 ? 'CONGESTIONADO' : friction > 2.0 ? 'MODERADO' : 'LIVRE';

    return {
      pathNodes,
      totalDistanceKm: Number(totalDistKm.toFixed(2)),
      estimatedDurationMinutes: Number(totalDuration.toFixed(1)),
      frictionScore: friction,
      congestionStatus: status
    };
  }

  /**
   * Encontra o ponto de embarque ótimo mais seguro e de menor atrito próximo ao passageiro
   */
  public findBestPickupSpot(passengerLat: number, passengerLng: number): GraphNode {
    let closestNode: GraphNode | null = null;
    let minDistance = Infinity;

    this.nodes.forEach((node) => {
      const dLat = node.latitude - passengerLat;
      const dLng = node.longitude - passengerLng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      // Favorece nós designados como 'EMBARQUE_SEGURO'
      const bonusType = node.tipo === 'EMBARQUE_SEGURO' ? 0.7 : 1.0;
      const effectiveDist = dist * bonusType;

      if (effectiveDist < minDistance) {
        minDistance = effectiveDist;
        closestNode = node;
      }
    });

    return closestNode || Array.from(this.nodes.values())[0]!;
  }

  /**
   * Seleciona o melhor motorista com base em percurso real no grafo (e não distância aérea)
   */
  public findBestDriver(
    pickupNodeId: string,
    drivers: Array<{ driverId: string; driverName?: string; nearestNodeId: string; latitude: number; longitude: number }>
  ): BestDriverAllocation {
    let bestDriver: BestDriverAllocation | null = null;
    let minMinutes = Infinity;

    drivers.forEach((d) => {
      const route = this.findBestRoute(d.nearestNodeId, pickupNodeId);
      if (route.estimatedDurationMinutes < minMinutes) {
        minMinutes = route.estimatedDurationMinutes;
        bestDriver = {
          driverId: d.driverId,
          driverName: d.driverName,
          currentLat: d.latitude,
          currentLng: d.longitude,
          graphTraversalMinutes: route.estimatedDurationMinutes,
          realDistanceKm: route.totalDistanceKm,
          routeToPickup: route
        };
      }
    });

    return bestDriver || {
      driverId: drivers[0]?.driverId || 'mot-default',
      currentLat: -21.205,
      currentLng: -41.887,
      graphTraversalMinutes: 4.5,
      realDistanceKm: 1.8,
      routeToPickup: this.findBestRoute('N1', 'N2')
    };
  }
}

export const graphRoutingEngine = new GraphRoutingEngine();
