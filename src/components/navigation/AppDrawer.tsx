import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  X,
  Home,
  Ticket,
  Compass,
  Radio,
  ShieldAlert,
  Truck,
  Settings,
  MessageCircle,
  LogOut,
  Sparkles,
  ChevronRight,
  GraduationCap,
} from "lucide-react";

interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AppDrawer({ open, onClose }: AppDrawerProps) {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Passageiro");
  const [userAvatar, setUserAvatar] = useState(
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  );
  const [userTipo, setUserTipo] = useState<"passageiro" | "motorista">("passageiro");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nome = localStorage.getItem("univans_user_nome");
    if (nome) setUserName(nome);
    const foto = localStorage.getItem("univans_user_avatar");
    if (foto) setUserAvatar(foto);
    const tipo = localStorage.getItem("univans_user_tipo");
    if (tipo === "motorista" || tipo === "passageiro") setUserTipo(tipo);
  }, [open]);

  // Bloquear rolagem do body quando o drawer estiver aberto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Fechar com tecla Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  function handleLogout() {
    onClose();
    localStorage.removeItem("univans_demo_user");
    navigate({ to: "/auth", replace: true, search: { redirect: "/app" } });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
      {/* Backdrop Escuro com Blur Suave */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Painel do Menu Lateral (Slide from Left) */}
      <div className="relative z-10 w-[84vw] max-w-xs sm:max-w-sm h-full bg-white shadow-2xl flex flex-col border-r border-slate-200/80 animate-in slide-in-from-left duration-300 ease-out">
        {/* 1. CABEÇALHO DO MENU — GRADIENTE OFICIAL VERDE & NAVY COOPERATIVA */}
        <div className="relative bg-gradient-to-br from-[#071328] via-[#0a1e3f] to-[#0d5930] p-5 text-white overflow-hidden shrink-0">
          {/* Luzes de Fundo & Textura */}
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-[#f5a623]/25 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

          {/* Linha de Topo: Logo & Botão Fechar */}
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <img
                src="/univans-logo.jpg"
                alt="UniVans"
                className="h-7 w-auto object-contain rounded-lg border border-white/20 p-0.5 bg-white"
              />
              <div>
                <p className="text-xs font-black tracking-tight text-white leading-none">
                  UniVans <span className="text-emerald-300">Coop</span>
                </p>
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-200/80 block mt-0.5">
                  Alagoas Oficial
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[40px] min-w-[40px] h-10 w-10 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 active:scale-95 transition-all cursor-pointer"
              aria-label="Fechar Menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cartão de Perfil do Usuário */}
          <Link
            to="/app/perfil"
            onClick={onClose}
            className="relative z-10 flex items-center gap-3 p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 transition-all group cursor-pointer"
          >
            <div className="relative shrink-0">
              <div className="h-12 w-12 rounded-xl border-2 border-white bg-white/20 overflow-hidden shadow-md group-hover:scale-105 transition-transform">
                <img src={userAvatar} alt={userName} className="h-full w-full object-cover" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-[#0a1e3f]" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white truncate leading-tight">{userName}</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-200 mt-0.5">
                {userTipo === "motorista" ? (
                  <>
                    <Truck className="h-3 w-3" /> Motorista Cooperado
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 text-amber-300" /> Passageiro VIP Starlink
                  </>
                )}
              </span>
            </div>

            <ChevronRight className="h-4 w-4 text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        </div>

        {/* 2. CORPO DO MENU — LINKS RÁPIDOS ERGONÔMICOS */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {/* Grupo 1: Viagens & Mobilidade */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Principal
            </span>

            <Link
              to="/app"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50/70 text-slate-800 hover:text-[#0d5930] active:scale-[0.98] transition-all min-h-[48px] h-12 group cursor-pointer"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#0d5930] group-hover:bg-[#0d5930] group-hover:text-white transition-colors">
                <Home className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">Início & Buscador</p>
                <p className="text-[11px] text-slate-500 truncate">Consultar rotas e horários</p>
              </div>
            </Link>

            <Link
              to="/app/bilhetes"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50/70 text-slate-800 hover:text-[#0d5930] active:scale-[0.98] transition-all min-h-[48px] h-12 group cursor-pointer"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#0d5930] group-hover:bg-[#0d5930] group-hover:text-white transition-colors">
                <Ticket className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">Minhas Passagens</p>
                <p className="text-[11px] text-slate-500 truncate">Bilhetes digitais com QR Code</p>
              </div>
            </Link>

            <Link
              to="/app/linhas"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50/70 text-slate-800 hover:text-[#0d5930] active:scale-[0.98] transition-all min-h-[48px] h-12 group cursor-pointer"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-[#f5a623] group-hover:bg-[#f5a623] group-hover:text-white transition-colors">
                <Compass className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">Linhas & Horários</p>
                <p className="text-[11px] text-slate-500 truncate">Trevos, polos e saídas de vans</p>
              </div>
            </Link>

            <Link
              to="/app/viagem"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50/70 text-slate-800 hover:text-[#0d5930] active:scale-[0.98] transition-all min-h-[48px] h-12 group cursor-pointer"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Radio className="h-4.5 w-4.5 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-slate-900">Van ao Vivo</p>
                  <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                    GPS
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">Rastreamento Starlink em tempo real</p>
              </div>
            </Link>
          </div>

          {/* Grupo 2: Serviços & Direitos */}
          <div className="space-y-1 pt-1 border-t border-slate-100">
            <span className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Serviços & Direitos
            </span>

            <Link
              to="/cadastro-gratuidade"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50/70 text-slate-800 hover:text-[#0d5930] active:scale-[0.98] transition-all min-h-[48px] h-12 group cursor-pointer"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#0d5930] group-hover:bg-[#0d5930] group-hover:text-white transition-colors">
                <GraduationCap className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">Passe Livre por Lei</p>
                <p className="text-[11px] text-slate-500 truncate">Idosos, PCD e CadÚnico</p>
              </div>
            </Link>

            <Link
              to="/app/sos"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-50 text-slate-800 hover:text-rose-600 active:scale-[0.98] transition-all min-h-[48px] h-12 group cursor-pointer"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                <ShieldAlert className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">Central SOS 24h</p>
                <p className="text-[11px] text-slate-500 truncate">Emergência e telemetria na rodovia</p>
              </div>
            </Link>
          </div>

          {/* Grupo 3: Gestão & Operacional */}
          <div className="space-y-1 pt-1 border-t border-slate-100">
            <span className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Operacional
            </span>

            <Link
              to="/app/motorista"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-800 active:scale-[0.98] transition-all min-h-[48px] h-12 group cursor-pointer"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                <Truck className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">Painel do Motorista</p>
                <p className="text-[11px] text-slate-500 truncate">Scanner QR, checklist e rotas</p>
              </div>
            </Link>

            <Link
              to="/app/admin"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-800 active:scale-[0.98] transition-all min-h-[48px] h-12 group cursor-pointer"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                <Settings className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">Painel Cooperativa</p>
                <p className="text-[11px] text-slate-500 truncate">Gestão de frota e financeiro</p>
              </div>
            </Link>
          </div>
        </div>

        {/* 3. RODAPÉ DO MENU — SUPORTE E LOGOUT */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/90 space-y-2 shrink-0">
          <a
            href="https://wa.me/5582988727777?text=Olá,%20preciso%20de%20ajuda%20com%20minha%20viagem%20na%20UniVans."
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[44px] h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 text-[#0d5930] hover:bg-emerald-100 border border-emerald-200 text-xs font-black active:scale-95 transition-all cursor-pointer"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Suporte WhatsApp 24h</span>
          </a>

          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-[44px] h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 text-xs font-bold active:scale-95 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Desconectar da Conta</span>
          </button>

          <p className="text-[10px] text-center text-slate-400 font-medium">
            UniVans Coop v4.2.0 • Alagoas
          </p>
        </div>
      </div>
    </div>
  );
}
