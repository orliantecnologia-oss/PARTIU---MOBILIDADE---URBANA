import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  BarChart3,
  Bell,
  BellRing,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Crown,
  DollarSign,
  ExternalLink,
  History,
  Image,
  Key,
  Layers,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPin,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Sparkles,
  Truck,
  UserCheck,
  Users,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import {
  getAdminRole,
  setAdminRole,
  getRoleMetadata,
  isOwner,
  isAutenticadoAdmin,
  logoutAdmin,
  getContaAtiva,
  atualizarCredenciaisContaAtiva,
  type AdminRole,
  type AdminAccount,
} from "@/lib/admin-rbac";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/admin")({
  ssr: false,
  component: SuperAdminLayout,
});

interface ItemMenuAdmin {
  to: string;
  label: string;
  icon: any;
  exact: boolean;
  badge?: string | undefined;
  exclusivoOwner?: boolean;
}

interface GrupoMenuAdmin {
  id: string;
  titulo: string;
  exclusivoOwner?: boolean;
  itens: ItemMenuAdmin[];
}

/**
 * 🏛️ ESTRUTURA PROFISSIONAL DE NAVEGAÇÃO REORGANIZADA
 * Separação: VISÃO GERAL → OPERAÇÃO → CADASTROS & FROTA → APLICATIVO → CONFIGURAÇÕES → FINANCEIRO (OWNER) → GOVERNANÇA (OWNER)
 */
