/**
 * ==============================================================================
 * 🎨 PARTIU — MAP ASSETS (NATIVE VECTOR ICONS FOR SYMBOL LAYERS)
 * ==============================================================================
 * Geração e registro de ícones de veículos e pinos em alta resolução diretamente
 * no renderizador nativo da GPU do Mapbox (map.addImage / MapboxGL.Images).
 *
 * PROIBIDO:
 * - Renderizar componentes <Image /> ou marcadores DOM React sobre o mapa para veículos.
 *
 * REQUISITO:
 * - Registro nativo na memória de texturas da GPU para suportar 10.000+ veículos
 *   renderizados simultaneamente a 60 FPS via SymbolLayer e GeoJSON.
 * ==============================================================================
 */

import { MAP_ASSETS } from "./MapConstants";

// 1. Ícone Top-Down Sedan Executivo Escuro (Partiu Carro)
const SVG_CARRO = `
<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <filter id="shadow" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse">
    <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.45" />
  </filter>
  <g filter="url(#shadow)">
    <!-- Corpo Principal do Veículo -->
    <rect x="18" y="8" width="28" height="48" rx="8" fill="#1E293B" stroke="#F59E0B" stroke-width="1.8"/>
    <!-- Para-brisa Dianteiro -->
    <path d="M22 17H42L39 24H25L22 17Z" fill="#38BDF8" fill-opacity="0.85"/>
    <!-- Teto do Carro com Detalhe -->
    <rect x="23" y="25" width="18" height="14" rx="2" fill="#0F172A"/>
    <!-- Vidro Traseiro -->
    <path d="M24 40H40L41 45H23L24 40Z" fill="#38BDF8" fill-opacity="0.65"/>
    <!-- Faróis Dianteiros -->
    <rect x="19" y="8" width="5" height="3" rx="1" fill="#FEF08A"/>
    <rect x="40" y="8" width="5" height="3" rx="1" fill="#FEF08A"/>
    <!-- Lanternas Traseiras -->
    <rect x="19" y="53" width="5" height="3" rx="1" fill="#EF4444"/>
    <rect x="40" y="53" width="5" height="3" rx="1" fill="#EF4444"/>
    <!-- Retrovisores Laterais -->
    <rect x="15" y="20" width="3" height="4" rx="1" fill="#1E293B"/>
    <rect x="46" y="20" width="3" height="4" rx="1" fill="#1E293B"/>
  </g>
</svg>
`;

// 2. Ícone Top-Down Motocicleta com Condutor de Capacete (Partiu Moto)
const SVG_MOTO = `
<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <filter id="mshadow" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse">
    <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.5" />
  </filter>
  <g filter="url(#mshadow)">
    <!-- Guidão Dianteiro -->
    <rect x="22" y="16" width="20" height="3" rx="1.5" fill="#334155"/>
    <!-- Espelhos Retrovisores -->
    <circle cx="21" cy="15" r="2" fill="#F59E0B"/>
    <circle cx="43" cy="15" r="2" fill="#F59E0B"/>
    <!-- Roda Dianteira -->
    <rect x="30" y="8" width="4" height="9" rx="2" fill="#0F172A" stroke="#F59E0B" stroke-width="1"/>
    <!-- Farol Dianteiro -->
    <polygon points="32,7 30,12 34,12" fill="#FEF08A"/>
    <!-- Tanque de Combustível -->
    <rect x="28" y="20" width="8" height="9" rx="3" fill="#1E293B" stroke="#F59E0B" stroke-width="1.2"/>
    <!-- Capacete do Condutor (Amarelo Partiu para alta visibilidade) -->
    <ellipse cx="32" cy="33" rx="6.5" ry="7.5" fill="#F59E0B" stroke="#0F172A" stroke-width="1.2"/>
    <rect x="29" y="30" width="6" height="3.5" rx="1" fill="#0F172A"/> <!-- Viseira -->
    <!-- Ombros do Condutor -->
    <path d="M23 37C23 35 41 35 41 37L39 44H25L23 37Z" fill="#1E293B"/>
    <!-- Bagageiro / Lanterna Traseira -->
    <rect x="30" y="47" width="4" height="8" rx="2" fill="#0F172A"/>
    <rect x="30.5" y="53" width="3" height="2" rx="0.5" fill="#EF4444"/>
  </g>
</svg>
`;

