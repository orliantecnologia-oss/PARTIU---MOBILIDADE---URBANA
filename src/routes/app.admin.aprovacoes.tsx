import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Bike,
  Car,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  FileText,
  Filter,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  X,
  XCircle,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/app/admin/aprovacoes")({
  head: () => ({
    meta: [
      { title: "Aprovação de Motoristas & Entregadores | PARTIU Admin" },
      {
        name: "description",
        content:
          "Central de auditoria documental e aprovação de motoristas autônomos (Partiu Pop) e entregadores (Partiu Moto / Flash).",
      },
    ],
  }),
  component: AdminAprovacoesPage,
});

export interface SolicitacaoCondutor {
  id: string;
  nomeCompleto: string;
  cpf: string;
  whatsapp: string;
  email: string;
  cidade: string;
  modalidade: "pop_carro" | "moto_flash";
  cnhNumero: string;
  cnhCategoria: "B (EAR)" | "A (EAR)" | "AB (EAR)";
  possuiEAR: boolean;
  veiculoMarcaModelo: string;
  veiculoAno: string;
  veiculoPlaca: string;
  veiculoCor: string;
  crlvAnoExercicio: string;
  chavePix: string;
  dataSolicitacao: string;
  status: "pendente" | "aprovado" | "rejeitado";
  motivoRejeicao?: string | undefined;
  documentos: {
    cnhUrl: string;
    crlvUrl: string;
    fotoPerfilUrl: string;
  };
}

const SOLICITACOES_MOCK: SolicitacaoCondutor[] = [
  {
    id: "sol-101",
    nomeCompleto: "Marcos Aurélio Silveira",
    cpf: "123.456.789-00",
    whatsapp: "+55 82 99123-4567",
    email: "marcos.silveira@gmail.com",
    cidade: "Maceió / AL",
    modalidade: "pop_carro",
    cnhNumero: "04987654321",
    cnhCategoria: "B (EAR)",
    possuiEAR: true,
    veiculoMarcaModelo: "Chevrolet Onix 1.0 LT",
    veiculoAno: "2024",
    veiculoPlaca: "BRA-4E29",
    veiculoCor: "Prata",
    crlvAnoExercicio: "2026",
    chavePix: "123.456.789-00 (CPF)",
    dataSolicitacao: "Hoje às 10:14",
    status: "pendente",
    documentos: {
      cnhUrl: "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop&q=80",
      crlvUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&auto=format&fit=crop&q=80",
      fotoPerfilUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    },
  },
  {
    id: "sol-102",
    nomeCompleto: "Renata Duarte Vasconcelos",
    cpf: "345.678.901-22",
    whatsapp: "+55 82 99345-6789",
    email: "renata.duarte@hotmail.com",
    cidade: "Arapiraca / AL",
    modalidade: "pop_carro",
    cnhNumero: "07891234560",
    cnhCategoria: "B (EAR)",
    possuiEAR: true,
    veiculoMarcaModelo: "Hyundai HB20 Comfort",
    veiculoAno: "2023",
    veiculoPlaca: "RKL-9A33",
    veiculoCor: "Branco",
    crlvAnoExercicio: "2026",
    chavePix: "renata.duarte@hotmail.com (Email)",
    dataSolicitacao: "Hoje às 09:30",
    status: "pendente",
    documentos: {
      cnhUrl: "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop&q=80",
      crlvUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&auto=format&fit=crop&q=80",
      fotoPerfilUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
    },
  },
  {
    id: "sol-103",
    nomeCompleto: "Thiago Oliveira Brandão",
    cpf: "567.890.123-44",
    whatsapp: "+55 82 99567-8901",
    email: "thiago.flash@gmail.com",
    cidade: "Maceió / AL",
    modalidade: "moto_flash",
    cnhNumero: "09123456780",
    cnhCategoria: "A (EAR)",
    possuiEAR: true,
    veiculoMarcaModelo: "Honda CG 160 Fan",
    veiculoAno: "2024",
    veiculoPlaca: "SND-4B21",
    veiculoCor: "Vermelha",
    crlvAnoExercicio: "2026",
    chavePix: "+5582995678901 (Celular)",
    dataSolicitacao: "Ontem às 18:22",
    status: "aprovado",
    documentos: {
      cnhUrl: "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop&q=80",
      crlvUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&auto=format&fit=crop&q=80",
      fotoPerfilUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
    },
  },
  {
    id: "sol-104",
    nomeCompleto: "Luciano Bezerra Ramos",
    cpf: "789.012.345-66",
    whatsapp: "+55 82 99789-0123",
    email: "luciano.ramos@yahoo.com",
    cidade: "Palmeira dos Índios / AL",
    modalidade: "pop_carro",
    cnhNumero: "01234567890",
    cnhCategoria: "B (EAR)",
    possuiEAR: false,
    veiculoMarcaModelo: "Fiat Uno Mille",
    veiculoAno: "2008",
    veiculoPlaca: "KLP-7M50",
    veiculoCor: "Azul",
    crlvAnoExercicio: "2024",
    chavePix: "78901234566 (CPF)",
    dataSolicitacao: "04/09/2026",
    status: "rejeitado",
    motivoRejeicao: "Veículo ano 2008 fora da exigência de fabricação mínima (2013) e CNH sem averbação EAR.",
    documentos: {
      cnhUrl: "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop&q=80",
      crlvUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&auto=format&fit=crop&q=80",
      fotoPerfilUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80",
    },
  },
];

