/**
 * ==============================================================================
 * 🗺️ PARTIU REALTIME ETA & ROUTE NAVIGATION ENGINE (v1.0)
 * ==============================================================================
 * Serviço de cálculo dinâmico de tempo estimado de chegada (ETA), distância
 * geodésica e horário previsto de desembarque.
 *
 * Pronto para conexões com APIs reais (Google Directions, Mapbox Matrix, OSRM)
 * com fallback geodésico calibrado para mobilidade urbana regional.
 * ==============================================================================
 */

export interface LocationCoordinate {
  lng: number;
  lat: number;
}

export interface CalculatedEta {
  distanciaMetros: number;
  distanciaKm: number;
  distanciaFormatada: string;
  duracaoSegundos: number;
  duracaoMinutos: number;
  duracaoFormatada: string;
  horarioEstimadoChegada: string; // Ex: "11:45"
  textoResumido: string;          // Ex: "~3 min • 1,2 km"
  badgeTexto: string;             // Ex: "Chega às 11:45 (~3 min)"
}

export type ModalidadeVelocidade =
  | "MOTO"
  | "CARRO"
  | "EXECUTIVO"
  | "FLASH"
  | "ENTREGA"
  | "TURISMO"
  | "VAN";

/**
 * Constantes de calibração urbana para cidades regionais (ex: Itaperuna, RJ)
 */
const VELOCIDADE_MEDIA_KMH: Record<ModalidadeVelocidade, number> = {
  MOTO: 30,
  FLASH: 30,
  CARRO: 22,
  EXECUTIVO: 24,
  ENTREGA: 22,
  TURISMO: 20,
  VAN: 20,
};

// Fator de curvatura de malha urbana sobre distância em linha reta (Manhattan Factor)
const FATOR_MALHA_URBANA = 1.35;

/**
 * Fórmula de Haversine para cálculo da distância geodésica em metros
 */
export function calcularDistanciaHaversine(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const R = 6371000; // Raio médio da Terra em metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanciaLinhaReta = R * c;

  // Aplica o fator de desvio de ruas urbanas
  return Math.round(distanciaLinhaReta * FATOR_MALHA_URBANA);
}

/**
 * Formata um horário adicionando minutos a partir do momento atual
 */
export function formatarHorarioChegada(minutosAdicionais: number): string {
  const agora = new Date();
  const chegada = new Date(agora.getTime() + minutosAdicionais * 60 * 1000);
  const horas = String(chegada.getHours()).padStart(2, "0");
  const minutos = String(chegada.getMinutes()).padStart(2, "0");
  return `${horas}:${minutos}`;
}

import { routingService } from "@/services/RoutingService";
import { routingCache } from "@/services/RoutingCache";

/**
 * Calcula o ETA dinâmico entre duas coordenadas com base na malha viária real
 */
export function calcularEtaDinamico(
  origem: [number, number],
  destino: [number, number],
  modalidade: ModalidadeVelocidade = "CARRO"
): CalculatedEta {
  // 1. Prioriza rota real com trânsito ao vivo do cache de direções (Mapbox/Google Directions)
  const cachedRoute = routingCache.get(origem, destino);
  const route =
    cachedRoute ||
    routingService.generateCalibratedUrbanRoute(origem, destino, {
      vehicleType: modalidade === "MOTO" ? "motorcycle" : "car",
      trafficAware: true,
    });

  const distanciaMetros = route.distanceMeters;
  const distanciaKm = route.distanceKm;
  const duracaoSegundos = route.trafficDurationSeconds || route.durationSeconds;
  const duracaoMinutos = route.trafficDurationMinutes || route.durationMinutes;

  const distanciaFormatada =
    distanciaMetros < 1000
      ? `${distanciaMetros} m`
      : `${distanciaKm.toFixed(1).replace(".", ",")} km`;

  const duracaoFormatada = `~${duracaoMinutos} min`;
  const horarioEstimadoChegada = formatarHorarioChegada(duracaoMinutos);

  const textoResumido = `${duracaoFormatada} • ${distanciaFormatada}`;
  const badgeTexto = `Chega às ${horarioEstimadoChegada} (${duracaoFormatada})`;

  return {
    distanciaMetros,
    distanciaKm,
    distanciaFormatada,
    duracaoSegundos,
    duracaoMinutos,
    duracaoFormatada,
    horarioEstimadoChegada,
    textoResumido,
    badgeTexto,
  };
}

/**
 * Interface de Provedor de Navegação Externa (Pronta para Google Maps / Mapbox / OSRM)
 */
export interface RouteNavigationProvider {
  obterRotaReal(
    origem: [number, number],
    destino: [number, number],
    modalidade: ModalidadeVelocidade
  ): Promise<CalculatedEta>;
}

/**
 * Provedor Híbrido Conectado ao RoutingService Enterprise Multi-Provedor
 */
export class HybridNavigationService implements RouteNavigationProvider {
  async obterRotaReal(
    origem: [number, number],
    destino: [number, number],
    modalidade: ModalidadeVelocidade = "CARRO"
  ): Promise<CalculatedEta> {
    try {
      const route = await routingService.getRoute(origem, destino, {
        vehicleType: modalidade === "MOTO" ? "motorcycle" : "car",
        trafficAware: true,
      });

      const distMetros = route.distanceMeters;
      const distKm = route.distanceKm;
      const durMin = route.trafficDurationMinutes || route.durationMinutes;
      const horario = formatarHorarioChegada(durMin);

      const distFmt =
        distMetros < 1000
          ? `${distMetros} m`
          : `${distKm.toFixed(1).replace(".", ",")} km`;

      return {
        distanciaMetros: distMetros,
        distanciaKm: distKm,
        distanciaFormatada: distFmt,
        duracaoSegundos: route.durationSeconds,
        duracaoMinutos: durMin,
        duracaoFormatada: `~${durMin} min`,
        horarioEstimadoChegada: horario,
        textoResumido: `~${durMin} min • ${distFmt}`,
        badgeTexto: `Chega às ${horario} (~${durMin} min)`,
      };
    } catch {
      return calcularEtaDinamico(origem, destino, modalidade);
    }
  }
}

export const navigationService = new HybridNavigationService();
