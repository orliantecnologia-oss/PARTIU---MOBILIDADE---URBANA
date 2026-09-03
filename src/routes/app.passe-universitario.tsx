import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  GraduationCap,
  MapPin,
  QrCode,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { RealQrCodePix } from "@/components/passagens/RealQrCodePix";

export const Route = createFileRoute("/app/passe-universitario")({
  head: () => ({
    meta: [
      { title: "Passe Universitário & Cartela Recorrente | UniVans" },
      {
        name: "description",
        content:
          "Economize até 20% com o Passe Universitário UniVans. Assento reservado de segunda a sexta para UFAL, IFAL, UNIT e faculdades.",
      },
    ],
  }),
  component: PasseUniversitarioPage,
});

const UNIVERSIDADES = [
  { id: "ufal_mcz", nome: "UFAL — Campus A. C. Simões (Maceió)", polo: "Maceió" },
  { id: "ufal_arp", nome: "UFAL — Campus Arapiraca", polo: "Arapiraca" },
  { id: "ifal_mcz", nome: "IFAL — Campus Maceió", polo: "Maceió" },
  { id: "unit_mcz", nome: "UNIT — Cruz das Almas", polo: "Maceió" },
  { id: "uneal_arp", nome: "UNEAL — Campus Arapiraca", polo: "Arapiraca" },
];

const PACOTES = [
  {
    id: "quinzenal",
    titulo: "Passe 10 Viagens",
    subtitulo: "Ideal para 2 a 3 dias na semana",
    viagens: 10,
    descontoPercent: 10,
    valorPorViagem: 31.5,
    valorTotal: 315.0,
    badge: "10% OFF",
    destaque: false,
  },
  {
    id: "mensal_padrao",
    titulo: "Passe Mensal 20 Viagens",
    subtitulo: "Segunda a Sexta (1 viagem/dia)",
    viagens: 20,
    descontoPercent: 15,
    valorPorViagem: 29.75,
    valorTotal: 595.0,
    badge: "MAIS POPULAR • 15% OFF",
    destaque: true,
  },
  {
    id: "mensal_completo",
    titulo: "Passe Integral 40 Viagens",
    subtitulo: "Ida e Volta Diária (20 dias)",
    viagens: 40,
    descontoPercent: 20,
    valorPorViagem: 28.0,
    valorTotal: 1120.0,
    badge: "ECONOMIA MÁXIMA • 20% OFF",
    destaque: false,
  },
];

