export type CategoriaGratuidadeGov = "idoso_60" | "pcd" | "estudante_cadunico";

export interface BeneficiarioGratuidadeGov {
  nome: string;
  cpf: string;
  dataNascimento: string;
  categoria: CategoriaGratuidadeGov;
  numeroDocumentoBeneficio: string;
  orgaoEmissor: string;
  ativo: boolean;
  cadastradoEm: string;
}

export interface BilhetePassagem {
  id: string;
  linhaId: string;
  origem: string;
  destino: string;
  dataViagem: string;
  horarioSaida: string;
  horarioChegadaPrevisto: string;
  quantidadePassagens: number;
  passageiroNome: string;
  passageiroWhatsApp: string;
  passageiroCpf: string;
  valorTotal: number;
  formaPagamento: "PIX" | "CARTAO" | "GRATUIDADE_GOV";
  categoriaGratuidade?: CategoriaGratuidadeGov | undefined;
  numeroBeneficio?: string | undefined;
  assentosReservados?: string[] | undefined;
  parcelas?: number | undefined;
  status: "confirmado" | "embarcado" | "cancelado";
  pontoEmbarque?: string | undefined;
  pontoEmbarqueReferencia?: string | undefined;
  vanModelo: string;
  vanPlaca: string;
  motoristaNome: string;
  motoristaFoto: string;
  starlinkWifi?: string | undefined;
  codigoQr: string;
  criadoEm: string;
  presencaConfirmada?: boolean | undefined;
  presencaConfirmadaEm?: string | undefined;
}

export interface PagamentoPendente {
  id: string;
  linhaId: string;
  origem: string;
  destino: string;
  pontoEmbarque?: string | undefined;
  pontoEmbarqueReferencia?: string | undefined;
  dataViagem: string;
  horarioSaida: string;
  tempoEstimado: string;
  quantidadePassagens: number;
  valorTotal: number;
  chavePix: string;
  passageiroNome: string;
  passageiroWhatsApp: string;
  passageiroCpf: string;
  vanModelo: string;
  vanPlaca: string;
  motoristaNome: string;
  motoristaFoto: string;
  starlinkWifi: string;
  criadoEm: string; // ISO string
  expiraEm: string; // ISO string
}

const STORAGE_BILHETES = "partiu_bilhetes_passageiro";
const LEGACY_STORAGE_BILHETES = "univans_bilhetes_passageiro";

const STORAGE_PENDENCIAS = "partiu_pendencias_passageiro";
const LEGACY_STORAGE_PENDENCIAS = "univans_pendencias_passageiro";

const STORAGE_HISTORICO_TOTEM = "partiu_historico_embarques_totem";
const LEGACY_STORAGE_HISTORICO_TOTEM = "univans_historico_embarques_totem";

const STORAGE_BENEFICIARIO = "partiu_beneficiario_gratuidade";
const LEGACY_STORAGE_BENEFICIARIO = "univans_beneficiario_gratuidade";

const BILHETE_PADRAO: BilhetePassagem = {
  id: "PARTIU-884192",
  linhaId: "1",
  origem: "Maceió (Centro)",
  destino: "Arapiraca (Rodoviária)",
  dataViagem: "Hoje",
  horarioSaida: "14:30",
  horarioChegadaPrevisto: "16:45",
  quantidadePassagens: 1,
  passageiroNome: "Maria Clara Albuquerque",
  passageiroWhatsApp: "(82) 99841-2940",
  passageiroCpf: "***.841.294-**",
  valorTotal: 35.0,
  formaPagamento: "PIX",
  status: "confirmado",
  pontoEmbarque: "Maceió • Trevo do Tabuleiro",
  pontoEmbarqueReferencia: "Av. Fernandes Lima (Antigo Makro)",
  vanModelo: "Toyota Corolla (Partiu Pop)",
  vanPlaca: "RJP-2F14",
  motoristaNome: "Carlos Eduardo Santos",
  motoristaFoto:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  starlinkWifi: "PARTIU_Wifi_01",
  codigoQr: "PARTIU-884192-MACEIO-ARAPIRACA-1PASS",
  criadoEm: new Date().toISOString(),
};

