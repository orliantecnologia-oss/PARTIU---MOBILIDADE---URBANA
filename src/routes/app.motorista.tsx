import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { deveTransmitirGpsDeadband } from "@/lib/telemetry-pipeline";
import { useContinuousGps } from "@/lib/use-continuous-gps";
import type { TelemetriaGpsPonto } from "@/lib/continuous-gps-engine";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  DollarSign,
  MapPin,
  MessageCircle,
  Phone,
  Play,
  QrCode,
  Radio,
  Share2,
  ShieldCheck,
  Sparkles,
  Truck,
  UserCheck,
  Users,
  Wifi,
  Zap,
  Volume2,
  AlertTriangle,
  ChevronDown,
  Camera,
  RefreshCw,
  Gauge,
  FileCheck2,
  HelpCircle,
  CheckSquare,
  Square,
  Send,
  XCircle,
  Receipt,
  FileText,
  Check,
  ShieldAlert,
} from "lucide-react";
import { tocarBipEmbarque } from "@/lib/realtime";
import {
  validarQRCodeOffline,
  getQuantidadeValidacoesPendentes,
  sincronizarValidacoesComServidor,
  type ResultadoValidacaoOffline,
  gerarPayloadQRCodePassagem,
} from "@/lib/offline-ticket-crypto";
import {
  calcularSplitFinanceiro,
  apurarExtratoLedgerMotorista,
  criarTransacaoPixComIdempotencia,
  transicionarEstadoPix,
} from "@/lib/finops-pix-engine";
import {
  getEncomendasStore,
  validarPinEntregaEncomenda,
  type EncomendaVan,
} from "@/lib/admin-data";
import { BroadcastNotificationListener } from "@/components/notifications/BroadcastNotificationListener";
import { Package, KeyRound, Box } from "lucide-react";
import {
  useViagensDoDia,
  useManifestoViagem,
  useAtualizarTelemetria,
  useConfirmarEmbarque,
} from "@/lib/univans-db";
import { RealQrCodePix } from "@/components/passagens/RealQrCodePix";

export const Route = createFileRoute("/app/motorista")({
  head: () => ({
    meta: [
      { title: "Cockpit Operacional do Motorista | UniVans TOS" },
      {
        name: "description",
        content:
          "Estação de trabalho operacional: checklist pré-viagem, manifesto de bordo, validação criptográfica offline com Anti-Replay e Livro-Razão.",
      },
    ],
  }),
  component: PainelMotoristaPage,
});

interface ParadaManifesto {
  id: string;
  nome: string;
  referencia: string;
  horarioEstimado: string;
  passageirosEmbarcando: {
    id: string;
    nome: string;
    telefone: string;
    quantidade: number;
    valor: number;
    pagoVia: string;
    gpsStatus: "no_ponto" | "aproximando" | "acostamento";
    distanciaPonto: string;
    embarcado: boolean;
    ticketCode: string;
  }[];
  desembarques: number;
}

