import React, { memo } from "react";
import { Bell } from "lucide-react";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { PartiuLogo } from "@/components/common/PartiuLogo";

export interface HeaderProps {
  /** Nome do usuário para exibição personalizada */
  userName?: string;
  /** URL da foto de perfil do usuário */
  avatarUrl?: string;
  /** Nome dinâmico do aplicativo (caso queira sobrescrever o do branding) */
  appName?: string;
  /** Callback para abrir o menu lateral (Drawer) */
  onOpenDrawer?: () => void;
  /** Callback para abrir a central de notificações */
  onOpenNotifications?: () => void;
  /** Se há notificações não lidas para o badge de alerta */
  hasUnreadNotifications?: boolean;
  /** Insets para safe area customizada (opcional) */
  insets?: { top?: number; bottom?: number; left?: number; right?: number };
  /** Classes CSS adicionais */
  className?: string;
  /** Estilos inline customizados */
  style?: React.CSSProperties;
}

/**
 * Header Slim-Balanced — PARTIU Mobilidade Urbana
 * Alinhado com 100% de fidelidade com Lealt Recomendado/2.png:
 * 1. Esquerda: Avatar circular (40x40) com borda e sombra sutil.
 * 2. Centro: Logotipo vetorial oficial PartiuLogo com símbolo aerodinâmico e wordmark.
 * 3. Direita: Sino de notificações com ponto azul vibrante (#0088FF).
 */
export const Header = memo(function Header({
  userName,
  avatarUrl,
  appName,
  onOpenDrawer,
  onOpenNotifications,
  hasUnreadNotifications = true,
  insets,
  className = "",
  style,
}: HeaderProps) {
  const { nomeApp, corPrimaria, corSecundaria } = useBrandTheme();
  const nomeExibicao = (userName || "Rodrigo Gomes").trim();
  const primeiroNome = nomeExibicao.split(/\s+/)[0] || "Rodrigo";
  const iniciais = primeiroNome.substring(0, 2).toUpperCase();

  // Padding superior seguro (respeita safe-area-inset-top de dispositivos móveis)
  const safeTopPadding = insets?.top
    ? `${insets.top + 8}px`
    : "max(0.75rem, calc(env(safe-area-inset-top, 0px) + 8px))";

  return (
    <header
      className={`absolute top-0 left-0 right-0 z-30 w-full select-none pointer-events-auto bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs ${className}`}
      style={{
        paddingTop: safeTopPadding,
        paddingBottom: 8,
        paddingLeft: 16,
        paddingRight: 16,
        minHeight: 56,
        maxHeight: 68,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        ...style,
      }}
      aria-label="Cabeçalho Principal"
    >
      {/* ===================================================================== */}
      {/* 1. SEÇÃO ESQUERDA: AVATAR CIRCULAR LIMPO (PADRÃO 2.PNG)              */}
      {/* ===================================================================== */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={onOpenDrawer}
          className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer shadow-sm hover:ring-2 hover:ring-[#0088FF]/40 active:scale-95 transition-all"
          aria-label="Abrir Menu Lateral e Perfil"
          title="Abrir Menu"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={nomeExibicao}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <span className="text-[#003366] text-xs font-bold tracking-tight">
              {iniciais}
            </span>
          )}
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 2. SEÇÃO CENTRAL: LOGOTIPO VETORIAL PARTIU CENTRALIZADO               */}
      {/* ===================================================================== */}
      <div className="flex-1 flex items-center justify-center px-2">
        <PartiuLogo
          variant="full"
          size="md"
          primaryColor="#003366"
          accentColor="#0088FF"
          className="transition-transform hover:scale-102"
        />
      </div>

      {/* ===================================================================== */}
      {/* 3. SEÇÃO DIREITA: ÍCONE DE NOTIFICAÇÃO COM BADGE AZUL (#0088FF)       */}
      {/* ===================================================================== */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={onOpenNotifications}
          className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center relative shrink-0 cursor-pointer text-slate-700 hover:bg-slate-100 hover:text-[#0088FF] active:scale-95 transition-all shadow-xs"
          aria-label="Notificações"
          title="Notificações"
        >
          <Bell className="w-4.5 h-4.5 stroke-[2.2]" />

          {/* Badge azul vibrante #0088FF oficial (Lealt Recomendado/2.png) */}
          {hasUnreadNotifications && (
            <span
              className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#0088FF] ring-2 ring-white animate-pulse"
              aria-hidden="true"
            />
          )}
        </button>
      </div>
    </header>
  );
});

export default Header;
