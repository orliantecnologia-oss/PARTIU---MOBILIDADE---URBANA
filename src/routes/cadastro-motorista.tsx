import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bus,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  HelpCircle,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Truck,
  Upload,
  User,
  Wifi,
  Zap,
} from "lucide-react";
import { TopNav } from "@/components/navigation/TopNav";
import type { ItemConforto } from "@/lib/admin-data";

export const Route = createFileRoute("/cadastro-motorista")({
  head: () => ({
    meta: [
      { title: "Cadastro de Motorista | Pega a Van & UniVans" },
      {
        name: "description",
        content:
          "Cadastre sua van, organize seus horários e aumente a lotação das suas viagens com passageiros conectados em tempo real.",
      },
      { property: "og:title", content: "Cadastro de Motorista | Pega a Van & UniVans" },
      {
        property: "og:description",
        content: "Cadastre sua van e conecte-se a passageiros em rotas intermunicipais.",
      },
    ],
  }),
  component: CadastroMotoristaPage,
});

export function CadastroMotoristaPage() {
  const [etapa, setEtapa] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [sucesso, setSucesso] = useState(false);

  // Etapa 1: Dados Pessoais
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");

  // Etapa 2: Veículo & Conforto
  const [veiculoModelo, setVeiculoModelo] = useState("Mercedes Sprinter 416");
  const [veiculoAno, setVeiculoAno] = useState("2024");
  const [veiculoPlaca, setVeiculoPlaca] = useState("");
  const [capacidade, setCapacidade] = useState("16");
  const [conforto, setConforto] = useState<ItemConforto[]>([
    "ar_condicionado",
    "wifi_starlink",
    "tomada_usb",
  ]);

  // Etapa 3: CNH & Órgão Regulador
  const [cnh, setCnh] = useState("");
  const [possuiEAR, setPossuiEAR] = useState(true);
  const [orgaoRegulador, setOrgaoRegulador] = useState("ARSAL");
  const [numeroAutorizacao, setNumeroAutorizacao] = useState("");

  // Etapa 4: Linha & Horários
  const [origem, setOrigem] = useState("Maceió");
  const [destino, setDestino] = useState("Arapiraca");
  const [preco, setPreco] = useState("32,00");
  const [horarios, setHorarios] = useState<string[]>(["06:30", "11:00", "15:30"]);
  const [novoHorario, setNovoHorario] = useState("");

  // Etapa 5: PIX
  const [chavePix, setChavePix] = useState("");
  const [tipoChave, setTipoChave] = useState<"cpf" | "celular" | "email" | "aleatoria">("celular");

  function toggleConforto(item: ItemConforto) {
    setConforto((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
  }

  function adicionarHorario() {
    if (novoHorario && !horarios.includes(novoHorario)) {
      setHorarios([...horarios, novoHorario].sort());
      setNovoHorario("");
    }
  }

  function removerHorario(h: string) {
    setHorarios(horarios.filter((item) => item !== h));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (etapa < 5) {
      setEtapa((prev) => (prev + 1) as 1 | 2 | 3 | 4 | 5);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setSucesso(true);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-between p-2 sm:p-6 w-full">
      {/* Top Bar com Voltar e Indicadores de 5 Etapas */}
      <div className="mx-auto w-full max-w-full sm:max-w-md flex items-center justify-between px-1 sm:px-0">
        <button
          type="button"
          onClick={() => {
            if (etapa > 1) {
              setEtapa((prev) => (prev - 1) as 1 | 2 | 3 | 4 | 5);
            } else {
              window.history.back();
            }
          }}
          className="flex h-9 w-9 items-center justify-center rounded-lg sm:rounded-xl bg-white border border-slate-200 text-slate-700 shadow-xs active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === etapa
                  ? "w-6 bg-[#0d5930]"
                  : i < etapa
                    ? "w-3 bg-emerald-500"
                    : "w-2 bg-slate-200"
              }`}
            />
          ))}
        </div>

        <span className="text-[10px] font-black text-slate-500 uppercase">{etapa}/5</span>
      </div>

      {/* Conteúdo Principal Centralizado */}
      <main className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center py-2">
        {!sucesso ? (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-xl border border-slate-200/80 space-y-3"
          >
            {/* ETAPA 1: Identificação */}
            {etapa === 1 && (
              <div className="space-y-2.5 animate-in fade-in duration-150">
                <div className="border-b border-slate-100 pb-2">
                  <h2 className="text-base font-black text-slate-900 leading-tight">
                    1. Identificação do Motorista
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Dados de contato para exibição aos passageiros
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Carlos Menezes"
                    className="w-full min-h-[48px] h-12 rounded-xl bg-slate-50 px-4 py-2 text-sm sm:text-base font-medium text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      CPF *
                    </label>
                    <input
                      required
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full min-h-[48px] h-12 rounded-xl bg-slate-50 px-4 py-2 text-sm sm:text-base font-medium text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      WhatsApp *
                    </label>
                    <input
                      required
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="(82) 99999-0000"
                      className="w-full min-h-[48px] h-12 rounded-xl bg-slate-50 px-4 py-2 text-sm sm:text-base font-medium text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="carlos@exemplo.com"
                    className="w-full min-h-[48px] h-12 rounded-xl bg-slate-50 px-4 py-2 text-sm sm:text-base font-medium text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* ETAPA 2: Veículo & Conforto */}
            {etapa === 2 && (
              <div className="space-y-2.5 animate-in fade-in duration-150">
                <div className="border-b border-slate-100 pb-2">
                  <h2 className="text-base font-black text-slate-900 leading-tight">
                    2. Dados da Van & Conforto
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Modelo e itens para atrair passageiros
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                      Modelo da Van *
                    </label>
                    <input
                      required
                      value={veiculoModelo}
                      onChange={(e) => setVeiculoModelo(e.target.value)}
                      placeholder="Sprinter 416"
                      className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                      Placa do Veículo *
                    </label>
                    <input
                      required
                      value={veiculoPlaca}
                      onChange={(e) => setVeiculoPlaca(e.target.value)}
                      placeholder="RJP-2F14"
                      className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 uppercase outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                      Ano
                    </label>
                    <input
                      value={veiculoAno}
                      onChange={(e) => setVeiculoAno(e.target.value)}
                      placeholder="2024"
                      className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                      Lugares
                    </label>
                    <select
                      value={capacidade}
                      onChange={(e) => setCapacidade(e.target.value)}
                      className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930]"
                    >
                      <option value="15">15 lugares</option>
                      <option value="16">16 lugares</option>
                      <option value="18">18 lugares</option>
                      <option value="20">20 lugares</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Comodidades a Bordo:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: "ar_condicionado", label: "❄️ Ar-condicionado" },
                      { id: "wifi_starlink", label: "📡 Wi-Fi Starlink" },
                      { id: "tomada_usb", label: "🔌 Tomadas USB" },
                      { id: "acessibilidade_pcd", label: "♿ Acesso PcD" },
                    ].map((item) => {
                      const ativo = conforto.includes(item.id as ItemConforto);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleConforto(item.id as ItemConforto)}
                          className={`rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition-all flex items-center justify-between border ${
                            ativo
                              ? "bg-[#0d5930] text-white border-[#0d5930]"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          <span>{item.label}</span>
                          {ativo && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 3: CNH & Órgão Regulador */}
            {etapa === 3 && (
              <div className="space-y-2.5 animate-in fade-in duration-150">
                <div className="border-b border-slate-100 pb-2">
                  <h2 className="text-base font-black text-slate-900 leading-tight">
                    3. Documentação & Habilitação
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Conformidade com os órgãos reguladores
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                      Registro da CNH *
                    </label>
                    <input
                      required
                      value={cnh}
                      onChange={(e) => setCnh(e.target.value)}
                      placeholder="00000000000"
                      className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                      Órgão Regulador *
                    </label>
                    <select
                      value={orgaoRegulador}
                      onChange={(e) => setOrgaoRegulador(e.target.value)}
                      className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930]"
                    >
                      <option value="ARSAL">ARSAL (Alagoas)</option>
                      <option value="DETRO">DETRO (Rio)</option>
                      <option value="ANTT">ANTT (Federal)</option>
                      <option value="COOPERATIVA">Cooperativa Local</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                    Nº do Alvará / Termo de Permissão
                  </label>
                  <input
                    value={numeroAutorizacao}
                    onChange={(e) => setNumeroAutorizacao(e.target.value)}
                    placeholder="Ex: ARSAL-2026/8942"
                    className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="ear"
                    checked={possuiEAR}
                    onChange={(e) => setPossuiEAR(e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-[#0d5930]"
                  />
                  <label
                    htmlFor="ear"
                    className="text-[10px] text-slate-600 font-semibold cursor-pointer leading-tight"
                  >
                    CNH com observação EAR e vistoria do CRLV em dia
                  </label>
                </div>
              </div>
            )}

            {/* ETAPA 4: Linha & Horários */}
            {etapa === 4 && (
              <div className="space-y-2.5 animate-in fade-in duration-150">
                <div className="border-b border-slate-100 pb-2">
                  <h2 className="text-base font-black text-slate-900 leading-tight">
                    4. Linha & Horários de Saída
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Municípios atendidos e horários de partida
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                      Origem *
                    </label>
                    <input
                      required
                      value={origem}
                      onChange={(e) => setOrigem(e.target.value)}
                      placeholder="Maceió"
                      className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                      Destino *
                    </label>
                    <input
                      required
                      value={destino}
                      onChange={(e) => setDestino(e.target.value)}
                      placeholder="Arapiraca"
                      className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                    Valor da Passagem (R$) *
                  </label>
                  <input
                    required
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                    placeholder="32,00"
                    className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Horários Cadastrados:
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {horarios.map((h) => (
                      <span
                        key={h}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#0d5930] px-2.5 py-1 text-[11px] font-bold text-white shadow-xs"
                      >
                        {h}
                        <button
                          type="button"
                          onClick={() => removerHorario(h)}
                          className="text-white/80 hover:text-white ml-0.5"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={novoHorario}
                      onChange={(e) => setNovoHorario(e.target.value)}
                      className="flex-1 rounded-xl bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={adicionarHorario}
                      className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-white"
                    >
                      + Adicionar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 5: Chave PIX */}
            {etapa === 5 && (
              <div className="space-y-2.5 animate-in fade-in duration-150">
                <div className="border-b border-slate-100 pb-2">
                  <h2 className="text-base font-black text-slate-900 leading-tight">
                    5. Recebimento PIX Direto
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    100% do valor da passagem direto na sua conta
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Tipo de Chave PIX:
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { id: "celular", label: "Celular" },
                      { id: "cpf", label: "CPF" },
                      { id: "email", label: "E-mail" },
                      { id: "aleatoria", label: "Aleatória" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setTipoChave(item.id as "cpf" | "celular" | "email" | "aleatoria")
                        }
                        className={`rounded-xl py-1.5 text-[10px] font-bold border transition-all ${
                          tipoChave === item.id
                            ? "bg-[#0d5930] text-white border-[#0d5930]"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                    Chave PIX Cadastrada *
                  </label>
                  <input
                    required
                    value={chavePix}
                    onChange={(e) => setChavePix(e.target.value)}
                    placeholder="Digite sua chave PIX..."
                    className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white"
                  />
                </div>

                <div className="rounded-2xl bg-emerald-50 p-3 border border-emerald-200 text-slate-700 text-xs flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#0d5930] shrink-0" />
                  <span className="text-[11px] font-semibold leading-tight">
                    Zero taxa sobre passagens. Receba direto no seu banco.
                  </span>
                </div>
              </div>
            )}

            {/* Botão de Avanço */}
            <div className="pt-2">
              <button
                type="submit"
                className="flex min-h-[48px] h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0d5930] text-sm sm:text-base font-black text-white shadow-md transition-all hover:brightness-105 active:scale-[0.98] cursor-pointer"
              >
                {etapa === 5 ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" /> Concluir Cadastro de Motorista
                  </>
                ) : (
                  <>
                    Avançar Etapa <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Sucesso */
          <div className="rounded-3xl bg-white p-6 text-center shadow-2xl border border-slate-200 space-y-3 animate-in zoom-in-95">
            <div className="mx-auto flex h-11 sm:h-12 w-14 items-center justify-center rounded-full bg-emerald-50 text-[#0d5930]">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h2 className="text-xl font-black text-slate-900">Cadastro Enviado!</h2>
            <p className="text-xs text-slate-600">
              Parabéns, <span className="font-bold text-slate-900">{nome || "Motorista"}</span>! Sua
              van na rota{" "}
              <span className="font-bold">
                {origem} → {destino}
              </span>{" "}
              foi cadastrada.
            </p>

            <div className="pt-2 space-y-2">
              <Link
                to="/app/motorista"
                className="flex h-11 w-full items-center justify-center rounded-xl bg-[#0d5930] text-xs font-black text-white shadow-md hover:brightness-105"
              >
                Abrir Painel de Bordo do Motorista
              </Link>
              <Link
                to="/app/linhas"
                className="flex h-11 w-full items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                Ver Grade de Horários
              </Link>
            </div>
          </div>
        )}
      </main>

      <div className="text-center text-[10px] text-slate-400">
        UniVans • Plataforma de Gestão de Vans
      </div>
    </div>
  );
}
