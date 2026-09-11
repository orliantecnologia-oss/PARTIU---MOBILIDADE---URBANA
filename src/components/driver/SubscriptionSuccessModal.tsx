/**
 * ==============================================================================
 * 🎉 PARTIU SUBSCRIPTION SUCCESS MODAL (UX DE LIBERAÇÃO INSTANTÂNEA)
 * ==============================================================================
 * Exibição comemorativa automática após confirmação do webhook:
 * - Mensagem oficial: "🎉 Dia liberado! Boas corridas."
 * - Chuva visual de confetti e partículas douradas.
 * - Haptic feedback veicular.
 * - Sintetizador de áudio de conquista (Web Audio API).
 * - Desbloqueio e fechamento automático após 2 segundos sem reload.
 * ==============================================================================
 */

import React, { useEffect, useState } from "react";
import { CheckCircle2, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { silentCatchWarn } from "@/lib/structured-logger";
import { useBrandTheme } from "@/hooks/useBrandTheme";

interface SubscriptionSuccessModalProps {
  isOpen: boolean;
  onComplete: () => void;
  title?: string;
  subtitle?: string;
}

export function SubscriptionSuccessModal({
  isOpen,
  onComplete,
  title = "🎉 Dia liberado!",
  subtitle = "Boas corridas. Você está 100% livre de comissões.",
}: SubscriptionSuccessModalProps) {
  const { corPrimaria, corSecundaria, corTextoPrimaria, corCabecalhoInicio, corCabecalhoFim, branding } = useBrandTheme();
  const accentColor = branding?.accent_color || corSecundaria || "#00C6FF";
  const [countdown, setCountdown] = useState(2);

  // Toca tom sintetizado de sucesso (Web Audio API sem dependências externas)
  useEffect(() => {
    if (!isOpen) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        // Acorde triunfal maior (Dó - Mi - Sol - Dó maior)
        const freqs = [523.25, 659.25, 783.99, 1046.5];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);

          gain.gain.setValueAtTime(0.001, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.5);
        });
      }
    } catch (err) { silentCatchWarn("SubscriptionSuccessModal", err); }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Chuva de Partículas de Confetti (CSS Puro e Seguro) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-bounce"
            style={{
              top: `${Math.random() * 80}%`,
              left: `${Math.random() * 95}%`,
              width: `${Math.random() * 10 + 6}px`,
              height: `${Math.random() * 10 + 6}px`,
              backgroundColor: ["#10B981", "#F59E0B", "#3B82F6", "#EC4899", "#8B5CF6"][i % 5],
              opacity: 0.85,
              animationDuration: `${Math.random() * 1.5 + 1}s`,
              animationDelay: `${Math.random() * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div
        style={{
          borderColor: `${accentColor}80`,
          boxShadow: `0 20px 50px -10px ${corPrimaria}60`,
        }}
        className="relative bg-slate-900 border-2 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center text-white space-y-4 animate-in zoom-in-95 duration-200"
      >
        <div
          style={{
            backgroundColor: `${corPrimaria}30`,
            borderColor: accentColor,
            color: accentColor,
            boxShadow: `0 8px 25px -4px ${corPrimaria}50`,
          }}
          className="w-20 h-20 rounded-full border-2 flex items-center justify-center mx-auto"
        >
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
          <p className="text-sm text-slate-300 font-medium">{subtitle}</p>
        </div>

        <div
          style={{
            backgroundColor: `${corPrimaria}20`,
            borderColor: `${corPrimaria}40`,
            color: accentColor,
          }}
          className="p-3 rounded-2xl border text-xs flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Ativação Instantânea Reconhecida via Webhook</span>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onComplete}
            style={{
              background: `linear-gradient(135deg, ${corCabecalhoInicio}, ${corCabecalhoFim})`,
              color: corTextoPrimaria,
              boxShadow: `0 8px 25px -4px ${corPrimaria}60`,
            }}
            className="w-full h-14 rounded-2xl font-black text-sm shadow-xl transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-white/20"
          >
            <span>ENTRAR NO COCKPIT ({countdown}s)</span>
            <Zap className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
