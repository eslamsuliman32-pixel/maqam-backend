import { initializeApp, getApp, getApps } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const config = firebaseConfig as Record<string, any>;
const app = getApps().length ? getApp() : initializeApp(config);

export const auth = getAuth(app);
export const db = getFirestore(app, config.firestoreDatabaseId);

if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).then(() => {
    if (!auth.currentUser) {
      signInAnonymously(auth).catch(console.warn);
    }
  }).catch(() => {
    // Auth persistence is helpful but non-blocking.
    if (!auth.currentUser) signInAnonymously(auth).catch(console.warn);
  });
}

export const firebaseApp = app;
export const firebaseProjectId = config.projectId ?? config.project_id ?? '';
export const firebaseReady = Boolean(config.apiKey && firebaseProjectId);
