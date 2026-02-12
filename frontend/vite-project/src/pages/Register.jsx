import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, Phone, MapPin, Globe } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../services/api';
import signinImage from '../assets/image.png';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'farmer',
        contact: '',
        latitude: 0,
        longitude: 0,
        language: 'English',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [locationStatus, setLocationStatus] = useState('Detecting location...');

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData(prev => ({
                        ...prev,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    }));
                    setLocationStatus('Location detected ✅');
                },
                (err) => {
                    console.error("Location error:", err);
                    setLocationStatus('Location access denied ❌ (Defaulting to 0,0)');
                }
            );
        } else {
            setLocationStatus('Geolocation not supported');
        }
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Ensure numbers are sent as numbers, though JS usually does this safely if initialized as such
            const payload = {
                ...formData,
                latitude: parseFloat(formData.latitude),
                longitude: parseFloat(formData.longitude)
            };
            await api.post('/register', payload);
            navigate('/login');
        } catch (err) {
            console.error("Registration Error:", err.response?.data); // Helpful for debugging
            // Improve error message display
            const serverError = err.response?.data?.detail;
            const message = Array.isArray(serverError)
                ? serverError.map(e => e.msg).join(', ')
                : (serverError || 'Registration failed. Please check your inputs.');
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-gray-100 rounded-[2rem] shadow-[20px_20px_60px_#d1d1d1,-20px_-20px_60px_#ffffff] w-full max-w-5xl overflow-hidden flex flex-col md:flex-row min-h-[400px]"
            >
                {/* LEFT SIDE (Register Form Section) */}
                <div className="w-full md:w-3/5 p-6 md:p-8 flex flex-col justify-center relative bg-[#f0f0f3]">
                    <div className="mb-4 text-left">
                        <h1 className="text-3xl font-serif font-bold text-gray-800 mb-1">Create Account</h1>
                        <p className="text-lg text-gray-500 font-light">Join us today!</p>
                    </div>

                    {error && (
                        <div className="mb-2 p-2 rounded-xl bg-red-100 text-red-600 text-xs shadow-inner">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="col-span-1 md:col-span-2">
                            <Input
                                label="Username"
                                type="text"
                                name="username"
                                placeholder="Choose a username"
                                value={formData.username}
                                onChange={handleChange}
                                icon={User}
                                required
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <Input
                                label="Password"
                                type="password"
                                name="password"
                                placeholder="Create a password"
                                value={formData.password}
                                onChange={handleChange}
                                icon={Lock}
                                required
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2 mb-2">
                            <label className="block text-gray-700 text-xs font-medium mb-1 pl-1">I am a...</label>
                            <div className="relative">
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-xl bg-gray-50 border-none outline-none text-gray-700 shadow-[inset_2px_2px_5px_#b8b9be,inset_-3px_-3px_7px_#ffffff] focus:shadow-[inset_1px_1px_2px_#b8b9be,inset_-1px_-1px_2px_#ffffff] appearance-none text-sm"
                                >
                                    <option value="farmer">Farmer</option>
                                    <option value="mandi_owner">Mandi Owner</option>
                                    <option value="retailer">Retailer</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                                </div>
                            </div>
                        </div>

                        <Input
                            label="Contact"
                            type="text"
                            name="contact"
                            placeholder="Phone number"
                            value={formData.contact}
                            onChange={handleChange}
                            icon={Phone}
                        />

                        {/* Language Selection */}
                        <div className="col-span-1 md:col-span-2 mb-2">
                            <label className="block text-gray-700 text-xs font-medium mb-1 pl-1">Language</label>
                            <div className="relative">
                                <select
                                    name="language"
                                    value={formData.language}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-xl bg-gray-50 border-none outline-none text-gray-700 shadow-[inset_2px_2px_5px_#b8b9be,inset_-3px_-3px_7px_#ffffff] focus:shadow-[inset_1px_1px_2px_#b8b9be,inset_-1px_-1px_2px_#ffffff] appearance-none text-sm"
                                >
                                    <option value="English">English</option>
                                    <option value="Hindi">Hindi</option>
                                    <option value="Kannada">Kannada</option>
                                    <option value="Tamil">Tamil</option>
                                    <option value="Telugu">Telugu</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                    <Globe className="w-4 h-4" />
                                </div>
                            </div>
                        </div>

                        {/* Location Status (Auto-filled) */}
                        <div className="col-span-1 md:col-span-2 text-xs text-gray-500 flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            <span>{locationStatus}</span>
                        </div>

                        <div className="col-span-1 md:col-span-2 mt-4">
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Creating Account...' : 'Register'}
                            </Button>
                        </div>
                    </form>

                    <div className="text-center text-gray-500 mt-6">
                        Already have an account? <Link to="/login" className="font-semibold text-gray-800 hover:text-black transition-colors">Login</Link>
                    </div>
                </div>

                {/* RIGHT SIDE (Illustration Section) */}
                <div className="w-full md:w-2/5 bg-[#f0f0f3] relative hidden md:flex items-center justify-center overflow-hidden rounded-r-[2rem]">
                    <img
                        src={signinImage}
                        alt="Join Network Illustration"
                        className="w-full h-full object-cover"
                    />
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
