import { silentCatchWarn } from "@/lib/structured-logger";

/**
 * ==============================================================================
 * 🔔 PARTIU CALL ALERT ENGINE (v4.0) — AUDIO, VIBRATION & WAKE LOCK
 * ==============================================================================
 * Gerenciador de alerta de chamada em alta prioridade para o condutor parceiro.
 *
 * Ao receber uma corrida:
 * 1. ÁUDIO PERSISTENTE: Sintetizador Web Audio API com sinal bitonal de alta audibilidade.
 * 2. VIBRAÇÃO HÁPTICA: Padrão contínuo [500ms ON, 300ms OFF, 500ms ON].
 * 3. WAKE SCREEN: Mantém a tela ligada via Screen Wake Lock API e traz o modal à frente.
 * ==============================================================================
 */

export class CallAlertService {
  private static instance: CallAlertService;

  private isAlerting = false;
  private audioCtx: AudioContext | null = null;
  private soundLoopInterval: NodeJS.Timeout | null = null;
  private vibrationInterval: NodeJS.Timeout | null = null;
  private wakeLockSentinel: any = null;

  private constructor() {}

  public static getInstance(): CallAlertService {
    if (!CallAlertService.instance) {
      CallAlertService.instance = new CallAlertService();
    }
    return CallAlertService.instance;
  }

  /**
   * Inicia o alerta completo (som, vibração e tela ativa)
   */
  public async startAlert(): Promise<void> {
    if (this.isAlerting) return;
    this.isAlerting = true;

    // 1. Áudio Bitonal Persistente
    this.startAudioLoop();

    // 2. Vibração Háptica Padrão: 500ms ON, 300ms OFF, 500ms ON
    this.startVibrationLoop();

    // 3. Screen Wake Lock
    await this.requestWakeLock();
  }

  /**
   * Interrompe o alerta imediatamente (ao aceitar, recusar ou timeout)
   */
  public stopAlert(): void {
    this.isAlerting = false;

    // Parar áudio
    if (this.soundLoopInterval) {
      clearInterval(this.soundLoopInterval);
      this.soundLoopInterval = null;
    }

    if (this.audioCtx) {
      try {
        if (this.audioCtx.state !== "closed") {
          this.audioCtx.close();
        }
      } catch (err) { silentCatchWarn("CallAlertService", err); }
      this.audioCtx = null;
    }

    // Parar vibração
    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(0);
      } catch (err) { silentCatchWarn("CallAlertService", err); }
    }

    // Liberar Wake Lock
    this.releaseWakeLock();
  }

  /**
   * Sintetiza o bip bitonal do PARTIU (Padrão 99/Uber) via Web Audio API
   */
  private playChime(): void {
    if (typeof window === "undefined") return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx || this.audioCtx.state === "closed") {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // Oscilador 1: Tom agudo inicial (880Hz - Lá)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1174, now + 0.18);

      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.22);

      // Oscilador 2: Tom grave de sustentação (587Hz - Ré)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(587, now + 0.15);
      osc2.frequency.setValueAtTime(784, now + 0.32);

      gain2.gain.setValueAtTime(0.0, now);
      gain2.gain.setValueAtTime(0.4, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.45);
    } catch (err) { silentCatchWarn("CallAlertService", err); }
  }

  private startAudioLoop(): void {
    this.playChime();
    this.soundLoopInterval = setInterval(() => {
      if (!this.isAlerting) return;
      this.playChime();
    }, 700);
  }

  private startVibrationLoop(): void {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;

    const pattern = [500, 300, 500]; // 500ms vibra, 300ms pausa, 500ms vibra
    try {
      navigator.vibrate(pattern);
    } catch (err) { silentCatchWarn("CallAlertService", err); }

    this.vibrationInterval = setInterval(() => {
      if (!this.isAlerting) return;
      try {
        navigator.vibrate(pattern);
      } catch (err) { silentCatchWarn("CallAlertService", err); }
    }, 1500);
  }

  private async requestWakeLock(): Promise<void> {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    try {
      this.wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
    } catch (err) { silentCatchWarn("CallAlertService", err); }
  }

  private releaseWakeLock(): void {
    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch (err) { silentCatchWarn("CallAlertService", err); }
      this.wakeLockSentinel = null;
    }
  }
}

export const callAlertService = CallAlertService.getInstance();
