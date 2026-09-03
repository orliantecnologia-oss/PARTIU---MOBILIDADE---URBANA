import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Compass,
  CreditCard,
  MapPin,
  QrCode,
  Radio,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Truck,
  User,
  Users,
  Wifi,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UniVans | Cooperativa Oficial de Transporte & Viagens" },
      {
        name: "description",
        content:
          "Plataforma oficial da UniVans: consulte linhas, compre passagens com PIX ou Cartão e acompanhe sua van em tempo real com Wi-Fi Starlink.",
      },
    ],
  }),
  component: UpgradedCoopLanding,
});

const SLIDES_UNIVANS = [
  {
    id: 1,
    imagem: "/slides/slide-1.png",
    titulo: "Acompanhe tudo em tempo real",
    ctaLink: "/app/viagem",
  },
  {
    id: 2,
    imagem: "/slides/slide-2.jpg",
    titulo: "Gestão completa da sua frota de vans",
    ctaLink: "/app/linhas",
  },
  {
    id: 3,
    imagem: "/slides/slide-3.jpg",
    titulo: "Mais segurança, mais confiança",
    ctaLink: "/cadastro-motorista",
  },
];

const ROTAS_RAPIDAS = [
  { nome: "Maceió ➔ Arapiraca", preco: "R$ 35" },
  { nome: "Tapera ➔ Toritama (Moda)", preco: "R$ 60" },
  { nome: "Maceió ➔ Caruaru", preco: "R$ 55" },
];

