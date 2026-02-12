import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import axios from 'axios'
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const API = import.meta.env.VITE_API_URL || 'http://localhost:8001'
const COLORS = ['#22c55e', '#f97316', '#3b82f6']

// ─── Map icons ───
const farmIcon = new L.DivIcon({ html: '<div style="font-size:32px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))">🏡</div>', className: '', iconSize: [36, 36], iconAnchor: [18, 36] })
const mandiIcon = new L.DivIcon({ html: '<div style="font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4))">🏪</div>', className: '', iconSize: [28, 28], iconAnchor: [14, 28] })
const bestIcon = new L.DivIcon({ html: '<div style="font-size:28px;filter:drop-shadow(0 0 10px rgba(34,197,94,.7))">⭐</div>', className: '', iconSize: [32, 32], iconAnchor: [16, 32] })

function MapFly({ center }) {
    const map = useMap()
    useEffect(() => { if (center) map.flyTo(center, 11, { duration: 1 }) }, [center])
    return null
}

// ─── OSRM Route fetcher (real roads) ───
async function fetchRoute(fromLat, fromLng, toLat, toLng) {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
        const res = await fetch(url)
        const data = await res.json()
        if (data.routes?.[0]?.geometry?.coordinates) {
            // OSRM returns [lng, lat], Leaflet needs [lat, lng]
            return data.routes[0].geometry.coordinates.map(c => [c[1], c[0]])
        }
    } catch { }
    // Fallback to straight line
    return [[fromLat, fromLng], [toLat, toLng]]
}

// ─── Voice hook with STOP ───
function useVoice() {
    const [listening, setListening] = useState(false)
    const [speaking, setSpeaking] = useState(false)
    const [transcript, setTranscript] = useState('')
    const recRef = useRef(null)

    useEffect(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition
        if (SR) {
            const r = new SR(); r.continuous = false; r.interimResults = true; r.lang = 'en-IN'
            r.onresult = e => setTranscript(Array.from(e.results).map(r => r[0].transcript).join(''))
            r.onend = () => setListening(false); r.onerror = () => setListening(false)
            recRef.current = r
        }
    }, [])

    const start = useCallback(() => { if (recRef.current) { setTranscript(''); recRef.current.start(); setListening(true) } }, [])
    const stop = useCallback(() => { if (recRef.current) recRef.current.stop(); setListening(false) }, [])

    const speak = useCallback(t => {
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(t); u.lang = 'hi-IN'; u.rate = 0.9
        u.onstart = () => setSpeaking(true)
        u.onend = () => setSpeaking(false)
        u.onerror = () => setSpeaking(false)
        window.speechSynthesis.speak(u)
    }, [])

    const stopSpeaking = useCallback(() => { window.speechSynthesis.cancel(); setSpeaking(false) }, [])

    return { listening, speaking, transcript, start, stop, speak, stopSpeaking }
}

// ─── Google Translate ───
function useGoogleTranslate() {
    useEffect(() => {
        const style = document.createElement('style')
        style.textContent = `.goog-te-banner-frame{display:none!important}body{top:0!important}.goog-te-gadget{font-size:0!important}.goog-te-gadget .goog-te-combo{background:rgba(255,255,255,.06)!important;color:#fff!important;border:1px solid rgba(255,255,255,.12)!important;border-radius:10px!important;padding:6px 10px!important;font-size:12px!important;outline:none!important;cursor:pointer!important}.goog-te-gadget .goog-te-combo option{background:#1a1a1a!important;color:#fff!important}#google_translate_element{display:inline-block}.skiptranslate iframe{display:none!important}`
        document.head.appendChild(style)
        window.googleTranslateElementInit = () => {
            new window.google.translate.TranslateElement({ pageLanguage: 'en', includedLanguages: 'hi,kn,te,ta,mr,bn,gu,pa,ml', layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE, autoDisplay: false }, 'google_translate_element')
        }
        if (!document.querySelector('script[src*="translate.google.com"]')) {
            const s = document.createElement('script'); s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'; s.async = true; document.body.appendChild(s)
        } else if (window.google?.translate) window.googleTranslateElementInit()
        return () => document.head.removeChild(style)
    }, [])
}


