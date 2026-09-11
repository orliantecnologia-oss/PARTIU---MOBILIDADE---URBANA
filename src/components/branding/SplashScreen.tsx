import React, { useEffect, useState } from "react";
import { useBranding } from "@/hooks/useBranding";

export interface SplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export function SplashScreen({ onFinish, minDurationMs = 1200 }: SplashScreenProps) {
  const { branding, isLoading } = useBranding();
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      const closeTimer = setTimeout(() => {
        setIsVisible(false);
        onFinish?.();
      }, 400);
      return () => clearTimeout(closeTimer);
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [minDurationMs, onFinish]);

  if (!isVisible) return null;

  const logoSrc = branding.splash_logo_url || branding.logo_url || "/favicon.svg";

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none transition-opacity duration-400 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        background: `linear-gradient(180deg, ${branding.header_gradient_start} 0%, ${branding.background_color} 100%)`,
        color: branding.text_primary,
      }}
      aria-label="Inicializando aplicativo"
    >
      {/* Círculos de Brilho de Fundo */}
      <div
        className="absolute w-72 h-72 rounded-full opacity-20 blur-3xl animate-pulse pointer-events-none"
        style={{ background: branding.secondary_color }}
      />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm">
        {/* Logo com Efeito Suave */}
        <div
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl p-4 flex items-center justify-center shadow-2xl ring-4 ring-white/10 mb-6 transition-transform transform scale-100 animate-in fade-in zoom-in duration-500"
          style={{
            backgroundColor: branding.surface_color,
            borderRadius: branding.border_radius || "24px",
          }}
        >
          <img
            src={logoSrc}
            alt={branding.app_name}
            className="w-full h-full object-contain filter drop-shadow-md"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        </div>

        {/* Nome do Aplicativo Dinâmico */}
        <h1
          className="text-3xl sm:text-4xl font-black tracking-tight drop-shadow-sm mb-1"
          style={{ color: branding.text_primary }}
        >
          {branding.app_name}
        </h1>

        {/* Nome da Empresa / Slogan */}
        <p
          className="text-sm font-medium opacity-80 max-w-xs"
          style={{ color: branding.text_secondary }}
        >
          {branding.company_name}
        </p>

        {/* Indicador de Carregamento Estilizado */}
        <div className="mt-8 flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full animate-bounce"
            style={{ backgroundColor: branding.secondary_color, animationDelay: "0ms" }}
          />
          <span
            className="w-2.5 h-2.5 rounded-full animate-bounce"
            style={{ backgroundColor: branding.secondary_color, animationDelay: "150ms" }}
          />
          <span
            className="w-2.5 h-2.5 rounded-full animate-bounce"
            style={{ backgroundColor: branding.secondary_color, animationDelay: "300ms" }}
          />
        </div>
      </div>

      {/* Rodapé Seguro */}
      <div className="absolute bottom-6 text-[11px] font-semibold opacity-60 tracking-wider uppercase">
        Mobilidade Urbana & Entregas
      </div>
    </div>
  );
}
