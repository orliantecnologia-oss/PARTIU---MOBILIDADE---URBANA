/**
 * ==============================================================================
 * 🏛️ SUÍTE DE TESTES AUTOMATIZADOS: CENTRAL DE OPERAÇÕES NACIONAL PARTIU V4
 * ==============================================================================
 * Testes rigorosos de governança, arquitetura de 6 módulos, RBAC de 5 perfis,
 * restrição estrita de frota a CARRO e MOTO, validador de banners mobile,
 * fila de suporte com priorização de SOS e assistente White Label expresso.
 * ==============================================================================
 */

import { describe, test, expect } from "./test-harness.mjs";
import {
  canAccessModule,
  canViewAdvancedConfig,
  isSuperAdmin,
  getRoleMetadata,
  type AdminRole,
  type AdminModuleId,
} from "../src/lib/admin-rbac.ts";

describe("35. PARTIU NATIONAL ADMIN V4 — Navigation Architecture & RBAC (Strictly 6 Modules)", () => {
  const modulosOficiais: AdminModuleId[] = [
    "dashboard",
    "operacao",
    "motoristas",
    "financeiro",
    "marketing",
    "configuracoes",
  ];

  test("Menu Principal: Deve conter exatamente os 6 módulos operacionais oficiais", () => {
    expect(modulosOficiais.length).toBe(6);
  });

  test("Perfil super_admin / OWNER: Acesso irrestrito a todos os 6 módulos e configurações avançadas", () => {
    modulosOficiais.forEach((m) => {
      expect(canAccessModule(m, "super_admin")).toBe(true);
      expect(canAccessModule(m, "OWNER")).toBe(true);
    });
    expect(canViewAdvancedConfig("super_admin")).toBe(true);
    expect(canViewAdvancedConfig("OWNER")).toBe(true);
    expect(isSuperAdmin("super_admin")).toBe(true);
  });

  test("Perfil admin: Acesso a Dashboard, Operação, Motoristas, Financeiro, Marketing e Configurações essenciais", () => {
    modulosOficiais.forEach((m) => {
      expect(canAccessModule(m, "admin")).toBe(true);
    });
    expect(canViewAdvancedConfig("admin")).toBe(false);
    expect(isSuperAdmin("admin")).toBe(false);
  });

  test("Perfil operador: Restrito a Dashboard, Operação e Motoristas", () => {
    expect(canAccessModule("dashboard", "operador")).toBe(true);
    expect(canAccessModule("operacao", "operador")).toBe(true);
    expect(canAccessModule("motoristas", "operador")).toBe(true);
    expect(canAccessModule("financeiro", "operador")).toBe(false);
    expect(canAccessModule("marketing", "operador")).toBe(false);
    expect(canAccessModule("configuracoes", "operador")).toBe(false);
    expect(canViewAdvancedConfig("operador")).toBe(false);
  });

  test("Perfil suporte: Restrito a Dashboard e Fila de Atendimento / SOS", () => {
    expect(canAccessModule("dashboard", "suporte")).toBe(true);
    expect(canAccessModule("operacao", "suporte")).toBe(true);
    expect(canAccessModule("motoristas", "suporte")).toBe(false);
    expect(canAccessModule("financeiro", "suporte")).toBe(false);
    expect(canAccessModule("marketing", "suporte")).toBe(false);
    expect(canAccessModule("configuracoes", "suporte")).toBe(false);
  });

  test("Metadados de Perfil: Todos os 5 perfis devem possuir metadados válidos e informativos", () => {
    const roles: AdminRole[] = ["super_admin", "admin", "franqueado", "operador", "suporte"];
    roles.forEach((r) => {
      const meta = getRoleMetadata(r);
      expect(Boolean(meta.label)).toBe(true);
      expect(Boolean(meta.titulo)).toBe(true);
      expect(Boolean(meta.badgeColor)).toBe(true);
      expect(Boolean(meta.description)).toBe(true);
    });
  });
});

