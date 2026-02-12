import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'

function useScrollAnimation() {
    const ref = useRef(null)
    const [visible, setVisible] = useState(false)
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setVisible(true) },
            { threshold: 0.15 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [])
    return [ref, visible]
}

function AnimatedCounter({ end, suffix = '', duration = 2000 }) {
    const [count, setCount] = useState(0)
    const [ref, visible] = useScrollAnimation()
    useEffect(() => {
        if (!visible) return
        let start = 0
        const step = end / (duration / 16)
        const timer = setInterval(() => {
            start += step
            if (start >= end) { setCount(end); clearInterval(timer) }
            else setCount(Math.floor(start))
        }, 16)
        return () => clearInterval(timer)
    }, [visible, end, duration])
    return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

const features = [
    {
        icon: '🌦️',
        title: 'Weather Intelligence',
        desc: 'Real-time weather monitoring with AI-powered crop impact predictions. Get alerts before storms, droughts, or unseasonal rain hits.',
    },
    {
        icon: '📊',
        title: 'Price Forecasting',
        desc: 'ML-driven mandi price predictions so you know exactly when to sell for maximum profit. No more guesswork.',
    },
    {
        icon: '🎙️',
        title: 'Voice AI Assistant',
        desc: 'Ask anything in your language. Our voice AI understands Hindi, Tamil, Telugu & more — hands-free farming intelligence.',
    },
    {
        icon: '🔔',
        title: 'Smart Alerts',
        desc: 'Multilingual alerts for price spikes, weather risks, pest outbreaks, and optimal harvest windows — delivered to your phone.',
    },
]

const steps = [
    { num: '01', title: 'Connect Your Farm', desc: 'Tell us your location, crops, and acreage. Our AI starts monitoring immediately.' },
    { num: '02', title: 'Get AI Insights', desc: 'Receive real-time predictions on weather impact, pricing trends, and optimal actions.' },
    { num: '03', title: 'Act & Prosper', desc: 'Follow voice-guided recommendations. Sell at the right time, protect from disruptions.' },
]

export default function FarmerLandingPage() {
    const [loaded, setLoaded] = useState(false)
    useEffect(() => { setTimeout(() => setLoaded(true), 100) }, [])

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
            {/* === BG EFFECTS === */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-green-500/8 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-3xl" style={{ animation: 'float 10s ease-in-out infinite' }} />
            </div>

            {/* === NAVBAR === */}
            <nav className="relative z-50 flex items-center justify-between px-6 sm:px-10 py-5 max-w-7xl mx-auto">
                <Link to="/" className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-green-500/20">🌾</div>
                    <span className="text-lg font-semibold tracking-tight">FoodChain <span className="text-green-400">Farmer</span></span>
                </Link>
                <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
                    <a href="#features" className="hover:text-white transition-colors">Features</a>
                    <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
                    <a href="#stats" className="hover:text-white transition-colors">Impact</a>
                    <Link to="/login" className="hover:text-white transition-colors">Login</Link>
                </div>
                <Link to="/register" className="px-5 py-2.5 rounded-full bg-green-500 text-black text-sm font-semibold hover:bg-green-400 transition-all hover:shadow-lg hover:shadow-green-500/25 active:scale-95">
                    Start Free
                </Link>
            </nav>

            {/* === HERO === */}
            <section className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 pt-16 sm:pt-24 pb-20">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div className={`transition-all duration-1000 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-xs font-medium text-green-400 mb-8">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            AI-Powered Farming
                        </div>
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.95] mb-6">
                            Grow
                            <span className="bg-gradient-to-r from-green-400 via-emerald-300 to-green-500 bg-clip-text text-transparent"> Smarter</span>
                            <br />
                            Not Harder
                        </h1>
                        <p className="text-lg text-white/50 max-w-lg leading-relaxed mb-10 font-light">
                            AI that watches your crops, predicts mandi prices, warns you about weather — and speaks your language. All through voice.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Link to="/farmer/dashboard" className="group px-8 py-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-black font-semibold hover:shadow-2xl hover:shadow-green-500/30 transition-all active:scale-95 flex items-center gap-2">
                                Get Started Free
                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                            </Link>
                            <a href="#features" className="px-8 py-4 rounded-full border border-white/10 text-white/70 font-medium hover:bg-white/5 hover:border-white/20 transition-all">
                                Watch Demo
                            </a>
                        </div>
                    </div>

                    {/* Hero visual */}
                    <div className={`relative transition-all duration-1000 delay-300 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                        <div className="relative w-full aspect-square max-w-lg mx-auto">
                            {/* Orbiting ring */}
                            <div className="absolute inset-8 rounded-full border border-green-500/10" style={{ animation: 'rotate-slow 30s linear infinite' }}>
                                <div className="absolute -top-2 left-1/2 w-4 h-4 rounded-full bg-green-400 shadow-lg shadow-green-400/50" />
                            </div>
                            <div className="absolute inset-16 rounded-full border border-emerald-500/10" style={{ animation: 'rotate-slow 20s linear infinite reverse' }}>
                                <div className="absolute -bottom-2 right-0 w-3 h-3 rounded-full bg-emerald-300 shadow-lg shadow-emerald-300/50" />
                            </div>
                            {/* Center card */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-52 h-64 rounded-3xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 backdrop-blur-xl p-6 flex flex-col items-center justify-center gap-3 shadow-2xl shadow-green-500/10">
                                    <div className="text-5xl">🌾</div>
                                    <div className="text-xs font-semibold text-green-400 tracking-widest uppercase">AI Active</div>
                                    <div className="w-full h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />
                                    <div className="text-2xl font-bold">₹2,450</div>
                                    <div className="text-xs text-white/40">Predicted Tomato Price</div>
                                    <div className="flex items-center gap-1 text-green-400 text-xs font-medium">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                                        +12.3% this week
                                    </div>
                                </div>
                            </div>
                            {/* Floating badges */}
                            <div className="absolute top-12 right-4 px-3 py-2 rounded-xl bg-[#111]/80 border border-green-500/20 backdrop-blur-lg text-xs" style={{ animation: 'float 6s ease-in-out infinite' }}>
                                🌧️ Rain in 3hrs
                            </div>
                            <div className="absolute bottom-16 left-0 px-3 py-2 rounded-xl bg-[#111]/80 border border-emerald-500/20 backdrop-blur-lg text-xs" style={{ animation: 'float 7s ease-in-out infinite 1s' }}>
                                🎙️ "Sell tomatoes now"
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* === FEATURES === */}
            <section id="features" className="relative z-10 py-24 sm:py-32">
                <div className="max-w-7xl mx-auto px-6 sm:px-10">
                    <FadeIn>
                        <div className="text-center mb-16">
                            <span className="text-xs font-semibold tracking-[3px] uppercase text-green-400 block mb-4">Features</span>
                            <h2 className="text-4xl sm:text-5xl font-black tracking-tighter mb-4">Everything your farm needs</h2>
                            <p className="text-white/40 text-lg max-w-xl mx-auto">Powered by AI. Delivered by voice. In your language.</p>
                        </div>
                    </FadeIn>
                    <div className="grid sm:grid-cols-2 gap-5">
                        {features.map((f, i) => (
                            <FadeIn key={i} delay={i * 100}>
                                <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 hover:bg-green-500/[0.03] hover:border-green-500/20 transition-all duration-500 hover:-translate-y-1">
                                    <div className="text-4xl mb-5">{f.icon}</div>
                                    <h3 className="text-xl font-bold mb-2 tracking-tight">{f.title}</h3>
                                    <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* === STATS === */}
            <section id="stats" className="relative z-10 py-24 border-y border-white/[0.04]">
                <div className="max-w-7xl mx-auto px-6 sm:px-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {[
                            { val: 50000, suffix: '+', label: 'Farmers Protected' },
                            { val: 94, suffix: '%', label: 'Forecast Accuracy' },
                            { val: 12, suffix: '+', label: 'Languages Supported' },
                            { val: 35, suffix: '%', label: 'Income Increase' },
                        ].map((s, i) => (
                            <FadeIn key={i} delay={i * 100}>
                                <div>
                                    <div className="text-4xl sm:text-5xl font-black tracking-tighter bg-gradient-to-b from-green-300 to-green-500 bg-clip-text text-transparent">
                                        <AnimatedCounter end={s.val} suffix={s.suffix} />
                                    </div>
                                    <div className="text-sm text-white/40 mt-2">{s.label}</div>
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* === HOW IT WORKS === */}
            <section id="how-it-works" className="relative z-10 py-24 sm:py-32">
                <div className="max-w-7xl mx-auto px-6 sm:px-10">
                    <FadeIn>
                        <div className="text-center mb-16">
                            <span className="text-xs font-semibold tracking-[3px] uppercase text-green-400 block mb-4">How It Works</span>
                            <h2 className="text-4xl sm:text-5xl font-black tracking-tighter">Three steps to smarter farming</h2>
                        </div>
                    </FadeIn>
                    <div className="grid md:grid-cols-3 gap-8">
                        {steps.map((s, i) => (
                            <FadeIn key={i} delay={i * 150}>
                                <div className="relative">
                                    <div className="text-7xl font-black text-green-500/10 mb-4">{s.num}</div>
                                    <h3 className="text-xl font-bold mb-2 tracking-tight">{s.title}</h3>
                                    <p className="text-white/40 text-sm leading-relaxed">{s.desc}</p>
                                    {i < steps.length - 1 && (
                                        <div className="hidden md:block absolute top-10 -right-4 w-8 text-white/10">
                                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                        </div>
                                    )}
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* === CTA === */}
            <section className="relative z-10 py-24 sm:py-32">
                <div className="max-w-4xl mx-auto px-6 sm:px-10 text-center">
                    <FadeIn>
                        <div className="rounded-3xl border border-green-500/20 bg-gradient-to-b from-green-500/5 to-transparent p-12 sm:p-16 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-emerald-500/5" />
                            <div className="relative z-10">
                                <h2 className="text-4xl sm:text-5xl font-black tracking-tighter mb-4">Ready to grow smarter?</h2>
                                <p className="text-white/40 text-lg mb-8 max-w-lg mx-auto">Join thousands of farmers already using AI to protect their crops and boost their income.</p>
                                <Link to="/register" className="inline-block px-10 py-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-black font-bold text-lg hover:shadow-2xl hover:shadow-green-500/30 transition-all active:scale-95">
                                    Start Free Today
                                </Link>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* === FOOTER === */}
            <footer className="relative z-10 border-t border-white/[0.04] py-10">
                <div className="max-w-7xl mx-auto px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-white/30">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-[10px] font-bold">F</div>
                        FoodChain AI © 2026
                    </div>
                    <div className="flex gap-6 text-xs text-white/30">
                        <a href="#" className="hover:text-white/60 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-white/60 transition-colors">Terms</a>
                        <a href="#" className="hover:text-white/60 transition-colors">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    )
}

function FadeIn({ children, delay = 0 }) {
    const [ref, visible] = useScrollAnimation()
    return (
        <div
            ref={ref}
            className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    )
}
