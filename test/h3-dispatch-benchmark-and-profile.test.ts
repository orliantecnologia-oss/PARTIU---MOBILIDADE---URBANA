/**
 * ==============================================================================
 * 🧪 SUITE: H3 DISPATCH BENCHMARK & DYNAMIC GPS SAMPLING PROFILES (SUITE 56)
 * ==============================================================================
 * Valida o subsistema de perfis dinâmicos de telemetria GPS e o simulador de
 * despacho concorrente por ondas H3 (inspirados no Ride Hailing).
 * ==============================================================================
 */

import { describe, test, expect } from "./test-harness.mjs";
import {
  dynamicGpsProfileManager,
  type GpsSamplingProfile,
} from "../src/lib/tracking/dynamic-gps-profile-manager";
import { runDispatchBenchmark } from "../scripts/simulate-h3-dispatch";

describe("SUITE 56: H3 DISPATCH BENCHMARK & DYNAMIC GPS SAMPLING PROFILES", () => {
  test("1. DynamicGpsProfileManager: Inicializa com modo padrão IDLE_CRUISING", () => {
    dynamicGpsProfileManager.resetToDefaults();
    const active = dynamicGpsProfileManager.getActiveProfile();
    expect(active.mode).toBe("IDLE_CRUISING");
    expect(active.samplingFrequencyHz).toBe(0.2);
    expect(active.minDistanceMeters).toBe(35);
    expect(active.highAccuracy).toBe(false);
    expect(active.wakeLockRequired).toBe(false);
  });

  test("2. DynamicGpsProfileManager: Transição para modo IN_TRIP ao iniciar viagem", () => {
    dynamicGpsProfileManager.resetToDefaults();
    dynamicGpsProfileManager.setMode("IN_TRIP");
    const active = dynamicGpsProfileManager.getActiveProfile();
    expect(active.mode).toBe("IN_TRIP");
    expect(active.samplingFrequencyHz).toBe(1.0);
    expect(active.minDistanceMeters).toBe(15);
    expect(active.heartbeatIntervalMs).toBe(10000);
    expect(active.highAccuracy).toBe(true);
    expect(active.wakeLockRequired).toBe(true);
    expect(active.audioKeepAlive).toBe(true);
  });

  test("3. DynamicGpsProfileManager: Transição crítica para EMERGENCY_SOS prioritário", () => {
    dynamicGpsProfileManager.resetToDefaults();
    dynamicGpsProfileManager.setMode("IN_TRIP");
    dynamicGpsProfileManager.setMode("EMERGENCY_SOS");
    const active = dynamicGpsProfileManager.getActiveProfile();
    expect(active.mode).toBe("EMERGENCY_SOS");
    expect(active.samplingFrequencyHz).toBe(2.0);
    expect(active.minDistanceMeters).toBe(5);
    expect(active.heartbeatIntervalMs).toBe(5000);
    expect(active.highAccuracy).toBe(true);
  });

  test("4. DynamicGpsProfileManager: Customização e sobrescrita remota de parâmetros", () => {
    dynamicGpsProfileManager.resetToDefaults();
    dynamicGpsProfileManager.overrideProfile("IN_TRIP", {
      minDistanceMeters: 10,
      heartbeatIntervalMs: 8000,
    });

    dynamicGpsProfileManager.setMode("IN_TRIP");
    const active = dynamicGpsProfileManager.getActiveProfile();
    expect(active.minDistanceMeters).toBe(10);
    expect(active.heartbeatIntervalMs).toBe(8000);
    expect(active.samplingFrequencyHz).toBe(1.0);
  });

  test("5. DynamicGpsProfileManager: Notificação reativa para ouvintes cadastrados", () => {
    dynamicGpsProfileManager.resetToDefaults();
    const receivedProfiles: GpsSamplingProfile[] = [];
    const unsubscribe = dynamicGpsProfileManager.subscribe((profile) => {
      receivedProfiles.push(profile);
    });

    dynamicGpsProfileManager.setMode("IN_TRIP");
    dynamicGpsProfileManager.setMode("IDLE_CRUISING");

    expect(receivedProfiles.length).toBeGreaterThanOrEqual(2);
    expect(receivedProfiles[receivedProfiles.length - 1].mode).toBe("IDLE_CRUISING");

    unsubscribe();
  });

  test("6. H3 Dispatch Benchmark: Executa simulação com 100 condutores e 15 corridas", async () => {
    const result = await runDispatchBenchmark({
      drivers: 100,
      requests: 15,
      radiusM: 5000,
      acceptProb: 0.8,
      waveSize: 5,
      maxWaves: 4,
    });

    expect(result.totalRequests).toBe(15);
    expect(result.matchedCount + result.unmatchedCount).toBe(15);
    expect(result.matchRatePercent).toBeGreaterThanOrEqual(0);
    expect(result.matchRatePercent).toBeLessThanOrEqual(100);
    expect(result.p50).toBeGreaterThanOrEqual(0);
    expect(result.avgLatencyMs).toBeGreaterThan(0);

    const totalInWaves = Object.values(result.wavesCountDistribution).reduce((a, b) => a + b, 0);
    expect(totalInWaves).toBe(result.matchedCount);
  });
});
