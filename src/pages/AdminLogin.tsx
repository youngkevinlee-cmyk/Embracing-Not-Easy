import { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Mail, Lock, ArrowRight, Info } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // Verify if truly admin
      const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
      if (userDoc.exists() && userDoc.data().role === 'admin') {
        navigate('/admin');
      } else {
        setError('Access denied. This area is for administrators only.');
        await auth.signOut();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) {
      setError('Please enter your email to reset password.');
      return;
    }
    await sendPasswordResetEmail(auth, email);
    setResetSent(true);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md bg-white p-8 md:p-12 rounded-[2.5rem] border border-stone-100 shadow-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-stone-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-stone-900/10">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-serif font-bold">Admin Portal</h1>
          <p className="text-stone-500 font-medium">Secure access for platform management</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-stone-400 px-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-stone-200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between px-1">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Password</label>
              <button 
                type="button" 
                onClick={handleReset}
                className="text-[10px] uppercase font-bold text-stone-400 hover:text-stone-900 transition-colors"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-stone-200"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-start gap-3">
               <Info className="w-5 h-5 shrink-0" />
               {error}
            </div>
          )}

          {resetSent && (
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-medium">
               Password reset link sent to your email.
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-stone-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-stone-900/10 hover:bg-stone-800 transition-all disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : <>Access Dashboard <ArrowRight className="w-5 h-5" /></>}
          </button>
        </form>

        <div className="text-center pt-4">
           <p className="text-[10px] text-stone-300 uppercase font-bold tracking-[0.2em]">Authorized Personnel Only</p>
        </div>
      </div>
    </div>
  );
}
