import React from "react";
import { Bell } from "lucide-react";
import { USER_PROFILE_MOCK } from "./home-mock-data";
import { useBrandTheme } from "@/hooks/useBrandTheme";

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
 *
 * Arquitetura de Layout:
 * 1. Altura e Proporção Slim-Balanced:
 *    - Fundo com LinearGradient da paleta Azul Tech (#0088FF -> #003366)
 *    - Curvatura inferior sutil: borderBottomLeftRadius: 20, borderBottomRightRadius: 20
 *    - Padding vertical seguro: paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16
 *    - Altura útil confortável para total contenção dos elementos sem vazamentos
 *
 * 2. Seção Esquerda (Perfil Compacto e Alinhado):
 *    - Avatar de 38x38 (borderRadius: 19) com anel branco puro, 100% contido na faixa azul
 *    - Saudação compacta em coluna ("Olá," fontSize: 10, "[Nome]" fontSize: 13 bold)
 *
 * 3. Seção Central (Nome Dinâmico do Aplicativo):
 *    - flex: 1, centralizado no meio exato da tela
 *    - Nome dinâmico (appName || nomeApp || "PARTIU") em fontSize: 15 bold branca
 *
 * 4. Seção Direita (Ícone de Notificação / Sino Seguro):
 *    - Botão de 38x38 (borderRadius: 19) com fundo translúcido rgba(255,255,255,0.15)
 *    - Badge de alerta vermelho de 8x8 (borderRadius: 4) com margem segura (top: 5, right: 5)
 *
 * 5. Distribuição:
 *    - Flexbox único: flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
 */
export function Header({
  userName,
  avatarUrl = USER_PROFILE_MOCK.avatarUrl,
  appName,
  onOpenDrawer,
  onOpenNotifications,
  hasUnreadNotifications = true,
  insets,
  className = "",
  style,
}: HeaderProps) {
  const { nomeApp } = useBrandTheme();
  const nomeExibicao = (userName || USER_PROFILE_MOCK.nome).trim();
  const primeiroNome = nomeExibicao.split(/\s+/)[0] || "Rodrigo";
  const iniciais = primeiroNome.substring(0, 2).toUpperCase();
  const dynamicAppName = appName || nomeApp || "PARTIU";

  // Padding superior seguro (respeita safe-area-inset-top de dispositivos móveis)
  const safeTopPadding = insets?.top
    ? `${insets.top + 8}px`
    : "max(0.75rem, calc(env(safe-area-inset-top, 0px) + 8px))";

  return (
    <header
      className={`relative z-30 w-full select-none shrink-0 ${className}`}
      style={{
        background: "linear-gradient(180deg, var(--header-gradient-start, #0088FF) 0%, var(--header-gradient-end, #003366) 100%)",
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        paddingTop: safeTopPadding,
        paddingBottom: 12,
        paddingLeft: 16,
        paddingRight: 16,
        minHeight: 74,
        boxShadow: "0 8px 24px rgba(0, 51, 102, 0.35), 0 2px 8px rgba(0, 0, 0, 0.18)",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        ...style,
      }}
      aria-label="Cabeçalho Principal"
    >
      {/* ===================================================================== */}
      {/* 2. SEÇÃO ESQUERDA: PERFIL COMPACTO E ALINHADO                         */}
      {/* ===================================================================== */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          minWidth: 0,
        }}
      >
        <button
          type="button"
          onClick={onOpenDrawer}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            border: "2px solid rgba(255, 255, 255, 0.85)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.20)",
            backgroundColor: "rgba(255, 255, 255, 0.20)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
            cursor: "pointer",
            padding: 0,
          }}
          className="active:scale-95 transition-transform"
          aria-label="Abrir Menu Lateral e Perfil"
          title="Abrir Menu"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={nomeExibicao}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <span
              style={{
                color: "#FFFFFF",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.05em",
              }}
            >
              {iniciais}
            </span>
          )}
        </button>

        {/* Texto de Saudação / Nome em coluna única */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "rgba(255, 255, 255, 0.75)",
              lineHeight: 1.15,
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            Olá,
          </span>
          <h1
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1.2,
              margin: 0,
              padding: 0,
            }}
            className="truncate"
          >
            {primeiroNome}!
          </h1>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. SEÇÃO CENTRAL: NOME DINÂMICO DO APLICATIVO                         */}
      {/* ===================================================================== */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "0.04em",
            lineHeight: 1.2,
            textShadow: "0 1px 3px rgba(0, 0, 0, 0.25)",
          }}
          className="truncate"
        >
          {dynamicAppName}
        </span>
      </div>

      {/* ===================================================================== */}
      {/* 4. SEÇÃO DIREITA: ÍCONE DE NOTIFICAÇÃO / SINO SEGURO                  */}
      {/* ===================================================================== */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          onClick={onOpenNotifications}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            flexShrink: 0,
            cursor: "pointer",
            color: "#FFFFFF",
          }}
          className="hover:bg-white/25 active:scale-95 transition-all shadow-xs"
          aria-label="Notificações"
          title="Notificações"
        >
          <Bell
            style={{
              width: 18,
              height: 18,
              strokeWidth: 2.2,
              color: "#FFFFFF",
            }}
          />

          {/* Badge de alerta vermelho com margem segura de respiro */}
          {hasUnreadNotifications && (
            <span
              style={{
                position: "absolute",
                top: 5,
                right: 5,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#EF4444",
                border: "1.5px solid #FFFFFF",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.35)",
              }}
              className="animate-pulse"
              aria-hidden="true"
            />
          )}
        </button>
      </div>
    </header>
  );
}

export default Header;
