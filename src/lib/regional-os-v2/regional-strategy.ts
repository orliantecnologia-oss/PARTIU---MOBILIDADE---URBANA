/**
 * REGIONAL STRATEGY & ROADMAP ENGINE V2
 * 
 * Planejamento Estratégico Autônomo e Roadmaps Municipais:
 * - Metas de expansão por município e corredores satélites
 * - Projeção de penetração de mercado e rentabilidade de longo prazo
 * - Critérios de maturidade operacional do ecossistema
 */

export interface CityRoadmapMilestone {
  milestoneId: string;
  cityId: string;
  phase: 'LANÇAMENTO_PILOTO' | 'EXPANSAO_COMERCIAL' | 'INTEGRACAO_CIVICA' | 'ECOSSISTEMA_AUTONOMO';
  targetGmvMonthBrl: number;
  targetDailyRides: number;
  targetPartnerMerchants: number;
  targetActiveFranchiseEbitdaBrl: number;
  status: 'CONCLUIDO' | 'EM_PROGRESSO' | 'PLANEJADO';
  completionPct: number;
}

export class RegionalStrategyV2 {
  private milestones: Map<string, CityRoadmapMilestone[]> = new Map();

  constructor() {
    this.seedDefaultMilestones();
  }

  private seedDefaultMilestones(): void {
    const itaperunaMilestones: CityRoadmapMilestone[] = [
      {
        milestoneId: 'MLS-ITAP-01',
        cityId: 'itaperuna-rj',
        phase: 'LANÇAMENTO_PILOTO',
        targetGmvMonthBrl: 150000.0,
        targetDailyRides: 800,
        targetPartnerMerchants: 15,
        targetActiveFranchiseEbitdaBrl: 12000.0,
        status: 'CONCLUIDO',
        completionPct: 100.0
      },
      {
        milestoneId: 'MLS-ITAP-02',
        cityId: 'itaperuna-rj',
        phase: 'INTEGRACAO_CIVICA',
        targetGmvMonthBrl: 350000.0,
        targetDailyRides: 2200,
        targetPartnerMerchants: 50,
        targetActiveFranchiseEbitdaBrl: 25000.0,
        status: 'EM_PROGRESSO',
        completionPct: 88.5
      },
      {
        milestoneId: 'MLS-ITAP-03',
        cityId: 'itaperuna-rj',
        phase: 'ECOSSISTEMA_AUTONOMO',
        targetGmvMonthBrl: 600000.0,
        targetDailyRides: 4000,
        targetPartnerMerchants: 120,
        targetActiveFranchiseEbitdaBrl: 50000.0,
        status: 'PLANEJADO',
        completionPct: 25.0
      }
    ];

    this.milestones.set('itaperuna-rj', itaperunaMilestones);
  }

  public getRoadmapByCity(cityId: string): CityRoadmapMilestone[] {
    return this.milestones.get(cityId) || [];
  }
}

export const regionalStrategyV2 = new RegionalStrategyV2();
