/**
 * ==============================================================================
 * ☁️ UNIVANS PASSENGER CLOUD SYNC & PHONE AUTH ENGINE (v4.0)
 * Persistência em Nuvem (PostgreSQL Supabase), Normalização E.164 e Sincronização Híbrida
 * ==============================================================================
 */

import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import {
  type BilhetePassagem,
  getBilhetesPassagens,
  salvarNovoBilhete,
} from "./passagens-store";

export type PassagemRow = Tables<"passagens">;

/**
 * Normaliza número de telefone brasileiro para formato E.164 (+55DDD9XXXXXXXX)
 * e formato de exibição nacional (DDD) 9XXXX-XXXX
 */
export function normalizarTelefoneBR(input: string): {
  valido: boolean;
  e164: string;
  formatado: string;
  ddd: string;
  apenasDigitos: string;
} {
  const digitos = input.replace(/\D/g, "");

  // Aceita com 55 ou sem 55 (ex: 82998412940 ou 5582998412940)
  let numeroLimpo = digitos;
  if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) {
    numeroLimpo = digitos.slice(2);
  }

  // DDD (2 dígitos) + 9 dígitos de celular (total 11) ou 8 dígitos de fixo (total 10)
  const valido = numeroLimpo.length === 11 || numeroLimpo.length === 10;
  const ddd = numeroLimpo.slice(0, 2);
  const e164 = valido ? `+55${numeroLimpo}` : "";

  let formatado = numeroLimpo;
  if (numeroLimpo.length === 11) {
    formatado = `(${numeroLimpo.slice(0, 2)}) ${numeroLimpo.slice(2, 7)}-${numeroLimpo.slice(7)}`;
  } else if (numeroLimpo.length === 10) {
    formatado = `(${numeroLimpo.slice(0, 2)}) ${numeroLimpo.slice(2, 6)}-${numeroLimpo.slice(6)}`;
  }

  return {
    valido,
    e164,
    formatado,
    ddd,
    apenasDigitos: numeroLimpo,
  };
}

/**
 * Converte um registro do banco de dados (tabela passagens) para o modelo BilhetePassagem
 */
