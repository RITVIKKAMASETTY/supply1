// import React, { useState } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { motion } from 'framer-motion';
// import { User, Lock, ArrowRight } from 'lucide-react';
// import Input from '../components/ui/Input';
// import Button from '../components/ui/Button';
// import api from '../services/api';
// import signinImage from '../assets/image.png';

// const Login = () => {
//     const navigate = useNavigate();
//     const [formData, setFormData] = useState({
//         username: '',
//         password: '',
//     });
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState('');

//     const handleChange = (e) => {
//         setFormData({ ...formData, [e.target.name]: e.target.value });
//         setError('');
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         setLoading(true);
//         try {
//             const response = await api.post('/login', formData);
//             localStorage.setItem('token', response.data.access_token);
//             localStorage.setItem('user', JSON.stringify(response.data));

//             // Role-based redirection to dashboards
//             const role = response.data.role;
//             if (role === 'farmer') {
//                 navigate('/farmer/dashboard');
//             } else if (role === 'mandi_owner') {
//                 navigate('/mandi/dashboard');
//             } else if (role === 'retailer') {
//                 navigate('/retailer/dashboard');
//             } else {
//                 navigate('/'); // Default/Admin
//             }
//         } catch (err) {
//             setError(err.response?.data?.detail || 'Login failed. Please try again.');
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
//             <motion.div
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ duration: 0.5 }}
//                 className="bg-gray-100 rounded-[2rem] shadow-[20px_20px_60px_#d1d1d1,-20px_-20px_60px_#ffffff] w-full max-w-4xl overflow-hidden flex flex-col md:flex-row min-h-[480px]"
//             >
//                 {/* LEFT SIDE (Login Form Section) */}
//                 <div className="w-full md:w-1/2 p-8 flex flex-col justify-center relative bg-[#f0f0f3]">
//                     <div className="mb-6 text-left">
//                         <h1 className="text-4xl font-serif font-bold text-gray-800 mb-2">Welcome !</h1>
//                         <p className="text-xl text-gray-500 font-light">Sign in to</p>
//                     </div>

//                     {error && (
//                         <div className="mb-4 p-3 rounded-xl bg-red-100 text-red-600 text-sm shadow-inner">
//                             {error}
//                         </div>
//                     )}

//                     <form onSubmit={handleSubmit}>
//                         <Input
//                             label="Username"
//                             type="text"
//                             name="username"
//                             placeholder="Enter your username"
//                             value={formData.username}
//                             onChange={handleChange}
//                             icon={User}
//                             required
//                         />

//                         <Input
//                             label="Password"
//                             type="password"
//                             name="password"
//                             placeholder="Enter your password"
//                             value={formData.password}
//                             onChange={handleChange}
//                             icon={Lock}
//                             required
//                         />

//                         <div className="flex items-center justify-between mb-8 mt-4">
//                             <label className="flex items-center text-sm text-gray-500 cursor-pointer">
//                                 <input type="checkbox" className="mr-2 rounded text-gray-700 bg-gray-100 shadow-inner" />
//                                 Remember me
//                             </label>
//                             <a href="#" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Forgot password?</a>
//                         </div>

//                         <Button type="submit" disabled={loading} className="mb-6">
//                             {loading ? 'Logging in...' : 'Login'}
//                         </Button>
//                     </form>

//                     <div className="text-center text-gray-500 mt-auto">
//                         Don't have an Account ? <Link to="/register" className="font-semibold text-gray-800 hover:text-black transition-colors">Register</Link>
//                     </div>
//                 </div>

//                 {/* RIGHT SIDE (Illustration Section) */}
//                 <div className="w-full md:w-1/2 bg-[#f0f0f3] relative hidden md:flex items-center justify-center overflow-hidden rounded-r-[2rem]">
//                     <img
//                         src={signinImage}
//                         alt="Sign In Illustration"
//                         className="w-full h-full object-cover"
//                     />
//                 </div>
//             </motion.div>
//         </div>
//     );
// };

// export default Login;
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, ArrowRight } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../services/api';
import signinImage from '../assets/image.png';

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

            // Role-based redirection to dashboards
            const role = response.data.role;
            if (role === 'farmer') {
                navigate('/farmer/dashboard');
            } else if (role === 'mandi_owner') {
                navigate('/mandi/dashboard');
            } else if (role === 'retailer') {
                navigate('/retailer/dashboard');
            } else {
                navigate('/'); // Default/Admin
            }
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
                className="bg-gray-100 rounded-[2rem] shadow-[20px_20px_60px_#d1d1d1,-20px_-20px_60px_#ffffff] w-full max-w-4xl overflow-hidden flex flex-col md:flex-row min-h-[480px]"
            >
                {/* LEFT SIDE (Login Form Section) */}
                <div className="w-full md:w-1/2 p-8 flex flex-col justify-center relative bg-[#f0f0f3]">
                    <div className="mb-6 text-left">
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
                <div className="w-full md:w-1/2 bg-[#f0f0f3] relative hidden md:flex items-center justify-center overflow-hidden rounded-r-[2rem]">
                    <img
                        src={signinImage}
                        alt="Sign In Illustration"
                        className="w-full h-full object-cover"
                    />
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
