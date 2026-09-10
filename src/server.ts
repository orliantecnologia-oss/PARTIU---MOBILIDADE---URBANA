import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { silentCatchWarn } from "@/lib/structured-logger";


type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;
let outboxPollerStarted = false;

/**
 * Inicia o worker em segundo plano no servidor (Node.js / Nitro SSR)
 */
export function initOutboxDaemon(intervalMs = 15000) {
  if (outboxPollerStarted || typeof process === "undefined") return;
  outboxPollerStarted = true;

  // Inicia loop de consumo da Transactional Outbox em segundo plano
  setInterval(async () => {
    try {
      const { runOutboxWorkerBatch } = await import("./lib/outbox-worker.server");
      await runOutboxWorkerBatch();
    } catch (err) { silentCatchWarn("server", err); }
  }, intervalMs);
}

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    // Garante que o worker em background esteja ativo no servidor
    initOutboxDaemon(15000);

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },

  // Suporte a Cron Triggers nativos do Cloudflare Workers / Nitro
  async scheduled(_event: unknown, _env: unknown, _ctx: unknown) {
    try {
      const { runOutboxWorkerBatch } = await import("./lib/outbox-worker.server");
      const res = await runOutboxWorkerBatch();
      console.log(
        `[OutboxWorker:Cron] Processados: ${res.processed} | Publicados: ${res.published} | DLQ: ${res.deadLetters}`,
      );
    } catch (err: any) {
      console.error("[OutboxWorker:Cron] Erro ao executar ciclo de outbox:", err?.message || err);
    }
  },
};
