"use client"

import Image from "next/image"
import { useState, useRef, useCallback, useEffect } from "react"
import { Pie } from "react-chartjs-2"
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js"
import { ComposableMap, Geographies, Geography, Marker, Line } from "react-simple-maps"
import {
    FiShield,
    FiAlertOctagon,
    FiCheckCircle,
    FiUserPlus,
    FiCamera,
    FiSearch,
    FiActivity,
    FiMapPin,
    FiGlobe,
    FiAperture,
    FiX,
    FiUserX,
    FiLayers,
    FiHelpCircle,
    FiPlayCircle,
    FiHeart,
    FiUploadCloud,
    FiLock,
    FiFileText,
    FiPrinter,
    FiUserCheck,
    FiCpu,
    FiMail,
    FiPhone,
    FiCalendar
} from "react-icons/fi"
import Webcam from "react-webcam"
import { GiCrossedSwords } from "react-icons/gi"
import {
    getTravelers,
    addTraveler,
    getThreats,
    addThreat,
    getAuditLogs,
    addAuditLog,
    getWatchlist,
    clearAllCollections,
    createUserProfile,
    getUserProfile,
    getUserByPassport,
    updateUserProfile
} from "@/lib/database"
import { auth } from "@/lib/firebase"
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup
} from "firebase/auth"
import Script from "next/script"
import { FiTrash2 } from "react-icons/fi"
import { SimpleBlockchain, Block } from "@/lib/blockchain"

ChartJS.register(ArcElement, Tooltip, Legend)

// HIGH RISK ENTITIES DATABASE
const WATCHLIST = [
    { name: "donald trump", passport: "W0000001", reason: "Flagged High-Risk VIP" },
    { name: "carlos the jackal", passport: "W1111111", reason: "Interpol Red Notice" },
    { name: "viktor bout", passport: "W2222222", reason: "Arms Trafficking" },
    { name: "dawood ibrahim", passport: "W3333333", reason: "Organized Crime" },
    { name: "kim jong un", passport: "W4444444", reason: "Sanctions Evasion" },
    { name: "osama bin laden", passport: "W5555555", reason: "Global Terrorism" },
    { name: "joaquin guzman", passport: "W6666666", reason: "Drug Cartel Leader" }
]

