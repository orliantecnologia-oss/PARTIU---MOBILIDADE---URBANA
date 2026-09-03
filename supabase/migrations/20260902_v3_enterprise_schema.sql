-- ==============================================================================
-- 🏛️ UNIVANS TRANSPORT OPERATING SYSTEM (TOS) — SCHEMA DEFINITIVO V3.2
-- Architecture Lock • PostGIS • Double-Entry Journal • Trip Manifest • RBAC
-- ==============================================================================

-- 1. Extensões Essenciais
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- [CAMADA A] CORE DOMAIN TABLES
-- ==============================================================================

-- 1. Organizações / Cooperativas Multi-Tenant
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    trade_name VARCHAR(150) NOT NULL,
    legal_name VARCHAR(200) NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
    config JSONB DEFAULT '{"split_pix_auto": true, "coop_fee_percent": 8.5}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Usuários da Organização (RBAC)
CREATE TABLE IF NOT EXISTS organization_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    role VARCHAR(30) DEFAULT 'passenger' CHECK (role IN ('passenger', 'driver', 'dispatcher', 'financial', 'superadmin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_org_user UNIQUE (organization_id, user_id)
);

-- 3. Frota de Veículos
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    plate VARCHAR(10) NOT NULL,
    renavam VARCHAR(20),
    brand VARCHAR(50) NOT NULL DEFAULT 'Mercedes-Benz',
    model VARCHAR(100) NOT NULL DEFAULT 'Sprinter 516 CDI Executive VIP',
    year_manufacture INT DEFAULT 2024,
    seat_capacity INT NOT NULL DEFAULT 16,
    odometer_current_km INT DEFAULT 0,
    status VARCHAR(25) DEFAULT 'available' CHECK (status IN ('available', 'in_trip', 'maintenance', 'sos_emergency', 'inactive')),
    last_known_location GEOMETRY(Point, 4326),
    last_speed_kmh INT DEFAULT 0,
    last_telemetry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_org_vehicle_plate UNIQUE (organization_id, plate)
);

-- 4. Credenciais de Wi-Fi Criptografadas
CREATE TABLE IF NOT EXISTS vehicle_wifi_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL UNIQUE REFERENCES vehicles(id) ON DELETE CASCADE,
    ssid VARCHAR(60) NOT NULL,
    encrypted_password TEXT NOT NULL,
    encryption_key_id VARCHAR(50) NOT NULL DEFAULT 'v1-kms',
    is_active BOOLEAN DEFAULT TRUE,
    rotated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Dispositivos IoT & Gestão de Ciclo de Vida
CREATE TABLE IF NOT EXISTS vehicle_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    device_type VARCHAR(30) NOT NULL DEFAULT 'teltonika_fmc130',
    imei VARCHAR(40) UNIQUE NOT NULL,
    sim_card_phone VARCHAR(25),
    firmware_version VARCHAR(30) DEFAULT 'v2.1.4',
    status VARCHAR(25) DEFAULT 'ACTIVE' CHECK (status IN ('PROVISIONING', 'ACTIVE', 'OFFLINE', 'SUSPENDED', 'REVOKED', 'RETIRED')),
    public_key TEXT,
    public_key_version VARCHAR(30) DEFAULT 'v1-ed25519',
    last_heartbeat TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Ingestão de Telemetria Espacial
