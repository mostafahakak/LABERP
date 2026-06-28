'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatPriceLE } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { PageCard } from '@/components/ui/PageComponents';
import FinanceDocCard from './FinanceDocCard';

export default function ViewSupplier({ supplierName: propName, supplierId: propId }) {
  const searchParams = useSearchParams();
  const supplierName = propName || searchParams.get('name') || '';
  const supplierId = propId || searchParams.get('id') || '';

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentPlan, setPaymentPlan] = useState('');
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supplierName && !supplierId) return;
    setLoading(true);
    const base = supplierId
      ? [where('userID', '==', supplierId)]
      : [where('name', '==', supplierName)];
    if (paymentPlan) base.push(where('paymentPlan', '==', paymentPlan));
    if (startDate && endDate) {
      const next = new Date(endDate);
      next.setDate(next.getDate() + 1);
      base.push(where('Date', '>=', startDate), where('Date', '<', next.toISOString().slice(0, 10)));
    }
    base.push(orderBy('Date', 'desc'));
    const q = query(collection(db, 'Finance'), ...base);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setError('');
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [supplierName, supplierId, startDate, endDate, paymentPlan]);

  const totals = useMemo(() => docs.reduce(
    (acc, d) => ({
      total: acc.total + (Number(d.total) || 0),
      paid: acc.paid + (Number(d.paidAmount) || 0),
      remaining: acc.remaining + (Number(d.remainingAmount) || 0),
    }),
    { total: 0, paid: 0, remaining: 0 }
  ), [docs]);

  return (
    <>
      <Header title={`Supplier: ${supplierName}`} />
      <PageCard title="Filters">
        <div className="flex flex-wrap gap-3">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border rounded-md text-black" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border rounded-md text-black" />
          <select value={paymentPlan} onChange={(e) => setPaymentPlan(e.target.value)} className="px-3 py-2 border rounded-md text-black">
            <option value="">All Plans</option>
            <option value="Full Payment">Full Payment</option>
            <option value="Partial Payment">Partial Payment</option>
            <option value="Installments">Installments</option>
          </select>
          <button type="button" onClick={() => { setStartDate(''); setEndDate(''); setPaymentPlan(''); }} className="px-4 py-2 bg-gray-200 rounded-md text-sm">Clear</button>
        </div>
      </PageCard>

      <div className="grid grid-cols-3 gap-4 mb-5">
        {[['Total', totals.total], ['Paid', totals.paid], ['Remaining', totals.remaining]].map(([l, v]) => (
          <div key={l} className="bg-white rounded-xl border p-4 text-center">
            <p className="text-sm text-gray-500">{l}</p>
            <p className="font-bold">{formatPriceLE(v)}</p>
          </div>
        ))}
      </div>

      {loading && <p className="text-center py-8">Loading...</p>}
      {error && <p className="text-center text-red-600">{error}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {docs.map((d) => <FinanceDocCard key={d.id} doc={d} />)}
      </div>
      {!loading && docs.length === 0 && <p className="text-center text-gray-500 py-8">No transactions for this supplier.</p>}
    </>
  );
}
