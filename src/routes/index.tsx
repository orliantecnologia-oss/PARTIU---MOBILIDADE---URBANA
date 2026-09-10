import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  Car,
  Zap,
  ShieldCheck,
  Smartphone,
  Mail,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  Radio,
  Loader2,
} from "lucide-react";
import {
  supabaseAuthService,
  type UserRole,
} from "@/lib/auth/supabase-auth-service";
import { normalizarTelefoneBR } from "@/lib/passenger-cloud-sync";
import { useBrandTheme } from "@/hooks/useBrandTheme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrar | Mobilidade Urbana & Entregas" },
      {
        name: "description",
        content:
          "Acesse sua conta como passageiro ou motorista parceiro. Mobilidade com tarifa justa e repasse instantâneo.",
      },
    ],
  }),
  component: PartiuAppAuthGate,
});

export function PartiuAppAuthGate({
  redirectDestination,
}: {
  redirectDestination?: string | undefined;
} = {}) {
  const navigate = useNavigate();

  // Integração com a identidade visual e Design System dinâmico
  const {
    nomeApp,
    sloganApp,
    corPrimaria,
    corPrimariaHover,
    corTextoPrimaria,
    corSecundaria,
    corFundoApp,
  } = useBrandTheme();

  // Papel ativo: Apenas Passageiro ou Motorista Parceiro (sem exposição de admin)
  const [activeRole, setActiveRole] = useState<"PASSAGEIRO" | "MOTORISTA">("PASSAGEIRO");

  // Modo: Login ou Cadastro (aplicável a passageiro)
  const [authMode, setAuthMode] = useState<"LOGIN" | "CADASTRO">("LOGIN");

  // Método de login do passageiro: Celular ou E-mail
  const [loginMethod, setLoginMethod] = useState<"PHONE" | "EMAIL">("PHONE");

  // Formulário - Passageiro e Motorista
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");

  // OTP Celular
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Estados de feedback e carregamento
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Verificação inicial de sessão ativa
  useEffect(() => {
    async function initGate() {
      const activeSession = supabaseAuthService.getStoredSession();
      if (activeSession) {
        const dest =
          redirectDestination ||
          (activeSession.role === "MOTORISTA" ? "/app/motorista" : "/app");
        void navigate({ to: dest, replace: true });
        return;
      }
      setCheckingSession(false);
    }

    void initGate();
  }, [navigate, redirectDestination]);

  // Contagem regressiva do OTP
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const interval = setInterval(() => setOtpCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [otpCountdown]);

  // Máscaras de entrada
  function handleTelefoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const { formatado } = normalizarTelefoneBR(raw);
    setTelefone(formatado || raw);
  }

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
    let mask = raw;
    if (raw.length > 9) {
      mask = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`;
    } else if (raw.length > 6) {
      mask = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    } else if (raw.length > 3) {
      mask = `${raw.slice(0, 3)}.${raw.slice(3)}`;
    }
    setCpf(mask);
  }

  // Envio de OTP por Celular
  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const norm = normalizarTelefoneBR(telefone);
    if (!norm.valido) {
      setErrorMessage("Informe um número de celular válido com DDD (ex: 82 99841-2940).");
      return;
    }

    setLoading(true);
    const res = await supabaseAuthService.sendPhoneOtp(telefone);
    setLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || "Falha ao enviar código de verificação.");
      return;
    }

    setOtpSent(true);
    setOtpCountdown(45);
    setSuccessMessage(`Código enviado para ${norm.formatado} via SMS.`);
  }

  // Verificação do OTP de Celular
  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!otpCode || otpCode.trim().length < 4) {
      setErrorMessage("Informe o código recebido.");
      return;
    }

    setLoading(true);
    const res = await supabaseAuthService.verifyPhoneOtp({
      phone: telefone,
      otpCode,
      role: activeRole,
    });
    setLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || "Código de verificação incorreto ou expirado.");
      return;
    }

    setSuccessMessage("Acesso validado! Entrando...");
    setTimeout(() => {
      void navigate({ to: redirectDestination || res.redirectUrl || "/app", replace: true });
    }, 300);
  }

  // Login por E-mail e Senha
  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !email.includes("@")) {
      setErrorMessage("Informe um endereço de e-mail válido.");
      return;
    }
    if (!senha || senha.length < 4) {
      setErrorMessage("Informe sua senha de acesso.");
      return;
    }

    setLoading(true);
    const res = await supabaseAuthService.signInWithEmail({
      email,
      senha,
      role: activeRole,
    });
    setLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || "Credenciais inválidas. Verifique seu e-mail e senha.");
      return;
    }

    setSuccessMessage("Autenticado com sucesso! Entrando...");
    setTimeout(() => {
      void navigate({ to: redirectDestination || res.redirectUrl || "/app", replace: true });
    }, 300);
  }

  // Cadastro de Novo Passageiro
  async function handlePassengerSignUp(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!nome || nome.trim().length < 3) {
      setErrorMessage("Informe seu nome completo.");
      return;
    }
    if (!email || !email.includes("@")) {
      setErrorMessage("Informe um e-mail válido.");
      return;
    }
    const norm = normalizarTelefoneBR(telefone);
    if (!norm.valido) {
      setErrorMessage("Informe um número de celular válido com DDD.");
      return;
    }
    if (cpf.replace(/\D/g, "").length !== 11) {
      setErrorMessage("Informe um CPF válido com 11 dígitos.");
      return;
    }
    if (!senha || senha.length < 6) {
      setErrorMessage("Crie uma senha de no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);
    const res = await supabaseAuthService.signUpPassenger({
      name: nome,
      email,
      phone: telefone,
      cpf,
      password: senha,
    });
    setLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || "Não foi possível concluir o cadastro.");
      return;
    }

    setSuccessMessage("Conta criada com sucesso! Entrando...");
    setTimeout(() => {
      void navigate({ to: redirectDestination || res.redirectUrl || "/app", replace: true });
    }, 400);
  }

  // Login de Demonstração Rápida (1-Clique)
  function handleQuickDemo(role: UserRole) {
    setLoading(true);
    setErrorMessage(null);
    const res = supabaseAuthService.quickDemoLogin(role);
    setSuccessMessage(`Entrando como ${role} de demonstração...`);
    setTimeout(() => {
      void navigate({ to: redirectDestination || res.redirectUrl || "/app", replace: true });
    }, 300);
  }

  // Recuperação de Senha
  async function handleForgotPassword() {
    if (!email || !email.includes("@")) {
      setErrorMessage("Digite seu e-mail para receber as instruções de recuperação.");
      return;
    }
    setLoading(true);
    const res = await supabaseAuthService.resetPassword(email);
    setLoading(false);
    setSuccessMessage(res.message);
  }

  // Carregador inicial
  if (checkingSession) {
    return (
      <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col items-center justify-center p-4">
        <div
          className="h-11 w-11 rounded-xl flex items-center justify-center shadow-sm mb-2.5 animate-pulse"
          style={{ backgroundColor: corPrimaria }}
        >
          <Zap className="h-5 w-5 stroke-[2.5]" style={{ color: corTextoPrimaria, fill: corTextoPrimaria }} />
        </div>
        <p className="text-[10px] font-semibold text-slate-500">Iniciando {nomeApp}...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] w-full max-w-full overflow-x-hidden flex flex-col justify-between items-center px-3 sm:px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] font-sans selection:bg-amber-300 selection:text-slate-950 transition-colors duration-200"
      style={{ backgroundColor: corFundoApp || "#F8FAFC" }}
    >
      {/* 1. HEADER LIMPO: LOGOTIPO E IDENTIDADE */}
      <header className="w-full max-w-[380px] flex flex-col items-center text-center pt-1 pb-3">
        <div
          className="h-11 w-11 rounded-xl flex items-center justify-center shadow-sm mb-2 transition-transform hover:scale-105"
          style={{ backgroundColor: corPrimaria }}
        >
          <Zap className="h-5 w-5 stroke-[2.5]" style={{ color: corTextoPrimaria, fill: corTextoPrimaria }} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[19px] font-bold tracking-tight text-slate-900">{nomeApp}</span>
          <span
            className="text-[8.5px] font-bold uppercase px-1.5 py-0.5 rounded tracking-wider"
            style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
          >
            BRASIL
          </span>
        </div>
        <p className="text-[10px] font-normal text-slate-500 mt-0.5">{sloganApp}</p>
      </header>

      {/* 2. CARD PRINCIPAL CLARO MOBILE-FIRST */}
      <main className="w-full max-w-[380px] bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] p-4 sm:p-5 space-y-3.5">
        
        {/* SELETOR DE PERFIL: PASSAGEIRO | MOTORISTA (SEM ADMIN) */}
        <div className="bg-slate-100/90 p-1 rounded-xl flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveRole("PASSAGEIRO");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-[10.5px] transition flex items-center justify-center gap-1.5 ${
              activeRole === "PASSAGEIRO"
                ? "shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900 font-medium"
            }`}
            style={
              activeRole === "PASSAGEIRO"
                ? { backgroundColor: corPrimaria, color: corTextoPrimaria }
                : {}
            }
          >
            <Car className="h-3.5 w-3.5" />
            <span>Passageiro</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveRole("MOTORISTA");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-[10.5px] transition flex items-center justify-center gap-1.5 ${
              activeRole === "MOTORISTA"
                ? "shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900 font-medium"
            }`}
            style={
              activeRole === "MOTORISTA"
                ? { backgroundColor: corPrimaria, color: corTextoPrimaria }
                : {}
            }
          >
            <Radio className="h-3.5 w-3.5" />
            <span>Motorista</span>
          </button>
        </div>

        {/* FEEDBACK DE ERRO OU SUCESSO */}
        {errorMessage && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[10.5px] font-medium flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-500" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10.5px] font-medium flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600" />
            <span className="leading-snug">{successMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 1: PASSAGEIRO */}
        {/* ========================================================================= */}
        {activeRole === "PASSAGEIRO" && (
          <div className="space-y-3.5">
            {/* Alternância Entrar / Criar Conta */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h1 className="text-[13.5px] font-bold text-slate-900">
                  {authMode === "LOGIN" ? "Pedir corrida" : "Criar sua conta"}
                </h1>
                <p className="text-[10px] text-slate-500">
                  {authMode === "LOGIN"
                    ? "Entre para solicitar carros e entregas"
                    : "Cadastro rápido em menos de 1 minuto"}
                </p>
              </div>

              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("LOGIN");
                    setErrorMessage(null);
                  }}
                  className={`px-2.5 py-1 rounded-md transition ${
                    authMode === "LOGIN"
                      ? "bg-white text-slate-950 font-bold shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("CADASTRO");
                    setErrorMessage(null);
                  }}
                  className={`px-2.5 py-1 rounded-md transition ${
                    authMode === "CADASTRO"
                      ? "bg-white text-slate-950 font-bold shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Cadastrar
                </button>
              </div>
            </div>

            {/* FLUXO: LOGIN PASSAGEIRO */}
            {authMode === "LOGIN" && (
              <>
                {/* Seletor Celular ou E-mail */}
                <div className="grid grid-cols-2 gap-1 bg-slate-100/90 p-0.5 rounded-lg text-[10px] font-medium">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod("PHONE");
                      setOtpSent(false);
                      setErrorMessage(null);
                    }}
                    className={`py-1 rounded-md flex items-center justify-center gap-1.5 transition ${
                      loginMethod === "PHONE"
                        ? "bg-white text-slate-950 font-bold shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Smartphone className="h-3 w-3" />
                    <span>Celular</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod("EMAIL");
                      setErrorMessage(null);
                    }}
                    className={`py-1 rounded-md flex items-center justify-center gap-1.5 transition ${
                      loginMethod === "EMAIL"
                        ? "bg-white text-slate-950 font-bold shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Mail className="h-3 w-3" />
                    <span>E-mail &amp; Senha</span>
                  </button>
                </div>

                {/* Login com Celular */}
                {loginMethod === "PHONE" && (
                  <>
                    {!otpSent ? (
                      <form onSubmit={handleSendOtp} className="space-y-3 pt-0.5">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                            Número de Celular
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs">
                              🇧🇷
                            </span>
                            <input
                              type="tel"
                              value={telefone}
                              onChange={handleTelefoneChange}
                              placeholder="(82) 99841-2940"
                              className="w-full bg-slate-50/70 border border-slate-200/90 rounded-lg pl-8 pr-3 py-2 text-[12px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 focus:bg-white transition"
                              required
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full h-10 rounded-xl font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-sm transition active:scale-[0.99] disabled:opacity-50"
                          style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
                        >
                          {loading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <span>Continuar</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </>
                          )}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyOtp} className="space-y-3 pt-0.5">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                            Código de Verificação SMS
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                            placeholder="0000"
                            className="w-full bg-slate-50/70 border border-slate-200/90 rounded-lg px-3 py-2 text-center tracking-widest text-[15px] font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 focus:bg-white transition"
                            autoFocus
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full h-10 rounded-xl font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-sm transition active:scale-[0.99] disabled:opacity-50"
                          style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
                        >
                          {loading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>Confirmar e Entrar</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                          <button
                            type="button"
                            onClick={() => setOtpSent(false)}
                            className="hover:text-slate-900 font-medium"
                          >
                            Trocar número
                          </button>
                          <button
                            type="button"
                            disabled={otpCountdown > 0}
                            onClick={handleSendOtp}
                            className="font-semibold text-slate-800 disabled:text-slate-400"
                          >
                            {otpCountdown > 0 ? `Reenviar em ${otpCountdown}s` : "Reenviar código"}
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}

                {/* Login com E-mail e Senha */}
                {loginMethod === "EMAIL" && (
                  <form onSubmit={handleEmailLogin} className="space-y-2.5 pt-0.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">E-mail</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu.email@exemplo.com"
                        className="w-full bg-slate-50/70 border border-slate-200/90 rounded-lg px-3 py-2 text-[12px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 focus:bg-white transition"
                        required
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-semibold text-slate-600">Senha</label>
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-[9.5px] font-medium text-slate-500 hover:text-slate-800"
                        >
                          Esqueci a senha
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={senha}
                          onChange={(e) => setSenha(e.target.value)}
                          placeholder="Sua senha"
                          className="w-full bg-slate-50/70 border border-slate-200/90 rounded-lg pl-3 pr-8 py-2 text-[12px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 focus:bg-white transition"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-10 rounded-xl font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-sm transition active:scale-[0.99] disabled:opacity-50 mt-1"
                      style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
                    >
                      {loading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <span>Entrar no {nomeApp}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* FLUXO: CADASTRO PASSAGEIRO */}
            {authMode === "CADASTRO" && (
              <form onSubmit={handlePassengerSignUp} className="space-y-2.5 pt-0.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full bg-slate-50/70 border border-slate-200/90 rounded-lg px-3 py-2 text-[12px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 focus:bg-white transition"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Celular</label>
                    <input
                      type="tel"
                      value={telefone}
                      onChange={handleTelefoneChange}
                      placeholder="(82) 99841-2940"
                      className="w-full bg-slate-50/70 border border-slate-200/90 rounded-lg px-2.5 py-2 text-[11px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 focus:bg-white transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">CPF</label>
                    <input
                      type="text"
                      value={cpf}
                      onChange={handleCpfChange}
                      placeholder="000.000.000-00"
                      className="w-full bg-slate-50/70 border border-slate-200/90 rounded-lg px-2.5 py-2 text-[11px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 focus:bg-white transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full bg-slate-50/70 border border-slate-200/90 rounded-lg px-3 py-2 text-[12px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 focus:bg-white transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Criar Senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Mínimo 6 dígitos"
                      className="w-full bg-slate-50/70 border border-slate-200/90 rounded-lg pl-3 pr-8 py-2 text-[12px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 focus:bg-white transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-xl font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-sm transition active:scale-[0.99] disabled:opacity-50 mt-1"
                  style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>Criar Conta &amp; Entrar</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* BOTÃO TESTE RÁPIDO */}
            <div className="pt-1.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleQuickDemo("PASSAGEIRO")}
                className="w-full py-2 rounded-lg bg-slate-100/80 hover:bg-slate-100 text-slate-700 font-semibold text-[10px] flex items-center justify-center gap-1.5 transition"
              >
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span>Entrar como Passageiro Demo</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 2: MOTORISTA PARCEIRO */}
        {/* ========================================================================= */}
        {activeRole === "MOTORISTA" && (
          <div className="space-y-3.5">
            <div className="border-b border-slate-100 pb-2.5">
              <h1 className="text-[13.5px] font-bold text-slate-900">Portal do Motorista</h1>
              <p className="text-[10px] text-slate-500">
                Acesse o cockpit de corridas com repasse instantâneo via PIX D+0.
              </p>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-2.5 pt-0.5">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  E-mail ou Celular Cadastrado
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="motorista@partiu.com.br"
                  className="w-full bg-slate-50/70 border border-slate-200/90 rounded-lg px-3 py-2 text-[12px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 focus:bg-white transition"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold text-slate-600">Senha</label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[9.5px] font-medium text-slate-500 hover:text-slate-800"
                  >
                    Esqueci a senha
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Sua senha"
                    className="w-full bg-slate-50/70 border border-slate-200/90 rounded-lg pl-3 pr-8 py-2 text-[12px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 focus:bg-white transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-xl font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-sm transition active:scale-[0.99] disabled:opacity-50 mt-1"
                style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Acessar Cockpit do Motorista</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-1.5 border-t border-slate-100 space-y-1.5">
              <button
                type="button"
                onClick={() => handleQuickDemo("MOTORISTA")}
                className="w-full py-2 rounded-lg bg-slate-100/80 hover:bg-slate-100 text-slate-700 font-semibold text-[10px] flex items-center justify-center gap-1.5 transition"
              >
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span>Entrar como Motorista Demo</span>
              </button>

              <Link
                to="/cadastro-motorista"
                className="w-full py-2 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 font-semibold text-[10px] flex items-center justify-center gap-1.5 transition"
              >
                <span>Quero ser Motorista Parceiro</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* 3. RODAPÉ DISCRETO */}
      <footer className="w-full max-w-[380px] text-center py-3 space-y-1">
        <div className="flex items-center justify-center gap-2.5 text-[9.5px] font-medium text-slate-400">
          <span className="flex items-center gap-1 text-emerald-600">
            <ShieldCheck className="h-3 w-3" /> Conexão Segura SSL
          </span>
          <span>•</span>
          <span>Conforme LGPD</span>
          <span>•</span>
          <span>PIX Instantâneo</span>
        </div>
        <p className="text-[8.5px] text-slate-400">
          © 2026 {nomeApp}. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
