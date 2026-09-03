import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000, // 30s de cache estável (evita refetches em tab switches)
        gcTime: 5 * 60_000, // 5 min de retenção em memória
        refetchOnWindowFocus: false, // Otimização móvel: não refaz query ao alternar apps
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent", // Pré-carrega rotas e dados ao posicionar o cursor/dedo
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
