/**
 * ==============================================================================
 * 🚘 PARTIU ECOSYSTEM — DRIVER FLEET & APPROVAL SERVICE
 * ==============================================================================
 * Gestão rigorosa do quadro de motoristas parceiros:
 * - Restrição estrita a DUAS categorias: MOTO ou CARRO (sem exceções)
 * - Fluxo de aprovação documental (CNH e documento do veículo)
 * - Transições de estado: PENDENTE -> APROVADO / REJEITADO
 * - Sincronização Supabase (PostgreSQL) + Fallback offline resiliente
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { isMockForbidden } from "@/config/environment";

export type DriverVehicleType = "MOTO" | "CARRO";
export type DriverApprovalStatus = "PENDENTE" | "APROVADO" | "REJEITADO";

export interface DriverFleetRecord {
  id: string;
  name: string;
  phone: string;
  cnh: string;
  vehicle_type: DriverVehicleType;
  license_plate: string;
  vehicle_model: string;
  vehicle_color: string;
  status: DriverApprovalStatus;
  is_online: boolean;
  email?: string | undefined;
  current_lat?: number | undefined;
  current_lng?: number | undefined;
  cnh_image_url?: string | undefined;
  vehicle_doc_url?: string | undefined;
  avatar_url?: string | undefined;
  rejection_reason?: string | undefined;
  created_at: string;
  updated_at?: string | undefined;
}

export const SEED_DRIVERS: DriverFleetRecord[] = [
  {
    id: "drv-carlos-onix",
    name: "Carlos Eduardo Silva",
    phone: "(22) 99876-5432",
    cnh: "04987654321",
    vehicle_type: "CARRO",
    license_plate: "BRA-4E29",
    vehicle_model: "Chevrolet Onix 1.0 LT",
    vehicle_color: "Prata",
    status: "APROVADO",
    is_online: true,
    current_lat: -21.205,
    current_lng: -41.888,
    cnh_image_url: "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop&q=80",
    vehicle_doc_url: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&auto=format&fit=crop&q=80",
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: "drv-lucas-cg160",
    name: "Lucas Mendes Oliveira",
    phone: "(22) 99881-2244",
    cnh: "07891234560",
    vehicle_type: "MOTO",
    license_plate: "MOT-7799",
    vehicle_model: "Honda CG 160 Fan",
    vehicle_color: "Vermelha",
    status: "APROVADO",
    is_online: true,
    current_lat: -21.206,
    current_lng: -41.889,
    cnh_image_url: "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop&q=80",
    vehicle_doc_url: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&auto=format&fit=crop&q=80",
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: "drv-marcos-pendente",
    name: "Marcos Aurélio Silveira",
    phone: "(22) 99123-4567",
    cnh: "09988776655",
    vehicle_type: "CARRO",
    license_plate: "RIO-2A18",
    vehicle_model: "Fiat Argo Drive 1.0",
    vehicle_color: "Branco",
    status: "PENDENTE",
    is_online: false,
    current_lat: -21.204,
    current_lng: -41.887,
    cnh_image_url: "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop&q=80",
    vehicle_doc_url: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&auto=format&fit=crop&q=80",
    avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80",
    created_at: new Date().toISOString(),
  },
];

const DRIVERS_STORAGE_KEY = "partiu_driver_fleet_store";

export interface RegisterDriverInput {
  name: string;
  phone: string;
  cnh?: string | undefined;
  cnh_number?: string | undefined;
  vehicle_type: DriverVehicleType;
  license_plate?: string | undefined;
  vehicle_plate?: string | undefined;
  vehicle_model?: string | undefined;
  vehicle_color?: string | undefined;
  email?: string | undefined;
  pix_key?: string | undefined;
  cnh_image_url?: string | undefined;
  vehicle_doc_url?: string | undefined;
  avatar_url?: string | undefined;
}

class DriverFleetService {
  private drivers: DriverFleetRecord[] = [];
  private listeners: Set<(drivers: DriverFleetRecord[]) => void> = new Set();

  constructor() {
    this.drivers = this.loadFromStorage();
    if (typeof window !== "undefined") {
      void this.syncFromBackend();
    }
  }

  private loadFromStorage(): DriverFleetRecord[] {
    if (typeof window === "undefined") {
      return isMockForbidden() ? [] : [...SEED_DRIVERS];
    }
    try {
      const raw = localStorage.getItem(DRIVERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("[DriverFleetService] Falha ao ler cache:", e);
    }
    return isMockForbidden() ? [] : [...SEED_DRIVERS];
  }

  private saveToStorage() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(DRIVERS_STORAGE_KEY, JSON.stringify(this.drivers));
    } catch (e) {
      console.warn("[DriverFleetService] Falha ao salvar cache:", e);
    }
  }

  public async syncFromBackend(): Promise<DriverFleetRecord[]> {
    if (!isSupabaseConfigured()) {
      return this.drivers;
    }

    try {
      // 1. Tenta buscar da tabela oficial `drivers`
      const { data, error } = await (supabase as any)
        .from("drivers")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        this.drivers = data.map((d: any) => ({
          id: d.id,
          name: d.name || "Motorista Parceiro",
          phone: d.phone || "",
          cnh: d.cnh || "",
          vehicle_type: d.vehicle_type === "MOTO" ? "MOTO" : "CARRO",
          license_plate: d.license_plate || "SEM-PLACA",
          vehicle_model: d.vehicle_model || "Veículo Parceiro",
          vehicle_color: d.vehicle_color || "Prata",
          status: (d.status as DriverApprovalStatus) || "PENDENTE",
          is_online: Boolean(d.is_online),
          current_lat: d.current_lat ? Number(d.current_lat) : undefined,
          current_lng: d.current_lng ? Number(d.current_lng) : undefined,
          cnh_image_url: d.cnh_image_url,
          vehicle_doc_url: d.vehicle_doc_url,
          avatar_url: d.avatar_url,
          rejection_reason: d.rejection_reason,
          created_at: d.created_at,
          updated_at: d.updated_at,
        }));
        this.saveToStorage();
        this.notifyListeners();
        return this.drivers;
      }

      // 2. Fallback: Se a tabela `drivers` ainda não possuir registros, consulta `partiu_motoristas`
      const { data: legacyData, error: legacyError } = await (supabase as any)
        .from("partiu_motoristas")
        .select("*")
        .order("created_at", { ascending: false });

      if (!legacyError && Array.isArray(legacyData) && legacyData.length > 0) {
        this.drivers = legacyData.map((d: any) => ({
          id: d.id,
          name: d.nome || "Motorista Parceiro",
          phone: d.telefone || "",
          cnh: d.cnh_numero || "",
          vehicle_type: d.categoria_veiculo === "MOTO" ? "MOTO" : "CARRO",
          license_plate: d.veiculo_placa || "SEM-PLACA",
          vehicle_model: d.veiculo_marca_modelo || "Veículo Parceiro",
          vehicle_color: d.veiculo_cor || "Prata",
          status:
            d.status_aprovacao === "aprovado"
              ? "APROVADO"
              : d.status_aprovacao === "rejeitado"
              ? "REJEITADO"
              : "PENDENTE",
          is_online: Boolean(d.is_online),
          created_at: d.created_at || new Date().toISOString(),
        }));
        this.saveToStorage();
        this.notifyListeners();
      }
    } catch (e) {
      console.warn("[DriverFleetService] Falha ao sincronizar motoristas do Supabase:", e);
    }

    return this.drivers;
  }

  public getAllDrivers(): DriverFleetRecord[] {
    return [...this.drivers];
  }

  public getPendingDrivers(): DriverFleetRecord[] {
    return this.drivers.filter((d) => d.status === "PENDENTE");
  }

  public getApprovedDrivers(): DriverFleetRecord[] {
    return this.drivers.filter((d) => d.status === "APROVADO");
  }

  public async approveDriver(driverId: string): Promise<boolean> {
    const driver = this.drivers.find((d) => d.id === driverId);
    if (!driver) return false;

    driver.status = "APROVADO";
    driver.rejection_reason = undefined;
    driver.updated_at = new Date().toISOString();

    this.saveToStorage();
    this.notifyListeners();

    if (isSupabaseConfigured()) {
      try {
        await (supabase as any)
          .from("drivers")
          .update({ status: "APROVADO", rejection_reason: null, updated_at: driver.updated_at })
          .eq("id", driverId);

        // Atualiza também compatibilidade legada
        await (supabase as any)
          .from("partiu_motoristas")
          .update({ status_aprovacao: "aprovado" })
          .eq("id", driverId);
      } catch (e) {
        console.warn("[DriverFleetService] Falha ao aprovar no Supabase:", e);
      }
    }

    return true;
  }

  public async rejectDriver(driverId: string, reason: string): Promise<boolean> {
    const driver = this.drivers.find((d) => d.id === driverId);
    if (!driver) return false;

    driver.status = "REJEITADO";
    driver.rejection_reason = reason;
    driver.updated_at = new Date().toISOString();

    this.saveToStorage();
    this.notifyListeners();

    if (isSupabaseConfigured()) {
      try {
        await (supabase as any)
          .from("drivers")
          .update({ status: "REJEITADO", rejection_reason: reason, updated_at: driver.updated_at })
          .eq("id", driverId);

        // Atualiza também compatibilidade legada
        await (supabase as any)
          .from("partiu_motoristas")
          .update({ status_aprovacao: "rejeitado", motivo_rejeicao: reason })
          .eq("id", driverId);
      } catch (e) {
        console.warn("[DriverFleetService] Falha ao rejeitar no Supabase:", e);
      }
    }

    return true;
  }

  public async registerDriver(
    data: RegisterDriverInput
  ): Promise<DriverFleetRecord> {
    // Validação estrita de categoria: MOTO ou CARRO apenas
    if (data.vehicle_type !== "MOTO" && data.vehicle_type !== "CARRO") {
      throw new Error("Estritamente MOTO ou CARRO permitidos no ecossistema PARTIU.");
    }

    const plate = data.license_plate || data.vehicle_plate || "SEM-PLACA";
    const cnhVal = data.cnh || data.cnh_number || "00000000000";
    const model = data.vehicle_model || "Veículo Parceiro";
    const color = data.vehicle_color || "Prata";

    const newDriver: DriverFleetRecord = {
      id: `drv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: data.name,
      phone: data.phone,
      cnh: cnhVal,
      vehicle_type: data.vehicle_type,
      license_plate: plate,
      vehicle_model: model,
      vehicle_color: color,
      status: "PENDENTE",
      is_online: false,
      email: data.email,
      cnh_image_url: data.cnh_image_url,
      vehicle_doc_url: data.vehicle_doc_url,
      avatar_url: data.avatar_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.drivers.unshift(newDriver);
    this.saveToStorage();
    this.notifyListeners();

    if (isSupabaseConfigured()) {
      try {
        await (supabase as any).from("drivers").insert({
          id: newDriver.id,
          name: newDriver.name,
          phone: newDriver.phone,
          cnh: newDriver.cnh,
          vehicle_type: newDriver.vehicle_type,
          license_plate: newDriver.license_plate,
          vehicle_model: newDriver.vehicle_model,
          vehicle_color: newDriver.vehicle_color,
          status: newDriver.status,
          is_online: newDriver.is_online,
          cnh_image_url: newDriver.cnh_image_url,
          vehicle_doc_url: newDriver.vehicle_doc_url,
          avatar_url: newDriver.avatar_url,
          created_at: newDriver.created_at,
          updated_at: newDriver.updated_at,
        });
      } catch (e) {
        console.warn("[DriverFleetService] Falha ao cadastrar motorista no Supabase:", e);
      }
    }

    return newDriver;
  }

  public subscribe(listener: (drivers: DriverFleetRecord[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllDrivers());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const list = this.getAllDrivers();
    this.listeners.forEach((l) => {
      try {
        l(list);
      } catch (e) {
        console.error("[DriverFleetService] Erro no listener:", e);
      }
    });
  }
}

export const driverFleetService = new DriverFleetService();
