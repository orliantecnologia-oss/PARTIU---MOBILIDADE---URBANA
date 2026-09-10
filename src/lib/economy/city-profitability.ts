/**
 * CITY PROFITABILITY ENGINE
 * 
 * Modela a viabilidade econômico-financeira de cada praça municipal:
 * - GMV, Revenue, Take Rate e Margem de Contribuição Líquida
 * - CAC (Custo de Aquisição por Passageiro e Motorista) e LTV
 * - Relação LTV/CAC e Eficiência de Capital
 * - ROI e Tempo de Payback
 * - CityProfitabilityIndex (0 a 100) e Ranking Nacional Automático
 */

import { listAllCities, CityOperationConfig } from '../partiu-city-os';
import { digitalTwinEngine } from '../partiu-digital-twin';

export interface CityFinancialMetrics {
  cityId: string;
  cityName: string;
  uf: string;
  populacao: number;
  
  // Volume e Faturamento Mensal Projetado
  corridasMensaisEstimadas: number;
  ticketMedioBrl: number;
  gmvMensalBrl: number;
  takeRateEfetivoPct: number;
  receitaBrutaMensalBrl: number;
  
  // Custos Operacionais e Custos Variáveis
  custoGatewaysBrl: number; // ~2.2% do GMV
  custoInfraTelemetriaBrl: number;
  custoSeguroViagemBrl: number; // ~R$ 0,35 por corrida
  custosVariaveisTotaisBrl: number;
  
  // Subsídios e Marketing
  subsidiosBonusMotoristasBrl: number;
  subsidiosDescontosPassageirosBrl: number;
  custoMarketingAquisicaoBrl: number;
  
  // Margem e Retorno
  margemContribuicaoBrl: number;
  margemContribuicaoPct: number;
  cacPassageiroBrl: number;
  ltvPassageiroBrl: number;
  razaoLtvCac: number;
  
  roiAnualizadoPct: number;
  paybackMeses: number;
  
  // Índices
  expansionScore: number; // 0 a 100
  cityProfitabilityIndex: number; // 0 a 100
  tierLucratividade: 'ESTRELA_ALTA_RENTABILIDADE' | 'CRESCIMENTO_SUSTENTAVEL' | 'EM_MATURACAO' | 'DEFICITARIA_REESTRUTURAR';
  recomendacaoFinOps: string;
}

export interface NationalProfitabilityOverview {
  evaluatedAt: number;
  totalCidadesAtivas: number;
  gmvNacionalTotalBrl: number;
  receitaNacionalTotalBrl: number;
  margemContribuicaoNacionalBrl: number;
  margemMediaNacionalPct: number;
  razaoLtvCacMediaNacional: number;
  rankingCidades: CityFinancialMetrics[];
  cidadesMaisLucrativas: CityFinancialMetrics[];
  cidadesPrioridadeAjuste: CityFinancialMetrics[];
}

