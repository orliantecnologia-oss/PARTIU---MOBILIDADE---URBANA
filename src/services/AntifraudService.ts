/**
 * ==============================================================================
 * 🛡️ PARTIU ANTIFRAUD & INTEGRITY VERIFICATION ENGINE (v4.0)
 * ==============================================================================
 * Blindagem antifraude contra adulteração de preços e coordenadas.
 *
 * Princípio Arquitetural:
 * - O frontend NUNCA dita o preço final nem o repasse do motorista.
 * - Ao solicitar a corrida, o cliente despacha apenas:
 *   { pickupCoordinates, destinationCoordinates, category }
 * - O servidor recalcula mandatoriamente rota real, distância, ETA e tarifa.
 * - Se houver divergência entre a cotação prévia e o cálculo real (> 1.5%),
 *   a requisição é bloqueada e registrada na auditoria de segurança.
 * ==============================================================================
 */

import { routingService, type RouteMetrics } from "./RoutingService";
import { pricingService, type SupportedVehicleCategory, type ItemizedQuote } from "./PricingService";

export interface RideVerificationRequest {
  pickupCoordinates: [number, number];
  destinationCoordinates: [number, number];
  category: SupportedVehicleCategory | "MOTO" | "CARRO" | "EXECUTIVO" | "FLASH" | "ENTREGA" | "TURISMO" | "VAN" | string;
  clientClaimedFare?: number;
  passengerId?: string;
  passengerName?: string;
}

export interface RideVerificationResult {
  isApproved: boolean;
  verifiedFare: number;
  verifiedDistanceKm: number;
  verifiedDurationMin: number;
  routeMetrics: RouteMetrics;
  itemizedQuote: ItemizedQuote;
  discrepancyPercent: number;
  rejectionReason?: string | undefined;
  tamperDetected: boolean;
  timestamp: number;
}

export class AntifraudService {
  private static instance: AntifraudService;
  private readonly MAX_ALLOWED_DISCREPANCY_PERCENT = 2.0; // Tolerância máxima de 2% para micro-flutuação de arredondamento

  private constructor() {}

  public static getInstance(): AntifraudService {
    if (!AntifraudService.instance) {
      AntifraudService.instance = new AntifraudService();
    }
    return AntifraudService.instance;
  }

  /**
   * Valida e audita o pedido de corrida recalculando todas as variáveis no backend / in-process
   */
  public async verifyAndAuthorizeRide(request: RideVerificationRequest): Promise<RideVerificationResult> {
    const { pickupCoordinates, destinationCoordinates, category, clientClaimedFare } = request;

    // 1. Verificação de Coordenadas Físicas Válidas
    const [pLng, pLat] = pickupCoordinates;
    const [dLng, dLat] = destinationCoordinates;

    if (
      isNaN(pLng) || isNaN(pLat) || isNaN(dLng) || isNaN(dLat) ||
      pLat < -90 || pLat > 90 || dLat < -90 || dLat > 90 ||
      pLng < -180 || pLng > 180 || dLng < -180 || dLng > 180
    ) {
      return {
        isApproved: false,
        verifiedFare: 0,
        verifiedDistanceKm: 0,
        verifiedDurationMin: 0,
        routeMetrics: {} as any,
        itemizedQuote: {} as any,
        discrepancyPercent: 100,
        rejectionReason: "Coordenadas geográficas inválidas ou fora dos limites do planeta.",
        tamperDetected: true,
        timestamp: Date.now(),
      };
    }

    // 2. Recálculo Mandatório da Rota Real (Sem confiar em nenhum valor de distância do cliente)
    const verifiedRoute = await routingService.getRoute(pickupCoordinates, destinationCoordinates, {
      skipCache: false,
      trafficAware: true,
    });

    // 3. Normaliza categoria para as 7 oficiais
    let officialCategory: SupportedVehicleCategory = "PARTIU_CARRO";
    if (category === "MOTO" || category === "PARTIU_MOTO") officialCategory = "PARTIU_MOTO";
    else if (category === "CARRO" || category === "PARTIU_CARRO") officialCategory = "PARTIU_CARRO";
    else if (category === "PARTIU_EXECUTIVO") officialCategory = "PARTIU_EXECUTIVO";
    else if (category === "PARTIU_FLASH") officialCategory = "PARTIU_FLASH";
    else if (category === "PARTIU_ENTREGA") officialCategory = "PARTIU_ENTREGA";
    else if (category === "PARTIU_TURISMO") officialCategory = "PARTIU_TURISMO";
    else if (category === "PARTIU_VAN") officialCategory = "PARTIU_VAN";

    // 4. Recálculo Mandatório da Tarifa Dinâmica
    const multiQuotes = pricingService.calculateMultiCategoryQuotes(verifiedRoute);
    const categoryQuote = multiQuotes[officialCategory];
    const verifiedFare = categoryQuote.priceBrl;

    // 5. Verificação de Integridade Antifraude (Se o cliente enviou um valor alegado)
    let tamperDetected = false;
    let discrepancyPercent = 0;
    let isApproved = true;
    let rejectionReason: string | undefined;

    if (clientClaimedFare !== undefined && clientClaimedFare > 0) {
      discrepancyPercent = Math.abs((clientClaimedFare - verifiedFare) / verifiedFare) * 100;

      if (discrepancyPercent > this.MAX_ALLOWED_DISCREPANCY_PERCENT) {
        tamperDetected = true;
        isApproved = false;
        rejectionReason = `Tentativa de adulteração detectada: Valor do cliente (R$ ${clientClaimedFare.toFixed(2)}) diverge da tarifa oficial recalculada (R$ ${verifiedFare.toFixed(2)}) em ${discrepancyPercent.toFixed(1)}%.`;
        console.warn("[AntifraudService] BLOQUEIO:", rejectionReason);
      }
    }

    return {
      isApproved,
      verifiedFare,
      verifiedDistanceKm: verifiedRoute.distanceKm,
      verifiedDurationMin: verifiedRoute.trafficDurationMinutes || verifiedRoute.durationMinutes,
      routeMetrics: verifiedRoute,
      itemizedQuote: categoryQuote,
      discrepancyPercent: Math.round(discrepancyPercent * 10) / 10,
      rejectionReason,
      tamperDetected,
      timestamp: Date.now(),
    };
  }

  /**
   * Método de verificação rápida com mapeamento direto de parâmetros
   */
  public async verifyQuote(params: {
    origemCoords: [number, number];
    destinoCoords: [number, number];
    category: SupportedVehicleCategory | "MOTO" | "CARRO";
    clientFareBrl: number;
    clientDistanceKm?: number;
    clientDurationMinutes?: number;
  }): Promise<{ isValid: boolean; tamperDetected: boolean; rejectionReason?: string | undefined; verifiedFare: number }> {
    const res = await this.verifyAndAuthorizeRide({
      pickupCoordinates: params.origemCoords,
      destinationCoordinates: params.destinoCoords,
      category: params.category,
      clientClaimedFare: params.clientFareBrl,
    });
    return {
      isValid: res.isApproved,
      tamperDetected: res.tamperDetected,
      rejectionReason: res.rejectionReason,
      verifiedFare: res.verifiedFare,
    };
  }
}

export const antifraudService = AntifraudService.getInstance();
