import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, setDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Mic2, 
  Calendar, 
  Share2, 
  Info, 
  X, 
  Rss, 
  Database, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2,
  Settings 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import EditableText from '../components/EditableText';
import EditableImage from '../components/EditableImage';
import { useSiteContent } from '../lib/SiteContentContext';
import { useAuth } from '../lib/AuthContext';
// @ts-ignore
import podcastCover from '../assets/images/podcast_cover_1781018183482.png';

// Helper functions for parsing XML namespaces securely across different browsers
const getElementText = (item: Element, tags: string[]): string => {
  for (const tag of tags) {
    try {
      const nodes = item.getElementsByTagName(tag);
      if (nodes && nodes.length > 0 && nodes[0].textContent) return nodes[0].textContent;
    } catch { /* ignore */ }
    
    const parts = tag.split(':');
    if (parts.length > 1) {
      try {
        const namespaceNodes = item.getElementsByTagName(parts[1]);
        if (namespaceNodes && namespaceNodes.length > 0 && namespaceNodes[0].textContent) {
          return namespaceNodes[0].textContent;
        }
      } catch { /* ignore */ }
    }
  }
  for (const tag of tags) {
    try {
      const safeSelector = tag.replace(/:/g, '\\:');
      const el = item.querySelector(safeSelector);
      if (el && el.textContent) return el.textContent;
    } catch { /* ignore */ }
  }
  return "";
};

const getElementAttribute = (item: Element, tags: string[], attribute: string): string => {
  for (const tag of tags) {
    try {
      const nodes = item.getElementsByTagName(tag);
      if (nodes && nodes.length > 0 && nodes[0].getAttribute(attribute)) {
        return nodes[0].getAttribute(attribute) || "";
      }
    } catch { /* ignore */ }

    const parts = tag.split(':');
    if (parts.length > 1) {
      try {
        const namespaceNodes = item.getElementsByTagName(parts[1]);
        if (namespaceNodes && namespaceNodes.length > 0 && namespaceNodes[0].getAttribute(attribute)) {
          return namespaceNodes[0].getAttribute(attribute) || "";
        }
      } catch { /* ignore */ }
    }
  }
  for (const tag of tags) {
    try {
      const safeSelector = tag.replace(/:/g, '\\:');
      const el = item.querySelector(safeSelector);
      if (el && el.getAttribute(attribute)) return el.getAttribute(attribute) || "";
    } catch { /* ignore */ }
  }
  return "";
};

