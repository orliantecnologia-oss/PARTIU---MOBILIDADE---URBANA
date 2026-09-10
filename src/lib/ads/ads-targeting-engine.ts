/**
 * PARTIU ADS TARGETING ENGINE
 * 
 * Motor de Segmentação Geográfica e Contextual Hiperlocal.
 * Direciona anúncios do comércio local baseando-se no raio de proximidade e rota do passageiro.
 */

import { LocalAdCampaign } from './ads-auction-engine';

export class AdsTargetingEngine {
  /**
   * Filtra campanhas elegíveis baseadas na localização e contexto da viagem
   */
  public filterEligibleCampaigns(
    allCampaigns: LocalAdCampaign[],
    cityId: string,
    passengerLatitude: number,
    passengerLongitude: number,
    categoryFilter?: LocalAdCampaign['category']
  ): LocalAdCampaign[] {
    return allCampaigns.filter(c => {
      if (!c.isActive) return false;
      if (c.cityId !== cityId) return false;
      if (categoryFilter && c.category !== categoryFilter) return false;

      // Cálculo de distância aproximada
      const latDiff = Math.abs(c.targetLatitude - passengerLatitude) * 111.0;
      const lngDiff = Math.abs(c.targetLongitude - passengerLongitude) * 102.0;
      const distanceKm = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

      return distanceKm <= c.maxRadiusKm;
    });
  }

  /**
   * Calcula a distância aproximada entre o passageiro e o comércio anunciado
   */
  public calculateDistanceKm(
    passengerLat: number,
    passengerLng: number,
    adLat: number,
    adLng: number
  ): number {
    const latDiff = Math.abs(adLat - passengerLat) * 111.0;
    const lngDiff = Math.abs(adLng - passengerLng) * 102.0;
    return Number(Math.sqrt(latDiff * latDiff + lngDiff * lngDiff).toFixed(2));
  }
}

export const adsTargetingEngine = new AdsTargetingEngine();
