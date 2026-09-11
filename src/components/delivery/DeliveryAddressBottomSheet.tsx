import React, { useState, useEffect } from "react";
import {
  X,
  MapPin,
  User,
  Phone,
  Clock,
  Check,
  Building,
  Sparkles,
  ArrowRight,
  Search,
} from "lucide-react";
import { useDelivery } from "@/contexts/DeliveryContext";
import { type DeliveryAddressInfo } from "@/lib/delivery/delivery-dual-pin-machine";
import { useBrandTheme } from "@/hooks/useBrandTheme";

interface EnderecoRecenteItem {
  id: string;
  endereco: string;
  complemento: string;
  nome: string;
  telefone: string;
}

const ENDERECOS_RECENTES: EnderecoRecenteItem[] = [
  {
    id: "rec-1",
    endereco: "Rua Dez de Maio, 188 - Centro",
    complemento: "Em cima da Loja Camila Amorim",
    nome: "Miriam Barbosa",
    telefone: "(22) 98861-5039",
  },
  {
    id: "rec-2",
    endereco: "Rua Amadeu Tinoco Lacerda, 492 - Aeroporto",
    complemento: "Casa térrea com portão branco",
    nome: "Rosilda Gomes",
    telefone: "(22) 99807-1960",
  },
  {
    id: "rec-3",
    endereco: "Rua José Raimundo de Oliveira, 287 - Cidade Nova",
    complemento: "Em frente ao Açaí da Praça",
    nome: "Érica Carvalho",
    telefone: "(22) 99745-1234",
  },
  {
    id: "rec-4",
    endereco: "Av. Cardoso Moreira, 310 - Centro",
    complemento: "Edifício Comercial Sala 402",
    nome: "Carlos Lima",
    telefone: "(22) 99233-8899",
  },
];

const SUGESTOES_AUTOCOMPLETE = [
  "Rua Dez de Maio, 188 - Centro, Itaperuna - RJ",
  "Av. Cardoso Moreira, 550 - Centro, Itaperuna - RJ",
  "Rua Buarque de Nazareth, 120 - Centro, Itaperuna - RJ",
  "Rua Assis Ribeiro, 45 - Fiteiro, Itaperuna - RJ",
  "Rua Amadeu Tinoco Lacerda, 492 - Aeroporto, Itaperuna - RJ",
  "Rua José Raimundo de Oliveira, 287 - Cidade Nova, Itaperuna - RJ",
];

