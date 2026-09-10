/**
 * ==============================================================================
 * 📢 PARTIU BROADCAST NOTIFICATION ENGINE (v4.0)
 * Sistema de Disparo de Notificações Segmentadas por Categoria
 * (Passageiro / Cupons / Motorista & Entregador / Todos) com Web Push e In-App
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

const STORAGE_KEY_NOTIFICACOES = "partiu_broadcast_notificacoes";
const STORAGE_KEY_LIDAS = "partiu_notificacoes_lidas";

const mocksIniciais: NotificacaoBroadcast[] = [
  {
    id: "notif-001",
    titulo: "Operação Normal — Alta Disponibilidade",
    mensagem: "Corridas de carro (Partiu Pop), moto e entregas expressas com tempo de resposta médio de 3 minutos.",
    categoria: "todos",
    urgencia: "info",
    rotaDestino: "/app",
    criadoEm: new Date(Date.now() - 3600000 * 2).toISOString(),
    enviadoPor: "Central de Operações PARTIU",
    totalDestinatariosEstimados: 2450,
  },
  {
    id: "notif-002",
    titulo: "Desconto de 20% na Sua Próxima Corrida",
    mensagem: "Use o cupom PARTIU20 e ganhe 20% OFF no seu próximo trajeto de carro ou moto.",
    categoria: "gratis",
    urgencia: "promocao",
    rotaDestino: "/app",
    criadoEm: new Date(Date.now() - 3600000 * 5).toISOString(),
    enviadoPor: "Marketing PARTIU",
    totalDestinatariosEstimados: 1800,
  },
  {
    id: "notif-003",
    titulo: "Alta Demanda na Região Central (1.4x)",
    mensagem:
      "Tarifa dinâmica ativa nas imediações do centro. Fature mais por quilômetro rodado neste horário de pico!",
    categoria: "motorista",
    urgencia: "alerta",
    rotaDestino: "/app/motorista",
    criadoEm: new Date(Date.now() - 3600000 * 8).toISOString(),
    enviadoPor: "Despacho Inteligente PARTIU",
    totalDestinatariosEstimados: 120,
  },
];

let memoriaNotificacoes: NotificacaoBroadcast[] = [...mocksIniciais];
const memoriaLidas = new Set<string>();

/**
 * Templates pré-configurados para disparo rápido pelo administrador
 */
export const TEMPLATES_NOTIFICACOES = [
  {
    rotulo: "Alerta de Trânsito / Chuva",
    categoria: "todos" as CategoriaDestinatario,
    urgencia: "alerta" as UrgenciaNotificacao,
    titulo: "Chuva Intensa na Cidade",
    mensagem:
      "Tráfego com velocidade reduzida nas principais avenidas. O tempo de chegada dos motoristas parceiros pode sofrer pequeno atraso.",
    rotaDestino: "/app",
  },
  {
    rotulo: "Cupom Promocional (Passageiros)",
    categoria: "usuario" as CategoriaDestinatario,
    urgencia: "promocao" as UrgenciaNotificacao,
    titulo: "Sua Corrida com Desconto Especial!",
    mensagem:
      "Aproveite 15% de desconto em corridas Partiu Pop hoje até as 22h. Não precisa digitar código, já está ativo!",
    rotaDestino: "/app",
  },
  {
    rotulo: "Aviso de Tarifa Dinâmica (Motoristas)",
    categoria: "motorista" as CategoriaDestinatario,
    urgencia: "urgente" as UrgenciaNotificacao,
    titulo: "Horário de Pico: Ganhe até 1.5x Mais",
    mensagem:
      "Grande volume de passageiros solicitando corridas. Fique online no aplicativo para maximizar seus ganhos com repasse imediato via PIX D+0!",
    rotaDestino: "/app/motorista",
  },
  {
    rotulo: "Nova Categoria Flash (Entregas)",
    categoria: "todos" as CategoriaDestinatario,
    urgencia: "promocao" as UrgenciaNotificacao,
    titulo: "Envie Encomendas com o Partiu Flash",
    mensagem:
      "Precisa enviar documentos ou pacotes pequenos? Chame um motociclista parceiro agora por apenas R$ 7,90!",
    rotaDestino: "/app/encomendas",
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
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICACOES) || localStorage.getItem("univans_broadcast_notificacoes");
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
        new CustomEvent("partiu:nova_notificacao_broadcast", {
          detail: nova,
        }),
      );
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
  return todas.filter((n) => n.categoria === "todos" || n.categoria === categoriaUsuario);
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
    const lidasRaw = localStorage.getItem(STORAGE_KEY_LIDAS) || localStorage.getItem("univans_notificacoes_lidas");
    const lidas: string[] = lidasRaw ? JSON.parse(lidasRaw) : [];
    if (!lidas.includes(id)) {
      lidas.push(id);
      localStorage.setItem(STORAGE_KEY_LIDAS, JSON.stringify(lidas));
      window.dispatchEvent(new CustomEvent("partiu:notificacao_lida", { detail: { id } }));
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
    const lidasRaw = localStorage.getItem(STORAGE_KEY_LIDAS) || localStorage.getItem("univans_notificacoes_lidas");
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
    todos: 3500,
    usuario: 2800,
    gratis: 600,
    motorista: 320,
  };

  const nova = salvarNotificacaoBroadcast({
    titulo: dados.titulo,
    mensagem: dados.mensagem,
    categoria: dados.categoria,
    urgencia: dados.urgencia,
    rotaDestino: dados.rotaDestino || "/app",
    enviadoPor: dados.enviadoPor || "Painel Administrativo PARTIU",
    totalDestinatariosEstimados: estimativas[dados.categoria] || 500,
  });

  // Tenta disparar Push Notification se o navegador der suporte
  let webPushDisparado = false;
  try {
    webPushDisparado = await dispararNotificacaoPush({
      titulo: `[PARTIU ${dados.categoria.toUpperCase()}] ${dados.titulo}`,
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
