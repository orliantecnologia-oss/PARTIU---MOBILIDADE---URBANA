import { initGlobalFontSize } from "@/lib/font-size-manager";
import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { BottomNav } from "@/components/navigation/BottomNav";
import { PushNotificationPrompt } from "@/components/notifications/PushNotificationPrompt";
import { BroadcastNotificationListener } from "@/components/notifications/BroadcastNotificationListener";
import { registrarServiceWorker } from "@/lib/push-notifications";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app")({
  ssr: false,
  shouldReload: false,
  beforeLoad: async ({ location }) => {
    const pathname = location.pathname;

    // Rotas administrativas possuem seu próprio sistema de autenticação RBAC dedicado
    if (pathname.startsWith("/app/admin")) {
      return { user: null };
    }

    // Suporte a Acesso Demo Local para testes imediatos
    if (typeof window !== "undefined" && localStorage.getItem("univans_demo_user") === "true") {
      return { user: { id: "demo-user-1", email: "admin@univans.com.br" } };
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      const expired = !session || (session.expires_at ?? 0) * 1000 <= Date.now();

      // Apenas rotas estritamente restritas exigem login
      const rotasPrivadas = ["/app/bilhetes", "/app/perfil"];
      const precisaAuth = rotasPrivadas.some((r) => pathname.startsWith(r));

      if (precisaAuth && expired) {
        throw redirect({
          to: "/auth",
          search: { redirect: pathname, ...(session ? { expirada: "1" as const } : {}) },
        });
      }

      return { user: session?.user ?? null };
    } catch (err: any) {
      if (err && typeof err === "object" && ("options" in err || "status" in err)) {
        throw err;
      }
      return { user: null };
    }
  },
  component: AppLayout,
});

function AppLayout() {
  useEffect(() => {
    initGlobalFontSize();
    registrarServiceWorker();
  }, []);
  const href = useRouterState({ select: (s) => s.location.href });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/app/admin") || href.includes("/app/admin");

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-background w-full">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background w-full flex flex-col relative">
      <div className="w-full flex-1 px-1.5 sm:px-2 pb-24">
        <Outlet />
      </div>
      <BottomNav />
      <BroadcastNotificationListener />
      <PushNotificationPrompt />
    </div>
  );
}
