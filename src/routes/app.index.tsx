import {
  ModalCompraPassagem,
  type DadosViagemCompra,
} from "@/components/passagens/ModalCompraPassagem";
import { AppDrawer } from "@/components/navigation/AppDrawer";
import { SecaoTrajetosFrequentes } from "@/components/home/SecaoTrajetosFrequentes";
import { useGeolocation } from "@/lib/use-geolocation";
import { buscarVanMaisProxima } from "@/lib/horarios-inteligentes";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  ArrowUpDown,
  Bell,
  ChevronRight,
  Clock,
  Menu,
  Radio,
  Search,
  Ticket,
  X,
} from "lucide-react";
import { useViagensDoDia } from "@/lib/univans-db";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Para onde vamos? | UniVans Starlink" },
      {
        name: "description",
        content:
          "Encontre vans, rotas, horários e compre passagens com facilidade na UniVans com Wi-Fi Starlink a bordo.",
      },
    ],
  }),
  component: AppHomeScreen,
});

interface CidadeItem {
  id: string;
  nome: string;
  terminal: string;
  categoria: "alagoas" | "confeccoes" | "litoral";
  tempoMedio: string;
  frequencia: string;
  popular?: boolean;
}

const CIDADES_DISPONIVEIS: CidadeItem[] = [
  {
    id: "tapera",
    nome: "Tapera",
    terminal: "Praça Central / Terminal de Vans",
    categoria: "alagoas",
    tempoMedio: "Ponto de Partida",
    frequencia: "Saídas a cada 30 min",
    popular: true,
  },
  {
    id: "maceio",
    nome: "Maceió",
    terminal: "Trevo Tabuleiro / Rodoviária Central",
    categoria: "alagoas",
    tempoMedio: "Hub Principal",
    frequencia: "Saídas a cada 15 min",
    popular: true,
  },
  {
    id: "arapiraca",
    nome: "Arapiraca",
    terminal: "Terminal Rodoviário Intermunicipal",
    categoria: "alagoas",
    tempoMedio: "Hub Agreste",
    frequencia: "Linha Express Contínua",
    popular: true,
  },
  {
    id: "toritama",
    nome: "Toritama",
    terminal: "Polo das Confecções / Capital do Jeans",
    categoria: "confeccoes",
    tempoMedio: "~3h 15min",
    frequencia: "Excursões & Compras",
    popular: true,
  },
  {
    id: "santa-cruz",
    nome: "Santa Cruz do Capibaribe",
    terminal: "Moda Center Santa Cruz (Setor Verde)",
    categoria: "confeccoes",
    tempoMedio: "~3h 40min",
    frequencia: "Dias de Feira e Diário",
    popular: true,
  },
  {
    id: "caruaru",
    nome: "Caruaru",
    terminal: "Parque 18 de Maio / Feira da Sulanca",
    categoria: "confeccoes",
    tempoMedio: "~2h 50min",
    frequencia: "Diário com Ar VIP",
    popular: true,
  },
  {
    id: "maragogi",
    nome: "Maragogi",
    terminal: "Orla Central & Galés de Maragogi",
    categoria: "litoral",
    tempoMedio: "~2h 10min",
    frequencia: "Transfer Turístico VIP",
    popular: true,
  },
  {
    id: "palmeira",
    nome: "Palmeira dos Índios",
    terminal: "Praça do Açude / Centro",
    categoria: "alagoas",
    tempoMedio: "~1h 10min",
    frequencia: "Saídas a cada 45 min",
  },
  {
    id: "sao-miguel",
    nome: "São Miguel dos Campos",
    terminal: "Posto Pichilau / Rodovia BR-101",
    categoria: "alagoas",
    tempoMedio: "~45 min",
    frequencia: "Parada Express",
  },
];

