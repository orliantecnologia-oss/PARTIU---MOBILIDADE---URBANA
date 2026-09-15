-- ==============================================================================
-- PARTIU MOBILIDADE URBANA — PRODUCTION SECURITY HARDENING & RLS REMEDIATION
-- Data: 2026-09-15
-- Objetivo:
-- 1. Eliminar vazamento de dados em user_payment_methods (remover USING (true))
-- 2. Eliminar vazamento de dados e adulteração em driver_applications
-- 3. Blindar driver_locations contra manipulação e deleção por usuários anônimos
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BLINDAGEM DA TABELA: public.user_payment_methods
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.user_payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_payment_methods_select" ON public.user_payment_methods;
DROP POLICY IF EXISTS "user_payment_methods_all" ON public.user_payment_methods;
DROP POLICY IF EXISTS "user_payment_methods_owner_select" ON public.user_payment_methods;
DROP POLICY IF EXISTS "user_payment_methods_owner_insert" ON public.user_payment_methods;
DROP POLICY IF EXISTS "user_payment_methods_owner_update" ON public.user_payment_methods;
DROP POLICY IF EXISTS "user_payment_methods_owner_delete" ON public.user_payment_methods;

CREATE POLICY "user_payment_methods_owner_select" ON public.user_payment_methods
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = user_id::text)
    OR auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "user_payment_methods_owner_insert" ON public.user_payment_methods
  FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid()::text = user_id::text)
    OR auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "user_payment_methods_owner_update" ON public.user_payment_methods
  FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = user_id::text)
    OR auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "user_payment_methods_owner_delete" ON public.user_payment_methods
  FOR DELETE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = user_id::text)
    OR auth.jwt() ->> 'role' = 'service_role'
  );


-- ------------------------------------------------------------------------------
-- 2. BLINDAGEM DA TABELA: public.driver_applications
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.driver_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "driver_applications_select" ON public.driver_applications;
DROP POLICY IF EXISTS "driver_applications_all" ON public.driver_applications;
DROP POLICY IF EXISTS "driver_applications_owner_admin_select" ON public.driver_applications;
DROP POLICY IF EXISTS "driver_applications_candidate_insert" ON public.driver_applications;
DROP POLICY IF EXISTS "driver_applications_admin_update" ON public.driver_applications;

CREATE POLICY "driver_applications_owner_admin_select" ON public.driver_applications
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = user_id::text)
    OR auth.jwt() ->> 'role' = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role ILIKE '%admin%' OR profiles.role ILIKE '%gestor%')
    )
  );

CREATE POLICY "driver_applications_candidate_insert" ON public.driver_applications
  FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND (auth.uid()::text = user_id::text OR user_id IS NULL))
    OR auth.role() = 'anon'
    OR auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "driver_applications_admin_update" ON public.driver_applications
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role ILIKE '%admin%' OR profiles.role ILIKE '%gestor%')
    )
  );


-- ------------------------------------------------------------------------------
-- 3. BLINDAGEM DA TABELA: public.driver_locations
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.driver_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Telemetria: leitura para usuários autenticados" ON public.driver_locations;
DROP POLICY IF EXISTS "driver_locations_public_read" ON public.driver_locations;
DROP POLICY IF EXISTS "driver_locations_read" ON public.driver_locations;

CREATE POLICY "driver_locations_read"
  ON public.driver_locations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Telemetria: motorista atualiza sua própria posição" ON public.driver_locations;
DROP POLICY IF EXISTS "driver_locations_write" ON public.driver_locations;
DROP POLICY IF EXISTS "driver_locations_driver_write" ON public.driver_locations;
DROP POLICY IF EXISTS "driver_locations_driver_update" ON public.driver_locations;
DROP POLICY IF EXISTS "driver_locations_driver_delete" ON public.driver_locations;

CREATE POLICY "driver_locations_driver_write"
  ON public.driver_locations FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid()::text = driver_id)
    OR auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "driver_locations_driver_update"
  ON public.driver_locations FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = driver_id)
    OR auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "driver_locations_driver_delete"
  ON public.driver_locations FOR DELETE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = driver_id)
    OR auth.jwt() ->> 'role' = 'service_role'
  );
