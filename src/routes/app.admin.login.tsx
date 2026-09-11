import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Car,
  CheckCircle2,
  Crown,
  Lock,
  Mail,
  Radio,
  ShieldAlert,
  Truck,
  User,
} from "lucide-react";
import { loginAdmin } from "@/lib/admin-rbac";

export const Route = createFileRoute("/app/admin/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Login Administrativo & Control Center | PARTIU" },
      {
        name: "description",
        content:
          "Área de autenticação restrita para o Proprietário (Owner) e Administradores da plataforma PARTIU.",
      },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const res = await loginAdmin(email, senha);
      if (!res.sucesso) {
        setErro(res.mensagem);
        setCarregando(false);
        return;
      }

      setSucesso(true);
      setTimeout(() => {
        void navigate({ to: "/app/admin" });
      }, 600);
    } catch {
      setErro("Falha inesperada ao validar credenciais administrativas.");
      setCarregando(false);
    }
  }

  function preencherCredencialRapida(tipo: "dono" | "admin") {
    if (tipo === "dono") {
      setEmail("dono@partiu.app");
      setSenha("123456");
    } else {
      setEmail("admin@partiu.app");
      setSenha("123456");
    }
    setErro(null);
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-white relative overflow-hidden">
      {/* Background decorativo cartográfico sutil */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#0088FF 1px, transparent 1px), linear-gradient(90deg, #0088FF 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Header com Logo Oficial e Badge */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#0088FF]/20 px-3.5 py-1 text-xs font-black uppercase text-primary-500 border border-primary-600/30">
            <Car className="h-3.5 w-3.5 text-primary-600" />
            <span>Painel de Comando Executivo • PARTIU</span>
          </div>

          <div className="flex items-center justify-center gap-2.5 pt-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0088FF] text-slate-950 shadow-xl font-black">
              <Car className="h-6 w-6" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black tracking-tight leading-none text-white">
                PARTIU <span className="text-[#0088FF]">Admin</span>
              </h1>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1">
                Backoffice &amp; Gestão de Mobilidade
              </p>
            </div>
          </div>
        </div>

        {/* Card do Formulário */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-xl">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-black text-white">Acesso Restrito</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Entre com as credenciais do seu cargo operacional para gerenciar o sistema.
            </p>
          </div>

          {erro && (
            <div className="rounded-2xl bg-red-950/60 border border-red-500/40 p-3.5 text-xs text-red-200 flex items-center gap-2 animate-in fade-in">
              <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {sucesso && (
            <div className="rounded-2xl bg-emerald-950/60 border border-emerald-500/40 p-3.5 text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Autenticado com sucesso! Redirecionando...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-1.5">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="ex: dono@partiu.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0d5930] hover:bg-emerald-700 text-white text-xs font-black shadow-lg shadow-[#0d5930]/30 transition-all active:scale-[0.98] mt-2"
            >
              <span>Acessar Painel de Controle</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Atalhos Rápidos com Credenciais Padrão Pré-Configuradas */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block text-center">
              Acesso Rápido com Contas Padrão (1-Clique)
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => preencherCredencialRapida("dono")}
                className="p-3 rounded-2xl bg-slate-950 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/40 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-primary-600 mb-1">
                  <Crown className="h-4 w-4" />
                  <span className="text-xs font-black">👑 Dono (Owner)</span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">dono@partiu.app</p>
                <p className="text-[9px] text-emerald-400 font-mono">Acesso Total D+0</p>
              </button>

              <button
                type="button"
                onClick={() => preencherCredencialRapida("admin")}
                className="p-3 rounded-2xl bg-slate-950 hover:bg-blue-950/40 border border-slate-800 hover:border-blue-500/40 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-blue-400 mb-1">
                  <User className="h-4 w-4" />
                  <span className="text-xs font-black">👤 Operações</span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">admin@partiu.app</p>
                <p className="text-[9px] text-emerald-400 font-mono">Despacho &amp; Frota</p>
              </button>
            </div>

            <div className="text-center pt-1">
              <span className="text-[10px] text-slate-400 bg-slate-950/70 border border-slate-800 px-3 py-1 rounded-full inline-block">
                🔑 Senha padrão: <span className="font-mono text-emerald-400 font-bold">123456</span> ou <span className="font-mono text-emerald-400 font-bold">partiu2026</span>
              </span>
            </div>
          </div>
        </div>

        {/* Link para voltar ao app do passageiro */}
        <div className="text-center">
          <Link
            to="/"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors font-semibold"
          >
            ← Voltar para o Portal de Passageiros
          </Link>
        </div>
      </div>
    </div>
  );
}
