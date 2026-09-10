import { silentCatchWarn } from "@/lib/structured-logger";

/**
 * PARTIU MOBILIDADE URBANA — ENTERPRISE FINOPS & WALLET ENGINE
 * Motor Financeiro de Dupla Entrada (Ledger em Minor Units / Centavos),
 * Split Automático D+0 (Plano Ouro 0%, Prata 1%, Bronze 3%, Free 5%), Cashback de 2%,
 * Gamificação Driver Club (Bronze/Prata/Ouro/Black) e Faturamento Corporativo.
 */

export * from "./partiu-payment-provider";

export interface WalletBalance {
  userId: string;
  userType: "PASSAGEIRO" | "MOTORISTA" | "EMPRESA";
  balanceCents: number; // Inteiro em centavos para precisão contábil estrita
  cashbackAccumulatedCents: number;
  currency: "BRL";
  lastUpdated: number;
}

export type DriverClubLevel = "BRONZE" | "PRATA" | "OURO" | "BLACK";

export interface DriverClubBenefits {
  level: DriverClubLevel;
  takeRatePercent: number; // 3% (Bronze), 1% (Prata), 0% (Ouro / Black)
  driverNetPayoutPercent: number; // 97%, 99% ou 100%
  gasolineDiscountPerLiterBrl: number;
  oilChangeDiscountPercent: number;
  cancellationToleranceMinutes: number;
  vipSupportChannel: "APP_DEFAULT" | "WHATSAPP_PRIORITY" | "PHONE_24H";
}

export interface TripFinancialSettlement {
  tripId: string;
  grossFareCents: number;
  platformTakeRatePercent: number;
  platformFeeCents: number;
  driverNetPayoutCents: number;
  riderCashbackCents: number;
  isDriverClubBlack: boolean;
  corporateBillingFeeCents?: number | undefined;
  settlementTimestamp: number;
}

/**
 * 1. DRIVER CLUB TIERS & BENEFITS
 * Determina o nível do parceiro com base nas corridas do mês e rating.
 * Alinhado ao Driver Revenue Engine V3 (0% Ouro, 1% Prata, 3% Bronze, 5% Free).
 */
export function getDriverClubBenefits(monthlyCompletedTrips: number, driverRating: number): DriverClubBenefits {
  if (monthlyCompletedTrips >= 300 && driverRating >= 4.90) {
    return {
      level: "BLACK",
      takeRatePercent: 0.0,
      driverNetPayoutPercent: 100.0,
      gasolineDiscountPerLiterBrl: 0.35,
      oilChangeDiscountPercent: 25,
      cancellationToleranceMinutes: 4,
      vipSupportChannel: "PHONE_24H",
    };
  }

  if (monthlyCompletedTrips >= 150) {
    return {
      level: "OURO",
      takeRatePercent: 0.0,
      driverNetPayoutPercent: 100.0,
      gasolineDiscountPerLiterBrl: 0.25,
      oilChangeDiscountPercent: 20,
      cancellationToleranceMinutes: 4,
      vipSupportChannel: "WHATSAPP_PRIORITY",
    };
  }

  if (monthlyCompletedTrips >= 50) {
    return {
      level: "PRATA",
      takeRatePercent: 1.0,
      driverNetPayoutPercent: 99.0,
      gasolineDiscountPerLiterBrl: 0.15,
      oilChangeDiscountPercent: 10,
      cancellationToleranceMinutes: 5,
      vipSupportChannel: "WHATSAPP_PRIORITY",
    };
  }

  return {
    level: "BRONZE",
    takeRatePercent: 3.0,
    driverNetPayoutPercent: 97.0,
    gasolineDiscountPerLiterBrl: 0.05,
    oilChangeDiscountPercent: 0,
    cancellationToleranceMinutes: 5,
    vipSupportChannel: "APP_DEFAULT",
  };
}

