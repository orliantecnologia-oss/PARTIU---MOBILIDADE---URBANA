import { Navigation } from "lucide-react";

export function MapPlaceholder({ etiqueta }: { etiqueta?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[oklch(0.94_0.02_165)]">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.9 0.02 165) 1px, transparent 1px), linear-gradient(90deg, oklch(0.9 0.02 165) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="absolute left-[-10%] top-1/3 h-24 w-[130%] -rotate-6 rounded-full bg-card/80 shadow-sm" />
      <div className="absolute left-[-10%] top-1/2 h-3 w-[130%] -rotate-6 rounded-full bg-primary/70" />
      <div className="absolute left-1/2 top-[46%] -translate-x-1/2 rounded-full bg-brand p-3 text-brand-foreground shadow-lg">
        <Navigation className="h-5 w-5" />
      </div>
      {etiqueta ? (
        <span className="absolute left-4 top-4 rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-lg">
          {etiqueta}
        </span>
      ) : null}
    </div>
  );
}
