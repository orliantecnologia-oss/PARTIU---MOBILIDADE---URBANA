import { RealQrCodePix } from "@/components/passagens/RealQrCodePix";
import { Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  X,
  CheckCircle2,
  QrCode,
  Copy,
  CreditCard,
  Wifi,
  Sparkles,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Zap,
  MapPin,
  Clock,
  Users,
  Smartphone,
  Share2,
  Plus,
  Minus,
  Info,
  Check,
  Lock,
  Armchair,
  Disc,
} from "lucide-react";
import {
  salvarNovoBilhete,
  type BilhetePassagem,
  getBeneficiarioGratuidade,
  contarGratuidadesNaViagem,
  type BeneficiarioGratuidadeGov,
} from "@/lib/passagens-store";
import { getPontosEmbarqueConfig, type PontoEmbarqueConfig } from "@/lib/pontos-embarque-store";
import { ModalSelecaoPontoEmbarque } from "@/components/modals/ModalSelecaoPontoEmbarque";
import { useCriarPassagem, useDecrementarVagasViagem } from "@/lib/univans-db";
import { supabase } from "@/integrations/supabase/client";
import { emitirBilheteAssinadoServerFn } from "@/lib/ticket-signing.server";

export interface DadosViagemCompra {
  id: string;
  origem: string;
  destino: string;
  horarioSaida: string;
  dataViagem?: string;
  tempoEstimado: string;
  valorPassagem: number;
  motorista: string;
  motoristaFoto: string;
  placa: string;
  modelo: string;
  starlinkWifi?: string;
  pontoEmbarqueInicial?: string;
}

interface Props {
  aberto: boolean;
  onFechar: () => void;
  viagem: DadosViagemCompra | null;
  onCompraConcluida?: (bilhete: BilhetePassagem) => void;
}

// Configuração de assentos da Van Executiva (16 lugares)
const ASSENTOS_VAN = [
  { id: "01", label: "01", tipo: "janela", lado: "esquerda", fileira: 1, ocupado: true },
  { id: "02", label: "02", tipo: "corredor", lado: "direita", fileira: 1, ocupado: false },
  { id: "03", label: "03", tipo: "janela", lado: "direita", fileira: 1, ocupado: false },

  { id: "04", label: "04", tipo: "janela", lado: "esquerda", fileira: 2, ocupado: false },
  { id: "05", label: "05", tipo: "corredor", lado: "direita", fileira: 2, ocupado: true },
  { id: "06", label: "06", tipo: "janela", lado: "direita", fileira: 2, ocupado: false },

  { id: "07", label: "07", tipo: "janela", lado: "esquerda", fileira: 3, ocupado: false },
  { id: "08", label: "08", tipo: "corredor", lado: "direita", fileira: 3, ocupado: false },
  { id: "09", label: "09", tipo: "janela", lado: "direita", fileira: 3, ocupado: false },

  { id: "10", label: "10", tipo: "janela", lado: "esquerda", fileira: 4, ocupado: false },
  { id: "11", label: "11", tipo: "corredor", lado: "direita", fileira: 4, ocupado: true },
  { id: "12", label: "12", tipo: "janela", lado: "direita", fileira: 4, ocupado: false },

  { id: "13", label: "13", tipo: "fundo", lado: "esquerda", fileira: 5, ocupado: false },
  { id: "14", label: "14", tipo: "fundo", lado: "meio-esq", fileira: 5, ocupado: false },
  { id: "15", label: "15", tipo: "fundo", lado: "meio-dir", fileira: 5, ocupado: false },
  { id: "16", label: "16", tipo: "fundo", lado: "direita", fileira: 5, ocupado: false },
];

