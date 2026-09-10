/**
 * PARTIU MOBILIDADE URBANA — DYNAMIC DELIVERY PRICING ENGINE
 * 
 * High-precision algorithm for urban last-mile freight quotation:
 * Price = Floor( [Base + (Dist * KmRate) + (Time * MinRate)] * SizeMultiplier * Surge + Insurance )
 * 
 * Ensures:
 * 1. Fair compensation for couriers (minimum floor: R$ 9.90 moto / R$ 18.50 carro).
 * 2. Transparent itemized breakdown for senders.
 * 3. Guaranteed instant D+0 net payout based on courier subscription plan (0% to 5% platform fee).
 */

import type { FlashPackageSize } from "../partiu-flash-engine";
import { subscriptionEngine } from "../revenue/subscription-engine";
import { STANDARD_DRIVER_PLANS } from "../revenue/commission-engine";

export interface DeliveryPricingInput {
  distanceKm: number;
  durationMin?: number | undefined;
  vehicleType: "moto" | "carro";
  packageSize?: FlashPackageSize | undefined;
  declaredValueBrl?: number | undefined;
  hasInsurance?: boolean | undefined;
  surgeMultiplier?: number | undefined;
  courierId?: string | undefined;
  courierCommissionPercent?: number | undefined;
}

export interface DeliveryPricingBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  packageSizeMultiplier: number;
  sizeSurcharge: number;
  insuranceFare: number;
  surgeMultiplier: number;
  subtotal: number;
  totalFare: number;
  courierNetShare: number; // Repasse líquido ao entregador baseado no seu plano (até 100% no Ouro)
  platformFee: number; // Taxa do plano do entregador (0% a 5%)
  courierCommissionPercent: number; // Taxa percentual aplicada
  estimatedDurationMin: number;
}

// ─── RATES TABLE ───────────────────────────────────────────────────────────

const PRICING_CONSTANTS = {
  moto: {
    baseFare: 6.5,
    kmRate: 1.5,
    minRate: 0.25,
    minimumFloor: 9.9,
    defaultSpeedKmH: 28,
  },
  carro: {
    baseFare: 12.0,
    kmRate: 2.2,
    minRate: 0.4,
    minimumFloor: 18.5,
    defaultSpeedKmH: 22,
  },
};

const PACKAGE_SIZE_MULTIPLIERS: Record<FlashPackageSize, number> = {
  ENVELOPE: 0.95,
  PEQUENO: 1.0,
  MEDIO: 1.25,
  GRANDE: 1.5,
};

// ─── PRICING CALCULATOR ───────────────────────────────────────────────────

export function calculateDeliveryPrice(input: DeliveryPricingInput): DeliveryPricingBreakdown {
  const vehicle = input.vehicleType === "carro" ? "carro" : "moto";
  const rates = PRICING_CONSTANTS[vehicle];

  const distanceKm = Math.max(0.5, input.distanceKm);

  // Estimate duration if not provided
  const estimatedDurationMin =
    input.durationMin && input.durationMin > 0
      ? input.durationMin
      : Math.max(5, Math.round((distanceKm / rates.defaultSpeedKmH) * 60 * 1.2));

  // Package size factor
  const packageSize: FlashPackageSize = input.packageSize || "PEQUENO";
  const sizeMultiplier = PACKAGE_SIZE_MULTIPLIERS[packageSize] || 1.0;

  // Surge multiplier (capped between 1.0 and 1.45)
  const rawSurge = input.surgeMultiplier ?? 1.0;
  const surge = Math.min(1.45, Math.max(1.0, rawSurge));

  // Distance and time calculation
  const baseFare = rates.baseFare;
  const distanceFare = Number((distanceKm * rates.kmRate).toFixed(2));
  const timeFare = Number((estimatedDurationMin * rates.minRate).toFixed(2));

  // Base sum before modifiers
  const rawRouteCost = baseFare + distanceFare + timeFare;

  // Apply size factor
  const adjustedRouteCost = rawRouteCost * sizeMultiplier;
  const sizeSurcharge = Number((adjustedRouteCost - rawRouteCost).toFixed(2));

  // Apply surge
  const surgedCost = adjustedRouteCost * surge;

  // Insurance cost: 1.5% of declared value, minimum R$ 1.50 if enabled
  let insuranceFare = 0;
  if (input.hasInsurance && input.declaredValueBrl && input.declaredValueBrl > 0) {
    insuranceFare = Math.max(1.5, Number((input.declaredValueBrl * 0.015).toFixed(2)));
  }

  // Pre-floor subtotal
  const subtotal = Number((surgedCost + insuranceFare).toFixed(2));

  // Minimum floor enforcement
  const totalFare = Math.max(rates.minimumFloor, subtotal);

  // Split dinâmico baseado no plano de assinatura do entregador (0% no Ouro, 1% no Prata, 3% no Bronze, 5% no Free)
  let courierCommissionPercent = input.courierCommissionPercent;
  if (courierCommissionPercent === undefined) {
    if (input.courierId) {
      try {
        const sub = subscriptionEngine.getDriverSubscription(input.courierId);
        const plan = subscriptionEngine.getPlanById(sub.planId);
        courierCommissionPercent = plan ? plan.commissionPercent : STANDARD_DRIVER_PLANS.LIVRE.commissionPercent;
      } catch {
        courierCommissionPercent = STANDARD_DRIVER_PLANS.LIVRE.commissionPercent;
      }
    } else {
      courierCommissionPercent = STANDARD_DRIVER_PLANS.LIVRE.commissionPercent; // 5.0% padrão Free
    }
  }

  const platformFee = Number((totalFare * (courierCommissionPercent / 100)).toFixed(2));
  const courierNetShare = Number((totalFare - platformFee).toFixed(2));

  return {
    baseFare,
    distanceFare,
    timeFare,
    packageSizeMultiplier: sizeMultiplier,
    sizeSurcharge,
    insuranceFare,
    surgeMultiplier: surge,
    subtotal,
    totalFare,
    courierNetShare,
    platformFee,
    courierCommissionPercent,
    estimatedDurationMin,
  };
}

/**
 * Fast quote helper for UI buttons
 */
export function getFastDeliveryQuote(
  distanceKm: number,
  vehicleType: "moto" | "carro",
  packageSize?: FlashPackageSize | undefined,
): number {
  const res = calculateDeliveryPrice({
    distanceKm,
    vehicleType,
    packageSize,
  });
  return res.totalFare;
}
