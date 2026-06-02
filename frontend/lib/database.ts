import { db } from "./firebase"
import { 
    collection, 
    getDocs, 
    addDoc, 
    query, 
    orderBy, 
    limit, 
    writeBatch, 
    doc 
} from "firebase/firestore"

// Default Watchlist to pre-populate database if empty
const DEFAULT_WATCHLIST = [
    { name: "donald trump", passport: "W0000001", reason: "Flagged High-Risk VIP", riskScore: 100 },
    { name: "carlos the jackal", passport: "W1111111", reason: "Interpol Red Notice", riskScore: 100 },
    { name: "viktor bout", passport: "W2222222", reason: "Arms Trafficking", riskScore: 100 },
    { name: "dawood ibrahim", passport: "W3333333", reason: "Organized Crime", riskScore: 100 },
    { name: "kim jong un", passport: "W4444444", reason: "Sanctions Evasion", riskScore: 100 },
    { name: "osama bin laden", passport: "W5555555", reason: "Global Terrorism", riskScore: 100 },
    { name: "joaquin guzman", passport: "W6666666", reason: "Drug Cartel Leader", riskScore: 100 }
]

// 1. Travelers Table / Collection
export async function getTravelers() {
    const colRef = collection(db, "travelers")
    const q = query(colRef, orderBy("createdAt", "asc"))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as any[]
}

export async function addTraveler(traveler: any) {
    const colRef = collection(db, "travelers")
    const docRef = await addDoc(colRef, {
        ...traveler,
        createdAt: new Date().toISOString()
    })
    return { id: docRef.id, ...traveler }
}

// 2. Threats Table / Collection
export async function getThreats() {
    const colRef = collection(db, "threats")
    const q = query(colRef, orderBy("createdAt", "desc"), limit(5))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as any[]
}

export async function addThreat(threat: any) {
    const colRef = collection(db, "threats")
    const docRef = await addDoc(colRef, {
        ...threat,
        createdAt: new Date().toISOString()
    })
    return { id: docRef.id, ...threat }
}

// 3. Audit Logs Table / Collection (Checkpoint Passages / Blockchain auditing logs)
export async function getAuditLogs() {
    const colRef = collection(db, "audit_logs")
    const q = query(colRef, orderBy("createdAt", "asc"))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => doc.data()) as any[]
}

export async function addAuditLog(log: any) {
    const colRef = collection(db, "audit_logs")
    await addDoc(colRef, {
        ...log,
        createdAt: new Date().toISOString()
    })
}

// 4. Watchlist Table / Collection (Pre-populated list of entities)
export async function getWatchlist() {
    const colRef = collection(db, "watchlist")
    let snapshot = await getDocs(colRef)
    
    // Pre-populate database with defaults if empty
    if (snapshot.empty) {
        const batch = writeBatch(db)
        DEFAULT_WATCHLIST.forEach(item => {
            const docRef = doc(colRef)
            batch.set(docRef, {
                ...item,
                createdAt: new Date().toISOString()
            })
        })
        await batch.commit()
        snapshot = await getDocs(colRef)
    }

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as any[]
}

// DBMS Utility: Purge / Clear command for demo reset
export async function clearAllCollections() {
    const collectionsToClear = ["travelers", "threats", "audit_logs"]
    
    for (const colName of collectionsToClear) {
        const colRef = collection(db, colName)
        const snapshot = await getDocs(colRef)
        const batch = writeBatch(db)
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref)
        })
        await batch.commit()
    }
}