const PENDENCIA_INICIAL: PagamentoPendente = {
  id: "PIX-98412",
  linhaId: "rota-igreja-nova-maceio",
  origem: "Igreja Nova (Terminal Central)",
  destino: "Maceió (Rodoviária do Feitosa)",
  pontoEmbarque: "Terminal Central de Igreja Nova",
  pontoEmbarqueReferencia: "Praça Agapito Soares",
  dataViagem: "Hoje, " + new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }),
  horarioSaida: "18:30",
  tempoEstimado: "2h 48m",
  quantidadePassagens: 2,
  valorTotal: 76.0,
  chavePix:
    "00020126580014br.gov.bcb.pix0136partiu-pix-checkout-8841925204000053039865802BR5920PARTIU MOBILIDADE BR6009MACEIO62070503***6304E8A2",
  passageiroNome: "Maria Clara Albuquerque",
  passageiroWhatsApp: "(82) 99841-2940",
  passageiroCpf: "084.129.414-88",
  vanModelo: "Toyota Corolla (Partiu Pop)",
  vanPlaca: "RJP-2F14",
  motoristaNome: "Carlos Eduardo Santos",
  motoristaFoto:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  starlinkWifi: "PARTIU_Wifi_01",
  criadoEm: new Date().toISOString(),
  expiraEm: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
};

export function getBilhetesPassagens(): BilhetePassagem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_BILHETES) || localStorage.getItem(LEGACY_STORAGE_BILHETES);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * 🔒 REGRA DE SEGURANÇA E ACESSO AO RADAR EM TEMPO REAL:
 * Apenas passageiros com ao menos uma passagem ativa (confirmada ou em trânsito)
 * têm permissão para rastrear o veículo em movimento ao vivo.
 */
export function temPassagemAtivaParaRadar(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const tipoUser = localStorage.getItem("partiu_user_tipo") || localStorage.getItem("univans_user_tipo");
    if (tipoUser === "motorista" || tipoUser === "admin" || tipoUser === "superadmin") {
      return true;
    }

    const bilhetes = getBilhetesPassagens();
    return bilhetes.some((b) => b.status === "confirmado" || b.status === "embarcado");
  } catch {
    return false;
  }
}

export function salvarNovoBilhete(
  novo: Omit<BilhetePassagem, "id" | "criadoEm" | "codigoQr" | "status"> & {
    id?: string | undefined;
    codigoQr?: string | undefined;
    status?: "confirmado" | "embarcado" | "cancelado" | undefined;
  },
): BilhetePassagem {
  const codigoAleatorio =
    novo.id ||
    (novo.formaPagamento === "GRATUIDADE_GOV"
      ? "CGOV-" + Math.floor(100000 + Math.random() * 900000)
      : "PARTIU-" + Math.floor(100000 + Math.random() * 900000));

  const bilheteCompleto: BilhetePassagem = {
    ...novo,
    id: codigoAleatorio,
    status: novo.status || "confirmado",
    codigoQr:
      novo.codigoQr ||
      `${codigoAleatorio}-${novo.origem.toUpperCase().slice(0, 4)}-${novo.destino.toUpperCase().slice(0, 4)}-${novo.formaPagamento === "GRATUIDADE_GOV" ? "LEI-GRATIS" : `${novo.quantidadePassagens}PASS`}`,
    criadoEm: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      const atuais = getBilhetesPassagens();
      const atualizados = [bilheteCompleto, ...atuais];
      localStorage.setItem(STORAGE_BILHETES, JSON.stringify(atualizados));
    } catch (e) {
      console.error("Erro ao salvar bilhete no localStorage:", e);
    }
  }

  return bilheteCompleto;
}

export function getBeneficiarioGratuidade(): BeneficiarioGratuidadeGov | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_BENEFICIARIO) || localStorage.getItem(LEGACY_STORAGE_BENEFICIARIO);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function salvarBeneficiarioGratuidade(
  dados: Omit<BeneficiarioGratuidadeGov, "cadastradoEm" | "ativo">,
): BeneficiarioGratuidadeGov {
  const beneficiario: BeneficiarioGratuidadeGov = {
    ...dados,
    ativo: true,
    cadastradoEm: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_BENEFICIARIO, JSON.stringify(beneficiario));
      localStorage.setItem("partiu_user_tipo", "beneficiario_gratuidade");
      localStorage.setItem("partiu_user_nome", dados.nome);
    } catch (e) {
      console.error("Erro ao salvar beneficiário:", e);
    }
  }
  return beneficiario;
}

/**
 * Conta quantas gratuidades foram emitidas para uma rota e data específica.
 */
export function contarGratuidadesNaViagem(
  linhaId: string,
  dataViagem: string,
  horarioSaida: string,
): number {
  if (typeof window === "undefined") return 0;
  try {
    const atuais = getBilhetesPassagens();
    const reservasGratuitas = atuais.filter(
      (b) =>
        b.formaPagamento === "GRATUIDADE_GOV" &&
        b.status !== "cancelado" &&
        (b.linhaId === linhaId || b.horarioSaida.includes(horarioSaida.split(" ")[0] || "")) &&
        (b.dataViagem === dataViagem || b.dataViagem === "Hoje"),
    );
    return reservasGratuitas.length;
  } catch {
    return 0;
  }
}

