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
    FiPlayCircle
} from "react-icons/fi"
import Webcam from "react-webcam"
import { GiCrossedSwords } from "react-icons/gi"
import { supabase } from "@/lib/supabase"
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
    const [loginUsername, setLoginUsername] = useState("")
    const [loginPassword, setLoginPassword] = useState("")
    const [loginError, setLoginError] = useState("")

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        // Admin Login
        if (loginUsername === "CentralBureauInvestigration033" && loginPassword === "IndiaSecurityTopRisk04822") {
            setAuthRole("admin")
            setLoginError("")
            return
        }
        
        // User Login - Assume Username = Name, Password = Passport Number
        const normalizedNameInput = loginUsername.trim().toLowerCase()
        const normalizedPassportInput = loginPassword.trim().toUpperCase()

        const foundUser = travelers.find(t => 
            t.name.trim().toLowerCase() === normalizedNameInput && 
            t.passport.trim().toUpperCase() === normalizedPassportInput
        )

        if (foundUser) {
            setUserPassportInput(foundUser.passport)
            setUserPassportStatus(foundUser)
            setUserPassportQueried(true)
            setAuthRole("user")
            setLoginError("")
        } else {
            setLoginError("Invalid credentials or traveler record not found")
        }
    }

    // travelers
    const [travelers, setTravelers] = useState([
        { name: "Initial Traveler", passport: "X1234567", country: "India", risk: 20, lat: 21, lng: 78 }
    ])

    // threat alerts
    const [threats, setThreats] = useState<any[]>([])

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
    }

    // SUPABASE INITIAL LOAD
    useEffect(() => {
        const fetchRemoteData = async () => {
            const { data: travData, error: travErr } = await supabase.from('travelers').select('*').order('created_at', { ascending: true })
            if (travErr) {
                console.error("Supabase Travelers Fetch Error:", travErr.message)
                setDbStatus("error")
            } else if (travData) {
                setDbStatus("connected")
                if (travData.length > 0) {
                    setTravelers(travData) // only overwrite if there is DB data
                }
            }

            const { data: thrData, error: thrErr } = await supabase.from('threats').select('*').order('created_at', { ascending: false }).limit(5)
            if (thrErr) {
                console.error("Supabase Threats Fetch Error:", thrErr.message)
            } else if (thrData && thrData.length > 0) {
                setThreats(thrData)
            }
        }
        fetchRemoteData()

        /* Optionally listen to real-time events to sync multiple dashboard windows
        supabase.channel('custom-all-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'travelers' }, fetchRemoteData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'threats' }, fetchRemoteData)
            .subscribe()
        */
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
    function getStatus(risk: number) {
        if (risk < 40) return "CLEAR"
        if (risk < 70) return "SECONDARY CHECK"
        return "ALERT"
    }

    // RISK COLOR (CSS classes)
    function getColorClass(risk: number) {
        if (risk < 40) return "bg-emerald-500 text-emerald-100"
        if (risk < 70) return "bg-amber-500 text-amber-100"
        return "bg-rose-500 text-rose-100"
    }

    // Hex Colors for charts/maps
    function getHexColor(risk: number) {
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
                note: traveler.note || "System Alert generated from Risk parameters"
            }

            // local optimisitic update
            const newLocalThreat = { ...threat, time: new Date().toLocaleTimeString() }
            setThreats(prev => [newLocalThreat, ...prev.slice(0, 4)])

            // remote push
            const { error: threatErr } = await supabase.from('threats').insert([threat])
            if (threatErr) {
                console.error("Supabase insert error (threats):", threatErr.message)
                alert("Database Error: Failed to save threat to Supabase. Check RLS policies.")
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
        const { error: travErr } = await supabase.from('travelers').insert([newTraveler])
        if (travErr) {
            console.error("Supabase insert error (travelers):", travErr.message)
            alert("Database Error: Failed to save traveler. RLS policy violation? " + travErr.message)
        }
    }

    // OCR UPLOAD
    async function uploadPassport(e: any) {
        const file = e.target.files[0]
        if (!file) return

        const formData = new FormData()
        formData.append("image", file)

        try {
            const res = await fetch("http://127.0.0.1:5000/scan", {
                method: "POST",
                body: formData
            })
            const data = await res.json()
            const risk = calculateRisk(data.name, data.passport, "india")
            const newTraveler = {
                name: data.name,
                passport: data.passport,
                country: "India",
                risk,
                lat: 21,
                lng: 78
            }
            setTravelers([...travelers, newTraveler])
            checkThreat(newTraveler)
            recordToBlockchain(newTraveler, "OCR_UPLOAD")
            const { error: travErr } = await supabase.from('travelers').insert([newTraveler])
            if (travErr) {
                console.error("Supabase insert error (travelers):", travErr.message)
                alert("Database Error: Failed to save OCR traveler: " + travErr.message)
            }
        } catch (err) {
            console.error("OCR scan failed or server offline.", err)
            alert("OCR Scan failed. Make sure Flask backend is running on 127.0.0.1:5000.")
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
        const { error: travErr } = await supabase.from('travelers').insert([newTraveler])
        if (travErr) {
            console.error("Supabase insert error (travelers):", travErr.message)
            alert("Database Error: Failed to save traveler. RLS policy violation? " + travErr.message)
        }

        setName("")
        setPassport("")
        setCountry("")
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
                    const { error: travErr } = await supabase.from('travelers').insert([newTraveler])
                    if (travErr) {
                        console.error("Supabase insert error (travelers):", travErr.message)
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
        if (!confirm("Are you sure you want to delete all traveler and threat data? This cannot be undone.")) return

        try {
            // Delete all records where ID is not null (deletes all)
            const { error: travErr } = await supabase.from('travelers').delete().not('id', 'is', null)
            if (travErr) throw travErr

            const { error: thrErr } = await supabase.from('threats').delete().not('id', 'is', null)
            if (thrErr) throw thrErr

            // Reset local state
            setTravelers([])
            setThreats([])
            alert("Database cleared successfully!")
        } catch (err: any) {
            console.error("Failed to clear database:", err)
            alert("Error clearing database. Make sure your RLS policies allow DELETE operations. " + err.message)
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
            <div className="min-h-screen text-slate-200 flex items-center justify-center p-4 bg-slate-950 font-sans">
                <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-8 shadow-2xl max-w-md w-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col items-center gap-4 mb-8 text-center">
                        <div className="flex items-center justify-center p-3 bg-gradient-to-br from-indigo-500 via-blue-500 to-emerald-500 rounded-2xl shadow-[0_0_20px_rgba(56,189,248,0.4)] border border-white/20 relative">
                            <GiCrossedSwords className="w-10 h-10 text-slate-900/40 absolute mt-1" />
                            <FiShield className="w-8 h-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] relative z-10" />
                        </div>
                        <div>
                            <h1 className="text-2xl tracking-tight font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 pt-1">SentinelGate Intelligence</h1>
                            <p className="text-slate-400 text-sm tracking-widest uppercase mt-1">Authorized Personnel Only</p>
                            <p className="text-slate-500 text-xs mt-3 font-medium border border-slate-700/50 bg-slate-950/50 p-2 rounded-lg">
                                <strong>Travelers:</strong> Login with Name and Passport Number.
                            </p>
                        </div>
                    </div>
                    
                    <form onSubmit={handleLogin} className="relative z-10 space-y-5">
                        {loginError && (
                            <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-3 rounded-lg text-sm text-center font-medium">
                                {loginError}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Clearance ID / Name</label>
                            <input
                                type="text"
                                value={loginUsername}
                                onChange={(e) => setLoginUsername(e.target.value)}
                                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                                placeholder="Enter Access Code"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Secure Passkey</label>
                            <input
                                type="password"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                                placeholder="••••••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2 uppercase tracking-wider text-sm"
                        >
                            <FiSearch className="w-4 h-4" />
                            Authenticate
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    if (authRole === "user") {
        return (
            <div className="min-h-screen text-slate-200 flex flex-col items-center justify-center p-4 bg-slate-950 font-sans relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                
                <div className="mb-8 text-center bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl z-10 w-full max-w-md">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <FiShield className="w-8 h-8 text-emerald-400" />
                        <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">Passenger Portal</h1>
                    </div>
                    <p className="text-slate-400 text-sm">Welcome back, {userPassportStatus?.name || 'Traveler'}</p>
                </div>

                <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-8 shadow-2xl max-w-md w-full relative z-10">
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">Your Clearance Status</h2>
                        <FiSearch className="w-5 h-5 text-emerald-500 opacity-50" />
                    </div>

                    {userPassportStatus ? (
                        <div className={`p-5 rounded-2xl border ${userPassportStatus.risk >= 70 ? 'bg-rose-950/30 border-rose-500/30' : userPassportStatus.risk >= 40 ? 'bg-amber-950/30 border-amber-500/30' : 'bg-emerald-950/30 border-emerald-500/30'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Assessment Result</h3>
                                <span className={`px-4 py-1.5 rounded-full text-sm font-black tracking-wide ${getColorClass(userPassportStatus.risk)}`}>
                                    {getStatus(userPassportStatus.risk)}
                                </span>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center bg-black/30 p-3 rounded-lg border border-white/5">
                                    <span className="text-slate-400 font-medium">Full Name</span>
                                    <span className="text-white font-bold">{userPassportStatus.name}</span>
                                </div>
                                <div className="flex justify-between items-center bg-black/30 p-3 rounded-lg border border-white/5">
                                    <span className="text-slate-400 font-medium">Passport ID</span>
                                    <span className="text-white font-mono">{userPassportStatus.passport}</span>
                                </div>
                                <div className="flex justify-between items-center bg-black/30 p-3 rounded-lg border border-white/5">
                                    <span className="text-slate-400 font-medium">Origin Country</span>
                                    <span className="text-white uppercase font-bold">{userPassportStatus.country}</span>
                                </div>
                                <div className="flex justify-between items-center bg-black/30 p-3 rounded-lg border border-white/5">
                                    <span className="text-slate-400 font-medium">Risk Score</span>
                                    <span className="text-white font-mono">{userPassportStatus.risk}%</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center p-6 bg-slate-950/50 border border-slate-700 rounded-2xl">
                            <FiAlertOctagon className="w-8 h-8 text-rose-500 mx-auto mb-3 opacity-80 animate-pulse" />
                            <p className="text-slate-300 font-medium">Status unavailable.</p>
                            <p className="text-slate-500 text-xs mt-1">Please contact border security.</p>
                        </div>
                    )}
                </div>
                
                <button 
                    onClick={() => {
                        setAuthRole(null)
                        setLoginUsername("")
                        setLoginPassword("")
                        setUserPassportInput("")
                        setUserPassportQueried(false)
                        setUserPassportStatus(null)
                    }}
                    className="mt-8 bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors z-10 font-medium text-sm flex items-center gap-2"
                    title="Sign Out"
                >
                    <FiUserX className="w-4 h-4" /> Secure Logout
                </button>
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
                                            stroke={getHexColor(t.risk)}
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
                                            fill={getHexColor(t.risk)} 
                                            className={t.risk >= 70 ? "animate-military-ping transform-origin-center" : ""} 
                                        />
                                        <circle r={t.risk >= 70 ? 5 : 4} fill={getHexColor(t.risk)} />
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
                                        const status = getStatus(t.risk)
                                        const isThreat = t.risk >= 70
                                        return (
                                            <tr key={i} className={`transition-colors group ${isThreat ? 'animate-siren bg-rose-950/20' : 'hover:bg-white/5'}`}>
                                                <td className={`p-4 font-medium ${isThreat ? 'text-rose-200' : 'text-white'}`}>{t.name}</td>
                                                <td className="p-4 text-slate-300 font-mono text-sm">{t.passport}</td>
                                                <td className="p-4 text-slate-300">{t.country}</td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                                                style={{ width: `${t.risk}%`, backgroundColor: getHexColor(t.risk) }}
                                                            />
                                                        </div>
                                                        <span className="text-sm font-bold w-10 text-right">{t.risk}%</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide ${getColorClass(t.risk)}`}>
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

                        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-700/50 shadow-inner">
                            <iframe 
                                className="w-full h-full"
                                src="https://www.youtube.com/embed/coenonlcJ4w?si=1" 
                                title="SentinelGate System Walkthrough" 
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                referrerPolicy="strict-origin-when-cross-origin" 
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}