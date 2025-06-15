// File: src/Components/Dashboard/StatCard.jsx
import React from 'react';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, colorClass, size = 'default' }) => {
  return (
    <motion.div 
      className={`bg-gray-800 rounded-lg p-4 text-center hover:shadow-lg ${
        size === 'large' ? 'col-span-1 sm:col-span-2' : ''
      }`}
      whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
      transition={{ duration: 0.2 }}
    >
      <p className="text-gray-300 text-sm">{title}</p>
      <p className={`text-3xl font-bold mt-2 ${colorClass}`}>
        {value}
      </p>
    </motion.div>
  );
};

export default StatCard;
