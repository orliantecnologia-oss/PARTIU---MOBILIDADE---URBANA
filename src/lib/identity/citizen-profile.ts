/**
 * CITIZEN DIGITAL PROFILE (REGIONAL DID)
 * 
 * Identidade Digital Regional do Cidadão:
 * - Unifica múltiplos papéis: Passageiro, Motorista, Estudante, Paciente e Consumidor
 * - Compatibilidade com CPF criptografado, Gov.br e LGPD
 */

export interface CitizenProfile {
  citizenDid: string; // Ex: "did:partiu:br:rj:itaperuna:cit-8821"
  fullName: string;
  cpfSha256Hash: string;
  cpfMasked: string;
  cityId: string;
  cityName: string;
  roles: ('PASSAGEIRO' | 'MOTORISTA' | 'ESTUDANTE' | 'PACIENTE_SAUDE' | 'CONSUMIDOR_LOCAL')[];
  trustScore: number; // 0 a 100
  govBrLevel: 'BRONZE' | 'PRATA' | 'OURO' | 'NAO_CONECTADO';
  isBiometricsVerified: boolean;
  walletId: string;
  registeredAt: number;
  lastActiveAt: number;
  lgpdConsent: {
    dataProcessingAgreed: boolean;
    locationTrackingAgreed: boolean;
    healthTransitDataAgreed: boolean;
    consentedAt: number;
  };
}

export class CitizenProfileRegistry {
  private citizens: Map<string, CitizenProfile> = new Map();

  constructor() {
    this.seedDefaultCitizens();
  }

  private seedDefaultCitizens(): void {
    const defaultCitizen: CitizenProfile = {
      citizenDid: 'did:partiu:br:rj:itaperuna:cit-001',
      fullName: 'Maria Silva Santos',
      cpfSha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      cpfMasked: '***.456.789-**',
      cityId: 'itaperuna-rj',
      cityName: 'Itaperuna',
      roles: ['PASSAGEIRO', 'CONSUMIDOR_LOCAL', 'PACIENTE_SAUDE'],
      trustScore: 94.5,
      govBrLevel: 'OURO',
      isBiometricsVerified: true,
      walletId: 'WAL-CIT-001',
      registeredAt: Date.now() - 86400000 * 90,
      lastActiveAt: Date.now(),
      lgpdConsent: {
        dataProcessingAgreed: true,
        locationTrackingAgreed: true,
        healthTransitDataAgreed: true,
        consentedAt: Date.now() - 86400000 * 90
      }
    };

    this.citizens.set(defaultCitizen.citizenDid, defaultCitizen);
  }

  public getCitizenByDid(did: string): CitizenProfile | undefined {
    return this.citizens.get(did);
  }

  public registerCitizen(citizen: CitizenProfile): void {
    this.citizens.set(citizen.citizenDid, citizen);
  }
}

export const citizenProfileRegistry = new CitizenProfileRegistry();