export function UpgradedCoopLanding() {
  const [slideAtual, setSlideAtual] = useState(0);

  // Rotação automática suave dos slides a cada 6 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setSlideAtual((prev) => (prev + 1) % SLIDES_UNIVANS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  function proximoSlide() {
    setSlideAtual((prev) => (prev + 1) % SLIDES_UNIVANS.length);
  }

  function slideAnterior() {
    setSlideAtual((prev) => (prev - 1 + SLIDES_UNIVANS.length) % SLIDES_UNIVANS.length);
  }

  const slideAtivo = SLIDES_UNIVANS[slideAtual]!;

  return (
    <div className="min-h-screen bg-[#f8faf8] text-slate-900 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-[#0d5930] selection:text-white">
      {/* 1. CURVAS ORGÂNICAS EM VERDE & DOURADO */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-100/60 via-amber-100/40 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#0d5930]/10 via-emerald-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* 2. HEADER INTUITIVO COM "ACESSAR MINHA CONTA" */}
      <header className="relative z-30 w-full px-4 sm:px-6 py-3.5 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-xl sm:max-w-2xl mx-auto flex items-center justify-between">
          {/* Logo Oficial da UniVans */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-10 px-2 py-1 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
              <img
                src="/univans-logo.jpg"
                alt="UniVans Coop Alagoas"
                className="h-8 w-auto object-contain"
              />
            </div>
            <div>
              <p className="text-sm font-black tracking-tight text-slate-900 leading-tight">
                UniVans <span className="text-[#0d5930]">Coop</span>
              </p>
              <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 block">
                Alagoas • Oficial
              </span>
            </div>
          </Link>

          {/* Botões do Topo: Admin + Acessar Minha Conta */}
          <div className="flex items-center gap-2">
            <Link
              to="/app/admin"
              className="hidden sm:flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition-all border border-slate-200"
            >
              <span>Admin</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>

            <Link
              to="/auth"
              search={{ redirect: "/app" }}
              className="flex items-center gap-1.5 rounded-xl bg-[#0d5930] hover:bg-[#0a4626] px-3 sm:px-4 py-2 text-xs font-black text-white shadow-sm shadow-[#0d5930]/20 transition-all active:scale-95 shrink-0"
            >
              <User className="h-3.5 w-3.5 text-amber-300 shrink-0" />
              <span>
                <span className="sm:hidden">Minha Conta</span>
                <span className="hidden sm:inline">Acessar Minha Conta</span>
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* 3. CONTEÚDO PRINCIPAL COMPACTO E INTUITIVO */}
      <main className="relative z-20 max-w-xl sm:max-w-2xl w-full mx-auto px-4 py-3 sm:py-2.5 sm:py-3 flex-1 flex flex-col justify-center space-y-3.5">
        {/* Micro Badge de Status da Frota Responsivo */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-emerald-50 text-[#0d5930] border border-emerald-200 text-[10px] sm:text-xs font-black min-w-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">
              <span className="sm:hidden">Frota Starlink • AL &amp; PE</span>
              <span className="hidden sm:inline">
                Frota Conectada Starlink • Alagoas &amp; Pernambuco
              </span>
            </span>
          </div>

          <Link
            to="/app/linhas"
            className="text-[10px] sm:text-xs font-black text-[#0d5930] hover:underline flex items-center gap-0.5 shrink-0"
          >
            <span>Ver Horários</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* SLIDE CLICÁVEL COM AS IMAGENS OFICIAIS */}
        <div className="space-y-1.5">
          <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-white aspect-[16/9] group">
            {SLIDES_UNIVANS.map((slide, idx) => (
              <Link
                key={slide.id}
                to={slide.ctaLink}
                className={`absolute inset-0 transition-opacity duration-700 cursor-pointer ${
                  idx === slideAtual ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                }`}
              >
                <img
                  src={slide.imagem}
                  alt={slide.titulo}
                  className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-500"
                />
              </Link>
            ))}

            {/* Setas Sutis de Navegação */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                slideAnterior();
              }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-white/80 backdrop-blur-md text-slate-800 shadow-md border border-slate-200 flex items-center justify-center hover:bg-white active:scale-90 transition-all opacity-0 group-hover:opacity-100"
              aria-label="Slide anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                proximoSlide();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-white/80 backdrop-blur-md text-slate-800 shadow-md border border-slate-200 flex items-center justify-center hover:bg-white active:scale-90 transition-all opacity-0 group-hover:opacity-100"
              aria-label="Próximo slide"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Indicador Horizontal Ultra-Lite Abaixo da Imagem */}
          <div className="flex items-center justify-center gap-1.5 pt-0.5">
            {SLIDES_UNIVANS.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setSlideAtual(idx)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  idx === slideAtual ? "w-5 bg-[#0d5930]" : "w-1.5 bg-slate-300 hover:bg-slate-400"
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* 4. ATALHO RÁPIDO PARA DESTINOS MAIS PROCURADOS */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-black text-slate-600 px-1">
            <span>Rotas Mais Procuradas</span>
            <span className="text-emerald-700 font-bold">Saídas Hoje</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {ROTAS_RAPIDAS.map((rota, i) => (
              <Link
                key={i}
                to="/app/linhas"
                className="p-2 rounded-2xl bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 transition-all shadow-xs text-center group"
              >
                <p className="text-[10px] font-black text-slate-900 group-hover:text-[#0d5930] truncate">
                  {rota.nome}
                </p>
                <span className="text-[10px] font-bold text-amber-600 block mt-0.5">
                  {rota.preco}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* 5. OS BOTÕES PRINCIPAIS DE AÇÃO (CÁPSULAS ELEGANTES & COMPACTAS) */}
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Botão 1: Comprar Passagens (Cápsula Esmeralda Refinada) */}
            <Link
              to="/app/linhas"
              className="breathe-btn-1 group relative flex h-14 items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-[#072414] via-[#0d5930] to-[#071833] px-3.5 text-white border border-emerald-500/30 shadow-md shadow-[#0d5930]/15 hover:shadow-lg hover:border-emerald-400 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white shrink-0 group-hover:scale-105 transition-transform">
                  <Ticket className="h-4 w-4 text-amber-300" />
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white truncate">
                      Comprar Passagens
                    </span>
                    <span className="text-[9px] font-black uppercase text-amber-300 bg-amber-400/20 px-1.5 py-0.2 rounded border border-amber-300/30 shrink-0">
                      PIX
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-200/80 font-medium truncate">
                    Bilhete digital no celular na hora
                  </p>
                </div>
              </div>
              <div className="breathe-arrow flex h-7 w-7 items-center justify-center rounded-xl bg-white/10 group-hover:bg-white text-white group-hover:text-[#0d5930] shrink-0 transition-all">
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>

            {/* Botão 2: Sou Motorista (Cápsula Acrílica Refinada) */}
            <Link
              to="/cadastro-motorista"
              className="breathe-btn-2 group flex h-14 items-center justify-between rounded-2xl bg-white hover:bg-slate-50/90 px-3.5 text-slate-900 border border-slate-200/90 hover:border-[#0d5930]/50 shadow-xs hover:shadow-sm active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 shrink-0 group-hover:scale-105 transition-transform">
                  <Truck className="h-4 w-4" />
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-900 group-hover:text-[#0d5930] transition-colors truncate">
                      Sou Motorista
                    </span>
                    <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-100/80 px-1.5 py-0.2 rounded shrink-0">
                      8,5%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium truncate">
                    Cadastrar van &amp; Split PIX diário
                  </p>
                </div>
              </div>
              <div className="breathe-arrow flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-[#0d5930] group-hover:text-white shrink-0 transition-all">
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          </div>

          {/* Botão 3: Passe Livre Governamental (Barra Compacta Elegante) */}
          <Link
            to="/cadastro-gratuidade"
            className="breathe-btn-3 group flex h-11 items-center justify-between px-3.5 rounded-xl bg-gradient-to-r from-emerald-50/70 via-white to-amber-50/50 border border-emerald-200 hover:border-[#0d5930] shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <ShieldCheck className="h-4 w-4 text-[#0d5930] shrink-0" />
              <div className="flex items-center gap-2 min-w-0 truncate">
                <span className="text-xs font-black text-slate-900 truncate">
                  Passe Livre Social
                </span>
                <span className="text-[9px] font-bold text-[#0d5930] bg-emerald-100 px-1.5 py-0.2 rounded truncate">
                  2 Vagas/Van por Lei
                </span>
                <span className="hidden sm:inline text-[10px] text-slate-500 font-medium truncate">
                  Idosos 60+, PCD e Estudantes
                </span>
              </div>
            </div>
            <span className="breathe-arrow text-[11px] font-black text-[#0d5930] flex items-center gap-0.5 shrink-0 transition-transform">
              Solicitar <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      </main>

      {/* 6. FOOTER COMPACTO & MINIMALISTA */}
      <footer className="relative z-30 w-full border-t border-slate-200 bg-white py-2.5 px-4 text-center text-[11px] font-bold text-slate-500">
        <div className="max-w-xl sm:max-w-2xl mx-auto flex items-center justify-between">
          <span>© 2026 UniVans Coop Alagoas</span>
          <div className="flex items-center gap-3">
            <Link to="/app/admin" className="hover:text-[#0d5930] transition-colors">
              Painel Admin
            </Link>
            <span>•</span>
            <Link to="/app/viagem" className="text-[#0d5930] hover:underline">
              Radar Satelital
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
