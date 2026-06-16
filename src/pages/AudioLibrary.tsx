import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Play, Lock, Music, Clock, Tag, ChevronRight, X, Video, Check, CreditCard, Folder } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import EditableText from '../components/EditableText';

// @ts-ignore
import img0 from '../assets/images/regenerated_image_1781623272022.png';
// @ts-ignore
import img1 from '../assets/images/regenerated_image_1781623274029.png';
// @ts-ignore
import img2 from '../assets/images/regenerated_image_1781623275952.png';
// @ts-ignore
import img3 from '../assets/images/regenerated_image_1781623277496.png';
// @ts-ignore
import img4 from '../assets/images/regenerated_image_1781623279334.png';

const libraryImageOverride = [img0, img1, img2, img3, img4];

interface Recording {
  id: string;
  title: string;
  description: string;
  audioUrl?: string;
  videoUrl?: string;
  mediaType?: 'audio' | 'video';
  imageUrl: string;
  category: string;
  filters?: string[];
  duration: number;
  isFree: boolean;
  price: number;
  order?: number;
  folderId?: string;
}

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

export default function AudioLibrary() {
  const { user, profile, isMember } = useAuth();
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('All');
  const [activeRecording, setActiveRecording] = useState<Recording | null>(null);
  const [purchasingRecording, setPurchasingRecording] = useState<Recording | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handlePurchaseUnlock = async () => {
    if (!user || !profile || !purchasingRecording) return;
    setIsUnlocking(true);
    try {
      const currentPurchased = profile.purchasedItems || [];
      const updatedPurchased = [...currentPurchased, purchasingRecording.id];
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { purchasedItems: updatedPurchased });
      setPurchasingRecording(null);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setIsUnlocking(false);
    }
  };

  // Extract all unique filters and categories from recordings to build the dynamic pills
  const allRecordingFilters = Array.from(
    new Set(
      recordings.flatMap(r => {
        const itemFilters = r.filters || [];
        const itemCat = r.category ? [r.category] : [];
        return [...itemFilters, ...itemCat];
      })
    )
  ).filter(f => f && typeof f === 'string');

  const defaultCategories = ['Sleep', 'Anxiety', 'Confidence', 'Focus', 'Spirituality', 'Mindfulness', 'Breathwork'];
  
  // Combine default categories and any other distinct filters from active recordings, omitting Meditation
  const categories = ['All', ...defaultCategories].filter(cat => cat.toLowerCase() !== 'meditation');
  allRecordingFilters.forEach(f => {
    if (f.toLowerCase() === 'meditation') return;
    const exists = categories.some(item => item.toLowerCase() === f.toLowerCase());
    if (!exists) {
      categories.push(f);
    }
  });

  useEffect(() => {
    const unsubRecs = onSnapshot(collection(db, 'recordings'), (snapshot) => {
      const docs: Recording[] = [];
      snapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as Recording);
      });
      setRecordings(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'recordings');
    });

    const unsubFolders = onSnapshot(collection(db, 'folders'), (snapshot) => {
      const dirs: any[] = [];
      snapshot.forEach((doc) => {
        dirs.push({ id: doc.id, ...doc.data() });
      });
      setFolders(dirs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'folders');
    });

    return () => {
      unsubRecs();
      unsubFolders();
    };
  }, []);

  const sortedRecordings = [...recordings]
    .sort((a, b) => {
      const oA = a.order !== undefined ? a.order : 99999;
      const oB = b.order !== undefined ? b.order : 99999;
      if (oA !== oB) return oA - oB;
      return (a.title || '').localeCompare(b.title || '');
    })
    .map((rec, index) => {
      if (index < libraryImageOverride.length) {
        return { ...rec, imageUrl: libraryImageOverride[index] };
      }
      return rec;
    });

  const folderFiltered = selectedFolderId
    ? sortedRecordings.filter(r => r.folderId === selectedFolderId)
    : sortedRecordings;

  const filteredRecordings = category === 'All' 
    ? folderFiltered 
    : folderFiltered.filter(r => {
        const matchesCategory = r.category?.toLowerCase() === category.toLowerCase();
        const matchesFilters = r.filters?.some(f => f.toLowerCase() === category.toLowerCase());
        return matchesCategory || matchesFilters;
      });

  const canAccess = (recording: Recording) => {
    if (recording.isFree) return true;
    if (isMember) return true;
    if (profile?.purchasedItems?.includes(recording.id)) return true;
    return false;
  };

  return (
    <div className="space-y-12 py-8">
      <header className="space-y-4">
        <EditableText 
          id="audiolibrary-title" 
          defaultValue="Guided Imagery & Video Library" 
          className="text-4xl font-serif font-bold text-stone-900 block" 
          tag="h1" 
        />
        <EditableText 
          id="audiolibrary-subtitle" 
          defaultValue="Immerse yourself in transformative audio and video experiences designed to rewire your subconscious for peace and power." 
          className="text-stone-600 max-w-2xl text-lg block" 
          tag="p" 
          multiline={true}
        />
      </header>


      {/* Category Pills */}
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              category === cat 
                ? 'bg-stone-900 text-white shadow-lg' 
                : 'bg-white text-stone-600 border border-stone-100 hover:bg-stone-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Recording Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredRecordings.length === 0 ? (
            <div className="col-span-full py-16 text-center space-y-3 bg-stone-50/50 border border-dashed border-stone-200 rounded-3xl animate-fade-in">
              <Folder className="w-10 h-10 text-stone-300 mx-auto" />
              <div className="space-y-1">
                <p className="font-serif text-lg font-medium text-stone-800">No sessions match current filters.</p>
                <p className="text-stone-400 text-xs max-w-sm mx-auto">There are currently no hypnosis or imagery files assigned under this category or folder selection.</p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                {category !== 'All' && (
                  <button 
                    onClick={() => setCategory('All')}
                    className="text-xs bg-white text-stone-800 px-3 py-1.5 border border-stone-200 rounded-xl font-bold hover:bg-stone-50 transition-all cursor-pointer shadow-sm"
                  >
                    Clear Categories
                  </button>
                )}
                {selectedFolderId && (
                  <button 
                    onClick={() => setSelectedFolderId(null)}
                    className="text-xs bg-stone-900 text-white px-3 py-1.5 rounded-xl font-bold hover:bg-stone-850 transition-all cursor-pointer shadow-sm"
                  >
                    Clear Folder
                  </button>
                )}
              </div>
            </div>
          ) : filteredRecordings.map((recording) => {
            const accessible = canAccess(recording);
            const isVideo = recording.mediaType === 'video';
            return (
              <motion.div
                layout
                key={recording.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative bg-white rounded-3xl overflow-hidden border border-stone-100 shadow-sm hover:shadow-xl transition-all duration-500"
              >
                <div className="aspect-[4/3] relative overflow-hidden">
                  <img 
                    src={recording.imageUrl || 'https://images.unsplash.com/photo-1445019980597-93fa8acb246a?auto=format&fit=crop&q=80&w=800'} 
                    alt={recording.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                    {accessible ? (
                      <button 
                        onClick={() => setActiveRecording(recording)}
                        className="bg-white text-stone-900 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-500 hover:bg-stone-50"
                      >
                        <Play className="w-8 h-8 fill-current translate-x-0.5" />
                      </button>
                    ) : (
                      <div className="bg-stone-900/80 backdrop-blur-md text-white p-4 rounded-2xl flex flex-col items-center gap-2">
                        <Lock className="w-6 h-6" />
                        <span className="text-sm font-bold uppercase tracking-widest">Locked Content</span>
                      </div>
                    )}
                  </div>
                  {!accessible && (
                    <div className="absolute top-4 right-4 bg-stone-900/90 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md">
                      ${recording.price}
                    </div>
                  )}
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-widest text-stone-400">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.floor(recording.duration / 60)}:{(recording.duration % 60).toString().padStart(2, '0')}</span>
                    <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {recording.category}</span>
                    {isVideo ? (
                      <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-extrabold uppercase text-[9px] tracking-wider"><Video className="w-3 h-3" /> Video</span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-extrabold uppercase text-[9px] tracking-wider"><Music className="w-3 h-3" /> Audio</span>
                    )}
                  </div>
                  <h3 className="text-xl font-serif font-bold text-stone-900 leading-tight group-hover:text-stone-700 transition-colors">
                    {recording.title}
                  </h3>
                  <p className="text-stone-500 text-sm line-clamp-2">
                    {recording.description}
                  </p>
                  
                  {recording.filters && recording.filters.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {recording.filters.map(filter => (
                        <span key={filter} className="text-[9px] font-bold uppercase tracking-wider bg-stone-50 text-stone-500 border border-stone-200/30 rounded px-2 py-0.5">
                          {filter}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {!accessible && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!user) {
                          alert('Please log in or register a profile first to unlock and save premium content!');
                          navigate('/profile');
                        } else {
                          setPurchasingRecording(recording);
                        }
                      }}
                      className="w-full py-3 bg-stone-100 text-stone-900 rounded-xl text-sm font-bold hover:bg-stone-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Purchase Access <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Immersive Video Player Lightbox */}
      <AnimatePresence>
        {activeRecording && activeRecording.mediaType === 'video' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-stone-900 border border-white/10 w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl relative"
            >
              {/* Close Button */}
              <button 
                onClick={() => setActiveRecording(null)}
                className="absolute top-4 right-4 z-10 bg-black/40 text-stone-400 hover:text-white p-2.5 rounded-full backdrop-blur-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Video Player */}
              <div className="aspect-video w-full bg-black relative">
                {activeRecording.videoUrl && (
                  activeRecording.videoUrl.toLowerCase().includes('youtube.com') || 
                  activeRecording.videoUrl.toLowerCase().includes('youtu.be') || 
                  activeRecording.videoUrl.toLowerCase().includes('youtube-nocookie.com') || 
                  activeRecording.videoUrl.toLowerCase().includes('embed')
                ) ? (
                  <iframe 
                    src={getEmbedUrl(activeRecording.videoUrl || "")}
                    title={activeRecording.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full"
                  />
                ) : (
                  <video 
                    src={activeRecording.videoUrl} 
                    controls 
                    autoPlay 
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Info panel */}
              <div className="p-6 md:p-8 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">{activeRecording.category}</span>
                  <span className="text-stone-600">•</span>
                  <span className="text-[10px] bg-white/10 text-stone-300 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">Video Guide</span>
                </div>
                <h3 className="text-2xl font-serif font-bold text-white leading-tight">
                  {activeRecording.title}
                </h3>
                <p className="text-stone-400 text-sm max-w-2xl">
                  {activeRecording.description}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Audio Player */}
      <AnimatePresence>
        {activeRecording && activeRecording.mediaType !== 'video' && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-4 left-4 right-4 md:left-8 md:right-8 z-50 pointer-events-none"
          >
            <div className="max-w-4xl mx-auto bg-stone-900 text-white p-4 md:p-6 rounded-[2rem] shadow-2xl flex flex-col md:flex-row items-center gap-4 md:gap-8 pointer-events-auto border border-white/10 backdrop-blur-xl">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <img src={activeRecording.imageUrl} className="w-16 h-16 rounded-xl object-cover ring-1 ring-white/20" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold truncate">{activeRecording.title}</h4>
                  <p className="text-xs text-stone-400 truncate tracking-wide uppercase">{activeRecording.category}</p>
                </div>
              </div>
              
              <div className="flex-1 w-full flex items-center gap-4">
                <audio 
                  controls 
                  src={activeRecording.audioUrl} 
                  className="w-full h-8 brightness-90 contrast-125"
                  autoPlay
                />
              </div>

              <button 
                onClick={() => setActiveRecording(null)}
                className="absolute top-2 right-2 md:relative md:top-0 md:right-0 p-2 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {purchasingRecording && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 pointer-events-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white border border-stone-100 max-w-md w-full rounded-[2.5rem] p-8 shadow-2xl space-y-6 text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-serif font-bold text-stone-900">Unlock Premium Content</h3>
                <p className="text-stone-500 text-xs">Unlock lifetime profile-saved cloud access to this guide instantly.</p>
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl flex items-center gap-4 text-left border border-stone-100">
                <img src={purchasingRecording.imageUrl} className="w-14 h-14 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-stone-900 truncate leading-tight">{purchasingRecording.title}</h4>
                  <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider mt-0.5">{purchasingRecording.category}</p>
                  <p className="text-xs font-semibold text-emerald-600 mt-1">${purchasingRecording.price || '9.99'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handlePurchaseUnlock}
                  disabled={isUnlocking}
                  className="w-full py-3.5 bg-stone-900 text-white font-bold rounded-2xl text-xs uppercase tracking-widest hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isUnlocking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      <span>Verifying Card...</span>
                    </>
                  ) : (
                    <span>Confirm & Purchase</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setPurchasingRecording(null)}
                  className="w-full py-3 hover:bg-stone-50 text-stone-500 hover:text-stone-800 font-bold rounded-2xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
