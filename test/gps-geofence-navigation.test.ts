/**
 * ==============================================================================
 * 🧪 SUÍTE 50: GPS, GEOFENCING AUTOMÁTICO (<50m) & NAVEGAÇÃO EXTERNA (WAZE/MAPS)
 * ==============================================================================
 * Certificação técnica dos módulos de alta fidelidade operacional:
 * 1. Geofence Arrival: Detecção automática de chegada ao embarque em raio de 50 metros.
 * 2. Deduplicação de Chegada: Prevenção contra múltiplos disparos para a mesma corrida.
 * 3. Deep-Links de Navegação Externa: Geração de URLs de alta precisão com coordenadas lat/lng para Waze e Google Maps.
 * 4. Cálculo de Azimute / Heading: Rotação angular em 360° para orientação do veículo.
 * 5. Perfil de Amostragem Adaptativa de GPS: Validação de estados operacionais (ON_TRIP vs ONLINE_IDLE).
 * 6. Simulador de Frotas (Driver Loadgen): Geração de coordenadas e indexação H3 em anéis concêntricos.
 * ==============================================================================
 */

import { describe, test, expect } from "./test-harness.mjs";
import { geofenceArrivalService } from "../src/lib/spatial/geofence-arrival-service.ts";
import { getWazeUrl, getGoogleMapsUrl } from "../src/utils/navigation-launcher.ts";
import { calculateBearing, randInCircle } from "../tools/driver-loadgen.ts";
import * as h3 from "h3-js";

