import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean;
}

function Skeleton({ className, shimmer = true, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md',
        shimmer ? 'animate-shimmer' : 'animate-pulse bg-slate-200 dark:bg-slate-800',
        className
      )}
      {...props}
    />
  );
}

/**
 * Skeleton para lista de resultados de busca de endereços
 */
export function AddressSearchSkeleton() {
  return (
    <div className="space-y-3 py-2" role="status" aria-label="Carregando endereços...">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton para cotação de categorias de veículos (Moto / Carro)
 */
export function CategoryQuoteSkeleton() {
  return (
    <div className="space-y-2.5 py-1" role="status" aria-label="Calculando tarifas...">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          </div>
          <div className="text-right space-y-1.5">
            <Skeleton className="h-5 w-20 rounded" />
            <Skeleton className="h-3 w-12 rounded ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton para o perfil do motorista a caminho
 */
export function DriverProfileSkeleton() {
  return (
    <div className="space-y-4 py-2" role="status" aria-label="Carregando dados do motorista...">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-14 h-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-3.5 w-24 rounded" />
          </div>
        </div>
        <div className="text-right space-y-2">
          <Skeleton className="h-6 w-20 rounded-lg" />
          <Skeleton className="h-3.5 w-14 rounded ml-auto" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-11 flex-1 rounded-xl" />
        <Skeleton className="h-11 flex-1 rounded-xl" />
      </div>
    </div>
  );
}

export { Skeleton };
