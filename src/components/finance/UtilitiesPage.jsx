'use client';

import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/layout/Header';
import { PageCard, TextField, Snackbar } from '@/components/ui/PageComponents';

export default function UtilitiesPage() {
  const [utilities, setUtilities] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [snack, setSnack] = useState({ message: '', isError: false });

  useEffect(() => {
    return onSnapshot(collection(db, 'Utilities'), (snap) => {
      setUtilities(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const addUtility = async () => {
    const n = name.trim();
    if (!n) return;
    await addDoc(collection(db, 'Utilities'), { name: n, balance: 0 });
    setName('');
    setShowAdd(false);
    setSnack({ message: `Utility '${n}' added`, isError: false });
  };

  const remove = async (id, utilityName) => {
    if (!confirm(`Delete utility "${utilityName}"?`)) return;
    await deleteDoc(doc(db, 'Utilities', id));
    setSnack({ message: 'Utility deleted', isError: false });
  };

  return (
    <>
      <Header title="Utilities" />
      <PageCard
        title="Utilities"
        action={
          <button type="button" onClick={() => setShowAdd(true)} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm">+ Add Utility</button>
        }
      >
        {utilities.length === 0 ? (
          <p className="text-gray-500">No utilities found.</p>
        ) : (
          <div className="space-y-3">
            {utilities.map((u) => (
              <div key={u.id} className="flex items-center justify-between border rounded-xl p-4 bg-white">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">🔧</span>
                  <p className="font-semibold text-black">{u.name}</p>
                </div>
                <button type="button" onClick={() => remove(u.id, u.name)} className="text-red-600 px-3 py-1 border border-red-200 rounded-md text-sm">Delete</button>
              </div>
            ))}
          </div>
        )}
      </PageCard>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="font-bold mb-4">Add Utility</h3>
            <TextField label="Utility Name" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex gap-2 justify-end mt-4">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-md">Cancel</button>
              <button type="button" onClick={addUtility} className="px-4 py-2 bg-black text-red-400 rounded-md">Submit</button>
            </div>
          </div>
        </div>
      )}
      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: '', isError: false })} />
    </>
  );
}
