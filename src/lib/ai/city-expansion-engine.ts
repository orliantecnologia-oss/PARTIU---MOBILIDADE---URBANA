/**
 * CITY EXPANSION INTELLIGENCE ENGINE
 * 
 * Avalia indicadores macroeconômicos e demográficos:
 * População, PIB per capita, densidade urbana, concorrência, renda média e demanda reprimida.
 * Gera o 'ExpansionScore' (0-100) e o ranking nacional de praças prioritárias para expansão.
 */

export interface ExpansionCityData {
  cityId: string;
  cityName: string;
  stateCode: 'RJ' | 'MG' | 'ES' | 'SP';
  populacaoTotal: number;
  pibPerCapitaBrl: number;
  densidadeDemograficaHabKm2: number;
  presencaConcorrencia: 'ALTA' | 'MODERADA' | 'BAIXA' | 'INEXISTENTE';
  rendaMediaMensalBrl: number;
  distanciaHubMaisProximoKm: number;
  polosEducacionaisCount: number;
  frotaVeiculosRegistrada: number;
}

export interface ExpansionScoreBreakdown {
  cityId: string;
  cityName: string;
  stateCode: string;
  scoreTotal: number; // 0 a 100
  tierViabilidade: 'IMEDIATA' | 'ALTA_PRIORIDADE' | 'MEDIA_PRIORIDADE' | 'FUTURA';
  corridasEstimadasDia: number;
  frotaMinimaLancamento: number;
  paybackEstimadoMeses: number;
  scoreDemografico: number; // 0 a 100
  scoreEconomico: number; // 0 a 100
  scoreCompetitivo: number; // 0 a 100
  justificativaEstrategica: string;
}

export class CityExpansionEngine {
  private candidateCities: ExpansionCityData[] = [
    {
      cityId: 'padua-rj',
      cityName: 'Santo Antônio de Pádua',
      stateCode: 'RJ',
      populacaoTotal: 42500,
      pibPerCapitaBrl: 23800,
      densidadeDemograficaHabKm2: 70.5,
      presencaConcorrencia: 'BAIXA',
      rendaMediaMensalBrl: 2450,
      distanciaHubMaisProximoKm: 42,
      polosEducacionaisCount: 3,
      frotaVeiculosRegistrada: 18400
    },
    {
      cityId: 'bom-jesus-rj',
      cityName: 'Bom Jesus do Itabapoana',
      stateCode: 'RJ',
      populacaoTotal: 37200,
      pibPerCapitaBrl: 21900,
      densidadeDemograficaHabKm2: 62.0,
      presencaConcorrencia: 'INEXISTENTE',
      rendaMediaMensalBrl: 2200,
      distanciaHubMaisProximoKm: 38,
      polosEducacionaisCount: 2,
      frotaVeiculosRegistrada: 14200
    },
    {
      cityId: 'miracema-rj',
      cityName: 'Miracema',
      stateCode: 'RJ',
      populacaoTotal: 27100,
      pibPerCapitaBrl: 20400,
      densidadeDemograficaHabKm2: 89.0,
      presencaConcorrencia: 'INEXISTENTE',
      rendaMediaMensalBrl: 2100,
      distanciaHubMaisProximoKm: 55,
      polosEducacionaisCount: 1,
      frotaVeiculosRegistrada: 11000
    },
    {
      cityId: 'cataguases-mg',
      cityName: 'Cataguases',
      stateCode: 'MG',
      populacaoTotal: 75600,
      pibPerCapitaBrl: 28400,
      densidadeDemograficaHabKm2: 154.0,
      presencaConcorrencia: 'MODERADA',
      rendaMediaMensalBrl: 2800,
      distanciaHubMaisProximoKm: 62,
      polosEducacionaisCount: 4,
      frotaVeiculosRegistrada: 34000
    },
    {
      cityId: 'leopoldina-mg',
      cityName: 'Leopoldina',
      stateCode: 'MG',
      populacaoTotal: 52800,
      pibPerCapitaBrl: 26500,
      densidadeDemograficaHabKm2: 56.0,
      presencaConcorrencia: 'BAIXA',
      rendaMediaMensalBrl: 2600,
      distanciaHubMaisProximoKm: 68,
      polosEducacionaisCount: 3,
      frotaVeiculosRegistrada: 24500
    },
    {
      cityId: 'cachoeiro-es',
      cityName: 'Cachoeiro de Itapemirim',
      stateCode: 'ES',
      populacaoTotal: 212000,
      pibPerCapitaBrl: 35200,
      densidadeDemograficaHabKm2: 242.0,
      presencaConcorrencia: 'ALTA',
      rendaMediaMensalBrl: 3200,
      distanciaHubMaisProximoKm: 98,
      polosEducacionaisCount: 8,
      frotaVeiculosRegistrada: 112000
    },
    {
      cityId: 'friburgo-rj',
      cityName: 'Nova Friburgo',
      stateCode: 'RJ',
      populacaoTotal: 191000,
      pibPerCapitaBrl: 32100,
      densidadeDemograficaHabKm2: 204.0,
      presencaConcorrencia: 'MODERADA',
      rendaMediaMensalBrl: 3100,
      distanciaHubMaisProximoKm: 135,
      polosEducacionaisCount: 6,
      frotaVeiculosRegistrada: 98000
    },
    {
      cityId: 'araruama-rj',
      cityName: 'Araruama',
      stateCode: 'RJ',
      populacaoTotal: 136000,
      pibPerCapitaBrl: 27900,
      densidadeDemograficaHabKm2: 213.0,
      presencaConcorrencia: 'MODERADA',
      rendaMediaMensalBrl: 2750,
      distanciaHubMaisProximoKm: 55,
      polosEducacionaisCount: 4,
      frotaVeiculosRegistrada: 68000
    }
  ];

