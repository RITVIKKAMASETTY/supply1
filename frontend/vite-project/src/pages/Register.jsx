import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, Mail, MapPin, Phone, Globe } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../services/api';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'farmer',
        contact: '',
        location: '',
        language: 'English',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/register', formData);
            navigate('/login'); // Redirect to login on success
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed. Please try again.');
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
                className="bg-gray-100 rounded-[3rem] shadow-[20px_20px_60px_#d1d1d1,-20px_-20px_60px_#ffffff] w-full max-w-6xl overflow-hidden flex flex-col md:flex-row min-h-[700px]"
            >
                {/* LEFT SIDE (Register Form Section) */}
                <div className="w-full md:w-3/5 p-8 md:p-12 flex flex-col justify-center relative bg-[#f0f0f3]">
                    <div className="mb-8 text-left">
                        <h1 className="text-4xl font-serif font-bold text-gray-800 mb-2">Create Account</h1>
                        <p className="text-xl text-gray-500 font-light">Join us today!</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-100 text-red-600 text-sm shadow-inner">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                        <div className="col-span-1 md:col-span-2 mb-4">
                            <label className="block text-gray-700 text-sm font-medium mb-2 pl-1">I am a...</label>
                            <div className="relative">
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none outline-none text-gray-700 shadow-[inset_2px_2px_5px_#b8b9be,inset_-3px_-3px_7px_#ffffff] focus:shadow-[inset_1px_1px_2px_#b8b9be,inset_-1px_-1px_2px_#ffffff] appearance-none"
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

                        <Input
                            label="Location"
                            type="text"
                            name="location"
                            placeholder="City/Region"
                            value={formData.location}
                            onChange={handleChange}
                            icon={MapPin}
                        />

                        <div className="col-span-1 md:col-span-2 mt-6">
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
                <div className="w-full md:w-2/5 bg-gradient-to-bl from-[#fff3e0] to-[#ffe0b2] relative hidden md:flex items-center justify-center p-12 overflow-hidden">
                    {/* Decorative shapes */}
                    <div className="absolute inset-0 bg-white/30 backdrop-blur-sm z-0"></div>

                    <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.8 }}
                            className="text-center mb-8"
                        >
                            <h2 className="text-3xl font-serif text-gray-800 font-bold opacity-80">Join Our Network</h2>
                            <p className="text-gray-600 mt-2">Connect with farmers, mandis, and retailers.</p>
                        </motion.div>

                        {/* Abstract "Network" shapes */}
                        <div className="relative w-64 h-64">
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ repeat: Infinity, duration: 4 }}
                                className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-green-200 rounded-full shadow-lg blur-sm"
                            ></motion.div>
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 5, delay: 1 }}
                                className="absolute bottom-0 left-0 w-24 h-24 bg-orange-200 rounded-full shadow-lg blur-sm"
                            ></motion.div>
                            <motion.div
                                animate={{ scale: [1, 1.15, 1] }}
                                transition={{ repeat: Infinity, duration: 4.5, delay: 0.5 }}
                                className="absolute bottom-10 right-0 w-16 h-16 bg-blue-200 rounded-full shadow-lg blur-sm"
                            ></motion.div>

                            {/* Connecting lines (SVG) */}
                            <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100">
                                <line x1="50" y1="20" x2="20" y2="80" stroke="black" strokeWidth="0.5" />
                                <line x1="50" y1="20" x2="80" y2="70" stroke="black" strokeWidth="0.5" />
                                <line x1="20" y1="80" x2="80" y2="70" stroke="black" strokeWidth="0.5" />
                            </svg>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
