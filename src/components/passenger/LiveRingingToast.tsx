import React, { memo } from "react";
import { Star, MapPin, Eye, PhoneCall, RefreshCw, Clock } from "lucide-react";
import { useDriverSearchRealtime } from "@/hooks/useDriverSearchRealtime";

/**
 * ==============================================================================
 * 🔔 PARTIU LIVE RINGING TOAST (FASE 7) — 99/UBER DYNAMIC TOP MODAL
 * ==============================================================================
 * Floating card no topo da tela acionado quando um condutor específico recebe a chamada.
 * Totalmente desacoplado e conectado ao hook useDriverSearchRealtime:
 * - Exibe foto, primeiro nome, nota, veículo, ETA e micro-status em tempo real
 * - Transição suave entre condutores (sem flickering nem reload visual)
 * - Camada forense garantida: zIndex 9999 + elevation 40
 * ==============================================================================
 */
export const LiveRingingToast = memo(function LiveRingingToast() {
  // A notificação de motorista analisando foi migrada diretamente para a gaveta
  // inferior de busca (PassengerFindingDriverRadar.tsx), liberando 100% da visualização do mapa.
  return null;
});