  /**
   * Avalia a viabilidade e gera ranking completo de expansão territorial
   */
  public generateExpansionRanking(): ExpansionScoreBreakdown[] {
    const scores = this.candidateCities.map((c) => {
      // 1. Score Demográfico (População e densidade)
      const popScore = Math.min(100, (c.populacaoTotal / 150000) * 80 + (c.densidadeDemograficaHabKm2 / 200) * 20);
      
      // 2. Score Econômico (PIB per capita e renda média)
      const econScore = Math.min(100, (c.pibPerCapitaBrl / 35000) * 50 + (c.rendaMediaMensalBrl / 3500) * 50);

      // 3. Score Competitivo (Baixa concorrência = maior oportunidade de monopólio regional)
      let compScore = 60;
      if (c.presencaConcorrencia === 'INEXISTENTE') compScore = 100;
      else if (c.presencaConcorrencia === 'BAIXA') compScore = 85;
      else if (c.presencaConcorrencia === 'MODERADA') compScore = 70;
      else compScore = 50;

      // 4. Score de Proximidade Logística (Mais perto de hub já aberto = mais fácil o go-to-market)
      const proxScore = Math.max(20, 100 - (c.distanciaHubMaisProximoKm * 0.6));

      // Média Ponderada
      const totalScore = Math.round(
        popScore * 0.30 +
        econScore * 0.25 +
        compScore * 0.30 +
        proxScore * 0.15
      );

      let tier: ExpansionScoreBreakdown['tierViabilidade'] = 'FUTURA';
      if (totalScore >= 80) tier = 'IMEDIATA';
      else if (totalScore >= 70) tier = 'ALTA_PRIORIDADE';
      else if (totalScore >= 55) tier = 'MEDIA_PRIORIDADE';

      const corridasEstimadasDia = Math.round((c.populacaoTotal * 0.015) + c.polosEducacionaisCount * 80);
      const frotaMinima = Math.max(15, Math.round(corridasEstimadasDia * 0.08));
      const paybackMeses = Math.max(1.5, Number((36.0 / (totalScore / 10)).toFixed(1)));

      const justificativa = `Município com ${c.populacaoTotal.toLocaleString('pt-BR')} habitantes e concorrência ${c.presencaConcorrencia}. Potencial diário de ${corridasEstimadasDia} corridas com payback estimado em ${paybackMeses} meses.`;

      return {
        cityId: c.cityId,
        cityName: c.cityName,
        stateCode: c.stateCode,
        scoreTotal: totalScore,
        tierViabilidade: tier,
        corridasEstimadasDia,
        frotaMinimaLancamento: frotaMinima,
        paybackEstimadoMeses: paybackMeses,
        scoreDemografico: Math.round(popScore),
        scoreEconomico: Math.round(econScore),
        scoreCompetitivo: compScore,
        justificativaEstrategica: justificativa
      };
    });

    // Ordenação decrescente por score de viabilidade
    scores.sort((a, b) => b.scoreTotal - a.scoreTotal);
    return scores;
  }
}

export const cityExpansionEngine = new CityExpansionEngine();
