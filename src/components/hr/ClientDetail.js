'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/layout/Header';
import { PageCard, TextField, Snackbar, LoadingOverlay } from '@/components/ui/PageComponents';
import { formatDate, formatPriceLE } from '@/lib/utils';

function InvoiceCard({ invoice }) {
  const paidAmount = Number(invoice.paidAmount) || 0;
  const total = Number(invoice.total) || 0;
  const remainingAmount = Number(invoice.remainingAmount) || 0;
  const status = invoice.status || 'N/A';
  const statusColor = status === 'Paid' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200';

  return (
    <Link
      href={`/dashboard/finance/invoices/${invoice.id}`}
      className="block border rounded-xl p-4 hover:shadow-md transition-shadow bg-white mb-3"
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <div>
          <p className="font-bold text-black text-sm">Invoice #{invoice.id}</p>
          <p className="text-sm text-gray-500">
            {invoice.Date} at {invoice.Time || 'N/A'}
          </p>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${statusColor}`}>
          {status}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div>
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-sm font-bold text-green-700">{formatPriceLE(total)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Paid</p>
          <p className="text-sm font-bold text-blue-700">{formatPriceLE(paidAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Remaining</p>
          <p className="text-sm font-bold text-red-700">{formatPriceLE(remainingAmount)}</p>
        </div>
      </div>
      <p className="text-xs text-gray-600">Sales Person: {invoice.drName || 'N/A'}</p>
      <p className="text-xs text-gray-600">Payment Method: {invoice.bank || 'N/A'}</p>
    </Link>
  );
}

export default function ClientDetail({ clientId }) {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [snack, setSnack] = useState({ message: '', isError: false });

  useEffect(() => {
    if (!clientId) return;
    const unsub = onSnapshot(
      doc(db, 'Clients', clientId),
      (d) => {
        setClient(d.exists() ? { id: d.id, ...d.data() } : null);
        setLoading(false);
      },
      (err) => {
        setSnack({ message: err.message, isError: true });
        setLoading(false);
      }
    );
    return () => unsub();
  }, [clientId]);

  useEffect(() => {
    if (!client?.name) return;

    const constraints = [
      where('name', '==', client.name),
      where('type', '==', 'Invoice'),
    ];

    if (startDate) constraints.push(where('Date', '>=', startDate));
    if (endDate) {
      const next = new Date(endDate);
      next.setDate(next.getDate() + 1);
      constraints.push(where('Date', '<', formatDate(next)));
    }
    if (statusFilter) constraints.push(where('status', '==', statusFilter));

    constraints.push(orderBy('Date', 'desc'));

    const q = query(collection(db, 'Finance'), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setInvoices(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setInvoicesLoading(false);
      },
      (err) => {
        setSnack({ message: err.message, isError: true });
        setInvoicesLoading(false);
      }
    );
    return () => unsub();
  }, [client?.name, startDate, endDate, statusFilter]);

  const summary = useMemo(() => {
    let totalAmount = 0;
    let totalRemaining = 0;
    invoices.forEach((inv) => {
      totalAmount += Number(inv.total) || 0;
      totalRemaining += Number(inv.remainingAmount) || 0;
    });
    return { totalAmount, totalRemaining };
  }, [invoices]);

  const updateField = (field, value) => {
    setClient((prev) => ({ ...prev, [field]: value }));
  };

  const saveClient = async () => {
    if (!client) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'Clients', clientId), {
        name: client.name,
        phone: client.phone,
        referal: client.referal || '',
        secondPhone: client.secondPhone || '',
      });
      setSnack({ message: 'Client updated successfully', isError: false });
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 border-4 border-[#c3a28e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <>
        <Header title="Client Detail" />
        <p className="text-center text-gray-500 py-12">Client not found.</p>
      </>
    );
  }

  return (
    <>
      <Header title={client.name || 'Client Detail'} />

      <PageCard title="Client Information" icon="👤">
        <div className="space-y-4 max-w-xl">
          <TextField label="Full Name" value={client.name || ''} onChange={(e) => updateField('name', e.target.value)} />
          <TextField label="Phone Number" value={client.phone || ''} onChange={(e) => updateField('phone', e.target.value)} type="tel" />
          <TextField label="Referral" value={client.referal || ''} onChange={(e) => updateField('referal', e.target.value)} required={false} />
          <TextField label="Second Phone" value={client.secondPhone || ''} onChange={(e) => updateField('secondPhone', e.target.value)} type="tel" required={false} />
          <button
            type="button"
            onClick={saveClient}
            disabled={saving}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-bold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </PageCard>

      <PageCard title="Filter Invoices" icon="🔍">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-black"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-black"
              />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Status Filter</p>
            <div className="flex gap-2">
              {[
                { label: 'All', value: null },
                { label: 'Paid', value: 'Paid' },
                { label: 'Remaining', value: 'Remaining' },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                    statusFilter === opt.value
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {(startDate || endDate || statusFilter) && (
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setStatusFilter(null);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
            >
              Clear Filters
            </button>
          )}
        </div>
      </PageCard>

      <PageCard title="Client Invoices" icon="🧾">
        {invoicesLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-[#c3a28e] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No invoices found for {client.name}.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-center">
                <p className="text-xs text-gray-600 mb-1">Total Amount</p>
                <p className="font-bold text-green-700">{formatPriceLE(summary.totalAmount)}</p>
              </div>
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center">
                <p className="text-xs text-gray-600 mb-1">Total Remaining</p>
                <p className="font-bold text-red-700">{formatPriceLE(summary.totalRemaining)}</p>
              </div>
            </div>
            {invoices.map((inv) => (
              <InvoiceCard key={inv.id} invoice={inv} />
            ))}
          </>
        )}
      </PageCard>

      <LoadingOverlay show={saving} />
      <Snackbar
        message={snack.message}
        isError={snack.isError}
        onClose={() => setSnack({ message: '', isError: false })}
      />
    </>
  );
}