export function confirmarPresencaPassagem(bilheteId: string): BilhetePassagem[] {
  if (typeof window === "undefined") return [];
  try {
    const atuais = getBilhetesPassagens();
    const atualizados = atuais.map((b) => {
      if (b.id === bilheteId) {
        return {
          ...b,
          presencaConfirmada: true,
          presencaConfirmadaEm: new Date().toISOString(),
        };
      }
      return b;
    });
    localStorage.setItem(STORAGE_BILHETES, JSON.stringify(atualizados));
    return atualizados;
  } catch {
    return [];
  }
}

export function excluirBilhete(bilheteId: string): BilhetePassagem[] {
  if (typeof window === "undefined") return [];
  try {
    const atuais = getBilhetesPassagens();
    const atualizados = atuais.filter((b) => b.id !== bilheteId);
    localStorage.setItem(STORAGE_BILHETES, JSON.stringify(atualizados));
    return atualizados;
  } catch {
    return [];
  }
}

export function limparTodosBilhetes(): BilhetePassagem[] {
  if (typeof window === "undefined") return [];
  try {
    localStorage.removeItem(STORAGE_BILHETES);
    localStorage.removeItem(LEGACY_STORAGE_BILHETES);
    localStorage.removeItem(STORAGE_PENDENCIAS);
    localStorage.removeItem(LEGACY_STORAGE_PENDENCIAS);
    localStorage.removeItem(STORAGE_HISTORICO_TOTEM);
    localStorage.removeItem(LEGACY_STORAGE_HISTORICO_TOTEM);
    return [];
  } catch {
    return [];
  }
}

/**
 * 📲 VALIDAÇÃO DE PASSAGEM DE USO ÚNICO VIA QR CODE
 */
export interface ResultadoEmbarqueVan {
  sucesso: boolean;
  mensagem: string;
  bilhete?: BilhetePassagem;
  jaUtilizado?: boolean;
}

export function validarEmbarquePeloQRDaVan(
  qrPayloadVan: string,
  bilheteIdEspecifico?: string,
): ResultadoEmbarqueVan {
  if (typeof window === "undefined") {
    return { sucesso: false, mensagem: "Ambiente inválido" };
  }

  try {
    const atuais = getBilhetesPassagens();

    // Encontrar o bilhete ativo
    const bilhete = bilheteIdEspecifico
      ? atuais.find((b) => b.id === bilheteIdEspecifico)
      : atuais.find((b) => b.status === "confirmado");

    if (!bilhete) {
      const jaEmbarcado = bilheteIdEspecifico
        ? atuais.find((b) => b.id === bilheteIdEspecifico && b.status === "embarcado")
        : atuais.find((b) => b.status === "embarcado");

      if (jaEmbarcado) {
        return {
          sucesso: false,
          jaUtilizado: true,
          mensagem: `ESTA PASSAGEM JÁ FOI UTILIZADA! Carimbada em ${jaEmbarcado.presencaConfirmadaEm ? new Date(jaEmbarcado.presencaConfirmadaEm).toLocaleTimeString("pt-BR") : "viagem anterior"}. Uso único esgotado.`,
          bilhete: jaEmbarcado,
        };
      }

      return {
        sucesso: false,
        mensagem: "Nenhum bilhete ativo encontrado para este veículo.",
      };
    }

    if (bilhete.status === "embarcado") {
      return {
        sucesso: false,
        jaUtilizado: true,
        mensagem: "BILHETE JÁ UTILIZADO! Uso único já consumido.",
        bilhete,
      };
    }

    // Carimbar o bilhete como EMBARCADO (uso único consumido)
    const agoraIso = new Date().toISOString();
    const bilheteAtualizado: BilhetePassagem = {
      ...bilhete,
      status: "embarcado",
      presencaConfirmada: true,
      presencaConfirmadaEm: agoraIso,
    };

    const atualizados = atuais.map((b) => (b.id === bilhete.id ? bilheteAtualizado : b));
    localStorage.setItem(STORAGE_BILHETES, JSON.stringify(atualizados));

    // Notificar motorista e passageiro em tempo real via eventos locais
    const eventDetail = {
      bilheteId: bilheteAtualizado.id,
      passageiroNome: bilheteAtualizado.passageiroNome,
      quantidade: bilheteAtualizado.quantidadePassagens,
      valorTotal: bilheteAtualizado.valorTotal,
      pontoEmbarque: bilheteAtualizado.pontoEmbarque,
      horario: new Date().toLocaleTimeString("pt-BR"),
      qrPayloadVan,
    };
    window.dispatchEvent(new CustomEvent("partiu:embarque-confirmado", { detail: eventDetail }));
    window.dispatchEvent(new CustomEvent("univans:embarque-confirmado", { detail: eventDetail }));

    // Também salvar no histórico para persistência
    const historicoEmbarques = JSON.parse(
      localStorage.getItem(STORAGE_HISTORICO_TOTEM) || localStorage.getItem(LEGACY_STORAGE_HISTORICO_TOTEM) || "[]",
    );
    historicoEmbarques.unshift({
      id: "emb-" + Date.now(),
      bilheteId: bilheteAtualizado.id,
      passageiroNome: bilheteAtualizado.passageiroNome,
      timestamp: agoraIso,
    });
    localStorage.setItem(
      STORAGE_HISTORICO_TOTEM,
      JSON.stringify(historicoEmbarques.slice(0, 50)),
    );

    return {
      sucesso: true,
      mensagem: "Embarque validado com sucesso! Passagem de uso único confirmada.",
      bilhete: bilheteAtualizado,
    };
  } catch (e) {
    return {
      sucesso: false,
      mensagem: "Erro ao processar validação do bilhete.",
    };
  }
}

