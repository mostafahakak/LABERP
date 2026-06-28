'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatPriceLE } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { PageCard, TextField, Snackbar } from '@/components/ui/PageComponents';

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [snack, setSnack] = useState({ message: '', isError: false });

  useEffect(() => {
    return onSnapshot(collection(db, 'Suppliers'), (snap) => {
      setSuppliers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const addSupplier = async () => {
    const n = name.trim();
    if (!n) return;
    await addDoc(collection(db, 'Suppliers'), { name: n, balance: 0 });
    setName('');
    setShowAdd(false);
    setSnack({ message: `Supplier '${n}' added`, isError: false });
  };

  const remove = async (id, supplierName) => {
    if (!confirm(`Delete supplier "${supplierName}"?`)) return;
    await deleteDoc(doc(db, 'Suppliers', id));
    setSnack({ message: 'Supplier deleted', isError: false });
  };

  return (
    <>
      <Header title="Suppliers" />
      <PageCard
        title="Suppliers"
        action={
          <button type="button" onClick={() => setShowAdd(true)} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm">+ Add Supplier</button>
        }
      >
        {suppliers.length === 0 ? (
          <p className="text-gray-500">No suppliers found.</p>
        ) : (
          <div className="space-y-3">
            {suppliers.map((s) => (
              <div key={s.id} className="flex items-center justify-between border rounded-xl p-4 bg-white">
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/hr/suppliers/view?name=${encodeURIComponent(s.name)}&id=${s.id}`)}
                  className="flex-1 text-left flex items-center gap-4"
                >
                  <span className="text-2xl">🚚</span>
                  <div>
                    <p className="font-semibold text-black">{s.name}</p>
                    <p className="text-sm text-gray-500">Balance: {formatPriceLE(s.balance)}</p>
                  </div>
                </button>
                <button type="button" onClick={() => remove(s.id, s.name)} className="text-red-600 px-3 py-1 border border-red-200 rounded-md text-sm">Delete</button>
              </div>
            ))}
          </div>
        )}
      </PageCard>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="font-bold mb-4">Add Supplier</h3>
            <TextField label="Supplier Name" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex gap-2 justify-end mt-4">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-md">Cancel</button>
              <button type="button" onClick={addSupplier} className="px-4 py-2 bg-black text-red-400 rounded-md">Submit</button>
            </div>
          </div>
        </div>
      )}
      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: '', isError: false })} />
    </>
  );
}
