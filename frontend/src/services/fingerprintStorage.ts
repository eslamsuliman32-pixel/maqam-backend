import { PhonemicFingerprint, AccentBit, MetricalFoot } from '../types/accent';

const DB_NAME = 'AccentFingerprintDB';
const DB_VERSION = 4; // Incremented version for more indexes
const STORE_NAME = 'fingerprints';

const FOOT_MAP: Record<MetricalFoot, number> = {
  'Iamb': 0, 'Trochee': 1, 'Spondee': 2, 'Pyrrhic': 3, 'Anapest': 4, 'Dactyl': 5
};
const REVERSE_FOOT_MAP: Record<number, MetricalFoot> = Object.fromEntries(Object.entries(FOOT_MAP).map(([k, v]) => [v, k as MetricalFoot]));

function encodeFingerprint(fp: PhonemicFingerprint): Uint8Array {
  const bits = fp.bits.map(b => b === '[!]' ? 1 : 0);
  const data = new Uint8Array(bits.length + 2);
  for (let i = 0; i < bits.length; i++) data[i] = bits[i];
  data[bits.length] = FOOT_MAP[fp.dominantFoot];
  data[bits.length + 1] = fp.syllableCount;
  return data;
}

function decodeFingerprint(data: Uint8Array): PhonemicFingerprint {
  const bits = Array.from(data.slice(0, data.length - 2)).map(b => b === 1 ? '[!]' : '[.]') as AccentBit[];
  const dominantFoot = REVERSE_FOOT_MAP[data[data.length - 2]];
  const syllableCount = data[data.length - 1];
  return { 
    bits, 
    dominantFoot, 
    syllableCount,
    syncopationScore: 0,
    polyrhythmicComplexity: 0,
    rhythmicGait: 'standard',
    stressFingerprintCode: ''
  };
}

export class FingerprintStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME);
        }
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'hash' });
        store.createIndex('dominantFoot', 'dominantFoot', { unique: false });
        store.createIndex('syllableCount', 'syllableCount', { unique: false });
        store.createIndex('fingerprintCode', 'fingerprintCode', { unique: false });
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  async save(hash: string, fingerprint: PhonemicFingerprint, code?: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put({ 
        hash, 
        data: encodeFingerprint(fingerprint),
        dominantFoot: fingerprint.dominantFoot,
        syllableCount: fingerprint.syllableCount,
        fingerprintCode: code || ''
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async get(hash: string): Promise<PhonemicFingerprint | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(hash);
      request.onsuccess = () => resolve(request.result ? decodeFingerprint(request.result.data) : null);
      request.onerror = () => reject(request.error);
    });
  }

  async findByFoot(foot: MetricalFoot): Promise<{hash: string, fingerprint: PhonemicFingerprint}[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('dominantFoot');
      const request = index.getAll(foot);
      
      request.onsuccess = () => {
        const results = request.result.map((item: any) => ({
          hash: item.hash,
          fingerprint: decodeFingerprint(item.data)
        }));
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async findByPattern(pattern: string): Promise<{hash: string, fingerprint: PhonemicFingerprint}[]> {
    if (!this.db) await this.init();
    
    const binaryPattern = pattern.replace(/\[!\]/g, '1').replace(/\[\.\]/g, '0');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const results: {hash: string, fingerprint: PhonemicFingerprint}[] = [];
      
      store.openCursor().onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const fingerprint = decodeFingerprint(cursor.value.data);
          const bitsBinary = fingerprint.bits.map(b => b === '[!]' ? '1' : '0').join('');
          
          if (bitsBinary.includes(binaryPattern)) {
            results.push({ hash: cursor.value.hash, fingerprint });
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const fingerprintStorage = new FingerprintStorage();