import { useMemo, useEffect } from "react";
import {
  usePartiuMotoristasPendentes,
  useAprovarPartiuMotorista,
  useRejeitarPartiuMotorista,
} from "@/lib/univans-db";
import { driverFleetService } from "@/lib/ecosystem/driver-fleet-service";

export function AdminAprovacoesPage() {
  const { data: pendentesReais = [] } = usePartiuMotoristasPendentes();
  const aprovarMutation = useAprovarPartiuMotorista();
  const rejeitarMutation = useRejeitarPartiuMotorista();

  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoCondutor[]>(SOLICITACOES_MOCK);

  // Sincroniza dados reais com o estado local
  useEffect(() => {
    if (pendentesReais.length > 0) {
      const convertidas: SolicitacaoCondutor[] = pendentesReais.map((p) => ({
        id: p.id,
        nomeCompleto: p.nome,
        cpf: p.cpf,
        whatsapp: p.telefone,
        email: p.email || "Não informado",
        cidade: "Maceió / AL",
        modalidade: p.categoria_veiculo === "MOTO" ? "moto_flash" : "pop_carro",
        cnhNumero: p.cnh_numero,
        cnhCategoria: (p.categoria_veiculo === "MOTO" ? "A (EAR)" : "B (EAR)") as any,
        possuiEAR: p.possui_ear,
        veiculoMarcaModelo: p.veiculo_marca_modelo,
        veiculoAno: String(p.veiculo_ano),
        veiculoPlaca: p.veiculo_placa,
        veiculoCor: p.veiculo_cor,
        crlvAnoExercicio: "2026",
        chavePix: p.chave_pix || "Não cadastrada",
        dataSolicitacao: "Hoje (Recente)",
        status: (p.status_aprovacao as any) || "pendente",
        documentos: {
          cnhUrl: "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop&q=80",
          crlvUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&auto=format&fit=crop&q=80",
          fotoPerfilUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
        },
      }));

      setSolicitacoes((prev) => {
        const idsReais = new Set(convertidas.map((c) => c.id));
        const outros = prev.filter((s) => !idsReais.has(s.id));
        return [...convertidas, ...outros];
      });
    }
  }, [pendentesReais]);

  const [filtro, setFiltro] = useState<"todas" | "pendente" | "aprovado" | "rejeitado">("todas");
  const [busca, setBusca] = useState("");
  const [modalDetalhes, setModalDetalhes] = useState<SolicitacaoCondutor | null>(null);
  const [motivoRejeicaoInput, setMotivoRejeicaoInput] = useState("");
  const [mostrarRejeitarModal, setMostrarRejeitarModal] = useState(false);

  function alterarStatus(id: string, novoStatus: "aprovado" | "rejeitado", motivo?: string) {
    if (novoStatus === "aprovado") {
      aprovarMutation.mutate(id);
      void driverFleetService.approveDriver(id);
    } else {
      rejeitarMutation.mutate({ id, motivo: motivo || "Documentação reprovada pelo operador" });
      void driverFleetService.rejectDriver(id, motivo || "Documentação reprovada pelo operador");
    }
    setSolicitacoes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: novoStatus, motivoRejeicao: motivo } : s)),
    );
    setMostrarRejeitarModal(false);
    setModalDetalhes(null);
  }

  const listaFiltrada = solicitacoes
    .filter((s) => filtro === "todas" || s.status === filtro)
    .filter((s) => {
      if (!busca.trim()) return true;
      const t = busca.toLowerCase();
      return (
        s.nomeCompleto.toLowerCase().includes(t) ||
        s.veiculoPlaca.toLowerCase().includes(t) ||
        s.veiculoMarcaModelo.toLowerCase().includes(t) ||
        s.cpf.includes(t)
      );
    });

  const totalPendentes = solicitacoes.filter((s) => s.status === "pendente").length;
  const totalAprovados = solicitacoes.filter((s) => s.status === "aprovado").length;
  const totalRejeitados = solicitacoes.filter((s) => s.status === "rejeitado").length;

  return (
    <div className="w-full space-y-6 pb-20">
      {/* 1. Header do Módulo */}
      <div className="w-full rounded-3xl bg-slate-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#0088FF]/20 px-4 py-1.5 text-xs font-black uppercase text-primary-500 border border-primary-600/30">
            <CheckCircle2 className="h-4 w-4 text-[#0088FF]" />
            <span>Auditoria Cadastral de Condutores</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Aprovações de Condutores &amp; Frota
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-normal leading-relaxed">
            Analise CNH com EAR, CRLV do veículo e libere o acesso aos parceiros das categorias Partiu Pop (Carro) e Partiu Moto / Flash.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/10 px-4 py-2.5 border border-white/20 text-center">
            <span className="text-[10px] font-black uppercase text-primary-500 block">Pendentes</span>
            <span className="text-xl font-black text-white">{totalPendentes}</span>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-2.5 border border-white/20 text-center">
            <span className="text-[10px] font-black uppercase text-emerald-400 block">Aprovados</span>
            <span className="text-xl font-black text-white">{totalAprovados}</span>
          </div>
        </div>
      </div>

      {/* 2. Barra de Busca e Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Filtros de Status */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {[
            { id: "todas", label: `Todas (${solicitacoes.length})` },
            { id: "pendente", label: `Pendentes (${totalPendentes})` },
            { id: "aprovado", label: `Aprovados (${totalAprovados})` },
            { id: "rejeitado", label: `Rejeitados (${totalRejeitados})` },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFiltro(item.id as any)}
              className={`shrink-0 rounded-2xl px-4 py-2.5 text-xs font-black transition-all cursor-pointer ${
                filtro === item.id
                  ? "bg-[#0088FF] text-slate-950 shadow-md shadow-primary-600/20"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Campo de Busca */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, placa ou CPF..."
            className="w-full rounded-2xl bg-white border border-slate-200 pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-yellow-400"
          />
        </div>
      </div>

      {/* 3. Lista de Solicitações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {listaFiltrada.map((item) => {
          const isCarro = item.modalidade === "pop_carro";

          return (
            <div
              key={item.id}
              className="rounded-3xl bg-white p-5 sm:p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Topo do Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.documentos.fotoPerfilUrl}
                      alt={item.nomeCompleto}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-slate-200"
                    />
                    <div>
                      <h3 className="text-base font-black text-slate-950 leading-tight">
                        {item.nomeCompleto}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.cidade} · CPF: <span className="font-semibold">{item.cpf}</span>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase shrink-0 ${
                      item.status === "pendente"
                        ? "bg-primary-50 text-amber-900 border border-primary-500"
                        : item.status === "aprovado"
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          : "bg-rose-100 text-rose-900 border border-rose-300"
                    }`}
                  >
                    ● {item.status}
                  </span>
                </div>

                {/* Badge da Modalidade */}
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-black ${
                      isCarro
                        ? "bg-slate-950 text-[#0088FF]"
                        : "bg-[#0088FF] text-slate-950"
                    }`}
                  >
                    {isCarro ? <Car className="w-3.5 h-3.5" /> : <Bike className="w-3.5 h-3.5" />}
                    <span>{isCarro ? "Partiu Pop (Carro)" : "Partiu Moto & Flash"}</span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    Solicitado {item.dataSolicitacao}
                  </span>
                </div>

                {/* Dados do Veículo */}
                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 space-y-1 text-xs font-medium text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Veículo:</span>
                    <strong className="text-slate-900">{item.veiculoMarcaModelo} ({item.veiculoAno})</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Placa / Cor:</span>
                    <span className="font-black text-slate-900 uppercase">
                      {item.veiculoPlaca} · {item.veiculoCor}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Exercício CRLV:</span>
                    <span className="font-bold text-emerald-700">Vigente ({item.crlvAnoExercicio})</span>
                  </div>
                </div>

                {/* Checklist Documental */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>CNH: <strong>{item.cnhCategoria}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-800">
                    {item.possuiEAR ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    )}
                    <span>{item.possuiEAR ? "EAR Averbado ✓" : "Sem EAR ✗"}</span>
                  </div>
                </div>

                {/* Motivo de Rejeição (se houver) */}
                {item.motivoRejeicao && (
                  <div className="rounded-xl bg-rose-50 p-3 border border-rose-200 text-xs text-rose-800">
                    <strong>Motivo da Reprovação:</strong> {item.motivoRejeicao}
                  </div>
                )}
              </div>

              {/* Ações do Administrador */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setModalDetalhes(item)}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2.5 text-xs font-black text-slate-800 transition-colors cursor-pointer"
                >
                  <FileText className="h-4 w-4" />
                  Ver Documentos
                </button>

                {item.status === "pendente" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModalDetalhes(item);
                        setMostrarRejeitarModal(true);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 px-3.5 py-2.5 text-xs font-black text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                    >
                      <XCircle className="h-4 w-4" /> Recusar
                    </button>

                    <button
                      type="button"
                      onClick={() => alterarStatus(item.id, "aprovado")}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-black text-white shadow-sm transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Aprovar
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE AUDITORIA DE DOCUMENTOS */}
      {modalDetalhes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <img
                  src={modalDetalhes.documentos.fotoPerfilUrl}
                  alt={modalDetalhes.nomeCompleto}
                  className="w-12 h-12 rounded-2xl object-cover"
                />
                <div>
                  <h2 className="text-lg font-black text-slate-950">{modalDetalhes.nomeCompleto}</h2>
                  <p className="text-xs text-slate-500">
                    {modalDetalhes.modalidade === "pop_carro" ? "Partiu Pop (Carro)" : "Partiu Moto & Flash"} · WhatsApp: {modalDetalhes.whatsapp}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModalDetalhes(null);
                  setMostrarRejeitarModal(false);
                }}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Imagens de CNH e CRLV */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
                Documentos Anexados pelo Condutor
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
                  <div className="p-3 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>CNH com EAR</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-black">
                      Nº {modalDetalhes.cnhNumero}
                    </span>
                  </div>
                  <img
                    src={modalDetalhes.documentos.cnhUrl}
                    alt="CNH"
                    className="w-full h-44 object-cover"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
                  <div className="p-3 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>CRLV do Veículo</span>
                    <span className="text-[10px] text-slate-800 bg-slate-200 px-2 py-0.5 rounded font-black">
                      Placa: {modalDetalhes.veiculoPlaca}
                    </span>
                  </div>
                  <img
                    src={modalDetalhes.documentos.crlvUrl}
                    alt="CRLV"
                    className="w-full h-44 object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Chave PIX e Repasse */}
            <div className="rounded-2xl bg-primary-50/70 p-4 border border-amber-200 text-xs space-y-1">
              <span className="font-black text-amber-950 block">Conta PIX de Repasse (D+0):</span>
              <p className="text-amber-900 font-semibold">{modalDetalhes.chavePix}</p>
            </div>

            {/* Formulário de Rejeição */}
            {mostrarRejeitarModal ? (
              <div className="space-y-3 p-4 rounded-2xl bg-rose-50 border border-rose-200">
                <label className="block text-xs font-black text-rose-950">
                  Informe o motivo da reprovação documental:
                </label>
                <textarea
                  rows={3}
                  value={motivoRejeicaoInput}
                  onChange={(e) => setMotivoRejeicaoInput(e.target.value)}
                  placeholder="Ex: CNH sem observação EAR; Veículo fabricado antes de 2013..."
                  className="w-full rounded-xl bg-white border border-rose-300 p-3 text-xs font-medium text-slate-900 outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setMostrarRejeitarModal(false)}
                    className="px-4 py-2 rounded-xl bg-white text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      alterarStatus(modalDetalhes.id, "rejeitado", motivoRejeicaoInput)
                    }
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-500 cursor-pointer"
                  >
                    Confirmar Reprovação
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMostrarRejeitarModal(true)}
                  className="px-5 py-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-black hover:bg-rose-100 border border-rose-200 cursor-pointer"
                >
                  Reprovar Cadastro
                </button>
                <button
                  type="button"
                  onClick={() => alterarStatus(modalDetalhes.id, "aprovado")}
                  className="px-6 py-3 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-500 shadow-md cursor-pointer"
                >
                  Aprovar &amp; Liberar Acesso ao App
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
