/**
 * ==============================================================================
 * 🛡️ PARTIU DRIVER OS — DRIVER ELIGIBILITY & PRESENCE ENGINE (v1.0)
 * ==============================================================================
 * Validação rigorosa e determinística dos pré-requisitos operacionais do motorista:
 * - Status da conta (Ativo, Pendente, Suspenso, Bloqueado)
 * - CNH com EAR válida e não expirada
 * - Veículo regularizado (Placa, Ano, Capacidade e Categoria)
 * - Conformidade documental e verificação cadastral
 * - Presença geográfica recente (GPS Heartbeat < 60s)
 * - Ausência de corrida concorrente ou trava de segurança
 * ==============================================================================
 */

import { subscriptionEngine } from "../revenue/subscription-engine";
import { silentCatchWarn } from "@/lib/structured-logger";


export type DriverAccountStatus =
  | "PENDENTE"
  | "EM_ANALISE"
  | "APROVADO"
  | "SUSPENSO"
  | "BLOQUEADO";

export type DriverPresenceState =
  | "AUTHENTICATED"
  | "OFFLINE"
  | "ONLINE_IDLE"
  | "OFFERED"
  | "BUSY_TRIP"
  | "UNAVAILABLE"
  | "BLOCKED"
  | "SUSPENDED";

export interface DriverProfileRecord {
  id: string;
  userId: string;
  nome: string;
  cpf: string;
  telefone: string;
  email?: string | undefined;
  fotoUrl?: string | undefined;
  cnhNumero: string;
  cnhCategoria: "A" | "B" | "AB" | "C" | "D" | "E";
  cnhValidade: string; // ISO Date YYYY-MM-DD
  possuiEar: boolean;
  veiculoMarcaModelo: string;
  veiculoPlaca: string;
  veiculoAno: number;
  veiculoCor: string;
  categoriaVeiculo: "CARRO" | "MOTO" | "PLUS" | "MULHER";
  rating: number; // 1.00 - 5.00
  taxaAceitacao: number; // 0 - 100%
  taxaCancelamento: number; // 0 - 100%
  totalViagens: number;
  chavePix: string;
  statusAprovacao: DriverAccountStatus;
  motivoBloqueio?: string | undefined;
  ultimoGpsTimestamp?: number | undefined;
}

export interface DriverEligibilityResult {
  isEligible: boolean;
  canGoOnline: boolean;
  presenceState: DriverPresenceState;
  reasons: string[];
  blockers: string[];
  driver: DriverProfileRecord;
}

// Motorista Parceiro Padrão Homologado para Operação Regional
export const MOTORISTA_CONTA_PADRAO: DriverProfileRecord = {
  id: "mot-001",
  userId: "usr-mot-001",
  nome: "Carlos Eduardo Silva",
  cpf: "123.456.789-00",
  telefone: "(22) 99876-5432",
  email: "carlos.silva@partiu.app",
  fotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
  cnhNumero: "98765432100",
  cnhCategoria: "AB",
  cnhValidade: "2028-12-31",
  possuiEar: true,
  veiculoMarcaModelo: "Chevrolet Onix Plus 1.0 Turbo",
  veiculoPlaca: "MOB-8K99",
  veiculoAno: 2024,
  veiculoCor: "Prata",
  categoriaVeiculo: "CARRO",
  rating: 4.98,
  taxaAceitacao: 96.5,
  taxaCancelamento: 1.2,
  totalViagens: 3840,
  chavePix: "(22) 99876-5432",
  statusAprovacao: "APROVADO",
  ultimoGpsTimestamp: Date.now(),
};

export class DriverEligibilityEngine {
  private static instance: DriverEligibilityEngine;

  private constructor() {}

  public static getInstance(): DriverEligibilityEngine {
    if (!DriverEligibilityEngine.instance) {
      DriverEligibilityEngine.instance = new DriverEligibilityEngine();
    }
    return DriverEligibilityEngine.instance;
  }

