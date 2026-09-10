/**
 * PARTIU REGIONAL GROWTH ENGINE
 * 
 * Loops de Crescimento e Ativação de Efeitos de Rede Cruzados (Cross-Side Network Effects).
 * Conecta empresas corporativas, passageiros, frotas de vans e comércio local em um flywheel regional.
 */

export interface RegionalCrossPromotion {
  promotionId: string;
  sourceVertical: 'CORPORATE' | 'MOBILIDADE' | 'VANS_INTERMUNICIPAIS' | 'ENTREGAS_FLASH';
  targetVertical: 'LOCAL_ADS' | 'POSTO_COMBUSTIVEL' | 'COMERCIO_LOCAL' | 'UNIVERSITARIO' | 'ENTREGAS_FLASH';
  title: string;
  description: string;
  benefitBrl: number;
  conversionLiftEstimatedPct: number;
  isActive: boolean;
}

export class RegionalGrowthEngine {
  private activePromotions: Map<string, RegionalCrossPromotion> = new Map();

  constructor() {
    this.initializeDefaultGrowthLoops();
  }

  private initializeDefaultGrowthLoops(): void {
    const defaultPromos: RegionalCrossPromotion[] = [
      {
        promotionId: 'GROWTH-POSTO-01',
        sourceVertical: 'MOBILIDADE',
        targetVertical: 'POSTO_COMBUSTIVEL',
        title: 'Abasteça com Desconto na Vinhosa',
        description: 'Motoristas que completam mais de 30 corridas na semana ganham R$ 0,20 de desconto por litro.',
        benefitBrl: 15.0,
        conversionLiftEstimatedPct: 18.5,
        isActive: true
      },
      {
        promotionId: 'GROWTH-B2B-ADS-02',
        sourceVertical: 'CORPORATE',
        targetVertical: 'COMERCIO_LOCAL',
        title: 'Almoço Conveniado Corporativo',
        description: 'Passageiros em viagens B2B recebem voucher de 15% em restaurantes cadastrados no PARTIU Ads.',
        benefitBrl: 12.0,
        conversionLiftEstimatedPct: 22.0,
        isActive: true
      },
      {
        promotionId: 'GROWTH-VAN-FLASH-03',
        sourceVertical: 'VANS_INTERMUNICIPAIS',
        targetVertical: 'ENTREGAS_FLASH',
        title: 'Envie sua Encomenda na Mesma Viagem',
        description: 'Passageiro de van intermunicipal tem 50% de desconto no frete para envio de encomenda.',
        benefitBrl: 18.0,
        conversionLiftEstimatedPct: 28.4,
        isActive: true
      }
    ];

    defaultPromos.forEach(p => this.activePromotions.set(p.promotionId, p));
  }

  public getAllPromotions(): RegionalCrossPromotion[] {
    return Array.from(this.activePromotions.values());
  }

  public triggerGrowthLoop(vertical: RegionalCrossPromotion['sourceVertical']): RegionalCrossPromotion[] {
    return Array.from(this.activePromotions.values()).filter(p => p.isActive && p.sourceVertical === vertical);
  }
}

export const regionalGrowthEngine = new RegionalGrowthEngine();