/**
 * ⏱️ MOTOR DE GESTÃO & LIMPEZA AUTOMÁTICA DE PAGAMENTOS PENDENTES
 */
export function getPendenciasAtivas(): PagamentoPendente[] {
  if (typeof window === "undefined") return [PENDENCIA_INICIAL];

  try {
    const raw = localStorage.getItem(STORAGE_PENDENCIAS) || localStorage.getItem(LEGACY_STORAGE_PENDENCIAS);
    let lista: PagamentoPendente[] = [];

    if (!raw) {
      lista = [PENDENCIA_INICIAL];
      localStorage.setItem(STORAGE_PENDENCIAS, JSON.stringify(lista));
    } else {
      lista = JSON.parse(raw);
    }

    const agora = Date.now();

    // Filtra removendo estritamente pendências com tempo de PIX expirado
    const validas = lista.filter((p) => {
      const expiraTimestamp = new Date(p.expiraEm).getTime();
      return expiraTimestamp > agora;
    });

    if (validas.length !== lista.length) {
      localStorage.setItem(STORAGE_PENDENCIAS, JSON.stringify(validas));
    }

    return validas;
  } catch {
    return [];
  }
}

export function salvarNovaPendencia(
  dados: Omit<PagamentoPendente, "id" | "criadoEm" | "expiraEm">,
  minutosValidade: number = 15,
): PagamentoPendente {
  const idAleatorio = "PIX-" + Math.floor(10000 + Math.random() * 90000);
  const agora = Date.now();
  const expiraTimestamp = agora + minutosValidade * 60 * 1000;

  const nova: PagamentoPendente = {
    ...dados,
    id: idAleatorio,
    criadoEm: new Date(agora).toISOString(),
    expiraEm: new Date(expiraTimestamp).toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      const atuais = getPendenciasAtivas();
      const atualizadas = [nova, ...atuais];
      localStorage.setItem(STORAGE_PENDENCIAS, JSON.stringify(atualizadas));
    } catch (e) {
      console.error("Erro ao salvar pendência no localStorage:", e);
    }
  }

  return nova;
}

export function removerPendencia(id: string): PagamentoPendente[] {
  if (typeof window === "undefined") return [];
  try {
    const atuais = getPendenciasAtivas();
    const filtradas = atuais.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_PENDENCIAS, JSON.stringify(filtradas));
    return filtradas;
  } catch {
    return [];
  }
}

export function confirmarPagamentoPendencia(id: string): BilhetePassagem | null {
  if (typeof window === "undefined") return null;

  try {
    const pendencias = getPendenciasAtivas();
    const pendencia = pendencias.find((p) => p.id === id);
    if (!pendencia) return null;

    // 1. Criar o bilhete oficial confirmado
    const novoBilhete = salvarNovoBilhete({
      linhaId: pendencia.linhaId,
      origem: pendencia.origem,
      destino: pendencia.destino,
      pontoEmbarque: pendencia.pontoEmbarque,
      pontoEmbarqueReferencia: pendencia.pontoEmbarqueReferencia,
      dataViagem: pendencia.dataViagem,
      horarioSaida: pendencia.horarioSaida,
      horarioChegadaPrevisto: "Em ~" + pendencia.tempoEstimado,
      quantidadePassagens: pendencia.quantidadePassagens,
      passageiroNome: pendencia.passageiroNome,
      passageiroWhatsApp: pendencia.passageiroWhatsApp,
      passageiroCpf: pendencia.passageiroCpf,
      valorTotal: pendencia.valorTotal,
      formaPagamento: "PIX",
      vanModelo: pendencia.vanModelo,
      vanPlaca: pendencia.vanPlaca,
      motoristaNome: pendencia.motoristaNome,
      motoristaFoto: pendencia.motoristaFoto,
      starlinkWifi: pendencia.starlinkWifi,
    });

    // 2. Remover a pendência da fila
    removerPendencia(id);

    return novoBilhete;
  } catch {
    return null;
  }
}
