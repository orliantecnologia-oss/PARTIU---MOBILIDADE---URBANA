import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const esquemaCadastro = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
  nome: z.string().min(2),
  cpf: z.string().min(11),
  whatsapp: z.string().min(8),
});

const esquemaAtualizacao = z.object({
  id: z.string().uuid(),
  nome: z.string().min(2),
  cpf: z.string().min(11),
  whatsapp: z.string().min(8),
});

async function garantirAdmin(
  supabase: {
    rpc: (fn: "is_admin", args: { _user_id: string }) => Promise<{ data: unknown; error: unknown }>;
  },
  userId: string,
) {
  const { data, error } = await supabase.rpc("is_admin", { _user_id: userId });
  if (error || data !== true) {
    throw new Response("Forbidden", { status: 403 });
  }
}

export type PassageiroAdmin = {
  id: string;
  email: string | null;
  full_name: string | null;
  cpf: string | null;
  phone: string | null;
  created_at: string;
};

export const listarPassageiros = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PassageiroAdmin[]> => {
    await garantirAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: perfis, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, cpf, phone, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const { data: usuarios } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const emails = new Map((usuarios?.users ?? []).map((u) => [u.id, u.email ?? null]));

    return (perfis ?? []).map((p) => ({
      id: p.id,
      email: emails.get(p.id) ?? null,
      full_name: p.full_name,
      cpf: p.cpf,
      phone: p.phone,
      created_at: p.created_at,
    }));
  });

export const cadastrarPassageiro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => esquemaCadastro.parse(d))
  .handler(async ({ context, data }) => {
    await garantirAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { full_name: data.nome, phone: data.whatsapp, role: "passageiro" },
    });
    if (error || !criado.user) throw new Error(error?.message ?? "Falha ao criar passageiro");

    const { error: erroPerfil } = await supabaseAdmin.from("profiles").upsert({
      id: criado.user.id,
      full_name: data.nome,
      cpf: data.cpf,
      phone: data.whatsapp,
    });
    if (erroPerfil) throw new Error(erroPerfil.message);

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: criado.user.id, role: "passageiro" }, { onConflict: "user_id,role" });

    return { id: criado.user.id, email: data.email };
  });

export const atualizarPassageiro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => esquemaAtualizacao.parse(d))
  .handler(async ({ context, data }) => {
    await garantirAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: data.nome, cpf: data.cpf, phone: data.whatsapp })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
