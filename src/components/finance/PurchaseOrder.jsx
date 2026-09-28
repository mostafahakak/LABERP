'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatPriceLE, formatTime } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { PageCard, TextField, SelectField, Snackbar, LoadingOverlay } from '@/components/ui/PageComponents';
import { createPurchaseInvoice, fetchBanksAndDRAccounts } from './finance-helpers';

function itemGroupKey(item) {
  const nameKey = String(item?.name || '').trim().toLowerCase();
  if (nameKey) return `name:${nameKey}`;
  const id = item?.itemId || item?.id;
  return id ? `id:${id}` : '';
}

function itemColorStyle(index) {
  const hue = Math.round((index * 137.508) % 360);
  return {
    backgroundColor: `hsl(${hue} 62% 90%)`,
    borderColor: `hsl(${hue} 42% 72%)`,
    color: `hsl(${hue} 38% 22%)`,
  };
}

function groupItemsByIdOrName(list) {
  const groups = new Map();
  for (const item of list) {
    const key = itemGroupKey(item);
    if (!key) continue;
    const rawQty = Number(item.quantity);
    const qty = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
    const existing = groups.get(key);
    if (existing) {
      existing.quantity += qty;
    } else {
      groups.set(key, { ...item, quantity: qty });
    }
  }
  return Array.from(groups.values());
}

