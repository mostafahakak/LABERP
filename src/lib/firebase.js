import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBknFy3heJ5pXXqPAly0BnzvkCPFf-T6MU',
  authDomain: 'lab360erp.firebaseapp.com',
  projectId: 'lab360erp',
  storageBucket: 'lab360erp.firebasestorage.app',
  messagingSenderId: '427876412294',
  appId: '1:427876412294:web:3f1c99a292b4a532d19a07',
  measurementId: 'G-WVTJYX79T0',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
