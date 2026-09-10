/**
 * DRIVER ECONOMICS ENGINE
 * 
 * Modela a microeconomia individual e agregada dos motoristas parceiros:
 * - Ganho Bruto vs Ganho Líquido Real
 * - Custo Real de Combustível (Gasolina, Etanol, GNV)
 * - Custos Operacionais Ocultos (depreciação por km, desgaste de pneus, óleo, seguro e manutenção preventiva)
 * - Renda Líquida por Hora (R$/h), Renda por Km Rodado (R$/km) e Margem por Turno (R$/turno)
 * - Driver Economic Health Score (0 a 100) com detecção preventiva de vulnerabilidade financeira
 */

export interface DriverShiftData {
  driverId: string;
  driverName?: string;
  horasOnlineTurno: number; // Ex: 8.5 horas
  kmRodadosTotais: number; // Ex: 160 km (englobando pickup, viagem e deadhead)
  kmRodadosEmViagem: number; // Ex: 115 km
  corridasConcluidas: number; // Ex: 14 corridas
  ganhoBrutoTurnoBrl: number; // Ex: R$ 340,00
  tipoCombustivel: 'GASOLINA' | 'ETANOL' | 'GNV' | 'ELETRICO';
  consumoKmPorLitro: number; // Ex: 11.5 km/l
  precoCombustivelLitroBrl: number; // Ex: R$ 5,85
  custoManutencaoPorKmBrl?: number; // Ex: R$ 0,18/km (óleo, pastilha, pneu, depreciação)
}

export interface DriverCostBreakdown {
  custoCombustivelBrl: number;
  custoDepreciacaoVeicularBrl: number;
  custoManutencaoPreventivaBrl: number;
  custoSeguroELimpezaBrl: number;
  custosOperacionaisTotaisBrl: number;
}

export interface DriverEconomicProfile {
  driverId: string;
  timestamp: number;
  ganhoBrutoBrl: number;
  custosOperacionais: DriverCostBreakdown;
  ganhoLiquidoRealBrl: number;
  margemLiquidaPct: number; // Ganho Líquido / Ganho Bruto
  
  // Métricas de Rendimento Unitário
  rendaLiquidaPorHoraBrl: number;
  rendaLiquidaPorKmBrl: number;
  eficienciaKmPct: number; // Km em viagem / Km totais
  
  // Score de Saúde Financeira
  driverEconomicHealthScore: number; // 0 a 100
  classificacaoSaude: 'EXCELENTE_SUSTENTAVEL' | 'BOM_RENTAVEL' | 'VULNERAVEL_ALERTA' | 'CRITICO_DEFICITARIO';
  riscoChurnFinanceiroPct: number; // 0 a 100%
  recomendacaoIntervencao: string;
}

