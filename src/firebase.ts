import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Ensure we use the correct database ID from config
// This prevents "Database (default) not found" error
const dbId = (firebaseConfig as any).firestoreDatabaseId;

if (!dbId || dbId === '(default)') {
  console.warn('Firebase initialized with (default) database. Double-check your firestoreDatabaseId in config.');
}

// Initialize Firestore with modern cache management (replaces deprecated enableIndexedDbPersistence)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, dbId);

export const auth = getAuth(app);
