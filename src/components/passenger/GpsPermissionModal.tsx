import React, { useState } from "react";
import { Navigation, AlertTriangle, ShieldCheck, MapPin, Loader2 } from "lucide-react";
import { usePassengerRide } from "@/contexts/PassengerRideContext";

export function GpsPermissionModal() {
  const { isGpsPermissionModalOpen, closeGpsPermissionModal, solicitarPermissaoGps } = usePassengerRide();
  const [solicitando, setSolicitando] = useState(false);
  const [tentativaFalhou, setTentativaFalhou] = useState(false);

  if (!isGpsPermissionModalOpen) return null;

  async function handleTentarNovamente() {
    setSolicitando(true);
    setTentativaFalhou(false);
    try {
      const sucesso = await solicitarPermissaoGps();
      if (!sucesso) {
        setTentativaFalhou(true);
      }
    } finally {
      setSolicitando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-center p-6 space-y-4 animate-in zoom-in-95 duration-200">
        
        {/* Ícone com Pulso de Atenção */}
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 border-4 border-amber-200 flex items-center justify-center text-amber-600 relative">
          <Navigation className="w-7 h-7 animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-white" />
          </span>
        </div>

        {/* Título & Descrição */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">
            Localização em Tempo Real Necessária
          </h3>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            O Partiu precisa acessar o GPS do seu dispositivo para conectar você ao motorista mais próximo e marcar o ponto exato de embarque.
          </p>
        </div>

        {/* Alerta de Falha/Bloqueio nas Configurações */}
        {tentativaFalhou && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-left flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-red-800 leading-tight">
              <strong className="font-bold">Permissão bloqueada:</strong> Acesse as configurações de permissões do seu navegador ou celular e permita o acesso à Localização.
            </div>
          </div>
        )}

        {/* Vantagens de Segurança */}
        <div className="py-1 px-3 bg-slate-50 border border-slate-100 rounded-2xl text-left space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] text-slate-700 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Coordenadas protegidas e criptografadas</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-700 font-semibold">
            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Sem necessidade de digitar o endereço manualmente</span>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleTentarNovamente}
            disabled={solicitando}
            className="w-full h-12 rounded-2xl bg-amber-400 hover:bg-amber-500 active:scale-[0.98] text-slate-950 font-black text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            {solicitando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Buscando satélites...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" />
                <span>Permitir / Ativar GPS</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={closeGpsPermissionModal}
            className="w-full h-10 rounded-xl text-xs text-slate-500 hover:text-slate-800 font-bold transition-colors"
          >
            Agora não
          </button>
        </div>

      </div>
    </div>
  );
}
