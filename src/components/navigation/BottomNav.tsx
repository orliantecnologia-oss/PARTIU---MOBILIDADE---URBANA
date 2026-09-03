import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Compass, Home, Radio, Ticket, User } from "lucide-react";

export function BottomNav() {
  const location = useLocation();
  const pathname = location.pathname;

  const [visivel, setVisivel] = useState(true);
  const [modalCompraAberto, setModalCompraAberto] = useState(false);
  const ultimoScrollY = useRef(0);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Escuta ativa de eventos de abertura/fechamento de modais de compra
  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleModalState() {
      const isModalActive =
        document.body.classList.contains("modal-compra-ativa") ||
        document.body.classList.contains("modal-open") ||
        document.querySelector("[data-modal-compra='true']") !== null;
      setModalCompraAberto(isModalActive);
    }

    // Observer de mutações no DOM do body para detectar abertura de modais
    const observer = new MutationObserver(handleModalState);
    observer.observe(document.body, { attributes: true, childList: true, subtree: true });

    window.addEventListener("univans:modal-compra", ((e: CustomEvent) => {
      setModalCompraAberto(Boolean(e.detail?.aberto));
    }) as EventListener);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Inteligência de rolagem suave
  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleScroll() {
      if (modalCompraAberto) return;

      const scrollAtual = window.scrollY || document.documentElement.scrollTop;
      const diferenca = scrollAtual - ultimoScrollY.current;

      if (scrollAtual < 50) {
        setVisivel(true);
      } else if (diferenca > 15) {
        // Rolando para baixo: ocultar suavemente
        setVisivel(false);
      } else if (diferenca < -12) {
        // Rolando para cima: exibir
        setVisivel(true);
      }

      ultimoScrollY.current = scrollAtual;

      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }

      idleTimeoutRef.current = setTimeout(() => {
        if (!modalCompraAberto) {
          setVisivel(true);
        }
      }, 1200);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [modalCompraAberto]);

  const links = [
    { to: "/app", label: "Início", icon: Home, exact: true },
    { to: "/app/linhas", label: "Linhas", icon: Compass },
    { to: "/app/viagem", label: "Van ao Vivo", icon: Radio, isSpecial: true },
    { to: "/app/bilhetes", label: "Bilhetes", icon: Ticket },
    { to: "/app/perfil", label: "Perfil", icon: User },
  ];

  // Se o modal de compra estiver ativo, esconder 100% o menu de navegação
  const deveOcultar = modalCompraAberto || !visivel;

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 px-2 sm:px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 pointer-events-none transition-all duration-300 ease-out transform ${
        deveOcultar ? "translate-y-32 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
      }`}
      aria-label="Navegação Principal"
    >
      <div className="w-[96vw] max-w-full sm:max-w-2xl mx-auto pointer-events-auto">
        <div className="relative flex items-center justify-around rounded-2xl bg-white/95 backdrop-blur-2xl px-1.5 sm:px-4 py-1 shadow-[0_8px_24px_rgba(13,89,48,0.12)] border border-emerald-100/80 ring-1 ring-black/5">
          {links.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact ? pathname === item.to : pathname.startsWith(item.to);

            // BOTÃO ESPECIAL CENTRAL ELEVADO ("Van ao Vivo" - Radar Starlink)
            if (item.isSpecial) {
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="relative -top-4 flex flex-col items-center group focus:outline-none cursor-pointer"
                >
                  {/* Aura Pulsante Suave */}
                  <div className="absolute inset-0 rounded-xl bg-[#0d5930]/20 blur-md animate-pulse" />

                  {/* Botão Retangular Elegante Flutuante em Verde Cooperativa */}
                  <div
                    className={`relative flex h-11 sm:h-12 w-14 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0d5930] via-[#147a44] to-[#094223] text-white shadow-md ring-2 ring-white transition-all duration-300 group-hover:scale-105 active:scale-95 ${
                      isActive ? "ring-[#f5a623]" : ""
                    }`}
                  >
                    <Icon className="h-5 w-5 animate-pulse text-amber-300" />
                    <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-[#0d5930]" />
                  </div>

                  <span className="text-xs font-black tracking-tight text-[#0d5930] mt-0.5 drop-shadow-xs">
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center py-1 px-2 sm:px-3.5 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer min-w-[54px] min-h-[48px] ${
                  isActive
                    ? "text-[#0d5930] font-black"
                    : "text-slate-500 hover:text-slate-800 font-semibold"
                }`}
              >
                <div
                  className={`flex h-7.5 w-7.5 items-center justify-center rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-emerald-50 text-[#0d5930] shadow-2xs"
                      : "text-slate-400 group-hover:text-slate-600"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : "stroke-2"}`} />
                </div>
                <span className="text-xs mt-0.5 leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
