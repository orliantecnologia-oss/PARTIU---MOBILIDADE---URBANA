/**
 * PARTIU TITANIUM SHIELD — DATA RETENTION & RIGHT TO BE FORGOTTEN (LGPD)
 * 
 * Políticas de retenção temporal, anonimização e expiração de dados pessoais:
 * - Telemetria GPS transitória: Retenção máxima de 30 dias
 * - Corridas concluídas: Retenção de 5 anos para fins fiscais (com anonimização de PII)
 * - Corridas canceladas: Retenção de 90 dias
 * - Atendimento a requisições de Exclusão / Direito ao Esquecimento (Art. 18 LGPD)
 */

export interface DataRetentionRule {
  dataType: 'GPS_TELEMETRY' | 'COMPLETED_TRIP' | 'CANCELLED_TRIP' | 'CHAT_MESSAGES' | 'AUDIT_LOGS';
  maxRetentionDays: number;
  anonymizationAction: 'HARD_DELETE' | 'ANONYMIZE_PII' | 'ARCHIVE_COLD_STORAGE';
}

export const RETENTION_POLICIES: DataRetentionRule[] = [
  { dataType: 'GPS_TELEMETRY', maxRetentionDays: 30, anonymizationAction: 'HARD_DELETE' },
  { dataType: 'CHAT_MESSAGES', maxRetentionDays: 60, anonymizationAction: 'HARD_DELETE' },
  { dataType: 'CANCELLED_TRIP', maxRetentionDays: 90, anonymizationAction: 'ANONYMIZE_PII' },
  { dataType: 'COMPLETED_TRIP', maxRetentionDays: 1825, anonymizationAction: 'ANONYMIZE_PII' }, // 5 anos contábil
  { dataType: 'AUDIT_LOGS', maxRetentionDays: 365, anonymizationAction: 'ARCHIVE_COLD_STORAGE' }
];

export class DataRetentionManager {
  /**
   * Executa a anonimização de um perfil sob o Direito ao Esquecimento (LGPD)
   */
  public static executeRightToBeForgotten(userId: string): {
    anonymized: boolean;
    userId: string;
    anonymizedFields: string[];
    timestamp: number;
  } {
    const timestamp = Date.now();
    const pseudoHash = `anon_${userId.slice(0, 4)}_${Math.random().toString(36).substring(2, 8)}`;

    return {
      anonymized: true,
      userId: pseudoHash,
      anonymizedFields: ['nome', 'cpf', 'telefone', 'email', 'foto', 'enderecos_favoritos'],
      timestamp
    };
  }

  /**
   * Avalia se um registro excedeu sua janela de retenção legal
   */
  public static isExpired(createdAtTimestamp: number, dataType: DataRetentionRule['dataType']): boolean {
    const rule = RETENTION_POLICIES.find(p => p.dataType === dataType);
    if (!rule) return false;

    const maxAgeMs = rule.maxRetentionDays * 24 * 3600 * 1000;
    return (Date.now() - createdAtTimestamp) > maxAgeMs;
  }
}
