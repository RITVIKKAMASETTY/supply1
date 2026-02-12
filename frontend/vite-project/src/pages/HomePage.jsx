import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

const roles = [
    {
        id: 'farmer',
        title: 'Farmer',
        emoji: '🌾',
        description: 'AI-powered crop intelligence, weather alerts, and voice-driven farming insights.',
        gradient: 'from-green-500 to-emerald-400',
        border: 'hover:border-green-500/50',
        glow: 'group-hover:shadow-green-500/20',
        bg: 'group-hover:bg-green-500/5',
        link: '/farmer',
    },
    {
        id: 'mandi',
        title: 'Mandi',
        emoji: '🏪',
        description: 'Real-time price tracking, supply flow optimization, and multilingual alerts.',
        gradient: 'from-orange-500 to-amber-400',
        border: 'hover:border-orange-500/50',
        glow: 'group-hover:shadow-orange-500/20',
        bg: 'group-hover:bg-orange-500/5',
        link: '/mandi',
    },
    {
        id: 'retailer',
        title: 'Retailer',
        emoji: '🛒',
        description: 'Demand forecasting, stock optimization, dynamic pricing, and consumer alerts.',
        gradient: 'from-teal-400 to-cyan-400',
        border: 'hover:border-teal-400/50',
        glow: 'group-hover:shadow-teal-400/20',
        bg: 'group-hover:bg-teal-400/5',
        link: '/retailer',
    },
]

export default function HomePage() {
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        setTimeout(() => setLoaded(true), 100)
    }, [])

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
            {/* Animated background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" style={{ animation: 'float 8s ease-in-out infinite' }} />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" style={{ animation: 'float 10s ease-in-out infinite 2s' }} />
                <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" style={{ animation: 'float 12s ease-in-out infinite 4s' }} />
            </div>

            {/* Nav */}
            <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-sm font-bold">F</div>
                    <span className="text-lg font-semibold tracking-tight">FoodChain AI</span>
                </div>
                <div className="flex items-center gap-6 text-sm text-white/60">
                    <Link to="/login" className="hover:text-white transition-colors">Login</Link>
                    <Link to="/register" className="px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-all border border-white/10">
                        Register
                    </Link>
                </div>
            </nav>

            {/* Hero */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20">
                <div className={`text-center transition-all duration-1000 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/70 mb-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        AI-Powered Food Supply Intelligence
                    </div>

                    <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.95] mb-6">
                        <span className="text-white">Predict.</span>
                        <br />
                        <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">Protect.</span>
                        <br />
                        <span className="text-white">Prosper.</span>
                    </h1>

                    <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-16 leading-relaxed font-light">
                        Prevent systemic food supply failures with AI that detects stress signals, predicts disruptions, and recommends stabilizing interventions — all through voice.
                    </p>
                </div>

                {/* Role Cards */}
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full transition-all duration-1000 delay-300 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
                    {roles.map((role, i) => (
                        <Link
                            key={role.id}
                            to={role.link}
                            className="group"
                            style={{ transitionDelay: `${400 + i * 150}ms` }}
                        >
                            <div className={`relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 backdrop-blur-xl transition-all duration-500 ${role.border} ${role.bg} group-hover:shadow-2xl ${role.glow} group-hover:-translate-y-2`}>
                                {/* Glow effect top */}
                                <div className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r ${role.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                                <div className="text-5xl mb-6">{role.emoji}</div>
                                <h3 className="text-2xl font-bold mb-3 tracking-tight">{role.title}</h3>
                                <p className="text-white/50 text-sm leading-relaxed mb-6">{role.description}</p>

                                <div className="flex items-center gap-2 text-sm font-medium text-white/40 group-hover:text-white/80 transition-colors">
                                    Explore
                                    <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Bottom tag */}
                <div className={`mt-20 flex items-center gap-8 text-xs text-white/30 transition-all duration-1000 delay-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="flex items-center gap-2">
                        <span className="text-base">🎙️</span> Voice AI Powered
                    </span>
                    <span className="w-px h-4 bg-white/10" />
                    <span className="flex items-center gap-2">
                        <span className="text-base">🌐</span> Multilingual Alerts
                    </span>
                    <span className="w-px h-4 bg-white/10" />
                    <span className="flex items-center gap-2">
                        <span className="text-base">📊</span> Real-time Analytics
                    </span>
                </div>
            </main>
        </div>
    )
}
