'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate, formatPriceLE } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { PageCard, Snackbar } from '@/components/ui/PageComponents';
import FinanceDocCard from './FinanceDocCard';

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nameOptions, setNameOptions] = useState([]);
  const [phoneOptions, setPhoneOptions] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [status, setStatus] = useState('');
  const [paymentPlan, setPaymentPlan] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [snack, setSnack] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [invSnap, clientsSnap] = await Promise.all([
        getDocs(query(collection(db, 'Finance'), where('type', '==', 'Invoice'), orderBy('Date', 'desc'), orderBy('Time', 'desc'))),
        getDocs(collection(db, 'Clients')),
      ]);
      setInvoices(invSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      const names = new Set();
      const phones = new Set();
      clientsSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.name) names.add(String(data.name));
        if (data.phone) phones.add(String(data.phone));
      });
      setNameOptions([...names].sort());
      setPhoneOptions([...phones].sort());
    } catch (e) {
      setSnack(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return invoices.filter((d) => {
      if (status && d.status !== status) return false;
      if (paymentPlan && d.paymentPlan !== paymentPlan) return false;
      if (paymentMethod && d.bank !== paymentMethod) return false;
      if (nameFilter && d.name !== nameFilter) return false;
      if (phoneFilter && d.phone !== phoneFilter) return false;
      if (startDate && d.Date && d.Date < startDate) return false;
      if (endDate && d.Date && d.Date > endDate) return false;
      return true;
    });
  }, [invoices, status, paymentPlan, paymentMethod, nameFilter, phoneFilter, startDate, endDate]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, d) => ({
        total: acc.total + (Number(d.total) || 0),
        paid: acc.paid + (Number(d.paidAmount) || 0),
        remaining: acc.remaining + (Number(d.remainingAmount) || 0),
        discount: acc.discount + (Number(d.discount) || 0),
      }),
      { total: 0, paid: 0, remaining: 0, discount: 0 }
    );
  }, [filtered]);

  return (
    <>
      <Header title="All Invoices" />
      <PageCard title="Filter Invoices">
        <div className="flex flex-wrap gap-3">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border rounded-md text-foreground" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border rounded-md text-foreground" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border rounded-md text-foreground">
            <option value="">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Remaining">Remaining</option>
          </select>
          <select value={paymentPlan} onChange={(e) => setPaymentPlan(e.target.value)} className="px-3 py-2 border rounded-md text-foreground">
            <option value="">All Plans</option>
            <option value="Full Payment">Full Payment</option>
            <option value="Installments">Installments</option>
            <option value="Partial Payment">Partial Payment</option>
          </select>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="px-3 py-2 border rounded-md text-foreground">
            <option value="">All Methods</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Instapay">Instapay</option>
          </select>
          <input list="client-names" placeholder="Filter by Name" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} className="px-3 py-2 border rounded-md text-foreground" />
          <datalist id="client-names">{nameOptions.map((n) => <option key={n} value={n} />)}</datalist>
          <input list="client-phones" placeholder="Filter by Phone" value={phoneFilter} onChange={(e) => setPhoneFilter(e.target.value)} className="px-3 py-2 border rounded-md text-foreground" />
          <datalist id="client-phones">{phoneOptions.map((p) => <option key={p} value={p} />)}</datalist>
          <button type="button" onClick={load} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm">Refresh</button>
          <button type="button" onClick={() => { setStartDate(''); setEndDate(''); setStatus(''); setPaymentPlan(''); setPaymentMethod(''); setNameFilter(''); setPhoneFilter(''); }} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm">Clear</button>
        </div>
      </PageCard>

      {loading ? (
        <p className="text-center py-8">Loading invoices...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">No invoices found.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            {[
              ['Total Amount', totals.total],
              ['Total Paid', totals.paid],
              ['Total Remaining', totals.remaining],
              ['Total Discount', totals.discount],
            ].map(([label, val]) => (
              <div key={label} className="bg-card rounded-xl border-border p-4 text-center">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-lg font-bold text-foreground">{formatPriceLE(val)}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((doc) => (
              <FinanceDocCard key={doc.id} doc={doc} />
            ))}
          </div>
        </>
      )}
      <Snackbar message={snack} isError onClose={() => setSnack('')} />
    </>
  );
}
