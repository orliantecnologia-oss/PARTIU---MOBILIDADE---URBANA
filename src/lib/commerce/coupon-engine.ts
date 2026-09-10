/**
 * LOCAL COMMERCE COUPON ENGINE
 * 
 * Emissão e validação de cupons patrocinados por lojistas:
 * - Cupons contextuais entregues no término da corrida
 * - Descontos em estabelecimentos próximos ao destino do passageiro
 * - Limites de uso por usuário e regras de gasto mínimo
 */

export interface CommercialCoupon {
  couponId: string;
  couponCode: string; // Ex: "FOGAO15"
  merchantId: string;
  merchantName: string;
  discountType: 'PERCENTUAL' | 'VALOR_FIXO';
  discountValue: number; // 15% ou R$ 10,00
  minimumOrderValueBrl: number;
  maxDiscountBrl: number;
  totalIssued: number;
  totalRedeemed: number;
  validUntil: string;
  active: boolean;
}

export class CouponEngine {
  private coupons: Map<string, CommercialCoupon> = new Map();

  constructor() {
    this.seedDefaultCoupons();
  }

  private seedDefaultCoupons(): void {
    const defaultCoupons: CommercialCoupon[] = [
      {
        couponId: 'CPN-01',
        couponCode: 'FOGAO15',
        merchantId: 'MKT-ITAP-01',
        merchantName: 'Restaurante Fogão de Lenha',
        discountType: 'PERCENTUAL',
        discountValue: 15.0,
        minimumOrderValueBrl: 40.0,
        maxDiscountBrl: 25.0,
        totalIssued: 500,
        totalRedeemed: 142,
        validUntil: '2026-12-31',
        active: true
      },
      {
        couponId: 'CPN-02',
        couponCode: 'SAULUCAS10',
        merchantId: 'MKT-ITAP-02',
        merchantName: 'Farmácia São Lucas',
        discountType: 'VALOR_FIXO',
        discountValue: 10.0,
        minimumOrderValueBrl: 50.0,
        maxDiscountBrl: 10.0,
        totalIssued: 800,
        totalRedeemed: 320,
        validUntil: '2026-12-31',
        active: true
      }
    ];

    defaultCoupons.forEach(c => this.coupons.set(c.couponCode, c));
  }

  public getCoupon(couponCode: string): CommercialCoupon | undefined {
    return this.coupons.get(couponCode.toUpperCase().trim());
  }

  public validateCoupon(couponCode: string, purchaseAmountBrl: number): {
    valid: boolean;
    discountBrl: number;
    finalAmountBrl: number;
    reason?: string;
  } {
    const coupon = this.getCoupon(couponCode);
    if (!coupon || !coupon.active) {
      return { valid: false, discountBrl: 0, finalAmountBrl: purchaseAmountBrl, reason: 'Cupom inválido ou inativo.' };
    }

    if (purchaseAmountBrl < coupon.minimumOrderValueBrl) {
      return {
        valid: false,
        discountBrl: 0,
        finalAmountBrl: purchaseAmountBrl,
        reason: `Valor mínimo para este cupom é R$ ${coupon.minimumOrderValueBrl.toFixed(2)}.`
      };
    }

    let discount = coupon.discountType === 'PERCENTUAL'
      ? (purchaseAmountBrl * coupon.discountValue) / 100
      : coupon.discountValue;

    discount = Math.min(discount, coupon.maxDiscountBrl);
    const finalAmount = Math.max(0, purchaseAmountBrl - discount);

    coupon.totalRedeemed += 1;

    return {
      valid: true,
      discountBrl: Number(discount.toFixed(2)),
      finalAmountBrl: Number(finalAmount.toFixed(2))
    };
  }
}

export const couponEngine = new CouponEngine();
