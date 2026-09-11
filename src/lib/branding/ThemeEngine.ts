import { type AppBrandingRecord } from "./branding-types";
import { silentCatchWarn } from "@/lib/structured-logger";

export class ThemeEngine {
  private static instance: ThemeEngine;

  public static getInstance(): ThemeEngine {
    if (!ThemeEngine.instance) {
      ThemeEngine.instance = new ThemeEngine();
    }
    return ThemeEngine.instance;
  }

  /**
   * Aplica atômica e instantaneamente todos os tokens e variáveis CSS no :root
   */
  public applyTheme(branding: AppBrandingRecord): void {
    if (typeof document === "undefined") return;

    try {
      const root = document.documentElement;

      // 1. Variáveis Canônicas Requeridas pelo SaaS White Label
      root.style.setProperty("--color-primary", branding.primary_color);
      root.style.setProperty("--color-secondary", branding.secondary_color);
      root.style.setProperty("--color-accent", branding.accent_color);
      root.style.setProperty("--color-background", branding.background_color);
      root.style.setProperty("--color-surface", branding.surface_color);
      root.style.setProperty("--color-text-primary", branding.text_primary);
      root.style.setProperty("--color-text-secondary", branding.text_secondary);
      root.style.setProperty("--header-gradient-start", branding.header_gradient_start);
      root.style.setProperty("--header-gradient-end", branding.header_gradient_end);
      root.style.setProperty("--app-border-radius", branding.border_radius);

      // 2. Mapeamento Retrocompatível com Tailwind v4 & Shadcn/UI
      root.style.setProperty("--primary", branding.primary_color);
      root.style.setProperty("--primary-foreground", branding.text_primary);
      root.style.setProperty("--secondary", branding.secondary_color);
      root.style.setProperty("--secondary-foreground", branding.text_primary);
      root.style.setProperty("--accent", branding.accent_color);
      root.style.setProperty("--background", branding.background_color);
      root.style.setProperty("--card", branding.surface_color);
      root.style.setProperty("--card-foreground", branding.text_primary);
      root.style.setProperty("--surface", branding.surface_color);
      root.style.setProperty("--text-secondary", branding.text_secondary);

      // 3. Tokens Canônicos de Marca
      root.style.setProperty("--brand", branding.primary_color);
      root.style.setProperty("--brand-primary", branding.primary_color);
      root.style.setProperty("--brand-primary-hover", branding.secondary_color);
      root.style.setProperty("--brand-secondary", branding.secondary_color);
      root.style.setProperty("--brand-text", branding.text_primary);

      // 4. Raio de Bordas
      root.style.setProperty("--radius", branding.border_radius);

      // 5. Família Tipográfica
      if (branding.font_family) {
        root.style.setProperty(
          "--font-sans",
          `"${branding.font_family}", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
        );
      }

      // 6. Atualização Dinâmica do Document Title e Favicon
      if (branding.app_name) {
        const currentTitle = document.title;
        if (!currentTitle || currentTitle.includes("PARTIU") || currentTitle.includes("Mobilidade")) {
          document.title = `${branding.app_name} — ${branding.company_name || "Mobilidade Inteligente"}`;
        }
      }

      if (branding.favicon_url) {
        const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
        if (link) {
          link.href = branding.favicon_url;
        }
      }
    } catch (err) {
      silentCatchWarn("ThemeEngine:applyTheme", err);
    }
  }
}

export const themeEngine = ThemeEngine.getInstance();
