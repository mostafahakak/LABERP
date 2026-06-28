'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatPriceLE, formatTime } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { PageCard, TextField, SelectField, Snackbar, LoadingOverlay } from '@/components/ui/PageComponents';
import { createPurchaseInvoice, fetchBanksAndDRAccounts } from './finance-helpers';

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

  const total = useMemo(
    () => selectedItems.reduce((s, i) => s + i.price * i.quantity, 0),
    [selectedItems]
  );
  const paidVal = isFullPayment ? total : (parseFloat(paidAmount) || 0);
  const remaining = isFullPayment ? 0 : total - paidVal;

  const addItem = (item) => {
    setSelectedItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, {
        id: item.id,
        itemId: item.id,
        name: item.name,
        price: Number(item.price) || 0,
        quantity: 1,
        docRef: item.docRef,
        previousStock: Number(item.quantity) || 0,
      }];
    });
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
            <select value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full px-3 py-2.5 border border-input rounded-md text-foreground bg-white">
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
        <div className="flex flex-wrap gap-2 mb-4">
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => addItem(item)} className="px-3 py-1.5 bg-muted rounded-lg text-sm text-foreground">
              {item.name} — {formatPriceLE(item.price)}
            </button>
          ))}
        </div>
        {selectedItems.map((item) => (
          <div key={item.id} className="flex justify-between border rounded-lg p-3 mb-2">
            <span>{item.name} x{item.quantity}</span>
            <span>{formatPriceLE(item.price * item.quantity)}</span>
          </div>
        ))}
        <div className="mt-3 text-sm">
          Total: <strong>{formatPriceLE(total)}</strong>
          {!isFullPayment && <> · Remaining: <strong>{formatPriceLE(remaining)}</strong></>}
        </div>
        <button type="button" onClick={submit} disabled={loading} className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground rounded-md">Submit Purchase</button>
      </PageCard>
      <LoadingOverlay show={loading} />
      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: '', isError: false })} />
    </>
  );
}