// ════════════════════════════════════════════════════════
export default function FarmerDashboard() {
    const navigate = useNavigate()
    const { listening, speaking, transcript, start, stop, speak, stopSpeaking } = useVoice()
    useGoogleTranslate()

    const [lat, setLat] = useState(12.9716)
    const [lng, setLng] = useState(77.5946)
    const [processing, setProcessing] = useState(false)
    const [showLang, setShowLang] = useState(false)
    const [showHelp, setShowHelp] = useState(false)

    // Response state
    const [responseType, setResponseType] = useState(null)
    const [analysis, setAnalysis] = useState(null)
    const [mandis, setMandis] = useState([])
    const [activeMandi, setActiveMandi] = useState(0)
    const [priceHistory, setPriceHistory] = useState(null)
    const [weather, setWeather] = useState(null)
    const [advice, setAdvice] = useState(null)
    const [growCrop, setGrowCrop] = useState('')
    const [cropName, setCropName] = useState('')
    const [quantity, setQuantity] = useState(0)
    const [timingFactors, setTimingFactors] = useState([])
    const [routeCoords, setRouteCoords] = useState([])
    const [sellTiming, setSellTiming] = useState(null)
    const [priceForecast, setPriceForecast] = useState([])
    const [todayPrice, setTodayPrice] = useState(0)

    // GPS
    useEffect(() => { navigator.geolocation?.getCurrentPosition(p => { setLat(p.coords.latitude); setLng(p.coords.longitude) }, () => { }) }, [])
    // Auto-process on voice stop
    useEffect(() => { if (!listening && transcript?.length > 3) processVoice(transcript) }, [listening])

    // Fetch road route when active mandi changes
    useEffect(() => {
        const m = mandis[activeMandi]
        if (m) fetchRoute(lat, lng, m.lat, m.lng).then(setRouteCoords)
        else setRouteCoords([])
    }, [activeMandi, mandis, lat, lng])

    // ─── PROCESS VOICE ───
    const processVoice = async (text) => {
        setProcessing(true)
        setResponseType(null); setAnalysis(null); setMandis([]); setPriceHistory(null); setAdvice(null); setWeather(null); setTimingFactors([]); setRouteCoords([]); setSellTiming(null); setPriceForecast([]); setTodayPrice(0)

        try {
            const res = await axios.post(`${API}/api/farmer/voice`, { text, lat, lng })
            const data = res.data
            const type = data.response_type || 'error'
            setResponseType(type)

            if (type === 'sell_analysis' && data.analysis) {
                setAnalysis(data.analysis)
                setCropName(data.analysis.request?.crop || data.parsed_command?.crop || '')
                setQuantity(data.analysis.request?.quantity || data.parsed_command?.quantity || 100)
                const top = (data.analysis.mandis || []).slice(0, 5)
                setMandis(top); setActiveMandi(0)
                setTimingFactors(data.analysis.timing_factors || [])
                setSellTiming(data.analysis.sell_timing || null)
                setPriceForecast(data.analysis.price_forecast || [])
                setTodayPrice(data.analysis.today_price || 0)
                if (data.analysis.weather) setWeather(data.analysis.weather)
                fetchPriceHistory(data.analysis.request?.crop || 'tomato')
                const spoken = data.analysis?.ai_recommendation?.spoken_summary
                if (spoken) speak(spoken)
            } else if (type === 'grow_confirm') {
                setGrowCrop(data.crop || '')
                if (data.spoken_summary) speak(data.spoken_summary)
            } else if (type === 'advice_card' && data.advice) {
                setAdvice(data.advice)
                if (data.advice.spoken_summary) speak(data.advice.spoken_summary)
            } else if (type === 'weather' && data.weather) {
                setWeather(data.weather)
                if (data.weather.summary) speak(data.weather.summary)
            } else if (type === 'price_check') {
                setCropName(data.crop || '')
                setMandis((data.mandis || []).slice(0, 5)); setActiveMandi(0)
                fetchPriceHistory(data.crop || 'tomato')
            }
        } catch {
            setResponseType('sell_analysis')
            const dm = demoMandis(); setMandis(dm); setActiveMandi(0); setCropName('tomato'); setQuantity(100)
            setAnalysis(demoAnalysis(dm))
            setTimingFactors([{ icon: '☀️', factor: 'Clear weather', impact: 'Good time for transport', suggestion: 'sell' }, { icon: '📈', factor: 'Price trend UP', impact: 'Prices rising this week', suggestion: 'sell now' }])
            speak('बैकेंड से कनेक्ट नहीं हो पा रहा। डेमो डाटा दिखा रहे हैं।')
        }
        setProcessing(false)
    }

    const fetchPriceHistory = async (crop) => { try { const r = await axios.get(`${API}/api/farmer/price-history`, { params: { crop, days: 30 } }); setPriceHistory(r.data) } catch { } }

    // Demo data
    const demoMandis = () => {
        const names = ['APMC Yeshwanthpur', 'KR Market', 'Binny Mill APMC', 'Chikkaballapur', 'Kolar Mandi']
        return names.map((name, i) => ({ id: i + 1, name, lat: lat + (i % 2 ? -0.06 : 0.08) * (i + 1), lng: lng + (i % 2 ? 0.07 : -0.05) * (i + 1), distance_km: Math.round(8 + i * 12), price_per_kg: Math.round(48 - i * 4), transport_cost: Math.round(300 + i * 250), travel_time_min: Math.round(20 + i * 15) }))
    }
    const demoAnalysis = m => ({ ai_recommendation: { recommendation: 'SELL_NOW', best_mandi: { name: m[0].name, price_per_kg: m[0].price_per_kg, distance_km: m[0].distance_km }, spoken_summary: 'अभी बेचना अच्छा रहेगा।', price_trend: 'Prices trending UP' }, mandis: m, request: { crop: 'tomato', quantity: 100 } })

    // Chart
    const chartData = () => {
        if (!priceHistory?.history) return null
        const top3 = [...new Set(priceHistory.history.map(h => h.mandi_name))].slice(0, 3)
        const dates = [...new Set(priceHistory.history.map(h => h.date))].sort()
        const labels = dates.map(d => { const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth() + 1}` })
        const last = new Date(dates[dates.length - 1])
        for (let i = 1; i <= 7; i++) { const fd = new Date(last); fd.setDate(fd.getDate() + i); labels.push(`${fd.getDate()}/${fd.getMonth() + 1}`) }
        return {
            labels,
            datasets: top3.map((name, idx) => {
                const real = dates.map(d => priceHistory.history.find(h => h.mandi_name === name && h.date === d)?.price_per_kg || null)
                const last5 = real.slice(-5).filter(Boolean)
                const trend = last5.length > 1 ? (last5[last5.length - 1] - last5[0]) / last5.length : 0
                const lastP = last5[last5.length - 1] || 30
                const forecast = Array.from({ length: 7 }, (_, i) => Math.max(5, +(lastP + trend * (i + 1)).toFixed(1)))
                return { label: name.replace('APMC ', '').replace(' Mandi', ''), data: [...real, ...forecast], borderColor: COLORS[idx], backgroundColor: COLORS[idx] + '10', borderWidth: 2, pointRadius: 0, tension: 0.4, fill: true, segment: { borderDash: ctx => ctx.p0DataIndex >= real.length - 1 ? [6, 4] : undefined } }
            })
        }
    }
    const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff8', font: { size: 10 } }, position: 'top' }, tooltip: { mode: 'index', intersect: false } }, scales: { x: { grid: { color: '#fff1' }, ticks: { color: '#fff4', font: { size: 9 }, maxTicksLimit: 8 } }, y: { grid: { color: '#fff1' }, ticks: { color: '#fff4', font: { size: 10 }, callback: v => `₹${v}` } } } }

    const bestMandi = mandis.length ? mandis.reduce((a, b) => a.price_per_kg > b.price_per_kg ? a : b) : null
    const currentMandi = mandis[activeMandi] || null
    const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login') }

    // Help items
    const HELP_ITEMS = [
        { emoji: '💰', cmd: 'sell 100kg tomato', desc: 'Get best selling price & mandi' },
        { emoji: '⏰', cmd: 'sell tomato today or wait?', desc: 'Should I sell now or wait?' },
        { emoji: '🔮', cmd: 'tomato price tomorrow', desc: 'Predicted price for tomorrow' },
        { emoji: '🌱', cmd: 'I grow wheat', desc: 'Track a crop you\'re growing' },
        { emoji: '🌿', cmd: 'should I harvest onion', desc: 'Get harvest timing advice' },
        { emoji: '🐛', cmd: 'how to protect from pests', desc: 'Get farming tips & solutions' },
        { emoji: '🌦️', cmd: 'check weather', desc: 'Get local weather forecast' },
        { emoji: '📊', cmd: 'carrot price', desc: 'Check current mandi prices' },
    ]


    // ══════════════════════════════════════════════════
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
            {/* NAV */}
            <nav className="sticky top-0 z-[999] bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.06]">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-base">🌾</div>
                        <span className="text-sm font-bold">FoodChain <span className="text-green-400">Farmer</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {/* Help toggle */}
                        <button onClick={() => setShowHelp(!showHelp)} className={`p-2 rounded-lg text-sm transition-all ${showHelp ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/40'}`}>❓</button>
                        {/* TTS stop */}
                        {speaking && <button onClick={stopSpeaking} className="p-2 rounded-lg bg-red-500/20 text-red-400 text-sm animate-pulse">🔇</button>}
                        {/* Lang */}
                        <div className="relative">
                            <button onClick={() => setShowLang(!showLang)} className={`p-2 rounded-lg text-sm ${showLang ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/40'}`}>🌐</button>
                            <div className={`absolute right-0 top-full mt-2 p-3 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-2xl z-50 min-w-[170px] transition-all ${showLang ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
                                <p className="text-[10px] text-white/40 mb-2">भाषा / Language</p>
                                <div id="google_translate_element"></div>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="px-3 py-1.5 rounded-lg bg-white/5 text-[11px] text-white/40">Logout</button>
                    </div>
                </div>
            </nav>

            {/* ─── HELP BAR (how to use) ─── */}
            {showHelp && (
                <div className="bg-blue-500/5 border-b border-blue-500/10">
                    <div className="max-w-5xl mx-auto px-4 py-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">🎯 How to Use — Just say it!</h3>
                            <button onClick={() => setShowHelp(false)} className="text-white/30 text-xs">✕ Close</button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {HELP_ITEMS.map(h => (
                                <button key={h.cmd} onClick={() => { setShowHelp(false); processVoice(h.cmd) }}
                                    className="text-left p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all group">
                                    <span className="text-lg">{h.emoji}</span>
                                    <div className="text-[10px] font-bold text-white/60 mt-1 group-hover:text-white">"{h.cmd}"</div>
                                    <div className="text-[9px] text-white/25 mt-0.5">{h.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 space-y-6">

                {/* ═══ MIC BUTTON ═══ */}
                <div className="flex flex-col items-center pt-2">
                    <div className="relative">
                        <button onClick={listening ? stop : start} disabled={processing}
                            className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${listening ? 'bg-red-500 shadow-red-500/40 scale-110 animate-pulse' : processing ? 'bg-yellow-500/80 shadow-yellow-500/30' : 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-green-500/30 hover:scale-105 active:scale-95'}`}>
                            <span className="text-5xl">{listening ? '⏹' : processing ? '⏳' : '🎤'}</span>
                        </button>
                        {/* TTS Stop overlay */}
                        {speaking && (
                            <button onClick={stopSpeaking}
                                className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-red-500 text-white text-lg flex items-center justify-center shadow-lg shadow-red-500/30 animate-bounce">
                                🔇
                            </button>
                        )}
                    </div>
                    <p className="text-white/40 text-xs mt-4 text-center">
                        {listening ? '🔴 बोलिए...' : processing ? 'समझ रहे हैं...' :
                            speaking ? '🔊 Speaking... tap 🔇 to stop' : 'Tap 🎤 & say anything — sell, grow, ask, check prices'}
                    </p>
                    {transcript && <div className="mt-2 px-4 py-2 rounded-xl bg-white/5 border border-white/8 text-xs text-white/50">🗣 "{transcript}"</div>}
                    <div className="flex flex-wrap gap-2 justify-center mt-3">
                        {['sell 100kg tomato', 'sell tomato today or wait?', 'tomato price tomorrow', 'I grow wheat', 'should I harvest onion', 'check weather', 'how to protect from pests'].map(s => (
                            <button key={s} onClick={() => processVoice(s)}
                                className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-[10px] text-white/30 hover:text-white hover:bg-white/[0.08] transition-all">
                                "{s}"
                            </button>
                        ))}
                    </div>
                </div>


                {/* ═══ DYNAMIC RESPONSE CARDS ═══ */}

                {/* ───── SELL ANALYSIS ───── */}
                {responseType === 'sell_analysis' && (
                    <>
                        {analysis?.ai_recommendation && (
                            <div className={`p-5 rounded-2xl border-2 ${analysis.ai_recommendation.recommendation === 'SELL_NOW' ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-4xl">{analysis.ai_recommendation.recommendation === 'SELL_NOW' ? '✅' : '⏳'}</span>
                                    <div>
                                        <div className="text-xl font-black">{analysis.ai_recommendation.recommendation === 'SELL_NOW' ? 'SELL NOW!' : 'WAIT'}</div>
                                        <div className="text-xs text-white/40">{quantity}kg {cropName}</div>
                                    </div>
                                    {speaking && <button onClick={stopSpeaking} className="ml-auto px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs">🔇 Stop</button>}
                                </div>
                                {analysis.ai_recommendation.best_mandi && (
                                    <div className="flex items-baseline gap-2 text-sm flex-wrap">
                                        <span className="text-white/50">Best:</span>
                                        <span className="font-bold text-green-400">{analysis.ai_recommendation.best_mandi.name}</span>
                                        <span className="text-green-400 font-black">₹{analysis.ai_recommendation.best_mandi.price_per_kg}/kg</span>
                                        <span className="text-white/25">= ₹{(quantity * analysis.ai_recommendation.best_mandi.price_per_kg).toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Timing Factors */}
                        {timingFactors.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {timingFactors.map((f, i) => (
                                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                                        <span className="text-2xl">{f.icon}</span>
                                        <div>
                                            <div className="text-sm font-bold">{f.factor}</div>
                                            <div className="text-xs text-white/40">{f.impact}</div>
                                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${f.suggestion === 'wait' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>{f.suggestion.toUpperCase()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── Sell Timing Verdict ── */}
                        {sellTiming && (
                            <div className={`p-5 rounded-2xl border-2 ${sellTiming.action === 'SELL_TODAY' ? 'bg-green-500/10 border-green-500/25' : 'bg-orange-500/10 border-orange-500/25'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-4xl">{sellTiming.action === 'SELL_TODAY' ? '🟢' : '🟡'}</span>
                                    <div className="flex-1">
                                        <div className="text-lg font-black">
                                            {sellTiming.action === 'SELL_TODAY' ? '📢 Sell Today!' : sellTiming.action === 'WAIT_2_DAYS' ? '⏳ Wait 2 Days' : '📅 Wait Till Next Week'}
                                        </div>
                                        <div className="text-xs text-white/50">{sellTiming.reason}</div>
                                    </div>
                                    {sellTiming.best_price > 0 && (
                                        <div className="text-right">
                                            <div className="text-[10px] text-white/30">Best price</div>
                                            <div className="text-xl font-black text-green-400">₹{sellTiming.best_price}</div>
                                            <div className="text-[10px] text-white/25">{sellTiming.best_day}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── 7-Day Price Forecast ── */}
                        {priceForecast.length > 0 && (
                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">🔮 7-Day Price Prediction — {cropName}</h3>
                                <div className="flex items-end gap-1.5 justify-between" style={{ height: 120 }}>
                                    {/* Today bar */}
                                    <div className="flex-1 flex flex-col items-center">
                                        <div className="text-[10px] font-bold text-green-400 mb-1">₹{todayPrice}</div>
                                        <div className="w-full rounded-t-lg bg-green-500/40" style={{ height: `${Math.min(100, (todayPrice / Math.max(...priceForecast.map(f => f.predicted_price), todayPrice)) * 80)}px` }} />
                                        <div className="text-[8px] text-white/40 mt-1 font-bold">Today</div>
                                    </div>
                                    {priceForecast.map((f, i) => {
                                        const maxP = Math.max(...priceForecast.map(x => x.predicted_price), todayPrice)
                                        const isBest = f.predicted_price === Math.max(...priceForecast.map(x => x.predicted_price))
                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center">
                                                <div className={`text-[10px] font-bold mb-1 ${isBest ? 'text-green-400' : 'text-white/40'}`}>₹{f.predicted_price}</div>
                                                <div className={`w-full rounded-t-lg ${isBest ? 'bg-green-500/60' : f.predicted_price > todayPrice ? 'bg-emerald-500/25' : 'bg-red-500/20'}`}
                                                    style={{ height: `${Math.min(100, (f.predicted_price / maxP) * 80)}px` }} />
                                                <div className={`text-[8px] mt-1 ${isBest ? 'text-green-400 font-bold' : 'text-white/25'}`}>{f.day_label.split(' ')[0]}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                                {sellTiming && sellTiming.action !== 'SELL_TODAY' && (
                                    <div className="mt-3 text-center text-[10px] text-orange-400/80">
                                        💡 Best day: <b>{sellTiming.best_day}</b> — predicted ₹{sellTiming.best_price}/kg (Revenue: ₹{(quantity * sellTiming.best_price).toLocaleString()})
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Mandi Cards + Map */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">🏪 Top Mandis</h3>
                                    <span className="text-[10px] text-white/25">{activeMandi + 1}/{mandis.length}</span>
                                </div>
                                <div className="overflow-x-auto snap-x snap-mandatory flex gap-3 pb-3" style={{ scrollSnapType: 'x mandatory' }}
                                    onScroll={e => { const idx = Math.round(e.target.scrollLeft / e.target.clientWidth); if (idx !== activeMandi && idx < mandis.length) setActiveMandi(idx) }}>
                                    {mandis.map((m, i) => (
                                        <div key={m.id} onClick={() => setActiveMandi(i)}
                                            className={`snap-center shrink-0 w-full p-5 rounded-2xl border-2 cursor-pointer transition-all ${i === activeMandi ? 'bg-green-500/8 border-green-500/25 shadow-lg shadow-green-500/5' : 'bg-white/[0.02] border-white/[0.06]'}`}>
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${bestMandi?.id === m.id ? 'bg-green-500 text-black' : 'bg-white/10 text-white/40'}`}>{bestMandi?.id === m.id ? '⭐' : i + 1}</span>
                                                <div><div className="font-bold text-sm">{m.name}</div><div className="text-[10px] text-white/30">{m.distance_km}km • {m.travel_time_min}min</div></div>
                                            </div>
                                            <div className="text-center py-2"><div className="text-3xl font-black text-green-400">₹{m.price_per_kg}<span className="text-sm text-white/25">/kg</span></div></div>
                                            <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-white/[0.05] text-center">
                                                <div><div className="text-[9px] text-white/25">Revenue</div><div className="text-xs font-bold text-green-400">₹{(quantity * m.price_per_kg).toLocaleString()}</div></div>
                                                <div><div className="text-[9px] text-white/25">Transport</div><div className="text-xs font-bold text-red-400">-₹{m.transport_cost}</div></div>
                                                <div><div className="text-[9px] text-white/25">Profit</div><div className="text-xs font-black">₹{(quantity * m.price_per_kg - m.transport_cost).toLocaleString()}</div></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-center gap-1.5 mt-1">
                                    {mandis.map((_, i) => <button key={i} onClick={() => setActiveMandi(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeMandi ? 'bg-green-400 w-4' : 'bg-white/15'}`} />)}
                                </div>
                            </div>

                            {/* Map with real road routes */}
                            <div className="rounded-2xl overflow-hidden border border-white/[0.06]" style={{ minHeight: 300 }}>
                                <MapContainer center={[lat, lng]} zoom={10} style={{ height: '100%', width: '100%', minHeight: 300 }} zoomControl={false} attributionControl={false}>
                                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                    <MapFly center={currentMandi ? [currentMandi.lat, currentMandi.lng] : [lat, lng]} />
                                    <Marker position={[lat, lng]} icon={farmIcon}><Popup><b>🏡 Your Farm</b></Popup></Marker>
                                    <Circle center={[lat, lng]} radius={500} pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.06, weight: 1 }} />
                                    {mandis.map((m, i) => (
                                        <Marker key={m.id} position={[m.lat, m.lng]} icon={bestMandi?.id === m.id ? bestIcon : mandiIcon} eventHandlers={{ click: () => setActiveMandi(i) }}>
                                            <Popup><div style={{ color: '#111', fontSize: 12 }}><b>{m.name}</b><br />₹{m.price_per_kg}/kg • {m.distance_km}km</div></Popup>
                                        </Marker>
                                    ))}
                                    {/* Real road route instead of straight line */}
                                    {routeCoords.length > 1 && (
                                        <Polyline positions={routeCoords} pathOptions={{ color: '#22c55e', weight: 4, opacity: 0.8 }} />
                                    )}
                                </MapContainer>
                            </div>
                        </div>

                        {/* Chart */}
                        {priceHistory && (
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div><h3 className="text-xs font-semibold text-white/50 uppercase">📈 {cropName} • 30-Day + Forecast</h3><p className="text-[10px] text-white/20 mt-0.5">Top 3 mandis • dashed = forecast</p></div>
                                    {analysis?.ai_recommendation?.price_trend && (
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-500/15 text-green-400">
                                            {analysis.ai_recommendation.price_trend.includes?.('UP') ? '📈' : '📉'} {analysis.ai_recommendation.price_trend}
                                        </span>
                                    )}
                                </div>
                                <div style={{ height: 200 }}>{chartData() ? <Line data={chartData()} options={chartOpts} /> : null}</div>
                            </div>
                        )}
                    </>
                )}


                {/* ───── GROW CONFIRM ───── */}
                {responseType === 'grow_confirm' && (
                    <div className="p-6 rounded-2xl bg-green-500/10 border-2 border-green-500/25 text-center">
                        <span className="text-6xl block mb-4">🌱</span>
                        <h2 className="text-2xl font-black mb-2">Growing {growCrop}!</h2>
                        <p className="text-white/50 text-sm mb-4">I'll track <span className="text-green-400 font-bold">{growCrop}</span> prices and alert you of the best time to sell.</p>
                        {speaking && <button onClick={stopSpeaking} className="mb-4 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm">🔇 Stop speaking</button>}
                        <div className="flex gap-3 justify-center flex-wrap">
                            <button onClick={() => processVoice(`sell ${growCrop}`)} className="px-5 py-2.5 rounded-xl bg-green-500 text-black font-bold text-sm">💰 Check selling price</button>
                            <button onClick={() => processVoice(`should I harvest ${growCrop}`)} className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-bold text-sm">🌿 Harvest advice</button>
                        </div>
                    </div>
                )}


                {/* ───── ADVICE CARD ───── */}
                {responseType === 'advice_card' && advice && (
                    <div className="space-y-4">
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-xl font-black">💡 {advice.title || 'Expert Advice'}</h2>
                                {speaking && <button onClick={stopSpeaking} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs">🔇 Stop</button>}
                            </div>
                            <p className="text-sm text-white/70">{advice.recommendation}</p>
                            {advice.timing && <div className="mt-3 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/15 text-xs text-yellow-400 inline-block">⏰ {advice.timing}</div>}
                        </div>

                        {advice.sections?.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {advice.sections.map((s, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white/[0.025] border border-white/[0.06]">
                                        <div className="flex items-center gap-2 mb-2"><span className="text-xl">{s.icon}</span><span className="text-sm font-bold">{s.heading}</span></div>
                                        <p className="text-xs text-white/50 leading-relaxed">{s.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {advice.steps?.length > 0 && (
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                                <h4 className="text-xs font-semibold text-white/50 uppercase mb-3">📋 Steps</h4>
                                <div className="space-y-2">
                                    {advice.steps.map((step, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                                            <span className="text-sm text-white/60">{step}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {advice.risk_factors?.length > 0 && (
                            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                                <h4 className="text-xs font-semibold text-red-400/70 uppercase mb-2">⚠️ Watch Out</h4>
                                <div className="flex flex-wrap gap-2">
                                    {advice.risk_factors.map((r, i) => <span key={i} className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs">{r}</span>)}
                                </div>
                            </div>
                        )}

                        {advice.spoken_summary && (
                            <button onClick={() => speak(advice.spoken_summary)} className="w-full py-3 rounded-xl bg-blue-500/10 border border-blue-500/15 text-blue-400 text-sm font-medium">🔊 Listen in Hindi</button>
                        )}
                    </div>
                )}


                {/* ───── WEATHER ───── */}
                {responseType === 'weather' && weather && (
                    <div className="p-6 rounded-2xl bg-blue-500/8 border border-blue-500/15">
                        <div className="flex items-center gap-4 mb-3">
                            <span className="text-5xl">🌤️</span>
                            <div className="flex-1">
                                <h2 className="text-lg font-black">Weather Update</h2>
                                <p className="text-sm text-white/60">{weather.summary || 'No data'}</p>
                            </div>
                            <div className="flex gap-2">
                                {speaking ? (
                                    <button onClick={stopSpeaking} className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs">🔇 Stop</button>
                                ) : (
                                    weather.summary && <button onClick={() => speak(weather.summary)} className="px-3 py-2 rounded-lg bg-blue-500/15 text-blue-400 text-xs">🔊</button>
                                )}
                            </div>
                        </div>
                    </div>
                )}


                {/* ───── PRICE CHECK ───── */}
                {responseType === 'price_check' && mandis.length > 0 && (
                    <>
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                            <h3 className="text-sm font-bold mb-3">💰 {cropName} Prices Today</h3>
                            <div className="space-y-2">
                                {mandis.map((m, i) => (
                                    <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02]">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${bestMandi?.id === m.id ? 'bg-green-500 text-black' : 'bg-white/10 text-white/40'}`}>{i + 1}</span>
                                            <span className="text-sm">{m.name}</span>
                                        </div>
                                        <span className="text-green-400 font-bold">₹{m.price_per_kg}/kg</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {priceHistory && <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5"><h3 className="text-xs font-semibold text-white/50 uppercase mb-3">📈 {cropName} Trend</h3><div style={{ height: 200 }}>{chartData() ? <Line data={chartData()} options={chartOpts} /> : null}</div></div>}
                    </>
                )}

                {/* Weather strip on sell analysis */}
                {responseType === 'sell_analysis' && weather?.summary && (
                    <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-3">
                        <span className="text-2xl">🌤️</span>
                        <p className="text-xs text-white/50 flex-1">{weather.summary}</p>
                        {speaking ? <button onClick={stopSpeaking} className="px-2 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-[10px]">🔇</button>
                            : <button onClick={() => speak(weather.summary)} className="px-2 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 text-[10px]">🔊</button>}
                    </div>
                )}

                {/* Empty state */}
                {!responseType && !processing && (
                    <div className="text-center pt-6 space-y-2 text-white/15">
                        <p className="text-sm">👆 Tap the mic and talk to me</p>
                        <p className="text-xs">"I grow wheat" • "sell 250 tomato" • "should I harvest?" • "check weather"</p>
                        <button onClick={() => setShowHelp(true)} className="mt-3 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/15 text-blue-400 text-xs">❓ See all commands</button>
                    </div>
                )}
            </div>
        </div>
    )
}