export default function Home() {
    // AUTHENTICATION
    const [authRole, setAuthRole] = useState<"admin" | "user" | null>(null)
    const [loginUsername, setLoginUsername] = useState("") // Will be used for email in Sign In
    const [loginPassword, setLoginPassword] = useState("") // Will be used for password in Sign In
    const [loginError, setLoginError] = useState("")

    // FIREBASE AUTH & PASSENGER PROFILE STATES
    const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
    const [authAction, setAuthAction] = useState<"signin" | "signup">("signin")
    
    // Signup Form fields
    const [signupEmail, setSignupEmail] = useState("")
    const [signupPassword, setSignupPassword] = useState("")
    const [signupName, setSignupName] = useState("")
    const [signupPhone, setSignupPhone] = useState("")
    const [signupDob, setSignupDob] = useState("")
    const [signupPassport, setSignupPassport] = useState("")
    const [signupFlight, setSignupFlight] = useState("")

    // Admin detail inspector modal states
    const [selectedTravelerDetail, setSelectedTravelerDetail] = useState<any>(null)
    const [showDetailModal, setShowDetailModal] = useState(false)

    // CUSTOM PASSENGER PORTAL & SELF-VERIFICATION STATES
    const [loginMode, setLoginMode] = useState<"officer" | "passenger">("passenger")
    const [verifStep, setVerifStep] = useState<"form" | "upload" | "biometric" | "pass">("form")
    const [passportImage, setPassportImage] = useState<string | null>(null)
    const [passportImageName, setPassportImageName] = useState("")
    const [mrzScanning, setMrzScanning] = useState(false)
    const [extractedData, setExtractedData] = useState<{name: string, passport: string, country: string} | null>(null)
    const [selfieScanning, setSelfieScanning] = useState(false)
    const [biometricMatchScore, setBiometricMatchScore] = useState<number | null>(null)
    const [verificationPassData, setVerificationPassData] = useState<any>(null)
    const [terminalLogs, setTerminalLogs] = useState<string[]>([])

    const addTerminalLog = (log: string) => {
        setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`])
    }

    // Listen to Firebase Auth state changes
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                // If it is our hardcoded admin email, sign in as officer
                if (user.email === "admin@sentinelgate.gov") {
                    setAuthRole("admin")
                } else {
                    const profile = await getUserProfile(user.uid)
                    if (profile) {
                        setCurrentUserProfile(profile)
                        setUserPassportStatus(profile)
                        setUserPassportInput(profile.passport)
                        setUserPassportQueried(true)
                        setAuthRole("user")
                    }
                }
            } else {
                setAuthRole(null)
                setCurrentUserProfile(null)
            }
        })
        return () => unsubscribe()
    }, [])

    const handleAuthLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoginError("")
        
        // 1. Officer/Admin check using specific email/password
        if (loginUsername.trim().toLowerCase() === "admin@sentinelgate.gov" && loginPassword === "AdminSecurityTopRisk04822") {
            setAuthRole("admin")
            setLoginError("")
            return
        }

        // 2. Regular user check
        try {
            const userCredential = await signInWithEmailAndPassword(auth, loginUsername.trim(), loginPassword)
            const uid = userCredential.user.uid
            
            const profile = await getUserProfile(uid)
            if (profile) {
                setCurrentUserProfile(profile)
                setUserPassportStatus(profile)
                setUserPassportInput(profile.passport)
                setUserPassportQueried(true)
                setAuthRole("user")
                setLoginError("")
            } else {
                setLoginError("Account profile not found in database.")
                await signOut(auth)
            }
        } catch (err: any) {
            console.error("Login error:", err)
            setLoginError("Invalid email or password.")
        }
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoginError("")

        if (!signupEmail || !signupPassword || !signupName || !signupPassport) {
            setLoginError("Please fill out all required fields.")
            return
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, signupEmail.trim(), signupPassword)
            const uid = userCredential.user.uid

            const profile = {
                name: signupName.trim().toUpperCase(),
                email: signupEmail.trim().toLowerCase(),
                phone: signupPhone.trim() || "+1 (555) 000-0000",
                dob: signupDob || "2000-01-01",
                passport: signupPassport.trim().toUpperCase(),
                flightNo: signupFlight.trim().toUpperCase() || "SG-101",
                verified: false,
                risk: 20
            }

            await createUserProfile(uid, profile)
            setCurrentUserProfile(profile)
            setUserPassportStatus(profile)
            setUserPassportInput(profile.passport)
            setUserPassportQueried(true)
            setAuthRole("user")
            setVerifStep("form") // Go to self-verification wizard step
            setLoginError("")
            alert("Account registered successfully!")
        } catch (err: any) {
            console.error("Signup error:", err)
            setLoginError(err.message || "Failed to create account.")
        }
    }

    const handleGoogleLogin = async () => {
        setLoginError("")
        const provider = new GoogleAuthProvider()
        try {
            const result = await signInWithPopup(auth, provider)
            const user = result.user
            const profile = await getUserProfile(user.uid)
            if (profile) {
                setCurrentUserProfile(profile)
                setUserPassportStatus(profile)
                setUserPassportInput(profile.passport)
                setUserPassportQueried(true)
                setAuthRole("user")
                setLoginError("")
            } else {
                const defaultProfile = {
                    name: user.displayName?.toUpperCase() || "GOOGLE USER",
                    email: user.email?.toLowerCase() || "",
                    phone: "+1 (555) 000-0000",
                    dob: "2000-01-01",
                    passport: "PENDING",
                    flightNo: "SG-101",
                    verified: false,
                    risk: 20
                }
                await createUserProfile(user.uid, defaultProfile)
                setCurrentUserProfile(defaultProfile)
                setUserPassportStatus(defaultProfile)
                setUserPassportInput("PENDING")
                setUserPassportQueried(true)
                setAuthRole("user")
                setLoginError("")
            }
        } catch (err: any) {
            console.error("Google login error:", err)
            setLoginError("Failed to sign in with Google: " + err.message)
        }
    }

    const handleLogout = async () => {
        await signOut(auth)
        setAuthRole(null)
        setCurrentUserProfile(null)
        setLoginUsername("")
        setLoginPassword("")
        setUserPassportInput("")
        setUserPassportQueried(false)
        setUserPassportStatus(null)
        setExtractedData(null)
        setVerificationPassData(null)
        setVerifStep("form")
    }

    const handleTravelerRowClick = async (traveler: any) => {
        try {
            const profile = await getUserByPassport(traveler.passport)
            if (profile) {
                setSelectedTravelerDetail({
                    ...traveler,
                    ...profile,
                    isRegisteredUser: true
                })
            } else {
                // Return default mock values if not registered
                setSelectedTravelerDetail({
                    ...traveler,
                    email: "unregistered_traveler@sentinelgate.gov",
                    phone: "+1 (555) 019-2831 (System Fallback)",
                    dob: "1992-05-14",
                    flightNo: traveler.note === "HUMANITARIAN_PROCESSING_REQUIRED" ? "UN-011" : "SG-302",
                    isRegisteredUser: false
                })
            }
            setShowDetailModal(true)
        } catch (err) {
            console.error("Error inspecting traveler:", err)
        }
    }

    // travelers
    const [travelers, setTravelers] = useState<{name: string, passport: string, country: string, risk: number, lat: number, lng: number, note?: string}[]>([
        { name: "Initial Traveler", passport: "X1234567", country: "India", risk: 20, lat: 21, lng: 78 }
    ])

    // threat alerts
    const [threats, setThreats] = useState<any[]>([])
    const [dbWatchlist, setDbWatchlist] = useState<any[]>([])

    // inputs
    const [name, setName] = useState("")
    const [passport, setPassport] = useState("")
    const [country, setCountry] = useState("")

    // user passport check states
    const [userPassportInput, setUserPassportInput] = useState("")
    const [userPassportStatus, setUserPassportStatus] = useState<any>(null)
    const [userPassportQueried, setUserPassportQueried] = useState(false)

    const handleUserCheck = (e: React.FormEvent) => {
        e.preventDefault()
        setUserPassportQueried(true)
        const found = travelers.find(t => t.passport.toUpperCase() === userPassportInput.trim().toUpperCase())
        if (found) {
            setUserPassportStatus(found)
        } else {
            setUserPassportStatus(null)
        }
    }

    // face recognition states
    const [showFaceScan, setShowFaceScan] = useState(false)
    const [isScanning, setIsScanning] = useState(false)
    const [scanResult, setScanResult] = useState<any>(null)
    const [modelsLoaded, setModelsLoaded] = useState(false)
    const [trumpDescriptor, setTrumpDescriptor] = useState<Float32Array | null>(null)

    const webcamRef = useRef<Webcam>(null)
    const passengerWebcamRef = useRef<Webcam>(null)
    const faceapiRef = useRef<any>(null)
    const [dbStatus, setDbStatus] = useState<"connecting" | "connected" | "error">("connecting")

    // HELP VIDEO STATE
    const [showHelpVideo, setShowHelpVideo] = useState(false)

    // BLOCKCHAIN LOGIC
    const [blockchain] = useState(new SimpleBlockchain())
    const [blocks, setBlocks] = useState<Block[]>([blockchain.getLatestBlock()])

    function recordToBlockchain(traveler: any, eventType: string = "BORDER_CROSSING") {
        const newBlock = blockchain.addBlock({
            event: eventType,
            name: traveler.name,
            passport: traveler.passport,
            riskScore: traveler.risk
        })
        setBlocks([...blockchain.chain])

        // Log transaction to audit_logs collection (Firestore)
        addAuditLog({
            index: newBlock.index,
            timestamp: newBlock.timestamp,
            previousHash: newBlock.previousHash,
            hash: newBlock.hash,
            event: eventType,
            name: traveler.name,
            passport: traveler.passport,
            riskScore: traveler.risk
        }).catch(err => console.error("Firebase Audit Log Write Error:", err))
    }

    // FIREBASE INITIAL LOAD
    useEffect(() => {
        const fetchRemoteData = async () => {
            try {
                setDbStatus("connecting")
                const travData = await getTravelers()
                setDbStatus("connected")
                if (travData && travData.length > 0) {
                    setTravelers(travData)
                }

                const thrData = await getThreats()
                if (thrData && thrData.length > 0) {
                    setThreats(thrData)
                }

                const watchData = await getWatchlist()
                if (watchData && watchData.length > 0) {
                    setDbWatchlist(watchData)
                }

                const auditData = await getAuditLogs()
                if (auditData && auditData.length > 0) {
                    // Pre-fill local blockchain chain if we have database logs
                    blockchain.chain = auditData.map(d => ({
                        index: d.index,
                        timestamp: d.timestamp,
                        data: {
                            event: d.event,
                            name: d.name,
                            passport: d.passport,
                            riskScore: d.riskScore
                        },
                        previousHash: d.previousHash,
                        hash: d.hash
                    }))
                    setBlocks([...blockchain.chain])
                }
            } catch (err: any) {
                console.error("Firestore Loading Error:", err)
                setDbStatus("error")
            }
        }
        fetchRemoteData()
    }, [])

    useEffect(() => {
        const loadModels = async () => {
            try {
                // Wait for faceapi to be injected by CDN script
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

                // Load Trump target image and get its descriptor for comparison
                const img = await faceapi.fetchImage('/trump_target.jpg')
                const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
                if (detection) {
                    setTrumpDescriptor(detection.descriptor)
                    console.log("Trump Biometric Profile loaded successfully.")
                }
            } catch (err) {
                console.error("Failed to load faceapi models", err)
            }
        }
        loadModels()
    }, [])

    // GLOBAL COUNTRY DATABASE (~80 countries)
    const countryData: any = {
        india: { coords: [78, 21], risk: 20 },
        usa: { coords: [-100, 40], risk: 15 },
        canada: { coords: [-106, 56], risk: 10 },
        mexico: { coords: [-102, 23], risk: 25 },
        brazil: { coords: [-51, -10], risk: 20 },
        argentina: { coords: [-64, -34], risk: 20 },
        uk: { coords: [-1.5, 52], risk: 10 },
        france: { coords: [2, 46], risk: 10 },
        germany: { coords: [10, 51], risk: 10 },
        italy: { coords: [12, 42], risk: 15 },
        spain: { coords: [-4, 40], risk: 15 },
        netherlands: { coords: [5, 52], risk: 10 },
        belgium: { coords: [4, 50], risk: 10 },
        switzerland: { coords: [8, 47], risk: 10 },
        norway: { coords: [8, 60], risk: 10 },
        sweden: { coords: [15, 62], risk: 10 },
        finland: { coords: [26, 64], risk: 10 },
        russia: { coords: [100, 60], risk: 35 },
        china: { coords: [104, 35], risk: 30 },
        japan: { coords: [138, 36], risk: 10 },
        southkorea: { coords: [127, 37], risk: 15 },
        northkorea: { coords: [127, 40], risk: 90 },
        australia: { coords: [133, -25], risk: 10 },
        newzealand: { coords: [174, -41], risk: 10 },
        uae: { coords: [54, 24], risk: 20 },
        saudiarabia: { coords: [45, 24], risk: 30 },
        qatar: { coords: [51, 25], risk: 20 },
        kuwait: { coords: [47, 29], risk: 25 },
        oman: { coords: [57, 21], risk: 20 },
        iran: { coords: [53, 32], risk: 70 },
        iraq: { coords: [44, 33], risk: 70 },
        syria: { coords: [38, 35], risk: 80 },
        afghanistan: { coords: [67, 33], risk: 80 },
        pakistan: { coords: [69, 30], risk: 60 },
        bangladesh: { coords: [90, 24], risk: 35 },
        nepal: { coords: [84, 28], risk: 30 },
        srilanka: { coords: [81, 7], risk: 25 },
        singapore: { coords: [103, 1], risk: 10 },
        malaysia: { coords: [102, 4], risk: 15 },
        indonesia: { coords: [120, -5], risk: 20 },
        thailand: { coords: [101, 15], risk: 20 },
        vietnam: { coords: [108, 16], risk: 20 },
        philippines: { coords: [122, 12], risk: 25 },
        southafrica: { coords: [24, -29], risk: 30 },
        egypt: { coords: [30, 26], risk: 35 },
        morocco: { coords: [-7, 31], risk: 25 },
        nigeria: { coords: [8, 9], risk: 40 },
        kenya: { coords: [37, -1], risk: 30 },
        ethiopia: { coords: [40, 9], risk: 35 },
        turkey: { coords: [35, 39], risk: 25 },
        greece: { coords: [22, 39], risk: 15 },
        poland: { coords: [19, 52], risk: 15 },
        ukraine: { coords: [31, 49], risk: 40 },
        portugal: { coords: [-8, 39], risk: 15 },
        chile: { coords: [-71, -33], risk: 20 },
        colombia: { coords: [-74, 4], risk: 30 },
        peru: { coords: [-75, -9], risk: 30 }
    }

    // RISK CALCULATION MODEL
    function calculateRisk(travelerName: string, passportNum: string, countryName: string) {
        const nameLower = (travelerName || "").toLowerCase().trim()
        const key = (countryName || "").toLowerCase().replace(/\s/g, '')

        // 🚨 ZERO TOLERANCE CUSTOM RULES
        if (nameLower === "xxx") {
            return 100 // Automatic RED Alert (100 risk)
        }
        if (key === "yyy") {
            return 50 // Automatic YELLOW Warning (50 risk - Secondary Check)
        }

        // 1️⃣ Country Risk (Base mapped risk + Extreme Nations penalty)
        let countryRiskScore = countryData[key]?.risk || 20
        const extremeRiskNations = ['iran', 'pakistan', 'northkorea', 'syria', 'afghanistan', 'iraq', 'russia']
        if (extremeRiskNations.includes(key)) {
            countryRiskScore = Math.min(100, countryRiskScore + 50)
        }

        // 2️⃣ Passport Pattern Risk
        let passportRiskScore = 0
        const validPattern = /^[A-Z][0-9]{7}$/
        if (passportNum === "UNKNOWN") {
            passportRiskScore = 100
        } else if (!validPattern.test(passportNum)) {
            passportRiskScore = 80
        }
        // Duplicate passport risk addition
        const duplicate = travelers.filter(t => t.passport === passportNum)
        if (duplicate.length > 0) {
            passportRiskScore = Math.min(100, passportRiskScore + 50)
        }

        // 3️⃣ Watchlist Risk
        const isOnWatchlist = WATCHLIST.some(w => w.name === nameLower || w.passport === passportNum)
        const watchlistRiskScore = isOnWatchlist ? 100 : 0

        // Requested Formula: Risk Score = 0.5 × Country Risk + 0.3 × Passport Pattern Risk + 0.2 × Watchlist Risk
        const finalRisk = (0.5 * countryRiskScore) + (0.3 * passportRiskScore) + (0.2 * watchlistRiskScore)

        return Math.min(Math.round(finalRisk), 100)
    }

    // STATUS
    function getStatus(risk: number, isHumanitarian: boolean = false) {
        if (isHumanitarian) return "HUMANITARIAN"
        if (risk < 40) return "CLEAR"
        if (risk < 70) return "SECONDARY CHECK"
        return "ALERT"
    }

    // RISK COLOR (CSS classes)
    function getColorClass(risk: number, isHumanitarian: boolean = false) {
        if (isHumanitarian) return "bg-purple-500 text-purple-100"
        if (risk < 40) return "bg-emerald-500 text-emerald-100"
        if (risk < 70) return "bg-amber-500 text-amber-100"
        return "bg-rose-500 text-rose-100"
    }

    // Hex Colors for charts/maps
    function getHexColor(risk: number, isHumanitarian: boolean = false) {
        if (isHumanitarian) return "#a855f7" // purple
        if (risk < 40) return "#10b981" // emerald
        if (risk < 70) return "#f59e0b" // amber
        return "#f43f5e" // rose
    }

    // THREAT DETECTION
    async function checkThreat(traveler: any) {
        if (traveler.risk >= 70) {
            const threat = {
                name: traveler.name,
                passport: traveler.passport,
                risk: traveler.risk,
                note: traveler.note || "System Alert generated from Risk parameters",
                time: new Date().toLocaleTimeString()
            }

            // local optimistic update
            setThreats(prev => [threat, ...prev.slice(0, 4)])

            // remote push
            try {
                await addThreat(threat)
            } catch (err: any) {
                console.error("Firebase insert error (threats):", err.message)
                alert("Database Error: Failed to save threat to Firebase: " + err.message)
            }
        }
    }

    // SCAN PASSPORT FAST MOCK
    async function scanPassport() {
        const generatedPassport = "P" + Math.floor(Math.random() * 10000000)
        const risk = calculateRisk("Scanned Traveler", generatedPassport, "india")
        const newTraveler = {
            name: "Scanned Traveler",
            passport: generatedPassport,
            country: "India",
            risk,
            lat: 21,
            lng: 78
        }
        setTravelers([...travelers, newTraveler])
        checkThreat(newTraveler)
        recordToBlockchain(newTraveler, "QUICK_SCAN")
        try {
            await addTraveler(newTraveler)
        } catch (travErr: any) {
            console.error("Firebase insert error (travelers):", travErr.message)
            alert("Database Error: Failed to save traveler: " + travErr.message)
        }
    }

    // OCR UPLOAD
    async function uploadPassport(e: any) {
        const file = e.target.files[0]
        if (!file) return

        const formData = new FormData()
        formData.append("image", file)

        let travelerData = null;

        try {
            const res = await fetch("http://127.0.0.1:5000/scan", {
                method: "POST",
                body: formData
            })
            if (res.ok) {
                 const data = await res.json()
                 travelerData = { name: data.name, passport: data.passport, country: "India" }
            } else {
                 throw new Error("Flask server returned an error.")
            }
        } catch (err) {
            console.error("OCR scan failed or server offline. Using mock fallback.", err)
            // Fallback mock payload
            const randomID = "F" + Math.floor(Math.random() * 1000000)
            travelerData = { name: "John Doe (OCR Mock)", passport: randomID, country: "USA" }
            alert("OCR Server offline - Using fallback mock data.")
        }

        if (travelerData) {
            const risk = calculateRisk(travelerData.name, travelerData.passport, travelerData.country)
            const newTraveler = {
                name: travelerData.name,
                passport: travelerData.passport,
                country: travelerData.country,
                risk,
                lat: 21,
                lng: 78
            }
            setTravelers([...travelers, newTraveler])
            checkThreat(newTraveler)
            recordToBlockchain(newTraveler, "OCR_UPLOAD")
            try {
                await addTraveler(newTraveler)
            } catch (travErr: any) {
                console.error("Firebase insert error (travelers):", travErr.message)
                alert("Database Error: Failed to save OCR traveler: " + travErr.message)
            }
        }
    }

    // MANUAL ADD
    async function addTraveler() {
        if (!name || !passport || !country) return
        const key = country.toLowerCase().replace(/\s/g, '')
        const data = countryData[key] || { coords: [78, 21], risk: 20 }
        const coords = data.coords
        const risk = calculateRisk(name, passport, country)

        const newTraveler = {
            name,
            passport,
            country,
            risk,
            lat: coords[1],
            lng: coords[0]
        }
        setTravelers([...travelers, newTraveler])
        checkThreat(newTraveler)
        recordToBlockchain(newTraveler, "MANUAL_ENTRY")
        try {
            await addTraveler(newTraveler)
        } catch (travErr: any) {
            console.error("Firebase insert error (travelers):", travErr.message)
            alert("Database Error: Failed to save traveler: " + travErr.message)
        }

        setName("")
        setPassport("")
        setCountry("")
    }

    // ASYLUM REGISTER
    async function registerAsylum() {
        const asylumID = "T-" + Math.floor(Math.random() * 10000000)
        const conflictZones = ["Syria", "Afghanistan", "Ukraine", "Sudan", "Yemen"]
        const randomCountry = conflictZones[Math.floor(Math.random() * conflictZones.length)]
        
        const newTraveler = {
            name: "Asylum Seeker (Temp ID)",
            passport: asylumID,
            country: randomCountry,
            risk: 15, // Low security risk, but needs processing
            lat: 21,
            lng: 78,
            note: "HUMANITARIAN_PROCESSING_REQUIRED"
        }
        
        setTravelers([...travelers, newTraveler])
        recordToBlockchain(newTraveler, "ASYLUM_REGISTRATION")
        
        try {
            await addTraveler(newTraveler)
        } catch (travErr: any) {
            console.error("Firebase insert error (travelers):", travErr.message)
            alert("Database Error: Failed to save asylum record: " + travErr.message)
        }
    }

    // FACE RECOGNITION SYSTEM
    const captureAndAnalyzeFace = useCallback(async () => {
        if (!modelsLoaded) {
            alert("Facial Recognition AI models are still loading! Please wait a few seconds and try again.")
            return
        }

        const imageSrc = webcamRef.current?.getScreenshot()
        if (!imageSrc) {
            alert("Webcam not ready or permission denied.")
            return
        }

        setIsScanning(true)
        setScanResult(null)

        const img = new window.Image()
        img.src = imageSrc
        img.onload = async () => {
            try {
                const faceapi = faceapiRef.current
                if (!faceapi) return

                // Detect the user's face from the webcam snapshot
                const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
                setIsScanning(false)

                let isMatch = false
                let distance = 1.0

                if (detection && trumpDescriptor) {
                    distance = faceapi.euclideanDistance(detection.descriptor, trumpDescriptor)
                    console.log(`[Face-API] Biometric Distance to Target: ${distance}`)

                    // A typical distance threshold for face-api.js is 0.6. Below 0.6 is considered a match.
                    if (distance < 0.55) {
                        isMatch = true
                    }
                }

                if (isMatch) {
                    const watchPerson = WATCHLIST.find(w => w.name === "donald trump")!
                    const calculatedRisk = calculateRisk(watchPerson.name, watchPerson.passport, "USA")

                    setScanResult({
                        match: true,
                        person: watchPerson,
                        risk: calculatedRisk
                    })

                    const newTraveler = {
                        name: watchPerson.name.toUpperCase(),
                        passport: watchPerson.passport,
                        country: "USA",
                        risk: calculatedRisk,
                        lat: 40,
                        lng: -100,
                        note: `BIOMETRIC MATCH (Confidence: ${((1 - distance) * 100).toFixed(1)}%): ${watchPerson.reason}`
                    }

                    setTravelers(prev => [...prev, newTraveler])
                    checkThreat(newTraveler)
                    recordToBlockchain(newTraveler, "BIOMETRIC_MATCH")
                    try {
                        await addTraveler(newTraveler)
                    } catch (travErr: any) {
                        console.error("Firebase insert error (travelers):", travErr.message)
                        alert("Database Error: Failed to save face match traveler: " + travErr.message)
                    }
                } else {
                    setScanResult({
                        match: false,
                        risk: 10,
                        message: detection
                            ? "Biometrics verified. No Interpol or Watchlist matches found for this face."
                            : "No clear face detected in the frame. Please try again."
                    })
                }
            } catch (err) {
                console.error("Face API detection error:", err)
                setIsScanning(false)
                setScanResult({
                    match: false,
                    risk: 0,
                    message: "Error connecting to Biometrics engine."
                })
            }
        }
    }, [travelers, modelsLoaded, trumpDescriptor])

    // CLEAR DATABASE
    async function clearDatabase() {
        if (!confirm("Are you sure you want to delete all traveler, threat, and ledger data? This cannot be undone.")) return

        try {
            await clearAllCollections()
            // Reset local state
            setTravelers([])
            setThreats([])
            setBlocks([blockchain.getLatestBlock()])
            alert("Database cleared successfully!")
        } catch (err: any) {
            console.error("Failed to clear database:", err)
            alert("Error clearing database: " + err.message)
        }
    }

    // PASSENGER BIOMETRIC VERIFICATION LOGIC
    const finalizePassengerVerification = async (matchedWatchPerson: any, distance: number) => {
        setSelfieScanning(false)
        
        let finalName = name || "Amanda Ross"
        let finalPassport = passport || "P8204921"
        let finalCountry = country || "Canada"

        if (extractedData) {
            finalName = extractedData.name
            finalPassport = extractedData.passport
            finalCountry = extractedData.country
        }

        // If they matched a watchlist person, override details
        if (matchedWatchPerson) {
            finalName = matchedWatchPerson.name.toUpperCase()
            finalPassport = matchedWatchPerson.passport
            finalCountry = "USA"
        }

        const risk = calculateRisk(finalName, finalPassport, finalCountry)
        
        const newTraveler = {
            name: finalName,
            passport: finalPassport,
            country: finalCountry,
            risk,
            lat: 21,
            lng: 78,
            verified: true,
            note: matchedWatchPerson 
                ? `BIOMETRIC WATCHLIST ALERT: Matches Interpol Profile (${((1 - distance)*100).toFixed(1)}%)`
                : "Biometrically self-verified traveler"
        }

        // Save local state
        setTravelers(prev => [...prev, newTraveler])
        checkThreat(newTraveler)
        recordToBlockchain(newTraveler, "TRAVELER_SELF_VERIFY")

        // Save to Firebase Database
        try {
            await addTraveler(newTraveler)
            
            // If a passenger user is logged in, mark their profile as verified: true in users collection
            if (auth.currentUser) {
                await updateUserProfile(auth.currentUser.uid, {
                    verified: true,
                    risk: risk
                })
                setCurrentUserProfile(prev => ({
                    ...prev,
                    verified: true,
                    risk: risk
                }))
            }

            setVerificationPassData(newTraveler)
            setVerifStep("pass")
            addTerminalLog("Verification successfully recorded in secure database.")
        } catch (err: any) {
            console.error("Firebase save error:", err)
            alert("Database Error: Failed to save traveler profile to Firebase.")
        }
    }

    // STATS
    const alertsCount = travelers.filter(t => t.risk >= 70).length
    const safeCount = travelers.filter(t => t.risk < 40).length
    const warningCount = travelers.filter(t => t.risk >= 40 && t.risk < 70).length

    const chartData = {
        labels: ["Safe", "Secondary Check", "Alerts"],
        datasets: [{
            data: [safeCount, warningCount, alertsCount],
            backgroundColor: ["#10b981", "#f59e0b", "#f43f5e"],
            borderWidth: 0,
            hoverOffset: 4
        }]
    }

    if (!authRole) {
        return (
            <div className="min-h-screen text-slate-200 flex items-center justify-center p-4 bg-slate-950 font-sans relative overflow-x-hidden">
                {/* Secure network layout grid background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 pointer-events-none"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl translate-y-1/2 pointer-events-none"></div>

                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-xl w-full relative overflow-hidden z-10">
                    {/* Glowing status bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500"></div>

                    {/* Official Crest Header */}
                    <div className="relative z-10 flex flex-col items-center gap-2 mb-6 text-center">
                        <div className="flex items-center justify-center p-3 bg-slate-950 border border-slate-800 rounded-full relative shadow-inner">
                            <svg className="w-12 h-12 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl tracking-tight font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-slate-200 to-amber-400 pt-1">
                                SENTINELGATE IMMIGRATION
                            </h1>
                            <p className="text-[10px] text-slate-500 tracking-[0.2em] font-black uppercase mt-1">
                                Federal Security & Border Compliance Authority
                            </p>
                        </div>
                    </div>

                    {/* Official Notice */}
                    <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3 mb-6 text-[10px] text-amber-200/80 leading-normal flex items-start gap-3">
                        <FiLock className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold block mb-0.5 text-amber-400 uppercase tracking-wider">SYSTEM WARNING: AUTHORIZED ACCESS ONLY</span>
                            This is an official secure government system database. Unauthorized login, data extraction, or biometric spoofing is strictly prohibited under Federal Code 18 U.S.C. § 1030. All network handshakes and upload logs are monitored.
                        </div>
                    </div>

                    {/* Switcher Tab */}
                    <div className="flex border-b border-slate-800 mb-6 relative">
                        <button
                            onClick={() => { setLoginMode("passenger"); setLoginError(""); }}
                            className={`flex-1 pb-3 text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${loginMode === "passenger" ? "border-amber-500 text-amber-400" : "border-transparent text-slate-500 hover:text-slate-400"}`}
                        >
                            Passenger Portal
                        </button>
                        <button
                            onClick={() => { setLoginMode("officer"); setLoginError(""); }}
                            className={`flex-1 pb-3 text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${loginMode === "officer" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-400"}`}
                        >
                            Officer Terminal
                        </button>
                    </div>

                    {/* Error display */}
                    {loginError && (
                        <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-3 rounded-xl text-xs text-center font-bold mb-4">
                            {loginError}
                        </div>
                    )}

                    {/* Content Renderer */}
                    {loginMode === "officer" ? (
                        /* Officer Login Form */
                        <form onSubmit={handleAuthLogin} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Officer Email</label>
                                <input
                                    type="email"
                                    value={loginUsername}
                                    onChange={(e) => setLoginUsername(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm"
                                    placeholder="officer@sentinelgate.gov"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Passkey</label>
                                <input
                                    type="password"
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm"
                                    placeholder="••••••••••••"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2 uppercase tracking-wider text-xs"
                            >
                                <FiLock className="w-3.5 h-3.5" />
                                Authenticate Security Clearance
                            </button>
                        </form>
                    ) : (
                        /* Passenger Login/Signup */
                        <div className="space-y-4">
                            {authAction === "signin" ? (
                                <form onSubmit={handleAuthLogin} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
                                        <input
                                            type="email"
                                            value={loginUsername}
                                            onChange={(e) => setLoginUsername(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-650 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono text-sm"
                                            placeholder="passenger@email.com"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Password</label>
                                        <input
                                            type="password"
                                            value={loginPassword}
                                            onChange={(e) => setLoginPassword(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-650 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono text-sm"
                                            placeholder="••••••••••••"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full mt-2 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(217,119,6,0.3)] hover:shadow-[0_0_20px_rgba(217,119,6,0.5)] flex items-center justify-center gap-2 uppercase tracking-wider text-xs"
                                    >
                                        <FiLock className="w-3.5 h-3.5" />
                                        Log In to Portal
                                    </button>

                                    <div className="relative flex py-2 items-center">
                                        <div className="flex-grow border-t border-slate-800"></div>
                                        <span className="flex-shrink mx-4 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Or OAuth Access</span>
                                        <div className="flex-grow border-t border-slate-800"></div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleGoogleLogin}
                                        className="w-full bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                                            <path
                                                fill="currentColor"
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                            />
                                        </svg>
                                        Sign In with Google
                                    </button>

                                    <div className="text-center mt-4">
                                        <button
                                            type="button"
                                            onClick={() => { setAuthAction("signup"); setLoginError(""); }}
                                            className="text-xs text-amber-500 hover:text-amber-400 font-semibold"
                                        >
                                            Don't have a passenger account? Create one here
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handleSignup} className="space-y-3.5">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Full Legal Name</label>
                                            <input
                                                type="text"
                                                value={signupName}
                                                onChange={(e) => setSignupName(e.target.value)}
                                                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-amber-500"
                                                placeholder="JOHN DOE"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Phone Number</label>
                                            <input
                                                type="text"
                                                value={signupPhone}
                                                onChange={(e) => setSignupPhone(e.target.value)}
                                                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-amber-500"
                                                placeholder="+1 (555) 012-3456"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Date of Birth</label>
                                            <input
                                                type="date"
                                                value={signupDob}
                                                onChange={(e) => setSignupDob(e.target.value)}
                                                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-amber-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Passport Number</label>
                                            <input
                                                type="text"
                                                value={signupPassport}
                                                onChange={(e) => setSignupPassport(e.target.value)}
                                                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono placeholder-slate-700 focus:outline-none focus:border-amber-500"
                                                placeholder="L1234567"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Flight Number</label>
                                            <input
                                                type="text"
                                                value={signupFlight}
                                                onChange={(e) => setSignupFlight(e.target.value)}
                                                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono placeholder-slate-700 focus:outline-none focus:border-amber-500"
                                                placeholder="SG-302"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Email Address</label>
                                            <input
                                                type="email"
                                                value={signupEmail}
                                                onChange={(e) => setSignupEmail(e.target.value)}
                                                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-amber-500"
                                                placeholder="name@email.com"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Password</label>
                                        <input
                                            type="password"
                                            value={signupPassword}
                                            onChange={(e) => setSignupPassword(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-amber-500"
                                            placeholder="Min. 6 characters"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full mt-2 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(217,119,6,0.3)] flex items-center justify-center gap-2 uppercase tracking-wider text-xs"
                                    >
                                        <FiUserPlus className="w-4 h-4" />
                                        Register Account
                                    </button>

                                    <div className="text-center mt-3">
                                        <button
                                            type="button"
                                            onClick={() => { setAuthAction("signin"); setLoginError(""); }}
                                            className="text-xs text-amber-500 hover:text-amber-400 font-semibold"
                                        >
                                            Already have an account? Sign In here
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    if (authRole === "user") {
        const isVerified = currentUserProfile?.verified || userPassportStatus?.verified || verificationPassData?.verified;
        const currentRisk = currentUserProfile?.risk ?? 20;
        const finalStatus = getStatus(currentRisk);

        return (
            <div className="min-h-screen text-slate-200 p-4 md:p-8 bg-slate-950 font-sans relative overflow-x-hidden">
                {/* Background animations */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                {/* HEADER */}
                <header className="flex flex-col md:flex-row items-center justify-between mb-8 p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center p-2.5 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-white/10">
                            <FiShield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">
                                PASSENGER PORTAL
                            </h1>
                            <p className="text-[10px] text-slate-500 tracking-[0.2em] font-black uppercase mt-0.5">
                                Secure Digital Identity & Border Clearance
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4 md:mt-0">
                        <div className="text-right font-mono text-xs hidden sm:block">
                            <div className="text-slate-400">Passenger Account</div>
                            <div className="text-emerald-400 font-bold">{currentUserProfile?.email}</div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 hover:border-rose-500/50 text-rose-400 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 uppercase tracking-wider"
                        >
                            <FiUserX className="w-4 h-4" /> Sign Out
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                    {/* LEFT COLUMN: IDENTITY VERIFICATION & PASS */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* 1. DIGITAL TRAVEL PASS OR VERIFICATION CARD */}
                        {isVerified ? (
                            <div className="bg-slate-900/80 backdrop-blur-md border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                                {/* Watermark */}
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
                                    <FiShield className="w-80 h-80 text-amber-500" />
                                </div>
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500"></div>

                                <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
                                    <div>
                                        <h2 className="text-lg font-black text-amber-400 uppercase tracking-widest">Border Intelligence Travel Pass</h2>
                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">FEDERAL IMMIGRATION COMPLIANCE STATUS</p>
                                    </div>
                                    <span className="text-[10px] px-3 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-bold tracking-widest uppercase">
                                        SECURE PASS
                                    </span>
                                </div>

                                <div className="flex flex-col md:flex-row gap-8 items-center">
                                    {/* Verification Stamp */}
                                    <div className="flex flex-col items-center justify-center p-6 bg-slate-950/60 border border-slate-800 rounded-2xl w-48 text-center shrink-0">
                                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center mb-4">
                                            <FiCheckCircle className="w-8 h-8 text-emerald-400" />
                                        </div>
                                        <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Clearance Status</span>
                                        <span className="text-emerald-400 font-black text-sm uppercase tracking-widest mt-1 block">
                                            {finalStatus}
                                        </span>
                                    </div>

                                    {/* Pass details */}
                                    <div className="flex-1 w-full space-y-4">
                                        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                                            <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                                                <span className="text-[9px] text-slate-500 uppercase block mb-0.5">Legal Name</span>
                                                <span className="font-bold text-white uppercase text-sm">{currentUserProfile?.name}</span>
                                            </div>
                                            <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                                                <span className="text-[9px] text-slate-500 uppercase block mb-0.5">Passport ID</span>
                                                <span className="font-bold text-white text-sm">{currentUserProfile?.passport}</span>
                                            </div>
                                            <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                                                <span className="text-[9px] text-slate-500 uppercase block mb-0.5">Flight Code</span>
                                                <span className="font-bold text-white text-sm">{currentUserProfile?.flightNo}</span>
                                            </div>
                                            <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                                                <span className="text-[9px] text-slate-500 uppercase block mb-0.5">Risk Score</span>
                                                <span className="font-bold text-white text-sm">{currentRisk}%</span>
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
                                            <div className="text-[9px] font-mono text-slate-500 leading-normal max-w-[70%]">
                                                <div>IMMUTABLE LEDGER HASH:</div>
                                                <div className="text-slate-400 break-all">
                                                    {blockchain.calculateHash(currentRisk, new Date().toISOString(), "PREV_PASS_VERIFICATION_HASH", currentUserProfile)}
                                                </div>
                                            </div>
                                            {/* QR MOCK */}
                                            <div className="w-14 h-14 bg-white p-1 rounded shrink-0 border border-slate-700">
                                                <div className="w-full h-full bg-[linear-gradient(45deg,#000_25%,transparent_25%),linear-gradient(-45deg,#000_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#000_75%),linear-gradient(-45deg,transparent_75%,#000_75%)] bg-[size:4px_4px] bg-slate-950"></div>
                                            </div>
                                        </div>

                                        <div className="pt-2 flex gap-3">
                                            <button
                                                onClick={() => alert("Digital travel pass printed to systems spooler.")}
                                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center justify-center gap-1.5"
                                            >
                                                <FiPrinter className="w-3.5 h-3.5" /> Print Travel Pass
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* VERIFICATION FLOW WIZARD */
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>

                                {verifStep === "form" && (
                                    <div className="space-y-6">
                                        <div>
                                            <h2 className="text-xl font-bold text-white uppercase tracking-wider">Digital Selfie & Passport Verification</h2>
                                            <p className="text-xs text-slate-400 mt-1">Complete your secure border audit dynamically in the web portal to bypass manual queue lines.</p>
                                        </div>

                                        <div className="flex justify-between items-center bg-slate-950/60 p-4 border border-slate-800 rounded-2xl">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
                                                    <FiFileText className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-white uppercase">Passport Document Verification</div>
                                                    <div className="text-[10px] text-slate-500">Upload your passport photo page image for scanning and OCR parsing.</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Upload passport zone */}
                                        <div className="relative border-2 border-dashed border-slate-850 hover:border-amber-500/40 rounded-2xl p-8 transition-all bg-slate-950/40 hover:bg-slate-950/70 flex flex-col items-center justify-center text-center group cursor-pointer">
                                            <input
                                                type="file"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) {
                                                        setPassportImageName(file.name)
                                                        setMrzScanning(true)
                                                        setTerminalLogs([])
                                                        addTerminalLog("Scanning uploaded document...")
                                                        addTerminalLog("Connecting OCR engine...")
                                                        
                                                        // Fake scanning delay
                                                        setTimeout(() => {
                                                            addTerminalLog("Extracting Machine Readable Zone (MRZ)...")
                                                        }, 500)
                                                        setTimeout(() => {
                                                            addTerminalLog("Verifying document signatures...")
                                                        }, 1200)
                                                        setTimeout(() => {
                                                            const mockExtracted = {
                                                                name: currentUserProfile?.name || "ALEXANDER WRIGHT",
                                                                passport: currentUserProfile?.passport || "P1038291",
                                                                country: "Canada"
                                                            }
                                                            setExtractedData(mockExtracted)
                                                            setName(mockExtracted.name)
                                                            setPassport(mockExtracted.passport)
                                                            setCountry(mockExtracted.country)
                                                            setMrzScanning(false)
                                                            setVerifStep("biometric")
                                                            addTerminalLog("Extraction complete: Passport details parsed.")
                                                        }, 2200)
                                                    }
                                                }}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <FiUploadCloud className="w-12 h-12 text-slate-500 group-hover:text-amber-400 mb-2 transition-colors" />
                                            <span className="text-xs font-bold text-slate-300 group-hover:text-white">Upload Passport Photo Page</span>
                                            <span className="text-[10px] text-slate-500 mt-1">Accepts JPEG, PNG up to 10MB</span>
                                        </div>

                                        <div className="text-center font-mono">
                                            <span className="text-slate-500 text-[10px] uppercase">OR SKIP AND VERIFY DIRECTLY WITH REGISTERED PASSPORT ID</span>
                                            <button
                                                onClick={() => {
                                                    setVerifStep("biometric")
                                                    setName(currentUserProfile?.name || "")
                                                    setPassport(currentUserProfile?.passport || "")
                                                    setCountry("Canada")
                                                }}
                                                className="block mx-auto mt-2 text-xs text-amber-500 hover:text-amber-400 font-bold border border-amber-500/30 px-4 py-2 rounded-xl bg-amber-500/5 hover:bg-amber-500/10"
                                            >
                                                Proceed with Passport {currentUserProfile?.passport}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {verifStep === "biometric" && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <div>
                                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Webcam Liveness Selfie Scan</h3>
                                                <p className="text-[10px] text-slate-500 font-mono">Passport Reference: {passport || currentUserProfile?.passport}</p>
                                            </div>
                                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">STEP 2/2</span>
                                        </div>

                                        {/* Passenger Webcam Viewer */}
                                        <div className="relative w-full h-64 bg-black rounded-2xl overflow-hidden shadow-inner border border-slate-800 flex items-center justify-center">
                                            <Webcam
                                                ref={passengerWebcamRef}
                                                audio={false}
                                                screenshotFormat="image/jpeg"
                                                videoConstraints={{ facingMode: "user" }}
                                                className="object-cover w-full h-full opacity-80"
                                            />

                                            {/* Overlay graphics */}
                                            <div className="absolute inset-0 border-2 border-amber-500/20 m-6 rounded-xl pointer-events-none">
                                                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-amber-400 rounded-tl"></div>
                                                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-amber-400 rounded-tr"></div>
                                                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-amber-400 rounded-bl"></div>
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-amber-400 rounded-br"></div>
                                            </div>

                                            {selfieScanning && (
                                                <div className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center backdrop-blur-[1px]">
                                                    <div className="w-full h-0.5 bg-amber-400 animate-scan-line shadow-[0_0_10px_rgba(245,158,11,0.8)] absolute top-0 left-0"></div>
                                                    <FiAperture className="w-8 h-8 text-white animate-spin mb-2" />
                                                    <p className="text-white font-mono text-[10px] tracking-widest uppercase">Matching biometric node structure...</p>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={async () => {
                                                if (!modelsLoaded) {
                                                    alert("Facial recognition model database is initializing. Standby 3 seconds...")
                                                    return
                                                }

                                                const imageSrc = passengerWebcamRef.current?.getScreenshot()
                                                if (!imageSrc) {
                                                    alert("Webcam is not ready.")
                                                    return
                                                }

                                                setSelfieScanning(true)
                                                addTerminalLog("Scanning facial markers...")
                                                addTerminalLog("Running Watchlist databases lookup...")

                                                setTimeout(async () => {
                                                    try {
                                                        const img = new window.Image()
                                                        img.src = imageSrc
                                                        img.onload = async () => {
                                                            const faceapi = faceapiRef.current
                                                            if (!faceapi) {
                                                                finalizePassengerVerification(null, 1.0)
                                                                return
                                                            }
                                                            const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
                                                            let distance = 1.0
                                                            let matchPerson = null
                                                            if (detection && trumpDescriptor) {
                                                                distance = faceapi.euclideanDistance(detection.descriptor, trumpDescriptor)
                                                                if (distance < 0.55) {
                                                                    matchPerson = WATCHLIST.find(w => w.name === "donald trump")
                                                                }
                                                            }
                                                            finalizePassengerVerification(matchPerson, distance)
                                                        }
                                                    } catch (err) {
                                                        console.error("Biometric match failed:", err)
                                                        finalizePassengerVerification(null, 1.0)
                                                    }
                                                }, 2000)
                                            }}
                                            disabled={selfieScanning}
                                            className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-650 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(217,119,6,0.3)] flex items-center justify-center gap-2 uppercase tracking-wider text-xs"
                                        >
                                            <FiUserCheck className="w-4 h-4" />
                                            {selfieScanning ? "Matching Face Biometrics..." : "Perform Face Identity Audit"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 2. FLIGHT DETAILS CARD */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                                <h3 className="text-md font-bold text-white uppercase tracking-wider">Flight Operations Status</h3>
                                <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono font-bold tracking-wider">
                                    ON TIME
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                                <div>
                                    <span className="text-[9px] text-slate-500 block uppercase mb-1">Flight Number</span>
                                    <span className="font-bold text-white text-sm">{currentUserProfile?.flightNo || "SG-101"}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] text-slate-500 block uppercase mb-1">Departure</span>
                                    <span className="font-bold text-white text-sm">New Delhi (DEL)</span>
                                </div>
                                <div>
                                    <span className="text-[9px] text-slate-500 block uppercase mb-1">Arrival HQ</span>
                                    <span className="font-bold text-white text-sm">Immigration HQ</span>
                                </div>
                                <div>
                                    <span className="text-[9px] text-slate-500 block uppercase mb-1">Boarding Gate</span>
                                    <span className="font-bold text-amber-400 text-sm">Gate B12</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: USER PROFILE DETAILS & FORM */}
                    <div className="space-y-8">
                        {/* PROFILE CARD */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-blue-500"></div>
                            <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                                <FiUserCheck className="w-5 h-5 text-emerald-400" />
                                <h3 className="text-md font-bold text-white uppercase tracking-wider">Personal Identity Dossier</h3>
                            </div>

                            <div className="space-y-3.5 text-xs font-mono">
                                <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-slate-800">
                                    <span className="text-slate-500">FULL LEGAL NAME</span>
                                    <span className="text-white font-bold uppercase">{currentUserProfile?.name}</span>
                                </div>
                                <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-slate-800">
                                    <span className="text-slate-500">PASSPORT ID</span>
                                    <span className="text-white font-bold">{currentUserProfile?.passport}</span>
                                </div>
                                <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-slate-800">
                                    <span className="text-slate-500">EMAIL ADDRESS</span>
                                    <span className="text-white font-bold">{currentUserProfile?.email}</span>
                                </div>
                                <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-slate-800">
                                    <span className="text-slate-500">PHONE NUMBER</span>
                                    <span className="text-white font-bold">{currentUserProfile?.phone}</span>
                                </div>
                                <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-slate-800">
                                    <span className="text-slate-500">DATE OF BIRTH</span>
                                    <span className="text-white font-bold">{currentUserProfile?.dob}</span>
                                </div>
                                <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-slate-800">
                                    <span className="text-slate-500">BIOMETRIC SECURITY SCORE</span>
                                    <span className="text-amber-400 font-bold">{currentRisk}% Risk</span>
                                </div>
                            </div>
                        </div>

                        {/* QUICK PROFILE UPDATE */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                            <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
                                <FiActivity className="w-5 h-5 text-blue-400" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Update Details</h3>
                            </div>
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    const form = e.currentTarget;
                                    const phone = (form.elements.namedItem("phone") as HTMLInputElement).value;
                                    const flight = (form.elements.namedItem("flightNo") as HTMLInputElement).value;
                                    try {
                                        if (auth.currentUser) {
                                            const updatedData = {
                                                phone: phone || currentUserProfile.phone,
                                                flightNo: flight || currentUserProfile.flightNo
                                            };
                                            await updateUserProfile(auth.currentUser.uid, updatedData);
                                            setCurrentUserProfile((prev: any) => ({
                                                ...prev,
                                                ...updatedData
                                            }));
                                            alert("Identity dossier updated successfully!");
                                        }
                                    } catch (err: any) {
                                        console.error("Update error:", err);
                                        alert("Failed to update profile: " + err.message);
                                    }
                                }}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">New Contact Phone</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        defaultValue={currentUserProfile?.phone}
                                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-blue-500"
                                        placeholder="+1 (555) 012-3456"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">New Flight Connection</label>
                                    <input
                                        type="text"
                                        name="flightNo"
                                        defaultValue={currentUserProfile?.flightNo}
                                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono placeholder-slate-700 focus:outline-none focus:border-blue-500"
                                        placeholder="SG-302"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-750 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors"
                                >
                                    Push Dossier Update
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen text-slate-200 p-4 md:p-8 font-sans selection:bg-indigo-500/30">
            <Script src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js" strategy="afterInteractive" />

            {/* HEADER */}
            <header className="flex flex-col xl:flex-row items-center justify-between mb-8 p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                <div className="flex items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center p-2.5 bg-gradient-to-br from-indigo-500 via-blue-500 to-emerald-500 rounded-xl shadow-[0_0_20px_rgba(56,189,248,0.4)] border border-white/20 relative">
                                <GiCrossedSwords className="w-10 h-10 text-slate-900/40 absolute mt-1" />
                                <FiShield className="w-7 h-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] relative z-10" />
                            </div>
                            <h1 className="text-3xl tracking-tight font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 pt-1">
                                SentinelGate Intelligence
                            </h1>
                            {dbStatus === "connecting" && (
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-500/20 text-slate-400 border border-slate-500/30 animate-pulse mt-1">Connecting API...</span>
                            )}
                            {dbStatus === "connected" && (
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mt-1">Backend Active</span>
                            )}
                            {dbStatus === "error" && (
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 mt-1">DB Error (Check Console)</span>
                            )}
                        </div>
                        <p className="text-slate-400 text-sm font-medium tracking-wider uppercase mt-2 ml-[60px]">
                            Global Border Security & Risk Assessment
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2 lg:gap-4 mt-6 xl:mt-0 w-full xl:w-auto overflow-visible">

                    <button
                        onClick={() => setShowFaceScan(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-rose-600/90 hover:bg-rose-500 text-white font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:shadow-[0_0_25px_rgba(225,29,72,0.6)] border border-rose-500/50"
                    >
                        <FiAperture className="w-5 h-5 text-rose-200" />
                        <span>Biometric Scan</span>
                    </button>

                    <div className="w-px h-8 bg-slate-700 hidden sm:block"></div>

                    <div className="relative group">
                        <input
                            type="file"
                            onChange={uploadPassport}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            title="Upload Passport for OCR"
                        />
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-600 transition-all shadow-lg group-hover:border-slate-400">
                            <FiCamera className="w-5 h-5 text-indigo-400" />
                            <span>OCR Upload</span>
                        </button>
                    </div>

                    <button
                        onClick={scanPassport}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_25px_rgba(79,70,229,0.6)]"
                    >
                        <FiSearch className="w-5 h-5" />
                        <span>Quick Scan</span>
                    </button>

                    <button
                        onClick={registerAsylum}
                        className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] border border-purple-500/50"
                    >
                        <FiHeart className="w-5 h-5 text-purple-200" />
                        <span>Asylum Request</span>
                    </button>

                    <div className="w-px h-8 bg-slate-700 hidden sm:block mx-1"></div>
                    
                    <button
                        onClick={clearDatabase}
                        title="Clear all travelers and threats"
                        className="flex items-center justify-center p-2.5 bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-600 hover:border-rose-500/50 transition-all"
                    >
                        <FiTrash2 className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => setAuthRole(null)}
                        title="Sign Out"
                        className="flex items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-600 hover:border-slate-500 transition-all ml-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 hover:border-rose-500/50"
                    >
                        <FiUserX className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* STATS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                    { icon: FiActivity, label: "Total Travelers", val: travelers.length, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-500/20" },
                    { icon: FiCheckCircle, label: "Cleared / Safe", val: safeCount, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-500/20" },
                    { icon: FiAlertOctagon, label: "Secondary Checks", val: warningCount, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-500/20" },
                    { icon: FiShield, label: "Active Threats", val: alertsCount, color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.3)] text-rose-100" }
                ].map((stat, i) => (
                    <div key={i} className={`p-6 rounded-2xl bg-white/5 backdrop-blur-md border ${stat.border} flex items-center gap-5 transition-transform hover:scale-[1.02]`}>
                        <div className={`p-4 rounded-xl ${stat.bg}`}>
                            <stat.icon className={`w-8 h-8 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">{stat.label}</p>
                            <h3 className="text-3xl font-bold mt-1 text-white">{stat.val}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* LEFT COLUMN */}
                <div className="xl:col-span-2 space-y-8">

                    {/* MAP */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-transparent opacity-50"></div>
                        <div className="flex items-center gap-3 mb-6">
                            <FiGlobe className="w-6 h-6 text-emerald-400" />
                            <h2 className="text-xl font-bold text-white">Live Global Tracking</h2>
                        </div>
                        <div className="w-full h-[450px] bg-slate-950 rounded-xl border border-white/5 overflow-hidden flex items-center justify-center pt-8 relative">

                            {/* RADAR SWEEP ANIMATION OVERLAY */}
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden opacity-50">
                                <div className="absolute w-[800px] h-[800px] rounded-full animate-radar-spin" 
                                     style={{ background: 'conic-gradient(from 0deg, transparent 70%, rgba(16, 185, 129, 0.1) 90%, rgba(16, 185, 129, 0.4) 100%)' }}>
                                </div>
                                {/* Crosshairs */}
                                <div className="absolute w-full h-[1px] bg-emerald-500/10"></div>
                                <div className="absolute h-full w-[1px] bg-emerald-500/10"></div>
                                {/* Concentric rings */}
                                <div className="absolute w-[200px] h-[200px] rounded-full border border-emerald-500/10"></div>
                                <div className="absolute w-[400px] h-[400px] rounded-full border border-emerald-500/10"></div>
                                <div className="absolute w-[600px] h-[600px] rounded-full border border-emerald-500/10"></div>
                            </div>

                            <ComposableMap projectionConfig={{ scale: 320, center: [15, 10] }} style={{ width: "100%", height: "100%" }} className="relative z-10">
                                <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
                                    {({ geographies }) => geographies.map(geo => (
                                        <Geography
                                            key={geo.rsmKey}
                                            geography={geo}
                                            fill="#1e293b"
                                            stroke="#334155"
                                            strokeWidth={0.5}
                                            style={{
                                                default: { outline: "none" },
                                                hover: { fill: "#334155", outline: "none", transition: "all 0.2s ease" },
                                                pressed: { outline: "none" }
                                            }}
                                        />
                                    ))}
                                </Geographies>

                                {/* FLIGHT PATHS TO INDIA HQ */}
                                {travelers.map((t, i) => {
                                    const destCoords: [number, number] = [t.lng, t.lat]
                                    const hqCoords: [number, number] = [78, 21]

                                    // Skip line if traveler is locally identified at HQ (India)
                                    if (destCoords[0] === hqCoords[0] && destCoords[1] === hqCoords[1]) return null

                                    return (
                                        <Line
                                            key={`flight-${i}`}
                                            from={hqCoords} // Terminal HQ
                                            to={destCoords} // Origin
                                            stroke={getHexColor(t.risk, t.note === "HUMANITARIAN_PROCESSING_REQUIRED")}
                                            strokeWidth={t.risk >= 70 ? 2 : 1.5}
                                            strokeLinecap="round"
                                            style={{
                                                strokeDasharray: t.risk >= 70 ? "4 4" : "2 6",
                                                animation: "dash 5s linear infinite",
                                                opacity: t.risk >= 70 ? 0.9 : 0.5
                                            }}
                                        />
                                    )
                                })}

                                {/* ORIGIN MARKERS */}
                                {travelers.map((t, i) => (
                                    <Marker key={i} coordinates={[t.lng, t.lat]}>
                                        <circle 
                                            r={t.risk >= 70 ? 12 : 4} 
                                            fill={getHexColor(t.risk, t.note === "HUMANITARIAN_PROCESSING_REQUIRED")} 
                                            className={t.risk >= 70 ? "animate-military-ping transform-origin-center" : ""} 
                                        />
                                        <circle r={t.risk >= 70 ? 5 : 4} fill={getHexColor(t.risk, t.note === "HUMANITARIAN_PROCESSING_REQUIRED")} />
                                    </Marker>
                                ))}

                                {/* CENTRAL COMMAND (INDIA HQ) */}
                                <Marker coordinates={[78, 21]}>
                                    <circle r={7} fill="#6366f1" className="animate-pulse opacity-80" />
                                    <circle r={4} fill="#818cf8" />
                                </Marker>

                            </ComposableMap>
                        </div>
                    </div>
                    {/* TABLE LOG */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FiMapPin className="w-6 h-6 text-blue-400" />
                                <h2 className="text-xl font-bold text-white">Recent Travelers</h2>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-900/80 text-slate-400 text-sm uppercase tracking-widest">
                                        <th className="p-4 font-semibold whitespace-nowrap">Name</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Passport</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Country</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Risk Score</th>
                                        <th className="p-4 font-semibold whitespace-nowrap">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {travelers.slice().reverse().map((t, i) => {
                                        const isHumanitarian = t.note === "HUMANITARIAN_PROCESSING_REQUIRED"
                                        const status = getStatus(t.risk, isHumanitarian)
                                        const isThreat = t.risk >= 70
                                        return (
                                            <tr 
                                                key={i} 
                                                onClick={() => handleTravelerRowClick(t)}
                                                className={`transition-colors group cursor-pointer ${isThreat ? 'animate-siren bg-rose-950/20 hover:bg-rose-950/30' : isHumanitarian ? 'bg-purple-950/20 hover:bg-purple-950/30' : 'hover:bg-white/5'}`}
                                                title="Click to inspect advanced details"
                                            >
                                                <td className={`p-4 font-medium ${isThreat ? 'text-rose-200' : isHumanitarian ? 'text-purple-200' : 'text-white'}`}>{t.name}</td>
                                                <td className="p-4 text-slate-300 font-mono text-sm">{t.passport}</td>
                                                <td className="p-4 text-slate-300">{t.country}</td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                                                style={{ width: `${t.risk}%`, backgroundColor: getHexColor(t.risk, isHumanitarian) }}
                                                            />
                                                        </div>
                                                        <span className="text-sm font-bold w-10 text-right">{t.risk}%</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide ${getColorClass(t.risk, isHumanitarian)}`}>
                                                        {status}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            {travelers.length === 0 && (
                                <div className="p-8 text-center text-slate-500">No travelers recorded yet.</div>
                            )}
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-8">

                    {/* MANUAL ENTRY FORM */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                            <FiUserPlus className="w-6 h-6 text-indigo-400" />
                            <h2 className="text-xl font-bold text-white">Manual Verification</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Traveler Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Passport</label>
                                    <input
                                        type="text"
                                        placeholder="X1234567"
                                        value={passport}
                                        onChange={(e) => setPassport(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Country</label>
                                    <input
                                        type="text"
                                        placeholder="Origin"
                                        value={country}
                                        onChange={(e) => setCountry(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={addTraveler}
                                disabled={!name || !passport || !country}
                                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] disabled:shadow-none"
                            >
                                Assess Risk & Add
                            </button>
                        </div>
                    </div>

                    {/* RISK CHART */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col items-center">
                        <h2 className="text-xl font-bold text-white w-full text-left mb-6 flex items-center gap-3">
                            <FiActivity className="w-5 h-5 text-amber-400" />
                            Assessment Ratio
                        </h2>
                        <div className="w-[220px] h-[220px]">
                            <Pie
                                data={chartData}
                                options={{
                                    plugins: {
                                        legend: { position: 'bottom', labels: { color: '#cbd5e1', padding: 20, font: { family: 'inherit' } } }
                                    },
                                    cutout: '60%',
                                    layout: { padding: 10 }
                                }}
                            />
                        </div>
                    </div>

                    {/* THREAT ALERTS */}
                    <div className="bg-rose-950/20 backdrop-blur-xl border border-rose-500/20 rounded-2xl p-6 shadow-[0_0_30px_rgba(225,29,72,0.1)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <FiShield className="w-24 h-24 text-rose-500" />
                        </div>
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-rose-500/20 relative z-10">
                            <FiAlertOctagon className="w-6 h-6 text-rose-500 animate-pulse" />
                            <h2 className="text-xl font-bold text-rose-100 uppercase tracking-widest">Active Threats</h2>
                        </div>

                        <div className="space-y-4 relative z-10 max-h-72 overflow-y-auto pr-2">
                            {threats.length === 0 ? (
                                <div className="text-center p-6 border border-dashed border-emerald-500/30 rounded-xl bg-emerald-950/20">
                                    <FiCheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-50" />
                                    <p className="text-emerald-400 font-medium">No critical threats currently detected.</p>
                                </div>
                            ) : (
                                threats.map((t, i) => (
                                    <div key={i} className="animate-siren bg-rose-950/50 border border-rose-500/30 p-4 rounded-xl flex items-start gap-4">
                                        <div className="w-2 min-h-full self-stretch bg-rose-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.6)]"></div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <strong className="text-rose-100 font-bold">{t.name}</strong>
                                                <span className="text-xs text-rose-100 font-mono bg-rose-950/90 px-2 py-0.5 rounded border border-rose-500/50">{t.time}</span>
                                            </div>
                                            <div className="text-sm text-rose-200/90 mb-2 font-mono uppercase tracking-wide">
                                                ID: {t.passport}
                                            </div>

                                            {t.note && (
                                                <div className="text-xs font-bold text-rose-100 bg-rose-900/80 p-2 rounded mb-2 border border-rose-500/40">
                                                    {t.note}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-rose-300 uppercase">Threat Level:</span>
                                                <div className="flex-1 h-1.5 bg-rose-950 rounded-full overflow-hidden">
                                                    <div className="h-full bg-rose-500" style={{ width: `${t.risk}%` }}></div>
                                                </div>
                                                <span className="text-xs font-black text-rose-400">{t.risk}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* SECURE BLOCKCHAIN LEDGER */}
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-indigo-500/20 rounded-2xl p-6 shadow-[0_0_30px_rgba(79,70,229,0.1)] relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-indigo-500/20">
                            <FiLayers className="w-6 h-6 text-indigo-400" />
                            <h2 className="text-xl font-bold text-indigo-100 uppercase tracking-widest">Immutable Blockchain Audit Log</h2>
                        </div>
                        <div className="space-y-4 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                            {blocks.slice().reverse().map((b) => (
                                <div key={b.index} className="bg-slate-950/80 border border-indigo-500/30 p-4 rounded-xl relative group hover:border-indigo-400/50 transition-colors">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-black tracking-wider text-indigo-300">BLOCK #{b.index}</span>
                                        <span className="text-[10px] text-slate-500 font-mono tracking-widest">{new Date(b.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    
                                    <div className="text-[10px] text-slate-400 font-mono break-all mb-3 bg-black/60 p-2 rounded border border-slate-800/80">
                                        <div className="mb-1"><span className="text-slate-600">Hash: </span><span className="text-emerald-400/90">{b.hash}</span></div>
                                        <div><span className="text-slate-600">Prev Hash: </span><span className="text-slate-400">{b.previousHash}</span></div>
                                    </div>

                                    <div className="text-xs text-indigo-100/80 bg-indigo-950/30 p-2 rounded">
                                        <span className="font-bold text-indigo-300">[{b.data.event}]</span> - {b.data.name || "System"} (Risk: {b.data.riskScore || 0}%)
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {/* ADMIN TRAVELER INSPECTOR MODAL */}
            {showDetailModal && selectedTravelerDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in-up">
                    <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-2xl w-full relative overflow-hidden">
                        
                        {/* Status glow border */}
                        <div className={`absolute top-0 left-0 right-0 h-1.5 ${selectedTravelerDetail.risk >= 70 ? 'bg-rose-500' : selectedTravelerDetail.risk >= 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>

                        <button
                            onClick={() => { setShowDetailModal(false); setSelectedTravelerDetail(null); }}
                            className="absolute top-5 right-5 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors z-20"
                        >
                            <FiX className="w-5 h-5" />
                        </button>

                        <div className="relative z-10 flex items-center gap-3 mb-6">
                            <div className={`p-2 rounded-xl border ${selectedTravelerDetail.risk >= 70 ? 'bg-rose-500/20 border-rose-500/30' : 'bg-slate-800 border-slate-700'}`}>
                                <FiUserCheck className={`w-6 h-6 ${selectedTravelerDetail.risk >= 70 ? 'text-rose-400' : 'text-indigo-400'}`} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">Security Dossier Audit</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Machine ID: Ref-{selectedTravelerDetail.passport}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* LEFT COLUMN: VISUAL STAMPS */}
                            <div className="space-y-4">
                                <div className="bg-slate-950/60 p-4 border border-slate-800 rounded-2xl text-center">
                                    <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-700 mx-auto flex items-center justify-center mb-3 overflow-hidden relative">
                                        <svg className="w-12 h-12 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                        </svg>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono uppercase">Biometric Match Profile</span>
                                    <h3 className="font-bold text-lg text-white uppercase mt-0.5">{selectedTravelerDetail.name}</h3>
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-black tracking-wide mt-2 ${getColorClass(selectedTravelerDetail.risk, selectedTravelerDetail.note === "HUMANITARIAN_PROCESSING_REQUIRED")}`}>
                                        {getStatus(selectedTravelerDetail.risk, selectedTravelerDetail.note === "HUMANITARIAN_PROCESSING_REQUIRED")}
                                    </span>
                                </div>

                                <div className="bg-slate-950/60 p-4 border border-slate-800 rounded-2xl font-mono text-[11px] space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">PASSPORT NO</span>
                                        <span className="text-white font-bold">{selectedTravelerDetail.passport}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">ORIGIN NATION</span>
                                        <span className="text-white font-bold uppercase">{selectedTravelerDetail.country}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">RISK INDEX</span>
                                        <span className="text-amber-400 font-bold">{selectedTravelerDetail.risk}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">PORTAL STATUS</span>
                                        <span className={selectedTravelerDetail.isRegisteredUser ? "text-emerald-400 font-bold" : "text-slate-500 font-bold"}>
                                            {selectedTravelerDetail.isRegisteredUser ? "Verified Account" : "Guest Pass"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: CORRELATION DATA */}
                            <div className="space-y-4 font-mono text-[11px]">
                                <div className="bg-slate-950/60 p-4 border border-slate-800 rounded-2xl space-y-3">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-1.5">Personal Profile</h4>
                                    <div>
                                        <span className="text-slate-500 block uppercase text-[9px]">Contact Email</span>
                                        <span className="text-white font-bold text-xs">{selectedTravelerDetail.email || "N/A (Offline scan)"}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block uppercase text-[9px]">Contact Phone</span>
                                        <span className="text-white font-bold text-xs">{selectedTravelerDetail.phone || "N/A (Offline scan)"}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block uppercase text-[9px]">Date of Birth</span>
                                        <span className="text-white font-bold text-xs">{selectedTravelerDetail.dob || "N/A (Offline scan)"}</span>
                                    </div>
                                </div>

                                <div className="bg-slate-950/60 p-4 border border-slate-800 rounded-2xl space-y-3">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-1.5">Flight Connection</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="text-slate-500 block uppercase text-[9px]">Flight Code</span>
                                            <span className="text-white font-bold text-xs">{selectedTravelerDetail.flightNo || "N/A"}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block uppercase text-[9px]">Gate Assign</span>
                                            <span className="text-amber-400 font-bold text-xs font-mono">Gate B12</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block uppercase text-[9px]">Operation Status</span>
                                        <span className="text-white font-bold text-[10px]">Boarding / Checkpoint Pass Issued</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {selectedTravelerDetail.note && (
                            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-xs text-slate-400 mb-6 font-mono">
                                <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">IMPRINTED RISK ASSESSOR DATA / FLAG NOTES:</span>
                                {selectedTravelerDetail.note}
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    alert("Immigration verification certificate printed for ledger records.")
                                }}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border border-slate-750"
                            >
                                Print Verification Record
                            </button>
                            <button
                                onClick={() => { setShowDetailModal(false); setSelectedTravelerDetail(null); }}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                            >
                                Close Dossier Audit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FACE RECOGNITION MODAL */}
            {showFaceScan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in-up">
                    <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-lg w-full relative overflow-hidden">

                        {/* Background glowing orb */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                        <button
                            onClick={() => { setShowFaceScan(false); setScanResult(null); setIsScanning(false); }}
                            className="absolute top-5 right-5 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors z-20"
                        >
                            <FiX className="w-5 h-5" />
                        </button>

                        <div className="relative z-10 flex items-center gap-3 mb-6">
                            <div className="p-2 bg-rose-500/20 rounded-xl border border-rose-500/30">
                                <FiAperture className="w-6 h-6 text-rose-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Biometric System Scan</h2>
                        </div>

                        <div className="relative z-10 w-full h-64 bg-black rounded-2xl overflow-hidden shadow-inner mb-6 flex items-center justify-center border border-slate-700">
                            <Webcam
                                ref={webcamRef}
                                audio={false}
                                screenshotFormat="image/jpeg"
                                videoConstraints={{ facingMode: "user" }}
                                className="object-cover w-full h-full opacity-70"
                            />

                            {/* Overlay graphics */}
                            <div className="absolute inset-0 border-2 border-indigo-500/30 m-8 rounded-xl pointer-events-none transition-all duration-300">
                                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg"></div>
                                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg"></div>
                                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg"></div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg"></div>
                            </div>

                            {isScanning && (
                                <div className="absolute inset-0 bg-indigo-950/40 flex flex-col items-center justify-center backdrop-blur-[2px]">
                                    <div className="w-full h-1 bg-rose-500 animate-scan-line shadow-[0_0_15px_rgba(244,63,94,1)] absolute top-0 left-0"></div>
                                    <FiActivity className="w-10 h-10 text-white animate-spin mb-3" />
                                    <p className="text-white font-mono font-bold tracking-widest uppercase text-sm">Matching Watchlist...</p>
                                </div>
                            )}
                        </div>

                        <div className="relative z-10">
                            {!scanResult ? (
                                <button
                                    onClick={captureAndAnalyzeFace}
                                    disabled={isScanning}
                                    className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(225,29,72,0.3)] hover:shadow-[0_0_20px_rgba(225,29,72,0.5)] disabled:shadow-none flex justify-center items-center gap-3 text-lg"
                                >
                                    <FiUserX className="w-5 h-5" />
                                    {isScanning ? "Processing Match..." : "Initialize Identity Check"}
                                </button>
                            ) : (
                                <div className={`p-6 rounded-2xl border ${scanResult.match ? 'bg-rose-950/60 border-rose-500/50' : 'bg-emerald-950/60 border-emerald-500/50'} animate-fade-in-up shadow-xl`}>
                                    {scanResult.match ? (
                                        <>
                                            <div className="flex items-center gap-3 text-rose-400 mb-3 border-b border-rose-500/20 pb-2">
                                                <FiAlertOctagon className="w-7 h-7" />
                                                <h3 className="font-bold text-xl uppercase tracking-wider">Watchlist Found!</h3>
                                            </div>
                                            <div className="text-slate-200">
                                                <p className="font-bold text-2xl uppercase mb-1">{scanResult.person.name}</p>
                                                <p className="text-sm text-slate-400 font-mono mb-3">ID: {scanResult.person.passport}</p>
                                                <div className="bg-rose-900/60 text-rose-200 py-2 px-4 rounded-lg text-center font-bold tracking-wide uppercase border border-rose-500/30">
                                                    {scanResult.person.reason}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3 text-emerald-400 mb-3 border-b border-emerald-500/20 pb-2">
                                                <FiCheckCircle className="w-7 h-7" />
                                                <h3 className="font-bold text-xl uppercase tracking-wider">Identity Cleared</h3>
                                            </div>
                                            <p className="text-emerald-100/80 font-medium">{scanResult.message}</p>
                                        </>
                                    )}

                                    <button
                                        onClick={() => setScanResult(null)}
                                        className="mt-6 w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold py-3 rounded-xl transition-colors"
                                    >
                                        Perform New Scan
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* FLOATING HELP BUTTON */}
            <button
                onClick={() => setShowHelpVideo(true)}
                className="fixed bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-all z-40 group flex items-center justify-center gap-0 hover:gap-2 overflow-hidden hover:px-6 hover:rounded-xl"
                title="System Help"
            >
                <FiHelpCircle className="w-6 h-6 shrink-0" />
                <span className="max-w-0 overflow-hidden font-bold tracking-wider group-hover:max-w-[100px] transition-all duration-300 ease-in-out whitespace-nowrap">
                    HELP
                </span>
            </button>

            {/* VIDEO HELP OVERLAY */}
            {showHelpVideo && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in-up">
                    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4 sm:p-6 shadow-2xl max-w-4xl w-full relative overflow-hidden">
                        
                        <button
                            onClick={() => setShowHelpVideo(false)}
                            className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 rounded-full transition-colors z-20 border border-transparent hover:border-rose-500/30"
                        >
                            <FiX className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <FiPlayCircle className="w-6 h-6 text-indigo-400" />
                            <h2 className="text-xl font-bold text-white tracking-tight">System Walkthrough</h2>
                        </div>

                        <div className="relative w-full p-8 bg-black/50 rounded-xl border border-slate-700/50 shadow-inner flex flex-col items-center justify-center text-center">
                            <FiPlayCircle className="w-16 h-16 text-indigo-500 mb-4 opacity-80" />
                            <h3 className="text-xl font-bold text-slate-200 mb-2">Watch the full video tutorial</h3>
                            <p className="text-slate-400 mb-6 max-w-md">Learn how to effectively use the SentinelGate Intelligence dashboard to track and manage border security.</p>
                            
                            <a 
                                href="https://www.youtube.com/watch?v=coenonlcJ4w" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_25px_rgba(79,70,229,0.6)]"
                            >
                                <FiPlayCircle className="w-5 h-5" />
                                Watch on YouTube
                            </a>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}