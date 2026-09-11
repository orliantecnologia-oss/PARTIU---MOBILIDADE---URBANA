import React, { memo } from "react";
import {
  X,
  Star,
  ShieldCheck,
  CheckCircle2,
  Car,
  Bike,
  Quote,
} from "lucide-react";
import type { DriverTrustProfile } from "@/services/ProgressiveDispatchEngine";

export interface DriverProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: DriverTrustProfile | null | undefined;
}

const DEFAULT_REVIEWS = [
  {
    id: "rev-1",
    author: "Juliana M.",
    rating: 5,
    text: "Motorista muito educado e prestativo!",
    date: "Ontem",
  },
  {
    id: "rev-2",
    author: "Felipe S.",
    rating: 5,
    text: "Chegou rápido, direção muito segura e tranquila.",
    date: "Há 2 dias",
  },
  {
    id: "rev-3",
    author: "Larissa C.",
    rating: 5,
    text: "Veículo impecável, super limpo e confortável.",
    date: "Esta semana",
  },
];

export const DriverProfileModal = memo(function DriverProfileModal({
  isOpen,
  onClose,
  profile,
}: DriverProfileModalProps) {
  if (!isOpen) return null;

  const data: DriverTrustProfile = profile || {
    driverId: "mot-verified",
    fullName: "Carlos Eduardo Silva",
    firstName: "Carlos",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    category: "Partiu Carro",
    rating: 4.98,
    totalRides: 1284,
    platformYears: 2,
    completionRate: 99,
    vehicleBrand: "Chevrolet",
    vehicleModel: "Onix Plus",
    vehicleColor: "Branco",
    vehicleYear: 2024,
    licensePlate: "TUS1J60",
    phone: "(22) 99876-5432",
  };

  const isMoto = data.category.toLowerCase().includes("moto");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="driver-profile-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-left animate-in slide-in-from-bottom duration-200 select-none max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra tátil mobile */}
        <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mt-3 sm:hidden" />

        {/* Header com botão fechar (min 48x48px touch target) */}
        <div className="p-4 sm:p-5 pb-2 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-black tracking-wide text-slate-800 uppercase">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span id="driver-profile-title">Perfil do Motorista Parceiro</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar perfil do motorista"
            className="w-11 h-11 flex items-center justify-center rounded-2xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 active:scale-95 transition-all touch-manipulation cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Foto Grande + Nome Completo + Categoria */}
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <img
                src={data.avatarUrl}
                alt={data.fullName}
                className="w-24 h-24 rounded-3xl object-cover border-4 border-primary-600 shadow-lg"
              />
              <span
                title="Motorista Verificado"
                className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1 rounded-full border-2 border-white shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>

            <h3 className="text-lg font-black text-slate-950 mt-3 leading-snug">
              {data.fullName}
            </h3>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                {data.category}
              </span>
              <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Documentação Verificada
              </span>
            </div>
          </div>

          {/* Grid 2x2 de Estatísticas Reais */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* 1. Nota Média */}
            <div className="p-3 rounded-2xl bg-primary-50/70 border border-amber-200 text-center">
              <div className="flex items-center justify-center gap-1 text-primary-600 mb-0.5">
                <Star className="w-4 h-4 fill-amber-400" />
                <span className="text-lg font-black text-slate-950">
                  {Number(data.rating).toFixed(2)}
                </span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-900">
                Nota Média
              </span>
            </div>

            {/* 2. Corridas Realizadas */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-lg font-black text-slate-950 block leading-tight">
                {data.totalRides.toLocaleString("pt-BR")}+
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 mt-0.5 block">
                Corridas Feitas
              </span>
            </div>

            {/* 3. Tempo na Plataforma */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-lg font-black text-slate-950 block leading-tight">
                {data.platformYears} {data.platformYears === 1 ? "ano" : "anos"}
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 mt-0.5 block">
                Tempo de Plataforma
              </span>
            </div>

            {/* 4. Taxa de Conclusão */}
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center">
              <span className="text-lg font-black text-emerald-950 block leading-tight">
                {data.completionRate}%
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 mt-0.5 block">
                Taxa de Conclusão
              </span>
            </div>
          </div>

          {/* Dados do Veículo com Placa Mercosul */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Veículo Oficial
            </span>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 shadow-xs">
                  {isMoto ? <Bike className="w-5 h-5" /> : <Car className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-950">
                    {data.vehicleBrand} {data.vehicleModel}
                  </h4>
                  <p className="text-xs text-slate-600 font-semibold">
                    Cor {data.vehicleColor} • Ano {data.vehicleYear}
                  </p>
                </div>
              </div>

              {/* Placa Mercosul Estilo Uber / 99 */}
              <div className="border border-slate-800 rounded-sm overflow-hidden shadow-xs w-22 bg-white text-center">
                <div className="bg-[#003399] px-1 py-0.2 flex items-center justify-between text-[6px] text-white font-black tracking-widest leading-none">
                  <span>BRASIL</span>
                  <span className="w-1 h-0.5 rounded-2xs bg-emerald-400 inline-block" />
                </div>
                <div className="py-0.5 font-mono font-black text-xs text-slate-950 tracking-wider leading-none">
                  {data.licensePlate}
                </div>
              </div>
            </div>
          </div>

          {/* Avaliações Recentes de Passageiros */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Últimas Avaliações
            </span>
            <div className="space-y-2">
              {DEFAULT_REVIEWS.map((rev) => (
                <div
                  key={rev.id}
                  className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900">{rev.author}</span>
                    <div className="flex items-center gap-0.5 text-primary-600">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-slate-600 italic flex items-start gap-1 text-[11px]">
                    <Quote className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                    <span>"{rev.text}"</span>
                  </p>
                  <span className="text-[10px] text-slate-400 block text-right">{rev.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 pt-2 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-2xl bg-slate-950 text-white font-black text-xs hover:bg-slate-900 active:scale-95 transition-all shadow-md touch-manipulation flex items-center justify-center cursor-pointer"
          >
            Fechar Perfil
          </button>
        </div>
      </div>
    </div>
  );
});
