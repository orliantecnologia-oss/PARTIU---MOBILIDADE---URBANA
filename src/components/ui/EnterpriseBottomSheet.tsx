import React, { forwardRef } from 'react';
import { useBottomSheetGesture, SnapPointConfig } from '@/hooks/useBottomSheetGesture';
import { cn } from '@/lib/utils';

export interface EnterpriseBottomSheetProps {
  snapPoints: SnapPointConfig[];
  initialSnapKey?: string;
  activeSnapKey?: string;
  dismissible?: boolean;
  onSnapChange?: (snapKey: string) => void;
  onDismiss?: () => void;
  className?: string;
  headerContent?: React.ReactNode;
  children: React.ReactNode;
  showDragHandle?: boolean;
  ariaLabel?: string;
}

export const EnterpriseBottomSheet = forwardRef<HTMLDivElement, EnterpriseBottomSheetProps>(
  (
    {
      snapPoints,
      initialSnapKey,
      dismissible = false,
      onSnapChange,
      onDismiss,
      className,
      headerContent,
      children,
      showDragHandle = true,
      ariaLabel = 'Painel de controle de viagem',
    },
    ref
  ) => {
    const { currentHeight, isDragging, handlers, activeSnapKey, snapTo } = useBottomSheetGesture({
      snapPoints,
      initialSnapKey,
      dismissible,
      onSnapChange,
      onDismiss,
    });

    return (
      <div
        ref={ref}
        role="region"
        aria-label={ariaLabel}
        data-snap={activeSnapKey}
        data-dragging={isDragging}
        style={{
          height: currentHeight > 0 ? `${currentHeight}px` : undefined,
          transition: isDragging
            ? 'none'
            : 'height 260ms cubic-bezier(0.32, 0.72, 0, 1), transform 260ms cubic-bezier(0.32, 0.72, 0, 1)',
          willChange: isDragging ? 'height' : 'auto',
        }}
        className={cn(
          'w-full bg-white rounded-t-3xl shadow-2xl border-t border-slate-100 flex flex-col pointer-events-auto select-none overflow-hidden pb-safe',
          className
        )}
      >
        {/* Barra de arraste (Drag Handle Zone) */}
        <div
          {...handlers}
          className="w-full flex flex-col items-center justify-center pt-2.5 pb-1.5 cursor-grab active:cursor-grabbing touch-none select-none"
          style={{ touchAction: 'none' }}
        >
          {showDragHandle && (
            <div
              className={cn(
                'w-10 h-1.5 rounded-full transition-colors duration-200',
                isDragging ? 'bg-emerald-500 w-12' : 'bg-slate-300'
              )}
            />
          )}
          {headerContent}
        </div>

        {/* Conteúdo rolável interno */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          {typeof children === 'function'
            ? (children as (props: { activeSnapKey: string; snapTo: (key: string) => void }) => React.ReactNode)({
                activeSnapKey,
                snapTo,
              })
            : children}
        </div>
      </div>
    );
  }
);

EnterpriseBottomSheet.displayName = 'EnterpriseBottomSheet';
