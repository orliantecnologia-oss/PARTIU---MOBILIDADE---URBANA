/**
 * ==============================================================================
 * 🛡️ PARTIU MOBILITY ECOSYSTEM — ENVIRONMENT & STRICT PRODUCTION ENGINE
 * ==============================================================================
 * Centralizador de políticas de integridade de dados e ambientes:
 * - DEV: Permite inspeção e logs detalhados
 * - STAGING: Ambiente de homologação
 * - PRODUCTION: MODO OPERAÇÃO REAL OBRIGATÓRIO
 *
 * REGRAS CRÍTICAS DE PRODUÇÃO (PADRÃO UBER / 99):
 * 1. PROIBIDO o uso de SEED_DRIVERS ou veículos fantasma.
 * 2. PROIBIDO o uso de coordenadas estáticas hardcoded como localização de usuário.
 * 3. PROIBIDO o uso de movimentação simulada por setInterval/setTimeout.
 * 4. PROIBIDO o uso de geolocalização por IP (ipwho.is, freeipapi) como posição exata.
 * 5. PROIBIDO o cálculo de ETA sintético/fictício não ancorado no trânsito real.
 * ==============================================================================
 */

export type AppEnvironment = "DEV" | "STAGING" | "PRODUCTION";

export class EnvironmentEngine {
  private static instance: EnvironmentEngine;

  private constructor() {}

  public static getInstance(): EnvironmentEngine {
    if (!EnvironmentEngine.instance) {
      EnvironmentEngine.instance = new EnvironmentEngine();
    }
    return EnvironmentEngine.instance;
  }

  /**
   * Resolve o ambiente atual de execução
   */
  public getEnvironment(): AppEnvironment {
    const viteEnv = typeof import.meta !== "undefined" ? import.meta.env : undefined;
    const processEnv = typeof process !== "undefined" ? process.env : undefined;

    const explicit =
      viteEnv?.["VITE_APP_ENV"] ||
      viteEnv?.["APP_ENV"] ||
      processEnv?.["VITE_APP_ENV"] ||
      processEnv?.["APP_ENV"];

    if (explicit) {
      const upper = String(explicit).toUpperCase().trim();
      if (upper === "PRODUCTION" || upper === "PROD") return "PRODUCTION";
      if (upper === "STAGING" || upper === "STAGE") return "STAGING";
      if (upper === "DEV" || upper === "DEVELOPMENT") return "DEV";
    }

    if (viteEnv?.PROD || processEnv?.NODE_ENV === "production") {
      return "PRODUCTION";
    }

    return "DEV";
  }

  public isProduction(): boolean {
    return this.getEnvironment() === "PRODUCTION";
  }

  public isStaging(): boolean {
    return this.getEnvironment() === "STAGING";
  }

  public isDev(): boolean {
    return this.getEnvironment() === "DEV";
  }

  /**
   * Retorna se mocks, seeds ou telemetria falsa são estritamente proibidos
   */
  public isMockForbidden(): boolean {
    // Em produção ou staging, mocks são 100% proibidos
    return this.isProduction() || this.isStaging();
  }

  /**
   * Emite erro crítico ou lança exceção caso algum componente tente injetar mocks
   */
  public assertRealData(component: string, detail: string): void {
    if (this.isMockForbidden()) {
      const msg = `🚨 [VIOLAÇÃO CRÍTICA DE DADOS REAIS] Componente '${component}' tentou injetar dados simulados ou mockados: ${detail}. O ecossistema está em MODO DE OPERAÇÃO REAL.`;
      console.error(msg);
      throw new Error(msg);
    } else {
      console.warn(`⚠️ [MOCK EM DEV] Componente '${component}': ${detail}`);
    }
  }
}

export const environmentEngine = EnvironmentEngine.getInstance();
export const isProductionEnvironment = () => environmentEngine.isProduction();
export const isMockForbidden = () => environmentEngine.isMockForbidden();
export const assertRealData = (component: string, detail: string) =>
  environmentEngine.assertRealData(component, detail);
