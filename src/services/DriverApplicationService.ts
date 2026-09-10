/**
 * ==============================================================================
 * 🚖 PARTIU REVENUE OS — DRIVER APPLICATION & REALTIME SAAS CONVERSION
 * ==============================================================================
 * Serviço de captação de motoristas e entregadores parceiros para o modelo SaaS
 * de Diária Fixa (100% de repasse líquido para o motorista, 0% comissão).
 * Insere em public.driver_applications e dispara notificação Realtime para o
 * Painel Administrativo.
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { supabaseAuthService } from "@/lib/auth/supabase-auth-service";
import { silentCatchWarn } from "@/lib/structured-logger";


export interface DriverApplicationInput {
  name: string;
  phone: string;
  email?: string;
  vehicleType: "MOTO" | "CARRO";
  vehicleModel: string;
  vehiclePlate: string;
  vehicleYear?: string;
  cnhNumber?: string;
}

export interface DriverApplicationRecord extends DriverApplicationInput {
  id: string;
  status: "PENDENTE" | "EM_ANALISE" | "APROVADO" | "REJEITADO";
  createdAt: string;
}

const STORAGE_APPLICATIONS_KEY = "partiu_driver_applications_local_v1";

export class DriverApplicationService {
  private static instance: DriverApplicationService;

  private constructor() {}

  public static getInstance(): DriverApplicationService {
    if (!DriverApplicationService.instance) {
      DriverApplicationService.instance = new DriverApplicationService();
    }
    return DriverApplicationService.instance;
  }

  /**
   * Envia uma nova candidatura de motorista com notificação em tempo real
   */
  public async submitApplication(
    input: DriverApplicationInput
  ): Promise<{ success: boolean; applicationId: string; message: string }> {
    const session = supabaseAuthService.getStoredSession();
    const userId = session?.id;
    const appId = `app-drv-${Date.now()}`;

    const record: DriverApplicationRecord = {
      ...input,
      id: appId,
      status: "PENDENTE",
      createdAt: new Date().toISOString(),
    };

    // 1. Salva localmente para contingência
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_APPLICATIONS_KEY) || "[]");
        stored.unshift(record);
        localStorage.setItem(STORAGE_APPLICATIONS_KEY, JSON.stringify(stored));
      } catch (err) { silentCatchWarn("DriverApplicationService", err); }
    }

    // 2. Persiste na tabela driver_applications do Supabase
    if (isSupabaseConfigured()) {
      try {
        await (supabase as any).from("driver_applications").insert({
          id: appId,
          user_id: userId || null,
          name: input.name,
          phone: input.phone,
          email: input.email || null,
          vehicle_type: input.vehicleType,
          vehicle_model: input.vehicleModel,
          vehicle_plate: input.vehiclePlate.toUpperCase(),
          vehicle_year: input.vehicleYear || "2022",
          cnh_number: input.cnhNumber || null,
          status: "PENDENTE",
        });

        // 3. Dispara broadcast no canal Realtime para o Painel Admin
        const adminChannel = supabase.channel("admin_driver_applications");
        await adminChannel.send({
          type: "broadcast",
          event: "new_driver_application",
          payload: {
            applicationId: appId,
            name: input.name,
            phone: input.phone,
            vehicleType: input.vehicleType,
            vehicleModel: input.vehicleModel,
            timestamp: Date.now(),
          },
        });
      } catch (err) {
        console.warn("Aviso ao sincronizar cadastro de motorista:", err);
      }
    }

    return {
      success: true,
      applicationId: appId,
      message: "Candidatura enviada com sucesso! Nossa equipe analisará seus dados em instantes.",
    };
  }
}

export const driverApplicationService = DriverApplicationService.getInstance();
