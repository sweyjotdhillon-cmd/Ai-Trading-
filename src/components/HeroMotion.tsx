import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface HeroMotionProps {
  onStart: () => void;
}

export function HeroMotion({ onStart }: HeroMotionProps) {
  const prefersReducedMotion = useReducedMotion();

  // Typography stagger
  const lineVariants = {
    hidden: { y: 60, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  return (
    <div className="relative w-full h-[70vh] min-h-[500px] bg-[#05070A] overflow-hidden flex flex-col items-center justify-center font-sans tracking-tight">
      {/* 1. BACKGROUND CANVAS */}
      <div className="absolute inset-0 z-0 pointer-events-none mix-blend-screen opacity-35">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#A67C52] rounded-full blur-[120px] animate-[pulse_20s_infinite_alternate]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#8B2323] rounded-full blur-[140px] animate-[pulse_25s_infinite_alternate_reverse]" />
      </div>

      {/* Grid */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-4"
        style={{
          backgroundImage: `linear-gradient(to right, #D9B382 1px, transparent 1px), linear-gradient(to bottom, #D9B382 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
          animation: prefersReducedMotion ? 'none' : 'scrollUp 60s linear infinite'
        }}
      />

      {/* 2. THREE FLOATING RIBBON / TORUS SHAPES */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Ribbon A */}
        <motion.div
          className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px]"
          animate={prefersReducedMotion ? {} : {
            rotate: 360,
            y: [-20, 20, -20]
          }}
          transition={prefersReducedMotion ? {} : {
            rotate: { duration: 35, ease: "linear", repeat: Infinity },
            y: { duration: 8, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }
          }}
          style={{ willChange: 'transform' }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full sm:scale-100 scale-[0.6] origin-top-left">
            <defs>
              <linearGradient id="gradA" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#A67C52" />
                <stop offset="50%" stopColor="#E8D5B5" />
                <stop offset="100%" stopColor="#A67C52" />
              </linearGradient>
              <filter id="blurA">
                <feGaussianBlur stdDeviation="8" />
              </filter>
            </defs>
            <path d="M 20 100 C 20 20, 180 20, 180 100" fill="none" stroke="url(#gradA)" strokeWidth="28" strokeLinecap="round" filter="url(#blurA)" />
          </svg>
        </motion.div>

        {/* Ribbon B: Torus */}
        <motion.div
           className="absolute top-[10%] right-[5%] w-[300px] h-[300px]"
           animate={prefersReducedMotion ? {} : {
            rotate: -360,
            y: [20, -20, 20]
          }}
          transition={prefersReducedMotion ? {} : {
            rotate: { duration: 25, ease: "linear", repeat: Infinity },
            y: { duration: 7, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }
          }}
          style={{ willChange: 'transform' }}
        >
          {/* Simulated candlestick element behind */}
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <div className="w-[4px] h-[150px] bg-white absolute" />
            <div className="w-[30px] h-[80px] bg-white absolute" />
          </div>
          <svg viewBox="0 0 200 200" className="w-full h-full relative z-10 sm:scale-100 scale-[0.6] origin-top-right">
            <defs>
              <radialGradient id="gradB" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#D9B382" />
                <stop offset="100%" stopColor="#EF4444" />
              </radialGradient>
            </defs>
            <ellipse cx="100" cy="100" rx="70" ry="40" fill="none" stroke="url(#gradB)" strokeWidth="20" transform="rotate(-30 100 100)" />
          </svg>
        </motion.div>

        {/* Ribbon C (hidden on small) */}
        <motion.div
          className="absolute bottom-[-5%] left-[25%] w-[600px] h-[200px] hidden sm:block"
          animate={prefersReducedMotion ? {} : {
            rotate: [0, 5, -5, 0],
            y: [-15, 15, -15]
          }}
          transition={prefersReducedMotion ? {} : {
            rotate: { duration: 30, ease: "linear", repeat: Infinity },
            y: { duration: 9, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }
          }}
          style={{ willChange: 'transform' }}
        >
          <svg viewBox="0 0 400 100" className="w-full h-full">
            <defs>
               <linearGradient id="gradC" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22C55E" />
                <stop offset="100%" stopColor="#D9B382" />
              </linearGradient>
            </defs>
            <path d="M 0 80 Q 150 80, 250 40 T 400 10" fill="none" stroke="url(#gradC)" strokeWidth="12" strokeLinecap="round" />
          </svg>
        </motion.div>
      </div>

      {/* 3. FOREGROUND TYPOGRAPHY */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="font-mono text-xs sm:text-sm tracking-[0.2em] text-[#D9B382] uppercase mb-6 animate-float"
        >
          // LIVE_MARKET_INTELLIGENCE
        </motion.p>

        <motion.div 
          className="font-display text-[#E8ECF4] text-[3.5rem] sm:text-[7rem] leading-[0.9] flex flex-col mb-8 uppercase"
          style={{ fontFamily: 'Anton, sans-serif' }}
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.span variants={lineVariants} transition={{ duration: 0.8, ease: "easeOut" }} className="animate-float" style={{ animationDelay: '0.1s' }}>
            TRADE
          </motion.span>
          <motion.span variants={lineVariants} transition={{ duration: 0.8, ease: "easeOut" }} className="animate-float" style={{ animationDelay: '0.2s' }}>
            WITH
          </motion.span>
          <motion.span 
            variants={lineVariants} 
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="animate-float"
            style={{ 
              animationDelay: '0.3s',
              backgroundImage: 'linear-gradient(90deg, #A67C52, #E8D5B5, #D9B382, #A67C52)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundSize: '200% auto',
              animation: 'shine 4s linear infinite',
            }}
          >
            PRECISION.
          </motion.span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="text-[#8E9299] max-w-md text-sm sm:text-base mb-8 px-4 font-inter leading-relaxed"
        >
          AI-debated signals. Statistical edge. Loss autopsy on every trade.
        </motion.p>

        {/* 4. LIVE TICKER STRIP */}
        <motion.div 
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 1.4, duration: 1 }}
           className="w-[120%] sm:w-full overflow-hidden border-y border-white/5 bg-[#111318]/50 py-2 mb-8 backdrop-blur-sm -rotate-1 sm:rotate-0"
        >
           <div 
             className="flex whitespace-nowrap font-mono text-[10px] sm:text-xs"
             style={{ animation: prefersReducedMotion ? 'none' : 'marque 40s linear infinite' }}
           >
             {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-8 px-4 items-center">
                  <span className="text-white/70">BTC/USD <span className="text-[#22C55E]">68,420.55 ▲ 1.24%</span></span>
                  <span className="text-white/20">•</span>
                  <span className="text-white/70">EUR/USD <span className="text-[#EF4444]">1.0842 ▼ 0.18%</span></span>
                  <span className="text-white/20">•</span>
                  <span className="text-[#D9B382]">AI CONFIDENCE 87.3%</span>
                  <span className="text-white/20">•</span>
                  <span className="text-[#A67C52]">WIN-RATE 14D 64.2%</span>
                  <span className="text-white/20">•</span>
                </div>
             ))}
           </div>
        </motion.div>

        {/* 5. CTA ROW */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 items-center"
        >
          <motion.button
            whileHover={prefersReducedMotion ? {} : { scale: 1.03 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
            onClick={onStart}
            className="px-8 py-4 bg-gradient-to-r from-[#A67C52] via-[#D9B382] to-[#A67C52] rounded-xl text-[#05070A] font-bold tracking-wide uppercase text-sm"
          >
            Start Live Analysis →
          </motion.button>
        </motion.div>
      </div>

      {/* 6. SCROLL HINT */}
      <motion.div 
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 2.5, duration: 1 }}
      >
        <span className="text-[10px] uppercase font-bold tracking-widest text-white/50 mb-2">Scroll</span>
        <motion.div
           animate={prefersReducedMotion ? {} : { y: [0, 8, 0] }}
           transition={prefersReducedMotion ? {} : { duration: 1.5, ease: "easeInOut", repeat: Infinity }}
        >
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
}