export class DriverEconomicsEngine {
  /**
   * Avalia o perfil microeconômico de um turno ou período de condução
   */
  public evaluateDriverShift(shift: DriverShiftData): DriverEconomicProfile {
    const kmTotais = Math.max(1, shift.kmRodadosTotais);
    const consumo = Math.max(4, shift.consumoKmPorLitro);
    
    // 1. Custos de Combustível
    const litrosConsumidos = kmTotais / consumo;
    const custoCombustivel = Number((litrosConsumidos * shift.precoCombustivelLitroBrl).toFixed(2));

    // 2. Custos de Depreciação e Desgaste (FIPE média de carro popular no Brasil: R$ 0,14 a R$ 0,22 por km)
    const custoDepreciacaoKm = 0.12; // R$/km
    const custoDepreciacao = Number((kmTotais * custoDepreciacaoKm).toFixed(2));

    // 3. Manutenção preventiva (pneus, pastilhas de freio, troca de óleo, suspensão)
    const custoManutencaoKm = shift.custoManutencaoPorKmBrl || 0.10;
    const custoManutencao = Number((kmTotais * custoManutencaoKm).toFixed(2));

    // 4. Rateio diário de seguro automotivo, lavagem e taxa de celular
    const custoSeguroLimpeza = 12.0; // R$ 12,00 por turno

    const custosTotais = Number((custoCombustivel + custoDepreciacao + custoManutencao + custoSeguroLimpeza).toFixed(2));
    const ganhoLiquido = Number((Math.max(0, shift.ganhoBrutoTurnoBrl - custosTotais)).toFixed(2));
    const margemLiquida = shift.ganhoBrutoTurnoBrl > 0 
      ? Number(((ganhoLiquido / shift.ganhoBrutoTurnoBrl) * 100).toFixed(1))
      : 0;

    const horas = Math.max(1.0, shift.horasOnlineTurno);
    const rendaPorHora = Number((ganhoLiquido / horas).toFixed(2));
    const rendaPorKm = Number((ganhoLiquido / kmTotais).toFixed(2));
    const eficienciaKm = Number(((shift.kmRodadosEmViagem / kmTotais) * 100).toFixed(1));

    // 5. Driver Economic Health Score (0 a 100):
    // Pondera: Renda/Hora (40%), Margem Líquida (30%), Eficiência de Km (20%), Volume Bruto (10%)
    // Benchmark Brasil: R$ 25+/h líquido = excelente, R$ 18+/h = bom, R$ 12-/h = crítico
    const scoreRendaHora = Math.max(0, Math.min(100, (rendaPorHora / 30.0) * 100));
    const scoreMargem = Math.max(0, Math.min(100, (margemLiquida / 60.0) * 100));
    const scoreEficienciaKm = Math.max(0, Math.min(100, (eficienciaKm / 80.0) * 100));
    const scoreBruto = Math.max(0, Math.min(100, (shift.ganhoBrutoTurnoBrl / 350.0) * 100));

    const healthScore = Math.max(5, Math.min(99, Math.round(
      scoreRendaHora * 0.40 +
      scoreMargem * 0.30 +
      scoreEficienciaKm * 0.20 +
      scoreBruto * 0.10
    )));

    let classificacao: DriverEconomicProfile['classificacaoSaude'] = 'BOM_RENTAVEL';
    let riscoChurn = 15;
    let recomendacao = 'Operação equilibrada. Manter posicionamento atual.';

    if (healthScore >= 80 && rendaPorHora >= 24) {
      classificacao = 'EXCELENTE_SUSTENTAVEL';
      riscoChurn = 5;
      recomendacao = 'Alta sustentabilidade econômica. Condutor de alto valor para frotas Premium.';
    } else if (healthScore >= 60 && rendaPorHora >= 16) {
      classificacao = 'BOM_RENTAVEL';
      riscoChurn = 18;
      recomendacao = 'Operação saudável. Pode melhorar posicionamento em horários de pico para elevar margem.';
    } else if (healthScore >= 40) {
      classificacao = 'VULNERAVEL_ALERTA';
      riscoChurn = 48;
      recomendacao = 'Vulnerabilidade financeira devido a alto deadhead ou combustível elevado. Sugerir rotas concentradas.';
    } else {
      classificacao = 'CRITICO_DEFICITARIO';
      riscoChurn = 85;
      recomendacao = 'Risco iminente de abandono. Acionar missão promocional com bônus D+0 para restaurar margem líquida.';
    }

    return {
      driverId: shift.driverId,
      timestamp: Date.now(),
      ganhoBrutoBrl: shift.ganhoBrutoTurnoBrl,
      custosOperacionais: {
        custoCombustivelBrl: custoCombustivel,
        custoDepreciacaoVeicularBrl: custoDepreciacao,
        custoManutencaoPreventivaBrl: custoManutencao,
        custoSeguroELimpezaBrl: custoSeguroLimpeza,
        custosOperacionaisTotaisBrl: custosTotais
      },
      ganhoLiquidoRealBrl: ganhoLiquido,
      margemLiquidaPct: margemLiquida,
      rendaLiquidaPorHoraBrl: rendaPorHora,
      rendaLiquidaPorKmBrl: rendaPorKm,
      eficienciaKmPct: eficienciaKm,
      driverEconomicHealthScore: healthScore,
      classificacaoSaude: classificacao,
      riscoChurnFinanceiroPct: riscoChurn,
      recomendacaoIntervencao: recomendacao
    };
  }
}

export const driverEconomicsEngine = new DriverEconomicsEngine();
