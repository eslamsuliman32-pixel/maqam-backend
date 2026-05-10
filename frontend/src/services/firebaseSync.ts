import { StateStorage } from 'zustand/middleware';
import { del, get, set } from 'idb-keyval';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';

type SyncRecord = {
  name: string;
  payload: string;
  updatedAtClient: number;
  updatedAtServer?: unknown;
  payloadSize: number;
  payloadHash: string;
  deviceId: string;
  deleted?: boolean;
  tombstone?: boolean;
  version: number;
};

type SyncOptions = {
  stateVersion?: number;
  snapshotThresholdRatio?: number;
  snapshotMinSizeDelta?: number;
  debounceMs?: number;
  namespace?: string;
};

const DEFAULT_OPTIONS: Required<SyncOptions> = {
  stateVersion: 1,
  snapshotThresholdRatio: 0.03,
  snapshotMinSizeDelta: 512,
  debounceMs: 1800,
  namespace: 'maqam',
};

const canUseWindow = typeof window !== 'undefined';

const memoryDeviceId = (): string => {
  try {
    const key = 'maqam-device-id';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return `device-${Math.random().toString(36).slice(2, 10)}`;
  }
};

const stableHash = (input: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
};

const waitForCurrentUser = async (): Promise<User | null> => {
  if (auth.currentUser) return auth.currentUser;

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      }
    });
    
    // Fallback timeout in case auth fails or is disabled
    setTimeout(() => {
      unsubscribe();
      resolve(auth.currentUser);
    }, 3000);
  });
};

const localKey = (namespace: string, name: string) => `${namespace}:state:${name}`;
const stateDoc = (uid: string, namespace: string, name: string) =>
  doc(db, 'users', uid, 'stateVault', namespace, 'documents', name);

const snapshotDoc = (uid: string, namespace: string, name: string, snapshotId: string) =>
  doc(db, 'users', uid, 'stateVault', namespace, 'documents', name, 'snapshots', snapshotId);

const parsePayload = (raw: unknown): string | null => {
  if (typeof raw === 'string') return raw;
  if (raw == null) return null;
  try {
    return JSON.stringify(raw);
  } catch {
    return null;
  }
};

const compressPayload = async (str: string): Promise<string> => {
  if (!canUseWindow || !window.CompressionStream) return str;
  try {
    const stream = new Response(str).body!.pipeThrough(new CompressionStream('gzip'));
    const buffer = await new Response(stream).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    // Use chunks to avoid Maximum call stack size exceeded in fromCharCode
    const chunkSize = 8192;
    for (let pos = 0; pos < bytes.length; pos += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(pos, pos + chunkSize)));
    }
    return btoa(binary);
  } catch (err) {
    return str;
  }
};

const decompressPayload = async (base64Str: string, isCompressed: boolean): Promise<string> => {
  if (!isCompressed || !canUseWindow || !window.DecompressionStream) return base64Str;
  try {
    const binary = atob(base64Str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const stream = new Response(bytes).body!.pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).text();
  } catch (err) {
    // If it fails, maybe it wasn't compressed properly or fallback
    return base64Str;
  }
};

const readLocal = async (name: string, namespace: string): Promise<string | null> => {
  // 1. Try IndexedDB with namespace
  const cached = await get(localKey(namespace, name));
  if (typeof cached === 'string') return cached;

  if (canUseWindow) {
    try {
      // 2. Try IndexedDB WITHOUT namespace (Original legacy IndexedDB)
      const originalLegacyIdb = await get(name);
      if (typeof originalLegacyIdb === 'string') {
        console.log(`[CloudSync] Migrating legacy IDB state for "${name}"`);
        await set(localKey(namespace, name), originalLegacyIdb);
        return originalLegacyIdb;
      }

      // 3. Try LocalStorage with namespace
      const legacyNamespaced = localStorage.getItem(localKey(namespace, name));
      if (legacyNamespaced) {
        await set(localKey(namespace, name), legacyNamespaced);
        return legacyNamespaced;
      }

      // 3. Try LocalStorage WITHOUT namespace (Original legacy key)
      const originalLegacy = localStorage.getItem(name);
      if (originalLegacy) {
        console.log(`[CloudSync] Migrating legacy state for "${name}"`);
        await set(localKey(namespace, name), originalLegacy);
        return originalLegacy;
      }
    } catch {
      // ignore
    }
  }

  return null;
};

