/**
 * REGIONAL KNOWLEDGE GRAPH & ANALYTICS
 * 
 * Grafo de Conhecimento Regional:
 * Conecta:
 * - Mobilidade (Passageiros, Motoristas, Rotas, Vans, Ônibus)
 * - Comércio Local (Restaurantes, Farmácias, Mercados)
 * - Logística (Hubs, Encomendas, Rotas de Carga)
 * - Franquias Municipais
 * - Empresas Corporativas B2B e Centros de Custo
 * - Órgãos Públicos, Hospitais e Universidades
 */

export type KnowledgeNodeType =
  | 'CIDADAO'
  | 'MOTORISTA'
  | 'COMERCIO'
  | 'EMPRESA_B2B'
  | 'FRANQUIA'
  | 'HUB_TRANSPORTE'
  | 'HOSPITAL'
  | 'UNIVERSIDADE';

export type KnowledgeEdgeType =
  | 'REALIZOU_CORRIDA'
  | 'COMPROU_NO_COMERCIO'
  | 'UTILIZOU_VOUCHER_PUBLICO'
  | 'COLABORADOR_DE_EMPRESA'
  | 'EMBARCOU_LINHA_ACADEMICA'
  | 'RECEBEU_ALTA_HOSPITALAR'
  | 'FRANQUIA_OPERA_CIDADE';

export interface KnowledgeNode {
  nodeId: string;
  type: KnowledgeNodeType;
  label: string;
  cityId: string;
  attributes: Record<string, any>;
}

export interface KnowledgeEdge {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: KnowledgeEdgeType;
  weight: number;
  timestamp: number;
}

export class RegionalKnowledgeGraph {
  private nodes: Map<string, KnowledgeNode> = new Map();
  private edges: Map<string, KnowledgeEdge> = new Map();
  private adjacency: Map<string, Set<string>> = new Map();

  constructor() {
    this.seedDefaultGraph();
  }

  private seedDefaultGraph(): void {
    // Nós centrais de Itaperuna
    const defaultNodes: KnowledgeNode[] = [
      {
        nodeId: 'NODE-CIT-01',
        type: 'CIDADAO',
        label: 'Maria Silva Santos',
        cityId: 'itaperuna-rj',
        attributes: { trustScore: 94.5, roles: ['PASSAGEIRO', 'PACIENTE_SAUDE'] }
      },
      {
        nodeId: 'NODE-DRV-01',
        type: 'MOTORISTA',
        label: 'José Carlos Oliveira',
        cityId: 'itaperuna-rj',
        attributes: { rating: 4.95, vehicle: 'Prisma Branco' }
      },
      {
        nodeId: 'NODE-MKT-01',
        type: 'COMERCIO',
        label: 'Restaurante Fogão de Lenha',
        cityId: 'itaperuna-rj',
        attributes: { category: 'GASTRONOMIA', cashback: 8.0 }
      },
      {
        nodeId: 'NODE-BIZ-01',
        type: 'EMPRESA_B2B',
        label: 'TechCorp Norte Fluminense',
        cityId: 'itaperuna-rj',
        attributes: { employees: 280, creditTier: 'TIER_AAA' }
      },
      {
        nodeId: 'NODE-FRANQ-01',
        type: 'FRANQUIA',
        label: 'PARTIU Franquia Itaperuna',
        cityId: 'itaperuna-rj',
        attributes: { fpiScore: 88.6, tier: 1 }
      },
      {
        nodeId: 'NODE-HOSP-01',
        type: 'HOSPITAL',
        label: 'Hospital São José do Avaí',
        cityId: 'itaperuna-rj',
        attributes: { beds: 350, hasHemodialysis: true }
      },
      {
        nodeId: 'NODE-UNIV-01',
        type: 'UNIVERSIDADE',
        label: 'UNIG / Redentor',
        cityId: 'itaperuna-rj',
        attributes: { students: 6500 }
      }
    ];

    defaultNodes.forEach(n => this.addNode(n));

    // Arestas de relacionamento
    this.addEdge({
      edgeId: 'EDGE-01',
      sourceNodeId: 'NODE-CIT-01',
      targetNodeId: 'NODE-DRV-01',
      edgeType: 'REALIZOU_CORRIDA',
      weight: 18.5,
      timestamp: Date.now() - 3600000
    });

    this.addEdge({
      edgeId: 'EDGE-02',
      sourceNodeId: 'NODE-CIT-01',
      targetNodeId: 'NODE-MKT-01',
      edgeType: 'COMPROU_NO_COMERCIO',
      weight: 55.0,
      timestamp: Date.now() - 7200000
    });

    this.addEdge({
      edgeId: 'EDGE-03',
      sourceNodeId: 'NODE-CIT-01',
      targetNodeId: 'NODE-HOSP-01',
      edgeType: 'RECEBEU_ALTA_HOSPITALAR',
      weight: 1.0,
      timestamp: Date.now() - 86400000
    });
  }

  public addNode(node: KnowledgeNode): void {
    this.nodes.set(node.nodeId, node);
    if (!this.adjacency.has(node.nodeId)) {
      this.adjacency.set(node.nodeId, new Set());
    }
  }

  public addEdge(edge: KnowledgeEdge): void {
    this.edges.set(edge.edgeId, edge);
    if (!this.adjacency.has(edge.sourceNodeId)) {
      this.adjacency.set(edge.sourceNodeId, new Set());
    }
    this.adjacency.get(edge.sourceNodeId)!.add(edge.targetNodeId);
  }

  public getNodeCount(): number {
    return this.nodes.size;
  }

  public getEdgeCount(): number {
    return this.edges.size;
  }

  public getNeighbors(nodeId: string): string[] {
    const s = this.adjacency.get(nodeId);
    return s ? Array.from(s) : [];
  }

  /**
   * Calcula a Densidade de Interconexão do Ecossistema Regional
   */
  public calculateEcosystemDensity(): { nodeCount: number; edgeCount: number; densityIndex: number } {
    const v = this.nodes.size;
    const e = this.edges.size;
    const maxPossible = v > 1 ? v * (v - 1) : 1;
    const density = Number((e / maxPossible).toFixed(4));

    return {
      nodeCount: v,
      edgeCount: e,
      densityIndex: density
    };
  }
}

export const regionalKnowledgeGraph = new RegionalKnowledgeGraph();
