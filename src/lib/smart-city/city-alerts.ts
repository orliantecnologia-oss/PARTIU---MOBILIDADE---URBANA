/**
 * CITY ALERTS ENGINE
 * 
 * Central de Alertas Inteligentes da Cidade:
 * - Alagamentos e riscos meteorológicos
 * - Acidentes e bloqueios viários
 * - Obras e interdições de trânsito
 * - Superlotação em terminais
 * - Ações corretivas automatizadas de despacho e desvio
 */

export type AlertSeverity = 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';

export type AlertCategory =
  | 'ALAGAMENTO_CLIMATICO'
  | 'ACIDENTE_VIARIO'
  | 'INTERDICAO_OBRAS'
  | 'AGLOMERACAO_EVENTO'
  | 'SUPERLOTACAO_TERMINAL'
  | 'INTERRUPCAO_LINHA';

export interface CityAlert {
  alertId: string;
  cityId: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  affectedCorridors: string[];
  affectedDistricts: string[];
  impactRadiusMeters: number;
  recommendedAction: string;
  reRouteSuggested: boolean;
  active: boolean;
  createdAt: number;
  expiresAt: number;
}

export class CityAlertsEngine {
  private alerts: Map<string, CityAlert> = new Map();

  constructor() {
    this.seedDefaultAlerts();
  }

  private seedDefaultAlerts(): void {
    const defaultAlerts: CityAlert[] = [
      {
        alertId: 'ALT-ITAP-01',
        cityId: 'itaperuna-rj',
        category: 'INTERDICAO_OBRAS',
        severity: 'MEDIO',
        title: 'Obras de Drenagem na Rua Dez de Maio',
        description: 'Tráfego em meia pista no acesso à Praça Nilo Peçanha. Desvio recomendado via Av. Presidente Dutra.',
        affectedCorridors: ['Rua Dez de Maio'],
        affectedDistricts: ['Centro'],
        impactRadiusMeters: 400,
        recommendedAction: 'Desvio para veículos leves e vans municipais via Rua Buarque de Nazareth.',
        reRouteSuggested: true,
        active: true,
        createdAt: Date.now() - 3600000,
        expiresAt: Date.now() + 86400000
      },
      {
        alertId: 'ALT-ITAP-02',
        cityId: 'itaperuna-rj',
        category: 'AGLOMERACAO_EVENTO',
        severity: 'ALTO',
        title: 'Horário de Saída Universitária (UNIG / Redentor)',
        description: 'Pico de demanda por transporte e tráfego intenso na BR-356 sentido Centro entre 22h00 e 22h45.',
        affectedCorridors: ['BR-356', 'Av. Presidente Franklin Roosevelt'],
        affectedDistricts: ['Presidente Costa e Silva', 'Cidade Nova'],
        impactRadiusMeters: 1200,
        recommendedAction: 'Injetar 4 vans adicionais e ativar surge preventivo de 1.25x.',
        reRouteSuggested: false,
        active: true,
        createdAt: Date.now() - 1800000,
        expiresAt: Date.now() + 7200000
      }
    ];

    defaultAlerts.forEach(a => this.alerts.set(a.alertId, a));
  }

  public getActiveAlertsByCity(cityId: string): CityAlert[] {
    const now = Date.now();
    return Array.from(this.alerts.values()).filter(
      a => a.cityId === cityId && a.active && a.expiresAt > now
    );
  }

  public registerAlert(alert: CityAlert): void {
    this.alerts.set(alert.alertId, alert);
  }

  public dismissAlert(alertId: string): boolean {
    const a = this.alerts.get(alertId);
    if (!a) return false;
    a.active = false;
    return true;
  }
}

export const cityAlertsEngine = new CityAlertsEngine();
