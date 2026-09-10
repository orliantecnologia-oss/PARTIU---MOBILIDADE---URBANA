/**
 * AUTONOMOUS BOARD OF DIRECTORS
 * 
 * Conselho de Administração Autônomo de Inteligência Artificial:
 * Composto por 6 Diretores Virtuais Especializados:
 * 1. Growth Director AI (expansão de GMV e tração de passageiros)
 * 2. Marketplace Director AI (equilíbrio de liquidez e SLAs operacionais)
 * 3. Finance Director AI (maximização de margem, FinOps e proteção de Runway)
 * 4. Expansion Director AI (abertura de novas praças e clusters satélites)
 * 5. Operations Director AI (saúde microeconômica de frotas e qualidade)
 * 6. Risk Director AI (segurança, integridade de mercado e conformidade)
 * 
 * Os Diretores deliberam e votam colegiadamente.
 * O Conselho sintetiza a decisão final:
 * - BoardDecision, ExpectedROI, RiskScore, ConfidenceScore, PaybackDays.
 */

export type DirectorRole =
  | 'GROWTH_DIRECTOR'
  | 'MARKETPLACE_DIRECTOR'
  | 'FINANCE_DIRECTOR'
  | 'EXPANSION_DIRECTOR'
  | 'OPERATIONS_DIRECTOR'
  | 'RISK_DIRECTOR'
  | 'CFO_AGENT'
  | 'EXPANSION_AGENT_V2'
  | 'TREASURY_AGENT'
  | 'INFRASTRUCTURE_AGENT'
  | 'CHIEF_LOGISTICS_OFFICER'
  | 'CHIEF_TRANSIT_OFFICER'
  | 'CHIEF_NETWORK_OFFICER';

export interface DirectorVote {
  directorRole: DirectorRole;
  directorName: string;
  voto: 'FAVORAVEL' | 'CONTRARIO' | 'FAVORAVEL_COM_RESSALVAS';
  pesoVoto: number; // Ex: 1.0 a 1.5
  parecerIndividual: string;
  focoEstrategico: string;
}

export interface StrategicMotionProposal {
  motionId: string;
  title: string;
  proposerRole: DirectorRole;
  cityId: string;
  cityName: string;
  alocacaoCapitalBrl: number;
  tipoIntervencao: 
    | 'EXPANSAO_TERRITORIAL_NOVA_CIDADE'
    | 'CAMPANHA_SUBSIDIO_VALE'
    | 'BONUS_PICO_MOTORISTA'
    | 'AJUSTE_ESTRUTURAL_TAKE_RATE'
    | 'APLICACAO_SURGE_DEFENSIVO'
    | 'OTIMIZACAO_CUSTO_FINOPS'
    | 'CONSOLIDACAO_LOGISTICA_INTERMUNICIPAL'
    | 'EXPANSAO_LINHA_MULTIMODAL';
  parametros: Record<string, any>;
}

export interface BoardDecision {
  decisionId: string;
  motionId: string;
  timestamp: number;
  statusDecisao: 'APROVADA_UNANIME' | 'APROVADA_POR_MAIORIA' | 'REJEITADA_RISCO' | 'EMPATADA_ARBITRADA';
  quorumTotal: number;
  votosFavoraveis: number;
  votosContrarios: number;
  votosRessalvas: number;
  votosDetalhados: DirectorVote[];
  
  // Métricas de Impacto Deliberadas
  expectedRoiPct: number; // Ex: +165%
  riskScore: number; // 0 a 100
  confidenceScore: number; // 0.0 a 1.0
  paybackDays: number; // Ex: 18 dias
  impactoGmvEsperadoBrl: number;
  impactoEbitdaEsperadoBrl: number;
  
  // Resolução e Atas do Conselho
  ataDeliberacaoExecutiva: string;
  diretrizesExecucao: string[];
}

export class AutonomousBoardOfDirectors {
  private directors: Array<{ role: DirectorRole; name: string; peso: number }> = [
    { role: 'GROWTH_DIRECTOR', name: 'Dr. Lucas Vane (Growth AI)', peso: 1.0 },
    { role: 'MARKETPLACE_DIRECTOR', name: 'Eng. Sarah Connor (Marketplace AI)', peso: 1.2 },
    { role: 'FINANCE_DIRECTOR', name: 'Dr. Marcus Vance (Finance AI)', peso: 1.2 },
    { role: 'EXPANSION_DIRECTOR', name: 'Dra. Helena Rios (Expansion AI)', peso: 1.0 },
    { role: 'OPERATIONS_DIRECTOR', name: 'Eng. Roberto Dias (Fleet Operations AI)', peso: 1.1 },
    { role: 'RISK_DIRECTOR', name: 'Dra. Beatriz Mendes (Risk & Security AI)', peso: 1.1 },
    { role: 'CFO_AGENT', name: 'Dra. Viviane Stern (CFO Agent AI)', peso: 1.3 },
    { role: 'EXPANSION_AGENT_V2', name: 'Dr. Fernando Prado (Expansion Agent V2 AI)', peso: 1.0 },
    { role: 'TREASURY_AGENT', name: 'Dra. Camila Nogueira (Treasury Agent AI)', peso: 1.2 },
    { role: 'INFRASTRUCTURE_AGENT', name: 'Eng. André Lin (Infrastructure & Edge AI)', peso: 1.1 },
    { role: 'CHIEF_LOGISTICS_OFFICER', name: 'Eng. Carlos Drummond (Chief Logistics AI)', peso: 1.2 },
    { role: 'CHIEF_TRANSIT_OFFICER', name: 'Dra. Marília Chaves (Chief Transit AI)', peso: 1.2 },
    { role: 'CHIEF_NETWORK_OFFICER', name: 'Dr. Arthur Pendelton (Chief Network AI)', peso: 1.1 }
  ];