CREATE TABLE IF NOT EXISTS telemetry_events (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    device_id UUID REFERENCES vehicle_devices(id),
    location GEOMETRY(Point, 4326) NOT NULL,
    speed_kmh INT NOT NULL DEFAULT 0,
    heading_degrees INT DEFAULT 0,
    altitude_meters INT DEFAULT 0,
    gps_accuracy_meters DECIMAL(4,2) DEFAULT 2.5,
    ignition_status BOOLEAN DEFAULT TRUE,
    battery_volts DECIMAL(4,2) DEFAULT 13.8,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_location_gist ON telemetry_events USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_telemetry_vehicle_time ON telemetry_events (vehicle_id, captured_at DESC);

-- 7. Linhas e Itinerários PostGIS
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(150) NOT NULL,
    origin_city VARCHAR(100) NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    route_path GEOMETRY(LineString, 4326),
    distance_meters INT NOT NULL DEFAULT 165000,
    estimated_duration_min INT NOT NULL DEFAULT 135,
    standard_price DECIMAL(10,2) NOT NULL DEFAULT 35.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routes_path_gist ON routes USING GIST (route_path);

-- 8. Pontos de Embarque e Geofences
CREATE TABLE IF NOT EXISTS route_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    sequence_order INT NOT NULL,
    name VARCHAR(120) NOT NULL,
    city VARCHAR(100) NOT NULL,
    reference_point TEXT,
    location GEOMETRY(Point, 4326) NOT NULL,
    geofence_radius_meters INT NOT NULL DEFAULT 120,
    offset_minutes_after_departure INT NOT NULL DEFAULT 0,
    is_mandatory_stop BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_stops_location_gist ON route_stops USING GIST (location);

-- 9. Viagens Operacionais
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    route_id UUID NOT NULL REFERENCES routes(id),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    driver_user_id UUID NOT NULL,
    scheduled_departure TIMESTAMPTZ NOT NULL,
    actual_departure TIMESTAMPTZ,
    actual_arrival TIMESTAMPTZ,
    status VARCHAR(30) DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'BOARDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'SUSPENDED', 'EMERGENCY')),
    seats_total INT NOT NULL DEFAULT 16,
    seats_booked INT NOT NULL DEFAULT 0,
    delay_minutes INT DEFAULT 0,
    checklist_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Bilhetes Criptográficos (Ed25519)
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    trip_id UUID NOT NULL REFERENCES trips(id),
    passenger_user_id UUID NOT NULL,
    boarding_stop_id UUID NOT NULL REFERENCES route_stops(id),
    ticket_code VARCHAR(30) UNIQUE NOT NULL,
    qr_cryptographic_payload TEXT NOT NULL,
    qr_nonce VARCHAR(40) NOT NULL,
    price_paid DECIMAL(10,2) NOT NULL,
    status VARCHAR(25) DEFAULT 'ISSUED' CHECK (status IN ('CREATED', 'PAID', 'ISSUED', 'VALIDATED', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'REFUNDED', 'REJECTED')),
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    validated_at TIMESTAMPTZ,
    validated_by_device_id UUID
);

-- 11. Manifesto de Passageiros da Viagem (trip_passengers)
CREATE TABLE IF NOT EXISTS trip_passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    ticket_id UUID NOT NULL REFERENCES tickets(id),
    passenger_user_id UUID NOT NULL,
    boarding_stop_id UUID NOT NULL REFERENCES route_stops(id),
    destination_stop_id UUID REFERENCES route_stops(id),
    boarding_status VARCHAR(25) DEFAULT 'EXPECTED' CHECK (boarding_status IN ('EXPECTED', 'WAITING', 'BOARDED', 'NO_SHOW', 'CANCELLED', 'REJECTED')),
    seat_reference VARCHAR(10),
    expected_at TIMESTAMPTZ,
    boarded_at TIMESTAMPTZ,
    validated_at TIMESTAMPTZ,
    validation_device_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_passengers_trip ON trip_passengers (trip_id, boarding_status);

