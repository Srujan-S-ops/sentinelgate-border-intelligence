-- SentinelGate AI SmartYatra Database Schema (Supabase PostgreSQL - 5 Tables)
-- Copy and paste this code into your Supabase SQL Editor to build/rebuild the tables.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables in reverse order of dependency to prevent constraint issues
DROP TABLE IF EXISTS boarding_passes CASCADE;
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

-- 2. passengers Table (passenger legal details & security clearance status)
CREATE TABLE passengers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT,
    dob DATE,
    nationality TEXT NOT NULL DEFAULT 'Indian',
    security_score NUMERIC NOT NULL DEFAULT 20,
    security_status TEXT NOT NULL DEFAULT 'SAFE', -- SAFE, SECONDARY CHECK, HIGH RISK
    security_notes TEXT DEFAULT 'No threat flags identified.',
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_passports_number ON passport_verifications(passport_number);

-- 4. face_enrollments Table (passenger biometric enrollment & liveness check status)
CREATE TABLE face_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id UUID UNIQUE REFERENCES passengers(id) ON DELETE CASCADE,
    selfie_url TEXT NOT NULL, -- Stored image payload reference
    face_descriptor TEXT, -- Comma-separated Float32Array string representation
    quality_score NUMERIC NOT NULL DEFAULT 0.0,
    liveness_status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, VERIFIED, FAILED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. boarding_passes Table (passenger boarding passes, flight journey, E-gate and Boarding status)
CREATE TABLE boarding_passes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id UUID UNIQUE REFERENCES passengers(id) ON DELETE CASCADE,
    pnr TEXT NOT NULL,
    flight_number TEXT NOT NULL,
    departure_airport TEXT NOT NULL,
    arrival_airport TEXT NOT NULL,
    travel_date DATE NOT NULL,
    boarding_time TEXT NOT NULL,
    gate TEXT NOT NULL,
    seat_number TEXT NOT NULL,
    class TEXT NOT NULL DEFAULT 'Economy', -- Economy, Business, First
    egate_status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, VERIFIED, DENIED
    boarding_status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, BOARDED, FAILED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_boarding_pnr ON boarding_passes(pnr);
CREATE INDEX IF NOT EXISTS idx_boarding_flight ON boarding_passes(flight_number);


-- POPULATE SEED PASSENGERS FOR OFFLINE/DEMO PURPOSES
-- Admin User
INSERT INTO users (id, email, password, role)
VALUES ('admin-uid-12345', 'admin@sentinelgate.gov', 'AdminSecurityTopRisk04822', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Traveler 1 (Sarah Connor)
INSERT INTO users (id, email, password, role)
VALUES ('user-sarah-123', 'sarah@smarttravel.in', 'Pass123', 'passenger')
ON CONFLICT (email) DO NOTHING;

INSERT INTO passengers (id, user_id, name, phone, dob, nationality, security_score, security_status, security_notes)
VALUES ('passenger-sarah-123', 'user-sarah-123', 'SARAH CONNOR', '+91 9876543210', '1990-05-15', 'Indian', 20, 'SAFE', 'Clear background checks.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO passport_verifications (id, passenger_id, passport_number, issuing_country, expiry_date, ocr_status, verification_status)
VALUES ('passport-sarah-123', 'passenger-sarah-123', 'J1234567', 'India', '2035-12-31', 'SUCCESS', 'VERIFIED')
ON CONFLICT (id) DO NOTHING;

INSERT INTO face_enrollments (id, passenger_id, selfie_url, quality_score, liveness_status)
VALUES ('face-sarah-123', 'passenger-sarah-123', '/mock_selfie.jpg', 0.98, 'VERIFIED')
ON CONFLICT (id) DO NOTHING;

INSERT INTO boarding_passes (id, passenger_id, pnr, flight_number, departure_airport, arrival_airport, travel_date, boarding_time, gate, seat_number, class, egate_status, boarding_status)
VALUES ('bp-sarah-123', 'passenger-sarah-123', 'PNR10293', 'SG-302', 'DEL', 'JFK', CURRENT_DATE, '19:30', 'Gate B12', 'Seat 12A', 'Economy', 'PENDING', 'PENDING')
ON CONFLICT (id) DO NOTHING;

-- Traveler 2 (Donald Trump)
INSERT INTO users (id, email, password, role)
VALUES ('user-trump-123', 'donald@trump.com', 'Pass123', 'passenger')
ON CONFLICT (email) DO NOTHING;

INSERT INTO passengers (id, user_id, name, phone, dob, nationality, security_score, security_status, security_notes)
VALUES ('passenger-trump-123', 'user-trump-123', 'DONALD TRUMP', '+1 555-0199', '1946-06-14', 'United States', 85, 'HIGH RISK', 'Flagged High-Risk VIP - Watchlist Interpol.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO passport_verifications (id, passenger_id, passport_number, issuing_country, expiry_date, ocr_status, verification_status)
VALUES ('passport-trump-123', 'passenger-trump-123', 'W0000001', 'United States', '2032-06-14', 'SUCCESS', 'VERIFIED')
ON CONFLICT (id) DO NOTHING;

INSERT INTO face_enrollments (id, passenger_id, selfie_url, quality_score, liveness_status)
VALUES ('face-trump-123', 'passenger-trump-123', '/trump_target.jpg', 0.99, 'VERIFIED')
ON CONFLICT (id) DO NOTHING;

INSERT INTO boarding_passes (id, passenger_id, pnr, flight_number, departure_airport, arrival_airport, travel_date, boarding_time, gate, seat_number, class, egate_status, boarding_status)
VALUES ('bp-trump-123', 'passenger-trump-123', 'PNR29482', 'AI-101', 'BOM', 'LHR', CURRENT_DATE, '20:15', 'Gate C04', 'Seat 01F', 'First', 'PENDING', 'PENDING')
ON CONFLICT (id) DO NOTHING;
