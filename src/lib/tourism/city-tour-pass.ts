/**
 * CITY TOUR PASS & TOURIST SUBSCRIPTION ENGINE
 * 
 * Emissão e validação de Passes Turísticos:
 * - Pass 24h, 48h e 7 Dias
 * - Acesso ilimitado ou com franquia a vans turísticas e transporte integrado
 * - Cupons integrados para pontos turísticos, hotéis e restaurantes
 */

export type TourPassDuration = 'PASS_24H' | 'PASS_48H' | 'PASS_7D';

export interface CityTourPass {
  passId: string;
  passCode: string;
  visitorName: string;
  visitorDocumentMasked: string;
  cityId: string;
  duration: TourPassDuration;
  pricePaidBrl: number;
  maxRidesIncluded: number;
  ridesUsed: number;
  partnerDiscountsIncluded: {
    partnerName: string;
    category: 'GASTRONOMIA' | 'HOTELARIA' | 'MUSEU_CULTURA' | 'PARQUE_ECOTURISMO';
    discountPct: number;
  }[];
  activatedAt: number;
  expiresAt: number;
  status: 'ATIVO' | 'EXPIRADO' | 'CANCELADO';
}

export class CityTourPassEngine {
  private passes: Map<string, CityTourPass> = new Map();

  constructor() {
    this.seedDefaultPasses();
  }

  private seedDefaultPasses(): void {
    const defaultPass: CityTourPass = {
      passId: 'TOUR-ITAP-01',
      passCode: 'PARTIU-TOUR-24H-88',
      visitorName: 'Rodrigo Fontes Toledo',
      visitorDocumentMasked: '***.774.221-**',
      cityId: 'itaperuna-rj',
      duration: 'PASS_24H',
      pricePaidBrl: 49.90,
      maxRidesIncluded: 6,
      ridesUsed: 2,
      partnerDiscountsIncluded: [
        { partnerName: 'Restaurante Fogão de Lenha', category: 'GASTRONOMIA', discountPct: 15 },
        { partnerName: 'Hotel Topázio', category: 'HOTELARIA', discountPct: 10 },
        { partnerName: 'Parque das Águas de Raposo', category: 'PARQUE_ECOTURISMO', discountPct: 20 }
      ],
      activatedAt: Date.now() - 14400000, // 4h atrás
      expiresAt: Date.now() + 72000000,
      status: 'ATIVO'
    };

    this.passes.set(defaultPass.passCode, defaultPass);
  }

  public purchaseTourPass(params: {
    visitorName: string;
    visitorDocumentMasked: string;
    cityId: string;
    duration: TourPassDuration;
  }): CityTourPass {
    const hours = params.duration === 'PASS_24H' ? 24 : params.duration === 'PASS_48H' ? 48 : 168;
    const price = params.duration === 'PASS_24H' ? 49.90 : params.duration === 'PASS_48H' ? 89.90 : 199.90;
    const maxRides = params.duration === 'PASS_24H' ? 6 : params.duration === 'PASS_48H' ? 12 : 30;

    const pass: CityTourPass = {
      passId: `TP-${Date.now()}`,
      passCode: `TOUR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      visitorName: params.visitorName,
      visitorDocumentMasked: params.visitorDocumentMasked,
      cityId: params.cityId,
      duration: params.duration,
      pricePaidBrl: price,
      maxRidesIncluded: maxRides,
      ridesUsed: 0,
      partnerDiscountsIncluded: [
        { partnerName: 'Rede Gastronômica Parceira', category: 'GASTRONOMIA', discountPct: 15 },
        { partnerName: 'Pousadas e Hotéis Locais', category: 'HOTELARIA', discountPct: 10 }
      ],
      activatedAt: Date.now(),
      expiresAt: Date.now() + hours * 3600000,
      status: 'ATIVO'
    };

    this.passes.set(pass.passCode, pass);
    return pass;
  }

  public validatePassForRide(passCode: string): { valid: boolean; remainingRides: number; message: string } {
    const pass = this.passes.get(passCode);
    if (!pass) return { valid: false, remainingRides: 0, message: 'Pass Turístico não encontrado.' };
    if (pass.status !== 'ATIVO' || Date.now() > pass.expiresAt) {
      pass.status = 'EXPIRADO';
      return { valid: false, remainingRides: 0, message: 'Pass Turístico expirado.' };
    }
    if (pass.ridesUsed >= pass.maxRidesIncluded) {
      return { valid: false, remainingRides: 0, message: 'Limite de corridas do pass atingido.' };
    }

    pass.ridesUsed += 1;
    return {
      valid: true,
      remainingRides: pass.maxRidesIncluded - pass.ridesUsed,
      message: 'Embarque turístico autorizado com sucesso!'
    };
  }
}

export const cityTourPassEngine = new CityTourPassEngine();
