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
import { ReceiptText, Plus, PencilLine, Trash2, PackageOpen, Sparkles } from 'lucide-react';

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
        className="border-primary/20 bg-gradient-to-b from-card to-card/90 shadow-xl shadow-primary/5"
        action={
          <button type="button" onClick={() => setDialog({ mode: 'add' })} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-95">
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        }
      >
        <section className="relative mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5">
          <div className="absolute -right-12 -top-10 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
          <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Billing Catalog</p>
              <h2 className="text-2xl font-semibold text-foreground">Invoice Item Library</h2>
              <p className="text-sm text-muted-foreground">Manage reusable service and product lines for invoicing.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground">
              <ReceiptText className="h-4 w-4 text-primary" />
              {items.length} items
            </div>
          </div>
        </section>

        <div className="space-y-3">
          {items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-8 text-center">
              <p className="text-base font-medium text-foreground">No invoice items yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Add your first item to build a reusable billing catalog.</p>
            </div>
          )}

          {items.map((item) => (
            <article key={item.id} className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
              <div className="absolute -top-8 right-0 h-16 w-16 rounded-full bg-primary/10 blur-2xl opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg border border-primary/25 bg-primary/10 p-1.5 text-primary">
                      <PackageOpen className="h-4 w-4" />
                    </span>
                    <p className="truncate font-semibold text-foreground">{item.name}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{formatPriceLE(item.price)}</p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => setDialog({ mode: 'edit', id: item.id, item })} className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/80 px-3 py-1.5 text-sm hover:border-primary/35 hover:bg-primary/10">
                    <PencilLine className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button type="button" onClick={async () => { if (confirm('Delete?')) await deleteDoc(doc(db, 'InvoiceItems', item.id)); }} className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </PageCard>

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-primary/25 bg-card p-6 shadow-2xl shadow-black/20">
            <div className="mb-4 flex items-center gap-2">
              <span className="rounded-lg border border-primary/25 bg-primary/10 p-1.5 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <h3 className="font-bold text-foreground">{dialog.mode === 'add' ? 'Add Item' : 'Edit Item'}</h3>
            </div>
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
        <button type="button" onClick={onClose} className="rounded-lg border border-border/80 px-4 py-2 hover:bg-muted/40">Cancel</button>
        <button type="button" onClick={() => onSave({ name, price })} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground shadow-sm transition hover:opacity-95">Save</button>
      </div>
    </div>
  );
}
