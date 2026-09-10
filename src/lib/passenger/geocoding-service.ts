/**
 * ==============================================================================
 * 📍 PARTIU — GEOCODING & REVERSE GEOCODING SERVICE (ITAPERUNA / REGIONAL)
 * ==============================================================================
 * Resolução inteligente de endereços e coordenadas:
 * - Autocomplete de ruas, bairros e pontos de interesse de Itaperuna.
 * - Geocodificação reversa (coordenadas [lng, lat] -> nome legível da via).
 * - Integração com Mapbox Geocoding v5 quando online, com fallback offline instantâneo.
 * ==============================================================================
 */

import { calcularDistanciaHaversine } from "./eta-service";
import { silentCatchWarn } from "@/lib/structured-logger";
import { reverseGeocodingService } from "@/services/ReverseGeocodingService";


export interface GeocodedPlace {
  id: string;
  label: string;
  sublabel: string;
  endereco: string;
  coords: [number, number]; // [lng, lat]
  tipo?: "rua" | "ponto_interesse" | "bairro" | "hospital" | "faculdade" | "transporte";
}

const MAPBOX_TOKEN =
  (typeof import.meta !== "undefined" &&
    (import.meta.env?.["VITE_MAPBOX_TOKEN"] ||
      import.meta.env?.["VITE_MAPBOX_ACCESS_TOKEN"] ||
      import.meta.env?.["MAPBOX_TOKEN"])) ||
  (typeof process !== "undefined" &&
    (process.env?.["VITE_MAPBOX_TOKEN"] ||
      process.env?.["VITE_MAPBOX_ACCESS_TOKEN"] ||
      process.env?.["MAPBOX_TOKEN"])) ||
  "pk.eyJ1IjoiZXhhbXBsZS11c2VyIiwiYSI6ImNsZXhhbXBsZTAwMDAwIn0.ZXhhbXBsZV90b2tlbl9mb3JfY2k";

// Catálogo regional detalhado de Itaperuna, RJ
export const LUGARES_CURADOS_ITAPERUNA: GeocodedPlace[] = [
  {
    id: "itap-centro-1",
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
    endereco: "Rua Buarque de Nazareth, 112 - Centro, Itaperuna - RJ",
    coords: [-41.8872, -21.2045],
    tipo: "rua",
  },
  {
    id: "itap-sao-jose-avai",
    label: "Hospital São José do Avaí",
    sublabel: "Rua Cel. Luiz Ferraz, 397 - Centro",
    endereco: "Rua Cel. Luiz Ferraz, 397 - Centro, Itaperuna - RJ",
    coords: [-41.8895, -21.2038],
    tipo: "hospital",
  },
  {
    id: "itap-rodoviaria",
    label: "Terminal Rodoviário de Itaperuna",
    sublabel: "Praça Barão do Rio Branco, s/n - Centro",
    endereco: "Praça Barão do Rio Branco, s/n - Centro, Itaperuna - RJ",
    coords: [-41.894, -21.2005],
    tipo: "transporte",
  },
  {
    id: "itap-uniredentor",
    label: "UniRedentor / AFYA",
    sublabel: "Av. Pres. Dutra, s/n - Cidade Nova",
    endereco: "Av. Pres. Dutra, s/n - Cidade Nova, Itaperuna - RJ",
    coords: [-41.879, -21.212],
    tipo: "faculdade",
  },
  {
    id: "itap-upa-24h",
    label: "UPA 24 Horas",
    sublabel: "Rua Zeca Barbosa, s/n - Lions",
    endereco: "Rua Zeca Barbosa, s/n - Lions, Itaperuna - RJ",
    coords: [-41.875, -21.218],
    tipo: "hospital",
  },
  {
    id: "itap-fluminense-vinhosa",
    label: "Supermercados Fluminense 03",
    sublabel: "Av. Vinhosa, 520 - Vinhosa",
    endereco: "Av. Vinhosa, 520 - Vinhosa, Itaperuna - RJ",
    coords: [-41.892, -21.2018],
    tipo: "ponto_interesse",
  },
  {
    id: "itap-fluminense-centro",
    label: "Supermercados Fluminense 01",
    sublabel: "Rua Dez de Maio, 45 - Centro",
    endereco: "Rua Dez de Maio, 45 - Centro, Itaperuna - RJ",
    coords: [-41.885, -21.206],
    tipo: "ponto_interesse",
  },
  {
    id: "itap-aeroporto",
    label: "Aeroporto Ernani do Amaral Peixoto",
    sublabel: "Rodovia BR-356 - Aeroporto",
    endereco: "Rod. BR-356, km 3 - Aeroporto, Itaperuna - RJ",
    coords: [-41.868, -21.192],
    tipo: "transporte",
  },
  {
    id: "itap-bairro-cehab",
    label: "Bairro CEHAB",
    sublabel: "Região da Praça CEHAB — Itaperuna, RJ",
    endereco: "Rua Mozart Bastos Soares - CEHAB, Itaperuna - RJ",
    coords: [-41.865, -21.215],
    tipo: "bairro",
  },
  {
    id: "itap-bairro-cidade-nova",
    label: "Bairro Cidade Nova",
    sublabel: "Próximo à Prefeitura — Itaperuna, RJ",
    endereco: "Rua General Osório - Cidade Nova, Itaperuna - RJ",
    coords: [-41.882, -21.21],
    tipo: "bairro",
  },
  {
    id: "itap-bairro-sao-mateus",
    label: "Bairro São Mateus",
    sublabel: "Região Alta — Itaperuna, RJ",
    endereco: "Rua São Mateus - São Mateus, Itaperuna - RJ",
    coords: [-41.898, -21.209],
    tipo: "bairro",
  },
  {
    id: "itap-bairro-fitecamp",
    label: "Bairro Fitecamp",
    sublabel: "Área Residencial — Itaperuna, RJ",
    endereco: "Rua Projetada - Fitecamp, Itaperuna - RJ",
    coords: [-41.895, -21.215],
    tipo: "bairro",
  },
];

