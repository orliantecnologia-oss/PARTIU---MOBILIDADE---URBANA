import React from "react";

interface DeliveryVehicleIllustrationsProps {
  className?: string;
}

export function DeliveryVehicleIllustrations({ className = "" }: DeliveryVehicleIllustrationsProps) {
  return (
    <div className={`w-full flex items-center justify-center gap-6 py-2 select-none ${className}`}>
      {/* 1. MOTO COM PACOTE */}
      <div className="flex items-center gap-1 relative group hover:scale-105 transition-transform duration-300">
        {/* Caixa de Encomenda */}
        <div className="relative z-10 w-11 h-11 -mr-2 drop-shadow-md">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Topo da Caixa */}
            <polygon points="50,15 82,32 50,48 18,32" fill="#F59E0B" />
            <polygon points="50,15 66,23.5 50,32 34,23.5" fill="#D97706" opacity="0.3" />
            {/* Lado Esquerdo */}
            <polygon points="18,32 50,48 50,85 18,68" fill="#D97706" />
            {/* Lado Direito */}
            <polygon points="50,48 82,32 82,68 50,85" fill="#B45309" />
            {/* Fita de Encomenda */}
            <path d="M 46,17 L 54,21 L 54,83 L 46,79 Z" fill="#FDE68A" opacity="0.9" />
            {/* Símbolo de Entrega Rápida (Raio) */}
            <polygon points="34,48 39,48 37,56 42,56 32,68 35,58 31,58" fill="#FEF3C7" />
          </svg>
        </div>

        {/* Moto Vetorial Estilizada */}
        <div className="w-24 h-20 relative drop-shadow-lg">
          <svg viewBox="0 0 160 120" className="w-full h-full">
            <defs>
              <linearGradient id="motoBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#E2E8F0" />
              </linearGradient>
              <linearGradient id="motoAccentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0F172A" />
                <stop offset="100%" stopColor="#1E293B" />
              </linearGradient>
            </defs>
            {/* Sombra de Chão */}
            <ellipse cx="80" cy="108" rx="65" ry="7" fill="#000000" opacity="0.12" />

            {/* Roda Traseira */}
            <circle cx="38" cy="86" r="22" fill="#0F172A" />
            <circle cx="38" cy="86" r="16" fill="#1E293B" />
            <circle cx="38" cy="86" r="11" fill="#F59E0B" />
            <circle cx="38" cy="86" r="5" fill="#0F172A" />

            {/* Roda Dianteira */}
            <circle cx="124" cy="86" r="22" fill="#0F172A" />
            <circle cx="124" cy="86" r="16" fill="#1E293B" />
            <circle cx="124" cy="86" r="11" fill="#F59E0B" />
            <circle cx="124" cy="86" r="5" fill="#0F172A" />

            {/* Quadro e Transmissão */}
            <path d="M 40,84 L 75,80 L 88,58 L 56,58 Z" fill="url(#motoAccentGrad)" />
            <path d="M 75,80 L 105,74 L 112,50 L 90,52 Z" fill="#334155" />

            {/* Garfo Dianteiro */}
            <line x1="124" y1="86" x2="108" y2="40" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />

            {/* Carenagem Principal (Branca Aerodinâmica) */}
            <path
              d="M 50,56 C 55,42 70,40 86,42 C 98,43 112,46 116,52 C 114,60 102,68 88,68 C 72,68 58,64 50,56 Z"
              fill="url(#motoBodyGrad)"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />

            {/* Banco Anatômico */}
            <path d="M 44,48 C 50,46 64,46 72,50 C 70,54 58,54 44,52 Z" fill="#0F172A" />

            {/* Guidão e Manetes */}
            <line x1="106" y1="40" x2="114" y2="34" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
            <circle cx="116" cy="32" r="3" fill="#F59E0B" />

            {/* Farol Dianteiro LED */}
            <path d="M 116,48 L 122,50 L 118,55 Z" fill="#38BDF8" opacity="0.9" />
          </svg>
        </div>
      </div>

      {/* 2. CARRO COM PACOTE */}
      <div className="flex items-center gap-1 relative group hover:scale-105 transition-transform duration-300">
        {/* Caixa de Encomenda */}
        <div className="relative z-10 w-11 h-11 -mr-2 drop-shadow-md">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Topo da Caixa */}
            <polygon points="50,15 82,32 50,48 18,32" fill="#F59E0B" />
            <polygon points="50,15 66,23.5 50,32 34,23.5" fill="#D97706" opacity="0.3" />
            {/* Lado Esquerdo */}
            <polygon points="18,32 50,48 50,85 18,68" fill="#D97706" />
            {/* Lado Direito */}
            <polygon points="50,48 82,32 82,68 50,85" fill="#B45309" />
            {/* Fita de Encomenda */}
            <path d="M 46,17 L 54,21 L 54,83 L 46,79 Z" fill="#FDE68A" opacity="0.9" />
            {/* Símbolo de Entrega Rápida (Raio) */}
            <polygon points="34,48 39,48 37,56 42,56 32,68 35,58 31,58" fill="#FEF3C7" />
          </svg>
        </div>

        {/* Carro Vetorial Estilizado */}
        <div className="w-28 h-20 relative drop-shadow-lg">
          <svg viewBox="0 0 180 120" className="w-full h-full">
            <defs>
              <linearGradient id="carBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#E2E8F0" />
              </linearGradient>
              <linearGradient id="carGlassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0F172A" />
                <stop offset="100%" stopColor="#1E293B" />
              </linearGradient>
            </defs>
            {/* Sombra de Chão */}
            <ellipse cx="90" cy="106" rx="75" ry="8" fill="#000000" opacity="0.14" />

            {/* Roda Traseira */}
            <circle cx="46" cy="90" r="19" fill="#0F172A" />
            <circle cx="46" cy="90" r="14" fill="#1E293B" />
            <circle cx="46" cy="90" r="9" fill="#F59E0B" />
            <circle cx="46" cy="90" r="4" fill="#0F172A" />

            {/* Roda Dianteira */}
            <circle cx="136" cy="90" r="19" fill="#0F172A" />
            <circle cx="136" cy="90" r="14" fill="#1E293B" />
            <circle cx="136" cy="90" r="9" fill="#F59E0B" />
            <circle cx="136" cy="90" r="4" fill="#0F172A" />

            {/* Base Inferior do Chassi */}
            <path d="M 30,90 L 152,90 L 150,82 L 32,82 Z" fill="#0F172A" />

            {/* Carroceria Principal */}
            <path
              d="M 22,82 C 22,76 28,72 38,72 C 48,72 56,76 62,80 L 120,80 C 126,76 134,72 144,72 C 154,72 162,76 164,82 C 168,82 170,76 166,68 C 160,58 144,55 128,52 C 108,40 76,40 50,50 C 34,56 22,64 22,82 Z"
              fill="url(#carBodyGrad)"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />

            {/* Vidro / Teto Preto Estilizado */}
            <path
              d="M 55,52 C 75,44 105,44 122,54 C 114,64 68,64 55,52 Z"
              fill="url(#carGlassGrad)"
            />

            {/* Farol Dianteiro LED */}
            <path d="M 160,70 C 165,71 168,73 166,76 L 156,76 Z" fill="#38BDF8" opacity="0.9" />

            {/* Lanterna Traseira LED */}
            <path d="M 22,70 C 20,72 20,74 22,76 L 28,76 Z" fill="#EF4444" opacity="0.8" />
          </svg>
        </div>
      </div>
    </div>
  );
}
