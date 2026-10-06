import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2, Sparkles, Layers, FileText, Image, Globe, Search } from 'lucide-react';

/**
 * Reusable TrustGraph Analysis Processing & Loading Component
 *
 * Provides a clean, non-disruptive, indeterminate loading state during real API requests.
 * Fits seamlessly into TrustGraph's design system (#3A4D39, #7F8F73, #EBE5D8).
 */
export default function AnalysisLoader({
  message,
  subMessage,
  fullScreen = false,
  batch = false,
  compact = false,
  icon: CustomIcon,
}) {
  const IconToRender = CustomIcon || (batch ? Layers : ShieldCheck);

  const defaultTitle = batch
    ? 'Analyzing your files...'
    : 'Processing your content...';

  const defaultSub = batch
    ? 'TrustGraph is processing the submitted batch content.'
    : 'Please wait while TrustGraph analyzes the submitted data.';

  const displayMessage = message || defaultTitle;
  const displaySubMessage = subMessage || defaultSub;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="relative flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[#7F8F73]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">{displayMessage}</p>
          <p className="text-xs text-gray-500">{displaySubMessage}</p>
        </div>
      </div>
    );
  }

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4'
    : 'w-full my-6 p-8 rounded-3xl border border-[#D5DDCE] bg-gradient-to-b from-[#F9F8F5] to-white shadow-sm text-center relative overflow-hidden';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25 }}
      className={containerClasses}
    >
      <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-4">
        {/* Animated Badge & Spinner */}
        <div className="relative flex items-center justify-center">
          {/* Outer glowing pulsing ring */}
          <div className="absolute w-20 h-20 rounded-full bg-[#7F8F73]/20 animate-ping" />

          {/* Spinning progress ring */}
          <div className="w-16 h-16 rounded-full border-4 border-[#EBE5D8] border-t-[#3A4D39] border-r-[#7F8F73] animate-spin" />

          {/* Center Shield / Custom Icon */}
          <div className="absolute inset-0 flex items-center justify-center text-[#3A4D39]">
            <IconToRender className="w-7 h-7" />
          </div>
        </div>

        {/* Messaging */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#7F8F73]">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#3A4D39]" />
            <span>Analysis In Progress</span>
          </div>

          <h3 className="text-lg font-bold text-gray-900 tracking-tight">
            {displayMessage}
          </h3>

          <p className="text-xs text-gray-500 max-w-sm mx-auto font-medium leading-relaxed">
            {displaySubMessage}
          </p>
        </div>

        {/* Indeterminate Status Bar */}
        <div className="w-full max-w-xs h-1.5 bg-[#EBE5D8] rounded-full overflow-hidden relative mt-2">
          <motion.div
            className="h-full bg-gradient-to-r from-[#7F8F73] via-[#3A4D39] to-[#7F8F73] rounded-full"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: 'easeInOut',
            }}
            style={{ width: '60%' }}
          />
        </div>
      </div>
    </motion.div>
  );
}
