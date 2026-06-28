'use client';

import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import Header from '@/components/layout/Header';
import { PageCard, Snackbar, LoadingOverlay } from '@/components/ui/PageComponents';
import { formatDate, formatTime } from '@/lib/utils';

export default function UsagePage() {
  const { user } = useAuth();
  const [allItems, setAllItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState({ message: '', isError: false });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'Items'));
      setAllItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setSnack({ message: `Error fetching items: ${e.message}`, isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const addItem = (itemId) => {
    if (!itemId) return;
    const item = allItems.find((i) => i.id === itemId);
    if (!item) return;
    setSelectedItems((prev) => {
      const idx = prev.findIndex((s) => s.id === itemId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantityToUse: next[idx].quantityToUse + 1 };
        return next;
      }
      return [...prev, { ...item, quantityToUse: 1 }];
    });
  };

  const removeItem = (index) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const adjustQuantity = (index, delta) => {
    setSelectedItems((prev) => {
      const next = [...prev];
      const entry = next[index];
      const available = Number(entry.quantity) || 0;
      const newQty = entry.quantityToUse + delta;
      if (newQty <= 0) {
        next.splice(index, 1);
        return next;
      }
      if (newQty > available) {
        setSnack({ message: `Cannot use more than available stock (${available}).`, isError: true });
        return prev;
      }
      next[index] = { ...entry, quantityToUse: newQty };
      return next;
    });
  };

  const totalCount = selectedItems.reduce((sum, item) => sum + item.quantityToUse, 0);

  const submitUsage = async () => {
    if (selectedItems.length === 0) {
      setSnack({ message: 'Please select at least one item for usage.', isError: true });
      return;
    }

    for (const item of selectedItems) {
      const available = Number(item.quantity) || 0;
      if (item.quantityToUse <= 0) {
        setSnack({ message: 'Quantity to use must be positive for all selected items.', isError: true });
        return;
      }
      if (item.quantityToUse > available) {
        setSnack({
          message: `Cannot use ${item.name} as quantity to use (${item.quantityToUse}) exceeds available stock (${available}).`,
          isError: true,
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const now = new Date();
      const logDate = formatDate(now);
      const logTime = formatTime(now);
      const batch = writeBatch(db);

      for (const item of selectedItems) {
        const availableQuantity = Number(item.quantity) || 0;
        const quantityToUse = item.quantityToUse;
        const newQuantity = availableQuantity - quantityToUse;
        const itemRef = doc(db, 'Items', item.id);
        batch.update(itemRef, { quantity: newQuantity });
      }

      await batch.commit();

      for (const item of selectedItems) {
        const availableQuantity = Number(item.quantity) || 0;
        const quantityToUse = item.quantityToUse;
        const newQuantity = availableQuantity - quantityToUse;

        const invRef = await addDoc(collection(db, 'Inventory'), {
          Time: logTime,
          Date: logDate,
          userId: user?.uid || '',
          userName: user?.name || '',
          usageType: 'Out',
          itemId: item.id,
          itemName: item.name,
          quantityUsed: quantityToUse,
          previousStock: availableQuantity,
          newStock: newQuantity,
          category: item.category,
          supplier: item.supplier,
          amount: (Number(item.price) || 0) * quantityToUse,
        });

        await addDoc(collection(db, 'Logs'), {
          actionID: invRef.id,
          section: 'Inventory',
          adminID: user?.uid || '',
          adminName: user?.name || '',
          branch: user?.branch || 'New cairo',
          type: 'Expense',
          cName: item.supplier,
          name: 'Inventory',
          Time: logTime,
          Date: logDate,
          amount: 0,
          bank: '',
        });
      }

      setSnack({ message: 'Inventory usage recorded successfully!', isError: false });
      setSelectedItems([]);
      fetchItems();
    } catch (e) {
      setSnack({ message: `Error submitting usage: ${e.message}`, isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <PageCard title="Inventory Usage" icon="📤">
        <div className="bg-muted border rounded-xl p-4 mb-6">
          <p className="font-semibold text-foreground">Record Inventory Usage</p>
          <p className="text-sm text-muted-foreground mt-1">Select items and quantities to record usage</p>
        </div>

        <div className="border rounded-xl p-4 mb-6">
          <p className="font-semibold text-foreground mb-3">Select Item</p>
          {loading ? (
            <p className="text-muted-foreground text-center py-6">Loading items...</p>
          ) : (
            <select
              defaultValue=""
              onChange={(e) => {
                addItem(e.target.value);
                e.target.value = '';
              }}
              className="w-full px-3 py-2.5 border border-input rounded-md text-foreground bg-card"
            >
              <option value="">Choose an item to use</option>
              {allItems.map((item) => {
                const stock = Number(item.quantity) || 0;
                return (
                  <option key={item.id} value={item.id} disabled={stock <= 0}>
                    {item.name || 'N/A'} — Stock: {stock}
                  </option>
                );
              })}
            </select>
          )}
        </div>

        <div className="border rounded-xl p-4 mb-6">
          <p className="font-semibold text-foreground mb-3">Selected Items</p>
          {selectedItems.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p className="font-medium">No items selected</p>
              <p className="text-sm mt-1">Select items from the dropdown above</p>
            </div>
          ) : (
            <>
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mb-4 flex justify-between items-center">
                <span className="font-semibold text-foreground">Total Items:</span>
                <span className="text-xl font-bold text-primary">{totalCount}</span>
              </div>
              <div className="space-y-3">
                {selectedItems.map((item, index) => {
                  const available = Number(item.quantity) || 0;
                  const price = Number(item.price) || 0;
                  const totalPrice = price * item.quantityToUse;
                  return (
                    <div key={item.id} className="border rounded-lg p-4 bg-muted">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-semibold text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Available: {available}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={submitting}
                          className="text-destructive text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-2 border rounded-lg bg-card px-2 py-1">
                          <button
                            type="button"
                            onClick={() => adjustQuantity(index, -1)}
                            disabled={submitting}
                            className="text-destructive px-2 text-lg"
                          >
                            −
                          </button>
                          <span className="font-bold text-lg w-8 text-center">{item.quantityToUse}</span>
                          <button
                            type="button"
                            onClick={() => adjustQuantity(index, 1)}
                            disabled={submitting}
                            className="text-green-600 px-2 text-lg"
                          >
                            +
                          </button>
                        </div>
                        <span className="font-semibold text-primary">{totalPrice.toFixed(2)} LE</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={submitUsage}
          disabled={submitting || selectedItems.length === 0}
          className="w-full py-4 bg-primary text-white font-semibold rounded-xl disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Usage'}
        </button>
      </PageCard>

      <LoadingOverlay show={submitting} />
      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: '', isError: false })} />
    </>
  );
}
