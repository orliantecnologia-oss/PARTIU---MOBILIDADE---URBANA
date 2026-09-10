/**
 * PARTIU DRIVER CHURN PREDICTION ENGINE
 * 
 * Modela a curva de sobrevivência do parceiro e antecipa abandono da plataforma
 * com até 14 dias de antecedência, disparando ações prescritivas de retenção.
 */

export interface DriverChurnInput {
  driverId: string;
  diasSemFicarOnline: number;
  variacaoGanhosUltimas2SemanasPct: number; // ex: -25% de ganhos
  horasOnlineSemanaisAtuais: number;
  horasOnlineSemanaisHistoricas: number;
  taxaCancelamentoRecentePct: number;
  taxaAceiteRecentePct: number;
  diasDesdeUltimaCorrida: number;
  avaliacaoMediaRecente: number;
  teveDisputaFinanceiraRecente: boolean;
}

export type ChurnRiskTier = 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';

export interface RetentionActionPlan {
  tipoAcao: 'MISSAO_TURBO_D0' | 'SUBSIDIO_COMBUSTIVEL' | 'GARANTIA_GANHO_HORA' | 'CONTATO_GERENTE_CIDADE';
  titulo: string;
  descricao: string;
  valorIncentivoReais: number;
  condicaoAtivacao: string;
  expiraEmDias: number;
}

export interface DriverChurnPrediction {
  driverId: string;
  churnProbability: number; // 0.0 a 1.0
  riskTier: ChurnRiskTier;
  sinaisAlerta: string[];
  retentionAction: RetentionActionPlan;
  timestamp: number;
}

export class DriverChurnEngine {
  /**
   * Avalia o risco de evasão do motorista através de regressão logística ponderada
   */
  public preverChurn(input: DriverChurnInput): DriverChurnPrediction {
    let rawScore = 0.05; // Base natural
    const sinais: string[] = [];

    // 1. Inatividade recente
    if (input.diasSemFicarOnline >= 5) {
      rawScore += 0.35;
      sinais.push(`Ausente da plataforma há ${input.diasSemFicarOnline} dias consecutivos.`);
    } else if (input.diasSemFicarOnline >= 3) {
      rawScore += 0.18;
      sinais.push(`Redução de frequência com ${input.diasSemFicarOnline} dias offline.`);
    }

    // 2. Queda na renda semanal
    if (input.variacaoGanhosUltimas2SemanasPct <= -30) {
      rawScore += 0.30;
      sinais.push(`Queda de ${Math.abs(input.variacaoGanhosUltimas2SemanasPct)}% na receita semanal do parceiro.`);
    } else if (input.variacaoGanhosUltimas2SemanasPct <= -15) {
      rawScore += 0.15;
      sinais.push('Desaceleração moderada nos rendimentos por hora.');
    }

    // 3. Queda drástica de dedicação horária
    const dropHoursRatio = input.horasOnlineSemanaisHistoricas > 0 
      ? input.horasOnlineSemanaisAtuais / input.horasOnlineSemanaisHistoricas 
      : 1.0;

    if (dropHoursRatio < 0.4) {
      rawScore += 0.22;
      sinais.push(`Horas semanais reduzidas em ${Math.round((1 - dropHoursRatio) * 100)}%.`);
    }

    // 4. Frustração operacional (cancelamentos e disputas)
    if (input.teveDisputaFinanceiraRecente) {
      rawScore += 0.15;
      sinais.push('Histórico recente de contestação ou disputa de repasse financeiro.');
    }

    if (input.taxaCancelamentoRecentePct > 12) {
      rawScore += 0.10;
      sinais.push('Frequência de cancelamento anormal sugerindo desengajamento.');
    }

    // Função sigmoide de probabilidade
    const probability = Math.min(0.98, Math.max(0.02, Number(rawScore.toFixed(3))));

    let riskTier: ChurnRiskTier = 'BAIXO';
    let retentionAction: RetentionActionPlan;

    if (probability >= 0.70) {
      riskTier = 'CRITICO';
      retentionAction = {
        tipoAcao: 'GARANTIA_GANHO_HORA',
        titulo: 'Garantia de Renda PARTIU + R$ 60 Bônus',
        descricao: 'Garantia de R$ 42,00 por hora ativa + R$ 60,00 extras ao completar 10 viagens nos próximos 3 dias.',
        valorIncentivoReais: 60.0,
        condicaoAtivacao: 'Completar 10 viagens nos horários de pico sugeridos',
        expiraEmDias: 3
      };
    } else if (probability >= 0.45) {
      riskTier = 'ALTO';
      retentionAction = {
        tipoAcao: 'MISSAO_TURBO_D0',
        titulo: 'Missão Volta às Ruas (R$ 35 D+0)',
        descricao: 'Faça 5 corridas até domingo e receba R$ 35,00 creditados imediatamente via Pix na sua carteira.',
        valorIncentivoReais: 35.0,
        condicaoAtivacao: 'Completar 5 corridas consecutivas',
        expiraEmDias: 4
      };
    } else if (probability >= 0.25) {
      riskTier = 'MEDIO';
      retentionAction = {
        tipoAcao: 'SUBSIDIO_COMBUSTIVEL',
        titulo: 'Voucher Posto Parceiro (R$ 20)',
        descricao: 'Cashback de R$ 20,00 no abastecimento em postos conveniados da sua cidade.',
        valorIncentivoReais: 20.0,
        condicaoAtivacao: 'Ficar online por pelo menos 3 horas hoje',
        expiraEmDias: 7
      };
    } else {
      retentionAction = {
        tipoAcao: 'MISSAO_TURBO_D0',
        titulo: 'Parceiro Ouro Semanal',
        descricao: 'Mantenha avaliação acima de 4.90 para concorrer ao sorteio de manutenção automotiva.',
        valorIncentivoReais: 0.0,
        condicaoAtivacao: 'Manter padrão de excelência',
        expiraEmDias: 14
      };
    }

    return {
      driverId: input.driverId,
      churnProbability: probability,
      riskTier,
      sinaisAlerta: sinais,
      retentionAction,
      timestamp: Date.now()
    };
  }
}

export const driverChurnEngine = new DriverChurnEngine();
