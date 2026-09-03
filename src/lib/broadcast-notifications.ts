/**
 * ==============================================================================
 * 📢 UNIVANS BROADCAST NOTIFICATION ENGINE (v4.0)
 * Sistema de Disparo de Notificações Segmentadas por Categoria
 * (Usuário / Grátis / Motorista / Todos) com Web Push e Entrega In-App
 * ==============================================================================
 */

import { dispararNotificacaoPush } from "./push-notifications";

export type CategoriaDestinatario = "todos" | "usuario" | "gratis" | "motorista";

export type UrgenciaNotificacao = "info" | "alerta" | "urgente" | "promocao";

export interface NotificacaoBroadcast {
  id: string;
  titulo: string;
  mensagem: string;
  categoria: CategoriaDestinatario;
  urgencia: UrgenciaNotificacao;
  rotaDestino?: string | undefined;
  icone?: string | undefined;
  criadoEm: string;
  enviadoPor: string;
  totalDestinatariosEstimados: number;
}

const STORAGE_KEY_NOTIFICACOES = "univans_broadcast_notificacoes";
const STORAGE_KEY_LIDAS = "univans_notificacoes_lidas";

const mocksIniciais: NotificacaoBroadcast[] = [
  {
    id: "notif-001",
    titulo: "Operação Normal em Todas as Linhas",
    mensagem: "Linhas para Maceió, Arapiraca e Penedo com saídas pontuais e assentos liberados.",
    categoria: "todos",
    urgencia: "info",
    rotaDestino: "/app",
    criadoEm: new Date(Date.now() - 3600000 * 2).toISOString(),
    enviadoPor: "Central de Operações UniVans",
    totalDestinatariosEstimados: 1240,
  },
  {
    id: "notif-002",
    titulo: "Cota de Viagens Gratuitas Atualizada",
    mensagem: "Suas 4 passagens gratuitas deste mês já estão disponíveis no sistema.",
    categoria: "gratis",
    urgencia: "info",
    rotaDestino: "/app/beneficios",
    criadoEm: new Date(Date.now() - 3600000 * 5).toISOString(),
    enviadoPor: "Setor de Passe Livre & Gratuidade",
    totalDestinatariosEstimados: 180,
  },
  {
    id: "notif-003",
    titulo: "Aviso de Fiscalização no Trevo da Massagueira",
    mensagem: "Equipe do BPRv realizando blitz de rotina. Mantenha manifesto de passageiros e tacógrafo em dia.",
    categoria: "motorista",
    urgencia: "alerta",
    rotaDestino: "/app/motorista",
    criadoEm: new Date(Date.now() - 3600000 * 8).toISOString(),
    enviadoPor: "Despacho Operacional",
    totalDestinatariosEstimados: 68,
  },
];

let memoriaNotificacoes: NotificacaoBroadcast[] = [...mocksIniciais];
let memoriaLidas = new Set<string>();

/**
 * Templates pré-configurados para disparo rápido pelo administrador
 */
export const TEMPLATES_NOTIFICACOES = [
  {
    rotulo: "Alerta de Trânsito / Chuva",
    categoria: "todos" as CategoriaDestinatario,
    urgencia: "alerta" as UrgenciaNotificacao,
    titulo: "Aviso de Lentidão na AL-101 Sul",
    mensagem:
      "Devido às fortes chuvas, o tráfego próximo ao Trevo do Francês está lento. As vans podem operar com tolerância de até 15 minutos.",
    rotaDestino: "/app",
  },
  {
    rotulo: "Recadastramento Passe Livre",
    categoria: "gratis" as CategoriaDestinatario,
    urgencia: "urgente" as UrgenciaNotificacao,
    titulo: "Renovação Anual do Passe Livre Escolar/PCD",
    mensagem:
      "Beneficiários de gratuidade legal têm até o final do mês para atualizar a declaração na cooperativa e manter as cotas ativas.",
    rotaDestino: "/app/beneficios",
  },
  {
    rotulo: "Vistoria Semestral das Vans",
    categoria: "motorista" as CategoriaDestinatario,
    urgencia: "alerta" as UrgenciaNotificacao,
    titulo: "Convocação para Vistoria Obrigatória da Frota",
    mensagem:
      "Todos os cooperados com placa final 1, 2 e 3 devem comparecer à garagem central até sexta-feira para aferição mecânica e tacógrafo.",
    rotaDestino: "/app/motorista",
  },
  {
    rotulo: "Nova Rota Disponível",
    categoria: "usuario" as CategoriaDestinatario,
    urgencia: "promocao" as UrgenciaNotificacao,
    titulo: "Nova Rota Expressa: Maceió ➔ Penedo",
    mensagem:
      "Agora com saídas diárias às 06h00 e 15h30 com ar-condicionado e Starlink Wi-Fi. Garanta sua vaga com desconto pelo app!",
    rotaDestino: "/app/linhas",
  },
];

/**
 * Retorna a lista completa de notificações transmitidas salvas
 */
export function listarNotificacoesBroadcast(): NotificacaoBroadcast[] {
  if (typeof window === "undefined") {
    return memoriaNotificacoes;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICACOES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_NOTIFICACOES, JSON.stringify(mocksIniciais));
      return mocksIniciais;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error("[Broadcast Engine] Erro ao listar notificações:", err);
    return memoriaNotificacoes;
  }
}

/**
 * Salva uma nova notificação de broadcast e dispara eventos para ouvintes em tempo real
 */
