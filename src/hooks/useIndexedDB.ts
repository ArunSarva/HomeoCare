import { useState, useEffect, useCallback } from 'react';
import { openDB, unwrap } from 'idb';

const DB_NAME = 'HomeoCareDB';
/**
 * Bump this whenever SCHEMA below changes. IndexedDB only runs `upgrade`
 * when the version increases: appointments, inventory and billing were added
 * to the schema while it stayed at 1, so browsers that had already created
 * the database never got those stores ("One of the specified object stores
 * was not found" when adding an appointment). v2 adds whatever is missing.
 */
const DB_VERSION = 2;

/** Every store and index the app uses. Upgrades only add; nothing is dropped. */
const SCHEMA: Record<string, { keyPath: string; indexes: Record<string, string> }> = {
  patients: { keyPath: 'id', indexes: { byPatientId: 'patientId' } },
  cases: { keyPath: 'id', indexes: { byPatientId: 'patientId' } },
  prescriptions: { keyPath: 'id', indexes: { byPatientId: 'patientId' } },
  followups: { keyPath: 'id', indexes: { byPatientId: 'patientId' } },
  appointments: { keyPath: 'id', indexes: { byPatientId: 'patientId', byDate: 'appointmentDate' } },
  inventory: { keyPath: 'id', indexes: {} },
  billing: { keyPath: 'id', indexes: {} },
  syncQueue: { keyPath: 'id', indexes: { byStatus: 'status', byType: 'type' } },
  localCache: { keyPath: 'key', indexes: {} },
};

let dbPromise: IDBDatabase | null = null;

export const getDB = async (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    const idb = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        // Additive and idempotent: create missing stores, and missing indexes
        // on stores that already exist. Existing records are kept.
        for (const [name, { keyPath, indexes }] of Object.entries(SCHEMA)) {
          const store = db.objectStoreNames.contains(name as never)
            ? transaction.objectStore(name as never)
            : db.createObjectStore(name as never, { keyPath });
          for (const [indexName, indexKeyPath] of Object.entries(indexes)) {
            if (!store.indexNames.contains(indexName as never)) {
              store.createIndex(indexName as never, indexKeyPath, { unique: false });
            }
          }
        }
      },
      blocked() {
        // Another tab still has the old version open and must close/reload
        // before the upgrade can run.
        console.warn('HomeoCare database upgrade is waiting for other open tabs to close.');
      },
    });
    // Let an older tab release the database when a newer version needs it.
    idb.addEventListener('versionchange', () => {
      idb.close();
      dbPromise = null;
    });
    // Every caller uses the native IndexedDB API (`request.onsuccess = ...`).
    // The idb wrapper turns requests into Promises, so those callbacks never
    // fired and every read hung forever (e.g. the dashboard stuck loading).
    // Hand callers the plain IDBDatabase they are written against.
    dbPromise = unwrap(idb);
  }
  return dbPromise;
};

export const useIndexedDB = () => {
  const [initialized, setInitialized] = useState(false);

  const initializeDB = useCallback(async (): Promise<boolean> => {
    try {
      await getDB();
      setInitialized(true);
      return true;
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      return false;
    }
  }, []);

  const addToStore = useCallback(async <T>(storeName: string, data: T): Promise<string> => {
    const db = await getDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const id = crypto.randomUUID();
    await store.put({ ...data, id, createdAt: new Date().toISOString() });
    return id;
  }, []);

  const updateInStore = useCallback(async <T>(storeName: string, id: string, data: Partial<T>): Promise<void> => {
    const db = await getDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    const existing = await new Promise<T | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
    if (existing) {
      store.put({ ...existing, ...data, updatedAt: new Date().toISOString() });
    }
  }, []);

  const deleteFromStore = useCallback(async (storeName: string, id: string): Promise<void> => {
    const db = await getDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await store.delete(id);
  }, []);

  const getFromStore = useCallback(async <T>(storeName: string, id: string): Promise<T | undefined> => {
    const db = await getDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    return new Promise<T | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  }, []);

  const getAllFromStore = useCallback(async <T>(storeName: string): Promise<T[]> => {
    const db = await getDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    return new Promise<T[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }, []);

  const getFromIndex = useCallback(async <T>(storeName: string, indexName: string, key: any): Promise<T[]> => {
    const db = await getDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(key);
    return new Promise<T[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }, []);

  const addToSyncQueue = useCallback(async (type: string, action: string, data: any): Promise<void> => {
    const db = await getDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    const id = crypto.randomUUID();
    await store.put({
      id,
      type,
      action,
      data,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    });
  }, []);

  const getPendingSyncItems = useCallback(async (): Promise<any[]> => {
    const db = await getDB();
    const tx = db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    const index = store.index('byStatus');
    const request = index.getAll('pending');
    return new Promise<any[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }, []);

  const updateSyncStatus = useCallback(async (id: string, status: string, lastError?: string): Promise<void> => {
    const db = await getDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    const getRequest = store.get(id);
    
    return new Promise<void>((resolve, reject) => {
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.status = status;
          item.lastError = lastError;
          item.retryCount = item.retryCount + 1;
          item.updatedAt = Date.now();
          store.put(item);
        }
        resolve();
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }, []);

  const clearSyncQueue = useCallback(async (): Promise<void> => {
    const db = await getDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    store.clear();
  }, []);

  const cacheLocally = useCallback(async (key: string, value: any): Promise<void> => {
    const db = await getDB();
    const tx = db.transaction('localCache', 'readwrite');
    const store = tx.objectStore('localCache');
    await store.put({
      key,
      value,
      timestamp: Date.now(),
    });
  }, []);

  const getCached = useCallback(async (key: string): Promise<any | undefined> => {
    const db = await getDB();
    const tx = db.transaction('localCache', 'readonly');
    const store = tx.objectStore('localCache');
    const request = store.get(key);
    return new Promise<any | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }, []);

  useEffect(() => {
    initializeDB();
  }, [initializeDB]);

  return {
    initialized,
    initializeDB,
    addToStore,
    updateInStore,
    deleteFromStore,
    getFromStore,
    getAllFromStore,
    getFromIndex,
    addToSyncQueue,
    getPendingSyncItems,
    updateSyncStatus,
    clearSyncQueue,
    cacheLocally,
    getCached,
  };
};