export function converterPassagemBancoParaBilhete(
  row: PassagemRow,
  extras?: Partial<BilhetePassagem>,
): BilhetePassagem {
  const isEmbarcado = row.status_embarque === "embarcado";
  const isConfirmado =
    row.status_pagamento === "confirmado" || row.status_pagamento === "pago";

  return {
    id: row.codigo_bilhete || `CVAN-${row.id.slice(0, 6)}`,
    linhaId: row.viagem_id,
    origem: extras?.origem || "Origem Alagoas",
    destino: extras?.destino || "Destino Alagoas",
    dataViagem: extras?.dataViagem || new Date(row.created_at).toLocaleDateString("pt-BR"),
    horarioSaida: extras?.horarioSaida || new Date(row.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    horarioChegadaPrevisto: extras?.horarioChegadaPrevisto || "--:--",
    quantidadePassagens: row.quantidade_passagens || 1,
    passageiroNome: row.passageiro_nome,
    passageiroWhatsApp: row.passageiro_whatsapp,
    passageiroCpf: row.passageiro_cpf,
    valorTotal: row.valor_total,
    formaPagamento: (row.forma_pagamento as any) || "PIX",
    status: isEmbarcado ? "embarcado" : isConfirmado ? "confirmado" : "cancelado",
    pontoEmbarque: extras?.pontoEmbarque || "Ponto Autorizado UniVans",
    pontoEmbarqueReferencia: extras?.pontoEmbarqueReferencia || "Rodovia / Trevo",
    vanModelo: extras?.vanModelo || "Mercedes Sprinter VIP",
    vanPlaca: extras?.vanPlaca || "RJP-2F14",
    motoristaNome: extras?.motoristaNome || "Carlos Eduardo Santos",
    motoristaFoto:
      extras?.motoristaFoto ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    starlinkWifi: extras?.starlinkWifi || "UniVans_Starlink_01",
    codigoQr: row.codigo_qr || row.codigo_bilhete,
    criadoEm: row.created_at,
    presencaConfirmada: isEmbarcado,
    presencaConfirmadaEm: row.embarcado_em || undefined,
  };
}

/**
 * Converte um BilhetePassagem para o schema de inserção na tabela passagens do Supabase
 */
export function converterBilheteParaPassagemInsert(
  bilhete: BilhetePassagem,
  userId: string,
  viagemId?: string,
): TablesInsert<"passagens"> {
  return {
    codigo_bilhete: bilhete.id,
    codigo_qr: bilhete.codigoQr,
    forma_pagamento: bilhete.formaPagamento,
    passageiro_cpf: bilhete.passageiroCpf || "000.000.000-00",
    passageiro_id: userId,
    passageiro_nome: bilhete.passageiroNome,
    passageiro_whatsapp: bilhete.passageiroWhatsApp,
    quantidade_passagens: bilhete.quantidadePassagens,
    status_embarque: bilhete.status === "embarcado" ? "embarcado" : "pendente",
    status_pagamento: bilhete.status === "confirmado" ? "confirmado" : "pendente",
    valor_total: bilhete.valorTotal,
    viagem_id: viagemId || bilhete.linhaId || "00000000-0000-0000-0000-000000000001",
    pix_expira_em: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    pix_copia_cola: null,
    pix_txid: null,
    ponto_embarque_id: null,
  };
}

/**
 * Mescla bilhetes locais com bilhetes obtidos da nuvem sem duplicações
 */
export function mesclarBilhetesNuvemELocal(
  locais: BilhetePassagem[],
  nuvem: BilhetePassagem[],
): BilhetePassagem[] {
  const mapa = new Map<string, BilhetePassagem>();

  // Inserir primeiro os locais
  for (const b of locais) {
    mapa.set(b.id, b);
  }

  // Sobrescrever ou adicionar os da nuvem (mais atualizados em caso de status)
  for (const b of nuvem) {
    const existente = mapa.get(b.id);
    if (existente) {
      // Manter dados ricos do frontend caso a nuvem não tenha todos os detalhes de van/motorista
      mapa.set(b.id, {
        ...existente,
        ...b,
        origem: existente.origem !== "Origem Alagoas" ? existente.origem : b.origem,
        destino: existente.destino !== "Destino Alagoas" ? existente.destino : b.destino,
        vanModelo: existente.vanModelo || b.vanModelo,
        vanPlaca: existente.vanPlaca || b.vanPlaca,
      });
    } else {
      mapa.set(b.id, b);
    }
  }

  // Retornar ordenados por data de criação (mais recente primeiro)
  return Array.from(mapa.values()).sort(
    (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime(),
  );
}

/**
 * Sincroniza passagens do usuário logado diretamente com o Supabase
 */
export async function sincronizarPassagensNuvem(
  userId?: string,
  whatsapp?: string,
): Promise<{ bilhetes: BilhetePassagem[]; sincronizadoNuvem: boolean }> {
  const locais = getBilhetesPassagens();

  if (!userId && !whatsapp) {
    return { bilhetes: locais, sincronizadoNuvem: false };
  }

  try {
    let query = supabase.from("passagens").select("*, viagens(*, linhas(*))");

    if (userId && userId !== "demo-user-1") {
      query = query.eq("passageiro_id", userId);
    } else if (whatsapp) {
      const { apenasDigitos } = normalizarTelefoneBR(whatsapp);
      query = query.ilike("passageiro_whatsapp", `%${apenasDigitos}%`);
    }

    const { data: rows, error } = await query.order("created_at", { ascending: false });

    if (error || !rows || rows.length === 0) {
      return { bilhetes: locais, sincronizadoNuvem: !error };
    }

    const bilhetesNuvem: BilhetePassagem[] = rows.map((r: any) => {
      const linha = r.viagens?.linhas;
      return converterPassagemBancoParaBilhete(r, {
        origem: linha?.origem,
        destino: linha?.destino,
        vanPlaca: r.viagens?.placa,
        vanModelo: r.viagens?.modelo,
      });
    });

    const unificados = mesclarBilhetesNuvemELocal(locais, bilhetesNuvem);

    // Salvar cache local atualizado
    if (typeof window !== "undefined") {
      localStorage.setItem("univans_bilhetes_passageiro", JSON.stringify(unificados));
    }

    return { bilhetes: unificados, sincronizadoNuvem: true };
  } catch (err) {
    console.warn("[CloudSync] Falha ao sincronizar com nuvem, usando cache local:", err);
    return { bilhetes: locais, sincronizadoNuvem: false };
  }
}

/**
 * Persiste um bilhete na nuvem (Supabase) e atualiza o perfil do passageiro
 */
export async function persistirBilheteNuvem(
  bilhete: BilhetePassagem,
  userId?: string,
): Promise<{ sucesso: boolean; id?: string; erro?: string }> {
  try {
    const idUsuario = userId || "00000000-0000-0000-0000-000000000001";
    const payload = converterBilheteParaPassagemInsert(bilhete, idUsuario);

    const { data, error } = await supabase.from("passagens").insert(payload).select().single();

    if (error) {
      console.warn("[CloudSync] Não foi possível persistir no Supabase:", error.message);
      return { sucesso: false, erro: error.message };
    }

    return { sucesso: true, id: data.id };
  } catch (err: any) {
    return { sucesso: false, erro: err.message };
  }
}
