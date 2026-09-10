import { useState } from "react";
import { ArrowLeft, MapPin, Pencil, BookUser, Check, Phone, Sparkles, Building } from "lucide-react";
import { useBrandTheme } from "@/hooks/useBrandTheme";

export interface DestinatarioInfo {
  endereco: string;
  detalhes: string;
  nome: string;
  telefone: string;
}

interface DestinatarioModalProps {
  aberto: boolean;
  onFechar: () => void;
  onConfirmar: (info: DestinatarioInfo) => void;
  infoInicial?: Partial<DestinatarioInfo> | undefined;
}

interface EnderecoRecenteItem {
  id: string;
  endereco: string;
  nome: string;
  telefone: string;
  detalhes?: string;
}

const ENDERECOS_RECENTES_MOCK: EnderecoRecenteItem[] = [
  {
    id: "rec-1",
    endereco: "Rua José da Silva Almeida , 45",
    nome: "Rodrigo",
    telefone: "22996051620",
    detalhes: "Casa térrea com portão branco",
  },
  {
    id: "rec-2",
    endereco: "Rua Dez de Maio, 188 - Em cima da Loja Camila Amorim colords",
    nome: "Miriam Barbosa",
    telefone: "22988615039",
    detalhes: "Interfone 102",
  },
  {
    id: "rec-3",
    endereco: "Rua Amadeu Tinoco Lacerda, 492 - Em frente a igreja Mar vermelho da Pastora...",
    nome: "Rosilda",
    telefone: "22998071960",
    detalhes: "Portão lateral de ferro",
  },
  {
    id: "rec-4",
    endereco: "Rua Jose Raimundo De Oliveira, 287 - Em frente açaí...",
    nome: "Érica Carvalho Ferreira",
    telefone: "22998071960",
    detalhes: "Casa dos fundos",
  },
];

