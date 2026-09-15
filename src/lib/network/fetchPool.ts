/**
 * ==============================================================================
 * 🌐 PARTIU NETWORK RESILIENCE — BOUNDED FETCH POOL
 * ==============================================================================
 * Pool de concorrência limitada para requisições externas e telemetria.
 *
 * Previne esgotamento de conexões TLS e 'socket starvation' no navegador mobile
 * e em Edge Functions quando múltiplas chamadas concorrentes são disparadas.
 * ==============================================================================
 */

export interface BoundedPool {
  run<T>(task: () => Promise<T>): Promise<T>;
  reset(): void;
  activeCount(): number;
  waitingCount(): number;
}

export function createBoundedPool(limit = 6): BoundedPool {
  if (limit < 1) throw new Error("O limite do pool deve ser de no mínimo 1.");
  let active = 0;
  const waiting: (() => void)[] = [];

  const release = () => {
    active--;
    const next = waiting.shift();
    if (next) next();
  };

  function run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = () => {
        active++;
        task()
          .then(resolve)
          .catch(reject)
          .finally(release);
      };

      if (active < limit) {
        start();
      } else {
        waiting.push(start);
      }
    });
  }

  function reset(): void {
    waiting.length = 0;
    active = 0;
  }

  return {
    run,
    reset,
    activeCount: () => active,
    waitingCount: () => waiting.length,
  };
}

/** Instância padrão global para requisições geoespaciais e de mapas */
export const defaultGeoPool = createBoundedPool(8);