export function PasseUniversitarioPage() {
  const [univSelecionada, setUnivSelecionada] = useState(UNIVERSIDADES[0]!.id);
  const [origem, setOrigem] = useState("Tapera");
  const [pacoteSelecionadoId, setPacoteSelecionadoId] = useState("mensal_padrao");
  const [etapa, setEtapa] = useState<"escolha" | "checkout" | "confirmado">("escolha");
  const [nomeEstudante, setNomeEstudante] = useState("");
  const [matricula, setMatricula] = useState("");

  const pacote = PACOTES.find((p) => p.id === pacoteSelecionadoId) || PACOTES[1]!;
  const universidade = UNIVERSIDADES.find((u) => u.id === univSelecionada) || UNIVERSIDADES[0]!;

  const chavePixSimulada = `00020126580014br.gov.bcb.pix0136univans-passe-${pacote.id}-${Date.now()}5204000053039865802BR5925UNIVANS ALAGOAS6009MACEIO62070503***6304`;

  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-900 pb-16">
      {/* 1. Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-2 sm:px-4 py-2.5 border-b border-slate-200/80 shadow-2xs">
        <div className="w-full max-w-full sm:max-w-2xl mx-auto flex items-center justify-between">
          <Link
            to="/app"
            className="flex h-9 w-9 items-center justify-center rounded-lg sm:rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="text-center">
            <h1 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5 justify-center">
              <GraduationCap className="h-4 w-4 text-[#0d5930]" />
              <span>Passe Universitário</span>
            </h1>
            <span className="text-[10px] text-emerald-700 font-bold">
              Desconto & Assento Garantido
            </span>
          </div>
          <Link
            to="/app/bilhetes"
            className="flex h-9 w-9 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-50 text-[#0d5930] border border-emerald-200 hover:bg-emerald-100 active:scale-95 transition-all"
            title="Minha Carteira"
          >
            <Wallet className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* 2. Conteúdo */}
      <main className="w-full max-w-full sm:max-w-2xl mx-auto p-1.5 sm:px-4 py-2 space-y-3">
        {/* Banner de Apresentação */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0b2046] via-[#0d5930] to-[#08182b] text-white shadow-sm border border-emerald-500/20 space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-0.5 text-[10px] font-black uppercase text-amber-300 border border-amber-400/30">
            <Sparkles className="h-3 w-3" />
            <span>Tarifa Social Estudantil Cooperativa</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight">
            Viaje com conforto, Wi-Fi Starlink e até 20% de economia
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            Garanta sua poltrona com ar-condicionado VIP nos horários de ida e volta da sua
            faculdade sem depender de dinheiro vivo.
          </p>
        </div>

        {etapa === "escolha" && (
          <div className="space-y-4 animate-in fade-in">
            {/* Seletor de Faculdade */}
            <div className="space-y-1.5 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600 block">
                1. Selecione sua Instituição de Ensino
              </label>
              <div className="space-y-1.5">
                {UNIVERSIDADES.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setUnivSelecionada(u.id)}
                    className={`w-full p-3 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                      univSelecionada === u.id
                        ? "bg-emerald-50 border-[#0d5930] text-[#0d5930] shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 shrink-0 text-emerald-700" />
                      <span>{u.nome}</span>
                    </div>
                    {univSelecionada === u.id && (
                      <CheckCircle2 className="h-4 w-4 text-[#0d5930] shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Seletor de Pacotes de Viagem */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600 block px-1">
                2. Escolha o Pacote de Créditos
              </label>

              <div className="space-y-2.5">
                {PACOTES.map((p) => {
                  const isSel = pacoteSelecionadoId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setPacoteSelecionadoId(p.id)}
                      className={`p-4 rounded-3xl border transition-all cursor-pointer space-y-2 ${
                        isSel
                          ? "bg-white border-2 border-[#0d5930] shadow-md ring-2 ring-emerald-500/20"
                          : "bg-white border-slate-200 shadow-xs hover:border-emerald-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-block ${
                              p.destaque
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : "bg-emerald-50 text-emerald-800"
                            }`}
                          >
                            {p.badge}
                          </span>
                          <h3 className="text-sm font-black text-slate-900 mt-1">{p.titulo}</h3>
                          <p className="text-[11px] text-slate-500 font-medium">{p.subtitulo}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">
                            Total
                          </span>
                          <strong className="text-base sm:text-lg font-black text-[#0d5930] block">
                            R$ {p.valorTotal.toFixed(2).replace(".", ",")}
                          </strong>
                          <span className="text-[10px] text-slate-500 font-medium">
                            R$ {p.valorPorViagem.toFixed(2).replace(".", ",")}/viagem
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEtapa("checkout")}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#0d5930] to-[#147a44] text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-950/20 active:scale-95 transition-all flex items-center justify-center gap-2 hover:brightness-105"
            >
              <span>Avançar para Ativação do Passe</span>
              <ChevronRight className="h-4 w-4 text-amber-300" />
            </button>
          </div>
        )}

        {etapa === "checkout" && (
          <div className="space-y-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#0d5930]">
                Confirmação de Dados Estudantis
              </span>
              <h3 className="text-sm font-black text-slate-900 mt-0.5">
                {pacote.titulo} • {universidade.nome}
              </h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Nome Completo do Estudante
                </label>
                <input
                  type="text"
                  placeholder="Ex: Mariana Albuquerque Santos"
                  value={nomeEstudante}
                  onChange={(e) => setNomeEstudante(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#0d5930] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Matrícula ou Curso</label>
                <input
                  type="text"
                  placeholder="Ex: Medicina / Direito (2026.1)"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#0d5930] focus:outline-none"
                />
              </div>

              {/* Pagamento PIX Instantâneo */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3 mt-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full inline-block">
                  Ativação Instantânea por PIX
                </span>
                <div className="bg-white p-3 rounded-2xl border border-slate-200 max-w-[170px] mx-auto shadow-2xs">
                  <RealQrCodePix textoChave={chavePixSimulada} tamanho={150} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">
                    Valor com Desconto
                  </span>
                  <strong className="text-lg font-black text-[#0d5930]">
                    R$ {pacote.valorTotal.toFixed(2).replace(".", ",")}
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEtapa("escolha")}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-black hover:bg-slate-200"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={() => setEtapa("confirmado")}
                className="flex-2 py-3 rounded-xl bg-[#0d5930] text-white text-xs font-black shadow-xs hover:bg-[#147a44] transition-all"
              >
                Simular Pagamento & Ativar
              </button>
            </div>
          </div>
        )}

        {etapa === "confirmado" && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm animate-in zoom-in-95">
            <div className="h-14 w-14 rounded-2xl bg-emerald-100 text-[#0d5930] flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">
                Passe Universitário Ativado com Sucesso!
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Seus {pacote.viagens} créditos de viagem foram adicionados à sua carteira digital.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 text-white text-left space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-amber-300 font-black uppercase text-[10px]">
                  Carteira Estudantil Digital
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  {pacote.viagens} Créditos
                </span>
              </div>
              <div>
                <strong className="block text-white font-black">
                  {nomeEstudante || "Estudante UniVans"}
                </strong>
                <span className="text-[10px] text-slate-300">{universidade.nome}</span>
              </div>
            </div>

            <Link
              to="/app/bilhetes"
              className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-[#0d5930] text-white text-xs font-black shadow-md hover:brightness-105 transition-all"
            >
              Ver Minha Carteira & Bilhetes
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