export function DestinatarioModal({
  aberto,
  onFechar,
  onConfirmar,
  infoInicial,
}: DestinatarioModalProps) {
  const { corPrimaria, corTextoPrimaria } = useBrandTheme();
  const [endereco, setEndereco] = useState(infoInicial?.endereco || "");
  const [detalhes, setDetalhes] = useState(infoInicial?.detalhes || "");
  const [nome, setNome] = useState(infoInicial?.nome || "");
  const [telefone, setTelefone] = useState(infoInicial?.telefone || "");

  if (!aberto) return null;

  function formatarTelefone(valor: string) {
    const limpo = valor.replace(/\D/g, "").slice(0, 11);
    if (limpo.length <= 2) return limpo;
    if (limpo.length <= 7) return `(${limpo.slice(0, 2)}) ${limpo.slice(2)}`;
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7, 11)}`;
  }

  const [recenteAtivoId, setRecenteAtivoId] = useState<string | null>(null);

  function getIniciais(texto: string): string {
    const partes = (texto || "").trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return "EN";
    const primeiro = partes[0] ?? "";
    if (partes.length === 1) return primeiro.slice(0, 2).toUpperCase();
    const ultimo = partes[partes.length - 1] ?? "";
    const ini1 = primeiro.charAt(0);
    const ini2 = ultimo.charAt(0);
    return (ini1 + ini2).toUpperCase() || "EN";
  }

  function handleSelecionarRecente(item: EnderecoRecenteItem) {
    setEndereco(item.endereco);
    setNome(item.nome);
    setTelefone(formatarTelefone(item.telefone));
    setDetalhes(item.detalhes || "");
    setRecenteAtivoId(item.id);
  }

  const formularioValido = endereco.trim().length > 0 && nome.trim().length > 0;

  function handleSalvar() {
    if (!formularioValido) return;
    onConfirmar({
      endereco,
      detalhes,
      nome,
      telefone: telefone || "Não informado",
    });
    onFechar();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-hide-bottom-nav="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-center items-end sm:items-center animate-in fade-in duration-200"
    >
      <div className="w-full max-w-[430px] h-[92vh] sm:h-[85vh] bg-white rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Topo / Header da Tela (Fiel ao print 4) */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-white sticky top-0 z-10">
          <button
            type="button"
            onClick={onFechar}
            className="p-1 -ml-1 text-slate-900 hover:bg-slate-100 rounded-full transition cursor-pointer"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Informações do destinatário
          </h1>
        </div>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          
          {/* Campo 1: Endereço* */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Endereço<span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Selecionar endereço de entrega"
                className="w-full text-sm font-medium text-slate-900 placeholder:text-slate-400 py-2.5 border-b border-slate-200 focus:border-[#FDD835] focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => {
                  if (!endereco) setEndereco("Rua Amadeu Tinoco Lacerda, 492");
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ›
              </button>
            </div>
          </div>

          {/* Campo 2: Detalhes do endereço */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Detalhes do endereço
            </label>
            <input
              type="text"
              value={detalhes}
              onChange={(e) => setDetalhes(e.target.value)}
              placeholder="Ex.: bloco A, apartamento 201"
              className="w-full text-sm font-medium text-slate-900 placeholder:text-slate-400 py-2.5 border-b border-slate-200 focus:border-[#FDD835] focus:outline-none transition"
            />
          </div>

          {/* Campo 3: Nome para contato* */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Nome para contato<span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite o nome do destinatário"
                className="w-full text-sm font-medium text-slate-900 placeholder:text-slate-400 py-2.5 pr-8 border-b border-slate-200 focus:border-[#FDD835] focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setNome("Rodrigo")}
                className="absolute right-0 text-slate-600 hover:text-slate-900 cursor-pointer"
                title="Agenda de Contatos"
              >
                <BookUser className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Campo 4: Número de telefone* */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Número de telefone<span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2 border-b border-slate-200 py-2 focus-within:border-[#FDD835] transition">
              <div className="flex items-center gap-1 text-sm font-bold text-slate-800 shrink-0">
                <span className="text-base">🇧🇷</span>
                <span>+55</span>
                <span className="text-[10px] text-slate-500">▾</span>
              </div>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                placeholder="Telefone do destinatário"
                className="w-full text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Botão Confirmar (Largura total, idêntico ao print 4) */}
          <div className="pt-2">
            <button
              type="button"
              disabled={!formularioValido}
              onClick={handleSalvar}
              style={{
                backgroundColor: formularioValido ? corPrimaria : undefined,
                color: formularioValido ? corTextoPrimaria : undefined,
              }}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide transition shadow-sm cursor-pointer ${
                formularioValido
                  ? "hover:opacity-90 active:scale-[0.99]"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              Confirmar
            </button>
          </div>

          {/* Seção: Endereços recentes (1 Toque) — Sem corte de informações e com contador */}
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                </div>
                <h2 className="text-xs font-black text-slate-900 tracking-tight">
                  Endereços recentes (1 Toque)
                </h2>
              </div>
              <span className="text-[10px] font-extrabold bg-amber-50 text-amber-900 border border-amber-200/80 px-2 py-0.5 rounded-full">
                {ENDERECOS_RECENTES_MOCK.length} contatos
              </span>
            </div>

            <div className="space-y-2">
              {ENDERECOS_RECENTES_MOCK.map((item) => {
                const isSelecionado =
                  recenteAtivoId === item.id || (endereco === item.endereco && nome === item.nome);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelecionarRecente(item)}
                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-2 active:scale-[0.99] ${
                      isSelecionado
                        ? "border-amber-400 bg-amber-50/70 shadow-sm ring-2 ring-amber-400/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 shadow-xs"
                    }`}
                  >
                    {/* Linha superior: Avatar, Nome e Telefone formatado + Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-300 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {getIniciais(item.nome)}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-black text-slate-900 block truncate leading-tight">
                            {item.nome}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 font-bold block leading-none mt-0.5">
                            {formatarTelefone(item.telefone)}
                          </span>
                        </div>
                      </div>

                      {isSelecionado ? (
                        <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                          <Check className="w-2.5 h-2.5 text-emerald-700 stroke-[3]" />
                          Preenchido
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded-md shrink-0">
                          1 Toque
                        </span>
                      )}
                    </div>

                    {/* Endereço Completo Legível (sem truncate agressivo) */}
                    <div className="flex items-start gap-1.5 text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-slate-800 leading-snug">
                        {item.endereco}
                      </p>
                    </div>

                    {/* Complemento / Detalhes */}
                    {item.detalhes && (
                      <div className="pt-1.5 border-t border-slate-100/80 flex items-center gap-1.5 text-[10px] text-slate-600 bg-slate-50/80 px-2 py-1 rounded-lg">
                        <Building className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-medium">{item.detalhes}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
