/**
 * ==============================================================================
 * 💬 PARTIU REALTIME CHAT SERVICE (v1.0)
 * ==============================================================================
 * Motor de mensageria instantânea, efêmera e segura entre Passageiro e Motorista.
 *
 * Funcionalidades Arquiteturais:
 * 1. Isolamento Estrito: Canal Supabase Realtime por corrida (`ride_chat_${rideId}`)
 * 2. Proteção de Dados (LGPD): Sanitização de PII (cartões de crédito, senhas)
 * 3. Moderação Defensiva: Rate limiting (máx. 1 msg/s) e trava anti-flood
 * 4. Fila Outbox Offline: Mensagens salvas localmente e sincronizadas após reconexão
 * 5. Notificação Audiovisual: Som suave sintetizado (Web Audio API) e vibração háptica
 * 6. Zero Polling: Orientado estritamente a eventos Realtime (INSERT/UPDATE)
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { silentCatchWarn } from "@/lib/structured-logger";


export type SenderType = "PASSENGER" | "DRIVER" | "SYSTEM";
export type MessageType = "TEXT" | "SMART_REPLY" | "SYSTEM";

export interface RideMessage {
  id: string;
  rideId: string;
  senderId: string;
  senderType: SenderType;
  messageType: MessageType;
  content: string;
  clientMsgId?: string | undefined;
  deliveredAt?: string | undefined;
  readAt?: string | null | undefined;
  createdAt: string;
  isPending?: boolean | undefined;
  isError?: boolean | undefined;
}

export type ChatMessageListener = (messages: RideMessage[]) => void;
export type UnreadCountListener = (count: number) => void;

interface OutboxItem {
  message: RideMessage;
  attempts: number;
}

export class ChatRealtimeService {
  private static instance: ChatRealtimeService;

  // Estado em memória por corrida
  private messagesByRide: Map<string, RideMessage[]> = new Map();
  private activeChannels: Map<string, RealtimeChannel> = new Map();
  private messageListeners: Map<string, Set<ChatMessageListener>> = new Map();
  private unreadListeners: Map<string, Set<UnreadCountListener>> = new Map();

  // Moderação e Anti-Flood
  private lastSentTimeByRide: Map<string, number> = new Map();
  private recentMessagesTimes: Map<string, number[]> = new Map();

  // Persistência em Memória (Fallback para SSR/Node e Contingência)
  private memoryOutbox: Map<string, OutboxItem[]> = new Map();
  private memoryStoredMessages: Map<string, RideMessage[]> = new Map();

  // Áudio Sintetizado
  private audioCtx: AudioContext | null = null;

  private constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.processAllOutboxes();
      });
    }
  }

  public static getInstance(): ChatRealtimeService {
    if (!ChatRealtimeService.instance) {
      ChatRealtimeService.instance = new ChatRealtimeService();
    }
    return ChatRealtimeService.instance;
  }

  // ============================================================================
  // 1. SANITIZAÇÃO DE DADOS SENSÍVEIS (LGPD & ANTIFRAUDE)
  // ============================================================================

  /**
   * Mascara números de cartão de crédito (13-16 dígitos) e padrões sensíveis
   */
  public sanitizeContent(rawText: string): string {
    if (!rawText) return "";

    let sanitized = rawText;

    // Mascara possíveis sequências de cartão de crédito (com ou sem espaços/hífens)
    const cardRegex = /\b(?:\d[ -]*?){13,16}\b/g;
    sanitized = sanitized.replace(cardRegex, "[NÚMERO DE CARTÃO OCULTO]");

    // Mascara CVV/CVC explícitos (ex: cvv 123 ou cvc 123)
    const cvvRegex = /\b(?:cvv|cvc)[\s:]*([0-9]{3,4})\b/gi;
    sanitized = sanitized.replace(cvvRegex, "[CVV OCULTO]");

    // Mascara senhas explícitas
    const passwordRegex = /\b(?:senha|password)[\s:=]+(\S+)/gi;
    sanitized = sanitized.replace(passwordRegex, "senha: [PROTEGIDA]");

    return sanitized.trim();
  }

  // ============================================================================
  // 2. MODERAÇÃO, RATE LIMITING & ANTI-FLOOD
  // ============================================================================

  /**
   * Valida se a mensagem respeita os limites de taxa (1 msg/s e máx. 5 msgs/5s)
   */
  public checkRateLimit(rideId: string): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const lastSent = this.lastSentTimeByRide.get(rideId) || 0;

    // Regra 1: Mínimo 1000ms entre mensagens consecutivas
    if (now - lastSent < 950) {
      return {
        allowed: false,
        reason: "Aguarde 1 segundo antes de enviar outra mensagem.",
      };
    }

    // Regra 2: Anti-flood de 5 mensagens em 5 segundos
    const timestamps = this.recentMessagesTimes.get(rideId) || [];
    const recent = timestamps.filter((t) => now - t < 5000);
    if (recent.length >= 5) {
      return {
        allowed: false,
        reason: "Muitas mensagens enviadas rapidamente. Aguarde alguns instantes.",
      };
    }

    recent.push(now);
    this.recentMessagesTimes.set(rideId, recent);
    this.lastSentTimeByRide.set(rideId, now);

    return { allowed: true };
  }

  // ============================================================================
  // 3. INICIALIZAÇÃO DE CANAL REALTIME (ISOLAMENTO POR CORRIDA)
  // ============================================================================

  /**
   * Conecta ao canal Supabase da corrida específica e carrega histórico
   */
  public subscribeToRideChat(
    rideId: string,
    currentUserType: SenderType,
    onMessages: ChatMessageListener,
    onUnreadChange?: UnreadCountListener
  ): () => void {
    // 1. Registra listeners
    if (!this.messageListeners.has(rideId)) {
      this.messageListeners.set(rideId, new Set());
    }
    this.messageListeners.get(rideId)!.add(onMessages);

    if (onUnreadChange) {
      if (!this.unreadListeners.has(rideId)) {
        this.unreadListeners.set(rideId, new Set());
      }
      this.unreadListeners.get(rideId)!.add(onUnreadChange);
    }

    // 2. Carrega mensagens em cache ou histórico
    this.loadMessages(rideId, currentUserType);

    // 3. Estabelece canal Supabase Realtime se ainda não ativo
    if (!this.activeChannels.has(rideId)) {
      this.initRealtimeChannel(rideId, currentUserType);
    }

    // 4. Retorna função de cancelamento de assinatura (Cleanup)
    return () => {
      const msgSet = this.messageListeners.get(rideId);
      if (msgSet) {
        msgSet.delete(onMessages);
        if (msgSet.size === 0) {
          this.messageListeners.delete(rideId);
        }
      }

      if (onUnreadChange) {
        const unreadSet = this.unreadListeners.get(rideId);
        if (unreadSet) {
          unreadSet.delete(onUnreadChange);
          if (unreadSet.size === 0) {
            this.unreadListeners.delete(rideId);
          }
        }
      }

      // Se não houver mais nenhum ouvinte na corrida, fecha o canal
      if (!this.messageListeners.has(rideId) && !this.unreadListeners.has(rideId)) {
        this.teardownChannel(rideId);
      }
    };
  }

  private async loadMessages(rideId: string, currentUserType: SenderType) {
    // 1. Lê do localStorage local de contingência
    const cached = this.getStoredMessages(rideId);
    if (cached.length > 0) {
      this.messagesByRide.set(rideId, cached);
      this.notifyListeners(rideId);
      this.notifyUnread(rideId, currentUserType);
    }

    // 2. Sincroniza do Supabase se configurado
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await (supabase as any)
          .from("partiu_ride_messages")
          .select("*")
          .eq("ride_id", rideId)
          .order("created_at", { ascending: true });

        if (!error && Array.isArray(data)) {
          const remoteMessages: RideMessage[] = data.map((m: any) => ({
            id: m.id,
            rideId: m.ride_id,
            senderId: m.sender_id,
            senderType: m.sender_type,
            messageType: m.message_type,
            content: m.content,
            clientMsgId: m.client_msg_id,
            deliveredAt: m.delivered_at,
            readAt: m.read_at,
            createdAt: m.created_at,
          }));

          // Merge inteligente com mensagens locais da outbox
          const outbox = this.getOutbox(rideId);
          const pending = outbox.map((o) => o.message);
          const merged = this.mergeMessages(remoteMessages, pending);

          this.messagesByRide.set(rideId, merged);
          this.saveStoredMessages(rideId, merged);
          this.notifyListeners(rideId);
          this.notifyUnread(rideId, currentUserType);
        }
      } catch (err) {
        console.warn("[ChatRealtime] Falha ao carregar mensagens do banco:", err);
      }
    }
  }

  private initRealtimeChannel(rideId: string, currentUserType: SenderType) {
    const channelName = `ride_chat_${rideId}`;

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: true },
      },
    });

    // Escuta novas mensagens (INSERT) na tabela
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "partiu_ride_messages",
          filter: `ride_id=eq.${rideId}`,
        },
        (payload) => {
          this.handleIncomingMessage(payload.new, currentUserType);
        }
      )
      // Escuta atualizações de leitura (UPDATE read_at)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "partiu_ride_messages",
          filter: `ride_id=eq.${rideId}`,
        },
        (payload) => {
          this.handleMessageUpdate(payload.new);
        }
      )
      // Broadcast rápido in-process para contingência em tempo real
      .on("broadcast", { event: "new_message" }, ({ payload }) => {
        this.handleIncomingMessage(payload, currentUserType);
      })
      .on("broadcast", { event: "messages_read" }, ({ payload }) => {
        this.handleMessagesReadBroadcast(payload);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[ChatRealtime] Conectado ao chat da corrida: ${channelName}`);
          this.processOutbox(rideId);
        }
      });

    this.activeChannels.set(rideId, channel);
  }

  private teardownChannel(rideId: string) {
    const channel = this.activeChannels.get(rideId);
    if (channel) {
      void supabase.removeChannel(channel);
      this.activeChannels.delete(rideId);
      console.log(`[ChatRealtime] Canal do chat desconectado: ride_chat_${rideId}`);
    }
  }

  // ============================================================================
  // 4. ENVIO DE MENSAGENS & RESILIÊNCIA OFFLINE (OUTBOX)
  // ============================================================================

  /**
   * Envia uma mensagem com sanitização, rate limiting e suporte a Outbox offline
   */
  public async sendMessage(input: {
    rideId: string;
    senderId: string;
    senderType: SenderType;
    messageType?: MessageType | undefined;
    content: string;
  }): Promise<{ success: boolean; message?: RideMessage | undefined; error?: string | undefined }> {
    const { rideId, senderId, senderType, messageType = "TEXT", content } = input;

    // 1. Sanitização de conteúdo
    const cleanContent = this.sanitizeContent(content);
    if (!cleanContent) {
      return { success: false, error: "Mensagem vazia ou inválida." };
    }

    // 2. Validação de Rate Limiting
    const rateCheck = this.checkRateLimit(rideId);
    if (!rateCheck.allowed) {
      return { success: false, error: rateCheck.reason };
    }

    // 3. Monta objeto de mensagem local com UUID único
    const clientMsgId = `cmsg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const localMessage: RideMessage = {
      id: clientMsgId,
      rideId,
      senderId,
      senderType,
      messageType,
      content: cleanContent,
      clientMsgId,
      createdAt: new Date().toISOString(),
      isPending: true,
    };

    // 4. Salva no estado e notifica UI instantaneamente (Optimistic UI)
    const list = this.messagesByRide.get(rideId) || [];
    list.push(localMessage);
    this.messagesByRide.set(rideId, list);
    this.saveStoredMessages(rideId, list);
    this.notifyListeners(rideId);

    // 5. Envia via Supabase ou salva na Outbox offline se indisponível
    if (!navigator.onLine || !isSupabaseConfigured()) {
      this.queueInOutbox(rideId, localMessage);
      // Se estiver offline ou em contingência, simula entrega via broadcast
      this.broadcastLocal(rideId, localMessage);
      return { success: true, message: localMessage };
    }

    try {
      const channel = this.activeChannels.get(rideId);
      if (channel) {
        // Dispara broadcast imediato para latência sub-50ms
        void channel.send({
          type: "broadcast",
          event: "new_message",
          payload: localMessage,
        });
      }

      const { data, error } = await (supabase as any)
        .from("partiu_ride_messages")
        .insert({
          ride_id: rideId,
          sender_id: senderId,
          sender_type: senderType,
          message_type: messageType,
          content: cleanContent,
          client_msg_id: clientMsgId,
        })
        .select()
        .single();

      if (error) {
        console.warn("[ChatRealtime] Erro ao gravar no banco, enfileirando Outbox:", error.message);
        this.queueInOutbox(rideId, localMessage);
        return { success: true, message: localMessage };
      }

      // Atualiza a mensagem com o ID do banco e remove estado pendente
      localMessage.id = data.id;
      localMessage.isPending = false;
      localMessage.deliveredAt = data.delivered_at || new Date().toISOString();

      this.saveStoredMessages(rideId, list);
      this.notifyListeners(rideId);

      return { success: true, message: localMessage };
    } catch (err) {
      console.warn("[ChatRealtime] Exceção no envio, enfileirando Outbox:", err);
      this.queueInOutbox(rideId, localMessage);
      return { success: true, message: localMessage };
    }
  }

  // ============================================================================
  // 5. TRATAMENTO DE MENSAGENS RECEBIDAS & ALERTA AUDITIVO
  // ============================================================================

  private handleIncomingMessage(raw: any, currentUserType: SenderType) {
    if (!raw || !raw.ride_id && !raw.rideId) return;

    const rideId = raw.ride_id || raw.rideId;
    const clientMsgId = raw.client_msg_id || raw.clientMsgId;

    const list = this.messagesByRide.get(rideId) || [];

    // Deduplicação pelo clientMsgId ou ID
    const existingIndex = list.findIndex(
      (m) => (clientMsgId && m.clientMsgId === clientMsgId) || m.id === raw.id
    );

    const formatted: RideMessage = {
      id: raw.id || clientMsgId,
      rideId,
      senderId: raw.sender_id || raw.senderId,
      senderType: raw.sender_type || raw.senderType,
      messageType: raw.message_type || raw.messageType,
      content: raw.content,
      clientMsgId,
      deliveredAt: raw.delivered_at || raw.deliveredAt || new Date().toISOString(),
      readAt: raw.read_at || raw.readAt || null,
      createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
      isPending: false,
    };

    if (existingIndex >= 0) {
      list[existingIndex] = formatted;
    } else {
      list.push(formatted);

      // Se a mensagem foi recebida de outro participante, dispara feedback sonoro e vibração
      if (formatted.senderType !== currentUserType && formatted.senderType !== "SYSTEM") {
        this.playMessageChime();
        this.triggerHapticFeedback();
      }
    }

    this.messagesByRide.set(rideId, list);
    this.saveStoredMessages(rideId, list);
    this.notifyListeners(rideId);
    this.notifyUnread(rideId, currentUserType);
  }

  private handleMessageUpdate(raw: any) {
    const rideId = raw.ride_id;
    const list = this.messagesByRide.get(rideId);
    if (!list) return;

    const target = list.find((m) => m.id === raw.id);
    if (target) {
      target.readAt = raw.read_at;
      this.notifyListeners(rideId);
    }
  }

  private handleMessagesReadBroadcast(payload: { rideId: string; readAt: string; readerType: SenderType }) {
    const list = this.messagesByRide.get(payload.rideId);
    if (!list) return;

    list.forEach((m) => {
      if (m.senderType !== payload.readerType && !m.readAt) {
        m.readAt = payload.readAt;
      }
    });

    this.notifyListeners(payload.rideId);
  }

  // ============================================================================
  // 6. MARCAÇÃO DE LEITURA (READ RECEIPTS)
  // ============================================================================

  /**
   * Marca todas as mensagens não lidas recebidas como lidas
   */
  public async markAsRead(rideId: string, readerType: SenderType): Promise<void> {
    const list = this.messagesByRide.get(rideId);
    if (!list || list.length === 0) return;

    const unreadIds: string[] = [];
    const nowIso = new Date().toISOString();

    list.forEach((m) => {
      if (m.senderType !== readerType && m.senderType !== "SYSTEM" && !m.readAt) {
        m.readAt = nowIso;
        unreadIds.push(m.id);
      }
    });

    if (unreadIds.length === 0) return;

    this.saveStoredMessages(rideId, list);
    this.notifyListeners(rideId);
    this.notifyUnread(rideId, readerType);

    // Notifica via broadcast
    const channel = this.activeChannels.get(rideId);
    if (channel) {
      void channel.send({
        type: "broadcast",
        event: "messages_read",
        payload: { rideId, readAt: nowIso, readerType },
      });
    }

    // Persiste atualização no Supabase
    if (isSupabaseConfigured()) {
      try {
        await (supabase as any)
          .from("partiu_ride_messages")
          .update({ read_at: nowIso })
          .in("id", unreadIds);
      } catch (err) {
        console.warn("[ChatRealtime] Falha ao marcar leitura no banco:", err);
      }
    }
  }

  // ============================================================================
  // 7. CONTAGEM DE MENSAGENS NÃO LIDAS
  // ============================================================================

  public getUnreadCount(rideId: string, currentUserType: SenderType): number {
    const list = this.messagesByRide.get(rideId) || this.getStoredMessages(rideId);
    return list.filter(
      (m) => m.senderType !== currentUserType && m.senderType !== "SYSTEM" && !m.readAt
    ).length;
  }

  // ============================================================================
  // 8. FEEDBACK AUDITIVO E HÁPTICO (UX LEVE)
  // ============================================================================

  /**
   * Toca um sino suave sintetizado via Web Audio API (sem dependência de MP3)
   */
  public playMessageChime(): void {
    if (typeof window === "undefined") return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === "suspended") {
        void this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // Oscilador 1: Tom agudo suave
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);

      osc1.start(now);
      osc1.stop(now + 0.3);
    } catch (err) { silentCatchWarn("ChatRealtimeService", err); }
  }

  /**
   * Dispara padrão de vibração curto (padrão 99/Uber)
   */
  public triggerHapticFeedback(): void {
    if (typeof window !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate([30, 40, 30]);
      } catch (err) { silentCatchWarn("ChatRealtimeService", err); }
    }
  }

  // ============================================================================
  // 9. GESTÃO DE OUTBOX & STORAGE RESILIENTE
  // ============================================================================

  private getOutboxKey(rideId: string): string {
    return `partiu_chat_outbox_${rideId}`;
  }

  private getMessagesStorageKey(rideId: string): string {
    return `partiu_chat_msgs_${rideId}`;
  }

  private getOutbox(rideId: string): OutboxItem[] {
    if (typeof window === "undefined") {
      return this.memoryOutbox.get(rideId) || [];
    }
    try {
      const raw = localStorage.getItem(this.getOutboxKey(rideId));
      return raw ? JSON.parse(raw) : (this.memoryOutbox.get(rideId) || []);
    } catch {
      return this.memoryOutbox.get(rideId) || [];
    }
  }

  private saveOutbox(rideId: string, items: OutboxItem[]) {
    this.memoryOutbox.set(rideId, items);
    if (typeof window === "undefined") return;
    try {
      if (items.length === 0) {
        localStorage.removeItem(this.getOutboxKey(rideId));
      } else {
        localStorage.setItem(this.getOutboxKey(rideId), JSON.stringify(items));
      }
    } catch (err) { silentCatchWarn("ChatRealtimeService", err); }
  }

  private queueInOutbox(rideId: string, message: RideMessage) {
    const outbox = this.getOutbox(rideId);
    outbox.push({ message, attempts: 0 });
    this.saveOutbox(rideId, outbox);
  }

  private async processOutbox(rideId: string) {
    if (!navigator.onLine || !isSupabaseConfigured()) return;

    const outbox = this.getOutbox(rideId);
    if (outbox.length === 0) return;

    const remaining: OutboxItem[] = [];

    for (const item of outbox) {
      try {
        const { error } = await (supabase as any).from("partiu_ride_messages").insert({
          ride_id: item.message.rideId,
          sender_id: item.message.senderId,
          sender_type: item.message.senderType,
          message_type: item.message.messageType,
          content: item.message.content,
          client_msg_id: item.message.clientMsgId,
        });

        if (!error) {
          // Atualiza o estado da mensagem para não pendente
          const list = this.messagesByRide.get(rideId) || [];
          const target = list.find((m) => m.clientMsgId === item.message.clientMsgId);
          if (target) {
            target.isPending = false;
          }
        } else {
          item.attempts += 1;
          if (item.attempts < 5) remaining.push(item);
        }
      } catch {
        item.attempts += 1;
        if (item.attempts < 5) remaining.push(item);
      }
    }

    this.saveOutbox(rideId, remaining);
    this.notifyListeners(rideId);
  }

  private processAllOutboxes() {
    this.messagesByRide.forEach((_, rideId) => {
      void this.processOutbox(rideId);
    });
  }

  private getStoredMessages(rideId: string): RideMessage[] {
    if (typeof window === "undefined") {
      return this.memoryStoredMessages.get(rideId) || [];
    }
    try {
      const raw = localStorage.getItem(this.getMessagesStorageKey(rideId));
      return raw ? JSON.parse(raw) : (this.memoryStoredMessages.get(rideId) || []);
    } catch {
      return this.memoryStoredMessages.get(rideId) || [];
    }
  }

  private saveStoredMessages(rideId: string, messages: RideMessage[]) {
    // Limita em 100 mensagens para evitar consumo de memória/localStorage
    const slice = messages.slice(-100);
    this.memoryStoredMessages.set(rideId, slice);
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(this.getMessagesStorageKey(rideId), JSON.stringify(slice));
    } catch (err) { silentCatchWarn("ChatRealtimeService", err); }
  }

  private mergeMessages(remote: RideMessage[], pending: RideMessage[]): RideMessage[] {
    const map = new Map<string, RideMessage>();
    remote.forEach((m) => map.set(m.clientMsgId || m.id, m));
    pending.forEach((p) => {
      if (!map.has(p.clientMsgId || p.id)) {
        map.set(p.clientMsgId || p.id, p);
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  private broadcastLocal(rideId: string, msg: RideMessage) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("partiu:chat_local_message", {
          detail: { rideId, message: msg },
        })
      );
    }
  }

  private notifyListeners(rideId: string) {
    const list = this.messagesByRide.get(rideId) || [];
    const listeners = this.messageListeners.get(rideId);
    if (listeners) {
      listeners.forEach((l) => {
        try {
          l([...list]);
        } catch (e) {
          console.error("[ChatRealtime] Erro no listener de mensagens:", e);
        }
      });
    }
  }

  private notifyUnread(rideId: string, currentUserType: SenderType) {
    const count = this.getUnreadCount(rideId, currentUserType);
    const listeners = this.unreadListeners.get(rideId);
    if (listeners) {
      listeners.forEach((l) => {
        try {
          l(count);
        } catch (e) {
          console.error("[ChatRealtime] Erro no listener de não lidas:", e);
        }
      });
    }
  }
}

export const chatRealtimeService = ChatRealtimeService.getInstance();
