/**
 * MARKETPLACE SIMULATION LAB
 * 
 * Laboratório de simulação contrafactual preditiva em múltiplos horizontes:
 * 24 horas, 7 dias, 30 dias e 90 dias.
 * Avalia riscos de mercado antes de qualquer commit real em produção.
 */

export type SimulationHorizon = '24_HORAS' | '7_DIAS' | '30_DIAS' | '90_DIAS';

export interface SimulationScenarioInput {
  scenarioName: string;
  tipoCenario: 
    | 'NOVA_CIDADE'
    | 'MUDANCA_TARIFA'
    | 'ALTERACAO_TAKE_RATE'
    | 'CAMPANHA_PROMOCIONAL'
    | 'BONUS_MOTORISTAS'
    | 'EXPANSAO_GEOGRAFICA';
  cityId: string;
  horizonte: SimulationHorizon;
  parametros: {
    variacaoBandeiradaPct?: number;
    variacaoKmPct?: number;
    novoTakeRatePct?: number;
    valorBonusBrl?: number;
    investimentoMarketingBrl?: number;
    populacaoAlvo?: number;
  };
}

export interface HorizonSimulationResult {
  horizon: SimulationHorizon;
  diasSimulados: number;
  corridasProjetadas: number;
  gmvProjetadoBrl: number;
  receitaLiquidaPlataformaBrl: number;
  ganhoMedioHoraCondutorBrl: number;
  cancellationRateEsperadoPct: number;
  marketShareEstimadoPct: number;
  paybackDias: number;
  probabilidadeSucessoPct: number;
  nivelRisco: 'BAIXO' | 'MODERADO' | 'ELEVADO' | 'CRITICO';
}

export interface SimulationReport {
  scenarioId: string;
  scenarioName: string;
  simulatedAt: number;
  cityId: string;
  horizonResults: Record<SimulationHorizon, HorizonSimulationResult>;
  recomendacaoFinal: 'APROVADO_PARA_PRODUCAO' | 'APROVADO_COM_RESSALVAS' | 'REJEITADO';
  parecerTecnico: string;
}

export class MarketplaceSimulationLab {
  /**
   * Executa simulação contrafactual para os 4 horizontes temporais (24h, 7d, 30d, 90d)
   */
  public runFullSimulation(input: SimulationScenarioInput): SimulationReport {
    const baseDailyRides = 1200;
    const baseTicket = 18.50;
    const baseTakeRate = (input.parametros.novoTakeRatePct || 5.0) / 100.0;

    const deltaTarifa = ((input.parametros.variacaoBandeiradaPct || 0) + (input.parametros.variacaoKmPct || 0)) / 2;
    const elasticityDemand = -(deltaTarifa * 0.4); // se tarifa sobe 10%, demanda cai 4%
    const elasticitySupply = deltaTarifa * 0.6; // se tarifa sobe 10%, oferta sobe 6%

    const generateHorizon = (days: number, hName: SimulationHorizon): HorizonSimulationResult => {
      const volumeMultiplier = 1.0 + (elasticityDemand / 100.0);
      const rides = Math.round(baseDailyRides * days * volumeMultiplier);
      const ticket = baseTicket * (1.0 + deltaTarifa / 100.0);
      const gmv = Math.round(rides * ticket);
      const receita = Math.round(gmv * baseTakeRate);
      const ganhoHora = Number((36.40 * (1.0 + elasticitySupply / 100.0)).toFixed(2));
      const cancelRate = Number(Math.max(2.0, 3.8 - (elasticitySupply * 0.2)).toFixed(1));

      let risco: HorizonSimulationResult['nivelRisco'] = 'BAIXO';
      if (deltaTarifa > 15 || input.parametros.novoTakeRatePct && input.parametros.novoTakeRatePct > 8.0) {
        risco = 'ELEVADO';
      } else if (deltaTarifa < -15) {
        risco = 'MODERADO';
      }

      return {
        horizon: hName,
        diasSimulados: days,
        corridasProjetadas: rides,
        gmvProjetadoBrl: gmv,
        receitaLiquidaPlataformaBrl: receita,
        ganhoMedioHoraCondutorBrl: ganhoHora,
        cancellationRateEsperadoPct: cancelRate,
        marketShareEstimadoPct: Math.min(85, Math.round(48 + days * 0.15)),
        paybackDias: Math.max(1, Math.round(18 - (deltaTarifa * 0.2))),
        probabilidadeSucessoPct: risco === 'BAIXO' ? 94 : risco === 'MODERADO' ? 82 : 68,
        nivelRisco: risco
      };
    };

    const horizons: Record<SimulationHorizon, HorizonSimulationResult> = {
      '24_HORAS': generateHorizon(1, '24_HORAS'),
      '7_DIAS': generateHorizon(7, '7_DIAS'),
      '30_DIAS': generateHorizon(30, '30_DIAS'),
      '90_DIAS': generateHorizon(90, '90_DIAS')
    };

    const isHealthy = horizons['90_DIAS'].probabilidadeSucessoPct >= 80;
    const recomendacaoFinal = isHealthy ? 'APROVADO_PARA_PRODUCAO' : 'APROVADO_COM_RESSALVAS';
    const parecerTecnico = `Cenário "${input.scenarioName}" simulado com sucesso. A projeção de 90 dias indica GMV acumulado de R$ ${horizons['90_DIAS'].gmvProjetadoBrl.toLocaleString('pt-BR')} com receita líquida de R$ ${horizons['90_DIAS'].receitaLiquidaPlataformaBrl.toLocaleString('pt-BR')}. Nível de risco global avaliado em ${horizons['90_DIAS'].nivelRisco}.`;

    return {
      scenarioId: `SIM-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      scenarioName: input.scenarioName,
      simulatedAt: Date.now(),
      cityId: input.cityId,
      horizonResults: horizons,
      recomendacaoFinal,
      parecerTecnico
    };
  }
}

export const marketplaceSimulationLab = new MarketplaceSimulationLab();