-- 12. Motor Financeiro & Transações PIX
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    ticket_id UUID NOT NULL REFERENCES tickets(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'pix' CHECK (payment_method IN ('pix', 'credit_card', 'cash')),
    gateway_provider VARCHAR(30) NOT NULL DEFAULT 'mercadopago',
    gateway_transaction_id VARCHAR(100) UNIQUE,
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    pix_qr_code_emv TEXT,
    pix_qr_code_image_url TEXT,
    status VARCHAR(25) DEFAULT 'PENDING' CHECK (status IN ('CREATED', 'PENDING', 'PAID', 'EXPIRED', 'FAILED', 'CANCELLED', 'REFUNDED')),
    expires_at TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    webhook_raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- [CAMADA B] FINOPS DOUBLE-ENTRY JOURNAL & SUPPORT TABLES
-- ==============================================================================

-- 13. Plano de Contas (Chart of Accounts)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_code VARCHAR(30) UNIQUE NOT NULL,
    account_name VARCHAR(150) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    nature VARCHAR(10) NOT NULL CHECK (nature IN ('DEBIT', 'CREDIT')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Journals Contábeis de Partidas Dobradas
CREATE TABLE IF NOT EXISTS financial_journals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    transaction_id UUID REFERENCES payments(id),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    total_debit DECIMAL(10,2) NOT NULL,
    total_credit DECIMAL(10,2) NOT NULL,
    is_balanced BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_journal_balance CHECK (total_debit = total_credit)
);

-- 15. Linhas de Lançamento do Journal (Journal Entries)
CREATE TABLE IF NOT EXISTS financial_journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id UUID NOT NULL REFERENCES financial_journals(id) ON DELETE CASCADE,
    account_code VARCHAR(30) NOT NULL,
    driver_user_id UUID,
    nature VARCHAR(10) NOT NULL CHECK (nature IN ('DEBIT', 'CREDIT')),
    amount DECIMAL(10,2) NOT NULL,
    memo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Fechamentos e Liquidações (Settlements)
CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    driver_user_id UUID NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_gross DECIMAL(10,2) NOT NULL,
    total_coop_fee DECIMAL(10,2) NOT NULL,
    total_psp_fee DECIMAL(10,2) NOT NULL,
    total_net_payable DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'SETTLED_PIX', 'REJECTED')),
    settled_at TIMESTAMPTZ,
    pix_end_to_end_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Histórico de Validações e Auditoria Anti-Replay
CREATE TABLE IF NOT EXISTS ticket_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id),
    trip_id UUID NOT NULL REFERENCES trips(id),
    vehicle_id VARCHAR(50) NOT NULL,
    device_id VARCHAR(50) NOT NULL,
    validation_sequence BIGINT NOT NULL,
    device_timestamp TIMESTAMPTZ NOT NULL,
    gps_location GEOMETRY(Point, 4326),
    validation_status VARCHAR(30) DEFAULT 'VALID' CHECK (validation_status IN ('VALID', 'DUPLICATE_REPLAY', 'CLOCK_ANOMALY', 'WRONG_TRIP', 'EXPIRED', 'CONFLICT_FLAGGED')),
    server_canonical_status VARCHAR(30) DEFAULT 'ACCEPTED' CHECK (server_canonical_status IN ('ACCEPTED', 'REJECTED_CONFLICT', 'AUDIT_FLAGGED')),
    validated_at TIMESTAMPTZ NOT NULL,
    server_receipt_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Fila de Sincronização de Dispositivos Offline
CREATE TABLE IF NOT EXISTS offline_sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(50) NOT NULL,
    batch_payload JSONB NOT NULL,
    processed_status VARCHAR(20) DEFAULT 'pending' CHECK (processed_status IN ('pending', 'processed', 'failed')),
    error_log TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Incidentes & Chamados SOS
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    trip_id UUID REFERENCES trips(id),
    incident_type VARCHAR(40) NOT NULL CHECK (incident_type IN ('mechanical_failure', 'medical_sos', 'flat_tire', 'accident', 'road_block')),
    severity VARCHAR(20) DEFAULT 'critical' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    location GEOMETRY(Point, 4326) NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'dispatching', 'resolved', 'closed')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 20. Trilha de Auditoria Imutável (LGPD / Segurança)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID,
    user_id UUID,
    action VARCHAR(80) NOT NULL,
    entity_name VARCHAR(80) NOT NULL,
    entity_id VARCHAR(80),
    ip_address VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. Notificações e Fila de Mensagens
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL,
    channel VARCHAR(20) DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'push', 'sms')),
    title VARCHAR(150) NOT NULL,
    message_body TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. Cercas Eletrônicas Espaciais (Geofences)
CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(120) NOT NULL,
    boundary GEOMETRY(Polygon, 4326) NOT NULL,
    event_trigger VARCHAR(30) DEFAULT 'on_enter_and_exit' CHECK (event_trigger IN ('on_enter', 'on_exit', 'on_enter_and_exit')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofences_boundary_gist ON geofences USING GIST (boundary);

-- ==============================================================================
-- RLS POLICIES
-- ==============================================================================
ALTER TABLE financial_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública controlada de trip_passengers" ON trip_passengers FOR SELECT USING (true);
CREATE POLICY "Leitura de journals contábeis permitida para auditoria" ON financial_journals FOR SELECT USING (true);
CREATE POLICY "Leitura de entries do journal" ON financial_journal_entries FOR SELECT USING (true);
