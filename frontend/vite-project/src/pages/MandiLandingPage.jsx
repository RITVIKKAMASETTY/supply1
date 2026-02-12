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
    { icon: '📈', title: 'Live Price Tracking', desc: 'Real-time APMC prices across all mandis. Bid/ask spreads, volume trends, arrival data — updated every minute.' },
    { icon: '🔄', title: 'Supply Flow Optimizer', desc: 'AI maps optimal goods flow from farms to mandis. Reduce waste, balance supply, prevent bottlenecks.' },
    { icon: '🎙️', title: 'Voice Command Hub', desc: 'Hands busy? Just speak. Check prices, place alerts, coordinate arrivals — all by voice in any language.' },
    { icon: '🌐', title: 'Multilingual Alerts', desc: 'Instant alerts in Hindi, Tamil, Telugu, Marathi & more for price spikes, shortage warnings, and disruptions.' },
    { icon: '🏪', title: 'Demand Prediction', desc: 'Know what retailers need before they order. Predict demand surges from festivals, seasons, and trends.' },
    { icon: '⚡', title: 'Disruption Detection', desc: 'Detect transport delays, panic buying, or supply shocks in real-time with instant intervention recommendations.' },
]

const prices = [
    { name: 'Tomato', price: '₹2,450', change: '+8.2%', up: true, vol: '1,240t' },
    { name: 'Onion', price: '₹1,890', change: '-3.1%', up: false, vol: '890t' },
    { name: 'Potato', price: '₹1,120', change: '+2.7%', up: true, vol: '2,100t' },
    { name: 'Green Chilli', price: '₹3,200', change: '+15.4%', up: true, vol: '320t' },
]

