/**
 * ==============================================================================
 * 🧭 PARTIU DRIVER OS — EXTERNAL NAVIGATION LAUNCHER
 * ==============================================================================
 * Dispara navegação curva-a-curva em aplicativos externos (Waze e Google Maps)
 * com suporte nativo a esquemas de URI móveis (Android / iOS) e fallback Web.
 * ==============================================================================
 */

export interface NavigationTarget {
  address: string;
  lat?: number;
  lng?: number;
}

export type NavigationProvider = "waze" | "google_maps";

export function getWazeUrl(target: NavigationTarget): string {
  if (target.lat !== undefined && target.lng !== undefined) {
    return `https://www.waze.com/ul?ll=${target.lat},${target.lng}&navigate=yes`;
  }
  return `https://www.waze.com/ul?q=${encodeURIComponent(target.address)}&navigate=yes`;
}

export function getGoogleMapsUrl(target: NavigationTarget): string {
  if (target.lat !== undefined && target.lng !== undefined) {
    return `https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target.address)}&travelmode=driving`;
}

export function openExternalNavigation(
  target: NavigationTarget,
  provider: NavigationProvider = "google_maps"
): void {
  if (typeof window === "undefined") return;

  const userAgent = navigator.userAgent || "";
  const isAndroid = /android/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;

  if (provider === "waze") {
    // Tenta protocolo nativo do Waze ou cai para URL universal
    const wazeNativeUri =
      target.lat !== undefined && target.lng !== undefined
        ? `waze://?ll=${target.lat},${target.lng}&navigate=yes`
        : `waze://?q=${encodeURIComponent(target.address)}&navigate=yes`;

    const webFallbackUrl = getWazeUrl(target);

    if (isAndroid || isIOS) {
      // Cria tentativa de abrir app nativo com fallback
      const start = Date.now();
      window.location.href = wazeNativeUri;

      setTimeout(() => {
        // Se após 1.5s o app não assumiu o controle, abre Google Maps como fallback confiável
        if (Date.now() - start < 2000) {
          window.open(getGoogleMapsUrl(target), "_blank");
        }
      }, 1500);
    } else {
      window.open(webFallbackUrl, "_blank");
    }
  } else {
    // Google Maps
    if (isAndroid) {
      const gmapsIntent =
        target.lat !== undefined && target.lng !== undefined
          ? `google.navigation:q=${target.lat},${target.lng}&mode=d`
          : `google.navigation:q=${encodeURIComponent(target.address)}&mode=d`;
      window.location.href = gmapsIntent;
    } else if (isIOS) {
      const appleOrGmaps =
        target.lat !== undefined && target.lng !== undefined
          ? `comgooglemaps://?daddr=${target.lat},${target.lng}&directionsmode=driving`
          : `https://maps.apple.com/?daddr=${encodeURIComponent(target.address)}&dirflg=d`;
      window.location.href = appleOrGmaps;
    } else {
      window.open(getGoogleMapsUrl(target), "_blank");
    }
  }
}
