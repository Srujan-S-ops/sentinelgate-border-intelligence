// lib/supabase_db.ts
import { supabase } from "./supabase"

// Local Storage Fallback Data Store (for offline or unconfigured Supabase database)
const FALLBACK_KEY = "sentinelgate_supabase_fallback"

function getFallbackStore(): Record<string, any[]> {
    if (typeof window === "undefined") return {}
    const store = localStorage.getItem(FALLBACK_KEY)
    let parsedStore: Record<string, any[]> = {}
    if (store) {
        try {
            parsedStore = JSON.parse(store)
        } catch (e) {
            parsedStore = {}
        }
    }

    if (!store || !parsedStore.passengers || parsedStore.passengers.length === 0) {
        const defaultStore: Record<string, any[]> = {
            users: [
                { id: "admin-uid-12345", email: "admin@sentinelgate.gov", password: "AdminSecurityTopRisk04822", role: "admin", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                { id: "user-sarah-123", email: "sarah@smarttravel.in", password: "Pass123", role: "passenger", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                { id: "user-trump-123", email: "donald@trump.com", password: "Pass123", role: "passenger", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            ],
            passengers: [
                { id: "passenger-sarah-123", user_id: "user-sarah-123", name: "SARAH CONNOR", phone: "+91 9876543210", dob: "1990-05-15", nationality: "Indian", security_score: 20, security_status: "SAFE", security_notes: "Clear background checks.", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                { id: "passenger-trump-123", user_id: "user-trump-123", name: "DONALD TRUMP", phone: "+1 555-0199", dob: "1946-06-14", nationality: "United States", security_score: 85, security_status: "HIGH RISK", security_notes: "Flagged High-Risk VIP - Watchlist Interpol.", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            ],
            passport_verifications: [
                { id: "passport-sarah-123", passenger_id: "passenger-sarah-123", passport_number: "J1234567", issuing_country: "India", expiry_date: "2035-12-31", ocr_status: "SUCCESS", verification_status: "VERIFIED", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                { id: "passport-trump-123", passenger_id: "passenger-trump-123", passport_number: "W0000001", issuing_country: "United States", expiry_date: "2032-06-14", ocr_status: "SUCCESS", verification_status: "VERIFIED", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            ],
            face_enrollments: [
                { id: "face-sarah-123", passenger_id: "passenger-sarah-123", selfie_url: "/mock_selfie.jpg", quality_score: 0.98, liveness_status: "VERIFIED", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                { id: "face-trump-123", passenger_id: "passenger-trump-123", selfie_url: "/trump_target.jpg", quality_score: 0.99, liveness_status: "VERIFIED", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            ],
            boarding_passes: [
                { id: "bp-sarah-123", passenger_id: "passenger-sarah-123", pnr: "PNR10293", flight_number: "SG-302", departure_airport: "DEL", arrival_airport: "JFK", travel_date: new Date().toISOString().split('T')[0], boarding_time: "19:30", gate: "Gate B12", seat_number: "Seat 12A", class: "Economy", egate_status: "PENDING", boarding_status: "PENDING", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                { id: "bp-trump-123", passenger_id: "passenger-trump-123", pnr: "PNR29482", flight_number: "AI-101", departure_airport: "BOM", arrival_airport: "LHR", travel_date: new Date().toISOString().split('T')[0], boarding_time: "20:15", gate: "Gate C04", seat_number: "Seat 01F", class: "First", egate_status: "PENDING", boarding_status: "PENDING", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            ]
        }
        localStorage.setItem(FALLBACK_KEY, JSON.stringify(defaultStore))
        return defaultStore
    }
    return parsedStore
}

function saveFallbackStore(store: Record<string, any[]>) {
    if (typeof window === "undefined") return
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(store))
}

function isMissingTableError(error: any): boolean {
    if (!error) return false
    const msg = error.message || ""
    const code = error.code || ""
    const status = error.status
    return msg.includes("relation") || 
           msg.includes("does not exist") || 
           msg.includes("404") || 
           msg.includes("PGRST116") ||
           msg.includes("Could not find the table") ||
           code === "PGRST205" ||
           status === 404
}

// -------------------------------------------------------------
// CORE DATABASE CRUD OPERATIONS FOR EXPLORER & PLAYGROUND
// -------------------------------------------------------------

const CORE_TABLES = ["users", "passengers", "passport_verifications", "face_enrollments", "boarding_passes"];

export async function dbGetRows(tableName: string): Promise<any[]> {
    if (!CORE_TABLES.includes(tableName)) {
        return getFallbackStore()[tableName] || []
    }
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
    if (!CORE_TABLES.includes(tableName)) {
        const store = getFallbackStore()
        if (!store[tableName]) store[tableName] = []
        const newRow = { id: rowData.id || crypto.randomUUID(), ...formattedData }
        store[tableName].push(newRow)
        saveFallbackStore(store)
        return newRow
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
    if (!CORE_TABLES.includes(tableName)) {
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
    if (!CORE_TABLES.includes(tableName)) {
        const store = getFallbackStore()
        const rows = store[tableName] || []
        const filtered = rows.filter(r => r[matchKey] !== matchVal)
        store[tableName] = filtered
        saveFallbackStore(store)
        return true
    }
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
            nationality: "Indian",
            security_score: 20,
            security_status: "SAFE",
            security_notes: "Clear background checks."
        })
    }
    return passenger
}

// Get user profile details (passenger + passport + face_enrollment + boarding_pass)
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

    return {
        passenger,
        passport,
        faceEnrollment,
        boardingPass
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
        verification_status: details.ocrStatus === "VERIFIED" ? "VERIFIED" : "PENDING"
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
        face_descriptor: "[-0.0824,0.1284,-0.0482,0.0249,0.0104]", // Mock vector
        liveness_status: "VERIFIED"
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
    const passes = await dbGetRows("boarding_passes")
    const existingPass = passes.find(p => p.passenger_id === passengerId)

    const passData = {
        passenger_id: passengerId,
        pnr: flightInput.pnr.toUpperCase().trim(),
        flight_number: flightInput.flightNo.toUpperCase().trim(),
        departure_airport: flightInput.depAirport.toUpperCase().trim(),
        arrival_airport: flightInput.arrAirport.toUpperCase().trim(),
        travel_date: flightInput.travelDate,
        boarding_time: flightInput.boardingTime,
        gate: flightInput.gate,
        seat_number: existingPass?.seat_number || "Seat " + (Math.floor(Math.random() * 30) + 1) + String.fromCharCode(65 + Math.floor(Math.random() * 6)),
        class: existingPass?.class || "Economy",
        egate_status: existingPass?.egate_status || "PENDING",
        boarding_status: existingPass?.boarding_status || "PENDING"
    }

    let result
    if (existingPass) {
        result = await dbUpdateRow("boarding_passes", "passenger_id", passengerId, passData)
    } else {
        result = await dbInsertRow("boarding_passes", passData)
    }

    return { boardingPass: result }
}

// Record security/risk check (Step 4 Check - direct update on passenger profile)
export async function logSecurityCheck(passengerId: string, riskScore: number, notes: string) {
    let riskLevel = "SAFE"
    if (riskScore >= 70) riskLevel = "HIGH RISK"
    else if (riskScore >= 40) riskLevel = "SECONDARY CHECK"

    return await dbUpdateRow("passengers", "id", passengerId, {
        security_score: riskScore,
        security_status: riskLevel,
        security_notes: notes
    })
}

// Record E-Gate Clearance status
export async function logGateClearance(passengerId: string, status: string = "VERIFIED") {
    return await dbUpdateRow("boarding_passes", "passenger_id", passengerId, {
        egate_status: status
    })
}

// Log Boarding Gate Complete Event (Step 5)
export async function logBoardingGateEvent(passengerId: string, status: string = "BOARDED") {
    return await dbUpdateRow("boarding_passes", "passenger_id", passengerId, {
        boarding_status: status
    })
}

// Log travel history entry (saved to local fallback store)
export async function logTravelHistory(passengerId: string, activityType: string, location: string) {
    return await dbInsertRow("travel_history", {
        passenger_id: passengerId,
        activity_type: activityType,
        location: location
    })
}

// Log system notification entry (saved to local fallback store)
export async function logSystemNotification(userId: string, title: string, message: string, type: string = "INFO") {
    return await dbInsertRow("notifications", {
        user_id: userId,
        title,
        message,
        type
    })
}

// Clear all database tables (reset option)
export async function dbPurgeAll() {
    const tables = [
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
