import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Info,
} from "lucide-react";
import { salvarBeneficiarioGratuidade, type CategoriaGratuidadeGov } from "@/lib/passagens-store";

export const Route = createFileRoute("/cadastro-gratuidade")({
  head: () => ({
    meta: [
      { title: "Cadastro de Passe Livre Governamental | UniVans" },
      {
        name: "description",
        content:
          "Cadastre-se para ter acesso aos assentos gratuitos garantidos por lei (Idosos 60+, PCD e Estudantes de Baixa Renda CadÚnico).",
      },
    ],
  }),
  component: CadastroGratuidadePage,
});

export function CadastroGratuidadePage() {
  const navigate = useNavigate();
  const [categoria, setCategoria] = useState<CategoriaGratuidadeGov>("idoso_60");
  const [nome, setNome] = useState("Severino José de Lima");
  const [cpf, setCpf] = useState("123.456.789-00");
  const [dataNascimento, setDataNascimento] = useState("1958-04-12");
  const [numeroDocumento, setNumeroDocumento] = useState("BENEF-8819-AL");
  const [orgaoEmissor, setOrgaoEmissor] = useState("INSS / Governo Federal");
  const [termoAceito, setTermoAceito] = useState(true);
  const [sucesso, setSucesso] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    salvarBeneficiarioGratuidade({
      nome,
      cpf,
      dataNascimento,
      categoria,
      numeroDocumentoBeneficio: numeroDocumento,
      orgaoEmissor,
    });

    setSucesso(true);
  }

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-between p-3 text-slate-900 w-full max-w-md mx-auto">
      {/* 1. CABEÇALHO */}
      <header className="w-full flex items-center justify-between py-1">
        <Link
          to="/escolher-tipo-cadastro"
          className="flex h-9 w-9 items-center justify-center rounded-lg sm:rounded-xl bg-white border border-slate-200 text-slate-700 shadow-xs active:scale-95 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-xs font-black uppercase tracking-wider text-[#0d5930] flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Passe Livre Governamental
        </span>
        <div className="w-9" />
      </header>

      {/* 2. CONTEÚDO PRINCIPAL */}
      <main className="w-full flex-1 flex flex-col justify-center py-2">
        {sucesso ? (
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 text-center space-y-4 animate-in zoom-in-95">
            <div className="h-16 w-16 bg-emerald-100 text-[#0d5930] rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Credenciamento Aprovado ✓
              </span>
              <h1 className="text-xl font-black text-slate-900 mt-2">Passe Livre Ativo!</h1>
              <p className="text-xs text-slate-600 leading-relaxed">
                Olá, <strong>{nome}</strong>! Sua conta de benefício social foi cadastrada com
                sucesso. Agora você tem direito à reserva dos{" "}
                <strong>2 assentos gratuitos garantidos por lei</strong> em cada van da cooperativa.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-left text-xs space-y-1 text-emerald-950 font-medium">
              <p className="font-black text-emerald-900 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Regras da Cota por Lei:
              </p>
              <p>
                • São disponibilizados <strong>2 assentos por viagem</strong> (Poltronas 01 e 02).
              </p>
              <p>• 100% gratuito, sem necessidade de pagamento PIX ou Cartão.</p>
              <p>• Apresente seu documento com foto e o cartão do benefício no embarque.</p>
            </div>

            <button
              type="button"
              onClick={() => navigate({ to: "/app/linhas" })}
              className="w-full min-h-9.5 h-9.5 sm:h-10 py-1.5 px-5 rounded-lg bg-[#0d5930] hover:bg-[#147a44] text-white text-xs sm:text-sm font-black shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Ver Horários &amp; Reservar Assento Gratuito</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/90 space-y-3.5">
            {/* Título & Introdução */}
            <div className="text-center space-y-1">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-[#0d5930] flex items-center justify-center mx-auto border border-emerald-200">
                <HeartHandshake className="h-6 w-6 text-[#0d5930]" />
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900">
                Cadastro de Gratuidade Legal
              </h1>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Reservado para cidadãos com direito a transporte gratuito (Estatuto do Idoso, Passe
                Livre PCD e CadÚnico).
              </p>
            </div>

            {/* Cota Informativa */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-600">
              <Info className="h-4 w-4 text-[#0d5930] shrink-0 mt-0.5" />
              <p className="text-[11px] leading-snug">
                Conforme a legislação vigente,{" "}
                <strong>cada van disponibiliza 2 assentos gratuitos prioritários</strong> (poltronas
                01 e 02 com acesso facilitado).
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
              {/* Seleção da Categoria do Benefício */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800">
                  Tipo de Benefício Governamental *
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <label
                    className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                      categoria === "idoso_60"
                        ? "bg-emerald-50/70 border-[#0d5930] ring-1 ring-[#0d5930]"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="categoria"
                      value="idoso_60"
                      checked={categoria === "idoso_60"}
                      onChange={() => setCategoria("idoso_60")}
                      className="accent-[#0d5930] h-4 w-4"
                    />
                    <div className="min-w-0">
                      <strong className="text-xs font-black text-slate-900 block">
                        👴 Pessoa Idosa (60 anos ou mais)
                      </strong>
                      <span className="text-[10px] text-slate-500">
                        Estatuto da Pessoa Idosa — Lei Federal nº 10.741/2003
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                      categoria === "pcd"
                        ? "bg-emerald-50/70 border-[#0d5930] ring-1 ring-[#0d5930]"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="categoria"
                      value="pcd"
                      checked={categoria === "pcd"}
                      onChange={() => setCategoria("pcd")}
                      className="accent-[#0d5930] h-4 w-4"
                    />
                    <div className="min-w-0">
                      <strong className="text-xs font-black text-slate-900 block">
                        ♿ PCD / Mobilidade Reduzida
                      </strong>
                      <span className="text-[10px] text-slate-500">
                        Passe Livre Federal — Lei nº 8.899/94 ou Cartão de Transporte
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                      categoria === "estudante_cadunico"
                        ? "bg-emerald-50/70 border-[#0d5930] ring-1 ring-[#0d5930]"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="categoria"
                      value="estudante_cadunico"
                      checked={categoria === "estudante_cadunico"}
                      onChange={() => setCategoria("estudante_cadunico")}
                      className="accent-[#0d5930] h-4 w-4"
                    />
                    <div className="min-w-0">
                      <strong className="text-xs font-black text-slate-900 block">
                        🎓 Jovem de Baixa Renda (ID Jovem / CadÚnico)
                      </strong>
                      <span className="text-[10px] text-slate-500">
                        Decreto Federal nº 8.537/2015 com NIS ativo
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Nome Completo */}
              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-bold text-slate-700">
                  Nome Completo do Beneficiário *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome conforme documento oficial"
                  className="w-full px-4 min-h-[48px] h-12 rounded-xl border border-slate-200 bg-slate-50 text-sm sm:text-base font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d5930]"
                />
              </div>

              {/* CPF e Data de Nascimento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-bold text-slate-700">CPF *</label>
                  <input
                    type="text"
                    required
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-4 min-h-[48px] h-12 rounded-xl border border-slate-200 bg-slate-50 text-sm sm:text-base font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d5930]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-bold text-slate-700">
                    Nascimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className="w-full px-4 min-h-[48px] h-12 rounded-xl border border-slate-200 bg-slate-50 text-sm sm:text-base font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d5930]"
                  />
                </div>
              </div>

              {/* Número do Cartão / NIS / Comprovante */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-bold text-slate-700">
                    Nº do Benefício / NIS *
                  </label>
                  <input
                    type="text"
                    required
                    value={numeroDocumento}
                    onChange={(e) => setNumeroDocumento(e.target.value)}
                    placeholder="Ex: 12345678900"
                    className="w-full px-4 min-h-[48px] h-12 rounded-xl border border-slate-200 bg-slate-50 text-sm sm:text-base font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d5930]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-bold text-slate-700">
                    Órgão Emissor
                  </label>
                  <input
                    type="text"
                    value={orgaoEmissor}
                    onChange={(e) => setOrgaoEmissor(e.target.value)}
                    placeholder="Ex: INSS, Gov.br, CRAS"
                    className="w-full px-4 min-h-[48px] h-12 rounded-xl border border-slate-200 bg-slate-50 text-sm sm:text-base font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d5930]"
                  />
                </div>
              </div>

              {/* Termo de Veracidade */}
              <label className="flex items-start gap-2.5 pt-1 text-xs sm:text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={termoAceito}
                  onChange={(e) => setTermoAceito(e.target.checked)}
                  className="accent-[#0d5930] h-4.5 w-4.5 shrink-0 mt-0.5"
                />
                <span>
                  Declaro que as informações acima são verdadeiras e estou ciente de que deverei
                  apresentar o documento comprobatório no momento do embarque.
                </span>
              </label>

              {/* Botão de Conclusão */}
              <button
                type="submit"
                className="w-full min-h-[48px] h-12 rounded-xl bg-[#0d5930] hover:bg-[#147a44] text-white text-sm sm:text-base font-black shadow-md shadow-emerald-950/20 active:scale-[0.98] transition-all mt-2 cursor-pointer"
              >
                Concluir Cadastro de Passe Livre
              </button>
            </form>
          </div>
        )}
      </main>

      {/* 3. RODAPÉ */}
      <footer className="mx-auto w-full max-w-md text-center text-[10px] text-slate-400 font-bold py-2">
        UniVans Cooperativa Oficial • Atendimento à Legislação de Transporte Social
      </footer>
    </div>
  );
}
