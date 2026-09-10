/**
 * ==============================================================================
 * 🔐 TESTE DE AUTENTICAÇÃO SUPABASE & CONTROLE DE ACESSO
 * ==============================================================================
 */

import { supabaseAuthService } from "../src/lib/auth/supabase-auth-service";

async function runAuthSuite() {
  console.log("================================================================================");
  console.log("🔐 INICIANDO TESTES DO SUPABASE AUTH SERVICE & PORTAL DE ENTRADA");
  console.log("================================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FALHA: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
    passedTests++;
    console.log(`  ✓ ${message}`);
  }

  // 1. Diagnóstico de Saúde do Supabase
  console.log("🔹 [TESTE 1] Diagnóstico de Saúde e Conexão com Supabase...");
  const health = await supabaseAuthService.checkSupabaseHealth();
  assert(health !== null, "Diagnóstico de infraestrutura executado com sucesso.");
  assert(typeof health.url === "string", `Endpoint Supabase detectado: ${health.url}`);
  assert(typeof health.message === "string", `Mensagem de telemetria: ${health.message}`);

  // 2. Validações de Entrada (Email inválido, senha curta)
  console.log("\n🔹 [TESTE 2] Validações de Segurança e Erros Amigáveis...");
  const invalidEmail = await supabaseAuthService.signInWithEmail({
    email: "email-invalido",
    senha: "123",
    role: "PASSAGEIRO",
  });
  assert(!invalidEmail.success, "E-mail malformatado é rejeitado.");
  assert(invalidEmail.error?.includes("e-mail válido") ?? false, "Mensagem de erro amigável retornada.");

  const shortPass = await supabaseAuthService.signInWithEmail({
    email: "passageiro@partiu.com.br",
    senha: "12",
    role: "PASSAGEIRO",
  });
  assert(!shortPass.success, "Senha muito curta é rejeitada.");

  // 3. Login de Passageiro por E-mail
  console.log("\n🔹 [TESTE 3] Autenticação de Passageiro por E-mail...");
  const paxLogin = await supabaseAuthService.signInWithEmail({
    email: "passageiro@partiu.com.br",
    senha: "123456",
    role: "PASSAGEIRO",
  });
  assert(paxLogin.success, "Passageiro autenticado com sucesso.");
  assert(paxLogin.user?.role === "PASSAGEIRO", "Perfil atribuído como PASSAGEIRO.");
  assert(paxLogin.redirectUrl === "/app", "Redirecionamento correto para cockpit do passageiro (/app).");

  // 4. Login de Motorista Parceiro por E-mail
  console.log("\n🔹 [TESTE 4] Autenticação de Motorista Parceiro...");
  const drvLogin = await supabaseAuthService.signInWithEmail({
    email: "motorista@partiu.com.br",
    senha: "123456",
    role: "MOTORISTA",
  });
  assert(drvLogin.success, "Motorista parceiro autenticado com sucesso.");
  assert(drvLogin.user?.role === "MOTORISTA", "Perfil atribuído como MOTORISTA.");
  assert(drvLogin.redirectUrl === "/app/motorista", "Redirecionamento correto para cockpit do motorista (/app/motorista).");
  assert(drvLogin.user?.driverApprovalStatus === "aprovado", "Status de homologação do motorista verificado.");

  // 5. Login de Administrador
  console.log("\n🔹 [TESTE 5] Autenticação de Administrador...");
  const admLogin = await supabaseAuthService.signInWithEmail({
    email: "admin@partiu.com.br",
    senha: "123456",
    role: "ADMIN",
  });
  assert(admLogin.success, "Administrador autenticado com sucesso.");
  assert(admLogin.user?.role === "ADMIN", "Perfil atribuído como ADMIN.");
  assert(admLogin.redirectUrl === "/app/admin", "Redirecionamento correto para Central Admin (/app/admin).");

  // 6. Cadastro de Novo Passageiro com CPF e Telefone Normalizado
  console.log("\n🔹 [TESTE 6] Cadastro de Novo Passageiro com Formatação Brasileira...");
  const newPax = await supabaseAuthService.signUpPassenger({
    name: "Ana Beatriz Santos",
    email: "ana.santos@gmail.com",
    phone: "82 99911-2233",
    cpf: "123.456.789-10",
    password: "senhaSegura2026",
  });
  assert(newPax.success, "Novo passageiro cadastrado com sucesso.");
  assert(newPax.user?.name === "Ana Beatriz Santos", "Nome persistido corretamente.");
  assert(newPax.user?.phone === "(82) 99911-2233", "Telefone normalizado no padrão (DDD) 9XXXX-XXXX.");
  assert(newPax.redirectUrl === "/app", "Redirecionamento para /app após cadastro.");

  // 7. Login por Celular com OTP
  console.log("\n🔹 [TESTE 7] Fluxo de Acesso por Celular e Código OTP...");
  const otpSend = await supabaseAuthService.sendPhoneOtp("82 99841-2940");
  assert(otpSend.success, "Disparo de OTP concluído com sucesso.");

  const otpVerify = await supabaseAuthService.verifyPhoneOtp({
    phone: "82 99841-2940",
    otpCode: "1234",
    role: "PASSAGEIRO",
  });
  assert(otpVerify.success, "Código OTP verificado com sucesso.");
  assert(otpVerify.user?.phone === "(82) 99841-2940", "Sessão vinculada ao celular autenticado.");

  // 8. Testes Rápidos em 1-Clique (Demo Login)
  console.log("\n🔹 [TESTE 8] Mecanismo de Acesso Rápido para Demonstração...");
  const demoPax = supabaseAuthService.quickDemoLogin("PASSAGEIRO");
  assert(demoPax.success && demoPax.redirectUrl === "/app", "Demo Passageiro operacional.");

  const demoDrv = supabaseAuthService.quickDemoLogin("MOTORISTA");
  assert(demoDrv.success && demoDrv.redirectUrl === "/app/motorista", "Demo Motorista operacional.");

  const demoAdm = supabaseAuthService.quickDemoLogin("ADMIN");
  assert(demoAdm.success && demoAdm.redirectUrl === "/app/admin", "Demo Admin operacional.");

  // 9. Encerramento de Sessão (Sign Out)
  console.log("\n🔹 [TESTE 9] Encerramento de Sessão e Limpeza de Cache...");
  await supabaseAuthService.signOut();
  assert(supabaseAuthService.getStoredSession() === null, "Sessão encerrada e limpa do cache.");

  console.log("\n================================================================================");
  console.log(`🎉 TODOS OS ${passedTests}/${totalTests} TESTES DE AUTENTICAÇÃO SUPABASE PASSARAM COM SUCESSO!`);
  console.log("================================================================================\n");
}

runAuthSuite().catch((err) => {
  console.error("Erro fatal na suíte de testes de autenticação:", err);
  process.exit(1);
});