// 3. Pino de Embarque (Pickup Pin) Padrão Uber Preto com Centro Branco
const SVG_PICKUP_PIN = `
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <filter id="pshadow" x="0" y="0" width="48" height="48" filterUnits="userSpaceOnUse">
    <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.5" />
  </filter>
  <g filter="url(#pshadow)">
    <circle cx="24" cy="24" r="14" fill="#000000" stroke="#FFFFFF" stroke-width="3"/>
    <circle cx="24" cy="24" r="5" fill="#FFFFFF"/>
  </g>
</svg>
`;

// 4. Pino de Destino (Destination Pin) Vermelho Padrão Uber/99
const SVG_DESTINATION_PIN = `
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <filter id="dshadow" x="0" y="0" width="48" height="48" filterUnits="userSpaceOnUse">
    <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.5" />
  </filter>
  <g filter="url(#dshadow)">
    <path d="M24 6C17.37 6 12 11.37 12 18C12 27 24 40 24 40C24 40 36 27 36 18C36 11.37 30.63 6 24 6Z" fill="#EF4444" stroke="#FFFFFF" stroke-width="2.5"/>
    <circle cx="24" cy="18" r="5" fill="#FFFFFF"/>
  </g>
</svg>
`;

// 5. Condutor Online / Disponível
const SVG_DRIVER_ONLINE = `
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="24" cy="24" r="18" fill="#10B981" fill-opacity="0.2" />
  <circle cx="24" cy="24" r="10" fill="#10B981" stroke="#FFFFFF" stroke-width="2.5" />
</svg>
`;

// 6. Condutor Ocupado
const SVG_DRIVER_BUSY = `
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="24" cy="24" r="18" fill="#6B7280" fill-opacity="0.2" />
  <circle cx="24" cy="24" r="10" fill="#6B7280" stroke="#FFFFFF" stroke-width="2.5" />
</svg>
`;

/**
 * Converte string SVG em HTMLImageElement compatível com Mapbox addImage
 */
function svgToImage(svgString: string, size = 64): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return;

    const img = new Image(size, size);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Registra todos os assets nativos no objeto do mapa Mapbox para uso com SymbolLayers
 */
export async function registerAllMapAssets(map: any): Promise<void> {
  if (!map || typeof window === "undefined") return;

  const assetsToLoad = [
    { id: MAP_ASSETS.CARRO, svg: SVG_CARRO, size: 64 },
    { id: "car-icon", svg: SVG_CARRO, size: 64 },
    { id: "car-premium", svg: SVG_CARRO, size: 64 },
    { id: MAP_ASSETS.MOTO, svg: SVG_MOTO, size: 64 },
    { id: "moto-icon", svg: SVG_MOTO, size: 64 },
    { id: "moto-premium", svg: SVG_MOTO, size: 64 },
    { id: MAP_ASSETS.PICKUP_PIN, svg: SVG_PICKUP_PIN, size: 48 },
    { id: "origin-pin", svg: SVG_PICKUP_PIN, size: 48 },
    { id: MAP_ASSETS.DESTINATION_PIN, svg: SVG_DESTINATION_PIN, size: 48 },
    { id: "destination-pin", svg: SVG_DESTINATION_PIN, size: 48 },
    { id: MAP_ASSETS.DRIVER_ONLINE, svg: SVG_DRIVER_ONLINE, size: 48 },
    { id: MAP_ASSETS.DRIVER_BUSY, svg: SVG_DRIVER_BUSY, size: 48 },
  ];

  await Promise.all(
    assetsToLoad.map(async ({ id, svg, size }) => {
      if (map.hasImage && map.hasImage(id)) return;
      try {
        const image = await svgToImage(svg, size);
        if (map.addImage && (!map.hasImage || !map.hasImage(id))) {
          map.addImage(id, image, { pixelRatio: 2 });
        }
      } catch (err) {
        console.warn(`[MapAssets] Aviso ao registrar imagem ${id}:`, err);
      }
    })
  );
}