/**
 * 2. SPLIT & LIQUIDAÇÃO INSTANTÂNEA D+0
 * Executa o split contábil exato da corrida com suporte ao plano de assinatura ativo.
 */
export function calculateTripSettlement(
  tripId: string,
  grossFareBrl: number,
  driverCompletedTripsMonth: number = 60,
  driverRating: number = 4.95,
  isCorporateTrip: boolean = false,
  isPartiuPrimeRider: boolean = false,
  driverPlanTier?: "FREE" | "BRONZE" | "PRATA" | "OURO" | undefined
): TripFinancialSettlement {
  const grossFareCents = Math.round(grossFareBrl * 100);
  const club = getDriverClubBenefits(driverCompletedTripsMonth, driverRating);

  // Take-rate do motorista: definido pelo plano de assinatura se informado, ou pelo tier do clube
  let takeRate = club.takeRatePercent;
  if (driverPlanTier === "OURO") takeRate = 0.0;
  else if (driverPlanTier === "PRATA") takeRate = 1.0;
  else if (driverPlanTier === "BRONZE") takeRate = 3.0;
  else if (driverPlanTier === "FREE") takeRate = 5.0;

  const platformFeeCents = Math.round(grossFareCents * (takeRate / 100));
  const driverNetPayoutCents = grossFareCents - platformFeeCents;

  // Cashback do passageiro: 2% padrão ou 5% no Partiu Prime
  const cashbackRate = isPartiuPrimeRider ? 0.05 : 0.02;
  const riderCashbackCents = Math.round(grossFareCents * cashbackRate);

  // Taxa corporativa se for corrida B2B
  const corporateBillingFeeCents = isCorporateTrip ? Math.round(grossFareCents * 0.03) : 0;

  return {
    tripId,
    grossFareCents,
    platformTakeRatePercent: takeRate,
    platformFeeCents,
    driverNetPayoutCents,
    riderCashbackCents,
    isDriverClubBlack: club.level === "BLACK",
    corporateBillingFeeCents: corporateBillingFeeCents > 0 ? corporateBillingFeeCents : undefined,
    settlementTimestamp: Date.now(),
  };
}

/**
 * 3. WALLET STORAGE MANAGER (LOCAL + CLOUD CACHE)
 */
const WALLET_KEY_PREFIX = "partiu_wallet_";

export function getLocalWallet(userId: string, userType: "PASSAGEIRO" | "MOTORISTA" | "EMPRESA"): WalletBalance {
  if (typeof window === "undefined") {
    return {
      userId,
      userType,
      balanceCents: userType === "MOTORISTA" ? 28450 : 1500, // R$ 284,50 ou R$ 15,00
      cashbackAccumulatedCents: 450,
      currency: "BRL",
      lastUpdated: Date.now(),
    };
  }

  const raw = localStorage.getItem(`${WALLET_KEY_PREFIX}${userId}`);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (err) { silentCatchWarn("partiu-financial-engine", err); }
  }

  const initial: WalletBalance = {
    userId,
    userType,
    balanceCents: userType === "MOTORISTA" ? 28450 : 1500,
    cashbackAccumulatedCents: 450,
    currency: "BRL",
    lastUpdated: Date.now(),
  };

  localStorage.setItem(`${WALLET_KEY_PREFIX}${userId}`, JSON.stringify(initial));
  return initial;
}

