import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Bell,
  BellRing,
  Send,
  Users,
  Smartphone,
  ShieldAlert,
  AlertTriangle,
  Info,
  Sparkles,
  CheckCircle2,
  Trash2,
  RotateCw,
  Eye,
  Layers,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Clock,
  Check,
} from "lucide-react";
import {
  type CategoriaDestinatario,
  type UrgenciaNotificacao,
  type NotificacaoBroadcast,
  listarNotificacoesBroadcast,
  dispararBroadcastAdmin,
  excluirNotificacaoBroadcast,
  TEMPLATES_NOTIFICACOES,
} from "@/lib/broadcast-notifications";

export const Route = createFileRoute("/app/admin/notificacoes")({
  head: () => ({
    meta: [
      { title: "Central de Disparo de Notificações | PARTIU Admin" },
      {
        name: "description",
        content:
          "Disparo de notificações push e comunicados segmentados para usuários, motoristas e entregadores.",
      },
    ],
  }),
  component: AdminNotificacoesScreen,
});

export function AdminNotificacoesScreen() {
  const [notificacoes, setNotificacoes] = useState<NotificacaoBroadcast[]>(() =>
    listarNotificacoesBroadcast(),
  );

  // Form State
  const [categoria, setCategoria] = useState<CategoriaDestinatario>("usuario");
  const [urgencia, setUrgencia] = useState<UrgenciaNotificacao>("info");
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [rotaDestino, setRotaDestino] = useState("/app");
  const [enviando, setEnviando] = useState(false);
  const [feedbackSucesso, setFeedbackSucesso] = useState<string | null>(null);

  // Totais
  const totalEnvios = notificacoes.length;
  const totalAlcance = useMemo(() => {
    return notificacoes.reduce((acc, n) => acc + (n.totalDestinatariosEstimados || 0), 0);
  }, [notificacoes]);

  // Aplicar template rápido
  function aplicarTemplate(t: (typeof TEMPLATES_NOTIFICACOES)[0]) {
    setCategoria(t.categoria);
    setUrgencia(t.urgencia);
    setTitulo(t.titulo);
    setMensagem(t.mensagem);
    setRotaDestino(t.rotaDestino);
  }

  async function handleDisparar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !mensagem.trim()) {
      alert("Por favor, preencha o título e a mensagem.");
      return;
    }

    setEnviando(true);
    try {
      const res = await dispararBroadcastAdmin({
        titulo: titulo.trim(),
        mensagem: mensagem.trim(),
        categoria,
        urgencia,
        rotaDestino: rotaDestino.trim() || "/app",
        enviadoPor: "Diretoria PARTIU Brasil",
      });

      setNotificacoes(listarNotificacoesBroadcast());
      setFeedbackSucesso(
        `Notificação transmitida com sucesso para a categoria ${categoria.toUpperCase()}! (~${res.notificação.totalDestinatariosEstimados} dispositivos alcançados)`,
      );

      // Limpar formulário mantendo a categoria
      setTitulo("");
      setMensagem("");

      setTimeout(() => setFeedbackSucesso(null), 5000);
    } catch (err) {
      alert("Erro ao disparar notificação: " + String(err));
    } finally {
      setEnviando(false);
    }
  }

  function handleExcluir(id: string) {
    if (confirm("Tem certeza que deseja excluir esta notificação do histórico?")) {
      excluirNotificacaoBroadcast(id);
      setNotificacoes(listarNotificacoesBroadcast());
    }
  }

  const categoriasConfig = [
    {
      id: "todos" as CategoriaDestinatario,
      titulo: "Todos os Usuários",
      subtitulo: "Geral (Passageiros + Motoristas + Grátis)",
      icone: Users,
      badgeCor: "bg-slate-900 text-white",
      corCard: "hover:border-slate-800",
      alcance: "1.450 dispositivos",
    },
    {
      id: "usuario" as CategoriaDestinatario,
      titulo: "Usuário (Passageiro)",
      subtitulo: "Passageiros comuns e clientes frequentes",
      icone: Smartphone,
      badgeCor: "bg-[#0d5930] text-white",
      corCard: "hover:border-[#0d5930]",
      alcance: "1.100 passageiros",
    },
    {
      id: "gratis" as CategoriaDestinatario,
      titulo: "Grátis (Passe Livre)",
      subtitulo: "Beneficiários de gratuidade legal (PCD/Idoso/Estudante)",
      icone: Sparkles,
      badgeCor: "bg-indigo-700 text-white",
      corCard: "hover:border-indigo-700",
      alcance: "210 beneficiários",
    },
    {
      id: "motorista" as CategoriaDestinatario,
      titulo: "Motoristas & Entregadores",
      subtitulo: "Condutores parceiros (Carro, Moto e Flash)",
      icone: Layers,
      badgeCor: "bg-primary-700 text-white",
      corCard: "hover:border-amber-600",
      alcance: "75 motoristas",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-[#0d5930]">
              <BellRing className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Disparo de Notificações & Push Broadcast
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Envie comunicados em massa segmentados para Usuários, Gratuidade Legal e Motoristas
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/app/admin"
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            ← Painel Admin
          </Link>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
            Total de Disparos
          </span>
          <span className="text-2xl sm:text-3xl font-black text-slate-900">{totalEnvios}</span>
          <span className="text-[11px] text-emerald-600 font-bold block mt-0.5">
            Histórico registrado
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
            Alcance Acumulado
          </span>
          <span className="text-2xl sm:text-3xl font-black text-[#0d5930]">
            {totalAlcance.toLocaleString("pt-BR")}
          </span>
          <span className="text-[11px] text-slate-500 font-bold block mt-0.5">
            Dispositivos engajados
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
            Canais de Entrega
          </span>
          <span className="text-2xl sm:text-3xl font-black text-indigo-700">Web Push</span>
          <span className="text-[11px] text-indigo-600 font-bold block mt-0.5">
            + Banners Flutuantes In-App
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
            Status do Gateway
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-black text-slate-900">Operacional 100%</span>
          </div>
          <span className="text-[11px] text-slate-500 font-bold block mt-0.5">
            Service Worker Ativo
          </span>
        </div>
      </div>

      {feedbackSucesso && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#0d5930] flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{feedbackSucesso}</span>
        </div>
      )}

      {/* 3. CORPO PRINCIPAL: FORMULÁRIO + PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUNA ESQUERDA: COMPOSITOR DE NOTIFICAÇÃO (7 colunas) */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-5">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Send className="h-4.5 w-4.5 text-[#0d5930]" />
            <span>Compor Notificação Segmentada</span>
          </h2>

          <form onSubmit={handleDisparar} className="space-y-4">
            {/* SELEÇÃO DA CATEGORIA DO PÚBLICO */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                1. Selecione o Público-Alvo (Categoria)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {categoriasConfig.map((cat) => {
                  const Icon = cat.icone;
                  const selecionado = categoria === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoria(cat.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                        selecionado
                          ? "border-[#0d5930] bg-emerald-50/50 shadow-2xs ring-2 ring-[#0d5930]/20"
                          : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-[#0d5930]" />
                          {cat.titulo}
                        </span>
                        {selecionado && (
                          <span className="h-4 w-4 rounded-full bg-[#0d5930] text-white flex items-center justify-center text-[10px]">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block leading-tight">
                        {cat.subtitulo}
                      </span>
                      <span className="text-[9px] font-bold text-[#0d5930] mt-1 block">
                        Alcance: {cat.alcance}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SELEÇÃO DO NÍVEL DE URGÊNCIA */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                2. Nível de Urgência & Gravidade
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  {
                    id: "info",
                    label: "Informativo",
                    cor: "border-emerald-300 text-emerald-800 bg-emerald-50",
                  },
                  {
                    id: "alerta",
                    label: "Alerta Trânsito",
                    cor: "border-primary-500 text-amber-800 bg-primary-50",
                  },
                  {
                    id: "urgente",
                    label: "Urgente",
                    cor: "border-rose-300 text-rose-800 bg-rose-50",
                  },
                  {
                    id: "promocao",
                    label: "Promoção",
                    cor: "border-purple-300 text-purple-800 bg-purple-50",
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setUrgencia(item.id as UrgenciaNotificacao)}
                    className={`py-2 px-2 rounded-xl text-xs font-black border text-center transition-all cursor-pointer ${
                      urgencia === item.id
                        ? `${item.cor} ring-2 ring-slate-900/10 shadow-2xs font-black`
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TEMPLATES RÁPIDOS */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Modelos Rápidos (Clique para autopreencher):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATES_NOTIFICACOES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => aplicarTemplate(tmpl)}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer border border-slate-200"
                  >
                    ⚡ {tmpl.rotulo}
                  </button>
                ))}
              </div>
            </div>

            {/* TÍTULO */}
            <div className="space-y-1">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                3. Título da Notificação
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Aviso de Chuva Forte na AL-101 Sul"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-900 outline-none focus:border-[#0d5930] focus:bg-white transition-all"
              />
              <div className="flex justify-end text-[10px] text-slate-400">
                {titulo.length}/60 caracteres
              </div>
            </div>

            {/* MENSAGEM */}
            <div className="space-y-1">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                4. Mensagem Completa
              </label>
              <textarea
                required
                rows={3}
                maxLength={240}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Descreva a mensagem clara e objetiva para os usuários..."
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-medium text-slate-900 outline-none focus:border-[#0d5930] focus:bg-white transition-all resize-none"
              />
              <div className="flex justify-end text-[10px] text-slate-400">
                {mensagem.length}/240 caracteres
              </div>
            </div>

            {/* ROTA DE AÇÃO */}
            <div className="space-y-1">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                5. Ação ao Tocar na Notificação (Rota Interna)
              </label>
              <select
                value={rotaDestino}
                onChange={(e) => setRotaDestino(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-bold text-slate-900 outline-none focus:border-[#0d5930] focus:bg-white transition-all cursor-pointer"
              >
                <option value="/app">/app — Página Inicial do Passageiro</option>
                <option value="/app/linhas">/app/linhas — Consulta de Horários e Linhas</option>
                <option value="/app/bilhetes">/app/bilhetes — Meus Bilhetes & QR Code</option>
                <option value="/app/beneficios">/app/beneficios — Passe Livre & Gratuidade</option>
                <option value="/app/motorista">
                  /app/motorista — Cockpit Operacional do Motorista
                </option>
                <option value="/app/viagem">/app/viagem — Monitoramento do Radar ao Vivo</option>
              </select>
            </div>

            {/* BOTÃO DE TRANSMISSÃO */}
            <button
              type="submit"
              disabled={enviando}
              className="w-full min-h-[48px] h-12 rounded-2xl bg-[#0d5930] hover:bg-[#147a44] text-white text-sm sm:text-base font-black shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Send className="h-5 w-5" />
              <span>
                {enviando
                  ? "Transmitindo Notificação..."
                  : `Disparar para Categoria ${categoria.toUpperCase()}`}
              </span>
            </button>
          </form>
        </div>

        {/* COLUNA DIREITA: SIMULADOR DE TELA MOBILE LOCKSCREEN (5 colunas) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-white shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                <Smartphone className="h-4 w-4" />
                <span>Simulação em Smartphone (Tela de Bloqueio)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">12:30</span>
            </div>

            {/* CARD MOCK DA NOTIFICAÇÃO PUSH */}
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <div className="h-4 w-4 rounded-md bg-[#0088FF] flex items-center justify-center font-black text-slate-950 text-[9px]">
                    P
                  </div>
                  <span className="font-black text-white">PARTIU Notificações</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary-600/20 text-primary-500 font-bold uppercase">
                    {categoria}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">agora</span>
              </div>

              <div>
                <h4 className="text-sm font-black text-white leading-tight">
                  {titulo || "Título da notificação aparecerá aqui"}
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {mensagem ||
                    "O conteúdo descritivo completo da notificação enviada para a categoria selecionada será visualizado desta forma pelo usuário no celular."}
                </p>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                <span>Toque para abrir: {rotaDestino}</span>
                <ChevronRight className="h-3 w-3 text-emerald-400" />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              🔔 O alerta aciona som nativo, vibração e banner persistente no Android e iOS mesmo
              com o app em segundo plano.
            </p>
          </div>
        </div>
      </div>

      {/* 4. HISTÓRICO DE NOTIFICAÇÕES ENVIADAS */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Clock className="h-4.5 w-4.5 text-slate-600" />
            <span>Histórico de Transmissões Recentes</span>
          </h3>
          <span className="text-xs text-slate-500 font-bold">
            {notificacoes.length} comunicados registrados
          </span>
        </div>

        {notificacoes.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            Nenhuma notificação transmitida até o momento.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {notificacoes.map((item) => (
              <div
                key={item.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                        item.categoria === "motorista"
                          ? "bg-primary-50 text-amber-800"
                          : item.categoria === "gratis"
                            ? "bg-indigo-100 text-indigo-800"
                            : item.categoria === "usuario"
                              ? "bg-emerald-100 text-[#0d5930]"
                              : "bg-slate-200 text-slate-800"
                      }`}
                    >
                      Público: {item.categoria.toUpperCase()}
                    </span>
                    <span className="text-xs font-black text-slate-900">{item.titulo}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                    {item.mensagem}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <span>Enviado em: {new Date(item.criadoEm).toLocaleString("pt-BR")}</span>
                    <span>•</span>
                    <span>Destino: {item.rotaDestino || "/app"}</span>
                    <span>•</span>
                    <span>Alcance: ~{item.totalDestinatariosEstimados} dispositivos</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoria(item.categoria);
                      setUrgencia(item.urgencia);
                      setTitulo(item.titulo);
                      setMensagem(item.mensagem);
                      if (item.rotaDestino) setRotaDestino(item.rotaDestino);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    title="Reutilizar dados no formulário"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExcluir(item.id)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-colors cursor-pointer"
                    title="Excluir do histórico"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
