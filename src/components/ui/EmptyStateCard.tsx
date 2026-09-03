import { LucideIcon, Compass } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface EmptyStateCardProps {
  icone?: LucideIcon;
  titulo: string;
  descricao: string;
  acaoTexto?: string;
  acaoLink?: string;
  onAcaoClique?: () => void;
  className?: string;
}

export function EmptyStateCard({
  icone: Icone = Compass,
  titulo,
  descricao,
  acaoTexto,
  acaoLink,
  onAcaoClique,
  className = "",
}: EmptyStateCardProps) {
  return (
    <div
      className={`p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 text-center space-y-3 shadow-xs max-w-md mx-auto ${className}`}
    >
      <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#0d5930] border border-emerald-100 mx-auto shadow-2xs">
        <Icone className="h-6 w-6 sm:h-7 sm:w-7" />
      </div>

      <div className="space-y-1">
        <h3 className="text-sm sm:text-base font-black text-slate-900">{titulo}</h3>
        <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
          {descricao}
        </p>
      </div>

      {acaoTexto && (
        <div className="pt-2">
          {acaoLink ? (
            <Link
              to={acaoLink}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0d5930] to-[#147a44] text-white text-xs font-black shadow-sm active:scale-95 transition-all hover:brightness-105"
            >
              {acaoTexto}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAcaoClique}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0d5930] to-[#147a44] text-white text-xs font-black shadow-sm active:scale-95 transition-all hover:brightness-105"
            >
              {acaoTexto}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
