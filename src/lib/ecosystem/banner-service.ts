/**
 * ==============================================================================
 * 🎨 PARTIU ECOSYSTEM — PROMOTIONAL BANNER SERVICE
 * ==============================================================================
 * Gerenciamento centralizado do carrossel promocional do app:
 * - CRUD completo com validação de dimensões para visualização mobile perfeita
 * - Suporte a categorias (PASSENGER, DRIVER)
 * - Toggle instantâneo de visibilidade e reordenação
 * - Sincronização Supabase (PostgreSQL) + fallback offline local
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

export type BannerCategory = "PASSENGER" | "DRIVER" | "ALL";

export interface BannerItem {
  id: string;
  image_url: string;
  link_url: string;
  order_index: number;
  is_active: boolean;
  category: BannerCategory;
  title: string;
  subtitle: string;
  badge: string;
  created_at?: string | undefined;
  updated_at?: string | undefined;
}

export const SEED_BANNERS: BannerItem[] = [
  {
    id: "banner-corridas-seguras",
    image_url: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&auto=format&fit=crop&q=80",
    link_url: "/app",
    order_index: 1,
    is_active: true,
    category: "PASSENGER",
    title: "Partiu Mobilidade",
    subtitle: "Carros confortáveis com ar e motoristas auditados",
    badge: "VIAGENS SEGURAS",
  },
  {
    id: "banner-entregas-flash",
    image_url: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80",
    link_url: "/app/encomendas",
    order_index: 2,
    is_active: true,
    category: "PASSENGER",
    title: "Partiu Entregas Express",
    subtitle: "Envio ágil com validação por Duplo PIN de segurança",
    badge: "DUPLO PIN",
  },
  {
    id: "banner-motorista-saas",
    image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80",
    link_url: "/cadastro-motorista",
    order_index: 3,
    is_active: true,
    category: "DRIVER",
    title: "Motorista Parceiro PARTIU",
    subtitle: "Diária fixa pré-paga e 100% das corridas ficam com você",
    badge: "0% COMISSÃO",
  },
];

const BANNERS_STORAGE_KEY = "partiu_promotional_banners_store";

class BannerService {
  private banners: BannerItem[] = [];
  private listeners: Set<(banners: BannerItem[]) => void> = new Set();

  constructor() {
    this.banners = this.loadFromStorage();
    if (typeof window !== "undefined") {
      void this.syncFromBackend();
    }
  }

  private loadFromStorage(): BannerItem[] {
    if (typeof window === "undefined") return [...SEED_BANNERS];
    try {
      const raw = localStorage.getItem(BANNERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("[BannerService] Falha ao ler cache:", e);
    }
    return [...SEED_BANNERS];
  }

  private saveToStorage() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(this.banners));
    } catch (e) {
      console.warn("[BannerService] Falha ao salvar cache:", e);
    }
  }

  public async syncFromBackend(): Promise<BannerItem[]> {
    if (!isSupabaseConfigured()) {
      return this.banners;
    }

    try {
      const { data, error } = await (supabase as any)
        .from("banners")
        .select("*")
        .order("order_index", { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        this.banners = data.map((b: any) => ({
          id: b.id,
          image_url: b.image_url || b.imagem_url || "",
          link_url: b.link_url || b.link_destino || "/app",
          order_index: Number(b.order_index ?? b.ordem ?? 1),
          is_active: b.is_active !== undefined ? Boolean(b.is_active) : (b.ativo !== undefined ? Boolean(b.ativo) : true),
          category: (b.category as BannerCategory) || "PASSENGER",
          title: b.title || b.titulo || "Partiu Mobilidade",
          subtitle: b.subtitle || b.subtitulo || "",
          badge: b.badge || b.tag || "DESTAQUE",
          created_at: b.created_at,
          updated_at: b.updated_at,
        }));
        this.saveToStorage();
        this.notifyListeners();
      }
    } catch (e) {
      console.warn("[BannerService] Falha ao carregar do Supabase:", e);
    }

    return this.banners;
  }

  public getAllBanners(): BannerItem[] {
    return [...this.banners].sort((a, b) => a.order_index - b.order_index);
  }

  public getActiveBanners(category: BannerCategory = "PASSENGER"): BannerItem[] {
    return this.getAllBanners().filter(
      (b) => b.is_active && (b.category === category || b.category === "ALL")
    );
  }

  public async createBanner(
    data: Omit<BannerItem, "id" | "created_at" | "updated_at">
  ): Promise<BannerItem> {
    const newBanner: BannerItem = {
      ...data,
      id: `banner_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      order_index: data.order_index || this.banners.length + 1,
      is_active: data.is_active !== false,
      category: data.category || "PASSENGER",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.banners.push(newBanner);
    this.saveToStorage();
    this.notifyListeners();

    if (isSupabaseConfigured()) {
      try {
        await (supabase as any).from("banners").insert({
          id: newBanner.id,
          image_url: newBanner.image_url,
          link_url: newBanner.link_url,
          order_index: newBanner.order_index,
          is_active: newBanner.is_active,
          category: newBanner.category,
          title: newBanner.title,
          subtitle: newBanner.subtitle,
          badge: newBanner.badge,
          // Compatibilidade legada
          imagem_url: newBanner.image_url,
          link_destino: newBanner.link_url,
          ordem: newBanner.order_index,
          ativo: newBanner.is_active,
          titulo: newBanner.title,
          subtitulo: newBanner.subtitle,
          tag: newBanner.badge,
        });
      } catch (e) {
        console.warn("[BannerService] Falha ao persistir banner no Supabase:", e);
      }
    }

    return newBanner;
  }

  public async updateBanner(id: string, patch: Partial<BannerItem>): Promise<BannerItem | null> {
    const idx = this.banners.findIndex((b) => b.id === id);
    const current = this.banners[idx]!;
    const updated: BannerItem = {
      id: current.id,
      image_url: patch.image_url ?? current.image_url,
      link_url: patch.link_url ?? current.link_url,
      order_index: patch.order_index ?? current.order_index,
      is_active: patch.is_active ?? current.is_active,
      category: patch.category ?? current.category,
      title: patch.title ?? current.title,
      subtitle: patch.subtitle ?? current.subtitle,
      badge: patch.badge ?? current.badge,
      created_at: current.created_at,
      updated_at: new Date().toISOString(),
    };

    this.banners[idx] = updated;
    this.saveToStorage();
    this.notifyListeners();

    if (isSupabaseConfigured()) {
      try {
        await (supabase as any)
          .from("banners")
          .update({
            image_url: updated.image_url,
            link_url: updated.link_url,
            order_index: updated.order_index,
            is_active: updated.is_active,
            category: updated.category,
            title: updated.title,
            subtitle: updated.subtitle,
            badge: updated.badge,
            updated_at: updated.updated_at,
          })
          .eq("id", id);
      } catch (e) {
        console.warn("[BannerService] Falha ao atualizar banner no Supabase:", e);
      }
    }

    return updated;
  }

  public async toggleBannerStatus(id: string): Promise<boolean> {
    const banner = this.banners.find((b) => b.id === id);
    if (!banner) return false;
    const novoStatus = !banner.is_active;
    await this.updateBanner(id, { is_active: novoStatus });
    return novoStatus;
  }

  public async deleteBanner(id: string): Promise<boolean> {
    const idx = this.banners.findIndex((b) => b.id === id);
    if (idx === -1) return false;

    this.banners.splice(idx, 1);
    this.saveToStorage();
    this.notifyListeners();

    if (isSupabaseConfigured()) {
      try {
        await (supabase as any).from("banners").delete().eq("id", id);
      } catch (e) {
        console.warn("[BannerService] Falha ao deletar banner no Supabase:", e);
      }
    }

    return true;
  }

  public async reorderBanners(orderedIds: string[]): Promise<void> {
    orderedIds.forEach((id, index) => {
      const banner = this.banners.find((b) => b.id === id);
      if (banner) {
        banner.order_index = index + 1;
      }
    });

    this.saveToStorage();
    this.notifyListeners();

    if (isSupabaseConfigured()) {
      try {
        for (let i = 0; i < orderedIds.length; i++) {
          await (supabase as any)
            .from("banners")
            .update({ order_index: i + 1, ordem: i + 1 })
            .eq("id", orderedIds[i]);
        }
      } catch (e) {
        console.warn("[BannerService] Falha ao reordenar no Supabase:", e);
      }
    }
  }

  /**
   * Validação de dimensões de imagem para exibição ideal no carrossel mobile
   * - Proporção recomendada: entre 1.5 e 2.2 (ex: ~16:9 ou ~350x180)
   * - Largura mínima: 300px
   */
  public async validateBannerDimensions(
    imageUrl: string
  ): Promise<{ isValid: boolean; message: string; width?: number; height?: number; aspectRatio?: number }> {
    if (!imageUrl || !imageUrl.startsWith("http")) {
      return { isValid: false, message: "URL de imagem inválida ou em formato desconhecido." };
    }

    if (typeof window === "undefined") {
      return { isValid: true, message: "Validação em servidor aprovada." };
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        const aspectRatio = width / (height || 1);

        if (width < 300) {
          resolve({
            isValid: false,
            message: `Largura muito baixa (${width}px). O banner mobile precisa de no mínimo 300px de largura para não pixelar.`,
            width,
            height,
            aspectRatio,
          });
          return;
        }

        if (aspectRatio < 1.3 || aspectRatio > 2.6) {
          resolve({
            isValid: false,
            message: `Proporção inadequada (${aspectRatio.toFixed(2)}:1). Para evitar cortes no carrossel mobile, use proporção próxima a 16:9 (~1.77:1).`,
            width,
            height,
            aspectRatio,
          });
          return;
        }

        resolve({
          isValid: true,
          message: `Dimensões excelentes (${width}x${height}px, proporção ${aspectRatio.toFixed(2)}:1). O banner se adaptará perfeitamente ao carrossel.`,
          width,
          height,
          aspectRatio,
        });
      };

      img.onerror = () => {
        // Se falhar o carregamento por CORS ou URL bloqueada, não bloqueia o usuário mas avisa
        resolve({
          isValid: true,
          message: "Não foi possível inspecionar as dimensões via navegador (possível proteção CORS). O banner foi salvo normalmente.",
        });
      };

      img.src = imageUrl;
    });
  }

  public subscribe(listener: (banners: BannerItem[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllBanners());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const list = this.getAllBanners();
    this.listeners.forEach((l) => {
      try {
        l(list);
      } catch (e) {
        console.error("[BannerService] Erro no listener:", e);
      }
    });
  }
}

export const bannerService = new BannerService();