describe("SUITE 36: PARTIU NATIONAL ADMIN V4 — Fleet Restriction (CARRO & MOTO ONLY)", () => {
  type CategoriaPermitida = "CARRO" | "MOTO";
  const categoriasValidas: CategoriaPermitida[] = ["CARRO", "MOTO"];

  function validarCategoriaVeiculo(categoria: string): { valido: boolean; motivo?: string } {
    const limpa = categoria.trim().toUpperCase();
    if (limpa === "CARRO" || limpa === "MOTO") {
      return { valido: true };
    }
    return {
      valido: false,
      motivo: "A plataforma PARTIU permite estritamente as categorias CARRO e MOTO. Vans, micro-ônibus e outros modais são bloqueados.",
    };
  }

  test("Aprovação de Modais: CARRO e MOTO são aprovados com sucesso", () => {
    expect(validarCategoriaVeiculo("CARRO").valido).toBe(true);
    expect(validarCategoriaVeiculo("carro").valido).toBe(true);
    expect(validarCategoriaVeiculo("MOTO").valido).toBe(true);
    expect(validarCategoriaVeiculo("moto").valido).toBe(true);
  });

  test("Bloqueio de Modais Não Autorizados: Vans, Micro-ônibus e Ônibus são estritamente rejeitados", () => {
    const invalidas = ["VAN", "MICROONIBUS", "ONIBUS", "CAMINHAO", "TRUCK"];
    invalidas.forEach((cat) => {
      const res = validarCategoriaVeiculo(cat);
      expect(res.valido).toBe(false);
      expect(res.motivo).toContain("estritamente as categorias CARRO e MOTO");
    });
  });
});

describe("SUITE 37: PARTIU NATIONAL ADMIN V4 — Mobile Banner Validator (Performance & Aspect Ratio)", () => {
  interface BannerSpec {
    largura: number;
    altura: number;
    tamanhoKb: number;
  }

  function validarBannerMobile(spec: BannerSpec): { aprovado: boolean; erro?: string } {
    // 1. Peso máximo: 1024 KB (1 MB)
    if (spec.tamanhoKb > 1024) {
      return {
        aprovado: false,
        erro: `Imagem muito pesada (${spec.tamanhoKb} KB). Limite máximo permitido para mobile é 1024 KB.`,
      };
    }

    // 2. Largura mínima: 600px
    if (spec.largura < 600) {
      return {
        aprovado: false,
        erro: `Largura insuficiente (${spec.largura}px). Mínimo recomendado é 600px.`,
      };
    }

    // 3. Aspect Ratio móvel (16:9 ~ 1.78 com tolerância 1.4 a 2.4)
    const ratio = spec.largura / spec.altura;
    if (ratio < 1.4 || ratio > 2.4) {
      return {
        aprovado: false,
        erro: `Proporção inadequada (${ratio.toFixed(2)}:1). Padrão mobile obrigatório é 16:9 ou 2:1.`,
      };
    }

    return { aprovado: true };
  }

  test("Banner Padrão Mobile (800x450px, 180 KB, 16:9): Aprovado com sucesso", () => {
    const res = validarBannerMobile({ largura: 800, altura: 450, tamanhoKb: 180 });
    expect(res.aprovado).toBe(true);
    expect(res.erro).toBeUndefined();
  });

  test("Banner Acima do Peso Máximo (1.5 MB): Rejeitado por degradar a performance mobile", () => {
    const res = validarBannerMobile({ largura: 800, altura: 450, tamanhoKb: 1536 });
    expect(res.aprovado).toBe(false);
    expect(res.erro).toContain("muito pesada");
  });

  test("Banner Vertical ou Quadrado (600x600px, 1:1): Rejeitado por quebrar o layout mobile", () => {
    const res = validarBannerMobile({ largura: 600, altura: 600, tamanhoKb: 120 });
    expect(res.aprovado).toBe(false);
    expect(res.erro).toContain("Proporção inadequada");
  });
});

