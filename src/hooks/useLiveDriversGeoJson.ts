/**
 * ==============================================================================
 * 🗺️ USE LIVE DRIVERS GEOJSON (MAPBOX OPTIMIZED)
 * ==============================================================================
 * Converte de forma altamente performática e memoizada a lista de LiveDriver[]
 * em um GeoJSON FeatureCollection para alimentação direta nas fontes ShapeSource /
 * GeoJSONSource do Mapbox GL, com suporte nativo a rotação de veículos (bearing)
 * e billboarding 2.5D sem flickering.
 * ==============================================================================
 */

import { useMemo } from "react";
import type { LiveDriver } from "./useLiveDrivers";

export interface DriverGeoJsonProperties {
  id: string;
  nome: string;
  veiculo: string;
  placa: string;
  modalidade: "CARRO" | "MOTO";
  icon: "moto-icon" | "car-icon";
  heading: number;
  bearing: number;
  status: string;
}

export function useLiveDriversGeoJson(drivers: LiveDriver[]) {
  return useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: drivers.map((d) => {
        const isMoto = d.category === "MOTO";
        return {
          type: "Feature" as const,
          id: d.id,
          properties: {
            id: d.id,
            nome: d.vehicleModel || (isMoto ? "Moto Parceira" : "Carro Parceiro"),
            veiculo: d.vehicleModel || (isMoto ? "Honda CG 160" : "Chevrolet Onix"),
            placa: d.licensePlate || "BRA-4X99",
            modalidade: isMoto ? ("MOTO" as const) : ("CARRO" as const),
            icon: isMoto ? ("moto-icon" as const) : ("car-icon" as const),
            heading: d.heading || 0,
            bearing: d.heading || 0,
            status: d.status || "DISPONIVEL",
          },
          geometry: {
            type: "Point" as const,
            coordinates: [d.longitude, d.latitude] as [number, number],
          },
        };
      }),
    };
  }, [drivers]);
}

/**
 * Função utilitária pura para conversão imperativa síncrona
 */
export function convertDriversToGeoJson(drivers: LiveDriver[]) {
  return {
    type: "FeatureCollection" as const,
    features: drivers.map((d) => {
      const isMoto = d.category === "MOTO";
      return {
        type: "Feature" as const,
        id: d.id,
        properties: {
          id: d.id,
          nome: d.vehicleModel || (isMoto ? "Moto Parceira" : "Carro Parceiro"),
          veiculo: d.vehicleModel || (isMoto ? "Honda CG 160" : "Chevrolet Onix"),
          placa: d.licensePlate || "BRA-4X99",
          modalidade: isMoto ? ("MOTO" as const) : ("CARRO" as const),
          icon: isMoto ? ("moto-icon" as const) : ("car-icon" as const),
          heading: d.heading || 0,
          bearing: d.heading || 0,
          status: d.status || "DISPONIVEL",
        },
        geometry: {
          type: "Point" as const,
          coordinates: [d.longitude, d.latitude] as [number, number],
        },
      };
    }),
  };
}
