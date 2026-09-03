import { FontSizeSelector } from "@/components/ui/FontSizeSelector";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, type ChangeEvent } from "react";
import {
  Camera,
  Upload,
  User,
  CheckCircle2,
  Sparkles,
  CreditCard,
  Bell,
  ShieldCheck,
  HelpCircle,
  LogOut,
  ChevronRight,
  Phone,
  Mail,
  Truck,
  ArrowLeft,
  X,
  Image as ImageIcon,
} from "lucide-react";

export const Route = createFileRoute("/app/perfil")({
  head: () => ({
    meta: [
      { title: "Meu Perfil & Foto | UniVans Starlink" },
      {
        name: "description",
        content:
          "Gerencie sua foto de perfil, dados pessoais, preferências e credenciamento na UniVans.",
      },
    ],
  }),
  component: ProfilePage,
});

const AVATARES_PRESET = [
  {
    id: "motorista-1",
    label: "Motorista Executivo",
    tipo: "Motorista",
    url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "passageira-1",
    label: "Passageira VIP",
    tipo: "Passageiro",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "passageiro-1",
    label: "Passageiro Conectado",
    tipo: "Passageiro",
    url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "motorista-2",
    label: "Motorista Cooperado",
    tipo: "Motorista",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
  },
];

export function ProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados do Usuário
  const [nome, setNome] = useState("Rafael Vasconcelos");
  const [email, setEmail] = useState("rafael.passageiro@email.com");
  const [telefone, setTelefone] = useState("(82) 99876-5432");
  const [tipoPerfil, setTipoPerfil] = useState<"passageiro" | "motorista">("passageiro");
  const [fotoUrl, setFotoUrl] = useState(
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
  );
  const [chavePix, setChavePix] = useState("(82) 99876-5432");
  const [modalFotoAberto, setModalFotoAberto] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState(false);

  // Carregar dados salvos no localStorage
  useEffect(() => {
    const savedAvatar = localStorage.getItem("univans_user_avatar");
    if (savedAvatar) setFotoUrl(savedAvatar);

    const savedNome = localStorage.getItem("univans_user_nome");
    if (savedNome) setNome(savedNome);

    const savedTipo = localStorage.getItem("univans_user_tipo");
    if (savedTipo === "motorista" || savedTipo === "passageiro") setTipoPerfil(savedTipo);
  }, []);

  // Manipular upload de arquivo local do celular ou PC
  function handleUploadFoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar se é imagem
    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione um arquivo de imagem válido.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setFotoUrl(result);
        localStorage.setItem("univans_user_avatar", result);
        setModalFotoAberto(false);
        mostrarAlertaSucesso();
      }
    };
    reader.readAsDataURL(file);
  }

  function selecionarAvatarPreset(url: string, tipo: string) {
    setFotoUrl(url);
    localStorage.setItem("univans_user_avatar", url);
    if (tipo === "Motorista") {
      setTipoPerfil("motorista");
      localStorage.setItem("univans_user_tipo", "motorista");
    }
    setModalFotoAberto(false);
    mostrarAlertaSucesso();
  }

  function mostrarAlertaSucesso() {
    setMensagemSucesso(true);
    setTimeout(() => setMensagemSucesso(false), 3500);
  }

  function salvarDadosPerfil() {
    localStorage.setItem("univans_user_nome", nome);
    localStorage.setItem("univans_user_avatar", fotoUrl);
    localStorage.setItem("univans_user_tipo", tipoPerfil);
    mostrarAlertaSucesso();
  }

  function sair() {
    localStorage.removeItem("univans_demo_user");
    navigate({ to: "/auth", replace: true, search: { redirect: "/app" } });
  }

  return (
    <div className="min-h-[100dvh] bg-[#f8faf8] text-slate-900 pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
      {/* 1. Top Header com a Paleta Oficial Verde Cooperativa */}
      <div className="relative bg-gradient-to-br from-[#0d5930] via-[#116e3c] to-[#094223] px-5 pt-6 pb-12 text-white rounded-b-[2.8rem] shadow-xl overflow-hidden">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#f5a623]/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between mb-6">
          <Link
            to="/app"
            className="flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xl text-white border border-white/20 hover:bg-white/30 active:scale-95 transition-all shadow-2xs cursor-pointer"
            aria-label="Voltar para a Home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-black tracking-tight text-white">Meu Perfil</h1>
          <button
            type="button"
            onClick={salvarDadosPerfil}
            className="min-h-[40px] px-5 py-2 rounded-full bg-white/20 backdrop-blur-xl text-xs sm:text-sm font-black text-white border border-white/30 hover:bg-white/30 active:scale-95 transition-all cursor-pointer shadow-2xs"
          >
            Salvar
          </button>
        </div>

        {/* Bloco de Avatar Interativo com Botão de Foto */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="relative group">
            {/* Moldura da Foto */}
            <div className="h-28 w-28 rounded-[2rem] border-4 border-white/90 bg-white/20 overflow-hidden shadow-2xl ring-8 ring-white/10 relative">
              <img src={fotoUrl} alt={nome} className="h-full w-full object-cover" />
            </div>

            {/* Botão Flutuante de Alterar Foto */}
            <button
              type="button"
              onClick={() => setModalFotoAberto(true)}
              className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5a623] text-slate-950 font-black shadow-lg hover:scale-110 active:scale-90 transition-all border-2 border-white cursor-pointer"
              title="Cadastrar / Alterar Foto"
            >
              <Camera className="h-5 w-5 stroke-[2.5]" />
            </button>
          </div>

          <h2 className="text-xl font-black text-white mt-3.5 tracking-tight">{nome}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/30 backdrop-blur-md px-3.5 py-0.5 text-xs font-black text-emerald-200 border border-emerald-400/30">
              {tipoPerfil === "motorista" ? (
                <>
                  <Truck className="h-3.5 w-3.5" /> Motorista Cooperado
                </>
              ) : (
                <>
                  <User className="h-3.5 w-3.5" /> Passageiro VIP Starlink
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Alerta Flutuante de Sucesso */}
      {mensagemSucesso && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl bg-[#0d5930] px-5 py-3 text-sm font-black text-white shadow-2xl border border-emerald-400/40 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-300" />
          <span>Foto e perfil atualizados com sucesso!</span>
        </div>
      )}

      {/* 2. Formulário de Dados e Ações */}
      <div className="px-1.5 sm:px-4 -mt-4 relative z-20 space-y-3 w-full max-w-full sm:max-w-xl mx-auto">
        {/* Card de Informações Pessoais */}
        <div className="rounded-2xl bg-white p-3.5 sm:p-5 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              DADOS CADASTRAIS
            </h3>
            <button
              type="button"
              onClick={() => setModalFotoAberto(true)}
              className="text-xs font-bold text-[#0d5930] hover:underline flex items-center gap-1"
            >
              <Camera className="h-3.5 w-3.5" /> Trocar Foto
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Nome Completo</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full min-h-[48px] h-12 rounded-xl bg-slate-50 px-4 py-2.5 text-sm sm:text-base font-medium text-slate-900 border border-slate-200 focus:border-[#0d5930] focus:bg-white outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">
                Telefone WhatsApp
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full min-h-[48px] h-12 rounded-xl bg-slate-50 px-4 py-2.5 text-sm sm:text-base font-medium text-slate-900 border border-slate-200 focus:border-[#0d5930] focus:bg-white outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Tipo de Conta</label>
              <select
                value={tipoPerfil}
                onChange={(e) => setTipoPerfil(e.target.value as "passageiro" | "motorista")}
                className="w-full min-h-[48px] h-12 rounded-xl bg-slate-50 px-4 py-2.5 text-sm sm:text-base font-medium text-slate-900 border border-slate-200 focus:border-[#0d5930] focus:bg-white outline-none transition-all cursor-pointer"
              >
                <option value="passageiro">Passageiro</option>
                <option value="motorista">Motorista / Van</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-[48px] h-12 rounded-xl bg-slate-50 px-4 py-2.5 text-sm sm:text-base font-medium text-slate-900 border border-slate-200 focus:border-[#0d5930] focus:bg-white outline-none transition-all"
            />
          </div>
        </div>

        {/* Menu de Atalhos & Configurações */}
        <div className="rounded-2xl bg-white p-2 sm:p-3 shadow-xs border border-slate-100 space-y-1">
          <Link
            to="/app/linhas"
            className="flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 active:scale-[0.99] transition-all group min-h-[56px] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#0d5930]">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Formas de Pagamento & PIX</p>
                <p className="text-xs text-slate-500">Chaves cadastradas e saldo</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/app/bilhetes"
            className="flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 active:scale-[0.99] transition-all group min-h-[56px] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-[#f5a623]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Minhas Passagens & Histórico</p>
                <p className="text-xs text-slate-500">Bilhetes com QR Code ativo</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Botão de Sair */}
        <button
          type="button"
          onClick={sair}
          className="flex min-h-[48px] h-12 w-full items-center justify-center gap-2 rounded-xl bg-rose-50 text-rose-600 font-black text-sm hover:bg-rose-100 active:scale-[0.98] transition-all border border-rose-100 cursor-pointer"
        >
          <LogOut className="h-4 w-4" /> Desconectar da Conta
        </button>
      </div>

      {/* 3. MODAL DE CADASTRO E UPLOAD DE FOTO (CAMERA / ARQUIVO / PRESETS) */}
      {modalFotoAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200 p-0 sm:p-4">
          <div className="absolute inset-0" onClick={() => setModalFotoAberto(false)} />

          <div className="relative z-10 w-full max-w-[430px] mx-auto rounded-t-3xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-2xl border border-slate-200/90 max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-8 duration-300">
            <div className="mx-auto -mt-2 mb-3 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-[#0d5930]">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-none">
                    Foto do Perfil
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Envie uma foto ou escolha um avatar oficial
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalFotoAberto(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Input Oculto de Arquivo */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUploadFoto}
              accept="image/*"
              className="hidden"
            />

            {/* Botão de Tirar Foto / Upload do Dispositivo */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#0d5930] to-[#147a44] py-3.5 px-4 text-xs font-black text-white elevation-button hover:brightness-105 active:scale-95 transition-all cursor-pointer"
              >
                <Upload className="h-4 w-4" /> Carregar Foto do Celular / PC
              </button>
            </div>

            {/* Divisor */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="w-full border-t border-slate-200" />
              <span className="absolute bg-white px-3 text-[10px] font-black uppercase text-slate-400">
                OU ESCOLHA UM AVATAR OFICIAL
              </span>
            </div>

            {/* Galeria de Avatares Presets */}
            <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-60 pr-1">
              {AVATARES_PRESET.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => selecionarAvatarPreset(av.url, av.tipo)}
                  className="flex flex-col items-center p-3 rounded-2xl border border-slate-200/90 bg-slate-50 hover:bg-white hover:border-[#0d5930] hover:shadow-md transition-all active:scale-95 text-center group cursor-pointer"
                >
                  <div className="h-12 sm:h-11 sm:h-12 w-16 rounded-2xl overflow-hidden border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                    <img src={av.url} alt={av.label} className="h-full w-full object-cover" />
                  </div>
                  <span className="text-xs font-black text-slate-900 mt-2">{av.label}</span>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full mt-0.5">
                    {av.tipo}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
