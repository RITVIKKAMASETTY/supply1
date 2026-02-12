import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'

function useScrollAnimation() {
    const ref = useRef(null)
    const [visible, setVisible] = useState(false)
    useEffect(() => {
        const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.15 })
        if (ref.current) o.observe(ref.current)
        return () => o.disconnect()
    }, [])
    return [ref, visible]
}

function FadeIn({ children, delay = 0 }) {
    const [ref, visible] = useScrollAnimation()
    return (
        <div ref={ref} className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: `${delay}ms` }}>
            {children}
        </div>
    )
}

function Counter({ end, suffix = '' }) {
    const [count, setCount] = useState(0)
    const [ref, visible] = useScrollAnimation()
    useEffect(() => {
        if (!visible) return
        let s = 0; const step = end / 125
        const t = setInterval(() => { s += step; if (s >= end) { setCount(end); clearInterval(t) } else setCount(Math.floor(s)) }, 16)
        return () => clearInterval(t)
    }, [visible, end])
    return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

const features = [
    { icon: '📊', title: 'Demand Forecasting', desc: 'AI predicts what your customers want before they walk in — seasonal, festival, and trend-driven demand modeling.' },
    { icon: '📦', title: 'Stock Optimization', desc: 'Never overstock or run out. Smart inventory that auto-adjusts based on predicted demand and supply conditions.' },
    { icon: '💰', title: 'Dynamic Pricing', desc: 'AI-suggested pricing that maximizes margins while staying competitive. Factor in supply, demand, and wastage.' },
    { icon: '🎙️', title: 'Voice Operations', desc: 'Manage your store by voice. Check stock, reorder supplies, get insights — hands-free, in your language.' },
    { icon: '🔔', title: 'Consumer Alerts', desc: 'Alert nearby consumers about deals, fresh arrivals, and availability. Build loyalty with timely multilingual notifications.' },
    { icon: '🛡️', title: 'Supply Risk Shield', desc: 'Get early warnings when supply disruptions are heading your way. Pre-order, switch suppliers, or buffer stock.' },
]

const metrics = [
    { label: 'Stock Efficiency', value: '94%', color: 'from-teal-400 to-cyan-400' },
    { label: 'Waste Reduction', value: '42%', color: 'from-emerald-400 to-teal-400' },
    { label: 'Revenue Uplift', value: '+23%', color: 'from-cyan-400 to-blue-400' },
    { label: 'Customer Retention', value: '87%', color: 'from-teal-300 to-emerald-400' },
]

export default function RetailerLandingPage() {
    const [loaded, setLoaded] = useState(false)
    useEffect(() => { setTimeout(() => setLoaded(true), 100) }, [])

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
            {/* BG */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[700px] h-[500px] bg-gradient-to-b from-teal-500/8 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-600/5 rounded-full blur-3xl" style={{ animation: 'float 10s ease-in-out infinite' }} />
            </div>

            {/* NAV */}
            <nav className="relative z-50 flex items-center justify-between px-6 sm:px-10 py-5 max-w-7xl mx-auto">
                <Link to="/" className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-teal-500/20">🛒</div>
                    <span className="text-lg font-semibold tracking-tight">FoodChain <span className="text-teal-400">Retail</span></span>
                </Link>
                <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
                    <a href="#features" className="hover:text-white transition-colors">Features</a>
                    <a href="#metrics" className="hover:text-white transition-colors">Metrics</a>
                    <a href="#how" className="hover:text-white transition-colors">How it Works</a>
                    <Link to="/login" className="hover:text-white transition-colors">Login</Link>
                </div>
                <Link to="/register" className="px-5 py-2.5 rounded-full bg-teal-500 text-black text-sm font-semibold hover:bg-teal-400 transition-all hover:shadow-lg hover:shadow-teal-500/25 active:scale-95">
                    Start Free
                </Link>
            </nav>

            {/* HERO */}
            <section className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 pt-16 sm:pt-24 pb-20">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div className={`transition-all duration-1000 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs font-medium text-teal-400 mb-8">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                            Retail Intelligence
                        </div>
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.95] mb-6">
                            Retail That
                            <br />
                            <span className="bg-gradient-to-r from-teal-400 via-cyan-300 to-teal-500 bg-clip-text text-transparent">Never Runs Out</span>
                        </h1>
                        <p className="text-lg text-white/50 max-w-lg leading-relaxed mb-10 font-light">
                            AI-powered demand forecasting, smart inventory, and dynamic pricing — all managed through voice in your language.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Link to="/retailer/dashboard" className="group px-8 py-4 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-black font-semibold hover:shadow-2xl hover:shadow-teal-500/30 transition-all active:scale-95 flex items-center gap-2">
                                Optimize My Store
                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                            </Link>
                            <a href="#features" className="px-8 py-4 rounded-full border border-white/10 text-white/70 font-medium hover:bg-white/5 transition-all">See Demo</a>
                        </div>
                    </div>

                    {/* Hero visual — Dashboard preview */}
                    <div className={`relative transition-all duration-1000 delay-300 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                        <div className="relative w-full max-w-lg mx-auto">
                            {/* Main card */}
                            <div className="rounded-3xl bg-gradient-to-br from-teal-500/5 to-cyan-500/5 border border-teal-500/10 backdrop-blur-xl p-6 shadow-2xl shadow-teal-500/5">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" /><span className="text-xs font-semibold text-teal-400 tracking-wider uppercase">Store Dashboard</span></div>
                                    <span className="text-xs text-white/30">Live</span>
                                </div>
                                {/* Mini chart bars */}
                                <div className="flex items-end gap-2 h-32 mb-6 px-2">
                                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                                        <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-teal-500/30 to-teal-400/60 transition-all hover:from-teal-500/50 hover:to-teal-400/80" style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }} />
                                    ))}
                                </div>
                                <div className="flex justify-between text-xs text-white/30"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div>
                                {/* KPIs */}
                                <div className="grid grid-cols-3 gap-3 mt-6">
                                    {[{ l: 'Revenue', v: '₹1.2L', c: 'text-teal-400' }, { l: 'Orders', v: '347', c: 'text-cyan-400' }, { l: 'Wastage', v: '2.1%', c: 'text-emerald-400' }].map((k, i) => (
                                        <div key={i} className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3 text-center">
                                            <div className={`text-lg font-bold ${k.c}`}>{k.v}</div>
                                            <div className="text-[10px] text-white/30 mt-1">{k.l}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Floating badges */}
                            <div className="absolute -top-4 -right-4 px-3 py-2 rounded-xl bg-[#111]/90 border border-teal-500/20 backdrop-blur-lg text-xs shadow-lg" style={{ animation: 'float 5s ease-in-out infinite' }}>📦 Low stock: Onions</div>
                            <div className="absolute -bottom-4 -left-4 px-3 py-2 rounded-xl bg-[#111]/90 border border-cyan-500/20 backdrop-blur-lg text-xs shadow-lg" style={{ animation: 'float 7s ease-in-out infinite 2s' }}>🎙️ "Reorder tomatoes"</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section id="features" className="relative z-10 py-24 sm:py-32">
                <div className="max-w-7xl mx-auto px-6 sm:px-10">
                    <FadeIn><div className="text-center mb-16"><span className="text-xs font-semibold tracking-[3px] uppercase text-teal-400 block mb-4">Features</span><h2 className="text-4xl sm:text-5xl font-black tracking-tighter mb-4">Your store, supercharged</h2><p className="text-white/40 text-lg max-w-xl mx-auto">AI that thinks ahead so you never fall behind.</p></div></FadeIn>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {features.map((f, i) => (
                            <FadeIn key={i} delay={i * 80}>
                                <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 hover:bg-teal-500/[0.03] hover:border-teal-500/20 transition-all duration-500 hover:-translate-y-1">
                                    <div className="text-4xl mb-5">{f.icon}</div>
                                    <h3 className="text-xl font-bold mb-2 tracking-tight">{f.title}</h3>
                                    <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* METRICS */}
            <section id="metrics" className="relative z-10 py-24 border-y border-white/[0.04]">
                <div className="max-w-5xl mx-auto px-6 sm:px-10">
                    <FadeIn><div className="text-center mb-16"><span className="text-xs font-semibold tracking-[3px] uppercase text-teal-400 block mb-4">Impact Metrics</span><h2 className="text-4xl sm:text-5xl font-black tracking-tighter">Results that speak</h2></div></FadeIn>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {metrics.map((m, i) => (
                            <FadeIn key={i} delay={i * 100}>
                                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center hover:bg-teal-500/[0.02] transition-all">
                                    <div className={`text-4xl sm:text-5xl font-black tracking-tighter bg-gradient-to-b ${m.color} bg-clip-text text-transparent`}>{m.value}</div>
                                    <div className="text-sm text-white/40 mt-2">{m.label}</div>
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* STATS */}
            <section className="relative z-10 py-24">
                <div className="max-w-7xl mx-auto px-6 sm:px-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {[{ val: 10000, s: '+', l: 'Retailers' }, { val: 42, s: '%', l: 'Waste Reduced' }, { val: 23, s: '%', l: 'Revenue Uplift' }, { val: 12, s: '+', l: 'Languages' }].map((x, i) => (
                            <FadeIn key={i} delay={i * 100}><div><div className="text-4xl sm:text-5xl font-black tracking-tighter bg-gradient-to-b from-teal-300 to-teal-500 bg-clip-text text-transparent"><Counter end={x.val} suffix={x.s} /></div><div className="text-sm text-white/40 mt-2">{x.l}</div></div></FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section id="how" className="relative z-10 py-24 sm:py-32 border-t border-white/[0.04]">
                <div className="max-w-7xl mx-auto px-6 sm:px-10">
                    <FadeIn><div className="text-center mb-16"><span className="text-xs font-semibold tracking-[3px] uppercase text-teal-400 block mb-4">How It Works</span><h2 className="text-4xl sm:text-5xl font-black tracking-tighter">Smart retail in 3 steps</h2></div></FadeIn>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[{ n: '01', t: 'Connect Your Store', d: 'Add your store details and inventory. AI starts learning your demand patterns instantly.' }, { n: '02', t: 'Get AI Insights', d: 'Demand forecasts, reorder suggestions, pricing strategies — all delivered through voice.' }, { n: '03', t: 'Grow Revenue', d: 'Reduce waste, optimize stock, delight customers. Watch your margins grow.' }].map((s, i) => (
                            <FadeIn key={i} delay={i * 150}><div><div className="text-7xl font-black text-teal-500/10 mb-4">{s.n}</div><h3 className="text-xl font-bold mb-2 tracking-tight">{s.t}</h3><p className="text-white/40 text-sm leading-relaxed">{s.d}</p></div></FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="relative z-10 py-24 sm:py-32">
                <div className="max-w-4xl mx-auto px-6 sm:px-10 text-center">
                    <FadeIn>
                        <div className="rounded-3xl border border-teal-500/20 bg-gradient-to-b from-teal-500/5 to-transparent p-12 sm:p-16 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-transparent to-cyan-500/5" />
                            <div className="relative z-10"><h2 className="text-4xl sm:text-5xl font-black tracking-tighter mb-4">Transform your store today</h2><p className="text-white/40 text-lg mb-8 max-w-lg mx-auto">Join thousands of retailers using AI to eliminate waste and boost revenue.</p>
                                <Link to="/register" className="inline-block px-10 py-4 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-black font-bold text-lg hover:shadow-2xl hover:shadow-teal-500/30 transition-all active:scale-95">Start Free Today</Link>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="relative z-10 border-t border-white/[0.04] py-10">
                <div className="max-w-7xl mx-auto px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-white/30"><div className="w-6 h-6 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center text-[10px] font-bold">R</div>FoodChain AI © 2026</div>
                    <div className="flex gap-6 text-xs text-white/30"><a href="#" className="hover:text-white/60 transition-colors">Privacy</a><a href="#" className="hover:text-white/60 transition-colors">Terms</a><a href="#" className="hover:text-white/60 transition-colors">Contact</a></div>
                </div>
            </footer>
        </div>
    )
}
