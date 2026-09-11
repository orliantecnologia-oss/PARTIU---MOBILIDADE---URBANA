import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from "react";
import {
  Camera,
  Upload,
  User,
  CheckCircle2,
  Phone,
  Mail,
  ArrowLeft,
  X,
  Star,
  Sliders,
  ShieldCheck,
  LogOut,
  Sparkles,
  Car,
  Wind,
  VolumeX,
} from "lucide-react";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { userService, type UserProfileData } from "@/services/UserService";
import { supabaseAuthService } from "@/lib/auth/supabase-auth-service";

export const Route = createFileRoute("/app/perfil")({
  head: () => ({
    meta: [
      { title: "Editar Perfil | PARTIU" },
      {
        name: "description",
        content:
          "Gerencie seus dados cadastrais, foto de perfil e preferências de viagem no PARTIU Mobilidade Urbana.",
      },
    ],
  }),
  component: ProfilePagePartiu,
});

const AVATARES_PRESET = [
  {
    id: "av-1",
    label: "Passageiro Padrão",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "av-2",
    label: "Passageira",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "av-3",
    label: "Jovem Urbano",
    url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "av-4",
    label: "Executivo",
    url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80",
  },
];

export function ProfilePagePartiu() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { corPrimaria, corTextoPrimaria } = useBrandTheme();

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Campos do Formulário
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [rating, setRating] = useState(4.9);
  const [totalViagens, setTotalViagens] = useState(0);

  // Preferências
  const [arCondicionado, setArCondicionado] = useState(true);
  const [viagemSilenciosa, setViagemSilenciosa] = useState(false);

  const [modalFotoAberto, setModalFotoAberto] = useState(false);

  useEffect(() => {
    async function carregarPerfil() {
      try {
        const perfil = await userService.getCurrentUserProfile();
        setNome(perfil.name);
        setEmail(perfil.email);
        setTelefone(perfil.phone);
        setCpf(perfil.cpf);
        setFotoUrl(perfil.avatarUrl);
        setRating(perfil.rating);
        setTotalViagens(perfil.totalTrips);
        setArCondicionado(perfil.preferences.prefAc);
        setViagemSilenciosa(perfil.preferences.prefQuietTrip);
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
      } finally {
        setLoading(false);
      }
    }
    carregarPerfil();
  }, []);

  async function handleSalvarPerfil(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMensagemSucesso(null);
    setMensagemErro(null);

    try {
      const res = await userService.updateUserProfile({
        name: nome,
        phone: telefone,
        cpf,
        avatarUrl: fotoUrl,
      });

      if (res.success) {
        setMensagemSucesso("Perfil atualizado com sucesso!");
        setTimeout(() => setMensagemSucesso(null), 3000);
      } else {
        setMensagemErro(res.error || "Erro ao salvar perfil.");
      }
    } catch {
      setMensagemErro("Não foi possível salvar as alterações no momento.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleUploadFoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione um arquivo de imagem válido (JPG, PNG ou WEBP).");
      return;
    }

    setUploadingFoto(true);
    try {
      const res = await userService.uploadAvatar(file);
      if (res.success && res.url) {
        setFotoUrl(res.url);
        setModalFotoAberto(false);
        setMensagemSucesso("Foto de perfil atualizada no Supabase Storage!");
        setTimeout(() => setMensagemSucesso(null), 3000);
      } else {
        alert(res.error || "Falha ao enviar imagem.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingFoto(false);
    }
  }

  async function handleSelecionarAvatarPreset(url: string) {
    setFotoUrl(url);
    await userService.updateUserProfile({
      name: nome,
      phone: telefone,
      avatarUrl: url,
    });
    setModalFotoAberto(false);
    setMensagemSucesso("Foto de perfil alterada!");
    setTimeout(() => setMensagemSucesso(null), 2500);
  }

  function handleToggleAc(val: boolean) {
    setArCondicionado(val);
    userService.updateUserPreferences({ prefAc: val });
  }

  function handleToggleSilencio(val: boolean) {
    setViagemSilenciosa(val);
    userService.updateUserPreferences({ prefQuietTrip: val });
  }

  async function handleSair() {
    if (confirm("Deseja realmente sair da sua conta PARTIU?")) {
      await supabaseAuthService.signOut();
      localStorage.removeItem("partiu_enderecos_salvos_v1");
      navigate({ to: "/auth" });
    }
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 text-slate-900 pb-16">
      {/* 1. CABEÇALHO */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 py-3.5 border-b border-slate-200 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/app"
            className="flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer border border-slate-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Conta &amp; Cadastro
            </span>
            <h1 className="text-base font-bold text-slate-900">Editar Perfil</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSair}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold hover:bg-rose-100 active:scale-95 transition-all cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </header>

      {/* 2. ALERTAS */}
      {mensagemSucesso && (
        <div className="mx-4 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2.5 text-xs font-semibold shadow-xs animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {mensagemErro && (
        <div className="mx-4 mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2.5 text-xs font-semibold shadow-xs animate-in fade-in">
          <X className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{mensagemErro}</span>
        </div>
      )}

      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-6 space-y-6">
        {/* 3. CARD DE AVATAR & STATUS */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col items-center text-center relative overflow-hidden">
          <div className="relative group mb-3">
            <div
              className="w-24 h-24 rounded-full p-1 shadow-md bg-white border-2"
              style={{ borderColor: corPrimaria }}
            >
              {fotoUrl ? (
                <img
                  src={fotoUrl}
                  alt={nome}
                  className="w-full h-full object-cover rounded-full bg-slate-100"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <User className="h-10 w-10" />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setModalFotoAberto(true)}
              className="absolute bottom-0 right-0 p-2 rounded-full shadow-lg text-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
              style={{ backgroundColor: corPrimaria }}
              title="Trocar Foto"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          <h2 className="text-lg font-bold text-slate-900">{nome || "Passageiro"}</h2>
          <p className="text-xs text-slate-500">{email || "passageiro@partiu.app"}</p>

          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100 w-full justify-center">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-primary-50 rounded-full border border-amber-200 text-amber-800 text-xs font-bold">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-primary-600" />
              <span>{rating.toFixed(1)} Passageiro Verificado</span>
            </div>
            <div className="text-xs font-medium text-slate-500">
              <span className="font-bold text-slate-800">{totalViagens}</span> viagens
            </div>
          </div>
        </section>

        {/* 4. FORMULÁRIO DE DADOS CADASTRAIS */}
        <form onSubmit={handleSalvarPerfil} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <User className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Dados Pessoais</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Nome Completo
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium text-slate-900"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Celular / WhatsApp (Com DDD)
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="tel"
                required
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium text-slate-900"
                placeholder="(22) 99999-9999"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              CPF (Para emissão de recibos)
            </label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium text-slate-900"
              placeholder="000.000.000-00"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              E-mail de Cadastro
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="email"
                disabled
                value={email}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-sm font-medium text-slate-500 cursor-not-allowed"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              O e-mail é vinculado à sua credencial de acesso do Supabase.
            </span>
          </div>

          <button
            type="submit"
            disabled={salvando}
            className="w-full mt-4 py-3 rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
          >
            {salvando ? "Salvando Alterações..." : "Salvar Alterações"}
          </button>
        </form>

        {/* 5. PREFERÊNCIAS DE VIAGEM */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Sliders className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Preferências de Viagem</h3>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Wind className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Ar-condicionado Ligado</p>
                <p className="text-[11px] text-slate-500">Solicitar climatização ao motorista parceiro</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={arCondicionado}
              onChange={(e) => handleToggleAc(e.target.checked)}
              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-1 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <VolumeX className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Viagem Silenciosa</p>
                <p className="text-[11px] text-slate-500">Prefiro viajar sem som automotivo alto</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={viagemSilenciosa}
              onChange={(e) => handleToggleSilencio(e.target.checked)}
              className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
          </div>
        </section>

        {/* 6. GARANTIA DE SEGURANÇA */}
        <section className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-slate-900">Privacidade &amp; Proteção de Dados</h4>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              Seus dados são protegidos por Row-Level Security no Supabase e utilizados estritamente para identificação durante corridas urbanas e entregas expressas.
            </p>
          </div>
        </section>
      </main>

      {/* MODAL DE SELEÇÃO/UPLOAD DE FOTO */}
      {modalFotoAberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">Alterar Foto de Perfil</h3>
              <button
                type="button"
                onClick={() => setModalFotoAberto(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Botão de Upload Arquivo */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadFoto}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploadingFoto}
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                <span>{uploadingFoto ? "Enviando Imagem..." : "Carregar Foto do Aparelho"}</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase">
                  Ou escolha um avatar
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {AVATARES_PRESET.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => handleSelecionarAvatarPreset(av.url)}
                    className="p-1 rounded-2xl border border-slate-200 hover:border-slate-900 hover:scale-105 active:scale-95 transition-all cursor-pointer bg-slate-50"
                  >
                    <img
                      src={av.url}
                      alt={av.label}
                      className="w-full h-14 object-cover rounded-xl"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
