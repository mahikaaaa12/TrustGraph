import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';

export default function Toast({ toast }) {
  if (!toast) return null;

  const icons = {
    success: <FaCheckCircle className="text-emerald-400 text-lg" />,
    error: <FaExclamationTriangle className="text-rose-400 text-lg" />,
    info: <FaInfoCircle className="text-blue-400 text-lg" />,
  };

  const borders = {
    success: 'border-emerald-500/30 bg-emerald-950/80 text-emerald-200',
    error: 'border-rose-500/30 bg-rose-950/80 text-rose-200',
    info: 'border-blue-500/30 bg-blue-950/80 text-blue-200',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl ${
          borders[toast.type] || borders.info
        }`}
      >
        {icons[toast.type] || icons.info}
        <span className="text-sm font-medium">{toast.message}</span>
      </motion.div>
    </AnimatePresence>
  );
}
