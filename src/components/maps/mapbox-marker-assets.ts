import mapboxgl from "mapbox-gl";
import { CAR_PREMIUM_PNG_DATA_URI } from "@/assets/car-premium-base64";
import { MOTO_PREMIUM_PNG_DATA_URI } from "@/assets/moto-premium-base64";

/**
 * 🗺️ MAPBOX PREMIUM MARKER ASSETS & GEOJSON SYMBOL LAYERS (PARTIU V4)
 * ==============================================================================
 * Gerenciador de assets vetoriais e volumétricos de alta resolução:
 * 1. `car-icon` / `car-premium`: SUV / Crossover Branco 3D realista com teto solar
 *    fumê, vidros escurecidos, faróis em LED e sombra de contato difusa no asfalto.
 * 2. `moto-icon` / `moto-premium`: Motocicleta esportiva com piloto de jaqueta e
 *    capacete aerodinâmico, guidão com retrovisores e sombra projetada.
 * 3. `origin-pin`: Pino minimalista verde esmeralda com círculo central branco.
 * 4. `destination-pin`: Pino minimalista preto/dourado de chegada.
 * 5. `pulsing-dot`: Animação dinâmica de radar de navegação do passageiro.
 * ==============================================================================
 */

// SVG Top-Down de Carro Sedã Executivo Moderno (Preto/Grafite Metálico)
export const CAR_TOPDOWN_SVG = `
<svg width="64" height="128" viewBox="0 0 64 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Sombra Suave Difusa no Asfalto (Padrão Uber / 99) -->
    <filter id="car-shadow" x="-20%" y="-10%" width="140%" height="130%" filterUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.42 0"/>
    </filter>
    <!-- Carroceria Grafite/Preto Metálico Premium -->
    <linearGradient id="car-body" x1="16" y1="16" x2="48" y2="114" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="35%" stop-color="#1E293B"/>
      <stop offset="70%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#090D16"/>
    </linearGradient>
    <!-- Teto com Reflexo Suave -->
    <linearGradient id="roof-grad" x1="32" y1="50" x2="32" y2="82" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1E293B"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </linearGradient>
    <!-- Vidro Fumê com Reflexo Suave de Céu -->
    <linearGradient id="windshield-grad" x1="32" y1="34" x2="32" y2="52" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1E293B"/>
      <stop offset="40%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
  </defs>

  <!-- 1. Sombra do Veículo no Asfalto -->
  <g filter="url(#car-shadow)">
    <rect x="14" y="16" width="36" height="96" rx="16" fill="#000000"/>
  </g>

  <!-- 2. Rodas / Pneus com Ranhuras Discretas nas Cavidades -->
  <rect x="11" y="26" width="4" height="16" rx="2" fill="#090D16"/>
  <rect x="49" y="26" width="4" height="16" rx="2" fill="#090D16"/>
  <rect x="11" y="86" width="4" height="16" rx="2" fill="#090D16"/>
  <rect x="49" y="86" width="4" height="16" rx="2" fill="#090D16"/>

  <!-- 3. Chassi Aerodinâmico do Sedã Moderno -->
  <path d="M21 16 C25 13, 39 13, 43 16 C48 20, 50 32, 50 50 L50 82 C50 102, 48 112, 43 114 C38 116, 26 116, 21 114 C16 112, 14 102, 14 82 L14 50 C14 32, 16 20, 21 16 Z" 
        fill="url(#car-body)" stroke="#090D16" stroke-width="1.8"/>

  <!-- Vincos Aerodinâmicos no Capô Dianteiro -->
  <path d="M24 18 Q26 28 27 34" stroke="#475569" stroke-width="1" stroke-linecap="round"/>
  <path d="M40 18 Q38 28 37 34" stroke="#475569" stroke-width="1" stroke-linecap="round"/>

  <!-- Faróis Dianteiros em LED Cristalino -->
  <path d="M16 18 C18 16, 22 16, 24 18 L23 23 L16 21 Z" fill="#F8FAFC" opacity="0.95"/>
  <path d="M48 18 C46 16, 42 16, 40 18 L41 23 L48 21 Z" fill="#F8FAFC" opacity="0.95"/>
  <circle cx="20" cy="19" r="1.5" fill="#38BDF8" opacity="0.8"/>
  <circle cx="44" cy="19" r="1.5" fill="#38BDF8" opacity="0.8"/>

  <!-- Retrovisores Laterais Aerodinâmicos -->
  <path d="M9 39 C9 37, 14 37, 14 41 L14 48 C14 50, 9 50, 9 47 Z" fill="#0F172A" stroke="#334155" stroke-width="1"/>
  <path d="M55 39 C55 37, 50 37, 50 41 L50 48 C50 50, 55 50, 55 47 Z" fill="#0F172A" stroke="#334155" stroke-width="1"/>

  <!-- Para-brisa Dianteiro (Curvado, Vidro Fumê com Reflexo Suave) -->
  <path d="M19 36 L45 36 C47 43, 46 48, 45 51 L19 51 C18 48, 17 43, 19 36 Z" 
        fill="url(#windshield-grad)" stroke="#090D16" stroke-width="1.2"/>
  <!-- Reflexo Especular Diagonal no Para-brisa -->
  <line x1="22" y1="38" x2="30" y2="49" stroke="#94A3B8" stroke-width="1" stroke-linecap="round" opacity="0.4"/>

  <!-- Teto do Carro com Detalhe de Teto Solar Fumê -->
  <path d="M20 52 L44 52 C45 56, 45 74, 44 78 L20 78 C19 74, 19 56, 20 52 Z" 
        fill="url(#roof-grad)" stroke="#090D16" stroke-width="1.2"/>
  <rect x="24" y="55" width="16" height="14" rx="2.5" fill="#090D16" stroke="#334155" stroke-width="1" opacity="0.85"/>

  <!-- Vidro Traseiro -->
  <path d="M21 80 L43 80 L42 89 L22 89 Z" 
        fill="url(#windshield-grad)" stroke="#090D16" stroke-width="1.2"/>

  <!-- Tampa do Porta-Malas e Lanterna Traseira LED Vermelha -->
  <rect x="16" y="111" width="8" height="3" rx="1" fill="#EF4444" stroke="#991B1B" stroke-width="0.5"/>
  <rect x="40" y="111" width="8" height="3" rx="1" fill="#EF4444" stroke="#991B1B" stroke-width="0.5"/>
  <line x1="26" y1="112" x2="38" y2="112" stroke="#334155" stroke-width="1"/>
</svg>
`;

