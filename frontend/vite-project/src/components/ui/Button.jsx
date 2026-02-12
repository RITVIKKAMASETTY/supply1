import React from 'react';
import { motion } from 'framer-motion';

const Button = ({ children, onClick, type = 'button', className = '', disabled = false, variant = 'primary' }) => {
    const primaryStyles = `
    bg-gradient-to-r from-gray-800 to-gray-900 text-white
    shadow-[5px_5px_10px_#b8b9be,-5px_-5px_10px_#ffffff]
    hover:shadow-[2px_2px_5px_#b8b9be,-2px_-2px_5px_#ffffff]
    active:shadow-[inset_2px_2px_5px_#000000,inset_-2px_-2px_5px_#333333]
  `;

    const secondaryStyles = `
    bg-gray-100 text-gray-700
    shadow-[5px_5px_10px_#b8b9be,-5px_-5px_10px_#ffffff]
    hover:shadow-[2px_2px_5px_#b8b9be,-2px_-2px_5px_#ffffff]
    active:shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff]
  `;

    return (
        <motion.button
            whileTap={{ scale: 0.98 }}
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`
        w-full py-3 px-6 rounded-xl font-semibold tracking-wide
        transition-all duration-200 ease-in-out
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variant === 'primary' ? primaryStyles : secondaryStyles}
        ${className}
      `}
        >
            {children}
        </motion.button>
    );
};

export default Button;
