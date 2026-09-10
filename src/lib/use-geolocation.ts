import { useState, useEffect, useCallback } from "react";
import { silentCatchWarn } from "@/lib/structured-logger";


export interface CoordenadasGPS {
  latitude: number;
  longitude: number;
  precisaoMetros?: number;
}

export interface LocalizacaoDetectada {
  cidade: string;
  pontoEmbarque: string;
  referencia: string;
  distanciaKm: number;
  coords: [number, number];
}

// Base de coordenadas conhecidas das cidades e trevos de Alagoas
export const PONTOS_GEOGRAFICOS_ALAGOAS: LocalizacaoDetectada[] = [
  {
    cidade: "Maceió",
    pontoEmbarque: "Maceió (Trevo do Tabuleiro)",
    referencia: "Avenida Fernandes Lima / Makro",
    distanciaKm: 0,
    coords: [-9.5786, -35.7562],
  },
  {
    cidade: "Maceió",
    pontoEmbarque: "Maceió (Terminal Rodoviário / Feitosa)",
    referencia: "Terminal João Paulo II",
    distanciaKm: 0,
    coords: [-9.6459, -35.7255],
  },
  {
    cidade: "Igreja Nova",
    pontoEmbarque: "Igreja Nova (Terminal Central)",
    referencia: "Praça Agapito Soares",
    distanciaKm: 0,
    coords: [-10.1279, -36.6565],
  },
  {
    cidade: "Arapiraca",
    pontoEmbarque: "Arapiraca (Terminal Urbano)",
    referencia: "Centro de Arapiraca",
    distanciaKm: 0,
    coords: [-9.7547, -36.6614],
  },
  {
    cidade: "Coruripe",
    pontoEmbarque: "Coruripe (Praça Central)",
    referencia: "AL-349 • Centro",
    distanciaKm: 0,
    coords: [-10.1256, -36.1756],
  },
  {
    cidade: "Penedo",
    pontoEmbarque: "Penedo (Orla Histórica)",
    referencia: "Terminal das Balsas / São Francisco",
    distanciaKm: 0,
    coords: [-10.2906, -36.5811],
  },
  {
    cidade: "Barra de São Miguel",
    pontoEmbarque: "Barra de São Miguel (Trevo)",
    referencia: "AL-101 Sul / Posto Shell",
    distanciaKm: 0,
    coords: [-9.8294, -35.9069],
  },
  {
    cidade: "Marechal Deodoro",
    pontoEmbarque: "Marechal Deodoro (Trevo do Francês)",
    referencia: "Posto Shell da Praia do Francês",
    distanciaKm: 0,
    coords: [-9.7125, -35.8972],
  },
  {
    cidade: "São Miguel dos Campos",
    pontoEmbarque: "São Miguel dos Campos (Trevo BR-101)",
    referencia: "Posto Pichilau",
    distanciaKm: 0,
    coords: [-9.7811, -36.0911],
  },
  {
    cidade: "Tapera / São José da Tapera",
    pontoEmbarque: "São José da Tapera (Centro)",
    referencia: "Praça Central",
    distanciaKm: 0,
    coords: [-9.5583, -37.3811],
  },
];

export function calcularDistanciaKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function encontrarPontoMaisProximo(lat: number, lng: number): LocalizacaoDetectada | null {
  let maisProximo: LocalizacaoDetectada | null = null;
  let menorDistancia = Infinity;

  for (const ponto of PONTOS_GEOGRAFICOS_ALAGOAS) {
    const dist = calcularDistanciaKm(lat, lng, ponto.coords[0], ponto.coords[1]);
    if (dist < menorDistancia) {
      menorDistancia = dist;
      maisProximo = { ...ponto, distanciaKm: dist };
    }
  }

  // Só associa a ponto de referência pré-definido se o usuário estiver de fato no raio de 30 km
  if (menorDistancia > 30) {
    return null;
  }

  return maisProximo;
}

export function useGeolocation() {
  const [coords, setCoords] = useState<CoordenadasGPS | null>(null);
  const [localDetectado, setLocalDetectado] = useState<LocalizacaoDetectada | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [permissaoConcedida, setPermissaoConcedida] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const solicitarLocalizacao = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErro("Geolocalização não suportada neste dispositivo.");
      setLocalDetectado(null);
      return;
    }

    setCarregando(true);
    setErro(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCoords({ latitude, longitude, precisaoMetros: accuracy });
        setPermissaoConcedida(true);
        try {
          localStorage.setItem("partiu_gps_permitido", "true");
        } catch (err) { silentCatchWarn("use-geolocation", err); }

        const ponto = encontrarPontoMaisProximo(latitude, longitude);
        setLocalDetectado(ponto);
        setCarregando(false);
      },
      (err) => {
        console.warn("[use-geolocation] GPS físico indisponível ou negado:", err.message);
        setCarregando(false);
        setPermissaoConcedida(false);
        setErro(err.message || "GPS indisponível");
        setLocalDetectado(null);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 },
    );
  }, []);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem("partiu_gps_permitido") || localStorage.getItem("univans_gps_permitido");
      if (salvo === "true") {
        setPermissaoConcedida(true);
        solicitarLocalizacao();
      }
    } catch (err) { silentCatchWarn("use-geolocation", err); }
  }, [solicitarLocalizacao]);

  return {
    coords,
    localDetectado,
    carregando,
    permissaoConcedida,
    erro,
    solicitarLocalizacao,
  };
}
