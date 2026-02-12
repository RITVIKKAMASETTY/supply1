import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, ArrowRight } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../services/api';

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
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
            const response = await api.post('/login', formData);
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data));
            navigate('/'); // Redirect to dashboard/home
        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed. Please try again.');
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
                className="bg-gray-100 rounded-[3rem] shadow-[20px_20px_60px_#d1d1d1,-20px_-20px_60px_#ffffff] w-full max-w-5xl overflow-hidden flex flex-col md:flex-row min-h-[600px]"
            >
                {/* LEFT SIDE (Login Form Section) */}
                <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center relative bg-[#f0f0f3]">
                    <div className="mb-10 text-left">
                        <h1 className="text-4xl font-serif font-bold text-gray-800 mb-2">Welcome !</h1>
                        <p className="text-xl text-gray-500 font-light">Sign in to</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-100 text-red-600 text-sm shadow-inner">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <Input
                            label="Username"
                            type="text"
                            name="username"
                            placeholder="Enter your username"
                            value={formData.username}
                            onChange={handleChange}
                            icon={User}
                            required
                        />

                        <Input
                            label="Password"
                            type="password"
                            name="password"
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={handleChange}
                            icon={Lock}
                            required
                        />

                        <div className="flex items-center justify-between mb-8 mt-4">
                            <label className="flex items-center text-sm text-gray-500 cursor-pointer">
                                <input type="checkbox" className="mr-2 rounded text-gray-700 bg-gray-100 shadow-inner" />
                                Remember me
                            </label>
                            <a href="#" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Forgot password?</a>
                        </div>

                        <Button type="submit" disabled={loading} className="mb-6">
                            {loading ? 'Logging in...' : 'Login'}
                        </Button>
                    </form>

                    <div className="text-center text-gray-500 mt-auto">
                        Don't have an Account ? <Link to="/register" className="font-semibold text-gray-800 hover:text-black transition-colors">Register</Link>
                    </div>
                </div>

                {/* RIGHT SIDE (Illustration Section) */}
                <div className="w-full md:w-1/2 bg-gradient-to-br from-[#e0f7fa] to-[#e1bee7] relative hidden md:flex items-center justify-center p-12 overflow-hidden">
                    {/* Decorative shapes to mimic the "Illustration" */}
                    <div className="absolute inset-0 bg-white/30 backdrop-blur-sm z-0"></div>

                    <div className="relative z-10 w-full h-full flex items-center justify-center">
                        {/* Abstract compositions */}
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                            className="absolute top-20 right-20 w-32 h-32 bg-blue-200 rounded-full blur-xl opacity-60"
                        ></motion.div>
                        <motion.div
                            animate={{ y: [0, 15, 0] }}
                            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                            className="absolute bottom-20 left-20 w-40 h-40 bg-pink-200 rounded-full blur-xl opacity-60"
                        ></motion.div>

                        {/* "Character" approximation */}
                        <div className="relative">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                                className="w-64 h-64 bg-gradient-to-tr from-green-200 to-teal-100 rounded-[3rem] shadow-xl rotate-45 flex items-center justify-center"
                            >
                                <div className="w-48 h-48 bg-white/40 rounded-full backdrop-blur-md"></div>
                            </motion.div>

                            {/* Cute face elements */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                                <div className="flex space-x-8 mb-2">
                                    <div className="w-4 h-4 bg-gray-800 rounded-full"></div>
                                    <div className="w-4 h-4 bg-gray-800 rounded-full"></div>
                                </div>
                                <div className="w-6 h-3 border-b-4 border-gray-800 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
