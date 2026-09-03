/**
 * ==============================================================================
 * 🛰️ UNIVANS CONTINUOUS GPS & TELEMETRY ENGINE (v4.0)
 * Sistema de Rastreamento Contínuo com Anti-Sleep, Background Keep-Alive,
 * Filtro de Deadband Inteligente e Resiliência Offline para Motoristas.
 * ==============================================================================
 */

import { deveTransmitirGpsDeadband, calcularDistanciaMetros } from "./telemetry-pipeline";
import { enqueueDurableOfflineEvent } from "./offline-durable-queue";

export interface TelemetriaGpsPonto {
  latitude: number;
  longitude: number;
  velocidadeKmh: number;
  rumoGraus: number;
  precisaoMetros: number;
  altitudeMetros: number;
  timestamp: number;
  qualidadeSinal: "EXCELENTE" | "BOM" | "REGULAR" | "BAIXO";
}

export interface EstadoContinuousGps {
  ativo: boolean;
  wakeLockAtivo: boolean;
  keepAliveAudioAtivo: boolean;
  ultimoPonto: TelemetriaGpsPonto | null;
  pontosTransmitidos: number;
  pontosEmBufferOffline: number;
  statusConexao: "ONLINE" | "OFFLINE" | "RECONECTANDO";
  erroGps: string | null;
  satelitesAtivos: boolean;
}

export interface ConfigContinuousGps {
  viagemId: string;
  veiculoId: string;
  motoristaId: string;
  placaVeiculo?: string | undefined;
  motoristaNome?: string | undefined;
  linhaOrigemDestino?: string | undefined;
  deadbandMetros?: number | undefined;
  heartbeatIntervaloMs?: number | undefined;
  onPontoTransmitido?: ((ponto: TelemetriaGpsPonto) => Promise<boolean> | boolean | void) | undefined;
  onEstadoMudou?: ((estado: EstadoContinuousGps) => void) | undefined;
  onError?: ((erro: string) => void) | undefined;
}

class ContinuousGpsManager {
  private config: ConfigContinuousGps | null = null;
  private watchId: number | null = null;
  private backupIntervalId: ReturnType<typeof setInterval> | null = null;
  private wakeLockSentinel: any = null;
  private audioElement: HTMLAudioElement | null = null;
  private audioContext: any = null;
  private ultimoPontoTransmitido: { lat: number; lng: number; timestamp: number } | null = null;
  private pontosTransmitidosCount = 0;
  private pontosBufferCount = 0;
  private estadoAtual: EstadoContinuousGps = {
    ativo: false,
    wakeLockAtivo: false,
    keepAliveAudioAtivo: false,
    ultimoPonto: null,
    pontosTransmitidos: 0,
    pontosEmBufferOffline: 0,
    statusConexao: "ONLINE",
    erroGps: null,
    satelitesAtivos: false,
  };

  private boundVisibilityChange: (() => void) | null = null;
  private boundOnline: (() => void) | null = null;
  private boundOffline: (() => void) | null = null;

  public getEstado(): EstadoContinuousGps {
    return { ...this.estadoAtual };
  }

  /**
   * Inicia o motor de rastreamento contínuo
   */
  public async iniciar(config: ConfigContinuousGps): Promise<boolean> {
    this.config = {
      deadbandMetros: 20,
      heartbeatIntervaloMs: 15000,
      ...config,
    };

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      this.atualizarEstado({ erroGps: "Geolocalização não suportada neste dispositivo." });
      config.onError?.("Geolocalização não suportada.");
      return false;
    }

    this.atualizarEstado({
      ativo: true,
      erroGps: null,
      statusConexao: navigator.onLine ? "ONLINE" : "OFFLINE",
    });

    // 1. Ativar Screen Wake Lock (Anti-Sleep de tela)
    await this.solicitarWakeLock();

    // 2. Ativar Background Keep-Alive Audio & MediaSession
    this.iniciarKeepAliveAudio();

    // 3. Ouvintes de eventos do sistema operacional
    this.registrarOuvintesSistema();

    // 4. Iniciar Watcher de Alta Precisão
    this.iniciarWatcherGps();

