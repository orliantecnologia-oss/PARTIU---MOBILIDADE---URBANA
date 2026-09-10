/**
 * ==============================================================================
 * 🌐 PARTIU — MAP SOURCES (GEOJSON GENERATORS & 10.000 DRIVERS CLUSTERING)
 * ==============================================================================
 * Construtores de fontes de dados GeoJSON otimizadas com suporte nativo a
 * clustering de alto desempenho para frotas urbanas massivas.
 * ==============================================================================
 */

import { MAP_SOURCES, MAP_ASSETS } from "./MapConstants";
import type mapboxgl from "mapbox-gl";

export interface DriverFeatureProperties {
  driverId: string;
  name: string;
  category: "CARRO" | "MOTO" | string;
  heading: number;
  status: "ONLINE" | "BUSY" | "ON_TRIP";
  icon: string;
}

export class MapSources {
  /**
   * Constrói GeoJSON para a linha da rota
   */
  public static createRouteGeoJSON(coordinates: [number, number][]): GeoJSON.FeatureCollection {
    if (!coordinates || coordinates.length < 2) {
      return {
        type: "FeatureCollection",
        features: [],
      };
    }

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates,
          },
        },
      ],
    };
  }

  /**
   * Constrói GeoJSON para condutores em tempo real
   */
  public static createDriversGeoJSON(
    drivers: {
      id: string;
      name: string;
      coords: [number, number];
      category: "CARRO" | "MOTO" | string;
      heading?: number;
      status?: "ONLINE" | "BUSY" | "ON_TRIP";
    }[]
  ): GeoJSON.FeatureCollection {
    const features: GeoJSON.Feature[] = (drivers || []).map((d) => {
      const icon = d.category === "MOTO" ? MAP_ASSETS.MOTO : MAP_ASSETS.CARRO;

      return {
        type: "Feature",
        properties: {
          driverId: d.id,
          name: d.name,
          category: d.category,
          heading: d.heading || 0,
          status: d.status || "ONLINE",
          icon,
        },
        geometry: {
          type: "Point",
          coordinates: d.coords,
        },
      };
    });

    return {
      type: "FeatureCollection",
      features,
    };
  }

  /**
   * Constrói GeoJSON para pinos de embarque e destino
   */
  public static createPinsGeoJSON(
    pickup?: [number, number],
    destination?: [number, number]
  ): GeoJSON.FeatureCollection {
    const features: GeoJSON.Feature[] = [];

    if (pickup) {
      features.push({
        type: "Feature",
        properties: {
          pinType: "pickup",
          icon: MAP_ASSETS.PICKUP_PIN,
          title: "Ponto de Embarque",
        },
        geometry: {
          type: "Point",
          coordinates: pickup,
        },
      });
    }

    if (destination) {
      features.push({
        type: "Feature",
        properties: {
          pinType: "destination",
          icon: MAP_ASSETS.DESTINATION_PIN,
          title: "Destino Final",
        },
        geometry: {
          type: "Point",
          coordinates: destination,
        },
      });
    }

    return {
      type: "FeatureCollection",
      features,
    };
  }

  /**
   * Constrói GeoJSON para posição do usuário
   */
  public static createUserLocationGeoJSON(coords: [number, number]): GeoJSON.FeatureCollection {
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: coords,
          },
        },
      ],
    };
  }

  /**
   * Atualiza com segurança a fonte GeoJSON sem recriar objetos no mapa (Zero Memory Leak)
   */
  public static updateSourceData(
    map: mapboxgl.Map,
    sourceId: string,
    data: GeoJSON.FeatureCollection
  ): void {
    if (!map || !map.getSource) return;
    const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
    if (source && typeof source.setData === "function") {
      source.setData(data);
    }
  }
}