export class CityProfitabilityEngine {
  /**
   * Calcula o P&L e as métricas de lucratividade para uma cidade específica
   */
  public calculateCityProfitability(city: CityOperationConfig): CityFinancialMetrics {
    const twin = digitalTwinEngine.getCityTwin(city.cityId);
    
    // Estimativas baseadas no twin operacional e na população
    const corridasDia = Math.max(120, Math.round(twin.corridasEmAndamento * 24 + twin.motoristasOnline * 6));
    const corridasMensais = corridasDia * 30;
    const bandeirada = city.fares?.pop?.bandeirada || 6.5;
    const valorKm = city.fares?.pop?.valorKm || 2.4;
    const ticketMedio = Number((bandeirada + 5.5 * valorKm).toFixed(2));
    
    const gmvMensal = Math.round(corridasMensais * ticketMedio);
    const takeRate = city.fares?.platformTakeRatePercent || 5.0; // Padrão base 5.0% (Modelo Híbrido: Planos de Assinatura + Comissão)
    const receitaBruta = Math.round(gmvMensal * (takeRate / 100.0));
    
    // Custos diretos variáveis
    const custoGateways = Math.round(gmvMensal * 0.022); // 2.2%
    const custoInfra = Math.round(corridasMensais * 0.08); // R$ 0,08 por chamada em nuvem
    const custoSeguro = Math.round(corridasMensais * 0.35); // R$ 0,35 seguro APP passageiro
    const custosVariaveis = custoGateways + custoInfra + custoSeguro;

    // Subsídios controlados por FinOps
    const subsidiosMotoristas = Math.round(receitaBruta * 0.12);
    const subsidiosPassageiros = Math.round(receitaBruta * 0.08);
    const marketingAquisicao = Math.round(receitaBruta * 0.15);
    const totalCustosApoio = subsidiosMotoristas + subsidiosPassageiros + marketingAquisicao;

    const margemContribuicao = receitaBruta - custosVariaveis - totalCustosApoio;
    const margemPct = Number(((margemContribuicao / Math.max(1, receitaBruta)) * 100).toFixed(1));

    // CAC e LTV de passageiro
    const novosPassageirosMes = Math.max(20, Math.round(corridasMensais * 0.04));
    const cac = Number((marketingAquisicao / novosPassageirosMes).toFixed(2));
    // LTV = Margem gerada por passageiro ativa ao longo de 12 meses (churn anual de ~35%)
    const ltv = Number((ticketMedio * (takeRate / 100.0) * 4.5 * 12 * 0.65).toFixed(2));
    const razaoLtvCac = Number((ltv / Math.max(1, cac)).toFixed(2));

    // Payback do investimento inicial e ROI
    const raio = city.operatingRadiusKm || 12;
    const investimentoAtivacaoPraca = Math.round(35000 + (raio * 1500));
    const paybackMeses = margemContribuicao > 0 
      ? Number((investimentoAtivacaoPraca / margemContribuicao).toFixed(1))
      : 36.0;
    
    const lucroAnualProjetado = margemContribuicao * 12;
    const roiAnualizado = Number(((lucroAnualProjetado / investimentoAtivacaoPraca) * 100).toFixed(1));

    // Expansion Score baseado em densidade populacional e penetração de mercado
    const populacaoEstimada = city.monthlyTripsTarget ? city.monthlyTripsTarget * 12 : 75000;
    const taxaPenetracao = (corridasDia / populacaoEstimada) * 1000;
    const expansionScore = Math.max(10, Math.min(98, Math.round(
      (Math.min(150000, populacaoEstimada) / 150000) * 40 +
      Math.min(50, taxaPenetracao * 10) +
      (city.isActive ? 20 : 0)
    )));

    // CityProfitabilityIndex (0 a 100):
    // Pondera Margem (35%), LTV/CAC (25%), Payback (20%), Volume GMV (20%)
    const scoreMargem = Math.max(0, Math.min(100, margemPct * 2));
    const scoreLtvCac = Math.max(0, Math.min(100, (razaoLtvCac / 4.0) * 100));
    const scorePayback = Math.max(0, Math.min(100, 100 - (paybackMeses * 4.0)));
    const scoreVolume = Math.max(0, Math.min(100, (gmvMensal / 300000) * 100));

    const profitabilityIndex = Math.max(5, Math.min(99, Math.round(
      scoreMargem * 0.35 +
      scoreLtvCac * 0.25 +
      scorePayback * 0.20 +
      scoreVolume * 0.20
    )));

    let tier: CityFinancialMetrics['tierLucratividade'] = 'CRESCIMENTO_SUSTENTAVEL';
    let recomendacao = 'Manter estratégia operacional equilibrada.';

    if (profitabilityIndex >= 80 && margemPct >= 40) {
      tier = 'ESTRELA_ALTA_RENTABILIDADE';
      recomendacao = 'Praça consolidada de alta margem. Alavancar reinvestimento para acelerar satélites.';
    } else if (profitabilityIndex >= 60) {
      tier = 'CRESCIMENTO_SUSTENTAVEL';
      recomendacao = 'Equilíbrio financeiro positivo. Otimizar subsídios para expandir margem líquida.';
    } else if (profitabilityIndex >= 40) {
      tier = 'EM_MATURACAO';
      recomendacao = 'Praça em fase de maturação. Monitorar CAC e elevar retenção orgânica.';
    } else {
      tier = 'DEFICITARIA_REESTRUTURAR';
      recomendacao = 'Praça deficitária com margem comprimida. Cortar subsídios de vale e recalibrar raio.';
    }

    return {
      cityId: city.cityId,
      cityName: city.cityName,
      uf: city.stateCode,
      populacao: populacaoEstimada,
      corridasMensaisEstimadas: corridasMensais,
      ticketMedioBrl: ticketMedio,
      gmvMensalBrl: gmvMensal,
      takeRateEfetivoPct: takeRate,
      receitaBrutaMensalBrl: receitaBruta,
      custoGatewaysBrl: custoGateways,
      custoInfraTelemetriaBrl: custoInfra,
      custoSeguroViagemBrl: custoSeguro,
      custosVariaveisTotaisBrl: custosVariaveis,
      subsidiosBonusMotoristasBrl: subsidiosMotoristas,
      subsidiosDescontosPassageirosBrl: subsidiosPassageiros,
      custoMarketingAquisicaoBrl: marketingAquisicao,
      margemContribuicaoBrl: margemContribuicao,
      margemContribuicaoPct: margemPct,
      cacPassageiroBrl: cac,
      ltvPassageiroBrl: ltv,
      razaoLtvCac: razaoLtvCac,
      roiAnualizadoPct: roiAnualizado,
      paybackMeses: paybackMeses,
      expansionScore,
      cityProfitabilityIndex: profitabilityIndex,
      tierLucratividade: tier,
      recomendacaoFinOps: recomendacao
    };
  }

