import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  MapPin,
  QrCode,
  Radio,
  Share2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  Wifi,
  Calendar,
  ChevronRight,
  History,
  Info,
  Maximize2,
  X,
  Zap,
  RefreshCw,
  Cloud,
  Trash2,
} from "lucide-react";
import { RealQrCodePix } from "@/components/passagens/RealQrCodePix";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { ModalScannerPassageiro } from "@/components/passagens/ModalScannerPassageiro";
import { supabase } from "@/integrations/supabase/client";
import { sincronizarPassagensNuvem } from "@/lib/passenger-cloud-sync";
import {
  getBilhetesPassagens,
  confirmarPresencaPassagem,
  excluirBilhete,
  limparTodosBilhetes,
  type BilhetePassagem,
} from "@/lib/passagens-store";

export const Route = createFileRoute("/app/bilhetes")({
  head: () => ({
    meta: [
      { title: "Meus Bilhetes & Histórico de Viagens | UniVans" },
      {
        name: "description",
        content:
          "Consulte seus bilhetes digitais com QR Code para embarque, manifesto e histórico de viagens na UniVans.",
      },
    ],
  }),
  component: BilhetesPassageiroScreen,
});

export function BilhetesPassageiroScreen() {
  const [abaAtiva, setAbaAtiva] = useState<"ativos" | "historico">("ativos");
  const [modalQrAberto, setModalQrAberto] = useState(false);
  const [scannerAberto, setScannerAberto] = useState(false);
  const [bilheteParaEscanear, setBilheteParaEscanear] = useState<string | undefined>(undefined);
  const [bilhetes, setBilhetes] = useState<BilhetePassagem[]>(() => getBilhetesPassagens());
  const [sincronizandoNuvem, setSincronizandoNuvem] = useState(false);
  const [sincronizadoComNuvem, setSincronizadoComNuvem] = useState(false);

  const carregarPassagens = useCallback(async () => {
    setSincronizandoNuvem(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      const phone =
        typeof window !== "undefined"
          ? localStorage.getItem("univans_user_phone") || undefined
          : undefined;
      const res = await sincronizarPassagensNuvem(userId, phone);
      setBilhetes(res.bilhetes);
      setSincronizadoComNuvem(res.sincronizadoNuvem);
    } catch {
      setBilhetes(getBilhetesPassagens());
    } finally {
      setSincronizandoNuvem(false);
    }
  }, []);

  useEffect(() => {
    carregarPassagens();
  }, [carregarPassagens]);

  const bilhetesAtivos = useMemo(() => {
    return bilhetes.filter((b) => b.status === "confirmado");
  }, [bilhetes]);

  const bilhetesHistorico = useMemo(() => {
    return bilhetes.filter((b) => b.status !== "confirmado");
  }, [bilhetes]);

  const bilhetePrincipal = bilhetesAtivos[0] || bilhetes[0] || null;

  function compartilharWhatsApp(b: BilhetePassagem) {
    const texto = encodeURIComponent(
      `🎫 *BILHETE DIGITAL UNIVANS*\n\n` +
        `📌 *Passagem:* ${b.origem} ➔ ${b.destino}\n` +
        `🕒 *Horário:* ${b.horarioSaida} (${b.dataViagem})\n` +
        `💺 *Passageiro:* ${b.passageiroNome}\n` +
        `🚏 *Embarque:* ${b.pontoEmbarque || "Ponto Oficial"}\n` +
        `🚐 *Van:* ${b.vanModelo} (${b.vanPlaca})\n` +
        `👨‍✈️ *Motorista:* ${b.motoristaNome}\n\n` +
        `Acompanhe a viagem pelo App UniVans: https://apk-uni-vans-coop.vercel.app/app/viagem`,
    );
    window.open(`https://wa.me/?text=${texto}`, "_blank");
  }

  async function handleExcluirPassagem(bilheteId: string) {
    if (!window.confirm("Deseja realmente remover esta passagem de teste?")) return;
    const atualizados = excluirBilhete(bilheteId);
    setBilhetes(atualizados);
    try {
      await supabase.from("passagens").delete().eq("codigo_bilhete", bilheteId);
    } catch {
      // Ignorar se offline
    }
  }

  async function handleLimparTudo() {
    if (!window.confirm("Deseja remover todas as passagens de teste salvas?")) return;
    limparTodosBilhetes();
    setBilhetes([]);
    try {
      await supabase.from("passagens").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    } catch {
      // Ignorar se offline
    }
  }

  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-900 pb-12">
      {/* 1. CABEÇALHO DA CENTRAL DE BILHETES */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-2 sm:px-4 py-2.5 border-b border-slate-200/80 shadow-2xs">
        <div className="w-full max-w-full sm:max-w-2xl mx-auto flex items-center justify-between">
          <Link
            to="/app"
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <div className="text-center">
            <h1 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
              Meus Bilhetes
            </h1>
            <span className="text-[11px] text-emerald-700 font-bold flex items-center justify-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Embarque com QR Code
            </span>
          </div>
          <Link
            to="/app/linhas"
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-50 text-[#0d5930] border border-emerald-200 hover:bg-emerald-100 active:scale-95 transition-all cursor-pointer"
            title="Comprar Nova Passagem"
          >
            <Ticket className="h-4.5 w-4.5" />
          </Link>
        </div>
      </header>

      {/* 2. CONTEÚDO PRINCIPAL COM ABAS DE NAVEGAÇÃO */}
      <main className="w-full max-w-full sm:max-w-2xl mx-auto p-1.5 sm:px-4 py-2 space-y-3">
        {/* BANNER DE SINCRONIZAÇÃO EM NUVEM */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  sincronizadoComNuvem ? "bg-emerald-400 opacity-75" : "bg-amber-400 opacity-75"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  sincronizadoComNuvem ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
            </span>
            <span className="font-bold text-slate-800">
              {sincronizadoComNuvem
                ? "Bilhetes Sincronizados com a Nuvem"
                : "Cache Local Ativo (Modo Offline)"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={carregarPassagens}
              disabled={sincronizandoNuvem}
              className="flex items-center gap-1 text-[11px] font-black text-[#0d5930] hover:underline disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${sincronizandoNuvem ? "animate-spin" : ""}`} />
              <span>{sincronizandoNuvem ? "Atualizando..." : "Puxar da Nuvem"}</span>
            </button>
            {bilhetes.length > 0 && (
              <button
                type="button"
                onClick={handleLimparTudo}
                className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg border border-rose-200 transition-all cursor-pointer"
                title="Limpar bilhetes de teste salvos"
              >
                <Trash2 className="h-3 w-3" />
                <span>Limpar Testes</span>
              </button>
            )}
          </div>
        </div>
        <div className="bg-slate-100 p-1.5 rounded-xl flex items-center gap-1 border border-slate-200/80">
          <button
            type="button"
            onClick={() => setAbaAtiva("ativos")}
            className={`flex-1 flex items-center justify-center gap-2 min-h-[44px] h-11 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95 ${
              abaAtiva === "ativos"
                ? "bg-[#0d5930] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Ticket className="h-4 w-4" />
            <span>Passagens Ativas ({bilhetesAtivos.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva("historico")}
            className={`flex-1 flex items-center justify-center gap-2 min-h-[44px] h-11 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95 ${
              abaAtiva === "historico"
                ? "bg-[#0d5930] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="h-4 w-4" />
            <span>Histórico ({bilhetesHistorico.length})</span>
          </button>
        </div>

        {/* ========================================================
            ABA 1: PASSAGENS ATIVAS / BOARDING PASS
           ======================================================== */}
        {abaAtiva === "ativos" && (
          <div className="space-y-3 animate-in fade-in">
            {bilhetesAtivos.length === 0 ? (
              <EmptyStateCard
                icone={Ticket}
                titulo="Nenhum bilhete ativo no momento"
                descricao="Você ainda não possui viagens confirmadas para hoje. Consulte nossas linhas e garanta seu assento."
                acaoTexto="Explorar Linhas & Horários"
                acaoLink="/app/linhas"
              />
            ) : (
              bilhetesAtivos.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl bg-white border border-slate-200/90 shadow-sm overflow-hidden space-y-3 p-3.5 sm:p-5"
                >
                  {/* ALERTA PREDITIVO DE CHEGADA NO TREVO */}
                  <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-between gap-2 shadow-2xs border border-amber-300">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Radio className="h-5 w-5 shrink-0 text-slate-950 animate-pulse" />
                      <div className="min-w-0">
                        <span className="block text-xs uppercase tracking-wider text-slate-900 font-black">
                          Predição Satelital Starlink
                        </span>
                        <strong className="text-sm font-black truncate block">
                          Van a ~7 min do {b.pontoEmbarque?.split("•")[0]?.trim() || "seu Trevo"}
                        </strong>
                      </div>
                    </div>
                    <span className="bg-slate-950 text-amber-300 min-h-[38px] flex items-center text-xs font-black px-3 py-1.5 rounded-lg shrink-0 shadow-2xs">
                      Ir para o Ponto ➔
                    </span>
                  </div>

                  {/* Topo do Bilhete: Código e Status */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-black uppercase text-white px-3 py-1 rounded-lg shadow-2xs ${
                          b.formaPagamento === "GRATUIDADE_GOV"
                            ? "bg-[#0b2046] border border-amber-400"
                            : "bg-[#0d5930]"
                        }`}
                      >
                        {b.formaPagamento === "GRATUIDADE_GOV"
                          ? "🏛️ Gratuidade por Lei"
                          : "Bilhete Confirmado"}
                      </span>
                      <strong className="text-xs sm:text-sm font-mono text-slate-700">
                        {b.id}
                      </strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                        <Wifi className="h-3.5 w-3.5" />
                        <span>{b.starlinkWifi || "Starlink VIP"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExcluirPassagem(b.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remover passagem de teste"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Trajeto & Horários em Grande Escala (Desaninhado) */}
                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <span className="text-xs font-bold uppercase text-slate-400 block">
                        Trajeto Confirmado
                      </span>
                      <h2 className="text-base sm:text-lg font-black text-slate-900 truncate mt-0.5">
                        {b.origem} ➔ {b.destino}
                      </h2>
                      <div className="flex items-center gap-3 mt-1 text-xs sm:text-sm text-slate-600 font-bold">
                        <span className="flex items-center gap-1.5 text-[#0d5930]">
                          <Clock className="h-4 w-4" />
                          Saída: {b.horarioSaida}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span>{b.dataViagem}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold uppercase text-slate-400 block">
                        {b.formaPagamento === "GRATUIDADE_GOV" ? "Tarifa Social" : "Valor Pago"}
                      </span>
                      <strong className="text-base sm:text-lg font-black text-[#0d5930]">
                        {b.formaPagamento === "GRATUIDADE_GOV"
                          ? "R$ 0,00 (Gratuito)"
                          : `R$ ${b.valorTotal.toFixed(2).replace(".", ",")}`}
                      </strong>
                    </div>
                  </div>

                  {/* BOTÃO PRINCIPAL: EMBARCAR LENDO O QR DA VAN (SELF CHECK-IN - 48PX) */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#0b2046] via-[#0d5930] to-[#071833] text-white shadow-sm space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
                        <Zap className="h-4 w-4" />
                        <span>Self Check-in de Bordo</span>
                      </span>
                      <span className="text-xs text-emerald-300 font-bold">
                        {b.status === "embarcado" ? "Embarcado ✓" : "Aguardando Leitura"}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={b.status === "embarcado"}
                      onClick={() => {
                        setBilheteParaEscanear(b.id);
                        setScannerAberto(true);
                      }}
                      className={`w-full min-h-[48px] h-12 py-2 px-5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-black transition-all active:scale-[0.98] shadow-xs cursor-pointer ${
                        b.status === "embarcado"
                          ? "bg-slate-700 text-slate-300 cursor-not-allowed"
                          : "bg-gradient-to-r from-emerald-500 to-[#147a44] text-white hover:brightness-110 shadow-emerald-950/30"
                      }`}
                    >
                      <Camera className="h-4.5 w-4.5 text-amber-300" />
                      <span>
                        {b.status === "embarcado"
                          ? "PASSAGEM JÁ UTILIZADA (USO CONSUMIDO)"
                          : "LER QR CODE DA VAN PARA EMBARCAR"}
                      </span>
                    </button>
                  </div>

                  {/* Confirmação de Presença / Check-in D-1 */}
                  <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="min-w-0">
                      <span className="text-xs font-bold uppercase text-slate-400 block">
                        Confirmação de Presença
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                        {b.presencaConfirmada
                          ? "✅ Presença confirmada para a van"
                          : "Confirme se você irá embarcar"}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={b.presencaConfirmada}
                      onClick={() => {
                        const atualizados = confirmarPresencaPassagem(b.id);
                        setBilhetes(atualizados);
                      }}
                      className={`min-h-[40px] h-10 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        b.presencaConfirmada
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-[#0d5930] hover:bg-[#147a44] text-white active:scale-95 shadow-2xs"
                      }`}
                    >
                      {b.presencaConfirmada ? "Confirmado" : "Vou Embarcar"}
                    </button>
                  </div>

                  {/* Ponto de Embarque no Trevo */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-black text-xs sm:text-sm">
                      <MapPin className="h-4 w-4" />
                      <span>Ponto de Embarque Oficial:</span>
                    </div>
                    <p className="text-slate-800 font-bold leading-normal pl-5">
                      {b.pontoEmbarque || "Trevo Tabuleiro • Ponto Autorizado"}
                    </p>
                    {b.pontoEmbarqueReferencia && (
                      <p className="text-xs text-slate-500 font-medium pl-5">
                        Ref: {b.pontoEmbarqueReferencia}
                      </p>
                    )}
                  </div>

                  {/* QR Code de Embarque e Instrução — Enquadramento Perfeito */}
                  <div className="rounded-3xl bg-slate-950 text-white p-5 text-center space-y-4 shadow-lg border border-slate-800">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-300 tracking-wider bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                        <Sparkles className="h-3 w-3" />
                        Apresente ao Motorista no Embarque
                      </span>
                      <p className="text-xs text-slate-300 font-medium">
                        QR Code Criptografado com Validação Anti-Replay
                      </p>
                    </div>

                    {/* Moldura Enquadrada Perfeitamente com Margem Branca Segura */}
                    <div className="bg-white p-4 rounded-3xl border-2 border-white/80 shadow-2xl w-fit mx-auto flex items-center justify-center ring-4 ring-emerald-500/20">
                      <RealQrCodePix textoChave={b.codigoQr} tamanho={176} />
                    </div>

                    <div className="space-y-1 pt-0.5">
                      <div className="bg-slate-900/90 py-1.5 px-3 rounded-xl border border-slate-800 inline-block max-w-full">
                        <span className="text-xs sm:text-sm font-mono text-amber-300 font-black tracking-wider block break-all">
                          {b.codigoQr}
                        </span>
                      </div>
                      <span className="text-xs text-slate-300 font-bold block">
                        Passageiro: <strong className="text-white">{b.passageiroNome}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Dados do Motorista & Compartilhar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={b.motoristaFoto}
                        alt={b.motoristaNome}
                        className="h-9 w-9 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <strong className="text-xs font-black text-slate-900 block truncate">
                          {b.motoristaNome}
                        </strong>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {b.vanModelo} • <strong className="text-slate-700">{b.vanPlaca}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => compartilharWhatsApp(b)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-200 active:scale-95 transition-all"
                      >
                        <Share2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </button>

                      <Link
                        to="/app/viagem"
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0d5930] hover:bg-[#147a44] text-white text-xs font-black shadow-xs active:scale-95 transition-all"
                      >
                        <Radio className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                        <span>Radar da Van</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ========================================================
            ABA 2: HISTÓRICO DE VIAGENS
           ======================================================== */}
        {abaAtiva === "historico" && (
          <div className="space-y-3 animate-in fade-in">
            {bilhetesHistorico.length === 0 ? (
              <div className="p-6 rounded-3xl bg-white border border-slate-200 text-center space-y-2">
                <History className="h-8 w-8 text-slate-400 mx-auto" />
                <h3 className="text-xs font-black text-slate-800">Sem viagens anteriores</h3>
                <p className="text-[11px] text-slate-500">
                  Suas viagens concluídas ou arquivadas serão listadas aqui automaticamente.
                </p>
              </div>
            ) : (
              bilhetesHistorico.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black uppercase px-2 py-0.2 rounded-md bg-slate-100 text-slate-600">
                        {b.status === "embarcado" ? "Concluída" : "Arquivada"}
                      </span>
                      <span className="text-[10px] text-slate-400">{b.dataViagem}</span>
                    </div>
                    <strong className="text-xs sm:text-sm font-black text-slate-900 block truncate">
                      {b.origem} ➔ {b.destino}
                    </strong>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {b.vanModelo} ({b.vanPlaca}) • R$ {b.valorTotal.toFixed(2).replace(".", ",")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      to="/app/linhas"
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-[#0d5930] text-slate-700 text-xs font-black transition-colors"
                    >
                      <span>Comprar Novamente</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleExcluirPassagem(b.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remover do histórico"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* MODAL SCANNER DE CÂMERA DO PASSAGEIRO */}
      <ModalScannerPassageiro
        aberto={scannerAberto}
        onFechar={() => {
          setScannerAberto(false);
          setBilheteParaEscanear(undefined);
        }}
        bilheteId={bilheteParaEscanear}
        onSucesso={() => {
          setBilhetes(getBilhetesPassagens());
        }}
      />
    </div>
  );
}
