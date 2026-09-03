import { useEffect, useState } from "react";
import { FontSizeOption, getSavedFontSize, setGlobalFontSize } from "@/lib/font-size-manager";
import { Type, Sparkles, Check } from "lucide-react";

export function FontSizeSelector() {
  const [currentSize, setCurrentSize] = useState<FontSizeOption>("normal");

  useEffect(() => {
    setCurrentSize(getSavedFontSize());
  }, []);

  function handleSelect(size: FontSizeOption) {
    setCurrentSize(size);
    setGlobalFontSize(size);
  }

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-[#0d5930] border border-emerald-200/60">
            <Type className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 leading-tight">
              Tamanho do Texto & Fontes
            </h3>
            <p className="text-sm font-semibold text-slate-600 leading-relaxed">
              Ajuste para uma leitura mais confortável no celular e computador
            </p>
          </div>
        </div>
      </div>

      {/* Opções de Tamanho */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        <button
          type="button"
          onClick={() => handleSelect("normal")}
          className={`flex flex-col items-center justify-center p-3.5 min-h-[56px] rounded-2xl border transition-all cursor-pointer ${
            currentSize === "normal"
              ? "bg-emerald-50/80 border-[#0d5930] text-[#0d5930] font-black shadow-xs ring-2 ring-[#0d5930]/20"
              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 font-bold"
          }`}
        >
          <span className="text-base font-bold">Aa</span>
          <span className="text-sm mt-1 font-semibold">Normal</span>
          {currentSize === "normal" && <Check className="h-4 w-4 mt-1 text-[#0d5930]" />}
        </button>

        <button
          type="button"
          onClick={() => handleSelect("grande")}
          className={`flex flex-col items-center justify-center p-3.5 min-h-[56px] rounded-2xl border transition-all cursor-pointer ${
            currentSize === "grande"
              ? "bg-emerald-50/80 border-[#0d5930] text-[#0d5930] font-black shadow-xs ring-2 ring-[#0d5930]/20"
              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 font-bold"
          }`}
        >
          <span className="text-lg font-black">Aa</span>
          <span className="text-sm mt-1 font-semibold">Grande</span>
          {currentSize === "grande" && <Check className="h-4 w-4 mt-1 text-[#0d5930]" />}
        </button>

        <button
          type="button"
          onClick={() => handleSelect("extra-grande")}
          className={`flex flex-col items-center justify-center p-3.5 min-h-[56px] rounded-2xl border transition-all cursor-pointer ${
            currentSize === "extra-grande"
              ? "bg-emerald-50/80 border-[#0d5930] text-[#0d5930] font-black shadow-xs ring-2 ring-[#0d5930]/20"
              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 font-bold"
          }`}
        >
          <span className="text-xl font-black">Aa</span>
          <span className="text-sm mt-1 font-semibold">Extra Grande</span>
          {currentSize === "extra-grande" && <Check className="h-4 w-4 mt-1 text-[#0d5930]" />}
        </button>
      </div>
    </div>
  );
}
