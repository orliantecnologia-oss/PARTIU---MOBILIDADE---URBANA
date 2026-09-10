/**
 * PARTIU FRANCHISE ENGINE
 * 
 * Sistema Operacional de Franquias Municipais Federadas.
 * Cada cidade opera como uma unidade independente de negócio com governança local.
 */

export interface FranchiseUnit {
  franchiseId: string;
  cityId: string;
  cityName: string;
  uf: string;
  franchiseeName: string;
  franchiseeCnpj: string;
  contractStartDate: number;
  contractEndDate: number;
  activeDriversCount: number;
  activePassengersCount: number;
  monthlyTripsVolume: number;
  status: 'OPERACAO_ATIVA' | 'RAMP_UP' | 'SOB_AUDITORIA' | 'SUSPENSA';
  exclusiveTerritoryRadiusKm: number;
}

export class FranchiseEngine {
  private franchises: Map<string, FranchiseUnit> = new Map();

  constructor() {
    this.initializeDefaultFranchises();
  }

  private initializeDefaultFranchises(): void {
    const defaultUnits: FranchiseUnit[] = [
      {
        franchiseId: 'FRAN-ITA-01',
        cityId: 'itaperuna-rj',
        cityName: 'Itaperuna',
        uf: 'RJ',
        franchiseeName: 'Mobilidade Noroeste Franquias Ltda',
        franchiseeCnpj: '34.567.890/0001-12',
        contractStartDate: Date.now() - 365 * 86400 * 1000,
        contractEndDate: Date.now() + 365 * 4 * 86400 * 1000,
        activeDriversCount: 84,
        activePassengersCount: 6200,
        monthlyTripsVolume: 18500,
        status: 'OPERACAO_ATIVA',
        exclusiveTerritoryRadiusKm: 25.0
      },
      {
        franchiseId: 'FRAN-CMP-02',
        cityId: 'campos-rj',
        cityName: 'Campos dos Goytacazes',
        uf: 'RJ',
        franchiseeName: 'Campos Mobility Serviços Urbanos',
        franchiseeCnpj: '45.678.901/0001-23',
        contractStartDate: Date.now() - 200 * 86400 * 1000,
        contractEndDate: Date.now() + 365 * 5 * 86400 * 1000,
        activeDriversCount: 165,
        activePassengersCount: 14500,
        monthlyTripsVolume: 42000,
        status: 'OPERACAO_ATIVA',
        exclusiveTerritoryRadiusKm: 35.0
      },
      {
        franchiseId: 'FRAN-MAC-03',
        cityId: 'macae-rj',
        cityName: 'Macaé',
        uf: 'RJ',
        franchiseeName: 'Costa do Sol Transportes e Franquias',
        franchiseeCnpj: '56.789.012/0001-34',
        contractStartDate: Date.now() - 150 * 86400 * 1000,
        contractEndDate: Date.now() + 365 * 5 * 86400 * 1000,
        activeDriversCount: 120,
        activePassengersCount: 11800,
        monthlyTripsVolume: 31000,
        status: 'OPERACAO_ATIVA',
        exclusiveTerritoryRadiusKm: 30.0
      },
      {
        franchiseId: 'FRAN-RDO-04',
        cityId: 'rio-das-ostras-rj',
        cityName: 'Rio das Ostras',
        uf: 'RJ',
        franchiseeName: 'Ostras Mob Operações Urbanas',
        franchiseeCnpj: '67.890.123/0001-45',
        contractStartDate: Date.now() - 90 * 86400 * 1000,
        contractEndDate: Date.now() + 365 * 5 * 86400 * 1000,
        activeDriversCount: 55,
        activePassengersCount: 4900,
        monthlyTripsVolume: 12400,
        status: 'OPERACAO_ATIVA',
        exclusiveTerritoryRadiusKm: 20.0
      },
      {
        franchiseId: 'FRAN-CBF-05',
        cityId: 'cabo-frio-rj',
        cityName: 'Cabo Frio',
        uf: 'RJ',
        franchiseeName: 'Lagos Express Franquias',
        franchiseeCnpj: '78.901.234/0001-56',
        contractStartDate: Date.now() - 120 * 86400 * 1000,
        contractEndDate: Date.now() + 365 * 5 * 86400 * 1000,
        activeDriversCount: 95,
        activePassengersCount: 8900,
        monthlyTripsVolume: 22800,
        status: 'OPERACAO_ATIVA',
        exclusiveTerritoryRadiusKm: 25.0
      },
      {
        franchiseId: 'FRAN-MUR-06',
        cityId: 'muriae-mg',
        cityName: 'Muriaé',
        uf: 'MG',
        franchiseeName: 'Muriaé Mob Participações',
        franchiseeCnpj: '89.012.345/0001-67',
        contractStartDate: Date.now() - 60 * 86400 * 1000,
        contractEndDate: Date.now() + 365 * 5 * 86400 * 1000,
        activeDriversCount: 48,
        activePassengersCount: 3900,
        monthlyTripsVolume: 9800,
        status: 'RAMP_UP',
        exclusiveTerritoryRadiusKm: 20.0
      }
    ];

    defaultUnits.forEach(u => this.registerFranchise(u));
  }

  public registerFranchise(unit: FranchiseUnit): void {
    this.franchises.set(unit.franchiseId, unit);
  }

  public getFranchise(franchiseId: string): FranchiseUnit | undefined {
    return this.franchises.get(franchiseId);
  }

  public getFranchiseByCity(cityId: string): FranchiseUnit | undefined {
    return Array.from(this.franchises.values()).find(f => f.cityId === cityId);
  }

  public getAllFranchises(): FranchiseUnit[] {
    return Array.from(this.franchises.values());
  }
}

export const franchiseEngine = new FranchiseEngine();
