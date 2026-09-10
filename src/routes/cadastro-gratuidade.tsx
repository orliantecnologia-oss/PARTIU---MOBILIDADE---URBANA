import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/cadastro-gratuidade")({
  beforeLoad: () => {
    throw redirect({ to: "/app" });
  },
  component: () => null,
});
