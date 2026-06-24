import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Compass, Calendar, PenLine, Users, X, ArrowRight, HelpCircle } from 'lucide-react';

export default function WelcomePrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Check if user has visited before
    const hasSeenWelcome = localStorage.getItem('ene_welcome_prompt_seen');
    if (!hasSeenWelcome) {
      // Small delay for natural entrance after page load
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for custom event to trigger the tour again
  useEffect(() => {
    const handleOpenTour = () => {
      setShowTooltip(false);
      setIsVisible(true);
    };
    window.addEventListener('open-welcome-tour', handleOpenTour);
    return () => window.removeEventListener('open-welcome-tour', handleOpenTour);
  }, []);

  const handleDismiss = (withTour: boolean) => {
    localStorage.setItem('ene_welcome_prompt_seen', 'true');
    setIsVisible(false);

    if (withTour) {
      // 1. Trigger Dragonfly Chatbot to open
      window.dispatchEvent(new CustomEvent('open-dragonfly-guide'));
      
      // 2. We can also post a message or trigger custom prompt inside chatbot if desired
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('start-dragonfly-tour'));
      }, 300);
    } else {
      // Show tooltip helper pointing to the chatbot button
      setShowTooltip(true);
      // Auto dismiss tooltip after 8 seconds
      setTimeout(() => {
        setShowTooltip(false);
      }, 8000);
    }
  };

  const pillars = [
    {
      icon: Compass,
      title: 'Audio Library',
      desc: 'Immersive soundscapes, deep breathing loops, and guided imagery.',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      icon: Calendar,
      title: 'Therapy Booking',
      desc: 'Schedule private, professional counselling sessions seamlessly.',
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      icon: PenLine,
      title: 'Private Journal',
      desc: 'Log your mood trends and write private journal entries securely.',
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      icon: Users,
      title: 'Community Space',
      desc: 'A moderated, supportive forum to connect and share experiences.',
      color: 'text-rose-600 bg-rose-50 border-rose-100',
    },
  ];

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => handleDismiss(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
              id="welcome-backdrop"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-xl bg-stone-50 border border-stone-200/80 rounded-[2rem] p-6 md:p-8 shadow-2xl overflow-hidden font-sans"
              id="welcome-modal-card"
            >
              {/* Subtle visual ambient pattern */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-100/30 rounded-full blur-3xl -z-10" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-100/30 rounded-full blur-3xl -z-10" />

              {/* Close Button */}
              <button
                onClick={() => handleDismiss(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-colors cursor-pointer"
                title="Close welcome guide"
                id="welcome-close-btn"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="flex items-start gap-4 mb-6" id="welcome-header">
                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/30 shrink-0">
                  <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full">
                    AI Guided Tour
                  </span>
                  <h2 className="text-2xl md:text-3xl font-serif font-extrabold text-stone-900 tracking-tight mt-1.5">
                    Welcome to Embracing Not Easy
                  </h2>
                  <p className="text-stone-600 text-sm mt-1 font-medium">
                    A dedicated wellness support space designed to help you lean into and embrace life's struggles rather than escape them.
                  </p>
                </div>
              </div>

              {/* Pillars list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8" id="welcome-pillars-list">
                {pillars.map((pillar, i) => {
                  const IconComponent = pillar.icon;
                  return (
                    <div
                      key={i}
                      className="p-4 bg-white rounded-2xl border border-stone-100 shadow-sm flex gap-3 hover:border-stone-200 transition-all group"
                    >
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${pillar.color}`}>
                        <IconComponent className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-800">{pillar.title}</h4>
                        <p className="text-[11px] text-stone-500 font-medium leading-relaxed mt-0.5">
                          {pillar.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-4 border-t border-stone-200/60" id="welcome-actions">
                <div className="flex items-center gap-1.5 text-stone-500 text-xs font-medium">
                  <HelpCircle className="w-4 h-4 text-stone-400 shrink-0" />
                  <span>Always available via Dragonfly Guide chat icon.</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  <button
                    onClick={() => handleDismiss(false)}
                    className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-800 hover:bg-stone-100 transition-colors text-xs font-bold text-center cursor-pointer"
                    id="welcome-explore-own-btn"
                  >
                    Explore on my own
                  </button>
                  <button
                    onClick={() => handleDismiss(true)}
                    className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-850 text-stone-50 hover:shadow-md transition-all text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    id="welcome-start-ai-btn"
                  >
                    <span>Let's Tour with AI</span>
                    <ArrowRight className="w-4 h-4 text-stone-300" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Tooltip Helper (Pointing to Chatbot icon) */}
      <AnimatePresence>
        {showTooltip && (
          <div className="fixed bottom-24 right-6 z-[100]" id="welcome-tooltip-container">
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="relative max-w-xs bg-stone-900 text-stone-100 border border-stone-800 p-4 rounded-2xl shadow-xl flex items-start gap-2"
            >
              {/* Close Tooltip Button */}
              <button
                onClick={() => setShowTooltip(false)}
                className="absolute top-2 right-2 text-stone-400 hover:text-white"
                title="Dismiss tip"
                id="tooltip-close-btn"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="w-7 h-7 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20 shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              </div>
              <div className="pr-3">
                <h5 className="text-xs font-bold text-white">Need a Tour Later?</h5>
                <p className="text-[11px] text-stone-300 mt-1 leading-normal font-medium">
                  No problem! You can always trigger the guide or ask questions by clicking the **Dragonfly Chatbot** button down below.
                </p>
                <button
                  onClick={() => {
                    setShowTooltip(false);
                    window.dispatchEvent(new CustomEvent('open-welcome-tour'));
                  }}
                  className="text-[10px] text-amber-400 hover:text-amber-300 underline font-bold mt-2 cursor-pointer flex items-center gap-0.5"
                  id="tooltip-reopen-tour-btn"
                >
                  Reopen welcome prompt
                </button>
              </div>

              {/* Arrow point down pointing to the chatbot button (usually 24px off screen bottom-6, right-6) */}
              <div className="absolute -bottom-2 right-6 w-4 h-4 bg-stone-900 border-r border-b border-stone-800 rotate-45" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
