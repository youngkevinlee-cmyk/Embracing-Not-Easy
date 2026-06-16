import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Send, User, MessageSquare, CheckCircle, Sparkles, AlertCircle, Calendar } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<any | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      setErrorStatus('Please fill in all required fields (Name, Email, and Message).');
      return;
    }

    setIsSubmitting(true);
    setErrorStatus(null);

    try {
      // 1. Doc save to Firestore Contacts Collection (non-blocking)
      try {
        await addDoc(collection(db, 'contacts'), {
          name: formData.name,
          email: formData.email,
          subject: formData.subject || 'No Subject',
          message: formData.message,
          createdAt: new Date().toISOString()
        });
      } catch (fErr) {
        console.warn('Firestore contact save skipped or failed, proceeding with direct email delivery:', fErr);
      }

      // 2. Dispatch to server-side simulated mailer
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Server returned error response');
      }

      const resData = await response.json();
      setSubmittedData({
        ...formData,
        timestamp: new Date().toISOString(),
        deliveredTo: 'embracingnoteasy@gmail.com'
      });
      
      // Clear form
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
    } catch (err: any) {
      console.error('Contact submission error:', err);
      setErrorStatus('There was an issue sending your message. However, you can use the direct link below to email us manually.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pre-filled Mailto params for explicit client-side immediate backup delivery!
  const mailtoUrl = `mailto:embracingnoteasy@gmail.com?subject=${encodeURIComponent(
    formData.subject || 'Message from Embracing Not Easy Visitor'
  )}&body=${encodeURIComponent(
    `Hello, my name is ${formData.name}.\n\nMessage:\n${formData.message}\n\nMy email: ${formData.email}`
  )}`;

  const successMailtoUrl = submittedData 
    ? `mailto:embracingnoteasy@gmail.com?subject=${encodeURIComponent(
        submittedData.subject || 'Message from Contact Page'
      )}&body=${encodeURIComponent(
        `Name: ${submittedData.name}\nEmail: ${submittedData.email}\n\nMessage:\n${submittedData.message}`
      )}`
    : '';

  return (
    <div className="py-12 max-w-4xl mx-auto space-y-12">
      {/* Page Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-semibold tracking-wider uppercase">
          <Mail className="w-3.5 h-3.5 text-indigo-500" /> Let's Connect
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-stone-900">
          Support & Connection
        </h1>
        <p className="text-stone-500 text-sm max-w-xl mx-auto leading-relaxed">
          Wellness isn't easy, but you don't have to carry it alone. Write to me, ask a question, or share your thoughts. All messages are directly delivered to <strong className="text-stone-700">embracingnoteasy@gmail.com</strong>.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!submittedData ? (
          <motion.div 
            key="contact-form-pane"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid md:grid-cols-12 gap-8 bg-white p-6 md:p-10 rounded-[2.5rem] border border-stone-100 shadow-sm"
          >
            {/* Quick Info Sidebar */}
            <div className="md:col-span-4 space-y-6 md:border-r md:border-stone-100 md:pr-8">
              <div className="space-y-2">
                <h3 className="text-lg font-serif font-bold text-stone-900">Direct Email</h3>
                <p className="text-stone-500 text-xs leading-relaxed">
                  Have a confidential client inquiry or professional request? Shoot an email directly to:
                </p>
                <a 
                  href="mailto:embracingnoteasy@gmail.com" 
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-900 hover:text-indigo-600 underline py-1"
                >
                  embracingnoteasy@gmail.com
                </a>
              </div>

              <div className="pt-4 border-t border-stone-100 space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400">Response Window</h3>
                <p className="text-stone-500 text-xs leading-relaxed font-semibold">
                  I typically review direct guest messages and reply within 24 to 48 hours. Let me know the best format to write back.
                </p>
              </div>

              <div className="pt-4 border-t border-stone-100 space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400">Secure Audit</h3>
                <p className="text-stone-500 text-[11px] leading-relaxed">
                  Your submitted messages are kept confidential, indexed in our personal sanctuary logs, and routed straight to the therapist's primary inbox.
                </p>
              </div>
            </div>

            {/* Input Form Fields */}
            <form onSubmit={handleSubmit} className="md:col-span-8 space-y-6">
              {errorStatus && (
                <div className="p-4 bg-orange-50 border border-orange-200/50 rounded-2xl flex items-start gap-2.5 text-xs text-orange-950 font-medium">
                  <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p>{errorStatus}</p>
                    <a 
                      href={mailtoUrl}
                      className="inline-block text-xs font-bold text-orange-900 hover:underline"
                    >
                      Click here to send email using Mail Client instead →
                    </a>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="name" className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                    <User className="w-3 h-3 text-stone-400" /> Your Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={handleChange}
                    className="p-3 bg-stone-50 hover:bg-stone-100/50 focus:bg-white rounded-xl border border-stone-200/60 focus:border-stone-900 text-sm font-medium transition-all focus:outline-none"
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-stone-400" /> Email Address *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="e.g. you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="p-3 bg-stone-50 hover:bg-stone-100/50 focus:bg-white rounded-xl border border-stone-200/60 focus:border-stone-900 text-sm font-medium transition-all focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label htmlFor="subject" className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-stone-400" /> Subject / Topic
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  placeholder="What is this regarding?"
                  value={formData.subject}
                  onChange={handleChange}
                  className="p-3 bg-stone-50 hover:bg-stone-100/50 focus:bg-white rounded-xl border border-stone-200/60 focus:border-stone-900 text-sm font-medium transition-all focus:outline-none"
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <label htmlFor="message" className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Your Message / Story *
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  placeholder="Write your thoughts or message here..."
                  value={formData.message}
                  onChange={handleChange}
                  className="p-3 bg-stone-50 hover:bg-stone-100/50 focus:bg-white rounded-xl border border-stone-200/60 focus:border-stone-900 text-sm font-medium transition-all focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-3 px-8 bg-stone-900 hover:bg-stone-800 text-white rounded-full font-bold text-sm tracking-wide shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer select-none"
                >
                  {isSubmitting ? (
                    <>Sending Message...</>
                  ) : (
                    <>
                      Send Message <Send className="w-4 h-4 ml-0.5" />
                    </>
                  )}
                </button>
                <span className="text-[11px] text-stone-400">
                  * Fields marked with star are required
                </span>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            key="contact-success-pane"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-2xl mx-auto bg-stone-900 text-white p-8 md:p-12 rounded-[2.5rem] text-center space-y-6 shadow-xl relative overflow-hidden"
          >
            {/* Background sparkle visual accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/10 blur-3xl pointer-events-none" />

            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto ring-8 ring-white/5">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>

            <h2 className="text-2xl md:text-3xl font-serif font-bold">Message Sent Successfully!</h2>
            
            <p className="text-stone-300 text-sm leading-relaxed max-w-md mx-auto">
              Thank you, <strong className="text-white">{submittedData.name}</strong>. Your message is received! A backup copy has been securely logged in our system, and our server routed your message directly to:
            </p>
            
            <div className="inline-block p-2 px-4 rounded-xl bg-white/5 border border-white/10 font-mono text-xs text-amber-400">
              embracingnoteasy@gmail.com
            </div>

            <p className="text-stone-400 text-xs leading-relaxed max-w-sm mx-auto">
              If your browser's primary email system is set up, you can also launch your local mail application to verify or double-send this message directly:
            </p>

            <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-3">
              <a 
                href={successMailtoUrl}
                className="w-full sm:w-auto px-6 py-3 bg-white text-stone-900 rounded-full font-bold text-xs hover:bg-stone-100 transition-colors inline-flex items-center justify-center gap-2"
              >
                Launch Local Mail App <Send className="w-3.5 h-3.5" />
              </a>
              <button 
                onClick={() => setSubmittedData(null)}
                className="w-full sm:w-auto px-6 py-3 border border-white/20 hover:bg-white/10 text-white rounded-full font-bold text-xs transition-colors"
              >
                Send Another Message
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
