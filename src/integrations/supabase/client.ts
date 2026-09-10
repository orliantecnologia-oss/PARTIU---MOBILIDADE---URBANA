// Supabase Client configurado para conexão direta com banco real e fallback gracioso
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { brokeredPreviewStorage } from "./previewAuthStorage";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_") || value.startsWith("eyJ");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createSupabaseClient() {
  const envUrl =
    (typeof import.meta !== "undefined" && import.meta.env?.["VITE_SUPABASE_URL"]) ||
    (typeof process !== "undefined" && process.env?.["SUPABASE_URL"]);

  const envKey =
    (typeof import.meta !== "undefined" &&
      (import.meta.env?.["VITE_SUPABASE_ANON_KEY"] || import.meta.env?.["VITE_SUPABASE_PUBLISHABLE_KEY"])) ||
    (typeof process !== "undefined" &&
      (process.env?.["SUPABASE_ANON_KEY"] || process.env?.["SUPABASE_PUBLISHABLE_KEY"]));

  const SUPABASE_URL = envUrl || "https://partiu-app.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = envKey || "sb_publishable_partiu_local_demo";

  const isConfigured = Boolean(envUrl && envKey);
  const isProduction =
    (typeof import.meta !== "undefined" && import.meta.env?.PROD) ||
    (typeof process !== "undefined" && process.env?.["NODE_ENV"] === "production");

  if (isProduction && !isConfigured) {
    console.error(
      "🚨 [FATAL INFRA ERROR] Supabase credentials (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY / PUBLISHABLE_KEY) estão ausentes no ambiente de PRODUÇÃO! A aplicação não conseguirá sincronizar com o banco."
    );
  } else if (typeof window !== "undefined" && !isConfigured) {
    console.info(
      "ℹ️ [PARTIU Supabase] Conexão padrão em modo local/demonstração. Para conectar ao seu banco real Supabase, defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env."
    );
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
    },
    auth: {
      storage: brokeredPreviewStorage(),
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});

export const isSupabaseConfigured = () => {
  return Boolean(
    (typeof import.meta !== "undefined" && import.meta.env?.["VITE_SUPABASE_URL"]) ||
    (typeof process !== "undefined" && process.env?.["SUPABASE_URL"])
  );
};
