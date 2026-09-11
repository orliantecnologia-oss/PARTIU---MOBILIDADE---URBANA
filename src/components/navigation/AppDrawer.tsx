import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Clock,
  MapPin,
  CreditCard,
  Tag,
  Gift,
  Car,
  Headphones,
  Settings,
  LogOut,
  X,
  ChevronRight,
  Check,
  Copy,
  Plus,
  Star,
  Phone,
  MessageSquare,
  ExternalLink,
  Trash2,
  Lock,
  CheckCircle2,
  Bell,
  Sliders,
  Share2,
  Sparkles,
  Bike,
  ShieldCheck,
  User,
  Wind,
  VolumeX,
} from "lucide-react";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { supabaseAuthService } from "@/lib/auth/supabase-auth-service";
import { type SavedLocation } from "@/lib/passenger/passenger-ride-machine";
import { silentCatchWarn } from "@/lib/structured-logger";
import {
  userService,
  type UserProfileData,
  addressService,
  paymentMethodService,
  type TokenizedCard,
  couponService,
  type ActiveCoupon,
  driverApplicationService,
  appSettingsService,
  type GlobalAppSettings,
} from "@/services";

interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpenSecurity?: () => void;
}

export function AppDrawer({ open, onClose }: AppDrawerProps) {
  const navigate = useNavigate();
  const { nomeApp, corPrimaria, corTextoPrimaria } = useBrandTheme();

  // 1. DADOS DO PERFIL DO USUÁRIO (Sincronizado com Supabase)
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);

  // 2. CONFIGURAÇÕES GLOBAIS OPERACIONAIS (app_settings)
  const [appSettings, setAppSettings] = useState<GlobalAppSettings>(() =>
    appSettingsService.getSettingsSync()
  );

  // Modais de Ações Oficiais
  const [modalEnderecos, setModalEnderecos] = useState(false);
  const [modalPagamentos, setModalPagamentos] = useState(false);
  const [modalCupons, setModalCupons] = useState(false);
  const [modalIndique, setModalIndique] = useState(false);
  const [modalAjuda, setModalAjuda] = useState(false);
  const [modalConfiguracoes, setModalConfiguracoes] = useState(false);
  const [modalMotoristaExpress, setModalMotoristaExpress] = useState(false);

  // 3. ESTADOS DOS ENDEREÇOS SALVOS (AddressService)
  const [enderecos, setEnderecos] = useState<SavedLocation[]>(() =>
    addressService.getLocalAddresses()
  );
  const [novoEnderecoLabel, setNovoEnderecoLabel] = useState("");
  const [novoEnderecoRua, setNovoEnderecoRua] = useState("");
  const [mostrandoFormNovoEndereco, setMostrandoFormNovoEndereco] = useState(false);

  // 4. ESTADOS DOS CARTÕES (PaymentMethodService - Tokenizado)
  const [cartoes, setCartoes] = useState<TokenizedCard[]>(() =>
    paymentMethodService.getLocalCards()
  );
  const [mostrandoFormCartao, setMostrandoFormCartao] = useState(false);
  const [novoNumeroCartao, setNovoNumeroCartao] = useState("");
  const [novoTitular, setNovoTitular] = useState("");
  const [novaValidade, setNovaValidade] = useState("");
  const [novoCvv, setNovoCvv] = useState("");
  const [salvandoCartao, setSalvandoCartao] = useState(false);

  // 5. ESTADOS DE CUPONS (CouponService - campaigns_coupons)
  const [cupons, setCupons] = useState<ActiveCoupon[]>(() =>
    couponService.getLocalCoupons()
  );
  const [inputCupom, setInputCupom] = useState("");
  const [validandoCupom, setValidandoCupom] = useState(false);
  const [cupomMensagem, setCupomMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [cupomCopiado, setCupomCopiado] = useState<string | null>(null);

  // 6. PREFERÊNCIAS DE VIAGEM & NOTIFICAÇÃO (UserService com Debounce)
  const [pushNotificacoes, setPushNotificacoes] = useState(true);
  const [whatsappAlertas, setWhatsappAlertas] = useState(true);
  const [arCondicionado, setArCondicionado] = useState(true);
  const [viagemSilenciosa, setViagemSilenciosa] = useState(false);

  // 7. FORMULÁRIO DE CAPTAÇÃO DE MOTORISTA EXPRESS
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [driverVehicleType, setDriverVehicleType] = useState<"CARRO" | "MOTO">("CARRO");
  const [driverVehicleModel, setDriverVehicleModel] = useState("");
  const [driverPlate, setDriverPlate] = useState("");
  const [enviandoCandidatura, setEnviandoCandidatura] = useState(false);
  const [candidaturaSucesso, setCandidaturaSucesso] = useState(false);

  // Carregar dados reais ao abrir o Drawer
  useEffect(() => {
    if (open) {
      void (async () => {
        const perfil = await userService.getCurrentUserProfile();
        setUserProfile(perfil);
        setPushNotificacoes(perfil.preferences.prefPushNotifications);
        setWhatsappAlertas(perfil.preferences.prefWhatsappAlerts);
        setArCondicionado(perfil.preferences.prefAc);
        setViagemSilenciosa(perfil.preferences.prefQuietTrip);

        if (perfil.name) setDriverName(perfil.name);
        if (perfil.phone) setDriverPhone(perfil.phone);

        const ends = await addressService.getAddresses(perfil.id);
        setEnderecos(ends);

        const cards = await paymentMethodService.getCards(perfil.id);
        setCartoes(cards);

        const cups = await couponService.getActiveCoupons(perfil.id);
        setCupons(cups);

        const settings = await appSettingsService.fetchSettings();
        setAppSettings(settings);
      })();
    }
  }, [open]);

  // Tecla Escape para fechar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Salvar Endereços
  async function handleAdicionarEndereco() {
    if (!novoEnderecoLabel.trim() || !novoEnderecoRua.trim()) return;
    const atualizados = await addressService.addAddress(
      {
        label: novoEnderecoLabel.trim(),
        endereco: novoEnderecoRua.trim(),
      },
      userProfile?.id
    );
    setEnderecos(atualizados);
    setNovoEnderecoLabel("");
    setNovoEnderecoRua("");
    setMostrandoFormNovoEndereco(false);
  }

  async function handleRemoverEndereco(id: string) {
    const atualizados = await addressService.removeAddress(id, userProfile?.id);
    setEnderecos(atualizados);
  }

  // Salvar Cartão Tokenizado
  async function handleAdicionarCartao() {
    if (!novoNumeroCartao.trim() || !novoTitular.trim()) return;
    setSalvandoCartao(true);
    try {
      const res = await paymentMethodService.addCardTokenized(
        {
          numeroCartao: novoNumeroCartao,
          titular: novoTitular,
          validade: novaValidade,
          cvv: novoCvv,
        },
        userProfile?.id
      );
      if (res.success) {
        setCartoes(res.cards);
        setNovoNumeroCartao("");
        setNovoTitular("");
        setNovaValidade("");
        setNovoCvv("");
        setMostrandoFormCartao(false);
      } else {
        alert(res.error || "Erro ao salvar cartão");
      }
    } finally {
      setSalvandoCartao(false);
    }
  }

  async function handleDefinirCartaoPadrao(id: string) {
    const atualizados = await paymentMethodService.setDefaultCard(id, userProfile?.id);
    setCartoes(atualizados);
  }

  async function handleRemoverCartao(id: string) {
    const atualizados = await paymentMethodService.removeCard(id, userProfile?.id);
    setCartoes(atualizados);
  }

  // Aplicar Cupom com Validação no Supabase
  async function handleAplicarCupom() {
    if (!inputCupom.trim()) return;
    setValidandoCupom(true);
    setCupomMensagem(null);
    try {
      const res = await couponService.redeemCoupon(inputCupom, userProfile?.id);
      if (res.success) {
        setCupons(res.coupons);
        setInputCupom("");
        setCupomMensagem({ tipo: "sucesso", texto: res.message });
      } else {
        setCupomMensagem({ tipo: "erro", texto: res.message });
      }
    } finally {
      setValidandoCupom(false);
      setTimeout(() => setCupomMensagem(null), 3500);
    }
  }

  function copiarCodigo(texto: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(texto);
      setCupomCopiado(texto);
      setTimeout(() => setCupomCopiado(null), 2000);
    }
  }

  // Toggles de Preferências com Debounce no Supabase
  function handleTogglePush(val: boolean) {
    setPushNotificacoes(val);
    userService.updateUserPreferences({ prefPushNotifications: val });
  }

  function handleToggleWhatsapp(val: boolean) {
    setWhatsappAlertas(val);
    userService.updateUserPreferences({ prefWhatsappAlerts: val });
  }

  function handleToggleAc(val: boolean) {
    setArCondicionado(val);
    userService.updateUserPreferences({ prefAc: val });
  }

  function handleToggleSilencio(val: boolean) {
    setViagemSilenciosa(val);
    userService.updateUserPreferences({ prefQuietTrip: val });
  }

  // Compartilhamento Dinâmico de Indicação (UUID + Native Share API)
  async function compartilharIndicacao() {
    const userId = userProfile?.id || "pax-convite";
    const referralLink = `https://partiu.app/convite?ref=${encodeURIComponent(userId)}`;
    const texto = `Vá de ${nomeApp}! Use meu link de indicação para ganhar R$ 10 de desconto na sua primeira corrida: ${referralLink}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Convite ${nomeApp} Mobilidade`,
          text: texto,
          url: referralLink,
        });
        return;
      } catch (err) { silentCatchWarn("AppDrawer", err); }
    }

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(whatsappUrl, "_blank");
  }

  // Envio de Candidatura Expressa de Motorista
  async function handleEnviarCandidatura(e: React.FormEvent) {
    e.preventDefault();
    if (!driverName || !driverPhone || !driverPlate) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    setEnviandoCandidatura(true);
    try {
      const res = await driverApplicationService.submitApplication({
        name: driverName,
        phone: driverPhone,
        vehicleType: driverVehicleType,
        vehicleModel: driverVehicleModel || (driverVehicleType === "MOTO" ? "Honda CG 160" : "Carro Sedan"),
        vehiclePlate: driverPlate,
      });

      if (res.success) {
        setCandidaturaSucesso(true);
        setTimeout(() => {
          setCandidaturaSucesso(false);
          setModalMotoristaExpress(false);
        }, 3000);
      }
    } finally {
      setEnviandoCandidatura(false);
    }
  }

  // Logout Oficial
  async function handleSair() {
    if (confirm("Deseja realmente sair da sua conta PARTIU?")) {
      onClose();
      await supabaseAuthService.signOut();
      localStorage.removeItem("partiu_enderecos_salvos_v1");
      navigate({ to: "/auth" });
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-center text-slate-900">
      {/* Backdrop com desfoque */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Painel do Drawer */}
      <aside
        className="relative w-full max-w-sm h-full bg-white shadow-2xl z-10 flex flex-col justify-between overflow-y-auto transform transition-transform duration-300 ease-out border-r border-slate-100"
        aria-label="Menu do Usuário"
      >
        {/* Topo do Drawer */}
        <div>
          {/* CABEÇALHO DO PERFIL */}
          <div className="p-5 pb-4 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className="w-13 h-13 rounded-full p-0.5 shadow-sm bg-white border-2 shrink-0"
                style={{ borderColor: corPrimaria }}
              >
                {userProfile?.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt={userProfile.name}
                    className="w-full h-full object-cover rounded-full bg-slate-100"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <User className="h-6 w-6" />
                  </div>
                )}
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    {userProfile?.name || "Rodrigo"}
                  </h2>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary-50 border border-amber-200 text-[10px] font-bold text-amber-800">
                    <Star className="h-2.5 w-2.5 fill-amber-400 text-primary-600" />
                    {(userProfile?.rating || 4.9).toFixed(1)}
                  </span>
                </div>

                <Link
                  to="/app/perfil"
                  onClick={onClose}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors mt-0.5 text-left inline-flex items-center gap-1"
                >
                  Editar perfil
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* SEÇÃO 1: USO DIÁRIO (ESSENCIAIS) */}
          <div className="p-4 py-3 border-b border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-1.5">
              Uso Diário
            </span>
            <nav className="space-y-0.5">
              <Link
                to="/app/bilhetes"
                onClick={onClose}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 active:scale-[0.99] transition-all text-slate-800 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-200 transition-colors">
                    <Clock className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold">Minhas Viagens e Entregas</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
              </Link>

              <button
                type="button"
                onClick={() => setModalEnderecos(true)}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 active:scale-[0.99] transition-all text-slate-800 group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-200 transition-colors">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block leading-none">Meus Endereços</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {enderecos.length} locais sincronizados
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => setModalPagamentos(true)}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 active:scale-[0.99] transition-all text-slate-800 group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-200 transition-colors">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block leading-none">Pagamentos</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      PIX direto e cartões tokenizados
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => setModalCupons(true)}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 active:scale-[0.99] transition-all text-slate-800 group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-200 transition-colors">
                    <Tag className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block leading-none">Meus Cupons</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {cupons.length} vouchers disponíveis
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
              </button>
            </nav>
          </div>

          {/* SEÇÃO 2: CRESCIMENTO E SUPORTE */}
          <div className="p-4 py-3 border-b border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-1.5">
              Crescimento &amp; Suporte
            </span>
            <nav className="space-y-0.5">
              <button
                type="button"
                onClick={() => setModalIndique(true)}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 active:scale-[0.99] transition-all text-slate-800 group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary-50 text-primary-700 group-hover:bg-amber-100 transition-colors">
                    <Gift className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block leading-none">Indique e Ganhe</span>
                    <span className="text-[10px] text-amber-700 mt-1 block">
                      Ganhe R$ 10 por indicação
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
              </button>

              {/* Card Destaque: Seja um Motorista Partiu */}
              <div
                onClick={() => setModalMotoristaExpress(true)}
                className="w-full my-2 p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between border border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2.5 rounded-xl shadow-xs shrink-0"
                    style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
                  >
                    <Car className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black leading-tight">
                        Seja Motorista Parceiro
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        DIÁRIA FIXA
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-300 mt-0.5 block leading-tight">
                      Taxa Zero: 100% do valor da corrida é seu
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
              </div>

              <button
                type="button"
                onClick={() => setModalAjuda(true)}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 active:scale-[0.99] transition-all text-slate-800 group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-200 transition-colors">
                    <Headphones className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold">Ajuda &amp; Suporte 24h</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => setModalConfiguracoes(true)}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 active:scale-[0.99] transition-all text-slate-800 group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-200 transition-colors">
                    <Settings className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold">Configurações do App</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
              </button>
            </nav>
          </div>
        </div>

        {/* RODAPÉ DO MENU */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mb-3">
            <span>PARTIU v{appSettings.appVersion || "1.0.0"}</span>
            <span>Itaperuna, RJ</span>
          </div>

          <button
            type="button"
            onClick={handleSair}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-slate-200 text-rose-600 font-bold text-xs hover:bg-rose-50 hover:border-rose-200 active:scale-[0.99] transition-all shadow-2xs cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair da Conta</span>
          </button>
        </div>
      </aside>

      {/* =========================================================================
          MODAIS INTEGRADOS COM OS SERVIÇOS
         ========================================================================= */}

      {/* 1. MODAL MEUS ENDEREÇOS */}
      {modalEnderecos && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-slate-800" />
                <h3 className="text-sm font-bold text-slate-900">Meus Endereços Salvos</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalEnderecos(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {enderecos.map((end) => (
                <div
                  key={end.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 text-slate-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">{end.label}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{end.endereco}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoverEndereco(end.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    title="Remover endereço"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {mostrandoFormNovoEndereco ? (
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <input
                  type="text"
                  placeholder="Nome do local (Ex: Casa, Trabalho)"
                  value={novoEnderecoLabel}
                  onChange={(e) => setNovoEnderecoLabel(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800"
                />
                <input
                  type="text"
                  placeholder="Endereço completo com número"
                  value={novoEnderecoRua}
                  onChange={(e) => setNovoEnderecoRua(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMostrandoFormNovoEndereco(false)}
                    className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAdicionarEndereco}
                    className="flex-1 py-2 text-xs font-bold text-white rounded-xl shadow-xs cursor-pointer"
                    style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMostrandoFormNovoEndereco(true)}
                className="w-full mt-4 py-2.5 px-3 rounded-xl border border-dashed border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-50 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Adicionar Novo Endereço
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. MODAL PAGAMENTOS (Tokenizado - Zero Custódia) */}
      {modalPagamentos && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-slate-800" />
                <h3 className="text-sm font-bold text-slate-900">Métodos de Pagamento</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalPagamentos(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Opção PIX Direto */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-600 text-white font-black text-[10px]">
                  PIX
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-900">PIX Direto na Corrida</p>
                  <p className="text-[10px] text-emerald-700">QR Code gerado ao desembarcar</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 px-2 py-0.5 rounded-full bg-emerald-100">
                Ativo
              </span>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {cartoes.map((cartao) => (
                <div
                  key={cartao.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    cartao.padrao
                      ? "bg-slate-900 text-white border-slate-800"
                      : "bg-slate-50 text-slate-800 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-xs font-bold uppercase">
                        •••• •••• •••• {cartao.ultimosDigitos}
                      </p>
                      <p className={`text-[10px] uppercase ${cartao.padrao ? "text-slate-300" : "text-slate-400"}`}>
                        {cartao.bandeira} • {cartao.titular}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!cartao.padrao && (
                      <button
                        type="button"
                        onClick={() => handleDefinirCartaoPadrao(cartao.id)}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-900 px-1.5 py-0.5 rounded cursor-pointer"
                      >
                        Padrão
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoverCartao(cartao.id)}
                      className={`p-1 cursor-pointer ${cartao.padrao ? "text-slate-400 hover:text-rose-400" : "text-slate-400 hover:text-rose-600"}`}
                      title="Remover cartão"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {mostrandoFormCartao ? (
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <input
                  type="text"
                  placeholder="Número do cartão"
                  maxLength={19}
                  value={novoNumeroCartao}
                  onChange={(e) => setNovoNumeroCartao(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800"
                />
                <input
                  type="text"
                  placeholder="Nome impresso no cartão"
                  value={novoTitular}
                  onChange={(e) => setNovoTitular(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="MM/AA"
                    maxLength={5}
                    value={novaValidade}
                    onChange={(e) => setNovaValidade(e.target.value)}
                    className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800"
                  />
                  <input
                    type="password"
                    placeholder="CVV"
                    maxLength={4}
                    value={novoCvv}
                    onChange={(e) => setNovoCvv(e.target.value)}
                    className="w-20 text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800"
                  />
                </div>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setMostrandoFormCartao(false)}
                    className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={salvandoCartao}
                    onClick={handleAdicionarCartao}
                    className="flex-1 py-2 text-xs font-bold text-white rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                    style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
                  >
                    <Lock className="h-3 w-3" />
                    {salvandoCartao ? "Tokenizando..." : "Salvar Cartão"}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 text-center mt-1">
                  Transação protegida. Não armazenamos o código de segurança (CVV).
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMostrandoFormCartao(true)}
                className="w-full mt-4 py-2.5 px-3 rounded-xl border border-dashed border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-50 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Vincular Novo Cartão de Crédito
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. MODAL MEUS CUPONS (campaigns_coupons) */}
      {modalCupons && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-slate-800" />
                <h3 className="text-sm font-bold text-slate-900">Cupons Promocionais</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalCupons(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Input de Inserção de Cupom */}
            <div className="space-y-1 mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Digite o código (ex: PARTIU20)"
                  value={inputCupom}
                  onChange={(e) => setInputCupom(e.target.value.toUpperCase())}
                  className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 uppercase font-bold tracking-wider focus:outline-none focus:border-slate-800"
                />
                <button
                  type="button"
                  disabled={validandoCupom}
                  onClick={handleAplicarCupom}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
                >
                  {validandoCupom ? "Validando..." : "Aplicar"}
                </button>
              </div>

              {cupomMensagem && (
                <p
                  className={`text-[11px] font-bold mt-1.5 ${
                    cupomMensagem.tipo === "sucesso" ? "text-emerald-600" : "text-rose-500"
                  }`}
                >
                  {cupomMensagem.texto}
                </p>
              )}
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {cupons.map((cupom) => (
                <div
                  key={cupom.id}
                  className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 to-amber-50/40 border border-amber-200/60 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-primary-50 text-amber-900 border border-amber-200">
                      {cupom.codigo}
                    </span>
                    <button
                      type="button"
                      onClick={() => copiarCodigo(cupom.codigo)}
                      className="text-slate-500 hover:text-slate-900 p-1 cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                    >
                      {cupomCopiado === cupom.codigo ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-600">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copiar
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs font-bold text-slate-800 mt-2">{cupom.descontoDescricao}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{cupom.expiracao}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL INDIQUE E GANHE (Dynamic Share API & UUID) */}
      {modalIndique && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 text-center">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setModalIndique(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="w-14 h-14 mx-auto rounded-full bg-primary-50 text-primary-700 flex items-center justify-center mb-3">
              <Gift className="h-7 w-7" />
            </div>

            <h3 className="text-base font-bold text-slate-900">Indique Amigos e Ganhe R$ 10</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Compartilhe seu link exclusivo com amigos em Itaperuna. Quando eles fizerem a primeira corrida, você ganha R$ 10 em descontos!
            </p>

            <div className="my-4 p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block text-left">
                  Seu Código Pessoal
                </span>
                <span className="text-sm font-mono font-black text-slate-900">
                  {userProfile?.name ? (userProfile.name.split(" ")[0] || "PARTIU").toUpperCase() + "10" : "PARTIU10"}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  copiarCodigo(
                    userProfile?.name ? (userProfile.name.split(" ")[0] || "PARTIU").toUpperCase() + "10" : "PARTIU10"
                  )
                }
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 cursor-pointer"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={compartilharIndicacao}
              className="w-full py-3 rounded-xl font-bold text-xs shadow-md transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
              style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
            >
              <Share2 className="h-4 w-4" />
              Compartilhar no WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* 5. MODAL AJUDA E SUPORTE (Consumo dinâmico de app_settings) */}
      {modalAjuda && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-slate-800" />
                <h3 className="text-sm font-bold text-slate-900">Central de Ajuda 24h</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalAjuda(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <a
                href={`https://wa.me/55${appSettings.whatsappSupport.replace(/\D/g, "")}?text=${encodeURIComponent("Olá, preciso de suporte no app PARTIU!")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between hover:bg-emerald-100/70 transition-all text-emerald-900 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">WhatsApp Suporte 24h</h4>
                    <p className="text-[10px] text-emerald-700">{appSettings.whatsappSupport}</p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
              </a>

              <a
                href={`tel:${appSettings.phoneEmergency.replace(/\D/g, "")}`}
                className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between hover:bg-rose-100/70 transition-all text-rose-900 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-rose-600 text-white">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Emergência e Segurança</h4>
                    <p className="text-[10px] text-rose-700">Polícia Militar ({appSettings.phoneEmergency})</p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-rose-600 group-hover:translate-x-0.5 transition-transform" />
              </a>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Dúvidas Frequentes</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  • <strong>Como funciona o PIN?</strong> No início da corrida ou entrega, informe o PIN de 4 dígitos ao motorista para validação segura.
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  • <strong>Formas de pagamento:</strong> Você pode pagar diretamente em dinheiro, via PIX QR Code gerado pelo motorista ou cartão cadastrado.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL CONFIGURAÇÕES (Debounce no UserService) */}
      {modalConfiguracoes && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-slate-800" />
                <h3 className="text-sm font-bold text-slate-900">Configurações &amp; Conforto</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalConfiguracoes(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Notificações
                </span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Bell className="h-4 w-4 text-slate-500" />
                    <span>Notificações Push no Celular</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushNotificacoes}
                    onChange={(e) => handleTogglePush(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="h-4 w-4 text-slate-500" />
                    <span>Alertas de Chegada via WhatsApp</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={whatsappAlertas}
                    onChange={(e) => handleToggleWhatsapp(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-3">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Preferências de Viagem
                </span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Wind className="h-4 w-4 text-blue-500" />
                    <span>Sempre solicitar ar-condicionado</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={arCondicionado}
                    onChange={(e) => handleToggleAc(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <VolumeX className="h-4 w-4 text-purple-500" />
                    <span>Preferência por viagem silenciosa</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={viagemSilenciosa}
                    onChange={(e) => handleToggleSilencio(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalConfiguracoes(false)}
                className="w-full mt-2 py-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL CAPTAÇÃO MOTORISTA EXPRESS (SaaS Diária Fixa) */}
      {modalMotoristaExpress && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-700">
                  Modelo Diária Fixa • 0% Taxa
                </span>
                <h3 className="text-sm font-bold text-slate-900">Quero Ser Motorista Partiu</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalMotoristaExpress(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {candidaturaSucesso ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900">Candidatura Enviada!</h4>
                <p className="text-xs text-slate-500">
                  Nossa equipe de Itaperuna entrará em contato via WhatsApp para liberação imediata da sua conta.
                </p>
              </div>
            ) : (
              <form onSubmit={handleEnviarCandidatura} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Seu Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800 font-medium"
                    placeholder="Nome"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    WhatsApp para Contato
                  </label>
                  <input
                    type="tel"
                    required
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800 font-medium"
                    placeholder="(22) 99999-9999"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDriverVehicleType("CARRO")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      driverVehicleType === "CARRO"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <Car className="h-3.5 w-3.5" />
                    Carro
                  </button>
                  <button
                    type="button"
                    onClick={() => setDriverVehicleType("MOTO")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      driverVehicleType === "MOTO"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <Bike className="h-3.5 w-3.5" />
                    Moto
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Modelo do Veículo
                  </label>
                  <input
                    type="text"
                    required
                    value={driverVehicleModel}
                    onChange={(e) => setDriverVehicleModel(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800 font-medium"
                    placeholder="Ex: Onix 1.0 ou CG 160"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Placa do Veículo
                  </label>
                  <input
                    type="text"
                    required
                    value={driverPlate}
                    onChange={(e) => setDriverPlate(e.target.value.toUpperCase())}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800 font-mono uppercase font-bold"
                    placeholder="BRA2E19"
                  />
                </div>

                <button
                  type="submit"
                  disabled={enviandoCandidatura}
                  className="w-full py-3 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: corPrimaria, color: corTextoPrimaria }}
                >
                  {enviandoCandidatura ? "Enviando Dados..." : "Enviar Candidatura Expressa"}
                </button>

                <p className="text-[10px] text-slate-400 text-center">
                  Você também pode fazer o cadastro completo com CNH em{" "}
                  <Link to="/cadastro-motorista" onClick={onClose} className="underline font-bold text-slate-600">
                    cadastro completo
                  </Link>.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
