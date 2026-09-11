import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Car,
  Clock,
  Package,
  ChevronRight,
  RotateCcw,
  HelpCircle,
  CheckCircle2,
  XCircle,
  MapPin,
  Calendar,
  Zap,
  ShieldCheck,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { rideService, type UserActivityItem } from "@/services/RideService";
import { useBrandTheme } from "@/hooks/useBrandTheme";

export const Route = createFileRoute("/app/bilhetes")({
  head: () => ({
    meta: [
      { title: "Atividade — Suas Viagens & Entregas | PARTIU" },
      {
        name: "description",
        content:
          "Consulte seu histórico de viagens urbanas, corridas de moto e entregas expressas com duplo PIN no PARTIU.",
      },
    ],
  }),
  component: AtividadePage,
});

export function AtividadePage() {
  const navigate = useNavigate();
  const { corPrimaria, corTextoPrimaria } = useBrandTheme();

  const [abaAtiva, setAbaAtiva] = useState<"todas" | "corridas" | "entregas">("todas");
  const [historico, setHistorico] = useState<UserActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recarregando, setRecarregando] = useState(false);
  const [viagemDetalhe, setViagemDetalhe] = useState<UserActivityItem | null>(null);

  async function carregarHistorico() {
    try {
      const dados = await rideService.getUserActivityHistory();
      setHistorico(dados);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setLoading(false);
      setRecarregando(false);
    }
  }

  useEffect(() => {
    carregarHistorico();
  }, []);

  function handleRecarregar() {
    setRecarregando(true);
    carregarHistorico();
  }

  const listaFiltrada = historico.filter((item) => {
    if (abaAtiva === "corridas") return item.tipo === "corrida";
    if (abaAtiva === "entregas") return item.tipo === "entrega";
    return true;
  });

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 text-slate-900 pb-16">
      {/* 1. CABEÇALHO */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 py-3.5 border-b border-slate-200 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/app"
            className="flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer border border-slate-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Uso Diário
            </span>
            <h1 className="text-base font-bold text-slate-900">Minhas Viagens &amp; Entregas</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRecarregar}
          disabled={recarregando}
          className="p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer border border-slate-200"
          title="Atualizar Histórico"
        >
          <RefreshCw className={`h-4 w-4 ${recarregando ? "animate-spin text-slate-900" : ""}`} />
        </button>
      </header>

      {/* 2. ABAS DE FILTRO */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 sticky top-[65px] z-20 shadow-xs">
        <div className="flex gap-2 max-w-lg mx-auto">
          <button
            type="button"
            onClick={() => setAbaAtiva("todas")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              abaAtiva === "todas"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Todas ({historico.length})
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva("corridas")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              abaAtiva === "corridas"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Car className="h-3.5 w-3.5" />
            Corridas
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva("entregas")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              abaAtiva === "entregas"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            Entregas
          </button>
        </div>
      </div>

      {/* 3. LISTA DE ATIVIDADES */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-500" />
            Carregando suas viagens...
          </div>
        ) : listaFiltrada.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
            <Clock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Nenhuma atividade encontrada</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Quando você solicitar uma corrida de carro/moto ou envio de pacote, ela aparecerá aqui.
            </p>
            <Link
              to="/app"
              className="inline-block mt-4 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
              style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
            >
              Pedir Corrida Agora
            </Link>
          </div>
        ) : (
          listaFiltrada.map((item) => (
            <div
              key={item.id}
              onClick={() => setViagemDetalhe(item)}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 active:scale-[0.99] transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      item.tipo === "entrega"
                        ? "bg-primary-50 text-primary-700"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    {item.tipo === "entrega" ? (
                      <Package className="h-5 w-5" />
                    ) : (
                      <Car className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{item.categoria}</h3>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {item.data}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold text-slate-900">
                    R$ {item.valor.toFixed(2).replace(".", ",")}
                  </span>
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    {item.status === "concluida" ? (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                        <CheckCircle2 className="h-3 w-3" /> Concluída
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-500 flex items-center gap-0.5">
                        <XCircle className="h-3 w-3" /> Cancelada
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ROTA */}
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                  <p className="text-slate-600 line-clamp-1 flex-1 font-medium">{item.origem}</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-900 mt-1.5 shrink-0" />
                  <p className="text-slate-900 font-bold line-clamp-1 flex-1">{item.destino}</p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Motorista: <strong className="text-slate-700">{item.motorista}</strong></span>
                <span className="text-slate-400 flex items-center gap-0.5">
                  Ver recibo <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          ))
        )}
      </main>

      {/* 4. MODAL DE DETALHES DO RECIBO */}
      {viagemDetalhe && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Recibo Oficial PARTIU
                </span>
                <h3 className="text-base font-bold text-slate-900">{viagemDetalhe.categoria}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViagemDetalhe(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                  <span>Valor Total Pago</span>
                  <span className="text-base" style={{ color: corPrimaria }}>
                    R$ {viagemDetalhe.valor.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Data: {viagemDetalhe.data}
                </div>
              </div>

              {viagemDetalhe.pinSeguranca && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-900 font-medium">
                    <KeyRound className="h-4 w-4 text-blue-600" />
                    <span>PIN de Validação:</span>
                  </div>
                  <span className="font-mono font-bold text-sm text-blue-900 tracking-wider">
                    {viagemDetalhe.pinSeguranca}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Embarque</span>
                  <p className="text-slate-700 font-medium">{viagemDetalhe.origem}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Desembarque</span>
                  <p className="text-slate-900 font-bold">{viagemDetalhe.destino}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-slate-600">
                <div>
                  <p className="font-bold text-slate-800">{viagemDetalhe.motorista}</p>
                  <p className="text-[11px] text-slate-400">{viagemDetalhe.veiculo}</p>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                  <ShieldCheck className="h-4 w-4" />
                  Auditado
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViagemDetalhe(null)}
                className="w-full mt-2 py-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
              >
                Fechar Recibo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
