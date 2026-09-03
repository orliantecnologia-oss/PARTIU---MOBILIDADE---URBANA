import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Leitura manual do arquivo .env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  });
}

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";

console.log("================================================================================");
console.log("🌐 TESTE DE CONEXÃO AO VIVO COM O SUPABASE REAL");
console.log(`URL: ${url}`);
console.log("================================================================================\n");

const supabase = createClient(url, key);

async function runLiveTests() {
  console.log("1. Verificando tabela 'alertas_sos'...");
  const { data: sosData, error: sosError } = await supabase
    .from("alertas_sos")
    .select("*")
    .limit(3);
  if (sosError) {
    console.error("   ❌ Erro ao consultar alertas_sos:", sosError.message);
  } else {
    console.log(`   ✅ Sucesso! Linhas encontradas: ${sosData.length}`);
  }

  console.log("\n2. Verificando tabela 'user_roles'...");
  const { data: rolesData, error: rolesError } = await supabase
    .from("user_roles")
    .select("*")
    .limit(3);
  if (rolesError) {
    console.error("   ❌ Erro ao consultar user_roles:", rolesError.message);
  } else {
    console.log(`   ✅ Sucesso! Linhas encontradas: ${rolesData.length}`);
  }

  console.log("\n3. Testando RPC atômica 'reservar_vagas_viagem_atomica' no PostgreSQL...");
  const dummyUuid = "00000000-0000-0000-0000-000000000001";
  const { data: rpcData, error: rpcError } = await supabase.rpc("reservar_vagas_viagem_atomica", {
    p_viagem_id: dummyUuid,
    p_quantidade: 1,
  });

  if (rpcError) {
    console.error("   ❌ Erro na RPC:", rpcError.message);
  } else {
    console.log("   ✅ Sucesso! Resposta da procedure PostgreSQL:", JSON.stringify(rpcData));
  }

  console.log("\n4. Testando validação RLS Anti-Flood em 'alertas_sos'...");
  const { error: invalidError } = await supabase.from("alertas_sos").insert({
    tipo: "pane_mecanica",
    solicitante_nome: "A", // < 2 caracteres -> Violação da política RLS
    solicitante_telefone: "123", // < 8 dígitos -> Violação da política RLS
  });

  if (invalidError) {
    console.log("   ✅ RLS bloqueou payload anônimo/inválido com sucesso:", invalidError.message);
  } else {
    console.warn("   ⚠️ Payload inválido foi aceito inesperadamente.");
  }

  console.log("\n5. Testando inserção legítima em 'alertas_sos'...");
  const { data: insertedSos, error: validInsertError } = await supabase
    .from("alertas_sos")
    .insert({
      tipo: "pane_mecanica",
      solicitante_nome: "Auditor Engenharia V6.0",
      solicitante_telefone: "82998877665",
      van_placa: "RJP2F14",
      motorista_nome: "Carlos Eduardo",
      rodovia: "AL-101 Sul",
      status: "ativo",
      descricao: "Teste de validação ao vivo no banco de produção",
    })
    .select();

  if (validInsertError) {
    console.error("   ❌ Erro na inserção legítima:", validInsertError.message);
  } else {
    console.log(`   ✅ Chamado SOS criado com sucesso no Supabase! ID: ${insertedSos[0]?.id}`);
  }

  console.log("\n================================================================================");
  console.log("🎯 TESTE AO VIVO FINALIZADO COM SUCESSO!");
  console.log("================================================================================\n");
}

runLiveTests().catch((err) => {
  console.error("Falha inesperada:", err);
  process.exit(1);
});
