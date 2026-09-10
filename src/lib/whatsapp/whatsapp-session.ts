/**
 * PARTIU WHATSAPP SESSION ENGINE
 * 
 * Gerenciador de Sessão e Estado Conversacional para o canal WhatsApp.
 * Mantém o contexto de cada usuário por número de telefone com TTL dinâmico.
 */

export type WhatsAppSessionStep =
  | 'IDLE'
  | 'AGUARDANDO_ORIGEM'
  | 'AGUARDANDO_DESTINO'
  | 'COTACAO_APRESENTADA'
  | 'AGUARDANDO_PAGAMENTO_PIX'
  | 'EM_DESPACHO'
  | 'EM_VIAGEM'
  | 'AVALIACAO_PENDENTE'
  | 'TRANSBORDO_HUMANO';

export interface WhatsAppUserSession {
  sessionId: string;
  phoneNumber: string;
  userName: string;
  currentStep: WhatsAppSessionStep;
  cityId: string;
  cityName: string;
  originText?: string | undefined;
  destinationText?: string | undefined;
  originCoordinates?: { latitude: number; longitude: number } | undefined;
  destinationCoordinates?: { latitude: number; longitude: number } | undefined;
  selectedModalidade?: 'POP' | 'MOTO' | 'PLUS' | undefined;
  quotedFareBrl?: number | undefined;
  quotedDistanceKm?: number | undefined;
  quotedEtaMinutes?: number | undefined;
  pixTxId?: string | undefined;
  pixQrCodePayload?: string | undefined;
  activeRideId?: string | undefined;
  assignedDriverName?: string | undefined;
  assignedDriverPhone?: string | undefined;
  assignedVehiclePlate?: string | undefined;
  assignedVehicleModel?: string | undefined;
  trackingUrl?: string | undefined;
  isHumanTakeover: boolean;
  createdAt: number;
  lastInteractionAt: number;
  expiresAt: number;
}

export class WhatsAppSessionManager {
  private sessions: Map<string, WhatsAppUserSession> = new Map();
  private readonly defaultTtlMs = 30 * 60 * 1000; // 30 minutos de inatividade

  /**
   * Obtém ou inicializa uma nova sessão para o número
   */
  public getOrCreateSession(phoneNumber: string, userName: string = 'Passageiro'): WhatsAppUserSession {
    const cleanPhone = this.cleanPhoneNumber(phoneNumber);
    const existing = this.sessions.get(cleanPhone);
    const now = Date.now();

    if (existing && existing.expiresAt > now) {
      existing.lastInteractionAt = now;
      existing.expiresAt = now + this.defaultTtlMs;
      return existing;
    }

    const newSession: WhatsAppUserSession = {
      sessionId: `WPP-SES-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      phoneNumber: cleanPhone,
      userName,
      currentStep: 'IDLE',
      cityId: 'itaperuna-rj',
      cityName: 'Itaperuna',
      isHumanTakeover: false,
      createdAt: now,
      lastInteractionAt: now,
      expiresAt: now + this.defaultTtlMs
    };

    this.sessions.set(cleanPhone, newSession);
    return newSession;
  }

  public getSession(phoneNumber: string): WhatsAppUserSession | undefined {
    const cleanPhone = this.cleanPhoneNumber(phoneNumber);
    const session = this.sessions.get(cleanPhone);
    if (!session) return undefined;
    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(cleanPhone);
      return undefined;
    }
    return session;
  }

  public updateSession(phoneNumber: string, updates: Partial<WhatsAppUserSession>): WhatsAppUserSession {
    const session = this.getOrCreateSession(phoneNumber);
    Object.assign(session, updates, {
      lastInteractionAt: Date.now(),
      expiresAt: Date.now() + this.defaultTtlMs
    });
    return session;
  }

  public resetSession(phoneNumber: string): void {
    const cleanPhone = this.cleanPhoneNumber(phoneNumber);
    this.sessions.delete(cleanPhone);
  }

  public cleanPhoneNumber(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  public getActiveSessionsCount(): number {
    const now = Date.now();
    let count = 0;
    this.sessions.forEach(s => {
      if (s.expiresAt > now) count++;
    });
    return count;
  }
}

export const whatsAppSessionManager = new WhatsAppSessionManager();