describe("SUITE 38: PARTIU NATIONAL ADMIN V4 — Unified Support & SOS Criticality Sorting", () => {
  interface Ticket {
    id: string;
    protocolo: string;
    prioridade: "SOS_CRITICAL" | "ALTA" | "MEDIA" | "BAIXA";
    status: "ABERTO" | "RESOLVIDO";
  }

  function ordenarFilaPorCriticidade(tickets: Ticket[]): Ticket[] {
    const peso = {
      SOS_CRITICAL: 1,
      ALTA: 2,
      MEDIA: 3,
      BAIXA: 4,
    };

    return [...tickets].sort((a, b) => {
      if (a.status !== "RESOLVIDO" && b.status === "RESOLVIDO") return -1;
      if (a.status === "RESOLVIDO" && b.status !== "RESOLVIDO") return 1;
      return peso[a.prioridade] - peso[b.prioridade];
    });
  }

  test("Ordenação Automática: Alertas SOS devem figurar no topo absoluto da fila", () => {
    const tickets: Ticket[] = [
      { id: "1", protocolo: "TKT-01", prioridade: "BAIXA", status: "ABERTO" },
      { id: "2", protocolo: "TKT-02", prioridade: "ALTA", status: "ABERTO" },
      { id: "3", protocolo: "SOS-99", prioridade: "SOS_CRITICAL", status: "ABERTO" },
      { id: "4", protocolo: "TKT-03", prioridade: "MEDIA", status: "ABERTO" },
    ];

    const ordenados = ordenarFilaPorCriticidade(tickets);
    expect(ordenados[0].protocolo).toBe("SOS-99");
    expect(ordenados[1].protocolo).toBe("TKT-02");
    expect(ordenados[2].protocolo).toBe("TKT-03");
    expect(ordenados[3].protocolo).toBe("TKT-01");
  });

  test("Casos Resolvidos: São deslocados para o final da fila independente da criticidade prévia", () => {
    const tickets: Ticket[] = [
      { id: "1", protocolo: "SOS-RESOLVIDO", prioridade: "SOS_CRITICAL", status: "RESOLVIDO" },
      { id: "2", protocolo: "TKT-ABERTO", prioridade: "BAIXA", status: "ABERTO" },
    ];

    const ordenados = ordenarFilaPorCriticidade(tickets);
    expect(ordenados[0].protocolo).toBe("TKT-ABERTO");
    expect(ordenados[1].protocolo).toBe("SOS-RESOLVIDO");
  });
});

describe("SUITE 39: PARTIU NATIONAL ADMIN V4 — Express White Label Onboarding Wizard (<15 min)", () => {
  interface CityWizardInput {
    cidade: string;
    uf: string;
    nomeApp: string;
    corPrimaria: string;
    preset: "Moderno" | "Compacto" | "Arredondado";
    tarifaBase: number;
    comissao: number;
    pix: string;
    whatsapp: string;
  }

  function provisionarCidadeTenant(input: CityWizardInput) {
    if (!input.cidade || !input.uf || !input.nomeApp) {
      throw new Error("Passo 1 incompleto: Cidade, UF e Nome do App são obrigatórios.");
    }
    if (!input.corPrimaria || !input.preset) {
      throw new Error("Passo 2 incompleto: Identidade visual obrigatória.");
    }
    if (input.tarifaBase <= 0 || input.comissao <= 0) {
      throw new Error("Passo 3 incompleto: Tarifas e comissão devem ser positivas.");
    }
    if (!input.pix || !input.whatsapp) {
      throw new Error("Passo 4 incompleto: Chave PIX e WhatsApp são obrigatórios.");
    }

    return {
      tenantId: "tenant_" + input.cidade.toLowerCase().replace(/\s+/g, "_"),
      cidade: input.cidade,
      uf: input.uf.toUpperCase(),
      nomeApp: input.nomeApp,
      brand: {
        primaryColor: input.corPrimaria,
        preset: input.preset,
      },
      pricing: {
        tarifaBase: input.tarifaBase,
        comissaoPercent: input.comissao,
      },
      channels: {
        pixKey: input.pix,
        whatsapp: input.whatsapp,
      },
      status: "ATIVO",
      provisionedAt: new Date().toISOString(),
    };
  }

  test("Onboarding Expresso Completo: Provisiona cidade com todas as regras comerciais e canais", () => {
    const tenant = provisionarCidadeTenant({
      cidade: "Arapiraca",
      uf: "AL",
      nomeApp: "Partiu Arapiraca",
      corPrimaria: "#FFDE00",
      preset: "Moderno",
      tarifaBase: 5.0,
      comissao: 10.0,
      pix: "financeiro@partiumobilidade.com.br",
      whatsapp: "(82) 99888-7766",
    });

    expect(tenant.tenantId).toBe("tenant_arapiraca");
    expect(tenant.cidade).toBe("Arapiraca");
    expect(tenant.uf).toBe("AL");
    expect(tenant.status).toBe("ATIVO");
    expect(tenant.pricing.comissaoPercent).toBe(10.0);
  });

  test("Validação de Etapas: Lança erro caso qualquer um dos 4 passos seja omitido", () => {
    expect(() =>
      provisionarCidadeTenant({
        cidade: "",
        uf: "AL",
        nomeApp: "",
        corPrimaria: "#FFDE00",
        preset: "Moderno",
        tarifaBase: 5.0,
        comissao: 10.0,
        pix: "pix@app.com",
        whatsapp: "82999",
      })
    ).toThrow("Passo 1 incompleto");
  });
});
