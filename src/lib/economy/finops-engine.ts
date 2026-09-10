/**
 * FINOPS ENGINE
 * 
 * Engenharia financeira, controle de tesouraria e governança de capital de mercado:
 * - Monitoramento contínuo de Receita Líquida, Custos Diretos e Indiretos
 * - Governança de Subsídios (Bônus de condutor e vouchers de passageiro)
 * - Margem EBITDA, Burn Rate (Queima de Caixa) e Runway em meses
 * - Retorno sobre o Capital Investido (ROIC)
 * - NationalProfitabilityScore (0 a 100) com teto automático de queima de subsídios
 */

export interface FinOpsLedgerInput {
  receitaBrutaPeriodoBrl: number;
  custoGatewaysPagamentoBrl: number;
  custoInfraestruturaNuvemBrl: number;
  custoTelecomunicacaoSmsBrl: number;
  custoSeguroPassageiroBrl: number;
  custoEstornosEChargebacksBrl: number;
  
  // Subsídios
  subsidiosBonusMotoristaBrl: number;
  subsidiosDescontoPassageiroBrl: number;
  custoAquisicaoMarketingBrl: number;
  
  // Tesouraria
  saldoCaixaAtualBrl: number;
  custoFixoOperacionalBrl: number; // Salários, suporte, escritório
  diasPeriodo: number; // Ex: 30 dias
}

export interface FinOpsReport {
  timestamp: number;
  receitaBrutaBrl: number;
  receitaLiquidaAposGatewaysBrl: number;
  custosOperacionaisDiretosBrl: number;
  totalSubsidiosInvestidosBrl: number;
  totalMarketingBrl: number;
  custosTotaisBrl: number;
  
  // Margens
  margemContribuicaoBrl: number;
  margemContribuicaoPct: number;
  ebitdaPeriodoBrl: number;
  margemEbitdaPct: number;
  
  // Queima de Caixa e Runway
  burnRateMensalBrl: number; // < 0 se lucrativo
  runwayMeses: number; // Infinity se gerando caixa
  eficienciaSubsidioRatio: number; // GMV Adicional / Subsídios
  
  // Score de Saúde FinOps
  nationalProfitabilityScore: number; // 0 a 100
  statusTesouraria: 'GERANDO_CAIXA_EXPANSAO' | 'EQUILIBRIO_OPERACIONAL' | 'QUEIMA_CONTROLADA' | 'ALERTA_RUNWAY';
  tetoMaximoSubsidioSugeridoBrl: number;
  parecerFinOps: string;
}

