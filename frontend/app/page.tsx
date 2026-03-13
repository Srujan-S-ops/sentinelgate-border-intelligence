"use client"

import { useState, useRef } from "react"
import { Pie } from "react-chartjs-2"
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js"
import { ComposableMap, Geographies, Geography, Marker, Line } from "react-simple-maps"

ChartJS.register(ArcElement, Tooltip, Legend)

export default function Home(){

const videoRef:any = useRef(null)
const canvasRef:any = useRef(null)

const [cameraOn,setCameraOn]=useState(false)
const [selfie,setSelfie]=useState<string | null>(null)

const [travelers,setTravelers]=useState<any[]>([])
const [threats,setThreats]=useState<any[]>([])

const [name,setName]=useState("")
const [passport,setPassport]=useState("")
const [country,setCountry]=useState("")

const INDIA=[78,21]

/* COUNTRY DATABASE */

const countries:any={
india:{coords:[78,21],risk:20},
usa:{coords:[-100,40],risk:15},
canada:{coords:[-106,56],risk:10},
mexico:{coords:[-102,23],risk:25},
brazil:{coords:[-51,-10],risk:20},
uk:{coords:[-1,52],risk:10},
france:{coords:[2,46],risk:10},
germany:{coords:[10,51],risk:10},
china:{coords:[104,35],risk:30},
russia:{coords:[100,60],risk:35},
uae:{coords:[54,24],risk:20},
iran:{coords:[53,32],risk:70},
syria:{coords:[38,35],risk:80},
afghanistan:{coords:[67,33],risk:80},
pakistan:{coords:[69,30],risk:60},
bangladesh:{coords:[90,24],risk:35},
singapore:{coords:[103,1],risk:10},
malaysia:{coords:[102,4],risk:15},
indonesia:{coords:[120,-5],risk:20},
southafrica:{coords:[24,-29],risk:30},
egypt:{coords:[30,26],risk:35},
turkey:{coords:[35,39],risk:25},
japan:{coords:[138,36],risk:10},
southkorea:{coords:[127,37],risk:15},
australia:{coords:[133,-25],risk:10},
spain:{coords:[-4,40],risk:10},
italy:{coords:[12,42],risk:10},
argentina:{coords:[-63,-38],risk:15},
chile:{coords:[-71,-35],risk:15},
saudiarabia:{coords:[45,24],risk:30}
}

/* WATCHLIST */

const watchlist=[
{name:"John Wick",passport:"A1234567"},
{name:"Ivan Petrov",passport:"B8899234"},
{name:"Abu Khalid",passport:"X9998888"}
]

/* STATUS */

function status(risk:number){
if(risk<40) return "CLEAR"
if(risk<70) return "SECONDARY CHECK"
return "ALERT"
}

function color(risk:number){
if(risk<40) return "green"
if(risk<70) return "yellow"
return "red"
}

/* RISK MODEL */

function calculateRisk(name:string,passport:string,country:string){

let risk=0

const key=country.toLowerCase().replace(/\s/g,"")

risk+=countries[key]?.risk || 20

const pattern=/^[A-Z][0-9]{7}$/

if(!pattern.test(passport)) risk+=20

const hour=new Date().getHours()

if(hour<5 || hour>23) risk+=10

const duplicate=travelers.filter(t=>t.passport===passport)

if(duplicate.length>0) risk+=30

const suspect=watchlist.find(w=>w.passport===passport)

if(suspect) risk+=60

if(selfie){
const similarity=Math.random()
if(similarity<0.4) risk+=40
}

return Math.min(risk,100)
}

/* CAMERA */

async function startCamera(){

try{

const stream=await navigator.mediaDevices.getUserMedia({video:true})

if(videoRef.current){
videoRef.current.srcObject=stream
videoRef.current.play()
}

setCameraOn(true)

}catch(err){

console.log(err)

}

}

/* CAPTURE FACE */

function captureFace(){

if(!videoRef.current) return

const video=videoRef.current
const canvas=canvasRef.current
const ctx=canvas.getContext("2d")

canvas.width=video.videoWidth
canvas.height=video.videoHeight

ctx.drawImage(video,0,0)

setSelfie(canvas.toDataURL("image/png"))

}

/* THREAT ALERT */

function threatCheck(traveler:any){

if(traveler.risk>=70){

setThreats(prev=>[
{name:traveler.name,passport:traveler.passport,risk:traveler.risk,time:new Date().toLocaleTimeString()},
...prev.slice(0,4)
])

}

}

/* SCAN PASSPORT */

function scanPassport(){

const passport="P"+Math.floor(Math.random()*10000000)

const risk=calculateRisk("Scanned Traveler",passport,"india")

const traveler={
name:"Scanned Traveler",
passport,
country:"India",
risk,
lat:21,
lng:78
}

setTravelers([...travelers,traveler])

threatCheck(traveler)

}

/* ADD TRAVELER */

function addTraveler(){

if(!name || !passport || !country) return

const key=country.toLowerCase().replace(/\s/g,"")

const data=countries[key] || {coords:[78,21]}

const coords=data.coords

const risk=calculateRisk(name,passport,country)

const traveler={
name,
passport,
country,
risk,
lat:coords[1],
lng:coords[0]
}

setTravelers([...travelers,traveler])

threatCheck(traveler)

setName("")
setPassport("")
setCountry("")

}

/* RISK CHART */

const safe=travelers.filter(t=>t.risk<40).length
const mid=travelers.filter(t=>t.risk>=40 && t.risk<70).length
const alerts=travelers.filter(t=>t.risk>=70).length

const chartData={
labels:["Safe","Secondary Check","Alerts"],
datasets:[{
data:[safe,mid,alerts],
backgroundColor:["green","orange","red"]
}]
}

return(

<div style={{
padding:"40px",
fontFamily:"Segoe UI",
background:"linear-gradient(135deg,#0f2027,#203a43,#2c5364)",
minHeight:"100vh",
color:"white"
}}>

<h1>SentinelGate Border Intelligence Dashboard</h1>

{/* DASHBOARD GRID */}

<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"30px"}}>

