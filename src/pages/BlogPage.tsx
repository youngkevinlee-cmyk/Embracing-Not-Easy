import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Play, Calendar, Tag, Bookmark, Heart, Video, ArrowRight, Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import EditableText from '../components/EditableText';

const getEmbedUrl = (url: string) => {
  if (!url) return "";
  const trimmed = url.trim();
  
  // 1. Regular expression to match various YouTube URLs (watch, embed, shorts, v/vi, youtu.be)
  const ytRegExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?vi?=|&vi?=))([^#\&\?]*).*/;
  const match = trimmed.match(ytRegExp);
  if (match && match[1] && match[1].length === 11) {
    return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
  }

  // 2. Fallback regex to capture any raw 11-char ID from standard paths
  const fallbackRegExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const fallbackMatch = trimmed.match(fallbackRegExp);
  if (fallbackMatch && fallbackMatch[1]) {
    return `https://www.youtube.com/embed/${fallbackMatch[1]}?autoplay=1`;
  }
  return trimmed;
};

export default function BlogPage() {
  const { user, profile, isAdmin } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [bookmarkSuccess, setBookmarkSuccess] = useState<string | null>(null);

  const toggleBookmark = async (postId: string) => {
    if (!user) {
      alert('You must be signed in with a user profile to bookmark articles!');
      return;
    }
    const currentSaves = profile?.bookmarks || [];
    const isBookmarked = currentSaves.includes(postId);
    const newSaves = isBookmarked 
      ? currentSaves.filter(id => id !== postId) 
      : [...currentSaves, postId];

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { bookmarks: newSaves });
      setBookmarkSuccess(isBookmarked ? 'Bookmark removed' : 'Saved to Bookmarks');
      setTimeout(() => setBookmarkSuccess(null), 2500);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  useEffect(() => {
    const path = 'posts';
    // If admin, show all. If guest, show only published.
    const q = isAdmin 
      ? query(collection(db, path), orderBy('createdAt', 'desc'))
      : query(collection(db, path), where('isPublished', '==', true), orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return unsub;
  }, [isAdmin]);

  const categories = ['All', 'Mindset', 'Research', 'Stories', 'Tutorials'];

  const filteredPosts = activeCategory === 'All' 
    ? posts 
    : posts.filter(p => p.category.toLowerCase() === activeCategory.toLowerCase());

  return (
    <div className="py-8 space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-stone-100 pb-12">
        <div className="space-y-4 max-w-2xl">
          <EditableText 
            id="blog-title" 
            defaultValue="Wisdom & Learning" 
            className="text-4xl font-serif font-bold text-stone-900 leading-tight block" 
            tag="h1" 
          />
          <EditableText 
            id="blog-subtitle" 
            defaultValue="Explore our collection of articles, research papers, and video tutorials on the science of relaxation and subconscious change." 
            className="text-stone-500 text-lg block" 
            tag="p" 
            multiline={true}
          />
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input 
            placeholder="Search posts..." 
            className="w-full pl-10 pr-4 py-3 bg-white border border-stone-100 rounded-full text-sm focus:ring-2 focus:ring-stone-200"
          />
        </div>
      </header>

      {/* Category Nav */}
      <div className="flex gap-8 overflow-x-auto no-scrollbar border-b border-stone-100">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`pb-4 px-2 text-xs font-bold tracking-widest uppercase transition-all relative ${
              activeCategory === cat ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            {cat}
            {activeCategory === cat && (
              <motion.div layoutId="activeBlogCat" className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900" />
            )}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* Main List */}
        <div className="lg:col-span-2 space-y-16">
          <AnimatePresence mode="popLayout">
            {filteredPosts.map((post) => (
              <motion.article 
                layout
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group flex flex-col md:flex-row gap-8 cursor-pointer"
                onClick={() => setSelectedPost(post)}
              >
                <div className="w-full md:w-64 aspect-[4/3] rounded-3xl overflow-hidden shrink-0">
                  <img 
                    src={post.imageUrl || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=600'} 
                    className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105"
                  />
                </div>
                <div className="space-y-4 py-2">
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {post.createdAt?.toDate ? format(post.createdAt.toDate(), 'MMM d, yyyy') : 'Recently'}</span>
                    <span className="flex items-center gap-1 border-stone-200 border-l pl-4"><Tag className="w-3 h-3" /> {post.category}</span>
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-stone-900 group-hover:text-stone-700 transition-colors leading-tight">
                    {post.title}
                  </h2>
                  <p className="text-stone-500 line-clamp-3 leading-relaxed text-sm">
                    {post.content.substring(0, 200)}...
                  </p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-stone-900 font-bold text-xs flex items-center gap-1 group/btn">
                      Read full story <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleBookmark(post.id); }}
                      className="p-2 hover:bg-stone-50 rounded-full transition-colors relative"
                      title={profile?.bookmarks?.includes(post.id) ? "Remove Bookmark" : "Save Bookmark"}
                    >
                      <Bookmark className={`w-4 h-4 transition-colors ${profile?.bookmarks?.includes(post.id) ? 'fill-amber-500 text-amber-500' : 'text-stone-300 hover:text-stone-900'}`} />
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <aside className="space-y-12">
          <section className="bg-stone-900 text-white p-8 rounded-[2.5rem] space-y-6">
            <Video className="w-10 h-10 text-stone-400" />
            <h3 className="text-xl font-serif font-bold">Video Tutorials</h3>
            <p className="text-stone-400 text-sm leading-relaxed">Watch our step-by-step guides on how to implement self-hypnosis techniques at home.</p>
            <button className="w-full py-4 bg-white text-stone-900 rounded-2xl font-bold hover:bg-stone-100 transition-colors">
              Explore Tutorials
            </button>
          </section>

          <section className="space-y-6">
             <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">Trending Topics</h4>
             <div className="flex flex-wrap gap-2">
               {['Neuroscience', 'Habits', 'Sleep', 'Trauma', 'Confidence', 'Peace'].map(tag => (
                 <span key={tag} className="px-4 py-2 bg-white border border-stone-100 rounded-xl text-xs font-medium text-stone-600 hover:border-stone-200 cursor-pointer transition-all">
                  #{tag}
                 </span>
               ))}
             </div>
          </section>
        </aside>
      </div>

      {/* Post Modal */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          >
            <div 
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-md"
              onClick={() => setSelectedPost(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-full bg-white rounded-[2rem] overflow-hidden shadow-2xl flex flex-col"
            >
              <button 
                onClick={() => setSelectedPost(null)}
                className="absolute top-6 right-6 z-10 p-2 bg-white/80 backdrop-blur-md rounded-full shadow-lg hover:bg-white"
              >
                 <X className="w-6 h-6 text-stone-900" />
              </button>
              
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="h-80 w-full relative">
                  <img src={selectedPost.imageUrl} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-8 left-8 right-8 text-white space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{selectedPost.category}</span>
                    <h2 className="text-4xl font-serif font-bold">{selectedPost.title}</h2>
                  </div>
                </div>

                <div className="p-8 md:p-12 space-y-8">
                  {selectedPost.videoUrl && (
                    <div className="aspect-video bg-stone-100 rounded-3xl overflow-hidden border border-stone-100">
                       <iframe 
                        className="w-full h-full"
                        src={getEmbedUrl(selectedPost.videoUrl)} 
                        title="Embedded video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                       />
                    </div>
                  )}
                  
                  <div className="prose prose-stone max-w-none prose-headings:font-serif prose-p:text-stone-600 prose-p:leading-relaxed text-lg">
                    <ReactMarkdown>{selectedPost.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bookmarkSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 55, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-white/10"
          >
            <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
            <span>{bookmarkSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function X(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
