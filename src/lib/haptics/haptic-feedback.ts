/**
 * Native Haptic Feedback Engine
 * Proporciona resposta tátil de nível nativo (iOS / Android) para interações
 * críticas do passageiro: troca de categoria, snap points do bottom sheet,
 * confirmação de corrida e alertas de status.
 */

export type HapticPattern = 'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

class HapticFeedbackEngine {
  private isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    );
  }

  private trigger(pattern: number | number[]): boolean {
    if (!this.isSupported()) return false;
    try {
      return navigator.vibrate(pattern);
    } catch {
      // Ignora silenciosamente restrições de permissão do browser
      return false;
    }
  }

  /**
   * Micro-pulso (8ms) ao cruzar a linha de transição de um snap point ou alternar tabs.
   */
  selection(): boolean {
    return this.trigger(8);
  }

  /**
   * Pulso nítido (12ms) ao tocar em botões secundários, atalhos de endereço ou trocar forma de pagamento.
   */
  light(): boolean {
    return this.trigger(12);
  }

  /**
   * Pulso afirmativo (22ms) ao alternar entre categorias (Partiu Moto vs. Partiu Carro).
   */
  medium(): boolean {
    return this.trigger(22);
  }

  /**
   * Impacto firme (35ms) ao confirmar a corrida no botão principal (CTA).
   */
  heavy(): boolean {
    return this.trigger(35);
  }

  /**
   * Sequência comemorativa [15ms, 40ms, 20ms] ao encontrar motorista parceiro.
   */
  success(): boolean {
    return this.trigger([15, 40, 20]);
  }

  /**
   * Vibração de alerta [30ms, 50ms, 30ms] em cancelamentos ou timeout.
   */
  warning(): boolean {
    return this.trigger([30, 50, 30]);
  }

  /**
   * Padrão de erro crítico [40ms, 60ms, 40ms, 60ms, 40ms].
   */
  error(): boolean {
    return this.trigger([40, 60, 40, 60, 40]);
  }
}

export const hapticFeedback = new HapticFeedbackEngine();
