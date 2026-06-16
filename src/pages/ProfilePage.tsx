import { useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  getDocs, 
  onSnapshot, 
  orderBy,
  where
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  UserCheck, 
  Settings, 
  Bookmark, 
  ShoppingBag, 
  BookOpen, 
  Bell, 
  Check, 
  Calendar, 
  TrendingUp, 
  LogOut, 
  Hash, 
  Activity, 
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user, profile, loading: authLoading } = useAuth();

  // Auth States
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile Settings States
  const [newUsername, setNewUsername] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [newsletter, setNewsletter] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [settingsStatus, setSettingsStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'preferences' | 'journal' | 'bookmarks' | 'purchases'>('preferences');

  // Dynamic Activity States
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<any[]>([]);
  const [purchasedProducts, setPurchasedProducts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const categories = ['Mindset', 'Research', 'Stories', 'Tutorials', 'Focus'];

  // Initialize form fields when profile is loaded
  useEffect(() => {
    if (profile) {
      setNewUsername(profile.username || '');
      setNotifications(profile.preferences?.notificationsEnabled ?? true);
      setNewsletter(profile.preferences?.newsletterSubscribed ?? true);
      setSelectedCategories(profile.preferences?.preferredCategories || []);
    }
  }, [profile]);

  // Fetch Activity History (Private Journals)
  useEffect(() => {
    if (!user) return;
    const entriesPath = `users/${user.uid}/journalEntries`;
    const q = query(collection(db, entriesPath), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setJournalEntries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, entriesPath);
    });
    return unsub;
  }, [user]);

  // Fetch Activity History (Bookmarked Posts & Purchased Products)
  useEffect(() => {
    if (!user || !profile) return;
    setPostsLoading(true);

    const loadBookmarksAndPurchases = async () => {
      try {
        // Bookmarks
        if (profile.bookmarks && profile.bookmarks.length > 0) {
          const qPosts = query(collection(db, 'posts'));
          const snap = await getDocs(qPosts);
          const allPosts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const filtered = allPosts.filter(post => profile.bookmarks?.includes(post.id));
          setBookmarkedPosts(filtered);
        } else {
          setBookmarkedPosts([]);
        }

        // Purchases
        const qProducts = query(collection(db, 'products'));
        const snapProducts = await getDocs(qProducts);
        const allProducts = snapProducts.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const filteredProducts = allProducts.filter(prod => profile.purchasedItems?.includes(prod.id));
        setPurchasedProducts(filteredProducts);
      } catch (err) {
        console.error('Error loading history:', err);
      } finally {
        setPostsLoading(false);
      }
    };

    loadBookmarksAndPurchases();
  }, [user, profile?.bookmarks, profile?.purchasedItems]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setIsSubmitting(true);

    const cleanUsername = username.trim().replace(/\s+/g, '').toLowerCase();

    if (!isSignUp) {
      // ---------------- LOGIN FLOW ----------------
      try {
        let loginEmail = email.trim();

        // If login text does not contain @, treat as username lookup
        if (!loginEmail.includes('@')) {
          const claimRef = doc(db, 'usernames', loginEmail.toLowerCase());
          const claimSnap = await getDoc(claimRef);
          if (!claimSnap.exists()) {
            throw new Error('This username does not exist. Please check or register instead.');
          }
          const userUid = claimSnap.data().uid;
          const userRef = doc(db, 'users', userUid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            throw new Error('Error restoring username record profile.');
          }
          const recoveredEmail = userSnap.data().email;
          if (!recoveredEmail) {
            throw new Error('Could not find email matching username.');
          }
          loginEmail = recoveredEmail;
        }

        await signInWithEmailAndPassword(auth, loginEmail, password);
        setAuthSuccess('Welcome back!');
      } catch (error: any) {
        console.error('Login error:', error);
        setAuthError(error.message || 'Error occurred during login. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // ---------------- SIGNUP FLOW ----------------
      try {
        if (!username || username.trim().length < 3) {
          throw new Error('Username must be at least 3 characters long.');
        }
        if (!/^[a-zA-Z0-9_\-]+$/.test(cleanUsername)) {
          throw new Error('Username can only contain letters, numbers, underscores and hyphens.');
        }

        // 1. Check Username Uniqueness
        const usernameClaimPath = `usernames/${cleanUsername}`;
        const claimRef = doc(db, 'usernames', cleanUsername);
        const claimSnap = await getDoc(claimRef);
        if (claimSnap.exists()) {
          throw new Error('This username is already taken. Please choose another.');
        }

        // 2. Auth User Creation
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const uid = credential.user.uid;

        // 3. Claims & Profile setup
        const userPath = `users/${uid}`;
        try {
          await setDoc(doc(db, 'usernames', cleanUsername), {
            uid: uid,
            username: username.trim()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, usernameClaimPath);
        }

        try {
          await setDoc(doc(db, 'users', uid), {
            uid,
            email: email.trim(),
            username: username.trim(),
            role: 'guest',
            bookmarks: [],
            purchasedItems: [],
            preferences: {
              notificationsEnabled: true,
              newsletterSubscribed: true,
              preferredCategories: ['Mindset']
            }
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, userPath);
        }

        setAuthSuccess('Account created successfully! Welcome to Embracing Not Easy.');
      } catch (error: any) {
        console.error('Signup error:', error);
        setAuthError(error.message || 'Error occurred during sign up.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleUpdatePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setSettingsStatus('saving');
    setUsernameError(null);

    const processedNewUsername = newUsername.trim();
    const cleanNewUsername = processedNewUsername.replace(/\s+/g, '').toLowerCase();

    try {
      // If user is trying to change their username
      if (processedNewUsername !== profile.username) {
        if (processedNewUsername.length < 3) {
          throw new Error('Username must be at least 3 characters long.');
        }
        if (!/^[a-zA-Z0-9_\-]+$/.test(cleanNewUsername)) {
          throw new Error('Username can only contain alphanumeric characters, underscores or hyphens.');
        }

        // Check if new lowercase username matches any existing claim
        const claimRef = doc(db, 'usernames', cleanNewUsername);
        const claimSnap = await getDoc(claimRef);
        if (claimSnap.exists() && claimSnap.data().uid !== user.uid) {
          throw new Error('This username is already claimed by someone else.');
        }

        // Release previous username claim if username concept is updating
        if (profile.username) {
          const oldCleanUsername = profile.username.toLowerCase();
          // We can't delete directly if rules don't permit correctly, but rules permit deleting claim matching uid!
          // allow delete: if isSignedIn() && existing().uid == request.auth.uid;
          await setDoc(doc(db, 'usernames', cleanNewUsername), { uid: user.uid, username: processedNewUsername });
          // If different, we can clean up old claim safely
          if (oldCleanUsername !== cleanNewUsername) {
            try {
              // Delete claim using write (rules allow since existing().uid == auth.uid)
              await setDoc(doc(db, 'usernames', oldCleanUsername), { uid: '' });
            } catch (err) {
              console.warn('Could not release old username claim:', err);
            }
          }
        } else {
          await setDoc(doc(db, 'usernames', cleanNewUsername), { uid: user.uid, username: processedNewUsername });
        }
      }

      // Update actual user document Profile
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        username: processedNewUsername,
        preferences: {
          notificationsEnabled: notifications,
          newsletterSubscribed: newsletter,
          preferredCategories: selectedCategories
        }
      });

      setSettingsStatus('success');
      setTimeout(() => setSettingsStatus('idle'), 3000);
    } catch (error: any) {
      console.error('Update profile error:', error);
      setUsernameError(error.message || 'Failed to update preferences.');
      setSettingsStatus('error');
    }
  };

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin"></div>
          <p className="text-stone-500 font-medium font-serif">Restoring security context...</p>
        </div>
      </div>
    );
  }

  // Guest view (Login & Signup)
  if (!user || !profile) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2rem] border border-stone-100 shadow-xl max-w-md w-full p-8 md:p-10 space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-serif font-bold text-stone-900 tracking-tight">
              {isSignUp ? 'Create your profile' : 'Welcome back'}
            </h2>
            <p className="text-stone-500 text-sm">
              {isSignUp ? 'Establish your private sanctuary account' : 'Access your notes, library, & history safely'}
            </p>
          </div>

          <div className="flex p-1 bg-stone-100 rounded-xl">
            <button 
              onClick={() => { setIsSignUp(false); setAuthError(null); }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${!isSignUp ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
            >
              Log In
            </button>
            <button 
              onClick={() => { setIsSignUp(true); setAuthError(null); }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${isSignUp ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
            >
              Sign Up
            </button>
          </div>

          {authError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-xs leading-relaxed"
            >
              {authError}
            </motion.div>
          )}

          {authSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-800 text-xs leading-relaxed"
            >
              {authSuccess}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Username</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                    <input 
                      type="text" 
                      required 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. mindfulness_path"
                      className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 focus:border-stone-900 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-stone-900 transition-colors"
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                    <input 
                      type="email" 
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="healing@embracingnoteasy.com"
                      className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 focus:border-stone-900 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-stone-900 transition-colors"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Email or Username</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                  <input 
                    type="text" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. your_username or email@address"
                    className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 focus:border-stone-900 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-stone-900 transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-stone-50 border border-stone-200 focus:border-stone-900 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-stone-900 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 rounded-md"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-3.5 bg-stone-900 text-white font-bold rounded-2xl hover:bg-stone-800 transition-colors shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>{isSignUp ? 'Create Secure Profile' : 'Authenticate & Sign In'}</span>
              )}
            </button>
          </form>

          <p className="text-stone-400 text-2xs block text-center mt-2 leading-relaxed">
            By authenticating, your journal, preferences and logs are encrypted under personal cloud rules securely.
          </p>
        </motion.div>
      </div>
    );
  }

  // Logged-in dashboard
  return (
    <div className="py-8 space-y-10">
      {/* Profile Header Block */}
      <header className="bg-white border border-stone-100 rounded-[2.5rem] p-6 md:p-10 shadow-sm flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-stone-100 flex items-center justify-center border-4 border-stone-50 shadow-inner text-stone-500">
            <User className="w-10 h-10 md:w-12 md:h-12 text-stone-400" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
              <h1 className="text-3xl font-serif font-bold text-stone-900">
                {profile?.username || 'Journey Guide'}
              </h1>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-stone-100 text-stone-700 rounded-full tracking-wider border border-stone-200">
                {profile?.role || 'Guest'}
              </span>
            </div>
            <p className="text-stone-500 text-sm flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-stone-400" /> {profile?.email}
            </p>
            {profile?.subscriptionEndDate && (
              <p className="text-xs text-amber-600 font-medium">
                Active Member until: {format(new Date(profile.subscriptionEndDate), 'MMMM dd, yyyy')}
              </p>
            )}
          </div>
        </div>

        <button 
          onClick={() => signOut(auth)}
          className="flex items-center gap-2 bg-stone-50 text-stone-600 hover:text-red-600 hover:bg-red-50 px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all border border-stone-100"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </header>

      {/* Main Grid: Navigation Tabs Side & Detailed Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-1 space-y-2">
          {[
            { id: 'preferences', label: 'Preferences', icon: Settings, desc: 'Settings & Categories' },
            { id: 'journal', label: 'Private Journal', icon: BookOpen, desc: 'My inner reflections', badge: journalEntries.length },
            { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark, desc: 'Saved articles & logs', badge: bookmarkedPosts.length },
            { id: 'purchases', label: 'Purchased Content', icon: ShoppingBag, desc: 'Digital content bought', badge: purchasedProducts.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                activeTab === tab.id 
                  ? 'bg-stone-900 border-stone-900 text-white shadow-md' 
                  : 'bg-white hover:bg-stone-55 border-stone-100/80 text-stone-600 hover:text-stone-900 hover:border-stone-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-stone-400 group-hover:text-stone-900 transition-colors'}`} />
                <div>
                  <div className="text-xs font-bold tracking-tight">{tab.label}</div>
                  <div className={`text-[10px] sm:inline-block ${activeTab === tab.id ? 'text-stone-300' : 'text-stone-400'}`}>{tab.desc}</div>
                </div>
              </div>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </aside>

        {/* Content Panel */}
        <main className="lg:col-span-3 bg-white border border-stone-100 rounded-[2.5rem] p-6 md:p-10 shadow-sm min-h-[50vh]">
          <AnimatePresence mode="wait">
            {/* Tab: Preferences */}
            {activeTab === 'preferences' && (
              <motion.div
                key="preferences"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-2xl font-serif font-bold text-stone-900">Personal Preferences</h2>
                  <p className="text-stone-500 text-sm mt-1">Configure your wellness notifications and favorite content parameters.</p>
                </div>

                <form onSubmit={handleUpdatePreferences} className="space-y-6">
                  {/* Notifications Checkbox */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Communication Settings</h3>
                    
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative mt-0.5">
                        <input 
                          type="checkbox" 
                          checked={notifications} 
                          onChange={(e) => setNotifications(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded border transition-colors flex items-center justify-center ${notifications ? 'bg-stone-950 border-stone-950' : 'bg-stone-50 border-stone-200 group-hover:border-stone-400'}`}>
                          {notifications && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-stone-950 block">In-Platform Notification Alerts</span>
                        <span className="text-xs text-stone-500 block">Receive dynamic session alerts, feedback updates, and comments.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative mt-0.5">
                        <input 
                          type="checkbox" 
                          checked={newsletter} 
                          onChange={(e) => setNewsletter(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded border transition-colors flex items-center justify-center ${newsletter ? 'bg-stone-950 border-stone-950' : 'bg-stone-50 border-stone-200 group-hover:border-stone-400'}`}>
                          {newsletter && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-stone-950 block">Email Newsletter Subscription</span>
                        <span className="text-xs text-stone-500 block">Stay up to date with Dr. Julianne Reed’s weekly insights and podcast notifications.</span>
                      </div>
                    </label>
                  </div>

                  {/* Preferred Categories */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Core Categories of Interest</h3>
                    <p className="text-stone-400 text-2xs leading-relaxed">
                      Select multiple tags below to help customize recommend content sliders throughout your home feed.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {categories.map(cat => {
                        const isSelected = selectedCategories.includes(cat);
                        return (
                          <button
                            type="button"
                            key={cat}
                            onClick={() => toggleCategory(cat)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                              isSelected 
                                ? 'bg-stone-900 text-white' 
                                : 'bg-stone-50 border border-stone-150 text-stone-600 hover:bg-stone-100'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Username editing */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Modify Username</label>
                    <input 
                      type="text" 
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Enter new username"
                      className="max-w-md w-full px-4 py-2.5 bg-stone-50 border border-stone-200 focus:border-stone-900 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-stone-900 transition-colors"
                    />
                    {usernameError && (
                      <p className="text-xs text-red-600 font-medium">{usernameError}</p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-stone-100 flex items-center gap-4">
                    <button
                      type="submit"
                      disabled={settingsStatus === 'saving'}
                      className="px-6 py-3 bg-stone-900 text-white font-bold rounded-2xl text-xs uppercase tracking-widest hover:bg-stone-800 transition-all flex items-center gap-2"
                    >
                      {settingsStatus === 'saving' ? 'Saving...' : 'Save Settings'}
                    </button>

                    {settingsStatus === 'success' && (
                      <span className="text-emerald-600 text-xs font-bold flex items-center gap-1 leading-none">
                        <Check className="w-4 h-4" /> Preferences updated successfully!
                      </span>
                    )}
                  </div>
                </form>
              </motion.div>
            )}

            {/* Tab: Private Journal History */}
            {activeTab === 'journal' && (
              <motion.div
                key="journal"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-serif font-bold text-stone-900 mb-1">My Personal Journals</h2>
                  <p className="text-stone-500 text-sm">Review your historically typed journal recordings and inner self exploration.</p>
                </div>

                {journalEntries.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-stone-200 rounded-[2rem] p-8">
                    <BookOpen className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                    <h3 className="text-stone-700 font-bold font-serif text-lg">Your Journal is Empty</h3>
                    <p className="text-stone-500 text-xs mt-1">Begin writing in your private space to record growth over time.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {journalEntries.map(entry => (
                      <div key={entry.id} className="bg-stone-50/50 hover:bg-stone-50 rounded-2xl p-5 border border-stone-100 transition-all space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-stone-400 flex items-center gap-1 uppercase tracking-wider">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            {entry.date?.seconds 
                              ? format(new Date(entry.date.seconds * 1000), 'EEEE, MMM dd, yyyy h:mm a') 
                              : entry.date?.toDate 
                                ? format(entry.date.toDate(), 'EEEE, MMM dd, yyyy h:mm a') 
                                : 'Draft Timestamp'}
                          </span>
                        </div>
                        <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line">{entry.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Tab: Bookmark Saves */}
            {activeTab === 'bookmarks' && (
              <motion.div
                key="bookmarks"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-serif font-bold text-stone-900 mb-1">Bookmarked Articles</h2>
                  <p className="text-stone-500 text-sm">Essential readings, mindfulness posts, and guides you saved for later reference.</p>
                </div>

                {postsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
                  </div>
                ) : bookmarkedPosts.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-stone-200 rounded-[2rem] p-8">
                    <Bookmark className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                    <h3 className="text-stone-700 font-bold font-serif text-lg">No Saves Yet</h3>
                    <p className="text-stone-500 text-xs mt-1">Bookmark reading elements across the Learning platform to display them here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {bookmarkedPosts.map(post => (
                      <div key={post.id} className="bg-stone-50/40 rounded-2xl border border-stone-100 p-5 space-y-3 flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider bg-amber-50 px-2 py-0.5 rounded">
                              {post.category || 'Mindset'}
                            </span>
                          </div>
                          <h3 className="text-base font-serif font-bold text-stone-900 mt-2 line-clamp-1">{post.title}</h3>
                          <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed mt-1">
                            {post.content ? post.content.replace(/[#*`_-]/g, '') : ''}
                          </p>
                        </div>
                        <a 
                          href="/blog" 
                          className="flex items-center gap-1.5 text-stone-900 hover:text-stone-700 font-bold text-xs mt-2 self-start"
                        >
                          Read full article <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Tab: Purchased Content */}
            {activeTab === 'purchases' && (
              <motion.div
                key="purchases"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-serif font-bold text-stone-900 mb-1">Purchased Products & Media</h2>
                  <p className="text-stone-500 text-sm">Unlockable media components, guides or products purchased on the ENE store.</p>
                </div>

                {postsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
                  </div>
                ) : purchasedProducts.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-stone-200 rounded-[2rem] p-8">
                    <ShoppingBag className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                    <h3 className="text-stone-700 font-bold font-serif text-lg">No Purchased Media</h3>
                    <p className="text-stone-500 text-xs mt-1">Explore the holistic shop and secure professional guides/audios to unlock content.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {purchasedProducts.map(prod => (
                      <div key={prod.id} className="bg-stone-50/40 rounded-2xl border border-stone-100 p-5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                              Verified Purchase
                            </span>
                          </div>
                          <h3 className="text-lg font-serif font-bold text-stone-900 mt-2">{prod.name}</h3>
                          <p className="text-xs text-stone-500 mt-1 line-clamp-2">{prod.description}</p>
                        </div>
                        {prod.downloadUrl && (
                          <a 
                            href={prod.downloadUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full mt-4 py-2 text-center bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-850 transition-colors block"
                          >
                            Download/Access Digital Content
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
