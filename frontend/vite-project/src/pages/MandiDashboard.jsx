import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Line, Bar as BarChart } from 'react-chartjs-2'
import api from '../services/api'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

const TABS = [
    { id: 'overview', label: '📊 Overview' }, { id: 'stress', label: '⚠️ Stress' },
    { id: 'forecast', label: '📈 Forecast' }, { id: 'trucks', label: '🚛 Trucks' },
    { id: 'interventions', label: '💡 Actions' }, { id: 'scenario', label: '🔮 Scenario' },
    { id: 'alerts', label: '🚨 Alerts' },
]

const CROP_IMGS = {
    Tomato: 'https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=200&h=200&fit=crop',
    Onion: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=200&h=200&fit=crop',
    Potato: 'https://images.unsplash.com/photo-1518977676601-b53f82ber5f7?w=200&h=200&fit=crop',
    Rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop',
    Wheat: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200&h=200&fit=crop',
    Carrot: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=200&h=200&fit=crop',
    Cabbage: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=200&h=200&fit=crop',
    'Green Chilli': 'https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=200&h=200&fit=crop',
}

const mandiIcon = new L.DivIcon({ html: '<div style="font-size:28px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.6))">🏪</div>', className: '', iconSize: [32, 32], iconAnchor: [16, 32] })
const retailIcon = new L.DivIcon({ html: '<div style="font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4))">🛒</div>', className: '', iconSize: [26, 26], iconAnchor: [13, 26] })
const truckIcon = new L.DivIcon({ html: '<div style="font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4))">🚛</div>', className: '', iconSize: [26, 26], iconAnchor: [13, 26] })

function MapFly({ center }) { const map = useMap(); useEffect(() => { if (center) map.flyTo(center, 12, { duration: 1 }) }, [center]); return null }

async function fetchRoute(from, to) {
    try {
        const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`)
        const d = await r.json()
        if (d.routes?.[0]?.geometry?.coordinates) return d.routes[0].geometry.coordinates.map(c => [c[1], c[0]])
    } catch { }
    return [from, to]
}

function useGoogleTranslate() {
    useEffect(() => {
        const s = document.createElement('style')
        s.textContent = `.goog-te-banner-frame{display:none!important}body{top:0!important}.goog-te-gadget{font-size:0!important}.goog-te-gadget .goog-te-combo{background:rgba(255,255,255,.06)!important;color:#fff!important;border:1px solid rgba(255,255,255,.12)!important;border-radius:10px!important;padding:6px 10px!important;font-size:12px!important;outline:none!important;cursor:pointer!important}.goog-te-gadget .goog-te-combo option{background:#1a1a1a!important;color:#fff!important}#google_translate_element{display:inline-block}.skiptranslate iframe{display:none!important}`
        document.head.appendChild(s)
        window.googleTranslateElementInit = () => { new window.google.translate.TranslateElement({ pageLanguage: 'en', includedLanguages: 'hi,kn,te,ta,mr,bn,gu,pa,ml', layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE, autoDisplay: false }, 'google_translate_element') }
        if (!document.querySelector('script[src*="translate.google.com"]')) { const sc = document.createElement('script'); sc.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'; sc.async = true; document.body.appendChild(sc) }
        else if (window.google?.translate) window.googleTranslateElementInit()
        return () => document.head.removeChild(s)
    }, [])
}

// ── Chart defaults ──
const chartOpts = (title) => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#fff', font: { size: 10 } } }, title: { display: !!title, text: title, color: '#f97316', font: { size: 12 } } },
    scales: { x: { ticks: { color: '#ffffff40', font: { size: 9 } }, grid: { color: '#ffffff08' } }, y: { ticks: { color: '#ffffff40', font: { size: 9 } }, grid: { color: '#ffffff08' } } },
})

