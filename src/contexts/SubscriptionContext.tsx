/**
 * ==============================================================================
 * 📦 PARTIU SUBSCRIPTION CONTEXT & REALTIME ACTIVATION ENGINE (v4.0)
 * ==============================================================================
 * Provedor de estado global de assinatura e liberação instantânea de motoristas:
 * - Sincronização em tempo real via Supabase Realtime Channel.
 * - Gerenciamento de ciclo (Diária, Semanal, Mensal).
 * - Disparo de celebração (Confetti, Haptic, Som) em < 2s sem recarregar a tela.
 * ==============================================================================
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  pixBillingService,
  DriverAccessDecision,
  MonetizationPlan,
  DriverBillingRecord,
  DEFAULT_MONETIZATION_PLANS,
} from "@/services/subscription/PixBillingService";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { driverSubscriptionService } from "@/lib/ecosystem/driver-subscription-service";

interface SubscriptionContextValue {
  driverId: string;
  accessDecision: DriverAccessDecision;
  plans: MonetizationPlan[];
  selectedPlan: MonetizationPlan | undefined;
  setSelectedPlan: (plan: MonetizationPlan | undefined) => void;
  cycleType: "DAILY" | "WEEKLY" | "MONTHLY";
  setCycleType: (cycle: "DAILY" | "WEEKLY" | "MONTHLY") => void;
  activeBilling: DriverBillingRecord | null;
  isLoading: boolean;
  isUnlocked: boolean;
  showCelebration: boolean;
  dismissCelebration: () => void;
  generateBilling: (planId?: string) => Promise<DriverBillingRecord | null>;
  refreshAccess: () => Promise<DriverAccessDecision>;
  activateDemo: () => Promise<void>;
}

const defaultDecision: DriverAccessDecision = {
  is_eligible: false,
  status: "PAYMENT_PENDING",
  reasons: ["Carregando situação da diária..."],
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({
  driverId,
  children,
}: {
  driverId: string;
  children: React.ReactNode;
}) {
  const [accessDecision, setAccessDecision] = useState<DriverAccessDecision>(defaultDecision);
  const [plans, setPlans] = useState<MonetizationPlan[]>(DEFAULT_MONETIZATION_PLANS);
  const [selectedPlan, setSelectedPlan] = useState<MonetizationPlan | undefined>(DEFAULT_MONETIZATION_PLANS[0]);
  const [cycleType, setCycleType] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
  const [activeBilling, setActiveBilling] = useState<DriverBillingRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  // 1. Carrega os planos e avalia acesso inicial
  const refreshAccess = useCallback(async () => {
    try {
      const [fetchedPlans, decision] = await Promise.all([
        pixBillingService.fetchMonetizationPlans(),
        pixBillingService.evaluateDriverAccess(driverId),
      ]);
      setPlans(fetchedPlans);
      if (fetchedPlans.length > 0 && !selectedPlan) {
        setSelectedPlan(fetchedPlans[0]!);
      }
      setAccessDecision(decision);
      return decision;
    } finally {
      setIsLoading(false);
    }
  }, [driverId, selectedPlan]);

  useEffect(() => {
    void refreshAccess();
  }, [refreshAccess]);

  // 2. Disparo de celebração e desbloqueio instantâneo
  const triggerInstantActivation = useCallback(() => {
    // Feedback tátil no mobile
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    setShowCelebration(true);
    setAccessDecision((prev) => ({
      ...prev,
      is_eligible: true,
      status: "ACTIVE",
      reasons: [],
    }));

    // Revalida em segundo plano
    void pixBillingService.evaluateDriverAccess(driverId).then((dec) => {
      setAccessDecision(dec);
    });
  }, [driverId]);

  // 3. Listener Realtime (Evento local e Supabase Realtime Channel)
  useEffect(() => {
    const handleActivated = (e: any) => {
      if (e.detail?.driverId === driverId) {
        triggerInstantActivation();
      }
    };

    window.addEventListener("partiu:driver_subscription_activated", handleActivated);

    let channel: any = null;
    if (isSupabaseConfigured()) {
      channel = supabase
        .channel(`driver-subscription-${driverId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "driver_subscriptions",
            filter: `driver_id=eq.${driverId}`,
          },
          (payload: any) => {
            if (payload.new && payload.new.status === "ACTIVE") {
              triggerInstantActivation();
            }
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener("partiu:driver_subscription_activated", handleActivated);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [driverId, triggerInstantActivation]);

  // 4. Geração de cobrança PIX
  const generateBilling = async (planId?: string): Promise<DriverBillingRecord | null> => {
    const targetPlanId = planId || selectedPlan?.id || plans[0]?.id || "plano-diaria-essencial";
    try {
      const billing = await pixBillingService.createDriverBilling(driverId, targetPlanId, cycleType);
      setActiveBilling(billing);
      return billing;
    } catch (err) {
      console.error("Falha ao gerar cobrança:", err);
      return null;
    }
  };

  // 5. Ativação expressa de demonstração local
  const activateDemo = useCallback(async () => {
    pixBillingService.activateDemoMode(driverId);
    try {
      await driverSubscriptionService.simulateDailyFeePayment(driverId, "CARRO");
      if (driverId !== "mot-001") {
        await driverSubscriptionService.simulateDailyFeePayment("mot-001", "CARRO");
      }
    } catch {}

    triggerInstantActivation();
    await refreshAccess();
  }, [driverId, triggerInstantActivation, refreshAccess]);

  const isUnlocked = accessDecision.is_eligible;

  return (
    <SubscriptionContext.Provider
      value={{
        driverId,
        accessDecision,
        plans,
        selectedPlan,
        setSelectedPlan,
        cycleType,
        setCycleType,
        activeBilling,
        isLoading,
        isUnlocked,
        showCelebration,
        dismissCelebration: () => setShowCelebration(false),
        generateBilling,
        refreshAccess,
        activateDemo,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription deve ser utilizado dentro de SubscriptionProvider");
  }
  return context;
}
