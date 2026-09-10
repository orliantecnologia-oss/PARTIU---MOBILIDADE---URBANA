/**
 * AUTONOMOUS FUEL STABILIZATION FUND
 * 
 * Fundo de Estabilização e Proteção Econômica contra Oscilação de Combustíveis:
 * - Monitora índices de estresse de combustível (Gasolina, Etanol, GNV)
 * - Avalia a pressão inflacionária na margem operacional dos motoristas
 * - Produz o FuelStressIndex (0 a 100) e o ProtectionScore (0 a 100)
 * - Recomenda autonomamente: Subsídios compensatórios por km, bônus de combustível e redução temporária de take-rate
 */

export interface FuelBenchmarkData {
  cityId: string;
  cityName: string;
  precoGasolinaLitroBrl: number;
  precoEtanolLitroBrl: number;
  precoGnvM3Brl: number;
  precoReferenciaBaseLitroBrl: number; // Preço base contratual (ex: R$ 5,20)
  inflacaoAcumulada12mPct: number; // Ex: 4.8%
  tarifaBasePorKmBrl: number; // Ex: R$ 2,40/km
  kmMedioPorCorrida: number;
}

export interface FuelStabilizationReport {
  cityId: string;
  cityName: string;
  timestamp: number;
  fuelStressIndex: number; // 0 a 100 (Acima de 65 = estresse agudo)
  inflationImpactPct: number;
  economicPressureScore: number; // 0 a 100
  protectionScore: number; // 0 a 100 (Capacidade de absorção pelo fundo)
  
  // Ações Compensatórias Recomendadas
  acoesRecomendadas: {
    subsidioCompensatorioPorKmBrl: number; // Ex: +R$ 0,18/km
    reducaoTemporariaTakeRatePct: number; // Ex: de 5.0% para 3.5% (-1.5%)
    bonusAbastecimentoCredenciadoBrl: number; // Cashback em rede conveniada
  };
  
  fundoReservaDisponivelBrl: number;
  custoProjetadoAcao30dBrl: number;
  statusAlerta: 'ESTABILIDADE_NORMAL' | 'ATENCAO_MODERADA' | 'ALERTA_PRESSAO' | 'CRISE_COMBUSTIVEL';
  justificativaEconomica: string;
}

export class FuelProtectionFundEngine {
  private reserveBalanceBrl = 120000.0; // Saldo inicial do Fundo de Estabilização

  /**
   * Avalia a pressão de combustível em uma cidade e calcula a intervenção mitigatória
   */
  public evaluateFuelPressure(data: FuelBenchmarkData): FuelStabilizationReport {
    const timestamp = Date.now();
    const variacaoGasolinaPct = ((data.precoGasolinaLitroBrl - data.precoReferenciaBaseLitroBrl) / data.precoReferenciaBaseLitroBrl) * 100.0;

    // 1. FuelStressIndex (0 a 100)
    // Mede a proporção do custo de combustível em relação à tarifa de km recebida
    // Custo típico: Carro com 10 km/l consome 0.1l/km -> R$ 0,60/km de gasolina
    const custoCombustivelPorKm = data.precoGasolinaLitroBrl / 10.5;
    const impactoPercentualTarifa = (custoCombustivelPorKm / Math.max(1, data.tarifaBasePorKmBrl)) * 100.0;

    const fuelStressIndex = Math.max(0, Math.min(100, Math.round(
      (impactoPercentualTarifa / 35.0) * 60 + Math.max(0, variacaoGasolinaPct) * 2.0
    )));

    // 2. Economic Pressure Score (0 a 100)
    const economicPressure = Math.max(0, Math.min(100, Math.round(
      fuelStressIndex * 0.70 + (data.inflacaoAcumulada12mPct * 4.5) * 0.30
    )));

    // 3. Capacidade do Fundo e ProtectionScore (0 a 100)
    const protectionScore = Math.max(10, Math.min(99, Math.round(
      (this.reserveBalanceBrl / 150000.0) * 70 + (100 - fuelStressIndex) * 0.30
    )));

    // 4. Determinação de Ações Compensatórias Autônomas
    let subsidioKm = 0.0;
    let reducaoTakeRate = 0.0;
    let bonusCashback = 0.0;
    let status: FuelStabilizationReport['statusAlerta'] = 'ESTABILIDADE_NORMAL';
    let justificativa = `Preços de combustíveis em ${data.cityName} operam em patamares estáveis. Margem dos condutores preservada.`;

    if (fuelStressIndex >= 75) {
      status = 'CRISE_COMBUSTIVEL';
      subsidioKm = 0.22; // R$ 0,22 adicional por km rodado
      reducaoTakeRate = 1.5; // take-rate temporário de 3.5% (sobre base de 5.0%)
      bonusCashback = 15.0; // R$ 15 cashback por abastecimento em rede parceira
      justificativa = `Gatilho de Crise Ativado: Gasolina atingiu R$ ${data.precoGasolinaLitroBrl.toFixed(2)} (+${variacaoGasolinaPct.toFixed(1)}% sobre base). Acionando subsídio emergencial de R$ 0,22/km e redução de 1.5% no take-rate para blindar renda dos motoristas.`;
    } else if (fuelStressIndex >= 55) {
      status = 'ALERTA_PRESSAO';
      subsidioKm = 0.12;
      reducaoTakeRate = 0.5; // take-rate de 4.5%
      bonusCashback = 8.0;
      justificativa = `Pressão moderada no combustível em ${data.cityName}. Fundo de proteção injeta R$ 0,12/km de suporte temporário.`;
    } else if (fuelStressIndex >= 40) {
      status = 'ATENCAO_MODERADA';
      subsidioKm = 0.05;
      reducaoTakeRate = 0.0;
      bonusCashback = 5.0;
      justificativa = `Atenção preventiva: inflação setorial requer monitoramento de postos parceiros.`;
    }

    // Estimativa de custo mensal da intervenção (para ~25.000 km rodados/mês no cluster)
    const kmProjetadosCluster = 25000;
    const custoAcao30d = Math.round(kmProjetadosCluster * subsidioKm + (bonusCashback * 250));

    return {
      cityId: data.cityId,
      cityName: data.cityName,
      timestamp,
      fuelStressIndex,
      inflationImpactPct: Number(variacaoGasolinaPct.toFixed(1)),
      economicPressureScore: economicPressure,
      protectionScore,
      acoesRecomendadas: {
        subsidioCompensatorioPorKmBrl: Number(subsidioKm.toFixed(2)),
        reducaoTemporariaTakeRatePct: reducaoTakeRate,
        bonusAbastecimentoCredenciadoBrl: bonusCashback
      },
      fundoReservaDisponivelBrl: this.reserveBalanceBrl,
      custoProjetadoAcao30dBrl: custoAcao30d,
      statusAlerta: status,
      justificativaEconomica: justificativa
    };
  }

  /**
   * Alimenta a reserva financeira do fundo (com 0.5% da receita bruta mensal)
   */
  public contributeToReserve(amountBrl: number): number {
    this.reserveBalanceBrl += amountBrl;
    return this.reserveBalanceBrl;
  }
}

export const fuelProtectionFundEngine = new FuelProtectionFundEngine();
