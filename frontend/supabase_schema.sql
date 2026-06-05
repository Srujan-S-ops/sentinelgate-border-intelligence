-- SentinelGate AI SmartYatra Database Schema (Supabase PostgreSQL)
-- Copy and paste this code into your Supabase SQL Editor to build/rebuild the tables.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables in reverse order of dependency to prevent constraint issues
DROP TABLE IF EXISTS analytics CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS travel_history CASCADE;
DROP TABLE IF EXISTS boarding_events CASCADE;
DROP TABLE IF EXISTS security_checks CASCADE;
DROP TABLE IF EXISTS airport_entries CASCADE;
DROP TABLE IF EXISTS face_verifications CASCADE;
DROP TABLE IF EXISTS boarding_passes CASCADE;
DROP TABLE IF EXISTS flights CASCADE;
DROP TABLE IF EXISTS face_enrollments CASCADE;
DROP TABLE IF EXISTS passport_verifications CASCADE;
DROP TABLE IF EXISTS passengers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. users Table (handles authentication & user profiles)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT 'Pass123',
    role TEXT NOT NULL DEFAULT 'passenger', -- passenger or admin
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. passengers Table (passenger legal details)
CREATE TABLE passengers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT,
    dob DATE,
    nationality TEXT NOT NULL DEFAULT 'Indian',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_passengers_user ON passengers(user_id);

-- 3. passport_verifications Table (OCR scanning validation details)
CREATE TABLE passport_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id UUID UNIQUE REFERENCES passengers(id) ON DELETE CASCADE,
    passport_number TEXT NOT NULL,
    issuing_country TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    ocr_status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED
    verification_status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, VERIFIED, REJECTED
    raw_ocr_json TEXT, -- Full extracted text from OCR scanner
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_passports_number ON passport_verifications(passport_number);

-- 4. face_enrollments Table (passenger biometric enrollment)
CREATE TABLE face_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id UUID UNIQUE REFERENCES passengers(id) ON DELETE CASCADE,
    selfie_url TEXT NOT NULL, -- Stored image payload reference
    face_descriptor TEXT, -- Comma-separated Float32Array string representation
    quality_score NUMERIC NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. face_verifications Table (liveness & facial verification attempts)
CREATE TABLE face_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id UUID REFERENCES passengers(id) ON DELETE CASCADE,
    match_confidence NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- APPROVED, REJECTED
    captured_selfie_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. flights Table (scheduled flights catalog)
CREATE TABLE flights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pnr TEXT UNIQUE NOT NULL,
    flight_number TEXT NOT NULL,
    departure_airport TEXT NOT NULL,
    arrival_airport TEXT NOT NULL,
    travel_date DATE NOT NULL,
    boarding_time TEXT NOT NULL,
    gate TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flights_pnr ON flights(pnr);
CREATE INDEX IF NOT EXISTS idx_flights_number ON flights(flight_number);

-- 7. boarding_passes Table (passenger boarding passes)
CREATE TABLE boarding_passes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id UUID REFERENCES passengers(id) ON DELETE CASCADE,
    flight_id UUID REFERENCES flights(id) ON DELETE CASCADE,
    seat_number TEXT NOT NULL,
    class TEXT NOT NULL DEFAULT 'Economy', -- Economy, Business, First
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_boarding_passenger_flight UNIQUE(passenger_id, flight_id)
);

-- 8. airport_entries Table (simulated gate entries)
CREATE TABLE airport_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id UUID REFERENCES passengers(id) ON DELETE CASCADE,
    boarding_pass_id UUID REFERENCES boarding_passes(id) ON DELETE CASCADE,
    verification_status TEXT NOT NULL, -- VERIFIED, DENIED
    entry_gate TEXT NOT NULL,
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. security_checks Table (risk scoring & screening events)
CREATE TABLE security_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id UUID REFERENCES passengers(id) ON DELETE CASCADE,
    risk_score NUMERIC NOT NULL DEFAULT 20,
    risk_level TEXT NOT NULL DEFAULT 'SAFE', -- SAFE, SECONDARY CHECK, HIGH RISK
    notes TEXT,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. boarding_events Table (passenger boarding verification events)
CREATE TABLE boarding_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id UUID REFERENCES passengers(id) ON DELETE CASCADE,
    boarding_pass_id UUID REFERENCES boarding_passes(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'BOARDED', -- BOARDED, REJECTED
    gate_agent TEXT NOT NULL DEFAULT 'AUTO_GATE_SIMULATOR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. travel_history Table (full journey sequence details)
CREATE TABLE travel_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id UUID REFERENCES passengers(id) ON DELETE CASCADE,
    action_taken TEXT NOT NULL, -- E.g. ACCOUNT_CREATED, PASSPORT_VERIFIED, EGATE_CLEARED
    location TEXT NOT NULL DEFAULT 'MAIN TERMINAL',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. audit_logs Table (general transaction operations audit trail)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    actor TEXT NOT NULL, -- E.g. passenger-uid, system-agent
    status TEXT NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, FAILED
    description TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. notifications Table (system user alerts and message queues)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. system_settings Table (application configurations)
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. analytics Table (stored daily stats summaries)
CREATE TABLE analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    category TEXT NOT NULL,
    recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- POPULATE FLIGHTS CATALOG FOR DEMONSTRATIONS
INSERT INTO flights (pnr, flight_number, departure_airport, arrival_airport, travel_date, boarding_time, gate)
VALUES 
('PNR10293', 'SG-302', 'DEL', 'JFK', CURRENT_DATE, '19:30', 'Gate B12'),
('PNR29482', 'AI-101', 'BOM', 'LHR', CURRENT_DATE, '20:15', 'Gate C04'),
('PNR84029', 'EK-503', 'DXB', 'DEL', CURRENT_DATE + INTERVAL '1 day', '08:45', 'Gate A02'),
('PNR74028', 'LH-760', 'FRA', 'BLR', CURRENT_DATE, '22:00', 'Gate B20')
ON CONFLICT (pnr) DO NOTHING;

-- POPULATE DEFAULT SYSTEM CONFIGS
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES
('OFFLINE_MODE', 'false', 'Enable simulated local storage fallback database mode'),
('BIOMETRIC_ACCURACY_THRESHOLD', '90.0', 'Minimum face matching percentage confidence required to unlock gates'),
('SECURITY_SYSTEM_STATUS', 'ACTIVE', 'Current health index status of border AI systems')
ON CONFLICT (setting_key) DO NOTHING;

-- POPULATE SEED ANALYTICS DATA FOR GRAPHS
INSERT INTO analytics (metric_name, metric_value, category, recorded_date)
VALUES
('passenger_registrations', 15, 'registrations', CURRENT_DATE - INTERVAL '4 days'),
('passenger_registrations', 22, 'registrations', CURRENT_DATE - INTERVAL '3 days'),
('passenger_registrations', 38, 'registrations', CURRENT_DATE - INTERVAL '2 days'),
('passenger_registrations', 45, 'registrations', CURRENT_DATE - INTERVAL '1 day'),
('passenger_registrations', 62, 'registrations', CURRENT_DATE),

('verification_success_rate', 92, 'success_rate', CURRENT_DATE - INTERVAL '4 days'),
('verification_success_rate', 94, 'success_rate', CURRENT_DATE - INTERVAL '3 days'),
('verification_success_rate', 93, 'success_rate', CURRENT_DATE - INTERVAL '2 days'),
('verification_success_rate', 96, 'success_rate', CURRENT_DATE - INTERVAL '1 day'),
('verification_success_rate', 98, 'success_rate', CURRENT_DATE)
ON CONFLICT DO NOTHING;
