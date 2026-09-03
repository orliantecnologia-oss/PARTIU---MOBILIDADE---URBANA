/**
 * ==============================================================================
 * 🛰️ UNIVANS SMART TREVO ARRIVAL ENGINE
 * Motor de Predição e Alertas Inteligentes de Chegada nos Trevos Rodoviários
 * ==============================================================================
 */

export interface AlertaTrevoPreditivo {
  trevoNome: string;
  distanciaKm: number;
  minutosRestantes: number;
  status: "longe" | "aproximando" | "no_ponto" | "passou";
  mensagemInstrucao: string;
  badgeCor: string;
}

export function calcularDistanciaKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export function calcularAlertaTrevo(
  vanLat: number,
  vanLng: number,
  trevoLat: number,
  trevoLng: number,
  trevoNome: string,
  velocidadeKmH: number = 70,
): AlertaTrevoPreditivo {
  const distanciaKm = calcularDistanciaKm(vanLat, vanLng, trevoLat, trevoLng);

  // Estima minutos considerando velocidade e desaceleração do trevo
  const velEfetiva = Math.max(velocidadeKmH, 40);
  const minutosRestantes = Math.max(1, Math.round((distanciaKm / velEfetiva) * 60));

  if (distanciaKm <= 0.3) {
    return {
      trevoNome,
      distanciaKm,
      minutosRestantes: 0,
      status: "no_ponto",
      mensagemInstrucao: "Van encostando no trevo agora! Tenha o QR Code em mãos.",
      badgeCor: "bg-emerald-600 text-white animate-pulse",
    };
  }

  if (minutosRestantes <= 8) {
    return {
      trevoNome,
      distanciaKm,
      minutosRestantes,
      status: "aproximando",
      mensagemInstrucao: `Van a ${minutosRestantes} min do ${trevoNome}. Dirija-se ao ponto de embarque.`,
      badgeCor: "bg-amber-500 text-slate-950 font-black animate-pulse",
    };
  }

  if (minutosRestantes <= 20) {
    return {
      trevoNome,
      distanciaKm,
      minutosRestantes,
      status: "aproximando",
      mensagemInstrucao: `Van em trânsito (~ ${minutosRestantes} min). Prepare-se para sair de casa.`,
      badgeCor: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    };
  }

  return {
    trevoNome,
    distanciaKm,
    minutosRestantes,
    status: "longe",
    mensagemInstrucao: `Van em rota normal (${distanciaKm} km de distância • Chegada prevista em ~${minutosRestantes} min).`,
    badgeCor: "bg-slate-100 text-slate-600",
  };
}
