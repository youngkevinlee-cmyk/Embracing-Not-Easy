import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { useAuth } from './AuthContext';

interface SiteContentContextType {
  content: Record<string, string>;
  isEditingMode: boolean;
  setIsEditingMode: (mode: boolean) => void;
  updateText: (id: string, value: string) => Promise<void>;
  loading: boolean;
}

const SiteContentContext = createContext<SiteContentContextType | undefined>(undefined);

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  const [content, setContent] = useState<Record<string, string>>({});
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Turn off editing mode if user is no longer admin
  useEffect(() => {
    if (!isAdmin) {
      setIsEditingMode(false);
    }
  }, [isAdmin]);

  // Read content globally
  useEffect(() => {
    const docRef = doc(db, 'siteContent', 'global');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setContent(docSnap.data() as Record<string, string>);
      } else {
        setContent({});
      }
      setLoading(false);
    }, (error) => {
      console.error("Error loading site content:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const updateText = async (id: string, value: string) => {
    try {
      const docRef = doc(db, 'siteContent', 'global');
      await setDoc(docRef, { [id]: value }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `siteContent/global/${id}`);
    }
  };

  return (
    <SiteContentContext.Provider value={{ content, isEditingMode, setIsEditingMode, updateText, loading }}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent() {
  const context = useContext(SiteContentContext);
  if (!context) {
    throw new Error('useSiteContent must be used within a SiteContentProvider');
  }
  return context;
}
