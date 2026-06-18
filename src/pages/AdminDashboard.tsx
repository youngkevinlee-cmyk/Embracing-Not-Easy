import { useState, useEffect } from 'react';
import { collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { updatePassword } from 'firebase/auth';
import { 
  Settings, 
  Music, 
  Calendar, 
  BookOpen, 
  Mic2, 
  ShoppingBag, 
  Users, 
  User,
  Lock, 
  Unlock, 
  Plus, 
  Trash2, 
  Edit,
  Sparkles,
  Key,
  Hash,
  ShieldAlert,
  UserX,
  UserCheck,
  MessageSquare,
  Rss,
  Database,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Folder
} from 'lucide-react';
import { motion } from 'motion/react';
import { useSiteContent } from '../lib/SiteContentContext';
// @ts-ignore
import podcastCover from '../assets/images/podcast_cover_1781018183482.png';
// @ts-ignore
import therapistDefaultImage from '../assets/images/regenerated_image_1781297696165.png';
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
// @ts-ignore
import img5 from '../assets/images/regenerated_image_1781795554046.png';

const libraryImageOverride = [img0, img1, img2, img3, img4, img5];

export default function AdminDashboard() {
  const { content, updateText } = useSiteContent();
  const rssUrl = content['podcast-rss-feed-url'] || '';
  const useLiveRss = content['podcast-use-live-rss'] === 'true';

  const [rssInput, setRssInput] = useState(rssUrl);
  const [rssEpisodes, setRssEpisodes] = useState<any[]>([]);
  const [isLoadingRss, setIsLoadingRss] = useState(false);
  const [rssError, setRssError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Sync user input with DB when saved value changes
  useEffect(() => {
    setRssInput(rssUrl);
    if (!rssUrl) {
      setRssInput('https://feeds.simplecast.com/54nAG9dB');
    }
  }, [rssUrl]);

  // Helper for safe name cleanup
  const cleanIdString = (str: string) => {
    return str.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
  };

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

  // Fetch RSS XML
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
          console.warn("Server proxy check failed inside dashboard, attempting direct fetch fallback...", proxyErr);
          response = await fetch(rssUrl.trim());
          if (!response.ok) {
            throw new Error(`Direct fetch fallback failed with status ${response.status}`);
          }
        }

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        const parserError = xmlDoc.querySelector("parsererror");
        if (parserError) throw new Error("XML Markup syntax parsing error in RSS target");

        const channelImg = xmlDoc.querySelector("channel > image > url")?.textContent || 
                           xmlDoc.getElementsByTagName("itunes:image")[0]?.getAttribute("href") || 
                           xmlDoc.getElementsByTagName("image")[0]?.getAttribute("href") || "";

        const items = xmlDoc.querySelectorAll("item");
        const parsed = Array.from(items).map((item, idx) => {
          const title = getElementText(item, ["title"]) || `Episode ${items.length - idx}`;
          let showNotes = getElementText(item, ["description", "itunes:summary", "summary"]);
          showNotes = showNotes.replace(/<[^>]*>/g, '').trim();

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
          };
        });

        setRssEpisodes(parsed);
      } catch (err: any) {
        console.error("RSS Extract Error:", err);
        setRssError(err.message || "Failed to successfully crawl or parse the RSS source");
      } finally {
        setIsLoadingRss(false);
      }
    };

    fetchRss();
  }, [rssUrl]);

  // Sync to Firestore
  const handleSyncToFirestore = async () => {
    if (rssEpisodes.length === 0) {
      setSyncMessage("No RSS episodes loaded/parsed yet.");
      return;
    }
    setIsSyncing(true);
    setSyncMessage("Synchronizing episodes into Cloud Firestore...");
    try {
      let importedCount = 0;
      for (const ep of rssEpisodes) {
        const docRef = doc(db, 'episodes', ep.id);
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
      setSyncMessage(`Successfully synchronized and stored ${importedCount} episodes inside Firestore!`);
      setTimeout(() => setSyncMessage(null), 5000);
    } catch (e: any) {
      console.error("Firestore sync fail:", e);
      setSyncMessage(`Failed writing to database: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'locks' | 'recordings' | 'products' | 'sessions' | 'security' | 'community' | 'users' | 'podcasts'>('locks');
  const [locks, setLocks] = useState<any>({});
  const [recordings, setRecordings] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [therapistProfile, setTherapistProfile] = useState<any>({ name: '', bio: '', imageUrl: '' });
  const [profileMsg, setProfileMsg] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passMsg, setPassMsg] = useState('');

  // Forms
  const [newGroup, setNewGroup] = useState({ name: '', description: '', isSecure: false });
  const [newRec, setNewRec] = useState({ title: '', category: 'Mindfulness', isFree: true, description: '', imageUrl: '', audioUrl: '', videoUrl: '', mediaType: 'audio', folderId: '' });
  const [newRecFilters, setNewRecFilters] = useState<string[]>([]);
  const [newRecCustomFilters, setNewRecCustomFilters] = useState<string>('');
  
  const [editingRecId, setEditingRecId] = useState<string | null>(null);
  const [editRec, setEditRec] = useState<any>(null);
  const [editRecFilters, setEditRecFilters] = useState<string[]>([]);
  const [editRecCustomFilters, setEditRecCustomFilters] = useState<string>('');

  const [newFolder, setNewFolder] = useState({ name: '', description: '' });
  const [newProd, setNewProd] = useState({ name: '', price: 0, type: 'digital', description: '', imageUrl: '' });
  const [newEp, setNewEp] = useState({ title: '', category: 'Research', season: 1, showNotes: '', imageUrl: '', audioUrl: '' });
  const [newService, setNewService] = useState({ title: '', price: 0, duration: 60 });
  const [showForms, setShowForms] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Subscriptions for all collections
    const unsubLocks = onSnapshot(collection(db, 'pageLocks'), (snap) => {
      const l: any = {};
      snap.forEach(d => l[d.id] = d.data().isLocked);
      setLocks(l);
    });
    const unsubRecs = onSnapshot(collection(db, 'recordings'), (snap) => {
      setRecordings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubFolders = onSnapshot(collection(db, 'folders'), (snap) => {
      setFolders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubSessions = onSnapshot(collection(db, 'sessionTypes'), (snap) => {
      setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubGroups = onSnapshot(collection(db, 'groups'), (snap) => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubEps = onSnapshot(collection(db, 'episodes'), (snap) => {
      setEpisodes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubAvail = onSnapshot(collection(db, 'availability'), (snap) => {
      setAvailability(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubProfile = onSnapshot(doc(db, 'therapistProfile', 'profile'), (snap) => {
      if (snap.exists()) {
        setTherapistProfile(snap.data());
      }
    });

    return () => {
      unsubLocks(); unsubRecs(); unsubFolders(); unsubProducts(); unsubSessions(); unsubGroups(); unsubUsers(); unsubEps(); unsubAvail(); unsubProfile();
    };
  }, []);

  const toggleLock = async (pageId: string) => {
    await setDoc(doc(db, 'pageLocks', pageId), { isLocked: !locks[pageId] });
  };

  const handleMoveRecording = async (index: number, direction: 'up' | 'down') => {
    const sorted = [...recordings].sort((a, b) => {
      const oA = a.order !== undefined ? a.order : 99999;
      const oB = b.order !== undefined ? b.order : 99999;
      if (oA !== oB) return oA - oB;
      return (a.title || '').localeCompare(b.title || '');
    });

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    // Build the updated ordering for all elements in the sorted list
    try {
      const updated = [...sorted];
      // Swap elements
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;

      // Batch write the updated orders
      for (let i = 0; i < updated.length; i++) {
        const item = updated[i];
        const itemRef = doc(db, 'recordings', item.id);
        await updateDoc(itemRef, { order: i });
      }
    } catch (error) {
      console.error("Failed to reorder recordings:", error);
    }
  };

  const saveTherapistProfile = async () => {
    try {
      await setDoc(doc(db, 'therapistProfile', 'profile'), therapistProfile, { merge: true });
      setProfileMsg('Profile saved successfully!');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (e) {
      console.error(e);
      setProfileMsg('Error saving profile');
    }
  };

  const initSampleData = async () => {
    // Audio
    await addDoc(collection(db, 'recordings'), {
      title: 'Neural Pathway Reset',
      description: 'A advanced guided visualization for breaking old habits.',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      imageUrl: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246a?auto=format&fit=crop&q=80&w=800',
      category: 'Focus',
      duration: 1200,
      isFree: false,
      price: 19
    });

    // Products
    await addDoc(collection(db, 'products'), {
      name: 'Transformation Journal',
      description: 'Hand-bound linen journal for your path forward.',
      price: 45,
      type: 'physical',
      images: ['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600']
    });

    // Session Types
    await addDoc(collection(db, 'sessionTypes'), {
      title: 'Deep Roots Hypnotherapy',
      description: 'Initial breakthrough session exploring subconscious origins.',
      price: 150,
      duration: 75
    });

    // Groups
    await addDoc(collection(db, 'groups'), {
      name: 'General Support',
      description: 'Open discussion for all sanctuary members.',
      isSecure: false
    });

     // Episodes
     await addDoc(collection(db, 'episodes'), {
      title: 'Ep 1: The Biology of Belief',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=600',
      category: 'Research',
      season: 1,
      showNotes: 'Exploring how thought patterns affect cellular health.',
      createdAt: serverTimestamp()
    });

    // Posts
    await addDoc(collection(db, 'posts'), {
      title: 'The Science of Neuroplasticity',
      content: '# Neuroplasticity\n\nYour brain is more flexible than you think...',
      imageUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=600',
      category: 'Research',
      isPublished: true,
      createdAt: serverTimestamp()
    });
  };

  const handleUpdatePassword = async () => {
    if (!auth.currentUser || !newPassword) return;
    try {
      await updatePassword(auth.currentUser, newPassword);
      setPassMsg('Password updated successfully!');
      setNewPassword('');
    } catch (e: any) {
      setPassMsg(e.message);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.name) return;
    await addDoc(collection(db, 'groups'), {
      ...newGroup,
      createdAt: serverTimestamp()
    });
    setNewGroup({ name: '', description: '', isSecure: false });
  };

  const toggleUserBan = async (userId: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'users', userId), {
      isBanned: !currentStatus
    });
  };

  const toggleUserGroupBan = async (userId: string, groupId: string, isCurrentlyBanned: boolean) => {
    const user = allUsers.find(u => u.id === userId);
    const bannedFromGroups = user?.bannedFromGroups || [];
    
    let newList;
    if (isCurrentlyBanned) {
      newList = bannedFromGroups.filter((id: string) => id !== groupId);
    } else {
      newList = [...bannedFromGroups, groupId];
    }
    
    await updateDoc(doc(db, 'users', userId), {
      bannedFromGroups: newList
    });
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 py-8">
      {/* Sidebar */}
      <aside className="w-full md:w-64 space-y-4">
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
          <h2 className="flex items-center gap-2 font-bold text-amber-800">
            <Settings className="w-5 h-5" /> Admin Panel
          </h2>
        </div>
        
        <nav className="space-y-1">
          {[
            { id: 'locks', name: 'Page Access', icon: Lock },
            { id: 'recordings', name: 'Library', icon: Music },
            { id: 'podcasts', name: 'Podcast', icon: Mic2 },
            { id: 'products', name: 'Shop Inventory', icon: ShoppingBag },
            { id: 'sessions', name: 'Therapy Setup', icon: Calendar },
            { id: 'community', name: 'Circles', icon: MessageSquare },
            { id: 'users', name: 'User Access', icon: Users },
            { id: 'security', name: 'Security', icon: Key },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id ? 'bg-stone-900 text-white shadow-lg' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="font-medium text-sm">{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="pt-8 px-4">
           <button 
            onClick={initSampleData}
            className="w-full py-3 border border-stone-200 border-dashed rounded-xl text-xs font-bold text-stone-400 hover:text-stone-900 hover:border-stone-900 transition-all flex items-center justify-center gap-2"
           >
            <Sparkles className="w-3 h-3" /> Initialize Content
           </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 bg-white rounded-[2rem] border border-stone-100 p-8 shadow-sm">
        {activeTab === 'locks' && (
          <div className="space-y-8">
            <header>
              <h3 className="text-2xl font-serif font-bold">Visibility Settings</h3>
              <p className="text-stone-500 mt-1">Manage which pages are accessible to non-admin users.</p>
            </header>
            
            <div className="grid gap-3">
              {['library', 'booking', 'blog', 'podcast', 'shop', 'community', 'journal'].map(page => (
                <div key={page} className="group flex items-center justify-between p-5 bg-stone-50 rounded-2xl border border-transparent hover:border-stone-100 transition-all">
                  <span className="capitalize font-bold text-stone-700 tracking-wide">{page}</span>
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full ${
                      locks[page] ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      {locks[page] ? 'Hidden' : 'Visible'}
                    </span>
                    <button 
                      onClick={() => toggleLock(page)}
                      className={`p-3 rounded-xl transition-all ${
                        locks[page] ? 'bg-stone-900 text-white shadow-xl' : 'bg-white text-stone-400 border border-stone-100 hover:border-stone-200 shadow-sm'
                      }`}
                    >
                      {locks[page] ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'recordings' && (
           <div className="space-y-6">
              <header className="flex justify-between items-center">
                <h3 className="text-2xl font-serif font-bold text-stone-900">Library</h3>
                <button 
                  onClick={() => setShowForms({...showForms, recording: !showForms.recording})}
                  className="flex items-center gap-2 bg-stone-900 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-stone-900/10 hover:-translate-y-0.5 transition-transform"
                >
                  <Plus className="w-4 h-4" /> {showForms.recording ? 'Cancel' : 'New Library Item'}
                </button>
              </header>

              {/* Folders Sub-Panel */}
              <div className="bg-stone-50 p-6 rounded-3xl space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h4 className="font-bold text-stone-900 flex items-center gap-2">
                      <Folder className="w-5 h-5 text-stone-600" /> Folders Manager
                    </h4>
                    <p className="text-xs text-stone-500 mt-0.5">Place library recordings into custom physical folder buckets.</p>
                  </div>
                  <button
                    onClick={() => setShowForms({ ...showForms, folder: !showForms.folder })}
                    className="text-xs flex items-center gap-1.5 bg-white border border-stone-200 text-stone-700 px-3.5 py-2 rounded-xl font-bold hover:bg-stone-50 transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {showForms.folder ? 'Hide Form' : 'Create New Folder'}
                  </button>
                </div>

                {showForms.folder && (
                  <div className="bg-white p-4 rounded-2xl border border-stone-100 space-y-4 shadow-sm animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Folder Name</label>
                        <input
                          placeholder="e.g. Daily Hypnosis Protocols, Deep Breathing Kits"
                          className="p-3 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-500"
                          value={newFolder.name}
                          onChange={e => setNewFolder({ ...newFolder, name: e.target.value })}
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Description (Optional)</label>
                        <input
                          placeholder="A quick summary of files in this folder..."
                          className="p-3 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-500"
                          value={newFolder.description}
                          onChange={e => setNewFolder({ ...newFolder, description: e.target.value })}
                        />
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (!newFolder.name.trim()) return;
                        await addDoc(collection(db, 'folders'), {
                          name: newFolder.name.trim(),
                          description: newFolder.description.trim() || '',
                          createdAt: serverTimestamp()
                        });
                        setNewFolder({ name: '', description: '' });
                        setShowForms({ ...showForms, folder: false });
                      }}
                      className="bg-stone-900 text-white text-xs px-4 py-2.5 rounded-xl font-bold hover:bg-stone-850 transition-all shadow-md shadow-stone-950/10"
                    >
                      Create Folder
                    </button>
                  </div>
                )}

                {folders.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {folders.map(folder => {
                      const count = recordings.filter(rec => rec.folderId === folder.id).length;
                      return (
                        <div key={folder.id} className="flex items-center gap-2 bg-white border border-stone-200 pl-3.5 pr-2 py-2 rounded-xl shadow-sm hover:border-stone-300 transition-all text-xs">
                          <Folder className="w-3.5 h-3.5 text-amber-600 fill-amber-50" />
                          <div className="flex flex-col">
                            <span className="font-bold text-stone-800">{folder.name}</span>
                            {folder.description && (
                              <span className="text-[10px] text-stone-400 mt-0.5 max-w-[180px] truncate">{folder.description}</span>
                            )}
                          </div>
                          <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-md font-bold ml-1">
                            {count} file{count === 1 ? '' : 's'}
                          </span>
                          <button
                            onClick={async () => {
                              if (confirm(`Are you sure you want to delete the folder "${folder.name}"? The items inside will remain in the library but will be set to no-folder.`)) {
                                await deleteDoc(doc(db, 'folders', folder.id));
                                const associated = recordings.filter(r => r.folderId === folder.id);
                                for (const rec of associated) {
                                  await updateDoc(doc(db, 'recordings', rec.id), { folderId: '' });
                                }
                              }
                            }}
                            className="text-stone-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all ml-1.5"
                            title="Delete Folder"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 italic">No custom folders created yet. Click "+ Create New Folder" above to begin grouping.</p>
                )}
              </div>

              {showForms.recording && (
                <div className="bg-stone-50 p-6 rounded-3xl space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Item Title</label>
                      <input 
                        placeholder="Title"
                        className="p-3 rounded-xl border border-stone-200"
                        value={newRec.title}
                        onChange={e => setNewRec({...newRec, title: e.target.value})}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Category</label>
                      <select 
                        className="p-3 rounded-xl border border-stone-200"
                        value={newRec.category}
                        onChange={e => setNewRec({...newRec, category: e.target.value})}
                      >
                        <option>Mindfulness</option>
                        <option>Focus</option>
                        <option>Sleep</option>
                        <option>Breathwork</option>
                        <option>Anxiety</option>
                        <option>Confidence</option>
                        <option>Spirituality</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Description / Guide text</label>
                    <textarea 
                      placeholder="Description / Guide Text"
                      className="w-full p-3 rounded-xl border border-stone-200 text-sm"
                      rows={3}
                      value={newRec.description}
                      onChange={e => setNewRec({...newRec, description: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Media Type</label>
                      <select 
                        className="p-3 rounded-xl border border-stone-200"
                        value={newRec.mediaType || 'audio'}
                        onChange={e => setNewRec({...newRec, mediaType: e.target.value as any})}
                      >
                        <option value="audio">Audio file</option>
                        <option value="video">Video file/embed URL</option>
                      </select>
                    </div>
                    
                    {newRec.mediaType === 'video' ? (
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Video URL (YouTube Embed or direct MP4)</label>
                        <input 
                          placeholder="e.g. https://www.youtube.com/embed/... or .mp4"
                          className="p-3 rounded-xl border border-stone-200 text-xs"
                          value={newRec.videoUrl || ''}
                          onChange={e => setNewRec({...newRec, videoUrl: e.target.value})}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Audio URL (Direct MP3 link)</label>
                        <input 
                          placeholder="e.g. https://www.soundhelix.com/examples/...mp3"
                          className="p-3 rounded-xl border border-stone-200 text-xs"
                          value={newRec.audioUrl || ''}
                          onChange={e => setNewRec({...newRec, audioUrl: e.target.value})}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Cover Image URL</label>
                      <input 
                        placeholder="Image URL (Unsplash or direct)"
                        className="p-3 rounded-xl border border-stone-200 text-xs"
                        value={newRec.imageUrl}
                        onChange={e => setNewRec({...newRec, imageUrl: e.target.value})}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Access Tier</label>
                      <select 
                        className="p-3 rounded-xl border border-stone-200"
                        value={newRec.isFree ? 'free' : 'member'}
                        onChange={e => setNewRec({...newRec, isFree: e.target.value === 'free'})}
                      >
                        <option value="free">Free for Everyone</option>
                        <option value="member">Locked / Members Only</option>
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Parent Folder</label>
                      <select 
                        className="p-3 rounded-xl border border-stone-200 text-sm"
                        value={newRec.folderId || ''}
                        onChange={e => setNewRec({...newRec, folderId: e.target.value})}
                      >
                        <option value="">(No Folder / Root)</option>
                        {folders.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Category Filter Multi-Select Checkboxes */}
                  <div className="bg-white p-4 rounded-xl border border-stone-200/60 space-y-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                        Select Categories / Filters for this session (Multi-Select)
                      </label>
                      <p className="text-[10px] text-stone-400 mt-0.5">Place this item into multiple categories by checking them below.</p>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {['Mindfulness', 'Focus', 'Sleep', 'Breathwork', 'Anxiety', 'Confidence', 'Spirituality'].map(cat => {
                        const isChecked = newRecFilters.includes(cat);
                        return (
                          <label key={cat} className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setNewRecFilters(newRecFilters.filter(f => f !== cat));
                                } else {
                                  setNewRecFilters([...newRecFilters, cat]);
                                }
                              }}
                              className="rounded border-stone-300 text-stone-900 focus:ring-stone-500 w-3.5 h-3.5"
                            />
                            {cat}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                      Custom Categories / Filters (comma-separated, optional)
                    </label>
                    <input 
                      placeholder="e.g. Morning, Deep Relaxation, Stress Relief"
                      className="p-3 rounded-xl border border-stone-200 text-sm"
                      value={newRecCustomFilters}
                      onChange={e => setNewRecCustomFilters(e.target.value)}
                    />
                  </div>

                  <button 
                    onClick={async () => {
                      const standardSelected = newRecFilters;
                      const customSelected = newRecCustomFilters
                        .split(',')
                        .map(s => s.trim())
                        .filter(s => s.length > 0);
                      const combinedFilters = Array.from(new Set([
                        newRec.category,
                        ...standardSelected,
                        ...customSelected
                      ])).filter(f => f && f !== 'All');

                      const finalRec = {
                        title: newRec.title || 'Untitled Item',
                        category: newRec.category || 'Mindfulness',
                        filters: combinedFilters,
                        isFree: newRec.isFree,
                        price: newRec.isFree ? 0 : 15,
                        description: newRec.description || '',
                        imageUrl: newRec.imageUrl || 'https://images.unsplash.com/photo-1445019980597-93fa8acb246a?auto=format&fit=crop&q=80&w=800',
                        audioUrl: newRec.mediaType === 'audio' ? (newRec.audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3') : '',
                        videoUrl: newRec.mediaType === 'video' ? (newRec.videoUrl || 'https://www.w3schools.com/html/mov_bbb.mp4') : '',
                        mediaType: newRec.mediaType || 'audio',
                        duration: 600,
                        order: recordings.length,
                        folderId: newRec.folderId || '',
                        createdAt: serverTimestamp()
                      };
                      await addDoc(collection(db, 'recordings'), finalRec);
                      setShowForms({...showForms, recording: false});
                      setNewRec({ title: '', category: 'Mindfulness', isFree: true, description: '', imageUrl: '', audioUrl: '', videoUrl: '', mediaType: 'audio', folderId: '' });
                      setNewRecFilters([]);
                      setNewRecCustomFilters('');
                    }}
                    className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-850 transition-colors"
                  >
                    Add to Library
                  </button>
                </div>
              )}

              <div className="divide-y divide-stone-50">
                {(() => {
                  const sortedRecordings = [...recordings]
                    .sort((a, b) => {
                      const oA = a.order !== undefined ? a.order : 99999;
                      const oB = b.order !== undefined ? b.order : 99999;
                      if (oA !== oB) return oA - oB;
                      return (a.title || '').localeCompare(b.title || '');
                    })
                    .map((rec, idx) => {
                      if (idx < libraryImageOverride.length) {
                        return { ...rec, imageUrl: libraryImageOverride[idx] };
                      }
                      return rec;
                    });

                  return sortedRecordings.map((rec, index) => {
                    if (editingRecId === rec.id) {
                      return (
                        <div key={rec.id} className="p-6 bg-stone-50 border border-stone-200/60 rounded-3xl my-4 space-y-4 animate-fade-in text-left">
                          <div className="flex justify-between items-center border-b border-stone-200/50 pb-3">
                            <h4 className="font-serif font-bold text-stone-950 text-base">Edit Library Session</h4>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRecId(null);
                                setEditRec(null);
                              }}
                              className="text-stone-400 hover:text-stone-700 text-xs font-semibold px-2 py-1 rounded-lg cursor-pointer"
                            >
                              ✕ Cancel
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Item Title</label>
                              <input 
                                className="p-3 rounded-xl border border-stone-200 text-sm bg-white"
                                value={editRec.title}
                                onChange={e => setEditRec({...editRec, title: e.target.value})}
                              />
                            </div>
                            <div className="flex flex-col">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Primary Category</label>
                              <select 
                                className="p-3 rounded-xl border border-stone-200 text-sm bg-white"
                                value={editRec.category}
                                onChange={e => setEditRec({...editRec, category: e.target.value})}
                              >
                                <option>Mindfulness</option>
                                <option>Focus</option>
                                <option>Sleep</option>
                                <option>Breathwork</option>
                                <option>Anxiety</option>
                                <option>Confidence</option>
                                <option>Spirituality</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex flex-col">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Description / Guide text</label>
                            <textarea 
                              className="w-full p-3 rounded-xl border border-stone-200 text-sm bg-white"
                              rows={3}
                              value={editRec.description}
                              onChange={e => setEditRec({...editRec, description: e.target.value})}
                            />
                          </div>

                          {/* Media Type, URLs, Parent Folder */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Media Type</label>
                              <select 
                                className="p-3 rounded-xl border border-stone-200 bg-white"
                                value={editRec.mediaType || 'audio'}
                                onChange={e => setEditRec({...editRec, mediaType: e.target.value as any})}
                              >
                                <option value="audio">Audio file</option>
                                <option value="video">Video file/embed URL</option>
                              </select>
                            </div>

                            {editRec.mediaType === 'video' ? (
                              <div className="flex flex-col">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Video URL (YouTube Embed or direct MP4)</label>
                                <input 
                                  className="p-3 rounded-xl border border-stone-200 text-xs bg-white"
                                  value={editRec.videoUrl || ''}
                                  onChange={e => setEditRec({...editRec, videoUrl: e.target.value})}
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Audio URL (Direct MP3 link)</label>
                                <input 
                                  className="p-3 rounded-xl border border-stone-200 text-xs bg-white"
                                  value={editRec.audioUrl || ''}
                                  onChange={e => setEditRec({...editRec, audioUrl: e.target.value})}
                                />
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex flex-col">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Cover Image URL</label>
                              <input 
                                className="p-3 rounded-xl border border-stone-200 text-xs bg-white"
                                value={editRec.imageUrl}
                                onChange={e => setEditRec({...editRec, imageUrl: e.target.value})}
                              />
                            </div>
                            <div className="flex flex-col">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Access Tier</label>
                              <select 
                                className="p-3 rounded-xl border border-stone-200 bg-white"
                                value={editRec.isFree ? 'free' : 'member'}
                                onChange={e => setEditRec({...editRec, isFree: e.target.value === 'free'})}
                              >
                                <option value="free">Free for Everyone</option>
                                <option value="member">Locked / Members Only</option>
                              </select>
                            </div>
                            <div className="flex flex-col">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Parent Folder</label>
                              <select 
                                className="p-3 rounded-xl border border-stone-200 text-sm bg-white"
                                value={editRec.folderId || ''}
                                onChange={e => setEditRec({...editRec, folderId: e.target.value})}
                              >
                                <option value="">(No Folder / Root)</option>
                                {folders.map(f => (
                                  <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Filters checkboxes for editing */}
                          <div className="bg-white p-4 rounded-xl border border-stone-200/60 space-y-3">
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                Select Categories / Filters (Multi-Select)
                              </label>
                              <p className="text-[10px] text-stone-400 mt-0.5">Toggle categories this session belongs to:</p>
                            </div>
                            <div className="flex flex-wrap gap-x-6 gap-y-2">
                              {['Mindfulness', 'Focus', 'Sleep', 'Breathwork', 'Anxiety', 'Confidence', 'Spirituality'].map(cat => {
                                const isChecked = editRecFilters.includes(cat);
                                return (
                                  <label key={cat} className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          setEditRecFilters(editRecFilters.filter(f => f !== cat));
                                        } else {
                                          setEditRecFilters([...editRecFilters, cat]);
                                        }
                                      }}
                                      className="rounded border-stone-300 text-stone-900 focus:ring-stone-500 w-3.5 h-3.5"
                                    />
                                    {cat}
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex flex-col">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Custom Filters / Tags (comma-separated, optional)</label>
                            <input 
                              placeholder="e.g. Deep Healing, Morning Routine"
                              className="p-3 rounded-xl border border-stone-200 text-sm bg-white"
                              value={editRecCustomFilters}
                              onChange={e => setEditRecCustomFilters(e.target.value)}
                            />
                          </div>

                          {/* Save & Cancel buttons */}
                          <div className="flex gap-3 pt-2">
                            <button
                              type="button"
                              onClick={async () => {
                                const standardSelected = editRecFilters;
                                const customSelected = editRecCustomFilters
                                  .split(',')
                                  .map(s => s.trim())
                                  .filter(s => s.length > 0);
                                const combinedFilters = Array.from(new Set([
                                  editRec.category,
                                  ...standardSelected,
                                  ...customSelected
                                ])).filter(f => f && f !== 'All');

                                await updateDoc(doc(db, 'recordings', rec.id), {
                                  title: editRec.title || 'Untitled Item',
                                  category: editRec.category || 'Mindfulness',
                                  filters: combinedFilters,
                                  isFree: editRec.isFree,
                                  description: editRec.description || '',
                                  imageUrl: editRec.imageUrl || 'https://images.unsplash.com/photo-1445019980597-93fa8acb246a?auto=format&fit=crop&q=80&w=800',
                                  audioUrl: editRec.mediaType === 'audio' ? (editRec.audioUrl || '') : '',
                                  videoUrl: editRec.mediaType === 'video' ? (editRec.videoUrl || '') : '',
                                  mediaType: editRec.mediaType || 'audio',
                                  folderId: editRec.folderId || ''
                                });

                                setEditingRecId(null);
                                setEditRec(null);
                              }}
                              className="px-6 py-2.5 bg-stone-900 hover:bg-stone-850 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
                            >
                              Save Changes
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRecId(null);
                                setEditRec(null);
                              }}
                              className="px-6 py-2.5 bg-stone-200/80 hover:bg-stone-250 text-stone-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={rec.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group animate-fade-in hover:bg-stone-50/40 px-2 rounded-2xl transition-all border-b border-stone-50">
                        <div className="flex gap-4 items-center">
                          <img src={rec.imageUrl} className="w-12 h-12 rounded-lg object-cover select-none border border-stone-100" />
                          <div>
                            <p className="font-bold text-sm tracking-tight">{rec.title}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-stone-400 capitalize bg-stone-100 px-2 py-0.5 rounded font-medium">{rec.category}</span>
                              <span className="text-stone-300">•</span>
                              <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200/50 px-2 py-0 rounded font-bold uppercase tracking-wider">{rec.mediaType || 'audio'}</span>
                              {!rec.isFree && (
                                <span className="text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0 rounded font-bold uppercase tracking-wider">Locked</span>
                              )}
                              {(() => {
                                const foundF = folders.find(f => f.id === rec.folderId);
                                if (foundF) {
                                  return (
                                    <>
                                      <span className="text-stone-300">•</span>
                                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100/30 border border-amber-100 px-1.5 py-0 rounded flex items-center gap-1">
                                        <Folder className="w-2.5 h-2.5" /> {foundF.name}
                                      </span>
                                    </>
                                  );
                                }
                                return null;
                              })()}

                              {/* Show assigned tags/filters */}
                              {rec.filters && rec.filters.length > 0 && (
                                <>
                                  <span className="text-stone-300">•</span>
                                  <div className="flex flex-wrap gap-1">
                                    {rec.filters.map((f: string) => (
                                      <span key={f} className="text-[9px] font-semibold bg-amber-50 text-amber-900 border border-amber-100 px-1 rounded">
                                        {f}
                                      </span>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 select-none">
                          {/* Folder Shift Dropdown */}
                          <div className="flex items-center gap-1 mr-2 bg-stone-100/60 p-1.5 rounded-lg border border-stone-200/40">
                            <Folder className="w-3.5 h-3.5 text-stone-400" />
                            <select
                              value={rec.folderId || ''}
                              onChange={async (e) => {
                                await updateDoc(doc(db, 'recordings', rec.id), { folderId: e.target.value });
                              }}
                              className="bg-transparent text-xs text-stone-600 focus:outline-none font-medium cursor-pointer max-w-[130px]"
                            >
                              <option value="">(No Folder)</option>
                              {folders.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* EDIT BUTTON */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRecId(rec.id);
                              const currentFilters = rec.filters || [];
                              const defaultCategories = ['Sleep', 'Anxiety', 'Confidence', 'Focus', 'Spirituality', 'Mindfulness', 'Breathwork'];
                              setEditRec({
                                title: rec.title,
                                category: rec.category || 'Mindfulness',
                                isFree: !!rec.isFree,
                                description: rec.description || '',
                                imageUrl: rec.imageUrl || '',
                                audioUrl: rec.audioUrl || '',
                                videoUrl: rec.videoUrl || '',
                                mediaType: rec.mediaType || 'audio',
                                folderId: rec.folderId || ''
                              });
                              setEditRecFilters(currentFilters.filter((f: string) => defaultCategories.includes(f)));
                              setEditRecCustomFilters(currentFilters.filter((f: string) => !defaultCategories.includes(f) && f !== rec.category).join(', '));
                            }}
                            className="p-2 rounded-xl text-stone-400 hover:text-stone-950 hover:bg-stone-100 transition-all cursor-pointer"
                            title="Edit Details & Categories/Filters"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMoveRecording(index, 'up')}
                            disabled={index === 0}
                            className="p-2 rounded-xl text-stone-400 hover:text-stone-950 hover:bg-stone-100 disabled:opacity-20 transition-all cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveRecording(index, 'down')}
                            disabled={index === sortedRecordings.length - 1}
                            className="p-2 rounded-xl text-stone-400 hover:text-stone-950 hover:bg-stone-100 disabled:opacity-20 transition-all cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${rec.title}"?`)) {
                                deleteDoc(doc(db, 'recordings', rec.id));
                              }
                            }} 
                            className="p-2 text-stone-300 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all cursor-pointer"
                            title="Delete Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
           </div>
        )}

        {activeTab === 'podcasts' && (
           <div className="space-y-6">
              {/* Podcast RSS feed configuration block for admins */}
              <div className="bg-stone-50 border border-stone-200/60 p-6 md:p-8 rounded-[2rem] space-y-6 shadow-sm">
                <div className="flex items-center gap-3 border-b border-stone-200 pb-4">
                  <Rss className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="font-serif font-bold text-stone-900 text-lg">Podcast RSS Feed Sync</h3>
                    <p className="text-xs text-stone-500">Automatically synchronize episodes directly from dynamic XML feed URLs.</p>
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
                        className="flex-1 bg-white border border-stone-200 text-xs text-stone-850 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                      <button
                        onClick={async () => {
                          await updateText('podcast-rss-feed-url', rssInput.trim());
                        }}
                        className="bg-stone-900 hover:bg-stone-850 text-white font-bold text-xs px-6 py-3 rounded-xl transition-colors shrink-0"
                      >
                        Save URL
                      </button>
                    </div>
                  </div>

                  {rssUrl && (
                    <div className="grid md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">Show page Content Engine</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateText('podcast-use-live-rss', 'true')}
                            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold border transition-all ${
                              useLiveRss 
                                ? 'bg-amber-100/50 border-amber-300 text-amber-900 shadow-sm' 
                                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                            }`}
                          >
                            <Rss className="w-4 h-4 text-amber-500" /> Live Feed
                          </button>
                          <button
                            onClick={() => updateText('podcast-use-live-rss', 'false')}
                            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold border transition-all ${
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
                          className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-850 text-white font-semibold text-xs p-3.5 rounded-xl transition-all shadow-sm active:translate-y-0.5 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> Sync Live XML to Firestore
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-3 p-4 bg-white border border-stone-200/50 rounded-xl text-xs">
                    <span className="font-bold text-stone-800">Connection Status:</span>
                    {isLoadingRss ? (
                      <span className="text-amber-600 font-medium flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Querying RSS XML endpoint...
                      </span>
                    ) : rssUrl.trim() === '' ? (
                      <span className="text-stone-400 font-medium italic">Empty (No feed URL configured yet)</span>
                    ) : rssError ? (
                      <span className="text-red-500 font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" /> {rssError}. Using Firestore cached episodes.
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Successfully mapped {rssEpisodes.length} live episodes.
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

              <header className="flex justify-between items-center pt-4 border-t border-stone-200">
                <h3 className="text-2xl font-serif font-bold text-stone-900">Manual Episodes</h3>
                <button 
                  onClick={() => setShowForms({...showForms, podcast: !showForms.podcast})}
                  className="flex items-center gap-2 bg-stone-900 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-stone-900/10 hover:-translate-y-0.5 transition-transform"
                >
                  <Plus className="w-4 h-4" /> {showForms.podcast ? 'Cancel' : 'New Episode'}
                </button>
              </header>

              {showForms.podcast && (
                <div className="bg-stone-50 p-6 rounded-3xl space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      placeholder="Episode Title"
                      className="p-3 rounded-xl border border-stone-200"
                      value={newEp.title}
                      onChange={e => setNewEp({...newEp, title: e.target.value})}
                    />
                    <input 
                      placeholder="Season"
                      type="number"
                      className="p-3 rounded-xl border border-stone-200"
                      value={newEp.season}
                      onChange={e => setNewEp({...newEp, season: parseInt(e.target.value)})}
                    />
                  </div>
                  <textarea 
                    placeholder="Show Notes / Description"
                    className="w-full p-3 rounded-xl border border-stone-200 text-sm"
                    rows={3}
                    value={newEp.showNotes}
                    onChange={e => setNewEp({...newEp, showNotes: e.target.value})}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      placeholder="Cover Image URL"
                      className="p-3 rounded-xl border border-stone-200 text-xs"
                      value={newEp.imageUrl}
                      onChange={e => setNewEp({...newEp, imageUrl: e.target.value})}
                    />
                    <input 
                      placeholder="Media URL (Podcast MP3/Video link)"
                      className="p-3 rounded-xl border border-stone-200 text-xs"
                      value={newEp.audioUrl}
                      onChange={e => setNewEp({...newEp, audioUrl: e.target.value})}
                    />
                  </div>
                  <button 
                    onClick={async () => {
                      const finalEp = {
                        ...newEp,
                        audioUrl: newEp.audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                        imageUrl: newEp.imageUrl || 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=600',
                        createdAt: serverTimestamp()
                      };
                      await addDoc(collection(db, 'episodes'), finalEp);
                      setShowForms({...showForms, podcast: false});
                      setNewEp({ title: '', category: 'Research', season: 1, showNotes: '', imageUrl: '', audioUrl: '' });
                    }}
                    className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold"
                  >
                    Publish Episode
                  </button>
                </div>
              )}

              <div className="divide-y divide-stone-50">
                 {episodes.map(ep => (
                   <div key={ep.id} className="py-4 flex justify-between items-center group">
                      <div className="flex gap-4 items-center">
                        <img 
                          src={ep.imageUrl || podcastCover} 
                          alt={ep.title} 
                          className="w-12 h-12 rounded-lg object-cover bg-stone-100 border border-stone-200/50 shrink-0" 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = podcastCover;
                          }}
                        />
                        <div>
                          <p className="font-bold text-sm tracking-tight">{ep.title}</p>
                          <p className="text-xs text-stone-400 uppercase tracking-widest">Season {ep.season}</p>
                        </div>
                      </div>
                      <button onClick={() => deleteDoc(doc(db, 'episodes', ep.id))} className="p-2 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                   </div>
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'products' && (
           <div className="space-y-6">
              <header className="flex justify-between items-center">
                <h3 className="text-2xl font-serif font-bold text-stone-900">Shop Inventory</h3>
                <button 
                  onClick={() => setShowForms({...showForms, product: !showForms.product})}
                  className="flex items-center gap-2 bg-stone-900 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-stone-900/10 hover:-translate-y-0.5 transition-transform"
                >
                  <Plus className="w-4 h-4" /> {showForms.product ? 'Cancel' : 'New Product'}
                </button>
              </header>

              {showForms.product && (
                <div className="bg-stone-50 p-6 rounded-3xl space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      placeholder="Product Name"
                      className="p-3 rounded-xl border border-stone-200"
                      value={newProd.name}
                      onChange={e => setNewProd({...newProd, name: e.target.value})}
                    />
                    <input 
                      placeholder="Price"
                      type="number"
                      className="p-3 rounded-xl border border-stone-200"
                      value={newProd.price}
                      onChange={e => setNewProd({...newProd, price: parseInt(e.target.value)})}
                    />
                  </div>
                  <textarea 
                    placeholder="Product Description"
                    className="w-full p-3 rounded-xl border border-stone-200 text-sm"
                    rows={3}
                    value={newProd.description}
                    onChange={e => setNewProd({...newProd, description: e.target.value})}
                  />
                  <input 
                    placeholder="Image URL"
                    className="w-full p-3 rounded-xl border border-stone-200 text-xs"
                    value={newProd.imageUrl}
                    onChange={e => setNewProd({...newProd, imageUrl: e.target.value})}
                  />
                  <button 
                    onClick={async () => {
                      const finalProd = {
                        ...newProd,
                        description: newProd.description || 'Premium sanctuary item.',
                        images: [newProd.imageUrl || 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600'],
                        createdAt: serverTimestamp()
                      };
                      await addDoc(collection(db, 'products'), finalProd);
                      setShowForms({...showForms, product: false});
                      setNewProd({ name: '', price: 0, type: 'digital', description: '', imageUrl: '' });
                    }}
                    className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold"
                  >
                    Add Product
                  </button>
                </div>
              )}

              <div className="divide-y divide-stone-50">
                 {products.map(prod => (
                   <div key={prod.id} className="py-4 flex justify-between items-center group">
                      <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 bg-stone-100 rounded-lg flex items-center justify-center font-bold text-xs text-stone-400">IMG</div>
                        <div>
                          <p className="font-bold text-sm tracking-tight">{prod.name}</p>
                          <p className="text-xs text-stone-400 uppercase tracking-widest">${prod.price} • {prod.type}</p>
                        </div>
                      </div>
                      <button onClick={() => deleteDoc(doc(db, 'products', prod.id))} className="p-2 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                   </div>
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'security' && (
           <div className="space-y-8">
              <header>
                <h3 className="text-2xl font-serif font-bold">Account Security</h3>
                <p className="text-stone-500 mt-1">Update your administrative credentials.</p>
              </header>
              <div className="max-w-md space-y-6 bg-stone-50 p-8 rounded-3xl border border-stone-100">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400 px-1">Current User</label>
                  <p className="p-4 bg-white rounded-xl text-stone-600 font-medium border border-stone-100">{auth.currentUser?.email}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400 px-1">New Password</label>
                  <input 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-4 bg-white rounded-xl border border-stone-100 focus:ring-2 focus:ring-stone-200"
                    placeholder="Min 6 characters"
                  />
                </div>
                {passMsg && <p className={`text-xs font-bold ${passMsg.includes('success') ? 'text-emerald-600' : 'text-red-500'}`}>{passMsg}</p>}
                <button 
                  onClick={handleUpdatePassword}
                  className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors shadow-lg shadow-stone-900/10"
                >
                  Update Admin Password
                </button>
              </div>
           </div>
        )}

        {activeTab === 'community' && (
          <div className="space-y-8">
            <header className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-serif font-bold text-stone-900">Community Circles</h3>
                <p className="text-stone-500 mt-1">Manage discussion groups and access levels.</p>
              </div>
            </header>

            <form onSubmit={handleCreateGroup} className="bg-stone-50 p-6 rounded-3xl border border-stone-100 space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-widest text-stone-400">Create New Circle</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  placeholder="Group Name"
                  value={newGroup.name}
                  onChange={e => setNewGroup({...newGroup, name: e.target.value})}
                  className="p-3 bg-white border border-stone-200 rounded-xl text-sm"
                />
                <input 
                  placeholder="Description"
                  value={newGroup.description}
                  onChange={e => setNewGroup({...newGroup, description: e.target.value})}
                  className="p-3 bg-white border border-stone-200 rounded-xl text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={newGroup.isSecure}
                    onChange={e => setNewGroup({...newGroup, isSecure: e.target.checked})}
                    className="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-500"
                  />
                  Secure (Member Only)
                </label>
                <button type="submit" className="bg-stone-900 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Create Circle
                </button>
              </div>
            </form>

            <div className="grid gap-4">
              {groups.map(group => (
                <div key={group.id} className="flex items-center justify-between p-4 bg-white border border-stone-100 rounded-2xl group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-stone-50 rounded-xl text-stone-400">
                      {group.isSecure ? <Lock className="w-5 h-5" /> : <Hash className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-stone-900">{group.name}</p>
                      <p className="text-xs text-stone-500">{group.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => updateDoc(doc(db, 'groups', group.id), { isSecure: !group.isSecure })}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${
                        group.isSecure ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {group.isSecure ? 'Secure' : 'Public'}
                    </button>
                    <button 
                      onClick={() => deleteDoc(doc(db, 'groups', group.id))}
                      className="p-2 text-stone-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-8">
            <header>
              <h3 className="text-2xl font-serif font-bold text-stone-900">User Management</h3>
              <p className="text-stone-500 mt-1">Control user access and member status.</p>
            </header>

            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
                    <th className="px-4 py-2">User</th>
                    <th className="px-4 py-2">Role</th>
                    <th className="px-4 py-2">Circle Bans</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.filter(u => u.id !== auth.currentUser?.uid).map(u => (
                    <tr key={u.id} className="bg-stone-50 group hover:bg-stone-100 transition-colors">
                      <td className="px-4 py-3 rounded-l-2xl">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${u.isBanned ? 'bg-red-200 text-red-700' : 'bg-stone-200 text-stone-600'}`}>
                            {u.email?.[0].toUpperCase()}
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${u.isBanned ? 'text-stone-400 line-through' : 'text-stone-900'}`}>{u.email}</p>
                            <p className="text-[10px] text-stone-400 tracking-wide">{u.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                          u.role === 'admin' ? 'bg-amber-100 text-amber-700' : u.role === 'member' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.bannedFromGroups?.map((groupId: string) => {
                            const groupName = groups.find(g => g.id === groupId)?.name || 'Unknown';
                            return (
                              <button 
                                key={groupId}
                                onClick={() => toggleUserGroupBan(u.id, groupId, true)}
                                className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[9px] font-bold hover:bg-red-200"
                              >
                                {groupName} ✕
                              </button>
                            );
                          })}
                          <select 
                            className="bg-stone-200 text-stone-600 rounded text-[9px] font-bold border-none h-5 px-1 focus:ring-0"
                            onChange={(e) => {
                              if (e.target.value) {
                                toggleUserGroupBan(u.id, e.target.value, false);
                                e.target.value = '';
                              }
                            }}
                          >
                            <option value="">+ Ban from Group</option>
                            {groups.filter(g => !u.bannedFromGroups?.includes(g.id)).map(g => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3 rounded-r-2xl text-right">
                        <button 
                          onClick={() => toggleUserBan(u.id, u.isBanned)}
                          className={`p-2 rounded-xl transition-all ${
                            u.isBanned ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white text-stone-400 border border-stone-100 hover:text-red-500'
                          }`}
                          title={u.isBanned ? 'Unban User' : 'Ban User Globally'}
                        >
                          {u.isBanned ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-12">
            <header className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-serif font-bold text-stone-900">Therapy Setup</h3>
                <p className="text-stone-500 mt-1">Configure your availability and service offerings.</p>
              </div>
              <button 
                onClick={() => alert("Redirecting to Outlook OAuth flow...")}
                className="flex items-center gap-2 bg-[#0078d4] text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-[#005a9e] transition-colors"
              >
                <Plus className="w-4 h-4" /> Sync Outlook Calendar
              </button>
            </header>

            {/* Therapist Profile Bio and Photo */}
            <section className="bg-stone-50 border border-stone-100 p-8 rounded-3xl space-y-6">
              <div>
                <h4 className="font-bold text-lg text-stone-900">Therapist Profile</h4>
                <p className="text-xs text-stone-500 mt-1">This bio and photo will be displayed directly under the Therapy booking tab so clients get to know you before booking.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Therapist Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Dr. Julianne Reed"
                      className="w-full p-3 rounded-xl border border-stone-200 bg-white"
                      value={therapistProfile?.name || ''}
                      onChange={e => setTherapistProfile({...therapistProfile, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Photo / Image URL</label>
                    <input 
                      type="text"
                      placeholder="e.g. https://images.unsplash.com/photo-..."
                      className="w-full p-3 rounded-xl border border-stone-200 bg-white text-xs"
                      value={therapistProfile?.imageUrl || ''}
                      onChange={e => setTherapistProfile({...therapistProfile, imageUrl: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Professional Bio</label>
                    <textarea 
                      placeholder="Write your therapeutic philosophy, training background, and greeting..."
                      className="w-full p-3 rounded-xl border border-stone-200 bg-white text-sm"
                      rows={4}
                      value={therapistProfile?.bio || ''}
                      onChange={e => setTherapistProfile({...therapistProfile, bio: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-6 bg-white border border-stone-100 rounded-2xl">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Photo Preview</span>
                  <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-stone-100 bg-stone-50 flex items-center justify-center">
                    {therapistProfile?.imageUrl ? (
                      <img 
                        key={therapistProfile.imageUrl}
                        src={therapistProfile.imageUrl} 
                        alt="Profile Preview" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = therapistDefaultImage;
                        }}
                      />
                    ) : (
                      <img 
                        src={therapistDefaultImage} 
                        alt="Profile Placeholder" 
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-stone-400 mt-2 text-center">Live preview from your URL or Unsplash.</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-200/50">
                {profileMsg && (
                  <span className={`text-xs font-bold ${profileMsg.includes('Error') ? 'text-red-500' : 'text-emerald-600'}`}>
                    {profileMsg}
                  </span>
                )}
                <div></div>
                <button 
                  onClick={saveTherapistProfile}
                  className="bg-stone-900 text-white px-6 py-2.5 rounded-full text-xs font-bold hover:bg-stone-800 transition-colors"
                >
                  Save Profile Settings
                </button>
              </div>
            </section>

            {/* Service Types */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm uppercase tracking-widest text-stone-400">Service Types</h4>
                <button 
                  onClick={() => setShowForms({...showForms, service: !showForms.service})}
                  className="text-stone-900 font-bold text-xs flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add Service
                </button>
              </div>

              {showForms.service && (
                <div className="bg-stone-50 p-6 rounded-3xl space-y-4 border border-stone-100">
                   <div className="grid grid-cols-2 gap-4">
                    <input 
                      placeholder="Service Name (e.g. Hypnotherapy)"
                      className="p-3 rounded-xl border border-stone-200"
                      value={newService.title}
                      onChange={e => setNewService({...newService, title: e.target.value})}
                    />
                    <div className="flex gap-2">
                      <input 
                        placeholder="Price"
                        type="number"
                        className="w-1/2 p-3 rounded-xl border border-stone-200"
                        value={newService.price}
                        onChange={e => setNewService({...newService, price: parseInt(e.target.value)})}
                      />
                      <input 
                        placeholder="Mins"
                        type="number"
                        className="w-1/2 p-3 rounded-xl border border-stone-200"
                        value={newService.duration}
                        onChange={e => setNewService({...newService, duration: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      await addDoc(collection(db, 'sessionTypes'), {
                        ...newService,
                        createdAt: serverTimestamp()
                      });
                      setShowForms({...showForms, service: false});
                      setNewService({ title: '', price: 0, duration: 60 });
                    }}
                    className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold"
                  >
                    Save Service Type
                  </button>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {sessions.map(type => (
                  <div key={type.id} className="p-4 bg-white border border-stone-100 rounded-2xl group relative">
                    <p className="font-bold text-stone-900">{type.title}</p>
                    <p className="text-xs text-stone-500">${type.price} • {type.duration} minutes</p>
                    <button 
                      onClick={() => deleteDoc(doc(db, 'sessionTypes', type.id))}
                      className="absolute top-4 right-4 text-stone-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Availability */}
            <section className="space-y-6">
              <h4 className="font-bold text-sm uppercase tracking-widest text-stone-400">Weekly Availability</h4>
              <div className="bg-stone-50 p-6 rounded-3xl border border-stone-100 space-y-4">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                  const dayAvail = availability.find(a => a.id === day);
                  return (
                    <div key={day} className="flex items-center justify-between py-2">
                       <span className="font-medium text-sm text-stone-600">{day}</span>
                       <div className="flex items-center gap-3">
                         <input 
                           type="time" 
                           defaultValue={dayAvail?.start || "09:00"}
                           onChange={async (e) => {
                             await setDoc(doc(db, 'availability', day), { start: e.target.value }, { merge: true });
                           }}
                           className="text-xs p-1 rounded border-stone-200"
                         />
                         <span className="text-stone-400">to</span>
                         <input 
                           type="time" 
                           defaultValue={dayAvail?.end || "17:00"}
                           onChange={async (e) => {
                             await setDoc(doc(db, 'availability', day), { end: e.target.value }, { merge: true });
                           }}
                           className="text-xs p-1 rounded border-stone-200"
                         />
                         <button 
                           onClick={async () => {
                             const isOff = dayAvail?.isOff || false;
                             await setDoc(doc(db, 'availability', day), { isOff: !isOff }, { merge: true });
                           }}
                           className={`px-3 py-1 rounded text-[10px] font-bold uppercase ${dayAvail?.isOff ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}
                         >
                           {dayAvail?.isOff ? 'Off' : 'On'}
                         </button>
                       </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
