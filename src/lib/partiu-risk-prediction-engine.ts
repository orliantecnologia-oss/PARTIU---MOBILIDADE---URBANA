/**
 * MOTOR DE DETECÇÃO PREDITIVA DE COLAPSO OPERACIONAL
 * 
 * Antecipa gargalos, saturação de hotspots e colapso de liquidez
 * com 15 a 30 minutos de antecedência.
 */

export type RiskLevel = 'NORMAL' | 'ATENCAO' | 'ALERTA' | 'CRITICO';

export interface OperationalRiskInput {
  cityId: string;
  cityName: string;
  etaAtualMinutos: number;
  etaTendencia15mMinutos: number; // ETA projetado ou medido na janela anterior
  taxaAceiteAtual: number; // 0 a 100
  taxaAceiteHistorica: number; // 0 a 100
  taxaCancelamentoAtual: number; // 0 a 100
  taxaCancelamentoHistorica: number; // 0 a 100
  motoristasDisponiveis: number;
  passageirosNaFila: number;
  taxaCrescimentoDemandaPct: number; // ex: +45% de chamadas nos ultimos 10 min
  clima: 'LIMPO' | 'CHUVA_MODERADA' | 'TEMPESTADE';
  eventosAtivos: number; // quantidade de eventos ou polos ativos
  acidentesViariosRegistrados: number;
}

export interface RiskFactorBreakdown {
  fator: string;
  pontosAdicionados: number;
  descricao: string;
  severidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
}

export interface OperationalRiskAssessment {
  cityId: string;
  cityName: string;
  timestamp: number;
  score: number; // 0 a 100
  nivel: RiskLevel;
  tempoAteColapsoEstimadoMinutos: number | null; // ex: 18 min
  previsoes: {
    riscoColapsoGeral: boolean;
    riscoEscassezMotoristas: boolean;
    riscoSaturacaoHotspots: boolean;
    riscoFilaExcessiva: boolean;
  };
  fatoresImpactantes: RiskFactorBreakdown[];
  acoesRecomendadas: Array<{
    tipo: string;
    prioridade: 'P0' | 'P1' | 'P2' | 'P3';
    descricao: string;
    prazoExecucaoSegundos: number;
  }>;
}

