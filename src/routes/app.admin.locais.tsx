import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/admin/locais")({
  component: () => <Navigate to="/app/admin/pontos" />,
});
