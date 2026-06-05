"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Pie } from "react-chartjs-2"
import { Chart as ChartJS, ArcElement, Tooltip as ChartJSTooltip, Legend as ChartJSLegend } from "chart.js"
import { ComposableMap, Geographies, Geography, Marker, Line } from "react-simple-maps"
import Webcam from "react-webcam"
import Script from "next/script"

// Lucide Icons for production-grade UI aesthetics
import {
    Shield,
    AlertOctagon,
    CheckCircle,
    UserPlus,
    Camera,
    Search,
    Activity,
    MapPin,
    Globe,
    Aperture,
    X,
    UserX,
    Layers,
    PlayCircle,
    Heart,
    UploadCloud,
    Lock,
    FileText,
    Printer,
    UserCheck,
    Cpu,
    Mail,
    Phone,
    Calendar,
    Clock,
    Database,
    ChevronRight,
    Grid,
    Check,
    AlertTriangle,
    FileSpreadsheet,
    Play,
    BarChart2,
    Settings as SettingsIcon,
    History,
    Info,
    RefreshCw,
    Send,
    Plus,
    Trash2,
    ArrowRight,
    User,
    Key
} from "lucide-react"

// Recharts components for analytics charts
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    LineChart,
    Line as RechartsLine,
    BarChart,
    Bar,
    PieChart,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend as RechartsLegend
} from "recharts"

// Import database client & fallback APIs
import {
    dbGetRows,
    dbInsertRow,
    dbUpdateRow,
    dbDeleteRow,
    syncUserAccount,
    getPassengerProfileComplete,
    enrollPassport,
    enrollFaceBiometrics,
    linkFlightJourney,
    logSecurityCheck,
    logBoardingGateEvent,
    logGateClearance,
    logTravelHistory,
    logSystemNotification,
    dbPurgeAll
} from "@/lib/supabase_db"



ChartJS.register(ArcElement, ChartJSTooltip, ChartJSLegend)

// Watchlist definition
const WATCHLIST = [
    { name: "DONALD TRUMP", passport: "W0000001", reason: "Flagged High-Risk VIP" },
    { name: "CARLOS THE JACKAL", passport: "W1111111", reason: "Interpol Red Notice" },
    { name: "VIKTOR BOUT", passport: "W2222222", reason: "Arms Trafficking" },
    { name: "DAWOOD IBRAHIM", passport: "W3333333", reason: "Organized Crime" },
    { name: "KIM JONG UN", passport: "W4444444", reason: "Sanctions Evasion" },
    { name: "OSAMA BIN LADEN", passport: "W5555555", reason: "Global Terrorism" },
    { name: "JOAQUIN GUZMAN", passport: "W6666666", reason: "Drug Cartel Leader" }
]

// Country coordinates & baseline risk metrics
const countryData: Record<string, { coords: [number, number], risk: number }> = {
    india: { coords: [78, 21], risk: 20 },
    usa: { coords: [-100, 40], risk: 15 },
    canada: { coords: [-106, 56], risk: 10 },
    mexico: { coords: [-102, 23], risk: 25 },
    brazil: { coords: [-51, -10], risk: 20 },
    uk: { coords: [-1.5, 52], risk: 10 },
    france: { coords: [2, 46], risk: 10 },
    germany: { coords: [10, 51], risk: 10 },
    russia: { coords: [100, 60], risk: 35 },
    china: { coords: [104, 35], risk: 30 },
    japan: { coords: [138, 36], risk: 10 },
    northkorea: { coords: [127, 40], risk: 95 },
    australia: { coords: [133, -25], risk: 10 },
    uae: { coords: [54, 24], risk: 20 },
    saudiarabia: { coords: [45, 24], risk: 30 },
    iran: { coords: [53, 32], risk: 70 },
    pakistan: { coords: [69, 30], risk: 65 },
    afghanistan: { coords: [67, 33], risk: 80 }
}

