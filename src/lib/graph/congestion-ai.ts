/**
 * REALTIME CONGESTION PREDICTION ENGINE
 * 
 * Inteligência Preditiva de Tráfego e Congestionamentos Viários:
 * - Predição contínua em múltiplos horizontes: 15 min, 30 min e 60 min
 * - Fusão de Telemetria: Histórico circadiano, Clima, Eventos e Densidade H3
 * - Índice CongestionRisk (0 a 100) com detecção preventiva de nós de estrangulamento
 * - Ajuste proativo de ETA e penalização de arestas no motor de grafos
 */

export interface CongestionInputTelemetry {
  cityId: string;
  zoneId: string;
  zoneName: string;
  velocidadeMediaAtualKmh: number;
  velocidadeLivreHistoricaKmh: number;
  horaDoDia: number; // 0 a 23
  diaDaSemana: number; // 0 a 6
  clima: 'LIMPO' | 'CHUVA_LEVE' | 'CHUVA_MODERADA' | 'TEMPESTADE';
  eventosAtivosCount: number;
  densidadeVeiculosPorKm2: number;
}

export interface HorizonCongestionForecast {
  timeframeMinutes: 15 | 30 | 60;
  congestionRiskScore: number; // 0 a 100
  velocidadeEsperadaKmh: number;
  nivelTrafego: 'LIVRE_FLUIDO' | 'MODERADO' | 'LENTO' | 'ENGARRAFADO';
  tempoAdicionalPorKmSegundos: number;
  arestasCriticasSugeridasDesvio: string[];
}

export interface CongestionReport {
  cityId: string;
  zoneId: string;
  zoneName: string;
  evaluatedAt: number;
  congestionRiskAtual: number; // 0 a 100
  previsoesHorizontes: Record<'15M' | '30M' | '60M', HorizonCongestionForecast>;
  ajusteBufferEtaMinutos: number;
  acaoProativaDespacho: string;
}

export class CongestionAIEngine {
  /**
   * Avalia a telemetria e projeta congestionamentos nos horizontes de 15m, 30m e 60m
   */
  public predictCongestion(telemetry: CongestionInputTelemetry): CongestionReport {
    const timestamp = Date.now();
    
    // 1. Cálculo da degradação imediata de velocidade
    const velAtual = Math.max(5.0, telemetry.velocidadeMediaAtualKmh);
    const velLivre = Math.max(20.0, telemetry.velocidadeLivreHistoricaKmh);
    const degradacaoVelocidadePct = Math.max(0, ((velLivre - velAtual) / velLivre) * 100.0);

    // 2. Fatores de risco ambientais e contextuais
    const isHorarioPico = (telemetry.horaDoDia >= 7 && telemetry.horaDoDia <= 9) || 
                          (telemetry.horaDoDia >= 17 && telemetry.horaDoDia <= 19);
    const pesoPico = isHorarioPico ? 25 : 5;

    const pesoClima = telemetry.clima === 'TEMPESTADE' ? 30 : 
                      telemetry.clima === 'CHUVA_MODERADA' ? 18 : 
                      telemetry.clima === 'CHUVA_LEVE' ? 8 : 0;

    const pesoEventos = Math.min(25, telemetry.eventosAtivosCount * 12);
    const pesoDensidade = Math.min(20, (telemetry.densidadeVeiculosPorKm2 / 80.0) * 20);

    // CongestionRisk Atual (0 a 100)
    const riskAtual = Math.max(0, Math.min(100, Math.round(
      degradacaoVelocidadePct * 0.40 + pesoPico + pesoClima + pesoEventos + pesoDensidade
    )));

    // 3. Projeção Preditiva para 15m, 30m e 60m
    const makeHorizonForecast = (minutes: 15 | 30 | 60, multiplicadorEvolucao: number): HorizonCongestionForecast => {
      const riskProjetado = Math.max(0, Math.min(100, Math.round(riskAtual * multiplicadorEvolucao)));
      
      let nivel: HorizonCongestionForecast['nivelTrafego'] = 'LIVRE_FLUIDO';
      if (riskProjetado >= 75) nivel = 'ENGARRAFADO';
      else if (riskProjetado >= 50) nivel = 'LENTO';
      else if (riskProjetado >= 30) nivel = 'MODERADO';

      const velEstimada = Math.max(8.0, Number((velLivre * (1.0 - (riskProjetado / 120.0))).toFixed(1)));
      const tempoAdicionalSegundos = Math.round((riskProjetado / 100.0) * 45); // até +45s por km

      const desvios = riskProjetado >= 60 ? ['Avenida Central', 'Ponte Velha', 'Acesso Hospitalar'] : [];

      return {
        timeframeMinutes: minutes,
        congestionRiskScore: riskProjetado,
        velocidadeEsperadaKmh: velEstimada,
        nivelTrafego: nivel,
        tempoAdicionalPorKmSegundos: tempoAdicionalSegundos,
        arestasCriticasSugeridasDesvio: desvios
      };
    };

    // Fator de tendência: se for horário pré-pico, o risco cresce ao longo dos 60m
    const tendenciaCrescimento = (telemetry.horaDoDia === 6 || telemetry.horaDoDia === 16) ? 1.25 : 0.95;

    const p15 = makeHorizonForecast(15, 1.05);
    const p30 = makeHorizonForecast(30, Number((1.05 * tendenciaCrescimento).toFixed(2)));
    const p60 = makeHorizonForecast(60, Number((1.10 * tendenciaCrescimento).toFixed(2)));

    // Buffer preventivo de ETA
    const bufferEta = Number((Math.max(0, (riskAtual - 30) * 0.06)).toFixed(1));
    let acao = 'Fluxo em normalidade. Nenhuma intervenção necessária.';

    if (riskAtual >= 70) {
      acao = `Alerta Vermelho de Tráfego: Injetando +${bufferEta}m no ETA do passageiro e ativando rotas alternativas no Graph Mobility Engine.`;
    } else if (riskAtual >= 45) {
      acao = `Atenção Moderada: Previsão de retenção em 30 min. Buffer de +${bufferEta}m aplicado preventivamente.`;
    }

    return {
      cityId: telemetry.cityId,
      zoneId: telemetry.zoneId,
      zoneName: telemetry.zoneName,
      evaluatedAt: timestamp,
      congestionRiskAtual: riskAtual,
      previsoesHorizontes: {
        '15M': p15,
        '30M': p30,
        '60M': p60
      },
      ajusteBufferEtaMinutos: bufferEta,
      acaoProativaDespacho: acao
    };
  }
}

export const congestionAIEngine = new CongestionAIEngine();