// ── Risk Gauge SVG ──
function RiskGauge({ score, level }) {
    const c = score > 70 ? '#ef4444' : score > 45 ? '#f97316' : score > 20 ? '#eab308' : '#22c55e'
    const angle = (score / 100) * 180 - 90
    return (
        <div className="flex flex-col items-center">
            <svg viewBox="0 0 200 120" className="w-52">
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="16" strokeLinecap="round" />
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={c} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${(score / 100) * 251} 251`} className="transition-all duration-1000" />
                <line x1="100" y1="100" x2={100 + 58 * Math.cos(angle * Math.PI / 180)} y2={100 - 58 * Math.sin(angle * Math.PI / 180)} stroke="white" strokeWidth="3" strokeLinecap="round" className="transition-all duration-1000" />
                <circle cx="100" cy="100" r="5" fill="white" />
                <text x="100" y="88" textAnchor="middle" fill="white" fontSize="28" fontWeight="900">{score}</text>
                <text x="100" y="115" textAnchor="middle" fill={c} fontSize="13" fontWeight="700">{level}</text>
            </svg>
        </div>
    )
}

export default function MandiDashboard() {
    const navigate = useNavigate()
    useGoogleTranslate()
    const [tab, setTab] = useState('overview')
    const [loading, setLoading] = useState(true)
    const [overview, setOverview] = useState(null)
    const [stress, setStress] = useState(null)
    const [forecast, setForecast] = useState(null)
    const [trucks, setTrucks] = useState(null)
    const [interventions, setInterventions] = useState(null)
    const [scenarioResult, setScenarioResult] = useState(null)
    const [truckRoutes, setTruckRoutes] = useState({})
    const [rainDays, setRainDays] = useState(0)
    const [demandSurge, setDemandSurge] = useState(0)
    const [transportDelay, setTransportDelay] = useState(0)
    const [expandedCrop, setExpandedCrop] = useState(null)
    const [simLevel, setSimLevel] = useState(1)
    const [alertResult, setAlertResult] = useState(null)
    const [alertLoading, setAlertLoading] = useState(false)
    const [alertHistory, setAlertHistory] = useState([])

    const SIM_LEVELS = ['low', 'moderate', 'high', 'critical']
    const triggerAlert = async () => {
        setAlertLoading(true); setAlertResult(null)
        try {
            const level = SIM_LEVELS[simLevel]
            const stressData = stress || { risk_score: simLevel * 25, signals: [] }
            const res = await api.post('/mandi/supply-chain/alert-simulate', {
                risk_level: level, risk_score: stressData.risk_score,
                message: `FoodChain Alert — ${level.toUpperCase()} risk (Score: ${stressData.risk_score}/100)`,
                signals: stressData.signals?.map(s => ({ title: s.title })) || [],
            })
            setAlertResult(res.data)
            setAlertHistory(prev => [{ ...res.data, timestamp: new Date().toLocaleTimeString() }, ...prev].slice(0, 10))
        } catch (e) { setAlertResult({ errors: [e.message] }) }
        setAlertLoading(false)
    }

    useEffect(() => {
        const u = JSON.parse(localStorage.getItem('user') || '{}')
        if (!u.access_token && !localStorage.getItem('token')) { navigate('/login'); return }
        loadAll()
    }, [])

    const loadAll = async () => {
        setLoading(true)
        const endpoints = ['overview', 'stress', 'forecast', 'trucks', 'interventions']
        const setters = [setOverview, setStress, setForecast, setTrucks, setInterventions]
        const results = await Promise.allSettled(endpoints.map(e => api.get(`/mandi/supply-chain/${e}`)))
        results.forEach((r, i) => { if (r.status === 'fulfilled') setters[i](r.value.data) })
        setLoading(false)
    }

    // Fetch OSRM routes for active trucks
    useEffect(() => {
        if (!trucks?.fleet) return
        trucks.fleet.filter(t => t.status === 'delivering' || t.status === 'returning').forEach(async t => {
            const route = await fetchRoute([t.origin_lat, t.origin_lng], [t.dest_lat, t.dest_lng])
            setTruckRoutes(prev => ({ ...prev, [t.id]: route }))
        })
    }, [trucks])

    useEffect(() => {
        api.post('/mandi/supply-chain/scenario', { rain_days: rainDays, demand_surge_pct: demandSurge, transport_delay_pct: transportDelay })
            .then(r => setScenarioResult(r.data)).catch(() => { })
    }, [rainDays, demandSurge, transportDelay])

    const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login') }

    if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white/40"><span className="animate-spin text-3xl mr-3">⏳</span>Loading supply chain data...</div>

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white" style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            {/* NAV */}
            <nav className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.06]">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center text-lg shadow-lg shadow-orange-500/20">🏪</div>
                            <span className="text-sm font-bold">FoodChain <span className="text-orange-400">Mandi</span></span>
                        </Link>
                        <span className="px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-400 text-[9px] font-bold uppercase tracking-widest">Supply Chain AI</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div id="google_translate_element" className="scale-75 origin-right" />
                        <button onClick={handleLogout} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white/50 hover:text-white transition-all">Logout</button>
                    </div>
                </div>
            </nav>

            {/* TABS */}
            <div className="sticky top-[57px] z-40 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/[0.04]">
                <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto py-2">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${tab === t.id ? 'bg-orange-500/20 text-orange-400 shadow-lg shadow-orange-500/10' : 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]'}`}>{t.label}</button>
                    ))}
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-4 md:p-6">

                {/* ═══ OVERVIEW ═══ */}
                {tab === 'overview' && overview && (<div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { l: 'Inventory', v: `${(overview.kpis.total_inventory_kg / 1000).toFixed(1)}T`, i: '📦', g: 'from-orange-400 to-amber-500' },
                            { l: 'Value', v: `₹${(overview.kpis.total_value / 1000).toFixed(0)}K`, i: '💰', g: 'from-green-400 to-emerald-500' },
                            { l: 'Inbound/day', v: `${overview.kpis.daily_inbound_avg}kg`, i: '📥', g: 'from-blue-400 to-cyan-500' },
                            { l: 'Outbound/day', v: `${overview.kpis.daily_outbound_avg}kg`, i: '📤', g: 'from-purple-400 to-violet-500' },
                            { l: 'Farmers', v: overview.kpis.active_farmers, i: '👨‍🌾', g: 'from-lime-400 to-green-500' },
                            { l: 'Retailers', v: overview.kpis.active_retailers, i: '🏪', g: 'from-pink-400 to-rose-500' },
                            { l: 'Trucks', v: overview.kpis.trucks_active, i: '🚛', g: 'from-yellow-400 to-orange-500' },
                            { l: 'Orders', v: overview.kpis.pending_orders, i: '📋', g: 'from-teal-400 to-cyan-500' },
                        ].map(k => (
                            <div key={k.l} className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-lg">{k.i}</span>
                                    <span className={`text-2xl font-black bg-gradient-to-b ${k.g} bg-clip-text text-transparent`}>{k.v}</span>
                                </div>
                                <div className="text-[10px] text-white/35 font-medium uppercase tracking-wider">{k.l}</div>
                            </div>
                        ))}
                    </div>

                    {/* Chart.js Line: Inbound vs Outbound */}
                    <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]" style={{ height: 280 }}>
                        <Line data={{
                            labels: overview.inbound_7d.map(d => new Date(d.date).toLocaleDateString('en', { weekday: 'short' })),
                            datasets: [
                                { label: 'Inbound (kg)', data: overview.inbound_7d.map(d => d.qty_kg), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', fill: true, tension: 0.4 },
                                { label: 'Outbound (kg)', data: overview.outbound_7d.map(d => d.qty_kg), borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)', fill: true, tension: 0.4 },
                            ]
                        }} options={chartOpts('Inbound vs Outbound — 7 Days')} />
                    </div>

                    {/* Inventory with crop images */}
                    <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                        <h3 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-4">📦 Live Inventory</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {overview.inventory.map(item => (
                                <div key={item.crop} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] transition-all">
                                    <img src={CROP_IMGS[item.crop] || ''} alt={item.crop} className="w-12 h-12 rounded-lg object-cover" onError={e => { e.target.style.display = 'none' }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold">{item.emoji} {item.crop}</div>
                                        <div className="text-[10px] text-white/30">{item.qty_kg}kg · ₹{item.price_per_kg}/kg</div>
                                        <div className="w-full h-1.5 rounded-full bg-white/[0.06] mt-1 overflow-hidden">
                                            <div className="h-full rounded-full bg-orange-500/60 transition-all" style={{ width: `${Math.min(100, item.qty_kg / 30)}%` }} />
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-black text-orange-400">₹{(item.value / 1000).toFixed(1)}K</div>
                                        <div className={`text-[10px] font-bold ${item.change_pct > 0 ? 'text-green-400' : 'text-red-400'}`}>{item.change_pct > 0 ? '↑' : '↓'}{Math.abs(item.change_pct)}%</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>)}

                {/* ═══ STRESS ═══ */}
                {tab === 'stress' && stress && (<div className="space-y-6">
                    {/* Why banner */}
                    <div className={`p-4 rounded-2xl border-2 ${stress.risk_score > 70 ? 'border-red-500/25 bg-red-500/5' : stress.risk_score > 45 ? 'border-orange-500/25 bg-orange-500/5' : stress.risk_score > 20 ? 'border-yellow-500/25 bg-yellow-500/5' : 'border-green-500/25 bg-green-500/5'}`}>
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{stress.risk_score > 70 ? '🔴' : stress.risk_score > 45 ? '🟠' : stress.risk_score > 20 ? '🟡' : '🟢'}</span>
                            <div className="flex-1">
                                <div className="text-sm font-black">
                                    {stress.risk_level} Risk — {stress.signals.length} active signal{stress.signals.length !== 1 ? 's' : ''} detected
                                </div>
                                <div className="text-xs text-white/50 mt-1">
                                    {(() => {
                                        const reasons = []
                                        const priceSignals = stress.signals.filter(s => s.type === 'price')
                                        const weatherSignals = stress.signals.filter(s => s.type === 'weather')
                                        const demandSignals = stress.signals.filter(s => s.type === 'demand')
                                        const transportSignals = stress.signals.filter(s => s.type === 'transport')
                                        if (priceSignals.length) reasons.push(`${priceSignals.length} price disruption${priceSignals.length > 1 ? 's' : ''} (${priceSignals.map(s => s.crop || s.title.split(' ')[1]).join(', ')})`)
                                        if (weatherSignals.length) reasons.push(`Weather: ${weatherSignals[0].title}`)
                                        if (demandSignals.length) reasons.push(demandSignals[0].title)
                                        if (transportSignals.length) reasons.push(transportSignals[0].title)
                                        return reasons.length ? reasons.join(' · ') : 'No significant disruptions detected — supply chain operating normally'
                                    })()}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-3xl font-black ${stress.risk_score > 70 ? 'text-red-400' : stress.risk_score > 45 ? 'text-orange-400' : stress.risk_score > 20 ? 'text-yellow-400' : 'text-green-400'}`}>{stress.risk_score}</div>
                                <div className="text-[9px] text-white/25">/ 100</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-shrink-0 p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex flex-col items-center">
                            <h3 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-3">🎯 System Risk Index</h3>
                            <RiskGauge score={stress.risk_score} level={stress.risk_level} />
                            <div className="mt-3 flex gap-3 text-[9px]">
                                {[['#22c55e', 'Low'], ['#eab308', 'Moderate'], ['#f97316', 'High'], ['#ef4444', 'Critical']].map(([c, l]) => (
                                    <span key={l} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}</span>
                                ))}
                            </div>
                            <div className="mt-4 text-[10px] text-white/20">Updated: {new Date(stress.last_updated).toLocaleTimeString()}</div>
                        </div>

                        {/* Disruption Map */}
                        <div className="flex-1 rounded-2xl overflow-hidden border border-white/[0.06]" style={{ minHeight: 300 }}>
                            <MapContainer center={[12.97, 77.59]} zoom={11} style={{ height: '100%', width: '100%' }} className="rounded-2xl">
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                <Marker position={[12.97, 77.59]} icon={mandiIcon}><Popup>🏪 Your Mandi</Popup></Marker>
                                {stress.signals.filter(s => s.type === 'transport').map((s, i) => (
                                    <Marker key={i} position={[12.97 + (i + 1) * 0.02, 77.59 + (i + 1) * 0.03]}
                                        icon={new L.DivIcon({ html: '<div style="font-size:24px">🚧</div>', className: '', iconSize: [28, 28], iconAnchor: [14, 14] })}>
                                        <Popup><b>{s.title}</b><br />{s.detail}</Popup>
                                    </Marker>
                                ))}
                                {stress.signals.filter(s => s.type === 'weather').map((s, i) => (
                                    <Marker key={`w${i}`} position={[12.95 + i * 0.03, 77.57]}
                                        icon={new L.DivIcon({ html: `<div style="font-size:28px">${s.icon}</div>`, className: '', iconSize: [32, 32], iconAnchor: [16, 16] })}>
                                        <Popup><b>{s.title}</b><br />{s.detail}</Popup>
                                    </Marker>
                                ))}
                                <MapFly center={[12.97, 77.59]} />
                            </MapContainer>
                        </div>
                    </div>

                    {/* Signal Breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {['price', 'weather', 'demand', 'transport'].map(type => {
                            const count = stress.signals.filter(s => s.type === type).length
                            const icons = { price: '💹', weather: '🌦️', demand: '📊', transport: '🚛' }
                            const colors = { price: 'border-green-500/20', weather: 'border-blue-500/20', demand: 'border-purple-500/20', transport: 'border-yellow-500/20' }
                            return (
                                <div key={type} className={`p-4 rounded-2xl border-2 ${colors[type]} bg-white/[0.02] text-center`}>
                                    <span className="text-3xl">{icons[type]}</span>
                                    <div className="text-3xl font-black mt-1">{count}</div>
                                    <div className="text-[10px] text-white/40 capitalize font-medium">{type} signals</div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Signal Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {stress.signals.map((s, i) => {
                            const sc = { critical: 'border-red-500/30 bg-red-500/5', high: 'border-orange-500/30 bg-orange-500/5', medium: 'border-yellow-500/30 bg-yellow-500/5' }
                            const sb = { critical: 'bg-red-500/20 text-red-400', high: 'bg-orange-500/20 text-orange-400', medium: 'bg-yellow-500/20 text-yellow-400' }
                            return (
                                <div key={i} className={`p-4 rounded-2xl border-2 ${sc[s.severity] || 'border-white/10 bg-white/[0.02]'} hover:scale-[1.01] transition-all`}>
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">{s.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="text-sm font-bold">{s.title}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${sb[s.severity] || 'bg-white/10 text-white/40'}`}>{s.severity}</span>
                                            </div>
                                            <div className="text-xs text-white/50">{s.detail}</div>
                                            {s.impact && <div className="text-[10px] text-white/25 mt-1">Impact: {s.impact}</div>}
                                            {s.action && <div className="mt-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[10px] text-orange-400 font-medium">💡 {s.action}</div>}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>)}

                {/* ═══ FORECAST ═══ */}
                {tab === 'forecast' && forecast && (<div className="space-y-6">
                    {/* Summary cards with images */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {forecast.forecasts.map(f => (
                            <div key={f.crop} onClick={() => setExpandedCrop(expandedCrop === f.crop ? null : f.crop)}
                                className={`p-3 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] ${f.trend === 'up' ? 'border-green-500/20 bg-green-500/5' : f.trend === 'down' ? 'border-red-500/20 bg-red-500/5' : 'border-white/[0.06] bg-white/[0.02]'} ${expandedCrop === f.crop ? 'ring-2 ring-orange-500/50' : ''}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <img src={CROP_IMGS[f.crop]} alt={f.crop} className="w-8 h-8 rounded-lg object-cover" onError={e => { e.target.style.display = 'none' }} />
                                    <span className="text-xs font-bold">{f.crop}</span>
                                </div>
                                <div className="flex items-end justify-between">
                                    <div><div className="text-[10px] text-white/30">Now</div><div className="text-lg font-black">₹{f.current_price}</div></div>
                                    <div className="text-right">
                                        <div className={`text-xs font-bold ${f.trend === 'up' ? 'text-green-400' : f.trend === 'down' ? 'text-red-400' : 'text-white/40'}`}>
                                            {f.trend === 'up' ? '↑' : f.trend === 'down' ? '↓' : '→'}{Math.abs(f.trend_pct)}%
                                        </div>
                                        <div className="text-[10px] text-white/25">→₹{f.predicted_price_7d}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Expanded Chart.js chart for selected crop */}
                    {forecast.forecasts.filter(f => !expandedCrop || expandedCrop === f.crop).map(f => (
                        <div key={f.crop} className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]" style={{ height: 250 }}>
                            <Line data={{
                                labels: [...f.history.map(h => h.date.slice(5)), '|', ...f.forecast.map(p => p.date.slice(5))],
                                datasets: [
                                    { label: `${f.emoji} ${f.crop} History`, data: [...f.history.map(h => h.price), null, ...Array(f.forecast.length).fill(null)], borderColor: '#ffffff40', backgroundColor: 'rgba(255,255,255,0.03)', fill: true, tension: 0.3, pointRadius: 2 },
                                    { label: 'Forecast', data: [...Array(f.history.length).fill(null), f.history[f.history.length - 1].price, ...f.forecast.map(p => p.price)], borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)', fill: true, tension: 0.3, borderDash: [5, 3], pointRadius: 3 },
                                ]
                            }} options={chartOpts(`${f.emoji} ${f.crop} — ₹${f.current_price}/kg → ₹${f.predicted_price_7d}/kg (${f.trend_pct > 0 ? '+' : ''}${f.trend_pct}%)`)} />
                        </div>
                    ))}
                </div>)}

                {/* ═══ TRUCKS ═══ */}
                {tab === 'trucks' && trucks && (<div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[{ l: 'Total', v: trucks.summary.total, c: 'text-orange-400' }, { l: 'Delivering', v: trucks.summary.delivering, c: 'text-green-400' }, { l: 'Delayed', v: trucks.summary.delayed, c: 'text-red-400' }, { l: 'Idle', v: trucks.summary.idle, c: 'text-white/40' }].map(s => (
                            <div key={s.l} className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-center">
                                <div className={`text-3xl font-black ${s.c}`}>{s.v}</div><div className="text-[10px] text-white/35 mt-1">{s.l}</div>
                            </div>
                        ))}
                    </div>

                    {/* Real Map with truck routes */}
                    <div className="rounded-2xl overflow-hidden border border-white/[0.06]" style={{ height: 400 }}>
                        <MapContainer center={[trucks.mandi.lat, trucks.mandi.lng]} zoom={12} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                            <Marker position={[trucks.mandi.lat, trucks.mandi.lng]} icon={mandiIcon}><Popup>🏪 Your Mandi</Popup></Marker>
                            {trucks.retailers.map(r => (<Marker key={r.id} position={[r.lat, r.lng]} icon={retailIcon}><Popup>🛒 {r.name}<br />Demand: {r.demand}</Popup></Marker>))}
                            {trucks.fleet.map(t => (<Marker key={t.id} position={[t.current_lat, t.current_lng]} icon={truckIcon}><Popup><b>{t.id}</b> — {t.driver}<br />{t.cargo} ({t.cargo_kg}kg)<br />Status: {t.status}{t.eta_min > 0 ? ` · ETA ${t.eta_min}min` : ''}</Popup></Marker>))}
                            {Object.entries(truckRoutes).map(([id, coords]) => (<Polyline key={id} positions={coords} pathOptions={{ color: '#f97316', weight: 3, opacity: 0.7, dashArray: '8 4' }} />))}
                            <MapFly center={[trucks.mandi.lat, trucks.mandi.lng]} />
                        </MapContainer>
                    </div>

                    {/* Fleet cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {trucks.fleet.map(t => {
                            const sc = { delivering: 'border-green-500/25 bg-green-500/5', returning: 'border-blue-500/25 bg-blue-500/5', loading: 'border-yellow-500/25 bg-yellow-500/5', idle: 'border-white/10 bg-white/[0.02]', delayed: 'border-red-500/25 bg-red-500/5' }
                            const sb = { delivering: 'bg-green-500/20 text-green-400', returning: 'bg-blue-500/20 text-blue-400', loading: 'bg-yellow-500/20 text-yellow-400', idle: 'bg-white/10 text-white/40', delayed: 'bg-red-500/20 text-red-400' }
                            return (
                                <div key={t.id} className={`p-4 rounded-2xl border-2 ${sc[t.status]} transition-all hover:scale-[1.01]`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div><div className="text-sm font-black">{t.id}</div><div className="text-[10px] text-white/30">{t.type} · {t.driver}</div></div>
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${sb[t.status]}`}>{t.status}</span>
                                    </div>
                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex justify-between"><span className="text-white/40">Cargo</span><span className="font-medium">{t.cargo}</span></div>
                                        <div className="flex justify-between"><span className="text-white/40">Load</span><span>{t.cargo_kg}/{t.capacity_kg}kg ({t.utilization_pct}%)</span></div>
                                        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><div className={`h-full rounded-full transition-all ${t.utilization_pct > 80 ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${t.utilization_pct}%` }} /></div>
                                        <div className="flex justify-between"><span className="text-white/40">To</span><span className="truncate max-w-[150px] font-medium">{t.destination}</span></div>
                                        {t.eta_min > 0 && <div className="flex justify-between"><span className="text-white/40">ETA</span><span className={`font-bold ${t.status === 'delayed' ? 'text-red-400' : 'text-green-400'}`}>{t.eta_min}min</span></div>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>)}

                {/* ═══ INTERVENTIONS ═══ */}
                {tab === 'interventions' && interventions && (<div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">💡 AI Recommendations</h3>
                        <span className="px-3 py-1 rounded-full bg-green-500/15 text-green-400 text-xs font-bold">Savings: {interventions.total_potential_savings}</span>
                    </div>
                    {interventions.interventions.map(iv => {
                        const uc = { critical: 'border-red-500/30 bg-red-500/5', high: 'border-orange-500/30 bg-orange-500/5', medium: 'border-yellow-500/30 bg-yellow-500/5', low: 'border-white/10 bg-white/[0.02]' }
                        const ub = { critical: 'bg-red-500/20 text-red-400', high: 'bg-orange-500/20 text-orange-400', medium: 'bg-yellow-500/20 text-yellow-400', low: 'bg-white/10 text-white/40' }
                        return (
                            <div key={iv.id} className={`p-5 rounded-2xl border-2 ${uc[iv.urgency]} transition-all hover:scale-[1.005]`}>
                                <div className="flex items-start gap-4">
                                    <span className="text-3xl">{iv.icon}</span>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className="text-base font-black">{iv.title}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${ub[iv.urgency]}`}>{iv.urgency}</span>
                                        </div>
                                        <p className="text-xs text-white/50 mb-3">{iv.description}</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[['Impact', iv.impact, 'text-green-400'], ['Cost', iv.cost, 'text-orange-400'], ['Trade-off', iv.trade_off, 'text-white/50']].map(([l, v, c]) => (
                                                <div key={l} className="p-2.5 rounded-xl bg-white/[0.03]"><div className="text-[9px] text-white/25 mb-0.5">{l}</div><div className={`text-[11px] font-medium ${c}`}>{v}</div></div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2 mt-3">
                                            <button className="px-4 py-2 rounded-lg bg-orange-500 text-black text-xs font-bold hover:bg-orange-400 transition-all">✅ Apply</button>
                                            <button className="px-4 py-2 rounded-lg bg-white/5 text-white/40 text-xs hover:bg-white/10 transition-all">Dismiss</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>)}

                {/* ═══ SCENARIO ═══ */}
                {tab === 'scenario' && (<div className="space-y-6">
                    <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                        <h3 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-4">🔮 What-If Simulator</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[['🌧️ Rain Days', rainDays, setRainDays, 0, 7, 1], ['📈 Demand Surge %', demandSurge, setDemandSurge, 0, 100, 5], ['🚧 Transport Delay %', transportDelay, setTransportDelay, 0, 100, 5]].map(([l, v, set, mn, mx, st]) => (
                                <div key={l}>
                                    <label className="text-xs font-semibold flex justify-between mb-2"><span>{l}</span><span className="text-orange-400 font-black">{v}{l.includes('%') ? '%' : ''}</span></label>
                                    <input type="range" min={mn} max={mx} step={st} value={v} onChange={e => set(+e.target.value)} className="w-full h-2 rounded-full appearance-none bg-white/10 accent-orange-500" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {scenarioResult && (<>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {[
                                { l: 'Supply', b: scenarioResult.baseline.supply_kg, p: scenarioResult.predicted.supply_kg, u: 'kg/d', good: v => v >= scenarioResult.baseline.supply_kg },
                                { l: 'Demand', b: scenarioResult.baseline.demand_kg, p: scenarioResult.predicted.demand_kg, u: 'kg/d', good: () => true },
                                { l: 'Price', b: scenarioResult.baseline.price_index, p: scenarioResult.predicted.price_index, u: '', good: v => v <= 110 },
                                { l: 'Risk', b: scenarioResult.baseline.risk_score, p: scenarioResult.predicted.risk_score, u: '/100', good: v => v < 50 },
                                { l: 'Spoilage', b: scenarioResult.baseline.spoilage_pct, p: scenarioResult.predicted.spoilage_pct, u: '%', good: v => v < 8 },
                            ].map(m => {
                                const ch = ((m.p - m.b) / m.b * 100).toFixed(1)
                                const ok = m.good(m.p)
                                return (
                                    <div key={m.l} className={`p-4 rounded-2xl border-2 ${ok ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'} transition-all`}>
                                        <div className="text-[10px] text-white/35 mb-1">{m.l}</div>
                                        <div className="text-xl font-black">{m.p}<span className="text-[10px] text-white/25">{m.u}</span></div>
                                        <div className={`text-xs font-bold mt-1 ${ok ? 'text-green-400' : 'text-red-400'}`}>{ch > 0 ? '+' : ''}{ch}%</div>
                                        <div className="text-[9px] text-white/20">Base: {m.b}</div>
                                    </div>
                                )
                            })}
                        </div>

                        {scenarioResult.predicted.gap_kg > 0 && (
                            <div className="p-5 rounded-2xl border-2 border-red-500/25 bg-red-500/5 flex items-center gap-3">
                                <span className="text-4xl">🔴</span>
                                <div><div className="text-lg font-black text-red-400">Supply Shortfall: {scenarioResult.predicted.gap_kg}kg/day</div>
                                    <div className="text-xs text-white/40">Demand exceeds supply by {((scenarioResult.predicted.gap_kg / scenarioResult.predicted.demand_kg) * 100).toFixed(1)}%</div></div>
                            </div>
                        )}

                        <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                            <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-3">🌾 Per-Crop Impact</h4>
                            {scenarioResult.crop_impacts.map(c => (
                                <div key={c.crop} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all mb-2">
                                    <img src={CROP_IMGS[c.crop]} alt="" className="w-8 h-8 rounded-lg object-cover" onError={e => { e.target.style.display = 'none' }} />
                                    <span className="text-xs font-bold flex-1">{c.emoji} {c.crop}</span>
                                    <div className="flex gap-4 text-xs">
                                        <div className="text-right"><div className="text-[9px] text-white/25">Price</div><span className={c.price_change_pct > 0 ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>{c.price_change_pct > 0 ? '+' : ''}{c.price_change_pct}%</span></div>
                                        <div className="text-right"><div className="text-[9px] text-white/25">Supply</div><span className={c.supply_change_pct < 0 ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>{c.supply_change_pct > 0 ? '+' : ''}{c.supply_change_pct}%</span></div>
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold self-center ${c.risk === 'high' ? 'bg-red-500/20 text-red-400' : c.risk === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>{c.risk}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {scenarioResult.recommendations.length > 0 && (
                            <div className="p-5 rounded-2xl border border-orange-500/20 bg-orange-500/5">
                                <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-3">💡 Recommendations</h4>
                                {scenarioResult.recommendations.map((r, i) => (
                                    <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-white/[0.03] mb-2"><span className="text-lg">{r.icon}</span><span className="text-xs text-white/60">{r.text}</span></div>
                                ))}
                            </div>
                        )}
                    </>)}
                </div>)}

                {/* ═══ ALERTS ═══ */}
                {tab === 'alerts' && (<div className="space-y-6">
                    <div className="p-6 rounded-2xl border-2 border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-red-500/5">
                        <h3 className="text-sm font-black mb-1">🚨 Stress Alert Simulation</h3>
                        <p className="text-xs text-white/40 mb-6">Test the alert system. Different risk levels trigger different communication channels.</p>

                        {/* Level selector */}
                        <div className="grid grid-cols-4 gap-2 mb-6">
                            {[{ l: 'Low', i: '🟢', d: 'In-app notification only', c: 'border-green-500/30 bg-green-500/10' }, { l: 'Moderate', i: '🟡', d: 'In-app notification only', c: 'border-yellow-500/30 bg-yellow-500/10' }, { l: 'High', i: '🟠', d: 'SMS sent to all contacts', c: 'border-orange-500/30 bg-orange-500/10' }, { l: 'Critical', i: '🔴', d: 'Phone call + SMS to all', c: 'border-red-500/30 bg-red-500/10' }].map((lv, idx) => (
                                <button key={lv.l} onClick={() => setSimLevel(idx)}
                                    className={`p-4 rounded-xl border-2 text-center transition-all ${simLevel === idx ? lv.c + ' scale-[1.03] shadow-lg' : 'border-white/[0.06] bg-white/[0.02] opacity-50 hover:opacity-80'}`}>
                                    <span className="text-2xl">{lv.i}</span>
                                    <div className="text-xs font-bold mt-1">{lv.l}</div>
                                    <div className="text-[9px] text-white/40 mt-0.5">{lv.d}</div>
                                </button>
                            ))}
                        </div>

                        {/* What will happen */}
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4">
                            <div className="text-xs font-semibold text-white/50 mb-2">What happens when triggered:</div>
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-xs"><span>🔔</span><span className="text-white/60">In-app notification dispatched</span><span className="text-green-400 text-[9px] font-bold">ALWAYS</span></div>
                                {simLevel >= 2 && <div className="flex items-center gap-2 text-xs"><span>📱</span><span className="text-white/60">SMS to +91 96201 46061 & +91 91082 08731</span><span className="text-orange-400 text-[9px] font-bold">HIGH+</span></div>}
                                {simLevel >= 3 && <div className="flex items-center gap-2 text-xs"><span>📞</span><span className="text-white/60">Phone call to +91 96201 46061 & +91 91082 08731</span><span className="text-red-400 text-[9px] font-bold">CRITICAL</span></div>}
                            </div>
                        </div>

                        <button onClick={triggerAlert} disabled={alertLoading}
                            className={`w-full py-4 rounded-xl text-sm font-black transition-all ${alertLoading ? 'bg-white/10 text-white/30' : simLevel >= 3 ? 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/30' : simLevel >= 2 ? 'bg-orange-500 hover:bg-orange-400 text-black shadow-lg shadow-orange-500/30' : 'bg-white/10 hover:bg-white/15 text-white'}`}>
                            {alertLoading ? '⏳ Sending alerts...' : `🚨 Trigger ${SIM_LEVELS[simLevel].toUpperCase()} Alert`}
                        </button>
                    </div>

                    {/* Result */}
                    {alertResult && (
                        <div className={`p-5 rounded-2xl border-2 ${alertResult.errors?.length ? 'border-red-500/25 bg-red-500/5' : 'border-green-500/25 bg-green-500/5'}`}>
                            <h4 className="text-xs font-bold uppercase tracking-wider mb-3">{alertResult.errors?.length ? '❌ Some Errors' : '✅ Alert Dispatched'}</h4>
                            <div className="space-y-2">
                                {alertResult.actions_taken?.map((a, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                                        <span className="text-lg">{a.type === 'call' ? '📞' : a.type === 'sms' ? '📱' : a.type === 'notification' ? '🔔' : 'ℹ️'}</span>
                                        <div className="flex-1">
                                            <div className="text-xs font-medium">{a.detail}</div>
                                            {a.sid && <div className="text-[9px] text-white/20 font-mono">SID: {a.sid}</div>}
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${a.status === 'sent' || a.status === 'initiated' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}>{a.status}</span>
                                    </div>
                                ))}
                                {alertResult.errors?.map((e, i) => (
                                    <div key={i} className="p-3 rounded-xl bg-red-500/10 text-xs text-red-400">{e}</div>
                                ))}
                            </div>
                            {alertResult.numbers_contacted?.length > 0 && (
                                <div className="mt-3 text-[10px] text-white/30">Contacted: {alertResult.numbers_contacted.join(', ')}</div>
                            )}
                        </div>
                    )}

                    {/* History */}
                    {alertHistory.length > 0 && (
                        <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                            <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-3">📋 Alert History</h4>
                            <div className="space-y-2">
                                {alertHistory.map((h, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                                        <span className="text-lg">{h.risk_level === 'critical' ? '🔴' : h.risk_level === 'high' ? '🟠' : h.risk_level === 'moderate' ? '🟡' : '🟢'}</span>
                                        <div className="flex-1">
                                            <div className="text-xs font-bold capitalize">{h.risk_level} Alert (Score: {h.risk_score})</div>
                                            <div className="text-[10px] text-white/30">{h.actions_taken?.length} actions · {h.timestamp}</div>
                                        </div>
                                        {h.errors?.length > 0 && <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[9px]">{h.errors.length} error(s)</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>)}

            </div>
        </div>
    )
}