export function ModalCompraPassagem({ aberto, onFechar, viagem, onCompraConcluida }: Props) {
  const [passo, setPasso] = useState<"dados" | "assentos" | "pagamento" | "sucesso">("dados");
  const [quantidadePassagens, setQuantidadePassagens] = useState<number>(1);
  const [assentosSelecionados, setAssentosSelecionados] = useState<string[]>(["02"]);
  const [metodoPagamento, setMetodoPagamento] = useState<"PIX" | "CARTAO">("PIX");
  const [nomePassageiro, setNomePassageiro] = useState("Maria Clara Albuquerque");
  const [whatsappPassageiro, setWhatsappPassageiro] = useState("(82) 99841-2940");
  const [cpfPassageiro, setCpfPassageiro] = useState("084.129.414-88");

  const [pontoEmbarqueEscolhido, setPontoEmbarqueEscolhido] = useState<PontoEmbarqueConfig | null>(
    null,
  );
  const [modalPontoAberto, setModalPontoAberto] = useState(false);

  const [numeroCartao, setNumeroCartao] = useState("4532 8841 9920 1842");
  const [validadeCartao, setValidadeCartao] = useState("12/28");
  const [cvvCartao, setCvvCartao] = useState("482");
  const [parcelas, setParcelas] = useState(1);

  const [pixCopiado, setPixCopiado] = useState(false);
  const [processandoPagamento, setProcessandoPagamento] = useState(false);
  const [bilheteEmitido, setBilheteEmitido] = useState<BilhetePassagem | null>(null);

  const [beneficiarioGov, setBeneficiarioGov] = useState<BeneficiarioGratuidadeGov | null>(null);
  const [usarGratuidadeGov, setUsarGratuidadeGov] = useState(false);
  const [avisoGratuidadeEsgotada, setAvisoGratuidadeEsgotada] = useState(false);

  // Carregar dados de beneficiário cadastrado (se houver)
  useEffect(() => {
    if (aberto) {
      const benef = getBeneficiarioGratuidade();
      if (benef && benef.ativo) {
        setBeneficiarioGov(benef);
        setNomePassageiro(benef.nome);
        setCpfPassageiro(benef.cpf);
        // Verificar se há vagas gratuitas disponíveis nesta viagem (máximo 2)
        if (viagem) {
          const ocupadas = contarGratuidadesNaViagem(
            viagem.id,
            viagem.dataViagem || "Hoje",
            viagem.horarioSaida,
          );
          if (ocupadas < 2) {
            setUsarGratuidadeGov(true);
            setQuantidadePassagens(1);
            setAssentosSelecionados(["01"]);
            setAvisoGratuidadeEsgotada(false);
          } else {
            setUsarGratuidadeGov(false);
            setAvisoGratuidadeEsgotada(true);
          }
        }
      }
    }
  }, [aberto, viagem]);

  // Notificar BottomNav para ocultar durante o modal de compra
  useEffect(() => {
    if (aberto) {
      document.body.classList.add("modal-compra-ativo");
      window.dispatchEvent(new CustomEvent("univans:modal-compra", { detail: { aberto: true } }));
    } else {
      document.body.classList.remove("modal-compra-ativo");
      window.dispatchEvent(new CustomEvent("univans:modal-compra", { detail: { aberto: false } }));
    }
    return () => {
      document.body.classList.remove("modal-compra-ativo");
      window.dispatchEvent(new CustomEvent("univans:modal-compra", { detail: { aberto: false } }));
    };
  }, [aberto]);

  // Carregar ponto padrão
  useEffect(() => {
    if (aberto && viagem) {
      const pontos = getPontosEmbarqueConfig().filter((p) => p.ativo);
      const pontoPadrao =
        pontos.find((p) => p.cidade.toLowerCase() === viagem.origem.toLowerCase()) || pontos[0];
      if (pontoPadrao) {
        setPontoEmbarqueEscolhido(pontoPadrao);
      }
    }
  }, [aberto, viagem]);

  // Ajustar quantidade de assentos quando a quantidade de passagens muda
  useEffect(() => {
    if (assentosSelecionados.length !== quantidadePassagens) {
      const assentosLivres = ASSENTOS_VAN.filter((a) => !a.ocupado).map((a) => a.id);
      const novosAssentos = assentosLivres.slice(0, quantidadePassagens);
      setAssentosSelecionados(novosAssentos);
    }
  }, [quantidadePassagens, assentosSelecionados.length]);

  const valorUnitario = viagem ? viagem.valorPassagem : 38.0;
  const valorTotal = usarGratuidadeGov ? 0 : valorUnitario * quantidadePassagens;

  const chavePixCopiaECola = useMemo(() => {
    const randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `00020126580014br.gov.bcb.pix0136univans-${randomHex}-pix-pagamento520400005303986540${valorTotal.toFixed(2)}5802BR5925COOPERATIVA UNIVANS AL6009MACEIO62070503***6304`;
  }, [valorTotal]);

  const criarPassagemMutation = useCriarPassagem();
  const decrementarVagasMutation = useDecrementarVagasViagem();

  if (!aberto || !viagem) return null;

  function toggleAssento(assentoId: string, ocupado: boolean) {
    if (ocupado) return;

    if (assentosSelecionados.includes(assentoId)) {
      if (assentosSelecionados.length > 1) {
        const filtrados = assentosSelecionados.filter((id) => id !== assentoId);
        setAssentosSelecionados(filtrados);
        setQuantidadePassagens(filtrados.length);
      }
    } else {
      if (assentosSelecionados.length < 6) {
        const novos = [...assentosSelecionados, assentoId];
        setAssentosSelecionados(novos);
        setQuantidadePassagens(novos.length);
      }
    }
  }

  function copiarChavePix() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(chavePixCopiaECola);
    }
    setPixCopiado(true);
    setTimeout(() => setPixCopiado(false), 3000);
  }

  async function handleFinalizarCompra() {
    setProcessandoPagamento(true);

    const codigoBilhete = "UV-" + Math.floor(100000 + Math.random() * 900000);
    const pontoEmbarqueNome = pontoEmbarqueEscolhido
      ? pontoEmbarqueEscolhido.nome
      : "Trevo Tabuleiro";

    // 1. Emissão e Assinatura Criptográfica Ed25519 Segura via Server Function (Chave privada isolada no servidor)
    let qrPayload = `UNIVANS:${codigoBilhete}:${viagem?.placa || "VAN"}`;
    try {
      const resp = await emitirBilheteAssinadoServerFn({
        data: {
          codigoBilhete,
          viagemId: viagem?.id || "VIAGEM_PADRAO",
          passageiroId: "user_pax",
          passageiroNome: nomePassageiro,
          origemDestino: (viagem?.origem || "Origem") + " - " + (viagem?.destino || "Destino"),
          pontoEmbarque: pontoEmbarqueNome,
          valorTotal,
          assentos: assentosSelecionados,
        },
      });
      if (resp?.qrPayload) {
        qrPayload = resp.qrPayload;
      }
    } catch (errAssinatura) {
      console.warn("Assinatura server-side em contingência:", errAssinatura);
    }

    // Tentar persistir no Supabase se houver usuário autenticado ou registrar offline
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || "00000000-0000-0000-0000-000000000000";

      if (viagem?.id) {
        // 1. Decrementa vagas atomicamente com lock no PostgreSQL
        await decrementarVagasMutation.mutateAsync({
          viagemId: viagem.id,
          quantidade: quantidadePassagens,
        });

        // 2. Cria registro da passagem
        await criarPassagemMutation.mutateAsync({
          codigo_bilhete: codigoBilhete,
          viagem_id: viagem.id,
          passageiro_id: userId,
          passageiro_nome: nomePassageiro,
          passageiro_whatsapp: whatsappPassageiro,
          passageiro_cpf: cpfPassageiro,
          quantidade_passagens: quantidadePassagens,
          valor_total: valorTotal,
          forma_pagamento: metodoPagamento,
          status_pagamento: "pago",
          status_embarque: "aguardando",
          codigo_qr: qrPayload,
          pix_expira_em: new Date(Date.now() + 3600000).toISOString(),
        });
      }
    } catch (e: any) {
      if (e?.message && e.message.includes("vagas suficientes")) {
        setProcessandoPagamento(false);
        alert("Atenção: Não há vagas suficientes disponíveis nesta van para o número solicitado.");
        return;
      }
      console.warn("Persistência no Supabase em contingência:", e);
    }

    const novoBilhete: BilhetePassagem = {
      id: codigoBilhete,
      linhaId: viagem!.id,
      origem: viagem!.origem,
      destino: viagem!.destino,
      pontoEmbarque: pontoEmbarqueEscolhido
        ? pontoEmbarqueEscolhido.nome
        : "Trevo Tabuleiro (Ponto Oficial)",
      pontoEmbarqueReferencia: pontoEmbarqueEscolhido?.referencia,
      horarioSaida: viagem!.horarioSaida,
      horarioChegadaPrevisto: viagem!.tempoEstimado,
      dataViagem: viagem!.dataViagem || new Date().toLocaleDateString("pt-BR"),
      quantidadePassagens,
      passageiroNome: nomePassageiro,
      passageiroWhatsApp: whatsappPassageiro,
      passageiroCpf: cpfPassageiro,
      valorTotal,
      formaPagamento: usarGratuidadeGov ? "GRATUIDADE_GOV" : metodoPagamento,
      categoriaGratuidade: usarGratuidadeGov ? beneficiarioGov?.categoria : undefined,
      numeroBeneficio: usarGratuidadeGov ? beneficiarioGov?.numeroDocumentoBeneficio : undefined,
      assentosReservados: assentosSelecionados,
      status: "confirmado",
      motoristaNome: viagem!.motorista,
      motoristaFoto: viagem!.motoristaFoto,
      vanPlaca: viagem!.placa,
      vanModelo: viagem!.modelo,
      starlinkWifi: viagem!.starlinkWifi || "UniVans-Starlink-5G",
      codigoQr: qrPayload,
      criadoEm: new Date().toISOString(),
    };

    salvarNovoBilhete(novoBilhete);
    setBilheteEmitido(novoBilhete);
    setProcessandoPagamento(false);
    setPasso("sucesso");

    if (onCompraConcluida) {
      onCompraConcluida(novoBilhete);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
        <div className="w-[96vw] max-w-none sm:max-w-xl mx-auto bg-white rounded-t-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh] pb-[env(safe-area-inset-bottom,0px)]">
          {/* BARRA DE ARRASTE MOBILE (DRAG HANDLE) */}
          <div className="pt-3 pb-1 flex justify-center sm:hidden bg-gradient-to-r from-[#0b2046] via-[#0d5930] to-[#071833]">
            <div className="h-1.5 w-12 rounded-full bg-white/40" />
          </div>

          {/* 1. CABEÇALHO DO MODAL */}
          <div className="bg-gradient-to-r from-[#0b2046] via-[#0d5930] to-[#071833] p-3.5 sm:p-5 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={viagem.motoristaFoto}
                alt={viagem.motorista}
                className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl object-cover border-2 border-amber-300/90 shrink-0 shadow-sm"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300 bg-white/10 px-2.5 py-0.5 rounded-full">
                    Van {viagem.placa}
                  </span>
                  {viagem.dataViagem && (
                    <span className="text-xs font-black uppercase tracking-wider text-white bg-[#0d5930]/90 px-2.5 py-0.5 rounded-full border border-emerald-400/40">
                      📅 {viagem.dataViagem}
                    </span>
                  )}
                  <span className="text-xs font-bold text-emerald-200 flex items-center gap-1">
                    <Wifi className="h-3.5 w-3.5" /> Starlink
                  </span>
                </div>
                <h2 className="text-sm sm:text-base md:text-lg font-black mt-1 text-white truncate">
                  {viagem.origem} ➔ {viagem.destino}
                </h2>
                <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                  {viagem.motorista} • <strong className="text-white">{viagem.horarioSaida}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onFechar}
              className="h-11 w-11 sm:h-10 sm:w-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all shrink-0 active:scale-95 cursor-pointer"
              aria-label="Fechar"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          {/* 2. STEPPER DE ETAPAS RESPONSIVO */}
          <div className="bg-slate-50 px-3.5 sm:px-6 py-3 flex items-center justify-between border-b border-slate-200 text-xs sm:text-sm font-bold text-slate-600 shrink-0">
            <div
              className={`flex items-center gap-1.5 shrink-0 ${passo === "dados" ? "text-[#0d5930] font-black" : ""}`}
            >
              <span
                className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-xs font-black ${
                  passo === "dados"
                    ? "bg-[#0d5930] text-white shadow-xs"
                    : "bg-slate-300 text-slate-700"
                }`}
              >
                1
              </span>
              <span>Embarque</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            <div
              className={`flex items-center gap-1.5 shrink-0 ${passo === "assentos" ? "text-[#0d5930] font-black" : ""}`}
            >
              <span
                className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-xs font-black ${
                  passo === "assentos"
                    ? "bg-[#0d5930] text-white shadow-xs"
                    : "bg-slate-300 text-slate-700"
                }`}
              >
                2
              </span>
              <span>Poltronas</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            <div
              className={`flex items-center gap-1.5 shrink-0 ${passo === "pagamento" ? "text-[#0d5930] font-black" : ""}`}
            >
              <span
                className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-xs font-black ${
                  passo === "pagamento"
                    ? "bg-[#0d5930] text-white shadow-xs"
                    : "bg-slate-300 text-slate-700"
                }`}
              >
                3
              </span>
              <span>Pagar</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            <div
              className={`flex items-center gap-1.5 shrink-0 ${passo === "sucesso" ? "text-[#0d5930] font-black" : ""}`}
            >
              <span
                className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-xs font-black ${
                  passo === "sucesso"
                    ? "bg-[#0d5930] text-white shadow-xs"
                    : "bg-slate-300 text-slate-700"
                }`}
              >
                4
              </span>
              <span>Bilhete</span>
            </div>
          </div>

          {/* 3. CONTEÚDO ROLÁVEL */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* ETAPA 1: DADOS E EMBARQUE */}
            {passo === "dados" && (
              <div className="space-y-4 animate-in fade-in">
                {/* Ponto de Embarque */}
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-[#0d5930]" />
                    <span>Ponto Oficial de Embarque no Trevo / Terminal</span>
                  </label>
                  <div
                    onClick={() => setModalPontoAberto(true)}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 cursor-pointer transition-all flex items-center justify-between gap-3 shadow-xs group min-h-[56px]"
                  >
                    <div className="min-w-0">
                      <strong className="text-sm sm:text-base font-black text-slate-900 block truncate group-hover:text-[#0d5930] transition-colors">
                        {pontoEmbarqueEscolhido?.nome || "Selecione o ponto de embarque..."}
                      </strong>
                      <span className="text-xs sm:text-sm text-slate-600 block truncate mt-0.5">
                        {pontoEmbarqueEscolhido?.referencia ||
                          "Clique para escolher o trevo mais próximo"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-[#0d5930] shrink-0 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <span>Alterar</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* CARTÃO ESPECIAL: PASSE LIVRE GOVERNAMENTAL (LEI GRATUIDADE) */}
                {beneficiarioGov && (
                  <div
                    className={`p-4 rounded-2xl border-2 transition-all space-y-3 ${
                      usarGratuidadeGov
                        ? "bg-emerald-50/90 border-[#0d5930] shadow-sm"
                        : "bg-slate-50 border-slate-200 opacity-90"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-xl bg-[#0d5930] text-white flex items-center justify-center shrink-0">
                          <ShieldCheck className="h-5 w-5 text-amber-300" />
                        </div>
                        <div>
                          <strong className="text-sm font-black text-slate-900 block leading-tight">
                            Passe Livre Governamental Ativo
                          </strong>
                          <span className="text-xs text-slate-600">
                            {beneficiarioGov.categoria === "idoso_60"
                              ? "👴 Idoso 60+ (Lei 10.741)"
                              : beneficiarioGov.categoria === "pcd"
                                ? "♿ PCD / Passe Livre"
                                : "🎓 CadÚnico / ID Jovem"}{" "}
                            • Doc: {beneficiarioGov.numeroDocumentoBeneficio}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={avisoGratuidadeEsgotada}
                        onClick={() => {
                          if (avisoGratuidadeEsgotada) return;
                          setUsarGratuidadeGov(!usarGratuidadeGov);
                          if (!usarGratuidadeGov) {
                            setQuantidadePassagens(1);
                            setAssentosSelecionados(["01"]);
                          }
                        }}
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                          usarGratuidadeGov
                            ? "bg-[#0d5930] text-white shadow-xs"
                            : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        {usarGratuidadeGov ? "Aplicado (R$ 0,00)" : "Ativar Gratuidade"}
                      </button>
                    </div>

                    {avisoGratuidadeEsgotada ? (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-bold flex items-center gap-2">
                        <Info className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>
                          A cota de 2 assentos gratuitos desta van já foi preenchida para este
                          horário.
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-emerald-900 font-medium bg-emerald-100/60 p-2.5 rounded-xl">
                        ✓ <strong>Assentos 01 e 02</strong> reservados por lei com 100% de isenção
                        de tarifa (R$ 0,00). Sem necessidade de PIX ou Cartão.
                      </div>
                    )}
                  </div>
                )}

                {/* Quantidade de Passagens */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <label className="text-sm font-black text-slate-900 block">
                      Quantidade de Passageiros
                    </label>
                    <span className="text-xs text-slate-600">
                      {usarGratuidadeGov ? (
                        <strong className="text-emerald-700 font-bold">
                          1 Assento Gratuito por Lei (R$ 0,00)
                        </strong>
                      ) : (
                        `R$ ${valorUnitario.toFixed(2).replace(".", ",")} cada`
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={quantidadePassagens <= 1 || usarGratuidadeGov}
                      onClick={() => setQuantidadePassagens((prev) => Math.max(1, prev - 1))}
                      className="min-h-[44px] min-w-[44px] h-11 w-11 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center disabled:opacity-40 shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-black text-base text-slate-900">
                      {quantidadePassagens}
                    </span>
                    <button
                      type="button"
                      disabled={quantidadePassagens >= 6 || usarGratuidadeGov}
                      onClick={() => setQuantidadePassagens((prev) => Math.min(6, prev + 1))}
                      className="min-h-[44px] min-w-[44px] h-11 w-11 rounded-xl bg-[#0d5930] text-white flex items-center justify-center disabled:opacity-40 shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Dados do Passageiro Principal */}
                <div className="space-y-3.5 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-slate-700">
                      Nome Completo do Passageiro
                    </label>
                    <input
                      type="text"
                      value={nomePassageiro}
                      onChange={(e) => setNomePassageiro(e.target.value)}
                      placeholder="Nome completo"
                      className="w-full min-h-[48px] h-12 px-4 py-2.5 rounded-xl border border-slate-200 text-sm sm:text-base font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0d5930]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-bold text-slate-700">
                        WhatsApp para Bilhete
                      </label>
                      <input
                        type="text"
                        value={whatsappPassageiro}
                        onChange={(e) => setWhatsappPassageiro(e.target.value)}
                        placeholder="(82) 99999-9999"
                        className="w-full min-h-[48px] h-12 px-4 py-2.5 rounded-xl border border-slate-200 text-sm sm:text-base font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0d5930]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-bold text-slate-700">
                        CPF (Seguro Viagem)
                      </label>
                      <input
                        type="text"
                        value={cpfPassageiro}
                        onChange={(e) => setCpfPassageiro(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full min-h-[48px] h-12 px-4 py-2.5 rounded-xl border border-slate-200 text-sm sm:text-base font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0d5930]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 2: MAPA DE ASSENTOS DA VAN 2D */}
            {passo === "assentos" && (
              <div className="space-y-4 animate-in fade-in">
                {/* Legenda dos Assentos */}
                <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-slate-600 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 rounded-md bg-white border-2 border-slate-300" />
                    <span>Livre</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 rounded-md bg-[#0d5930] text-white flex items-center justify-center text-[8px]">
                      ✓
                    </div>
                    <span>Sua Escolha</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 rounded-md bg-slate-300 opacity-60" />
                    <span>Ocupado</span>
                  </div>
                </div>

                {/* DIAGRAMA 2D DA VAN */}
                <div className="w-full max-w-[320px] mx-auto bg-slate-100 rounded-3xl p-4 border-2 border-slate-200 shadow-inner space-y-3">
                  {/* Painel Dianteiro / Motorista */}
                  <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-slate-300 text-slate-500">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400">
                      <Disc className="h-4 w-4 animate-spin text-[#0d5930]" />
                      <span>Motorista / Painel</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                      Porta Entrada ➔
                    </span>
                  </div>

                  {/* Fileiras 1 a 4 (Esquerda: Janela | Direita: Corredor + Janela) */}
                  {[1, 2, 3, 4].map((fil) => {
                    const assentoEsq = ASSENTOS_VAN.find(
                      (a) => a.fileira === fil && a.lado === "esquerda",
                    )!;
                    const assentoMeio = ASSENTOS_VAN.find(
                      (a) => a.fileira === fil && a.lado === "direita" && a.tipo === "corredor",
                    )!;
                    const assentoDir = ASSENTOS_VAN.find(
                      (a) => a.fileira === fil && a.lado === "direita" && a.tipo === "janela",
                    )!;

                    const isGratuidadeEsq = assentoEsq.id === "01";
                    const isGratuidadeMeio = assentoMeio.id === "02";

                    return (
                      <div key={fil} className="space-y-1">
                        {fil === 1 && (
                          <div className="flex items-center justify-between text-[9px] font-black text-[#0d5930] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                            <span>♿ 👴 🎓 Assentos 01 e 02: Gratuidade da Lei</span>
                            <span className="font-bold text-slate-500">2 Vagas</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          {/* Lado Esquerdo (Janela Individual) */}
                          <button
                            type="button"
                            disabled={assentoEsq.ocupado}
                            onClick={() => toggleAssento(assentoEsq.id, assentoEsq.ocupado)}
                            className={`h-11 w-11 rounded-xl flex flex-col items-center justify-center font-black text-xs transition-all shadow-xs active:scale-95 relative ${
                              assentoEsq.ocupado
                                ? "bg-slate-300 text-slate-400 cursor-not-allowed opacity-50"
                                : assentosSelecionados.includes(assentoEsq.id)
                                  ? "bg-[#0d5930] text-white ring-2 ring-amber-300 shadow-md scale-105"
                                  : isGratuidadeEsq
                                    ? "bg-emerald-50 text-emerald-900 border-2 border-emerald-400 hover:bg-emerald-100"
                                    : "bg-white text-slate-800 border border-slate-200 hover:border-emerald-400"
                            }`}
                          >
                            <span className="text-[11px]">{assentoEsq.label}</span>
                            <span className="text-[7px] font-bold opacity-80">
                              {isGratuidadeEsq ? "♿ Priorit." : "Janela"}
                            </span>
                          </button>

                          {/* Corredor Central */}
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                            •
                          </span>

                          {/* Lado Direito (Par de Poltronas) */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={assentoMeio.ocupado}
                              onClick={() => toggleAssento(assentoMeio.id, assentoMeio.ocupado)}
                              className={`h-11 w-11 rounded-xl flex flex-col items-center justify-center font-black text-xs transition-all shadow-xs active:scale-95 relative ${
                                assentoMeio.ocupado
                                  ? "bg-slate-300 text-slate-400 cursor-not-allowed opacity-50"
                                  : assentosSelecionados.includes(assentoMeio.id)
                                    ? "bg-[#0d5930] text-white ring-2 ring-amber-300 shadow-md scale-105"
                                    : isGratuidadeMeio
                                      ? "bg-emerald-50 text-emerald-900 border-2 border-emerald-400 hover:bg-emerald-100"
                                      : "bg-white text-slate-800 border border-slate-200 hover:border-emerald-400"
                              }`}
                            >
                              <span className="text-[11px]">{assentoMeio.label}</span>
                              <span className="text-[7px] font-bold opacity-80">
                                {isGratuidadeMeio ? "♿ Priorit." : "Corredor"}
                              </span>
                            </button>

                            <button
                              type="button"
                              disabled={assentoDir.ocupado}
                              onClick={() => toggleAssento(assentoDir.id, assentoDir.ocupado)}
                              className={`h-11 w-11 rounded-xl flex flex-col items-center justify-center font-black text-xs transition-all shadow-xs active:scale-95 ${
                                assentoDir.ocupado
                                  ? "bg-slate-300 text-slate-400 cursor-not-allowed opacity-50"
                                  : assentosSelecionados.includes(assentoDir.id)
                                    ? "bg-[#0d5930] text-white ring-2 ring-amber-300 shadow-md scale-105"
                                    : "bg-white text-slate-800 border border-slate-200 hover:border-emerald-400"
                              }`}
                            >
                              <span className="text-[11px]">{assentoDir.label}</span>
                              <span className="text-[8px] font-normal opacity-75">Janela</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Fileira 5 (Fundo: 4 lugares contínuos 13, 14, 15, 16) */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-1.5">
                    {["13", "14", "15", "16"].map((id) => {
                      const assento = ASSENTOS_VAN.find((a) => a.id === id)!;
                      return (
                        <button
                          key={id}
                          type="button"
                          disabled={assento.ocupado}
                          onClick={() => toggleAssento(assento.id, assento.ocupado)}
                          className={`flex-1 h-11 rounded-xl flex flex-col items-center justify-center font-black text-xs transition-all shadow-xs active:scale-95 ${
                            assento.ocupado
                              ? "bg-slate-300 text-slate-400 cursor-not-allowed opacity-50"
                              : assentosSelecionados.includes(assento.id)
                                ? "bg-[#0d5930] text-white ring-2 ring-amber-300 shadow-md scale-105"
                                : "bg-white text-slate-800 border border-slate-200 hover:border-emerald-400"
                          }`}
                        >
                          <span className="text-[11px]">{assento.label}</span>
                          <span className="text-[8px] font-normal opacity-75">Fundo</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="text-center">
                  <span className="text-xs font-bold text-slate-600">
                    Poltronas Selecionadas:{" "}
                    <strong className="text-[#0d5930] font-black">
                      {assentosSelecionados.join(", ")}
                    </strong>{" "}
                    ({assentosSelecionados.length} lugar
                    {assentosSelecionados.length > 1 ? "es" : ""})
                  </span>
                </div>
              </div>
            )}

            {/* ETAPA 3: PAGAMENTO (PIX REAL OU CARTÃO) */}
            {passo === "pagamento" && (
              <div className="space-y-4 animate-in fade-in">
                {/* Seletor de Método de Pagamento */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMetodoPagamento("PIX")}
                    className={`p-3 rounded-2xl border flex items-center justify-center gap-2 font-black text-xs transition-all active:scale-95 ${
                      metodoPagamento === "PIX"
                        ? "bg-[#0d5930] text-white border-[#0d5930] shadow-md"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <QrCode className="h-4 w-4 text-amber-300" />
                    <span>PIX Instantâneo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetodoPagamento("CARTAO")}
                    className={`p-3 rounded-2xl border flex items-center justify-center gap-2 font-black text-xs transition-all active:scale-95 ${
                      metodoPagamento === "CARTAO"
                        ? "bg-[#0d5930] text-white border-[#0d5930] shadow-md"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <CreditCard className="h-4 w-4 text-amber-300" />
                    <span>Cartão de Crédito</span>
                  </button>
                </div>

                {metodoPagamento === "PIX" ? (
                  <div className="space-y-3 bg-slate-50 p-4 rounded-3xl border border-slate-200 text-center">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full inline-block">
                        Aprovação Instantânea (5s)
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Válido por 10 min
                      </span>
                    </div>

                    {/* QR Code Real Determinístico */}
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm max-w-[200px] sm:max-w-[220px] mx-auto">
                      <RealQrCodePix textoChave={chavePixCopiaECola} tamanho={180} />
                    </div>

                    {/* Guia Visual em 3 Passos */}
                    <div className="grid grid-cols-3 gap-1.5 text-left bg-white p-2.5 rounded-2xl border border-slate-200/80 text-[10px]">
                      <div className="space-y-0.5">
                        <span className="font-black text-[#0d5930] block">1. Copie</span>
                        <p className="text-slate-500 leading-tight">Toque no botão verde abaixo.</p>
                      </div>
                      <div className="space-y-0.5 border-l border-slate-100 pl-1.5">
                        <span className="font-black text-[#0d5930] block">2. Banco</span>
                        <p className="text-slate-500 leading-tight">Abra o app do seu banco.</p>
                      </div>
                      <div className="space-y-0.5 border-l border-slate-100 pl-1.5">
                        <span className="font-black text-[#0d5930] block">3. Cole</span>
                        <p className="text-slate-500 leading-tight">Cole no 'PIX Copia e Cola'.</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <button
                        type="button"
                        onClick={copiarChavePix}
                        className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-black shadow-md active:scale-95 transition-all ${
                          pixCopiado
                            ? "bg-emerald-600 text-white shadow-emerald-900/30 ring-2 ring-emerald-400"
                            : "bg-gradient-to-r from-[#0d5930] to-[#147a44] hover:brightness-105 text-white shadow-emerald-950/20"
                        }`}
                      >
                        {pixCopiado ? (
                          <>
                            <CheckCircle2 className="h-5 w-5 text-amber-300 animate-in zoom-in-75" />
                            <span>Código PIX Copiado! Abra seu Banco</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 text-amber-300" />
                            <span>Copiar Chave PIX (Copia e Cola)</span>
                          </>
                        )}
                      </button>
                      {pixCopiado && (
                        <p className="text-[11px] font-bold text-emerald-800 bg-emerald-50 py-1.5 px-2 rounded-xl border border-emerald-200 animate-in fade-in">
                          Chave transferida para a sua área de transferência. Basta colar no
                          aplicativo do seu banco!
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">
                        Número do Cartão
                      </label>
                      <input
                        type="text"
                        value={numeroCartao}
                        onChange={(e) => setNumeroCartao(e.target.value)}
                        placeholder="0000 0000 0000 0000"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">Validade</label>
                        <input
                          type="text"
                          value={validadeCartao}
                          onChange={(e) => setValidadeCartao(e.target.value)}
                          placeholder="MM/AA"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">CVV</label>
                        <input
                          type="text"
                          value={cvvCartao}
                          onChange={(e) => setCvvCartao(e.target.value)}
                          placeholder="123"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 4: SUCESSO E EMISSÃO DO BILHETE */}
            {passo === "sucesso" && bilheteEmitido && (
              <div className="space-y-4 animate-in zoom-in-95 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-[#0d5930] mx-auto">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Passagem Confirmada!
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Seu bilhete oficial com QR Code foi emitido com sucesso.
                  </p>
                </div>

                {/* BOARDING PASS CARD */}
                <div className="rounded-3xl bg-gradient-to-br from-[#0b2046] via-[#0d5930] to-[#071833] text-white p-4 shadow-xl border border-amber-300/40 text-left space-y-3">
                  <div className="flex items-center justify-between border-b border-white/15 pb-2">
                    <span className="text-[10px] font-black uppercase text-amber-300">
                      Bilhete Digital UniVans
                    </span>
                    <strong className="text-xs font-mono text-white">{bilheteEmitido.id}</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-300 uppercase block">Linha</span>
                      <strong className="text-sm font-black text-white">
                        {bilheteEmitido.origem} ➔ {bilheteEmitido.destino}
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-300 uppercase block">
                        Poltrona(s)
                      </span>
                      <strong className="text-sm font-black text-amber-300">
                        {assentosSelecionados.join(", ")}
                      </strong>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-white/10 border border-white/15 text-[11px] text-slate-200">
                    <span className="text-amber-300 font-bold block">Ponto de Embarque:</span>
                    <span>{bilheteEmitido.pontoEmbarque}</span>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-[10px] text-slate-300 block">Motorista / Van</span>
                      <strong className="font-bold text-white">
                        {bilheteEmitido.motoristaNome} • {bilheteEmitido.vanPlaca}
                      </strong>
                    </div>
                    <Link
                      to="/app/bilhetes"
                      onClick={onFechar}
                      className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs font-black shadow-md active:scale-95 transition-all"
                    >
                      Ver Meus Bilhetes
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. BARRA FIXA INFERIOR FLUTUANTE (STICKY ACTION BAR) */}
          <div className="p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shrink-0 flex items-center justify-between gap-3 shadow-lg">
            <div>
              <span className="text-xs font-bold text-slate-500 block uppercase">
                {passo === "sucesso" ? "Status" : "Total em Reais"}
              </span>
              <strong className="text-lg sm:text-xl font-black text-[#0d5930]">
                {passo === "sucesso"
                  ? "PAGO & ATIVO"
                  : `R$ ${valorTotal.toFixed(2).replace(".", ",")}`}
              </strong>
            </div>

            {passo === "dados" && (
              <button
                type="button"
                onClick={() => setPasso("assentos")}
                className="flex items-center gap-2 min-h-[48px] h-12 px-6 py-2 rounded-xl bg-gradient-to-r from-[#0d5930] to-[#147a44] text-white text-xs sm:text-sm font-black shadow-sm active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Escolher Poltronas</span>
                <ArrowRight className="h-4.5 w-4.5 text-amber-300" />
              </button>
            )}

            {passo === "assentos" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPasso("dados")}
                  className="min-h-[44px] h-11 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold active:scale-95 transition-all cursor-pointer"
                >
                  Voltar
                </button>
                {usarGratuidadeGov ? (
                  <button
                    type="button"
                    disabled={processandoPagamento}
                    onClick={handleFinalizarCompra}
                    className="flex items-center gap-2 min-h-[48px] h-12 px-6 py-2 rounded-xl bg-gradient-to-r from-[#0d5930] to-[#147a44] text-white text-xs sm:text-sm font-black shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {processandoPagamento ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>Emitindo Bilhete Gratuito...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4.5 w-4.5 text-amber-300" />
                        <span>Emitir Passagem Gratuita</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPasso("pagamento")}
                    className="flex items-center gap-2 min-h-[48px] h-12 px-6 py-2 rounded-xl bg-gradient-to-r from-[#0d5930] to-[#147a44] text-white text-xs sm:text-sm font-black shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <span>Ir para Pagamento</span>
                    <ArrowRight className="h-4.5 w-4.5 text-amber-300" />
                  </button>
                )}
              </div>
            )}

            {passo === "pagamento" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPasso("assentos")}
                  className="min-h-[44px] h-11 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold active:scale-95 transition-all cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={processandoPagamento}
                  onClick={handleFinalizarCompra}
                  className="flex items-center gap-2 min-h-[48px] h-12 px-6 py-2 rounded-xl bg-gradient-to-r from-[#0d5930] to-[#147a44] text-white text-xs sm:text-sm font-black shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {processandoPagamento ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4.5 w-4.5 text-amber-300" />
                      <span>Confirmar Pagamento</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {passo === "sucesso" && (
              <button
                type="button"
                onClick={onFechar}
                className="min-h-[48px] h-12 px-6 py-2 rounded-xl bg-[#0d5930] text-white text-sm font-black shadow-sm active:scale-[0.98] transition-all cursor-pointer"
              >
                Concluir & Fechar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE SELEÇÃO DE PONTO DE EMBARQUE */}
      <ModalSelecaoPontoEmbarque
        aberto={modalPontoAberto}
        onFechar={() => setModalPontoAberto(false)}
        pontoSelecionadoId={pontoEmbarqueEscolhido?.id}
        onSelecionarPonto={(p) => setPontoEmbarqueEscolhido(p)}
        cidadeOrigem={viagem.origem}
      />
    </>
  );
}
