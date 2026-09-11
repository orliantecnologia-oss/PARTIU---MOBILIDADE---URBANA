import React, { useState } from "react";
import { Star, X, Check, Heart, ThumbsUp, ShieldCheck } from "lucide-react";
import {
  rideRatingService,
  type RatingRole,
  TAGS_99_PASSENGER_TO_DRIVER_POSITIVE,
  TAGS_99_PASSENGER_TO_DRIVER_IMPROVEMENT,
  TAGS_99_DRIVER_TO_PASSENGER,
} from "@/services/RideRatingService";

export interface RideRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rideId: string;
  fromUserId: string;
  toUserId: string;
  targetName: string;
  targetPhoto?: string;
  role: RatingRole;
  onSubmitted?: () => void;
}

export const RideRatingModal: React.FC<RideRatingModalProps> = ({
  isOpen,
  onClose,
  rideId,
  fromUserId,
  toUserId,
  targetName,
  targetPhoto,
  role,
  onSubmitted,
}) => {
  const [score, setScore] = useState<number>(5);
  const [hoverScore, setHoverScore] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (!isOpen) return null;

  const isPassengerEvaluatingDriver = role === "PASSENGER_TO_DRIVER";

  const availableTags = isPassengerEvaluatingDriver
    ? score >= 4
      ? TAGS_99_PASSENGER_TO_DRIVER_POSITIVE
      : TAGS_99_PASSENGER_TO_DRIVER_IMPROVEMENT
    : TAGS_99_DRIVER_TO_PASSENGER;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await rideRatingService.submitRating({
        rideId,
        fromUserId,
        toUserId,
        role,
        score,
        tags: Array.from(selectedTags),
        comment: comment.trim() || undefined,
      });

      setSubmittedSuccess(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setSubmittedSuccess(false);
        onSubmitted?.();
        onClose();
      }, 1400);
    } catch {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Cabeçalho Decorativo */}
        <div className="px-6 pt-6 pb-2 text-center">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Foto ou Avatar do Avaliado */}
          <div className="w-20 h-20 mx-auto rounded-full p-1 bg-gradient-to-tr from-amber-400 to-[#0088FF] shadow-lg mb-3">
            {targetPhoto ? (
              <img
                src={targetPhoto}
                alt={targetName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-slate-800 text-white font-black text-xl flex items-center justify-center">
                {targetName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <h3 className="text-lg font-black text-slate-900 tracking-tight">
            Como foi sua corrida com {targetName}?
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Sua avaliação anônima ajuda a manter o alto padrão de segurança do PARTIU.
          </p>
        </div>

        {submittedSuccess ? (
          <div className="py-12 px-6 text-center space-y-3 animate-in zoom-in-90 duration-300">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h4 className="text-base font-black text-slate-900">Avaliação Enviada!</h4>
            <p className="text-xs text-slate-500">Obrigado por ajudar a comunidade PARTIU.</p>
          </div>
        ) : (
          <div className="px-6 pb-6 space-y-5">
            {/* Seletor de 5 Estrelas */}
            <div className="flex items-center justify-center gap-2 pt-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverScore ?? score) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setScore(star)}
                    onMouseEnter={() => setHoverScore(star)}
                    onMouseLeave={() => setHoverScore(null)}
                    aria-label={`${star} estrelas`}
                    className="p-1 focus:outline-none transition-transform hover:scale-125 active:scale-95 cursor-pointer"
                  >
                    <Star
                      className={`w-9 h-9 transition-colors ${
                        isFilled
                          ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                          : "fill-slate-100 text-slate-300"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="text-center">
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                {score === 5 && "⭐ Excelente experiência"}
                {score === 4 && "👍 Muito boa"}
                {score === 3 && "😐 Regular"}
                {score === 2 && "👎 Ruim"}
                {score === 1 && "⚠️ Péssima"}
              </span>
            </div>

            {/* Chips com Tags Qualitativas da 99 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                {score >= 4 ? "O que você mais gostou?" : "O que pode melhorar?"}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.has(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-amber-400 text-slate-950 border-amber-400 shadow-xs scale-105 font-bold"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comentário Opcional */}
            <div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="Conte mais sobre sua viagem (opcional)..."
                maxLength={300}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#0088FF] focus:ring-2 focus:ring-[#0088FF]/20 transition resize-none"
              />
            </div>

            {/* Botões de Ação */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#0088FF] to-[#0055AA] hover:from-[#0077EE] hover:to-[#004499] text-white font-black text-sm shadow-md active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{isSubmitting ? "Enviando..." : "Confirmar Avaliação"}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                Pular avaliação
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
