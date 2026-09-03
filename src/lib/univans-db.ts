/**
 * Camada de acesso a dados do UniVans — Supabase (PostgreSQL) + React Query.
 * Substitui os stores locais por tabelas reais com RLS e Realtime.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { TelemetriaVeiculo } from "@/lib/superadmin-config";

export type Linha = Tables<"linhas">;
export type PontoEmbarque = Tables<"pontos_embarque">;
export type Veiculo = Tables<"veiculos">;
export type Viagem = Tables<"viagens">;
export type Passagem = Tables<"passagens">;
export type FechamentoCaixa = Tables<"fechamento_caixa">;
export type Banner = Tables<"banners">;
export type Perfil = Tables<"profiles">;
export type AlertaSOSRow = Tables<"alertas_sos">;
export type DespesaOperacionalRow = Tables<"despesas_operacionais">;

function desembrulhar<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

/* ------------------------------- LINHAS ------------------------------- */

export const chavesLinhas = ["linhas"] as const;

export function useLinhas(): UseQueryResult<Linha[]> {
  return useQuery({
    queryKey: chavesLinhas,
    queryFn: async () =>
      desembrulhar<Linha[]>(
        await supabase.from("linhas").select("*").eq("ativo", true).order("origem"),
      ),
  });
}

/* --------------------------- PONTOS DE EMBARQUE ------------------------ */

export function usePontosEmbarque(linhaId?: string): UseQueryResult<PontoEmbarque[]> {
  return useQuery({
    queryKey: ["pontos_embarque", linhaId ?? "todos"],
    queryFn: async () => {
      let q = supabase.from("pontos_embarque").select("*").eq("ativo", true).order("ordem");
      if (linhaId) q = q.eq("linha_id", linhaId);
      return desembrulhar<PontoEmbarque[]>(await q);
    },
  });
}

/* ------------------------------- VIAGENS ------------------------------- */

export type ViagemComLinha = Viagem & { linhas: Linha | null };

export function useViagensDoDia(dataISO?: string): UseQueryResult<ViagemComLinha[]> {
  const data = dataISO ?? new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ["viagens", data],
    queryFn: async () =>
      desembrulhar<ViagemComLinha[]>(
        await supabase
          .from("viagens")
          .select("*, linhas(*)")
          .eq("data_viagem", data)
          .order("horario_saida"),
      ),
  });
}

export function useViagem(viagemId?: string): UseQueryResult<ViagemComLinha | null> {
  return useQuery({
    enabled: Boolean(viagemId),
    queryKey: ["viagem", viagemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("viagens")
        .select("*, linhas(*)")
        .eq("id", viagemId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as ViagemComLinha | null) ?? null;
    },
  });
}

export function useAtualizarTelemetria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string } & TablesUpdate<"viagens">) => {
      const { id, ...campos } = payload;
      const { error } = await supabase.from("viagens").update(campos).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["viagens"] });
      void qc.invalidateQueries({ queryKey: ["viagem"] });
    },
  });
}

export function useDecrementarVagasViagem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ viagemId, quantidade }: { viagemId: string; quantidade: number }) => {
      // 1. Executa via RPC atômica no PostgreSQL com bloqueio de linha (FOR UPDATE) anti-concorrência
      try {
        const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)(
          "reservar_vagas_viagem_atomica",
          {
            p_viagem_id: viagemId,
            p_quantidade: quantidade,
          },
        );

        if (!rpcErr && rpcData) {
          const res = rpcData as { sucesso: boolean; erro?: string };
          if (!res.sucesso && res.erro === "VAGAS_INSUFICIENTES") {
            throw new Error("Não há vagas suficientes disponíveis nesta van.");
          }
          if (res.sucesso) return;
        }
      } catch (err: any) {
        if (err.message && err.message.includes("vagas suficientes")) throw err;
        // Se a RPC ainda não existir no Supabase, continua para o fallback
      }

      // 2. Fallback de contingência com verificação estrita de disponibilidade
      const { data: v, error: fetchErr } = await supabase
        .from("viagens")
        .select("vagas_ocupadas, vagas_totais")
        .eq("id", viagemId)
        .single();
      if (fetchErr) throw new Error(fetchErr.message);

      const ocupadasAtuais = v?.vagas_ocupadas ?? 0;
      const totalVagas = v?.vagas_totais ?? 16;
      if (ocupadasAtuais + quantidade > totalVagas) {
        throw new Error("Não há vagas suficientes disponíveis nesta van.");
      }

      const { error: updErr } = await supabase
        .from("viagens")
        .update({ vagas_ocupadas: ocupadasAtuais + quantidade })
        .eq("id", viagemId);
      if (updErr) throw new Error(updErr.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["viagens"] });
      void qc.invalidateQueries({ queryKey: ["viagem"] });
      void qc.invalidateQueries({ queryKey: ["telemetria"] });
    },
  });
}