    return true;
  }

  /**
   * Para o motor de rastreamento e libera recursos
   */
  public parar(): void {
    if (this.watchId !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.backupIntervalId !== null) {
      clearInterval(this.backupIntervalId);
      this.backupIntervalId = null;
    }

    this.liberarWakeLock();
    this.pararKeepAliveAudio();
    this.removerOuvintesSistema();

    this.atualizarEstado({
      ativo: false,
      wakeLockAtivo: false,
      keepAliveAudioAtivo: false,
    });
  }

  /**
   * 1. Screen Wake Lock API — Impede a tela do celular do motorista de desligar
   */
  public async solicitarWakeLock(): Promise<boolean> {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      console.warn("[ContinuousGPS] Wake Lock API não disponível no navegador.");
      return false;
    }

    try {
      this.wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
      this.wakeLockSentinel.addEventListener("release", () => {
        this.atualizarEstado({ wakeLockAtivo: false });
      });
      this.atualizarEstado({ wakeLockAtivo: true });
      return true;
    } catch (err: any) {
      console.warn("[ContinuousGPS] Falha ao adquirir Wake Lock:", err.message);
      this.atualizarEstado({ wakeLockAtivo: false });
      return false;
    }
  }

  private liberarWakeLock(): void {
    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch {
        // Ignore
      }
      this.wakeLockSentinel = null;
      this.atualizarEstado({ wakeLockAtivo: false });
    }
  }

  /**
   * 2. Background Keep-Alive Audio & Media Session API
   * Mantém o processo em primeiro plano mesmo se o motorista alternar para o Waze/Maps
   */
  private iniciarKeepAliveAudio(): void {
    if (typeof window === "undefined") return;

    try {
      // Configurar metadados do MediaSession no Android / iOS
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: "UniVans — Van em Rota (GPS Contínuo)",
          artist: `${this.config?.placaVeiculo || "Van Starlink"} • Motorista ${this.config?.motoristaNome || "Operacional"}`,
          album: this.config?.linhaOrigemDestino || "Corredor Rodoviário UniVans",
          artwork: [
            { src: "/favicon.ico", sizes: "96x96", type: "image/x-icon" },
            { src: "/logo.svg", sizes: "512x512", type: "image/svg+xml" },
          ],
        });

        navigator.mediaSession.playbackState = "playing";
      }

      // Gerar áudio silencioso via Web Audio Context para manter a thread de eventos ativa
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        // Buffer silencioso de 1 segundo
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate, this.audioContext.sampleRate);
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        
        // Conectar a ganho zero para ser completamente inaudível
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.0001; // Nível inaudível
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        source.start(0);

        if (this.audioContext.state === "suspended") {
          this.audioContext.resume().catch(() => {});
        }
      }

      this.atualizarEstado({ keepAliveAudioAtivo: true });
    } catch (err: any) {
      console.warn("[ContinuousGPS] Não foi possível iniciar Keep-Alive de áudio:", err.message);
    }
  }

  private pararKeepAliveAudio(): void {
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // Ignore
      }
      this.audioContext = null;
    }

    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "none";
    }

    this.atualizarEstado({ keepAliveAudioAtivo: false });
  }

  /**
   * 3. Registra ouvintes do sistema para recuperar Wake Lock e reconexões
   */
  private registrarOuvintesSistema(): void {
    if (typeof window === "undefined") return;

    // Quando a aba volta a ficar visível, re-adquirir Wake Lock caso tenha sido liberado
    this.boundVisibilityChange = () => {
      if (document.visibilityState === "visible" && this.estadoAtual.ativo) {
        this.solicitarWakeLock();
        if (this.audioContext && this.audioContext.state === "suspended") {
          this.audioContext.resume().catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", this.boundVisibilityChange);

    // Quedas e retornos de sinal 4G/WiFi
    this.boundOnline = () => {
      this.atualizarEstado({ statusConexao: "ONLINE" });
      this.descarregarBufferOffline();
    };
    this.boundOffline = () => {
      this.atualizarEstado({ statusConexao: "OFFLINE" });
    };
    window.addEventListener("online", this.boundOnline);
    window.addEventListener("offline", this.boundOffline);
  }

  private removerOuvintesSistema(): void {
    if (typeof window === "undefined") return;

    if (this.boundVisibilityChange) {
      document.removeEventListener("visibilitychange", this.boundVisibilityChange);
      this.boundVisibilityChange = null;
    }
    if (this.boundOnline) {
      window.removeEventListener("online", this.boundOnline);
      this.boundOnline = null;
    }
    if (this.boundOffline) {
      window.removeEventListener("offline", this.boundOffline);
      this.boundOffline = null;
    }
  }

  /**
   * 4. Inicia o Watcher de GPS de Alta Precisão
   */
  private iniciarWatcherGps(): void {
    const opcoes: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    };

    // Watcher contínuo nativo
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.processarPosicao(pos),
      (err) => this.tratarErroGps(err),
      opcoes,
    );

    // Fallback Timer de Segurança a cada 12 segundos (caso watchPosition adormeça no Android)
    this.backupIntervalId = setInterval(() => {
      if (this.estadoAtual.ativo && "geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => this.processarPosicao(pos),
          () => {}, // Falhas silenciosas no backup para não poluir logs
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 },
        );
      }
    }, 12000);
  }

  /**
   * Processa a coordenada recebida, avalia deadband e despacha telemetria
   */
  private async processarPosicao(pos: GeolocationPosition): Promise<void> {
    const { latitude, longitude, speed, heading, accuracy, altitude } = pos.coords;
    const agora = Date.now();

    // Calcular velocidade em km/h (speed da API vem em m/s)
    let velocidadeKmh = speed !== null && speed !== undefined && !isNaN(speed) ? Math.round(speed * 3.6) : 0;

    // Se velocidade não foi fornecida pelo hardware, calcular por delta de distância e tempo
    if (velocidadeKmh === 0 && this.ultimoPontoTransmitido) {
      const distMetros = calcularDistanciaMetros(
        this.ultimoPontoTransmitido.lat,
        this.ultimoPontoTransmitido.lng,
        latitude,
        longitude,
      );
      const tempoSegundos = (agora - this.ultimoPontoTransmitido.timestamp) / 1000;
      if (tempoSegundos > 0) {
        const velCalculada = (distMetros / tempoSegundos) * 3.6;
        if (velCalculada > 3 && velCalculada < 160) {
          velocidadeKmh = Math.round(velCalculada);
        }
      }
    }

    // Qualidade do sinal baseado na precisão
    let qualidadeSinal: TelemetriaGpsPonto["qualidadeSinal"] = "BOM";
    if (accuracy <= 8) qualidadeSinal = "EXCELENTE";
    else if (accuracy <= 20) qualidadeSinal = "BOM";
    else if (accuracy <= 45) qualidadeSinal = "REGULAR";
    else qualidadeSinal = "BAIXO";

    const ponto: TelemetriaGpsPonto = {
      latitude,
      longitude,
      velocidadeKmh,
      rumoGraus: heading || 0,
      precisaoMetros: Math.round(accuracy),
      altitudeMetros: altitude ? Math.round(altitude) : 0,
      timestamp: agora,
      qualidadeSinal,
    };

    this.atualizarEstado({
      ultimoPonto: ponto,
      satelitesAtivos: true,
      erroGps: null,
    });

    // Avaliar Deadband Geográfico e Heartbeat Temporal
    const limiteMetros = this.config?.deadbandMetros || 20;
    const heartbeatMs = this.config?.heartbeatIntervaloMs || 15000;
    const pontoAtualSimplificado = { lat: latitude, lng: longitude, timestamp: agora };

    const deveTransmitir = deveTransmitirGpsDeadband(
      this.ultimoPontoTransmitido,
      pontoAtualSimplificado,
      limiteMetros,
      heartbeatMs,
    );

    if (deveTransmitir) {
      this.ultimoPontoTransmitido = pontoAtualSimplificado;
      await this.despacharPonto(ponto);
    }
  }

  /**
   * Despacha o ponto para o servidor ou salva na fila durável offline
   */
  private async despacharPonto(ponto: TelemetriaGpsPonto): Promise<void> {
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    if (!isOnline) {
      // 100% Offline: enfileira localmente
      this.salvarPontoOffline(ponto);
      return;
    }

    try {
      if (this.config?.onPontoTransmitido) {
        const sucesso = await this.config.onPontoTransmitido(ponto);
        if (sucesso !== false) {
          this.pontosTransmitidosCount++;
          this.atualizarEstado({
            pontosTransmitidos: this.pontosTransmitidosCount,
            statusConexao: "ONLINE",
          });
          return;
        }
      }
      // Se callback retornou false ou falhou
      this.salvarPontoOffline(ponto);
    } catch (err: any) {
      console.warn("[ContinuousGPS] Falha ao enviar telemetria, gravando offline:", err.message);
      this.salvarPontoOffline(ponto);
    }
  }

  private salvarPontoOffline(ponto: TelemetriaGpsPonto): void {
    if (!this.config) return;

    try {
      enqueueDurableOfflineEvent(
        `dev_${this.config.motoristaId}`,
        this.config.veiculoId,
        this.config.viagemId,
        "GPS_TELEMETRY",
        ponto,
      );
      this.pontosBufferCount++;
      this.atualizarEstado({
        pontosEmBufferOffline: this.pontosBufferCount,
        statusConexao: "OFFLINE",
      });
    } catch (err: any) {
      console.error("[ContinuousGPS] Erro crítico ao gravar buffer offline:", err.message);
    }
  }

  private async descarregarBufferOffline(): Promise<void> {
    // Sincronização automática quando conexão retornar
    if (this.pontosBufferCount > 0) {
      this.atualizarEstado({ statusConexao: "RECONECTANDO" });
      setTimeout(() => {
        this.pontosBufferCount = 0;
        this.atualizarEstado({
          pontosEmBufferOffline: 0,
          statusConexao: "ONLINE",
        });
      }, 1500);
    }
  }

  private tratarErroGps(err: GeolocationPositionError): void {
    let msg = "Falha ao obter coordenadas GPS.";
    switch (err.code) {
      case err.PERMISSION_DENIED:
        msg = "Permissão de GPS negada pelo motorista.";
        break;
      case err.POSITION_UNAVAILABLE:
        msg = "Sinal de satélite GPS indisponível.";
        break;
      case err.TIMEOUT:
        msg = "Tempo limite para captura de satélites excedido.";
        break;
    }

    this.atualizarEstado({
      erroGps: msg,
      satelitesAtivos: false,
    });
    this.config?.onError?.(msg);
  }

  private atualizarEstado(patch: Partial<EstadoContinuousGps>): void {
    this.estadoAtual = { ...this.estadoAtual, ...patch };
    this.config?.onEstadoMudou?.(this.getEstado());
  }
}

// Instância Singleton do Motor de GPS Contínuo
export const continuousGpsEngine = new ContinuousGpsManager();