export class RiskPredictionEngine {
  /**
   * Calcula o OperationalRiskScore de 0 a 100 e gera o parecer preditivo
   */
  public avaliarRiscoOperacional(input: OperationalRiskInput): OperationalRiskAssessment {
    let score = 0;
    const fatores: RiskFactorBreakdown[] = [];

    // 1. Variação de ETA (Crescimento de tempo de espera)
    const deltaEta = input.etaTendencia15mMinutos - input.etaAtualMinutos;
    if (input.etaAtualMinutos > 8 || deltaEta >= 2.5) {
      score += 25;
      fatores.push({
        fator: 'ETA_EM_DISPARADA',
        pontosAdicionados: 25,
        descricao: `ETA atual em ${input.etaAtualMinutos}m com projeção de alta de +${deltaEta.toFixed(1)}m`,
        severidade: 'CRITICA'
      });
    } else if (input.etaAtualMinutos > 6 || deltaEta >= 1.2) {
      score += 15;
      fatores.push({
        fator: 'ETA_ELEVADO',
        pontosAdicionados: 15,
        descricao: `ETA acima da média de conformidade (${input.etaAtualMinutos}m)`,
        severidade: 'MEDIA'
      });
    }

    // 2. Queda de Taxa de Aceite
    const deltaAceite = input.taxaAceiteHistorica - input.taxaAceiteAtual;
    if (input.taxaAceiteAtual < 65 || deltaAceite > 20) {
      score += 20;
      fatores.push({
        fator: 'QUEDA_SEVERA_ACEITE',
        pontosAdicionados: 20,
        descricao: `Aceite despencou para ${input.taxaAceiteAtual}% (queda de ${deltaAceite.toFixed(1)}%)`,
        severidade: 'CRITICA'
      });
    } else if (input.taxaAceiteAtual < 80 || deltaAceite > 10) {
      score += 10;
      fatores.push({
        fator: 'ACEITE_INSTAVEL',
        pontosAdicionados: 10,
        descricao: `Taxa de aceite em declínio moderado (${input.taxaAceiteAtual}%)`,
        severidade: 'MEDIA'
      });
    }

    // 3. Aumento de Cancelamentos
    const deltaCancel = input.taxaCancelamentoAtual - input.taxaCancelamentoHistorica;
    if (input.taxaCancelamentoAtual > 15 || deltaCancel > 8) {
      score += 20;
      fatores.push({
        fator: 'EXPLOSAO_CANCELAMENTOS',
        pontosAdicionados: 20,
        descricao: `Cancelamentos atingiram ${input.taxaCancelamentoAtual}% (+${deltaCancel.toFixed(1)}%)`,
        severidade: 'CRITICA'
      });
    } else if (input.taxaCancelamentoAtual > 8 || deltaCancel > 4) {
      score += 10;
      fatores.push({
        fator: 'CANCELAMENTOS_ELEVADOS',
        pontosAdicionados: 10,
        descricao: `Taxa de cancelamento fora da meta (${input.taxaCancelamentoAtual}%)`,
        severidade: 'MEDIA'
      });
    }

    // 4. Razão de Liquidez de Oferta (Motoristas disponíveis vs passageiros aguardando)
    const ratioDemandaOferta = input.motoristasDisponiveis > 0 
      ? input.passageirosNaFila / input.motoristasDisponiveis 
      : 3.0;

    if (ratioDemandaOferta >= 2.0 || input.motoristasDisponiveis <= 2) {
      score += 25;
      fatores.push({
        fator: 'DEFICIT_CRITICO_OFERTA',
        pontosAdicionados: 25,
        descricao: `Fila de ${input.passageirosNaFila} chamadas para apenas ${input.motoristasDisponiveis} condutores livres`,
        severidade: 'CRITICA'
      });
    } else if (ratioDemandaOferta >= 1.2) {
      score += 12;
      fatores.push({
        fator: 'PRESSAO_DE_OFERTA',
        pontosAdicionados: 12,
        descricao: `Mais passageiros que oferta imediata (razão ${ratioDemandaOferta.toFixed(2)})`,
        severidade: 'MEDIA'
      });
    }

    // 5. Pico Repentino de Demanda
    if (input.taxaCrescimentoDemandaPct >= 50) {
      score += 15;
      fatores.push({
        fator: 'PICO_ABRUPTO_DEMANDA',
        pontosAdicionados: 15,
        descricao: `Crescimento de chamadas em +${input.taxaCrescimentoDemandaPct}% nos últimos minutos`,
        severidade: 'ALTA'
      });
    } else if (input.taxaCrescimentoDemandaPct >= 25) {
      score += 8;
      fatores.push({
        fator: 'ALTA_MODERADA_DEMANDA',
        pontosAdicionados: 8,
        descricao: `Elevação de demanda em +${input.taxaCrescimentoDemandaPct}%`,
        severidade: 'BAIXA'
      });
    }

    // 6. Impacto Meteorológico
    if (input.clima === 'TEMPESTADE') {
      score += 15;
      fatores.push({
        fator: 'TEMPESTADE_METEOROLOGICA',
        pontosAdicionados: 15,
        descricao: 'Chuva severa reduz velocidade média em 40% e retira motos de circulação',
        severidade: 'ALTA'
      });
    } else if (input.clima === 'CHUVA_MODERADA') {
      score += 8;
      fatores.push({
        fator: 'CHUVA_MODERADA',
        pontosAdicionados: 8,
        descricao: 'Aumento de chamadas urbanas e redução de velocidade média',
        severidade: 'MEDIA'
      });
    }

    // 7. Eventos Simultâneos & Acidentes
    if (input.acidentesViariosRegistrados > 0) {
      const ptsAcidentes = Math.min(15, input.acidentesViariosRegistrados * 8);
      score += ptsAcidentes;
      fatores.push({
        fator: 'ACIDENTES_VIARIOS_BLOQUEIO',
        pontosAdicionados: ptsAcidentes,
        descricao: `${input.acidentesViariosRegistrados} acidentes impactando artérias da cidade`,
        severidade: 'ALTA'
      });
    }

    if (input.eventosAtivos > 0) {
      const ptsEventos = Math.min(12, input.eventosAtivos * 6);
      score += ptsEventos;
      fatores.push({
        fator: 'POLOS_EVENTOS_ATIVOS',
        pontosAdicionados: ptsEventos,
        descricao: `${input.eventosAtivos} polos de alta concentração de público em atividade`,
        severidade: 'MEDIA'
      });
    }

    // Normalização 0 - 100
    const finalScore = Math.min(100, Math.max(0, score));

    // Determinação do Nível
    let nivel: RiskLevel = 'NORMAL';
    if (finalScore >= 71) {
      nivel = 'CRITICO';
    } else if (finalScore >= 51) {
      nivel = 'ALERTA';
    } else if (finalScore >= 31) {
      nivel = 'ATENCAO';
    }

    // Estimativa de tempo até colapso em minutos
    let tempoAteColapsoEstimadoMinutos: number | null = null;
    if (nivel === 'CRITICO') {
      tempoAteColapsoEstimadoMinutos = Math.max(5, Math.round(20 - (finalScore - 70) * 0.4));
    } else if (nivel === 'ALERTA') {
      tempoAteColapsoEstimadoMinutos = Math.round(30 - (finalScore - 50) * 0.5);
    }

    // Ações recomendadas
    const acoesRecomendadas: OperationalRiskAssessment['acoesRecomendadas'] = [];
    if (nivel === 'CRITICO') {
      acoesRecomendadas.push(
        {
          tipo: 'ATIVAR_MISSAO_RELAMPAGO',
          prioridade: 'P0',
          descricao: 'Ativar bônus D+0 imediato para todos os motoristas em standby na praça',
          prazoExecucaoSegundos: 30
        },
        {
          tipo: 'EXPANDIR_RAIO_MATCHING',
          prioridade: 'P0',
          descricao: 'Expandir raio de matching primário de 3.5km para 5.5km para absorver chamadas',
          prazoExecucaoSegundos: 15
        },
        {
          tipo: 'ATIVAR_SURGE_PREVENTIVO',
          prioridade: 'P1',
          descricao: 'Aplicar surge defensivo de 1.4x a 1.8x para desacelerar demanda e atrair oferta',
          prazoExecucaoSegundos: 20
        }
      );
    } else if (nivel === 'ALERTA') {
      acoesRecomendadas.push(
        {
          tipo: 'EXPANDIR_RAIO_MATCHING',
          prioridade: 'P1',
          descricao: 'Expandir raio de matching para 4.5km',
          prazoExecucaoSegundos: 45
        },
        {
          tipo: 'DISPARAR_SMART_NUDGES',
          prioridade: 'P1',
          descricao: 'Enviar push de reposicionamento preditivo para motoristas em bairros vizinhos',
          prazoExecucaoSegundos: 60
        }
      );
    } else if (nivel === 'ATENCAO') {
      acoesRecomendadas.push({
        tipo: 'MONITORAMENTO_INTENSIVO_NOC',
        prioridade: 'P2',
        descricao: 'Aumentar frequência de telemetria para ciclos de 15 segundos',
        prazoExecucaoSegundos: 120
      });
    }

    return {
      cityId: input.cityId,
      cityName: input.cityName,
      timestamp: Date.now(),
      score: finalScore,
      nivel,
      tempoAteColapsoEstimadoMinutos,
      previsoes: {
        riscoColapsoGeral: finalScore >= 70,
        riscoEscassezMotoristas: ratioDemandaOferta >= 1.5,
        riscoSaturacaoHotspots: input.taxaCrescimentoDemandaPct >= 40,
        riscoFilaExcessiva: input.passageirosNaFila > 15
      },
      fatoresImpactantes: fatores,
      acoesRecomendadas
    };
  }
}

export const riskPredictionEngine = new RiskPredictionEngine();