export function useViagemRealtime(viagemId?: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!viagemId) return;
    const channel = supabase
      .channel(`viagem-live-${viagemId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "viagens",
          filter: `id=eq.${viagemId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["viagem", viagemId] });
          void qc.invalidateQueries({ queryKey: ["viagens"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [viagemId, qc]);
}

/* ------------------------------ PASSAGENS ------------------------------ */

export function useMinhasPassagens(passageiroId?: string): UseQueryResult<Passagem[]> {
  return useQuery({
    enabled: Boolean(passageiroId),
    queryKey: ["passagens", "minhas", passageiroId],
    queryFn: async () =>
      desembrulhar<Passagem[]>(
        await supabase
          .from("passagens")
          .select("*")
          .eq("passageiro_id", passageiroId!)
          .order("created_at", { ascending: false }),
      ),
  });
}

export function useManifestoViagem(viagemId?: string): UseQueryResult<Passagem[]> {
  return useQuery({
    enabled: Boolean(viagemId),
    queryKey: ["passagens", "manifesto", viagemId],
    queryFn: async () =>
      desembrulhar<Passagem[]>(
        await supabase.from("passagens").select("*").eq("viagem_id", viagemId!).order("created_at"),
      ),
  });
}

export function usePassagensTodas(): UseQueryResult<Passagem[]> {
  return useQuery({
    queryKey: ["passagens", "todas"],
    queryFn: async () =>
      desembrulhar<Passagem[]>(
        await supabase.from("passagens").select("*").order("created_at", { ascending: false }),
      ),
  });
}

export function gerarCodigoBilhete() {
  return `CVAN-${Math.floor(100000 + Math.random() * 899999)}`;
}

export function useCriarPassagem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: TablesInsert<"passagens">) => {
      const { data, error } = await supabase.from("passagens").insert(dados).select().single();
      if (error) throw new Error(error.message);
      return data as Passagem;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["passagens"] }),
  });
}

export function useConfirmarEmbarque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (passagemId: string) => {
      const { error } = await supabase
        .from("passagens")
        .update({ status_embarque: "embarcado", embarcado_em: new Date().toISOString() })
        .eq("id", passagemId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["passagens"] }),
  });
}

/* ------------------------------- VEÍCULOS ------------------------------ */

export function useMeusVeiculos(motoristaId?: string): UseQueryResult<Veiculo[]> {
  return useQuery({
    enabled: Boolean(motoristaId),
    queryKey: ["veiculos", motoristaId],
    queryFn: async () =>
      desembrulhar<Veiculo[]>(
        await supabase.from("veiculos").select("*").eq("motorista_id", motoristaId!),
      ),
  });
}

/* --------------------------- FECHAMENTO DE CAIXA ----------------------- */

export function useFechamentoCaixa(motoristaId?: string): UseQueryResult<FechamentoCaixa[]> {
  return useQuery({
    enabled: Boolean(motoristaId),
    queryKey: ["fechamento_caixa", motoristaId],
    queryFn: async () =>
      desembrulhar<FechamentoCaixa[]>(
        await supabase
          .from("fechamento_caixa")
          .select("*")
          .eq("motorista_id", motoristaId!)
          .order("data_referencia", { ascending: false }),
      ),
  });
}