export class FinOpsEngine {
  /**
   * Consolida o demonstrativo financeiro e afere o NationalProfitabilityScore
   */
  public generateFinOpsReport(input: FinOpsLedgerInput): FinOpsReport {
    const timestamp = Date.now();
    const dias = Math.max(1, input.diasPeriodo);
    const fatorMensal = 30.0 / dias;

    // 1. Deduções diretas de receita
    const deducoesReceita = input.custoGatewaysPagamentoBrl + input.custoEstornosEChargebacksBrl;
    const receitaLiquida = Math.max(0, input.receitaBrutaPeriodoBrl - deducoesReceita);

    // 2. Custos operacionais diretos
    const custosDiretos = input.custoInfraestruturaNuvemBrl + 
                          input.custoTelecomunicacaoSmsBrl + 
                          input.custoSeguroPassageiroBrl;

    // 3. Subsídios e incentivos de mercado
    const totalSubsidios = input.subsidiosBonusMotoristaBrl + input.subsidiosDescontoPassageiroBrl;
    const custosTotais = deducoesReceita + custosDiretos + totalSubsidios + input.custoAquisicaoMarketingBrl + input.custoFixoOperacionalBrl;

    // 4. Margem de Contribuição e EBITDA
    const margemContribuicao = receitaLiquida - custosDiretos - totalSubsidios;
    const margemContribuicaoPct = input.receitaBrutaPeriodoBrl > 0 
      ? Number(((margemContribuicao / input.receitaBrutaPeriodoBrl) * 100).toFixed(1))
      : 0;

    const ebitda = input.receitaBrutaPeriodoBrl - custosTotais;
    const margemEbitda = input.receitaBrutaPeriodoBrl > 0 
      ? Number(((ebitda / input.receitaBrutaPeriodoBrl) * 100).toFixed(1))
      : 0;

    // 5. Queima de caixa mensal (Burn Rate)
    const resultadoMensalizado = ebitda * fatorMensal;
    const burnRateMensal = resultadoMensalizado < 0 ? Math.abs(resultadoMensalizado) : 0;
    
    // Runway em meses
    let runway = Infinity;
    if (burnRateMensal > 0) {
      runway = Number((input.saldoCaixaAtualBrl / burnRateMensal).toFixed(1));
    }

    // Eficiência do subsídio: relação de receita vs subsídios concedidos
    const eficienciaSubsidio = totalSubsidios > 0 
      ? Number((input.receitaBrutaPeriodoBrl / totalSubsidios).toFixed(2)) 
      : 10.0;

    // 6. NationalProfitabilityScore (0 a 100):
    // Pondera: Margem de Contribuição (35%), Margem EBITDA (30%), Eficiência de Subsídios (20%), Runway (15%)
    const scoreMargemContribuicao = Math.max(0, Math.min(100, margemContribuicaoPct * 2.2));
    const scoreMargemEbitda = Math.max(0, Math.min(100, (margemEbitda + 20) * 2));
    const scoreEficienciaSubsidio = Math.max(0, Math.min(100, (eficienciaSubsidio / 6.0) * 100));
    const scoreRunway = runway === Infinity ? 100 : Math.max(0, Math.min(100, (runway / 18.0) * 100));

    const profitabilityScore = Math.max(5, Math.min(99, Math.round(
      scoreMargemContribuicao * 0.35 +
      scoreMargemEbitda * 0.30 +
      scoreEficienciaSubsidio * 0.20 +
      scoreRunway * 0.15
    )));

    // Teto de subsídio sugerido: não ultrapassar 18% da receita bruta
    const tetoSubsidio = Math.round(input.receitaBrutaPeriodoBrl * 0.18);

    let status: FinOpsReport['statusTesouraria'] = 'EQUILIBRIO_OPERACIONAL';
    let parecer = 'Operação sustentável dentro dos parâmetros orçamentários.';

    if (ebitda > 0 && margemEbitda >= 15.0) {
      status = 'GERANDO_CAIXA_EXPANSAO';
      parecer = `Geração líquida de caixa positiva (+R$ ${ebitda.toLocaleString('pt-BR')}) com EBITDA de ${margemEbitda}%. Recursos liberados para investimento em novas praças.`;
    } else if (ebitda >= 0) {
      status = 'EQUILIBRIO_OPERACIONAL';
      parecer = 'Operação em breakeven operacional. Manter rigor nos subsídios promocionais.';
    } else if (runway >= 12.0) {
      status = 'QUEIMA_CONTROLADA';
      parecer = `Queima planejada de R$ ${burnRateMensal.toLocaleString('pt-BR')}/mês com runway confortável de ${runway} meses. Alocação focada em consolidação de market share.`;
    } else {
      status = 'ALERTA_RUNWAY';
      parecer = `Alerta FinOps: Runway comprimido em ${runway} meses. Bloquear imediatamente subsídios excedentes e ajustar take-rate para preservar caixa.`;
    }

    return {
      timestamp,
      receitaBrutaBrl: input.receitaBrutaPeriodoBrl,
      receitaLiquidaAposGatewaysBrl: receitaLiquida,
      custosOperacionaisDiretosBrl: custosDiretos,
      totalSubsidiosInvestidosBrl: totalSubsidios,
      totalMarketingBrl: input.custoAquisicaoMarketingBrl,
      custosTotaisBrl: custosTotais,
      margemContribuicaoBrl: margemContribuicao,
      margemContribuicaoPct: margemContribuicaoPct,
      ebitdaPeriodoBrl: ebitda,
      margemEbitdaPct: margemEbitda,
      burnRateMensalBrl: burnRateMensal,
      runwayMeses: runway,
      eficienciaSubsidioRatio: eficienciaSubsidio,
      nationalProfitabilityScore: profitabilityScore,
      statusTesouraria: status,
      tetoMaximoSubsidioSugeridoBrl: tetoSubsidio,
      parecerFinOps: parecer
    };
  }
}

export const finOpsEngine = new FinOpsEngine();