export function DeliveryAddressBottomSheet() {
  const {
    isAddressModalOpen,
    addressModalTarget,
    fecharModalEndereco,
    salvarEnderecoModal,
    origem,
    destino,
  } = useDelivery();

  const { corPrimaria, corTextoPrimaria } = useBrandTheme();

  const infoAtual = addressModalTarget === "origem" ? origem : destino;

  const [endereco, setEndereco] = useState("");
  const [complemento, setComplemento] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
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

  useEffect(() => {
    if (isAddressModalOpen) {
      setEndereco(infoAtual.endereco || "");
      setComplemento(infoAtual.complemento || "");
      setNome(infoAtual.contatoNome || "");
      setTelefone(infoAtual.contatoTelefone || "");
      setErroValidacao(null);
      setMostrarSugestoes(false);
      setRecenteAtivoId(null);
    }
  }, [isAddressModalOpen, infoAtual]);

  if (!isAddressModalOpen) return null;

  // Máscara dinâmica de telefone brasileiro (XX) XXXXX-XXXX
  function aplicarMascaraTelefone(valor: string) {
    const limpo = valor.replace(/\D/g, "").slice(0, 11);
    if (limpo.length <= 2) return limpo;
    if (limpo.length <= 7) return `(${limpo.slice(0, 2)}) ${limpo.slice(2)}`;
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7, 11)}`;
  }

  function handleTelefoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTelefone(aplicarMascaraTelefone(e.target.value));
  }

  function handleSelecionarRecente(item: EnderecoRecenteItem) {
    setEndereco(item.endereco);
    setComplemento(item.complemento);
    setNome(item.nome);
    setTelefone(item.telefone);
    setRecenteAtivoId(item.id);
    setErroValidacao(null);
  }

  function handleSelecionarAutocomplete(texto: string) {
    setEndereco(texto);
    setMostrarSugestoes(false);
  }

  function handleSalvar() {
    if (!endereco.trim()) {
      setErroValidacao("Por favor, preencha o endereço de entrega.");
      return;
    }

    if (!nome.trim()) {
      setErroValidacao("O nome do contato é obrigatório.");
      return;
    }

    const numerosTelefone = telefone.replace(/\D/g, "");
    if (numerosTelefone.length < 10) {
      setErroValidacao("Informe um telefone válido com DDD (mínimo 10 dígitos).");
      return;
    }

    salvarEnderecoModal({
      endereco: endereco.trim(),
      complemento: complemento.trim(),
      contatoNome: nome.trim(),
      contatoTelefone: telefone.trim(),
    });
  }

  const sugestoesFiltradas = SUGESTOES_AUTOCOMPLETE.filter((sug) =>
    sug.toLowerCase().includes(endereco.toLowerCase())
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-hide-bottom-nav="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md max-h-[92vh] sm:max-h-[85vh] bg-white rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Header do Bottom Sheet */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-600 text-slate-950 flex items-center justify-center font-bold">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">
                {addressModalTarget === "origem" ? "Ponto de Coleta" : "Ponto de Destino"}
              </h2>
              <p className="text-[11px] font-semibold text-slate-500 leading-none mt-0.5">
                {addressModalTarget === "origem"
                  ? "Onde o entregador vai retirar o pacote"
                  : "Quem vai receber o pacote com segurança"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fecharModalEndereco}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário com Scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-left">
          
          {/* SEÇÃO MODERNA: ENDEREÇOS RECENTES (1 TOQUE) — SEM PERDA DE INFORMAÇÕES */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-lg bg-primary-50 text-amber-800 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-primary-700" />
                </div>
                <span className="text-xs font-black text-slate-900 tracking-tight">
                  Endereços Recentes (1 Toque)
                </span>
              </div>
              <span className="text-[10px] font-extrabold bg-primary-50 text-amber-900 border border-amber-200/80 px-2 py-0.5 rounded-full">
                {ENDERECOS_RECENTES.length} contatos salvos
              </span>
            </div>

            {/* LISTA COMPLETA VERTICAL (VER TODOS POR PADRÃO, SEM CORTE DE INFORMAÇÕES) */}
            <div className="space-y-2 pt-1">
              {ENDERECOS_RECENTES.map((rec) => {
                const isSelecionado =
                  recenteAtivoId === rec.id || (endereco === rec.endereco && nome === rec.nome);

                return (
                  <div
                    key={rec.id}
                    onClick={() => handleSelecionarRecente(rec)}
                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99] ${
                      isSelecionado
                        ? "border-primary-600 bg-primary-50/70 shadow-sm ring-2 ring-primary-600/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 shadow-xs"
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-amber-300 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                        {getIniciais(rec.nome)}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900 leading-tight">
                            {rec.nome}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                            {rec.telefone}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-800 leading-snug">
                          {rec.endereco}
                        </p>

                        {rec.complemento && (
                          <div className="inline-flex items-center gap-1.5 text-[10px] text-slate-600 bg-slate-100/90 border border-slate-200/70 px-2 py-0.5 rounded-md font-medium">
                            <Building className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{rec.complemento}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      {isSelecionado ? (
                        <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-100/90 px-2 py-1 rounded-full flex items-center gap-1 shrink-0">
                          <Check className="w-2.5 h-2.5 text-emerald-700 stroke-[3]" />
                          Preenchido
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="px-2.5 py-1.5 rounded-xl bg-primary-50 hover:bg-amber-200 text-amber-900 font-bold text-[10px] transition cursor-pointer"
                        >
                          1 Toque
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CAMPO 1: ENDEREÇO COM AUTOCOMPLETAR */}
          <div className="space-y-1 relative">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Endereço Completo</span>
              <span className="text-rose-500 font-bold">*</span>
            </label>

            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                value={endereco}
                onChange={(e) => {
                  setEndereco(e.target.value);
                  setMostrarSugestoes(true);
                }}
                onFocus={() => setMostrarSugestoes(true)}
                placeholder="Rua, número e bairro"
                className="w-full pl-9 pr-3 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:bg-white transition"
              />
            </div>

            {/* Sugestões de autocomplete */}
            {mostrarSugestoes && endereco.length > 2 && sugestoesFiltradas.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden divide-y divide-slate-100">
                {sugestoesFiltradas.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => handleSelecionarAutocomplete(sug)}
                    className="w-full p-2.5 text-left text-xs font-semibold text-slate-800 hover:bg-amber-50 transition flex items-center gap-2"
                  >
                    <Search className="w-3.5 h-3.5 text-primary-700 shrink-0" />
                    <span className="truncate">{sug}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CAMPO 2: COMPLEMENTO */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Complemento / Referência</span>
              <span className="text-slate-400 text-[10px] font-semibold">(Opcional)</span>
            </label>

            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                placeholder="Apto, bloco, portão, ponto de referência..."
                className="w-full pl-9 pr-3 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:bg-white transition"
              />
            </div>
          </div>

          {/* CAMPO 3: NOME DO CONTATO (OBRIGATÓRIO) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Nome do Contato</span>
              <span className="text-rose-500 font-bold">*</span>
            </label>

            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome de quem vai receber ou entregar"
                className="w-full pl-9 pr-3 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:bg-white transition"
              />
            </div>
          </div>

          {/* CAMPO 4: TELEFONE COM MÁSCARA (OBRIGATÓRIO) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Telefone com WhatsApp</span>
              <span className="text-rose-500 font-bold">*</span>
            </label>

            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="tel"
                value={telefone}
                onChange={handleTelefoneChange}
                placeholder="(22) 99999-9999"
                maxLength={15}
                className="w-full pl-9 pr-3 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:bg-white transition"
              />
            </div>
          </div>

          {erroValidacao && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              {erroValidacao}
            </div>
          )}
        </div>

        {/* Rodapé com Botão Salvar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={handleSalvar}
            style={{
              backgroundColor: corPrimaria,
              color: corTextoPrimaria,
            }}
            className="w-full py-3.5 px-4 rounded-2xl font-black text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Confirmar e Salvar Endereço</span>
          </button>
        </div>
      </div>
    </div>
  );
}
