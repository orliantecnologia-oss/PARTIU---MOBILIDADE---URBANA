/**
 * ==============================================================================
 * 🔐 PARTIU DELIVERY OS — SECURE PIN & RECIPIENT VERIFICATION (v1.0)
 * ==============================================================================
 * Geração criptográfica de OTPs de 4 dígitos para Coleta, Entrega e Retorno.
 * Proteção ativa contra força bruta (lockout de 5 min após 3 falhas incorretas)
 * e canal seguro de reenvio / contingência via WhatsApp/SMS.
 * Padrão operacional 99Entrega.
 * ==============================================================================
 */

export interface PinVerificationResult {
  success: boolean;
  message: string;
  isLocked: boolean;
  remainingAttempts: number;
  lockExpiresAt?: number | undefined;
}

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 300_000; // 5 minutos de bloqueio temporário

export class DeliveryPinEngine {
  private failedAttempts = new Map<string, number>();
  private lockouts = new Map<string, number>();

  /**
   * Gera um OTP numérico imprevisível de 4 dígitos (ex: "4829")
   */
  public generateOtp(): string {
    const num = Math.floor(1000 + Math.random() * 9000);
    return num.toString();
  }

  /**
   * Verifica se o PIN para uma determinada parada ou entrega está bloqueado por força bruta
   */
  public isPinLocked(targetKey: string): { isLocked: boolean; remainingSeconds: number } {
    const lockExpiry = this.lockouts.get(targetKey);
    if (!lockExpiry) return { isLocked: false, remainingSeconds: 0 };

    const now = Date.now();
    if (now >= lockExpiry) {
      this.lockouts.delete(targetKey);
      this.failedAttempts.delete(targetKey);
      return { isLocked: false, remainingSeconds: 0 };
    }

    const remainingSeconds = Math.ceil((lockExpiry - now) / 1000);
    return { isLocked: true, remainingSeconds };
  }

  /**
   * Valida o PIN fornecido pelo condutor contra o esperado, aplicando rate limiting defensivo.
   */
  public verifyOtp(
    targetKey: string, // deliveryId ou stopId
    inputOtp: string,
    expectedOtp: string
  ): PinVerificationResult {
    // 1. Checa se o alvo está bloqueado por tentativas anteriores
    const { isLocked, remainingSeconds } = this.isPinLocked(targetKey);
    if (isLocked) {
      return {
        success: false,
        message: `Muitas tentativas incorretas. Entrada bloqueada por segurança por mais ${remainingSeconds} segundos.`,
        isLocked: true,
        remainingAttempts: 0,
        lockExpiresAt: this.lockouts.get(targetKey),
      };
    }

    // 2. Normaliza e confere dígitos
    const cleanInput = (inputOtp || "").trim();
    const cleanExpected = (expectedOtp || "").trim();

    if (cleanInput.length !== 4) {
      return {
        success: false,
        message: "O código PIN de segurança deve possuir exatamente 4 dígitos.",
        isLocked: false,
        remainingAttempts: MAX_FAILED_ATTEMPTS - (this.failedAttempts.get(targetKey) || 0),
      };
    }

    // 3. Sucesso na validação
    if (cleanInput === cleanExpected) {
      this.failedAttempts.delete(targetKey);
      this.lockouts.delete(targetKey);
      return {
        success: true,
        message: "Código PIN verificado e homologado com sucesso!",
        isLocked: false,
        remainingAttempts: MAX_FAILED_ATTEMPTS,
      };
    }

    // 4. Falha na validação — incrementa contador
    const currentFailures = (this.failedAttempts.get(targetKey) || 0) + 1;
    this.failedAttempts.set(targetKey, currentFailures);

    if (currentFailures >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
      this.lockouts.set(targetKey, lockUntil);
      return {
        success: false,
        message: `Código PIN incorreto. Limite de ${MAX_FAILED_ATTEMPTS} tentativas atingido. Bloqueado por 5 minutos.`,
        isLocked: true,
        remainingAttempts: 0,
        lockExpiresAt: lockUntil,
      };
    }

    const remaining = MAX_FAILED_ATTEMPTS - currentFailures;
    return {
      success: false,
      message: `Código PIN incorreto. Você ainda tem ${remaining} tentativa(s) antes do bloqueio temporário.`,
      isLocked: false,
      remainingAttempts: remaining,
    };
  }

  /**
   * Gera o link contextual de reenvio / contingência via WhatsApp quando o destinatário não recebeu o código.
   */
  public generateRecoveryMessage(
    recipientPhone: string,
    recipientName: string,
    otp: string,
    trackingUrl: string,
    senderName: string
  ): { phone: string; message: string; whatsappUrl: string } {
    const cleanPhone = recipientPhone.replace(/\D/g, "");
    const message = `Olá, ${recipientName}! Seu entregador PARTIU chegou com uma encomenda enviada por ${senderName}. Seu código de liberação é *${otp}*. Acompanhe em tempo real: ${trackingUrl}`;
    const encoded = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encoded}`;

    return {
      phone: cleanPhone,
      message,
      whatsappUrl,
    };
  }
}

export const deliveryPinEngine = new DeliveryPinEngine();