export function AppHomeScreen() {
  const [origem, setOrigem] = useState("Tapera");
  const [destino, setDestino] = useState("Maceió");
  const [rotacionando, setRotacionando] = useState(false);

  const [modalCidadeAberto, setModalCidadeAberto] = useState(false);
  const [tipoSelecao, setTipoSelecao] = useState<"origem" | "destino">("origem");
  const [buscaCidade, setBuscaCidade] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<
    "todas" | "alagoas" | "confeccoes" | "litoral"
  >("todas");

  const [viagemParaComprar, setViagemParaComprar] = useState<DadosViagemCompra | null>(null);
  const [modalCompraAberto, setModalCompraAberto] = useState(false);

  const [userAvatar, setUserAvatar] = useState(
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  );
  const [userName, setUserName] = useState("Passageiro");
  const [menuDrawerAberto, setMenuDrawerAberto] = useState(false);

  useEffect(() => {
    const savedAvatar = localStorage.getItem("univans_user_avatar");
    if (savedAvatar) setUserAvatar(savedAvatar);
    const savedNome = localStorage.getItem("univans_user_nome");
    if (savedNome) setUserName(savedNome);
  }, []);

  const navigate = useNavigate();
  const { data: viagensBanco } = useViagensDoDia();

  const vanMaisProxima = useMemo(() => {
    // Se houver viagens no banco para hoje, tentar enriquecer a busca
    const vanLocal = buscarVanMaisProxima(origem, destino);
    if (!vanLocal) return null;

    // Tentar encontrar uma viagem real correspondente à linha
    const viagemReal = viagensBanco?.find(
      (v) =>
        v.linhas?.origem.toLowerCase().includes(origem.toLowerCase()) &&
        v.linhas?.destino.toLowerCase().includes(destino.toLowerCase()),
    );

    // Lógica Last-Minute Inteligente: se a van sai em menos de 25 min e tem vagas ociosas (>3), aplicar 20% OFF
    const precoOriginal = viagemReal?.linhas?.valor_passagem
      ? Number(viagemReal.linhas.valor_passagem)
      : vanLocal.valorPassagem;
    const isLastMinute =
      vanLocal.minutosAteChegadaPonto <= 25 &&
      (viagemReal
        ? (viagemReal.vagas_totais ?? 16) - (viagemReal.vagas_ocupadas ?? 0)
        : vanLocal.vagasLivres) >= 2;
    const valorComDesconto = isLastMinute ? Math.round(precoOriginal * 0.8) : precoOriginal;

    if (viagemReal) {
      return {
        ...vanLocal,
        isLastMinute,
        precoOriginal,
        vagasLivres: Math.max(
          0,
          (viagemReal.vagas_totais ?? 16) - (viagemReal.vagas_ocupadas ?? 0),
        ),
        valorPassagem: valorComDesconto,
        horario: {
          ...vanLocal.horario,
          id: viagemReal.id,
          linhaId: viagemReal.linha_id,
          horarioSaida: viagemReal.horario_saida?.slice(0, 5) || vanLocal.horario.horarioSaida,
          vagasLivres: Math.max(
            0,
            (viagemReal.vagas_totais ?? 16) - (viagemReal.vagas_ocupadas ?? 0),
          ),
          valorPassagem: valorComDesconto,
        },
      };
    }

    return {
      ...vanLocal,
      isLastMinute,
      precoOriginal,
      valorPassagem: valorComDesconto,
      horario: {
        ...vanLocal.horario,
        valorPassagem: valorComDesconto,
      },
    };
  }, [origem, destino, viagensBanco]);

  function inverterCidades() {
    setRotacionando(true);
    const temp = origem;
    setOrigem(destino);
    setDestino(temp);
    setTimeout(() => setRotacionando(false), 300);
  }

  function abrirModal(tipo: "origem" | "destino") {
    setTipoSelecao(tipo);
    setBuscaCidade("");
    setCategoriaFiltro("todas");
    setModalCidadeAberto(true);
  }

  function selecionarCidade(nomeCidade: string) {
    if (tipoSelecao === "origem") {
      setOrigem(nomeCidade);
    } else {
      setDestino(nomeCidade);
    }
    setModalCidadeAberto(false);
  }

  function definirRotaRapida(origemNome: string, destinoNome: string) {
    setOrigem(origemNome);
    setDestino(destinoNome);
  }

  function handleAbrirCompra(rota: any, horario: any) {
    setViagemParaComprar({
      id: rota.id,
      origem: rota.origem,
      destino: rota.destino,
      horarioSaida: horario.horarioSaida + " (" + horario.dataTexto + ")",
      tempoEstimado: horario.tempoEstimadoTexto,
      valorPassagem: horario.valorPassagem,
      motorista: horario.motoristaNome,
      motoristaFoto: horario.motoristaFoto,
      placa: horario.vanPlaca,
      modelo: horario.vanModelo,
      starlinkWifi: horario.starlinkWifi,
    });
    setModalCompraAberto(true);
  }

  const cidadesFiltradas = useMemo(() => {
    return CIDADES_DISPONIVEIS.filter((c) => {
      const matchBusca =
        c.nome.toLowerCase().includes(buscaCidade.toLowerCase()) ||
        c.terminal.toLowerCase().includes(buscaCidade.toLowerCase());
      const matchCategoria = categoriaFiltro === "todas" ? true : c.categoria === categoriaFiltro;
      return matchBusca && matchCategoria;
    });
  }, [buscaCidade, categoriaFiltro]);

  return (
    <div className="min-h-[100dvh] bg-[#f6f9f7] text-slate-900 pb-10 antialiased selection:bg-emerald-500 selection:text-white">
      {/* 1. CABEÇALHO EXECUTIVO DE MOBILIDADE URBANA (DESIGN SYSTEM PROFISSIONAL) */}
      <div className="relative bg-gradient-to-b from-[#071328] via-[#0a1e3f] to-[#071833] px-3 sm:px-6 pt-3 pb-4 text-white rounded-b-2xl sm:rounded-b-[2rem] shadow-[0_16px_36px_rgba(7,24,51,0.3)] overflow-hidden border-b border-emerald-500/20">
        {/* Ambient Glows Aeroespaciais Sutis & Grid Matrix */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-40" />
        <div className="absolute -top-20 -right-16 h-60 w-60 rounded-full bg-[#f5a623]/10 blur-[70px] pointer-events-none" />
        <div className="absolute top-1/3 -left-16 h-52 w-52 rounded-full bg-emerald-500/15 blur-[80px] pointer-events-none" />

        {/* NÍVEL 1 — APP BAR: [MENU] [LOGO UNIVANS] ........ [NOTIFICAÇÕES] [PERFIL] */}
        <div className="relative z-10 flex items-center justify-between gap-3 mb-2.5">
          {/* Lado Esquerdo: Menu Hamburger + Logo UniVans Integrado */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMenuDrawerAberto(true)}
              className="flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/15 hover:border-white/30 active:scale-95 transition-all shadow-2xs cursor-pointer shrink-0"
              aria-label="Abrir Menu de Navegação"
              title="Menu Principal"
            >
              <Menu className="h-5 w-5 stroke-[2.2]" />
            </button>

            <Link
              to="/app"
              className="flex items-center active:scale-98 transition-transform cursor-pointer"
              title="UniVans Coop Alagoas"
            >
              <img
                src="/logo.svg"
                alt="UniVans Coop"
                className="h-8 sm:h-9 w-auto max-w-[145px] sm:max-w-[175px] object-contain drop-shadow-[0_2px_10px_rgba(16,185,129,0.3)]"
              />
            </Link>
          </div>

          {/* Lado Direito: Notificações / Central SOS + Avatar de Perfil */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/app/sos"
              className="flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-slate-200 border border-white/15 hover:border-white/30 active:scale-95 transition-all shadow-2xs cursor-pointer relative"
              title="Central de Emergência & SOS"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-[#0a1e3f] animate-pulse" />
            </Link>

            <Link
              to="/app/perfil"
              className="relative flex items-center group cursor-pointer"
              title="Meu Perfil"
            >
              <div className="h-10 w-10 rounded-xl border border-white/80 bg-white/10 backdrop-blur-md overflow-hidden shadow-2xs group-hover:scale-105 transition-all ring-1 ring-emerald-400/30">
                <img src={userAvatar} alt={userName} className="h-full w-full object-cover" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0a1e3f] shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            </Link>
          </div>
        </div>

        {/* NÍVEL 2 — CONTEXTO DO USUÁRIO */}
        <div className="relative z-10 mb-2.5 text-left">
          <p className="text-xs sm:text-sm font-semibold text-emerald-300/90 tracking-wide leading-none">
            Olá, {userName && userName !== "Passageiro" ? userName.split(" ")[0] : "Passageiro"} 👋
          </p>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight mt-1">
            Para onde você vai?
          </h1>
        </div>

        {/* NÍVEL 3 — FLUXO DE ORIGEM E DESTINO (CARD PRINCIPAL DE MOBILIDADE) */}
        <div className="relative z-10 bg-white text-slate-900 rounded-2xl shadow-xl shadow-slate-950/20 border border-white/80 p-3 sm:p-4">
          {/* BLOCO UNIFICADO ORIGEM & DESTINO COM CONECTOR VERTICAL E BOTÃO INVERTER INTEGRADO */}
          <div className="relative flex items-center gap-2.5 sm:gap-3 bg-slate-50/80 rounded-xl p-2.5 sm:p-3 border border-slate-200/80">
            {/* Coluna 1: Linha Visual Conectora & Pontos com Diferenciação Clara */}
            <div className="flex flex-col items-center justify-between h-20 sm:h-22 py-1 shrink-0">
              {/* Ponto de Origem: Círculo Esmeralda */}
              <span className="h-3 w-3 rounded-full bg-emerald-500 ring-3 ring-emerald-200 shadow-xs shrink-0" />
              {/* Linha Contínua Conectora */}
              <span className="w-0.5 flex-1 bg-gradient-to-b from-emerald-400 via-slate-300 to-amber-400 my-1 rounded-full" />
              {/* Ponto de Destino: Marcador Âmbar/Dourado */}
              <span className="h-3 w-3 rounded-xs bg-amber-500 ring-3 ring-amber-200 shadow-xs shrink-0" />
            </div>

            {/* Coluna 2: Campos Interativos de Origem e Destino com Divisor */}
            <div className="flex-1 min-w-0 flex flex-col justify-between h-20 sm:h-22">
              {/* PONTO DE PARTIDA */}
              <div
                onClick={() => abrirModal("origem")}
                className="cursor-pointer group flex flex-col justify-center py-0.5 rounded-lg px-2 -mx-1 hover:bg-white/90 active:bg-white transition-colors"
                role="button"
                tabIndex={0}
                aria-label={`Ponto de partida: ${origem}. Clique para alterar.`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                  Ponto de Partida
                </span>
                <strong className="text-sm sm:text-base font-black text-slate-900 truncate block group-hover:text-emerald-700 transition-colors">
                  {origem}
                </strong>
              </div>

              {/* Linha Divisória Fina */}
              <div className="border-t border-slate-200/70 my-0.5" />

              {/* DESTINO FINAL */}
              <div
                onClick={() => abrirModal("destino")}
                className="cursor-pointer group flex flex-col justify-center py-0.5 rounded-lg px-2 -mx-1 hover:bg-white/90 active:bg-white transition-colors"
                role="button"
                tabIndex={0}
                aria-label={`Destino final: ${destino}. Clique para alterar.`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                  Destino Final
                </span>
                <strong className="text-sm sm:text-base font-black text-slate-900 truncate block group-hover:text-amber-600 transition-colors">
                  {destino}
                </strong>
              </div>
            </div>

            {/* Coluna 3: Botão de Inverter Integrado ao Componente */}
            <button
              type="button"
              onClick={inverterCidades}
              className={`min-h-[40px] min-w-[40px] h-10 w-10 rounded-xl bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 shadow-2xs flex items-center justify-center shrink-0 active:scale-90 transition-all cursor-pointer ${
                rotacionando ? "rotate-180" : ""
              }`}
              title="Inverter origem e destino"
              aria-label="Inverter cidades de partida e chegada"
            >
              <ArrowUpDown className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* CTA PRINCIPAL: CONSULTAR HORÁRIOS & COMPRAR PASSAGEM */}
          <button
            type="button"
            onClick={() =>
              navigate({
                to: "/app/linhas",
                search: {
                  origem,
                  destino,
                  busca: destino,
                  cidade: destino,
                } as any,
              })
            }
            className="w-full mt-3 flex items-center justify-center gap-2 min-h-[48px] h-12 py-2 px-5 rounded-xl bg-gradient-to-r from-[#0d5930] via-[#126839] to-[#0b2046] hover:brightness-110 active:scale-[0.98] text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-md shadow-emerald-950/20 transition-all cursor-pointer group"
          >
            <Search className="h-4.5 w-4.5 text-amber-300 group-hover:scale-110 transition-transform" />
            <span>Consultar Horários & Comprar Passagem</span>
            <ChevronRight className="h-4.5 w-4.5 text-amber-300 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* 3. CONTEÚDO PRINCIPAL DA HOME COM FOCO OPERACIONAL */}
      <div className="px-1 sm:px-4 mt-3 space-y-4 w-full max-w-full sm:max-w-2xl mx-auto">
        {/* COCKPIT CARD: PRÓXIMA VAN EM TRÂNSITO (MINIMALISTA E DIRETO) */}
        {vanMaisProxima && (
          <div className="rounded-2xl bg-white border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-3 animate-in fade-in">
            {/* Topo: Status & ETA */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Van a Caminho
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold text-amber-800 shadow-2xs">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                <span>
                  Chega em <strong>~{vanMaisProxima.minutosAteChegadaPonto} min</strong>
                </span>
              </div>
            </div>

            {/* Trajeto & Preço */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                  {vanMaisProxima.rota.origem.split("(")[0]?.trim()} ➔{" "}
                  {vanMaisProxima.rota.destino.split("(")[0]?.trim()}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Saída {vanMaisProxima.horario.horarioSaida} • {vanMaisProxima.vagasLivres} vagas
                  restantes
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs text-slate-400 block font-medium">Tarifa</span>
                <strong className="text-base sm:text-lg font-black text-[#0d5930]">
                  R$ {vanMaisProxima.valorPassagem.toFixed(2).replace(".", ",")}
                </strong>
              </div>
            </div>

            {/* Motorista & Ação de Compra */}
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={vanMaisProxima.motoristaFoto}
                  alt={vanMaisProxima.motoristaNome}
                  className="h-10 w-10 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0">
                  <strong className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                    {vanMaisProxima.motoristaNome}
                  </strong>
                  <span className="text-[11px] text-slate-400 block truncate">
                    {vanMaisProxima.vanModelo} • {vanMaisProxima.vanPlaca}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAbrirCompra(vanMaisProxima.rota, vanMaisProxima.horario)}
                className="flex items-center gap-1.5 min-h-[44px] h-11 px-4 rounded-xl bg-[#0d5930] hover:bg-[#147a44] text-white text-xs sm:text-sm font-black active:scale-95 transition-all shrink-0 cursor-pointer shadow-sm"
              >
                <Ticket className="h-4 w-4 text-amber-300" />
                <span>Reservar</span>
              </button>
            </div>
          </div>
        )}

        {/* SEÇÃO INTELIGENTE DE MOBILIDADE: SEUS TRAJETOS FREQUENTES / ROTAS POPULARES */}
        <SecaoTrajetosFrequentes
          origemAtual={origem}
          destinoAtual={destino}
          onSelecionarRota={(novaOrigem, novoDestino) => {
            setOrigem(novaOrigem);
            setDestino(novoDestino);
            if (typeof window !== "undefined") {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          onConsultarHorarios={(novaOrigem, novoDestino) => {
            setOrigem(novaOrigem);
            setDestino(novoDestino);
            navigate({
              to: "/app/linhas",
              search: {
                origem: novaOrigem,
                destino: novoDestino,
                busca: novoDestino,
                cidade: novoDestino,
              } as any,
            });
          }}
        />

        {/* ATALHO ELEGANTE PARA O RADAR AO VIVO (SEM POLUIÇÃO VISUAL) */}
        <Link
          to="/app/viagem"
          className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-[#0d5930] active:scale-[0.99] transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#0d5930] border border-emerald-100 group-hover:bg-[#0d5930] group-hover:text-white transition-colors">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900">Van ao Vivo no Radar</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Acompanhe as vans em movimento no mapa
              </p>
            </div>
          </div>
          <ChevronRight className="h-4.5 w-4.5 text-slate-400 group-hover:text-[#0d5930] group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* MODAL SELEÇÃO DE CIDADE */}
      {modalCidadeAberto && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* BARRA DE ARRASTE MOBILE */}
            <div className="h-1.5 w-12 rounded-full bg-slate-300 mx-auto mt-3 mb-1 sm:hidden" />

            <div className="p-3.5 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Selecione a {tipoSelecao === "origem" ? "Origem / Partida" : "Destino / Chegada"}
              </h3>
              <button
                type="button"
                onClick={() => setModalCidadeAberto(false)}
                className="h-11 w-11 sm:h-10 sm:w-10 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                aria-label="Fechar"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="flex items-center gap-3 px-4 min-h-[48px] h-12 rounded-xl bg-slate-50 border border-slate-200 text-sm sm:text-base focus-within:border-[#0d5930] focus-within:ring-2 focus-within:ring-[#0d5930]/20 transition-all">
                <Search className="h-5 w-5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar cidade, terminal ou feira..."
                  value={buscaCidade}
                  onChange={(e) => setBuscaCidade(e.target.value)}
                  className="w-full bg-transparent focus:outline-none font-medium text-slate-900 placeholder:text-slate-400"
                />
              </div>

              {/* Pílulas de Categoria */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setCategoriaFiltro("todas")}
                  className={`min-h-[42px] h-10 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center active:scale-95 ${
                    categoriaFiltro === "todas"
                      ? "bg-[#0d5930] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setCategoriaFiltro("alagoas")}
                  className={`min-h-[42px] h-10 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center active:scale-95 ${
                    categoriaFiltro === "alagoas"
                      ? "bg-[#0d5930] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Alagoas
                </button>
                <button
                  type="button"
                  onClick={() => setCategoriaFiltro("confeccoes")}
                  className={`min-h-[42px] h-10 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center active:scale-95 ${
                    categoriaFiltro === "confeccoes"
                      ? "bg-[#0d5930] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Confecções PE
                </button>
                <button
                  type="button"
                  onClick={() => setCategoriaFiltro("litoral")}
                  className={`min-h-[42px] h-10 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center active:scale-95 ${
                    categoriaFiltro === "litoral"
                      ? "bg-[#0d5930] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Litoral
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2">
              {cidadesFiltradas.map((c) => (
                <div
                  key={c.id}
                  onClick={() => selecionarCidade(c.nome)}
                  className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-slate-50/80 hover:bg-emerald-50/50 active:scale-[0.99] cursor-pointer transition-all border border-slate-100 min-h-[56px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#0d5930] shrink-0">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <strong className="text-sm sm:text-base font-black text-slate-900 block">
                        {c.nome}
                      </strong>
                      <span className="text-xs text-slate-500 font-medium">{c.terminal}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE COMPRA */}
      <ModalCompraPassagem
        aberto={modalCompraAberto}
        onFechar={() => setModalCompraAberto(false)}
        viagem={viagemParaComprar}
      />

      {/* MENU LATERAL HAMBÚRGUER (APP DRAWER) */}
      <AppDrawer open={menuDrawerAberto} onClose={() => setMenuDrawerAberto(false)} />
    </div>
  );
}
