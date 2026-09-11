/**
 * ==============================================================================
 * ⚡ PARTIU DRIVER WITHDRAWAL ENGINE — SAQUE PIX INSTANTÂNEO D+0
 * ==============================================================================
 * Gerencia a liquidação instantânea dos ganhos do condutor via PIX:
 * 1. Validação estrita de chaves PIX (CPF, CNPJ, Celular E.164, E-mail, EVP).
 * 2. Auditoria de saldo líquido disponível no Double-Entry Bookkeeping Ledger.
 * 3. Débito contábil idempotente e persistência de comprovante auditável.
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { silentCatchWarn } from "@/lib/structured-logger";
import { driverLedgerEngine } from "@/lib/driver/driver-ledger-engine";

export type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP";

export interface WithdrawalRequestInput {
  driverId: string;
  amountBrl: number;
  pixKey: string;
  pixKeyType: PixKeyType;
  tenantId?: string;
  idempotencyKey?: string;
}

export interface WithdrawalReceipt {
  success: boolean;
  transferId: string;
  driverId: string;
  amountBrl: number;
  pixKey: string;
  pixKeyType: PixKeyType;
  newBalanceBrl: number;
  status: "COMPLETED" | "FAILED" | "PENDING";
  createdAt: string;
  message: string;
}

export class DriverWithdrawalService {
  private static instance: DriverWithdrawalService;
  private localWithdrawals: Map<string, WithdrawalReceipt> = new Map();

  private constructor() {}

  public static getInstance(): DriverWithdrawalService {
    if (!DriverWithdrawalService.instance) {
      DriverWithdrawalService.instance = new DriverWithdrawalService();
    }
    return DriverWithdrawalService.instance;
  }

  // ============================================================================
  // VALIDAÇÕES SINTÁTICAS E CRIPTOGRÁFICAS DE CHAVES PIX
  // ============================================================================

  public validateCpf(cpf: string): boolean {
    const clean = cpf.replace(/\D/g, "");
    if (clean.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(clean)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(clean.charAt(i), 10) * (10 - i);
    }
    let rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(clean.charAt(9), 10)) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(clean.charAt(i), 10) * (11 - i);
    }
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    return rest === parseInt(clean.charAt(10), 10);
  }

  public validateCnpj(cnpj: string): boolean {
    const clean = cnpj.replace(/\D/g, "");
    if (clean.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(clean)) return false;

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum1 = 0;
    for (let i = 0; i < 12; i++) {
      sum1 += parseInt(clean.charAt(i), 10) * weights1[i];
    }
    let rest1 = sum1 % 11;
    const digit1 = rest1 < 2 ? 0 : 11 - rest1;
    if (digit1 !== parseInt(clean.charAt(12), 10)) return false;

    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum2 = 0;
    for (let i = 0; i < 13; i++) {
      sum2 += parseInt(clean.charAt(i), 10) * weights2[i];
    }
    let rest2 = sum2 % 11;
    const digit2 = rest2 < 2 ? 0 : 11 - rest2;
    return digit2 === parseInt(clean.charAt(13), 10);
  }

  public validateEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.trim());
  }

  public validatePhone(phone: string): boolean {
    const clean = phone.replace(/\D/g, "");
    // Suporta formato nacional com DDD (10 ou 11 dígitos, ex: 22998765432) ou E.164 (+55...)
    return (clean.length === 11 && clean.charAt(2) === "9") || clean.length === 13;
  }

  public validateEvp(key: string): boolean {
    // UUID v4 format
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regex.test(key.trim());
  }

  public validatePixKey(key: string, type: PixKeyType): { isValid: boolean; error?: string } {
    if (!key || !key.trim()) {
      return { isValid: false, error: "A chave PIX não pode ser vazia." };
    }

    switch (type) {
      case "CPF":
        if (!this.validateCpf(key)) {
          return { isValid: false, error: "CPF inválido. Verifique os dígitos." };
        }
        break;
      case "CNPJ":
        if (!this.validateCnpj(key)) {
          return { isValid: false, error: "CNPJ inválido. Verifique os números." };
        }
        break;
      case "EMAIL":
        if (!this.validateEmail(key)) {
          return { isValid: false, error: "E-mail inválido." };
        }
        break;
      case "PHONE":
        if (!this.validatePhone(key)) {
          return { isValid: false, error: "Número de celular inválido. Informe DDD + 9 dígitos." };
        }
        break;
      case "EVP":
        if (!this.validateEvp(key)) {
          return { isValid: false, error: "Chave aleatória inválida (deve ser um UUID v4)." };
        }
        break;
      default:
        return { isValid: false, error: "Tipo de chave PIX não reconhecido." };
    }

    return { isValid: true };
  }

  // ============================================================================
  // SOLICITAÇÃO E LIQUIDAÇÃO DE SAQUE D+0
  // ============================================================================

  public async requestPixWithdrawal(input: WithdrawalRequestInput): Promise<WithdrawalReceipt> {
    const now = new Date().toISOString();
    const year = new Date().getFullYear();
    const transferId = `PIX-OUT-${year}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 1. Validação da Chave PIX
    const keyValidation = this.validatePixKey(input.pixKey, input.pixKeyType);
    if (!keyValidation.isValid) {
      return {
        success: false,
        transferId,
        driverId: input.driverId,
        amountBrl: input.amountBrl,
        pixKey: input.pixKey,
        pixKeyType: input.pixKeyType,
        newBalanceBrl: 0,
        status: "FAILED",
        createdAt: now,
        message: keyValidation.error || "Chave PIX inválida.",
      };
    }

    // 2. Validação do Valor Mínimo
    if (input.amountBrl < 5.0) {
      return {
        success: false,
        transferId,
        driverId: input.driverId,
        amountBrl: input.amountBrl,
        pixKey: input.pixKey,
        pixKeyType: input.pixKeyType,
        newBalanceBrl: 0,
        status: "FAILED",
        createdAt: now,
        message: "O valor mínimo para saque instantâneo via PIX é de R$ 5,00.",
      };
    }

    // 3. Auditoria de Saldo no Ledger Contábil
    const summary = driverLedgerEngine.getEarningsSummary(input.driverId);
    const availableBrl = summary.availableBalanceCents / 100;

    if (input.amountBrl > availableBrl) {
      return {
        success: false,
        transferId,
        driverId: input.driverId,
        amountBrl: input.amountBrl,
        pixKey: input.pixKey,
        pixKeyType: input.pixKeyType,
        newBalanceBrl: availableBrl,
        status: "FAILED",
        createdAt: now,
        message: `Saldo disponível insuficiente (Saldo: R$ ${availableBrl.toFixed(2)}, Solicitado: R$ ${input.amountBrl.toFixed(2)}).`,
      };
    }

    // 4. Execução do Débito Contábil Idempotente
    const withdrawalRes = driverLedgerEngine.executePixWithdrawal({
      driverId: input.driverId,
      amountBrl: input.amountBrl,
      chavePix: input.pixKey,
      idempotencyKey: input.idempotencyKey || transferId,
    });

    if (!withdrawalRes.success) {
      return {
        success: false,
        transferId,
        driverId: input.driverId,
        amountBrl: input.amountBrl,
        pixKey: input.pixKey,
        pixKeyType: input.pixKeyType,
        newBalanceBrl: withdrawalRes.newBalanceBrl,
        status: "FAILED",
        createdAt: now,
        message: withdrawalRes.message || "Erro contábil ao processar saque.",
      };
    }

    // 5. Sucesso — Monta Comprovante
    const receipt: WithdrawalReceipt = {
      success: true,
      transferId,
      driverId: input.driverId,
      amountBrl: input.amountBrl,
      pixKey: input.pixKey,
      pixKeyType: input.pixKeyType,
      newBalanceBrl: withdrawalRes.newBalanceBrl,
      status: "COMPLETED",
      createdAt: now,
      message: `Saque instantâneo de R$ ${input.amountBrl.toFixed(2)} enviado via PIX com sucesso!`,
    };

    // Armazena no cache resiliente local
    this.localWithdrawals.set(transferId, receipt);

    // Persiste no Supabase se configurado
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from("driver_pix_withdrawals").insert({
          driver_id: input.driverId,
          amount_cents: Math.round(input.amountBrl * 100),
          pix_key: input.pixKey,
          pix_key_type: input.pixKeyType,
          status: "COMPLETED",
          transfer_id: transferId,
          tenant_id: input.tenantId || "default",
          created_at: now,
          completed_at: now,
        });

        if (error) {
          silentCatchWarn("DriverWithdrawalService.requestPixWithdrawal", error);
        }
      } catch (err) {
        silentCatchWarn("DriverWithdrawalService.requestPixWithdrawal", err);
      }
    }

    return receipt;
  }

  public getReceipt(transferId: string): WithdrawalReceipt | null {
    return this.localWithdrawals.get(transferId) || null;
  }

  public resetLocalStore(): void {
    this.localWithdrawals.clear();
  }
}

export const driverWithdrawalService = DriverWithdrawalService.getInstance();
