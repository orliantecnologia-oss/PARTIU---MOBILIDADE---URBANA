import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/admin/veiculo")({
  component: () => <Navigate to="/app/admin/frota" />,
});
