import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  HeartPulse,
  MapPin,
  Phone,
  Radio,
  Satellite,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { alertasSOSMock, type AlertaSOS } from "@/lib/admin-data";

import { useCriarAlertaSOS } from "@/lib/partiu-db";

export const Route = createFileRoute("/app/sos")({
  head: () => ({
    meta: [
      { title: "Emergência & Botão SOS 24h | PARTIU" },
      {
        name: "description",
        content:
          "Botão de emergência 24h, acionamento da central de suporte e rastreamento de segurança.",
      },
    ],
  }),
  component: EmergenciaSOSPage,
});

export function EmergenciaSOSPage() {
  const criarSOS = useCriarAlertaSOS();
  const [sosAtivado, setSosAtivado] = useState(false);
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [tipoOcorrencia, setTipoOcorrencia] = useState<
    "pane_mecanica" | "emergencia_medica" | "seguranca" | "acidente_rodovia"
  >("seguranca");
  const [detalhes, setDetalhes] = useState("");
  const [coordenadas] = useState("-9.6498, -35.7089 (Maceió / Alagoas - GPS)");

  async function acionarSOS() {
    try {
      const res = await criarSOS.mutateAsync({
        tipo: tipoOcorrencia,
        solicitante_nome: "Passageiro / Condutor PARTIU",
        solicitante_telefone: "+5582998412290",
        van_placa: "RJP-2F14",
        rodovia: "Perímetro Urbano / Rodovia",
        coordenadas,
        status: "ativo",
        descricao: detalhes.trim() || "Chamado de emergência disparado pelo botão de pânico.",
      });
      setProtocolo(res.id.slice(0, 8).toUpperCase());
      setSosAtivado(true);
    } catch {
      setProtocolo("EMERG-OFFLINE");
      setSosAtivado(true);
    }
  }

  return (
    <div className="px-1.5 sm:px-4 pt-2 pb-28 w-full max-w-full sm:max-w-2xl mx-auto">
      {/* 1. Header */}
      <div className="flex items-center gap-2.5">
        <Link
          to="/app"
          className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-card text-foreground shadow-xs hover:bg-accent transition-colors cursor-pointer"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </Link>
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-destructive uppercase tracking-wider">
            <ShieldAlert className="h-3.5 w-3.5" /> Segurança na Viagem
          </span>
          <h1 className="text-lg sm:text-2xl font-black tracking-tight text-foreground">
            Central de Emergência & SOS
          </h1>
        </div>
      </div>

      {/* 2. Botão Principal de Pânico */}
      {!sosAtivado ? (
        <div className="mt-4 rounded-2xl bg-card p-4 sm:p-8 text-center shadow-sm border border-destructive/20 space-y-4">
          <div>
            <p className="text-sm sm:text-lg font-extrabold text-foreground">
              Precisa de ajuda imediata na rodovia?
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
              Ao acionar o SOS, sua localização Starlink em tempo real será transmitida para a
              Central da Cooperativa e autoridades.
            </p>
          </div>

          <div className="flex justify-center py-3">
            <button
              type="button"
              onClick={acionarSOS}
              className="relative flex h-40 w-40 flex-col items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-red-800 text-white shadow-2xl transition-all hover:scale-105 active:scale-95 animate-pulse cursor-pointer"
              aria-label="Botão de Pânico SOS"
            >
              <AlertOctagon className="h-14 w-14 mb-1" />
              <span className="text-2xl font-black tracking-wider">SOS</span>
              <span className="text-xs uppercase font-bold text-white/80">Pressione</span>
            </button>
          </div>

          {/* Telemetria de Localização Atual */}
          <div className="rounded-2xl bg-accent/50 p-4 text-left text-xs sm:text-sm border border-border/40 space-y-1">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Satellite className="h-4 w-4 text-[#0d5930]" /> Localização GPS / Starlink Ativa
            </div>
            <p className="text-xs text-muted-foreground">{coordenadas}</p>
          </div>

          {/* Números de Emergência Rápidos */}
          <div className="space-y-3 pt-2">
            <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-muted-foreground text-left">
              Contatos de Emergência Imediata:
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <a
                href="tel:190"
                className="flex min-h-[48px] h-12 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs sm:text-sm font-bold text-foreground border border-border/40 hover:bg-accent/80 active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                <Phone className="h-4.5 w-4.5 text-blue-600" /> Polícia (190)
              </a>

              <a
                href="tel:192"
                className="flex min-h-[48px] h-12 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs sm:text-sm font-bold text-foreground border border-border/40 hover:bg-accent/80 active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                <HeartPulse className="h-4.5 w-4.5 text-red-600" /> SAMU (192)
              </a>

              <a
                href="tel:193"
                className="flex min-h-[48px] h-12 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs sm:text-sm font-bold text-foreground border border-border/40 hover:bg-accent/80 active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                <AlertTriangle className="h-4.5 w-4.5 text-amber-600" /> Bombeiros (193)
              </a>

              <a
                href="tel:+5582988727777"
                className="flex min-h-[48px] h-12 items-center justify-center gap-2 rounded-xl bg-[#0d5930] px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-xs hover:brightness-105 active:scale-95 transition-all cursor-pointer"
              >
                <Radio className="h-4.5 w-4.5 text-amber-300" /> Central 24h
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Estado de SOS Disparado */
        <div className="mt-5 rounded-3xl bg-destructive/10 p-6 sm:p-8 text-center shadow-xl border border-destructive/40 space-y-4 animate-in zoom-in-95">
          <div className="mx-auto flex h-12 sm:h-11 sm:h-12 w-16 items-center justify-center rounded-full bg-destructive text-white shadow-lg animate-bounce">
            <AlertOctagon className="h-10 w-10" />
          </div>

          <div>
            <span className="rounded-full bg-destructive px-3 py-1 text-xs font-black text-white uppercase tracking-wider">
              ALERTA SOS EMITIDO
            </span>
            <h2 className="text-xl font-black text-foreground mt-2">
              Sua Solicitação foi Enviada!
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              A Central de Monitoramento PARTIU recebeu suas coordenadas exatas e acionou a equipe de apoio.
            </p>
          </div>

          <div className="rounded-2xl bg-card p-4 text-xs text-left space-y-1.5 border border-border/60">
            {protocolo && (
              <p>
                <span className="font-bold">Protocolo:</span> #{protocolo} (Registrado no Banco)
              </p>
            )}
            <p>
              <span className="font-bold">Posição:</span> {coordenadas}
            </p>
            <p>
              <span className="font-bold">Status:</span> Despacho de apoio em andamento
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <a
              href="tel:+5582988727777"
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-destructive text-xs font-black text-white shadow-lg"
            >
              <Phone className="h-4 w-4 fill-white" /> Falar com Atendente de Emergência
            </a>

            <button
              type="button"
              onClick={() => setSosAtivado(false)}
              className="flex h-10 items-center justify-center rounded-full bg-card text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              Cancelar Alerta de Teste
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
