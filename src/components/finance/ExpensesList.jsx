'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatPriceLE } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { PageCard, Snackbar } from '@/components/ui/PageComponents';
import FinanceDocCard from './FinanceDocCard';
import { DEFAULT_EXPENSE_TYPES } from './finance-helpers';

export default function ExpensesList() {
  const [allDocs, setAllDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nameOptions, setNameOptions] = useState([]);
  const [phoneOptions, setPhoneOptions] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [status, setStatus] = useState('');
  const [paymentPlan, setPaymentPlan] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [snack, setSnack] = useState('');

  useEffect(() => {
    getDocs(collection(db, 'Users')).then((snap) => {
      const names = new Set();
      const phones = new Set();
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.name) names.add(String(data.name));
        if (data.phone) phones.add(String(data.phone));
      });
      setNameOptions([...names].sort());
      setPhoneOptions([...phones].sort());
    });
  }, []);

  useEffect(() => {
    const constraints = [orderBy('Date', 'desc'), orderBy('Time', 'desc')];
    if (selectedTypes.length === 1) constraints.unshift(where('type', '==', selectedTypes[0]));
    else if (selectedTypes.length > 1) constraints.unshift(where('type', 'in', selectedTypes.slice(0, 10)));
    if (status) constraints.unshift(where('status', '==', status));
    if (paymentPlan) constraints.unshift(where('paymentPlan', '==', paymentPlan));
    if (startDate) constraints.unshift(where('Date', '>=', startDate));
    if (endDate) constraints.unshift(where('Date', '<=', endDate));
    if (phoneFilter) constraints.unshift(where('phone', '==', phoneFilter));
    if (nameFilter) constraints.unshift(where('name', '==', nameFilter));

    const q = query(collection(db, 'Finance'), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAllDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        setSnack(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [selectedTypes, status, paymentPlan, startDate, endDate, phoneFilter, nameFilter]);

  const filtered = useMemo(() => {
    return allDocs.filter((d) => {
      const type = d.type || '';
      if (type === 'Invoice') return false;
      if (selectedTypes.length === 0) return DEFAULT_EXPENSE_TYPES.includes(type);
      return selectedTypes.includes(type);
    });
  }, [allDocs, selectedTypes]);

  const totals = useMemo(() => filtered.reduce(
    (acc, d) => ({
      total: acc.total + (Number(d.total) || 0),
      paid: acc.paid + (Number(d.paidAmount) || 0),
      remaining: acc.remaining + (Number(d.remainingAmount) || 0),
    }),
    { total: 0, paid: 0, remaining: 0 }
  ), [filtered]);

  const toggleType = (type) => {
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  return (
    <>
      <Header title="All Expenses" />
      <PageCard title="Filter Expenses">
        <div className="flex flex-wrap gap-3 mb-4">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border rounded-md text-black" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border rounded-md text-black" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border rounded-md text-black">
            <option value="">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Remaining">Remaining</option>
          </select>
          <select value={paymentPlan} onChange={(e) => setPaymentPlan(e.target.value)} className="px-3 py-2 border rounded-md text-black">
            <option value="">All Plans</option>
            <option value="Full Payment">Full Payment</option>
            <option value="Installments">Installments</option>
            <option value="Partial Payment">Partial Payment</option>
          </select>
          <input list="exp-names" placeholder="Filter by Name" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} className="px-3 py-2 border rounded-md text-black" />
          <datalist id="exp-names">{nameOptions.map((n) => <option key={n} value={n} />)}</datalist>
          <input list="exp-phones" placeholder="Filter by Phone" value={phoneFilter} onChange={(e) => setPhoneFilter(e.target.value)} className="px-3 py-2 border rounded-md text-black" />
          <datalist id="exp-phones">{phoneOptions.map((p) => <option key={p} value={p} />)}</datalist>
        </div>
        <div className="border rounded-lg p-3 bg-gray-50">
          <p className="text-sm font-medium text-black mb-2">Expense Types</p>
          <div className="flex flex-wrap gap-3">
            {DEFAULT_EXPENSE_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 text-sm text-black">
                <input type="checkbox" checked={selectedTypes.includes(type)} onChange={() => toggleType(type)} />
                {type}
              </label>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => { setStartDate(''); setEndDate(''); setStatus(''); setPaymentPlan(''); setNameFilter(''); setPhoneFilter(''); setSelectedTypes([]); }} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md text-sm">Clear</button>
      </PageCard>

      {loading ? <p className="text-center py-8">Loading...</p> : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[['Total Amount', totals.total], ['Total Paid', totals.paid], ['Total Remaining', totals.remaining]].map(([l, v]) => (
              <div key={l} className="bg-white rounded-xl border p-4 text-center">
                <p className="text-sm text-gray-500">{l}</p>
                <p className="text-lg font-bold">{formatPriceLE(v)}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((doc) => <FinanceDocCard key={doc.id} doc={doc} />)}
          </div>
          {filtered.length === 0 && <p className="text-center text-gray-500 py-8">No expenses found.</p>}
        </>
      )}
      <Snackbar message={snack} isError onClose={() => setSnack('')} />
    </>
  );
}
