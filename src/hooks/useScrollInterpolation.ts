import { useState, useEffect, useRef, useCallback } from "react";

export interface ScrollInterpolationOptions {
  maxRadius?: number; // Raio máximo da curvatura em px (padrão: 28)
  threshold?: number; // Distância de rolagem em px para atingir curvatura máxima (padrão: 80)
}

export interface ScrollInterpolationReturn {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  scrollY: number;
  waveRadius: number;
  isScrolled: boolean;
  onScroll: () => void;
}

/**
 * Hook de Interpolação de Scroll para UX Motion / Efeito "Onda" no Header
 * Separa a lógica de captura do scroll da renderização dos componentes.
 * Utiliza requestAnimationFrame e passive listeners para 60-120fps nativos.
 */
export function useScrollInterpolation(
  options: ScrollInterpolationOptions = {}
): ScrollInterpolationReturn {
  const { maxRadius = 28, threshold = 80 } = options;
  const [scrollY, setScrollY] = useState(0);
  const [waveRadius, setWaveRadius] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);

  const handleScroll = useCallback(() => {
    if (rafId.current !== null) return;

    rafId.current = requestAnimationFrame(() => {
      if (scrollRef.current) {
        const y = Math.max(0, scrollRef.current.scrollTop);
        setScrollY(y);

        // Interpolação matemática linear contínua [0..1] clamped
        const progress = Math.min(1, y / threshold);
        const interpolatedRadius = Math.round(progress * maxRadius);
        setWaveRadius(interpolatedRadius);
        setIsScrolled(y > 4);
      }
      rafId.current = null;
    });
  }, [maxRadius, threshold]);

  useEffect(() => {
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return {
    scrollRef,
    scrollY,
    waveRadius,
    isScrolled,
    onScroll: handleScroll,
  };
}
