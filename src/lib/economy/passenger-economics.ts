/**
 * PASSENGER LIFETIME ECONOMY ENGINE
 * 
 * Modela a economia individual e de coorte dos passageiros da plataforma:
 * - LTV (Lifetime Value) preditivo com desconto temporal
 * - Matriz RFM (Recência, Frequência, Valor Monetário)
 * - Elasticidade-Preço individualizada e Elasticidade ao Tempo de Espera (ETA)
 * - Probabilidade de Abandono (Churn Risk)
 * - Passenger Value Score (0 a 100) e segmentação comportamental
 */

export interface PassengerUsageHistory {
  passengerId: string;
  passengerName?: string;
  totalCorridasHistorico: number;
  corridasUltimos30Dias: number;
  diasDesdeUltimaCorrida: number; // Recência
  gastoTotalHistoricoBrl: number;
  ticketMedioBrl: number;
  taxaCancelamentoPassageiroPct: number;
  avaliacaoMediaDada: number; // 1 a 5
  rejeitouSurgeCount: number; // Abandono quando surge > 1.2
  desistenciaPorEtaElevadoCount: number; // Cancelou quando ETA > 8 min
}

export interface PassengerEconomicProfile {
  passengerId: string;
  timestamp: number;
  recenciaDias: number;
  frequenciaMensal: number;
  ticketMedioBrl: number;
  ltvEstimado12MesesBrl: number;
  margemContribuicaoLtvBrl: number;
  
  // Elasticidades Microeconômicas
  elasticidadePreco: number; // Sensibilidade a Surge e preço base
  elasticidadeTempoEspera: number; // Sensibilidade a minutos de ETA
  
  // Risco e Valor
  probabilidadeAbandonoPct: number; // 0 a 100%
  passengerValueScore: number; // 0 a 100
  segmentoComportamental: 
    | 'PLATINUM_VIP'
    | 'HIGH_VALUE_REGULAR'
    | 'FREQUENTE_PRECO_SENSIVEL'
    | 'OCASIONAL'
    | 'EM_RISCO_CHURN'
    | 'DORMENTE_INATIVO';
  
  estrategiaRetencaoSugerida: string;
}

export class PassengerEconomicsEngine {
  /**
   * Avalia o perfil microeconômico de um passageiro e calcula seu LTV e Value Score
   */
  public evaluatePassenger(history: PassengerUsageHistory): PassengerEconomicProfile {
    const recencia = Math.max(0, history.diasDesdeUltimaCorrida);
    const freqMensal = Math.max(0, history.corridasUltimos30Dias);
    const ticket = Math.max(8.0, history.ticketMedioBrl || 18.5);

    // 1. Sensibilidade e Elasticidades
    // Sensibilidade a preço: proporção de vezes que desistiu com surge elevado
    const sensibilidadeSurgeRatio = history.rejeitouSurgeCount / Math.max(1, history.corridasUltimos30Dias + history.rejeitouSurgeCount);
    const ep = Number((-0.85 - sensibilidadeSurgeRatio * 1.5).toFixed(2));

    // Sensibilidade ao tempo de espera: despesas canceladas por demora de motorista
    const sensibilidadeEtaRatio = history.desistenciaPorEtaElevadoCount / Math.max(1, history.totalCorridasHistorico);
    const eEta = Number((-0.50 - sensibilidadeEtaRatio * 1.8).toFixed(2));

    // 2. Probabilidade de Abandono (Modelo de Sobrevivência / Churn Preditivo)
    // Curva sigmoide com base na recência em dias e queda de frequência
    let riscoChurn = 10;
    if (recencia > 45) {
      riscoChurn = 88;
    } else if (recencia > 21) {
      riscoChurn = 55;
    } else if (recencia > 10) {
      riscoChurn = 28;
    }

    if (history.taxaCancelamentoPassageiroPct > 20) {
      riscoChurn = Math.min(95, riscoChurn + 15);
    }

    // 3. Projeção de LTV em 12 meses
    // LTV = Frequência Mensal * 12 * Ticket Médio * (1 - Churn/100) * Fator de Desconto Temporal (0.92)
    const taxaRetencaoAnual = Math.max(0.1, (100 - riscoChurn) / 100.0);
    const gmvAnualProjetado = freqMensal * 12 * ticket * taxaRetencaoAnual * 0.92;
    const ltv = Number(gmvAnualProjetado.toFixed(2));
    const margemContribuicaoLtv = Number((ltv * 0.05).toFixed(2)); // 5% take rate base (Modelo Híbrido Assinatura + Comissão)

    // 4. Passenger Value Score (0 a 100)
    // Pondera: Frequência (35%), Recência positiva (25%), Ticket Médio (25%), Baixo Cancelamento (15%)
    const scoreFreq = Math.max(0, Math.min(100, (freqMensal / 15.0) * 100));
    const scoreRecencia = Math.max(0, Math.min(100, 100 - recencia * 3.5));
    const scoreTicket = Math.max(0, Math.min(100, (ticket / 35.0) * 100));
    const scoreConfiabilidade = Math.max(0, Math.min(100, 100 - history.taxaCancelamentoPassageiroPct * 3));

    const valueScore = Math.max(5, Math.min(99, Math.round(
      scoreFreq * 0.35 +
      scoreRecencia * 0.25 +
      scoreTicket * 0.25 +
      scoreConfiabilidade * 0.15
    )));

    // 5. Segmentação Comportamental
    let segmento: PassengerEconomicProfile['segmentoComportamental'] = 'OCASIONAL';
    let estrategia = 'Comunicação padrão de novidades da plataforma.';

    if (recencia > 35) {
      segmento = 'DORMENTE_INATIVO';
      estrategia = 'Disparar cupom de reativação de R$ 7,00 exclusivo para retorno imediato.';
    } else if (riscoChurn >= 50) {
      segmento = 'EM_RISCO_CHURN';
      estrategia = 'Ofertar desconto dinâmico em horários de pico e garantir ETA prioritário.';
    } else if (valueScore >= 80 && freqMensal >= 8) {
      segmento = 'PLATINUM_VIP';
      estrategia = 'Prioridade máxima no despacho, suporte VIP e atendimento sem taxa de cancelamento.';
    } else if (valueScore >= 60 && freqMensal >= 4) {
      segmento = 'HIGH_VALUE_REGULAR';
      estrategia = 'Incentivar programa de fidelidade para consolidar uso diário.';
    } else if (Math.abs(ep) > 1.5) {
      segmento = 'FREQUENTE_PRECO_SENSIVEL';
      estrategia = 'Direcionar corridas para horários de vale com tarifas reduzidas.';
    }

    return {
      passengerId: history.passengerId,
      timestamp: Date.now(),
      recenciaDias: recencia,
      frequenciaMensal: freqMensal,
      ticketMedioBrl: ticket,
      ltvEstimado12MesesBrl: ltv,
      margemContribuicaoLtvBrl: margemContribuicaoLtv,
      elasticidadePreco: ep,
      elasticidadeTempoEspera: eEta,
      probabilidadeAbandonoPct: riscoChurn,
      passengerValueScore: valueScore,
      segmentoComportamental: segmento,
      estrategiaRetencaoSugerida: estrategia
    };
  }
}

export const passengerEconomicsEngine = new PassengerEconomicsEngine();
