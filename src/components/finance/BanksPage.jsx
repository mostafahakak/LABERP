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
      <div className="bg-card rounded-xl p-6 max-w-md w-full">
        <h3 className="font-bold text-foreground mb-2">Transfer from {bank.name}</h3>
        <p className="text-green-700 font-semibold mb-4">Balance: {formatPriceLE(bank.balance)}</p>
        <TextField label="Amount (LE)" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" />
        <div className="mt-3">
          <label className="text-sm text-muted-foreground">Transfer To</label>
          <select value={destId} onChange={(e) => setDestId(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md text-foreground">
            <option value="">Select bank...</option>
            {banks.filter((b) => b.id !== bank.id).map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-destructive text-sm mt-2">{error}</p>}
        <div className="flex gap-2 justify-end mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md">Cancel</button>
          <button type="button" onClick={submit} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">Transfer</button>
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
      <div className="bg-card rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <h3 className="font-bold text-foreground mb-4">Transfer History — {bankName}</h3>
        <div className="flex gap-2 mb-4">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-2 py-1 border rounded text-foreground text-sm" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-2 py-1 border rounded text-foreground text-sm" />
        </div>
        {transfers.length === 0 ? <p className="text-muted-foreground">No transfers found.</p> : (
          <div className="space-y-2">
            {transfers.map((t) => (
              <div key={t.id} className="border rounded-lg p-3 text-sm">
                <p className="font-medium text-foreground">{t.from} → {t.to}</p>
                <p className="text-muted-foreground">{t.date} {t.time} — {formatPriceLE(t.amount)}</p>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={onClose} className="mt-4 w-full py-2 border rounded-md">Close</button>
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

  return (
    <>
      <Header title="Payment Methods" />
      <PageCard
        title="Banks"
        action={
          <button type="button" onClick={() => setShowAdd(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">+ Add Bank</button>
        }
      >
        {Object.entries(grouped).map(([type, list]) => (
          <div key={type} className="mb-6">
            <h3 className="font-semibold text-foreground mb-3">{type}</h3>
            <div className="space-y-3">
              {list.map((bank) => (
                <div key={bank.id} className="flex flex-wrap items-center justify-between gap-3 border rounded-xl p-4 bg-card">
                  <div>
                    <p className="font-bold text-foreground">{bank.name}</p>
                    <p className="text-green-700 font-semibold">{formatPriceLE(bank.balance)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => router.push(`/dashboard/finance/banks/transactions?bank=${encodeURIComponent(bank.name)}&id=${bank.id}`)} className="px-3 py-1.5 border rounded-md text-sm">Transactions</button>
                    <button type="button" onClick={() => setTransferBank(bank)} className="px-3 py-1.5 border rounded-md text-sm">Transfer</button>
                    <button type="button" onClick={() => setHistoryBank(bank.name)} className="px-3 py-1.5 border rounded-md text-sm">History</button>
                    <button type="button" onClick={() => removeBank(bank.id, bank.name)} className="px-3 py-1.5 border border-red-300 text-destructive rounded-md text-sm">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {banks.length === 0 && <p className="text-muted-foreground">No banks found.</p>}
      </PageCard>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-xl p-6 max-w-md w-full">
            <h3 className="font-bold mb-4">Add Payment Method</h3>
            <TextField label="Name" value={addName} onChange={(e) => setAddName(e.target.value)} />
            <div className="flex gap-2 justify-end mt-4">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-md">Cancel</button>
              <button type="button" onClick={addBank} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">Submit</button>
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
