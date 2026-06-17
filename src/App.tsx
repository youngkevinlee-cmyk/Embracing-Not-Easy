import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
// @ts-expect-error - image asset import
import brandLogo from './assets/images/logo_image_1781635557478.jpg';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { PageLockProvider, usePageLocks } from './lib/PageLockContext';
import { SiteContentProvider } from './lib/SiteContentContext';
import EditableControls from './components/EditableControls';
import Chatbot from './components/Chatbot';
import { 
  Home, 
  Music, 
  Calendar, 
  BookOpen, 
  Mic2, 
  PenLine, 
  ShoppingBag, 
  Users, 
  Lock, 
  LogOut, 
  Menu, 
  X,
  ShieldCheck,
  User,
  Mail
} from 'lucide-react';
import { useState } from 'react';

// Lazy load actual page components (or just create them in a separate file for now)
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import AudioLibrary from './pages/AudioLibrary';
import BookingPage from './pages/BookingPage';
import BlogPage from './pages/BlogPage';
import PodcastPage from './pages/PodcastPage';
import JournalPage from './pages/JournalPage';
import ShopPage from './pages/ShopPage';
import CommunityPage from './pages/CommunityPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import ProfilePage from './pages/ProfilePage';
import ContactPage from './pages/ContactPage';
import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { CartProvider } from './lib/CartContext';

function ProtectedRoute({ children, roleRequired }: { children: React.ReactNode, roleRequired?: 'member' | 'admin' }) {
  const { profile, loading, isAdmin, isMember } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!profile) return <Navigate to="/" state={{ from: location }} replace />;

  if (roleRequired === 'admin' && !isAdmin) return <Navigate to="/" replace />;
  if (roleRequired === 'member' && !isMember) return <Navigate to="/shop" replace />;

  return <>{children}</>;
}

function PageGuard({ children, pageId }: { children: React.ReactNode, pageId: string }) {
  const locks = usePageLocks();
  const { isAdmin } = useAuth();

  if (locks[pageId] && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-stone-50/55 rounded-[2.5rem] border border-stone-100 max-w-lg mx-auto my-12 shadow-sm">
        <Lock className="w-12 h-12 text-stone-400 mb-4 animate-pulse" />
        <h2 className="text-2xl font-serif font-bold text-stone-800 mb-2">Section Guarded</h2>
        <p className="text-stone-600 max-w-md font-medium">Come back soon for new services.</p>
        <Link to="/" className="mt-6 text-stone-500 hover:text-stone-900 underline font-bold text-sm">Return Home</Link>
      </div>
    );
  }

  return <>{children}</>;
}

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { profile, isAdmin } = useAuth();

  const navItems = [
    { name: 'About Me', path: '/about', icon: User },
    { name: 'Library', path: '/library', icon: Music },
    { name: 'Therapy', path: '/booking', icon: Calendar },
    { name: 'Learn', path: '/blog', icon: BookOpen },
    { name: 'Podcast', path: '/podcast', icon: Mic2 },
    { name: 'Journal', path: '/journal', icon: PenLine },
    { name: 'Shop', path: '/shop', icon: ShoppingBag },
    { name: 'Community', path: '/community', icon: Users },
    { name: 'Contact', path: '/contact', icon: Mail },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full overflow-hidden border border-stone-200 flex items-center justify-center">
              <img 
                src={brandLogo} 
                alt="Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-xl font-serif font-bold tracking-tight text-stone-900">Embracing Not Easy</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="text-stone-600 hover:text-stone-900 transition-colors text-sm font-medium"
              >
                {item.name}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" className="text-amber-600 hover:text-amber-700 flex items-center gap-1 font-bold">
                <ShieldCheck className="w-4 h-4" /> Admin
              </Link>
            )}
            {profile ? (
              <div className="flex items-center gap-4">
                <Link 
                  to="/profile" 
                  className="flex items-center gap-1.5 text-stone-700 hover:text-stone-900 font-semibold text-sm bg-stone-50 hover:bg-stone-100 px-3.5 py-1.5 rounded-full transition-colors"
                >
                  <User className="w-4 h-4 text-stone-500" />
                  <span>{profile.username || 'My Profile'}</span>
                </Link>
                <button 
                  onClick={() => signOut(auth)}
                  className="text-stone-400 hover:text-stone-700 p-1.5 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link 
                to="/profile" 
                className="bg-stone-900 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-stone-800 transition-colors"
              >
                Get Started
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-4">
             {isAdmin && (
              <Link to="/admin" className="text-amber-600">
                <ShieldCheck className="w-5 h-5" />
              </Link>
            )}
            <button onClick={() => setIsOpen(!isOpen)} className="text-stone-600">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-white border-b border-stone-100"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-3 px-3 py-3 text-stone-600 hover:bg-stone-50 rounded-lg"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
              {profile ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-3 px-3 py-3 text-stone-700 hover:bg-stone-50 rounded-lg font-bold"
                  >
                    <User className="w-5 h-5 text-stone-500" />
                    <span>My Profile ({profile.username || 'Self'})</span>
                  </Link>
                  <button 
                    onClick={() => { signOut(auth); setIsOpen(false); }}
                    className="w-full flex items-center space-x-3 px-3 py-3 text-red-600 hover:bg-red-50 rounded-lg text-left font-medium"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-3 px-3 py-3 text-stone-800 bg-stone-100 hover:bg-stone-250 rounded-lg font-bold"
                >
                  <User className="w-5 h-5 text-stone-600" />
                  <span>Get Started / Login</span>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SiteContentProvider>
        <PageLockProvider>
          <CartProvider>
            <Router>
              <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
                <Navbar />
                <main className="pt-16 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/library" element={<PageGuard pageId="library"><AudioLibrary /></PageGuard>} />
                    <Route path="/booking" element={<PageGuard pageId="booking"><BookingPage /></PageGuard>} />
                    <Route path="/blog" element={<PageGuard pageId="blog"><BlogPage /></PageGuard>} />
                    <Route path="/podcast" element={<PageGuard pageId="podcast"><PodcastPage /></PageGuard>} />
                    <Route path="/shop" element={<PageGuard pageId="shop"><ShopPage /></PageGuard>} />
                    <Route path="/journal" element={
                      <ProtectedRoute>
                        <PageGuard pageId="journal"><JournalPage /></PageGuard>
                      </ProtectedRoute>
                    } />
                    <Route path="/community" element={
                      <ProtectedRoute>
                        <PageGuard pageId="community"><CommunityPage /></PageGuard>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin/*" element={
                      <ProtectedRoute roleRequired="admin">
                        <AdminDashboard />
                      </ProtectedRoute>
                    } />
                  </Routes>
                </main>
                
                {/* Editable live site content controls for administrator */}
                <EditableControls />
                
                {/* Global AI Assistant chatbot */}
                <Chatbot />
              </div>
            </Router>
          </CartProvider>
        </PageLockProvider>
      </SiteContentProvider>
    </AuthProvider>
  );
}
