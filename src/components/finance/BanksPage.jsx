'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatPriceLE, formatTime } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { PageCard, TextField, Snackbar, LoadingOverlay } from '@/components/ui/PageComponents';

function TransferDialog({ bank, banks, onClose, onDone }) {
  const { user } = useAuth();
  const [destId, setDestId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    const val = parseFloat(amount);
    if (!destId || !val || val <= 0) { setError('Enter amount and destination'); return; }
    if (val > (Number(bank.balance) || 0)) { setError('Insufficient balance'); return; }
    try {
      const destSnap = await getDoc(doc(db, 'Banks', destId));
      const destData = destSnap.data();
      const destBalance = Number(destData.balance) || 0;
      const batch = writeBatch(db);
      batch.update(doc(db, 'Banks', bank.id), { balance: (Number(bank.balance) || 0) - val });
      batch.update(doc(db, 'Banks', destId), { balance: destBalance + val });
      const now = new Date();
      batch.set(doc(collection(db, 'BankTransfers')), {
        date: formatDate(now),
        time: formatTime(now),
        amount: val,
        from: bank.name,
        to: destData.name,
        user: user?.uid || '',
        timestamp: serverTimestamp(),
      });
      await batch.commit();
      onDone(`Transferred ${val} LE to ${destData.name}`);
      onClose();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border/70 p-6 max-w-md w-full shadow-2xl shadow-primary/10">
        <h3 className="font-bold text-foreground mb-2">Transfer from {bank.name}</h3>
        <p className="text-green-700 font-semibold mb-4">Balance: {formatPriceLE(bank.balance)}</p>
        <TextField label="Amount (LE)" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" />
        <div className="mt-3">
          <label className="text-sm text-muted-foreground">Transfer To</label>
          <select value={destId} onChange={(e) => setDestId(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md text-foreground bg-background/70">
            <option value="">Select bank...</option>
            {banks.filter((b) => b.id !== bank.id).map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-destructive text-sm mt-2">{error}</p>}
        <div className="flex gap-2 justify-end mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0">Cancel</button>
          <button type="button" onClick={submit} className="px-4 py-2 bg-primary text-primary-foreground rounded-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/20 active:translate-y-0">Transfer</button>
        </div>
      </div>
    </div>
  );
}

function TransfersHistoryDialog({ bankName, onClose }) {
  const [transfers, setTransfers] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'BankTransfers'), (snap) => {
      let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list = list.filter((t) => t.from === bankName || t.to === bankName);
      if (startDate) list = list.filter((t) => t.date >= startDate);
      if (endDate) list = list.filter((t) => t.date <= endDate);
      list.sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
      setTransfers(list);
    });
    return () => unsub();
  }, [bankName, startDate, endDate]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border/70 p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl shadow-primary/10">
        <h3 className="font-bold text-foreground mb-4">Transfer History — {bankName}</h3>
        <div className="flex gap-2 mb-4">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-2 py-1 border rounded text-foreground text-sm bg-background/70" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-2 py-1 border rounded text-foreground text-sm bg-background/70" />
        </div>
        {transfers.length === 0 ? <p className="text-muted-foreground">No transfers found.</p> : (
          <div className="space-y-2">
            {transfers.map((t) => (
              <div key={t.id} className="border border-border/70 rounded-lg p-3 text-sm bg-background/40">
                <p className="font-medium text-foreground">{t.from} → {t.to}</p>
                <p className="text-muted-foreground">{t.date} {t.time} — {formatPriceLE(t.amount)}</p>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={onClose} className="mt-4 w-full py-2 border rounded-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0">Close</button>
      </div>
    </div>
  );
}

export default function BanksPage() {
  const router = useRouter();
  const [banks, setBanks] = useState([]);
  const [addName, setAddName] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [transferBank, setTransferBank] = useState(null);
  const [historyBank, setHistoryBank] = useState(null);
  const [snack, setSnack] = useState({ message: '', isError: false });

  useEffect(() => {
    return onSnapshot(collection(db, 'Banks'), (snap) => {
      setBanks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const addBank = async () => {
    const name = addName.trim();
    if (!name) return;
    await addDoc(collection(db, 'Banks'), { name, balance: 0 });
    setAddName('');
    setShowAdd(false);
    setSnack({ message: `Bank '${name}' added`, isError: false });
  };

  const removeBank = async (id, name) => {
    if (!confirm(`Delete bank "${name}"?`)) return;
    await deleteDoc(doc(db, 'Banks', id));
    setSnack({ message: 'Bank deleted', isError: false });
  };

  const grouped = banks.reduce((acc, b) => {
    const type = b.type || 'General';
    if (!acc[type]) acc[type] = [];
    acc[type].push(b);
    return acc;
  }, {});

  const totalBalance = banks.reduce((sum, b) => sum + (Number(b.balance) || 0), 0);

  return (
    <>
      <Header title="Payment Methods" />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-secondary p-5 text-secondary-foreground shadow-md">
          <p className="text-xs uppercase tracking-widest text-primary">Total Balance</p>
          <p className="mt-1 text-2xl font-extrabold">{formatPriceLE(totalBalance)}</p>
          <p className="mt-1 text-xs text-secondary-foreground/60">{banks.length} payment method{banks.length !== 1 ? 's' : ''}</p>
        </div>
        {banks.map((b) => (
          <div key={b.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{b.name}</p>
            <p className={`mt-1 text-xl font-bold ${(Number(b.balance) || 0) >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {formatPriceLE(b.balance)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">Payment Methods</h2>
        <button type="button" onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm">
          + Add Bank
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {banks.map((bank) => (
          <div key={bank.id} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-lg hover:border-primary/25">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl opacity-0 group-hover:opacity-100" />
            <div className="relative flex items-start justify-between gap-3 mb-4">
              <div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm">
                  {(bank.name || 'B').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-lg truncate">{bank.name}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{bank.type || 'General'}</p>
              </div>
              <p className={`text-lg font-extrabold whitespace-nowrap ${(Number(bank.balance) || 0) >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {formatPriceLE(bank.balance)}
              </p>
            </div>
            <div className="relative flex flex-wrap gap-2">
              <button type="button" onClick={() => router.push(`/dashboard/finance/banks/transactions?bank=${encodeURIComponent(bank.name)}&id=${bank.id}`)} className="flex-1 min-w-22.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted/60">
                Transactions
              </button>
              <button type="button" onClick={() => setTransferBank(bank)} className="flex-1 min-w-17.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted/60">
                Transfer
              </button>
              <button type="button" onClick={() => setHistoryBank(bank.name)} className="flex-1 min-w-15 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted/60">
                History
              </button>
              <button type="button" onClick={() => removeBank(bank.id, bank.name)} className="px-3 py-2 rounded-xl border border-destructive/30 text-xs font-semibold text-destructive hover:bg-destructive/10">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {banks.length === 0 && (
        <div className="text-center py-16 text-muted-foreground rounded-2xl border border-dashed border-border">
          <p className="text-4xl mb-3">🏦</p>
          <p>No payment methods found.</p>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border/70 p-6 max-w-md w-full shadow-2xl shadow-primary/10">
            <h3 className="font-bold mb-4">Add Payment Method</h3>
            <TextField label="Name" value={addName} onChange={(e) => setAddName(e.target.value)} />
            <div className="flex gap-2 justify-end mt-4">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0">Cancel</button>
              <button type="button" onClick={addBank} className="px-4 py-2 bg-primary text-primary-foreground rounded-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/20 active:translate-y-0">Submit</button>
            </div>
          </div>
        </div>
      )}
      {transferBank && <TransferDialog bank={transferBank} banks={banks} onClose={() => setTransferBank(null)} onDone={(m) => setSnack({ message: m, isError: false })} />}
      {historyBank && <TransfersHistoryDialog bankName={historyBank} onClose={() => setHistoryBank(null)} />}
      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: '', isError: false })} />
    </>
  );
}
