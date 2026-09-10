import { type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

export interface MobileViewportContainerProps {
  children: ReactNode;
}

/**
 * Container responsivo para o app PARTIU:
 * - Landing page (/) e Auth (/auth): tela cheia fluida no desktop e mobile.
 * - Admin (/app/admin): tela cheia com dashboard expandido.
 * - App (/app): no celular real se molda perfeitamente em 100% da largura (sem barras falsas de celular).
 *   No desktop grande, centraliza elegantemente com proporção de app moderno.
 */
export function MobileViewportContainer({ children }: MobileViewportContainerProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isFullWidthPage =
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/app/admin") ||
    pathname.startsWith("/design-system") ||
    pathname.startsWith("/escolher-tipo-cadastro") ||
    pathname.startsWith("/cadastro-") ||
    pathname.startsWith("/rastreio");

  if (isFullWidthPage) {
    return (
      <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-background text-foreground">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-slate-100 dark:bg-slate-950 flex justify-center">
      <div className="w-full max-w-full sm:max-w-[440px] md:max-w-[460px] min-h-[100dvh] bg-background text-foreground relative sm:shadow-2xl sm:border-x sm:border-slate-200 dark:sm:border-slate-800 flex flex-col overflow-x-hidden">
        <div className="flex-1 w-full max-w-full flex flex-col relative overflow-x-hidden">{children}</div>
      </div>
    </div>
  );
}
