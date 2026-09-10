/**
 * PARTIU PASSENGER LTV ENGINE
 * 
 * Modela o Lifetime Value (LTV) preditivo e classifica usuários nos tiers RFM
 * (Bronze, Prata, Ouro, Black, VIP), parametrizando cashback inteligente e retenção.
 */

export type PassengerTier = 'BRONZE' | 'PRATA' | 'OURO' | 'BLACK' | 'VIP';

export interface PassengerLtvInput {
  passengerId: string;
  totalCorridasHistorico: number;
  gastoTotalBrl: number;
  diasDesdeUltimaCorrida: number;
  frequenciaMediaCorridasPorMes: number;
  taxaCancelamentoPct: number;
  avaliacaoMediaPassageiro: number;
  diasCadastroPlataforma: number;
}

export interface PassengerLtvProfile {
  passengerId: string;
  tier: PassengerTier;
  predictedLtv12MonthsBrl: number;
  rfmScore: {
    recencyScore: number; // 1 a 5
    frequencyScore: number; // 1 a 5
    monetaryScore: number; // 1 a 5
    compositeScore: number; // 1 a 100
  };
  beneficiosAtivos: {
    cashbackPercentual: number;
    descontoExclusivoPercentual: number;
    prioridadeAtendimentoSuporte: boolean;
    matchingPrioritario: boolean;
  };
  campanhaSugerida: {
    nome: string;
    cupom: string;
    descontoBrl: number;
    descricao: string;
  };
}

export class PassengerLtvEngine {
  /**
   * Calcula LTV futuro projetado em 12 meses e atribui tier de fidelidade
   */
  public calcularLtv(input: PassengerLtvInput): PassengerLtvProfile {
    // 1. Cálculo RFM (Recency, Frequency, Monetary)
    let rScore = 1;
    if (input.diasDesdeUltimaCorrida <= 3) rScore = 5;
    else if (input.diasDesdeUltimaCorrida <= 7) rScore = 4;
    else if (input.diasDesdeUltimaCorrida <= 15) rScore = 3;
    else if (input.diasDesdeUltimaCorrida <= 30) rScore = 2;

    let fScore = 1;
    if (input.frequenciaMediaCorridasPorMes >= 20) fScore = 5;
    else if (input.frequenciaMediaCorridasPorMes >= 10) fScore = 4;
    else if (input.frequenciaMediaCorridasPorMes >= 5) fScore = 3;
    else if (input.frequenciaMediaCorridasPorMes >= 2) fScore = 2;

    let mScore = 1;
    const ticketMedio = input.totalCorridasHistorico > 0 ? input.gastoTotalBrl / input.totalCorridasHistorico : 18;
    if (input.gastoTotalBrl >= 1500 || ticketMedio >= 35) mScore = 5;
    else if (input.gastoTotalBrl >= 800 || ticketMedio >= 28) mScore = 4;
    else if (input.gastoTotalBrl >= 350 || ticketMedio >= 22) mScore = 3;
    else if (input.gastoTotalBrl >= 100) mScore = 2;

    const compositeScore = Math.round((rScore * 0.35 + fScore * 0.35 + mScore * 0.30) * 20);

    // 2. Classificação de Tier
    let tier: PassengerTier = 'BRONZE';
    if (compositeScore >= 88 || input.gastoTotalBrl > 2000) {
      tier = 'VIP';
    } else if (compositeScore >= 74) {
      tier = 'BLACK';
    } else if (compositeScore >= 55) {
      tier = 'OURO';
    } else if (compositeScore >= 35) {
      tier = 'PRATA';
    }

    // 3. Projeção de LTV para 12 meses (Margem Líquida da Plataforma = 5% do GMV no Modelo Híbrido)
    const expectedMonthlySpend = input.frequenciaMediaCorridasPorMes * ticketMedio;
    const retentionFactor = Math.max(0.4, (100 - input.taxaCancelamentoPct) / 100);
    const predictedGmv12m = expectedMonthlySpend * 12 * retentionFactor;
    const predictedLtv = Number((predictedGmv12m * 0.05).toFixed(2)); // 5% take-rate base (Modelo Híbrido)

    // 4. Benefícios e Campanhas por Tier
    const beneficios = {
      VIP: {
        cashbackPercentual: 8.0,
        descontoExclusivoPercentual: 10.0,
        prioridadeAtendimentoSuporte: true,
        matchingPrioritario: true
      },
      BLACK: {
        cashbackPercentual: 5.0,
        descontoExclusivoPercentual: 7.0,
        prioridadeAtendimentoSuporte: true,
        matchingPrioritario: true
      },
      OURO: {
        cashbackPercentual: 3.5,
        descontoExclusivoPercentual: 5.0,
        prioridadeAtendimentoSuporte: false,
        matchingPrioritario: false
      },
      PRATA: {
        cashbackPercentual: 2.0,
        descontoExclusivoPercentual: 0.0,
        prioridadeAtendimentoSuporte: false,
        matchingPrioritario: false
      },
      BRONZE: {
        cashbackPercentual: 1.0,
        descontoExclusivoPercentual: 0.0,
        prioridadeAtendimentoSuporte: false,
        matchingPrioritario: false
      }
    }[tier];

    // Campanha personalizada
    let campanha = {
      nome: 'Boas-Vindas PARTIU',
      cupom: 'BEMVINDO5',
      descontoBrl: 5.0,
      descricao: 'Desconto de R$ 5 na sua próxima corrida.'
    };

    if (tier === 'VIP' || tier === 'BLACK') {
      campanha = {
        nome: 'Recompensa Fidelidade Platinum',
        cupom: 'PARTIUVIP',
        descontoBrl: 12.0,
        descricao: 'R$ 12,00 OFF em corridas Confort e B2B para usuários premium.'
      };
    } else if (input.diasDesdeUltimaCorrida > 14) {
      campanha = {
        nome: 'Saudades de Você no PARTIU',
        cupom: 'VOLTAPARTIU',
        descontoBrl: 8.0,
        descricao: 'R$ 8,00 OFF para você retornar a viajar com agilidade.'
      };
    }

    return {
      passengerId: input.passengerId,
      tier,
      predictedLtv12MonthsBrl: predictedLtv,
      rfmScore: {
        recencyScore: rScore,
        frequencyScore: fScore,
        monetaryScore: mScore,
        compositeScore
      },
      beneficiosAtivos: beneficios,
      campanhaSugerida: campanha
    };
  }
}

export const passengerLtvEngine = new PassengerLtvEngine();
