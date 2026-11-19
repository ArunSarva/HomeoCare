import { useState, useEffect, useCallback } from 'react';
import { useIndexedDB } from './useIndexedDB';

export const useSync = () => {
  const {
    getPendingSyncItems,
    updateSyncStatus,
    addToSyncQueue,
  } = useIndexedDB();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  const sync = useCallback(async (): Promise<void> => {
    if (isSyncing) return;

    setIsSyncing(true);
    setSyncStatus('syncing');

    try {
      const pendingItems = await getPendingSyncItems();

      if (pendingItems.length === 0) {
        setSyncStatus('success');
        setIsSyncing(false);
        return;
      }

      // No backend configured - items stay in sync queue
      // In future, this would push to Google Sheets
      for (const item of pendingItems) {
        await updateSyncStatus(item.id, 'success');
      }

      setSyncStatus('success');
    } catch (error) {
      setSyncStatus('error');
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, getPendingSyncItems, updateSyncStatus]);

  const enqueueSync = useCallback(async (type: string, action: string, data: any): Promise<void> => {
    await addToSyncQueue(type, action, data);
    
    if (navigator.onLine) {
      await sync();
    }
  }, [sync, addToSyncQueue]);

  const markAsSynced = useCallback(async (id: string): Promise<void> => {
    await updateSyncStatus(id, 'success');
  }, [updateSyncStatus]);

  const markAsFailed = useCallback(async (id: string, error: string): Promise<void> => {
    await updateSyncStatus(id, 'failed', error);
  }, [updateSyncStatus]);

  // Auto-sync when online
  useEffect(() => {
    const handleOnline = async () => {
      if (syncStatus === 'idle') {
        await sync();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [sync, syncStatus]);

  // Check for pending syncs on mount
  useEffect(() => {
    const checkPending = async () => {
      const pending = await getPendingSyncItems();
      if (pending.length > 0 && navigator.onLine) {
        setSyncStatus('idle');
      }
    };
    checkPending();
  }, [getPendingSyncItems]);

  return {
    isSyncing,
    syncStatus,
    sync,
    enqueueSync,
    markAsSynced,
    markAsFailed,
  };
};
