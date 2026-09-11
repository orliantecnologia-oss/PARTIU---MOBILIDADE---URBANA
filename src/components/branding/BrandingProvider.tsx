import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  type AppBrandingRecord,
  type BrandingContextValue,
  DEFAULT_BRANDING,
  BRANDING_PRESETS,
  themeEngine,
} from "@/lib/branding";
import { supabase } from "@/integrations/supabase/client";
import { silentCatchWarn } from "@/lib/structured-logger";

const STORAGE_KEY_BRANDING = "partiu_active_branding_v2";
const STORAGE_KEY_TENANT = "partiu_active_tenant_id_v2";

export const BrandingContext = createContext<BrandingContextValue | null>(null);

function getInitialTenantId(): string {
  if (typeof window === "undefined") return "default";
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get("tenant") || urlParams.get("tenant_id");
    if (tenantParam) return tenantParam.trim();

    const stored = localStorage.getItem(STORAGE_KEY_TENANT);
    if (stored) return stored.trim();
  } catch {}
  return "default";
}

function getInitialBranding(tenantId: string): AppBrandingRecord {
  if (typeof window === "undefined") return DEFAULT_BRANDING;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_BRANDING);
    if (stored) {
      const parsed = JSON.parse(stored) as AppBrandingRecord;
      if (parsed && (parsed.tenant_id === tenantId || tenantId === "default")) {
        return parsed;
      }
    }
  } catch {}
  return { ...DEFAULT_BRANDING, tenant_id: tenantId };
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [activeTenantId, setActiveTenantIdState] = useState<string>(getInitialTenantId);
  const [branding, setBrandingState] = useState<AppBrandingRecord>(() => {
    const init = getInitialBranding(getInitialTenantId());
    themeEngine.applyTheme(init);
    return init;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const activeTenantRef = useRef(activeTenantId);
  activeTenantRef.current = activeTenantId;

  // Aplicação de tema síncrona
  const applyBrandingTheme = useCallback((b: AppBrandingRecord) => {
    setBrandingState(b);
    themeEngine.applyTheme(b);
    try {
      localStorage.setItem(STORAGE_KEY_BRANDING, JSON.stringify(b));
    } catch {}
  }, []);

  // Busca do Supabase
  const fetchTenantBranding = useCallback(async (tenantId: string) => {
    setIsLoading(true);
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from("app_branding" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (error) {
        // Se a tabela não existir ou outro erro suave de rede
        silentCatchWarn("BrandingProvider:fetchTenantBranding", error);
      } else if (data) {
        const loaded = data as unknown as AppBrandingRecord;
        applyBrandingTheme(loaded);
        setLastSyncedAt(new Date());
      } else if (tenantId !== "default") {
        // Fallback para default
        const { data: defaultData } = await supabase
          .from("app_branding" as any)
          .select("*")
          .eq("tenant_id", "default")
          .maybeSingle();
        if (defaultData) {
          applyBrandingTheme(defaultData as unknown as AppBrandingRecord);
          setLastSyncedAt(new Date());
        }
      }
    } catch (err) {
      silentCatchWarn("BrandingProvider:fetchTenantBranding:exception", err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [applyBrandingTheme]);

  // Carregar e sincronizar quando o activeTenantId mudar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TENANT, activeTenantId);
    } catch {}

    fetchTenantBranding(activeTenantId);

    // Canal Realtime Supabase
    const channel = supabase
      .channel(`realtime_branding_${activeTenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_branding",
        },
        (payload) => {
          const newRec = payload.new as unknown as AppBrandingRecord;
          if (newRec && (newRec.tenant_id === activeTenantRef.current || newRec.tenant_id === "default")) {
            applyBrandingTheme(newRec);
            setLastSyncedAt(new Date());
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTenantId, fetchTenantBranding, applyBrandingTheme]);

  // Alternar Tenant
  const setTenantId = useCallback(async (newTenantId: string) => {
    const cleanId = newTenantId.trim();
    if (!cleanId || cleanId === activeTenantRef.current) return;
    setActiveTenantIdState(cleanId);
    await fetchTenantBranding(cleanId);
  }, [fetchTenantBranding]);

  // Atualizar branding no banco e localmente
  const updateBranding = useCallback(async (partial: Partial<AppBrandingRecord>): Promise<boolean> => {
    setIsSyncing(true);
    const updated: AppBrandingRecord = {
      ...branding,
      ...partial,
      tenant_id: activeTenantRef.current,
      updated_at: new Date().toISOString(),
    };

    // Aplica imediatamente na UI (Zero Latency)
    applyBrandingTheme(updated);

    try {
      const { error } = await supabase
        .from("app_branding" as any)
        .upsert(updated as any, { onConflict: "tenant_id" });

      if (error) {
        silentCatchWarn("BrandingProvider:updateBranding:db", error);
        return false;
      }
      setLastSyncedAt(new Date());
      return true;
    } catch (err) {
      silentCatchWarn("BrandingProvider:updateBranding:exception", err);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [branding, applyBrandingTheme]);

  // Aplicar Preset em 1 clique
  const applyPreset = useCallback(async (presetId: string): Promise<boolean> => {
    const preset = BRANDING_PRESETS.find((p) => p.id === presetId);
    if (!preset) return false;

    const merged: AppBrandingRecord = {
      ...branding,
      ...preset.branding,
      tenant_id: activeTenantRef.current,
    };

    return updateBranding(merged);
  }, [branding, updateBranding]);

  // Upload de Mídia para Supabase Storage (branding-assets)
  const uploadAsset = useCallback(async (file: File, type: "logo" | "splash" | "favicon"): Promise<string | null> => {
    if (!file) return null;

    // Validação rígida: tamanho máximo 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new Error("O arquivo excede o limite máximo permitido de 5MB.");
    }

    // Validação de tipo MIME
    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Formato inválido. Apenas PNG, SVG, WEBP e JPEG são aceitos.");
    }

    try {
      const fileExt = file.name.split(".").pop() || "png";
      const fileName = `${activeTenantRef.current}_${type}_${Date.now()}.${fileExt}`;
      const filePath = `tenants/${fileName}`;

      const { data, error } = await supabase.storage
        .from("branding-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from("branding-assets")
        .getPublicUrl(filePath);

      const url = publicUrlData?.publicUrl;
      if (url) {
        const patch: Partial<AppBrandingRecord> = {};
        if (type === "logo") patch.logo_url = url;
        if (type === "splash") patch.splash_logo_url = url;
        if (type === "favicon") patch.favicon_url = url;
        await updateBranding(patch);
        return url;
      }
      return null;
    } catch (err: any) {
      silentCatchWarn("BrandingProvider:uploadAsset", err);
      throw err;
    }
  }, [updateBranding]);

  // Resetar aos padrões canônicos
  const resetToDefault = useCallback(async (): Promise<boolean> => {
    return updateBranding({
      ...DEFAULT_BRANDING,
      tenant_id: activeTenantRef.current,
    });
  }, [updateBranding]);

  const value = useMemo<BrandingContextValue>(
    () => ({
      branding,
      activeTenantId,
      isLoading,
      isSyncing,
      lastSyncedAt,
      setTenantId,
      updateBranding,
      applyPreset,
      uploadAsset,
      resetToDefault,
    }),
    [
      branding,
      activeTenantId,
      isLoading,
      isSyncing,
      lastSyncedAt,
      setTenantId,
      updateBranding,
      applyPreset,
      uploadAsset,
      resetToDefault,
    ]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}
