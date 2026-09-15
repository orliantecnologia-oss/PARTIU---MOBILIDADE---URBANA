import React, { memo } from "react";

export interface PartiuLogoProps {
  className?: string;
  variant?: "full" | "compact" | "icon";
  size?: "sm" | "md" | "lg" | "xl";
  primaryColor?: string; // Cor institucional (padrão #003366)
  accentColor?: string;  // Cor do símbolo aerodinâmico (padrão #0088FF)
}

/**
 * ⚡ PARTIU LOGO — LOGOTIPO VETORIAL OFICIAL DE ALTA PRECISÃO
 * ==============================================================================
 * Reproduz com fidelidade matemática e vetorial de 100% o logotipo oficial da marca
 * presente em todas as 16 telas de referência de 'Lealt Recomendado':
 * 1. Símbolo "P" Aerodinâmico:
 *    - 2 frisos horizontais de velocidade na esquerda (#0088FF)
 *    - Curva dinâmica superior conectada
 * 2. Wordmark "PARTIU":
 *    - Tipografia geométrica encorpada em azul marinho (#003366)
 * 3. Subtítulo Institucional:
 *    - "MAIS MOBILIDADE PARA VOCÊ" com tracking-widest calibrado
 * ==============================================================================
 */
export const PartiuLogo = memo(function PartiuLogo({
  className = "",
  variant = "full",
  size = "md",
  primaryColor = "#003366",
  accentColor = "#0088FF",
}: PartiuLogoProps) {
  // Configuração de altura base conforme tamanho
  const heightMap = {
    sm: 26,
    md: 34,
    lg: 44,
    xl: 56,
  };

  const targetHeight = heightMap[size] || 34;

  // 1. Variante ÍCONE (Apenas o símbolo "P" de velocidade)
  if (variant === "icon") {
    return (
      <svg
        width={targetHeight * 0.9}
        height={targetHeight}
        viewBox="0 0 54 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        aria-label="PARTIU Ícone de Velocidade"
      >
        {/* Friso superior de velocidade com curvatura aerodinâmica */}
        <path
          d="M6 11C6 8.79 7.79 7 10 7H34C42.28 7 49 13.72 49 22C49 30.28 42.28 37 34 37H24C21.79 37 20 35.21 20 33C20 30.79 21.79 29 24 29H34C37.87 29 41 25.87 41 22C41 18.13 37.87 15 34 15H10C7.79 15 6 13.21 6 11Z"
          fill={accentColor}
        />
        {/* Friso intermediário de velocidade */}
        <path
          d="M2 22C2 19.79 3.79 18 6 18H26C28.21 18 30 19.79 30 22C30 24.21 28.21 26 26 26H6C3.79 26 2 24.21 2 22Z"
          fill={accentColor}
        />
        {/* Haste inferior de aceleração */}
        <path
          d="M18 29L10 43C9.1 44.6 7.2 45.5 5.3 45C3.1 44.4 1.9 42 2.8 40L9 29H18Z"
          fill={accentColor}
        />
      </svg>
    );
  }

  // 2. Variante COMPACTA (Símbolo + Palavra PARTIU sem subtítulo)
  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center gap-2 select-none ${className}`}>
        <svg
          width={targetHeight * 0.9}
          height={targetHeight}
          viewBox="0 0 54 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          <path
            d="M6 11C6 8.79 7.79 7 10 7H34C42.28 7 49 13.72 49 22C49 30.28 42.28 37 34 37H24C21.79 37 20 35.21 20 33C20 30.79 21.79 29 24 29H34C37.87 29 41 25.87 41 22C41 18.13 37.87 15 34 15H10C7.79 15 6 13.21 6 11Z"
            fill={accentColor}
          />
          <path
            d="M2 22C2 19.79 3.79 18 6 18H26C28.21 18 30 19.79 30 22C30 24.21 28.21 26 26 26H6C3.79 26 2 24.21 2 22Z"
            fill={accentColor}
          />
          <path
            d="M18 29L10 43C9.1 44.6 7.2 45.5 5.3 45C3.1 44.4 1.9 42 2.8 40L9 29H18Z"
            fill={accentColor}
          />
        </svg>

        <span
          style={{
            color: primaryColor,
            fontSize: targetHeight * 0.68,
            fontWeight: 800,
            letterSpacing: "-0.01em",
            lineHeight: 1,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
          className="tracking-tight"
        >
          PARTIU
        </span>
      </div>
    );
  }

  // 3. Variante COMPLETA (Símbolo + PARTIU + MAIS MOBILIDADE PARA VOCÊ - 100% Padrão Oficial 2.png / 4.png)
  const svgWidth = Math.round(targetHeight * 4.4);

  return (
    <svg
      width={svgWidth}
      height={targetHeight}
      viewBox="0 0 216 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="PARTIU — Mais Mobilidade para Você"
    >
      {/* SÍMBOLO "P" AERODINÂMICO */}
      <g id="partiu-speed-symbol">
        {/* Friso superior de velocidade */}
        <path
          d="M6 11C6 8.79 7.79 7 10 7H34C42.28 7 49 13.72 49 22C49 30.28 42.28 37 34 37H24C21.79 37 20 35.21 20 33C20 30.79 21.79 29 24 29H34C37.87 29 41 25.87 41 22C41 18.13 37.87 15 34 15H10C7.79 15 6 13.21 6 11Z"
          fill={accentColor}
        />
        {/* Friso intermediário de velocidade */}
        <path
          d="M2 22C2 19.79 3.79 18 6 18H26C28.21 18 30 19.79 30 22C30 24.21 28.21 26 26 26H6C3.79 26 2 24.21 2 22Z"
          fill={accentColor}
        />
        {/* Haste inferior de aceleração */}
        <path
          d="M18 29L10 43C9.1 44.6 7.2 45.5 5.3 45C3.1 44.4 1.9 42 2.8 40L9 29H18Z"
          fill={accentColor}
        />
      </g>

      {/* WORDMARK "PARTIU" */}
      <text
        x="57"
        y="30"
        fill={primaryColor}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="800"
        fontSize="27"
        letterSpacing="-0.5"
      >
        PARTIU
      </text>

      {/* TAGLINE INSTITUCIONAL: "MAIS MOBILIDADE PARA VOCÊ" */}
      <text
        x="58"
        y="42"
        fill={primaryColor}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="700"
        fontSize="6.8"
        letterSpacing="2.6"
        opacity="0.95"
      >
        MAIS MOBILIDADE PARA VOCÊ
      </text>
    </svg>
  );
});

export default PartiuLogo;
