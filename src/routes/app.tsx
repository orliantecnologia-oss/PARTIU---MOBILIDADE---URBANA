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
  // Revalida a sessão a cada navegação dentro de /app
  shouldReload: true,
  beforeLoad: async ({ location }) => {
    const destino = location.href;
    const pathname = location.pathname;

    // Rotas administrativas possuem seu próprio sistema de autenticação RBAC dedicado
    if (pathname.startsWith("/app/admin")) {
      return { user: null };
    }

    // Suporte a Acesso Demo Local para testes imediatos
    if (typeof window !== "undefined" && localStorage.getItem("univans_demo_user") === "true") {
      return { user: { id: "demo-user-1", email: "admin@univans.com.br" } };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    const expired = !session || (session.expires_at ?? 0) * 1000 <= Date.now();
    if (expired) {
      await supabase.auth.signOut().catch(() => {});
      throw redirect({
        to: "/auth",
        search: { redirect: destino, ...(session ? { expirada: "1" as const } : {}) },
      });
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      await supabase.auth.signOut().catch(() => {});
      throw redirect({ to: "/auth", search: { redirect: destino, expirada: "1" } });
    }
    return { user: data.user };
  },
  component: AppLayout,
});

function AppLayout() {
  useEffect(() => {
    initGlobalFontSize();
    registrarServiceWorker();
  }, []);
  const navigate = Route.useNavigate();
  const href = useRouterState({ select: (s) => s.location.href });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/app/admin") || href.includes("/app/admin");

  useEffect(() => {
    if (isAdmin) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (!session && event !== "INITIAL_SESSION")) {
        navigate({ to: "/auth", replace: true, search: { redirect: href, expirada: "1" } });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, href, isAdmin]);

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-background w-full">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background w-full">
      <div className="mx-auto w-full max-w-full sm:max-w-3xl md:max-w-4xl px-1.5 sm:px-4 pb-24">
        <Outlet />
      </div>
      <BottomNav />
      <BroadcastNotificationListener />
      <PushNotificationPrompt />
    </div>
  );
}