export default function PodcastPage() {
  const { content, isEditingMode, updateText } = useSiteContent();
  const { isAdmin } = useAuth();
  const rssUrl = content['podcast-rss-feed-url'] || '';
  const useLiveRss = content['podcast-use-live-rss'] === 'true';

  const [dbEpisodes, setDbEpisodes] = useState<any[]>([]);
  const [rssEpisodes, setRssEpisodes] = useState<any[]>([]);
  const [activeEpisode, setActiveEpisode] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [isLoadingRss, setIsLoadingRss] = useState(false);
  const [rssError, setRssError] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [rssInput, setRssInput] = useState(rssUrl);

  // Sync user input with DB when saved value changes
  useEffect(() => {
    setRssInput(rssUrl);
    if (!rssUrl && (isEditingMode || isAdmin)) {
      // Intentionally pre-fill a high-quality default if the user hasn't set one yet
      setRssInput('https://feeds.simplecast.com/54nAG9dB');
    }
  }, [rssUrl, isEditingMode, isAdmin]);

  // Clean title to produce valid safe identifiers
  const cleanIdString = (str: string) => {
    return str.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
  };

  // 1. Subscribe to local Firestore episodes collection
  useEffect(() => {
    const path = 'episodes';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setDbEpisodes(snap.docs.map(d => {
        const data = d.data();
        let dateObj: any = null;
        if (data.createdAt) {
          if (data.createdAt.toDate) {
            dateObj = data.createdAt.toDate();
          } else {
            dateObj = new Date(data.createdAt);
          }
        }
        return { 
          id: d.id, 
          ...data,
          createdAt: dateObj
        };
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return unsub;
  }, []);

  // 2. Fetch & parse RSS Feed XML reactively
  useEffect(() => {
    if (!rssUrl.trim()) {
      setRssEpisodes([]);
      setRssError(null);
      return;
    }

    const fetchRss = async () => {
      setIsLoadingRss(true);
      setRssError(null);
      try {
        let response;
        try {
          response = await fetch(`/api/proxy-rss?url=${encodeURIComponent(rssUrl.trim())}`);
          if (!response.ok) {
            throw new Error(`Server proxy returned ${response.status}: ${response.statusText}`);
          }
        } catch (proxyErr) {
          console.warn("Server proxy check failed, attempting direct fetch fallback...", proxyErr);
          response = await fetch(rssUrl.trim());
          if (!response.ok) {
            throw new Error(`Direct fetch fallback failed with ${response.status}`);
          }
        }

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        const parserError = xmlDoc.querySelector("parsererror");
        if (parserError) throw new Error("Markup parsing error in RSS target XML");

        const channelImg = xmlDoc.querySelector("channel > image > url")?.textContent || 
                           xmlDoc.getElementsByTagName("itunes:image")[0]?.getAttribute("href") || 
                           xmlDoc.getElementsByTagName("image")[0]?.getAttribute("href") || "";

        const items = xmlDoc.querySelectorAll("item");
        const parsed = Array.from(items).map((item, idx) => {
          const title = getElementText(item, ["title"]) || `Episode ${items.length - idx}`;
          let showNotes = getElementText(item, ["description", "itunes:summary", "summary"]);
          showNotes = showNotes.replace(/<[^>]*>/g, '').trim(); // clean html tags

          const enclosure = item.querySelector("enclosure");
          const audioUrl = enclosure?.getAttribute("url") || "";

          const imageUrl = getElementAttribute(item, ["itunes:image"], "href") || 
                           getElementText(item, ["image"]) || 
                           channelImg || 
                           podcastCover;

          const duration = getElementText(item, ["itunes:duration", "duration"]) || "45:00";
          const seasonStr = getElementText(item, [ "itunes:season", "season" ]);
          const season = parseInt(seasonStr) || 1;

          const pubDateStr = getElementText(item, ["pubDate"]);
          let dateObj = new Date(pubDateStr);
          if (isNaN(dateObj.getTime())) {
            dateObj = new Date();
          }

          return {
            id: `rss-${idx}-${cleanIdString(title)}`,
            title,
            showNotes,
            audioUrl,
            imageUrl,
            duration,
            season,
            createdAt: dateObj,
            isRss: true
          };
        });

        setRssEpisodes(parsed);
      } catch (err: any) {
        console.error("RSS Extraction Failure:", err);
        setRssError(err.message || "Failed to successfully crawl/parse the RSS source");
      } finally {
        setIsLoadingRss(false);
      }
    };

    fetchRss();
  }, [rssUrl]);

  // Synchronize current RSS cache with persistent Firestore
  const handleSyncToFirestore = async () => {
    if (rssEpisodes.length === 0) {
      setSyncMessage("No RSS episodes are loaded or parsed to synchronize.");
      return;
    }
    setIsSyncing(true);
    setSyncMessage("Writing episodes to your Firestore database...");
    
    try {
      let importedCount = 0;
      for (const ep of rssEpisodes) {
        const guidId = ep.id;
        const docRef = doc(db, 'episodes', guidId);
        
        await setDoc(docRef, {
          title: ep.title,
          showNotes: ep.showNotes,
          audioUrl: ep.audioUrl,
          imageUrl: ep.imageUrl,
          duration: ep.duration,
          season: ep.season,
          createdAt: ep.createdAt,
          isSyncedFromRss: true
        }, { merge: true });
        importedCount++;
      }
      setSyncMessage(`Podcast synced! Successfully imported/updated ${importedCount} episodes inside Firestore!`);
      setTimeout(() => setSyncMessage(null), 6000);
    } catch (e: any) {
      console.error("Sync Firestore Error:", e);
      setSyncMessage(`Error syncing: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Switch dynamically to live RSS lists if appropriate
  const isUsingRss = rssUrl.trim() && useLiveRss && !rssError;
  const episodes = isUsingRss ? rssEpisodes : dbEpisodes;

  return (
    <div className="py-8 space-y-12">
      {/* RSS configuration panel for administrators */}
      {(isEditingMode || isAdmin) && (
        <div className="bg-stone-50 border border-stone-200/60 p-6 md:p-8 rounded-[2.5rem] space-y-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-stone-200 pb-4">
            <Settings className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-serif font-bold text-stone-900 text-lg">Podcast RSS Feed Config</h3>
              <p className="text-xs text-stone-500">Enable automated population of episodes directly from standard XML feed endpoints.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-widest mb-2">RSS Feed URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://feeds.simplecast.com/54nAG9dB"
                  value={rssInput}
                  onChange={(e) => setRssInput(e.target.value)}
                  className="flex-1 bg-white border border-stone-200 text-xs text-stone-850 px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
                <button
                  onClick={async () => {
                    await updateText('podcast-rss-feed-url', rssInput.trim());
                  }}
                  className="bg-stone-900 hover:bg-stone-850 text-white font-bold text-xs px-6 py-3 rounded-2xl transition-colors shrink-0"
                >
                  Save URL
                </button>
              </div>
            </div>

            {rssUrl && (
              <div className="grid md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">Default Content Engine</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateText('podcast-use-live-rss', 'true')}
                      className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl text-xs font-bold border transition-all ${
                        useLiveRss 
                          ? 'bg-amber-100/50 border-amber-300 text-amber-900 shadow-sm' 
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <Rss className="w-4 h-4 text-amber-500" /> Live Feed
                    </button>
                    <button
                      onClick={() => updateText('podcast-use-live-rss', 'false')}
                      className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl text-xs font-bold border transition-all ${
                        !useLiveRss 
                          ? 'bg-stone-900 border-stone-950 text-white shadow-sm' 
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <Database className="w-4 h-4 text-stone-400" /> Firestore DB
                    </button>
                  </div>
                </div>

                <div className="flex flex-col justify-end">
                  <button
                    onClick={handleSyncToFirestore}
                    disabled={isSyncing || rssEpisodes.length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-850 text-white font-semibold text-xs p-3.5 rounded-2xl transition-all shadow-sm active:translate-y-0.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> Sync Live XML to Firestore
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex flex-wrap items-center gap-3 p-4 bg-white border border-stone-200/50 rounded-2xl text-xs">
              <span className="font-bold text-stone-800">Connection Status:</span>
              {isLoadingRss ? (
                <span className="text-amber-600 font-medium flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Querying RSS XML endpoint...
                </span>
              ) : rssUrl.trim() === '' ? (
                <span className="text-stone-400 font-medium italic">Empty (No feed URL configured yet)</span>
              ) : rssError ? (
                <span className="text-red-605 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {rssError}. Using Firestore cached episodes.
                </span>
              ) : (
                <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Succesfully mapped {rssEpisodes.length} live episodes.
                </span>
              )}

              {syncMessage && (
                <div className="w-full mt-2 p-3 bg-stone-100 border border-stone-200/60 rounded-xl font-medium text-[11px] text-stone-700 animate-pulse">
                  {syncMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row items-center gap-12 bg-stone-100 p-8 md:p-12 rounded-[3rem]">
        <div className="w-64 h-64 shrink-0 rounded-3xl overflow-hidden shadow-2xl rotate-3 relative bg-stone-850">
          <EditableImage
            id="podcast-cover-main"
            defaultUrl={podcastCover}
            alt="Podcast Cover"
            className="w-full h-full object-cover"
            containerClassName="w-full h-full"
          />
        </div>
        <div className="space-y-6 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3 text-stone-400 font-bold uppercase tracking-[0.2em] text-xs">
            <Mic2 className="w-5 h-5" /> Official Podcast
          </div>
          <EditableText 
            id="podcast-title" 
            defaultValue="Embracing the Uncomfortable" 
            className="text-5xl font-serif font-bold text-stone-900 leading-tight block" 
            tag="h1" 
          />
          <EditableText 
            id="podcast-subtitle" 
            defaultValue="A weekly conversation exploring the intersection of neurobiology, subconscious psychology, and the raw human experience. Hosted by experts, for explorers." 
            className="text-stone-600 max-w-xl text-lg leading-relaxed block" 
            tag="p" 
            multiline={true}
          />
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
            <button className="bg-stone-900 text-white px-8 py-4 rounded-full font-bold flex items-center gap-2 hover:bg-stone-800 transition-colors shadow-lg shadow-stone-900/20">
              <Play className="w-5 h-5 fill-current" /> Latest Episode
            </button>
            <div className="flex gap-2">
              {['Apple', 'Spotify', 'RSS'].map(p => (
                 <button key={p} className="bg-white border border-stone-200 p-3 rounded-2xl hover:bg-stone-50 transition-colors text-xs font-bold">{p}</button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="space-y-8">
        <div className="flex justify-between items-end border-b border-stone-100 pb-4">
          <h2 className="text-2xl font-serif font-bold">Recent Episodes</h2>
          <span className="text-stone-400 text-sm font-medium">{episodes.length} Episodes</span>
        </div>

        <div className="space-y-4">
          {episodes.length === 0 ? (
            <div className="text-center py-16 bg-stone-55 border border-stone-200/50 rounded-[2.5rem] p-8 max-w-xl mx-auto space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-amber-100/50 text-amber-600 rounded-full flex items-center justify-center mx-auto text-xl">
                <Mic2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-stone-900 text-lg">No episodes loaded yet</h3>
              <p className="text-stone-500 text-sm leading-relaxed">
                Connect your show's RSS Feed to automatically stream and populate all episodes, or manage them directly inside your Admin Dashboard!
              </p>
              {!isAdmin && (
                <div className="pt-2">
                  <a 
                    href="/admin/login" 
                    className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-850 text-white font-bold text-xs px-6 py-3.5 rounded-2xl transition-all shadow-md active:translate-y-0.5"
                  >
                    Go to Admin Login
                  </a>
                </div>
              )}
            </div>
          ) : (
            episodes.map((ep, i) => (
              <motion.div 
                key={ep.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group flex flex-col md:flex-row items-center gap-6 p-6 rounded-3xl border border-stone-100 bg-white hover:bg-stone-50/50 hover:shadow-xl hover:shadow-stone-900/5 transition-all duration-500 cursor-pointer"
                onClick={() => setActiveEpisode(ep)}
              >
                <div className="w-20 h-20 shrink-0 relative rounded-2xl overflow-hidden shadow-sm">
                  <img 
                    src={ep.imageUrl || podcastCover} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = podcastCover;
                    }}
                  />
                  <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-current" />
                  </div>
                </div>
                
                <div className="flex-1 space-y-2 text-center md:text-left">
                  <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                    <span>Season {ep.season}</span>
                    <span className="w-1 h-1 rounded-full bg-stone-200" />
                    <span>Episode {episodes.length - i}</span>
                    <span className="w-1 h-1 rounded-full bg-stone-200" />
                    <span>
                      <Calendar className="w-3 h-3 inline mr-1" /> 
                      {(() => {
                        if (!ep.createdAt) return 'Recently';
                        const dateObj = ep.createdAt?.toDate ? ep.createdAt.toDate() : (ep.createdAt instanceof Date ? ep.createdAt : new Date(ep.createdAt));
                        try {
                          return format(dateObj, 'MMM d, yyyy');
                        } catch {
                          return 'Recently';
                        }
                      })()}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-stone-900 group-hover:text-stone-700 transition-colors">{ep.title}</h3>
                  <p className="text-stone-500 text-sm line-clamp-1">{ep.showNotes}</p>
                </div>

                <div className="flex items-center gap-2">
                   <button className="p-3 text-stone-300 hover:text-stone-900 transition-colors"><Info className="w-5 h-5" /></button>
                   <button className="p-3 text-stone-300 hover:text-stone-900 transition-colors"><Share2 className="w-5 h-5" /></button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Mini Audio Player */}
      <AnimatePresence>
        {activeEpisode && (
          <motion.div 
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            exit={{ y: 200 }}
            className="fixed bottom-6 left-4 right-4 md:left-8 md:right-8 z-[110]"
          >
            <div className="max-w-5xl mx-auto bg-stone-900 text-white p-6 rounded-[2.5rem] shadow-2xl border border-white/10 backdrop-blur-2xl">
              <div className="flex flex-col md:flex-row items-center gap-6">
                
                {/* Close Button */}
                <button 
                  onClick={() => setActiveEpisode(null)}
                  className="absolute top-4 right-4 text-stone-500 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="flex items-center gap-5 w-full md:w-auto overflow-hidden">
                  <img 
                    src={activeEpisode.imageUrl || podcastCover} 
                    className="w-20 h-20 rounded-2xl object-cover shadow-xl shrink-0" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = podcastCover;
                    }}
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold truncate text-lg">{activeEpisode.title}</h4>
                    <p className="text-xs text-stone-400 mt-1 uppercase tracking-widest font-bold">Season {activeEpisode.season}</p>
                  </div>
                </div>

                <div className="flex-1 w-full space-y-4">
                  <div className="flex items-center justify-center gap-8">
                     <button className="text-stone-500 hover:text-white transition-colors"><SkipBack className="w-6 h-6 fill-current" /></button>
                     <button 
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="bg-white text-stone-900 w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                     >
                        {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                     </button>
                     <button className="text-stone-500 hover:text-white transition-colors"><SkipForward className="w-6 h-6 fill-current" /></button>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: isPlaying ? '100%' : '30%' }}
                        transition={{ duration: 100, ease: 'linear' }}
                        className="h-full bg-amber-500" 
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-stone-500 tracking-widest">
                       <span>12:45</span>
                       <span>{activeEpisode.duration || '48:20'}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-4 border-l border-white/10 pl-8">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Playback</span>
                    <span className="font-bold text-lg">1.5x</span>
                  </div>
                </div>
                
                {/* Native audio element for real playback */}
                <audio 
                  src={activeEpisode.audioUrl} 
                  autoPlay={isPlaying}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
