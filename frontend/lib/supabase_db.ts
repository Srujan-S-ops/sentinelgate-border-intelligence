// lib/supabase_db.ts
import { supabase } from "./supabase"

// Local Storage Fallback Data Store (for offline or unconfigured Supabase database)
const FALLBACK_KEY = "sentinelgate_supabase_fallback"

function getFallbackStore(): Record<string, any[]> {
    if (typeof window === "undefined") return {}
    const store = localStorage.getItem(FALLBACK_KEY)
    if (!store) {
        // Initialize default mock database tables for all 15 tables
        const defaultStore: Record<string, any[]> = {
            users: [
                { id: "admin-uid-12345", email: "admin@sentinelgate.gov", password: "AdminSecurityTopRisk04822", role: "admin", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            ],
            passengers: [],
            passport_verifications: [],
            face_enrollments: [],
            face_verifications: [],
            flights: [
                { id: "f1", pnr: "PNR10293", flight_number: "SG-302", departure_airport: "DEL", arrival_airport: "JFK", travel_date: new Date().toISOString().split('T')[0], boarding_time: "19:30", gate: "Gate B12", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                { id: "f2", pnr: "PNR29482", flight_number: "AI-101", departure_airport: "BOM", arrival_airport: "LHR", travel_date: new Date().toISOString().split('T')[0], boarding_time: "20:15", gate: "Gate C04", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                { id: "f3", pnr: "PNR84029", flight_number: "EK-503", departure_airport: "DXB", arrival_airport: "DEL", travel_date: new Date().toISOString().split('T')[0], boarding_time: "08:45", gate: "Gate A02", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                { id: "f4", pnr: "PNR74028", flight_number: "LH-760", departure_airport: "FRA", arrival_airport: "BLR", travel_date: new Date().toISOString().split('T')[0], boarding_time: "22:00", gate: "Gate B20", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            ],
            boarding_passes: [],
            airport_entries: [],
            security_checks: [],
            boarding_events: [],
            travel_history: [],
            audit_logs: [],
            notifications: [],
            system_settings: [
                { id: "s1", setting_key: "OFFLINE_MODE", setting_value: "false", description: "Enable local storage database mode", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                { id: "s2", setting_key: "BIOMETRIC_ACCURACY_THRESHOLD", setting_value: "90.0", description: "Required face match percentage", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                { id: "s3", setting_key: "SECURITY_SYSTEM_STATUS", setting_value: "ACTIVE", description: "Health code status of border check points", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            ],
            analytics: [
                { id: "a1", metric_name: "passenger_registrations", metric_value: 15, category: "registrations", recorded_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], created_at: new Date().toISOString() },
                { id: "a2", metric_name: "passenger_registrations", metric_value: 22, category: "registrations", recorded_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], created_at: new Date().toISOString() },
                { id: "a3", metric_name: "passenger_registrations", metric_value: 38, category: "registrations", recorded_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], created_at: new Date().toISOString() },
                { id: "a4", metric_name: "passenger_registrations", metric_value: 45, category: "registrations", recorded_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], created_at: new Date().toISOString() },
                { id: "a5", metric_name: "passenger_registrations", metric_value: 62, category: "registrations", recorded_date: new Date().toISOString().split('T')[0], created_at: new Date().toISOString() },
                
                { id: "a6", metric_name: "verification_success_rate", metric_value: 92, category: "success_rate", recorded_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], created_at: new Date().toISOString() },
                { id: "a7", metric_name: "verification_success_rate", metric_value: 94, category: "success_rate", recorded_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], created_at: new Date().toISOString() },
                { id: "a8", metric_name: "verification_success_rate", metric_value: 93, category: "success_rate", recorded_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], created_at: new Date().toISOString() },
                { id: "a9", metric_name: "verification_success_rate", metric_value: 96, category: "success_rate", recorded_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], created_at: new Date().toISOString() },
                { id: "a10", metric_name: "verification_success_rate", metric_value: 98, category: "success_rate", recorded_date: new Date().toISOString().split('T')[0], created_at: new Date().toISOString() }
            ]
        }
        localStorage.setItem(FALLBACK_KEY, JSON.stringify(defaultStore))
        return defaultStore
    }
    return JSON.parse(store)
}

