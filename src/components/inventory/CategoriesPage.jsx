'use client';

import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/layout/Header';
import { PageCard, TextField, Snackbar, LoadingOverlay } from '@/components/ui/PageComponents';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ message: '', isError: false });

  useEffect(() => {
    return onSnapshot(
      collection(db, 'Categories'),
      (snap) => {
        setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, []);

  const addCategory = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'Categories'), { name: trimmed });
      setDialogOpen(false);
      setName('');
      setSnack({ message: 'Category added successfully', isError: false });
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async (id, categoryName) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"?`)) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'Categories', id));
      setSnack({ message: 'Category deleted', isError: false });
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header />
      <PageCard
        title="Categories"
        icon="📂"
        action={
          <button
            type="button"
            onClick={() => { setName(''); setDialogOpen(true); }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
          >
            + Add Category
          </button>
        }
      >
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : categories.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No categories found.</p>
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📂</span>
                  <p className="font-semibold text-foreground">{cat.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeCategory(cat.id, cat.name)}
                  className="px-3 py-1 border border-red-300 text-destructive rounded-md text-sm"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </PageCard>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-xl p-6 max-w-md w-full">
            <h3 className="font-bold text-foreground mb-4">Add New Category</h3>
            <TextField label="Category Name" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex gap-2 justify-end mt-6">
              <button type="button" onClick={() => setDialogOpen(false)} className="px-4 py-2 border rounded-md text-foreground">
                Cancel
              </button>
              <button type="button" onClick={addCategory} disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      <LoadingOverlay show={saving} />
      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: '', isError: false })} />
    </>
  );
}
