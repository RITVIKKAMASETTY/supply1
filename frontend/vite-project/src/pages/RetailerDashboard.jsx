import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function RetailerDashboard() {
    const navigate = useNavigate()
    const [profile, setProfile] = useState(null)
    const [items, setItems] = useState([])
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [newItem, setNewItem] = useState({ name: '', item: '', quantity: '' })
    const [showAddItem, setShowAddItem] = useState(false)

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        if (!user.access_token && !localStorage.getItem('token')) {
            navigate('/login')
            return
        }
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [profileRes, itemsRes, ordersRes] = await Promise.allSettled([
                api.get('/retailer/profile'),
                api.get('/retailer/items'),
                api.get('/retailer/orders'),
            ])
            if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data)
            if (itemsRes.status === 'fulfilled') setItems(itemsRes.value.data)
            if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value.data)
        } catch (err) {
            console.error('Failed to load data:', err)
        }
        setLoading(false)
    }

    const handleAddItem = async () => {
        if (!newItem.name || !newItem.item) return
        try {
            await api.post('/retailer/items', {
                name: newItem.name,
                item: newItem.item,
                quantity: parseFloat(newItem.quantity) || 0,
            })
            setNewItem({ name: '', item: '', quantity: '' })
            setShowAddItem(false)
            loadData()
        } catch (err) {
            console.error('Failed to add item:', err)
        }
    }

    const handleDeleteItem = async (id) => {
        try {
            await api.delete(`/retailer/items/${id}`)
            loadData()
        } catch (err) {
            console.error('Failed to delete item:', err)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/login')
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            {/* Top Bar */}
            <nav className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.06]">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to="/retailer" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center text-sm">🛒</div>
                            <span className="text-sm font-semibold">FoodChain <span className="text-teal-400">Retail</span></span>
                        </Link>
                        <span className="text-white/20">|</span>
                        <span className="px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 text-[10px] font-semibold uppercase tracking-wider">Dashboard</span>
                    </div>
                    <button onClick={handleLogout} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-white/60 hover:text-white transition-all">
                        Logout
                    </button>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-white/40 flex items-center gap-3">
                            <span className="animate-spin text-2xl">⏳</span>
                            Loading dashboard...
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-12 gap-6">
                        {/* Profile */}
                        <div className="col-span-12 lg:col-span-4">
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                                <h3 className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-4">👤 Profile</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between"><span className="text-white/40">Username</span><span>{profile?.user?.username || '—'}</span></div>
                                    <div className="flex justify-between"><span className="text-white/40">Contact</span><span>{profile?.user?.contact || '—'}</span></div>
                                    <div className="flex justify-between"><span className="text-white/40">Language</span><span>{profile?.language || '—'}</span></div>
                                    <div className="flex justify-between"><span className="text-white/40">Location</span><span className="text-xs">{profile?.user?.latitude?.toFixed(4)}, {profile?.user?.longitude?.toFixed(4)}</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="col-span-12 lg:col-span-8">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
                                    <div className="text-4xl font-black bg-gradient-to-b from-teal-300 to-teal-500 bg-clip-text text-transparent">{items.length}</div>
                                    <div className="text-xs text-white/40 mt-1">Inventory Items</div>
                                </div>
                                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
                                    <div className="text-4xl font-black bg-gradient-to-b from-teal-300 to-teal-500 bg-clip-text text-transparent">{orders.length}</div>
                                    <div className="text-xs text-white/40 mt-1">Mandi Orders</div>
                                </div>
                                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
                                    <div className="text-4xl font-black bg-gradient-to-b from-teal-300 to-teal-500 bg-clip-text text-transparent">
                                        {items.reduce((sum, i) => sum + parseFloat(i.quantity || 0), 0).toFixed(0)}
                                    </div>
                                    <div className="text-xs text-white/40 mt-1">Total Stock</div>
                                </div>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="col-span-12 lg:col-span-7">
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-semibold text-teal-400 uppercase tracking-wider">📦 Inventory</h3>
                                    <button onClick={() => setShowAddItem(!showAddItem)}
                                        className="px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-400 text-xs font-medium hover:bg-teal-500/30 transition-all">
                                        + Add Item
                                    </button>
                                </div>

                                {showAddItem && (
                                    <div className="mb-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                                        <input type="text" placeholder="Store name (e.g. My Shop)" value={newItem.name}
                                            onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-teal-500/50" />
                                        <input type="text" placeholder="Item name (e.g. Tomato)" value={newItem.item}
                                            onChange={e => setNewItem({ ...newItem, item: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-teal-500/50" />
                                        <div className="flex gap-2">
                                            <input type="number" placeholder="Quantity" value={newItem.quantity}
                                                onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
                                                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-teal-500/50" />
                                            <button onClick={handleAddItem} className="px-4 py-2 rounded-lg bg-teal-500 text-black text-sm font-semibold hover:bg-teal-400 transition-all">Add</button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {items.length === 0 ? (
                                        <p className="text-white/30 text-sm text-center py-8">No items yet. Add your first item above.</p>
                                    ) : items.map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-teal-500/[0.03] transition-all">
                                            <div>
                                                <div className="font-medium text-sm">{item.item}</div>
                                                <div className="text-xs text-white/40">{item.name} · Qty: {item.quantity}</div>
                                            </div>
                                            <button onClick={() => handleDeleteItem(item.id)} className="text-xs text-red-400/60 hover:text-red-400 transition-colors">Delete</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Orders */}
                        <div className="col-span-12 lg:col-span-5">
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                                <h3 className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-4">🏪 Mandi Orders</h3>
                                <div className="space-y-2">
                                    {orders.length === 0 ? (
                                        <p className="text-white/30 text-sm text-center py-8">No orders yet.</p>
                                    ) : orders.map(order => (
                                        <div key={order.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium">{order.item || 'N/A'}</span>
                                                <span className="text-teal-400">₹{order.price_per_kg}/kg</span>
                                            </div>
                                            <div className="text-xs text-white/40 mt-1">
                                                {order.order_date ? new Date(order.order_date).toLocaleDateString() : 'No date'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
