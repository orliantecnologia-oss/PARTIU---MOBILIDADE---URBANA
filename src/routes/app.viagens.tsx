import { createFileRoute, Navigate } from "@tanstack/react-router";

// Redirecionamento unificado para /app/bilhetes (Central Oficial de Viagens e Passagens)
export const Route = createFileRoute("/app/viagens")({
  component: () => <Navigate to="/app/bilhetes" />,
});
