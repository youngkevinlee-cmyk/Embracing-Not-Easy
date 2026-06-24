import { motion } from 'motion/react';
import { Music, Calendar, Users, ArrowRight, Play, Heart, Sun, Star, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import EditableText from '../components/EditableText';
// @ts-ignore
import heroImage from '../assets/images/regenerated_image_1782314735662.png';

export default function LandingPage() {
  const { user, profile } = useAuth();

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('Login cancelled by user');
      } else {
        console.error('Login Error:', error);
      }
    }
  };

  const joinMembership = async () => {
    if (!user) {
      await login();
      return;
    }
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        role: 'member',
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      alert('Welcome to the sanctuary! Your membership is now active.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const claimAdmin = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        role: 'admin'
      });
      alert('Admin privileges granted. Refreshing...');
      window.location.reload();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <div className="space-y-24 py-12">
      {/* Developer Tool: Show only for owner */}
      {user?.email === 'youngkevinlee@gmail.com' && profile?.role !== 'admin' && (
        <div className="fixed bottom-4 left-4 z-[100]">
          <button 
            onClick={claimAdmin}
            className="bg-amber-500 text-stone-900 px-4 py-2 rounded-full text-xs font-bold shadow-2xl hover:scale-105 transition-transform flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" /> Claim Admin Role (Dev)
          </button>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-stone-900 text-white p-8 md:p-16 lg:p-24">
        <div className="relative z-10 max-w-2xl space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-serif leading-tight tracking-tight"
          >
            <EditableText id="landing-hero-title" defaultValue="Wellness isn't easy." />
            <br/>
            <EditableText id="landing-hero-span" defaultValue="Embracing it is." className="italic text-stone-400" />
          </motion.h1>
          <EditableText 
            id="landing-hero-desc" 
            defaultValue="A sanctuary for transformation through guided imagery, professional hypnotherapy, and a supportive community built for real growth." 
            className="text-lg text-stone-300 max-w-lg block" 
            tag="p"
            multiline={true}
          />
          <div className="flex flex-wrap gap-4 pt-4">
            <button 
              onClick={login}
              className="bg-white text-stone-900 px-8 py-4 rounded-full font-bold flex items-center gap-2 hover:bg-stone-100 transition-colors"
            >
              Start Journey <ArrowRight className="w-5 h-5" />
            </button>
            <Link 
              to="/library"
              className="border border-white/20 px-8 py-4 rounded-full font-bold flex items-center gap-2 hover:bg-white/10 transition-colors"
            >
              Browse Library <Play className="w-4 h-4" />
            </Link>
          </div>
        </div>
        
        {/* Abstract shapes/images */}
        <div className="absolute top-0 right-0 w-1/2 h-full hidden lg:block opacity-40">
           <div className="absolute inset-0 bg-gradient-to-l from-stone-900 via-transparent to-transparent z-10" />
           <img 
            src={heroImage} 
            alt="Calm" 
            className="w-full h-full object-cover grayscale"
            referrerPolicy="no-referrer"
           />
        </div>
      </section>

      {/* Featured Services */}
      <section className="grid md:grid-cols-3 gap-8">
        {[
          { 
            title: 'Library', 
            desc: 'Curated guided imagery for sleep, focus, and anxiety relief.', 
            icon: Music, 
            color: 'bg-emerald-50 text-emerald-700',
            link: '/library'
          },
          { 
            title: 'Live Sessions', 
            desc: 'Professional hypnotherapy tailored to your specific needs.', 
            icon: Calendar, 
            color: 'bg-indigo-50 text-indigo-700',
            link: '/booking'
          },
          { 
            title: 'Community', 
            desc: 'Safe spaces to share, grow, and support fellow travelers.', 
            icon: Users, 
            color: 'bg-amber-50 text-amber-700',
            link: '/community'
          },
        ].map((item, i) => (
          <motion.div 
            key={i}
            whileHover={{ y: -5 }}
            className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm transition-all"
          >
            <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center mb-6`}>
              <item.icon className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-serif font-bold mb-3">{item.title}</h3>
            <p className="text-stone-600 mb-6">{item.desc}</p>
            <Link to={item.link} className="text-stone-900 font-bold flex items-center gap-1 group">
              Learn more <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        ))}
      </section>

      {/* Subscriptions */}
      <section className="bg-stone-100 rounded-[3rem] p-8 md:p-16">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <Heart className="w-12 h-12 text-stone-400 mx-auto" />
          <EditableText 
            id="landing-pricing-title" 
            defaultValue="Simple, inclusive access" 
            className="text-4xl font-serif font-bold block" 
            tag="h2" 
          />
          <EditableText 
            id="landing-pricing-desc" 
            defaultValue="Access free resources or join as a Member for full access to the audio library and community features." 
            className="text-xl text-stone-600 block" 
            tag="p" 
            multiline={true}
          />
          
          <div className="grid sm:grid-cols-2 gap-8 pt-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
              <h4 className="text-stone-500 font-bold uppercase tracking-wider text-sm mb-4">Guest</h4>
              <div className="text-3xl font-serif font-bold mb-4">Free</div>
              <ul className="text-stone-600 space-y-3 mb-8 text-left">
                <li className="flex items-center gap-2"><Star className="w-4 h-4" /> Selected audio recordings</li>
                <li className="flex items-center gap-2"><Star className="w-4 h-4" /> Shop products at list price</li>
                <li className="flex items-center gap-2"><Star className="w-4 h-4" /> Educational blog & podcast</li>
              </ul>
              <button 
                onClick={login}
                className="w-full py-4 border border-stone-200 rounded-full font-bold hover:bg-stone-50 transition-colors"
              >
                Join for free
              </button>
            </div>
            
            <div className="bg-stone-900 text-white p-8 rounded-3xl shadow-xl ring-4 ring-amber-500/20">
              <h4 className="text-amber-500 font-bold uppercase tracking-wider text-sm mb-4 flex items-center justify-center gap-2">
                <Sun className="w-4 h-4" /> Member Favorite
              </h4>
              <div className="text-3xl font-serif font-bold mb-4">
                {profile?.role === 'member' ? 'Active' : '$29'}<span className="text-lg opacity-60">{profile?.role === 'member' ? '' : '/30 days'}</span>
              </div>
              <ul className="text-stone-400 space-y-3 mb-8 text-left">
                <li className="flex items-center gap-2 text-white"><Star className="w-4 h-4" /> Full library access</li>
                <li className="flex items-center gap-2 text-white"><Star className="w-4 h-4" /> Member-only community groups</li>
                <li className="flex items-center gap-2 text-white"><Star className="w-4 h-4" /> Preferred booking rates</li>
                <li className="flex items-center gap-2 text-white"><Star className="w-4 h-4" /> Private journaling & tracking</li>
              </ul>
              <button 
                onClick={joinMembership}
                disabled={profile?.role === 'member'}
                className="w-full py-4 bg-amber-500 text-stone-900 rounded-full font-bold hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:bg-stone-700 disabled:text-stone-400"
              >
                {profile?.role === 'member' ? 'Membership Active' : 'Become a Member'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
