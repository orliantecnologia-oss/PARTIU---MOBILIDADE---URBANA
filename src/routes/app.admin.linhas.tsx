import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/admin/linhas")({
  component: () => <Navigate to="/app/admin/despacho" />,
});
