/**
 * REGIONAL BUSINESS PROFILE (ENTERPRISE DID)
 * 
 * Identidade Digital Regional de Pessoas Jurídicas:
 * - Empresas Corporativas B2B
 * - Franqueados Municipais
 * - Cooperativas de Transporte (Vans e Fretamento)
 * - Lojistas e Comércios Credenciados
 */

export type BusinessRole = 'EMPRESA_B2B' | 'FRANQUEADO_MUNICIPAL' | 'COOPERATIVA_TRANSPORTE' | 'LOJISTA_COMERCIO';

export interface BusinessProfile {
  businessDid: string; // Ex: "did:partiu:biz:rj:itaperuna:coopvans-01"
  companyName: string;
  tradingName: string;
  cnpjMasked: string;
  cnpjSha256Hash: string;
  cityId: string;
  cityName: string;
  roles: BusinessRole[];
  municipalRegistration: string; // Inscrição Municipal
  legalRepresentativeName: string;
  legalRepresentativeCpfMasked: string;
  trustScore: number; // 0 a 100
  partiuPayWalletId: string;
  openFinanceCreditTier: 'TIER_AAA' | 'TIER_AA' | 'TIER_A' | 'TIER_B';
  verifiedAt: number;
  active: boolean;
}

export class BusinessProfileRegistry {
  private businesses: Map<string, BusinessProfile> = new Map();

  constructor() {
    this.seedDefaultBusinesses();
  }

  private seedDefaultBusinesses(): void {
    const defaultBusinesses: BusinessProfile[] = [
      {
        businessDid: 'did:partiu:biz:rj:itaperuna:techcorp-01',
        companyName: 'TechCorp Norte Fluminense Ltda',
        tradingName: 'TechCorp NF',
        cnpjMasked: '**.456.789/0001-**',
        cnpjSha256Hash: 'cf5b16a7788a6ef8396300f00ecb7b974f25a187e70714c0924e164506ab7045',
        cityId: 'itaperuna-rj',
        cityName: 'Itaperuna',
        roles: ['EMPRESA_B2B'],
        municipalRegistration: 'IM-ITAP-88421',
        legalRepresentativeName: 'Dr. Roberto de Souza',
        legalRepresentativeCpfMasked: '***.123.456-**',
        trustScore: 98.0,
        partiuPayWalletId: 'WAL-B2B-001',
        openFinanceCreditTier: 'TIER_AAA',
        verifiedAt: Date.now() - 86400000 * 60,
        active: true
      },
      {
        businessDid: 'did:partiu:biz:rj:itaperuna:coopvans-01',
        companyName: 'Cooperativa de Transportadores Alternativos de Itaperuna',
        tradingName: 'CoopVans Itaperuna',
        cnpjMasked: '**.998.112/0001-**',
        cnpjSha256Hash: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        cityId: 'itaperuna-rj',
        cityName: 'Itaperuna',
        roles: ['COOPERATIVA_TRANSPORTE'],
        municipalRegistration: 'IM-ITAP-11029',
        legalRepresentativeName: 'Antônio Carlos Peixoto',
        legalRepresentativeCpfMasked: '***.789.012-**',
        trustScore: 95.0,
        partiuPayWalletId: 'WAL-COOP-01',
        openFinanceCreditTier: 'TIER_AA',
        verifiedAt: Date.now() - 86400000 * 120,
        active: true
      }
    ];

    defaultBusinesses.forEach(b => this.businesses.set(b.businessDid, b));
  }

  public getBusinessByDid(did: string): BusinessProfile | undefined {
    return this.businesses.get(did);
  }

  public registerBusiness(business: BusinessProfile): void {
    this.businesses.set(business.businessDid, business);
  }
}

export const businessProfileRegistry = new BusinessProfileRegistry();
