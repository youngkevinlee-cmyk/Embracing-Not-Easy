import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Send, Hash, Lock, Users, ChevronRight, MessageSquare, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import EditableText from '../components/EditableText';

export default function CommunityPage() {
  const { user, profile } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [activeGroup, setActiveGroup] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch Groups
    const path = 'groups';
    const unsubGroups = onSnapshot(collection(db, path), (snap) => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return unsubGroups;
  }, []);

  useEffect(() => {
    if (!activeGroup) return;

    const path = `groups/${activeGroup.id}/messages`;
    const q = query(
      collection(db, path),
      orderBy('createdAt', 'asc')
    );

    const unsubMessages = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      // Scroll to bottom
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return unsubMessages;
  }, [activeGroup]);

  const isBannedFromActive = () => {
    if (!activeGroup || !profile) return false;
    if (profile.isBanned) return true;
    return profile.bannedFromGroups?.includes(activeGroup.id);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeGroup || isBannedFromActive()) return;

    const msg = newMessage;
    setNewMessage('');

    await addDoc(collection(db, `groups/${activeGroup.id}/messages`), {
      text: msg,
      userId: user.uid,
      userName: user.displayName || user.email?.split('@')[0],
      createdAt: serverTimestamp()
    });
  };

  const canJoin = (group: any) => {
    if (!group.isSecure) return true;
    if (profile?.role === 'admin' || profile?.role === 'member') return true;
    return false;
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-white rounded-3xl border border-stone-100 overflow-hidden shadow-sm">
      {/* Sidebar: Groups */}
      <aside className="w-full md:w-80 border-r border-stone-100 flex flex-col">
        <div className="p-6 border-b border-stone-100">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-stone-400" /> Circles
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {groups.map(group => {
            const accessible = canJoin(group);
            return (
              <button
                key={group.id}
                onClick={() => accessible && setActiveGroup(group)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-2xl transition-all group",
                  activeGroup?.id === group.id ? "bg-stone-900 text-white" : "hover:bg-stone-50",
                  !accessible && "opacity-60 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg", 
                    activeGroup?.id === group.id ? "bg-white/10" : "bg-stone-100"
                  )}>
                    {group.isSecure ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm truncate max-w-[120px]">{group.name}</p>
                    <p className={cn(
                      "text-[10px] uppercase tracking-widest font-medium opacity-60",
                    )}>
                      {group.isSecure ? 'Member Only' : 'Open Circle'}
                    </p>
                  </div>
                </div>
                {!accessible && <Lock className="w-4 h-4 text-stone-400" />}
                {accessible && activeGroup?.id !== group.id && <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main: Chat */}
      <main className="flex-1 flex flex-col bg-stone-50/30">
        {activeGroup ? (
          <>
            {/* Chat header */}
            <header className="p-6 bg-white border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold flex items-center gap-2">
                  {activeGroup.isSecure ? <Lock className="w-4 h-4 text-stone-400" /> : <Hash className="w-4 h-4 text-stone-400" />}
                  {activeGroup.name}
                </h3>
                <p className="text-xs text-stone-400 mt-1">{activeGroup.description}</p>
              </div>
              <div className="flex items-center -space-x-2">
                {[1,2,3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-stone-200" />
                ))}
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg, i) => {
                const isMe = msg.userId === user?.uid;
                const showAvatar = i === 0 || messages[i-1].userId !== msg.userId;
                
                return (
                  <div key={msg.id} className={cn(
                    "flex gap-3 max-w-[80%]",
                    isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}>
                    {!isMe && (
                      <div className={cn("w-8 h-8 rounded-full bg-stone-200 shrink-0 mt-1", !showAvatar && "opacity-0")} />
                    )}
                    <div className={cn("space-y-1", isMe ? "items-end" : "items-start")}>
                      {showAvatar && (
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-1">
                          {isMe ? 'You' : msg.userName}
                        </p>
                      )}
                      <div className={cn(
                        "p-4 rounded-2xl text-sm shadow-sm",
                        isMe ? "bg-stone-900 text-white rounded-tr-none" : "bg-white text-stone-800 rounded-tl-none border border-stone-100"
                      )}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-6 bg-white border-t border-stone-100">
              {isBannedFromActive() ? (
                <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> You have been restricted from participating in this circle.
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Message ${activeGroup.name}...`}
                    className="w-full pl-6 pr-12 py-4 bg-stone-100 border-none rounded-2xl focus:ring-2 focus:ring-stone-200"
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="absolute right-2 top-2 p-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquare className="w-16 h-16 text-stone-200 mb-6" />
            <EditableText 
              id="community-welcome-title" 
              defaultValue="Welcome to the Sanctuary" 
              className="text-2xl font-serif text-stone-800 mb-2 block" 
              tag="h3" 
            />
            <EditableText 
              id="community-welcome-desc" 
              defaultValue="Select a circle from the sidebar to join the conversation." 
              className="text-stone-500 max-w-sm block" 
              tag="p" 
              multiline={true}
            />
          </div>
        )}
      </main>
    </div>
  );
}
