import React from "react";
import {
  Bike,
  Car,
  ChevronRight,
  Bell,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Banknote,
  QrCode,
  Check,
} from "lucide-react";
import { useDelivery } from "@/contexts/DeliveryContext";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { DeliveryVehicleIllustrations } from "./DeliveryVehicleIllustrations";
import { appSettingsService } from "@/lib/ecosystem/app-settings-service";

interface DeliverySetupDashboardProps {
  onOpenNotifications: () => void;
  pushActive: boolean;
  userName: string;
  userAvatarUrl?: string | undefined;
}

export function DeliverySetupDashboard({
  onOpenNotifications,
  pushActive,
  userName,
  userAvatarUrl,
}: DeliverySetupDashboardProps) {
  const {
    veiculo,
    setVeiculo,
    abaAcao,
    setAbaAcao,
    origem,
    destino,
    abrirModalEndereco,
    cotacao,
    iniciarEntrega,
  } = useDelivery();

  const { corPrimaria, corTextoPrimaria, corSecundaria } = useBrandTheme();
  const primeiroNome = (userName || "").trim().split(/\s+/)[0] || "Rodrigo";

  const rotaPronta = Boolean(
    origem.endereco &&
    origem.contatoNome &&
    destino.endereco &&
    destino.contatoNome
  );

  const precoMoto = cotacao.precoBrl;
  const precoCarro = Number((cotacao.precoBrl * 1.55).toFixed(2));
  const precoAtual = veiculo === "MOTO" ? precoMoto : precoCarro;

  return (
    <div className="w-full flex flex-col font-sans bg-slate-50 text-slate-900 select-none">
      {/* 1. HEADER TOPO AZUL TECH PREMIUM COM SAUDAÇÃO E AVATAR */}
      <header
        style={{
          background: "linear-gradient(135deg, #0088FF 0%, #003366 100%)",
          color: "#FFFFFF",
        }}
        className="pt-4 pb-4 px-5 relative z-10 flex items-center justify-between shadow-md"
      >
        <div className="flex items-center gap-3">
          {/* Avatar Redondo */}
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/80 shadow-xs bg-slate-200 shrink-0">
            <img
              src={
                userAvatarUrl ||
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
              }
              alt={primeiroNome}
              className="w-full h-full object-cover"
            />
          </div>

          <span className="text-base sm:text-lg font-black tracking-tight leading-tight">
            Olá, {primeiroNome}!
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label="Notificações"
          className="relative p-2 text-inherit hover:bg-black/10 active:scale-95 rounded-full transition cursor-pointer"
        >
          <Bell className="w-5 h-5 stroke-[2.2]" />
          {pushActive ? (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          ) : (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-primary-600 ring-2 ring-white animate-pulse" />
          )}
        </button>
      </header>

      {/* 2. ÁREA DE CONTEÚDO PRINCIPAL COM FUNDO OFF-WHITE */}
      <div className="flex-1 px-4 sm:px-6 pt-5 pb-6 space-y-4">
        {/* TÍTULO PRINCIPAL MINIMALISTA */}
        <div className="text-center space-y-1">
          <p className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-slate-700">
            VOCÊ PRECISA,
          </p>
          <div className="flex items-center justify-center gap-2">
            <div
              style={{
                background: "linear-gradient(135deg, #0088FF 0%, #003366 100%)",
                color: "#FFFFFF",
              }}
              className="w-6 h-6 rounded-md flex items-center justify-center font-black text-xs shadow-2xs"
            >
              ➔
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              Partiu Entregas
            </h1>
          </div>
        </div>

        {/* ILUSTRAÇÕES VETORIAIS DE MOTO E CARRO COM PACOTES */}
        <DeliveryVehicleIllustrations className="my-1" />

        {/* 3. CARD PRINCIPAL COM NAVEGAÇÃO EM ABAS (ENVIAR / RECEBER) */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm space-y-4">
          {/* ABAS SUTIS E ELEGANTES COM INDICADOR */}
          <div className="flex items-center gap-6 border-b border-slate-100 pb-2">
            <button
              type="button"
              onClick={() => setAbaAcao("enviar")}
              className={`text-base sm:text-lg transition-all cursor-pointer relative pb-1 ${
                abaAcao === "enviar"
                  ? "font-black text-slate-950"
                  : "font-semibold text-slate-400 hover:text-slate-600"
              }`}
            >
              <span>Enviar</span>
              {abaAcao === "enviar" && (
                <div
                  style={{ backgroundColor: corSecundaria || "#F97316" }}
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setAbaAcao("receber")}
              className={`text-base sm:text-lg transition-all cursor-pointer relative pb-1 ${
                abaAcao === "receber"
                  ? "font-black text-slate-950"
                  : "font-semibold text-slate-400 hover:text-slate-600"
              }`}
            >
              <span>Receber</span>
              {abaAcao === "receber" && (
                <div
                  style={{ backgroundColor: corSecundaria || "#F97316" }}
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                />
              )}
            </button>
          </div>

          {/* ITENS DE ENDEREÇO CONFORME A ABA ATIVA */}
          {abaAcao === "enviar" ? (
            /* ==================== MODO ENVIAR ==================== */
            <div className="space-y-3">
              {/* PONTO 1: ORIGEM ("ENVIAR DE" - AUTO-PREENCHIDA COM LOCAL DO USUÁRIO) */}
              <div
                onClick={() => abrirModalEndereco("origem")}
                className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Círculo Verde de Origem */}
                  <div className="w-3 h-3 rounded-full border-2 border-emerald-500 bg-white shrink-0 ring-2 ring-emerald-100 ml-0.5" />

                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {origem.endereco || "Localizando via GPS..."}
                    </p>
                    <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                      {origem.contatoNome} • {origem.contatoTelefone}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 shrink-0 transition" />
              </div>

              {/* DIVISOR SUTIL */}
              <div className="border-t border-slate-100 ml-6" />

              {/* PONTO 2: DESTINO ("ENTREGAR PARA" - CAMPO EM BRANCO OU PREENCHIDO) */}
              {!destino.endereco ? (
                /* Campo em Branco de Destino (Botão Grande Estilo 99 Entrega) */
                <div
                  onClick={() => abrirModalEndereco("destino")}
                  className="p-3.5 sm:p-4 bg-slate-50/90 hover:bg-slate-100 rounded-2xl border border-slate-200/80 flex items-center gap-3 cursor-pointer transition active:scale-[0.99]"
                >
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-primary-600 bg-white shrink-0 ring-2 ring-amber-100 ml-0.5" />
                  <span className="text-base font-black text-slate-900 tracking-tight">
                    Entregar para
                  </span>
                </div>
              ) : (
                /* Destino Já Preenchido */
                <div
                  onClick={() => abrirModalEndereco("destino")}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-3 h-3 rounded-full border-2 border-primary-600 bg-white shrink-0 ring-2 ring-amber-100 ml-0.5" />

                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {destino.endereco}
                      </p>
                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                        {destino.contatoNome} • {destino.contatoTelefone}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 shrink-0 transition" />
                </div>
              )}
            </div>
          ) : (
            /* ==================== MODO RECEBER ==================== */
            <div className="space-y-3">
              {/* PONTO 1: ORIGEM ("BUSCAR PACOTE EM" - CAMPO EM BRANCO OU PREENCHIDO) */}
              {!origem.endereco ? (
                /* Campo em Branco de Origem na Coleta */
                <div
                  onClick={() => abrirModalEndereco("origem")}
                  className="p-3.5 sm:p-4 bg-slate-50/90 hover:bg-slate-100 rounded-2xl border border-slate-200/80 flex items-center gap-3 cursor-pointer transition active:scale-[0.99]"
                >
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-primary-600 bg-white shrink-0 ring-2 ring-amber-100 ml-0.5" />
                  <span className="text-base font-black text-slate-900 tracking-tight">
                    Buscar pacote em
                  </span>
                </div>
              ) : (
                /* Origem Já Preenchida */
                <div
                  onClick={() => abrirModalEndereco("origem")}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-3 h-3 rounded-full border-2 border-primary-600 bg-white shrink-0 ring-2 ring-amber-100 ml-0.5" />

                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {origem.endereco}
                      </p>
                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                        {origem.contatoNome} • {origem.contatoTelefone}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 shrink-0 transition" />
                </div>
              )}

              {/* DIVISOR SUTIL */}
              <div className="border-t border-slate-100 ml-6" />

              {/* PONTO 2: DESTINO ("RECEBER EM" - AUTO-PREENCHIDA COM LOCAL DO USUÁRIO) */}
              <div
                onClick={() => abrirModalEndereco("destino")}
                className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-3 h-3 rounded-full border-2 border-emerald-500 bg-white shrink-0 ring-2 ring-emerald-100 ml-0.5" />

                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {destino.endereco || "Localizando via GPS..."}
                    </p>
                    <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                      {destino.contatoNome} • {destino.contatoTelefone}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 shrink-0 transition" />
              </div>
            </div>
          )}
        </div>

        {/* 4. ESCOLHA DE VEÍCULO E CHAMADA DIRETA QUANDO A ROTA ESTÁ COMPLETA */}
        {rotaPronta ? (
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Veículo Disponível
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Duplo PIN Ativo
              </span>
            </div>

            {/* CARDS COMPACTOS: MOTO FLASH vs CARRO BAÚ */}
            <div className="grid grid-cols-2 gap-3">
              {/* Card 1: Moto Flash */}
              <button
                type="button"
                onClick={() => setVeiculo("MOTO")}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between active:scale-98 ${
                  veiculo === "MOTO"
                    ? "border-primary-600 bg-primary-50/50 shadow-xs ring-2 ring-primary-600/20"
                    : "border-slate-200 bg-white hover:border-slate-300 opacity-80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      veiculo === "MOTO"
                        ? "bg-primary-600 text-slate-950 font-black"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Bike className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                    Até 20kg
                  </span>
                </div>

                <div className="mt-2">
                  <span className="text-xs font-black text-slate-900 block leading-tight">
                    Moto Flash
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    ~12 min • Rápido
                  </span>
                </div>

                <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-900">
                  <span className="text-[9.5px] text-slate-400 uppercase">Valor</span>
                  <span className="text-amber-700">
                    R$ {precoMoto.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </button>

              {/* Card 2: Carro Baú */}
              <button
                type="button"
                onClick={() => setVeiculo("CARRO")}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between active:scale-98 ${
                  veiculo === "CARRO"
                    ? "border-primary-600 bg-primary-50/50 shadow-xs ring-2 ring-primary-600/20"
                    : "border-slate-200 bg-white hover:border-slate-300 opacity-80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      veiculo === "CARRO"
                        ? "bg-primary-600 text-slate-950 font-black"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Car className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-[9px] font-black text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded">
                    Até 80kg
                  </span>
                </div>

                <div className="mt-2">
                  <span className="text-xs font-black text-slate-900 block leading-tight">
                    Carro Baú
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    ~18 min • Caixas
                  </span>
                </div>

                <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-900">
                  <span className="text-[9.5px] text-slate-400 uppercase">Valor</span>
                  <span className="text-amber-700">
                    R$ {precoCarro.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </button>
            </div>

            {/* BOTÃO PRIMÁRIO: CHAMAR ENTREGA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={iniciarEntrega}
                style={{
                  background: "linear-gradient(135deg, #0088FF 0%, #003366 100%)",
                  color: "#FFFFFF",
                  borderRadius: 16,
                  boxShadow: "0 8px 24px -4px rgba(0, 51, 102, 0.35), 0 4px 12px -2px rgba(0, 136, 255, 0.25)",
                }}
                className="w-full py-3.5 px-4 font-bold text-sm sm:text-base active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer hover:brightness-105"
              >
                <span>
                  Confirmar {veiculo === "MOTO" ? "Moto Flash" : "Carro Baú"} • R$ {precoAtual.toFixed(2).replace(".", ",")}
                </span>
                <ArrowRight className="w-4 h-4 stroke-[2.5] text-white" />
              </button>
            </div>
          </div>
        ) : (
          /* HINT DISCRETO CASO FALTE O DESTINO/ORIGEM */
          <div className="p-3 rounded-2xl bg-white/70 border border-slate-200/60 flex items-center gap-2.5 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs font-medium leading-snug">
              {abaAcao === "enviar"
                ? "Toque em 'Entregar para' para definir o destinatário e cotar o valor."
                : "Toque em 'Buscar pacote em' para definir de onde o motorista vai retirar o pacote."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