class GeocodingService {
  private cacheReverso = new Map<string, string>();

  /**
   * Busca preditiva de endereços e pontos de interesse (Autocomplete)
   */
  async buscarLugares(termo: string): Promise<GeocodedPlace[]> {
    const q = termo.trim().toLowerCase();
    if (!q) {
      return LUGARES_CURADOS_ITAPERUNA.slice(0, 6);
    }

    // 1. Filtragem local instantânea de alta relevância
    const locaisLocais = LUGARES_CURADOS_ITAPERUNA.filter(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        l.sublabel.toLowerCase().includes(q) ||
        l.endereco.toLowerCase().includes(q)
    );

    // 2. Se houver Mapbox Token e a busca for longa o suficiente, tenta consulta online
    if (MAPBOX_TOKEN && MAPBOX_TOKEN.startsWith("pk.") && q.length >= 3) {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          termo
        )}.json?proximity=-41.8880,-21.2050&bbox=-42.05,-21.35,-41.70,-21.05&types=address,poi,neighborhood,locality&language=pt&country=BR&limit=5&access_token=${MAPBOX_TOKEN}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1800);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          if (data.features && Array.isArray(data.features)) {
            const apiResults: GeocodedPlace[] = data.features.map((f: any) => {
              const coords: [number, number] = f.center as [number, number];
              const nome = f.text || f.place_name?.split(",")[0] || termo;
              const sub = f.place_name?.replace(nome + ", ", "") || "Itaperuna, RJ";
              return {
                id: f.id || `mb-${coords[0]}-${coords[1]}`,
                label: nome,
                sublabel: sub,
                endereco: f.place_name || `${nome}, Itaperuna - RJ`,
                coords,
                tipo: "rua",
              };
            });

            // Mescla sem duplicidade com os locais curados
            const ids = new Set(locaisLocais.map((l) => l.endereco.toLowerCase()));
            const mesclados = [...locaisLocais];
            for (const r of apiResults) {
              if (!ids.has(r.endereco.toLowerCase())) {
                mesclados.push(r);
              }
            }
            return mesclados.slice(0, 8);
          }
        }
      } catch (err) { silentCatchWarn("geocoding-service", err); }
    }

    if (locaisLocais.length > 0) {
      return locaisLocais;
    }

    // 3. Fallback inteligente quando digita algo desconhecido: gera endereço aproximado em Itaperuna
    return [
      {
        id: `custom-${Date.now()}`,
        label: termo,
        sublabel: "Endereço em Itaperuna, RJ",
        endereco: `${termo}, Itaperuna - RJ`,
        coords: [-41.888, -21.205],
        tipo: "rua",
      },
    ];
  }

  /**
   * Geocodificação reversa: Coordenadas [lng, lat] para endereço em texto legível
   * Utiliza motor de alta fidelidade (Mapbox Places + OpenStreetMap Nominatim)
   */
  async geocodificarReverso(coords: [number, number]): Promise<string> {
    const key = `${coords[0].toFixed(4)},${coords[1].toFixed(4)}`;
    if (this.cacheReverso.has(key)) {
      return this.cacheReverso.get(key)!;
    }

    try {
      const res = await reverseGeocodingService.reverseGeocode(coords);
      if (res && res.formattedAddress) {
        this.cacheReverso.set(key, res.formattedAddress);
        return res.formattedAddress;
      }
    } catch (err) {
      silentCatchWarn("geocoding-service", err);
    }

    return `Local no mapa (${coords[1].toFixed(4)}, ${coords[0].toFixed(4)})`;
  }
}

export const geocodingService = new GeocodingService();
