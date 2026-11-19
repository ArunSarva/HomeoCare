import { openDB, unwrap } from 'idb';

const DB_NAME = 'HomeoCareDB';
const DB_VERSION = 2;
const LEGACY_STORES: Record<string, { keyPath: string; indexes: Record<string, string> }> = {
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

/** Opens the prior local database only for the explicit, one-time cloud migration. */
export const getDB = async (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    const idb = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        for (const [name, { keyPath, indexes }] of Object.entries(LEGACY_STORES)) {
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
    });
    idb.addEventListener('versionchange', () => {
      idb.close();
      dbPromise = null;
    });
    dbPromise = unwrap(idb);
  }
  return dbPromise;
};