const gruposMenuBase: GrupoMenuAdmin[] = [
  {
    id: "visao_geral",
    titulo: "Visão Geral",
    itens: [{ to: "/app/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    id: "operacao",
    titulo: "Operação & Satélite",
    itens: [
      {
        to: "/app/admin/monitoramento",
        label: "Radar GPS & Starlink",
        icon: Radio,
        exact: false,
        badge: "Ao Vivo",
      },
      { to: "/app/admin/sos", label: "Central SOS & Rodovia", icon: ShieldAlert, exact: false },
      { to: "/app/admin/despacho", label: "Cargas & Despacho (PIN)", icon: Package, exact: false },
      { to: "/app/admin/historico", label: "Histórico de Rotas", icon: History, exact: false },
    ],
  },
  {
    id: "cadastros_frota",
    titulo: "Cadastros & Frota",
    itens: [
      {
        to: "/app/admin/passageiros",
        label: "Passageiros & Passe Livre",
        icon: UserCheck,
        exact: false,
      },
      { to: "/app/admin/motoristas", label: "Motoristas Cooperados", icon: Users, exact: false },
      { to: "/app/admin/frota", label: "Vans & Vistorias", icon: Truck, exact: false },
      { to: "/app/admin/linhas", label: "Linhas & Rotas", icon: MapPin, exact: false },
      { to: "/app/admin/pontos", label: "Trevos & Pontos", icon: Layers, exact: false },
      {
        to: "/app/admin/aprovacoes",
        label: "Aprovações Pendentes",
        icon: CheckCircle2,
        exact: false,
        badge: "Fila",
      },
    ],
  },
  {
    id: "app_experiencia",
    titulo: "Experiência do App",
    itens: [
      {
        to: "/app/admin/banners",
        label: "Banners & Comunicados",
        icon: Image,
        exact: false,
        badge: "CMS",
      },
      {
        to: "/app/admin/notificacoes",
        label: "Disparo de Notificações",
        icon: BellRing,
        exact: false,
        badge: "Push",
      },
      {
        to: "/app/admin/afiliados",
        label: "Afiliados & Campanhas",
        icon: ShoppingBag,
        exact: false,
      },
    ],
  },
  {
    id: "configuracoes",
    titulo: "Configurações",
    itens: [
      {
        to: "/app/admin/configuracoes",
        label: "Parâmetros Operacionais",
        icon: Sliders,
        exact: false,
      },
    ],
  },
  {
    id: "financeiro_owner",
    titulo: "Financeiro & Splits",
    exclusivoOwner: true,
    itens: [
      {
        to: "/app/admin/financeiro",
        label: "Centro Financeiro & Splits",
        icon: CreditCard,
        exact: false,
        exclusivoOwner: true,
      },
      {
        to: "/app/admin/caixa",
        label: "Fechamento de Caixa",
        icon: DollarSign,
        exact: false,
        exclusivoOwner: true,
      },
    ],
  },
];

export function SuperAdminLayout() {
  const navigate = useNavigate();
  const [roleAtiva, setRoleAtiva] = useState<AdminRole>(() => getAdminRole());
  const [contaAtiva, setContaAtiva] = useState<AdminAccount>(() => getContaAtiva());
  const [modalContaAberto, setModalContaAberto] = useState(false);
  const [novoEmail, setNovoEmail] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [mensagemConta, setMensagemConta] = useState<{
    tipo: "sucesso" | "erro";
    texto: string;
  } | null>(null);

  const [menuAbertoMobile, setMenuAbertoMobile] = useState(false);
  const [recolhido, setRecolhido] = useState(false);
  const [categoriasAbertas, setCategoriasAbertas] = useState<Record<string, boolean>>({
    visao_geral: true,
    operacao: true,
    cadastros_frota: true,
    app_experiencia: true,
    configuracoes: true,
    financeiro_owner: true,
  });

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const href = pathname;
  const isLoginRoute = pathname === "/app/admin/login" || pathname.startsWith("/app/admin/login");

  // 1. Proteger rotas filhas do Admin se não for a rota de login
  useEffect(() => {
    if (!isLoginRoute && !isAutenticadoAdmin()) {
      void navigate({ to: "/app/admin/login" });
    }
  }, [isLoginRoute, navigate]);

  // Escutar eventos de alteração de papel ou conta
  useEffect(() => {
    function onRoleChange(e: any) {
      if (e.detail?.role) {
        setRoleAtiva(e.detail.role);
        setContaAtiva(getContaAtiva());
      }
    }
    function onAccountChange() {
      setContaAtiva(getContaAtiva());
    }
    window.addEventListener("univans:role-changed", onRoleChange);
    window.addEventListener("univans:account-updated", onAccountChange);
    return () => {
      window.removeEventListener("univans:role-changed", onRoleChange);
      window.removeEventListener("univans:account-updated", onAccountChange);
    };
  }, []);

  function handleTrocarRole(novaRole: AdminRole) {
    setAdminRole(novaRole);
    setRoleAtiva(novaRole);
    setContaAtiva(getContaAtiva());
  }

  function handleLogout() {
    logoutAdmin();
    void navigate({ to: "/app/admin/login" });
  }

  function abrirModalConta() {
    const atual = getContaAtiva();
    setNovoEmail(atual.email);
    setNovoNome(atual.nome);
    setNovaSenha("");
    setMensagemConta(null);
    setModalContaAberto(true);
  }

  function handleSalvarConta(e: React.FormEvent) {
    e.preventDefault();
    setMensagemConta(null);
    const res = atualizarCredenciaisContaAtiva(novoEmail, novaSenha, novoNome);
    if (!res.sucesso) {
      setMensagemConta({ tipo: "erro", texto: res.mensagem });
      return;
    }
    setMensagemConta({ tipo: "sucesso", texto: "Credenciais e dados atualizados com sucesso!" });
    setContaAtiva(getContaAtiva());
    setTimeout(() => {
      setModalContaAberto(false);
    }, 1200);
  }

  function toggleCategoria(id: string) {
    setCategoriasAbertas((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  const roleMeta = getRoleMetadata(roleAtiva);

  // Filtrar grupos e itens de menu de acordo com a hierarquia RBAC
  const gruposMenuFiltrados = gruposMenuBase
    .filter((grupo) => {
      // Se for grupo exclusivo do OWNER, só exibe para OWNER
      if (grupo.exclusivoOwner && roleAtiva !== "OWNER") {
        return false;
      }
      return true;
    })
    .map((grupo) => ({
      ...grupo,
      itens: grupo.itens.filter((item) => {
        if (item.exclusivoOwner && roleAtiva !== "OWNER") {
          return false;
        }
        return true;
      }),
    }));

  // Se estiver na tela de login, renderiza apenas a tela limpa sem sidebar/topbar
  if (isLoginRoute) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen w-full bg-[#f8faf9] flex flex-col md:flex-row text-slate-900">
      {/* 1. Sidebar Fixa no Desktop com Botão de Recolher e Barra de Rolagem */}
      <aside
        className={`hidden md:flex flex-col justify-between bg-slate-950 text-white border-r border-slate-800 shrink-0 sticky top-0 h-screen transition-all duration-300 z-40 ${
          recolhido ? "w-20 p-2.5" : "w-64 lg:w-72 p-4"
        }`}
      >
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          {/* Logo, Identidade & Botão de Recolher */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            {!recolhido ? (
              <Link to="/app/admin" className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0d5930] to-emerald-500 text-white shadow-md shrink-0">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-black tracking-tight leading-none text-white truncate">
                    Uni<span className="text-emerald-400">Vans</span>
                  </p>
                  <span className="text-[10px] font-black tracking-wider uppercase text-amber-400 mt-0.5 block truncate">
                    {roleMeta.titulo}
                  </span>
                </div>
              </Link>
            ) : (
              <div className="mx-auto">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0d5930] to-emerald-500 text-white shadow-md">
                  <Truck className="h-6 w-6" />
                </div>
              </div>
            )}

            {/* Botão de Recolher / Expandir a Sidebar */}
            <button
              type="button"
              onClick={() => setRecolhido(!recolhido)}
              className={`flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-slate-800 cursor-pointer ${
                recolhido ? "mx-auto mt-1" : ""
              }`}
              title={recolhido ? "Expandir Menu Lateral" : "Recolher Menu Lateral"}
            >
              {recolhido ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Seletor Rápido de Hierarquia RBAC (Owner vs Admin) */}
          {!recolhido && (
            <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                Nível de Acesso Ativo (RBAC)
              </span>
              <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleTrocarRole("OWNER")}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                    roleAtiva === "OWNER"
                      ? "bg-amber-500 text-slate-950 shadow-xs font-black"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Proprietário: Vê faturamento, lucro e governança"
                >
                  <Crown className="h-3 w-3" />
                  <span>Owner</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTrocarRole("ADMIN")}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                    roleAtiva === "ADMIN"
                      ? "bg-blue-600 text-white shadow-xs font-black"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Administrador: Operação e frota sem finanças sensíveis"
                >
                  <UserCheck className="h-3 w-3" />
                  <span>Admin</span>
                </button>
              </div>
            </div>
          )}

          {/* Links de Navegação com Barra de Rolagem Suave */}
          <nav className="flex-1 overflow-y-auto pr-1 space-y-4 custom-admin-scrollbar">
            {gruposMenuFiltrados.map((grupo) => {
              const isAberta = categoriasAbertas[grupo.id] ?? true;

              return (
                <div key={grupo.id} className="space-y-1">
                  {!recolhido ? (
                    <button
                      type="button"
                      onClick={() => toggleCategoria(grupo.id)}
                      className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                    >
                      <span>{grupo.titulo}</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${
                          isAberta ? "rotate-0" : "-rotate-90"
                        }`}
                      />
                    </button>
                  ) : (
                    <div className="border-t border-slate-800/80 my-2" />
                  )}

                  {(isAberta || recolhido) && (
                    <div className="space-y-1">
                      {grupo.itens.map((item) => {
                        const Icon = item.icon;
                        const isAtivo = item.exact
                          ? href === item.to || href === item.to + "/"
                          : href.startsWith(item.to);

                        return (
                          <Link
                            key={item.to}
                            to={item.to}
                            className={`flex items-center ${
                              recolhido ? "justify-center p-2.5" : "justify-between px-3 py-2"
                            } rounded-xl text-xs font-bold transition-all group ${
                              isAtivo
                                ? "bg-gradient-to-r from-[#0d5930] to-[#13733e] text-white shadow-md shadow-[#0d5930]/30 font-black"
                                : "text-slate-300 hover:bg-slate-900 hover:text-white"
                            }`}
                            title={recolhido ? item.label : undefined}
                          >
                            <div className="flex items-center gap-3">
                              <Icon
                                className={`h-4 w-4 shrink-0 ${
                                  isAtivo
                                    ? "text-emerald-300"
                                    : "text-slate-400 group-hover:text-white"
                                }`}
                              />
                              {!recolhido && <span className="truncate">{item.label}</span>}
                            </div>

                            {!recolhido && item.badge && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                                  item.badge === "Ao Vivo"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse"
                                    : item.badge === "Fila"
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      : "bg-slate-800 text-slate-300"
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Rodapé da Sidebar */}
        <div className="pt-3 border-t border-slate-800 space-y-2 shrink-0">
          {!recolhido ? (
            <>
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[11px] font-black text-white truncate">
                    Starlink Satélite
                  </span>
                </div>
                <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md">
                  Online
                </span>
              </div>

              <Link
                to="/app"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-black text-slate-200 transition-all border border-slate-800"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Ir ao App do Passageiro
              </Link>
            </>
          ) : (
            <Link
              to="/app"
              className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 transition-all border border-slate-800"
              title="Ir ao App do Passageiro"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          )}
        </div>
      </aside>

      {/* 2. Conteúdo Principal e Topbar */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="w-full bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-8 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuAbertoMobile(true)}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${roleMeta.badgeColor}`}
              >
                {roleMeta.titulo}
              </span>

              {/* Trilha de Navegação (Breadcrumb Dinâmico) */}
              <div className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-slate-400 pl-2 border-l border-slate-200">
                <Link to="/app/admin" className="hover:text-slate-700 transition-colors">
                  UniVans Admin
                </Link>
                {href !== "/app/admin" && (
                  <>
                    <span>/</span>
                    <span className="text-slate-800 capitalize">
                      {href.replace("/app/admin/", "").replace(/_/g, " ")}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Seletor de Perfil no Topbar para testes rápidos */}
            <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => handleTrocarRole("OWNER")}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                  roleAtiva === "OWNER"
                    ? "bg-amber-500 text-slate-950 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                👑 Owner
              </button>
              <button
                type="button"
                onClick={() => handleTrocarRole("ADMIN")}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                  roleAtiva === "ADMIN"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                👤 Admin
              </button>
            </div>

            {/* Botão de Gestão de Conta & Credenciais */}
            <button
              type="button"
              onClick={abrirModalConta}
              className="flex h-9 items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 text-xs font-black text-slate-800 transition-all border border-slate-200"
              title="Gerenciar E-mail e Senha de Acesso"
            >
              <Key className="h-3.5 w-3.5 text-amber-600" />
              <span className="hidden lg:inline">{contaAtiva.email}</span>
              <span className="lg:hidden">Conta</span>
            </button>

            <Link
              to="/app/admin/monitoramento"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-[#0d5930] text-xs font-black border border-emerald-200/80 hover:bg-emerald-100 transition-all"
            >
              <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-600" />
              <span className="hidden md:inline">Radar Satélite</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="flex h-9 px-3 items-center gap-1 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-red-900 transition-all"
              title="Sair do Painel de Controle"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* 3. Drawer Mobile */}
      {menuAbertoMobile && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setMenuAbertoMobile(false)}
          />
          <div className="relative w-80 bg-slate-950 text-white flex flex-col justify-between p-5 h-full overflow-y-auto no-scrollbar shadow-2xl z-10">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d5930] text-white">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-base font-black text-white">UniVans Admin</p>
                    <span className="text-[10px] text-amber-400 font-bold uppercase">
                      {roleMeta.titulo}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMenuAbertoMobile(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Seletor Mobile */}
              <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleTrocarRole("OWNER")}
                  className={`py-2 rounded-lg text-xs font-black ${
                    roleAtiva === "OWNER" ? "bg-amber-500 text-slate-950" : "text-slate-400"
                  }`}
                >
                  Owner
                </button>
                <button
                  type="button"
                  onClick={() => handleTrocarRole("ADMIN")}
                  className={`py-2 rounded-lg text-xs font-black ${
                    roleAtiva === "ADMIN" ? "bg-blue-600 text-white" : "text-slate-400"
                  }`}
                >
                  Admin
                </button>
              </div>

              <nav className="space-y-4">
                {gruposMenuFiltrados.map((grupo) => (
                  <div key={grupo.id} className="space-y-1">
                    <p className="px-3 text-xs font-black uppercase tracking-wider text-slate-400">
                      {grupo.titulo}
                    </p>
                    {grupo.itens.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMenuAbertoMobile(false)}
                          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-900 hover:text-white"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-4 w-4 text-slate-400" />
                            <span>{item.label}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}
      {/* MODAL DE ALTERAÇÃO DE E-MAIL E SENHA DA CONTA ADMINISTRATIVA */}
      {modalContaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-[96vw] max-w-none sm:max-w-md mx-auto rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-[#0d5930]">
                <Key className="h-6 w-6 text-amber-500" />
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Minha Conta &amp; Credenciais
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Sessão ativa: {roleMeta.titulo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalContaAberto(false)}
                className="h-11 w-11 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {mensagemConta && (
              <div
                className={`p-3.5 rounded-2xl text-xs sm:text-sm flex items-center gap-2 ${
                  mensagemConta.tipo === "sucesso"
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                    : "bg-red-50 text-red-900 border border-red-200"
                }`}
              >
                {mensagemConta.tipo === "sucesso" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
                )}
                <span>{mensagemConta.texto}</span>
              </div>
            )}

            <form onSubmit={handleSalvarConta} className="space-y-3.5">
              <div>
                <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Nome do Titular
                </label>
                <input
                  type="text"
                  required
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="w-full min-h-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-base font-medium text-slate-900 outline-none focus:border-[#0d5930] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 mb-1">
                  E-mail de Login Corporativo
                </label>
                <input
                  type="email"
                  required
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)}
                  className="w-full min-h-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-base font-medium text-slate-900 outline-none focus:border-[#0d5930] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Nova Senha de Acesso (Opcional)
                </label>
                <input
                  type="password"
                  placeholder="Deixe em branco para manter a senha atual"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="w-full min-h-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-base font-medium text-slate-900 outline-none focus:border-[#0d5930] focus:bg-white transition-colors"
                />
                <span className="text-xs text-slate-400 mt-1 block">
                  Mínimo de 4 caracteres. A senha será aplicada para os próximos logins.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalContaAberto(false)}
                  className="min-h-12 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-12 px-5 py-2.5 rounded-xl bg-[#0d5930] hover:bg-emerald-800 text-white text-sm font-black shadow-xs transition-all cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