const writeLocal = async (name: string, namespace: string, value: string): Promise<void> => {
  await set(localKey(namespace, name), value);
};

const deleteLocal = async (name: string, namespace: string): Promise<void> => {
  await del(localKey(namespace, name));
  if (canUseWindow) {
    try {
      localStorage.removeItem(localKey(namespace, name));
    } catch {
      // ignore
    }
  }
};

const extractPayloadFromRecord = async (record: any): Promise<string | null> => {
  if (!record) return null;
  let raw: string | null = null;
  if (typeof record.payload === 'string') raw = record.payload;
  else if (typeof record.stateData === 'string') raw = record.stateData;
  else if (typeof record.data === 'string') raw = record.data;
  else raw = parsePayload(record.payload ?? record.stateData ?? record.data);
  
  if (raw && record.isCompressed) {
    return await decompressPayload(raw, true);
  }
  return raw;
};

const recordFromPayload = (name: string, payload: string, options: Required<SyncOptions>, deleted = false): SyncRecord => ({
  name,
  payload,
  updatedAtClient: Date.now(),
  payloadSize: payload.length,
  payloadHash: stableHash(payload),
  deviceId: memoryDeviceId(),
  deleted,
  tombstone: deleted,
  version: options.stateVersion,
});

const createSnapshot = async (
  uid: string,
  namespace: string,
  name: string,
  payload: string,
  options: Required<SyncOptions>,
  user: User,
  compressedPayload: string,
  isCompressed: boolean
) => {
  const id = `${Date.now()}-${stableHash(payload).slice(0, 8)}`;
  await setDoc(snapshotDoc(uid, namespace, name, id), {
    ...recordFromPayload(name, compressedPayload, options),
    isCompressed,
    userId: user.uid,
    snapshotId: id,
    createdAt: serverTimestamp(),
    kind: 'snapshot',
  }, { merge: true });
};

type SyncStatus = 'idle' | 'syncing' | 'error';
let currentStatus: SyncStatus = 'idle';
const statusListeners = new Set<(status: SyncStatus) => void>();

const updateStatus = (status: SyncStatus) => {
  currentStatus = status;
  statusListeners.forEach(l => l(status));
};

export const subscribeToSyncStatus = (l: (status: SyncStatus) => void) => {
  l(currentStatus);
  statusListeners.add(l);
  return () => statusListeners.delete(l);
};

const pushToCloud = async (
  name: string,
  payload: string,
  options: Required<SyncOptions>,
  forceSnapshot = false
) => {
  const user = await waitForCurrentUser();
  if (!user) return;

  updateStatus('syncing');
  try {
    const ref = stateDoc(user.uid, options.namespace, name);
    
    const existing = await getDoc(ref).catch(() => null);
    const current = existing?.exists() ? existing.data() : null;
    const currentPayload = await extractPayloadFromRecord(current);

    const shouldSnapshot = forceSnapshot || !currentPayload || Math.abs(payload.length - currentPayload.length) >= options.snapshotMinSizeDelta ||
      Math.abs(payload.length - (currentPayload?.length ?? 0)) / Math.max(currentPayload?.length ?? 1, 1) >= options.snapshotThresholdRatio;

    // Compress payload if needed (Firestore limit is ~1MB, so we compress usually anything larger than 100KB, or just try compressing everything over standard size)
    const isCompressed = payload.length > 51200; // 50KB+ compress it
    const finalPayload = isCompressed ? await compressPayload(payload) : payload;

    const remote = recordFromPayload(name, finalPayload, options);

    await setDoc(ref, {
      ...remote,
      isCompressed,
      userId: user.uid,
      kind: 'state',
      updatedAtServer: serverTimestamp(),
      deleted: false,
    }, { merge: true });

    if (shouldSnapshot) {
      await createSnapshot(user.uid, options.namespace, name, payload, options, user, finalPayload, isCompressed);
    }
    updateStatus('idle');
  } catch (err) {
    console.error("[CloudSync] Push failed", err);
    updateStatus('error');
    setTimeout(() => updateStatus('idle'), 5000);
    throw err;
  }
};

