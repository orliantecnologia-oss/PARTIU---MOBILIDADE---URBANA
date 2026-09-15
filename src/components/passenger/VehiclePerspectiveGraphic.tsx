import React, { memo } from "react";

export interface VehiclePerspectiveGraphicProps {
  category: "MOTO" | "CARRO" | "POP" | "PLUS" | string;
  className?: string | undefined;
}

/**
 * 🚗 VEHICLE PERSPECTIVE GRAPHIC — ILUSTRAÇÃO VETORIAL 3D DOS VEÍCULOS OFICIAIS
 * ==============================================================================
 * Renderizações de alta fidelidade baseadas em Lealt Recomendado/4.png e 6.png:
 * 1. MOTO: Moto azul ágil com detalhes cromados e esportivos
 * 2. POP / CARRO: Hatchback branco puro (Chevrolet Onix)
 * 3. PLUS: SUV Executivo grafite/preto imponente com vidros fumê
 * ==============================================================================
 */
export const VehiclePerspectiveGraphic = memo(function VehiclePerspectiveGraphic({
  category,
  className = "w-20 h-16",
}: VehiclePerspectiveGraphicProps) {
  const cat = category.toUpperCase();

  // 1. ILUSTRAÇÃO DA MOTO AZUL (PARTIU MOTO - PADRÃO 4.PNG)
  if (cat === "MOTO") {
    return (
      <svg
        viewBox="0 0 160 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Partiu Moto"
      >
        <defs>
          <filter id="moto-shadow" x="-10%" y="70%" width="120%" height="40%" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="3" />
            <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.35 0" />
          </filter>
          <linearGradient id="moto-blue" x1="45" y1="20" x2="105" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00A2FF" />
            <stop offset="50%" stopColor="#0088FF" />
            <stop offset="100%" stopColor="#0055B3" />
          </linearGradient>
        </defs>

        {/* Sombra no solo */}
        <ellipse cx="80" cy="96" rx="65" ry="8" fill="#000000" filter="url(#moto-shadow)" />

        {/* Roda Traseira */}
        <circle cx="130" cy="74" r="22" fill="#090D16" stroke="#000000" strokeWidth="2" />
        <circle cx="130" cy="74" r="16" fill="#18181B" stroke="#0088FF" strokeWidth="2.5" />
        <circle cx="130" cy="74" r="8" fill="#334155" />
        <circle cx="130" cy="74" r="3.5" fill="#CBD5E1" />

        {/* Roda Dianteira */}
        <circle cx="34" cy="75" r="23" fill="#090D16" stroke="#000000" strokeWidth="2" />
        <circle cx="34" cy="75" r="17" fill="#18181B" stroke="#0088FF" strokeWidth="2.5" />
        <circle cx="34" cy="75" r="8" fill="#334155" />
        <circle cx="34" cy="75" r="3.5" fill="#CBD5E1" />

        {/* Garfo Dianteiro Suspensão */}
        <line x1="49" y1="36" x2="34" y2="75" stroke="#94A3B8" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="51" y1="38" x2="36" y2="75" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />

        {/* Motor e Escapamento */}
        <path d="M72 60 L110 60 L115 76 L78 78 Z" fill="#334155" stroke="#1E293B" strokeWidth="1.5" />
        <path d="M78 68 L138 78 L142 74 L84 64 Z" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1" />

        {/* Tanque de Combustível Azul #0088FF */}
        <path
          d="M52 38 C56 31, 74 27, 92 34 C97 38, 98 47, 85 50 C70 51, 56 46, 52 38 Z"
          fill="url(#moto-blue)"
          stroke="#0055B3"
          strokeWidth="1.5"
        />

        {/* Assento de Couro Escuro */}
        <path
          d="M87 36 C95 36, 114 38, 126 44 C123 48, 115 50, 92 48 C85 45, 84 39, 87 36 Z"
          fill="#18181B"
          stroke="#090D16"
          strokeWidth="1.2"
        />

        {/* Guidão e Manoplas */}
        <path d="M46 32 L56 22 L62 25" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
        <circle cx="56" cy="22" r="3" fill="#0088FF" />

        {/* Farol Dianteiro */}
        <path d="M38 36 C34 39, 34 46, 39 48 L44 42 Z" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1" />
      </svg>
    );
  }

  // 2. ILUSTRAÇÃO DO SUV ESCURO (PARTIU PLUS - PADRÃO 4.PNG)
  if (cat === "PLUS" || cat === "EXECUTIVO") {
    return (
      <svg
        viewBox="0 0 160 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Partiu Plus SUV"
      >
        <defs>
          <filter id="plus-shadow" x="-10%" y="65%" width="120%" height="45%" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="3.5" />
            <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.4 0" />
          </filter>
          <linearGradient id="suv-body" x1="20" y1="20" x2="140" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="35%" stopColor="#1E293B" />
            <stop offset="70%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <linearGradient id="suv-glass" x1="40" y1="25" x2="110" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
        </defs>

        {/* Sombra no solo */}
        <ellipse cx="80" cy="86" rx="68" ry="8" fill="#000000" filter="url(#plus-shadow)" />

        {/* Roda Dianteira Robusta */}
        <circle cx="42" cy="70" r="17" fill="#090D16" stroke="#000000" strokeWidth="1.5" />
        <circle cx="42" cy="70" r="12" fill="#1E293B" stroke="#64748B" strokeWidth="2" />
        <circle cx="42" cy="70" r="4" fill="#94A3B8" />

        {/* Roda Traseira Robusta */}
        <circle cx="120" cy="70" r="17" fill="#090D16" stroke="#000000" strokeWidth="1.5" />
        <circle cx="120" cy="70" r="12" fill="#1E293B" stroke="#64748B" strokeWidth="2" />
        <circle cx="120" cy="70" r="4" fill="#94A3B8" />

        {/* Carroceria SUV Alta */}
        <path
          d="M16 62 C18 52, 28 50, 38 50 L56 32 C68 22, 102 22, 122 32 L142 45 C147 48, 150 56, 147 65 C144 72, 134 72, 128 72 L34 72 C22 72, 14 70, 16 62 Z"
          fill="url(#suv-body)"
          stroke="#090D16"
          strokeWidth="1.8"
        />

        {/* Vidros Fumê do SUV */}
        <path
          d="M58 35 C68 26, 100 26, 118 35 L132 45 L62 45 Z"
          fill="url(#suv-glass)"
          stroke="#090D16"
          strokeWidth="1.2"
        />
        {/* Coluna Central */}
        <line x1="90" y1="28" x2="90" y2="45" stroke="#090D16" strokeWidth="2.5" />

        {/* Rack de Teto SUV */}
        <line x1="62" y1="23" x2="114" y2="23" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />

        {/* Farol Dianteiro Xenon */}
        <path d="M16 56 L26 54 L22 62 Z" fill="#E2E8F0" opacity="0.95" />
        {/* Lanterna Traseira LED Vermelha */}
        <path d="M144 50 L148 56 L145 62 L140 60 Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="0.5" />
      </svg>
    );
  }

  // 3. ILUSTRAÇÃO DO HATCHBACK BRANCO (PARTIU POP - PADRÃO 4.PNG E 6.PNG)
  return (
    <svg
      viewBox="0 0 160 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Partiu Pop Onix Branco"
    >
      <defs>
        <filter id="pop-shadow" x="-10%" y="65%" width="120%" height="45%" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="3.5" />
          <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.35 0" />
        </filter>
        <linearGradient id="pop-body" x1="20" y1="25" x2="140" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#F1F5F9" />
          <stop offset="85%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        <linearGradient id="pop-glass" x1="40" y1="30" x2="110" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0284C7" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Sombra no solo */}
      <ellipse cx="80" cy="85" rx="68" ry="8" fill="#000000" filter="url(#pop-shadow)" />

      {/* Roda Dianteira */}
      <circle cx="42" cy="70" r="16" fill="#090D16" stroke="#000000" strokeWidth="1.5" />
      <circle cx="42" cy="70" r="11" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.8" />
      <circle cx="42" cy="70" r="4" fill="#0088FF" />

      {/* Roda Traseira */}
      <circle cx="120" cy="70" r="16" fill="#090D16" stroke="#000000" strokeWidth="1.5" />
      <circle cx="120" cy="70" r="11" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.8" />
      <circle cx="120" cy="70" r="4" fill="#0088FF" />

      {/* Chassi do Onix Branco */}
      <path
        d="M18 64 C22 55, 34 54, 44 54 L62 38 C75 27, 98 27, 116 38 L138 48 C144 52, 148 58, 146 66 C144 72, 134 72, 128 72 L34 72 C22 72, 16 70, 18 64 Z"
        fill="url(#pop-body)"
        stroke="#94A3B8"
        strokeWidth="1.5"
      />

      {/* Vidros Laterais Claros com Reflexo */}
      <path
        d="M62 40 C72 32, 94 32, 110 40 L128 47 L65 47 Z"
        fill="url(#pop-glass)"
        stroke="#64748B"
        strokeWidth="1.2"
      />
      {/* Coluna Central */}
      <line x1="88" y1="33" x2="88" y2="47" stroke="#334155" strokeWidth="2.5" />

      {/* Farol Dianteiro com Acento Azul */}
      <path d="M18 58 L28 56 L24 64 Z" fill="#0088FF" opacity="0.9" />
      {/* Lanterna Traseira LED Vermelha */}
      <path d="M142 54 L146 58 L144 64 L138 62 Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="0.5" />

      {/* Retrovisor Lateral */}
      <polygon points="56,43 64,43 62,47 55,46" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="0.8" />
    </svg>
  );
});

export default VehiclePerspectiveGraphic;
