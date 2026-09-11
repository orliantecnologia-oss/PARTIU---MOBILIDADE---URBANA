/**
 * ==============================================================================
 * 🛡️ PARTIU DRIVER ACCESS GUARD (v4.0) — ZERO BYPASS OPERATIONAL SHIELD
 * ==============================================================================
 * Guardião de acesso do cockpit do motorista e entregador:
 *
 * Estados Permitidos:
 * - ACTIVE: Assinatura/diária válida e regular.
 * - TRIAL: Período de cortesia/degustação de novos parceiros.
 * - GRACE_PERIOD: Carência tolerada configurada pelo Admin.
 * -> Libera acesso imediato aos componentes filhos (Mapa, Radar, Viagens).
 *
 * Estados Bloqueados:
 * - EXPIRED: Diária ou ciclo expirado.
 * - SUSPENDED: Suspensão por inadimplência ou documentação.
 * - PAYMENT_PENDING: Nenhuma cobrança quitada.
 * - DEBT_BLOCKED: Teto de dívida excedido.
 * - CANCELLED: Assinatura revogada.
 * -> Intercepta a rota e exibe a DriverSubscriptionScreen sem possibilidade de bypass.
 * ==============================================================================
 */

import React from "react";
import { useSubscription, SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { DriverSubscriptionScreen } from "@/components/driver/DriverSubscriptionScreen";
import { ShieldCheck, Zap } from "lucide-react";
import { useBrandTheme } from "@/hooks/useBrandTheme";

interface DriverAccessGuardProps {
  driverId: string;
  children: React.ReactNode;
}

function GuardInternal({ children }: { children: React.ReactNode }) {
  const { isUnlocked, isLoading, accessDecision } = useSubscription();
  const { nomeApp, corPrimaria, corSecundaria, branding } = useBrandTheme();
  const accentColor = branding?.accent_color || corSecundaria || "#00C6FF";

  // 1. Tela de Splash / Validação de Sessão e Assinatura
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-4 text-white space-y-4">
        <div className="relative">
          <div
            style={{
              backgroundColor: `${corPrimaria}25`,
              borderColor: `${accentColor}40`,
              color: accentColor,
              boxShadow: `0 10px 30px -5px ${corPrimaria}50`,
            }}
            className="w-16 h-16 rounded-3xl border flex items-center justify-center font-black text-2xl"
          >
            <Zap className="w-8 h-8" style={{ fill: accentColor, color: accentColor }} />
          </div>
          <span
            style={{ backgroundColor: accentColor }}
            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full animate-ping"
          />
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-base font-black text-white">Validando Acesso Operacional</h3>
          <p className="text-xs text-slate-400 font-mono">{nomeApp} Driver Access Shield</p>
        </div>
      </div>
    );
  }

  // 2. Decisão de Acesso: Bloqueio Estrito se não elegível
  if (!isUnlocked) {
    return <DriverSubscriptionScreen />;
  }

  // 3. Elegível: Libera o Cockpit
  return <>{children}</>;
}

export function DriverAccessGuard({ driverId, children }: DriverAccessGuardProps) {
  return (
    <SubscriptionProvider driverId={driverId}>
      <GuardInternal>{children}</GuardInternal>
    </SubscriptionProvider>
  );
}
