/**
 * ==============================================================================
 * 🔊 PARTIU DRIVER OS — VOICE ASSISTANT & TTS ENGINE (v1.0)
 * ==============================================================================
 * Motor de síntese de voz (Text-to-Speech) integrado ao cockpit do motorista.
 * Permite que condutores parceiros escutem mensagens do passageiro e alertas
 * operacionais em viva-voz enquanto dirigem, aumentando drasticamente a segurança
 * no trânsito e a conformidade com as leis de direção.
 * ==============================================================================
 */

export class DriverVoiceAssistantService {
  private static instance: DriverVoiceAssistantService;
  private isEnabled: boolean = true;
  private isSupported: boolean = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private listeners: Set<(enabled: boolean) => void> = new Set();

  private constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.isSupported = true;
      const saved = localStorage.getItem("partiu:driver:tts_enabled");
      this.isEnabled = saved !== null ? saved === "true" : true;

      // Inicializa vozes disponíveis
      this.initVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  public static getInstance(): DriverVoiceAssistantService {
    if (!DriverVoiceAssistantService.instance) {
      DriverVoiceAssistantService.instance = new DriverVoiceAssistantService();
    }
    return DriverVoiceAssistantService.instance;
  }

  private initVoices(): void {
    if (!this.isSupported) return;
    try {
      const voices = window.speechSynthesis.getVoices();
      // Prioriza vozes em Português do Brasil (pt-BR)
      const ptBrVoice = voices.find(
        (v) => v.lang.toLowerCase() === "pt-br" || v.lang.toLowerCase() === "pt_br"
      );
      const ptVoice = voices.find((v) => v.lang.toLowerCase().startsWith("pt"));
      this.selectedVoice = ptBrVoice || ptVoice || null;
    } catch {
      this.selectedVoice = null;
    }
  }

  /**
   * Verifica se a síntese de voz é suportada pelo navegador/ambiente
   */
  public getIsSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Retorna se a leitura por voz está ativada no momento
   */
  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Alterna a leitura por voz (ligado/desligado)
   */
  public toggleVoice(): boolean {
    this.isEnabled = !this.isEnabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("partiu:driver:tts_enabled", String(this.isEnabled));
      if (!this.isEnabled && this.isSupported) {
        window.speechSynthesis.cancel();
      }
    }
    this.notifyListeners();
    return this.isEnabled;
  }

  /**
   * Define o estado de ativação
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("partiu:driver:tts_enabled", String(this.isEnabled));
      if (!this.isEnabled && this.isSupported) {
        window.speechSynthesis.cancel();
      }
    }
    this.notifyListeners();
  }

  /**
   * Inscreve um listener para atualizações de estado do assistente
   */
  public subscribe(callback: (enabled: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.isEnabled);
      } catch {
        // Ignora falhas em listeners individuais
      }
    }
  }

  /**
   * Executa a síntese de voz com sanitização do texto
   */
  public speak(
    text: string,
    options: {
      priority?: "NORMAL" | "HIGH";
      rate?: number;
      pitch?: number;
    } = {}
  ): void {
    if (!this.isSupported || !this.isEnabled || !text.trim()) return;

    try {
      if (options.priority === "HIGH") {
        window.speechSynthesis.cancel();
      }

      // Sanitiza texto removendo caracteres especiais ou URLs que poluiriam a fala
      const cleanText = text
        .replace(/https?:\/\/\S+/gi, "link")
        .replace(/[*_~`]/g, "")
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "pt-BR";
      utterance.rate = options.rate ?? 1.05; // Levemente mais dinâmico
      utterance.pitch = options.pitch ?? 1.0;

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("[DriverVoiceAssistant] Erro ao reproduzir síntese de voz:", err);
    }
  }

  /**
   * Lê uma nova mensagem do chat em voz alta
   */
  public speakIncomingMessage(senderName: string, text: string): void {
    const nome = senderName ? senderName.split(" ")[0] : "Passageiro";
    this.speak(`Mensagem de ${nome}: ${text}`, { priority: "HIGH" });
  }

  /**
   * Lê um aviso operacional ou instrução de rota
   */
  public speakAlert(alertText: string): void {
    this.speak(alertText, { priority: "HIGH" });
  }

  /**
   * Interrompe qualquer fala em andamento imediatamente
   */
  public stop(): void {
    if (this.isSupported) {
      window.speechSynthesis.cancel();
    }
  }
}

export const driverVoiceAssistant = DriverVoiceAssistantService.getInstance();