/* -------------------------------- BANNERS ------------------------------ */

export function useBanners(): UseQueryResult<Banner[]> {
  return useQuery({
    queryKey: ["banners"],
    queryFn: async () =>
      desembrulhar<Banner[]>(
        await supabase.from("banners").select("*").eq("ativo", true).order("ordem"),
      ),
  });
}

/* --------------------------- PERFIL E PAPÉIS --------------------------- */

export function usePerfil(userId?: string): UseQueryResult<Perfil | null> {
  return useQuery({
    enabled: Boolean(userId),
    queryKey: ["perfil", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ?? null;
    },
  });
}

export function usePapeis(userId?: string): UseQueryResult<string[]> {
  return useQuery({
    enabled: Boolean(userId),
    queryKey: ["user_roles", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => r.role as string);
    },
  });
}

/* ------------------------------- REALTIME ------------------------------ */

/**
 * Assina alterações Postgres em uma tabela e invalida o cache do React Query.
 */
export function useRealtimeTabela(
  tabela: "viagens" | "passagens" | "pontos_embarque",
  chaveCache: readonly unknown[],
  filtro?: string,
) {
  const qc = useQueryClient();
  const chave = JSON.stringify(chaveCache);
  useEffect(() => {
    const canal = supabase
      .channel(`rt_${tabela}_${filtro ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: tabela, ...(filtro ? { filter: filtro } : {}) },
        () => {
          void qc.invalidateQueries({ queryKey: JSON.parse(chave) as unknown[] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [tabela, filtro, chave, qc]);
}

/* ============================ ADMIN — ESCRITA ============================ */

export function useLinhasAdmin(): UseQueryResult<Linha[]> {
  return useQuery({
    queryKey: ["admin", "linhas"],
    queryFn: async () =>
      desembrulhar<Linha[]>(
        await supabase.from("linhas").select("*").order("created_at", { ascending: false }),
      ),
  });
}

export function useSalvarLinha() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: TablesInsert<"linhas"> & { id?: string }) => {
      const { id, ...campos } = dados;
      if (id) {
        const { error } = await supabase.from("linhas").update(campos).eq("id", id);
        if (error) throw new Error(error.message);
        return;
      }
      const { error } = await supabase.from("linhas").insert(campos);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "linhas"] });
      void qc.invalidateQueries({ queryKey: chavesLinhas });
    },
  });
}

export function useExcluirLinha() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("linhas").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "linhas"] });
      void qc.invalidateQueries({ queryKey: chavesLinhas });
    },
  });
}

export function usePontosAdmin(linhaId?: string): UseQueryResult<PontoEmbarque[]> {
  return useQuery({
    queryKey: ["admin", "pontos", linhaId ?? "todos"],
    queryFn: async () => {
      let q = supabase.from("pontos_embarque").select("*").order("ordem");
      if (linhaId) q = q.eq("linha_id", linhaId);
      return desembrulhar<PontoEmbarque[]>(await q);
    },
  });
}

export function useSalvarPonto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: TablesInsert<"pontos_embarque"> & { id?: string }) => {
      const { id, ...campos } = dados;
      if (id) {
        const { error } = await supabase.from("pontos_embarque").update(campos).eq("id", id);
        if (error) throw new Error(error.message);
        return;
      }
      const { error } = await supabase.from("pontos_embarque").insert(campos);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "pontos"] });
      void qc.invalidateQueries({ queryKey: ["pontos_embarque"] });
    },
  });
}

export function useExcluirPonto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pontos_embarque").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "pontos"] });
      void qc.invalidateQueries({ queryKey: ["pontos_embarque"] });
    },
  });
}

export function useVeiculosAdmin(): UseQueryResult<Veiculo[]> {
  return useQuery({
    queryKey: ["admin", "veiculos"],
    queryFn: async () =>
      desembrulhar<Veiculo[]>(
        await supabase.from("veiculos").select("*").order("created_at", { ascending: false }),
      ),
  });
}

export function useAtualizarStatusVeiculo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      status: "pendente" | "aprovado" | "rejeitado" | "bloqueado";
    }) => {
      const { error } = await supabase
        .from("veiculos")
        .update({ status_aprovacao: payload.status })
        .eq("id", payload.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "veiculos"] }),
  });
}

export function useCaixaAdmin(): UseQueryResult<FechamentoCaixa[]> {
  return useQuery({
    queryKey: ["admin", "caixa"],
    queryFn: async () =>
      desembrulhar<FechamentoCaixa[]>(
        await supabase
          .from("fechamento_caixa")
          .select("*")
          .order("data_referencia", { ascending: false }),
      ),
  });
}

export function calcularSplit(totalBruto: number, taxaPct: number) {
  const valorCooperativa = Number(((totalBruto * taxaPct) / 100).toFixed(2));
  return {
    valor_cooperativa: valorCooperativa,
    valor_liquido_motorista: Number((totalBruto - valorCooperativa).toFixed(2)),
  };
}

export function useSalvarCaixa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: TablesInsert<"fechamento_caixa"> & { id?: string }) => {
      const { id, ...campos } = dados;
      if (id) {
        const { error } = await supabase.from("fechamento_caixa").update(campos).eq("id", id);
        if (error) throw new Error(error.message);
        return;
      }
      const { error } = await supabase.from("fechamento_caixa").insert(campos);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "caixa"] }),
  });
}

export function useAlterarStatusCaixa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      status: "aberto" | "fechado" | "pago_ao_motorista";
    }) => {
      const { error } = await supabase
        .from("fechamento_caixa")
        .update({
          status: payload.status,
          fechado_em: payload.status === "aberto" ? null : new Date().toISOString(),
        })
        .eq("id", payload.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "caixa"] }),
  });
}

export function useMotoristas(): UseQueryResult<
  Array<{
    id: string;
    full_name: string | null;
    cpf: string | null;
    phone: string | null;
    avatar_url: string | null;
  }>
> {
  return useQuery({
    queryKey: ["admin", "motoristas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "motorista");
      if (error) throw new Error(error.message);
      const ids = (data ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data: perfis, error: erroPerfis } = await supabase
        .from("profiles")
        .select("id, full_name, cpf, phone, avatar_url")
        .in("id", ids);
      if (erroPerfis) throw new Error(erroPerfis.message);
      return (perfis ?? []) as Array<{
        id: string;
        full_name: string | null;
        cpf: string | null;
        phone: string | null;
        avatar_url: string | null;
      }>;
    },
  });
}

/* ==================== TELEMETRIA DA FROTA (TEMPO REAL) ==================== */

const FOTO_PADRAO =
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80";

type ViagemTelemetria = Viagem & {
  linhas: Pick<
    Linha,
    "origem" | "destino" | "origem_lat" | "origem_lng" | "destino_lat" | "destino_lng"
  > | null;
  veiculos: Pick<
    Veiculo,
    "placa" | "modelo" | "capacidade_vagas" | "starlink_wifi_ssid" | "status_aprovacao"
  > | null;
};

function statusTelemetria(status: string): TelemetriaVeiculo["status"] {
  if (status === "em_andamento" || status === "em_transito") return "em_rota";
  if (status === "embarcando" || status === "embarque_imediato") return "embarcando";
  if (status === "sos" || status === "socorro") return "socorro_sos";
  if (status === "finalizada" || status === "concluida" || status === "cancelada") return "garagem";
  return "parado";
}

// Cache em memória de perfis de motoristas para eliminar queries repetitivas N+1
const cachePerfisMotoristas = new Map<string, string>();

/** Converte as viagens do dia (com posição GPS gravada no banco) em telemetria de frota. */
export function useTelemetriaFrota(): UseQueryResult<TelemetriaVeiculo[]> {
  const consulta = useQuery({
    queryKey: ["telemetria", "frota"],
    refetchInterval: 30_000, // Heartbeat de 30s (o canal Realtime WebSocket já faz push instantâneo)
    staleTime: 10_000,
    queryFn: async (): Promise<TelemetriaVeiculo[]> => {
      const hoje = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("viagens")
        .select(
          "*, linhas(origem, destino, origem_lat, origem_lng, destino_lat, destino_lng), veiculos(placa, modelo, capacidade_vagas, starlink_wifi_ssid, status_aprovacao)",
        )
        .eq("data_viagem", hoje)
        .order("horario_saida", { ascending: true });
      if (error) throw new Error(error.message);

      const viagens = (data ?? []) as unknown as ViagemTelemetria[];
      const motoristasFaltantes = [
        ...new Set(
          viagens.map((v) => v.motorista_id).filter((id) => !cachePerfisMotoristas.has(id)),
        ),
      ];

      if (motoristasFaltantes.length > 0) {
        const { data: perfis } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", motoristasFaltantes);
        (perfis ?? []).forEach((p) => {
          cachePerfisMotoristas.set(p.id, p.full_name ?? "Motorista");
        });
      }

      return viagens.map((v) => {
        const lat = v.posicao_lat_atual ?? v.linhas?.origem_lat ?? -9.6658;
        const lng = v.posicao_lng_atual ?? v.linhas?.origem_lng ?? -35.735;
        const capacidade = v.veiculos?.capacidade_vagas ?? v.vagas_totais;
        return {
          id: v.id,
          placa: v.veiculos?.placa ?? "SEM PLACA",
          modelo: v.veiculos?.modelo ?? "Van não vinculada",
          motorista: cachePerfisMotoristas.get(v.motorista_id) ?? "Motorista",
          telefoneMotorista: "",
          fotoMotorista: FOTO_PADRAO,
          linhaOrigem: v.linhas?.origem ?? "—",
          linhaDestino: v.linhas?.destino ?? "—",
          tipoDispositivo: "starlink",
          imeiDispositivo: v.veiculo_id ?? v.id,
          starlinkAntenaId: v.veiculo_id ?? v.id,
          starlinkWifiSsid: v.veiculos?.starlink_wifi_ssid ?? "UniVans_Starlink",
          starlinkWifiSenha: "univansviajar",
          lat,
          lng,
          velocidadeKmH: v.status === "em_andamento" || v.status === "em_transito" ? 82 : 0,
          rumoGraus: 0,
          status: statusTelemetria(v.status),
          VagasOcupados: v.vagas_ocupadas,
          VagasTotal: capacidade,
          starlinkConectada: v.posicao_lat_atual != null,
          satelitesVisiveis: v.posicao_lat_atual != null ? 32 : 0,
          latenciaMs: 38,
          downloadMbps: 152,
          arCondicionado: true,
          nivelCombustivel: 78,
          tensaoBateriaVolts: 13.8,
          temperaturaMotor: 88,
          proximaParada: v.linhas?.destino ?? "—",
          previsaoChegadaMin: 0,
          distanciaRestanteKm: 0,
          ultimaAtualizacao: v.updated_at,
        } as TelemetriaVeiculo;
      });
    },
  });

  useRealtimeTabela("viagens", ["telemetria", "frota"]);
  return consulta;
}

/* ======================= BILHETES PIX (PASSAGEIRO) ======================= */

function digitosPix(valor: number, txid: string) {
  // Payload PIX simplificado (BR Code estático de demonstração).
  const chave = "pix@univans.com.br";
  const valorStr = valor.toFixed(2);
  return [
    "00020126",
    `0014BR.GOV.BCB.PIX01${String(chave.length).padStart(2, "0")}${chave}`,
    "52040000530398654",
    `04${valorStr}5802BR5906UNIVANS6009SAO PAULO62`,
    `${String(txid.length + 4).padStart(2, "0")}05${String(txid.length).padStart(2, "0")}${txid}`,
    "6304ABCD",
  ].join("");
}

export type DadosEmissaoBilhete = {
  viagemId: string;
  passageiroId: string;
  pontoEmbarqueId?: string | null;
  nome: string;
  whatsapp: string;
  cpf: string;
  quantidade: number;
  valorUnitario: number;
};

export function useEmitirBilhetePix() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: DadosEmissaoBilhete) => {
      const codigo = gerarCodigoBilhete();
      const txid = `UV${Date.now().toString(36).toUpperCase()}`;
      const total = Number((dados.valorUnitario * dados.quantidade).toFixed(2));
      const registro: TablesInsert<"passagens"> = {
        codigo_bilhete: codigo,
        viagem_id: dados.viagemId,
        passageiro_id: dados.passageiroId,
        ponto_embarque_id: dados.pontoEmbarqueId ?? null,
        passageiro_nome: dados.nome,
        passageiro_whatsapp: dados.whatsapp,
        passageiro_cpf: dados.cpf,
        quantidade_passagens: dados.quantidade,
        valor_total: total,
        forma_pagamento: "PIX",
        status_pagamento: "pendente",
        pix_txid: txid,
        pix_copia_cola: digitosPix(total, txid),
        pix_expira_em: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        codigo_qr: `${codigo}-${txid}`,
      };
      const { data, error } = await supabase.from("passagens").insert(registro).select().single();
      if (error) throw new Error(error.message);
      return data as Passagem;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["passagens"] }),
  });
}

export function useMarcarPagamentoPix() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (passagemId: string) => {
      const { error } = await supabase
        .from("passagens")
        .update({ status_pagamento: "pago" })
        .eq("id", passagemId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["passagens"] });
      void qc.invalidateQueries({ queryKey: ["viagens"] });
    },
  });
}

/* ------------------------ ALERTAS SOS (TEMPO REAL) ---------------------- */

export function useAlertasSOS(): UseQueryResult<AlertaSOSRow[]> {
  return useQuery({
    queryKey: ["alertas_sos"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("alertas_sos")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw new Error(error.message);
        return data ?? [];
      } catch (err) {
        console.warn("Supabase alertas_sos indisponível, usando fallback:", err);
        return [];
      }
    },
  });
}

export function useAlertasSOSRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("alertas-sos-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "alertas_sos",
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["alertas_sos"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);
}

export function useCriarAlertaSOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: TablesInsert<"alertas_sos">) => {
      const { data, error } = await supabase.from("alertas_sos").insert(dados).select().single();
      if (error) throw new Error(error.message);
      return data as AlertaSOSRow;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["alertas_sos"] });
    },
  });
}

export function useAtualizarStatusSOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "ativo" | "em_atendimento" | "resolvido";
    }) => {
      const { error } = await supabase.from("alertas_sos").update({ status }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["alertas_sos"] });
    },
  });
}

/* ----------------------- DESPESAS OPERACIONAIS -------------------------- */

export function useDespesasOperacionais(): UseQueryResult<DespesaOperacionalRow[]> {
  return useQuery({
    queryKey: ["despesas_operacionais"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("despesas_operacionais")
          .select("*")
          .order("data_despesa", { ascending: false });
        if (error) throw new Error(error.message);
        return data ?? [];
      } catch (err) {
        console.warn("Supabase despesas_operacionais indisponível:", err);
        return [];
      }
    },
  });
}

export function useCriarDespesaOperacional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: TablesInsert<"despesas_operacionais">) => {
      const { data, error } = await supabase
        .from("despesas_operacionais")
        .insert(dados)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as DespesaOperacionalRow;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["despesas_operacionais"] });
    },
  });
}

export function useConciliarDespesa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, conciliado }: { id: string; conciliado: boolean }) => {
      const { error } = await supabase
        .from("despesas_operacionais")
        .update({ conciliado })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["despesas_operacionais"] });
    },
  });
}