  /**
   * Consolida a lucratividade nacional e ranqueia todas as praças cadastradas
   */
  public generateNationalProfitabilityOverview(): NationalProfitabilityOverview {
    const cities = listAllCities();
    const metricsList = cities.map((c) => this.calculateCityProfitability(c));

    // Ordenação decrescente por CityProfitabilityIndex
    metricsList.sort((a, b) => b.cityProfitabilityIndex - a.cityProfitabilityIndex);

    let gmvTotal = 0;
    let receitaTotal = 0;
    let margemTotal = 0;
    let somaLtvCac = 0;

    metricsList.forEach((m) => {
      gmvTotal += m.gmvMensalBrl;
      receitaTotal += m.receitaBrutaMensalBrl;
      margemTotal += m.margemContribuicaoBrl;
      somaLtvCac += m.razaoLtvCac;
    });

    const margemMediaPct = Number(((margemTotal / Math.max(1, receitaTotal)) * 100).toFixed(1));
    const ltvCacMedia = Number((somaLtvCac / Math.max(1, metricsList.length)).toFixed(2));

    const cidadesMaisLucrativas = metricsList.slice(0, 3);
    const cidadesPrioridadeAjuste = metricsList.filter((m) => m.cityProfitabilityIndex < 50);

    return {
      evaluatedAt: Date.now(),
      totalCidadesAtivas: metricsList.length,
      gmvNacionalTotalBrl: gmvTotal,
      receitaNacionalTotalBrl: receitaTotal,
      margemContribuicaoNacionalBrl: margemTotal,
      margemMediaNacionalPct: margemMediaPct,
      razaoLtvCacMediaNacional: ltvCacMedia,
      rankingCidades: metricsList,
      cidadesMaisLucrativas,
      cidadesPrioridadeAjuste
    };
  }
}

export const cityProfitabilityEngine = new CityProfitabilityEngine();
