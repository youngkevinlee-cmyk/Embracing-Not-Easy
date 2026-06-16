import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PenLine, 
  Smile, 
  Frown, 
  Meh, 
  TrendingUp, 
  Calendar, 
  Plus, 
  CheckCircle2, 
  Target 
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format } from 'date-fns';

export default function JournalPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [moods, setMoods] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [newEntry, setNewEntry] = useState('');
  const [selectedMood, setSelectedMood] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    // Entries
    const entriesPath = `users/${user.uid}/journalEntries`;
    const qEntries = query(
      collection(db, entriesPath),
      orderBy('date', 'desc')
    );
    const unsubEntries = onSnapshot(qEntries, (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, entriesPath);
    });

    // Moods for chart
    const moodsPath = `users/${user.uid}/moods`;
    const qMoods = query(
      collection(db, moodsPath),
      orderBy('date', 'asc')
    );
    const unsubMoods = onSnapshot(qMoods, (snap) => {
      setMoods(snap.docs.map(d => {
        const data = d.data();
        return {
          date: data.date?.toDate ? format(data.date.toDate(), 'MM/dd') : '...',
          mood: data.mood
        };
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, moodsPath);
    });

    // Habits
    const habitsPath = `users/${user.uid}/habits`;
    const qHabits = query(collection(db, habitsPath));
    const unsubHabits = onSnapshot(qHabits, (snap) => {
      setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, habitsPath);
    });

    return () => {
      unsubEntries();
      unsubMoods();
      unsubHabits();
    };
  }, [user]);

  const saveEntry = async () => {
    if (!newEntry.trim() || !user) return;
    const path = `users/${user.uid}/journalEntries`;
    try {
      await addDoc(collection(db, path), {
        content: newEntry,
        date: serverTimestamp()
      });
      setNewEntry('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const saveMood = async (score: number) => {
    if (!user) return;
    const path = `users/${user.uid}/moods`;
    setSelectedMood(score);
    try {
      await addDoc(collection(db, path), {
        mood: score,
        date: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  return (
    <div className="py-8 space-y-12">
      <header>
        <h1 className="text-4xl font-serif font-bold text-stone-900">Your Sanctuary</h1>
        <p className="text-stone-500 mt-2">Private space for reflection, mood tracking, and growth.</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Journaling */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm space-y-6">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <PenLine className="w-5 h-5 text-stone-400" /> Daily Reflection
            </h2>
            <textarea
              value={newEntry}
              onChange={(e) => setNewEntry(e.target.value)}
              placeholder="What's on your mind today?"
              className="w-full h-40 p-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-stone-200 resize-none font-serif text-lg text-stone-700"
            />
            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                {[
                  { icon: Frown, score: 1, color: 'text-red-400' },
                  { icon: Meh, score: 3, color: 'text-amber-400' },
                  { icon: Smile, score: 5, color: 'text-emerald-400' },
                ].map((m) => (
                  <button
                    key={m.score}
                    onClick={() => saveMood(m.score)}
                    className={`p-3 rounded-xl transition-all ${
                      selectedMood === m.score ? 'bg-stone-100 scale-110 shadow-inner' : 'hover:bg-stone-50'
                    }`}
                  >
                    <m.icon className={`w-6 h-6 ${m.color}`} />
                  </button>
                ))}
              </div>
              <button 
                onClick={saveEntry}
                disabled={!newEntry.trim()}
                className="bg-stone-900 text-white px-8 py-3 rounded-full font-bold hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                Save Entry
              </button>
            </div>
          </section>

          {/* Previous Entries */}
          <section className="space-y-4">
            <h3 className="font-bold text-stone-400 uppercase tracking-widest text-xs flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Past Reflections
            </h3>
            <div className="space-y-4">
              {entries.map((entry) => (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={entry.id} 
                  className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-stone-400">
                      {entry.date?.toDate ? format(entry.date.toDate(), 'PPP p') : 'Just now'}
                    </span>
                  </div>
                  <p className="text-stone-700 font-serif leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                </motion.div>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Progress & Habits */}
        <div className="space-y-8">
          {/* Mood Chart */}
          <section className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm aspect-square md:aspect-video lg:aspect-square flex flex-col">
            <h3 className="flex items-center gap-2 font-bold mb-6">
              <TrendingUp className="w-5 h-5 text-emerald-500" /> Mood Trends
            </h3>
            <div className="flex-1 w-full min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={moods}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={[0, 6]} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="mood" 
                    stroke="#1c1917" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#1c1917' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Habits */}
          <section className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="flex items-center gap-2 font-bold">
                <Target className="w-5 h-5 text-amber-500" /> Daily Habits
              </h3>
              <Plus className="w-4 h-4 text-stone-400 cursor-pointer" />
            </div>
            
            <div className="space-y-4">
              {habits.length === 0 ? (
                <p className="text-sm text-stone-400 italic">No habits tracked yet. Start small.</p>
              ) : (
                habits.map(habit => (
                  <div key={habit.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
                    <span className="text-sm font-medium">{habit.name}</span>
                    <button className="text-stone-300 hover:text-emerald-500 transition-colors">
                      <CheckCircle2 className="w-6 h-6" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
