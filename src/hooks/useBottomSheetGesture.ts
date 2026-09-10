import { useState, useRef, useCallback, useEffect } from 'react';
import { hapticFeedback } from '@/lib/haptics/haptic-feedback';

export type SnapPointKey = 'COLLAPSED' | 'HALF' | 'EXPANDED' | 'FULL';

export interface SnapPointConfig {
  key: SnapPointKey | string;
  /** Altura em porcentagem da viewport (ex: 0.35 para 35vh) ou em pixels (se > 1) */
  height: number;
}

export interface UseBottomSheetGestureOptions {
  /** Lista de snap points ordenados do menor para o maior */
  snapPoints: SnapPointConfig[];
  /** Snap point inicial ativo */
  initialSnapKey?: string;
  /** Permite fechar arrastando para baixo além do menor snap point */
  dismissible?: boolean;
  /** Callback ao mudar de snap point */
  onSnapChange?: (snapKey: string) => void;
  /** Callback ao dispensar a folha */
  onDismiss?: () => void;
}

export function useBottomSheetGesture({
  snapPoints,
  initialSnapKey,
  dismissible = false,
  onSnapChange,
  onDismiss,
}: UseBottomSheetGestureOptions) {
  // Ordena snap points por altura crescente
  const sortedSnapPoints = useRef<SnapPointConfig[]>([]);
  sortedSnapPoints.current = [...snapPoints].sort((a, b) => a.height - b.height);

  const [activeSnapKey, setActiveSnapKey] = useState<string>(
    initialSnapKey || sortedSnapPoints.current[0]?.key || 'HALF'
  );

  const [currentHeight, setCurrentHeight] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Refs de controle gestual
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);
  const lastYRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  const isInteractingRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);

  // Converte a configuração de snap point para pixels reais
  const resolveHeightPx = useCallback((cfg: SnapPointConfig): number => {
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    if (cfg.height <= 1) {
      return Math.round(vh * cfg.height);
    }
    return Math.round(cfg.height);
  }, []);

  // Inicializa altura
  useEffect(() => {
    const target = sortedSnapPoints.current.find((s) => s.key === activeSnapKey) || sortedSnapPoints.current[0];
    if (target) {
      setCurrentHeight(resolveHeightPx(target));
    }
  }, [activeSnapKey, resolveHeightPx]);

  // Atualiza altura em resize da janela
  useEffect(() => {
    const handleResize = () => {
      if (!isInteractingRef.current) {
        const target = sortedSnapPoints.current.find((s) => s.key === activeSnapKey);
        if (target) {
          setCurrentHeight(resolveHeightPx(target));
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeSnapKey, resolveHeightPx]);

  /**
   * Dispara transição elástica (spring) para o snap point alvo
   */
  const snapTo = useCallback(
    (snapKey: string, triggerHaptic = true) => {
      const target = sortedSnapPoints.current.find((s) => s.key === snapKey);
      if (!target) return;

      const targetPx = resolveHeightPx(target);
      if (triggerHaptic && activeSnapKey !== snapKey) {
        hapticFeedback.selection();
      }

      setActiveSnapKey(snapKey);
      setCurrentHeight(targetPx);
      onSnapChange?.(snapKey);
    },
    [activeSnapKey, onSnapChange, resolveHeightPx]
  );

  /**
   * Início do gesto de toque / pointer
   */
  const handleTouchStart = useCallback(
    (clientY: number) => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      isInteractingRef.current = true;
      setIsDragging(true);

      startYRef.current = clientY;
      lastYRef.current = clientY;
      lastTimeRef.current = performance.now();
      velocityRef.current = 0;
      startHeightRef.current = currentHeight;
    },
    [currentHeight]
  );

  /**
   * Movimento do gesto com inércia e rubber-banding
   */
  const handleTouchMove = useCallback(
    (clientY: number) => {
      if (!isInteractingRef.current) return;

      const now = performance.now();
      const dt = Math.max(now - lastTimeRef.current, 1);
      const dy = clientY - lastYRef.current;

      // Exponential Moving Average (EMA) para suavização de velocidade (px/ms)
      const instantVelocity = dy / dt;
      velocityRef.current = 0.7 * velocityRef.current + 0.3 * instantVelocity;

      lastYRef.current = clientY;
      lastTimeRef.current = now;

      // Delta total a partir do início
      const totalDeltaY = startYRef.current - clientY; // Positivo ao arrastar para cima
      let newHeight = startHeightRef.current + totalDeltaY;

      const minSnap = sortedSnapPoints.current[0];
      const maxSnap = sortedSnapPoints.current[sortedSnapPoints.current.length - 1];
      const minPx = minSnap ? resolveHeightPx(minSnap) : 100;
      const maxPx = maxSnap ? resolveHeightPx(maxSnap) : 600;

      // Rubber-banding: resistência elástica além dos limites
      if (newHeight > maxPx) {
        const excess = newHeight - maxPx;
        newHeight = maxPx + excess * 0.22;
      } else if (newHeight < minPx) {
        const excess = minPx - newHeight;
        if (!dismissible) {
          newHeight = minPx - excess * 0.22;
        } else {
          // Permite arrastar mais para baixo com resistência moderada para dispensar
          newHeight = minPx - excess * 0.55;
        }
      }

      setCurrentHeight(Math.max(0, Math.round(newHeight)));
    },
    [dismissible, resolveHeightPx]
  );

  /**
   * Final do gesto de toque: projeção de inércia e snap selection
   */
  const handleTouchEnd = useCallback(() => {
    if (!isInteractingRef.current) return;
    isInteractingRef.current = false;
    setIsDragging(false);

    const minSnap = sortedSnapPoints.current[0];
    const minPx = minSnap ? resolveHeightPx(minSnap) : 100;

    // Se estiver muito abaixo do limite inferior e for dismissible
    if (dismissible && currentHeight < minPx * 0.6) {
      hapticFeedback.light();
      onDismiss?.();
      return;
    }

    const velocity = velocityRef.current; // Negativo = subindo rápido, Positivo = descendo rápido

    // Se houve um flick (arremesso) com velocidade expressiva (|velocity| > 0.45 px/ms)
    if (Math.abs(velocity) > 0.45) {
      const isUp = velocity < 0;
      const currentIndex = sortedSnapPoints.current.findIndex((s) => s.key === activeSnapKey);

      if (isUp) {
        // Pula para o snap point superior mais próximo
        const nextIndex = Math.min(sortedSnapPoints.current.length - 1, currentIndex + 1);
        const target = sortedSnapPoints.current[nextIndex];
        if (target) snapTo(target.key);
      } else {
        // Pula para o snap point inferior mais próximo
        if (currentIndex === 0 && dismissible) {
          hapticFeedback.light();
          onDismiss?.();
          return;
        }
        const prevIndex = Math.max(0, currentIndex - 1);
        const target = sortedSnapPoints.current[prevIndex];
        if (target) snapTo(target.key);
      }
      return;
    }

    // Sem flick: busca o snap point mais próximo geometricamente
    let closestSnap = sortedSnapPoints.current[0];
    let minDistance = Infinity;

    for (const snap of sortedSnapPoints.current) {
      const snapPx = resolveHeightPx(snap);
      const dist = Math.abs(currentHeight - snapPx);
      if (dist < minDistance) {
        minDistance = dist;
        closestSnap = snap;
      }
    }

    if (closestSnap) {
      snapTo(closestSnap.key);
    }
  }, [activeSnapKey, currentHeight, dismissible, onDismiss, resolveHeightPx, snapTo]);

  return {
    activeSnapKey,
    currentHeight,
    isDragging,
    snapTo,
    handlers: {
      onTouchStart: (e: React.TouchEvent) => handleTouchStart(e.touches[0].clientY),
      onTouchMove: (e: React.TouchEvent) => handleTouchMove(e.touches[0].clientY),
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
      onMouseDown: (e: React.MouseEvent) => {
        handleTouchStart(e.clientY);
        const onMouseMove = (ev: MouseEvent) => handleTouchMove(ev.clientY);
        const onMouseUp = () => {
          handleTouchEnd();
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      },
    },
  };
}
