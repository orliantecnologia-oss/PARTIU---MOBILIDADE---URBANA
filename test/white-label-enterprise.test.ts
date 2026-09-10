/**
 * ==============================================================================
 * 🏷️ TEST SUITE: PARTIU WHITE LABEL ENTERPRISE PLATFORM (FASE 19)
 * ==============================================================================
 * Cobertura exaustiva dos 15 módulos do White Label OS:
 * 1. Brand Center (Nomes, slogans, logos, contatos)
 * 2. Design System Manager (Paleta primária, semântica, raios, sombras)
 * 3. Injeção Atômica de Variáveis CSS (:root document style)
 * 4. Typography Center (Google Fonts, escalas REM, entrelinha)
 * 5. Home Page Builder (Reordenação de blocos, banners, avisos)
 * 6. Menu Builder (Itens drawer, abas de navegação inferior)
 * 7. Business Model Engine (Multi-negócio: 11 verticais operacionais)
 * 8. Planos & Monetização (5 planos com taxas, mensalidades e despacho)
 * 9. Banner CMS Enterprise (Agendamento, cidades-alvo e público)
 * 10. Geo Configuration (Cidade sede, moeda BRL, fuso, coordenadas)
 * 11. App Configuration Center (Package Android, Bundle iOS, termos, LGPD)
 * 12. Franquias & Multi-Tenant (Isolamento por cidade, alternância e clonagem 1-click)
 * 13. Presets Consagrados 1-Click (PARTIU, 99, Uber, inDrive, Cabify, CityDrive, MotoRápido)
 * 14. Exportação & Importação JSON (Backup, restore e integridade)
 * 15. Benchmark de Performance (Tempo de injeção CSS e alternância de tenant)
 * ==============================================================================
 */

