import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Calendar as CalendarIcon, Clock, CheckCircle2, ChevronRight, User, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import EditableText from '../components/EditableText';
// @ts-ignore
import therapistDefaultImage from '../assets/images/regenerated_image_1781297696165.png';

export default function BookingPage() {
  const { user, profile } = useAuth();
  const [sessionTypes, setSessionTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);

  const [availability, setAvailability] = useState<any[]>([]);
  const [therapistProfile, setTherapistProfile] = useState<any>(null);

  useEffect(() => {
    const path = 'sessionTypes';
    const unsub = onSnapshot(collection(db, path), (snap) => {
      setSessionTypes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    const unsubAvail = onSnapshot(collection(db, 'availability'), (snap) => {
      setAvailability(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubProfile = onSnapshot(doc(db, 'therapistProfile', 'profile'), (snap) => {
      if (snap.exists()) {
        setTherapistProfile(snap.data());
      }
    });

    return () => { unsub(); unsubAvail(); unsubProfile(); };
  }, []);

  const generateSlots = () => {
    const dayName = format(selectedDate, 'EEEE');
    const dayAvail = availability.find(a => a.id === dayName);
    
    if (!dayAvail || dayAvail.isOff) return [];

    const start = dayAvail.start || "09:00";
    const end = dayAvail.end || "17:00";
    const duration = selectedType?.duration || 60;

    // Generate slots every 30 mins between start and end
    const slots = [];
    let [currH, currM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const endTotal = endH * 60 + endM;

    while (currH * 60 + currM + duration <= endTotal) {
      const h = currH % 12 || 12;
      const ampm = currH >= 12 ? 'PM' : 'AM';
      slots.push(`${h}:${currM.toString().padStart(2, '0')} ${ampm}`);
      
      currM += 30; // 30 min increments
      if (currM >= 60) {
        currH += 1;
        currM -= 60;
      }
    }
    return slots;
  };

  const slots = generateSlots();

  const handleBooking = async () => {
    if (!user || !selectedType || !selectedSlot) return;

    const path = 'bookings';
    try {
      await addDoc(collection(db, path), {
        userId: user.uid,
        userName: user.displayName || user.email,
        sessionTypeId: selectedType.id,
        sessionTitle: selectedType.title,
        date: selectedDate,
        slot: selectedSlot,
        status: 'confirmed',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }

    // Mock Email Confirmation
    try {
      await fetch('/api/bookings/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: user.email, 
          bookingDetails: { type: selectedType.title, date: format(selectedDate, 'PPP'), slot: selectedSlot } 
        })
      });
    } catch (e) {
      console.warn('Confirmation relay skipped:', e);
    }

    setIsSuccess(true);
  };
  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(startOfToday(), i));

  if (isSuccess) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-serif font-bold mb-4">You're All Set!</h2>
        <p className="text-stone-600 max-w-sm mb-8">
          Your hypnotherapy session has been confirmed. You will receive a confirmation email shortly with instructions.
        </p>
        <button 
          onClick={() => { setIsSuccess(false); setStep(1); }}
          className="bg-stone-900 text-white px-8 py-3 rounded-full font-bold hover:bg-stone-800 transition-colors"
        >
          Book Another Session
        </button>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-12">
      <header className="max-w-2xl">
        <EditableText 
          id="booking-title" 
          defaultValue="Guided Hypnotherapy" 
          className="text-4xl font-serif font-bold text-stone-900 text-balance block" 
          tag="h1" 
        />
        <EditableText 
          id="booking-subtitle" 
          defaultValue="Live one-on-one sessions tailored to your transformation goals. Pick a focus area and find a time that works for you." 
          className="text-stone-600 mt-4 text-lg block" 
          tag="p" 
          multiline={true}
        />
      </header>

      <div className="grid lg:grid-cols-12 gap-12">
        {/* Progress Rail */}
        <div className="lg:col-span-1 hidden lg:flex flex-col items-center py-4 space-y-12">
          {[1, 2, 3].map(s => (
            <div 
              key={s} 
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                step === s ? 'bg-stone-900 text-white shadow-xl scale-110' : 
                step > s ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-400'
              }`}
            >
              {step > s ? <CheckCircle2 className="w-6 h-6" /> : s}
            </div>
          ))}
        </div>

        {/* Form Area */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-xl font-bold">1. Select Session Type</h3>
                <div className="grid gap-4">
                  {sessionTypes.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type)}
                      className={`flex items-center justify-between p-6 rounded-2xl border text-left transition-all ${
                        selectedType?.id === type.id 
                          ? 'border-stone-900 bg-stone-50 shadow-inner' 
                          : 'border-stone-100 hover:border-stone-200 bg-white'
                      }`}
                    >
                      <div>
                        <h4 className="font-bold">{type.title}</h4>
                        <p className="text-sm text-stone-500 mt-1">{type.description}</p>
                        <div className="flex gap-4 mt-3 text-xs font-bold text-stone-400 uppercase">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {type.duration}m</span>
                          <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Private</span>
                        </div>
                      </div>
                      <div className="text-lg font-serif font-bold ml-4">
                        ${type.price}
                      </div>
                    </button>
                  ))}
                </div>
                <div>
                  <style>{`@import url(https://fonts.googleapis.com/css2?family=Roboto:wght=400;500;700&display=swap);`}</style>
                  <a 
                    href="https://book.carepatron.com/Embracing-Not-Easy/Kevin?p=dDBvGnaGT9SNgJc-ZO8JgA&s=BACNCsqf&e=b"
                    rel="noopener noreferrer" 
                    title="Book appointment"
                    style={{
                      WebkitTextSizeAdjust: "100%",
                      WebkitFontSmoothing: "antialiased",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      WebkitTapHighlightColor: "transparent",
                      outline: 0,
                      border: 0,
                      margin: 0,
                      cursor: "pointer",
                      userSelect: "none",
                      verticalAlign: "middle",
                      WebkitAppearance: "none",
                      textDecoration: "none",
                      fontFamily: "Roboto, Helvetica, Arial, sans-serif",
                      fontWeight: 500,
                      letterSpacing: "0.02857em",
                      transition: "background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, border-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
                      color: "#fff",
                      backgroundColor: "#EF5350",
                      textTransform: "none",
                      boxSizing: "border-box",
                      borderRadius: "4px",
                      boxShadow: "none",
                      minWidth: 0,
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      height: "36px",
                      padding: "6px 16px",
                      fontSize: "14px",
                      lineHeight: "26px",
                      width: "100%"
                    }}
                    target="_blank"
                  >
                    Book appointment
                  </a>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <h3 className="text-xl font-bold">2. Choose Date & Time</h3>
                  <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                    {next7Days.map(date => (
                      <button
                        key={date.toISOString()}
                        onClick={() => setSelectedDate(date)}
                        className={`flex flex-col items-center min-w-[80px] p-4 rounded-2xl border transition-all ${
                          isSameDay(selectedDate, date)
                            ? 'bg-stone-900 text-white border-stone-900 shadow-xl'
                            : 'bg-white text-stone-600 border-stone-100 hover:bg-stone-50'
                        }`}
                      >
                        <span className="text-xs uppercase font-bold tracking-widest opacity-60">{format(date, 'EEE')}</span>
                        <span className="text-xl font-serif font-bold mt-1">{format(date, 'd')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-stone-400 uppercase tracking-widest">Available Slots for {format(selectedDate, 'PPP')}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {slots.map(slot => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-3 rounded-xl border font-medium transition-all ${
                          selectedSlot === slot
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-stone-50 text-stone-600 border-transparent hover:bg-stone-100'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={() => setStep(1)} className="flex-1 py-4 border border-stone-200 rounded-2xl font-bold">Back</button>
                  <button 
                    disabled={!selectedSlot}
                    onClick={() => setStep(3)}
                    className="flex-[2] py-4 bg-stone-900 text-white rounded-2xl font-bold disabled:opacity-30"
                  >
                    Review Details
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="bg-stone-100 p-8 rounded-3xl space-y-6">
                  <h3 className="text-xl font-bold">3. Review & Confirm</h3>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center py-3 border-b border-stone-200">
                        <span className="text-stone-500">Session</span>
                        <span className="font-bold">{selectedType?.title}</span>
                     </div>
                     <div className="flex justify-between items-center py-3 border-b border-stone-200">
                        <span className="text-stone-500">Date</span>
                        <span className="font-bold">{format(selectedDate, 'PPP')}</span>
                     </div>
                     <div className="flex justify-between items-center py-3 border-b border-stone-200">
                        <span className="text-stone-500">Time</span>
                        <span className="font-bold">{selectedSlot}</span>
                     </div>
                     <div className="flex justify-between items-center py-3 pt-6">
                        <span className="text-xl font-serif">Total Amount</span>
                        <span className="text-2xl font-serif font-bold text-stone-900">${selectedType?.price}</span>
                     </div>
                  </div>
                </div>

                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                  <p className="text-sm text-amber-800 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    Payment will be processed securely. Confirmation will be sent to <strong>{user?.email}</strong>.
                  </p>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setStep(2)} className="flex-1 py-4 border border-stone-200 rounded-2xl font-bold">Back</button>
                  <button 
                    onClick={handleBooking}
                    className="flex-[2] py-4 bg-stone-900 text-white rounded-2xl font-bold shadow-xl shadow-stone-900/10"
                  >
                    Pay & Confirm Booking
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Summary */}
        <div className="lg:col-span-4 space-y-6">
          {/* Therapist Bio & Photo Area */}
          <div className="bg-stone-50 p-8 rounded-3xl border border-stone-100 shadow-sm space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Your Practitioner</span>
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-stone-200 shrink-0 bg-stone-100 flex items-center justify-center">
                <img 
                  key={therapistProfile?.imageUrl}
                  src={therapistProfile?.imageUrl || therapistDefaultImage} 
                  alt={therapistProfile?.name || 'Dr. Julianne Reed'} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = therapistDefaultImage;
                  }}
                />
              </div>
              <div>
                <h4 className="font-serif font-bold text-stone-900 text-base">{therapistProfile?.name || 'Dr. Julianne Reed'}</h4>
                <p className="text-[10px] font-bold tracking-wide text-stone-400 uppercase">Licensed Therapist & Guide</p>
              </div>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed font-sans italic">
              "{therapistProfile?.bio || 'Dedicated to facilitating gentle, profound subconscious realignment. Together, we will dismantle limiting beliefs and craft sustainable pathways toward healing and authentic integration.'}"
            </p>
          </div>

           <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
              <h4 className="font-bold mb-4 text-stone-400 text-xs uppercase tracking-widest">Why Choose Guided Sessions?</h4>
              <ul className="space-y-4">
                {[
                  'Bespoke protocols for your specific neurology',
                  'Interactive real-time neuro-linguistic adjustments',
                  'Secure & private virtual sanctuary environment',
                  'Post-session integration roadmap included'
                ].map((text, i) => (
                  <li key={i} className="flex gap-3 text-sm text-stone-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {text}
                  </li>
                ))}
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
}
