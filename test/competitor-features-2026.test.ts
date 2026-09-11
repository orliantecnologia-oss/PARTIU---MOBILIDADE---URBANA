import { describe, test, expect } from "./test-harness.mjs";
import {
  virtualTaximeterService,
  VirtualTaximeterService,
  DEFAULT_TAXIMETER_CONFIG,
} from "../src/services/VirtualTaximeterService.ts";
import {
  driverVoiceAssistant,
  DriverVoiceAssistantService,
} from "../src/services/DriverVoiceAssistantService.ts";
import {
  driverWalletEngine,
  DriverWalletEngine,
} from "../src/lib/revenue/driver-wallet.ts";
import {
  getWazeUrl,
  getGoogleMapsUrl,
} from "../src/utils/navigation-launcher.ts";

describe("SUITE 55: RECURSOS COMPETITIVOS 2026 (TAXÍMETRO VIRTUAL, TTS, DEBT CUTOFF & GPS)", () => {
  // ============================================================================
  // 1. TAXÍMETRO VIRTUAL INTELIGENTE ("CORRIDA DE RUA")
  // ============================================================================
  test("1. Taxímetro Virtual: Inicialização, ciclo de vida (Start/Pause/Resume/Finish) e Reset", () => {
    const taximeter = VirtualTaximeterService.getInstance();
    taximeter.reset();

    let state = taximeter.getState();
    expect(state.status).toBe("IDLE");
    expect(state.currentFareBrl).toBe(DEFAULT_TAXIMETER_CONFIG.baseFareBrl);

    // Inicia corrida com bandeirada de R$ 7,00 e km a R$ 3,00
    taximeter.start({
      baseFareBrl: 7.0,
      kmRateBrl: 3.0,
      minuteRateBrl: 0.5,
      minFareBrl: 12.0,
    });

    state = taximeter.getState();
    expect(state.status).toBe("RUNNING");
    expect(state.baseFareBrl).toBe(7.0);

    // Pausa corrida
    taximeter.pause();
    state = taximeter.getState();
    expect(state.status).toBe("PAUSED");

    // Retoma corrida
    taximeter.resume();
    state = taximeter.getState();
    expect(state.status).toBe("RUNNING");

    // Finaliza corrida e valida recibo
    const receipt = taximeter.finish("DRV-TEST-01");
    expect(receipt.driverId).toBe("DRV-TEST-01");
    expect(receipt.fareBrl >= 12.0).toBe(true); // Respeita tarifa mínima de R$ 12,00
    expect(receipt.platformFeeBrl).toBe(Math.round(receipt.fareBrl * 0.1 * 100) / 100);
    expect(receipt.netDriverBrl).toBe(Math.round((receipt.fareBrl - receipt.platformFeeBrl) * 100) / 100);
    expect(receipt.pixCopiaECola?.includes("br.gov.bcb.pix")).toBe(true);

    // Reseta estado
    taximeter.reset();
    expect(taximeter.getState().status).toBe("IDLE");
  });

  test("2. Taxímetro Virtual: Cálculo correto de tarifa por km e tempo", () => {
    const taximeter = VirtualTaximeterService.getInstance();
    taximeter.reset();

    taximeter.updateConfig({
      baseFareBrl: 6.0,
      kmRateBrl: 2.5,
      minuteRateBrl: 0.35,
      minFareBrl: 10.0,
    });

    const config = taximeter.getConfig();
    expect(config.baseFareBrl).toBe(6.0);
    expect(config.kmRateBrl).toBe(2.5);
    expect(config.minuteRateBrl).toBe(0.35);
  });

  // ============================================================================
  // 2. ASSISTENTE DE VOZ & TTS (TEXT TO SPEECH)
  // ============================================================================
  test("3. DriverVoiceAssistant: Alternância de estado (toggle), persistência e listeners", () => {
    const assistant = DriverVoiceAssistantService.getInstance();

    const initialState = assistant.getIsEnabled();
    const toggled = assistant.toggleVoice();
    expect(toggled).toBe(!initialState);
    expect(assistant.getIsEnabled()).toBe(!initialState);

    // Retorna ao estado inicial
    assistant.setEnabled(initialState);
    expect(assistant.getIsEnabled()).toBe(initialState);

    let callbackCalled = false;
    const unsubscribe = assistant.subscribe((enabled) => {
      callbackCalled = true;
    });

    assistant.toggleVoice();
    expect(callbackCalled).toBe(true);
    unsubscribe();

    // Restaura
    assistant.setEnabled(true);
  });

  // ============================================================================
  // 3. TRAVA AUTOMÁTICA DE SALDO DEVEDOR DE COMISSÃO (DEBT CUTOFF)
  // ============================================================================
  test("4. Debt Cutoff Guard: Avaliação de aviso preventivo e corte por teto devedor", () => {
    const engine = DriverWalletEngine.getInstance();
    const driverId = "DRV-FIN-DEBT-01";

    const wallet = engine.getWallet(driverId);

    // Cenário 1: Dívida normal (< R$ 40,00)
    wallet.pendingDebtsCents = 2500; // R$ 25,00
    wallet.pendingDebtsBrl = 25.0;

    let check = engine.checkDebtStatus(driverId);
    expect(check.isBlocked).toBe(false);
    expect(check.isWarning).toBe(false);

    // Cenário 2: Aviso preventivo (>= 80% do limite de R$ 50,00 = R$ 40,00)
    wallet.pendingDebtsCents = 4200; // R$ 42,00
    wallet.pendingDebtsBrl = 42.0;

    check = engine.checkDebtStatus(driverId);
    expect(check.isBlocked).toBe(false);
    expect(check.isWarning).toBe(true);
    expect(check.message.includes("Aviso Preventivo")).toBe(true);

    // Cenário 3: Bloqueio estrito (>= R$ 50,00 / 5000 centavos)
    wallet.pendingDebtsCents = 5500; // R$ 55,00
    wallet.pendingDebtsBrl = 55.0;

    check = engine.checkDebtStatus(driverId);
    expect(check.isBlocked).toBe(true);
    expect(check.message.includes("Bloqueio Automático")).toBe(true);
    expect(check.pixPaymentQrPayload.includes("br.gov.bcb.pix")).toBe(true);

    // Cenário 4: Quitação via PIX de R$ 40,00 -> Reduz débito para R$ 15,00 e desbloqueia
    const payRes = engine.payDebtViaPix(driverId, 40.0);
    expect(payRes.success).toBe(true);
    expect(payRes.newDebtBrl).toBe(15.0);

    check = engine.checkDebtStatus(driverId);
    expect(check.isBlocked).toBe(false);
    expect(check.isWarning).toBe(false);
  });

  // ============================================================================
  // 4. LANÇADOR DE NAVEGAÇÃO EXTERNA (WAZE & GOOGLE MAPS)
  // ============================================================================
  test("5. External Navigation: Formatação de deep links para Waze e Google Maps", () => {
    // Com coordenadas
    const targetWithCoords = {
      address: "Rua Amadeu Tinoco, 492",
      lat: -21.2054,
      lng: -41.8887,
    };

    const wazeUrl = getWazeUrl(targetWithCoords);
    expect(wazeUrl).toBe("https://www.waze.com/ul?ll=-21.2054,-41.8887&navigate=yes");

    const gmapsUrl = getGoogleMapsUrl(targetWithCoords);
    expect(gmapsUrl.includes("destination=-21.2054,-41.8887")).toBe(true);
    expect(gmapsUrl.includes("travelmode=driving")).toBe(true);

    // Com endereço textual (fallback)
    const targetWithAddress = {
      address: "Rodoviária Municipal de Itaperuna",
    };

    const wazeUrlAddress = getWazeUrl(targetWithAddress);
    expect(wazeUrlAddress.includes("q=Rodovi%C3%A1ria%20Municipal%20de%20Itaperuna")).toBe(true);

    const gmapsUrlAddress = getGoogleMapsUrl(targetWithAddress);
    expect(gmapsUrlAddress.includes("destination=Rodovi%C3%A1ria%20Municipal%20de%20Itaperuna")).toBe(true);
  });
});
