/**
 * ==============================================================================
 * 🔍 PARTIU — GEOCODING SERVICE (AUTOCOMPLETE & PLACE SEARCH)
 * ==============================================================================
 * Motor de busca textual, autocompletar e resolução de endereços.
 *
 * Recursos:
 * - Autocomplete instantâneo e resiliente.
 * - Busca de logradouro, número, bairros, estabelecimentos e CEPs.
 * - Otimização com proximity prioritária para a região de Itaperuna - RJ.
 * - Catálogo offline curado para carregamento imediato mesmo sem internet.
 * ==============================================================================
 */

import { MapboxConfig } from "@/config/MapboxConfig";

export interface GeocodedPlace {
  id: string;
  label: string;
  sublabel: string;
  endereco: string;
  coords: [number, number]; // [lng, lat]
  tipo?: "rua" | "ponto_interesse" | "bairro" | "hospital" | "faculdade" | "transporte" | "cep";
  relevance?: number;
}

export interface GeocodingOptions {
  proximity?: [number, number];
  country?: string;
  types?: string[];
  limit?: number;
}

// Catálogo local curado com ruas e POIs estratégicos de Itaperuna - RJ
export const LUGARES_CURADOS_ITAPERUNA: GeocodedPlace[] = [
  {
    id: "itap-10-maio",
    label: "Rua Dez de Maio",
    sublabel: "Centro — Itaperuna, RJ",
    endereco: "Rua Dez de Maio, 188 - Centro, Itaperuna - RJ",
    coords: [-41.886, -21.2065],
    tipo: "rua",
  },
  {
    id: "itap-cardoso-moreira",
    label: "Avenida Cardoso Moreira",
    sublabel: "Centro (Avenida Principal) — Itaperuna, RJ",
    endereco: "Av. Cardoso Moreira, 310 - Centro, Itaperuna - RJ",
    coords: [-41.8835, -21.208],
    tipo: "rua",
  },
  {
    id: "itap-pres-dutra",
    label: "Avenida Presidente Dutra",
    sublabel: "Cidade Nova — Itaperuna, RJ",
    endereco: "Av. Presidente Dutra, 450 - Cidade Nova, Itaperuna - RJ",
    coords: [-41.881, -21.2095],
    tipo: "rua",
  },
  {
    id: "itap-vinhosa",
    label: "Avenida Vinhosa",
    sublabel: "Vinhosa — Itaperuna, RJ",
    endereco: "Av. Vinhosa, 780 - Vinhosa, Itaperuna - RJ",
    coords: [-41.891, -21.2025],
    tipo: "rua",
  },
  {
    id: "itap-buarque-nazareth",
    label: "Rua Buarque de Nazareth",
    sublabel: "Centro — Itaperuna, RJ",
    endereco: "Rua Buarque de Nazareth, 120 - Centro, Itaperuna - RJ",
    coords: [-41.889, -21.2045],
    tipo: "rua",
  },
  {
    id: "itap-francisco-sa",
    label: "Rua Francisco Sá",
    sublabel: "Aeroporto — Itaperuna, RJ",
    endereco: "Rua Francisco Sá, 55 - Aeroporto, Itaperuna - RJ",
    coords: [-41.8965, -21.198],
    tipo: "rua",
  },
  {
    id: "itap-hospital-sao-jose-avai",
    label: "Hospital São José do Avaí",
    sublabel: "Centro — Hospital e Maternidade",
    endereco: "Rua Cel. Luís Ferraz, 397 - Centro, Itaperuna - RJ",
    coords: [-41.887, -21.204],
    tipo: "hospital",
  },
  {
    id: "itap-unig",
    label: "UNIG — Campus V",
    sublabel: "BR-356, Km 02 — Faculdade e Polo Universitário",
    endereco: "BR-356, Km 02 - Cidade Nova, Itaperuna - RJ",
    coords: [-41.879, -21.212],
    tipo: "faculdade",
  },
  {
    id: "itap-redentor",
    label: "UniRedentor / Afya",
    sublabel: "Presidente Dutra — Polo de Ensino Superior",
    endereco: "Av. Pres. Dutra, s/n - Cidade Nova, Itaperuna - RJ",
    coords: [-41.876, -21.214],
    tipo: "faculdade",
  },
  {
    id: "itap-rodoviaria",
    label: "Terminal Rodoviário Papa João Paulo II",
    sublabel: "Cidade Nova — Rodoviária Interestadual",
    endereco: "Av. Pres. Dutra, 800 - Cidade Nova, Itaperuna - RJ",
    coords: [-41.878, -21.211],
    tipo: "transporte",
  },
  {
    id: "itap-centro-cep",
    label: "CEP 28300-000",
    sublabel: "Centro — Itaperuna, RJ",
    endereco: "Centro, Itaperuna - RJ, 28300-000",
    coords: [-41.888, -21.205],
    tipo: "cep",
  },
];