function saveFallbackStore(store: Record<string, any[]>) {
    if (typeof window === "undefined") return
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(store))
}

function isMissingTableError(error: any): boolean {
    if (!error) return false
    const msg = error.message || ""
    return msg.includes("relation") || msg.includes("does not exist") || msg.includes("404") || msg.includes("PGRST116")
}

// -------------------------------------------------------------
// CORE DATABASE CRUD OPERATIONS FOR EXPLORER & PLAYGROUND
// -------------------------------------------------------------

export async function dbGetRows(tableName: string): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select("*")
            .order("created_at", { ascending: true, nullsFirst: false } as any)
        
        if (error) {
            if (isMissingTableError(error)) {
                console.warn(`Supabase table "${tableName}" is missing. Falling back to local state.`);
                return getFallbackStore()[tableName] || []
            }
            throw error
        }
        return data || []
    } catch (err) {
        console.error(`Error fetching rows from Supabase table "${tableName}":`, err)
        return getFallbackStore()[tableName] || []
    }
}

export async function dbInsertRow(tableName: string, rowData: any): Promise<any> {
    const formattedData = {
        ...rowData,
        created_at: rowData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
    try {
        const { data, error } = await supabase
            .from(tableName)
            .insert(formattedData)
            .select()
        
        if (error) {
            if (isMissingTableError(error)) {
                console.warn(`Supabase table "${tableName}" is missing. Saving to local storage fallback.`);
                const store = getFallbackStore()
                if (!store[tableName]) store[tableName] = []
                
                const newRow = { id: rowData.id || crypto.randomUUID(), ...formattedData }
                store[tableName].push(newRow)
                saveFallbackStore(store)
                return newRow
            }
            throw error
        }
        return data ? data[0] : formattedData
    } catch (err) {
        console.error(`Error inserting row into Supabase table "${tableName}":`, err)
        const store = getFallbackStore()
        if (!store[tableName]) store[tableName] = []
        const newRow = { id: rowData.id || crypto.randomUUID(), ...formattedData }
        store[tableName].push(newRow)
        saveFallbackStore(store)
        return newRow
    }
}

export async function dbUpdateRow(tableName: string, matchKey: string, matchVal: any, rowData: any): Promise<any> {
    const formattedData = {
        ...rowData,
        updated_at: new Date().toISOString()
    }
    try {
        const { data, error } = await supabase
            .from(tableName)
            .update(formattedData)
            .eq(matchKey, matchVal)
            .select()
        
        if (error) {
            if (isMissingTableError(error)) {
                console.warn(`Supabase table "${tableName}" is missing. Updating in local storage fallback.`);
                const store = getFallbackStore()
                const rows = store[tableName] || []
                const index = rows.findIndex(r => r[matchKey] === matchVal)
                if (index !== -1) {
                    rows[index] = { ...rows[index], ...formattedData }
                    saveFallbackStore(store)
                    return rows[index]
                }
                return formattedData
            }
            throw error
        }
        return data ? data[0] : formattedData
    } catch (err) {
        console.error(`Error updating row in Supabase table "${tableName}":`, err)
        const store = getFallbackStore()
        const rows = store[tableName] || []
        const index = rows.findIndex(r => r[matchKey] === matchVal)
        if (index !== -1) {
            rows[index] = { ...rows[index], ...formattedData }
            saveFallbackStore(store)
            return rows[index]
        }
        return formattedData
    }
}

export async function dbDeleteRow(tableName: string, matchKey: string, matchVal: any): Promise<boolean> {
    try {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq(matchKey, matchVal)
        
        if (error) {
            if (isMissingTableError(error)) {
                console.warn(`Supabase table "${tableName}" is missing. Deleting in local storage fallback.`);
                const store = getFallbackStore()
                const rows = store[tableName] || []
                const filtered = rows.filter(r => r[matchKey] !== matchVal)
                store[tableName] = filtered
                saveFallbackStore(store)
                return true
            }
            throw error
        }
        return true
    } catch (err) {
        console.error(`Error deleting row from Supabase table "${tableName}":`, err)
        const store = getFallbackStore()
        const rows = store[tableName] || []
        const filtered = rows.filter(r => r[matchKey] !== matchVal)
        store[tableName] = filtered
        saveFallbackStore(store)
        return true
    }
}

// -------------------------------------------------------------
// DOMAIN-SPECIFIC DB ACTIONS
// -------------------------------------------------------------

// Sync user account profile
export async function syncUserAccount(uid: string, email: string, role: string = "passenger") {
    // 1. Create or update user
    await dbInsertRow("users", { id: uid, email, role })
    
    // 2. Create passenger linked to user
    const passengers = await dbGetRows("passengers")
    let passenger = passengers.find(p => p.user_id === uid)
    if (!passenger) {
        passenger = await dbInsertRow("passengers", {
            user_id: uid,
            name: email.split("@")[0].toUpperCase(),
            phone: "",
            dob: null,
            nationality: "Indian"
        })
    }
    return passenger
}

// Get user profile details (passenger + passport + face_enrollment + boarding_pass + checks)
export async function getPassengerProfileComplete(uid: string) {
    const passengers = await dbGetRows("passengers")
    const passenger = passengers.find(p => p.user_id === uid)
    if (!passenger) return null

    const passports = await dbGetRows("passport_verifications")
    const passport = passports.find(p => p.passenger_id === passenger.id)

    const enrollments = await dbGetRows("face_enrollments")
    const faceEnrollment = enrollments.find(e => e.passenger_id === passenger.id)

    const passes = await dbGetRows("boarding_passes")
    const boardingPass = passes.find(p => p.passenger_id === passenger.id)

    let flight = null
    if (boardingPass) {
        const flights = await dbGetRows("flights")
        flight = flights.find(f => f.id === boardingPass.flight_id)
    }

    const verifications = await dbGetRows("face_verifications")
    const faceVerification = verifications.filter(v => v.passenger_id === passenger.id).pop()

    const entries = await dbGetRows("airport_entries")
    const airportEntry = entries.find(e => e.passenger_id === passenger.id)

    const checks = await dbGetRows("security_checks")
    const securityCheck = checks.find(c => c.passenger_id === passenger.id)

    const bEvents = await dbGetRows("boarding_events")
    const boardingEvent = bEvents.find(e => e.passenger_id === passenger.id)

    const travelHistory = await dbGetRows("travel_history")
    const history = travelHistory.filter(h => h.passenger_id === passenger.id)

    return {
        passenger,
        passport,
        faceEnrollment,
        boardingPass,
        flight,
        faceVerification,
        airportEntry,
        securityCheck,
        boardingEvent,
        travelHistory: history
    }
}

// Save Passport details (Step 1)
export async function enrollPassport(passengerId: string, details: { passportNumber: string, country: string, ocrStatus: string }) {
    const passports = await dbGetRows("passport_verifications")
    const existing = passports.find(p => p.passenger_id === passengerId)
    
    const passportData = {
        passport_number: details.passportNumber.toUpperCase().trim(),
        passenger_id: passengerId,
        issuing_country: details.country,
        expiry_date: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 years expiry
        ocr_status: details.ocrStatus,
        verification_status: details.ocrStatus === "VERIFIED" ? "VERIFIED" : "PENDING",
        raw_ocr_json: JSON.stringify({ document: "PASSPORT", number: details.passportNumber, country: details.country, scanned: new Date().toISOString() })
    }

    if (existing) {
        return await dbUpdateRow("passport_verifications", "passenger_id", passengerId, passportData)
    } else {
        return await dbInsertRow("passport_verifications", passportData)
    }
}

// Save Face Biometrics (Step 2)
export async function enrollFaceBiometrics(passengerId: string, selfieUrl: string, score: number) {
    const enrollments = await dbGetRows("face_enrollments")
    const existing = enrollments.find(e => e.passenger_id === passengerId)

    const enrollData = {
        passenger_id: passengerId,
        selfie_url: selfieUrl,
        quality_score: score,
        face_descriptor: "[-0.0824,0.1284,-0.0482,0.0249,0.0104]" // Mock vector
    }

    if (existing) {
        return await dbUpdateRow("face_enrollments", "passenger_id", passengerId, enrollData)
    } else {
        return await dbInsertRow("face_enrollments", enrollData)
    }
}

// Link Flight Journey & Generate Boarding Pass (Step 3)
export async function linkFlightJourney(passengerId: string, flightInput: {
    pnr: string,
    flightNo: string,
    depAirport: string,
    arrAirport: string,
    travelDate: string,
    boardingTime: string,
    gate: string
}) {
    const flights = await dbGetRows("flights")
    let flight = flights.find(f => f.pnr.toUpperCase() === flightInput.pnr.toUpperCase())
    
    const flightData = {
        pnr: flightInput.pnr.toUpperCase().trim(),
        flight_number: flightInput.flightNo.toUpperCase().trim(),
        departure_airport: flightInput.depAirport.toUpperCase().trim(),
        arrival_airport: flightInput.arrAirport.toUpperCase().trim(),
        travel_date: flightInput.travelDate,
        boarding_time: flightInput.boardingTime,
        gate: flightInput.gate
    }

    if (!flight) {
        flight = await dbInsertRow("flights", flightData)
    } else {
        flight = await dbUpdateRow("flights", "id", flight.id, flightData)
    }

    // Link to passenger via boarding pass
    const passes = await dbGetRows("boarding_passes")
    const existingPass = passes.find(p => p.passenger_id === passengerId)

    const passData = {
        passenger_id: passengerId,
        flight_id: flight.id,
        seat_number: "Seat " + (Math.floor(Math.random() * 30) + 1) + String.fromCharCode(65 + Math.floor(Math.random() * 6)),
        class: "Economy"
    }

    if (existingPass) {
        await dbUpdateRow("boarding_passes", "id", existingPass.id, passData)
    } else {
        await dbInsertRow("boarding_passes", passData)
    }

    return { flight, passData }
}

// Record security/risk check (Step 4 Check)
export async function logSecurityCheck(passengerId: string, riskScore: number, notes: string) {
    let riskLevel = "SAFE"
    if (riskScore >= 70) riskLevel = "HIGH RISK"
    else if (riskScore >= 40) riskLevel = "SECONDARY CHECK"

    const checks = await dbGetRows("security_checks")
    const existing = checks.find(c => c.passenger_id === passengerId)

    const checkData = {
        passenger_id: passengerId,
        risk_score: riskScore,
        risk_level: riskLevel,
        notes: notes,
        checked_at: new Date().toISOString()
    }

    if (existing) {
        return await dbUpdateRow("security_checks", "passenger_id", passengerId, checkData)
    } else {
        return await dbInsertRow("security_checks", checkData)
    }
}

// Log Boarding Gate Complete Event (Step 5)
export async function logBoardingGateEvent(passengerId: string, boardingPassId: string, status: string = "BOARDED") {
    const boardingEventData = {
        passenger_id: passengerId,
        boarding_pass_id: boardingPassId,
        status,
        gate_agent: "AUTO_EGATE_SIMULATOR"
    }
    return await dbInsertRow("boarding_events", boardingEventData)
}

// Log specific journey event
export async function logTravelHistory(passengerId: string, action: string, location: string = "MAIN TERMINAL") {
    return await dbInsertRow("travel_history", {
        passenger_id: passengerId,
        action_taken: action,
        location,
        timestamp: new Date().toISOString()
    })
}

// Log general system notification
export async function logSystemNotification(userId: string, title: string, message: string) {
    return await dbInsertRow("notifications", {
        user_id: userId,
        title,
        message,
        is_read: false
    })
}

// Clear all database tables (reset option)
export async function dbPurgeAll() {
    const tables = [
        "analytics",
        "notifications",
        "system_settings",
        "audit_logs",
        "travel_history",
        "boarding_events",
        "security_checks",
        "airport_entries",
        "face_verifications",
        "boarding_passes",
        "face_enrollments",
        "passport_verifications",
        "passengers",
        "users"
    ]
    
    for (const table of tables) {
        try {
            await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000" as any)
        } catch (e) {
            console.error(`Supabase purge failed for table "${table}":`, e)
        }
    }

    // Reset local state
    if (typeof window !== "undefined") {
        localStorage.removeItem(FALLBACK_KEY)
        getFallbackStore() // Re-initializes default mock values
    }
}