export const syncStorageInstances: Array<() => Promise<void>> = [];

export const forceCloudSync = async () => {
  await Promise.all(syncStorageInstances.map(fn => fn()));
};

export const pullFromCloud = async (namespace: string, name: string): Promise<boolean> => {
  const user = await waitForCurrentUser();
  if (!user) return false;
  
  try {
    const ref = stateDoc(user.uid, namespace, name);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    
    const remote = snap.data();
    const remotePayload = await extractPayloadFromRecord(remote);
    
    if (remotePayload) {
      await writeLocal(name, namespace, remotePayload);
      return true;
    }
  } catch (err) {
    console.error("[CloudSync] Error pulling from cloud", err);
  }
  return false;
};

export const createCloudSyncStorage = (options?: SyncOptions): StateStorage => {
  const resolved = { ...DEFAULT_OPTIONS, ...(options ?? {}) };

  const debounceMap = new Map<string, ReturnType<typeof setTimeout>>();
  const pendingValues = new Map<string, string>();

  const flush = async (name: string, forceSnapshot = false) => {
    const value = pendingValues.get(name);
    if (value === undefined) return;

    try {
      await pushToCloud(name, value, resolved, forceSnapshot);
    } catch (error) {
      console.warn(`[CloudSync] push failed for "${name}"`, error);
    }
  };

  const schedule = (name: string, value: string) => {
    pendingValues.set(name, value);

    const timer = debounceMap.get(name);
    if (timer) clearTimeout(timer);

    debounceMap.set(name, setTimeout(() => {
      void flush(name);
    }, resolved.debounceMs));
  };

  const flushAll = async (forceSnapshot = false) => {
    const promises = Array.from(pendingValues.keys()).map(name => flush(name, forceSnapshot));
    await Promise.all(promises);
  };

  syncStorageInstances.push(() => flushAll(true));

  if (canUseWindow) {
    window.addEventListener('beforeunload', () => { void flushAll(true); });
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flushAll(false);
    });
  }

  return {
    getItem: async (name: string): Promise<string | null> => {
      const localValue = await readLocal(name, resolved.namespace);
      const user = await waitForCurrentUser();

      if (!user) return localValue;

      try {
        const ref = stateDoc(user.uid, resolved.namespace, name);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          if (localValue !== null) {
            schedule(name, localValue);
          }
          return localValue;
        }

        const remote = snap.data();
        const remotePayload = await extractPayloadFromRecord(remote);

        if (remotePayload && remotePayload !== localValue) {
          await writeLocal(name, resolved.namespace, remotePayload);
          return remotePayload;
        }

        if (!remotePayload && localValue !== null) {
          schedule(name, localValue);
        }
      } catch (error) {
        console.warn(`[CloudSync] hydration failed for "${name}"`, error);
      }

      return localValue;
    },

    setItem: async (name: string, value: string): Promise<void> => {
      await writeLocal(name, resolved.namespace, value);
      schedule(name, value);
    },

    removeItem: async (name: string): Promise<void> => {
      await deleteLocal(name, resolved.namespace);

      const user = await waitForCurrentUser();
      if (!user) return;

      try {
        const payload = '';
        await setDoc(stateDoc(user.uid, resolved.namespace, name), {
          ...recordFromPayload(name, payload, resolved),
          userId: user.uid,
          kind: 'tombstone',
          deleted: true,
          tombstone: true,
          deletedAt: serverTimestamp(),
          updatedAtServer: serverTimestamp(),
        }, { merge: true });
      } catch (error) {
        console.warn(`[CloudSync] tombstone write failed for "${name}"`, error);
      }
    },
  };
};
