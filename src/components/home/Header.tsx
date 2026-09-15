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
  /** Quantidade exata de notificações não lidas para badge numérico */
  unreadCount?: number;
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
 * 3. Direita: Sino de notificações com badge numérico em tempo real.
 */
export const Header = memo(function Header({
  userName,
  avatarUrl,
  appName,
  onOpenDrawer,
  onOpenNotifications,
  hasUnreadNotifications = false,
  unreadCount = 0,
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

  const hasUnread = unreadCount > 0 || hasUnreadNotifications;

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
          className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer shadow-sm hover:ring-2 hover:ring-brand-primary-vibrant/40 active:scale-95 transition-all"
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
            <span className="text-brand-primary-deep text-xs font-bold tracking-tight">
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
          primaryColor="var(--brand-primary-deep, #003366)"
          accentColor="var(--brand-primary-vibrant, #0088FF)"
          className="transition-transform hover:scale-102"
        />
      </div>

      {/* ===================================================================== */}
      {/* 3. SEÇÃO DIREITA: ÍCONE DE NOTIFICAÇÃO COM BADGE NUMÉRICO VERMELHO     */}
      {/* ===================================================================== */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={onOpenNotifications}
          className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center relative shrink-0 cursor-pointer text-slate-700 hover:bg-slate-100 hover:text-brand-primary-vibrant active:scale-95 transition-all shadow-xs"
          aria-label="Notificações"
          title="Notificações"
        >
          <Bell className="w-4.5 h-4.5 stroke-[2.2]" />

          {/* Badge Vermelho com quantidade não lida */}
          {hasUnread && (
            <span
              className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white animate-pulse"
              aria-hidden="true"
            >
              {unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : ""}
            </span>
          )}
        </button>
      </div>
    </header>
  );
});

export default Header;
