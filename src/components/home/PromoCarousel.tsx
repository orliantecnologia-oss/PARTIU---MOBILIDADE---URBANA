import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { Tag, Sparkles, ArrowRight } from "lucide-react";
import { PromoBannerItem, PROMO_BANNERS_MOCK } from "./home-mock-data";

export interface PromoCarouselProps {
  banners?: PromoBannerItem[];
  onBannerClick?: (banner: PromoBannerItem) => void;
  autoPlayIntervalMs?: number;
}

export const PromoCarousel = memo(function PromoCarousel({
  banners = PROMO_BANNERS_MOCK,
  onBannerClick,
  autoPlayIntervalMs = 3000,
}: PromoCarouselProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeSlideRef = useRef(activeSlide);
  activeSlideRef.current = activeSlide;

  const scrollToSlide = useCallback((index: number) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const items = container.querySelectorAll<HTMLElement>("[data-banner-slide]");
    if (items[index]) {
      const targetLeft = items[index].offsetLeft - 16;
      container.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: "smooth",
      });
    } else {
      const cardWidth = container.clientWidth * 0.85;
      container.scrollTo({
        left: index * cardWidth,
        behavior: "smooth",
      });
    }
    setActiveSlide(index);
  }, []);

  // Transição automática de slide a cada 4 segundos
  useEffect(() => {
    if (!banners || banners.length <= 1 || isInteracting) return;

    const interval = setInterval(() => {
      const nextSlide = (activeSlideRef.current + 1) % banners.length;
      scrollToSlide(nextSlide);
    }, autoPlayIntervalMs);

    return () => clearInterval(interval);
  }, [banners, banners.length, isInteracting, autoPlayIntervalMs, scrollToSlide]);

  // Monitora o scroll horizontal para atualizar os pontos (dots) de paginação
  function handleScroll() {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    if (clientWidth === 0) return;

    const items = scrollRef.current.querySelectorAll<HTMLElement>("[data-banner-slide]");
    if (items.length > 0) {
      let closestIdx = 0;
      let minDiff = Infinity;
      items.forEach((item, idx) => {
        const diff = Math.abs((item.offsetLeft - 16) - scrollLeft);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      setActiveSlide(closestIdx);
    } else {
      const index = Math.round(scrollLeft / (clientWidth * 0.85));
      setActiveSlide(Math.min(Math.max(index, 0), banners.length - 1));
    }
  }

  if (!banners || banners.length === 0) return null;

  return (
    <div className="w-full z-20 pointer-events-auto shrink-0 relative m-0 p-0 mb-0 pb-0">
      {/* ScrollView Horizontal com Snap e Auto-play */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchStart={() => setIsInteracting(true)}
        onTouchEnd={() => {
          setTimeout(() => setIsInteracting(false), 2500);
        }}
        onMouseEnter={() => setIsInteracting(true)}
        onMouseLeave={() => setIsInteracting(false)}
        className="w-full flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth m-0 p-0"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {banners.map((item, idx) => (
          <div
            key={item.id}
            data-banner-slide={idx}
            onClick={() => onBannerClick?.(item)}
            className={`min-w-[270px] sm:min-w-[320px] max-w-[360px] snap-center rounded-2xl p-3.5 sm:p-4 bg-gradient-to-r ${item.corGradiente} shadow-md flex flex-col justify-between cursor-pointer active:scale-[0.99] transition-transform select-none relative overflow-hidden h-[134px] sm:h-[148px] min-h-[130px] shrink-0 text-white`}
          >
            {/* Imagem de Fundo Administrativa com object-cover (resizeMode="cover") */}
            {item.imagemUrl && (
              <img
                src={item.imagemUrl}
                alt={item.titulo}
                className="absolute inset-0 w-full h-full object-cover z-0 transition-transform duration-700 hover:scale-105"
                loading="lazy"
                decoding="async"
              />
            )}

            {/* Scrim Gradiente Suave: Garante contraste e legibilidade impecável sobre qualquer arte */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/25 z-[1] pointer-events-none" />

            {/* Elemento Decorativo no Fundo */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none z-[1]" />

            {/* Topo do Banner: Badge Promocional + Cupom */}
            <div className="flex items-center justify-between gap-2 relative z-10">
              <span className={`text-[9.5px] sm:text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${item.tagCor} shadow-xs tracking-wider flex items-center gap-1`}>
                <Sparkles className="w-2.5 h-2.5" />
                {item.badge}
              </span>

              {item.cupom && (
                <div className="flex items-center gap-1 text-[9.5px] sm:text-[10px] font-mono font-bold bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md text-primary-500 border border-primary-600/30 shadow-xs">
                  <Tag className="w-2.5 h-2.5 text-primary-600" />
                  <span>{item.cupom}</span>
                </div>
              )}
            </div>

            {/* Conteúdo Central: Título e Subtítulo */}
            <div className="relative z-10 my-auto py-1">
              <h3 className="text-sm sm:text-[15px] font-black tracking-tight leading-snug drop-shadow-sm line-clamp-1">
                {item.titulo}
              </h3>
              <p className="text-[11px] sm:text-xs text-white/95 font-medium leading-snug mt-0.5 drop-shadow-xs line-clamp-2">
                {item.subtitulo}
              </p>
            </div>

            {/* Rodapé do Banner: Chamada para ação com seta */}
            <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] font-bold text-white/95 relative z-10 pt-1.5 border-t border-white/20">
              <span className="opacity-90">Aproveite agora</span>
              <div className="flex items-center gap-1 bg-white/20 hover:bg-white/30 backdrop-blur-xs px-2.5 py-0.5 rounded-md transition-colors">
                <span>Usar benefício</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Paginação em Pontos (Dots) Flutuando Dentro/Sobre o Banner (Zero Espaço Residual Abaixo) */}
      {banners.length > 1 && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1.5 z-20 pointer-events-none bg-black/30 backdrop-blur-xs px-2 py-0.5 rounded-full">
          {banners.map((_, index) => (
            <span
              key={index}
              className={`block rounded-full transition-all duration-300 ${
                activeSlide === index
                  ? "w-3.5 h-1 bg-primary-600 shadow-xs"
                  : "w-1 h-1 bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
});