{/* CAMERA CARD */}

<div style={{background:"rgba(255,255,255,0.05)",padding:"20px",borderRadius:"12px"}}>

<h3>Face Verification</h3>

<button onClick={startCamera}>Start Camera</button>

<br/><br/>

{cameraOn &&(

<div>

<video
ref={videoRef}
autoPlay
playsInline
muted
width="220"
height="220"
style={{
borderRadius:"50%",
border:`8px solid ${
selfie
? color(calculateRisk(name||"Traveler",passport||"X0000000",country||"india"))
:"#aaa"
}`,
objectFit:"cover"
}}
/>

<br/><br/>

<button onClick={captureFace}>Capture Face</button>

</div>

)}

<canvas ref={canvasRef} style={{display:"none"}}/>

</div>

{/* ADD TRAVELER */}

<div style={{background:"rgba(255,255,255,0.05)",padding:"20px",borderRadius:"12px"}}>

<h3>Add Traveler</h3>

<input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)}/>
<input placeholder="Passport" value={passport} onChange={(e)=>setPassport(e.target.value)}/>
<input placeholder="Country" value={country} onChange={(e)=>setCountry(e.target.value)}/>

<br/><br/>

<button onClick={addTraveler}>Add Traveler</button>
<button onClick={scanPassport}>Scan Passport</button>

</div>

</div>

<br/>

{/* RISK PIE */}

<div style={{width:"350px"}}>
<Pie data={chartData}/>
</div>

{/* TABLE */}

<h2>Traveler Monitoring</h2>

<table width="100%" style={{background:"rgba(255,255,255,0.05)"}}>

<thead>
<tr>
<th>Name</th>
<th>Passport</th>
<th>Country</th>
<th>Risk</th>
<th>Status</th>
</tr>
</thead>

<tbody>

{travelers.map((t,i)=>(

<tr key={i}>
<td>{t.name}</td>
<td>{t.passport}</td>
<td>{t.country}</td>
<td>{t.risk}%</td>
<td>{status(t.risk)}</td>
</tr>

))}

</tbody>

</table>

{/* ALERTS */}

<h2>🚨 Threat Alerts</h2>

{threats.map((t,i)=>(

<div key={i} style={{
background:"#5c0000",
padding:"10px",
marginBottom:"10px",
animation:"blink 1s infinite"
}}>

<strong>{t.name}</strong> — Risk {t.risk}% — {t.time}

</div>

))}

{/* MAP */}

<h2>Global Traveler Monitoring</h2>

<div style={{
position:"relative",
width:"100%",
height:"500px",
background:"rgba(255,255,255,0.05)",
borderRadius:"12px"
}}>

<ComposableMap projectionConfig={{scale:180}} style={{width:"100%",height:"500px"}}>

<Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
{({geographies})=>geographies.map((geo)=>(
<Geography key={geo.rsmKey} geography={geo} fill="#ddd"/>
))}
</Geographies>

{/* ROUTES */}

{travelers.map((t,i)=>(
<Line key={i} from={[t.lng,t.lat]} to={INDIA} stroke={color(t.risk)} strokeWidth={2}/>
))}

{/* MARKERS */}

{travelers.map((t,i)=>(
<Marker key={i} coordinates={[t.lng,t.lat]}>
<circle r={6} fill={color(t.risk)}/>
</Marker>
))}

</ComposableMap>

{/* RADAR */}

<div style={{
position:"absolute",
top:"50%",
left:"50%",
width:"250px",
height:"250px",
borderRadius:"50%",
border:"2px solid rgba(0,255,0,0.3)",
transform:"translate(-50%,-50%)",
pointerEvents:"none",
animation:"radar 6s linear infinite"
}}/>

</div>

<style>{`

@keyframes blink{
0%{opacity:1}
50%{opacity:0.2}
100%{opacity:1}
}

@keyframes radar{
0%{transform:translate(-50%,-50%) rotate(0deg)}
100%{transform:translate(-50%,-50%) rotate(360deg)}
}

`}</style>

</div>

)

}