export function salvarNotificacaoBroadcast(
  dados: Omit<NotificacaoBroadcast, "id" | "criadoEm"> & { id?: string | undefined },
): NotificacaoBroadcast {
  const nova: NotificacaoBroadcast = {
    ...dados,
    id: dados.id || `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    criadoEm: new Date().toISOString(),
  };

  memoriaNotificacoes = [nova, ...memoriaNotificacoes];

  if (typeof window !== "undefined") {
    try {
      const atuais = listarNotificacoesBroadcast();
      const atualizados = [nova, ...atuais];
      localStorage.setItem(STORAGE_KEY_NOTIFICACOES, JSON.stringify(atualizados));

      window.dispatchEvent(
        new CustomEvent("univans:nova_notificacao_broadcast", {
          detail: nova,
        }),
      );
    } catch (err) {
      console.error("[Broadcast Engine] Erro ao salvar notificação:", err);
    }
  }

  return nova;
}

/**
 * Filtra as notificações destinadas a uma categoria específica de usuário.
 * Retorna as notificações da categoria informada + as de categoria "todos".
 */
export function obterNotificacoesParaCategoria(
  categoriaUsuario: "usuario" | "gratis" | "motorista",
): NotificacaoBroadcast[] {
  const todas = listarNotificacoesBroadcast();
  return todas.filter(
    (n) => n.categoria === "todos" || n.categoria === categoriaUsuario,
  );
}

/**
 * Exclui uma notificação pelo ID
 */
export function excluirNotificacaoBroadcast(id: string): void {
  memoriaNotificacoes = memoriaNotificacoes.filter((n) => n.id !== id);
  if (typeof window === "undefined") return;
  try {
    const atuais = listarNotificacoesBroadcast();
    const filtrados = atuais.filter((n) => n.id !== id);
    localStorage.setItem(STORAGE_KEY_NOTIFICACOES, JSON.stringify(filtrados));
  } catch (err) {
    console.error("[Broadcast Engine] Erro ao excluir notificação:", err);
  }
}

/**
 * Marca uma notificação como lida no dispositivo
 */
export function marcarNotificacaoComoLida(id: string): void {
  memoriaLidas.add(id);
  if (typeof window === "undefined") return;
  try {
    const lidasRaw = localStorage.getItem(STORAGE_KEY_LIDAS);
    const lidas: string[] = lidasRaw ? JSON.parse(lidasRaw) : [];
    if (!lidas.includes(id)) {
      lidas.push(id);
      localStorage.setItem(STORAGE_KEY_LIDAS, JSON.stringify(lidas));
      window.dispatchEvent(new CustomEvent("univans:notificacao_lida", { detail: { id } }));
    }
  } catch (err) {
    console.error("[Broadcast Engine] Erro ao marcar como lida:", err);
  }
}

/**
 * Verifica se a notificação já foi lida
 */
export function isNotificacaoLida(id: string): boolean {
  if (typeof window === "undefined") {
    return memoriaLidas.has(id);
  }
  try {
    const lidasRaw = localStorage.getItem(STORAGE_KEY_LIDAS);
    const lidas: string[] = lidasRaw ? JSON.parse(lidasRaw) : [];
    return lidas.includes(id);
  } catch {
    return false;
  }
}

/**
 * Retorna o número de notificações não-lidas para a categoria do usuário
 */
export function obterContadorNaoLidas(
  categoriaUsuario: "usuario" | "gratis" | "motorista",
): number {
  const notificacoes = obterNotificacoesParaCategoria(categoriaUsuario);
  return notificacoes.filter((n) => !isNotificacaoLida(n.id)).length;
}

/**
 * Dispara uma notificação broadcast completa:
 * 1. Salva no banco de broadcast local/nuvem
 * 2. Tenta disparar Web Push nativo via Service Worker no navegador
 */
export async function dispararBroadcastAdmin(dados: {
  titulo: string;
  mensagem: string;
  categoria: CategoriaDestinatario;
  urgencia: UrgenciaNotificacao;
  rotaDestino?: string | undefined;
  enviadoPor?: string | undefined;
}): Promise<{ sucesso: boolean; notificação: NotificacaoBroadcast; webPushDisparado: boolean }> {
  // Estimativa de alcance por categoria
  const estimativas: Record<CategoriaDestinatario, number> = {
    todos: 1450,
    usuario: 1100,
    gratis: 210,
    motorista: 75,
  };

  const nova = salvarNotificacaoBroadcast({
    titulo: dados.titulo,
    mensagem: dados.mensagem,
    categoria: dados.categoria,
    urgencia: dados.urgencia,
    rotaDestino: dados.rotaDestino || "/app",
    enviadoPor: dados.enviadoPor || "Painel Administrativo UniVans",
    totalDestinatariosEstimados: estimativas[dados.categoria] || 500,
  });

  // Tenta disparar Push Notification se o navegador der suporte
  let webPushDisparado = false;
  try {
    webPushDisparado = await dispararNotificacaoPush({
      titulo: `[UniVans ${dados.categoria.toUpperCase()}] ${dados.titulo}`,
      corpo: dados.mensagem,
      rota: dados.rotaDestino || "/app",
      tag: `broadcast-${nova.id}`,
    });
  } catch (err) {
    console.warn("[Broadcast Engine] Falha ao enviar Web Push nativo:", err);
  }

  return {
    sucesso: true,
    notificação: nova,
    webPushDisparado,
  };
}