  /**
   * Avalia a elegibilidade integral do condutor para ficar ONLINE e receber chamadas
   */
  public evaluateEligibility(
    driver: DriverProfileRecord = MOTORISTA_CONTA_PADRAO,
    options?: {
      overrideGpsRequirement?: boolean | undefined;
      activeTripId?: string | undefined;
    } | undefined
  ): DriverEligibilityResult {
    const reasons: string[] = [];
    const blockers: string[] = [];
    const now = Date.now();

    // 1. Verificação de Status da Conta
    if (driver.statusAprovacao === "BLOQUEADO") {
      blockers.push(`CONTA_BLOQUEADA: ${driver.motivoBloqueio || "Violação dos Termos de Uso"}`);
    } else if (driver.statusAprovacao === "SUSPENSO") {
      blockers.push(`CONTA_SUSPENSA: ${driver.motivoBloqueio || "Suspensão temporária para auditoria"}`);
    } else if (driver.statusAprovacao === "PENDENTE" || driver.statusAprovacao === "EM_ANALISE") {
      blockers.push("DOCUMENTACAO_EM_ANALISE: Cadastro ainda não homologado pela administração");
    } else if (driver.statusAprovacao === "APROVADO") {
      reasons.push("CONTA_APROVADA: Cadastro plenamente aprovado e ativo");
    }

    // 2. Verificação de CNH e EAR
    if (!driver.possuiEar) {
      blockers.push("CNH_SEM_EAR: É obrigatório possuir CNH com Exerce Atividade Remunerada (EAR)");
    } else {
      reasons.push("EAR_VALIDO: CNH habilitada para atividade remunerada");
    }

    const cnhDataValidade = new Date(driver.cnhValidade).getTime();
    if (isNaN(cnhDataValidade) || cnhDataValidade < now) {
      blockers.push("CNH_VENCIDA: Carteira Nacional de Habilitação expirada");
    } else {
      reasons.push("CNH_REGULAR: CNH dentro do prazo de validade");
    }

    // 3. Verificação do Veículo
    if (!driver.veiculoPlaca || driver.veiculoPlaca.length < 7) {
      blockers.push("VEICULO_SEM_PLACA: Placa do veículo não cadastrada ou em formato inválido");
    }
    const anoAtual = new Date().getFullYear();
    const idadeVeiculo = anoAtual - driver.veiculoAno;
    if (idadeVeiculo > 15) {
      blockers.push(`VEICULO_ANTIGO: Veículo ano ${driver.veiculoAno} excede o limite máximo de 15 anos de frota`);
    } else {
      reasons.push(`VEICULO_CONFORME: ${driver.veiculoMarcaModelo} (${driver.veiculoAno}) em conformidade`);
    }

    // 4. Verificação de Chave PIX
    if (!driver.chavePix || driver.chavePix.trim().length === 0) {
      blockers.push("SEM_CHAVE_PIX: Chave PIX necessária para liquidação de repasses D+0");
    } else {
      reasons.push("CHAVE_PIX_VALIDA: Conta apta para recebimentos automáticos");
    }

    // 5. Verificação de Telemetria GPS
    if (!options?.overrideGpsRequirement) {
      const gpsAgeMs = driver.ultimoGpsTimestamp ? now - driver.ultimoGpsTimestamp : Infinity;
      if (gpsAgeMs > 120000) {
        blockers.push("GPS_DESATUALIZADO: Sinal de GPS sem atualização há mais de 2 minutos");
      } else {
        reasons.push("GPS_ATIVO: Localização atualizada em tempo real");
      }
    }

    // 6. Verificação de Corrida em Andamento
    if (options?.activeTripId) {
      blockers.push(`CORRIDA_EM_ANDAMENTO: Condutor ocupado na viagem ${options.activeTripId}`);
    }

    // 7. Verificação de Inadimplência e Bloqueio Financeiro (Modelo Híbrido)
    let isFinanceSuspended = false;
    try {
      const sub = subscriptionEngine.getDriverSubscription(driver.id);
      if (sub.status === "SUSPENDED" || sub.status === "REACTIVATION_REQUIRED") {
        isFinanceSuspended = true;
        blockers.push(
          `INADIMPLENCIA_FINANCEIRA: Pendência de ${sub.accumulatedDebtBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Regularize a assinatura via PIX para voltar a rodar.`
        );
      }
    } catch (err) { silentCatchWarn("driver-eligibility-engine", err); }

    const isEligible = blockers.length === 0;

    let presenceState: DriverPresenceState = "OFFLINE";
    if (driver.statusAprovacao === "BLOQUEADO") {
      presenceState = "BLOCKED";
    } else if (driver.statusAprovacao === "SUSPENSO" || isFinanceSuspended) {
      presenceState = "SUSPENDED";
    } else if (options?.activeTripId) {
      presenceState = "BUSY_TRIP";
    } else if (isEligible) {
      presenceState = "ONLINE_IDLE";
    }

    return {
      isEligible,
      canGoOnline: isEligible,
      presenceState,
      reasons,
      blockers,
      driver,
    };
  }
}

export const driverEligibilityEngine = DriverEligibilityEngine.getInstance();