// SVG Top-Down de Motocicleta com Condutor de Capacete (Honda CG 160 Titan Standard Uber/99)
export const MOTO_TOPDOWN_SVG = `
<svg width="64" height="128" viewBox="0 0 64 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Sombra Suave e Realista Projetada no Asfalto -->
    <filter id="moto-shadow" x="-20%" y="-10%" width="140%" height="130%" filterUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation="3.5" result="blur"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.45 0"/>
    </filter>
    <!-- Gradiente Metálico do Chassi e Tanque -->
    <linearGradient id="moto-body-grad" x1="32" y1="20" x2="32" y2="85" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="50%" stop-color="#1E293B"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </linearGradient>
    <!-- Gradiente do Capacete e Visor -->
    <linearGradient id="helmet-grad" x1="24" y1="42" x2="40" y2="58" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="40%" stop-color="#1E293B"/>
      <stop offset="100%" stop-color="#090D16"/>
    </linearGradient>
    <linearGradient id="visor-reflection" x1="26" y1="41" x2="38" y2="47" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#0284C7" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </linearGradient>
    <!-- Gradiente do Escape Metálico -->
    <linearGradient id="exhaust-grad" x1="42" y1="65" x2="45" y2="105" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#94A3B8"/>
      <stop offset="50%" stop-color="#CBD5E1"/>
      <stop offset="100%" stop-color="#64748B"/>
    </linearGradient>
  </defs>

  <!-- 1. Camada de Sombra Suave no Asfalto -->
  <g filter="url(#moto-shadow)">
    <ellipse cx="32" cy="65" rx="14" ry="46" fill="#000000"/>
  </g>

  <!-- 2. Roda Dianteira e Pneu com Ranhuras -->
  <rect x="30" y="10" width="4" height="24" rx="2" fill="#0F172A"/>
  <rect x="31" y="14" width="2" height="16" rx="1" fill="#1E293B"/>

  <!-- 3. Para-lama Dianteiro Preto/Grafite com Friso Aerodinâmico -->
  <path d="M28 18 C28 14, 36 14, 36 18 L35 28 L29 28 Z" fill="#1E293B" stroke="#0F172A" stroke-width="1"/>
  <line x1="32" y1="16" x2="32" y2="27" stroke="#475569" stroke-width="1"/>

  <!-- 4. Escapamento Cromado/Aço no Lado Direito -->
  <path d="M38 72 L42 74 L44 98 L40 100 Z" fill="url(#exhaust-grad)" stroke="#334155" stroke-width="1"/>
  <circle cx="42" cy="100" r="1.8" fill="#0F172A"/>

  <!-- 5. Guidão Esportivo com Manoplas e Retrovisores Angulados -->
  <!-- Barra Principal do Guidão -->
  <path d="M14 29 Q32 32 50 29" stroke="#1E293B" stroke-width="3" stroke-linecap="round"/>
  <!-- Manoplas Pretas com pesos de guidão -->
  <rect x="11" y="27" width="7" height="4.5" rx="2" fill="#0F172A" stroke="#334155" stroke-width="0.8"/>
  <rect x="46" y="27" width="7" height="4.5" rx="2" fill="#0F172A" stroke="#334155" stroke-width="0.8"/>
  <!-- Manetes de Freio e Embreagem -->
  <line x1="15" y1="26" x2="21" y2="28" stroke="#94A3B8" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="49" y1="26" x2="43" y2="28" stroke="#94A3B8" stroke-width="1.2" stroke-linecap="round"/>
  <!-- Espelhos Retrovisores Esportivos -->
  <ellipse cx="10" cy="23" rx="4" ry="2.2" transform="rotate(-25 10 23)" fill="#0F172A" stroke="#475569" stroke-width="1"/>
  <ellipse cx="54" cy="23" rx="4" ry="2.2" transform="rotate(25 54 23)" fill="#0F172A" stroke="#475569" stroke-width="1"/>
  <line x1="11" y1="24" x2="15" y2="28" stroke="#334155" stroke-width="1.5"/>
  <line x1="53" y1="24" x2="49" y2="28" stroke="#334155" stroke-width="1.5"/>

  <!-- Painel Digital Central (Display LCD) -->
  <rect x="29" y="28" width="6" height="4" rx="1" fill="#0F172A" stroke="#334155" stroke-width="0.8"/>
  <rect x="30" y="29" width="4" height="2" rx="0.5" fill="#38BDF8" opacity="0.85"/>

  <!-- 6. Tanque de Combustível Preto Perolizado com Detalhes e Frisos -->
  <path d="M26 33 C26 31, 38 31, 38 33 L40 50 C40 53, 24 53, 24 50 Z" fill="url(#moto-body-grad)" stroke="#090D16" stroke-width="1.5"/>
  <!-- Tampa do Tanque Cromada -->
  <circle cx="32" cy="38" r="2.2" fill="#94A3B8" stroke="#0F172A" stroke-width="0.8"/>
  <!-- Frisos Laterais de Brilho / Detalhe Amarelo Sutil Honda -->
  <path d="M25 38 L25 46" stroke="#EAB308" stroke-width="1" stroke-linecap="round" opacity="0.9"/>
  <path d="M39 38 L39 46" stroke="#EAB308" stroke-width="1" stroke-linecap="round" opacity="0.9"/>

  <!-- 7. Condutor (Piloto): Braços, Jaqueta e Ombros Vistos de Cima -->
  <!-- Braço Esquerdo -->
  <path d="M16 30 Q22 42 24 49" stroke="#1E293B" stroke-width="4.5" stroke-linecap="round"/>
  <!-- Braço Direito -->
  <path d="M48 30 Q42 42 40 49" stroke="#1E293B" stroke-width="4.5" stroke-linecap="round"/>
  <!-- Ombros e Tronco do Piloto -->
  <path d="M20 54 Q32 57 44 54 Q46 62 42 66 Q32 68 22 66 Q18 62 20 54 Z" fill="#0F172A" stroke="#1E293B" stroke-width="1"/>

  <!-- 8. Capacete Aerodinâmico com Visor Espelhado Escuro -->
  <ellipse cx="32" cy="49" rx="9" ry="10" fill="url(#helmet-grad)" stroke="#0F172A" stroke-width="1.5"/>
  <!-- Detalhes de Entrada de Ar do Capacete -->
  <line x1="30" y1="56" x2="34" y2="56" stroke="#334155" stroke-width="1.2" stroke-linecap="round"/>
  <!-- Viseira / Visor com Reflexo Curvado -->
  <path d="M25 45 C27 41, 37 41, 39 45 L38 48 C36 45, 28 45, 26 48 Z" fill="url(#visor-reflection)" stroke="#0F172A" stroke-width="0.8"/>

  <!-- 9. Assento Biposto Confortável em Couro Preto -->
  <path d="M26 67 C26 65, 38 65, 38 67 L37 87 C37 89, 27 89, 27 87 Z" fill="#18181B" stroke="#0F172A" stroke-width="1.2"/>
  <line x1="28" y1="76" x2="36" y2="76" stroke="#27272A" stroke-width="1"/>

  <!-- Alças Traseiras / Bagageiro de Apoio -->
  <path d="M25 84 Q24 90 27 92" stroke="#64748B" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <path d="M39 84 Q40 90 37 92" stroke="#64748B" stroke-width="1.8" stroke-linecap="round" fill="none"/>

  <!-- 10. Roda Traseira e Lanterna Traseira LED Vermelha -->
  <rect x="30" y="88" width="4" height="24" rx="2" fill="#0F172A"/>
  <!-- Lanterna Traseira / Luz de Freio -->
  <path d="M29 93 L35 93 L34 96 L30 96 Z" fill="#EF4444" stroke="#B91C1C" stroke-width="0.8"/>
  <ellipse cx="32" cy="94" rx="2" ry="1" fill="#F87171"/>
</svg>
`;

