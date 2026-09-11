import { useState, useEffect, useCallback } from "react";
import {
  getIdentidadeVisual,
  type ConfigIdentidadeVisual,
} from "@/lib/superadmin-config";
import {
  whiteLabelEngine,
  type WhiteLabelFullConfig,
  type WhiteLabelTenantRecord,
  type BusinessVerticalId,
  type HomeBlockItem,
} from "@/lib/white-label";

import { useBranding } from "@/hooks/useBranding";

export function useBrandTheme() {
  const brandingCtx = useBranding();
  const branding = brandingCtx?.branding;
  const [identidade, setIdentidade] = useState<ConfigIdentidadeVisual>(() => {
    return getIdentidadeVisual();
  });

  const [config, setConfig] = useState<WhiteLabelFullConfig>(() => {
    return whiteLabelEngine.getActiveConfig();
  });

  const [activeTenant, setActiveTenant] = useState<WhiteLabelTenantRecord>(() => {
    return whiteLabelEngine.getActiveTenant();
  });

  useEffect(() => {
    // Aplica o tema visual no :root ao montar
    whiteLabelEngine.applyTheme(config);

    function handleWhiteLabelAtualizacao(e: any) {
      const novaConfig = e.detail?.config || whiteLabelEngine.getActiveConfig();
      setConfig(novaConfig);
      setActiveTenant(whiteLabelEngine.getActiveTenant());
      whiteLabelEngine.applyTheme(novaConfig);
    }

    function handleIdentidadeLegada(e: any) {
      if (e.detail) {
        setIdentidade(e.detail);
      } else {
        setIdentidade(getIdentidadeVisual());
      }
    }

    window.addEventListener("partiu:whitelabel-updated", handleWhiteLabelAtualizacao);
    window.addEventListener("partiu:identidade-atualizada", handleIdentidadeLegada);
    window.addEventListener("storage", handleWhiteLabelAtualizacao);

    return () => {
      window.removeEventListener("partiu:whitelabel-updated", handleWhiteLabelAtualizacao);
      window.removeEventListener("partiu:identidade-atualizada", handleIdentidadeLegada);
      window.removeEventListener("storage", handleWhiteLabelAtualizacao);
    };
  }, []);

  // Handlers de mutação reativa
  const updateConfig = useCallback(
    (partial: Partial<WhiteLabelFullConfig>) => {
      const updated = whiteLabelEngine.updateActiveConfig(partial);
      setConfig(updated);
      setActiveTenant(whiteLabelEngine.getActiveTenant());
      return updated;
    },
    []
  );

  const switchTenant = useCallback((tenantId: string) => {
    const t = whiteLabelEngine.switchTenant(tenantId);
    if (t) {
      setActiveTenant(t);
      setConfig(t.configuracaoCompleta);
    }
    return t;
  }, []);

  const cloneTenant = useCallback(
    (targetTenantId: string, nomeCidade: string, estadoUf: string) => {
      const cloned = whiteLabelEngine.cloneTenant(
        activeTenant.tenantId,
        targetTenantId,
        nomeCidade,
        estadoUf
      );
      return cloned;
    },
    [activeTenant.tenantId]
  );

  const toggleBusinessModel = useCallback(
    (verticalId: BusinessVerticalId, ativo: boolean) => {
      const updated = whiteLabelEngine.toggleBusinessModel(verticalId, ativo);
      setConfig(updated);
      return updated;
    },
    []
  );

  const reorderHomeBlocks = useCallback((blocks: HomeBlockItem[]) => {
    const updated = whiteLabelEngine.reorderHomeBlocks(blocks);
    setConfig(updated);
    return updated;
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    const ok = whiteLabelEngine.applyPreset(presetId);
    if (ok) {
      setConfig(whiteLabelEngine.getActiveConfig());
    }
    return ok;
  }, []);

  const resetToDefaults = useCallback(() => {
    const fresh = whiteLabelEngine.resetToDefaults();
    setConfig(fresh);
    return fresh;
  }, []);

  // Mapeamentos unificados: Branding Supabase Realtime tem precedência máxima, seguido de WhiteLabel e legado
  const nomeApp = branding?.app_name || config.brandCenter?.nomePlataforma || identidade.nomeApp || "PARTIU";
  const sloganApp = branding?.company_name || config.brandCenter?.slogan || identidade.sloganApp || "Mobilidade inteligente para sua cidade";
  const corPrimaria = branding?.primary_color || config.designSystem?.paletaPrimaria?.corPrincipal || identidade.corPrimaria || "#003366";
  const corPrimariaHover = branding?.secondary_color || config.designSystem?.paletaPrimaria?.corPrincipalHover || identidade.corPrimariaHover || "#002244";
  const corSecundaria = branding?.secondary_color || config.designSystem?.paletaPrimaria?.corSecundaria || identidade.corSecundaria || "#0088FF";
  const corTextoPrimaria = branding?.text_primary || config.designSystem?.paletaPrimaria?.corTextoPrincipal || identidade.corTextoPrimaria || "#FFFFFF";
  const corFundoApp = branding?.background_color || config.designSystem?.paletaPrimaria?.corFundoApp || identidade.corFundoApp || "#F8FAFC";
  const nomeModuloPay = "99Pay";
  const nomeModuloEntrega = config.businessModels?.verticais?.DELIVERY_FLASH?.nomeExibicao || "Entrega";

  return {
    // Legado 100% preservado
    identidade,
    nomeApp,
    sloganApp,
    corPrimaria,
    corPrimariaHover,
    corSecundaria,
    corTextoPrimaria,
    corFundoApp,
    nomeModuloPay,
    nomeModuloEntrega,
    bannerComunicacao: identidade.bannerComunicacao,
    bannersComunicacao: identidade.bannersComunicacao?.length
      ? identidade.bannersComunicacao
      : (identidade.bannerComunicacao ? [identidade.bannerComunicacao] : []),
    cardsMobilidade: identidade.cardsMobilidade || [],
    bannerCredito: identidade.bannerCredito || identidade.bannerComunicacao,
    cardsFinancas: identidade.cardsFinancas || [],

    // White Label Enterprise V1
    config,
    brand: config.brandCenter,
    designSystem: config.designSystem,
    typography: config.typography,
    homePage: config.homePage,
    menuBuilder: config.menuBuilder,
    businessModels: config.businessModels,
    driverPlans: config.monetization?.planos || [],
    monetization: config.monetization,
    bannerCms: config.cms,
    geo: config.geo,
    appConfig: config.nativeApp,
    activeTenant,
    allTenants: whiteLabelEngine.getAllTenants(),

    // Ações de Governança
    updateConfig,
    switchTenant,
    cloneTenant,
    toggleBusinessModel,
    reorderHomeBlocks,
    applyPreset,
    exportThemeJson: () => whiteLabelEngine.exportThemeJson(),
    importThemeJson: (json: string) => {
      try {
        const imported = whiteLabelEngine.importThemeJson(json);
        setConfig(imported);
        return { success: true, config: imported };
      } catch (err: any) {
        return { success: false, error: err?.message || "Falha ao importar tema JSON." };
      }
    },
    resetToDefaults,
    branding,
    brandingCtx,
  };
}
