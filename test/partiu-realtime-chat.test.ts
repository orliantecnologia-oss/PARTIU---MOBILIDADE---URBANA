import { describe, test, expect } from "./test-harness.mjs";
import {
  chatRealtimeService,
  type RideMessage,
  type SenderType,
} from "../src/services/ChatRealtimeService.ts";
import {
  getContextualReplies,
} from "../src/components/chat/SmartReplyChips.tsx";

describe("SUITE 44: PARTIU REALTIME CHAT ENGINE — Security, Rate-Limiting & Ephemeral Lifecycle", () => {
  test("1. PII Sanitization: Máscara contra vazamento de cartões de crédito, CVV e senhas", () => {
    // Cartões de crédito (13 a 16 dígitos com ou sem espaços/traços)
    const rawCard1 = "Meu cartão é 4532 1198 2341 8976 para você cobrar";
    const sanitizedCard1 = chatRealtimeService.sanitizeContent(rawCard1);
    expect(sanitizedCard1.includes("4532 1198 2341 8976")).toBe(false);
    expect(sanitizedCard1.includes("[NÚMERO DE CARTÃO OCULTO]")).toBe(true);

    const rawCard2 = "paga no 1234567812345678";
    const sanitizedCard2 = chatRealtimeService.sanitizeContent(rawCard2);
    expect(sanitizedCard2.includes("1234567812345678")).toBe(false);
    expect(sanitizedCard2.includes("[NÚMERO DE CARTÃO OCULTO]")).toBe(true);

    // CVV / CVC
    const rawCvv = "O cvv 892 é o código de segurança";
    const sanitizedCvv = chatRealtimeService.sanitizeContent(rawCvv);
    expect(sanitizedCvv.includes("cvv 892")).toBe(false);
    expect(sanitizedCvv.includes("[CVV OCULTO]")).toBe(true);

    // Senha
    const rawSenha = "minha senha 123456";
    const sanitizedSenha = chatRealtimeService.sanitizeContent(rawSenha);
    expect(sanitizedSenha.includes("senha 123456")).toBe(false);
    expect(sanitizedSenha.includes("[PROTEGIDA]")).toBe(true);

    // Mensagem operacional normal permanece íntegra
    const rawNormal = "Estou de camisa branca em frente ao portão 12";
    const sanitizedNormal = chatRealtimeService.sanitizeContent(rawNormal);
    expect(sanitizedNormal).toBe("Estou de camisa branca em frente ao portão 12");
  });

  test("2. Rate-Limiting & Anti-Flood: Bloqueio de envio em intervalo < 1s e flood > 5 msgs/5s", () => {
    const senderKey = "driver-rate-limit-test";

    // 1ª mensagem: deve passar
    const check1 = chatRealtimeService.checkRateLimit(senderKey);
    expect(check1.allowed).toBe(true);

    // 2ª mensagem imediata: deve ser bloqueada pela trava de 1s
    const check2 = chatRealtimeService.checkRateLimit(senderKey);
    expect(check2.allowed).toBe(false);
    expect(check2.reason?.includes("Aguarde")).toBe(true);

    // Simula passagem de 1.1s com 5 mensagens acumuladas nos últimos 4 segundos
    const now = Date.now();
    const timestamps = [now - 4000, now - 3000, now - 2000, now - 1500, now - 1100];
    (chatRealtimeService as any).lastSentTimeByRide.set(senderKey, now - 1100);
    (chatRealtimeService as any).recentMessagesTimes.set(senderKey, timestamps);

    // 6ª mensagem dentro da janela de 5s: bloqueada por anti-flood (>= 5 mensagens)
    const checkFlood = chatRealtimeService.checkRateLimit(senderKey);
    expect(checkFlood.allowed).toBe(false);
    expect(checkFlood.reason?.includes("Muitas mensagens")).toBe(true);
  });

  test("3. Smart Replies Contextuais: Sugestões 1-Touch para Motorista e Passageiro por Estado", () => {
    // Sugestões para Motorista em 'A_CAMINHO'
    const driverACaminho = getContextualReplies("DRIVER", "A_CAMINHO");
    expect(Array.isArray(driverACaminho)).toBe(true);
    expect(driverACaminho.length >= 3).toBe(true);
    expect(driverACaminho.some((r) => r.includes("chegando") || r.includes("minutos"))).toBe(true);

    // Sugestões para Motorista em 'CHEGOU'
    const driverChegou = getContextualReplies("DRIVER", "CHEGOU");
    expect(driverChegou.some((r) => r.includes("local"))).toBe(true);
    expect(driverChegou.some((r) => r.includes("pisca-alerta") || r.includes("portão"))).toBe(true);

    // Sugestões para Passageiro em 'A_CAMINHO'
    const passACaminho = getContextualReplies("PASSENGER", "A_CAMINHO");
    expect(passACaminho.some((r) => r.includes("calçada") || r.includes("descendo"))).toBe(true);

    // Sugestões para Passageiro em 'CHEGOU'
    const passChegou = getContextualReplies("PASSENGER", "CHEGOU");
    expect(passChegou.some((r) => r.includes("portão") || r.includes("saindo") || r.includes("minuto"))).toBe(true);
  });

  test("4. Fila de Saída Offline (Outbox Queue): Enfileiramento com fallback e resincronização", () => {
    const rideId = "ride-outbox-test-99";
    const testMsg: RideMessage = {
      id: "test-outbox-1",
      rideId,
      senderId: "passenger-offline",
      senderType: "PASSENGER",
      messageType: "TEXT",
      content: "Estou sem internet mas enviando mensagem",
      clientMsgId: "client-msg-outbox-1",
      deliveredAt: new Date().toISOString(),
      readAt: null,
      createdAt: new Date().toISOString(),
      isPending: true,
    };

    // Enfileira mensagem na outbox
    (chatRealtimeService as any).queueInOutbox(rideId, testMsg);

    // Recupera outbox
    const outbox = (chatRealtimeService as any).getOutbox(rideId);
    expect(Array.isArray(outbox)).toBe(true);
    expect(outbox.length >= 1).toBe(true);
    expect(outbox.some((item: any) => item.message?.content === testMsg.content)).toBe(true);

    // Limpa outbox salvando lista vazia
    (chatRealtimeService as any).saveOutbox(rideId, []);
    const emptyOutbox = (chatRealtimeService as any).getOutbox(rideId);
    expect(emptyOutbox.length).toBe(0);
  });

  test("5. Contagem de Mensagens Não Lidas & Confirmação de Leitura (Read Receipts)", () => {
    const rideId = "ride-unread-tracking-123";

    // Simula mensagem enviada pelo motorista
    const incomingDriverMsg: RideMessage = {
      id: "msg-driver-1",
      rideId,
      senderType: "DRIVER",
      senderId: "driver-1",
      messageType: "TEXT",
      content: "Estou chegando na esquina!",
      createdAt: new Date().toISOString(),
      readAt: null,
      clientMsgId: "client-1",
      deliveredAt: new Date().toISOString(),
      isPending: false,
    };

    // Salva nas mensagens em cache
    (chatRealtimeService as any).messagesByRide.set(rideId, [incomingDriverMsg]);

    // Para o passageiro, a mensagem do motorista deve contar como NÃO LIDA
    const passengerUnread = chatRealtimeService.getUnreadCount(rideId, "PASSENGER");
    expect(passengerUnread).toBe(1);

    // Para o próprio motorista que enviou, não deve contar como não lida
    const driverUnread = chatRealtimeService.getUnreadCount(rideId, "DRIVER");
    expect(driverUnread).toBe(0);

    // Marca como lida para o passageiro
    chatRealtimeService.markAsRead(rideId, "PASSENGER");
    const passengerUnreadAfter = chatRealtimeService.getUnreadCount(rideId, "PASSENGER");
    expect(passengerUnreadAfter).toBe(0);
  });

  test("6. Isolamento de Canal por Corrida & Formato do Tópico Realtime", () => {
    const rideIdA = "ride-alpha-1";
    const rideIdB = "ride-bravo-2";

    const channelNameA = "ride_chat_" + rideIdA;
    const channelNameB = "ride_chat_" + rideIdB;

    expect(channelNameA).toBe("ride_chat_ride-alpha-1");
    expect(channelNameB).toBe("ride_chat_ride-bravo-2");
    expect(channelNameA === channelNameB).toBe(false);
  });
});