// SVG Pino de Embarque (Origem) — Ancorado na base inferior (center-bottom)
export const ORIGIN_PIN_SVG = `
<svg width="48" height="64" viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="pin-shadow" x="0" y="0" width="48" height="64" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Sombra Elíptica no Solo -->
  <ellipse cx="24" cy="59" rx="8" ry="3" fill="#000000" opacity="0.3"/>
  
  <g filter="url(#pin-shadow)">
    <!-- Corpo do Pino -->
    <path d="M24 58 C24 58, 42 36, 42 22 C42 10.95 33.94 2 24 2 C14.06 2 6 10.95 6 22 C6 36, 24 58, 24 58 Z" 
          fill="#10B981" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>
    <!-- Anel Central com Ponto Branco -->
    <circle cx="24" cy="22" r="7" fill="#FFFFFF"/>
    <circle cx="24" cy="22" r="3.5" fill="#0F172A"/>
  </g>
</svg>
`;

// SVG Pino de Destino (Chegada) — Ancorado na base inferior (center-bottom)
export const DESTINATION_PIN_SVG = `
<svg width="48" height="64" viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="dest-shadow" x="0" y="0" width="48" height="64" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Sombra Elíptica no Solo -->
  <ellipse cx="24" cy="59" rx="8" ry="3" fill="#000000" opacity="0.3"/>

  <g filter="url(#dest-shadow)">
    <!-- Corpo do Pino Preto/Dourado -->
    <path d="M24 58 C24 58, 42 36, 42 22 C42 10.95 33.94 2 24 2 C14.06 2 6 10.95 6 22 C6 36, 24 58, 24 58 Z" 
          fill="#0F172A" stroke="#FFDE00" stroke-width="2.5" stroke-linejoin="round"/>
    <!-- Ícone Central Quadriculado / Alvo -->
    <circle cx="24" cy="22" r="8" fill="#FFDE00"/>
    <circle cx="24" cy="22" r="4" fill="#0F172A"/>
  </g>
</svg>
`;

