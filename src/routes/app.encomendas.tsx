import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Box,
  CheckCircle2,
  FileText,
  HelpCircle,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import {
  encomendasMock,
  getEncomendasStore,
  salvarNovaEncomendaStore,
  type EncomendaVan,
} from "@/lib/admin-data";
import { KeyRound, Lock, Copy, Check } from "lucide-react";

export const Route = createFileRoute("/app/encomendas")({
  head: () => ({
    meta: [
      { title: "Envio de Encomendas por Van | UniVans" },
      {
        name: "description",
        content:
          "Despache caixas, pacotes e documentos intermunicipais com confirmação de entrega segura via PIN de 4 dígitos.",
      },
    ],
  }),
  component: EncomendasPage,
});

export function EncomendasPage() {
  const [encomendas, setEncomendas] = useState<EncomendaVan[]>(() => getEncomendasStore());
  const [aba, setAba] = useState<"novo" | "rastrear">("novo");
  const [codigoBusca, setCodigoBusca] = useState("");
  const [pinCopiado, setPinCopiado] = useState(false);

  // Formulário de Nova Encomenda
  const [remetenteNome, setRemetenteNome] = useState("");
  const [remetenteTelefone, setRemetenteTelefone] = useState("");
  const [destinatarioNome, setDestinatarioNome] = useState("");
  const [destinatarioTelefone, setDestinatarioTelefone] = useState("");
  const [origem, setOrigem] = useState("Maceió");
  const [destino, setDestino] = useState("Arapiraca");
  const [tipo, setTipo] = useState<"envelope" | "pacote_pequeno" | "caixa_media" | "caixa_grande">(
    "pacote_pequeno",
  );
  const [descricao, setDescricao] = useState("");
  const [encomendaCriada, setEncomendaCriada] = useState<EncomendaVan | null>(null);

  const precosTipo = {
    envelope: 15.0,
    pacote_pequeno: 25.0,
    caixa_media: 40.0,
    caixa_grande: 65.0,
  };

  const valorFrete = precosTipo[tipo];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const codigo = `VF-${Math.floor(1000 + Math.random() * 9000)}-${origem.slice(0, 2).toUpperCase()}`;
    // Geração de PIN de 4 dígitos (ex: 8492) estilo 99 / Uber Entrega
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    const nova: EncomendaVan = {
      id: `enc-${Date.now()}`,
      codigoRastreio: codigo,
      pinEntrega: pin,
      remetenteNome,
      remetenteTelefone,
      destinatarioNome,
      destinatarioTelefone,
      origem,
      destino,
      tipo,
      descricao,
      valorFrete,
      status: "aguardando_coleta",
      dataEnvio: "Hoje, agora",
      motoristaNome: "Próxima Van em Escala",
      vanPlaca: "A confirmar",
    };

    const atualizadas = salvarNovaEncomendaStore(nova);
    setEncomendas(atualizadas);
    setEncomendaCriada(nova);
  }

  function copiarPin(pin: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(pin);
      setPinCopiado(true);
      setTimeout(() => setPinCopiado(false), 2500);
    }
  }

  function gerarLinkWhatsapp(enc: EncomendaVan) {
    const texto = encodeURIComponent(
      `📦 *UNIVANS EXPRESS — SUA ENCOMENDA FOI DESPACHADA!*\n\n` +
        `Olá *${enc.destinatarioNome}*! Uma encomenda (${enc.descricao}) foi despachada para você de *${enc.origem}* com destino a *${enc.destino}*.\n\n` +
        `🔍 *Código de Rastreio:* ${enc.codigoRastreio}\n` +
        `🔐 *SEU PIN DE RETIRADA:* *${enc.pinEntrega}*\n\n` +
        `⚠️ *IMPORTANTE:* O motorista da van no terminal *só entregará o pacote* após você informar este PIN *${enc.pinEntrega}* a ele. Guarde este código!`,
    );
    return `https://wa.me/?text=${texto}`;
  }

  const encomendasFiltradas = codigoBusca
    ? encomendas.filter((e) => e.codigoRastreio.toLowerCase().includes(codigoBusca.toLowerCase()))
    : encomendas;

  return (
    <div className="px-3 sm:px-4 pt-3 pb-28 w-full max-w-full mx-auto">
      {/* 1. Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/app"
          className="flex min-h-[40px] min-w-[40px] h-10 w-10 items-center justify-center rounded-xl bg-card p-2 text-foreground shadow-sm hover:bg-accent active:scale-95 transition-all cursor-pointer"
          aria-label="Voltar para o Início"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#0d5930] uppercase">
            <Package className="h-3.5 w-3.5" /> Encomendas Expressas
          </span>
          <h1 className="text-xl font-black tracking-tight text-foreground">
            Despacho de Encomendas
          </h1>
        </div>
      </div>

      {/* 2. Alternância de Abas */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setAba("novo");
            setEncomendaCriada(null);
          }}
          className={`rounded-2xl p-2.5 text-center text-xs font-extrabold transition-all ${
            aba === "novo"
              ? "bg-[#0d5930] text-white shadow-md"
              : "bg-card text-muted-foreground border border-border/40 hover:bg-accent"
          }`}
        >
          📦 Enviar Encomenda
        </button>

        <button
          type="button"
          onClick={() => setAba("rastrear")}
          className={`rounded-2xl p-2.5 text-center text-xs font-extrabold transition-all ${
            aba === "rastrear"
              ? "bg-[#0d5930] text-white shadow-md"
              : "bg-card text-muted-foreground border border-border/40 hover:bg-accent"
          }`}
        >
          🔍 Rastrear ({encomendas.length})
        </button>
      </div>

      {/* 3. Formulário de Novo Envio */}
      {aba === "novo" && !encomendaCriada && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-4 rounded-3xl bg-card p-5 shadow-lg border border-border/40 animate-in fade-in duration-200"
        >
          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
              Tamanho do Pacote:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "envelope", label: "📄 Documento / Envelope", preco: "R$ 15,00" },
                { id: "pacote_pequeno", label: "📦 Pacote Pequeno (até 5kg)", preco: "R$ 25,00" },
                { id: "caixa_media", label: "📦 Caixa Média (até 15kg)", preco: "R$ 40,00" },
                { id: "caixa_grande", label: "🧳 Volume Grande (até 30kg)", preco: "R$ 65,00" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setTipo(
                      item.id as "envelope" | "pacote_pequeno" | "caixa_media" | "caixa_grande",
                    )
                  }
                  className={`rounded-2xl p-3 text-left text-xs font-bold transition-all ${
                    tipo === item.id
                      ? "bg-[#0d5930] text-white shadow-md"
                      : "bg-accent/50 text-foreground border border-border/40 hover:bg-accent"
                  }`}
                >
                  <p className="leading-tight">{item.label}</p>
                  <p className="mt-1 text-[11px] font-black opacity-90">{item.preco}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Origem e Destino */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Cidade de Envio *
              </label>
              <input
                required
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
                placeholder="Ex: Maceió"
                className="w-full rounded-2xl bg-accent/50 px-3 py-2.5 text-xs text-foreground outline-none border border-border/40"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Cidade de Entrega *
              </label>
              <input
                required
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder="Ex: Arapiraca"
                className="w-full rounded-2xl bg-accent/50 px-3 py-2.5 text-xs text-foreground outline-none border border-border/40"
              />
            </div>
          </div>

          {/* Dados do Remetente */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Nome do Remetente *
              </label>
              <input
                required
                value={remetenteNome}
                onChange={(e) => setRemetenteNome(e.target.value)}
                placeholder="Quem está enviando"
                className="w-full rounded-2xl bg-accent/50 px-3 py-2.5 text-xs text-foreground outline-none border border-border/40"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                WhatsApp Remetente *
              </label>
              <input
                required
                type="tel"
                value={remetenteTelefone}
                onChange={(e) => setRemetenteTelefone(e.target.value)}
                placeholder="(82) 99999-0000"
                className="w-full rounded-2xl bg-accent/50 px-3 py-2.5 text-xs text-foreground outline-none border border-border/40"
              />
            </div>
          </div>

          {/* Dados do Destinatário */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Nome do Destinatário *
              </label>
              <input
                required
                value={destinatarioNome}
                onChange={(e) => setDestinatarioNome(e.target.value)}
                placeholder="Quem vai retirar"
                className="w-full rounded-2xl bg-accent/50 px-3 py-2.5 text-xs text-foreground outline-none border border-border/40"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                WhatsApp Destinatário *
              </label>
              <input
                required
                type="tel"
                value={destinatarioTelefone}
                onChange={(e) => setDestinatarioTelefone(e.target.value)}
                placeholder="(82) 99999-0000"
                className="w-full rounded-2xl bg-accent/50 px-3 py-2.5 text-xs text-foreground outline-none border border-border/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Descrição dos Itens / Conteúdo
            </label>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Documentos em envelope, peças, roupas..."
              className="w-full rounded-2xl bg-accent/50 px-3 py-2.5 text-xs text-foreground outline-none border border-border/40"
            />
          </div>

          {/* Resumo do Valor */}
          <div className="flex items-center justify-between rounded-2xl bg-accent/50 p-3 border border-border/30">
            <div>
              <p className="text-xs font-bold text-foreground">Valor do Frete Expresso:</p>
              <p className="text-[10px] text-muted-foreground">
                Entrega no mesmo dia no terminal de destino
              </p>
            </div>
            <span className="text-base font-black text-[#0d5930]">
              R$ {valorFrete.toFixed(2).replace(".", ",")}
            </span>
          </div>

          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0d5930] text-xs font-black text-white shadow-lg hover:brightness-105 active:scale-[0.99]"
          >
            <CheckCircle2 className="h-4 w-4" /> Gerar Despacho de Encomenda
          </button>
        </form>
      )}

      {/* 4. Sucesso ao Criar Encomenda */}
      {aba === "novo" && encomendaCriada && (
        <div className="mt-4 rounded-3xl bg-card p-6 text-center shadow-xl border border-border/40 space-y-4 animate-in zoom-in-95">
          <div className="mx-auto flex h-11 sm:h-12 w-14 items-center justify-center rounded-full bg-[#0d5930]/10 text-[#0d5930]">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-black text-[#0d5930]">
              {encomendaCriada.codigoRastreio}
            </span>
            <h2 className="text-xl font-black text-foreground mt-2">Despacho Registrado!</h2>
            <p className="text-xs text-muted-foreground mt-1">
              De <span className="font-bold text-foreground">{encomendaCriada.origem}</span> para{" "}
              <span className="font-bold text-foreground">{encomendaCriada.destino}</span>
            </p>
          </div>

          {/* 🔒 BLOCO DE PIN DE SEGURANÇA ESTILO 99 (CONFIRMAÇÃO DE ENTREGA) */}
          <div className="rounded-3xl bg-gradient-to-br from-amber-500/15 via-amber-400/10 to-transparent border-2 border-amber-400/70 p-4 sm:p-5 text-center space-y-2 shadow-sm">
            <div className="flex items-center justify-center gap-1.5 text-amber-800 text-[11px] font-black uppercase tracking-wider">
              <KeyRound className="h-4 w-4 text-amber-600 animate-pulse" />
              <span>PIN de Confirmação de Entrega (Estilo 99)</span>
            </div>

            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              Repasse este código para quem for retirar no terminal. O motorista{" "}
              <strong>só liberará a encomenda</strong> mediante a digitação deste PIN:
            </p>

            {/* DÍGITOS GIGANTES DO PIN */}
            <div className="flex items-center justify-center gap-2 py-2">
              {encomendaCriada.pinEntrega.split("").map((digito, idx) => (
                <span
                  key={idx}
                  className="h-13 w-11 sm:h-14 sm:w-12 rounded-2xl bg-white border-2 border-amber-400 text-slate-950 font-mono text-2xl sm:text-3xl font-black flex items-center justify-center shadow-md ring-2 ring-amber-200"
                >
                  {digito}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => copiarPin(encomendaCriada.pinEntrega)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100/80 hover:bg-amber-200 text-amber-950 text-xs font-black transition-all active:scale-95 border border-amber-300"
            >
              {pinCopiado ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>PIN Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-amber-700" />
                  <span>Copiar PIN ({encomendaCriada.pinEntrega})</span>
                </>
              )}
            </button>
          </div>

          <div className="rounded-2xl bg-accent/40 p-4 text-xs text-left space-y-1 text-muted-foreground">
            <p>
              <span className="font-bold text-foreground">Destinatário:</span>{" "}
              {encomendaCriada.destinatarioNome} ({encomendaCriada.destinatarioTelefone})
            </p>
            <p>
              <span className="font-bold text-foreground">Valor do Frete:</span> R${" "}
              {encomendaCriada.valorFrete.toFixed(2).replace(".", ",")}
            </p>
            <p>
              <span className="font-bold text-foreground">Segurança:</span> Liberação exclusiva
              mediante conferência do PIN no terminal.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <a
              href={gerarLinkWhatsapp(encomendaCriada)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] text-xs font-black text-white shadow-md"
            >
              <MessageCircle className="h-4 w-4 fill-white" /> Enviar no WhatsApp da Van
            </a>

            <button
              type="button"
              onClick={() => setAba("rastrear")}
              className="flex h-12 flex-1 items-center justify-center rounded-full bg-card text-xs font-bold text-foreground border border-border/50 hover:bg-accent"
            >
              Ver Minhas Encomendas
            </button>
          </div>
        </div>
      )}

      {/* 5. Aba de Rastreamento */}
      {aba === "rastrear" && (
        <div className="mt-4 space-y-4 animate-in fade-in duration-200">
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
            <input
              value={codigoBusca}
              onChange={(e) => setCodigoBusca(e.target.value)}
              placeholder="Digite o código (ex: VF-8942-AL)..."
              className="w-full rounded-2xl bg-card pl-10 pr-4 py-3 text-xs text-foreground outline-none border border-border/40 shadow-sm"
            />
          </div>

          <div className="space-y-3">
            {encomendasFiltradas.map((enc) => (
              <div
                key={enc.id}
                className="rounded-3xl bg-card p-5 shadow-lg border border-border/40 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-black text-xs text-[#0d5930]">{enc.codigoRastreio}</span>
                    <p className="text-sm font-extrabold text-foreground mt-0.5">
                      {enc.origem} → {enc.destino}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{enc.descricao}</p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                      enc.status === "em_transito"
                        ? "bg-[#e5a93c]/20 text-[#e5a93c]"
                        : "bg-emerald-500/15 text-emerald-700"
                    }`}
                  >
                    ● {enc.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="rounded-2xl bg-accent/40 p-3 text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between pb-1 border-b border-border/40">
                    <span className="font-bold text-foreground">Destinatário:</span>
                    <span className="text-muted-foreground">
                      {enc.destinatarioNome} ({enc.destinatarioTelefone})
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-1 border-b border-border/40">
                    <span className="font-bold text-foreground">Van / Motorista:</span>
                    <span className="text-muted-foreground">
                      {enc.motoristaNome} ({enc.vanPlaca})
                    </span>
                  </div>

                  {/* PIN DE ENTREGA EM DESTAQUE NO RASTREIO */}
                  <div className="flex items-center justify-between pt-0.5">
                    <div className="flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-amber-600" />
                      <span className="font-bold text-foreground">PIN de Entrega:</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-950 font-mono font-black text-xs border border-amber-300">
                        {enc.pinEntrega}
                      </span>
                      <button
                        type="button"
                        onClick={() => copiarPin(enc.pinEntrega)}
                        className="p-1 rounded-md bg-accent hover:bg-accent/80 text-foreground transition-all"
                        title="Copiar PIN"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {enc.status === "entregue_no_terminal" && (
                    <div className="pt-1 text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>
                        Entregue mediante conferência de PIN ({enc.dataEntrega || "Hoje"})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
