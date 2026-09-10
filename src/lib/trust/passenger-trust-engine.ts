/**
 * PARTIU PASSENGER TRUST ENGINE
 * 
 * Motor Orquestrador do Índice de Confiança do Passageiro (Passenger Trust Index - PTI).
 * Integra perfis comportamentais, prevenção a fraudes e telemetria da frota.
 */

import { PassengerTrustProfile, passengerTrustScoreEngine } from './trust-score';
import { PassengerBehaviorMetrics } from './behavior-analysis';
import { PassengerReputationRecord } from './reputation-engine';

export interface CityPassengerTrustIndexReport {
  cityId: string;
  cityName: string;
  totalPassengersEvaluated: number;
  averageTrustScore: number;
  distributionByTierPct: {
    elite: number;
    premium: number;
    confiavel: number;
    observacao: number;
    restrito: number;
    bloqueado: number;
  };
  totalBlockedAccounts: number;
  cityTrustRating: 'REDE_ALTA_CONFIANCA' | 'REDE_SAUDAVEL' | 'ATENCAO_FRAUDES';
}

export class PassengerTrustEngine {
  private profiles: Map<string, PassengerTrustProfile> = new Map();

  /**
   * Avalia e atualiza o perfil de confiança de um passageiro
   */
  public evaluatePassenger(
    behavior: PassengerBehaviorMetrics,
    reputation: PassengerReputationRecord
  ): PassengerTrustProfile {
    const profile = passengerTrustScoreEngine.computeTrustProfile(behavior, reputation);
    this.profiles.set(profile.passengerId, profile);
    return profile;
  }

  public getProfile(passengerId: string): PassengerTrustProfile | undefined {
    return this.profiles.get(passengerId);
  }

  public getAllProfiles(): PassengerTrustProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Gera o Passenger Trust Index (PTI) agregado para uma praça municipal
   */
  public calculateCityPassengerTrustIndex(cityId: string, cityName: string): CityPassengerTrustIndexReport {
    const all = Array.from(this.profiles.values());
    const count = all.length > 0 ? all.length : 1;

    let sumScore = 0;
    let elite = 0;
    let premium = 0;
    let confiavel = 0;
    let observacao = 0;
    let restrito = 0;
    let bloqueado = 0;

    all.forEach(p => {
      sumScore += p.overallTrustScore;
      if (p.tier === 'ELITE') elite++;
      else if (p.tier === 'PREMIUM') premium++;
      else if (p.tier === 'CONFIAVEL') confiavel++;
      else if (p.tier === 'OBSERVACAO') observacao++;
      else if (p.tier === 'RESTRITO') restrito++;
      else if (p.tier === 'BLOQUEADO') bloqueado++;
    });

    const averageTrustScore = all.length > 0 ? Math.round(sumScore / count) : 81;

    let cityTrustRating: CityPassengerTrustIndexReport['cityTrustRating'] = 'REDE_SAUDAVEL';
    if (averageTrustScore >= 85) cityTrustRating = 'REDE_ALTA_CONFIANCA';
    else if (averageTrustScore < 65) cityTrustRating = 'ATENCAO_FRAUDES';

    return {
      cityId,
      cityName,
      totalPassengersEvaluated: count,
      averageTrustScore,
      distributionByTierPct: {
        elite: Number(((elite / count) * 100).toFixed(1)),
        premium: Number(((premium / count) * 100).toFixed(1)),
        confiavel: Number(((confiavel / count) * 100).toFixed(1)),
        observacao: Number(((observacao / count) * 100).toFixed(1)),
        restrito: Number(((restrito / count) * 100).toFixed(1)),
        bloqueado: Number(((bloqueado / count) * 100).toFixed(1))
      },
      totalBlockedAccounts: bloqueado,
      cityTrustRating
    };
  }
}

export const passengerTrustEngine = new PassengerTrustEngine();
