'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = useCallback(async (uid) => {
    const userDoc = await getDoc(doc(db, 'Users', uid));
    if (!userDoc.exists()) return null;
    const data = userDoc.data();
    return {
      uid,
      name: data.name || '',
      email: data.email || '',
      type: data.type || '',
      salary: data.salary || 0,
      balance: data.balance || 0,
      branch: data.branch || 'New cairo',
    };
  }, []);

  useEffect(() => {
    const uid = typeof window !== 'undefined' ? localStorage.getItem('UID') : null;
    if (!uid) {
      setLoading(false);
      return;
    }
    // Sync cookie with localStorage
    if (!document.cookie.includes('UID=')) {
      document.cookie = `UID=${uid}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    }
    loadUserProfile(uid)
      .then((profile) => {
        if (profile) setUser(profile);
        else localStorage.removeItem('UID');
      })
      .finally(() => setLoading(false));
  }, [loadUserProfile]);

  const login = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
    const uid = credential.user.uid;
    localStorage.setItem('UID', uid);
    document.cookie = `UID=${uid}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    const profile = await loadUserProfile(uid);
    if (profile) {
      setUser(profile);
      return profile;
    }
    const fallback = { uid, name: '', email, type: '', salary: 0, balance: 0, branch: 'New cairo' };
    setUser(fallback);
    return fallback;
  };

  const logout = () => {
    localStorage.removeItem('UID');
    document.cookie = 'UID=; path=/; max-age=0';
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