export function PainelMotoristaPage() {
  const [abaAtiva, setAbaAtiva] = useState<
    "viagem" | "totem" | "encomendas" | "checklist" | "caixa"
  >("viagem");
  const [encomendas, setEncomendas] = useState<EncomendaVan[]>(() => getEncomendasStore());
  const [encomendaParaEntregar, setEncomendaParaEntregar] = useState<EncomendaVan | null>(null);
  const [pinDigitado, setPinDigitado] = useState("");
  const [erroPin, setErroPin] = useState<string | null>(null);
  const [sucessoEntrega, setSucessoEntrega] = useState<string | null>(null);

  const [ultimoEmbarque, setUltimoEmbarque] = useState<{
    nome: string;
    horario: string;
    quantidade: number;
    bilheteId: string;
  } | null>(null);

  const [checklist, setChecklist] = useState({
    pneus: true,
    freios: true,
    oleoAgua: true,
    arCondicionado: true,
    documentosOk: true,
    starlinkWifiOk: true,
    rastreadorGpsOnline: true,
  });

  const [statusVan, setStatusVan] = useState<"no_ponto" | "em_transito" | "pausado" | "concluida">(
    "em_transito",
  );
  const [avisoEnviadoId, setAvisoEnviadoId] = useState<string | null>(null);

  function handleConfirmarEntregaPin() {
    if (!encomendaParaEntregar) return;
    setErroPin(null);

    const res = validarPinEntregaEncomenda(encomendaParaEntregar.id, pinDigitado);
    if (!res.sucesso) {
      setErroPin(res.mensagem);
      return;
    }

    tocarBipEmbarque();
    setSucessoEntrega(
      `Entrega confirmada com sucesso! Código ${encomendaParaEntregar.codigoRastreio} baixado.`,
    );
    setEncomendas(getEncomendasStore());
    setTimeout(() => {
      setEncomendaParaEntregar(null);
      setPinDigitado("");
      setSucessoEntrega(null);
    }, 2000);
  }

  // Escutar eventos de auto-embarque emitidos quando o passageiro lê o QR do motorista
  useEffect(() => {
    function onEmbarqueConfirmado(e: any) {
      const detail = e.detail;
      if (detail) {
        tocarBipEmbarque();
        setUltimoEmbarque({
          nome: detail.passageiroNome || "Passageiro",
          horario: detail.horario || new Date().toLocaleTimeString("pt-BR"),
          quantidade: detail.quantidade || 1,
          bilheteId: detail.bilheteId || "UV-OK",
        });

        // Atualizar manifesto localmente se encontrar passageiro
        setManifesto((prev) =>
          prev.map((parada) => ({
            ...parada,
            passageirosEmbarcando: parada.passageirosEmbarcando.map((psg) =>
              psg.nome.toLowerCase().includes((detail.passageiroNome || "").toLowerCase())
                ? { ...psg, embarcado: true }
                : psg,
            ),
          })),
        );
      }
    }

    window.addEventListener("univans:embarque-confirmado", onEmbarqueConfirmado);
    return () => window.removeEventListener("univans:embarque-confirmado", onEmbarqueConfirmado);
  }, []);

  const { data: viagensHoje } = useViagensDoDia();
  const viagemAtiva = viagensHoje?.[0];
  const { data: passagensBanco } = useManifestoViagem(viagemAtiva?.id);
  const atualizarTelemetriaMutation = useAtualizarTelemetria();
  const confirmarEmbarqueMutation = useConfirmarEmbarque();

  // MOTOR DE GPS CONTÍNUO (Anti-Sleep, Background Keep-Alive e Buffer Offline)
  const {
    iniciar: iniciarGpsContinuo,
    parar: pararGpsContinuo,
    toggleWakeLock,
    isAtivo: isGpsContinuoAtivo,
    isWakeLockAtivo,
    velocidadeAtualKmh,
    precisaoMetros,
    pontosTransmitidos,
    pontosEmBufferOffline,
    statusConexao,
  } = useContinuousGps();

  // Iniciar ou parar o rastreamento contínuo conforme status da van
  useEffect(() => {
    if (statusVan === "em_transito") {
      iniciarGpsContinuo({
        viagemId: viagemAtiva?.id || "trip_01",
        veiculoId: "van-04",
        motoristaId: "drv_04_al",
        placaVeiculo: "RJP-2F14",
        motoristaNome: "Carlos Eduardo Santos",
        linhaOrigemDestino: "Igreja Nova ➔ Coruripe ➔ Maceió",
        deadbandMetros: 20,
        heartbeatIntervaloMs: 15000,
        onPonto: async (ponto: TelemetriaGpsPonto) => {
          if (!viagemAtiva?.id) return true;
          try {
            await atualizarTelemetriaMutation.mutateAsync({
              id: viagemAtiva.id,
              posicao_lat_atual: ponto.latitude,
              posicao_lng_atual: ponto.longitude,
              status: "em_transito",
            });
            return true;
          } catch {
            return false;
          }
        },
      });
    } else {
      pararGpsContinuo();
    }
  }, [
    statusVan,
    viagemAtiva?.id,
    iniciarGpsContinuo,
    pararGpsContinuo,
    atualizarTelemetriaMutation,
  ]);

  const [resultadoValidacao, setResultadoValidacao] = useState<ResultadoValidacaoOffline | null>(
    null,
  );
  const [pendentesSincronizacao, setPendentesSincronizacao] = useState(
    getQuantidadeValidacoesPendentes(),
  );
  const [sincronizando, setSincronizando] = useState(false);
  const [alertaSosAtivo, setAlertaSosAtivo] = useState(false);

  const [manifesto, setManifesto] = useState<ParadaManifesto[]>([
    {
      id: "p-01",
      nome: "Terminal Central de Igreja Nova",
      referencia: "Praça Central",
      horarioEstimado: "07:00",
      passageirosEmbarcando: [
        {
          id: "psg-101",
          nome: "João Pedro Ferreira",
          telefone: "(82) 99812-4410",
          quantidade: 2,
          valor: 76.0,
          pagoVia: "PIX",
          gpsStatus: "no_ponto",
          distanciaPonto: "No Ponto (Terminal)",
          embarcado: true,
          ticketCode: "UV-2026-X801",
        },
        {
          id: "psg-102",
          nome: "Maria das Graças Silva",
          telefone: "(82) 99655-3211",
          quantidade: 1,
          valor: 38.0,
          pagoVia: "PIX",
          gpsStatus: "no_ponto",
          distanciaPonto: "No Ponto (Terminal)",
          embarcado: true,
          ticketCode: "UV-2026-X802",
        },
      ],
      desembarques: 0,
    },
    {
      id: "p-02",
      nome: "Coruripe (Praça Central / AL-349)",
      referencia: "Centro Comercial de Coruripe",
      horarioEstimado: "08:15",
      passageirosEmbarcando: [
        {
          id: "psg-103",
          nome: "Ana Beatriz Santos",
          telefone: "(82) 99740-8899",
          quantidade: 1,
          valor: 38.0,
          pagoVia: "PIX",
          gpsStatus: "no_ponto",
          distanciaPonto: "A 40m da pista",
          embarcado: true,
          ticketCode: "UV-2026-X803",
        },
        {
          id: "psg-104",
          nome: "Marcos Vinicius Lima",
          telefone: "(82) 99602-1144",
          quantidade: 2,
          valor: 76.0,
          pagoVia: "PIX",
          gpsStatus: "aproximando",
          distanciaPonto: "A 180m do trevo",
          embarcado: false,
          ticketCode: "UV-2026-X804",
        },
      ],
      desembarques: 1,
    },
    {
      id: "p-03",
      nome: "Barra de São Miguel (Trevo AL-101 Sul)",
      referencia: "Posto Shell da Entrada",
      horarioEstimado: "09:00",
      passageirosEmbarcando: [
        {
          id: "psg-105",
          nome: "Carlos Eduardo Oliveira",
          telefone: "(82) 99841-2940",
          quantidade: 1,
          valor: 38.0,
          pagoVia: "PIX",
          gpsStatus: "acostamento",
          distanciaPonto: "No Acostamento (GPS)",
          embarcado: false,
          ticketCode: "UV-2026-X805",
        },
      ],
      desembarques: 2,
    },
    {
      id: "p-04",
      nome: "Maceió (Rodoviária do Feitosa)",
      referencia: "Plataforma de Desembarque",
      horarioEstimado: "09:45",
      passageirosEmbarcando: [],
      desembarques: 14,
    },
  ]);

  const totalPassageiros = manifesto.reduce(
    (acc, p) => acc + p.passageirosEmbarcando.reduce((s, psg) => s + psg.quantidade, 0),
    0,
  );
  const totalEmbarcados = manifesto.reduce(
    (acc, p) =>
      acc +
      p.passageirosEmbarcando
        .filter((psg) => psg.embarcado)
        .reduce((s, psg) => s + psg.quantidade, 0),
    0,
  );
  const faturamentoBruto = manifesto.reduce(
    (acc, p) => acc + p.passageirosEmbarcando.reduce((s, psg) => s + psg.valor, 0),
    0,
  );
  const splitViagem = calcularSplitFinanceiro(faturamentoBruto);
  const extratoLedger = apurarExtratoLedgerMotorista("drv_04_al");

  function toggleChecklist(item: keyof typeof checklist) {
    setChecklist((prev) => ({ ...prev, [item]: !prev[item] }));
  }

  function handleEmbarcar(paradaId: string, passageiroId: string) {
    setManifesto((prev) =>
      prev.map((p) => {
        if (p.id !== paradaId) return p;
        return {
          ...p,
          passageirosEmbarcando: p.passageirosEmbarcando.map((psg) => {
            if (psg.id === passageiroId) {
              const novo = !psg.embarcado;
              if (novo) tocarBipEmbarque();
              return { ...psg, embarcado: novo };
            }
            return psg;
          }),
        };
      }),
    );
  }

  function handleValidarQRSimulado(
    ticketCode: string = "UV-2026-X805",
    nome: string = "Carlos Eduardo Oliveira",
  ) {
    const payload = gerarPayloadQRCodePassagem(
      ticketCode,
      "trip_01",
      "user_01",
      nome,
      "IGN_MCZ_01",
      "Trevo da Barra de São Miguel",
      38.0,
    );

    const resultado = validarQRCodeOffline(payload);
    setResultadoValidacao(resultado);
    if (resultado.valido) {
      tocarBipEmbarque();
      setPendentesSincronizacao(getQuantidadeValidacoesPendentes());

      const tx = criarTransacaoPixComIdempotencia(ticketCode, 38.0, "drv_04_al");
      transicionarEstadoPix(tx.idempotencyKey, "paid");
    }
  }

  async function handleSincronizarOffline() {
    setSincronizando(true);
    await sincronizarValidacoesComServidor();
    setPendentesSincronizacao(getQuantidadeValidacoesPendentes());
    setSincronizando(false);
  }

  function dispararAlertaAcostamento(psgId: string) {
    setAvisoEnviadoId(psgId);
    setTimeout(() => setAvisoEnviadoId(null), 3000);
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 pb-16">
      <BroadcastNotificationListener />
      {/* 1. CABEÇALHO DO MOTORISTA */}
      <header className="sticky top-0 z-30 bg-white/95 px-4 py-3 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/app"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#0d5930]">
                  Cockpit Van #04
                </span>
                <span className="text-[9px] font-black bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded border border-amber-200">
                  RJP-2F14
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-black text-slate-900">
                Igreja Nova ➔ Coruripe ➔ Maceió
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAlertaSosAtivo((prev) => !prev)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black shadow-xs transition-all ${
              alertaSosAtivo
                ? "bg-red-600 text-white animate-pulse"
                : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            <span>{alertaSosAtivo ? "SOS ATIVO" : "SOS"}</span>
          </button>
        </div>

        {/* 5 Abas Operacionais */}
        <div className="grid grid-cols-5 gap-1 mt-3 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setAbaAtiva("viagem")}
            className={`py-2 text-[10px] sm:text-[11px] font-black rounded-xl transition-all truncate ${
              abaAtiva === "viagem"
                ? "bg-[#0d5930] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🚐 Bordo
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva("totem")}
            className={`py-2 text-[10px] sm:text-[11px] font-black rounded-xl transition-all truncate ${
              abaAtiva === "totem"
                ? "bg-[#0d5930] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📲 Totem
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva("encomendas")}
            className={`py-2 text-[10px] sm:text-[11px] font-black rounded-xl transition-all truncate ${
              abaAtiva === "encomendas"
                ? "bg-[#0d5930] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📦 Cargas ({encomendas.filter((e) => e.status !== "entregue_no_terminal").length})
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva("checklist")}
            className={`py-2 text-[10px] sm:text-[11px] font-black rounded-xl transition-all truncate ${
              abaAtiva === "checklist"
                ? "bg-[#0d5930] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📋 Check
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva("caixa")}
            className={`py-2 text-[10px] sm:text-[11px] font-black rounded-xl transition-all truncate ${
              abaAtiva === "caixa"
                ? "bg-[#0d5930] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            💰 Caixa
          </button>
        </div>
      </header>

      {/* 2. CONTEÚDO OPERACIONAL */}
      <main className="w-full max-w-full sm:max-w-2xl mx-auto p-1.5 sm:px-4 py-2 space-y-3">
        {/* ========================================================
            ABA 1: MODO CONDUÇÃO / VIAGEM EM ANDAMENTO
           ======================================================== */}
        {abaAtiva === "viagem" && (
          <div className="space-y-3 animate-in fade-in">
            {/* WIDGET COCKPIT: GPS CONTÍNUO & ANTI-SLEEP (TELEMETRIA ORBITAL) */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                        isGpsContinuoAtivo ? "bg-emerald-400 opacity-75" : "bg-slate-300"
                      }`}
                    />
                    <span
                      className={`relative inline-flex rounded-full h-3 w-3 ${
                        isGpsContinuoAtivo
                          ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                          : "bg-slate-400"
                      }`}
                    />
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <strong className="text-xs sm:text-sm font-black text-slate-900">
                        GPS Contínuo {isGpsContinuoAtivo ? "Ativo" : "Pausado"}
                      </strong>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                          isWakeLockAtivo
                            ? "bg-emerald-50 text-[#0d5930] border-emerald-200"
                            : "bg-amber-50 text-amber-900 border-amber-200"
                        }`}
                      >
                        {isWakeLockAtivo ? "🔒 TELA LIGADA" : "TELA PADRÃO"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {statusConexao === "ONLINE"
                        ? "Transmissão orbital Starlink ativa para passageiros"
                        : `Buffer Offline: ${pontosEmBufferOffline} pontos gravados localmente`}
                    </p>
                  </div>
                </div>

                {/* Alternar status da van */}
                <button
                  type="button"
                  onClick={() =>
                    setStatusVan((prev) => (prev === "em_transito" ? "pausado" : "em_transito"))
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    statusVan === "em_transito"
                      ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                      : "bg-[#0d5930] text-white shadow-xs hover:bg-[#147a44]"
                  }`}
                >
                  {statusVan === "em_transito" ? "Pausar GPS" : "Iniciar GPS"}
                </button>
              </div>

              {/* Grid de Métricas: Velocímetro + Precisão + Transmissões */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                    Velocidade
                  </span>
                  <div className="flex items-baseline justify-center gap-0.5 mt-0.5">
                    <strong className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                      {velocidadeAtualKmh}
                    </strong>
                    <span className="text-[10px] text-slate-500 font-bold">km/h</span>
                  </div>
                </div>
                <div className="border-x border-slate-200/80 px-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                    Precisão GPS
                  </span>
                  <div className="flex items-baseline justify-center gap-0.5 mt-0.5">
                    <strong className="text-sm sm:text-base font-black text-emerald-700 font-mono">
                      ±{precisaoMetros || 3}m
                    </strong>
                  </div>
                  <span className="text-[9px] text-emerald-800 font-bold">Excelente</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                    Transmitidos
                  </span>
                  <div className="flex items-baseline justify-center gap-0.5 mt-0.5">
                    <strong className="text-sm sm:text-base font-black text-[#0d5930] font-mono">
                      {pontosTransmitidos}
                    </strong>
                    <span className="text-[10px] text-slate-400">pts</span>
                  </div>
                  <span className="text-[9px] text-slate-400">Deadband 20m</span>
                </div>
              </div>

              {/* Rodapé do Widget: Botão Anti-Sleep & Status de Rede */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={toggleWakeLock}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    isWakeLockAtivo
                      ? "bg-emerald-50 text-[#0d5930] border border-emerald-200"
                      : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  <span>
                    {isWakeLockAtivo ? "✓ Anti-Sleep Ativo (Tela não apaga)" : "Ativar Anti-Sleep"}
                  </span>
                </button>

                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                  <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{statusConexao}</span>
                </div>
              </div>
            </div>

            {/* BOTÃO GIGANTE DE BIPAR PASSAGEIRO / SCANNER QR CODE */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-[#0b2046] via-[#0d5930] to-[#071833] text-white shadow-sm border border-emerald-400/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-white/10 px-2.5 py-0.5 rounded-full">
                  Validador Criptográfico Offline
                </span>
                <span className="text-xs font-mono text-emerald-300 font-bold">
                  {pendentesSincronizacao} pendente(s)
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleValidarQRSimulado()}
                className="w-full flex items-center justify-center gap-2 min-h-10 h-10 sm:h-11 py-2 px-5 rounded-lg bg-gradient-to-r from-emerald-500 to-[#147a44] text-white text-xs sm:text-sm font-black shadow-xs active:scale-99 transition-all hover:brightness-110 cursor-pointer"
              >
                <Camera className="h-4.5 w-4.5 text-amber-300" />
                <span>BIPAR PASSAGEIRO (LER QR CODE)</span>
              </button>

              {/* Feedback de Validação Instantâneo */}
              {resultadoValidacao && (
                <div
                  className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 animate-in zoom-in-95 ${
                    resultadoValidacao.valido
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-100"
                      : "bg-red-500/20 border-red-400 text-red-100"
                  }`}
                >
                  {resultadoValidacao.valido ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <strong className="block font-black">
                      {resultadoValidacao.valido
                        ? "EMBARQUE LIBERADO!"
                        : "BILHETE INVÁLIDO OU REPETIDO"}
                    </strong>
                    <span className="text-[10px] opacity-90">
                      {resultadoValidacao.motivo || "Bilhete verificado com sucesso"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* PRÓXIMA PARADA / TREVO EM DESTAQUE */}
            <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Próxima Parada Programada
                </span>
                <span className="text-xs font-black text-[#0d5930] bg-emerald-50 px-2 py-0.5 rounded-md">
                  Chegada em ~8 min
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Barra de São Miguel (Trevo AL-101 Sul)
                  </h3>
                  <span className="text-[11px] text-slate-500">Ref: Posto Shell da Entrada</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-amber-600 block">1 Embarque</span>
                  <span className="text-[10px] text-slate-400">2 Desembarques</span>
                </div>
              </div>
            </div>

            {/* MANIFESTO DE PARADAS DA ROTA */}
            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">
                Manifesto de Bordo ({manifesto.length} Paradas)
              </h2>

              {manifesto.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl bg-white border border-slate-200/90 shadow-xs overflow-hidden"
                >
                  <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#0d5930]" />
                      <strong className="text-xs font-black text-slate-900">{p.nome}</strong>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-600">
                      {p.horarioEstimado}
                    </span>
                  </div>

                  <div className="p-3 space-y-2">
                    {p.passageirosEmbarcando.length === 0 ? (
                      <p className="text-[11px] text-slate-400">
                        Apenas desembarques nesta parada.
                      </p>
                    ) : (
                      p.passageirosEmbarcando.map((psg) => (
                        <div
                          key={psg.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                        >
                          <div className="min-w-0">
                            <strong className="text-slate-900 font-bold block truncate">
                              {psg.nome}
                            </strong>
                            <span className="text-[10px] text-slate-500">
                              {psg.quantidade} vaga(s) • {psg.distanciaPonto}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleEmbarcar(p.id, psg.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                              psg.embarcado
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-[#0d5930] text-white"
                            }`}
                          >
                            {psg.embarcado ? "✓ Embarcado" : "Embarcar"}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            ABA 2: TOTEM DIGITAL DE BORDO (QR CODE DA VAN)
           ======================================================== */}
        {abaAtiva === "totem" && (
          <div className="space-y-4 animate-in fade-in">
            {/* CARD TOTEM GIGANTE PARA O PAINEL */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0b2046] via-[#0d5930] to-[#071833] text-white shadow-2xl border border-emerald-400/40 text-center space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-white/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  <span>Totem de Embarque Digital</span>
                </span>
                <span className="text-xs font-mono text-emerald-300 font-bold flex items-center gap-1">
                  <Wifi className="h-3.5 w-3.5" />
                  <span>Starlink Online</span>
                </span>
              </div>

              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Aproxime seu Celular para Embarcar
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Abra o aplicativo UniVans no celular, toque em "Ler QR Code da Van" e mire aqui
                </p>
              </div>

              {/* QR Code de Alta Visibilidade */}
              <div className="bg-white p-4 rounded-3xl border-4 border-amber-300 shadow-2xl max-w-[220px] mx-auto">
                <RealQrCodePix
                  textoChave="UNIVANS:TOTEM_VAN_04:RJP2F14:LINE_IGN_MCZ"
                  tamanho={200}
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-mono text-amber-300 font-black tracking-widest block">
                  VAN RJP-2F14 • LINHA IGREJA NOVA ➔ MACEIÓ
                </span>
                <span className="text-[11px] text-emerald-200 block font-semibold">
                  {totalEmbarcados} de {totalPassageiros} passageiros já embarcados
                </span>
              </div>
            </div>

            {/* ÚLTIMO PASSAGEIRO VALIDADO EM TEMPO REAL */}
            {ultimoEmbarque && (
              <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 flex items-center justify-between gap-3 shadow-md animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider block">
                      Embarque Confirmado Agora!
                    </span>
                    <strong className="text-sm font-black truncate block">
                      {ultimoEmbarque.nome}
                    </strong>
                    <span className="text-[10px] text-emerald-800">
                      {ultimoEmbarque.quantidade} vaga(s) • Bilhete {ultimoEmbarque.bilheteId} às{" "}
                      {ultimoEmbarque.horario}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black text-emerald-800 bg-emerald-200/80 px-2.5 py-1 rounded-lg shrink-0">
                  Uso Único OK ✓
                </span>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            ABA 3: ENCOMENDAS EXPRESS & CONFERÊNCIA DE PIN (ESTILO 99)
           ======================================================== */}
        {abaAtiva === "encomendas" && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-[#0d5930]" />
                  <span>Bagageiro de Encomendas da Van</span>
                </span>
                <span className="text-xs font-black text-[#0d5930] bg-emerald-50 px-2 py-0.5 rounded-md">
                  {encomendas.filter((e) => e.status !== "entregue_no_terminal").length} a bordo
                </span>
              </div>
              <p className="text-xs text-slate-600">
                A entrega só pode ser realizada mediante a digitação do{" "}
                <strong>PIN de 4 dígitos</strong> fornecido pelo remetente ao destinatário.
              </p>
            </div>

            {/* LISTAGEM DE CARGAS NO BAGAGEIRO */}
            <div className="space-y-3">
              {encomendas.map((enc) => {
                const entregue = enc.status === "entregue_no_terminal";

                return (
                  <div
                    key={enc.id}
                    className={`rounded-2xl p-4 border transition-all ${
                      entregue
                        ? "bg-slate-50 border-slate-200 opacity-80"
                        : "bg-white border-slate-200 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-[#0d5930]">
                            {enc.codigoRastreio}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                              entregue
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-900"
                            }`}
                          >
                            {entregue ? "Entregue ✓" : "A Bordo / Em Trânsito"}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900 mt-1">
                          {enc.origem} ➔ {enc.destino}
                        </h4>
                        <p className="text-xs text-slate-600 font-medium">{enc.descricao}</p>
                      </div>

                      <span className="text-xs font-black text-slate-900 shrink-0">
                        R$ {enc.valorFrete.toFixed(2).replace(".", ",")}
                      </span>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="text-slate-600">
                        <span>Retirada por: </span>
                        <strong className="text-slate-900">{enc.destinatarioNome}</strong>
                        <span className="text-[10px] text-slate-400 block sm:inline sm:ml-1">
                          ({enc.destinatarioTelefone})
                        </span>
                      </div>

                      {entregue ? (
                        <div className="flex items-center gap-1 text-emerald-700 font-black text-xs">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>Entregue ({enc.dataEntrega || "Hoje"})</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEncomendaParaEntregar(enc);
                            setPinDigitado("");
                            setErroPin(null);
                          }}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0d5930] hover:bg-[#147a44] text-white text-xs font-black shadow-sm active:scale-95 transition-all"
                        >
                          <KeyRound className="h-3.5 w-3.5 text-amber-300" />
                          <span>Validar PIN &amp; Entregar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MODAL DE CONFIRMAÇÃO DE PIN ESTILO 99 */}
        {encomendaParaEntregar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
            <div className="w-[96vw] max-w-none sm:max-w-md mx-auto rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border border-slate-200 text-center space-y-4 animate-in zoom-in-95">
              <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-xs">
                <KeyRound className="h-7 w-7" />
              </div>

              <div>
                <span className="text-xs font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                  Confirmação Segura de Entrega
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  Digite o PIN do Destinatário
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                  Solicite o código de 4 dígitos que {encomendaParaEntregar.destinatarioNome}{" "}
                  recebeu do remetente
                </p>
              </div>

              {/* Informação do Pacote */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs sm:text-sm space-y-1">
                <p className="font-bold text-slate-900">
                  Pacote: {encomendaParaEntregar.codigoRastreio}
                </p>
                <p className="text-slate-700">{encomendaParaEntregar.descricao}</p>
                <p className="text-slate-500 text-xs">Destino: {encomendaParaEntregar.destino}</p>
              </div>

              {/* Input de PIN com 4 dígitos */}
              <div className="space-y-2">
                <input
                  type="text"
                  maxLength={4}
                  autoFocus
                  placeholder="0000"
                  value={pinDigitado}
                  onChange={(e) => setPinDigitado(e.target.value.replace(/\D/g, ""))}
                  className="w-full tracking-[0.7em] text-center text-3xl font-black font-mono min-h-[56px] h-14 rounded-xl bg-slate-100 border-2 border-slate-300 focus:border-[#0d5930] focus:bg-white text-slate-900 outline-none transition-all"
                />

                {erroPin && (
                  <p className="text-xs sm:text-sm font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 animate-in shake">
                    {erroPin}
                  </p>
                )}

                {sucessoEntrega && (
                  <p className="text-xs sm:text-sm font-bold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-300 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>{sucessoEntrega}</span>
                  </p>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEncomendaParaEntregar(null)}
                  className="flex-1 min-h-[48px] h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-all cursor-pointer active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={pinDigitado.length !== 4}
                  onClick={handleConfirmarEntregaPin}
                  className="flex-1 min-h-[48px] h-12 rounded-xl bg-[#0d5930] hover:bg-[#147a44] disabled:opacity-50 text-white text-sm font-black shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  Confirmar Entrega
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            ABA 4: CHECKLIST DE SEGURANÇA VEICULAR
           ======================================================== */}
        {abaAtiva === "checklist" && (
          <div className="space-y-3 animate-in fade-in">
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-3.5">
              <div className="border-b border-slate-100 pb-2.5">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Checklist Obrigatório Pré-Viagem
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Conformidade com os padrões de segurança da Cooperativa
                </p>
              </div>

              <div className="space-y-2.5">
                {Object.entries(checklist).map(([key, val]) => (
                  <div
                    key={key}
                    onClick={() => toggleChecklist(key as keyof typeof checklist)}
                    className="flex items-center justify-between min-h-12 p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-xs sm:text-sm font-bold text-slate-800 capitalize">
                      {key.replace(/([A-Z])/g, " $1")}
                    </span>
                    <div
                      className={`h-7 w-7 rounded-xl flex items-center justify-center text-white transition-all ${
                        val ? "bg-[#0d5930]" : "bg-slate-300"
                      }`}
                    >
                      {val && <Check className="h-4.5 w-4.5" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            ABA 3: CAIXA & LIVRO-RAZÃO
           ======================================================== */}
        {abaAtiva === "caixa" && (
          <div className="space-y-3 animate-in fade-in">
            <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-3">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-sm font-black text-slate-900">Resumo Financeiro da Viagem</h3>
                <p className="text-xs text-slate-500">
                  Split contábil automático com precisão em centavos
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 block">
                    Líquido do Motorista
                  </span>
                  <strong className="text-base font-black text-[#0d5930]">
                    R$ {splitViagem.repasseMotorista.toFixed(2).replace(".", ",")}
                  </strong>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block">
                    Faturamento Bruto
                  </span>
                  <strong className="text-base font-black text-slate-900">
                    R$ {faturamentoBruto.toFixed(2).replace(".", ",")}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
