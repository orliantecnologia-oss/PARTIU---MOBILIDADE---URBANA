/**
 * ==============================================================================
 * 👤 PARTIU REVENUE OS — USER & PROFILE SERVICE
 * ==============================================================================
 * Gerenciamento centralizado do perfil do passageiro, sessão ativa do Supabase,
 * preferências de viagem com debounce, e upload de avatar no Supabase Storage.
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { supabaseAuthService, type AuthUserProfile } from "@/lib/auth/supabase-auth-service";
import { silentCatchWarn } from "@/lib/structured-logger";


export interface UserPreferences {
  prefPushNotifications: boolean;
  prefWhatsappAlerts: boolean;
  prefAc: boolean;
  prefQuietTrip: boolean;
}

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  avatarUrl: string;
  rating: number;
  totalTrips: number;
  preferences: UserPreferences;
}

const STORAGE_PREFERENCES_KEY = "partiu_user_preferences_v1";

const DEFAULT_PROFILE: UserProfileData = {
  id: "usr-pax-rodrigo",
  name: "Rodrigo Silva",
  email: "rodrigo@partiu.app",
  phone: "(22) 99605-1620",
  cpf: "084.192.524-88",
  avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  rating: 4.9,
  totalTrips: 28,
  preferences: {
    prefPushNotifications: true,
    prefWhatsappAlerts: true,
    prefAc: true,
    prefQuietTrip: false,
  },
};

export class UserService {
  private static instance: UserService;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor() {}

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Recupera o perfil completo do usuário atual mesclando sessão, banco e cache local
   */
  public async getCurrentUserProfile(): Promise<UserProfileData> {
    const session = supabaseAuthService.getStoredSession();
    const localName = typeof window !== "undefined" ? localStorage.getItem("partiu_user_nome") : null;
    const localAvatar = typeof window !== "undefined" ? localStorage.getItem("partiu_user_avatar") : null;
    const localPhone = typeof window !== "undefined" ? localStorage.getItem("partiu_user_phone") : null;

    let base: UserProfileData = {
      ...DEFAULT_PROFILE,
      id: session?.id || DEFAULT_PROFILE.id,
      name: localName || session?.name || DEFAULT_PROFILE.name,
      email: session?.email || DEFAULT_PROFILE.email,
      phone: localPhone || session?.phone || DEFAULT_PROFILE.phone,
      cpf: session?.cpf || DEFAULT_PROFILE.cpf,
      avatarUrl: localAvatar || session?.avatarUrl || DEFAULT_PROFILE.avatarUrl,
      rating: session?.rating || DEFAULT_PROFILE.rating,
      totalTrips: session?.totalTrips || DEFAULT_PROFILE.totalTrips,
      preferences: this.getStoredPreferences(),
    };

    if (!isSupabaseConfigured()) {
      return base;
    }

    try {
      // 1. Tenta buscar na tabela partiu_passageiros
      const targetUserId = session?.id;
      if (targetUserId) {
        const { data: paxData } = await (supabase as any)
          .from("partiu_passageiros")
          .select("*")
          .or(`user_id.eq.${targetUserId},id.eq.${targetUserId}`)
          .maybeSingle();

        if (paxData) {
          base = {
            ...base,
            name: paxData.nome || base.name,
            phone: paxData.telefone || base.phone,
            cpf: paxData.cpf || base.cpf,
            email: paxData.email || base.email,
            avatarUrl: paxData.foto_url || base.avatarUrl,
            rating: paxData.rating ? Number(paxData.rating) : base.rating,
            totalTrips: paxData.total_viagens || base.totalTrips,
            preferences: {
              prefPushNotifications: paxData.pref_push_notifications ?? base.preferences.prefPushNotifications,
              prefWhatsappAlerts: paxData.pref_whatsapp_alerts ?? base.preferences.prefWhatsappAlerts,
              prefAc: paxData.pref_ac ?? base.preferences.prefAc,
              prefQuietTrip: paxData.pref_quiet_trip ?? base.preferences.prefQuietTrip,
            },
          };
          this.saveStoredPreferences(base.preferences);
          return base;
        }

        // 2. Fallback na tabela profiles
        const { data: profData } = await (supabase as any)
          .from("profiles")
          .select("*")
          .eq("id", targetUserId)
          .maybeSingle();

        if (profData) {
          base = {
            ...base,
            name: profData.full_name || base.name,
            phone: profData.phone || base.phone,
            cpf: profData.cpf || base.cpf,
            avatarUrl: profData.avatar_url || base.avatarUrl,
          };
        }
      }
    } catch (err) { silentCatchWarn("UserService", err); }

    return base;
  }

  /**
   * Atualização com formulário funcional (PATCH / UPDATE)
   */
  public async updateUserProfile(data: {
    name: string;
    phone: string;
    cpf?: string;
    avatarUrl?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const session = supabaseAuthService.getStoredSession();
    const userId = session?.id || DEFAULT_PROFILE.id;

    // 1. Atualiza cache local instantâneo
    if (typeof window !== "undefined") {
      if (data.name) localStorage.setItem("partiu_user_nome", data.name);
      if (data.phone) localStorage.setItem("partiu_user_phone", data.phone);
      if (data.avatarUrl) localStorage.setItem("partiu_user_avatar", data.avatarUrl);
    }

    if (session) {
      const updatedSession: AuthUserProfile = {
        ...session,
        name: data.name || session.name,
        phone: data.phone || session.phone,
        cpf: data.cpf || session.cpf,
        avatarUrl: data.avatarUrl || session.avatarUrl,
      };
      supabaseAuthService.saveStoredSession(updatedSession);
    }

    // 2. Atualiza Supabase
    if (isSupabaseConfigured() && userId) {
      try {
        await (supabase as any)
          .from("partiu_passageiros")
          .update({
            nome: data.name,
            telefone: data.phone,
            cpf: data.cpf || undefined,
            foto_url: data.avatarUrl || undefined,
            updated_at: new Date().toISOString(),
          })
          .or(`user_id.eq.${userId},id.eq.${userId}`);

        await (supabase as any)
          .from("profiles")
          .update({
            full_name: data.name,
            phone: data.phone,
            cpf: data.cpf || undefined,
            avatar_url: data.avatarUrl || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      } catch (err: any) {
        console.warn("Aviso ao persistir perfil no Supabase:", err?.message);
      }
    }

    return { success: true };
  }

  /**
   * Upload real de avatar no Supabase Storage (bucket 'avatares')
   */
  public async uploadAvatar(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!file) return { success: false, error: "Arquivo inválido" };

    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `avatar-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `passageiros/${fileName}`;

    if (isSupabaseConfigured()) {
      try {
        const { error: uploadError } = await supabase.storage
          .from("avatares")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: true,
          });

        if (!uploadError) {
          const { data } = supabase.storage.from("avatares").getPublicUrl(filePath);
          if (data?.publicUrl) {
            await this.updateUserProfile({
              name: typeof window !== "undefined" ? localStorage.getItem("partiu_user_nome") || "Rodrigo" : "Rodrigo",
              phone: typeof window !== "undefined" ? localStorage.getItem("partiu_user_phone") || "(22) 99605-1620" : "",
              avatarUrl: data.publicUrl,
            });
            return { success: true, url: data.publicUrl };
          }
        }
      } catch (err: any) {
        console.warn("Falha no upload do Supabase Storage:", err?.message);
      }
    }

    // Fallback base64 local
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        if (typeof window !== "undefined") {
          localStorage.setItem("partiu_user_avatar", base64);
        }
        resolve({ success: true, url: base64 });
      };
      reader.onerror = () => resolve({ success: false, error: "Erro ao ler arquivo local" });
      reader.readAsDataURL(file);
    });
  }

  /**
   * Atualização de preferências com debounce no Supabase
   */
  public updateUserPreferences(prefs: Partial<UserPreferences>): void {
    const current = this.getStoredPreferences();
    const updated: UserPreferences = { ...current, ...prefs };
    this.saveStoredPreferences(updated);

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      if (!isSupabaseConfigured()) return;
      const session = supabaseAuthService.getStoredSession();
      const userId = session?.id;
      if (!userId) return;

      try {
        await (supabase as any)
          .from("partiu_passageiros")
          .update({
            pref_push_notifications: updated.prefPushNotifications,
            pref_whatsapp_alerts: updated.prefWhatsappAlerts,
            pref_ac: updated.prefAc,
            pref_quiet_trip: updated.prefQuietTrip,
            updated_at: new Date().toISOString(),
          })
          .or(`user_id.eq.${userId},id.eq.${userId}`);
      } catch (err) { silentCatchWarn("UserService", err); }
    }, 800);
  }

  public getStoredPreferences(): UserPreferences {
    if (typeof window === "undefined") return DEFAULT_PROFILE.preferences;
    try {
      const raw = localStorage.getItem(STORAGE_PREFERENCES_KEY);
      if (raw) return JSON.parse(raw);
    } catch (err) { silentCatchWarn("UserService", err); }
    return DEFAULT_PROFILE.preferences;
  }

  private saveStoredPreferences(prefs: UserPreferences): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_PREFERENCES_KEY, JSON.stringify(prefs));
    } catch (err) { silentCatchWarn("UserService", err); }
  }
}

export const userService = UserService.getInstance();
