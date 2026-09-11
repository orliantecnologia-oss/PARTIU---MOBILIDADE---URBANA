import React, { useState } from "react";
import { X, Check, HelpCircle, Package, CreditCard, ShieldAlert, MessageSquare, AlertCircle } from "lucide-react";
import {
  supportTicketService,
  type TicketCategory,
  type SupportTicket,
} from "@/services/SupportTicketService";

export interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
  userPhone?: string;
  userRole?: "PASSENGER" | "DRIVER" | "PARTNER";
  rideId?: string | null;
  onTicketCreated?: (ticket: SupportTicket) => void;
}

const CATEGORIES: { id: TicketCategory; label: string; icon: any; description: string }[] = [
  {
    id: "LOST_ITEM",
    label: "Esqueci um objeto",
    icon: Package,
    description: "Perdeu chaves, celular, carteira ou bolsas no veículo.",
  },
  {
    id: "PAYMENT_DISPUTE",
    label: "Cobrança ou PIX",
    icon: CreditCard,
    description: "Cobrança indevida, divergência de valor ou problema no PIX.",
  },
  {
    id: "SAFETY_BEHAVIOR",
    label: "Segurança ou Conduta",
    icon: ShieldAlert,
    description: "Direção imprudente, grosseria ou incidente de segurança.",
  },
  {
    id: "APP_HELP",
    label: "Ajuda com o App",
    icon: HelpCircle,
    description: "Dificuldades para solicitar, GPS ou erros na conta.",
  },
  {
    id: "GENERAL",
    label: "Outro Assunto",
    icon: MessageSquare,
    description: "Elogios, sugestões ou dúvidas operacionais gerais.",
  },
];

export const SupportTicketModal: React.FC<SupportTicketModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  userPhone,
  userRole = "PASSENGER",
  rideId,
  onTicketCreated,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory>("LOST_ITEM");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<SupportTicket | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const ticket = await supportTicketService.createTicket({
        userId,
        userName,
        userPhone,
        userRole,
        rideId,
        category: selectedCategory,
        subject: subject.trim(),
        description: description.trim(),
        priority: selectedCategory === "SAFETY_BEHAVIOR" ? "HIGH" : "MEDIUM",
      });

      setCreatedTicket(ticket);
      onTicketCreated?.(ticket);
    } catch {
      // Fallback
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setCreatedTicket(null);
    setSubject("");
    setDescription("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="px-6 pt-6 pb-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#0088FF] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 uppercase tracking-wider">
              Central de Ajuda & Atendimento
            </span>
            <h3 className="text-lg font-black text-slate-900 mt-1">Como podemos te ajudar?</h3>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            aria-label="Fechar"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdTicket ? (
          <div className="p-8 text-center space-y-4 animate-in zoom-in-90 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div>
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-md">
                Protocolo: {createdTicket.ticketNumber}
              </span>
              <h4 className="text-lg font-black text-slate-900 mt-2">Chamado Aberto com Sucesso!</h4>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                Nossa equipe de atendimento já recebeu seu protocolo. Entraremos em contato via WhatsApp ou telefone em até 2 horas.
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetAndClose}
              className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-sm shadow-md transition cursor-pointer"
            >
              Concluir
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
            {rideId && (
              <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">Corrida vinculada:</span>
                <span className="font-mono text-slate-900 font-bold">{rideId}</span>
              </div>
            )}

            {/* Categorias Rápidas */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Selecione o motivo:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        if (!subject) setSubject(cat.label);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        isSelected
                          ? "bg-blue-50/70 border-[#0088FF] ring-2 ring-[#0088FF]/20 shadow-xs"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-[#0088FF] text-white" : "bg-white text-slate-600 border border-slate-200"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{cat.label}</div>
                        <div className="text-[10px] text-slate-500 leading-tight line-clamp-2 mt-0.5">
                          {cat.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Assunto */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Título do problema:</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Deixei meu casaco preto no banco de trás"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-[#0088FF] focus:ring-2 focus:ring-[#0088FF]/20 transition"
              />
            </div>

            {/* Descrição Detalhada */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Descreva o ocorrido:</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Forneça o máximo de detalhes possível para agilizar o atendimento..."
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-[#0088FF] focus:ring-2 focus:ring-[#0088FF]/20 transition resize-none"
              />
            </div>

            {/* Botão de Envio */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !subject.trim() || !description.trim()}
                className="w-full h-12 rounded-2xl bg-[#0088FF] hover:bg-[#0077EE] disabled:opacity-50 text-white font-black text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? "Registrando Protocolo..." : "Enviar Chamado de Suporte"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
