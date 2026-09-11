import React, { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { chatRealtimeService, type SenderType } from "@/services/ChatRealtimeService";

export interface FloatingChatButtonProps {
  rideId: string;
  currentUserType: SenderType;
  onClick: () => void;
  className?: string;
}

export const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({
  rideId,
  currentUserType,
  onClick,
  className = "",
}) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!rideId) return;

    // Obtém contagem inicial
    setUnreadCount(chatRealtimeService.getUnreadCount(rideId, currentUserType));

    // Escuta atualizações de contagem de mensagens não lidas
    const cleanup = chatRealtimeService.subscribeToRideChat(
      rideId,
      currentUserType,
      () => {
        // Atualiza contagem
        setUnreadCount(chatRealtimeService.getUnreadCount(rideId, currentUserType));
      },
      (count) => {
        setUnreadCount(count);
      }
    );

    return cleanup;
  }, [rideId, currentUserType]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Abrir chat operacional${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ""}`}
      className={`relative w-13 h-13 rounded-full bg-slate-950 text-primary-600 border-2 border-primary-600 shadow-2xl flex items-center justify-center active:scale-90 hover:scale-105 transition-all touch-manipulation cursor-pointer z-40 ${className}`}
    >
      <MessageCircle className="w-6 h-6" />

      {/* Badge de Mensagens Não Lidas com Animação de Pulso */}
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-rose-600 text-white text-[11px] font-black shadow-md border-2 border-white animate-in zoom-in-50 duration-200">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60 pointer-events-none" />
          <span className="relative z-10">{unreadCount > 9 ? "9+" : unreadCount}</span>
        </span>
      )}
    </button>
  );
};
