/**
 * ==============================================================================
 * 📍 PARTIU — REVERSE GEOCODING SERVICE (COORDINATES TO ADDRESS ENGINE)
 * ==============================================================================
 * Resolução precisa de coordenadas de satélite [longitude, latitude] para
 * endereço estruturado com rua, número, bairro, cidade e estado.
 *
 * Exemplo de Saída:
 * "Rua Amadeu Tinoco Lacerda, 492, Centro, Itaperuna - RJ"
 * ==============================================================================
 */

import { MapboxConfig } from "@/config/MapboxConfig";
import { LUGARES_CURADOS_ITAPERUNA } from "./GeocodingService";

export interface ReverseGeocodedAddress {
  street: string;
  number?: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode?: string;
  formattedAddress: string;
  coords: [number, number]; // [lng, lat]
}

export class ReverseGeocodingService {
  private static instance: ReverseGeocodingService;

  // Cache em memória de endereços reversos (tolerância de ~10m)
  private cache = new Map<string, { address: ReverseGeocodedAddress; timestamp: number }>();
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

  private constructor() {}

  public static getInstance(): ReverseGeocodingService {
    if (!ReverseGeocodingService.instance) {
      ReverseGeocodingService.instance = new ReverseGeocodingService();
    }
    return ReverseGeocodingService.instance;
  }

  private getCacheKey(lng: number, lat: number): string {
    return `${lng.toFixed(4)},${lat.toFixed(4)}`;
  }

  /**
   * Geocodificação reversa de coordenadas para endereço brasileiro estruturado
   */
  public async reverseGeocode(
    coordsOrLat: [number, number] | { lat: number; lng: number } | number,
    lngParam?: number
  ): Promise<ReverseGeocodedAddress> {
    let lat: number;
    let lng: number;

    if (Array.isArray(coordsOrLat)) {
      lng = coordsOrLat[0];
      lat = coordsOrLat[1];
    } else if (typeof coordsOrLat === "object") {
      lat = coordsOrLat.lat;
      lng = coordsOrLat.lng;
    } else if (typeof coordsOrLat === "number" && typeof lngParam === "number") {
      lat = coordsOrLat;
      lng = lngParam;
    } else {
      throw new Error("[ReverseGeocodingService] Coordenadas inválidas.");
    }

    const cacheKey = this.getCacheKey(lng, lat);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.address;
    }

