'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatPriceLE } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { PageCard } from '@/components/ui/PageComponents';

export default function BankTransactions() {
  const searchParams = useSearchParams();
  const selectedBankName = searchParams.get('bank') || '';
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedPaymentPlan, setSelectedPaymentPlan] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedBankName) return;
    setLoading(true);
    const constraints = [
      where('bank', '==', selectedBankName),
      orderBy('Date', 'desc'),
      orderBy('Time', 'desc'),
      limit(200),
    ];
    if (selectedType) constraints.unshift(where('type', '==', selectedType));
    if (selectedPaymentPlan) constraints.unshift(where('paymentPlan', '==', selectedPaymentPlan));
    if (startDate) constraints.unshift(where('Date', '>=', startDate));
    if (endDate) {
      const next = new Date(endDate);
      next.setDate(next.getDate() + 1);
      constraints.unshift(where('Date', '<', next.toISOString().slice(0, 10)));
    }

    const q = query(collection(db, 'Logs'), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setError('');
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [selectedBankName, startDate, endDate, selectedType, selectedPaymentPlan]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    logs.forEach((l) => {
      const amt = Number(l.amount) || 0;
      if (l.type === 'Income') income += amt;
      else if (l.type === 'Expense') expense += amt;
    });
    return { income, expense, net: income - expense };
  }, [logs]);

  if (!selectedBankName) {
    return (
      <>
        <Header title="Bank Transactions" />
        <p className="text-gray-500">Select a bank from the Banks page.</p>
      </>
    );
  }

  return (
    <>
      <Header title={`Transactions — ${selectedBankName}`} />
      <PageCard title="Filters">
        <div className="flex flex-wrap gap-3">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border rounded-md text-black" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border rounded-md text-black" />
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="px-3 py-2 border rounded-md text-black">
            <option value="">All Types</option>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
          </select>
          <select value={selectedPaymentPlan} onChange={(e) => setSelectedPaymentPlan(e.target.value)} className="px-3 py-2 border rounded-md text-black">
            <option value="">All Payment Plans</option>
            <option value="Full Payment">Full Payment</option>
            <option value="Partial Payment">Partial Payment</option>
            <option value="Installments">Installments</option>
          </select>
          <button type="button" onClick={() => { setStartDate(''); setEndDate(''); setSelectedType(''); setSelectedPaymentPlan(''); }} className="px-4 py-2 bg-gray-200 rounded-md text-sm">Clear</button>
        </div>
      </PageCard>

      <div className="grid grid-cols-3 gap-4 mb-5">
        {[['Income', totals.income, 'text-green-600'], ['Expense', totals.expense, 'text-red-600'], ['Net', totals.net, 'text-black']].map(([l, v, c]) => (
          <div key={l} className="bg-white rounded-xl border p-4 text-center">
            <p className="text-sm text-gray-500">{l}</p>
            <p className={`text-lg font-bold ${c}`}>{formatPriceLE(v)}</p>
          </div>
        ))}
      </div>

      {loading && <p className="text-center py-8">Loading...</p>}
      {error && <p className="text-center text-red-600">{error}</p>}
      {!loading && logs.length === 0 && <p className="text-center text-gray-500">No transactions.</p>}
      <div className="space-y-2">
        {logs.map((l) => (
          <div key={l.id} className="bg-white border rounded-xl p-4 flex justify-between gap-3">
            <div>
              <p className="font-medium text-black">{l.name} — {l.cName}</p>
              <p className="text-sm text-gray-600">{l.Date} {l.Time} · {l.type}</p>
              {l.paymentPlan && <p className="text-xs text-gray-500">{l.paymentPlan}</p>}
            </div>
            <p className={`font-bold ${l.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
              {l.type === 'Income' ? '+' : '-'}{formatPriceLE(l.amount)}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
