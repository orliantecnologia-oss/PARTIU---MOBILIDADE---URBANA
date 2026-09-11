import React, { useState, useEffect } from "react";
import {
  X,
  Send,
  Phone,
  User,
  MapPin,
  Car,
  Package,
  CheckCircle2,
  AlertTriangle,
  Zap,
  DollarSign,
  Users,
} from "lucide-react";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

interface AdminManualDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDispatchCreated?: (item: any) => void;
}

export const AdminManualDispatchModal: React.FC<AdminManualDispatchModalProps> = ({
  isOpen,
  onClose,
  onDispatchCreated,
}) => {
  const { corPrimaria, corSecundaria, corTextoPrimaria } = useBrandTheme();
  const brandGradient = `linear-gradient(135deg, ${corPrimaria}, ${corSecundaria})`;

  const [passageiroNome, setPassageiroNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [modalidade, setModalidade] = useState<"POP" | "MOTO" | "PLUS" | "MULHER" | "ENTREGA">("POP");
  const [valorSugerido, setValorSugerido] = useState<string>("16.50");
  const [tipoDespacho, setTipoDespacho] = useState<"RADAR" | "DIRETO">("RADAR");
  const [motoristaId, setMotoristaId] = useState<string>("");
  const [motoristasOnline, setMotoristasOnline] = useState<{ id: string; nome: string; veiculo: string; placa: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sucesso, setSucesso] = useState<{ id: string; pin: string } | null>(null);

  // Carrega motoristas disponíveis para atribuição direta
  useEffect(() => {
    if (!isOpen) return;

    async function carregarMotoristas() {
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data } = await (supabase as any)
            .from("partiu_motoristas")
            .select("id, nome_completo, veiculo_modelo, veiculo_placa")
            .eq("status", "ONLINE")
            .limit(15);

          if (data && data.length > 0) {
            setMotoristasOnline(
              data.map((m: any) => ({
                id: m.id,
                nome: m.nome_completo || "Motorista Parceiro",
                veiculo: m.veiculo_modelo || "Veículo Cadastrado",
                placa: m.veiculo_placa || "---",
              }))
            );
            if (data[0]) setMotoristaId((data[0] as any).id);
          }
        } catch {
          // Fallback para lista mock se banco estiver em contingência
        }
      }

      if (motoristasOnline.length === 0) {
        setMotoristasOnline([
          { id: "mot-1", nome: "Carlos Eduardo Silva", veiculo: "Chevrolet Onix", placa: "MOB-8K99" },
          { id: "mot-2", nome: "Lucas Motoboy Flash", veiculo: "Honda CG 160", placa: "MOT-7799" },
          { id: "mot-3", nome: "Mariana Souza", veiculo: "Hyundai HB20", placa: "MUL-2026" },
        ]);
        setMotoristaId("mot-1");
      }
    }

    void carregarMotoristas();
  }, [isOpen]);

  // Recalcula valor estimado quando a modalidade muda
  useEffect(() => {
    switch (modalidade) {
      case "MOTO":
        setValorSugerido("9.90");
        break;
      case "POP":
        setValorSugerido("16.50");
        break;
      case "PLUS":
        setValorSugerido("24.00");
        break;
      case "MULHER":
        setValorSugerido("17.50");
        break;
      case "ENTREGA":
        setValorSugerido("12.00");
        break;
    }
  }, [modalidade]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passageiroNome.trim() || !telefone.trim() || !origem.trim() || !destino.trim()) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setIsSubmitting(true);
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const rideId = `DSP-${Date.now()}`;
    const motoristaSelecionado = motoristasOnline.find((m) => m.id === motoristaId);

    const novoDespacho = {
      id: rideId,
      tipo:
        modalidade === "ENTREGA"
          ? "ENTREGA_FLASH"
          : modalidade === "MOTO"
          ? "CORRIDA_MOTO"
          : modalidade === "PLUS"
          ? "CORRIDA_PLUS"
          : modalidade === "MULHER"
          ? "CORRIDA_MULHER"
          : "CORRIDA_POP",
      passageiro: passageiroNome,
      telefone,
      origem,
      destino,
      motorista: tipoDespacho === "DIRETO" && motoristaSelecionado ? motoristaSelecionado.nome : "Disparando Radar...",
      veiculo: tipoDespacho === "DIRETO" && motoristaSelecionado ? motoristaSelecionado.veiculo : "Aguardando aceite",
      placa: tipoDespacho === "DIRETO" && motoristaSelecionado ? motoristaSelecionado.placa : "---",
      valor: parseFloat(valorSugerido) || 16.5,
      pin,
      status: tipoDespacho === "DIRETO" ? "A_CAMINHO" : "PROCURANDO",
      tempoDecorrido: "Agora",
    };

    // Tenta persistir no Supabase se configurado
    if (isSupabaseConfigured() && supabase) {
      try {
        await (supabase as any).from("viagens").insert({
          id: rideId,
          passenger_name: passageiroNome,
          passenger_phone: telefone,
          origin_address: origem,
          destination_address: destino,
          fare_amount: parseFloat(valorSugerido) || 16.5,
          pin_code: pin,
          status: tipoDespacho === "DIRETO" ? "ACCEPTED" : "REQUESTED",
          category: modalidade,
          driver_id: tipoDespacho === "DIRETO" ? motoristaId : null,
          origin_source: "CENTRAL_DESPACHO_MANUAL",
        });
      } catch (err) {
        console.warn("[AdminManualDispatch] Inserção remota em contingência:", err);
      }
    }

    // Emite evento para que a central e os ouvintes atualizem instantaneamente
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("partiu:corrida-atualizada", {
          detail: novoDespacho,
        })
      );
    }

    if (onDispatchCreated) {
      onDispatchCreated(novoDespacho);
    }

    setIsSubmitting(false);
    setSucesso({ id: rideId, pin });
  };

  const handleResetModal = () => {
    setSucesso(null);
    setPassageiroNome("");
    setTelefone("");
    setOrigem("");
    setDestino("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs font-black"
              style={{ background: brandGradient, color: corTextoPrimaria }}
            >
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-950 tracking-tight">
                Novo Chamado Manual (Central &amp; WhatsApp)
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                Atendimento telefônico • Despacho imediato de frota
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto space-y-4">
          {sucesso ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3 animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-lg font-black text-slate-950">Chamado Despachado com Sucesso!</h3>
              <p className="text-xs text-slate-600">
                O chamado foi enfileirado na central. Informe o PIN de segurança para o passageiro por telefone/WhatsApp:
              </p>
              <div className="p-3 bg-white rounded-xl border border-emerald-300 inline-block px-6">
                <span className="text-[11px] text-slate-400 font-bold uppercase block">PIN de Embarque</span>
                <span className="text-3xl font-mono font-black text-emerald-700 tracking-widest">
                  {sucesso.pin}
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetModal}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition cursor-pointer shadow-sm"
              >
                Concluir e Fechar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Dados do Passageiro */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Nome do Passageiro *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dona Maria Silva"
                    value={passageiroNome}
                    onChange={(e) => setPassageiroNome(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>WhatsApp / Telefone *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="(22) 99999-9999"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Rota */}
              <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ponto de Embarque (Origem) *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Rua, número e ponto de referência"
                    value={origem}
                    onChange={(e) => setOrigem(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-white border border-slate-200 font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-600" />
                    <span>Destino Final *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Bairro, clínica, comércio ou endereço final"
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-white border border-slate-200 font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Modalidade e Tarifa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Categoria do Veículo</label>
                  <select
                    value={modalidade}
                    onChange={(e) => setModalidade(e.target.value as any)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-400"
                  >
                    <option value="POP">🚗 PARTIU POP (Carro Padrão)</option>
                    <option value="MOTO">🛵 PARTIU Moto (Corrida Ágil)</option>
                    <option value="PLUS">✨ PARTIU Plus (Conforto)</option>
                    <option value="MULHER">🌸 PARTIU Mulher</option>
                    <option value="ENTREGA">📦 Entrega Expressa Flash</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Valor da Corrida (R$)</span>
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    value={valorSugerido}
                    onChange={(e) => setValorSugerido(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Modo de Alocação de Frota */}
              <div className="space-y-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <label className="text-[11px] font-bold text-slate-700 block">Tipo de Alocação de Motorista</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoDespacho("RADAR")}
                    className={`h-11 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                      tipoDespacho === "RADAR"
                        ? "bg-amber-400 text-slate-950 border-amber-500 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>Radar Automático</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoDespacho("DIRETO")}
                    className={`h-11 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                      tipoDespacho === "DIRETO"
                        ? "bg-amber-400 text-slate-950 border-amber-500 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Atribuir Direto</span>
                  </button>
                </div>

                {tipoDespacho === "DIRETO" && (
                  <div className="pt-2 animate-in fade-in duration-150">
                    <label className="text-[10.5px] font-bold text-slate-500 block mb-1">
                      Selecione o motorista para atribuir:
                    </label>
                    <select
                      value={motoristaId}
                      onChange={(e) => setMotoristaId(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl bg-white border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-400"
                    >
                      {motoristasOnline.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nome} • {m.veiculo} ({m.placa})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Botão de Disparo */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{ background: brandGradient, color: corTextoPrimaria }}
                className="w-full h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? "Despachando Chamado..." : "DESPACHAR CHAMADO IMEDIATAMENTE"}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
