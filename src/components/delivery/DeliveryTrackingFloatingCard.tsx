import React, { useState } from "react";
import {
  Bike,
  Car,
  Phone,
  MessageCircle,
  Share2,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { useDelivery } from "@/contexts/DeliveryContext";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { deliveryDualPinService } from "@/services/DeliveryDualPinService";

export function DeliveryTrackingFloatingCard() {
  const {
    ordemAtiva,
    status,
    simularMotoristaValidarPin1,
    avancarParaDestino,
    simularMotoristaValidarPin2,
    cancelarEntregaAtiva,
    reiniciarParaNovaEntrega,
  } = useDelivery();

  const { corPrimaria, corTextoPrimaria } = useBrandTheme();

  const [pinCopiado, setPinCopiado] = useState(false);
  const [feedbackSimulacao, setFeedbackSimulacao] = useState<string | null>(null);

  if (!ordemAtiva || status === "SETUP") return null;

  const { motorista, pins, destino, quote } = ordemAtiva;

  function copiarPin(pin: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(pin);
      setPinCopiado(true);
      setTimeout(() => setPinCopiado(false), 2500);
    }
  }

  function handleCompartilharPin2() {
    void deliveryDualPinService.shareDeliveryPin({
      recipientName: destino.contatoNome,
      recipientPhone: destino.contatoTelefone,
      driverName: motorista.nome,
      vehicleModel: motorista.veiculoModelo,
      vehiclePlate: motorista.veiculoPlaca,
      pin2: pins.pin2Entrega,
    });
  }

  function handleSimularColeta() {
    const res = simularMotoristaValidarPin1();
    setFeedbackSimulacao(res.mensagem);
    setTimeout(() => setFeedbackSimulacao(null), 3000);
  }

  function handleSimularEntrega() {
    const res = simularMotoristaValidarPin2();
    setFeedbackSimulacao(res.mensagem);
    setTimeout(() => setFeedbackSimulacao(null), 3000);
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 pb-4 animate-in slide-in-from-bottom duration-300 z-30">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-4 space-y-3.5 text-left">
        
        {/* CABEÇALHO DO MOTORISTA & VEÍCULO (MOTO OU CARRO ESTRITAMENTE) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={motorista.fotoUrl}
                alt={motorista.nome}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm ring-1 ring-black/10"
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary-600 text-slate-950 flex items-center justify-center text-[10px] font-bold shadow-xs">
                {motorista.veiculoCategoria === "MOTO" ? (
                  <Bike className="w-3 h-3" />
                ) : (
                  <Car className="w-3 h-3" />
                )}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-slate-900 leading-tight">
                  {motorista.nome}
                </h3>
                <span className="text-[10px] font-bold text-primary-700 bg-primary-50 px-1.5 py-0.2 rounded-md">
                  ★ {motorista.avaliacao.toFixed(2)}
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-600 mt-0.5">
                {motorista.veiculoModelo} • <span className="font-mono font-bold text-slate-800">{motorista.veiculoPlaca}</span>
              </p>
            </div>
          </div>

          <a
            href={`tel:${motorista.telefone.replace(/\D/g, "")}`}
            className="w-9 h-9 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition active:scale-95 shadow-xs"
            aria-label="Ligar para o motorista"
          >
            <Phone className="w-4 h-4" />
          </a>
        </div>

        {/* FEEDBACK DE SIMULAÇÃO */}
        {feedbackSimulacao && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackSimulacao}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ESTADO 1: COLETA (AWAITING_PICKUP) — PIN 1 REVELADO PARA O REMETENTE      */}
        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* ESTADO 1: COLETA (AWAITING_PICKUP) — DUPLO PIN: COORDENAÇÃO REMETENTE & DESTINATÁRIO */}
        {/* ========================================================================= */}
        {status === "AWAITING_PICKUP" && (
          <div className="space-y-3 animate-in fade-in">
            {/* Card 1: PIN de Coleta */}
            <div className="p-3.5 rounded-2xl bg-primary-50/95 border-2 border-primary-500 text-left space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-primary-700" />
                  PIN 1 — CÓDIGO DE COLETA
                </span>
                <span className="text-[10px] font-bold text-amber-800 bg-primary-100/60 px-2 py-0.5 rounded-md">
                  Para o Motorista
                </span>
              </div>

              <div className="flex items-center justify-between py-0.5">
                <span className="text-3xl font-mono font-black tracking-widest text-slate-950">
                  {pins.pin1Coleta}
                </span>

                <button
                  type="button"
                  onClick={() => copiarPin(pins.pin1Coleta)}
                  className="px-2.5 py-1.5 rounded-xl bg-primary-100/70 hover:bg-amber-300/80 text-amber-950 font-bold text-xs transition active:scale-95 flex items-center gap-1 cursor-pointer"
                  title="Copiar PIN 1"
                >
                  {pinCopiado ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copiar</span>
                </button>
              </div>

              <p className="text-[11px] text-amber-900 font-medium">
                PIN de Coleta: <strong>{pins.pin1Coleta}</strong> — Informe ao motorista para ele iniciar a rota.
              </p>
            </div>

            {/* Card 2: PIN de Entrega (com compartilhamento rápido) */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/95 border-2 border-emerald-300 text-left space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  PIN 2 — CÓDIGO DE ENTREGA
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-md">
                  Para o Destinatário
                </span>
              </div>

              <div className="flex items-center justify-between py-0.5">
                <span className="text-3xl font-mono font-black tracking-widest text-emerald-950">
                  {pins.pin2Entrega}
                </span>

                <button
                  type="button"
                  onClick={handleCompartilharPin2}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  title="Compartilhar PIN via WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Compartilhar</span>
                </button>
              </div>

              <p className="text-[11px] text-emerald-900 font-medium">
                PIN de Entrega: <strong>{pins.pin2Entrega}</strong> — Compartilhe este código com quem vai receber o pacote ({destino.contatoNome}).
              </p>
            </div>

            {/* Simulação para teste */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleSimularColeta}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary-700" />
                <span>Simular Motorista Validando PIN 1 na Coleta</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ESTADO 2: TRÂNSITO (IN_TRANSIT) — PIN 1 CONFIRMADO, ENCOMENDA EM ROTA     */}
        {/* ========================================================================= */}
        {status === "IN_TRANSIT" && (
          <div className="space-y-3 animate-in fade-in">
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                {motorista.veiculoCategoria === "MOTO" ? (
                  <Bike className="w-5 h-5" />
                ) : (
                  <Car className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 block">
                  Em Trânsito para o Destino
                </span>
                <p className="text-xs font-black text-slate-900 truncate">
                  {destino.endereco}
                </p>
                <p className="text-[10px] text-blue-800 font-semibold mt-0.5">
                  PIN 1 Validado • Carga sob custódia segura
                </p>
              </div>
            </div>

            {/* Botão de avanço para o destino */}
            <button
              type="button"
              onClick={avancarParaDestino}
              style={{
                backgroundColor: corPrimaria,
                color: corTextoPrimaria,
              }}
              className="w-full py-3 px-4 rounded-2xl font-black text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Avançar para Chegada no Destino</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ESTADO 3: DESTINO (ARRIVED_DESTINATION) — REVELA PIN 2 & COMPARTILHAMENTO  */}
        {/* ========================================================================= */}
        {status === "ARRIVED_DESTINATION" && (
          <div className="space-y-3 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-emerald-50/90 border-2 border-emerald-300 text-center space-y-1.5 relative overflow-hidden">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 flex items-center justify-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                PIN 2 — CÓDIGO DE ENTREGA FINAL
              </span>

              <div className="flex items-center justify-center gap-3 py-1">
                <span className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-emerald-950">
                  {pins.pin2Entrega}
                </span>

                <button
                  type="button"
                  onClick={() => copiarPin(pins.pin2Entrega)}
                  className="p-2 rounded-xl bg-emerald-200/70 hover:bg-emerald-300/80 text-emerald-950 transition active:scale-95 cursor-pointer"
                  title="Copiar PIN 2"
                >
                  {pinCopiado ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[11px] text-emerald-900 font-medium leading-relaxed">
                O recebedor <strong>{destino.contatoNome}</strong> deve informar este PIN ao entregador.
              </p>
            </div>

            {/* BOTÃO COMPARTILHAR PIN NO WHATSAPP */}
            <button
              type="button"
              onClick={handleCompartilharPin2}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartilhar PIN 2 com {destino.contatoNome} no WhatsApp</span>
            </button>

            {/* Simulação para teste do PIN 2 */}
            <button
              type="button"
              onClick={handleSimularEntrega}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Simular Motorista Validando PIN 2 no Destino</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ESTADO 4: CONCLUSÃO (DELIVERED) — SUCESSO & RECIBO BLINDADO               */}
        {/* ========================================================================= */}
        {status === "DELIVERED" && (
          <div className="space-y-3 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-emerald-500 text-white text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-white/20 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>

              <h4 className="text-base font-black">Entrega Concluída com Sucesso!</h4>
              <p className="text-xs text-emerald-100">
                Todos os PINs de segurança foram verificados e homologados.
              </p>

              <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs">
                <span>Valor Final Pago:</span>
                <span className="font-black text-sm">
                  R$ {quote.precoBrl.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={reiniciarParaNovaEntrega}
              style={{
                backgroundColor: corPrimaria,
                color: corTextoPrimaria,
              }}
              className="w-full py-3.5 px-4 rounded-2xl font-black text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Fazer Nova Entrega</span>
            </button>
          </div>
        )}

        {/* Opção de Cancelamento se ainda não concluído */}
        {status !== "DELIVERED" && (
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={cancelarEntregaAtiva}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
            >
              Cancelar Entrega
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
