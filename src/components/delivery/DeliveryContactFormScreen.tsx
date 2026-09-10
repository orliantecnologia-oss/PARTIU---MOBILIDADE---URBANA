import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  ChevronRight,
  User,
  MapPin,
  Pencil,
  Search,
  X,
  Check,
} from "lucide-react";
import { useDelivery, type EnderecoRecenteItem } from "@/contexts/DeliveryContext";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { geocodingService, type GeocodedPlace } from "@/lib/passenger/geocoding-service";

export function DeliveryContactFormScreen() {
  const {
    isAddressModalOpen,
    addressModalTarget,
    fecharModalEndereco,
    salvarEnderecoModal,
    origem,
    destino,
    enderecosRecentes,
  } = useDelivery();

  const { corPrimaria, corTextoPrimaria } = useBrandTheme();

  const infoAtual = addressModalTarget === "origem" ? origem : destino;
  const isDestino = addressModalTarget === "destino";

  const [endereco, setEndereco] = useState("");
  const [complemento, setComplemento] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  // Autocomplete Mapbox
  const [sugestoes, setSugestoes] = useState<GeocodedPlace[]>([]);
  const [buscandoSugestoes, setBuscandoSugestoes] = useState(false);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);

  useEffect(() => {
    if (isAddressModalOpen) {
      setEndereco(infoAtual.endereco || "");
      setComplemento(infoAtual.complemento || "");
      setNome(infoAtual.contatoNome || "");
      setTelefone(infoAtual.contatoTelefone || "");
      setErroValidacao(null);
      setMostrarDropdown(false);
      setSugestoes([]);
    }
  }, [isAddressModalOpen, infoAtual]);

  // Busca debounced no Mapbox Geocoding
  useEffect(() => {
    if (!endereco || endereco.length < 3) {
      setSugestoes([]);
      setMostrarDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setBuscandoSugestoes(true);
      try {
        const resultados = await geocodingService.buscarLugares(endereco);
        setSugestoes(resultados);
        setMostrarDropdown(resultados.length > 0);
      } catch {
        setSugestoes([]);
      } finally {
        setBuscandoSugestoes(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [endereco]);

  if (!isAddressModalOpen) return null;

  // Máscara brasileira de telefone (XX) 9XXXX-XXXX
  function aplicarMascaraTelefone(valor: string) {
    const limpo = valor.replace(/\D/g, "").slice(0, 11);
    if (limpo.length <= 2) return limpo;
    if (limpo.length <= 7) return `(${limpo.slice(0, 2)}) ${limpo.slice(2)}`;
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7, 11)}`;
  }

  function handleTelefoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTelefone(aplicarMascaraTelefone(e.target.value));
  }

  function handleSelecionarLugar(lugar: GeocodedPlace) {
    setEndereco(lugar.endereco);
    setMostrarDropdown(false);
  }

  function handleSelecionarRecente(rec: EnderecoRecenteItem) {
    setEndereco(rec.endereco);
    setComplemento(rec.complemento || "");
    setNome(rec.nome);
    setTelefone(aplicarMascaraTelefone(rec.telefone));
    setErroValidacao(null);
    setMostrarDropdown(false);
  }

  function handleConfirmar() {
    if (!endereco.trim()) {
      setErroValidacao("Por favor, preencha o endereço.");
      return;
    }
    if (!nome.trim()) {
      setErroValidacao("Informe o nome para contato.");
      return;
    }
    const digitosTel = telefone.replace(/\D/g, "");
    if (digitosTel.length < 10) {
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

  const isFormValido = Boolean(
    endereco.trim() &&
    nome.trim() &&
    telefone.replace(/\D/g, "").length >= 10
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-hide-bottom-nav="true"
      className="fixed inset-0 z-50 bg-white flex flex-col font-sans overflow-hidden animate-in slide-in-from-right duration-250"
    >
      {/* 1. CABEÇALHO LIMPO COM VOLTAR E TÍTULO DINÂMICO */}
      <header className="px-4 py-3.5 border-b border-slate-100 flex items-center gap-3 bg-white sticky top-0 z-20">
        <button
          type="button"
          onClick={fecharModalEndereco}
          aria-label="Voltar"
          className="p-2 -ml-1 text-slate-800 hover:bg-slate-100 active:scale-95 rounded-full transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <h1 className="text-base sm:text-lg font-black text-slate-950 tracking-tight">
          {isDestino ? "Informações do destinatário" : "Informações do remetente"}
        </h1>
      </header>

      {/* 2. FORMULÁRIO ROLÁVEL COM DIVISORES SUBTIS */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* CAMPO 1: ENDEREÇO (COM MAPBOX AUTOCOMPLETE) */}
        <div className="space-y-1 relative">
          <label className="text-xs font-bold text-slate-700 block">
            Endereço<span className="text-rose-500">*</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              onFocus={() => {
                if (sugestoes.length > 0) setMostrarDropdown(true);
              }}
              placeholder={isDestino ? "Selecionar endereço de entrega" : "Selecionar endereço de coleta"}
              className="w-full pr-10 py-2.5 text-sm font-semibold text-slate-900 border-b border-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 bg-transparent transition"
            />
            {endereco ? (
              <button
                type="button"
                onClick={() => {
                  setEndereco("");
                  setSugestoes([]);
                  setMostrarDropdown(false);
                }}
                className="absolute right-1 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400 absolute right-1 pointer-events-none" />
            )}
          </div>

          {/* DROPDOWN DE AUTOCOMPLETE MAPBOX */}
          {mostrarDropdown && sugestoes.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {sugestoes.map((sug) => (
                <button
                  key={sug.id}
                  type="button"
                  onClick={() => handleSelecionarLugar(sug)}
                  className="w-full p-3 text-left hover:bg-amber-50/70 transition flex items-start gap-2.5 cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {sug.label}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {sug.sublabel || sug.endereco}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CAMPO 2: DETALHES DO ENDEREÇO (COMPLEMENTO) */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 block">
            Detalhes do endereço
          </label>
          <input
            type="text"
            value={complemento}
            onChange={(e) => setComplemento(e.target.value)}
            placeholder="Ex.: bloco A, apartamento 201"
            className="w-full py-2.5 text-sm font-semibold text-slate-900 border-b border-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 bg-transparent transition"
          />
        </div>

        {/* CAMPO 3: NOME PARA CONTATO */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 block">
            Nome para contato<span className="text-rose-500">*</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={isDestino ? "Digite o nome do destinatário" : "Digite o nome do remetente"}
              className="w-full pr-10 py-2.5 text-sm font-semibold text-slate-900 border-b border-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 bg-transparent transition"
            />
            <div className="absolute right-1 text-slate-400">
              <User className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* CAMPO 4: NÚMERO DE TELEFONE (COM BANDEIRA BRASIL +55 E MÁSCARA) */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 block">
            Número de telefone<span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-2 border-b border-slate-200 py-1 focus-within:border-amber-500 transition">
            {/* Seletor Visual de País */}
            <div className="flex items-center gap-1 text-xs font-bold text-slate-700 shrink-0 select-none pr-1">
              <span className="text-base leading-none">🇧🇷</span>
              <span>+55</span>
              <span className="text-slate-400 text-[10px]">▼</span>
            </div>

            <input
              type="tel"
              value={telefone}
              onChange={handleTelefoneChange}
              placeholder={isDestino ? "Telefone do destinatário" : "Telefone do remetente"}
              maxLength={15}
              className="w-full py-1.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
            />
          </div>
        </div>

        {erroValidacao && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold animate-in fade-in">
            {erroValidacao}
          </div>
        )}

        {/* 3. BOTÃO DE CONFIRMAÇÃO GRANDE E DE ALTO CONTRASTE */}
        <div className="pt-3 pb-2">
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={!isFormValido}
            style={
              isFormValido
                ? {
                    backgroundColor: corPrimaria || "#FFDE00",
                    color: corTextoPrimaria || "#0F172A",
                  }
                : undefined
            }
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm tracking-tight transition-all flex items-center justify-center gap-2 ${
              isFormValido
                ? "shadow-md active:scale-98 cursor-pointer hover:opacity-95"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            <span>Confirmar</span>
          </button>
        </div>

        {/* 4. HISTÓRICO: ENDEREÇOS RECENTES */}
        {enderecosRecentes && enderecosRecentes.length > 0 && (
          <div className="pt-3 space-y-2 border-t border-slate-100">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Endereços recentes
            </h2>

            <div className="space-y-1 divide-y divide-slate-100/80">
              {enderecosRecentes.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => handleSelecionarRecente(rec)}
                  className="py-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded-xl transition group"
                >
                  <div className="w-5 h-5 text-slate-500 group-hover:text-amber-600 transition shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug group-hover:text-amber-900 transition">
                      {rec.endereco}
                    </p>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      {rec.nome} • {rec.telefone}
                    </p>
                  </div>

                  <div className="text-slate-400 group-hover:text-slate-700 shrink-0 p-1">
                    <Pencil className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