import {
  whiteLabelEngine,
  DEFAULT_WHITELABEL_CONFIG,
  WHITELABEL_PRESETS,
  type WhiteLabelFullConfig,
  type BusinessVerticalId,
} from "../src/lib/white-label";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedCount++;
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual === expected) {
    passedCount++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedCount++;
    console.error(`  ❌ [FAIL] ${message} - Esperado: ${expected}, Obtido: ${actual}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log("==============================================================================");
  console.log("🏷️ INICIANDO SUÍTE DE TESTES: PARTIU WHITE LABEL ENTERPRISE PLATFORM (FASE 19)");
  console.log("==============================================================================\n");

  // ----------------------------------------------------------------------------
  // TESTE 1: INICIALIZAÇÃO & CONFIGURAÇÃO CANÔNICA PADRÃO
  // ----------------------------------------------------------------------------
  console.log("📦 MÓDULO 1: Brand Center & Inicialização");
  whiteLabelEngine.resetToDefaults();
  const initialConfig = whiteLabelEngine.getActiveConfig();

  assert(!!initialConfig, "Configuração ativa inicial não deve ser nula");
  assertEqual(initialConfig.brandCenter.nomePlataforma, "PARTIU", "Nome da plataforma padrão deve ser PARTIU");
  assertEqual(initialConfig.brandCenter.slogan, "Mobilidade inteligente para sua cidade", "Slogan padrão deve ser preservado");
  assert(initialConfig.brandCenter.logos.logoPrincipalUrl.length > 0, "URL do logotipo principal deve estar preenchida");
  assertEqual(initialConfig.brandCenter.emailContato, "contato@partiumobilidade.com.br", "Email de suporte configurado");

  // ----------------------------------------------------------------------------
  // TESTE 2: DESIGN SYSTEM & INJEÇÃO DE VARIÁVEIS CSS NO :ROOT
  // ----------------------------------------------------------------------------
  console.log("\n🎨 MÓDULO 2 & 3: Design System & Injeção Atômica de Variáveis CSS");
  const dummyStyle: Record<string, string> = {};
  const mockDocumentElement = {
    style: {
      setProperty: (prop: string, val: string) => {
        dummyStyle[prop] = val;
      },
    },
  };

  // Mock global document se rodando em Node puro
  if (typeof document === "undefined") {
    (global as any).document = {
      documentElement: mockDocumentElement,
      title: "",
      querySelector: () => null,
    };
  }

  whiteLabelEngine.applyTheme(initialConfig);

  assertEqual(dummyStyle["--brand-primary"], "#FFDE00", "Injeção de --brand-primary correta no :root");
  assertEqual(dummyStyle["--color-primary"], "#FFDE00", "Injeção de --color-primary Tailwind v4 correta");
  assertEqual(dummyStyle["--color-secondary"], "#FA6400", "Injeção de --color-secondary correta");
  assertEqual(dummyStyle["--radius"], "1rem", "Injeção de --radius 'xl' (1rem) padrão correta");
  assert(dummyStyle["--font-sans"].includes("Plus Jakarta Sans"), "Injeção de --font-sans inclui Plus Jakarta Sans");

  // ----------------------------------------------------------------------------
  // TESTE 3: ALTERAÇÃO DINÂMICA DE CORES SEM CÓDIGO
  // ----------------------------------------------------------------------------
  console.log("\n🛠️ MÓDULO 2.1: Customização Dinâmica de Cores");
  const updatedTheme = whiteLabelEngine.updateActiveConfig({
    designSystem: {
      ...initialConfig.designSystem,
      paletaPrimaria: {
        ...initialConfig.designSystem.paletaPrimaria,
        corPrincipal: "#00E5FF", // Cyan Elétrico
      },
    },
  });

  assertEqual(updatedTheme.designSystem.paletaPrimaria.corPrincipal, "#00E5FF", "Cor primária customizada com sucesso");
  whiteLabelEngine.applyTheme(updatedTheme);
  assertEqual(dummyStyle["--brand-primary"], "#00E5FF", "Variável CSS --brand-primary atualizada reativamente para #00E5FF");

  // ----------------------------------------------------------------------------
  // TESTE 4: TYPOGRAPHY CENTER
  // ----------------------------------------------------------------------------
  console.log("\n✍️ MÓDULO 4: Typography Center");
  const updatedTypo = whiteLabelEngine.updateActiveConfig({
    typography: {
      ...initialConfig.typography,
      familiaPrincipal: "Inter",
      tamanhoTitulosRem: 2.0,
    },
  });

  assertEqual(updatedTypo.typography.familiaPrincipal, "Inter", "Fonte alterada para Inter");
  assertEqual(updatedTypo.typography.tamanhoTitulosRem, 2.0, "Tamanho do título alterado para 2.0rem");
  whiteLabelEngine.applyTheme(updatedTypo);
  assert(dummyStyle["--font-sans"].includes("Inter"), "CSS Variable --font-sans reflete fonte Inter");

  // ----------------------------------------------------------------------------
  // TESTE 5: HOME PAGE BUILDER (REORDENAÇÃO DE BLOCOS)
  // ----------------------------------------------------------------------------
  console.log("\n📱 MÓDULO 5: Home Page Builder & Ordem dos Blocos");
  const blocosAtuais = [...initialConfig.homePage.blocos];
  assert(blocosAtuais.length >= 3, "Home Page deve possuir no mínimo 3 blocos configuráveis");

  // Inverte a ordem do bloco 1 e 2
  const primeiro = blocosAtuais[0];
  const segundo = blocosAtuais[1];
  const ordem1 = primeiro.ordem;
  primeiro.ordem = segundo.ordem;
  segundo.ordem = ordem1;

  const reorderedConfig = whiteLabelEngine.reorderHomeBlocks(blocosAtuais);
  assertEqual(reorderedConfig.homePage.blocos[0].ordem, 2, "Primeiro bloco teve ordem invertida");
  assertEqual(reorderedConfig.homePage.blocos[1].ordem, 1, "Segundo bloco teve ordem invertida");

  // ----------------------------------------------------------------------------
  // TESTE 6: MENU & NAVIGATION BUILDER
  // ----------------------------------------------------------------------------
  console.log("\n🧭 MÓDULO 6: Menu & Navigation Builder");
  const menuConfig = initialConfig.menuBuilder;
  assert(menuConfig.itensDrawer.length > 0, "Drawer deve conter itens de menu configurados");
  assert(menuConfig.abasNavegacaoInferior.length >= 2, "Navegação inferior deve conter abas ativas");

  // Atualiza rótulo de um item do drawer
  const novoDrawer = menuConfig.itensDrawer.map((item) =>
    item.id === "m1" ? { ...item, rotulo: "Minhas Viagens VIP" } : item
  );
  const updatedMenu = whiteLabelEngine.updateActiveConfig({
    menuBuilder: { ...menuConfig, itensDrawer: novoDrawer },
  });
  const itemAtualizado = updatedMenu.menuBuilder.itensDrawer.find((i) => i.id === "m1");
  assertEqual(itemAtualizado?.rotulo, "Minhas Viagens VIP", "Rótulo do item no drawer alterado dinamicamente");

  // ----------------------------------------------------------------------------
  // TESTE 7: BUSINESS MODEL ENGINE (11 VERTICAIS OPERACIONAIS)
  // ----------------------------------------------------------------------------
  console.log("\n⚡ MÓDULO 7: Business Model Engine (Multi-Negócio)");
  const verticais = initialConfig.businessModels.verticais;
  const verticaisChaves: BusinessVerticalId[] = [
    "MOBILITY_CAR",
    "MOBILITY_MOTO",
    "DELIVERY_FLASH",
    "DELIVERY_CAR",
    "SCHOOL_BUS",
    "VANS_COLLECTIVE",
    "TOURISM_CHARTER",
    "EXECUTIVE_BLACK",
    "FREIGHT_CARGO",
    "LOCAL_MARKETPLACE",
    "COMMERCIAL_GUIDE",
  ];

  for (const vId of verticaisChaves) {
    assert(!!verticais[vId], `Vertical operacional ${vId} deve estar cadastrada`);
  }

  // Desativa e reativa vertical
  whiteLabelEngine.toggleBusinessModel("SCHOOL_BUS", false);
  let configPosToggle = whiteLabelEngine.getActiveConfig();
  assertEqual(configPosToggle.businessModels.verticais.SCHOOL_BUS.ativo, false, "Vertical SCHOOL_BUS desativada");

  whiteLabelEngine.toggleBusinessModel("SCHOOL_BUS", true);
  configPosToggle = whiteLabelEngine.getActiveConfig();
  assertEqual(configPosToggle.businessModels.verticais.SCHOOL_BUS.ativo, true, "Vertical SCHOOL_BUS reativada");

  // ----------------------------------------------------------------------------
  // TESTE 8: PLANOS & MONETIZAÇÃO
  // ----------------------------------------------------------------------------
  console.log("\n💎 MÓDULO 8: Planos & Monetização Sem Código");
  const planos = initialConfig.monetization.planos;
  assertEqual(planos.length, 5, "Devem existir 5 planos estruturados (Gratuito, Bronze, Prata, Ouro, Pro)");
  
  const planoOuro = planos.find((p) => p.id === "plano-ouro");
  assert(!!planoOuro, "Plano Ouro deve existir");
  assertEqual(planoOuro?.comissaoPercentual, 0, "Plano Ouro tem 0% de comissão (Taxa Zero)");
  assertEqual(planoOuro?.mensalidadeBrl, 99.9, "Plano Ouro mensalidade R$ 99,90");
  assertEqual(planoOuro?.pesoDespacho, 1.50, "Plano Ouro prioridade equilibrada 1.50x no despacho");

  // ----------------------------------------------------------------------------
  // TESTE 9: BANNER CMS ENTERPRISE
  // ----------------------------------------------------------------------------
  console.log("\n📢 MÓDULO 9: Banner CMS Enterprise");
  const cms = initialConfig.cms;
  assert(cms.campanhas.length > 0, "CMS deve conter campanhas ativas configuradas");
  const campanhaCupom = cms.campanhas.find((c) => c.id === "camp-01");
  assert(!!campanhaCupom, "Campanha de cupom existe");
  assert(campanhaCupom?.cidadesAlvo.includes("*") === true, "Campanha de cupom abrange todas as cidades");
  assertEqual(campanhaCupom?.segmentoPublico, "NOVOS_USUARIOS", "Segmento de novos usuários correto");

  const campanhaAviso = cms.campanhas.find((c) => c.id === "camp-02");
  assert(!!campanhaAviso, "Campanha de aviso existe");
  assert(campanhaAviso?.cidadesAlvo.includes("itaperuna-rj") === true, "Campanha segmentada para Itaperuna");
  assertEqual(campanhaAviso?.segmentoPublico, "TODOS", "Segmento de público correto");

  // ----------------------------------------------------------------------------
  // TESTE 10: GEO CONFIGURATION & LOCALIZAÇÃO
  // ----------------------------------------------------------------------------
  console.log("\n🌐 MÓDULO 10: Geo Configuration");
  const geo = initialConfig.geo;
  assertEqual(geo.cidadeSede, "Itaperuna", "Cidade sede padrão é Itaperuna");
  assertEqual(geo.estadoUf, "RJ", "Estado UF padrão é RJ");
  assertEqual(geo.moedaCodigo, "BRL", "Moeda é BRL");
  assertEqual(geo.moedaSimbolo, "R$", "Símbolo de moeda é R$");
  assertEqual(geo.idiomaPadrao, "pt-BR", "Idioma padrão pt-BR");

  // ----------------------------------------------------------------------------
  // TESTE 11: APP CONFIGURATION CENTER (NATIVO & LGPD)
  // ----------------------------------------------------------------------------
  console.log("\n📲 MÓDULO 11: App Configuration Center");
  const nativeApp = initialConfig.nativeApp;
  assertEqual(nativeApp.pacoteAndroid, "br.com.partiumobilidade.app", "Pacote Android configurado");
  assertEqual(nativeApp.bundleIos, "br.com.partiumobilidade.ios", "Bundle iOS configurado");
  assert(nativeApp.termosUsoUrl.length > 0, "Termos de Uso URL preenchida");
  assert(nativeApp.politicaPrivacidadeLgpdUrl.length > 0, "Política de Privacidade LGPD preenchida");

  // ----------------------------------------------------------------------------
  // TESTE 12: MULTI-TENANT & CLONAGEM DE CIDADES COM 1-CLICK
  // ----------------------------------------------------------------------------
  console.log("\n🏢 MÓDULO 12: Multi-Tenant & Clonagem de Franquias");
  const activeTenantAntes = whiteLabelEngine.getActiveTenant();
  assertEqual(activeTenantAntes.tenantId, "tenant-itaperuna", "Tenant ativo inicial é Itaperuna");

  // Clonar cidade com 1-Click
  const novoTenant = whiteLabelEngine.cloneTenant(
    "tenant-itaperuna",
    "tenant-campos",
    "Campos dos Goytacazes",
    "RJ"
  );

  assertEqual(novoTenant.tenantId, "tenant-campos", "ID do novo tenant gerado com sucesso");
  assertEqual(novoTenant.cidadeNome, "Campos dos Goytacazes", "Nome da cidade clonada");
  assertEqual(novoTenant.uf, "RJ", "UF da cidade clonada");
  assertEqual(
    novoTenant.configuracaoCompleta.geo.cidadeSede,
    "Campos dos Goytacazes",
    "Geo config da cidade clonada atualizada automaticamente"
  );

  // Alternar para o novo tenant
  const switched = whiteLabelEngine.switchTenant("tenant-campos");
  assert(!!switched, "Alternância para novo tenant foi bem sucedida");
  assertEqual(whiteLabelEngine.getActiveTenant().tenantId, "tenant-campos", "Novo tenant ativo confirmado");

  // ----------------------------------------------------------------------------
  // TESTE 13: PRESETS CONSAGRADOS DE DESIGN SYSTEM (1-CLICK)
  // ----------------------------------------------------------------------------
  console.log("\n🌟 MÓDULO 13: Presets de Marcas Mundiais (1-Click Apply)");
  assertEqual(WHITELABEL_PRESETS.length, 7, "Devem existir 7 presets consagrados disponíveis");

  // Aplica preset 'uber-tech'
  whiteLabelEngine.applyPreset("uber-tech");
  let cfgUber = whiteLabelEngine.getActiveConfig();
  assertEqual(cfgUber.designSystem.paletaPrimaria.corPrincipal, "#000000", "Preset Uber aplicou preto (#000000) como primária");
  assertEqual(cfgUber.typography.familiaPrincipal, "Roboto", "Preset Uber aplicou tipografia Roboto");

  // Aplica preset 'indrive-verde'
  whiteLabelEngine.applyPreset("indrive-verde");
  let cfgInDrive = whiteLabelEngine.getActiveConfig();
  assertEqual(cfgInDrive.designSystem.paletaPrimaria.corPrincipal, "#B2F35F", "Preset inDrive aplicou verde neon (#B2F35F)");

  // Aplica preset 'cabify-roxo'
  whiteLabelEngine.applyPreset("cabify-roxo");
  let cfgCabify = whiteLabelEngine.getActiveConfig();
  assertEqual(cfgCabify.designSystem.paletaPrimaria.corPrincipal, "#7145D6", "Preset Cabify aplicou roxo (#7145D6)");

  // ----------------------------------------------------------------------------
  // TESTE 14: EXPORTAÇÃO, IMPORTAÇÃO & BACKUP JSON
  // ----------------------------------------------------------------------------
  console.log("\n💾 MÓDULO 14: Exportação & Importação JSON");
  const jsonExportado = whiteLabelEngine.exportThemeJson();
  assert(jsonExportado.includes("generator"), "JSON exportado contém metadados");
  assert(jsonExportado.includes("themeConfig"), "JSON exportado contém nó themeConfig");

  // Restaura padrão e depois reimporta o JSON
  whiteLabelEngine.resetToDefaults();
  assertEqual(whiteLabelEngine.getActiveConfig().designSystem.paletaPrimaria.corPrincipal, "#FFDE00", "Restaurado padrão PARTIU");

  const importResult = whiteLabelEngine.importThemeJson(jsonExportado);
  assert(!!importResult, "Tema JSON reimportado com sucesso");
  assertEqual(
    importResult.designSystem.paletaPrimaria.corPrincipal,
    "#7145D6",
    "Cor do preset Cabify restaurada com fidelidade a partir do JSON"
  );

  // ----------------------------------------------------------------------------
  // TESTE 15: BENCHMARK DE PERFORMANCE & ZERO-CODE GUARANTEE
  // ----------------------------------------------------------------------------
  console.log("\n⚡ MÓDULO 15: Benchmark de Performance & Auditoria Final");
  const startBenchmark = performance.now();
  for (let i = 0; i < 50; i++) {
    whiteLabelEngine.applyTheme(initialConfig);
  }
  const endBenchmark = performance.now();
  const tempoMedioInjecaoMs = (endBenchmark - startBenchmark) / 50;

  console.log(`  ⏱️ Tempo médio de injeção atômica CSS: ${tempoMedioInjecaoMs.toFixed(3)}ms (Meta: < 5.0ms)`);
  assert(tempoMedioInjecaoMs < 5.0, "Injeção atômica de variáveis CSS atende meta de < 5.0ms por ciclo");

  const startSwitch = performance.now();
  for (let i = 0; i < 50; i++) {
    whiteLabelEngine.switchTenant(i % 2 === 0 ? "tenant-itaperuna" : "tenant-campos");
  }
  const endSwitch = performance.now();
  const tempoMedioSwitchMs = (endSwitch - startSwitch) / 50;

  console.log(`  ⏱️ Tempo médio de alternância de Tenant: ${tempoMedioSwitchMs.toFixed(3)}ms (Meta: < 10.0ms)`);
  assert(tempoMedioSwitchMs < 10.0, "Alternância de Tenant atende meta de < 10.0ms");

  // Restaura padrão limpo
  whiteLabelEngine.switchTenant("tenant-itaperuna");
  whiteLabelEngine.resetToDefaults();

  console.log("\n==============================================================================");
  console.log(`🏆 RESUMO DA AUDITORIA WHITE LABEL ENTERPRISE:`);
  console.log(`   Total de Testes Executados: ${passedCount + failedCount}`);
  console.log(`   Testes Aprovados: ${passedCount}`);
  console.log(`   Testes Falhados: ${failedCount}`);
  console.log(`   Taxa de Sucesso: ${((passedCount / (passedCount + failedCount)) * 100).toFixed(1)}%`);
  console.log("==============================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Erro fatal na execução dos testes:", err);
  process.exit(1);
});
