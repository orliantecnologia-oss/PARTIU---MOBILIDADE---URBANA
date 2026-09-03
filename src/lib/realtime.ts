/**
 * Módulo de Telemetria em Tempo Real & Feedback de Áudio (ByteByteGo Pattern)
 */

import { supabase } from "@/integrations/supabase/client";

export type CoordenadaTelemetria = {
  vanId: string;
  latitude: number;
  longitude: number;
  velocidadeKmH: number;
  rumoGraus: number;
  starlinkConectado: boolean;
  ultimaAtualizacao: number;
};

/**
 * Emite sinal sonoro suave (bip de confirmação) usando a Web Audio API nativa
 */
export function tocarBipEmbarque(tipo: "sucesso" | "alerta" | "erro" = "sucesso") {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (tipo === "sucesso") {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else if (tipo === "alerta") {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (err) {
    console.warn("Áudio não suportado ou bloqueado pelo navegador:", err);
  }
}

/**
 * Inscreve no canal de telemetria da van para receber posições em tempo real
 */
export function escutarTelemetriaVan(
  vanId: string,
  onPosicao: (pos: CoordenadaTelemetria) => void,
) {
  const canal = supabase.channel(`van_telemetria_${vanId}`, {
    config: { broadcast: { self: true } },
  });

  canal
    .on("broadcast", { event: "posicao_gps" }, (payload) => {
      if (payload && payload["payload"]) {
        onPosicao(payload["payload"] as CoordenadaTelemetria);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(canal);
  };
}
