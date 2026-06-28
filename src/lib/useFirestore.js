'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';

export function useCollection(collectionName, constraints = [], deps = []) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const q = constraints.length
      ? query(collection(db, collectionName), ...constraints)
      : collection(db, collectionName);

    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, ...deps]);

  return { items, loading, error };
}

export { query, where, orderBy, limit, collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, writeBatch, increment } from 'firebase/firestore';
