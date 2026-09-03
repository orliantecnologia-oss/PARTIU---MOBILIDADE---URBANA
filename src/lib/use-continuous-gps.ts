import { useState, useEffect, useCallback } from "react";
import {
  continuousGpsEngine,
  type EstadoContinuousGps,
  type ConfigContinuousGps,
  type TelemetriaGpsPonto,
} from "./continuous-gps-engine";

export function useContinuousGps() {
  const [estado, setEstado] = useState<EstadoContinuousGps>(() =>
    continuousGpsEngine.getEstado(),
  );

  useEffect(() => {
    // Sincroniza estado inicial
    setEstado(continuousGpsEngine.getEstado());
  }, []);

  const iniciar = useCallback(
    async (
      config: Omit<ConfigContinuousGps, "onEstadoMudou"> & {
        onPonto?: (ponto: TelemetriaGpsPonto) => Promise<boolean> | boolean | void;
      },
    ) => {
      return continuousGpsEngine.iniciar({
        ...config,
        onPontoTransmitido: config.onPonto,
        onEstadoMudou: (novoEstado) => {
          setEstado(novoEstado);
        },
      });
    },
    [],
  );

  const parar = useCallback(() => {
    continuousGpsEngine.parar();
    setEstado(continuousGpsEngine.getEstado());
  }, []);

  const toggleWakeLock = useCallback(async () => {
    if (estado.wakeLockAtivo) {
      // Deixar inativo
      setEstado((prev) => ({ ...prev, wakeLockAtivo: false }));
    } else {
      await continuousGpsEngine.solicitarWakeLock();
      setEstado(continuousGpsEngine.getEstado());
    }
  }, [estado.wakeLockAtivo]);

  return {
    estado,
    iniciar,
    parar,
    toggleWakeLock,
    isAtivo: estado.ativo,
    isWakeLockAtivo: estado.wakeLockAtivo,
    ultimoPonto: estado.ultimoPonto,
    velocidadeAtualKmh: estado.ultimoPonto?.velocidadeKmh || 0,
    precisaoMetros: estado.ultimoPonto?.precisaoMetros || 0,
    pontosTransmitidos: estado.pontosTransmitidos,
    pontosEmBufferOffline: estado.pontosEmBufferOffline,
    statusConexao: estado.statusConexao,
    satelitesAtivos: estado.satelitesAtivos,
  };
}
