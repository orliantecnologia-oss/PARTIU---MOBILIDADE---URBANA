import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  X,
  Send,
  Check,
  CheckCheck,
  Clock,
  WifiOff,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  chatRealtimeService,
  type RideMessage,
  type SenderType,
} from "@/services/ChatRealtimeService";
import { driverVoiceAssistant } from "@/services/DriverVoiceAssistantService";
import { SmartReplyChips } from "./SmartReplyChips";

export interface ChatBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  rideId: string;
  currentUserType: SenderType;
  currentUserId: string;
  partnerName: string;
  partnerPhoto?: string | undefined;
  partnerVehicle?: string | undefined;
  partnerPlate?: string | undefined;
  partnerRoleLabel?: string | undefined; // ex: "Motorista Parceiro" ou "Passageiro"
  rideStatus: string;
}

export const ChatBottomSheet: React.FC<ChatBottomSheetProps> = ({
  isOpen,
  onClose,
  rideId,
  currentUserType,
  currentUserId,
  partnerName,
  partnerPhoto,
  partnerVehicle,
  partnerPlate,
  partnerRoleLabel,
  rideStatus,
}) => {
  const [messages, setMessages] = useState<RideMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(() => driverVoiceAssistant.getIsEnabled());
  const prevMsgCountRef = useRef<number>(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 1. Conexão ao Realtime Chat da corrida e leitura por voz (TTS)
  useEffect(() => {
    if (!isOpen || !rideId) return;

    // Marca como lidas ao abrir o chat
    void chatRealtimeService.markAsRead(rideId, currentUserType);

    const unsubscribe = chatRealtimeService.subscribeToRideChat(
      rideId,
      currentUserType,
      (msgs) => {
        setMessages(msgs);
        // Se houver nova mensagem de entrada e o usuário for motorista (ou com TTS ativo), lê em voz alta
        if (msgs.length > prevMsgCountRef.current) {
          const newMsg = msgs[msgs.length - 1];
          if (newMsg && newMsg.senderType !== currentUserType && driverVoiceAssistant.getIsEnabled()) {
            driverVoiceAssistant.speakIncomingMessage(partnerName, newMsg.content);
          }
        }
        prevMsgCountRef.current = msgs.length;

        // Se a janela estiver aberta, marca como lida
        void chatRealtimeService.markAsRead(rideId, currentUserType);
      }
    );

    return unsubscribe;
  }, [isOpen, rideId, currentUserType, partnerName]);

  // 2. Monitor de conectividade offline
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 3. Auto-scroll suave para a mensagem mais recente
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    scrollToBottom(false);
    // Foco no campo se não for mobile com teclado virtual intrusivo
    const timeout = setTimeout(() => scrollToBottom(true), 150);
    return () => clearTimeout(timeout);
  }, [isOpen, messages.length, scrollToBottom]);

  // 4. Envio de mensagem
  const handleSend = useCallback(
    async (textToSend: string, isSmartReply = false) => {
      const trimmed = textToSend.trim();
      if (!trimmed || isSending) return;

      setErrorMessage(null);
      setIsSending(true);

      const res = await chatRealtimeService.sendMessage({
        rideId,
        senderId: currentUserId,
        senderType: currentUserType,
        messageType: isSmartReply ? "SMART_REPLY" : "TEXT",
        content: trimmed,
      });

      setIsSending(false);

      if (!res.success && res.error) {
        setErrorMessage(res.error);
        setTimeout(() => setErrorMessage(null), 3500);
      } else {
        setInputText("");
        scrollToBottom(true);
      }
    },
    [rideId, currentUserId, currentUserType, isSending, scrollToBottom]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSend(inputText, false);
  };

  // Formatação de hora (HH:mm)
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop clicável para minimizar mantendo o mapa preservado */}
      <div className="flex-1 w-full" onClick={onClose} />

      {/* Contêiner do Bottom Sheet */}
      <div
        className="w-full max-w-md mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] h-[560px] border-t border-slate-200 overflow-hidden animate-in slide-in-from-bottom duration-300"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
      >
        {/* =================================================================== */}
        {/* HEADER CONTEXTUAL (FOTO, NOME, VEÍCULO, PLACA E PRIVACIDADE LGPD) */}
        {/* =================================================================== */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {partnerPhoto ? (
              <img
                src={partnerPhoto}
                alt={partnerName}
                className="w-10 h-10 rounded-full object-cover border-2 border-primary-600 shrink-0 shadow-xs"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-900 text-primary-600 font-black text-sm flex items-center justify-center border-2 border-primary-600 shrink-0 shadow-xs">
                {partnerName.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-slate-950 truncate leading-tight">
                  {partnerName}
                </h3>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-primary-50 text-amber-900 border border-amber-200 shrink-0">
                  {partnerRoleLabel || (currentUserType === "PASSENGER" ? "Motorista" : "Passageiro")}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                {partnerVehicle && <span>{partnerVehicle}</span>}
                {partnerPlate && (
                  <span className="font-extrabold text-slate-800 bg-white px-1.5 py-0.2 rounded-xs border border-slate-200 shadow-2xs">
                    {partnerPlate}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const newState = driverVoiceAssistant.toggleVoice();
                setTtsEnabled(newState);
              }}
              aria-label={ttsEnabled ? "Desativar leitura por voz" : "Ativar leitura por voz"}
              title={ttsEnabled ? "Leitura por Voz Ativa (Lê mensagens em voz alta)" : "Leitura por Voz Desativada"}
              className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition cursor-pointer ${
                ttsEnabled
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "bg-slate-200/80 text-slate-500 hover:bg-slate-300"
              }`}
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Minimizar chat"
              className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center active:scale-95 transition cursor-pointer"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* BANNER DE PRIVACIDADE EFÊMERA (LGPD) & STATUS DE REDE */}
        {/* =================================================================== */}
        <div className="bg-slate-100 px-3 py-1 text-[10.5px] text-slate-600 flex items-center justify-between border-b border-slate-200/60 shrink-0">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Chat temporário seguro • Dados protegidos</span>
          </div>

          {!isOnline && (
            <div className="flex items-center gap-1 text-amber-700 font-bold animate-pulse">
              <WifiOff className="w-3 h-3" />
              <span>Offline (Outbox ativa)</span>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* LISTA DE MENSAGENS (SCROLLÁVEL COM VIRTUALIZAÇÃO NATIVA)             */}
        {/* =================================================================== */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 bg-slate-50/40">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-700 flex items-center justify-center border border-amber-200">
                💬
              </div>
              <p className="text-xs font-bold text-slate-700">Comunicação Operacional da Corrida</p>
              <p className="text-[11px] text-slate-500 max-w-[240px]">
                Utilize as respostas rápidas abaixo para confirmar seu embarque ou avisar que está a caminho.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.senderType === currentUserType;
              const isSystem = msg.senderType === "SYSTEM";

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/80 px-2.5 py-1 rounded-full text-center max-w-[85%] border border-slate-300/60 shadow-2xs">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isOwn ? "items-end" : "items-start"} select-text`}
                >
                  <div
                    className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed shadow-xs relative ${
                      isOwn
                        ? "bg-primary-600 text-white font-medium rounded-tr-xs"
                        : "bg-white text-slate-900 border border-slate-200/80 rounded-tl-xs"
                    }`}
                  >
                    <p className="break-words">{msg.content}</p>

                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[9.5px] ${
                        isOwn ? "text-white/80" : "text-slate-400"
                      }`}
                    >
                      <span>{formatTime(msg.createdAt)}</span>

                      {/* Status de Entrega da Mensagem Própria */}
                      {isOwn && (
                        <span>
                          {msg.isPending ? (
                            <Clock className="w-2.5 h-2.5 text-slate-600 animate-spin" />
                          ) : msg.readAt ? (
                            <CheckCheck className="w-3 h-3 text-emerald-700 stroke-[2.5]" />
                          ) : msg.deliveredAt ? (
                            <CheckCheck className="w-3 h-3 text-slate-700 stroke-[2]" />
                          ) : (
                            <Check className="w-3 h-3 text-slate-700 stroke-[2]" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Alerta de erro de envio ou moderação */}
        {errorMessage && (
          <div className="px-3 py-1.5 bg-rose-50 border-t border-rose-200 text-rose-700 text-[11px] font-bold flex items-center gap-1.5 animate-in fade-in duration-150">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* =================================================================== */}
        {/* SMART REPLIES (CHIPS DE 1 TOQUE ADAPTATIVOS AO STATUS DA CORRIDA) */}
        {/* =================================================================== */}
        <SmartReplyChips
          userType={currentUserType}
          rideStatus={rideStatus}
          disabled={isSending}
          onSelectReply={(chipText) => handleSend(chipText, true)}
        />

        {/* =================================================================== */}
        {/* INPUT DE DIGITAÇÃO COM BOTÃO DE ENVIO                               */}
        {/* =================================================================== */}
        <form
          onSubmit={handleSubmit}
          className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Mensagem operacional..."
            maxLength={250}
            className="flex-1 h-11 px-3.5 bg-slate-100 focus:bg-white rounded-2xl border border-slate-200 focus:border-[#0088FF] focus:ring-2 focus:ring-[#0088FF]/20 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            aria-label="Enviar mensagem"
            className="w-11 h-11 rounded-2xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white font-bold flex items-center justify-center shadow-md active:scale-95 transition-all touch-manipulation cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
};
