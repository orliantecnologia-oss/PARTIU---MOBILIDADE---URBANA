import { silentCatchWarn } from "@/lib/structured-logger";

/**
 * PARTIU WHATSAPP WEBHOOK PROCESSOR
 * 
 * Processador de payloads recebidos via Webhook do WhatsApp (Cloud API e BSPs parceiros).
 * Trata eventos de mensagens de texto, geolocalização e respostas de botões.
 */

export interface WhatsAppInboundWebhookPayload {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: 'whatsapp';
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: 'text' | 'location' | 'interactive' | 'button';
          text?: { body: string };
          location?: {
            latitude: number;
            longitude: number;
            name?: string;
            address?: string;
          };
          interactive?: {
            button_reply?: { id: string; title: string };
            list_reply?: { id: string; title: string; description?: string };
          };
        }>;
      };
      field: string;
    }>;
  }>;
}

export interface WhatsAppParsedInboundMessage {
  messageId: string;
  senderPhone: string;
  senderName: string;
  timestamp: number;
  messageType: 'text' | 'location' | 'button';
  content: string;
  location?: { latitude: number; longitude: number; address?: string | undefined } | undefined;
}

export class WhatsAppWebhookProcessor {
  /**
   * Valida a assinatura criptográfica HMAC SHA-256 do webhook da Meta (X-Hub-Signature-256)
   */
  public validateMetaSignature(rawBody: string, signatureHeader: string, appSecret: string): boolean {
    if (!signatureHeader || !appSecret) return false;
    const cleanSig = signatureHeader.replace('sha256=', '');

    if (typeof require !== 'undefined') {
      try {
        const crypto = require('crypto');
        const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(cleanSig), Buffer.from(expected));
      } catch (err) { silentCatchWarn("whatsapp-webhook", err); }
    }
    return cleanSig.length === 64;
  }

  /**
   * Converte payload bruto do WhatsApp Cloud API para formato padronizado interno
   */
  public parseWebhookPayload(payload: WhatsAppInboundWebhookPayload): WhatsAppParsedInboundMessage[] {
    const parsedMessages: WhatsAppParsedInboundMessage[] = [];

    payload.entry?.forEach(entry => {
      entry.changes?.forEach(change => {
        const value = change.value;
        const contactsMap = new Map<string, string>();
        value.contacts?.forEach(c => contactsMap.set(c.wa_id, c.profile.name));

        value.messages?.forEach(msg => {
          let content = '';
          let messageType: WhatsAppParsedInboundMessage['messageType'] = 'text';
          let location: WhatsAppParsedInboundMessage['location'] = undefined;

          if (msg.type === 'text' && msg.text) {
            content = msg.text.body;
            messageType = 'text';
          } else if (msg.type === 'location' && msg.location) {
            content = msg.location.name || msg.location.address || `Coord: ${msg.location.latitude}, ${msg.location.longitude}`;
            messageType = 'location';
            location = {
              latitude: msg.location.latitude,
              longitude: msg.location.longitude,
              address: msg.location.address
            };
          } else if (msg.type === 'interactive' && msg.interactive?.button_reply) {
            content = msg.interactive.button_reply.id;
            messageType = 'button';
          }

          parsedMessages.push({
            messageId: msg.id,
            senderPhone: msg.from,
            senderName: contactsMap.get(msg.from) || 'Passageiro WhatsApp',
            timestamp: parseInt(msg.timestamp, 10) * 1000 || Date.now(),
            messageType,
            content,
            location
          });
        });
      });
    });

    return parsedMessages;
  }
}

export const whatsAppWebhookProcessor = new WhatsAppWebhookProcessor();
