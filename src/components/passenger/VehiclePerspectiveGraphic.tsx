import React, { memo } from "react";

export interface VehiclePerspectiveGraphicProps {
  category: "MOTO" | "CARRO";
  className?: string | undefined;
}

/**
 * Ilustração vetorial em perspectiva 3/4 realista da Honda CG 160 Titan (Moto)
 * e do Sedã Executivo Moderno (Carro) — Modelo idêntico ao Uber / 99 padrão ouro.
 */
export const VehiclePerspectiveGraphic = memo(function VehiclePerspectiveGraphic({
  category,
  className = "w-20 h-16",
}: VehiclePerspectiveGraphicProps) {
  if (category === "MOTO") {
    return (
      <svg
        viewBox="0 0 160 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Honda CG 160 Titan"
      >
        <defs>
          <filter id="bike-ground-shadow" x="-10%" y="70%" width="120%" height="40%" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="3" />
            <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.35 0" />
          </filter>
          <linearGradient id="tank-metal-grad" x1="50" y1="25" x2="110" y2="55" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="35%" stopColor="#1E293B" />
            <stop offset="85%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <linearGradient id="exhaust-chrome" x1="70" y1="75" x2="140" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#64748B" />
            <stop offset="45%" stopColor="#E2E8F0" />
            <stop offset="80%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <linearGradient id="seat-leather" x1="75" y1="35" x2="120" y2="45" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#27272A" />
            <stop offset="100%" stopColor="#09090B" />
          </linearGradient>
        </defs>

        {/* Sombra no solo */}
        <ellipse cx="80" cy="96" rx="65" ry="8" fill="#000000" filter="url(#bike-ground-shadow)" />

        {/* RODA TRASEIRA (Pneu + Aro Preto com Borda Amarela) */}
        <circle cx="130" cy="74" r="22" fill="#090D16" stroke="#000000" strokeWidth="2" />
        <circle cx="130" cy="74" r="16" fill="#18181B" stroke="#FACC15" strokeWidth="2.5" />
        <circle cx="130" cy="74" r="8" fill="#334155" />
        <circle cx="130" cy="74" r="3.5" fill="#CBD5E1" />

        {/* RODA DIANTEIRA (Pneu + Aro Preto com Borda Amarela) */}
        <circle cx="34" cy="75" r="23" fill="#090D16" stroke="#000000" strokeWidth="2" />
        <circle cx="34" cy="75" r="17" fill="#18181B" stroke="#FACC15" strokeWidth="2.5" />
        {/* Disco de Freio Dianteiro Perfurado */}
        <circle cx="34" cy="75" r="11" fill="none" stroke="#94A3B8" strokeWidth="2.2" strokeDasharray="3 2" />
        <circle cx="34" cy="75" r="4.5" fill="#CBD5E1" />

        {/* Bengala / Garfo de Suspensão Dianteira */}
        <line x1="34" y1="75" x2="52" y2="34" stroke="#94A3B8" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="34" y1="75" x2="52" y2="34" stroke="#475569" strokeWidth="2" strokeLinecap="round" />

        {/* Para-lama Dianteiro Preto */}
        <path d="M22 62 Q33 50 48 57" stroke="#0F172A" strokeWidth="4.5" strokeLinecap="round" fill="none" />

        {/* Bloco do Motor e Cárter */}
        <path d="M62 65 Q75 60 92 64 Q94 78 80 84 Q65 82 62 65 Z" fill="#1E293B" stroke="#0F172A" strokeWidth="1.8" />
        {/* Aletas de Refrigeração do Motor */}
        <line x1="68" y1="69" x2="88" y2="69" stroke="#475569" strokeWidth="1.5" />
        <line x1="69" y1="73" x2="87" y2="73" stroke="#475569" strokeWidth="1.5" />
        <line x1="71" y1="77" x2="84" y2="77" stroke="#475569" strokeWidth="1.5" />

        {/* Tubo e Ponteira de Escapamento Esportivo (Cromado/Grafite) */}
        <path d="M68 76 Q78 86 98 83 L138 68 L142 74 L100 89 Q76 90 65 80 Z" fill="url(#exhaust-chrome)" stroke="#334155" strokeWidth="1" />
        <circle cx="140" cy="71" r="2.5" fill="#090D16" />

        {/* Quadro / Chassi Tubular */}
        <path d="M52 35 L70 56 L112 60 L128 72" stroke="#090D16" strokeWidth="3" strokeLinecap="round" fill="none" />

        {/* Carenagem Lateral e Tampa Lateral Preta */}
        <path d="M72 52 L94 52 L96 66 L74 65 Z" fill="#0F172A" stroke="#1E293B" strokeWidth="1" />

        {/* Tanque de Combustível CG 160 Titan (Musculoso com Friso) */}
        <path d="M48 38 C52 30, 68 26, 82 28 C92 30, 96 42, 88 50 C76 52, 54 50, 48 38 Z" fill="url(#tank-metal-grad)" stroke="#090D16" strokeWidth="1.8" />
        {/* Detalhe de Friso Esportivo Amarelo Honda */}
        <path d="M60 37 Q74 36 84 44" stroke="#EAB308" strokeWidth="1.8" strokeLinecap="round" fill="none" />

        {/* Assento Ergonômico Titan 160 */}
        <path d="M84 38 C90 34, 108 36, 126 43 C124 49, 114 52, 94 48 C88 47, 85 42, 84 38 Z" fill="url(#seat-leather)" stroke="#090D16" strokeWidth="1.5" />
        {/* Costura sutil do banco */}
        <line x1="96" y1="41" x2="114" y2="44" stroke="#3F3F46" strokeWidth="1" />

        {/* Carenagem Traseira / Rabeta Afilada */}
        <path d="M120 44 L138 48 L136 54 L118 50 Z" fill="#0F172A" stroke="#1E293B" strokeWidth="1" />
        {/* Lanterna Traseira LED Vermelha */}
        <polygon points="137,47 142,48 140,52 136,51" fill="#EF4444" stroke="#B91C1C" strokeWidth="0.5" />

        {/* Farol Dianteiro / Carenagem Frontal com Máscara Negra */}
        <path d="M42 36 L52 28 L50 44 L40 46 Z" fill="#0F172A" stroke="#1E293B" strokeWidth="1.2" />
        <path d="M41 38 L45 35 L43 43 Z" fill="#F8FAFC" opacity="0.95" />

        {/* Guidão Esportivo com Manoplas e Retrovisores */}
        <line x1="46" y1="28" x2="56" y2="24" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="42" y="27" width="5" height="2.5" rx="1" fill="#090D16" />
        {/* Retrovisores Esportivos */}
        <line x1="47" y1="27" x2="44" y2="18" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
        <ellipse cx="43" cy="17" rx="3.5" ry="2" fill="#0F172A" stroke="#475569" strokeWidth="1" transform="rotate(-20 43 17)" />
        <line x1="53" y1="24" x2="54" y2="15" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
        <ellipse cx="54" cy="14" rx="3.5" ry="2" fill="#0F172A" stroke="#475569" strokeWidth="1" transform="rotate(-10 54 14)" />
      </svg>
    );
  }

  // Ilustração do Carro (Sedã Executivo Preto/Prata em Perspectiva)
  return (
    <svg
      viewBox="0 0 160 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Carro Executivo"
    >
      <defs>
        <filter id="car-ground-shadow" x="-10%" y="65%" width="120%" height="45%" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="3.5" />
          <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.35 0" />
        </filter>
        <linearGradient id="car-side-body" x1="20" y1="25" x2="140" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="35%" stopColor="#1E293B" />
          <stop offset="70%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="car-window-glass" x1="40" y1="30" x2="110" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="50%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
      </defs>

      {/* Sombra no solo */}
      <ellipse cx="80" cy="85" rx="68" ry="8" fill="#000000" filter="url(#car-ground-shadow)" />

      {/* Roda Dianteira */}
      <circle cx="42" cy="70" r="16" fill="#090D16" stroke="#000000" strokeWidth="1.5" />
      <circle cx="42" cy="70" r="11" fill="#1E293B" stroke="#94A3B8" strokeWidth="1.8" />
      <circle cx="42" cy="70" r="4" fill="#CBD5E1" />

      {/* Roda Traseira */}
      <circle cx="120" cy="70" r="16" fill="#090D16" stroke="#000000" strokeWidth="1.5" />
      <circle cx="120" cy="70" r="11" fill="#1E293B" stroke="#94A3B8" strokeWidth="1.8" />
      <circle cx="120" cy="70" r="4" fill="#CBD5E1" />

      {/* Chassi do Carro Sedã */}
      <path
        d="M18 64 C22 55, 34 54, 44 54 L62 38 C75 27, 98 27, 116 38 L138 48 C144 52, 148 58, 146 66 C144 72, 134 72, 128 72 L34 72 C22 72, 16 70, 18 64 Z"
        fill="url(#car-side-body)"
        stroke="#090D16"
        strokeWidth="1.8"
      />

      {/* Vidros Laterais e Coluna Central B */}
      <path
        d="M62 40 C72 32, 94 32, 110 40 L128 47 L65 47 Z"
        fill="url(#car-window-glass)"
        stroke="#090D16"
        strokeWidth="1.2"
      />
      {/* Coluna B */}
      <line x1="88" y1="33" x2="88" y2="47" stroke="#090D16" strokeWidth="2.5" />

      {/* Farol Dianteiro Cristalino */}
      <path d="M18 58 L28 56 L24 64 Z" fill="#F8FAFC" opacity="0.95" />
      {/* Lanterna Traseira LED Vermelha */}
      <path d="M142 54 L146 58 L144 64 L138 62 Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="0.5" />

      {/* Retrovisor Lateral */}
      <polygon points="56,43 64,43 62,47 55,46" fill="#0F172A" stroke="#334155" strokeWidth="0.8" />
    </svg>
  );
});