export function creditDriverWallet(driverId: string, amountCents: number): WalletBalance {
  const current = getLocalWallet(driverId, "MOTORISTA");
  const updated: WalletBalance = {
    ...current,
    balanceCents: current.balanceCents + amountCents,
    lastUpdated: Date.now(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(`${WALLET_KEY_PREFIX}${driverId}`, JSON.stringify(updated));
  }
  return updated;
}

export function creditRiderCashback(riderId: string, cashbackCents: number): WalletBalance {
  const current = getLocalWallet(riderId, "PASSAGEIRO");
  const updated: WalletBalance = {
    ...current,
    balanceCents: current.balanceCents + cashbackCents,
    cashbackAccumulatedCents: current.cashbackAccumulatedCents + cashbackCents,
    lastUpdated: Date.now(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(`${WALLET_KEY_PREFIX}${riderId}`, JSON.stringify(updated));
  }
  return updated;
}

/**
 * 4. TAXA DE CANCELAMENTO TARDIO COM REPASSE AO MOTORISTA
 * Total: R$ 6,00 (600 centavos)
 * Repasse ao Motorista (Combustível/Deslocamento): R$ 4,50 (450 centavos)
 * Margem Líquida da Plataforma: R$ 1,50 (150 centavos)
 */
export interface CancellationFeeSettlement {
  corridaId: string;
  passageiroId: string;
  motoristaId: string;
  totalFeeCents: number; // 600 cents (R$ 6,00)
  totalFeeBrl: number;
  driverShareCents: number; // 450 cents (R$ 4,50)
  driverShareBrl: number;
  platformShareCents: number; // 150 cents (R$ 1,50)
  platformShareBrl: number;
  timestamp: number;
}

export function processarCancelamentoComMulta(
  corridaId: string,
  passageiroId: string,
  motoristaId: string
): CancellationFeeSettlement {
  const totalFeeCents = 600;
  const driverShareCents = 450;
  const platformShareCents = 150;

  // Credita a compensação diretamente na carteira do motorista
  creditDriverWallet(motoristaId, driverShareCents);

  const settlement: CancellationFeeSettlement = {
    corridaId,
    passageiroId,
    motoristaId,
    totalFeeCents,
    totalFeeBrl: 6.0,
    driverShareCents,
    driverShareBrl: 4.5,
    platformShareCents,
    platformShareBrl: 1.5,
    timestamp: Date.now(),
  };

  if (typeof window !== "undefined") {
    const cancellations = JSON.parse(localStorage.getItem("partiu_cancellations_with_fee") || "[]");
    cancellations.unshift(settlement);
    localStorage.setItem("partiu_cancellations_with_fee", JSON.stringify(cancellations));

    window.dispatchEvent(
      new CustomEvent("partiu:corrida-cancelada-com-taxa", {
        detail: settlement,
      })
    );
  }

  return settlement;
}

/**
 * 5. POLÍTICA DE SAQUE INSTANTÂNEO PIX & TARIFA DE CONVENIÊNCIA
 * 1º Saque Semanal: R$ 0,00 (Gratuito)
 * A partir do 2º Saque na mesma semana: Tarifa de Conveniência de R$ 1,90 (190 centavos)
 */
export interface FintechPixWithdrawalResult {
  sucesso: boolean;
  driverId: string;
  chavePix: string;
  valorBrutoBrl: number;
  taxaBrl: number;
  valorLiquidoBrl: number;
  saquesNaSemana: number;
  mensagem: string;
  txid: string;
}

export function getSaquesRealizadosNaSemana(driverId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(`partiu_saques_semana_${driverId}`);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    const agora = Date.now();
    // Reseta caso a semana tenha virado (7 dias = 604800000 ms)
    if (agora - parsed.weekStart > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(`partiu_saques_semana_${driverId}`);
      return 0;
    }
    return parsed.count || 0;
  } catch {
    return 0;
  }
}

export function solicitarSaquePixMotorista(params: {
  driverId: string;
  chavePix: string;
  valorBrutoBrl?: number;
}): FintechPixWithdrawalResult {
  const driverId = params.driverId;
  const wallet = getLocalWallet(driverId, "MOTORISTA");
  const saldoDisponivelBrl = params.valorBrutoBrl ?? (wallet.balanceCents / 100);

  if (saldoDisponivelBrl <= 0) {
    return {
      sucesso: false,
      driverId,
      chavePix: params.chavePix,
      valorBrutoBrl: 0,
      taxaBrl: 0,
      valorLiquidoBrl: 0,
      saquesNaSemana: getSaquesRealizadosNaSemana(driverId),
      mensagem: "Saldo insuficiente para transferência.",
      txid: "",
    };
  }

  const saquesAtuais = getSaquesRealizadosNaSemana(driverId);
  const isPrimeiroDaSemana = saquesAtuais === 0;
  const taxaBrl = isPrimeiroDaSemana ? 0.0 : 1.90;
  const valorLiquidoBrl = Math.max(0, Number((saldoDisponivelBrl - taxaBrl).toFixed(2)));

  // Atualiza carteira do motorista
  const deductionCents = Math.round(saldoDisponivelBrl * 100);
  const updatedBalance = Math.max(0, wallet.balanceCents - deductionCents);
  wallet.balanceCents = updatedBalance;
  wallet.lastUpdated = Date.now();

  if (typeof window !== "undefined") {
    localStorage.setItem(`${WALLET_KEY_PREFIX}${driverId}`, JSON.stringify(wallet));

    // Atualiza contagem semanal
    const rawWeek = localStorage.getItem(`partiu_saques_semana_${driverId}`);
    const parsedWeek = rawWeek ? JSON.parse(rawWeek) : { weekStart: Date.now(), count: 0 };
    parsedWeek.count = (parsedWeek.count || 0) + 1;
    localStorage.setItem(`partiu_saques_semana_${driverId}`, JSON.stringify(parsedWeek));
  }

  const txid = `PIX-OUT-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  return {
    sucesso: true,
    driverId,
    chavePix: params.chavePix,
    valorBrutoBrl: saldoDisponivelBrl,
    taxaBrl,
    valorLiquidoBrl,
    saquesNaSemana: saquesAtuais + 1,
    mensagem: isPrimeiroDaSemana
      ? `1º Saque da semana gratuito! R$ ${valorLiquidoBrl.toFixed(2)} transferidos com sucesso.`
      : `Saque instantâneo processado! R$ ${valorLiquidoBrl.toFixed(2)} transferidos (taxa de R$ 1,90).`,
    txid,
  };
}

/**
 * 6. CLUBE DE ASSINATURA VIP — PARTIU PRIME (R$ 19,90/MÊS)
 * Benefícios:
 * - 5% de Cashback em TODAS as corridas e entregas
 * - Isenção de Tarifa Dinâmica de Chuva (Surge Imunidade)
 * - Atendimento e Suporte Telefônico Prioritário
 */
export interface PartiuPrimeSubscription {
  active: boolean;
  userId: string;
  monthlyFeeBrl: number;
  cashbackPercent: number;
  activatedAt: number;
  expiresAt: number;
}

const PRIME_KEY = "partiu_prime_subscription";

export function isPartiuPrimeActive(userId: string = "default_rider"): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(PRIME_KEY);
    if (!raw) return false;
    const sub: PartiuPrimeSubscription = JSON.parse(raw);
    return Boolean(sub.active && sub.expiresAt > Date.now());
  } catch {
    return false;
  }
}

export function assinarPartiuPrime(userId: string = "default_rider"): PartiuPrimeSubscription {
  const agora = Date.now();
  const expiresAt = agora + 30 * 24 * 60 * 60 * 1000; // 30 dias

  const sub: PartiuPrimeSubscription = {
    active: true,
    userId,
    monthlyFeeBrl: 19.9,
    cashbackPercent: 5.0,
    activatedAt: agora,
    expiresAt,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(PRIME_KEY, JSON.stringify(sub));
    window.dispatchEvent(new CustomEvent("partiu:prime-status-changed", { detail: sub }));
  }

  return sub;
}

export function cancelarAssinaturaPartiuPrime(userId: string = "default_rider"): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(PRIME_KEY);
    window.dispatchEvent(new CustomEvent("partiu:prime-status-changed", { detail: { active: false } }));
  }
}