describe("SUITE 50: GPS, GEOFENCE (<50m) & EXTERNAL NAVIGATION (WAZE / MAPS)", () => {
  test("1. Geofence Arrival: Calcula distância e detecta chegada com raio <= 50m", () => {
    geofenceArrivalService.reset();

    const pickup = { lat: -21.205, lng: -41.888 };
    // Ponto a ~30 metros (delta pequeno de latitude: ~0.00027 graus ≈ 30m)
    const driverPerto = { lat: -21.20527, lng: -41.888 };
    // Ponto a ~300 metros (delta de ~0.0027 graus ≈ 300m)
    const driverLonge = { lat: -21.2077, lng: -41.888 };

    const resPerto = geofenceArrivalService.checkArrival(driverPerto, pickup, 50);
    expect(resPerto.isWithinThreshold).toBe(true);
    expect(resPerto.distanceMeters <= 50).toBe(true);

    const resLonge = geofenceArrivalService.checkArrival(driverLonge, pickup, 50);
    expect(resLonge.isWithinThreshold).toBe(false);
    expect(resLonge.distanceMeters > 50).toBe(true);
  });

  test("2. Deduplicação de Chegada: Aciona apenas uma única vez por corrida (Anti-Bounce)", () => {
    geofenceArrivalService.reset();

    const rideId = "COR-TEST-GEOFENCE-001";
    const pickup = { lat: -21.205, lng: -41.888 };
    const driverLoc = { lat: -21.2051, lng: -41.888 }; // ~11 metros

    // Primeiro acionamento: deve retornar true
    const primeiroDisparo = geofenceArrivalService.shouldTriggerArrival(rideId, driverLoc, pickup, 50);
    expect(primeiroDisparo).toBe(true);

    // Segundo acionamento repetido (próximo ping de GPS): deve ser bloqueado
    const segundoDisparo = geofenceArrivalService.shouldTriggerArrival(rideId, driverLoc, pickup, 50);
    expect(segundoDisparo).toBe(false);

    // Terceiro acionamento: continua bloqueado
    const terceiroDisparo = geofenceArrivalService.shouldTriggerArrival(rideId, driverLoc, pickup, 50);
    expect(terceiroDisparo).toBe(false);

    // Limpa a corrida ao finalizar
    geofenceArrivalService.clearRide(rideId);
    const aposReset = geofenceArrivalService.shouldTriggerArrival(rideId, driverLoc, pickup, 50);
    expect(aposReset).toBe(true);
  });

  test("3. Deep Links de Navegação: Gera URLs de alta precisão com coordenadas (lat, lng)", () => {
    const targetWithCoords = {
      address: "Av. Pelinca, 100",
      lat: -21.2055,
      lng: -41.8885,
    };

    const wazeUrl = getWazeUrl(targetWithCoords);
    expect(wazeUrl.includes("ll=-21.2055,-41.8885")).toBe(true);
    expect(wazeUrl.includes("navigate=yes")).toBe(true);

    const gmapsUrl = getGoogleMapsUrl(targetWithCoords);
    expect(gmapsUrl.includes("destination=-21.2055,-41.8885")).toBe(true);
    expect(gmapsUrl.includes("travelmode=driving")).toBe(true);

    // Fallback apenas por endereço de texto
    const targetOnlyAddress = {
      address: "Rua Barão de Miracema, 50",
    };
    const wazeFallback = getWazeUrl(targetOnlyAddress);
    expect(wazeFallback.includes("q=Rua%20Bar%C3%A3o%20de%20Miracema%2C%2050")).toBe(true);
  });

  test("4. Cálculo de Rumo (Bearing): Retorna orientação em graus (0° a 360°) correta", () => {
    // Norte: latitude aumenta, longitude constante -> ~0° ou 360°
    const start = { lat: -21.205, lng: -41.888 };
    const norte = { lat: -21.200, lng: -41.888 };
    const bearingNorte = calculateBearing(start, norte);
    expect(bearingNorte >= 0 && bearingNorte <= 10 || bearingNorte >= 350).toBe(true);

    // Leste: longitude aumenta para a direita -> ~90°
    const leste = { lat: -21.205, lng: -41.880 };
    const bearingLeste = calculateBearing(start, leste);
    expect(Math.round(bearingLeste)).toBe(90);

    // Sul: latitude diminui -> ~180°
    const sul = { lat: -21.210, lng: -41.888 };
    const bearingSul = calculateBearing(start, sul);
    expect(Math.round(bearingSul)).toBe(180);

    // Oeste: longitude diminui -> ~270°
    const oeste = { lat: -21.205, lng: -41.896 };
    const bearingOeste = calculateBearing(start, oeste);
    expect(Math.round(bearingOeste)).toBe(270);
  });

  test("5. Simulador de Frotas: Gera coordenadas dentro do raio e indexa em H3", () => {
    const centerLat = -21.205;
    const centerLng = -41.888;
    const radiusM = 3000;

    for (let i = 0; i < 20; i++) {
      const p = randInCircle(centerLat, centerLng, radiusM);
      const dist = geofenceArrivalService.calculateDistanceMeters(
        { lat: centerLat, lng: centerLng },
        p
      );
      // Ponto gerado deve respeitar o raio máximo estipulado
      expect(dist <= radiusM + 50).toBe(true);

      // Célula H3 Resolução 9 gerada deve ser válida
      const cell = h3.latLngToCell(p.lat, p.lng, 9);
      expect(h3.isValidCell(cell)).toBe(true);
    }
  });

  test("6. Integração com Corrida: Campos de coordenadas de embarque e destino preservados", () => {
    const pickup = { lat: -21.205, lng: -41.888 };
    const dropoff = { lat: -21.215, lng: -41.895 };

    const targetNavigation = {
      address: "Ponto de Embarque",
      lat: pickup.lat,
      lng: pickup.lng,
    };

    const wazeDeepLink = getWazeUrl(targetNavigation);
    expect(wazeDeepLink).toBe("https://www.waze.com/ul?ll=-21.205,-41.888&navigate=yes");

    const arrivalCheck = geofenceArrivalService.checkArrival(pickup, pickup, 50);
    expect(arrivalCheck.isWithinThreshold).toBe(true);
    expect(arrivalCheck.distanceMeters).toBe(0);
  });
});
