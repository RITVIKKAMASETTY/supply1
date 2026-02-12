import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const Input = ({
    label,
    type = 'text',
    placeholder,
    value,
    onChange,
    name,
    required = false,
    icon: Icon,
    className = '',
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    return (
        <div className={`mb-4 ${className}`}>
            {label && (
                <label className="block text-gray-700 text-sm font-medium mb-2 pl-1">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon className="h-5 w-5 text-gray-400" />
                    </div>
                )}
                <motion.input
                    whileFocus={{ scale: 1.01 }}
                    type={isPassword ? (showPassword ? 'text' : 'password') : type}
                    name={name}
                    id={name}
                    className={`
            w-full px-4 py-3 rounded-xl bg-gray-50 border-none outline-none
            text-gray-700 placeholder-gray-400
            shadow-[inset_2px_2px_5px_#b8b9be,inset_-3px_-3px_7px_#ffffff]
            focus:shadow-[inset_1px_1px_2px_#b8b9be,inset_-1px_-1px_2px_#ffffff]
            transition-all duration-200 ease-in-out
            ${Icon ? 'pl-10' : ''}
            ${isPassword ? 'pr-10' : ''}
          `}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    required={required}
                />
                {isPassword && (
                    <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                )}
            </div>
        </div>
    );
};

export default Input;
