/**
 * CIVIC VOUCHERS & SOCIAL PASS ENGINE
 * 
 * Emissão, validação criptográfica e resgate de vouchers sociais:
 * - Vale Transporte Social / Municipal
 * - Passe Livre de Saúde (hemodiálise, oncologia)
 * - Passe Estudantil Municipal
 * - Tarifa Zero para Eventos Públicos
 * - Gratuidade / Auxílio PCD e Idosos
 */

export type CivicVoucherType =
  | 'VALE_TRANSPORTE_SOCIAL'
  | 'PASSE_LIVRE_SAUDE'
  | 'PASSE_ESTUDANTIL_MUNICIPAL'
  | 'TARIFA_ZERO_EVENTO'
  | 'BENEFICIO_PCD_IDOSO';

export type CivicVoucherStatus = 'ATIVO' | 'ESGOTADO' | 'EXPIRADO' | 'BLOQUEADO';

export interface CivicVoucher {
  voucherId: string;
  voucherCode: string; // Ex: "VOUCH-SOC-8821-XP"
  citizenId: string;
  citizenName: string;
  citizenCpfMasked: string;
  contractId: string;
  cityId: string;
  voucherType: CivicVoucherType;
  maxRidesPerDay: number;
  ridesUsedToday: number;
  totalCreditsIssued: number;
  creditsRemaining: number;
  creditValueBrl: number; // Valor coberto por corrida (ex: R$ 8,00 ou integral)
  subsidizedPct: number;  // 100% ou parcial
  validFrom: string;
  validUntil: string;
  status: CivicVoucherStatus;
  allowedOriginsGeofence?: string[];
  allowedDestinationsGeofence?: string[];
  lastUsedTimestamp?: number;
}

export interface RedeemVoucherRequest {
  voucherCode: string;
  citizenId: string;
  rideValueBrl: number;
  originAddress: string;
  destinationAddress: string;
  category?: string;
}

export interface RedeemVoucherResult {
  success: boolean;
  voucherId?: string;
  subsidizedValueBrl: number;
  copayValueBrl: number;
  remainingCredits: number;
  rejectionReason?: string;
  redemptionToken?: string;
}

export class CivicVouchersEngine {
  private vouchers: Map<string, CivicVoucher> = new Map();
  private vouchersByCitizen: Map<string, string[]> = new Map();

  constructor() {
    this.seedDefaultVouchers();
  }

  private seedDefaultVouchers(): void {
    const defaultVouchers: CivicVoucher[] = [
      {
        voucherId: 'VOUCH-ITAP-001',
        voucherCode: 'VOUCH-SOC-ITAP-101',
        citizenId: 'CITIZEN-001',
        citizenName: 'Maria Silva Santos',
        citizenCpfMasked: '***.456.789-**',
        contractId: 'CIV-ITAP-001',
        cityId: 'itaperuna-rj',
        voucherType: 'VALE_TRANSPORTE_SOCIAL',
        maxRidesPerDay: 4,
        ridesUsedToday: 1,
        totalCreditsIssued: 44,
        creditsRemaining: 32,
        creditValueBrl: 15.0,
        subsidizedPct: 100.0,
        validFrom: '2026-01-01',
        validUntil: '2026-12-31',
        status: 'ATIVO',
      },
      {
        voucherId: 'VOUCH-ITAP-002',
        voucherCode: 'VOUCH-MED-ITAP-202',
        citizenId: 'CITIZEN-002',
        citizenName: 'Carlos Alberto Ferreira',
        citizenCpfMasked: '***.123.987-**',
        contractId: 'CIV-ITAP-002',
        cityId: 'itaperuna-rj',
        voucherType: 'PASSE_LIVRE_SAUDE',
        maxRidesPerDay: 2,
        ridesUsedToday: 0,
        totalCreditsIssued: 30,
        creditsRemaining: 24,
        creditValueBrl: 25.0,
        subsidizedPct: 100.0,
        validFrom: '2026-01-01',
        validUntil: '2026-12-31',
        status: 'ATIVO',
      }
    ];

    defaultVouchers.forEach(v => {
      this.vouchers.set(v.voucherCode, v);
      const list = this.vouchersByCitizen.get(v.citizenId) || [];
      list.push(v.voucherCode);
      this.vouchersByCitizen.set(v.citizenId, list);
    });
  }

  public issueVoucher(voucher: CivicVoucher): void {
    this.vouchers.set(voucher.voucherCode, voucher);
    const list = this.vouchersByCitizen.get(voucher.citizenId) || [];
    list.push(voucher.voucherCode);
    this.vouchersByCitizen.set(voucher.citizenId, list);
  }

  public getVoucher(voucherCode: string): CivicVoucher | undefined {
    return this.vouchers.get(voucherCode);
  }

  public getCitizenVouchers(citizenId: string): CivicVoucher[] {
    const codes = this.vouchersByCitizen.get(citizenId) || [];
    return codes.map(c => this.vouchers.get(c)!).filter(Boolean);
  }

  public redeemVoucher(request: RedeemVoucherRequest): RedeemVoucherResult {
    const voucher = this.vouchers.get(request.voucherCode);
    if (!voucher) {
      return {
        success: false,
        subsidizedValueBrl: 0,
        copayValueBrl: request.rideValueBrl,
        remainingCredits: 0,
        rejectionReason: 'Voucher cívico não encontrado no registro municipal.'
      };
    }

    if (voucher.status !== 'ATIVO') {
      return {
        success: false,
        subsidizedValueBrl: 0,
        copayValueBrl: request.rideValueBrl,
        remainingCredits: voucher.creditsRemaining,
        rejectionReason: `Voucher está ${voucher.status}.`
      };
    }

    if (voucher.citizenId !== request.citizenId) {
      return {
        success: false,
        subsidizedValueBrl: 0,
        copayValueBrl: request.rideValueBrl,
        remainingCredits: voucher.creditsRemaining,
        rejectionReason: 'Voucher nominal intransferível. Cidadão divergente.'
      };
    }

    if (voucher.creditsRemaining <= 0) {
      voucher.status = 'ESGOTADO';
      return {
        success: false,
        subsidizedValueBrl: 0,
        copayValueBrl: request.rideValueBrl,
        remainingCredits: 0,
        rejectionReason: 'Créditos do voucher cívico esgotados.'
      };
    }

    if (voucher.ridesUsedToday >= voucher.maxRidesPerDay) {
      return {
        success: false,
        subsidizedValueBrl: 0,
        copayValueBrl: request.rideValueBrl,
        remainingCredits: voucher.creditsRemaining,
        rejectionReason: `Limite diário atingido (${voucher.maxRidesPerDay} viagens/dia).`
      };
    }

    // Calcula cobertura
    const maxSubsidized = voucher.creditValueBrl;
    const actualSubsidized = Math.min(request.rideValueBrl, maxSubsidized) * (voucher.subsidizedPct / 100);
    const copay = Math.max(0, request.rideValueBrl - actualSubsidized);

    voucher.creditsRemaining -= 1;
    voucher.ridesUsedToday += 1;
    voucher.lastUsedTimestamp = Date.now();

    if (voucher.creditsRemaining === 0) {
      voucher.status = 'ESGOTADO';
    }

    const redemptionToken = `CIVIC-RED-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    return {
      success: true,
      voucherId: voucher.voucherId,
      subsidizedValueBrl: Number(actualSubsidized.toFixed(2)),
      copayValueBrl: Number(copay.toFixed(2)),
      remainingCredits: voucher.creditsRemaining,
      redemptionToken
    };
  }
}

export const civicVouchersEngine = new CivicVouchersEngine();
