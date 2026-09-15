import { Power, User, Wallet } from "lucide-react";

interface OfflineStateProps {
  onToggleOnline: () => void;
  onOpenProfile: () => void;
  onOpenWallet: () => void;
}

export function OfflineState({
  onToggleOnline,
  onOpenProfile,
  onOpenWallet,
}: OfflineStateProps) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-300">
      {/* Indicador de Status Offline */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
            <Power className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <h3 className="text-base font-black text-slate-900 leading-none">Você está Offline</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Conecte-se para receber viagens e encomendas próximas
            </p>
          </div>
        </div>
      </div>

      {/* Botão Primário 56px: Ficar Online */}
      <button
        type="button"
        onClick={onToggleOnline}
        className="w-full h-14 rounded-2xl bg-brand-status-green hover:brightness-105 active:scale-[0.98] text-white font-black text-base shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
      >
        <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
        <span>FICAR ONLINE AGORA</span>
      </button>

      {/* Ações Secundárias em Chips Compactos */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={onOpenWallet}
          className="h-11 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200/80 transition cursor-pointer"
        >
          <Wallet className="w-4 h-4 text-brand-primary-deep" />
          <span>Ganhos &amp; Saque PIX</span>
        </button>

        <button
          type="button"
          onClick={onOpenProfile}
          className="h-11 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200/80 transition cursor-pointer"
        >
          <User className="w-4 h-4 text-brand-primary-deep" />
          <span>Meu Perfil &amp; Veículo</span>
        </button>
      </div>
    </div>
  );
}
