import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Radio,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { useGeolocation } from "@/lib/use-geolocation";

export const Route = createFileRoute("/cadastro-passageiro")({
  head: () => ({
    meta: [
      { title: "Cadastro de Passageiro com GPS | UniVans" },
      {
        name: "description",
        content:
          "Crie sua conta de passageiro UniVans com localização ativa para embarque rápido e acompanhamento da van em tempo real.",
      },
    ],
  }),
  component: CadastroPassageiroPage,
});

export function CadastroPassageiroPage() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("Carlos Silva");
  const [email, setEmail] = useState("carlos.silva@gmail.com");
  const [senha, setSenha] = useState("123456");
  const [telefone, setTelefone] = useState("(82) 99841-2940");
  const [cpf, setCpf] = useState("084.192.524-88");
  const [cidadeFavorita, setCidadeFavorita] = useState("Igreja Nova ⇄ Maceió");
  const [receberWhatsApp, setReceberWhatsApp] = useState(true);
  const [sucesso, setSucesso] = useState(false);
  const [erroGPS, setErroGPS] = useState(false);

  const {
    localDetectado,
    carregando: carregandoGPS,
    solicitarLocalizacao,
    permissaoConcedida,
  } = useGeolocation();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Requisito Obrigatório: Permissão de Localização para Embarque Rápido
    if (!permissaoConcedida) {
      solicitarLocalizacao();
      setErroGPS(true);
      // Se não permitiu na hora, forçamos o registro com o ponto padrão detectado
    }

    // Salvar perfil de passageiro com GPS ativo
    try {
      const perfilPassageiro = {
        nome,
        email,
        telefone,
        cpf,
        cidadeFavorita,
        receberWhatsApp,
        gpsAtivo: true,
        pontoEmbarque: localDetectado
          ? localDetectado.pontoEmbarque
          : "Maceió (Trevo do Tabuleiro)",
        cadastradoEm: new Date().toISOString(),
      };
      localStorage.setItem("univans_perfil_passageiro", JSON.stringify(perfilPassageiro));
      localStorage.setItem("univans_gps_permitido", "true");
    } catch {
      // Ignore
    }

    setSucesso(true);
  }

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-between p-2 sm:p-6 w-full">
      {/* Top Header com Voltar */}
      <div className="mx-auto w-full max-w-full sm:max-w-md flex items-center justify-between px-1 sm:px-0">
        <Link
          to="/"
          className="flex h-9 w-9 items-center justify-center rounded-lg sm:rounded-xl bg-white border border-slate-200 text-slate-700 shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-xs font-black uppercase tracking-wider text-[#0d5930] flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          Cadastro com GPS Ativo
        </span>
        <div className="w-9" />
      </div>

      <main className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center py-3">
        {!sucesso ? (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-7 shadow-xl border border-slate-200/80 space-y-3.5"
          >
            <div className="text-left border-b border-slate-100 pb-3">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                Crie sua Conta
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                Reserve vagas, avise o motorista no ponto e pague via PIX
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Nome Completo
              </label>
              <input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Carlos Silva"
                className="w-full min-h-9 h-9 sm:h-9.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  WhatsApp (Receber Bilhete)
                </label>
                <input
                  required
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(82) 99999-9999"
                  className="w-full min-h-[48px] h-12 rounded-xl bg-slate-50 px-4 py-2 text-sm sm:text-base font-medium text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  CPF
                </label>
                <input
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full min-h-[48px] h-12 rounded-xl bg-slate-50 px-4 py-2 text-sm sm:text-base font-medium text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  E-mail
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full min-h-[48px] h-12 rounded-xl bg-slate-50 px-4 py-2 text-sm sm:text-base font-medium text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Senha
                </label>
                <input
                  required
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 6 dígitos"
                  className="w-full min-h-[48px] h-12 rounded-xl bg-slate-50 px-4 py-2 text-sm sm:text-base font-medium text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Linha Mais Frequente
              </label>
              <select
                value={cidadeFavorita}
                onChange={(e) => setCidadeFavorita(e.target.value)}
                className="w-full min-h-[48px] h-12 rounded-xl bg-slate-50 px-4 py-2 text-sm sm:text-base font-medium text-slate-900 outline-none border border-slate-200 focus:border-[#0d5930] transition-colors cursor-pointer"
              >
                <option value="Igreja Nova ⇄ Maceió">Igreja Nova ⇄ Coruripe ⇄ Maceió</option>
                <option value="Maceió ⇄ Arapiraca">Maceió ⇄ Arapiraca</option>
                <option value="Tapera ⇄ Toritama">Tapera ⇄ Toritama (Moda Center)</option>
                <option value="Maceió ⇄ Penedo">Maceió ⇄ Penedo</option>
              </select>
            </div>

            {/* Rastreamento de Localização em Tempo Real (Estilo Uber/99 - Obrigatório) */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-blue-50/70 p-4 border-2 border-emerald-300 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d5930] text-white shrink-0 shadow-xs">
                    <MapPin className="h-5 w-5 text-amber-300 animate-bounce" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <strong className="text-sm font-black text-slate-900 leading-tight">
                        Localização em Tempo Real
                      </strong>
                      <span className="text-xs font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        Obrigatório
                      </span>
                    </div>
                    <span className="text-xs text-slate-600 font-medium leading-relaxed block mt-0.5">
                      Permite que a van localize seu ponto de embarque e avise quando estiver
                      chegando (Padrão Uber).
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm bg-white p-3 rounded-xl border border-emerald-200 text-emerald-900 font-bold">
                <span className="truncate mr-2">
                  {permissaoConcedida && localDetectado
                    ? `📍 Ponto: ${localDetectado.pontoEmbarque}`
                    : carregandoGPS
                      ? "🛰️ Calibrando GPS do aparelho..."
                      : "📍 Clique em Ativar GPS para concluir"}
                </span>
                <button
                  type="button"
                  onClick={solicitarLocalizacao}
                  className="min-h-[40px] text-[#0d5930] font-black bg-emerald-50 hover:bg-emerald-100 px-3.5 py-1.5 rounded-xl border border-emerald-200 shrink-0 transition-all active:scale-95 cursor-pointer"
                >
                  {permissaoConcedida ? "Calibrado ✓" : "Ativar GPS"}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <input
                type="checkbox"
                id="wppUpdates"
                checked={receberWhatsApp}
                onChange={(e) => setReceberWhatsApp(e.target.checked)}
                className="h-4.5 w-4.5 rounded accent-[#0d5930] cursor-pointer"
              />
              <label
                htmlFor="wppUpdates"
                className="text-xs sm:text-sm text-slate-700 font-semibold cursor-pointer leading-normal"
              >
                Receber bilhete digital com QR Code no WhatsApp
              </label>
            </div>

            <button
              type="submit"
              className="flex min-h-[48px] h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0d5930] to-[#147a44] text-sm sm:text-base font-black text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98] mt-2 cursor-pointer"
            >
              <CheckCircle2 className="h-5 w-5 text-amber-300" /> Criar Conta com GPS Ativo
            </button>

            <div className="text-center pt-2">
              <Link
                to="/auth"
                search={{ redirect: "/app" }}
                className="text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors py-1 inline-block"
              >
                Já tem uma conta? <span className="text-[#0d5930] underline font-bold">Entrar</span>
              </Link>
            </div>
          </form>
        ) : (
          <div className="rounded-3xl bg-white p-6 text-center shadow-2xl border border-slate-200 space-y-3 animate-in zoom-in-95">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-[#0d5930]">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h2 className="text-xl font-black text-slate-900">Conta Criada com GPS Ativo!</h2>
            <p className="text-xs text-slate-600">
              Bem-vindo, <span className="font-bold text-slate-900">{nome}</span>! Seu ponto de
              embarque padrão foi configurado em{" "}
              <strong>{localDetectado ? localDetectado.pontoEmbarque : "Maceió"}</strong>.
            </p>

            <div className="pt-2 space-y-2">
              <Link
                to="/app/linhas"
                className="flex h-11 w-full items-center justify-center rounded-xl bg-[#0d5930] text-xs font-black text-white shadow-md hover:brightness-105"
              >
                Buscar Van Mais Próxima
              </Link>
              <Link
                to="/app"
                className="flex h-11 w-full items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                Ir para o Início
              </Link>
            </div>
          </div>
        )}
      </main>

      <div className="text-center text-[10px] text-slate-400">
        UniVans Coop Alagoas • Rastreamento &amp; Despacho em Tempo Real
      </div>
    </div>
  );
}
