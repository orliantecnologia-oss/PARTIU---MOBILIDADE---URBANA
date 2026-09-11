/**
 * ==============================================================================
 * 🎫 PARTIU SUPPORT & CUSTOMER SUCCESS ENGINE — CENTRAL DE AJUDA 99
 * ==============================================================================
 * Gerencia chamados de suporte técnico, esquecimento de pertences no carro,
 * contestações financeiras e mediação de conflitos entre condutor e passageiro.
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { silentCatchWarn } from "@/lib/structured-logger";

export type TicketCategory =
  | "LOST_ITEM"
  | "PAYMENT_DISPUTE"
  | "SAFETY_BEHAVIOR"
  | "APP_HELP"
  | "GENERAL";

export type TicketStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  userRole: "PASSENGER" | "DRIVER" | "PARTNER";
  rideId?: string | null;
  category: TicketCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  adminNotes?: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketInput {
  userId: string;
  userName?: string;
  userPhone?: string;
  userRole?: "PASSENGER" | "DRIVER" | "PARTNER";
  rideId?: string | null;
  category: TicketCategory;
  subject: string;
  description: string;
  priority?: TicketPriority;
  tenantId?: string;
}

export class SupportTicketService {
  private static instance: SupportTicketService;
  private localTickets: Map<string, SupportTicket> = new Map();

  private constructor() {}

  public static getInstance(): SupportTicketService {
    if (!SupportTicketService.instance) {
      SupportTicketService.instance = new SupportTicketService();
    }
    return SupportTicketService.instance;
  }

  public generateTicketNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(10000 + Math.random() * 90000);
    return `TK-${year}-${random}`;
  }

  /**
   * Cria um chamado na Central de Ajuda
   */
  public async createTicket(input: CreateTicketInput): Promise<SupportTicket> {
    const ticketNumber = this.generateTicketNumber();
    const now = new Date().toISOString();
    const id = `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const ticket: SupportTicket = {
      id,
      ticketNumber,
      userId: input.userId,
      userName: input.userName || "Usuário",
      userPhone: input.userPhone,
      userRole: input.userRole || "PASSENGER",
      rideId: input.rideId || null,
      category: input.category,
      subject: input.subject,
      description: input.description,
      status: "OPEN",
      priority: input.priority || "MEDIUM",
      adminNotes: null,
      tenantId: input.tenantId || "default",
      createdAt: now,
      updatedAt: now,
    };

    // Armazena localmente de forma resiliente
    this.localTickets.set(ticket.id, ticket);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from("support_tickets").insert({
          id: ticket.id,
          ticket_number: ticket.ticketNumber,
          user_id: ticket.userId,
          user_name: ticket.userName,
          user_phone: ticket.userPhone,
          user_role: ticket.userRole,
          ride_id: ticket.rideId,
          category: ticket.category,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          tenant_id: ticket.tenantId,
          created_at: ticket.createdAt,
          updated_at: ticket.updatedAt,
        });

        if (error) {
          silentCatchWarn("SupportTicketService.createTicket", error);
        }
      } catch (err) {
        silentCatchWarn("SupportTicketService.createTicket", err);
      }
    }

    return ticket;
  }

  /**
   * Lista tickets de um usuário
   */
  public async getUserTickets(userId: string): Promise<SupportTicket[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from("support_tickets")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map(this.mapRowToTicket);
        }
      } catch (err) {
        silentCatchWarn("SupportTicketService.getUserTickets", err);
      }
    }

    return Array.from(this.localTickets.values())
      .filter((t) => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Atualiza status de um chamado
   */
  public async updateStatus(ticketId: string, status: TicketStatus, adminNotes?: string): Promise<boolean> {
    const local = this.localTickets.get(ticketId);
    if (local) {
      local.status = status;
      if (adminNotes !== undefined) local.adminNotes = adminNotes;
      local.updatedAt = new Date().toISOString();
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const updatePayload: Record<string, any> = {
          status,
          updated_at: new Date().toISOString(),
        };
        if (adminNotes !== undefined) {
          updatePayload.admin_notes = adminNotes;
        }

        const { error } = await supabase
          .from("support_tickets")
          .update(updatePayload)
          .eq("id", ticketId);

        if (!error) return true;
      } catch (err) {
        silentCatchWarn("SupportTicketService.updateStatus", err);
      }
    }

    return true;
  }

  private mapRowToTicket(row: any): SupportTicket {
    return {
      id: row.id,
      ticketNumber: row.ticket_number,
      userId: row.user_id,
      userName: row.user_name,
      userPhone: row.user_phone,
      userRole: row.user_role,
      rideId: row.ride_id,
      category: row.category,
      subject: row.subject,
      description: row.description,
      status: row.status,
      priority: row.priority,
      adminNotes: row.admin_notes,
      tenantId: row.tenant_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public resetLocalStore(): void {
    this.localTickets.clear();
  }
}

export const supportTicketService = SupportTicketService.getInstance();