  /**
   * Delibera colegiadamente sobre uma moção estratégica submetida ao Conselho V2
   */
  public deliberateMotion(motion: StrategicMotionProposal): BoardDecision {
    const timestamp = Date.now();
    const decisionId = `BRD-DEC-${timestamp}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const votes: DirectorVote[] = [];

    let somaPontosFavoraveis = 0;
    let somaPontosContrarios = 0;
    let totalPeso = 0;

    this.directors.forEach((dir) => {
      totalPeso += dir.peso;
      let voto: DirectorVote['voto'] = 'FAVORAVEL';
      let parecer = '';

      switch (dir.role) {
        case 'GROWTH_DIRECTOR':
          if (motion.tipoIntervencao === 'AJUSTE_ESTRUTURAL_TAKE_RATE' && (motion.parametros['novoTakeRate'] || 5.0) > 8.0) {
            voto = 'CONTRARIO';
            parecer = 'Elevação de take rate acima de 8% no modelo híbrido sufoca expansão de GMV e reduz tração.';
          } else {
            voto = 'FAVORAVEL';
            parecer = 'Ação estimula velocidade de circulação de capital e aquisição de novos passageiros.';
          }
          break;

        case 'MARKETPLACE_DIRECTOR':
          if (motion.tipoIntervencao === 'CAMPANHA_SUBSIDIO_VALE') {
            voto = 'FAVORAVEL_COM_RESSALVAS';
            parecer = 'Aprovo estímulo de demanda desde que condicionado à presença de motoristas ociosos na célula.';
          } else {
            voto = 'FAVORAVEL';
            parecer = 'Intervenção preserva equilíbrio de liquidez e estabiliza tempo de espera (ETA).';
          }
          break;

        case 'FINANCE_DIRECTOR':
          if (motion.alocacaoCapitalBrl > 50000) {
            voto = 'FAVORAVEL_COM_RESSALVAS';
            parecer = 'Alocação substancial de capital. Exijo governança com monitoramento semanal de payback.';
          } else {
            voto = 'FAVORAVEL';
            parecer = 'Desembolso compatível com o teto FinOps. Retorno sobre capital satisfatório.';
          }
          break;

        case 'EXPANSION_DIRECTOR':
          if (motion.tipoIntervencao === 'EXPANSAO_TERRITORIAL_NOVA_CIDADE') {
            voto = 'FAVORAVEL';
            parecer = 'Apoio irrestrito à abertura de praça satélite para consolidar cluster regional.';
          } else {
            voto = 'FAVORAVEL';
            parecer = 'Fortalecimento da praça âncora gera musculatura para expansões futuras.';
          }
          break;

        case 'OPERATIONS_DIRECTOR':
          if (motion.tipoIntervencao === 'APLICACAO_SURGE_DEFENSIVO') {
            voto = 'FAVORAVEL';
            parecer = 'Surge defensivo atrai motoristas e eleva ganho/hora líquido dos parceiros.';
          } else {
            voto = 'FAVORAVEL';
            parecer = 'Operação de frotas mantém indicadores de saúde e eficiência de km positivos.';
          }
          break;

        case 'RISK_DIRECTOR':
          if (motion.tipoIntervencao === 'CAMPANHA_SUBSIDIO_VALE' && motion.alocacaoCapitalBrl > 20000) {
            voto = 'FAVORAVEL_COM_RESSALVAS';
            parecer = 'Necessário monitoramento antifraude reforçado contra contas duplicadas em vouchers.';
          } else {
            voto = 'FAVORAVEL';
            parecer = 'Conformidade com os limites operacionais. Risco sistêmico controlado.';
          }
          break;

        case 'CFO_AGENT':
          if (motion.alocacaoCapitalBrl > 80000) {
            voto = 'CONTRARIO';
            parecer = 'CFO Agent: Alocação excede limite prudencial de caixa livre para um único ciclo.';
          } else {
            voto = 'FAVORAVEL';
            parecer = 'CFO Agent: EBITDA e margem de contribuição protegidos. Solvência de caixa garantida.';
          }
          break;

        case 'EXPANSION_AGENT_V2':
          voto = 'FAVORAVEL';
          parecer = 'Expansion Agent V2: Alinhado com o plano de ocupação de clusters interestaduais (RJ-MG-ES).';
          break;

        case 'TREASURY_AGENT':
          voto = 'FAVORAVEL';
          parecer = 'Treasury Agent: Reservas para liquidação PIX D+0 e cashback permanecem acima de 25%.';
          break;

        case 'INFRASTRUCTURE_AGENT':
          voto = 'FAVORAVEL';
          parecer = 'Infrastructure Agent: Capacidade de edge computing e throughput do mesh dimensionados com folga de 98%.';
          break;

        case 'CHIEF_LOGISTICS_OFFICER':
          voto = 'FAVORAVEL';
          parecer = 'Chief Logistics Officer: Apoio irrestrito à monetização de porta-malas ociosos e consolidação de frete fracionado.';
          break;

        case 'CHIEF_TRANSIT_OFFICER':
          voto = 'FAVORAVEL';
          parecer = 'Chief Transit Officer: Integração de vans, micro-ônibus e linhas intermunicipais maximiza ocupação e viabilidade social.';
          break;

        case 'CHIEF_NETWORK_OFFICER':
          voto = 'FAVORAVEL';
          parecer = 'Chief Network Officer: Conectividade dos 7 corredores prioritários estruturada com alto throughput e baixo deadhead.';
          break;
      }

      if (voto === 'FAVORAVEL') somaPontosFavoraveis += dir.peso;
      else if (voto === 'FAVORAVEL_COM_RESSALVAS') somaPontosFavoraveis += dir.peso * 0.8;
      else somaPontosContrarios += dir.peso;

      votes.push({
        directorRole: dir.role,
        directorName: dir.name,
        voto,
        pesoVoto: dir.peso,
        parecerIndividual: parecer,
        focoEstrategico: dir.role.replace('_', ' ')
      });
    });

    const taxaAprovacao = somaPontosFavoraveis / totalPeso;
    let statusDecisao: BoardDecision['statusDecisao'] = 'APROVADA_POR_MAIORIA';

    if (somaPontosContrarios === 0) {
      statusDecisao = 'APROVADA_UNANIME';
    } else if (taxaAprovacao >= 0.60) {
      statusDecisao = 'APROVADA_POR_MAIORIA';
    } else {
      statusDecisao = 'REJEITADA_RISCO';
    }

    // Métricas econômicas deliberadas
    const alocacao = Math.max(1, motion.alocacaoCapitalBrl);
    const expectedRoi = Number((Math.min(320, 120 + (taxaAprovacao * 100))).toFixed(1));
    const paybackDays = Math.max(7, Math.round(35 - (taxaAprovacao * 18)));
    const riskScore = Math.round(somaPontosContrarios * 15 + 20);
    const confidenceScore = Number(taxaAprovacao.toFixed(2));

    const gmvEsperado = Math.round(alocacao * 5.8);
    const ebitdaEsperado = Math.round(alocacao * 0.75);

    const ata = `O Autonomous Board of Directors reuniu-se em sessão extraordinária para apreciar a Moção [${motion.title}] proposta pelo ${motion.proposerRole} para ${motion.cityName}. Deliberação concluída: ${statusDecisao} com taxa de aprovação ponderada de ${(taxaAprovacao * 100).toFixed(0)}%. ROI esperado fixado em ${expectedRoi}% e Payback de ${paybackDays} dias.`;

    const diretrizes = [
      `Liberar desembolso de até R$ ${alocacao.toLocaleString('pt-BR')} para ${motion.tipoIntervencao}.`,
      `Monitorar SLA de liquidez e tempo de pickup (ETA) na praça ${motion.cityName}.`,
      `Acionar travas de contenção FinOps se o payback ultrapassar ${paybackDays * 1.5} dias.`,
      `Reportar atualização de margem na próxima rodada deliberativa do conselho.`
    ];

    return {
      decisionId,
      motionId: motion.motionId,
      timestamp,
      statusDecisao,
      quorumTotal: this.directors.length,
      votosFavoraveis: votes.filter((v) => v.voto === 'FAVORAVEL').length,
      votosContrarios: votes.filter((v) => v.voto === 'CONTRARIO').length,
      votosRessalvas: votes.filter((v) => v.voto === 'FAVORAVEL_COM_RESSALVAS').length,
      votosDetalhados: votes,
      expectedRoiPct: expectedRoi,
      riskScore,
      confidenceScore,
      paybackDays,
      impactoGmvEsperadoBrl: gmvEsperado,
      impactoEbitdaEsperadoBrl: ebitdaEsperado,
      ataDeliberacaoExecutiva: ata,
      diretrizesExecucao: diretrizes
    };
  }
}

export const autonomousBoardOfDirectors = new AutonomousBoardOfDirectors();