export default function PurchaseOrder() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [bankName, setBankName] = useState('');
  const [isFullPayment, setIsFullPayment] = useState(true);
  const [paidAmount, setPaidAmount] = useState('0');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(formatDate(new Date()));
  const [time, setTime] = useState(formatTime());
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ message: '', isError: false });
  const [activeItem, setActiveItem] = useState(null);
  const [draftQty, setDraftQty] = useState(1);

  useEffect(() => {
    if (!activeItem) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setActiveItem(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeItem]);

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'Items')),
      getDocs(collection(db, 'Suppliers')),
      fetchBanksAndDRAccounts(),
    ]).then(([itemsSnap, supSnap, accs]) => {
      setItems(itemsSnap.docs.map((d) => ({ id: d.id, docRef: d.ref, ...d.data() })));
      setSuppliers(supSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setAccounts(accs);
    });
  }, []);

  const groupedCatalogItems = useMemo(() => {
    const groups = new Map();
    for (const item of items) {
      const key = itemGroupKey(item);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, item);
    }
    return Array.from(groups.values());
  }, [items]);
  const colorIndexByKey = useMemo(() => {
    const map = new Map();
    groupedCatalogItems.forEach((item, index) => map.set(itemGroupKey(item), index));
    return map;
  }, [groupedCatalogItems]);
  const groupedSelectedItems = useMemo(
    () => groupItemsByIdOrName(selectedItems),
    [selectedItems]
  );
  const total = useMemo(
    () => selectedItems.reduce((s, i) => s + i.price * i.quantity, 0),
    [selectedItems]
  );
  const paidVal = isFullPayment ? total : (parseFloat(paidAmount) || 0);
  const remaining = isFullPayment ? 0 : total - paidVal;

  const openItem = (item) => {
    const existing = selectedItems.find((selected) => selected.id === item.id);
    setDraftQty(existing?.quantity || 1);
    setActiveItem(item);
  };

  const saveQuantity = () => {
    if (!activeItem) return;
    const quantity = Math.max(0, Math.floor(Number(draftQty) || 0));
    setSelectedItems((prev) => {
      const idx = prev.findIndex((selected) => selected.id === activeItem.id);
      if (quantity <= 0) return idx >= 0 ? prev.filter((_, index) => index !== idx) : prev;
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity };
        return next;
      }
      return [...prev, {
        id: activeItem.id,
        itemId: activeItem.id,
        name: activeItem.name,
        price: Number(activeItem.price) || 0,
        quantity,
        docRef: activeItem.docRef,
        previousStock: Number(activeItem.quantity) || 0,
      }];
    });
    setActiveItem(null);
  };

  const selectSupplier = (name) => {
    const s = suppliers.find((x) => x.name === name);
    setSupplierName(name);
    setSupplierId(s?.id || '');
  };

  const submit = async () => {
    if (!supplierId || !bankName || selectedItems.length === 0) {
      setSnack({ message: 'Select supplier, bank, and items', isError: true });
      return;
    }
    const account = accounts.find((a) => a.name === bankName);
    if (!account) return;
    if (account.sourceCollection !== 'Users' && account.balance < paidVal) {
      setSnack({ message: 'Insufficient bank balance', isError: true });
      return;
    }
    setLoading(true);
    try {
      const supplierSnap = await getDoc(doc(db, 'Suppliers', supplierId));
      const supplierBalanceBefore = Number(supplierSnap.data()?.balance) || 0;
      await createPurchaseInvoice({
        user,
        supplierId,
        supplierName,
        supplierBalanceBefore,
        selectedAccount: account,
        items: selectedItems,
        total,
        paidAmount: paidVal,
        isFullPayment,
        note,
        date,
        time,
      });
      setSnack({ message: 'Purchase invoice submitted', isError: false });
      setSelectedItems([]);
      setSupplierId('');
      setSupplierName('');
      setBankName('');
      setPaidAmount('0');
      setNote('');
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Purchase Invoice" />
      <PageCard title="Purchase Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField label="Supplier" value={supplierName} onChange={(v) => selectSupplier(v)} options={suppliers.map((s) => s.name)} />
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Payment Method / DR Account</label>
            <select value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full px-3 py-2.5 border border-input rounded-md text-foreground bg-card">
              <option value="">Select...</option>
              {accounts.map((a) => (
                <option key={`${a.sourceCollection}-${a.id}`} value={a.name}>
                  {a.name} ({formatPriceLE(a.balance)} — {a.sourceCollection === 'Users' ? 'DR Account' : 'Bank'})
                </option>
              ))}
            </select>
          </div>
          <TextField label="Date" value={date} onChange={(e) => setDate(e.target.value)} type="date" />
          <TextField label="Time" value={time} onChange={(e) => setTime(e.target.value)} />
          <TextField label="Note" value={note} onChange={(e) => setNote(e.target.value)} required={false} className="md:col-span-2" />
          <label className="flex items-center gap-2 text-foreground">
            <input type="checkbox" checked={isFullPayment} onChange={(e) => setIsFullPayment(e.target.checked)} />
            Full Payment
          </label>
          {!isFullPayment && (
            <TextField label="Paid Amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} type="number" />
          )}
        </div>
      </PageCard>

      <PageCard title="Items">
        <div className="flex flex-wrap gap-1.5">
          {groupedCatalogItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openItem(item)}
              style={itemColorStyle(index)}
              className="rounded-md border px-2 py-1 text-xs hover:opacity-80"
            >
              {item.name}
              <span className="ml-1.5 opacity-70">{formatPriceLE(item.price)}</span>
            </button>
          ))}
        </div>
        {groupedSelectedItems.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-3">
            {groupedSelectedItems.map((item) => (
              <button
                key={item.itemId || item.id || item.name}
                type="button"
                onClick={() => openItem(item)}
                style={itemColorStyle(colorIndexByKey.get(itemGroupKey(item)) ?? 0)}
                className="rounded-md border px-2 py-1 text-xs hover:opacity-80"
              >
                {item.quantity} × {item.name}
                <span className="ml-1.5 opacity-70">{formatPriceLE(item.price)}</span>
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            Total <span className="font-medium text-foreground">{formatPriceLE(total)}</span>
            {!isFullPayment && (
              <>
                {' '}· Remaining <span className="font-medium text-foreground">{formatPriceLE(remaining)}</span>
              </>
            )}
          </span>
          <button type="button" onClick={submit} disabled={loading} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
            Submit
          </button>
        </div>
      </PageCard>
      {activeItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setActiveItem(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-qty-title"
            className="w-full max-w-sm rounded-xl bg-card p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="item-qty-title" className="text-base font-semibold text-foreground">Quantity</h3>
            <div
              className="mt-3 rounded-md border px-3 py-2 text-sm"
              style={itemColorStyle(colorIndexByKey.get(itemGroupKey(activeItem)) ?? 0)}
            >
              {activeItem.name}
              <span className="ml-2 opacity-70">{formatPriceLE(activeItem.price)}</span>
            </div>
            <div className="mt-5 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setDraftQty((qty) => Math.max(0, qty - 1))}
                className="h-10 w-10 rounded-md border border-input text-lg text-foreground"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="min-w-8 text-center text-2xl font-semibold text-foreground">{draftQty}</span>
              <button
                type="button"
                onClick={() => setDraftQty((qty) => qty + 1)}
                className="h-10 w-10 rounded-md border border-input text-lg text-foreground"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Line total {formatPriceLE((Number(activeItem.price) || 0) * draftQty)}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setActiveItem(null)} className="rounded-md border px-4 py-2 text-sm text-foreground">
                Cancel
              </button>
              <button type="button" onClick={saveQuantity} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
                {draftQty <= 0 ? 'Remove' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      <LoadingOverlay show={loading} />
      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: '', isError: false })} />
    </>
  );
}
