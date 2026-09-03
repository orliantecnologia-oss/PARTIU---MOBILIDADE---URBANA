-- ==============================================================================
-- 🛡️ UNIVANS V6 — ZERO-TRUST SECURITY & RLS HARDENING (BYTEBYTEGO AUDIT)
-- ==============================================================================

-- 1. REVOGAR POLÍTICAS INSEGURAS DE LEITURA PÚBLICA (USING true)
DROP POLICY IF EXISTS Leitura pública controlada de trip_passengers ON public.trip_passengers;
DROP POLICY IF EXISTS Leitura de journals contábeis permitida para auditoria ON public.financial_journals;
DROP POLICY IF EXISTS Leitura de entries do journal ON public.financial_journal_entries;

-- 2. HABILITAR RLS NAS TABELAS CRÍTICAS DA V3 (SE EXISTIREM)
DO 
DECLARE
    tbl text;
    tabelas text[] := ARRAY[
        'organizations', 'organization_users', 'vehicles', 'vehicle_wifi_credentials',
        'vehicle_devices', 'telemetry_events', 'routes', 'route_stops', 'trips',
        'tickets', 'trip_passengers', 'payments', 'chart_of_accounts',
        'financial_journals', 'financial_journal_entries', 'settlements',
        'ticket_validations', 'offline_sync_queue', 'incidents', 'audit_logs',
        'notifications', 'geofences'
    ];
BEGIN
    FOREACH tbl IN ARRAY tabelas LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        END IF;
    END LOOP;
END ;

-- 3. CRIAR POLÍTICAS DE ACESSO CONTROLADO BASEADAS EM MENOR PRIVILÉGIO
DO 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial_journals') THEN
        DROP POLICY IF EXISTS Admins auditam financial_journals ON public.financial_journals;
        CREATE POLICY Admins auditam financial_journals ON public.financial_journals
          FOR ALL TO authenticated
          USING (public.is_admin(auth.uid()))
          WITH CHECK (public.is_admin(auth.uid()));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial_journal_entries') THEN
        DROP POLICY IF EXISTS Admins auditam financial_journal_entries ON public.financial_journal_entries;
        CREATE POLICY Admins auditam financial_journal_entries ON public.financial_journal_entries
          FOR ALL TO authenticated
          USING (public.is_admin(auth.uid()))
          WITH CHECK (public.is_admin(auth.uid()));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trip_passengers') THEN
        DROP POLICY IF EXISTS Acesso controlado a trip_passengers ON public.trip_passengers;
        CREATE POLICY Acesso controlado a trip_passengers ON public.trip_passengers
          FOR SELECT TO authenticated
          USING (
            passenger_id = auth.uid() OR
            public.is_admin(auth.uid()) OR
            EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_passengers.trip_id AND t.driver_id = auth.uid())
          );
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        DROP POLICY IF EXISTS Admins visualizam audit_logs ON public.audit_logs;
        CREATE POLICY Admins visualizam audit_logs ON public.audit_logs
          FOR SELECT TO authenticated
          USING (public.is_admin(auth.uid()));
    END IF;
END ;
