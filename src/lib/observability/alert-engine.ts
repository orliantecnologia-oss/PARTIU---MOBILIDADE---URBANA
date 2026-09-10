/**
 * PARTIU TITANIUM SHIELD — SLA ALERT ENGINE
 * 
 * Emissão automática de alertas operacionais quando métricas violarem SLAs:
 * - Latência de despacho > 200ms
 * - Taxa de falha de PIX > 0.5%
 * - Fila de DLQ com mais de 10 eventos
 * - Quebra de integridade no Ledger
 */

export interface SystemAlert {
  alertId: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: number;
  metricTrigger?: string | undefined;
  valueRecorded?: number | undefined;
  threshold?: number | undefined;
}

export class AlertEngine {
  private static instance: AlertEngine;
  private alerts: SystemAlert[] = [];

  private constructor() {}

  public static getInstance(): AlertEngine {
    if (!AlertEngine.instance) {
      AlertEngine.instance = new AlertEngine();
    }
    return AlertEngine.instance;
  }

  public triggerAlert(alert: Omit<SystemAlert, 'alertId' | 'timestamp'>): SystemAlert {
    const timestamp = Date.now();
    const alertId = `ALT-${timestamp}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const record: SystemAlert = {
      ...alert,
      alertId,
      timestamp
    };

    this.alerts.push(record);
    if (this.alerts.length > 500) {
      this.alerts.shift();
    }

    if (record.severity === 'CRITICAL') {
      console.error(`🚨 [CRITICAL ALERT] ${record.title}: ${record.message}`);
    } else {
      console.warn(`⚠️ [WARNING ALERT] ${record.title}: ${record.message}`);
    }

    return record;
  }

  public getActiveAlerts(limit = 20): SystemAlert[] {
    return this.alerts.slice(-limit);
  }
}

export const alertEngine = AlertEngine.getInstance();
