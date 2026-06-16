import { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

interface PageLocks {
  [pageId: string]: boolean;
}

const PageLockContext = createContext<PageLocks>({});

export function PageLockProvider({ children }: { children: React.ReactNode }) {
  const [locks, setLocks] = useState<PageLocks>({});

  useEffect(() => {
    const path = 'pageLocks';
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const newLocks: PageLocks = {};
      snapshot.forEach((doc) => {
        newLocks[doc.id] = doc.data().isLocked;
      });
      setLocks(newLocks);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return unsubscribe;
  }, []);

  return (
    <PageLockContext.Provider value={locks}>
      {children}
    </PageLockContext.Provider>
  );
}

export function usePageLocks() {
  return useContext(PageLockContext);
}
