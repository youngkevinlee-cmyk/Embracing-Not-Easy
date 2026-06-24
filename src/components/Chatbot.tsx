import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Sparkles, HelpCircle, ArrowRight, CornerDownLeft } from 'lucide-react';
import Markdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  { text: 'Show the Welcome Onboarding guide', label: '✨ App Tour' },
  { text: 'What is guided imagery?', label: 'Guided Imagery' },
  { text: 'How do I log my daily mood in the Journal?', label: 'Mood Journaling' },
  { text: 'How can I book a session with a therapist?', label: 'Counselling & Bookings' },
  { text: 'Tell me about the community support forum', label: 'Community Support' },
  { text: 'What does Embracing Not Easy mean?', label: 'Our Philosophy' }
];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I am **Dragonfly**, your companion for **Embracing Not Easy**. ENE is a wellness support space created to help you embrace rather than escape life's natural struggles. 

How can I guide you through our platform today? You can ask me how to use the journal, book therapy, explore the library, or understand our core philosophy.`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Listen to external custom events
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleStartTour = () => {
      setIsOpen(true);
      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content: 'Please show me around the app and give me an AI Tour!',
          timestamp: new Date()
        },
        {
          role: 'assistant',
          content: `Welcome to your **Guided App Tour**! I'm Dragonfly, and I'd love to help you get familiar with our features. 

Here is how you can use **Embracing Not Easy**:

1. **[Library](/library)**: Access deep audio experiences, customized breathing loops, and guided soundscapes designed to stabilize your focus and support mindful transitions.
2. **[Counselling & Bookings](/booking)**: Connect and schedule live therapy sessions with our certified resident professionals seamlessly.
3. **[Mood Journal](/journal)** (Requires login): A secure place to document and track your emotional wellness, tracking trends over time.
4. **[Community support](/community)** (Requires login): Share and discuss life's struggles with peer support on our fully moderated and safe community space.
5. **[About Me](/about)**: Read about our founder's story, mission, and the philosophy of accepting hardship.

If you ever want to re-access this welcome tour prompt visually, you can select the **"App Tour"** button right here below. How can I assist you on your journey today?`,
          timestamp: new Date()
        }
      ]);
    };

    window.addEventListener('open-dragonfly-guide', handleOpen);
    window.addEventListener('start-dragonfly-tour', handleStartTour);

    return () => {
      window.removeEventListener('open-dragonfly-guide', handleOpen);
      window.removeEventListener('start-dragonfly-tour', handleStartTour);
    };
  }, []);

  // Auto scroll to the bottom when messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    if (textToSend === 'Show the Welcome Onboarding guide') {
      setIsOpen(false);
      window.dispatchEvent(new CustomEvent('open-welcome-tour'));
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history to send (latest 8 messages for optimal context window)
      const chatHistory = [...messages, userMessage].map((msg) => ({
        role: msg.role,
        content: msg.content
      })).slice(-8);

      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: chatHistory })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reply from server.');
      }

      const data = await response.json();
      
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply || 'I apologize, something went wrong. Let me know if there is anything else I can guide you on!',
          timestamp: new Date()
        }
      ]);
    } catch (err: any) {
      console.error('Chatbot endpoint error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Hello! I encountered an issue connecting to my core brain, but I am still here to help. Please try again in a moment, or feel free to check out our [About Me](/about) story or [Therapy Booking](/booking) directories!',
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <AnimatePresence>
        {/* Chat Widget Panel */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="mb-4 w-[22rem] sm:w-[26rem] h-[34rem] bg-stone-50/95 backdrop-blur-md rounded-2xl border border-stone-200/90 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-stone-900 text-stone-100 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/30">
                  <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm tracking-wide text-white flex items-center gap-1.5">
                    Dragonfly Guide 
                  </h3>
                  <p className="text-[10px] text-stone-300 font-medium">Warm companion on your journey</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
                title="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-stone-205 scrollbar-track-transparent">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm border ${
                      message.role === 'user'
                        ? 'bg-stone-800 text-stone-100 border-stone-950'
                        : 'bg-white text-stone-800 border-stone-100'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-stone prose-sm max-w-none leading-relaxed dark-mode-invert markdown-body [&>p]:mb-2 [&>p:last-child]:mb-0 [&>strong]:text-stone-900 [&>strong]:font-bold [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-2">
                        <Markdown>{message.content}</Markdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    )}
                    <span className="block text-[9px] mt-1 text-right opacity-55">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-stone-800 border border-stone-100 rounded-2xl px-4 py-3 text-sm shadow-sm flex items-center space-x-2">
                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions Drawer */}
            <div className="px-4 py-2 border-t border-stone-200/50 bg-stone-100/50">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-stone-500 mb-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
                Ask a quick question
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
                {SUGGESTIONS.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(sug.text)}
                    disabled={isLoading}
                    className="text-xs bg-white hover:bg-amber-500 hover:text-white border border-stone-200/90 hover:border-amber-500/30 rounded-full px-2.5 py-1 text-stone-700 transition duration-150 disabled:opacity-40 flex items-center gap-1 font-medium cursor-pointer shadow-none"
                  >
                    <span>{sug.label}</span>
                    <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                  </button>
                ))}
              </div>
            </div>

            {/* Input Footer Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="p-3 border-t border-stone-200 bg-white flex items-center space-x-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Dragonfly a question..."
                className="flex-1 bg-stone-50 text-stone-800 text-sm placeholder-stone-400 rounded-xl px-3.5 py-2.5 border border-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-500 focus:border-stone-500 transition-all font-medium"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-xl bg-stone-800 hover:bg-stone-900 text-stone-100 flex items-center justify-center transition-all disabled:opacity-45 disabled:cursor-not-allowed hover:shadow-md cursor-pointer"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating launcher action button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 rounded-full bg-stone-900 hover:bg-stone-850 text-white flex items-center justify-center shadow-xl border border-stone-800 focus:outline-none cursor-pointer relative"
        title="Open Dragonfly Guide"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-6 h-6 text-stone-100" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center"
            >
              <MessageSquare className="w-6 h-6 text-stone-100" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 border-2 border-stone-900 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 border-2 border-stone-900 rounded-full" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
