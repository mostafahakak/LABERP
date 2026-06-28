'use client';

import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/layout/Header';
import { PageCard, TextField, Snackbar } from '@/components/ui/PageComponents';
import { formatPriceLE } from '@/lib/utils';

export default function InvoiceItemsPageContent() {
  const [items, setItems] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [snack, setSnack] = useState({ message: '', isError: false });

  useEffect(() => {
    return onSnapshot(query(collection(db, 'InvoiceItems'), orderBy('name')), (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const save = async (values) => {
    const name = values.name?.trim();
    const price = parseFloat(values.price);
    if (!name || !price || price <= 0) {
      setSnack({ message: 'Name and valid price required', isError: true });
      return;
    }
    try {
      if (dialog.mode === 'add') await addDoc(collection(db, 'InvoiceItems'), { name, price });
      else await updateDoc(doc(db, 'InvoiceItems', dialog.id), { name, price });
      setDialog(null);
      setSnack({ message: 'Saved', isError: false });
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    }
  };

  return (
    <>
      <Header />
      <PageCard
        title="Invoice Items"
        icon="🧾"
        action={
          <button type="button" onClick={() => setDialog({ mode: 'add' })} className="px-4 py-2 bg-black text-[#c3a28e] rounded-md text-sm">
            + Add Item
          </button>
        }
      >
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between border rounded-lg p-4">
              <div>
                <p className="font-semibold text-black">{item.name}</p>
                <p className="text-sm text-gray-600">{formatPriceLE(item.price)}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDialog({ mode: 'edit', id: item.id, item })} className="px-3 py-1 border rounded-md text-sm">Edit</button>
                <button type="button" onClick={async () => { if (confirm('Delete?')) await deleteDoc(doc(db, 'InvoiceItems', item.id)); }} className="px-3 py-1 border border-red-300 text-red-600 rounded-md text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </PageCard>

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="font-bold text-black mb-4">{dialog.mode === 'add' ? 'Add Item' : 'Edit Item'}</h3>
            <InvoiceItemForm item={dialog.item} onSave={save} onClose={() => setDialog(null)} />
          </div>
        </div>
      )}
      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: '', isError: false })} />
    </>
  );
}

function InvoiceItemForm({ item, onSave, onClose }) {
  const [name, setName] = useState(item?.name || '');
  const [price, setPrice] = useState(item?.price ?? '');

  return (
    <div className="space-y-3">
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <TextField label="Price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
      <div className="flex gap-2 justify-end mt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md">Cancel</button>
        <button type="button" onClick={() => onSave({ name, price })} className="px-4 py-2 bg-black text-[#c3a28e] rounded-md">Save</button>
      </div>
    </div>
  );
}
