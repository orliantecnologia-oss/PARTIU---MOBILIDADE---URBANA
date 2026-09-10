/**
 * REGIONAL DIGITAL IDENTITY — ORCHESTRATOR ENGINE
 * 
 * Unificação da Identidade Digital Regional:
 * - Passageiros
 * - Motoristas
 * - Empresas Corporativas
 * - Franqueados Municipais
 * - Lojistas Credenciados
 * 
 * Uma única identidade interoperável com Open Finance, Gov.br e LGPD.
 */

import { citizenProfileRegistry, CitizenProfile } from './citizen-profile';
import { businessProfileRegistry, BusinessProfile, BusinessRole } from './business-profile';
import { trustVerificationEngine, TrustVerificationResult } from './trust-verification';

export type UnifiedEntityCategory = 'CIDADAO' | 'EMPRESA';

export interface UnifiedIdentitySummary {
  did: string;
  category: UnifiedEntityCategory;
  displayName: string;
  documentMasked: string;
  cityId: string;
  roles: string[];
  trustScore: number;
  isVerified: boolean;
  walletId: string;
}

export class IdentityEngine {
  public getCitizenRegistry() {
    return citizenProfileRegistry;
  }

  public getBusinessRegistry() {
    return businessProfileRegistry;
  }

  public getTrustEngine() {
    return trustVerificationEngine;
  }

  /**
   * Resolve uma entidade unificada por DID
   */
  public resolveIdentity(did: string): UnifiedIdentitySummary | undefined {
    if (did.startsWith('did:partiu:biz:')) {
      const biz = businessProfileRegistry.getBusinessByDid(did);
      if (!biz) return undefined;
      return {
        did: biz.businessDid,
        category: 'EMPRESA',
        displayName: biz.tradingName,
        documentMasked: biz.cnpjMasked,
        cityId: biz.cityId,
        roles: biz.roles,
        trustScore: biz.trustScore,
        isVerified: biz.active,
        walletId: biz.partiuPayWalletId
      };
    }

    const cit = citizenProfileRegistry.getCitizenByDid(did);
    if (!cit) return undefined;

    return {
      did: cit.citizenDid,
      category: 'CIDADAO',
      displayName: cit.fullName,
      documentMasked: cit.cpfMasked,
      cityId: cit.cityId,
      roles: cit.roles,
      trustScore: cit.trustScore,
      isVerified: cit.isBiometricsVerified,
      walletId: cit.walletId
    };
  }
}

export const identityEngine = new IdentityEngine();