/**
 * Converte string SVG em HTMLImageElement compatível com map.addImage()
 */
export function createSvgImage(svgString: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Cria o canvas do Pulsing Dot nativo animado do Mapbox
 */
export function createPulsingDot(map: mapboxgl.Map, size: number = 140) {
  return {
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4) as Uint8Array,
    context: null as CanvasRenderingContext2D | null,

    onAdd: function () {
      const canvas = document.createElement("canvas");
      canvas.width = this.width;
      canvas.height = this.height;
      this.context = canvas.getContext("2d", { willReadFrequently: true });
    },

    render: function () {
      const duration = 2200; // Pulso mais lento e suave (padrão 99)
      const t = (performance.now() % duration) / duration;
      const radius = (size / 2) * 0.28;
      const outerRadius = (size / 2) * 0.72 * t + radius;
      const ctx = this.context;

      if (!ctx) return false;

      ctx.clearRect(0, 0, this.width, this.height);

      // 1. Halo azul claro expansivo (99 Blue Pulse — suave e discreto)
      ctx.beginPath();
      ctx.arc(this.width / 2, this.height / 2, outerRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 163, 224, ${Math.max(0, 0.25 * (1 - t))})`;
      ctx.fill();

      // 2. Anel intermediário azul suave (halo estático)
      ctx.beginPath();
      ctx.arc(this.width / 2, this.height / 2, radius + 5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 163, 224, 0.15)";
      ctx.fill();

      // 3. Ponto central sólido azul institucional 99 (#00A3E0) com contorno branco
      ctx.beginPath();
      ctx.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#00A3E0";
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 3;
      ctx.fill();
      ctx.stroke();

      const imgData = ctx.getImageData(0, 0, this.width, this.height);
      this.data = new Uint8Array(imgData.data.buffer);
      map.triggerRepaint();
      return true;
    },
  };
}

/**
 * Converte string Data URI ou URL em HTMLImageElement compatível com map.addImage()
 */
export function createPngImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Registra todos os assets no mapa Mapbox GL JS de forma idempotente
 */
export async function registerAllMapboxMarkers(map: mapboxgl.Map): Promise<void> {
  // 1. Registra o ícone 3D volumétrico do carro (SUV Branco Crossover com teto solar e sombra de contato)
  try {
    const carImg = await createPngImage(CAR_PREMIUM_PNG_DATA_URI);
    if (!map.hasImage("car-icon")) {
      map.addImage("car-icon", carImg, { pixelRatio: 2 });
    }
    if (!map.hasImage("car-premium")) {
      map.addImage("car-premium", carImg, { pixelRatio: 2 });
    }
  } catch (e) {
    console.warn("[MapboxAssets] Fallback para SVG do carro:", e);
    try {
      const carSvg = await createSvgImage(CAR_TOPDOWN_SVG);
      if (!map.hasImage("car-icon")) map.addImage("car-icon", carSvg, { pixelRatio: 2 });
      if (!map.hasImage("car-premium")) map.addImage("car-premium", carSvg, { pixelRatio: 2 });
    } catch (_) {}
  }

  // 2. Registra o ícone 3D da moto (Motocicleta com Piloto - PNG transparente do usuário)
  try {
    const motoImg = await createPngImage(MOTO_PREMIUM_PNG_DATA_URI);
    if (!map.hasImage("moto-icon")) {
      map.addImage("moto-icon", motoImg, { pixelRatio: 2 });
    }
    if (!map.hasImage("moto-premium")) {
      map.addImage("moto-premium", motoImg, { pixelRatio: 2 });
    }
  } catch (e) {
    console.warn("[MapboxAssets] Fallback para SVG da moto:", e);
    try {
      const motoSvg = await createSvgImage(MOTO_TOPDOWN_SVG);
      if (!map.hasImage("moto-icon")) map.addImage("moto-icon", motoSvg, { pixelRatio: 2 });
      if (!map.hasImage("moto-premium")) map.addImage("moto-premium", motoSvg, { pixelRatio: 2 });
    } catch (_) {}
  }

  // 3. Registra assets vetoriais complementares (pinos de embarque e destino)
  const imagesToLoad: { id: string; svg: string }[] = [
    { id: "origin-pin", svg: ORIGIN_PIN_SVG },
    { id: "destination-pin", svg: DESTINATION_PIN_SVG },
  ];

  for (const item of imagesToLoad) {
    if (!map.hasImage(item.id)) {
      try {
        const img = await createSvgImage(item.svg);
        if (!map.hasImage(item.id)) {
          map.addImage(item.id, img, { pixelRatio: 2 });
        }
      } catch (e) {
        console.warn(`[MapboxAssets] Falha ao registrar imagem ${item.id}:`, e);
      }
    }
  }

  }
}
