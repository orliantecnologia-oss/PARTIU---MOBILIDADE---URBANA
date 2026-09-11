/**
 * ==============================================================================
 * 🛡️ PARTIU CANCELLATION POLICY ENGINE (v1.0) — UBER / 99 STANDARD
 * ==============================================================================
 * Gerenciador determinístico de políticas de cancelamento, tolerância de carência
 * e tarifação de cancelamento tardio para proteger o deslocamento do motorista parceiro.
 * ==============================================================================
 */

export interface CancellationPolicy {
  acceptedAt: string;
  toleranceMinutes: number;
  freeCancellationUntil: string;
  cancellationFee: number;
  shouldChargeFee: boolean;
  timeRemainingSeconds: number;
  isGracePeriodActive: boolean;
}

export interface CancellationReason {
  code: string;
  label: string;
  description: string;
  appliesFeeWhenLate: boolean;
}

export const CANCELLATION_REASONS_PASSENGER: CancellationReason[] = [
  {
    code: "WAIT_TOO_LONG",
    label: "Tempo de espera muito alto",
    description: "O motorista está demorando mais do que o previsto para chegar.",
    appliesFeeWhenLate: true,
  },
  {
    code: "DRIVER_STATIONARY",
    label: "Motorista não se move no mapa",
    description: "O veículo permaneceu parado ou seguiu na direção contrária.",
    appliesFeeWhenLate: false,
  },
  {
    code: "CHANGED_MIND",
    label: "Mudança de planos / Desisti da viagem",
    description: "Não preciso mais do transporte no momento.",
    appliesFeeWhenLate: true,
  },
  {
    code: "WRONG_PICKUP",
    label: "Endereço de embarque incorreto",
    description: "Inseri o ponto de partida errado e preciso refazer o pedido.",
    appliesFeeWhenLate: true,
  },
  {
    code: "ANOTHER_RIDE",
    label: "Encontrei outro meio de transporte",
    description: "Embarquei em outra van, ônibus ou carona.",
    appliesFeeWhenLate: true,
  },
  {
    code: "PRICE_ISSUE",
    label: "Problema com valor ou cobrança",
    description: "Divergência de tarifa ou forma de pagamento.",
    appliesFeeWhenLate: false,
  },
];

export const CANCELLATION_REASONS_DRIVER: CancellationReason[] = [
  {
    code: "NO_SHOW",
    label: "Passageiro não compareceu (No-show)",
    description: "Aguardei no local de embarque pelo tempo limite e o passageiro não apareceu.",
    appliesFeeWhenLate: true,
  },
  {
    code: "INACCESSIBLE_PICKUP",
    label: "Local de embarque inacessível",
    description: "Rua interditada, área de risco ou acesso bloqueado.",
    appliesFeeWhenLate: false,
  },
  {
    code: "PASSENGER_MISBEHAVIOR",
    label: "Comportamento inadequado",
    description: "Desacato ou recusa em seguir as regras de segurança.",
    appliesFeeWhenLate: false,
  },
  {
    code: "VEHICLE_ISSUE",
    label: "Problema no veículo",
    description: "Pneu furado, falha mecânica ou imprevisto técnico.",
    appliesFeeWhenLate: false,
  },
  {
    code: "ROUTE_UNVIABLE",
    label: "Rota inviável pelo trânsito",
    description: "Acidente grave ou alagamento impedindo o trajeto.",
    appliesFeeWhenLate: false,
  },
];

export interface CancellationConfig {
  defaultToleranceMinutes: number;
  defaultCancellationFeeBrl: number;
}

const DEFAULT_CONFIG: CancellationConfig = {
  defaultToleranceMinutes: 2, // 2 minutos de tolerância padrão Uber/99
  defaultCancellationFeeBrl: 5.0, // R$ 5,00 de taxa de ressarcimento ao motorista
};

export class CancellationPolicyService {
  private static instance: CancellationPolicyService;
  private config: CancellationConfig = { ...DEFAULT_CONFIG };

  private constructor() {}

  public static getInstance(): CancellationPolicyService {
    if (!CancellationPolicyService.instance) {
      CancellationPolicyService.instance = new CancellationPolicyService();
    }
    return CancellationPolicyService.instance;
  }

  /**
   * Configura parâmetros de tolerância vindos do backend / tenant settings
   */
  public setConfig(customConfig: Partial<CancellationConfig>): void {
    this.config = { ...this.config, ...customConfig };
  }

  /**
   * Calcula a política de cancelamento ativa baseada no timestamp de aceite da corrida
   */
  public evaluatePolicy(
    acceptedAtInput?: string | number | Date | null,
    customToleranceMinutes?: number,
    customFeeBrl?: number
  ): CancellationPolicy {
    const acceptedAt =
      typeof acceptedAtInput === "number" || typeof acceptedAtInput === "string" || acceptedAtInput instanceof Date
        ? new Date(acceptedAtInput)
        : new Date();
    const tolerance = customToleranceMinutes ?? this.config.defaultToleranceMinutes;
    const fee = customFeeBrl ?? this.config.defaultCancellationFeeBrl;

    const freeUntilDate = new Date(acceptedAt.getTime() + tolerance * 60 * 1000);
    const now = new Date();

    const diffMs = freeUntilDate.getTime() - now.getTime();
    const timeRemainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const isGracePeriodActive = diffMs > 0;
    const shouldChargeFee = !isGracePeriodActive;

    return {
      acceptedAt: acceptedAt.toISOString(),
      toleranceMinutes: tolerance,
      freeCancellationUntil: freeUntilDate.toISOString(),
      cancellationFee: fee,
      shouldChargeFee,
      timeRemainingSeconds,
      isGracePeriodActive,
    };
  }

  /**
   * Formata a hora limite para exibição no card de aviso
   * Ex: "14:52"
   */
  public formatFreeUntilTime(freeUntilIso: string): string {
    try {
      const d = new Date(freeUntilIso);
      const hours = d.getHours().toString().padStart(2, "0");
      const minutes = d.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    } catch {
      return "--:--";
    }
  }

  /**
   * Mensagem contextual de cancelamento para o usuário
   */
  public getCancellationNoticeText(policy: CancellationPolicy): string {
    const timeFormatted = this.formatFreeUntilTime(policy.freeCancellationUntil);
    if (policy.isGracePeriodActive) {
      return `Cancelamento grátis até às ${timeFormatted}`;
    }
    return `Taxa de cancelamento de ${policy.cancellationFee.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })} será aplicada após ${timeFormatted}`;
  }
}

export const cancellationPolicyService = CancellationPolicyService.getInstance();