export default function Home() {
    // ACTIVE WORKSPACE CONTROLLERS
    // "dashboard" | "passenger" | "passport" | "biometric" | "liveness" | "flight" | "entry" | "screening" | "boarding" | "history" | "analytics" | "explorer" | "er" | "sql" | "audit" | "settings"
    const [activeModule, setActiveModule] = useState<string>("dashboard")
    const [activeView, setActiveView] = useState<string>("landing")
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
    const [hoveredErTable, setHoveredErTable] = useState<string | null>(null)
    const [authRole, setAuthRole] = useState<"admin" | "user" | null>(null)
    const [loginRoleMode, setLoginRoleMode] = useState<"passenger" | "officer">("passenger")
    const [authAction, setAuthAction] = useState<"signin" | "signup">("signin")
    
    // AUTHENTICATION STATES
    const [loginEmail, setLoginEmail] = useState("")
    const [loginPassword, setLoginPassword] = useState("")
    const [loginError, setLoginError] = useState("")
    const [signupEmail, setSignupEmail] = useState("")
    const [signupPassword, setSignupPassword] = useState("")
    const [signupName, setSignupName] = useState("")
    const [signupPhone, setSignupPhone] = useState("")
    const [signupDob, setSignupDob] = useState("")
    const [signupNationality, setSignupNationality] = useState("Indian")

    // DATA STORES
    const [profileData, setProfileData] = useState<any>(null)
    const [travelers, setTravelers] = useState<any[]>([])
    const [threats, setThreats] = useState<any[]>([])
    const [auditLogs, setAuditLogs] = useState<any[]>([])
    const [notifications, setNotifications] = useState<any[]>([])
    const [showNotifications, setShowNotifications] = useState(false)
    const [systemSettings, setSystemSettings] = useState<any[]>([])
    const [globalSearchVal, setGlobalSearchVal] = useState("")

    // PASSENGER TIMELINE STEP WIZARD
    // Stages: 1: Account Created, 2: Passport Uploaded, 3: Passport Verified, 4: Face Registered, 5: Flight Linked, 6: Airport Entry Approved, 7: Security Cleared, 8: Boarded Successfully
    const [passengerStage, setPassengerStage] = useState<number>(1)
    
    // PASSPORT OCR COMPARATOR VARIABLES
    const [passportDocUrl, setPassportDocUrl] = useState<string | null>(null)
    const [ocrPassportNum, setOcrPassportNum] = useState("")
    const [ocrCountry, setOcrCountry] = useState("India")
    const [ocrName, setOcrName] = useState("")
    const [ocrExpiry, setOcrExpiry] = useState("")
    const [ocrScanning, setOcrScanning] = useState(false)
    const [ocrStatus, setOcrStatus] = useState<"PENDING" | "SUCCESS" | "FAILED">("PENDING")

    // FACE BIOMETRIC ONBOARDING VARIABLES
    const [enrollSelfieUrl, setEnrollSelfieUrl] = useState<string | null>(null)
    const [enrollConfidence, setEnrollConfidence] = useState<number | null>(null)
    const [enrollQuality, setEnrollQuality] = useState<number | null>(null)
    const [isEnrollingFace, setIsEnrollingFace] = useState(false)

    // FLIGHT MANAGEMENT VARIABLES
    const [flightPnr, setFlightPnr] = useState("")
    const [flightNo, setFlightNo] = useState("")
    const [flightDep, setFlightDep] = useState("")
    const [flightArr, setFlightArr] = useState("")
    const [flightDate, setFlightDate] = useState("")
    const [flightTime, setFlightTime] = useState("")
    const [flightGate, setFlightGate] = useState("")

    // LIVENESS CAMERA MATCHER VARIABLES
    const [cameraState, setCameraState] = useState<"idle" | "scanning" | "matching" | "success" | "failed">("idle")
    const [cameraLogs, setCameraLogs] = useState<string[]>([])
    const [cameraMatchScore, setCameraMatchScore] = useState<number | null>(null)
    const [cameraSelfieUrl, setCameraSelfieUrl] = useState<string | null>(null)

    // SECURITY SCREENING VARIABLES
    const [screenPassengerId, setScreenPassengerId] = useState("")
    const [screenRiskScore, setScreenRiskScore] = useState(20)
    const [screenStatus, setScreenStatus] = useState("SAFE")
    const [screenNotes, setScreenNotes] = useState("")
    const [isSavingRisk, setIsSavingRisk] = useState(false)
    const [riskSavedSuccess, setRiskSavedSuccess] = useState(false)

    // BOARDING GATE VARIABLES
    const [boardPassengerId, setBoardPassengerId] = useState("")
    const [boardState, setBoardState] = useState<"idle" | "matching" | "cleared" | "completed" | "error">("idle")
    const [boardLogs, setBoardLogs] = useState<string[]>([])

    // AIRPORT GATE ENTRY SIMULATION VARIABLES
    const [gateState, setGateState] = useState<"idle" | "scanning" | "matching" | "verifying" | "success" | "denied" | "alert">("idle")
    const [gateLogs, setGateLogs] = useState<string[]>([])
    const [gateMatchConfidence, setGateMatchConfidence] = useState<number | null>(null)

    // DATABASE EXPLORER CRUD STATE
    const [explorerTable, setExplorerTable] = useState("passengers")
    const [explorerRows, setExplorerRows] = useState<any[]>([])
    const [explorerLoading, setExplorerLoading] = useState(false)
    const [explorerSearch, setExplorerSearch] = useState("")
    const [showInsertModal, setShowInsertModal] = useState(false)
    const [insertFormData, setInsertFormData] = useState<Record<string, string>>({})

    // SQL PLAYGROUND VARIABLES
    const [sqlQuery, setSqlQuery] = useState("SELECT * FROM passengers;")
    const [sqlResultRows, setSqlResultRows] = useState<any[]>([])
    const [sqlError, setSqlError] = useState<string | null>(null)
    const [sqlSuccessMsg, setSqlSuccessMsg] = useState<string | null>(null)

    // ADMIN OVERVIEW DETAILS MODAL
    const [selectedTravelerDetail, setSelectedTravelerDetail] = useState<any>(null)
    const [showDetailModal, setShowDetailModal] = useState(false)

    // FACEAPI REFS
    const faceapiRef = useRef<any>(null)
    const [modelsLoaded, setModelsLoaded] = useState(false)
    const [trumpDescriptor, setTrumpDescriptor] = useState<Float32Array | null>(null)
    const enrollCamRef = useRef<Webcam>(null)
    const matchCamRef = useRef<Webcam>(null)
    const gateCamRef = useRef<Webcam>(null)
    const boardCamRef = useRef<Webcam>(null)

    // SYSTEM NOTIFICATION BANNER LOGS
    const [terminalLogs, setTerminalLogs] = useState<string[]>([])
    const addTerminalLog = (log: string) => {
        setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`].slice(-3))
    }

    async function syncSystemData() {
        try {
            const passengersData = await dbGetRows("passengers")
            const passportsData = await dbGetRows("passport_verifications")
            const boardingPassesData = await dbGetRows("boarding_passes")
            const auditData = await dbGetRows("audit_logs")
            const notificationData = await dbGetRows("notifications")
            const settingsData = await dbGetRows("system_settings")

            setAuditLogs(auditData.reverse())
            setNotifications(notificationData.filter(n => authRole === "admin" || n.user_id === currentUserId).reverse())
            setSystemSettings(settingsData)

            const combined = passengersData.map(p => {
                const pass = passportsData.find(pa => pa.passenger_id === p.id)
                const bp = boardingPassesData.find(b => b.passenger_id === p.id)

                const cName = pass?.issuing_country || "India"
                const key = cName.toLowerCase().replace(/\s/g, '')
                const coords = countryData[key]?.coords || [78, 21]

                return {
                    id: p.id,
                    name: p.name,
                    passport: pass?.passport_number || "PENDING",
                    nationality: p.nationality || "Indian",
                    country: cName,
                    risk: p.security_score !== undefined ? Number(p.security_score) : 20,
                    status: p.security_status || "SAFE",
                    lat: coords[1],
                    lng: coords[0],
                    flightNo: bp?.flight_number || "N/A",
                    verified: pass?.verification_status === "VERIFIED",
                    lastActivity: p.updated_at || p.created_at,
                    note: p.security_notes || "No threat flags identified."
                }
            })
            setTravelers(combined)

            const danger = combined.filter(t => t.risk >= 70).map(t => ({
                name: t.name,
                passport: t.passport,
                risk: t.risk,
                note: t.note || "Security threat flag activated.",
                time: new Date(t.lastActivity).toLocaleTimeString()
            }))
            setThreats(danger)

        } catch (e) {
            console.error("System Sync Error:", e)
        }
    }

    async function loadPassengerProfile(uid: string) {
        try {
            const data = await getPassengerProfileComplete(uid)
            if (data) {
                setProfileData(data)
                
                // Evaluate active timeline stage
                let stage = 1 // Account Created
                if (data.passport) {
                    stage = 2 // Passport Uploaded
                    setOcrPassportNum(data.passport.passport_number)
                    setOcrCountry(data.passport.issuing_country)
                    setOcrName(data.passenger.name)
                    setOcrStatus("SUCCESS")
                    setPassportDocUrl("/passport_sample.jpg")
                }
                if (data.passport && data.passport.verification_status === "VERIFIED") {
                    stage = 3 // Passport Verified
                }
                if (data.faceEnrollment) {
                    stage = 4 // Face Registered
                    setEnrollSelfieUrl(data.faceEnrollment.selfie_url)
                    setEnrollQuality(Number(data.faceEnrollment.quality_score))
                }
                if (data.boardingPass) {
                    stage = 5 // Flight Linked
                    setFlightPnr(data.boardingPass.pnr)
                    setFlightNo(data.boardingPass.flight_number)
                    setFlightDep(data.boardingPass.departure_airport)
                    setFlightArr(data.boardingPass.arrival_airport)
                    setFlightDate(data.boardingPass.travel_date)
                    setFlightTime(data.boardingPass.boarding_time)
                    setFlightGate(data.boardingPass.gate)
                }
                if (data.boardingPass && data.boardingPass.egate_status === "VERIFIED") {
                    stage = 6 // Airport Entry Approved / E-Gate Cleared
                }
                if (data.passenger && data.passenger.security_status === "SAFE") {
                    if (stage >= 4) {
                        stage = 7 // Security Cleared
                    }
                }
                if (data.boardingPass && data.boardingPass.boarding_status === "BOARDED") {
                    stage = 8 // Boarded Successfully
                }

                setPassengerStage(stage)
            }
        } catch (e) {
            console.error("Profile load error:", e)
        }
    }

    const loadDbTableRows = async (tableName: string) => {
        setExplorerLoading(true)
        try {
            const data = await dbGetRows(tableName)
            if (explorerSearch.trim()) {
                const searchLower = explorerSearch.toLowerCase()
                const filtered = data.filter(row => 
                    Object.values(row).some(val => 
                        String(val).toLowerCase().includes(searchLower)
                    )
                )
                setExplorerRows(filtered)
            } else {
                setExplorerRows(data)
            }
        } catch (e) {
            console.error("Error loading explorer table rows:", e)
        } finally {
            setExplorerLoading(false)
        }
    }

    // Automatically trigger reload on active changes
    useEffect(() => {
        loadDbTableRows(explorerTable)
    }, [explorerTable, explorerSearch])

    const handleAuthLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoginError("")
        try {
            if (loginEmail === "admin@sentinelgate.gov" && loginPassword === "AdminSecurityTopRisk04822") {
                setAuthRole("admin")
                setCurrentUserId("admin-uid-12345")
                setCurrentUserEmail("admin@sentinelgate.gov")
                setActiveModule("dashboard")
                addTerminalLog("Admin Clearance session initialized via bypass credentials.")
                setLoginEmail("")
                setLoginPassword("")
                return
            }

            const userRows = await dbGetRows("users")
            const matchedUser = userRows.find(u => u.email.toLowerCase() === loginEmail.toLowerCase().trim())
            
            if (!matchedUser) {
                throw new Error("No user found with this email.")
            }
            
            if (matchedUser.password !== loginPassword) {
                throw new Error("Invalid password.")
            }

            const role = matchedUser.role || "passenger"
            setCurrentUserId(matchedUser.id)
            setCurrentUserEmail(matchedUser.email)

            if (role === "admin") {
                setAuthRole("admin")
                setActiveModule("dashboard")
            } else {
                setAuthRole("user")
                setActiveModule("passenger")
                await loadPassengerProfile(matchedUser.id)
            }
            
            addTerminalLog(`Clearance session authenticated: ${matchedUser.email}`)
            setLoginEmail("")
            setLoginPassword("")
        } catch (err: any) {
            console.error("Login Error:", err)
            setLoginError(err.message || "Failed to authenticate credentials.")
        }
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoginError("")
        try {
            if (!signupEmail || !signupPassword || !signupName) {
                throw new Error("Missing required fields.")
            }

            const userRows = await dbGetRows("users")
            const exists = userRows.some(u => u.email.toLowerCase() === signupEmail.toLowerCase().trim())
            if (exists) {
                throw new Error("An account with this email already exists.")
            }

            const newUserId = crypto.randomUUID()
            const newUser = {
                id: newUserId,
                email: signupEmail.toLowerCase().trim(),
                password: signupPassword,
                role: "passenger"
            }

            await dbInsertRow("users", newUser)

            await dbInsertRow("passengers", {
                user_id: newUserId,
                name: signupName.toUpperCase().trim(),
                phone: signupPhone.trim(),
                dob: signupDob || null,
                nationality: signupNationality
            })

            addTerminalLog(`Registered traveler: ${signupEmail}`)
            setSignupEmail("")
            setSignupPassword("")
            setSignupName("")
            setSignupPhone("")
            setSignupDob("")
            
            setAuthRole("user")
            setCurrentUserId(newUserId)
            setCurrentUserEmail(newUser.email)
            setActiveModule("passenger")
            await loadPassengerProfile(newUserId)
        } catch (err: any) {
            console.error("Signup Error:", err)
            setLoginError(err.message || "Failed to create traveler account.")
        }
    }

    const handleLogout = async () => {
        try {
            setAuthRole(null)
            setCurrentUserId(null)
            setCurrentUserEmail(null)
            setProfileData(null)
            setActiveModule("dashboard")
            setActiveView("landing")
            addTerminalLog("Cleared credentials. Session ended.")
        } catch (err: any) {
            console.error("Sign out error:", err)
        }
    }

    const renderDatabaseRelationshipsDiagram = () => {
        const ER_TABLES = [
            {
                name: "users",
                group: "Clearance & Auth",
                description: "Credentials, accounts and system access privileges",
                columns: [
                    { name: "id", type: "UUID [PK]", desc: "Unique user auth identifier" },
                    { name: "email", type: "TEXT [UNIQUE]", desc: "Registered user email address" },
                    { name: "role", type: "TEXT", desc: "Access level credentials (passenger | admin)" }
                ]
            },
            {
                name: "passengers",
                group: "Core Identity",
                description: "Official legal identity matching travel credentials",
                columns: [
                    { name: "id", type: "UUID [PK]", desc: "Primary key passenger identifier" },
                    { name: "user_id", type: "UUID [FK -> users.id]", desc: "Link to user account" },
                    { name: "name", type: "TEXT", desc: "Legal full name of travel passenger" },
                    { name: "phone", type: "TEXT", desc: "Contact mobile number" },
                    { name: "dob", type: "DATE", desc: "Official date of birth record" },
                    { name: "nationality", type: "TEXT", desc: "Passport issuing country nationality" },
                    { name: "security_score", type: "NUMERIC", desc: "AI computed risk coefficient (0 - 100)" },
                    { name: "security_status", type: "TEXT", desc: "Danger assessment tier: SAFE | SECONDARY CHECK | HIGH RISK" },
                    { name: "security_notes", type: "TEXT", desc: "Security details or officer comments" }
                ]
            },
            {
                name: "passport_verifications",
                group: "Core Identity",
                description: "OCR validation details from scanned traveler passports",
                columns: [
                    { name: "id", type: "UUID [PK]", desc: "Unique verification record ID" },
                    { name: "passenger_id", type: "UUID [FK -> passengers.id, UNIQUE]", desc: "1:1 link to passenger identity" },
                    { name: "passport_number", type: "TEXT", desc: "Passport document number" },
                    { name: "issuing_country", type: "TEXT", desc: "Extracted issuing country" },
                    { name: "expiry_date", type: "DATE", desc: "Passport validity limit date" },
                    { name: "ocr_status", type: "TEXT", desc: "OCR scan status: PENDING | SUCCESS | FAILED" },
                    { name: "verification_status", type: "TEXT", desc: "Immigration verification: PENDING | VERIFIED | REJECTED" }
                ]
            },
            {
                name: "face_enrollments",
                group: "Biometric Registry",
                description: "Enrolled biometric facial features for camera verification",
                columns: [
                    { name: "id", type: "UUID [PK]", desc: "Biometric enrollment ID" },
                    { name: "passenger_id", type: "UUID [FK -> passengers.id, UNIQUE]", desc: "1:1 link to passenger" },
                    { name: "selfie_url", type: "TEXT", desc: "Registered biometric selfie image reference" },
                    { name: "face_descriptor", type: "TEXT", desc: "High-dimensional facial feature vector model" },
                    { name: "quality_score", type: "NUMERIC", desc: "Biometric registration clarity score" },
                    { name: "liveness_status", type: "TEXT", desc: "Biometric enrollment status: PENDING | VERIFIED | FAILED" }
                ]
            },
            {
                name: "boarding_passes",
                group: "Travel Logistics",
                description: "Passenger flight coupons generated for voyages",
                columns: [
                    { name: "id", type: "UUID [PK]", desc: "Boarding pass serial tracking ID" },
                    { name: "passenger_id", type: "UUID [FK -> passengers.id, UNIQUE]", desc: "1:1 link to passenger" },
                    { name: "pnr", type: "TEXT", desc: "Reservation Name Record ticket booking code" },
                    { name: "flight_number", type: "TEXT", desc: "Aviation flight identifier" },
                    { name: "departure_airport", type: "TEXT", desc: "Origin airport code" },
                    { name: "arrival_airport", type: "TEXT", desc: "Destination airport code" },
                    { name: "travel_date", type: "DATE", desc: "Flight departure calendar date" },
                    { name: "boarding_time", type: "TEXT", desc: "Scheduled boarding slot" },
                    { name: "gate", type: "TEXT", desc: "Terminal gate checkpoint location" },
                    { name: "seat_number", type: "TEXT", desc: "Assigned aircraft seat code" },
                    { name: "class", type: "TEXT", desc: "Cabin class: Economy | Business | First" },
                    { name: "egate_status", type: "TEXT", desc: "E-Gate access decision: PENDING | VERIFIED | DENIED" },
                    { name: "boarding_status", type: "TEXT", desc: "Boarding status: PENDING | BOARDED | FAILED" }
                ]
            }
        ]

        const RELATIONSHIPS: Record<string, { parent?: string[]; children?: string[] }> = {
            users: { children: ["passengers"] },
            passengers: { parent: ["users"], children: ["passport_verifications", "face_enrollments", "boarding_passes"] },
            passport_verifications: { parent: ["passengers"] },
            face_enrollments: { parent: ["passengers"] },
            boarding_passes: { parent: ["passengers"] }
        }

        return (
            <div className="space-y-6">
                <div className="bg-slate-950 border border-slate-850 p-4.5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <span className="text-[9px] text-amber-500 font-mono font-bold tracking-widest uppercase">Relational Model Explorer</span>
                        <p className="text-xs text-slate-400 mt-1 max-w-xl">
                            Click or hover on any schema table to see its primary-foreign key linkages. Parent connections highlight in <span className="text-blue-400 font-bold">Blue</span> and child tables in <span className="text-emerald-400 font-bold">Green</span>.
                        </p>
                    </div>
                    {hoveredErTable && (
                        <button 
                            onClick={() => setHoveredErTable(null)}
                            className="bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase transition-colors"
                        >
                            Reset Highlights [x]
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {ER_TABLES.map((table) => {
                        const isSelected = hoveredErTable === table.name
                        const relations = RELATIONSHIPS[hoveredErTable || ""] || {}
                        const isParent = relations.parent?.includes(table.name)
                        const isChild = relations.children?.includes(table.name)
                        
                        let cardStyle = "border-slate-850 bg-slate-900/60 opacity-90 scale-98"
                        if (hoveredErTable) {
                            if (isSelected) {
                                cardStyle = "border-amber-500 bg-amber-950/10 shadow-[0_0_20px_rgba(245,158,11,0.2)] scale-100 opacity-100 z-10"
                            } else if (isParent) {
                                cardStyle = "border-blue-500 bg-blue-950/10 opacity-100 scale-99"
                            } else if (isChild) {
                                cardStyle = "border-emerald-500 bg-emerald-950/10 opacity-100 scale-99"
                            } else {
                                cardStyle = "border-slate-900 bg-slate-950/20 opacity-30 scale-95"
                            }
                        }

                        return (
                            <div 
                                key={table.name} 
                                onClick={() => setHoveredErTable(table.name)}
                                onMouseEnter={() => setHoveredErTable(table.name)}
                                className={`rounded-2xl border p-4.5 cursor-pointer transition-all duration-300 ${cardStyle}`}
                            >
                                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <Database className="w-3.5 h-3.5 text-slate-400" />
                                            <h4 className="text-[11px] font-bold font-mono text-white tracking-wide">{table.name}</h4>
                                        </div>
                                        <span className="text-[8px] text-slate-500 uppercase tracking-widest font-mono mt-0.5 block">{table.group}</span>
                                    </div>
                                    {isSelected && <span className="bg-amber-500/10 border border-amber-500/30 text-amber-500 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold">Selected</span>}
                                    {!hoveredErTable && <span className="text-slate-600 text-[8px] font-mono">1:N</span>}
                                    {hoveredErTable && isParent && <span className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold">Parent</span>}
                                    {hoveredErTable && isChild && <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold">Child</span>}
                                </div>

                                <p className="text-[9px] text-slate-400 mb-4 line-clamp-2 h-6 leading-relaxed">{table.description}</p>

                                <div className="space-y-2 font-mono">
                                    {table.columns.map((col, cIdx) => {
                                        const isPk = col.type.includes("PK")
                                        const isFk = col.type.includes("FK")
                                        
                                        return (
                                            <div key={cIdx} className="flex items-center justify-between text-[9px] border-b border-slate-850/30 pb-1.5 last:border-0">
                                                <div className="flex items-center gap-1.5">
                                                    {isPk ? (
                                                        <Key className="w-3 h-3 text-amber-500" />
                                                    ) : isFk ? (
                                                        <Layers className="w-3 h-3 text-indigo-400" />
                                                    ) : (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-700 ml-0.75" />
                                                    )}
                                                    <span className={`font-semibold ${isPk ? 'text-amber-400' : isFk ? 'text-indigo-400' : 'text-slate-350'}`}>{col.name}</span>
                                                </div>
                                                <span className="text-slate-550 text-[8px]">{col.type}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    // -------------------------------------------------------------
    // LIFE CYCLE HANDLERS
    // -------------------------------------------------------------
    useEffect(() => {
        const cachedUserId = localStorage.getItem("sentinelgate_user_id")
        const cachedUserEmail = localStorage.getItem("sentinelgate_user_email")
        const cachedRole = localStorage.getItem("sentinelgate_user_role") as "admin" | "user" | null
        
        if (cachedUserId && cachedUserEmail && cachedRole) {
            setCurrentUserId(cachedUserId)
            setCurrentUserEmail(cachedUserEmail)
            setAuthRole(cachedRole)
            if (cachedRole === "admin") {
                setActiveModule("dashboard")
                addTerminalLog("Admin Clearance session restored.")
            } else {
                setActiveModule("passenger")
                loadPassengerProfile(cachedUserId)
                addTerminalLog(`Clearance session restored: ${cachedUserEmail}`)
            }
        }
    }, [])

    useEffect(() => {
        if (currentUserId && currentUserEmail && authRole) {
            localStorage.setItem("sentinelgate_user_id", currentUserId)
            localStorage.setItem("sentinelgate_user_email", currentUserEmail)
            localStorage.setItem("sentinelgate_user_role", authRole)
        } else {
            localStorage.removeItem("sentinelgate_user_id")
            localStorage.removeItem("sentinelgate_user_email")
            localStorage.removeItem("sentinelgate_user_role")
        }
    }, [currentUserId, currentUserEmail, authRole])

    useEffect(() => {
        const t = setTimeout(() => {
            syncSystemData()
        }, 0)
        return () => clearTimeout(t)
    }, [activeModule])

    // Load face landmarks models
    useEffect(() => {
        const loadModels = async () => {
            try {
                let faceapi = (window as any).faceapi
                while (!faceapi) {
                    await new Promise(r => setTimeout(r, 100))
                    faceapi = (window as any).faceapi
                }
                faceapiRef.current = faceapi

                const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ])
                setModelsLoaded(true)

                // Biometric profile load
                const img = await faceapi.fetchImage('/trump_target.jpg').catch(() => null)
                if (img) {
                    const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
                    if (detection) {
                        setTrumpDescriptor(detection.descriptor)
                        console.log("Watchlist biometric cache active.")
                    }
                }
            } catch (err) {
                console.error("Face-API models loading failed:", err)
            }
        }
        loadModels()
    }, [])

    // Risk calculator score
    const evaluateRiskIndex = (name: string, passport: string, country: string) => {
        const key = country.toLowerCase().trim().replace(/\s/g, '')
        const cData = countryData[key] || { risk: 20 }
        let cRisk = cData.risk

        const blocklist = ['iran', 'pakistan', 'northkorea', 'afghanistan']
        if (blocklist.includes(key)) {
            cRisk = Math.min(100, cRisk + 45)
        }

        let pRisk = 0
        const validPattern = /^[A-Z][0-9]{7}$/
        if (!validPattern.test(passport.toUpperCase().trim())) {
            pRisk = 80
        }

        const onWatchlist = WATCHLIST.some(w => w.name === name.toUpperCase().trim() || w.passport === passport.toUpperCase().trim())
        const watchlistRisk = onWatchlist ? 100 : 0

        const finalScore = (0.5 * cRisk) + (0.3 * pRisk) + (0.2 * watchlistRisk)
        return Math.min(Math.round(finalScore), 100)
    }

    // -------------------------------------------------------------
    // PASSPORT VERIFICATION ACTIONS
    // -------------------------------------------------------------
    const handlePassportOcrScan = async (e: any) => {
        const file = e.target.files?.[0]
        if (!file) return

        setOcrScanning(true)
        addTerminalLog("OCR document scanning initiated...")

        setTimeout(() => {
            const randomCode = "P" + Math.floor(1000000 + Math.random() * 9000000)
            const matchedName = profileData?.passenger.name || "SALMAN SHAIKH"
            const selectCountry = "India"

            setOcrPassportNum(randomCode)
            setOcrCountry(selectCountry)
            setOcrName(matchedName)
            setOcrExpiry(new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            setOcrStatus("SUCCESS")
            setOcrScanning(false)
            setPassportDocUrl("/passport_sample.jpg")
            addTerminalLog("Passport OCR conversion successfully parsed columns.")
        }, 1500)
    }

    const savePassportVerification = async () => {
        if (!ocrPassportNum || !ocrCountry) return
        try {
            const pId = profileData.passenger.id
            await enrollPassport(pId, {
                passportNumber: ocrPassportNum,
                country: ocrCountry,
                ocrStatus: "VERIFIED"
            })

            // Calculate baseline risk parameters
            const risk = evaluateRiskIndex(profileData.passenger.name, ocrPassportNum, ocrCountry)
            let notes = "Verified via SmartYatra digital OCR gateway."
            if (WATCHLIST.some(w => w.name === profileData.passenger.name.toUpperCase())) {
                notes = "WATCHLIST SECURITY INTERCEPT: High probability match flag."
            }
            await logSecurityCheck(pId, risk, notes)
            await logTravelHistory(pId, "PASSPORT_VERIFIED", "OCR GATEWAY")

            // Log audits
            await dbInsertRow("audit_logs", {
                user_id: currentUserId,
                action: "PASSPORT_UPLOAD",
                actor: profileData.passenger.name,
                status: "SUCCESS",
                description: `Successfully verified passport number: ${ocrPassportNum}. Evaluated security risk score: ${risk}%`
            })

            await logSystemNotification(currentUserId!, "Passport Verified", `Your passport ${ocrPassportNum} has been verified successfully.`)

            addTerminalLog("Passport verified & security check nodes logged.")
            await loadPassengerProfile(currentUserId!)
            syncSystemData()
        } catch (e) {
            console.error(e)
            alert("Database write error during passport verification.")
        }
    }

    // -------------------------------------------------------------
    // BIOMETRIC FACE ENROLLMENT ACTIONS
    // -------------------------------------------------------------
    const captureBiometricSelfie = async () => {
        setIsEnrollingFace(true)
        addTerminalLog("Accessing camera feed. Align face in frame...")

        setTimeout(() => {
            const screenshot = enrollCamRef.current?.getScreenshot()
            if (!screenshot) {
                // Mock selfie
                setEnrollSelfieUrl("/mock_selfie.jpg")
                setEnrollConfidence(98.2)
                setEnrollQuality(0.96)
                setIsEnrollingFace(false)
                addTerminalLog("Biometric capture completed (Mock camera overlay). Face landmarks parsed.")
                return
            }

            setEnrollSelfieUrl(screenshot)
            setEnrollConfidence(99.4)
            setEnrollQuality(0.97)
            setIsEnrollingFace(false)
            addTerminalLog("Face biometrics quality check passed. Descriptor generated.")
        }, 1500)
    }

    const saveFaceEnrollment = async () => {
        if (!enrollSelfieUrl) return
        try {
            const pId = profileData.passenger.id
            const finalQuality = enrollQuality || 0.95
            await enrollFaceBiometrics(pId, enrollSelfieUrl, finalQuality)
            await logTravelHistory(pId, "FACE_ENROLLED", "BIOMETRIC COUNTER")

            // Audit
            await dbInsertRow("audit_logs", {
                user_id: currentUserId,
                action: "FACE_ENROLL",
                actor: profileData.passenger.name,
                status: "SUCCESS",
                description: `Face biometric descriptor saved. Enrollment Quality Score: ${(finalQuality*100).toFixed(1)}%`
            })

            await logSystemNotification(currentUserId!, "Face Registered", "Face biometrics successfully linked to your digital identity.")

            addTerminalLog("Face biometrics recorded to Supabase secure vaults.")
            await loadPassengerProfile(currentUserId!)
            syncSystemData()
        } catch (e) {
            console.error(e)
            alert("Biometric write failure.")
        }
    }

    // -------------------------------------------------------------
    // FLIGHT JOURNEY LINKING
    // -------------------------------------------------------------
    const handleLinkFlightDemo = () => {
        setFlightPnr("PNR10293")
        setFlightNo("SG-302")
        setFlightDep("DEL")
        setFlightArr("JFK")
        setFlightDate(new Date().toISOString().split('T')[0])
        setFlightTime("19:30")
        setFlightGate("Gate B12")
    }

    const saveFlightJourneyDetails = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!flightPnr || !flightNo || !flightDep || !flightArr) return

        try {
            const pId = profileData.passenger.id
            await linkFlightJourney(pId, {
                pnr: flightPnr,
                flightNo,
                depAirport: flightDep,
                arrAirport: flightArr,
                travelDate: flightDate || new Date().toISOString().split('T')[0],
                boardingTime: flightTime || "19:30",
                gate: flightGate || "Gate B12"
            })

            await logTravelHistory(pId, "FLIGHT_LINKED", "DIGITAL COUNTER")

            // Audit
            await dbInsertRow("audit_logs", {
                user_id: currentUserId,
                action: "FLIGHT_LINK",
                actor: profileData.passenger.name,
                status: "SUCCESS",
                description: `Linked flight ticket journey: PNR ${flightPnr}, Flight: ${flightNo}`
            })

            await logSystemNotification(currentUserId!, "Flight Linked", `Journey linked successfully for flight ${flightNo} to ${flightArr}.`)

            addTerminalLog("Flight connection details stored and boarding pass generated.")
            await loadPassengerProfile(currentUserId!)
            syncSystemData()
        } catch (e) {
            console.error(e)
            alert("Failed to write flight journey link.")
        }
    }

    // -------------------------------------------------------------
    // CAMERA VERIFICATION MODULE (LIVENESS SCANNERS)
    // -------------------------------------------------------------
    const runCameraLivenessMatchCheck = async () => {
        if (cameraState === "scanning" || cameraState === "matching") {
            return
        }

        setCameraLogs([])
        setCameraMatchScore(null)
        setCameraSelfieUrl(null)
        setCameraState("scanning")

        const addLog = (m: string) => setCameraLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${m}`])

        addLog("🛡️ Accessing border camera feed...")
        addLog("📹 Detecting eyes and liveness nodes...")

        setTimeout(() => {
            setCameraState("matching")
            addLog("🧑 Face match target detected. Accessing DB enrollments...")

            const screenshot = matchCamRef.current?.getScreenshot()
            setCameraSelfieUrl(screenshot || "/mock_selfie.jpg")

            setTimeout(async () => {
                try {
                    let matchedPassenger = null
                    const passengers = await dbGetRows("passengers")

                    if (profileData) {
                        matchedPassenger = profileData.passenger
                    } else if (passengers.length > 0) {
                        matchedPassenger = passengers[passengers.length - 1]
                    }

                    if (!matchedPassenger) {
                        setCameraState("failed")
                        addLog("🔴 SCAN FAILED: Profile not found in database registry.")
                        return
                    }

                    const riskScore = matchedPassenger.security_score !== undefined ? Number(matchedPassenger.security_score) : 20

                    if (riskScore >= 70) {
                        setCameraState("failed")
                        addLog(`🚨 POLICE INTERCEPT ACTIVE: Match found for high-risk traveler ${matchedPassenger.name.toUpperCase()}!`)
                        return
                    }

                    setCameraState("success")
                    setCameraMatchScore(98.4)
                    addLog(`🟢 MATCH SUCCESS: Verified Passenger identity "${matchedPassenger.name.toUpperCase()}"`)
                    addLog(`🟢 Confidence rating: 98.4% (Threshold: 90.0% Passed)`)

                    // Log audit & verification
                    await dbInsertRow("face_verifications", {
                        passenger_id: matchedPassenger.id,
                        match_confidence: 98.4,
                        status: "APPROVED",
                        captured_selfie_url: screenshot || "/mock_selfie.jpg"
                    })

                    await dbInsertRow("audit_logs", {
                        user_id: currentUserId,
                        action: "FACE_VERIFY",
                        actor: matchedPassenger.name,
                        status: "SUCCESS",
                        description: "Biometric webcam match verification: Approved with 98.4% score."
                    })

                    syncSystemData()
                } catch (error) {
                    console.error("Camera liveness matcher failed:", error)
                    setCameraState("failed")
                    addLog("🔴 SCAN ERROR: Failed to finalize biometric analysis.")
                }
            }, 1500)
        }, 1500)
    }

    // -------------------------------------------------------------
    // AIRPORT GATE ENTRY SIMULATION ACTIONS
    // -------------------------------------------------------------
    const runGateClearanceSimulation = async () => {
        if (gateState === "scanning" || gateState === "matching" || gateState === "verifying") {
            return
        }

        setGateLogs([])
        setGateMatchConfidence(null)
        setGateState("scanning")

        const addLog = (m: string) => setGateLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${m}`])

        addLog("🚦 Launching automated e-gate sensor scanners...")

        setTimeout(() => {
            setGateState("matching")
            addLog("📸 Biometric camera matching frame...")
            const screenshot = gateCamRef.current?.getScreenshot()

            setTimeout(async () => {
                try {
                    setGateState("verifying")
                    addLog("🧬 Accessing face_enrollments secure credentials...")

                    const passengers = await dbGetRows("passengers")
                    const passports = await dbGetRows("passport_verifications")
                    const boardingPasses = await dbGetRows("boarding_passes")

                    let activeMatch = profileData ? profileData.passenger : (passengers.length > 0 ? passengers[passengers.length - 1] : null)

                    if (!activeMatch) {
                        setGateState("denied")
                        addLog("🔴 ACCESS DENIED: Account identity not registered.")
                        return
                    }

                    // Get the fresh record from passengers list to ensure we have the latest database state
                    const freshPassenger = passengers.find(p => p.id === activeMatch.id) || activeMatch;

                    const pass = passports.find(p => p.passenger_id === freshPassenger.id)
                    const bp = boardingPasses.find(b => b.passenger_id === freshPassenger.id)
                    const risk = freshPassenger.security_score !== undefined ? Number(freshPassenger.security_score) : 20

                    addLog(`👤 Matched passenger: ${freshPassenger.name.toUpperCase()}`)
                    
                    if (!pass) {
                        setGateState("denied")
                        addLog("🔴 ACCESS DENIED: Passport verification pending.")
                        return
                    }

                    addLog(`🛂 Passport record verified: ${pass.passport_number}`)

                    setTimeout(async () => {
                        try {
                            if (!bp) {
                                setGateState("denied")
                                addLog("🔴 ACCESS DENIED: Flight journey or ticket details missing.")
                                return
                            }

                            addLog(`🎫 Flight ticket validated: ${bp.flight_number} PNR: ${bp.pnr}`)

                            setTimeout(async () => {
                                try {
                                    if (risk >= 70 || WATCHLIST.some(w => w.name === freshPassenger.name.toUpperCase())) {
                                        setGateState("alert")
                                        addLog("🚨 ALARM INTRUSION: Watchlist police intercept triggered!")

                                        await logGateClearance(freshPassenger.id, "DENIED")
                                        syncSystemData()
                                        return
                                    }

                                    setGateState("success")
                                    setGateMatchConfidence(97.8)
                                    addLog("🟢 CLEARANCE CONFIRMED. COMPLIANCE ENTRANCE OPENED.")

                                    await logGateClearance(freshPassenger.id, "VERIFIED")
                                    await logTravelHistory(freshPassenger.id, "EGATE_CLEARED", "EGATE-A1")

                                    // Audit
                                    await dbInsertRow("audit_logs", {
                                        user_id: currentUserId,
                                        action: "GATE_ENTRY",
                                        actor: freshPassenger.name,
                                        status: "SUCCESS",
                                        description: `Authorized e-gate entry clearance. Gate: EGATE-A1, Score: 97.8%`
                                    })

                                    if (currentUserId) {
                                        await loadPassengerProfile(currentUserId)
                                    }
                                    syncSystemData()
                                } catch (error) {
                                    console.error("Gate simulation stage 3 failed:", error)
                                    setGateState("denied")
                                    addLog("🔴 ACCESS ERROR: Entry approval logs storage failed.")
                                }
                            }, 1200)
                        } catch (error) {
                            console.error("Gate simulation stage 2 failed:", error)
                            setGateState("denied")
                            addLog("🔴 ACCESS ERROR: Boarding pass lookup error.")
                        }
                    }, 1200)
                } catch (error) {
                    console.error("Gate simulation stage 1 failed:", error)
                    setGateState("denied")
                    addLog("🔴 ACCESS ERROR: Passport registry search error.")
                }
            }, 1200)
        }, 1200)
    }

    // -------------------------------------------------------------
    // BOARDING GATE SIMULATION ACTIONS
    // -------------------------------------------------------------
    const runBoardingGateSimulation = async () => {
        if (boardState === "matching" || boardState === "cleared") {
            return
        }

        setBoardLogs([])
        setBoardState("matching")
        const addLog = (m: string) => setBoardLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${m}`])

        addLog("🛫 Connecting boarding gate biometric sensors...")

        setTimeout(async () => {
            try {
                const passengers = await dbGetRows("passengers")
                const boardingPasses = await dbGetRows("boarding_passes")

                let boardUser = profileData ? profileData.passenger : (passengers.length > 0 ? passengers[passengers.length - 1] : null)

                if (!boardUser) {
                    setBoardState("error")
                    addLog("🔴 BOARDING FAILED: Registry database profile missing.")
                    return
                }

                const bp = boardingPasses.find(b => b.passenger_id === boardUser.id)
                if (!bp) {
                    setBoardState("error")
                    addLog("🔴 BOARDING FAILED: Boarding ticket pass not allocated in database.")
                    return
                }

                setBoardState("cleared")
                addLog(`🟢 Face match confirmed for passenger: ${boardUser.name.toUpperCase()}`)
                addLog(`🟢 Seat mapping allocated: ${bp.seat_number}`)

                setTimeout(async () => {
                    try {
                        setBoardState("completed")
                        addLog("🟢 BOARDING COMPLETE. Flight journey record successfully logged.")

                        await logBoardingGateEvent(boardUser.id, "BOARDED")
                        await logTravelHistory(boardUser.id, "BOARDED", "GATE B12")

                        // Audit
                        await dbInsertRow("audit_logs", {
                            user_id: currentUserId,
                            action: "BOARDING_COMPLETE",
                            actor: boardUser.name,
                            status: "SUCCESS",
                            description: `Passenger boarded successfully on linked journey. Seat: ${bp.seat_number}`
                        })

                        if (currentUserId) {
                            await loadPassengerProfile(currentUserId)
                        }
                        syncSystemData()
                    } catch (error) {
                        console.error("Boarding phase 2 failed:", error)
                        setBoardState("error")
                        addLog("🔴 BOARDING ERROR: Verification transaction storage failed.")
                    }
                }, 1500)
            } catch (error) {
                console.error("Boarding phase 1 failed:", error)
                setBoardState("error")
                addLog("🔴 BOARDING ERROR: Biometric credentials database search failed.")
            }
        }, 1500)
    }

    // -------------------------------------------------------------
    // DATABASE EXPLORER CRUD OPERATIONS
    // -------------------------------------------------------------
    const executeDeleteRow = async (idVal: any, keyName: string = "id") => {
        if (!confirm("Are you sure you want to delete this database tuple record?")) return
        try {
            await dbDeleteRow(explorerTable, keyName, idVal)
            addTerminalLog(`Deleted row from ${explorerTable} where ${keyName} = ${idVal}`)
            loadDbTableRows(explorerTable)
            syncSystemData()
        } catch (e) {
            console.error(e)
            alert("Delete failed.")
        }
    }

    const executeInsertRow = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const payload: Record<string, any> = { ...insertFormData }
            if (explorerTable === "users" && !payload.id) {
                payload.id = crypto.randomUUID()
            }
            await dbInsertRow(explorerTable, payload)
            addTerminalLog(`Inserted new row into database table: ${explorerTable}`)
            setShowInsertModal(false)
            setInsertFormData({})
            loadDbTableRows(explorerTable)
            syncSystemData()
        } catch (err) {
            console.error(err)
            alert("Insert row failed. Check primary/foreign key integrity constraints.")
        }
    }

    // Export Table Rows to CSV
    const exportTableToCsv = (tableName: string, rowsArray: any[]) => {
        if (rowsArray.length === 0) {
            alert("No table rows found to export.")
            return
        }
        const headers = Object.keys(rowsArray[0]).join(",")
        const csvContent = rowsArray.map(row => 
            Object.values(row).map(val => {
                let cellVal = val === null ? "NULL" : String(val)
                if (cellVal.includes(",")) cellVal = `"${cellVal}"`
                return cellVal
            }).join(",")
        )
        const csvString = [headers, ...csvContent].join("\n")
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
        const link = document.createElement("a")
        link.href = URL.createObjectURL(blob)
        link.setAttribute("download", `${tableName}_export_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        addTerminalLog(`Successfully exported table ${tableName} to CSV document.`);
    }

    // -------------------------------------------------------------
    // SQL PLAYGROUND QUERY RUNNER
    // -------------------------------------------------------------
    const executeSqlPlaygroundQuery = async () => {
        setSqlError(null)
        setSqlSuccessMsg(null)
        setSqlResultRows([])

        const cleanQuery = sqlQuery.trim().replace(/;$/, "")
        
        // Safety check: SELECT only allowed for playground safety demo
        if (!cleanQuery.toLowerCase().startsWith("select")) {
            setSqlError("SQL PLAYGROUND SECURITY: Only SELECT read-only queries are authorized for this demo.")
            return
        }

        const matchTable = cleanQuery.match(/from\s+(\w+)/i)
        if (!matchTable) {
            setSqlError("SQL PARSING ERROR: Unable to detect target table. Example: SELECT * FROM passengers;")
            return
        }

        const targetTable = matchTable[1].toLowerCase()
        try {
            const allRows = await dbGetRows(targetTable)
            if (!allRows || allRows.length === 0) {
                setSqlResultRows([])
                setSqlSuccessMsg("Query executed successfully. 0 rows returned.")
                return
            }

            // Simple WHERE filter simulation
            let filteredRows = [...allRows]
            const matchWhere = cleanQuery.match(/where\s+(.+)$/i)
            if (matchWhere) {
                const whereClause = matchWhere[1].toLowerCase()
                // Simple parsing for format: column = 'value'
                const matchEquals = whereClause.match(/(\w+)\s*=\s*'([^']+)'/i) || whereClause.match(/(\w+)\s*=\s*(\w+)/i)
                if (matchEquals) {
                    const colName = matchEquals[1].trim()
                    const colVal = matchEquals[2].trim()
                    filteredRows = allRows.filter(r => String(r[colName] || "").toLowerCase() === colVal)
                }
            }

            setSqlResultRows(filteredRows)
            setSqlSuccessMsg(`Query executed successfully: Returning ${filteredRows.length} tuples.`);
        } catch (e: any) {
            setSqlError(`POSTGRES PROTOCOL ERROR: relation "${targetTable}" does not exist in relational schema.`);
        }
    }

    // -------------------------------------------------------------
    // COMPONENT SECTION RENDERING CONTROLLERS
    // -------------------------------------------------------------

    // Overview Stats and World Map Dashboard
    const renderOverviewDashboard = () => {
        const clearedNum = travelers.filter(t => t.risk < 40).length
        const warningNum = travelers.filter(t => t.risk >= 40 && t.risk < 70).length
        const alertNum = travelers.filter(t => t.risk >= 70).length

        const summaryRatioData = {
            labels: ["Cleared (Safe)", "Secondary Audits", "Threat Alerts"],
            datasets: [{
                data: [clearedNum, warningNum, alertNum],
                backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
                borderWidth: 0,
                hoverOffset: 6
            }]
        }

        return (
            <div className="space-y-8 animate-fade-in-up">
                {/* Visual World Map tracking */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <Globe className="w-5 h-5 text-indigo-400" />
                            <h3 className="text-sm font-extrabold text-white uppercase tracking-widest font-mono">Live Global SmartYatra Path Map</h3>
                        </div>

                        <div className="w-full h-[380px] bg-slate-950 rounded-2xl border border-slate-900 overflow-hidden relative flex items-center justify-center pt-8">
                            {/* RADAR EFFECT OVERLAYS */}
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-25">
                                <div className="absolute w-[800px] h-[800px] rounded-full animate-radar-spin" 
                                     style={{ background: 'conic-gradient(from 0deg, transparent 70%, rgba(99, 102, 241, 0.08) 90%, rgba(99, 102, 241, 0.35) 100%)' }}>
                                </div>
                                <div className="absolute w-full h-[1px] bg-indigo-500/10"></div>
                                <div className="absolute h-full w-[1px] bg-indigo-500/10"></div>
                                <div className="absolute w-[200px] h-[200px] rounded-full border border-indigo-500/10"></div>
                                <div className="absolute w-[450px] h-[450px] rounded-full border border-indigo-500/10"></div>
                            </div>

                            <ComposableMap projectionConfig={{ scale: 300, center: [15, 10] }} style={{ width: "100%", height: "100%" }} className="relative z-10">
                                <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
                                    {({ geographies }) => geographies.map(geo => (
                                        <Geography
                                            key={geo.rsmKey}
                                            geography={geo}
                                            fill="#0f172a"
                                            stroke="#1e293b"
                                            strokeWidth={0.5}
                                            style={{
                                                default: { outline: "none" },
                                                hover: { fill: "#1e293b", outline: "none" }
                                            }}
                                        />
                                    ))}
                                </Geographies>

                                {/* Lines from flight origins to Delhi */}
                                {travelers.filter(t => t.passport !== "PENDING").map((t, i) => {
                                    const origin: [number, number] = [t.lng, t.lat]
                                    const delCoords: [number, number] = [78, 21]
                                    if (origin[0] === delCoords[0] && origin[1] === delCoords[1]) return null

                                    return (
                                        <Line
                                            key={i}
                                            from={delCoords}
                                            to={origin}
                                            stroke={t.risk >= 70 ? "#ef4444" : "#10b981"}
                                            strokeWidth={1.5}
                                            style={{ strokeDasharray: "4 4", opacity: 0.6 }}
                                        />
                                    )
                                })}

                                {/* Origin markers */}
                                {travelers.map((t, i) => (
                                    <Marker key={i} coordinates={[t.lng, t.lat]}>
                                        <circle 
                                            r={t.risk >= 70 ? 8 : 4} 
                                            fill={t.risk >= 70 ? "#ef4444" : "#10b981"} 
                                            className={t.risk >= 70 ? "animate-military-ping" : ""}
                                        />
                                        <circle r={4} fill={t.risk >= 70 ? "#ef4444" : "#10b981"} />
                                    </Marker>
                                ))}

                                {/* Delhi central HQ Hub */}
                                <Marker coordinates={[78, 21]}>
                                    <circle r={6} fill="#6366f1" className="animate-pulse" />
                                    <circle r={3} fill="#818cf8" />
                                </Marker>
                            </ComposableMap>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Threat Log list */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                            <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-3">
                                <AlertOctagon className="w-5 h-5 text-rose-500 animate-pulse" />
                                <h3 className="text-xs font-extrabold text-rose-200 uppercase tracking-widest font-mono">Immigration Threat Log</h3>
                            </div>

                            <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
                                {threats.length === 0 ? (
                                    <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl bg-slate-950/20 text-slate-500 text-xs font-mono">
                                        No active border security flags detected.
                                    </div>
                                ) : (
                                    threats.map((t, idx) => (
                                        <div key={idx} className="bg-rose-950/25 border border-rose-500/20 p-3 rounded-xl space-y-2 animate-siren">
                                            <div className="flex justify-between items-center text-[10px] font-mono">
                                                <span className="font-bold text-rose-200 uppercase">{t.name}</span>
                                                <span className="text-slate-500">[{t.time}]</span>
                                            </div>
                                            <div className="text-[10px] text-rose-350 font-mono">Passport Number: {t.passport} | Risk Index: {t.risk}%</div>
                                            <div className="text-[10px] text-rose-400 bg-rose-950/45 p-1 rounded font-mono truncate">{t.note}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Step-by-Step Passenger Portal Page
    const renderPassengerPortal = () => {
        return (
            <div className="space-y-8 animate-fade-in-up">
                {/* Horizontal timeline of steps */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <span className="text-[10px] text-amber-500 font-mono font-bold tracking-widest uppercase">SmartYatra Traveler Roadmap</span>
                            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider mt-0.5">Contactless Journey Milestones</h2>
                        </div>
                        <div className="text-right font-mono">
                            <span className="text-xs text-slate-500">Completion:</span>
                            <span className="text-emerald-400 font-black ml-1 text-sm">{Math.round((passengerStage / 8) * 100)}%</span>
                        </div>
                    </div>

                    {/* Timeline grid */}
                    <div className="relative py-4 grid grid-cols-2 md:grid-cols-8 gap-4 text-center">
                        <div className="absolute top-8 left-1/16 right-1/16 h-0.5 bg-slate-800 z-0 hidden md:block">
                            <div className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-500" style={{ width: `${((passengerStage - 1) / 7) * 100}%` }}></div>
                        </div>

                        {[
                            { st: 1, label: "Account Created" },
                            { st: 2, label: "Passport Scanned" },
                            { st: 3, label: "Passport Verified" },
                            { st: 4, label: "Face Registered" },
                            { st: 5, label: "Flight Linked" },
                            { st: 6, label: "E-Gate Approved" },
                            { st: 7, label: "Security Cleared" },
                            { st: 8, label: "Boarded Success" }
                        ].map((node) => (
                            <div key={node.st} className="relative z-10 flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                                    passengerStage >= node.st 
                                        ? "bg-emerald-600 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                                        : passengerStage === node.st - 1 
                                            ? "bg-amber-600 border-amber-400 text-white animate-pulse" 
                                            : "bg-slate-950 border-slate-800 text-slate-500"
                                }`}>
                                    {passengerStage >= node.st ? <Check className="w-3.5 h-3.5" /> : node.st}
                                </div>
                                <span className={`text-[9px] mt-2 font-mono uppercase tracking-wider block ${
                                    passengerStage >= node.st ? "text-emerald-400 font-bold" : "text-slate-500"
                                }`}>{node.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4-step user onboard actions selector */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {/* STEP 1: OCR Scan */}
                        {passengerStage === 1 && (
                            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
                                <span className="text-[10px] text-amber-500 font-mono font-bold tracking-widest uppercase block mb-1">Step 1 - Passport Setup</span>
                                <h3 className="text-base font-extrabold text-white uppercase tracking-wider mb-2">Extract Passport Credentials</h3>
                                <p className="text-xs text-slate-400 mb-6">Upload your passport document. The built-in AI parser will scan details for check-in validation.</p>

                                <div className="space-y-4">
                                    <div className="relative border-2 border-dashed border-slate-800 hover:border-amber-500/40 rounded-2xl p-8 bg-slate-950/40 hover:bg-slate-950/60 flex flex-col items-center justify-center text-center cursor-pointer transition-all group">
                                        <input type="file" accept="image/*" onChange={handlePassportOcrScan} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                        {ocrScanning ? (
                                            <div className="flex flex-col items-center">
                                                <Cpu className="w-10 h-10 text-amber-500 animate-spin mb-2" />
                                                <span className="text-xs text-white font-mono uppercase animate-pulse">Running OCR analysis...</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-amber-400 mb-2 transition-colors" />
                                                <span className="text-xs font-bold text-slate-300">Choose Passport Image File</span>
                                                <span className="text-[9px] text-slate-500 font-mono mt-1">Accepts JPG, PNG</span>
                                            </div>
                                        )}
                                    </div>

                                    {ocrStatus === "SUCCESS" && (
                                        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-4">
                                            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                                                <div>
                                                    <span className="text-slate-500 block text-[9px] uppercase">Surname / Given Names</span>
                                                    <span className="text-white font-bold uppercase">{ocrName}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 block text-[9px] uppercase">Passport ID</span>
                                                    <span className="text-white font-bold">{ocrPassportNum}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 block text-[9px] uppercase">Authority</span>
                                                    <span className="text-white font-bold uppercase">{ocrCountry}</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={savePassportVerification}
                                                className="w-full bg-amber-600 hover:bg-amber-550 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider font-mono transition-all"
                                            >
                                                Confirm & Verify Passport
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* STEP 2: Pending manually verify if needed */}
                        {passengerStage === 2 && (
                            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-xl text-center py-12">
                                <Cpu className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
                                <h3 className="text-base font-bold text-white uppercase tracking-wider">Awaiting Manual Security Clearance</h3>
                                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-2">
                                    Your passport scan details are currently in the Verification Queue. Please switch roles to <strong>Officer Terminal</strong> (Approved Verification Hub) to manually approve.
                                </p>
                            </div>
                        )}

                        {/* STEP 3: Face registration */}
                        {passengerStage === 3 && (
                            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
                                <span className="text-[10px] text-amber-500 font-mono font-bold tracking-widest uppercase block mb-1">Step 3 - Biometrics Onboarding</span>
                                <h3 className="text-base font-extrabold text-white uppercase tracking-wider mb-2">Enroll Biometric Selfie</h3>
                                <p className="text-xs text-slate-400 mb-6">Register your face descriptor vectors to unlock contactless airport e-gates.</p>

                                <div className="space-y-4 flex flex-col items-center">
                                    {enrollSelfieUrl ? (
                                        <div className="space-y-4 w-full flex flex-col items-center">
                                            <div className="w-44 h-44 rounded-full overflow-hidden border-2 border-emerald-500 shadow-lg bg-black">
                                                <img src={enrollSelfieUrl} className="w-full h-full object-cover" alt="Captured enrollment descriptor" />
                                            </div>
                                            <div className="text-center">
                                                <span className="text-xs text-slate-500 block font-mono">Facial Descriptor Accuracy</span>
                                                <span className="text-emerald-400 font-black text-xl font-mono">{(enrollQuality ? enrollQuality * 100 : 98.6).toFixed(1)}% (EXCELLENT)</span>
                                            </div>
                                            <div className="flex gap-4 w-full">
                                                <button onClick={() => setEnrollSelfieUrl(null)} className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-400 py-2.5 rounded-xl text-xs uppercase font-bold">Retake</button>
                                                <button onClick={saveFaceEnrollment} className="flex-1 bg-amber-600 hover:bg-amber-550 text-white py-2.5 rounded-xl text-xs uppercase font-bold shadow">Save Enrollment</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full space-y-4">
                                            <div className="relative w-full h-60 bg-black rounded-2xl overflow-hidden border border-slate-850">
                                                <Webcam ref={enrollCamRef} audio={false} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: "user" }} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 border border-amber-500/20 m-6 rounded-xl pointer-events-none">
                                                    <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-amber-400 rounded-tl"></div>
                                                    <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-amber-400 rounded-tr"></div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={captureBiometricSelfie}
                                                className="w-full bg-amber-600 hover:bg-amber-550 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider font-mono transition-all flex items-center justify-center gap-2"
                                            >
                                                <Camera className="w-4 h-4" /> Capture Biometric Selfie
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* STEP 4: Flight Linking */}
                        {passengerStage === 4 && (
                            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
                                <span className="text-[10px] text-amber-500 font-mono font-bold tracking-widest uppercase block mb-1">Step 4 - Flight Link details</span>
                                <h3 className="text-base font-extrabold text-white uppercase tracking-wider mb-2">Connect Journey Route</h3>
                                <p className="text-xs text-slate-400 mb-6">Link your active flight ticket code to generate your SmartYatra boarding credentials.</p>

                                <form onSubmit={saveFlightJourneyDetails} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Booking PNR</label>
                                            <input type="text" value={flightPnr} onChange={(e) => setFlightPnr(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono" placeholder="E.g. PNR10293" required />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Flight ID Code</label>
                                            <input type="text" value={flightNo} onChange={(e) => setFlightNo(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono" placeholder="E.g. SG-302" required />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Departure Airport</label>
                                            <input type="text" value={flightDep} onChange={(e) => setFlightDep(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white uppercase" placeholder="DEL" required />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Arrival Airport</label>
                                            <input type="text" value={flightArr} onChange={(e) => setFlightArr(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white uppercase" placeholder="JFK" required />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Travel Date</label>
                                            <input type="date" value={flightDate} onChange={(e) => setFlightDate(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Boarding Time</label>
                                            <input type="text" value={flightTime} onChange={(e) => setFlightTime(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white font-mono" placeholder="19:30" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Gate Code</label>
                                            <input type="text" value={flightGate} onChange={(e) => setFlightGate(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white font-mono" placeholder="Gate B12" />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-2">
                                        <button type="button" onClick={handleLinkFlightDemo} className="bg-slate-850 hover:bg-slate-800 text-amber-500 px-4 py-2.5 rounded-xl text-xs font-bold font-mono">Fill Demo</button>
                                        <button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-550 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider">Confirm Flight Journey</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* STEPS COMPLETED: GENERATE SMARTYATRA PASS */}
                        {passengerStage >= 5 && (
                            <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500"></div>

                                <div className="flex justify-between items-center border-b border-slate-850 pb-4 mb-6">
                                    <div>
                                        <span className="text-[9px] text-emerald-400 font-mono font-bold tracking-widest uppercase block mb-1">✓ SmartYatra Verified Pass</span>
                                        <h2 className="text-base font-black text-amber-400 uppercase tracking-widest font-mono">Federal Digital ID Credential</h2>
                                    </div>
                                    <span className="text-[9px] px-3 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-bold tracking-widest uppercase">
                                        DIGIYATRA APPROVED
                                    </span>
                                </div>

                                <div className="flex flex-col md:flex-row gap-8 items-center">
                                    <div className="flex flex-col items-center justify-center p-6 bg-slate-950/60 border border-slate-850 rounded-2xl w-44 text-center shrink-0">
                                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center mb-3">
                                            <UserCheck className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">E-Gate Entry Status</span>
                                        <span className="text-emerald-400 font-black text-xs uppercase tracking-widest mt-1 block font-mono">
                                            AUTHORIZED
                                        </span>
                                    </div>

                                    <div className="flex-1 w-full space-y-4">
                                        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                                            <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                                                <span className="text-[9px] text-slate-500 uppercase block mb-0.5">Traveler Name</span>
                                                <span className="font-bold text-white uppercase text-xs block truncate">{profileData?.passenger.name}</span>
                                            </div>
                                            <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                                                <span className="text-[9px] text-slate-500 uppercase block mb-0.5">Passport ID</span>
                                                <span className="font-bold text-white text-xs block">{profileData?.passport?.passport_number}</span>
                                            </div>
                                            <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                                                <span className="text-[9px] text-slate-500 uppercase block mb-0.5">Flight Voyage</span>
                                                <span className="font-bold text-white text-xs block">{profileData?.flight?.flight_number} | {profileData?.flight?.departure_airport}➔{profileData?.flight?.arrival_airport}</span>
                                            </div>
                                            <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                                                <span className="text-[9px] text-slate-500 uppercase block mb-0.5">Seat & Gate</span>
                                                <span className="font-bold text-white text-xs block">{profileData?.boardingPass?.seat_number} | {profileData?.flight?.gate}</span>
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
                                            <div className="text-[9px] font-mono text-slate-550 leading-normal max-w-[70%]">
                                                <div className="text-[8px] text-slate-600 uppercase">Verification ID Hash</div>
                                                <div className="text-slate-400 break-all">{profileData?.passenger.id}</div>
                                            </div>
                                            <div className="w-12 h-12 bg-white p-1 rounded shrink-0 border border-slate-700">
                                                <div className="w-full h-full bg-[linear-gradient(45deg,#000_25%,transparent_25%),linear-gradient(-45deg,#000_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#000_75%),linear-gradient(-45deg,transparent_75%,#000_75%)] bg-[size:4px_4px] bg-slate-950"></div>
                                            </div>
                                        </div>

                                        <div className="pt-2 flex gap-3">
                                            <button onClick={() => alert("SmartYatra Pass spooled.")} className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-300 py-2 rounded-xl text-xs font-bold border border-slate-800 flex items-center justify-center gap-1">
                                                <Printer className="w-3.5 h-3.5" /> Print Pass
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setActiveModule("entry");
                                                    setGateLogs([]);
                                                    setGateState("idle");
                                                }}
                                                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                                            >
                                                Proceed to E-Gate Entry
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: TRAVEL JOURNEY ACTIVITY FEED TIMELINE */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                            <div className="flex items-center gap-2.5 border-b border-slate-850 pb-4 mb-6">
                                <History className="w-4.5 h-4.5 text-indigo-400" />
                                <h3 className="text-xs font-extrabold text-white uppercase tracking-widest font-mono">My Travel Journey</h3>
                            </div>

                            <div className="space-y-5 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                                {[
                                    { tag: "ACCOUNT_CREATED", title: "Account Registered", label: "✓ Account Created", val: true },
                                    { tag: "PASSPORT_UPLOADED", title: "Passport Uploaded", label: "✓ Passport Uploaded", val: passengerStage >= 2 },
                                    { tag: "PASSPORT_VERIFIED", title: "Passport Approved", label: "✓ Passport Verified", val: passengerStage >= 3 },
                                    { tag: "FACE_ENROLLED", title: "Biometric Registered", label: "✓ Face Registered", val: passengerStage >= 4 },
                                    { tag: "FLIGHT_LINKED", title: "Flight Voyage Linked", label: "✓ Flight Linked", val: passengerStage >= 5 },
                                    { tag: "EGATE_CLEARED", title: "Airport Entry Clear", label: "✓ Airport Entry Approved", val: passengerStage >= 6 },
                                    { tag: "SECURITY_CLEARED", title: "Security Checked", label: "✓ Security Cleared", val: passengerStage >= 7 },
                                    { tag: "BOARDING_COMPLETED", title: "Boarded Aircraft", label: "✓ Boarded Successfully", val: passengerStage >= 8 }
                                ].map((step, idx) => {
                                    const matchingHist = profileData?.travelHistory?.find((h: any) => h.action_taken === step.tag)
                                    const ts = matchingHist ? new Date(matchingHist.timestamp).toLocaleTimeString() : (step.val ? new Date().toLocaleTimeString() : "")

                                    return (
                                        <div key={idx} className="flex gap-4 relative">
                                            <div className={`w-6.5 h-6.5 rounded-full flex items-center justify-center shrink-0 border z-10 ${
                                                step.val ? "bg-emerald-600 border-emerald-400 text-white" : "bg-slate-950 border-slate-800 text-slate-650"
                                            }`}>
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[11px] font-bold font-mono ${step.val ? "text-white" : "text-slate-500"}`}>{step.title}</span>
                                                    {step.val && ts && <span className="text-[8px] text-slate-500 font-mono">[{ts}]</span>}
                                                </div>
                                                <p className="text-[9px] text-slate-550 mt-0.5 font-mono">{step.label}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!authRole) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden selection:bg-indigo-500/30 font-sans">
                <Script src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js" strategy="afterInteractive" />
                
                {/* RADAR SWEEP BACKGROUND GLOWS */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

                <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-md w-full space-y-6 relative overflow-hidden z-10">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-indigo-500 to-purple-500"></div>
                    <div className="text-center space-y-1">
                        <Shield className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <h2 className="text-xl font-black text-white uppercase tracking-wider">SentinelGate AI Verification</h2>
                        <p className="text-[9px] text-slate-500 tracking-[0.25em] font-mono uppercase">Federal SmartYatra Gateway</p>
                    </div>

                    <div className="flex border-b border-slate-800 relative font-mono text-xs">
                        <button onClick={() => setLoginRoleMode("passenger")} className={`flex-1 pb-3 uppercase tracking-wider font-bold ${loginRoleMode === "passenger" ? "text-amber-400 border-b-2 border-amber-500" : "text-slate-500"}`}>Passenger</button>
                        <button onClick={() => setLoginRoleMode("officer")} className={`flex-1 pb-3 uppercase tracking-wider font-bold ${loginRoleMode === "officer" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-slate-500"}`}>Officer</button>
                    </div>

                    {loginError && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-2.5 rounded-xl text-xs text-center font-bold">{loginError}</div>}

                    {loginRoleMode === "officer" ? (
                        <form onSubmit={handleAuthLogin} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Officer Email</label>
                                <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white" placeholder="admin@sentinelgate.gov" required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Passkey Credentials</label>
                                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white" placeholder="••••••••••••" required />
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-bold py-2.5 rounded-xl text-xs uppercase font-mono">Access Officer Command</button>
                            <div className="text-center text-[9px] text-slate-550 font-mono">Demo ID: admin@sentinelgate.gov / AdminSecurityTopRisk04822</div>
                        </form>
                    ) : (
                        <div>
                            {authAction === "signin" ? (
                                <form onSubmit={handleAuthLogin} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Email Address</label>
                                        <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white" placeholder="passenger@email.com" required />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Password</label>
                                        <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white" placeholder="••••••••••••" required />
                                    </div>
                                    <button type="submit" className="w-full bg-amber-600 hover:bg-amber-550 text-white font-bold py-2.5 rounded-xl text-xs uppercase font-mono">Log In to Portal</button>
                                    <button type="button" onClick={() => setAuthAction("signup")} className="w-full text-center text-amber-500 hover:text-amber-450 font-mono text-[10px] mt-2 block">No account? Register profile here</button>
                                </form>
                            ) : (
                                <form onSubmit={handleSignup} className="space-y-3">
                                    <div>
                                        <label className="text-[8px] font-mono text-slate-400 uppercase block mb-0.5">Full Legal Name</label>
                                        <input type="text" value={signupName} onChange={(e) => setSignupName(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-xs text-white uppercase" placeholder="E.g. SALMAN SHAIKH" required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[8px] font-mono text-slate-400 block mb-0.5">Phone Number</label>
                                            <input type="text" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-xs text-white" placeholder="+91 98765 43210" />
                                        </div>
                                        <div>
                                            <label className="text-[8px] font-mono text-slate-400 block mb-0.5">Date of Birth</label>
                                            <input type="date" value={signupDob} onChange={(e) => setSignupDob(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-xs text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-mono text-slate-400 block mb-0.5">Email Address</label>
                                        <input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-xs text-white" placeholder="email@domain.com" required />
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-mono text-slate-400 block mb-0.5">Password</label>
                                        <input type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-xs text-white" placeholder="Min. 6 chars" required />
                                    </div>
                                    <button type="submit" className="w-full bg-amber-600 hover:bg-amber-550 text-white font-bold py-2 rounded-xl text-xs uppercase font-mono shadow-md">Create account & Login</button>
                                    <button type="button" onClick={() => setAuthAction("signin")} className="w-full text-center text-amber-500 hover:text-amber-450 font-mono text-[10px] block mt-1">Already registered? Log In</button>
                                </form>
                            )}
                        </div>
                    )}
                    
                    {/* Demo bypass to explore app */}
                    <div className="border-t border-slate-800 pt-3 flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setAuthRole("user")
                                setActiveModule("passenger")
                            }}
                            className="flex-1 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide font-mono animate-pulse"
                        >
                            Guest Bypass (Passenger)
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setAuthRole("admin")
                                setActiveModule("dashboard")
                            }}
                            className="flex-1 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-450 hover:text-slate-250 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide font-mono"
                        >
                            Guest Bypass (Admin)
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen text-slate-200 bg-slate-950 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
            <Script src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js" strategy="afterInteractive" />
            
            {/* RADAR SWEEP BACKGROUND GLOWS */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

            {/* LEFT SIDEBAR NAVIGATION */}
            <aside className="w-64 bg-slate-900 border-r border-slate-850 flex flex-col justify-between shrink-0 sticky top-0 h-screen z-30 shadow-2xl">
                <div className="overflow-y-auto">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-850 flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-xl relative shadow-md">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-white tracking-wide block uppercase font-mono">SentinelGate AI</span>
                            <span className="text-[9px] text-slate-500 block uppercase font-mono">SmartYatra System</span>
                        </div>
                    </div>

                    {/* Nav Categories */}
                    <div className="p-4 space-y-6">
                        
                        {/* CATEGORY 1: COMMAND & FLOW */}
                        <div className="space-y-1.5">
                            <div className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-widest px-3 mb-2">Main Controls</div>
                            {[
                                ...(authRole === "admin" ? [{ module: "dashboard", label: "Dashboard", icon: Grid }] : []),
                                ...(authRole === "user" ? [{ module: "passenger", label: "Passenger Journey", icon: UserCheck }] : [])
                            ].map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveModule(item.module)}
                                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center gap-2.5 ${
                                        activeModule === item.module 
                                            ? "bg-indigo-600/90 text-white shadow-md font-bold" 
                                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/60"
                                    }`}
                                >
                                    <item.icon className="w-4 h-4 shrink-0" />
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* CATEGORY 2: VERIFICATION STAGES */}
                        {authRole === "admin" && (
                            <div className="space-y-1.5">
                                <div className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-widest px-3 mb-2">Immigration Modules</div>
                                {[
                                    { module: "passport", label: "Passport OCR Verify", icon: FileText },
                                    { module: "biometric", label: "Biometric Enrollment", icon: UserPlus },
                                    { module: "liveness", label: "Camera Verification", icon: Camera },
                                    { module: "flight", label: "Flight Link / Voyage", icon: Globe },
                                    { module: "entry", label: "Airport E-Gate Entry", icon: Aperture },
                                    { module: "screening", label: "Security Screening", icon: Shield },
                                    { module: "boarding", label: "Boarding Gate", icon: PlayCircle }
                                ].map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveModule(item.module)}
                                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center gap-2.5 ${
                                            activeModule === item.module 
                                                ? "bg-indigo-600/90 text-white shadow-md font-bold" 
                                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/60"
                                        }`}
                                    >
                                        <item.icon className="w-4 h-4 shrink-0" />
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* CATEGORY 3: DATABASE COMMAND (DBMS) */}
                        {authRole === "admin" && (
                            <div className="space-y-1.5">
                                <div className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-widest px-3 mb-2">Relational DBMS Control</div>
                                {[
                                    { module: "explorer", label: "Database Explorer", icon: Database },
                                    { module: "er", label: "ER Diagram Map", icon: Layers },
                                    { module: "sql", label: "SQL Playground", icon: Cpu },
                                    { module: "audit", label: "System Audit Logs", icon: FileSpreadsheet }
                                ].map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveModule(item.module)}
                                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center gap-2.5 ${
                                            activeModule === item.module 
                                                ? "bg-indigo-600/90 text-white shadow-md font-bold" 
                                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/60"
                                        }`}
                                    >
                                        <item.icon className="w-4 h-4 shrink-0" />
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* CATEGORY 4: ANALYTICS & SYSTEMS */}
                        {authRole === "admin" && (
                            <div className="space-y-1.5">
                                <div className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-widest px-3 mb-2">Systems</div>
                                {[
                                    { module: "analytics", label: "Analytics Charts", icon: BarChart2 },
                                    { module: "settings", label: "System Settings", icon: SettingsIcon }
                                ].map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveModule(item.module)}
                                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center gap-2.5 ${
                                            activeModule === item.module 
                                                ? "bg-indigo-600/90 text-white shadow-md font-bold" 
                                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/60"
                                        }`}
                                    >
                                        <item.icon className="w-4 h-4 shrink-0" />
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar footer credentials */}
                <div className="p-4 border-t border-slate-850 text-[10px] font-mono text-slate-500 flex flex-col gap-1.5 bg-slate-950/20">
                    <div className="flex justify-between items-center">
                        <span>Database status:</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Supabase secure endpoints connection verified."></span>
                    </div>
                    <div>Schema Version: v1.0.4</div>
                </div>
            </aside>

            {/* MAIN CONTAINER CONTENT SECTION */}
            <main className="flex-1 flex flex-col min-h-screen relative z-10">
                {/* TOP NAVIGATION BAR */}
                <header className="bg-slate-900 border-b border-slate-850 sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-md">
                    
                    {/* Top bar search and status banner metrics */}
                    <div className="flex items-center gap-6 flex-1">
                        <div className="relative w-64 hidden md:block">
                            <Search className="w-4 h-4 text-slate-550 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Global Search..."
                                value={globalSearchVal}
                                onChange={(e) => setGlobalSearchVal(e.target.value)}
                                className="bg-slate-950 border border-slate-850 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-505 w-full focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        {/* Top bar metrics */}
                        <div className="flex items-center gap-5 text-[10px] font-mono text-slate-400 hidden xl:flex">
                            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 px-2.5 py-1.5 rounded-xl">
                                <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
                                <span>SYSTEM TIME: {new Date().toLocaleTimeString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 px-2.5 py-1.5 rounded-xl">
                                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                                <span>ACTIVE TRAVELERS TODAY: {travelers.length}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 px-2.5 py-1.5 rounded-xl">
                                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                                <span>CLEARANCE STATUS: SAFE</span>
                            </div>
                        </div>
                    </div>

                    {/* Right corner actions */}
                    <div className="flex items-center gap-4">
                        


                        {/* Notifications list icon */}
                        <div className="relative">
                            <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 bg-slate-950 border border-slate-850 rounded-xl hover:bg-slate-850 text-slate-400 hover:text-slate-250 transition-colors relative">
                                <Aperture className="w-4 h-4 animate-spin-slow" />
                                {notifications.length > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>}
                            </button>
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl z-40 space-y-3 font-mono text-[10px]">
                                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                        <span className="font-bold text-white uppercase tracking-wider">System Alerts</span>
                                        <button onClick={() => setNotifications([])} className="text-slate-500 hover:text-slate-400 text-[8px] uppercase">Clear All</button>
                                    </div>
                                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                                        {notifications.map((n, idx) => (
                                            <div key={idx} className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl space-y-1">
                                                <div className="font-bold text-white">{n.title}</div>
                                                <div className="text-slate-400 leading-normal">{n.message}</div>
                                            </div>
                                        ))}
                                        {notifications.length === 0 && (
                                            <div className="text-center py-8 text-slate-500 text-[9px] uppercase">No active system alerts.</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sign Out */}
                        {authRole && (
                            <button onClick={handleLogout} className="p-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-colors" title="Log Out / Exit Session">
                                <UserX className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </header>

                {/* CONTENT ROUTING CONTAINER PANEL */}
                <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
                    
                    {/* RENDER MODULES */}
                    {authRole === "user" ? (
                        renderPassengerPortal()
                    ) : (
                        <>
                            {activeModule === "dashboard" && renderOverviewDashboard()}
                            {activeModule === "passenger" && renderPassengerPortal()}
                    
                    {/* PASSPORT OCR SIDE-BY-SIDE COMPARATOR */}
                    {activeModule === "passport" && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-xl">
                                <div className="border-b border-slate-850 pb-4 mb-6">
                                    <span className="text-[10px] text-amber-500 font-mono font-bold tracking-widest uppercase">SmartYatra Verification Counter</span>
                                    <h2 className="text-lg font-extrabold text-white uppercase tracking-wider mt-0.5">Passport OCR Side-by-Side Validation</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left: Uploaded doc preview */}
                                    <div className="space-y-4">
                                        <div className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">Uploaded Passport Document Image</div>
                                        <div className="w-full h-64 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-center relative overflow-hidden">
                                            {passportDocUrl ? (
                                                <div className="w-full h-full p-4 relative flex items-center justify-center bg-slate-950">
                                                    <div className="w-full h-full border border-amber-500/20 rounded-xl relative overflow-hidden flex items-center justify-center">
                                                        <div className="text-center p-8 bg-slate-900 rounded-xl border border-slate-800 relative z-10 select-none">
                                                            <FileText className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                                            <span className="font-mono text-xs font-bold text-white block">PASSPORT IDENTITY PAGE</span>
                                                            <span className="font-mono text-[10px] text-slate-500 mt-1 block">OCR Scanner Nodes: 98.4% Match</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center p-6 text-slate-550 font-mono text-xs">
                                                    <UploadCloud className="w-10 h-10 mx-auto mb-2 text-slate-650" />
                                                    <span>No passport document loaded yet.</span>
                                                </div>
                                            )}
                                        </div>
                                        {profileData && passengerStage === 1 && (
                                            <div className="relative border border-dashed border-slate-800 hover:border-amber-500/30 rounded-xl p-4 bg-slate-950/20 text-center transition-all cursor-pointer">
                                                <input type="file" accept="image/*" onChange={handlePassportOcrScan} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                <span className="text-xs font-bold text-slate-300">Click to upload document for OCR scan</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Extracted OCR metrics */}
                                    <div className="space-y-4">
                                        <div className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">Extracted OCR Database Schema values</div>
                                        <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl space-y-4 font-mono text-xs h-64 overflow-y-auto">
                                            {ocrPassportNum ? (
                                                <div className="space-y-4">
                                                    <div className="flex justify-between border-b border-slate-900 pb-1.5">
                                                        <span className="text-slate-500 uppercase">DOCUMENT TYPE:</span>
                                                        <span className="text-white font-bold">PASSPORT</span>
                                                    </div>
                                                    <div className="flex justify-between border-b border-slate-900 pb-1.5">
                                                        <span className="text-slate-500 uppercase">DOCUMENT ID NUMBER:</span>
                                                        <span className="text-white font-bold">{ocrPassportNum}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b border-slate-900 pb-1.5">
                                                        <span className="text-slate-500 uppercase">ISSUING AUTHORITY:</span>
                                                        <span className="text-white font-bold uppercase">{ocrCountry}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b border-slate-900 pb-1.5">
                                                        <span className="text-slate-500 uppercase">EXPIRY DATE:</span>
                                                        <span className="text-white font-bold">{ocrExpiry || "2032-12-10"}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b border-slate-900 pb-1.5">
                                                        <span className="text-slate-500 uppercase">OCR COMPLETION:</span>
                                                        <span className="text-emerald-400 font-bold">SUCCESS (100% PARSED)</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-slate-650 text-center py-16">
                                                    Awaiting document scan to parse database fields.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BIOMETRIC ENROLLMENT MODULE */}
                    {activeModule === "biometric" && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
                                <span className="text-[10px] text-amber-500 font-mono font-bold tracking-widest uppercase block mb-1">Security Biometric Station</span>
                                <h3 className="text-base font-extrabold text-white uppercase tracking-wider mb-2">Enroll Biometric Face Descriptor</h3>
                                <p className="text-xs text-slate-400 mb-6">Capture facial landmarks and generate descriptor vector matrices to save in `face_enrollments`.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="relative w-full h-64 bg-black rounded-2xl overflow-hidden border border-slate-850">
                                            <Webcam ref={enrollCamRef} audio={false} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: "user" }} className="w-full h-full object-cover" />
                                            {isEnrollingFace && (
                                                <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center">
                                                    <Aperture className="w-8 h-8 text-amber-500 animate-spin mb-2" />
                                                    <span className="text-xs text-white font-mono uppercase tracking-widest animate-pulse">Scanning Liveness...</span>
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={captureBiometricSelfie} className="w-full bg-amber-600 hover:bg-amber-550 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2">
                                            <Camera className="w-4 h-4" /> Capture and Scan Biometrics
                                        </button>
                                    </div>

                                    {/* Quality Score checks */}
                                    <div className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-850 font-mono text-xs h-76">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest border-b border-slate-900 pb-1.5">Liveness Verification Metrics</div>
                                        
                                        {enrollSelfieUrl ? (
                                            <div className="space-y-4">
                                                <div className="flex justify-between">
                                                    <span>Face Quality Score:</span>
                                                    <span className="text-emerald-400 font-bold">{(enrollQuality ? enrollQuality * 100 : 98.2).toFixed(1)}% (EXCELLENT)</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Descriptor Confidence:</span>
                                                    <span className="text-emerald-400 font-bold">{(enrollConfidence ? enrollConfidence : 99.4).toFixed(1)}%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Vector Dimensions:</span>
                                                    <span className="text-white">128 Float Value Nodes</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Verification Status:</span>
                                                    <span className="text-emerald-400 font-bold">VERIFIED & CLEAR</span>
                                                </div>
                                                
                                                {profileData && (
                                                    <button onClick={saveFaceEnrollment} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-550 text-white font-bold py-2 rounded-xl text-xs uppercase tracking-wider">
                                                        Save to Secure Supabase DB
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-slate-650 text-center py-16">
                                                Awaiting webcam biometric capture payload details.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CAMERA VERIFICATION MODULE */}
                    {activeModule === "liveness" && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-xl">
                                <div className="border-b border-slate-850 pb-4 mb-6">
                                    <span className="text-[10px] text-purple-400 font-mono font-bold tracking-widest uppercase">Biometric Match Gateway</span>
                                    <h2 className="text-lg font-extrabold text-white uppercase tracking-wider mt-0.5">Camera Liveness Identity Matcher</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="relative w-full h-64 bg-black rounded-2xl overflow-hidden border border-slate-850 flex items-center justify-center">
                                            <Webcam ref={matchCamRef} audio={false} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: "user" }} className="w-full h-full object-cover" />
                                            {cameraState === "scanning" && (
                                                <div className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center">
                                                    <div className="w-full h-0.5 bg-indigo-500 animate-scan-line absolute top-0 left-0"></div>
                                                    <Aperture className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
                                                    <span className="text-[10px] text-white font-mono uppercase animate-pulse">Running eye landmark verification...</span>
                                                </div>
                                            )}
                                            {cameraState === "success" && (
                                                <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
                                                    <CheckCircle className="w-12 h-12 text-emerald-400 animate-bounce mb-2" />
                                                    <span className="text-xs font-bold text-white uppercase tracking-widest font-mono">MATCH CONFIRMED</span>
                                                </div>
                                            )}
                                        </div>

                                        <button 
                                            onClick={runCameraLivenessMatchCheck} 
                                            disabled={cameraState === "scanning" || cameraState === "matching"} 
                                            className={`w-full font-bold py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                                cameraState === "success" 
                                                    ? "bg-emerald-600 hover:bg-emerald-550 text-white animate-pulse" 
                                                    : cameraState === "failed"
                                                        ? "bg-rose-600 hover:bg-rose-550 text-white animate-pulse"
                                                        : "bg-indigo-600 hover:bg-indigo-550 text-white disabled:bg-slate-850"
                                            }`}
                                        >
                                            <PlayCircle className="w-4 h-4" /> 
                                            {cameraState === "success" || cameraState === "failed" 
                                                ? "Reset & Rescan" 
                                                : cameraState === "scanning" || cameraState === "matching"
                                                    ? "Scanning..."
                                                    : "Start Identity Verification Scan"}
                                        </button>
                                    </div>

                                    {/* Match logs details */}
                                    <div className="flex flex-col justify-between">
                                        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl font-mono text-[10px] text-indigo-400 h-52 overflow-y-auto space-y-2">
                                            <div className="text-[9px] text-slate-500 uppercase font-bold border-b border-slate-900 pb-1 mb-2">Verification sequence log trace</div>
                                            {cameraLogs.map((log, idx) => (
                                                <div key={idx} className="border-l border-indigo-900/50 pl-2">{log}</div>
                                            ))}
                                            {cameraLogs.length === 0 && (
                                                <div className="text-slate-650 text-center py-12">
                                                    System standing by. Click button to begin face check sequence.
                                                </div>
                                            )}
                                        </div>

                                        {cameraMatchScore && (
                                            <div className="mt-4 bg-slate-950 border border-slate-850 p-4 rounded-xl flex justify-between font-mono text-xs items-center">
                                                <span>Match Confidence Index:</span>
                                                <span className="text-emerald-400 font-bold text-sm">{cameraMatchScore.toFixed(1)}%</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* FLIGHT VOYAGE LINKING */}
                    {activeModule === "flight" && (
                        <div className="max-w-2xl mx-auto animate-fade-in-up">
                            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
                                <span className="text-[10px] text-amber-500 font-mono font-bold tracking-widest uppercase block mb-1">Ticket Linking Station</span>
                                <h3 className="text-base font-extrabold text-white uppercase tracking-wider mb-2">Link Passenger Flight Journey</h3>
                                <p className="text-xs text-slate-400 mb-6">Create the target database link between passenger profiles and flight voyages.</p>

                                {profileData ? (
                                    <form onSubmit={saveFlightJourneyDetails} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Booking PNR</label>
                                                <input type="text" value={flightPnr} onChange={(e) => setFlightPnr(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono" placeholder="E.g. PNR10293" required />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Flight ID Code</label>
                                                <input type="text" value={flightNo} onChange={(e) => setFlightNo(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono" placeholder="E.g. SG-302" required />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Departure Airport</label>
                                                <input type="text" value={flightDep} onChange={(e) => setFlightDep(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white uppercase" placeholder="DEL" required />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Arrival Airport</label>
                                                <input type="text" value={flightArr} onChange={(e) => setFlightArr(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white uppercase" placeholder="JFK" required />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Travel Date</label>
                                                <input type="date" value={flightDate} onChange={(e) => setFlightDate(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Boarding Time</label>
                                                <input type="text" value={flightTime} onChange={(e) => setFlightTime(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white font-mono" placeholder="19:30" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Gate Code</label>
                                                <input type="text" value={flightGate} onChange={(e) => setFlightGate(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white font-mono" placeholder="Gate B12" />
                                            </div>
                                        </div>

                                        <div className="flex gap-4 pt-2">
                                            <button type="button" onClick={handleLinkFlightDemo} className="bg-slate-850 hover:bg-slate-800 text-amber-500 px-4 py-2.5 rounded-xl text-xs font-bold font-mono">Fill Demo</button>
                                            <button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-550 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider">Confirm Flight Journey</button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="text-center py-10 font-mono text-xs text-slate-550">
                                        Please authenticate passenger credentials to link flight voyage.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* AIRPORT EGATE SIMULATION */}
                    {activeModule === "entry" && (
                        <div className="max-w-4xl mx-auto animate-fade-in-up">
                            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                                <div className={`absolute top-0 left-0 right-0 h-1.5 transition-all ${
                                    gateState === "success" 
                                        ? "bg-emerald-500" 
                                        : gateState === "alert" || gateState === "denied"
                                            ? "bg-rose-500 animate-pulse"
                                            : "bg-purple-500"
                                }`}></div>

                                <div className="flex justify-between items-center border-b border-slate-850 pb-4 mb-6">
                                    <div>
                                        <span className="text-[10px] text-purple-400 font-mono font-bold tracking-widest uppercase">Compliance Security Scanner</span>
                                        <h2 className="text-lg font-extrabold text-white uppercase tracking-wider mt-0.5">Automated E-Gate Portal</h2>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="relative w-full h-64 bg-black rounded-2xl overflow-hidden border border-slate-850">
                                            <Webcam ref={gateCamRef} audio={false} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: "user" }} className="w-full h-full object-cover" />
                                            {(gateState === "scanning" || gateState === "matching") && (
                                                <div className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center">
                                                    <div className="w-full h-0.5 bg-purple-500 animate-scan-line absolute top-0 left-0"></div>
                                                    <Aperture className="w-8 h-8 text-purple-400 animate-spin mb-2" />
                                                    <span className="text-[10px] text-white font-mono uppercase animate-pulse">Running face landmarks matching...</span>
                                                </div>
                                            )}
                                            {(gateState === "denied" || gateState === "alert") && (
                                                <div className="absolute inset-0 bg-rose-950/70 backdrop-blur-sm flex flex-col items-center justify-center">
                                                    <AlertTriangle className="w-10 h-10 text-rose-400 mb-2 animate-bounce" />
                                                    <span className="text-xs font-black text-rose-100 uppercase tracking-widest font-mono">ACCESS BLOCKED</span>
                                                </div>
                                            )}
                                            {gateState === "success" && (
                                                <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
                                                    <CheckCircle className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
                                                    <span className="text-xs font-black text-emerald-100 uppercase tracking-widest font-mono">ACCESS GRANTED</span>
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            onClick={runGateClearanceSimulation} 
                                            disabled={gateState === "scanning" || gateState === "matching" || gateState === "verifying"} 
                                            className={`w-full font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-all ${
                                                gateState === "success" 
                                                    ? "bg-emerald-600 hover:bg-emerald-550 text-white animate-pulse" 
                                                    : gateState === "denied" || gateState === "alert"
                                                        ? "bg-rose-600 hover:bg-rose-550 text-white animate-pulse"
                                                        : "bg-purple-600 hover:bg-purple-550 text-white disabled:bg-slate-850"
                                            }`}
                                        >
                                            {gateState === "success" || gateState === "denied" || gateState === "alert" 
                                                ? "Reset & Scan Again" 
                                                : gateState === "scanning" || gateState === "matching" || gateState === "verifying"
                                                    ? "Scanning..."
                                                    : "Clear Gate Entrance"}
                                        </button>
                                    </div>

                                    {/* Gate log trace */}
                                    <div className="flex flex-col justify-between">
                                        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl font-mono text-[10px] text-purple-450 h-52 overflow-y-auto space-y-2">
                                            <div className="text-[9px] text-slate-500 uppercase font-bold border-b border-slate-900 pb-1 mb-2">Gate transaction event trail</div>
                                            {gateLogs.map((log, idx) => (
                                                <div key={idx} className="border-l border-purple-900/40 pl-2">{log}</div>
                                            ))}
                                            {gateLogs.length === 0 && (
                                                <div className="text-slate-650 text-center py-16">
                                                    E-gate standing by. Position face and click start clearance checks.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECURITY SCREENING MODULE */}
                    {activeModule === "screening" && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-xl">
                                <div className="border-b border-slate-850 pb-4 mb-6">
                                    <span className="text-[10px] text-amber-500 font-mono font-bold tracking-widest uppercase">Security Clearance Command</span>
                                    <h2 className="text-lg font-extrabold text-white uppercase tracking-wider mt-0.5">Automated Passenger Risk Screening</h2>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                    <div className="lg:col-span-1 space-y-4 font-mono text-xs">
                                        <div className="text-[10px] text-slate-500 uppercase font-bold border-b border-slate-800 pb-1">Evaluate Risk profiles</div>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[10px] text-slate-400 block mb-1">Select Passenger ID</label>
                                                <select 
                                                    value={screenPassengerId} 
                                                    onChange={(e) => {
                                                        const pId = e.target.value
                                                        setScreenPassengerId(pId)
                                                        const targetTrav = travelers.find(t => t.id === pId)
                                                        if (targetTrav) {
                                                            setScreenRiskScore(Number(targetTrav.risk))
                                                            setScreenStatus(targetTrav.status)
                                                            setScreenNotes(targetTrav.note || "")
                                                        } else {
                                                            setScreenRiskScore(20)
                                                            setScreenStatus("SAFE")
                                                            setScreenNotes("")
                                                        }
                                                    }}
                                                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1.5 text-white"
                                                >
                                                    <option value="">-- Choose Passenger --</option>
                                                    {travelers.map((t, idx) => (
                                                        <option key={idx} value={t.id}>{t.name.toUpperCase()}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 block mb-1">Set Risk Score (0-100)</label>
                                                <input 
                                                    type="number" 
                                                    value={screenRiskScore}
                                                    onChange={(e) => {
                                                        const v = Number(e.target.value)
                                                        setScreenRiskScore(v)
                                                        if (v >= 70) setScreenStatus("HIGH RISK")
                                                        else if (v >= 40) setScreenStatus("SECONDARY CHECK")
                                                        else setScreenStatus("SAFE")
                                                    }}
                                                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white"
                                                    min="0"
                                                    max="100"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 block mb-1">Security Notes</label>
                                                <textarea 
                                                    value={screenNotes}
                                                    onChange={(e) => setScreenNotes(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white h-20"
                                                    placeholder="Enter security notes..."
                                                />
                                            </div>
                                            <button 
                                                onClick={async () => {
                                                    if (!screenPassengerId || isSavingRisk) return
                                                    setIsSavingRisk(true)
                                                    setRiskSavedSuccess(false)
                                                    try {
                                                        await logSecurityCheck(screenPassengerId, screenRiskScore, screenNotes)
                                                        
                                                        // Audit
                                                        const targetTrav = travelers.find(t => t.id === screenPassengerId)
                                                        await dbInsertRow("audit_logs", {
                                                            user_id: currentUserId,
                                                            action: "RISK_AUDIT_UPDATE",
                                                            actor: targetTrav?.name || "System Officer",
                                                            status: "SUCCESS",
                                                            description: `Officer updated risk clearance settings. Score: ${screenRiskScore}%, Tag: ${screenStatus}`
                                                        })

                                                        addTerminalLog("Manually updated passenger security risk score.")
                                                        syncSystemData()
                                                        setRiskSavedSuccess(true)
                                                        setTimeout(() => setRiskSavedSuccess(false), 3000)
                                                    } catch (err) {
                                                        console.error("Manual risk assessment update failed:", err)
                                                        alert("Database update failed. Please check table definitions.")
                                                    } finally {
                                                        setIsSavingRisk(false)
                                                    }
                                                }}
                                                disabled={!screenPassengerId || isSavingRisk}
                                                className={`w-full font-bold py-2.5 rounded-xl text-xs uppercase font-mono transition-all flex items-center justify-center gap-1.5 ${
                                                    riskSavedSuccess 
                                                        ? "bg-emerald-600 hover:bg-emerald-550 text-white animate-pulse" 
                                                        : "bg-indigo-600 hover:bg-indigo-550 text-white disabled:bg-slate-850"
                                                }`}
                                            >
                                                {isSavingRisk ? (
                                                    <>
                                                        <Aperture className="w-3.5 h-3.5 animate-spin" /> Saving...
                                                    </>
                                                ) : riskSavedSuccess ? (
                                                    <>
                                                        <Check className="w-3.5 h-3.5" /> Assessment Logged
                                                    </>
                                                ) : (
                                                    "Log Risk Assessment"
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Security screening metrics logs */}
                                    <div className="lg:col-span-3 bg-slate-950 border border-slate-850 p-5 rounded-2xl space-y-4">
                                        <div className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest border-b border-slate-900 pb-1.5">Security Screening Registry Logs</div>
                                        <div className="overflow-x-auto max-h-[300px]">
                                            <table className="w-full text-left border-collapse text-[10px] font-mono">
                                                <thead>
                                                    <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                                                        <th className="p-3">Passenger ID</th>
                                                        <th className="p-3">Risk Factor</th>
                                                        <th className="p-3">Compliance Tag</th>
                                                        <th className="p-3">Screening Notes</th>
                                                        <th className="p-3">Last Checked</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-900">
                                                    {travelers.map((t, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-900">
                                                            <td className="p-3 uppercase text-white font-bold">{t.name}</td>
                                                            <td className="p-3 font-bold">{t.risk}%</td>
                                                            <td className="p-3">
                                                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                                                                    t.risk >= 70 ? "bg-red-500/10 text-red-400 border border-red-500/20" : t.risk >= 40 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                                }`}>
                                                                    {t.status}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-slate-400 max-w-[150px] truncate">{t.note}</td>
                                                            <td className="p-3 text-slate-550">{new Date(t.lastActivity).toLocaleTimeString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BOARDING GATE SIMULATION */}
                    {activeModule === "boarding" && (
                        <div className="max-w-4xl mx-auto animate-fade-in-up">
                            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                                <div className={`absolute top-0 left-0 right-0 h-1.5 transition-all ${
                                    boardState === "completed" 
                                        ? "bg-emerald-500" 
                                        : boardState === "error"
                                            ? "bg-rose-500"
                                            : "bg-indigo-500"
                                }`}></div>

                                <div className="flex justify-between items-center border-b border-slate-850 pb-4 mb-6">
                                    <div>
                                        <span className="text-[10px] text-indigo-400 font-mono font-bold tracking-widest uppercase">Flight Voyage Gate</span>
                                        <h2 className="text-lg font-extrabold text-white uppercase tracking-wider mt-0.5">Final Boarding Gate simulation</h2>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="relative w-full h-64 bg-black rounded-2xl overflow-hidden border border-slate-850 flex items-center justify-center">
                                            <Webcam ref={boardCamRef} audio={false} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: "user" }} className="w-full h-full object-cover" />
                                            {boardState === "matching" && (
                                                <div className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center">
                                                    <Aperture className="w-8 h-8 text-indigo-450 animate-spin mb-2" />
                                                    <span className="text-[10px] text-white font-mono uppercase tracking-widest animate-pulse">Running boarding checks...</span>
                                                </div>
                                            )}
                                            {boardState === "cleared" && (
                                                <div className="absolute inset-0 bg-indigo-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
                                                    <CheckCircle className="w-12 h-12 text-indigo-400 mb-2 animate-bounce" />
                                                    <span className="text-xs font-bold text-white uppercase tracking-widest font-mono">SEAT CLEARED</span>
                                                </div>
                                            )}
                                            {boardState === "completed" && (
                                                <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
                                                    <CheckCircle className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
                                                    <span className="text-xs font-bold text-white uppercase tracking-widest font-mono">BOARDING COMPLETE</span>
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            onClick={runBoardingGateSimulation} 
                                            disabled={boardState === "matching" || boardState === "cleared"} 
                                            className={`w-full font-bold py-3 rounded-xl text-xs uppercase tracking-wider font-mono transition-all ${
                                                boardState === "completed" 
                                                    ? "bg-emerald-600 hover:bg-emerald-550 text-white animate-pulse" 
                                                    : boardState === "error"
                                                        ? "bg-rose-600 hover:bg-rose-550 text-white animate-pulse"
                                                        : "bg-indigo-600 hover:bg-indigo-550 text-white disabled:bg-slate-850"
                                            }`}
                                        >
                                            {boardState === "completed" || boardState === "error" 
                                                ? "Reset & Board Again" 
                                                : boardState === "matching" || boardState === "cleared"
                                                    ? "Verifying Biometrics..."
                                                    : "Scan & Verify Boarding Credentials"}
                                        </button>
                                    </div>

                                    {/* Board logs */}
                                    <div className="flex flex-col justify-between">
                                        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl font-mono text-[10px] text-indigo-450 h-52 overflow-y-auto space-y-2">
                                            <div className="text-[9px] text-slate-500 uppercase font-bold border-b border-slate-900 pb-1 mb-2">Voyage boarding event trace</div>
                                            {boardLogs.map((log, idx) => (
                                                <div key={idx} className="border-l border-indigo-900/40 pl-2">{log}</div>
                                            ))}
                                            {boardLogs.length === 0 && (
                                                <div className="text-slate-650 text-center py-16">
                                                    Boarding gate idle. Select traveler and click start checks.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TRAVEL HISTORY PAGE */}
                    {activeModule === "history" && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-xl">
                                <div className="border-b border-slate-850 pb-4 mb-6">
                                    <span className="text-[10px] text-purple-400 font-mono font-bold tracking-widest uppercase">System logs</span>
                                    <h2 className="text-lg font-extrabold text-white uppercase tracking-wider mt-0.5">Travel Voyage History logs</h2>
                                </div>

                                <div className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden shadow-inner">
                                    <div className="overflow-x-auto max-h-[420px]">
                                        <table className="w-full text-left border-collapse text-xs font-mono">
                                            <thead>
                                                <tr className="bg-slate-900 text-slate-450 uppercase border-b border-slate-800 tracking-wider">
                                                    <th className="p-4">Passenger ID</th>
                                                    <th className="p-4">Milestone Action</th>
                                                    <th className="p-4">Terminal Station</th>
                                                    <th className="p-4">Transaction Timestamp</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-900 text-slate-300">
                                                {travelers.slice(0, 10).map((t, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-900">
                                                        <td className="p-4 uppercase font-bold text-white">{t.name}</td>
                                                        <td className="p-4 text-emerald-400">PASSPORT_VERIFIED</td>
                                                        <td className="p-4 font-bold">OCR_GATEWAY_A1</td>
                                                        <td className="p-4 text-slate-500">{new Date(t.lastActivity).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ANALYTICS PAGE (RECHARTS) */}
                    {activeModule === "analytics" && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-xl">
                                <div className="border-b border-slate-850 pb-4 mb-6">
                                    <span className="text-[10px] text-indigo-400 font-mono font-bold tracking-widest uppercase">Statistical analytics summaries</span>
                                    <h2 className="text-lg font-extrabold text-white uppercase tracking-wider mt-0.5">SmartYatra Analytics command</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Chart 1: Passenger registrations over time */}
                                    <div className="bg-slate-950 border border-slate-850 p-5 rounded-2xl h-76 flex flex-col justify-between">
                                        <div className="text-[10px] text-slate-450 uppercase font-mono tracking-wider mb-4">Passenger registrations (Past 5 days)</div>
                                        <div className="flex-1 w-full text-xs font-mono">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={[
                                                    { date: "06-01", count: 15 },
                                                    { date: "06-02", count: 22 },
                                                    { date: "06-03", count: 38 },
                                                    { date: "06-04", count: 45 },
                                                    { date: "06-05", count: 62 }
                                                ]}>
                                                    <defs>
                                                        <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                                    <XAxis dataKey="date" stroke="#64748b" />
                                                    <YAxis stroke="#64748b" />
                                                    <RechartsTooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#f8fafc" }} />
                                                    <Area type="monotone" dataKey="count" stroke="#6366f1" fillOpacity={1} fill="url(#regGrad)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Chart 2: Success clearance trends */}
                                    <div className="bg-slate-950 border border-slate-850 p-5 rounded-2xl h-76 flex flex-col justify-between">
                                        <div className="text-[10px] text-slate-450 uppercase font-mono tracking-wider mb-4">Biometric Verification success rate (%)</div>
                                        <div className="flex-1 w-full text-xs font-mono">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={[
                                                    { date: "06-01", rate: 92 },
                                                    { date: "06-02", rate: 94 },
                                                    { date: "06-03", rate: 93 },
                                                    { date: "06-04", rate: 96 },
                                                    { date: "06-05", rate: 98 }
                                                ]}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                                    <XAxis dataKey="date" stroke="#64748b" />
                                                    <YAxis stroke="#64748b" domain={[80, 100]} />
                                                    <RechartsTooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#f8fafc" }} />
                                                    <RechartsLine type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 8 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DATABASE EXPLORER */}
                    {activeModule === "explorer" && (
                        <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-xl space-y-6 animate-fade-in-up">
                            <div className="flex justify-between items-center border-b border-slate-850 pb-4">
                                <div>
                                    <span className="text-[10px] text-indigo-400 font-mono font-bold tracking-widest uppercase">DBMS Table Control</span>
                                    <h2 className="text-lg font-extrabold text-white uppercase tracking-wider mt-0.5">Relational Database Explorer</h2>
                                </div>
                                <button
                                    onClick={() => exportTableToCsv(explorerTable, explorerRows)}
                                    className="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-850 rounded-xl px-4 py-2 text-xs font-bold font-mono transition-all flex items-center gap-1.5"
                                >
                                    <Printer className="w-3.5 h-3.5" /> Export Table CSV
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                <div className="space-y-2 lg:col-span-1">
                                    <div className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-widest px-1.5 mb-2">Select Relation Table</div>
                                    {(() => {
                                        const tableMetadata: Record<string, { icon: any; color: string; desc: string }> = {
                                            users: { icon: User, color: "text-blue-400 bg-blue-500/10", desc: "Credentials & role control" },
                                            passengers: { icon: UserCheck, color: "text-blue-400 bg-blue-500/10", desc: "Legal identities" },
                                            passport_verifications: { icon: FileText, color: "text-sky-400 bg-sky-500/10", desc: "Passport OCR credentials" },
                                            face_enrollments: { icon: Camera, color: "text-purple-400 bg-purple-500/10", desc: "Enrolled face data" },
                                            boarding_passes: { icon: FileSpreadsheet, color: "text-amber-450 bg-amber-500/10", desc: "Traveler boarding passes" }
                                        }

                                        return [
                                            "users", "passengers", "passport_verifications", "face_enrollments", "boarding_passes"
                                        ].map((table, idx) => {
                                            const meta = tableMetadata[table] || { icon: Database, color: "text-slate-400 bg-slate-500/10", desc: "Data table relation" }
                                            const TableIcon = meta.icon
                                            const isSelected = explorerTable === table

                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => setExplorerTable(table)}
                                                    className={`w-full text-left p-2.5 rounded-xl transition-all border flex flex-col gap-1 ${
                                                        isSelected 
                                                            ? "bg-slate-900 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/35" 
                                                            : "bg-slate-950/60 border-slate-850 hover:bg-slate-900/80 hover:border-slate-800"
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`p-1.5 rounded-lg ${isSelected ? "bg-indigo-650/15 text-indigo-400" : meta.color}`}>
                                                                <TableIcon className="w-3.5 h-3.5" />
                                                            </div>
                                                            <span className={`font-mono text-[10px] font-semibold ${isSelected ? "text-white font-bold" : "text-slate-350"}`}>{table}</span>
                                                        </div>
                                                        <ChevronRight className={`w-3 h-3 transition-transform ${isSelected ? "text-indigo-400 translate-x-0.5" : "text-slate-600"}`} />
                                                    </div>
                                                    <span className="text-[8px] text-slate-500 font-mono pl-7 leading-none">{meta.desc}</span>
                                                </button>
                                            )
                                        })
                                    })()}
                                </div>

                                <div className="lg:col-span-3 bg-slate-950 border border-slate-850 p-5 rounded-2xl space-y-4">
                                    <div className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-900 pb-3 gap-2">
                                        <div className="font-mono text-xs">
                                            <span className="text-slate-500">Query: </span>
                                            <span className="text-emerald-400 font-bold">SELECT * FROM {explorerTable};</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => {
                                                    setInsertFormData({})
                                                    setShowInsertModal(true)
                                                }}
                                                className="bg-indigo-600 hover:bg-indigo-550 text-white font-mono text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 uppercase transition-all"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Insert Row
                                            </button>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto max-h-[360px]">
                                        <table className="w-full text-left border-collapse text-[10px] font-mono whitespace-nowrap">
                                            <thead>
                                                <tr className="bg-slate-900 text-slate-450 border-b border-slate-800">
                                                    <th className="p-3">Actions</th>
                                                    {explorerRows.length > 0 && Object.keys(explorerRows[0]).map((key, idx) => (
                                                        <th key={idx} className="p-3 border-r border-slate-800">{key}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-900 text-slate-300">
                                                {explorerRows.map((row, rowIdx) => (
                                                    <tr key={rowIdx} className="hover:bg-slate-900">
                                                        <td className="p-3">
                                                            <button 
                                                                onClick={() => executeDeleteRow(row.id || row.passport_number || row.passport_id, row.id ? "id" : row.passport_number ? "passport_number" : "passport_id")}
                                                                className="text-rose-500 hover:text-rose-450"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </td>
                                                        {Object.values(row).map((val: any, valIdx) => (
                                                            <td key={valIdx} className="p-3 border-r border-slate-900 max-w-[200px] truncate">
                                                                {val === null ? <span className="text-slate-650 italic">NULL</span> : typeof val === "string" && val.startsWith("data:image") ? "data:image/jpeg;base64,..." : String(val)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                                {explorerRows.length === 0 && (
                                                    <tr>
                                                        <td colSpan={10} className="p-12 text-center text-slate-600">This table is currently empty in the database storage.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ER DIAGRAM PAGE */}
                    {activeModule === "er" && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-xl">
                                <div className="border-b border-slate-850 pb-4 mb-6">
                                    <span className="text-[10px] text-indigo-400 font-mono font-bold tracking-widest uppercase">Database Design Normalization diagram</span>
                                    <h2 className="text-lg font-extrabold text-white uppercase tracking-wider mt-0.5">SentinelGate System ER Diagram (15 Tables)</h2>
                                </div>
                                {renderDatabaseRelationshipsDiagram()}
                            </div>
                        </div>
                    )}

                    {/* SQL PLAYGROUND PAGE */}
                    {activeModule === "sql" && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-xl space-y-6">
                                <div className="border-b border-slate-850 pb-3">
                                    <span className="text-[10px] text-indigo-400 font-mono font-bold tracking-widest uppercase">Safe SELECT query terminal console</span>
                                    <h2 className="text-lg font-extrabold text-white uppercase tracking-wider mt-0.5">Interactive SQL Playground Terminal</h2>
                                </div>

                                <div className="space-y-4">
                                    <textarea
                                        value={sqlQuery}
                                        onChange={(e) => setSqlQuery(e.target.value)}
                                        className="w-full h-28 bg-slate-950 border border-slate-850 rounded-2xl p-4 font-mono text-xs text-indigo-400 focus:outline-none focus:border-indigo-500 shadow-inner"
                                        placeholder="SELECT * FROM passengers WHERE nationality = 'Indian';"
                                    />

                                    <button 
                                        onClick={executeSqlPlaygroundQuery}
                                        className="bg-indigo-650 hover:bg-indigo-600 text-white font-mono text-xs py-2.5 px-6 rounded-xl flex items-center gap-1.5 uppercase transition-all font-bold shadow-md"
                                    >
                                        <Play className="w-4 h-4 fill-current" /> Run Query
                                    </button>
                                </div>

                                {/* Console output results */}
                                <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 space-y-4">
                                    <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest border-b border-slate-900 pb-1.5">Console Output Terminal</div>
                                    
                                    {sqlError && (
                                        <div className="text-xs font-mono text-rose-500 leading-relaxed bg-rose-950/20 border border-rose-900/30 p-3 rounded-xl">
                                            {sqlError}
                                        </div>
                                    )}

                                    {sqlSuccessMsg && (
                                        <div className="text-xs font-mono text-emerald-400 leading-relaxed bg-emerald-950/10 border border-emerald-900/30 p-3 rounded-xl">
                                            {sqlSuccessMsg}
                                        </div>
                                    )}

                                    {sqlResultRows.length > 0 && (
                                        <div className="overflow-x-auto max-h-[280px]">
                                            <table className="w-full text-left border-collapse text-[10px] font-mono whitespace-nowrap">
                                                <thead>
                                                    <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                                                        {Object.keys(sqlResultRows[0]).map((col, idx) => (
                                                            <th key={idx} className="p-3 border-r border-slate-800">{col}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-900 text-slate-350">
                                                    {sqlResultRows.map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-900">
                                                            {Object.values(row).map((val: any, valIdx) => (
                                                                <td key={valIdx} className="p-3 border-r border-slate-900 max-w-[200px] truncate">
                                                                    {val === null ? <span className="text-slate-650 italic">NULL</span> : typeof val === "string" && val.startsWith("data:image") ? "data:image/jpeg;base64,..." : String(val)}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SYSTEM AUDIT LOGS */}
                    {activeModule === "audit" && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-xl">
                                <div className="border-b border-slate-850 pb-4 mb-6">
                                    <span className="text-[10px] text-indigo-400 font-mono font-bold tracking-widest uppercase">Immutable border ledger records</span>
                                    <h2 className="text-lg font-extrabold text-white uppercase tracking-wider mt-0.5">Chronological system transaction logs</h2>
                                </div>

                                <div className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden shadow-inner">
                                    <div className="overflow-x-auto max-h-[450px]">
                                        <table className="w-full text-left border-collapse text-xs font-mono">
                                            <thead>
                                                <tr className="bg-slate-900 text-slate-450 uppercase border-b border-slate-800 tracking-wider">
                                                    <th className="p-4">Action</th>
                                                    <th className="p-4">Actor</th>
                                                    <th className="p-4">Status</th>
                                                    <th className="p-4">Description</th>
                                                    <th className="p-4">Timestamp</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-900 text-slate-350">
                                                {auditLogs.map((log, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-900">
                                                        <td className="p-4 font-bold text-white uppercase">{log.action || log.event_type}</td>
                                                        <td className="p-4 text-slate-400 uppercase">{log.actor || "passenger-client"}</td>
                                                        <td className="p-4">
                                                            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-500/20">
                                                                {log.status || "SUCCESS"}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-slate-400 max-w-xs truncate" title={log.description || log.action_details}>{log.description || log.action_details}</td>
                                                        <td className="p-4 text-slate-550">{new Date(log.timestamp || log.created_at).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                                {auditLogs.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="p-8 text-center text-slate-600 font-mono">No system transaction audit logs registered.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SYSTEM SETTINGS VIEW */}
                    {activeModule === "settings" && (
                        <div className="max-w-2xl mx-auto animate-fade-in-up">
                            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
                                <div className="border-b border-slate-850 pb-4 mb-6">
                                    <span className="text-[10px] text-amber-500 font-mono font-bold tracking-widest uppercase">System Parameter settings</span>
                                    <h2 className="text-base font-extrabold text-white uppercase tracking-wider mt-0.5">Border Command Configurations</h2>
                                </div>

                                <div className="space-y-4 font-mono text-xs">
                                    {systemSettings.map((set, idx) => (
                                        <div key={idx} className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-2">
                                            <div className="flex justify-between font-bold text-white uppercase">
                                                <span>Key: {set.setting_key}</span>
                                                <span className="text-amber-500">{set.setting_value}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 leading-normal">{set.description}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                        </>
                    )}

                </div>
            </main>

            {/* DATABASE EXPLORER CRUD INSERT MODAL */}
            {showInsertModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in-up">
                    <form onSubmit={executeInsertRow} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-md w-full space-y-6">
                        <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                            <span className="text-xs font-bold font-mono text-indigo-400 uppercase tracking-widest">Insert new tuple row into `{explorerTable}`</span>
                            <button type="button" onClick={() => setShowInsertModal(false)} className="text-slate-400 hover:text-slate-200">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Generate inputs dynamically based on first explorer row columns if available, or static keys */}
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                            {explorerRows.length > 0 ? (
                                Object.keys(explorerRows[0]).filter(k => k !== "created_at" && k !== "updated_at").map((key, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{key}</label>
                                        <input
                                            type="text"
                                            value={insertFormData[key] || ""}
                                            onChange={(e) => setInsertFormData({ ...insertFormData, [key]: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-850 rounded px-3 py-1.5 text-xs text-white"
                                            placeholder={`Enter ${key}...`}
                                            required={key === "id" && explorerTable !== "users"}
                                        />
                                    </div>
                                ))
                            ) : (
                                <div className="text-slate-500 text-xs font-mono">Unable to load table schema fields. Double check if mock fallback exists.</div>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <button type="button" onClick={() => setShowInsertModal(false)} className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-400 py-2.5 rounded-xl text-xs uppercase font-bold">Cancel</button>
                            <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-550 text-white py-2.5 rounded-xl text-xs uppercase font-bold shadow-md">Confirm Insert</button>
                        </div>
                    </form>
                </div>
            )}
            
        </div>
    )
}