export default function MandiLandingPage() {
    const [loaded, setLoaded] = useState(false)
    useEffect(() => { setTimeout(() => setLoaded(true), 100) }, [])

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
            {/* BG */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/3 w-[700px] h-[500px] bg-gradient-to-b from-orange-500/8 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-amber-600/5 rounded-full blur-3xl" style={{ animation: 'float 10s ease-in-out infinite' }} />
            </div>

            {/* NAV */}
            <nav className="relative z-50 flex items-center justify-between px-6 sm:px-10 py-5 max-w-7xl mx-auto">
                <Link to="/" className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-orange-500/20">🏪</div>
                    <span className="text-lg font-semibold tracking-tight">FoodChain <span className="text-orange-400">Mandi</span></span>
                </Link>
                <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
                    <a href="#features" className="hover:text-white transition-colors">Features</a>
                    <a href="#live" className="hover:text-white transition-colors">Live Prices</a>
                    <a href="#stats" className="hover:text-white transition-colors">Impact</a>
                    <Link to="/login" className="hover:text-white transition-colors">Login</Link>
                </div>
                <Link to="/register" className="px-5 py-2.5 rounded-full bg-orange-500 text-black text-sm font-semibold hover:bg-orange-400 transition-all hover:shadow-lg hover:shadow-orange-500/25 active:scale-95">
                    Start Free
                </Link>
            </nav>

            {/* HERO */}
            <section className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 pt-16 sm:pt-24 pb-20">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div className={`transition-all duration-1000 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs font-medium text-orange-400 mb-8">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                            Smart Mandi Operations
                        </div>
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.95] mb-6">
                            The
                            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent"> Smartest </span>
                            <br />Mandi in India
                        </h1>
                        <p className="text-lg text-white/50 max-w-lg leading-relaxed mb-10 font-light">
                            Real-time price intelligence, supply flow optimization, and AI-powered disruption detection — all managed through voice.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Link to="/mandi/dashboard" className="group px-8 py-4 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-black font-semibold hover:shadow-2xl hover:shadow-orange-500/30 transition-all active:scale-95 flex items-center gap-2">
                                Start Trading Smarter
                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                            </Link>
                            <a href="#live" className="px-8 py-4 rounded-full border border-white/10 text-white/70 font-medium hover:bg-white/5 transition-all">View Live Prices</a>
                        </div>
                    </div>

                    {/* Hero ticker */}
                    <div className={`relative transition-all duration-1000 delay-300 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                        <div className="rounded-3xl bg-gradient-to-br from-orange-500/5 to-amber-500/5 border border-orange-500/10 backdrop-blur-xl p-6 shadow-2xl shadow-orange-500/5">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" /><span className="text-xs font-semibold text-orange-400 tracking-wider uppercase">Live APMC Prices</span></div>
                                <span className="text-xs text-white/30">Updated 2m ago</span>
                            </div>
                            <div className="space-y-3">
                                {prices.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-orange-500/[0.03] transition-all">
                                        <div><div className="font-semibold text-sm">{p.name}</div><div className="text-xs text-white/30">{p.vol}</div></div>
                                        <div className="text-right"><div className="font-bold text-sm">{p.price}</div><div className={`text-xs font-medium ${p.up ? 'text-green-400' : 'text-red-400'}`}>{p.change}</div></div>
                                    </div>
                                ))}
                            </div>
                            <div className="absolute -top-4 -right-4 px-3 py-2 rounded-xl bg-[#111]/90 border border-orange-500/20 backdrop-blur-lg text-xs shadow-lg" style={{ animation: 'float 5s ease-in-out infinite' }}>⚡ Price spike detected</div>
                            <div className="absolute -bottom-4 -left-4 px-3 py-2 rounded-xl bg-[#111]/90 border border-amber-500/20 backdrop-blur-lg text-xs shadow-lg" style={{ animation: 'float 7s ease-in-out infinite 2s' }}>🎙️ "Show onion trends"</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section id="features" className="relative z-10 py-24 sm:py-32">
                <div className="max-w-7xl mx-auto px-6 sm:px-10">
                    <FadeIn><div className="text-center mb-16"><span className="text-xs font-semibold tracking-[3px] uppercase text-orange-400 block mb-4">Features</span><h2 className="text-4xl sm:text-5xl font-black tracking-tighter mb-4">Built for modern mandis</h2><p className="text-white/40 text-lg max-w-xl mx-auto">Intelligence that flows as fast as your trade.</p></div></FadeIn>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {features.map((f, i) => (
                            <FadeIn key={i} delay={i * 80}>
                                <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 hover:bg-orange-500/[0.03] hover:border-orange-500/20 transition-all duration-500 hover:-translate-y-1">
                                    <div className="text-4xl mb-5">{f.icon}</div>
                                    <h3 className="text-xl font-bold mb-2 tracking-tight">{f.title}</h3>
                                    <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* LIVE TABLE */}
            <section id="live" className="relative z-10 py-24 border-y border-white/[0.04]">
                <div className="max-w-5xl mx-auto px-6 sm:px-10">
                    <FadeIn><div className="text-center mb-12"><span className="text-xs font-semibold tracking-[3px] uppercase text-orange-400 block mb-4">Live Dashboard</span><h2 className="text-4xl sm:text-5xl font-black tracking-tighter">Market pulse, real-time</h2></div></FadeIn>
                    <FadeIn delay={200}>
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                            <div className="grid grid-cols-4 gap-4 px-6 py-4 text-xs font-semibold text-white/30 uppercase tracking-wider border-b border-white/[0.04]"><div>Commodity</div><div className="text-right">Price/Q</div><div className="text-right">24h</div><div className="text-right">Volume</div></div>
                            {prices.map((p, i) => (
                                <div key={i} className="grid grid-cols-4 gap-4 px-6 py-5 border-b border-white/[0.02] hover:bg-orange-500/[0.02] transition-colors">
                                    <div className="font-semibold">{p.name}</div><div className="text-right font-bold">{p.price}</div><div className={`text-right font-medium ${p.up ? 'text-green-400' : 'text-red-400'}`}>{p.change}</div><div className="text-right text-white/40">{p.vol}</div>
                                </div>
                            ))}
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* STATS */}
            <section id="stats" className="relative z-10 py-24">
                <div className="max-w-7xl mx-auto px-6 sm:px-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {[{ val: 200, s: '+', l: 'Mandis Connected' }, { val: 28, s: '%', l: 'Waste Reduced' }, { val: 50000, s: '+', l: 'Traders Active' }, { val: 15, s: '+', l: 'Languages' }].map((x, i) => (
                            <FadeIn key={i} delay={i * 100}><div><div className="text-4xl sm:text-5xl font-black tracking-tighter bg-gradient-to-b from-orange-300 to-orange-500 bg-clip-text text-transparent"><Counter end={x.val} suffix={x.s} /></div><div className="text-sm text-white/40 mt-2">{x.l}</div></div></FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section className="relative z-10 py-24 sm:py-32 border-t border-white/[0.04]">
                <div className="max-w-7xl mx-auto px-6 sm:px-10">
                    <FadeIn><div className="text-center mb-16"><span className="text-xs font-semibold tracking-[3px] uppercase text-orange-400 block mb-4">How It Works</span><h2 className="text-4xl sm:text-5xl font-black tracking-tighter">Smarter trading in 3 steps</h2></div></FadeIn>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[{ n: '01', t: 'Connect Your Mandi', d: 'Link your APMC/mandi. AI starts tracking prices, arrivals, and demand immediately.' }, { n: '02', t: 'Get Intelligence', d: 'Voice-powered insights on price trends, disruption alerts, and optimal procurement timing.' }, { n: '03', t: 'Optimize Operations', d: 'Reduce waste, balance supply-demand, and boost margins with AI recommendations.' }].map((s, i) => (
                            <FadeIn key={i} delay={i * 150}><div><div className="text-7xl font-black text-orange-500/10 mb-4">{s.n}</div><h3 className="text-xl font-bold mb-2 tracking-tight">{s.t}</h3><p className="text-white/40 text-sm leading-relaxed">{s.d}</p></div></FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="relative z-10 py-24 sm:py-32">
                <div className="max-w-4xl mx-auto px-6 sm:px-10 text-center">
                    <FadeIn>
                        <div className="rounded-3xl border border-orange-500/20 bg-gradient-to-b from-orange-500/5 to-transparent p-12 sm:p-16 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-amber-500/5" />
                            <div className="relative z-10"><h2 className="text-4xl sm:text-5xl font-black tracking-tighter mb-4">Upgrade your mandi today</h2><p className="text-white/40 text-lg mb-8 max-w-lg mx-auto">Join India's smartest mandis with AI-powered price intelligence and voice control.</p>
                                <Link to="/register" className="inline-block px-10 py-4 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-black font-bold text-lg hover:shadow-2xl hover:shadow-orange-500/30 transition-all active:scale-95">Get Started Free</Link>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="relative z-10 border-t border-white/[0.04] py-10">
                <div className="max-w-7xl mx-auto px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-white/30"><div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center text-[10px] font-bold">M</div>FoodChain AI © 2026</div>
                    <div className="flex gap-6 text-xs text-white/30"><a href="#" className="hover:text-white/60 transition-colors">Privacy</a><a href="#" className="hover:text-white/60 transition-colors">Terms</a><a href="#" className="hover:text-white/60 transition-colors">Contact</a></div>
                </div>
            </footer>
        </div>
    )
}
