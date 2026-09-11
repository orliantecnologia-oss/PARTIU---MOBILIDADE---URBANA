import { useContext } from "react";
import { BrandingContext } from "@/components/branding/BrandingProvider";
import { type BrandingContextValue, DEFAULT_BRANDING } from "@/lib/branding";

export function useBranding(): BrandingContextValue {
  const context = useContext(BrandingContext);

  if (!context) {
    // Fallback defensivo caso usado fora do provider
    return {
      branding: DEFAULT_BRANDING,
      activeTenantId: "default",
      isLoading: false,
      isSyncing: false,
      lastSyncedAt: null,
      setTenantId: async () => {},
      updateBranding: async () => false,
      applyPreset: async () => false,
      uploadAsset: async () => null,
      resetToDefault: async () => false,
    };
  }

  return context;
}