export class GeocodingService {
  private static instance: GeocodingService;

  private constructor() {}

  public static getInstance(): GeocodingService {
    if (!GeocodingService.instance) {
      GeocodingService.instance = new GeocodingService();
    }
    return GeocodingService.instance;
  }

  /**
   * Busca lugares com autocomplete textual e priorização geográfica
   */
  public async search(
    query: string,
    options: GeocodingOptions = {}
  ): Promise<GeocodedPlace[]> {
    const termo = (query || "").trim();
    if (!termo || termo.length < 2) {
      return [];
    }

    const proximity = options.proximity || MapboxConfig.DEFAULT_CENTER;
    const country = options.country || "BR";
    const limit = options.limit || 7;

    const termoNormalizado = termo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 1. Lugares curados prioritários da região
    const locaisCurados = LUGARES_CURADOS_ITAPERUNA.filter((l) => {
      const labelNorm = l.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const endNorm = l.endereco.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return labelNorm.includes(termoNormalizado) || endNorm.includes(termoNormalizado);
    });

    // 2. Tenta consulta ao Mapbox Geocoding API v5
    let remotePlaces: GeocodedPlace[] = [];
    try {
      const token = MapboxConfig.getAccessToken();
      const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(termo)}.json`;
      const params = new URLSearchParams({
        access_token: token,
        country,
        proximity: `${proximity[0]},${proximity[1]}`,
        types: options.types ? options.types.join(",") : "address,poi,neighborhood,postcode",
        language: "pt",
        limit: String(limit),
      });

      const response = await fetch(`${endpoint}?${params.toString()}`, { method: "GET" });
      if (response.ok) {
        const data = await response.json();
        if (data.features && Array.isArray(data.features)) {
          remotePlaces = data.features.map((feat: any) => {
            const context = feat.context || [];
            const neighborhood = context.find((c: any) => c.id.startsWith("neighborhood"))?.text;
            const city = context.find((c: any) => c.id.startsWith("place"))?.text || "Itaperuna";
            const state = context.find((c: any) => c.id.startsWith("region"))?.text || "RJ";

            const sublabel = neighborhood ? `${neighborhood}, ${city} - ${state}` : `${city} - ${state}`;

            let tipo: GeocodedPlace["tipo"] = "rua";
            if (feat.place_type?.includes("poi")) tipo = "ponto_interesse";
            else if (feat.place_type?.includes("neighborhood")) tipo = "bairro";
            else if (feat.place_type?.includes("postcode")) tipo = "cep";

            return {
              id: feat.id,
              label: feat.text || feat.place_name.split(",")[0],
              sublabel,
              endereco: feat.place_name,
              coords: feat.center as [number, number],
              tipo,
              relevance: feat.relevance,
            };
          });
        }
      }
    } catch (_) {}

    // Mescla priorizando locais curados que estão exatamente na cidade
    const combined = [...locaisCurados, ...remotePlaces];
    const unique = new Map<string, GeocodedPlace>();
    for (const place of combined) {
      const key = `${place.coords[0].toFixed(3)},${place.coords[1].toFixed(3)}`;
      if (!unique.has(key)) {
        unique.set(key, place);
      }
    }

    return Array.from(unique.values()).slice(0, limit);
  }

  /**
   * Busca por CEP específico
   */
  public async searchCep(cep: string): Promise<GeocodedPlace[]> {
    const cepLimpo = cep.replace(/\D/g, "");
    const curado = LUGARES_CURADOS_ITAPERUNA.filter(
      (l) =>
        l.tipo === "cep" &&
        (l.label.replace(/\D/g, "").includes(cepLimpo) ||
          l.endereco.replace(/\D/g, "").includes(cepLimpo))
    );
    if (curado.length > 0) return curado;
    return this.search(cep, { types: ["postcode"] });
  }
}

export const geocodingService = GeocodingService.getInstance();
