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
  ShieldCheck,
  User,
  Zap,
} from "lucide-react";
import { useGeolocation } from "@/lib/use-geolocation";
import { silentCatchWarn } from "@/lib/structured-logger";


export const Route = createFileRoute("/cadastro-passageiro")({
  head: () => ({
    meta: [
      { title: "Cadastro de Passageiro | PARTIU" },
      {
        name: "description",
        content:
          "Crie sua conta de passageiro no PARTIU com localização GPS ativa para pedir corridas urbanas e entregas expressas.",
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
  const [cidade, setCidade] = useState("Maceió e Região");
  const [receberWhatsApp, setReceberWhatsApp] = useState(true);
  const [sucesso, setSucesso] = useState(false);

  const {
    localDetectado,
    carregando: carregandoGPS,
    solicitarLocalizacao,
    permissaoConcedida,
  } = useGeolocation();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!permissaoConcedida) {
      solicitarLocalizacao();
    }

    try {
      const perfilPassageiro = {
        nome,
        email,
        telefone,
        cpf,
        cidade,
        receberWhatsApp,
        gpsAtivo: true,
        pontoEmbarque: localDetectado ? localDetectado.pontoEmbarque : "Local Atual (GPS)",
        cadastradoEm: new Date().toISOString(),
      };
      localStorage.setItem("partiu_perfil_passageiro", JSON.stringify(perfilPassageiro));
      localStorage.setItem("partiu_user_nome", nome);
      localStorage.setItem("partiu_user_telefone", telefone);
      localStorage.setItem("partiu_gps_permitido", "true");
    } catch (err) { silentCatchWarn("cadastro-passageiro", err); }

    setSucesso(true);
  }

  return (
    <div className="min-h-[100dvh] bg-[#0b0f17] text-white flex flex-col justify-between p-4 sm:p-6 w-full pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
      {/* Top Header */}
      <div className="mx-auto w-full max-w-md flex items-center justify-between">
        <Link
          to="/escolher-tipo-cadastro"
          className="flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 shadow-xs active:scale-95 transition-all cursor-pointer hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-xs font-black uppercase tracking-wider text-[#FFDE00] flex items-center gap-1">
          <ShieldCheck className="h-4 w-4" />
          Passageiro PARTIU
        </span>
        <div className="w-11" />
      </div>

      <main className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center py-4">
        {!sucesso ? (
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl bg-slate-900/90 p-5 sm:p-7 shadow-2xl border border-slate-800 space-y-4 backdrop-blur-xl"
          >
            <div className="text-left border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-8 w-8 rounded-xl bg-[#FFDE00] flex items-center justify-center text-slate-950 font-black">
                  <Zap className="h-4 w-4 fill-slate-950 stroke-[2.5]" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  Cadastro de Passageiro
                </h1>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Chame carros e motos com verificação PIN, GPS ao vivo e desconto na 1ª corrida.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-300">
                Nome Completo
              </label>
              <input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Carlos Silva"
                className="w-full h-12 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white outline-none border border-slate-800 focus:border-[#FFDE00] transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                  Celular / WhatsApp
                </label>
                <input
                  required
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(82) 99999-9999"
                  className="w-full h-12 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white outline-none border border-slate-800 focus:border-[#FFDE00] transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                  CPF
                </label>
                <input
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full h-12 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white outline-none border border-slate-800 focus:border-[#FFDE00] transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                  E-mail
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full h-12 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white outline-none border border-slate-800 focus:border-[#FFDE00] transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                  Senha
                </label>
                <input
                  required
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 6 dígitos"
                  className="w-full h-12 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white outline-none border border-slate-800 focus:border-[#FFDE00] transition-colors"
                />
              </div>
            </div>

            {/* Localização GPS */}
            <div className="rounded-2xl bg-slate-950 p-3.5 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFDE00] text-slate-950 shrink-0 font-black">
                  <MapPin className="h-5 w-5 fill-slate-950" />
                </div>
                <div>
                  <strong className="text-xs font-black text-white">Localização para Corridas</strong>
                  <p className="text-[11px] text-slate-400">
                    O motorista saberá com precisão onde te buscar
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="truncate mr-2 text-slate-300 font-medium">
                  {permissaoConcedida && localDetectado
                    ? `📍 ${localDetectado.pontoEmbarque}`
                    : carregandoGPS
                      ? "🛰️ Calibrando GPS..."
                      : "📍 Localização automática"}
                </span>
                <button
                  type="button"
                  onClick={solicitarLocalizacao}
                  className="text-xs text-slate-950 font-black bg-[#FFDE00] hover:bg-[#ffe633] px-3 py-1.5 rounded-lg shrink-0 transition-all active:scale-95 cursor-pointer"
                >
                  {permissaoConcedida ? "Ativo ✓" : "Ativar GPS"}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="wppUpdates"
                checked={receberWhatsApp}
                onChange={(e) => setReceberWhatsApp(e.target.checked)}
                className="h-4 w-4 rounded accent-[#FFDE00] cursor-pointer"
              />
              <label
                htmlFor="wppUpdates"
                className="text-xs text-slate-400 font-medium cursor-pointer"
              >
                Receber comprovantes de corrida e código PIN via WhatsApp
              </label>
            </div>

            <button
              type="submit"
              className="flex min-h-[48px] h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FFDE00] text-sm font-black text-slate-950 shadow-md shadow-[#FFDE00]/20 transition-all hover:bg-[#ffe633] active:scale-[0.98] mt-2 cursor-pointer"
            >
              <CheckCircle2 className="h-5 w-5" /> Concluir Cadastro
            </button>

            <div className="text-center pt-1">
              <Link
                to="/auth"
                search={{ redirect: "/app" }}
                className="text-xs font-bold text-slate-400 hover:text-white transition-colors py-1 inline-block"
              >
                Já tem uma conta? <span className="text-[#FFDE00] font-black underline">Fazer login</span>
              </Link>
            </div>
          </form>
        ) : (
          <div className="rounded-3xl bg-slate-900 p-7 text-center shadow-2xl border border-slate-800 space-y-4 animate-in zoom-in-95">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFDE00] text-slate-950 shadow-lg shadow-[#FFDE00]/20">
              <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
            </div>

            <h2 className="text-xl font-black text-white">Conta Criada com Sucesso!</h2>
            <p className="text-xs text-slate-300">
              Bem-vindo ao PARTIU, <span className="font-black text-white">{nome}</span>! Seu
              cadastro está pronto para você pedir corridas e entregas agora mesmo.
            </p>

            <div className="pt-3 space-y-2">
              <Link
                to="/app"
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[#FFDE00] text-xs font-black text-slate-950 shadow-md shadow-[#FFDE00]/20 hover:bg-[#ffe633] transition-all cursor-pointer"
              >
                Pedir Minha Primeira Corrida
              </Link>
            </div>
          </div>
        )}
      </main>

      <div className="text-center text-[11px] text-slate-600">
        PARTIU Mobilidade Urbana & Entregas Flash • Tecnologia Nacional
      </div>
    </div>
  );
}
