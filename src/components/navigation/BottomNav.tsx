import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Car, Package } from "lucide-react";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { getCorridaAtiva } from "@/lib/partiu-engine";

export function BottomNav() {
  const location = useLocation();
  const pathname = location.pathname;
  const { corPrimaria, corTextoPrimaria, nomeModuloEntrega } = useBrandTheme();

  const [modalAberto, setModalAberto] = useState(false);
  const [corridaEmAndamento, setCorridaEmAndamento] = useState(false);
  const [ocultoManual, setOcultoManual] = useState(false);
  const [ocultoPorScroll, setOcultoPorScroll] = useState(false);
  const scrollTimer = useRef<any>(null);
  const ultimoScrollY = useRef(0);

  // 1. Verificação Estratégica de Rotas Permitidas:
  // A barra de alternância "Corrida | Entrega" é estritamente voltada para a navegação principal do passageiro.
  // JAMAIS deve renderizar no cockpit do motorista (/app/motorista), painéis administrativos (/app/admin)
  // ou telas com fluxos dedicados (viagem, rota, sos, bilhetes, perfil).
  const isPassengerHome = pathname === "/app" || pathname === "/app/";
  const isDeliveryHome = pathname === "/app/encomendas" || pathname === "/app/encomendas/";
  const isAllowedRoute = isPassengerHome || isDeliveryHome;

  // 2. Monitoramento de Corrida Ativa (Passageiro ou Motorista)
  useEffect(() => {
    if (typeof window === "undefined") return;

    function checarCorrida(e?: any) {
      try {
        const corrida = e?.detail || getCorridaAtiva();
        const emAndamento = Boolean(
          corrida &&
          corrida.status &&
          corrida.status !== "IDLE" &&
          corrida.status !== "CONCLUIDA"
        );
        setCorridaEmAndamento(emAndamento);
      } catch {
        setCorridaEmAndamento(false);
      }
    }

    checarCorrida();
    window.addEventListener("partiu:corrida-atualizada", checarCorrida);
    window.addEventListener("storage", checarCorrida);

    return () => {
      window.removeEventListener("partiu:corrida-atualizada", checarCorrida);
      window.removeEventListener("storage", checarCorrida);
    };
  }, []);

  // 3. Detecção Dinâmica de Modais, Drawers, Bottom Sheets e Ações Concorrentes
  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleModalState() {
      const isModalActive =
        document.body.classList.contains("modal-open") ||
        document.body.classList.contains("modal-compra-ativa") ||
        document.querySelector("[role='dialog']") !== null ||
        document.querySelector("[data-hide-bottom-nav='true']") !== null ||
        document.querySelector(".hide-bottom-nav") !== null ||
        document.querySelector(".partiu-action-sheet") !== null;
      setModalAberto(isModalActive);
    }

    // Escuta evento customizado explícito de controle da barra
    function handleToggle(e: any) {
      if (typeof e.detail?.visible === "boolean") {
        setOcultoManual(!e.detail.visible);
      }
    }

    handleModalState();
    const observer = new MutationObserver(handleModalState);
    observer.observe(document.body, { attributes: true, childList: true, subtree: true });
    window.addEventListener("partiu:toggle-bottom-nav", handleToggle);

    return () => {
      observer.disconnect();
      window.removeEventListener("partiu:toggle-bottom-nav", handleToggle);
    };
  }, []);

  // 4. Inteligência de Rolagem (esconde suavemente no scroll e reaparece ao parar)
  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleScroll() {
      const scrollAtual = window.scrollY || document.documentElement.scrollTop;
      const diferenca = scrollAtual - ultimoScrollY.current;

      if (scrollAtual > 30 && Math.abs(diferenca) > 4) {
        setOcultoPorScroll(true);
      } else if (scrollAtual <= 15) {
        setOcultoPorScroll(false);
      }

      ultimoScrollY.current = scrollAtual;

      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => {
        setOcultoPorScroll(false);
      }, 650);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);

  // Se não estiver em rota autorizada (ex: /app/motorista), não renderizar
  if (!isAllowedRoute) return null;

  // Se estiver na Home do Passageiro ou de Entregas (que já possuem as abas integradas estilo 99),
  // ou se houver modal ou corrida ativa, ocultar a barra flutuante redundante.
  const hasIntegratedNav = isPassengerHome || isDeliveryHome;
  const deveOcultar = modalAberto || corridaEmAndamento || ocultoManual || hasIntegratedNav;
  if (deveOcultar) return null;

  const isCorridaActive = isPassengerHome;
  const isEntregaActive = isDeliveryHome;

  return (
    <nav
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-[320px] z-30 pointer-events-none transition-all duration-300 ease-out transform ${
        ocultoPorScroll ? "translate-y-28 opacity-0" : "translate-y-0 opacity-100"
      }`}
      aria-label="Navegação Flutuante"
    >
      <div className="w-full pointer-events-auto">
        {/* Pílula Flutuante Focada em Corrida e Entrega */}
        <div className="flex items-center justify-between rounded-full bg-white/95 backdrop-blur-md p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.16)] border border-slate-200/90 ring-1 ring-black/5">
          {/* 1. Modo: Corrida */}
          <Link
            to="/app"
            style={{
              backgroundColor: isCorridaActive ? (corPrimaria || "#FFDE00") : "transparent",
              color: isCorridaActive ? (corTextoPrimaria || "#0F172A") : undefined,
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full transition-all duration-200 active:scale-95 cursor-pointer font-black text-xs ${
              isCorridaActive ? "shadow-xs" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/70"
            }`}
          >
            <Car className="w-4 h-4 stroke-[2.4]" />
            <span>Corrida</span>
          </Link>

          {/* 2. Modo: Entrega */}
          <Link
            to="/app/encomendas"
            style={{
              backgroundColor: isEntregaActive ? (corPrimaria || "#FFDE00") : "transparent",
              color: isEntregaActive ? (corTextoPrimaria || "#0F172A") : undefined,
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full transition-all duration-200 active:scale-95 cursor-pointer font-black text-xs ${
              isEntregaActive ? "shadow-xs" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/70"
            }`}
          >
            <Package className="w-4 h-4 stroke-[2.4]" />
            <span>{nomeModuloEntrega || "Entrega"}</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
