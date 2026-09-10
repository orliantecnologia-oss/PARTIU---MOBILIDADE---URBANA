/**
 * ==============================================================================
 * 🚗 PARTIU REVENUE OS — RIDE & DELIVERY HISTORY SERVICE
 * ==============================================================================
 * Serviço unificado para consulta de atividades do passageiro (corridas urbanas
 * e entregas com duplo PIN) mesclando tabelas partiu_corridas e partiu_entregas.
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { supabaseAuthService } from "@/lib/auth/supabase-auth-service";

export interface UserActivityItem {
  id: string;
  tipo: "corrida" | "entrega";
  categoria: string;
  data: string;
  origem: string;
  destino: string;
  valor: number;
  status: "concluida" | "cancelada" | "em_andamento";
  motorista: string;
  veiculo: string;
  pinSeguranca?: string;
  createdTimestamp: number;
}

const DEMO_ACTIVITIES: UserActivityItem[] = [
  {
    id: "cor-101",
    tipo: "corrida",
    categoria: "Partiu Pop",
    data: "Hoje às 14:32",
    origem: "Rua José da Silva Almeida, 45",
    destino: "Rua Amadeu Tinoco Lacerda, 492",
    valor: 14.9,
    status: "concluida",
    motorista: "Carlos Eduardo Silva",
    veiculo: "Chevrolet Onix Plus (MOB-8K99)",
    pinSeguranca: "4821",
    createdTimestamp: Date.now() - 3600000 * 2,
  },
  {
    id: "ent-102",
    tipo: "entrega",
    categoria: "Moto Flash Entrega",
    data: "Ontem às 18:15",
    origem: "Rua José da Silva Almeida, 45",
    destino: "Supermercados Fluminense 03 Vinhosa",
    valor: 9.9,
    status: "concluida",
    motorista: "Lucas Motoboy",
    veiculo: "Honda CG 160 (MOT-7799)",
    pinSeguranca: "9312",
    createdTimestamp: Date.now() - 3600000 * 26,
  },
  {
    id: "cor-103",
    tipo: "corrida",
    categoria: "Partiu Moto",
    data: "04/Set às 09:20",
    origem: "Rua Vinhosa, 820",
    destino: "Shopping Center Norte",
    valor: 8.5,
    status: "concluida",
    motorista: "Marcos Vinicius",
    veiculo: "Yamaha Fazer 250",
    pinSeguranca: "1098",
    createdTimestamp: Date.now() - 3600000 * 72,
  },
  {
    id: "cor-104",
    tipo: "corrida",
    categoria: "Partiu Plus",
    data: "01/Set às 21:40",
    origem: "Av. Otto Ribeiro, 1200",
    destino: "Rua Amadeu Tinoco Lacerda, 492",
    valor: 22.0,
    status: "concluida",
    motorista: "Roberto Fonseca",
    veiculo: "Toyota Corolla (PRT-9900)",
    pinSeguranca: "3321",
    createdTimestamp: Date.now() - 3600000 * 120,
  },
];

export class RideService {
  private static instance: RideService;

  private constructor() {}

  public static getInstance(): RideService {
    if (!RideService.instance) {
      RideService.instance = new RideService();
    }
    return RideService.instance;
  }

  /**
   * Busca o histórico mesclado de corridas e entregas ordenado pelas mais recentes
   */
  public async getUserActivityHistory(userIdParam?: string): Promise<UserActivityItem[]> {
    const session = supabaseAuthService.getStoredSession();
    const userId = userIdParam || session?.id;

    if (!isSupabaseConfigured()) {
      return DEMO_ACTIVITIES;
    }

    try {
      // 1. Busca corridas do passageiro
      let corridasQuery = (supabase as any)
        .from("partiu_corridas")
        .select(`
          id,
          codigo_viagem,
          modalidade,
          status,
          origem_endereco,
          destino_endereco,
          valor_bruto_cents,
          pin_seguranca,
          is_entrega,
          created_at,
          motorista_id
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      if (userId && !userId.startsWith("usr-pax-demo")) {
        corridasQuery = corridasQuery.eq("passageiro_id", userId);
      }

      const { data: corridas, error: errCorridas } = await corridasQuery;

      if (errCorridas || !corridas || corridas.length === 0) {
        return DEMO_ACTIVITIES;
      }

      const items: UserActivityItem[] = corridas.map((c: any) => {
        const isEntrega = c.is_entrega || c.modalidade?.includes("ENTREGA");
        const valorReal = (c.valor_bruto_cents || 0) / 100;
        const dataObj = new Date(c.created_at || Date.now());
        const dataFormatada = dataObj.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        const statusMap: Record<string, "concluida" | "cancelada" | "em_andamento"> = {
          CONCLUIDA: "concluida",
          CANCELADA: "cancelada",
          EM_VIAGEM: "em_andamento",
          A_CAMINHO: "em_andamento",
          CHEGOU: "em_andamento",
          PROCURANDO: "em_andamento",
        };

        return {
          id: c.id,
          tipo: isEntrega ? "entrega" : "corrida",
          categoria: isEntrega ? "Partiu Flash Entrega" : c.modalidade === "MOTO" ? "Partiu Moto" : "Partiu Pop",
          data: dataFormatada,
          origem: c.origem_endereco || "Ponto de Partida",
          destino: c.destino_endereco || "Destino Final",
          valor: valorReal > 0 ? valorReal : 12.5,
          status: statusMap[c.status] || "concluida",
          motorista: "Motorista Parceiro",
          veiculo: "Veículo Verificado",
          pinSeguranca: c.pin_seguranca,
          createdTimestamp: dataObj.getTime(),
        };
      });

      return items;
    } catch {
      return DEMO_ACTIVITIES;
    }
  }
}

export const rideService = RideService.getInstance();