    // 1. Chamada à API Mapbox Geocoding v5
    try {
      const token = MapboxConfig.getAccessToken();
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=address,neighborhood,poi,locality&language=pt&country=BR`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(url, { method: "GET", signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const primary = data.features[0];
          const context = primary.context || [];

          const street = primary.text || primary.place_name?.split(",")[0] || "Rua";
          const number = primary.address || "";
          const neighborhood =
            context.find((c: any) => c.id.startsWith("neighborhood"))?.text ||
            context.find((c: any) => c.id.startsWith("locality"))?.text ||
            "Centro";
          const rawState = context.find((c: any) => c.id.startsWith("region"))?.text || "RJ";
          const regionCode = context.find((c: any) => c.id.startsWith("region"))?.short_code;
          
          let state = "RJ";
          if (regionCode) {
            state = regionCode.replace(/^BR-/i, "").toUpperCase();
          } else {
            const BRAZIL_STATES: Record<string, string> = {
              "rio de janeiro": "RJ",
              "sao paulo": "SP",
              "são paulo": "SP",
              "minas gerais": "MG",
              "espirito santo": "ES",
              "espírito santo": "ES",
              "bahia": "BA",
              "alagoas": "AL",
              "sergipe": "SE",
              "pernambuco": "PE",
              "paraiba": "PB",
              "paraíba": "PB",
              "rio grande do norte": "RN",
              "ceara": "CE",
              "ceará": "CE",
              "piaui": "PI",
              "piauí": "PI",
              "maranhao": "MA",
              "maranhão": "MA",
              "para": "PA",
              "pará": "PA",
              "amapa": "AP",
              "amapá": "AP",
              "amazonas": "AM",
              "roraima": "RR",
              "acre": "AC",
              "rondonia": "RO",
              "rondônia": "RO",
              "tocantins": "TO",
              "mato grosso": "MT",
              "mato grosso do sul": "MS",
              "goias": "GO",
              "goiás": "GO",
              "distrito federal": "DF",
              "parana": "PR",
              "paraná": "PR",
              "santa catarina": "SC",
              "rio grande do sul": "RS",
            };
            const normalizedName = rawState.toLowerCase().trim();
            state = BRAZIL_STATES[normalizedName] || (rawState.length === 2 ? rawState.toUpperCase() : "RJ");
          }

          const city =
            context.find((c: any) => c.id.startsWith("place"))?.text || "Itaperuna";
          const postalCode = context.find((c: any) => c.id.startsWith("postcode"))?.text;

          const streetPart = number ? `${street}, ${number}` : street;
          const formattedAddress = `${streetPart}, ${neighborhood}, ${city} - ${state}`;

          const result: ReverseGeocodedAddress = {
            street,
            number: number || undefined,
            neighborhood,
            city,
            state,
            postalCode: postalCode || undefined,
            formattedAddress,
            coords: [lng, lat],
          };

          this.cache.set(cacheKey, { address: result, timestamp: Date.now() });
          return result;
        }
      }
    } catch (err) {
      console.warn("[ReverseGeocodingService] Falha no Mapbox, acionando fallback de alta precisão:", err);
    }

    // 2. Fallback de Alta Precisão Nacional via OpenStreetMap Nominatim (Padrão Uber/WhatsApp)
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const nomController = new AbortController();
      const nomTimeout = setTimeout(() => nomController.abort(), 3500);
      const nomRes = await fetch(nomUrl, {
        headers: { "Accept-Language": "pt-BR,pt;q=0.9", "User-Agent": "PartiuMobilidadeApp/1.0" },
        signal: nomController.signal,
      });
      clearTimeout(nomTimeout);

      if (nomRes.ok) {
        const nomData = await nomRes.json();
        if (nomData && nomData.address) {
          const addr = nomData.address;
          const street = addr.road || addr.pedestrian || addr.street || addr.suburb || "Rua Local";
          const number = addr.house_number || "";
          const neighborhood = addr.neighbourhood || addr.suburb || addr.quarter || "Centro";
          const city = addr.city || addr.town || addr.municipality || addr.village || "Itaperuna";
          const state = addr.state ? (addr.state.length === 2 ? addr.state.toUpperCase() : "RJ") : "RJ";
          const streetPart = number ? `${street}, ${number}` : street;
          const formattedAddress = `${streetPart}, ${neighborhood}, ${city} - ${state}`;

          const result: ReverseGeocodedAddress = {
            street,
            number: number || undefined,
            neighborhood,
            city,
            state,
            postalCode: addr.postcode || undefined,
            formattedAddress,
            coords: [lng, lat],
          };

          this.cache.set(cacheKey, { address: result, timestamp: Date.now() });
          return result;
        }
      }
    } catch {
      // continua para fallback de catálogo
    }

    // 3. Fallback de Proximidade Imediata (< 60 metros)
    let bestMatch = LUGARES_CURADOS_ITAPERUNA[0];
    let minDistance = Infinity;

    for (const place of LUGARES_CURADOS_ITAPERUNA) {
      const dLng = place.coords[0] - lng;
      const dLat = place.coords[1] - lat;
      const dist = dLng * dLng + dLat * dLat;
      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = place;
      }
    }

    // Só vincula ao ponto curado se estiver a menos de ~60 metros reais
    const isNearby = minDistance < 0.00000036;
    const fallbackAddress = isNearby && bestMatch
      ? `${bestMatch.label}, ${bestMatch.sublabel}`
      : `Local no mapa (${lat.toFixed(4)}, ${lng.toFixed(4)}) - Centro, Itaperuna - RJ`;

    const fallbackResult: ReverseGeocodedAddress = {
      street: isNearby && bestMatch ? bestMatch.label : "Local no mapa",
      neighborhood: isNearby && bestMatch?.sublabel ? bestMatch.sublabel.split("—")[0]?.trim() || "Centro" : "Centro",
      city: "Itaperuna",
      state: "RJ",
      formattedAddress: fallbackAddress,
      coords: [lng, lat],
    };

    return fallbackResult;
  }
}

export const reverseGeocodingService = ReverseGeocodingService.getInstance();
