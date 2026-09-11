import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { components, shadows } from "@/lib/design-tokens";

export interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: "gradient" | "solid" | "outline";
  size?: "sm" | "md" | "lg" | "xl";
}

/**
 * PrimaryButton — Botão CTA Oficial "Azul Tech Premium"
 *
 * Padronizado para todos os fluxos críticos da aplicação:
 * - Confirmar Corrida / Solicitar Embarque
 * - Pedir Carro / Pedir Moto
 * - Fazer Pix / Recarregar Carteira
 * - Aceitar Corrida / Iniciar Viagem / Finalizar Corrida
 *
 * Estados:
 * - Normal: LinearGradient #0088FF -> #003366, texto branco, shadow elevation premium
 * - Pressed: Escala 0.98, leve redução de brilho
 * - Loading: Spinner estilizado com opacidade preservada
 * - Disabled: Opacidade 50%, sem eventos de clique, sem sombra
 */
export const PrimaryButton = React.forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  (
    {
      children,
      isLoading = false,
      leftIcon,
      rightIcon,
      variant = "gradient",
      size = "md",
      className,
      disabled,
      style,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    // Tamanhos padronizados
    const sizeClasses = {
      sm: "min-h-[40px] px-3.5 py-2 text-xs",
      md: "min-h-[48px] px-5 py-3 text-sm sm:text-base",
      lg: "min-h-[56px] px-6 py-3.5 text-base sm:text-lg",
      xl: "min-h-[64px] px-7 py-4 text-lg sm:text-xl",
    }[size];

    // Estilos de variante
    const variantStyles: React.CSSProperties =
      variant === "gradient"
        ? {
            background: isDisabled
              ? "linear-gradient(135deg, #64748b 0%, #334155 100%)"
              : components.button.gradient,
            color: "#FFFFFF",
            boxShadow: isDisabled
              ? "none"
              : "0 8px 24px -4px rgba(0, 51, 102, 0.35), 0 4px 12px -2px rgba(0, 136, 255, 0.25)",
          }
        : variant === "solid"
        ? {
            backgroundColor: "#0088FF",
            color: "#FFFFFF",
            boxShadow: isDisabled ? "none" : shadows.button,
          }
        : {
            backgroundColor: "transparent",
            border: "1.5px solid #0088FF",
            color: "#0088FF",
          };

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        style={{
          ...variantStyles,
          borderRadius: 16,
          fontWeight: 700,
          ...style,
        }}
        className={cn(
          "w-full inline-flex items-center justify-center gap-2.5 select-none transition-all duration-200 tracking-tight",
          "active:scale-[0.98] active:brightness-95 touch-manipulation cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088FF] focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
          sizeClasses,
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-white shrink-0" />
            <span className="opacity-95">{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            <span className="truncate">{children}</span>
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

PrimaryButton.displayName = "PrimaryButton";

export default PrimaryButton;
