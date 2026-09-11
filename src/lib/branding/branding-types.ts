/**
 * ==============================================================================
 * 🏷️ PARTIU WHITE LABEL & MULTI-TENANT SAAS — BRANDING TYPES
 * ==============================================================================
 */

export interface AppBrandingRecord {
  id?: string;
  tenant_id: string;
  app_name: string;
  company_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_primary: string;
  text_secondary: string;
  logo_url?: string | null;
  splash_logo_url?: string | null;
  favicon_url?: string | null;
  header_gradient_start: string;
  header_gradient_end: string;
  footer_sync_with_header?: boolean;
  footer_gradient_start?: string;
  footer_gradient_end?: string;
  border_radius: string;
  font_family: string;
  created_at?: string;
  updated_at?: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  previewColors: {
    primary: string;
    secondary: string;
    accent: string;
    gradientStart: string;
    gradientEnd: string;
  };
  branding: Omit<AppBrandingRecord, "id" | "created_at" | "updated_at">;
}

export interface BrandingContextValue {
  branding: AppBrandingRecord;
  activeTenantId: string;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  setTenantId: (tenantId: string) => Promise<void>;
  updateBranding: (partial: Partial<AppBrandingRecord>) => Promise<boolean>;
  applyPreset: (presetId: string) => Promise<boolean>;
  uploadAsset: (file: File, type: "logo" | "splash" | "favicon") => Promise<string | null>;
  resetToDefault: () => Promise<boolean>;
}
