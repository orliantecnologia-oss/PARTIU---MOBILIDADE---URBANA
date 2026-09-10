import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/admin/rota")({
  component: () => <Navigate to="/app/admin/despacho" />,
});
