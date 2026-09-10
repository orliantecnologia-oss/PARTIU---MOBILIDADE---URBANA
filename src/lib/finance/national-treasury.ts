/**
 * NATIONAL TREASURY ENGINE — TESOURARIA NACIONAL E SOLVÊNCIA
 * 
 * Monitoramento contínuo de tesouraria institucional e liquidez sistêmica:
 * - Rastreamento consolidado de GMV Nacional, Receita, EBITDA e Margens
 * - Controle de Passivo Circulante de Saques Instantâneos (PIX D+0)
 * - Índice NationalTreasuryHealth (0 a 100)
 * - Governança de Runway e Fundo de Reserva Regulatório
 */

export interface TreasurySnapshotInput {
  gmvMensalNacionalBrl: number;
  receitaBrutaNacionalBrl: number;
  ebitdaMensalNacionalBrl: number;
  subsidiosTotaisAtivosBrl: number;
  saldoCaixaLivreBrl: number;
  saldoReservasBancariasBrl: number;
  passivoCirculanteSaquesPixBrl: number; // Saldo que motoristas podem sacar instantaneamente a qualquer segundo
  burnRateMensalBrl: number;
}

export interface NationalTreasuryReport {
  timestamp: number;
  gmvNacionalBrl: number;
  receitaNacionalBrl: number;
  ebitdaNacionalBrl: number;
  margemEbitdaPct: number;
  totalSubsidiosInvestidosBrl: number;
  
  // Liquidez e Solvência
  patrimonioLiquidoTesourariaBrl: number;
  indiceLiquidezImediataRatio: number; // Caixa livre / Passivo imediato de saques
  runwayMeses: number;
  
  // Score de Saúde
  nationalTreasuryHealth: number; // 0 a 100
  statusSolvencia: 'SOLVENCIA_MAXIMA' | 'SOLVENTE_ESTAVEL' | 'RESTRICAO_LIQUIDEZ' | 'CRITICO_DEFICITARIO';
  fundoReservaRegulatorioBrl: number; // Reserva obrigatória para D+0 (mínimo 15% do passivo)
  parecerTesourariaNacional: string;
}

export class NationalTreasuryEngine {
  /**
   * Consolida a posição patrimonial da tesouraria nacional e afere o NationalTreasuryHealth
   */
  public evaluateTreasuryHealth(input: TreasurySnapshotInput): NationalTreasuryReport {
    const timestamp = Date.now();
    const margemEbitda = input.receitaBrutaNacionalBrl > 0 
      ? Number(((input.ebitdaMensalNacionalBrl / input.receitaBrutaNacionalBrl) * 100).toFixed(1))
      : 0;

    const patrimonioLiquido = input.saldoCaixaLivreBrl + input.saldoReservasBancariasBrl;
    const passivoSaques = Math.max(1.0, input.passivoCirculanteSaquesPixBrl);
    
    // Índice de Liquidez Imediata: Caixa livre disponível para honrar saques D+0
    const indiceLiquidez = Number((input.saldoCaixaLivreBrl / passivoSaques).toFixed(2));

    // Runway em meses
    let runway = Infinity;
    if (input.burnRateMensalBrl > 0) {
      runway = Number((patrimonioLiquido / input.burnRateMensalBrl).toFixed(1));
    }

    // Reserva regulatória de garantia para saques instantâneos (mínimo 20% do passivo total de condutores)
    const reservaMinima = Math.round(passivoSaques * 0.20);

    // NationalTreasuryHealth (0 a 100):
    // Pondera: Índice de Liquidez (40%), Margem EBITDA (30%), Runway (20%), Eficiência de Subsídios (10%)
    const scoreLiquidez = Math.max(0, Math.min(100, (indiceLiquidez / 1.5) * 100));
    const scoreEbitda = Math.max(0, Math.min(100, (margemEbitda + 10) * 2.5));
    const scoreRunway = runway === Infinity ? 100 : Math.max(0, Math.min(100, (runway / 18.0) * 100));
    const scoreSubsidios = Math.max(0, Math.min(100, 100 - (input.subsidiosTotaisAtivosBrl / Math.max(1, input.receitaBrutaNacionalBrl)) * 200));

    const treasuryHealth = Math.max(5, Math.min(99, Math.round(
      scoreLiquidez * 0.40 +
      scoreEbitda * 0.30 +
      scoreRunway * 0.20 +
      scoreSubsidios * 0.10
    )));

    let status: NationalTreasuryReport['statusSolvencia'] = 'SOLVENTE_ESTAVEL';
    let parecer = 'Tesouraria em patamar saudável com solvência assegurada para saques PIX D+0.';

    if (treasuryHealth >= 85 && indiceLiquidez >= 1.2) {
      status = 'SOLVENCIA_MAXIMA';
      parecer = `Solvência Máxima: Caixa livre cobre ${(indiceLiquidez * 100).toFixed(0)}% do passivo imediato de saques. Tesouraria capitalizada para aceleração de praças.`;
    } else if (treasuryHealth >= 65 && indiceLiquidez >= 0.8) {
      status = 'SOLVENTE_ESTAVEL';
      parecer = `Solvente e Estável: Índice de liquidez de ${indiceLiquidez}x e EBITDA de ${margemEbitda}%.`;
    } else if (treasuryHealth >= 45) {
      status = 'RESTRICAO_LIQUIDEZ';
      parecer = `Atenção: Liquidez imediata em ${indiceLiquidez}x. Reter parte dos subsídios para reforçar reservas bancárias D+0.`;
    } else {
      status = 'CRITICO_DEFICITARIO';
      parecer = 'Alerta Crítico de Tesouraria: Risco de restrição de saques PIX. Travar imediatamente subsídios promocionais.';
    }

    return {
      timestamp,
      gmvNacionalBrl: input.gmvMensalNacionalBrl,
      receitaNacionalBrl: input.receitaBrutaNacionalBrl,
      ebitdaNacionalBrl: input.ebitdaMensalNacionalBrl,
      margemEbitdaPct: margemEbitda,
      totalSubsidiosInvestidosBrl: input.subsidiosTotaisAtivosBrl,
      patrimonioLiquidoTesourariaBrl: patrimonioLiquido,
      indiceLiquidezImediataRatio: indiceLiquidez,
      runwayMeses: runway,
      nationalTreasuryHealth: treasuryHealth,
      statusSolvencia: status,
      fundoReservaRegulatorioBrl: reservaMinima,
      parecerTesourariaNacional: parecer
    };
  }
}

export const nationalTreasuryEngine = new NationalTreasuryEngine();
