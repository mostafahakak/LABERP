'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatPriceLE, formatTime } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { PageCard, TextField, SelectField, Snackbar, LoadingOverlay } from '@/components/ui/PageComponents';
import { calcCardFee, calcNetAmountToBank } from './finance-helpers';

export default function InvoiceDetail({ invoiceId: propId, type: propType }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = propId || searchParams.get('id') || '';
  const type = propType || searchParams.get('type') || 'Income';
  const { user } = useAuth();

  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [banks, setBanks] = useState([]);
  const [payAmount, setPayAmount] = useState('');
  const [payBankId, setPayBankId] = useState('');
  const [showPay, setShowPay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [snack, setSnack] = useState({ message: '', isError: false });

  useEffect(() => {
    if (!invoiceId) return;
    const unsub = onSnapshot(doc(db, 'Finance', invoiceId), (d) => {
      setInvoice(d.exists() ? { id: d.id, ...d.data() } : null);
      setLoading(false);
    });
    const unsubItems = onSnapshot(collection(db, 'Finance', invoiceId, 'Items'), (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubPayments = onSnapshot(collection(db, 'Finance', invoiceId, 'Payments'), (snap) => {
      setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    getDocs(collection(db, 'Banks')).then((snap) => setBanks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unsub(); unsubItems(); unsubPayments(); };
  }, [invoiceId]);

  const remaining = Number(invoice?.remainingAmount) || 0;
  const isIncome = type === 'Income';

  const payRemaining = async () => {
    const inputAmount = parseFloat(payAmount) || 0;
    if (inputAmount <= 0 || inputAmount > remaining) {
      setSnack({ message: 'Invalid payment amount', isError: true });
      return;
    }
    const bank = banks.find((b) => b.id === payBankId);
    if (!bank) {
      setSnack({ message: 'Select a bank', isError: true });
      return;
    }
    setProcessing(true);
    try {
      const now = new Date();
      const formattedDate = formatDate(now);
      const logTime = formatTime(now);
      const cardFee = calcCardFee(bank.name, inputAmount);
      const netAmountToBank = calcNetAmountToBank(bank.name, inputAmount);
      const bankBalanceBefore = Number(bank.balance) || 0;
      const newRemaining = remaining - inputAmount;
      const clientCollection = isIncome ? 'Clients' : 'Suppliers';
      const clientUID = invoice.userID;

      const batch = writeBatch(db);
      batch.update(doc(db, 'Banks', bank.id), {
        balance: increment(isIncome ? netAmountToBank : -netAmountToBank),
      });
      if (clientUID) {
        batch.update(doc(db, clientCollection, clientUID), { balance: increment(-inputAmount) });
      }
      batch.set(doc(collection(db, 'Finance', invoiceId, 'Payments')), {
        balanceBefore: bankBalanceBefore,
        balanceAfter: bankBalanceBefore + (isIncome ? netAmountToBank : -netAmountToBank),
        paidAmount: inputAmount,
        bank: bank.name,
        bankId: bank.id,
        paymentMethod: 'Cash',
        cardFee,
        netAmountToBank,
        Date: formattedDate,
        Time: logTime,
      });
      batch.update(doc(db, 'Finance', invoiceId), {
        paidAmount: increment(inputAmount),
        remainingAmount: increment(-inputAmount),
        status: newRemaining <= 0 ? 'Paid' : 'Remaining',
        bank: bank.name,
        bankId: bank.id,
      });
      batch.set(doc(collection(db, 'Logs')), {
        actionID: invoiceId,
        section: 'Finance',
        adminID: user.uid,
        adminName: user.name,
        branch: user.branch || 'New cairo',
        type,
        name: isIncome ? 'Invoice' : 'Purchase Invoice',
        bank: bank.name,
        paymentMethod: 'Cash',
        cardFee,
        netAmountToBank,
        cName: invoice.name,
        Time: logTime,
        Date: formattedDate,
        amount: inputAmount,
      });

      if (isIncome && invoice.clinicName) {
        const clinicSnap = await getDocs(collection(db, 'Clinics'));
        const clinicDoc = clinicSnap.docs.find((d) => d.data().name === invoice.clinicName);
        if (clinicDoc) batch.update(clinicDoc.ref, { balance: increment(-inputAmount) });
      }

      await batch.commit();
      setSnack({ message: 'Payment recorded', isError: false });
      setShowPay(false);
      setPayAmount('');
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    } finally {
      setProcessing(false);
    }
  };

  const deleteInvoice = async () => {
    if (!confirm('Delete this invoice? This will reverse balances.')) return;
    setProcessing(true);
    try {
      const batch = writeBatch(db);
      const paidTotal = Number(invoice.paidAmount) || 0;
      const bankId = invoice.bankId;
      const netPaid = payments.reduce((s, p) => s + (Number(p.netAmountToBank) || Number(p.paidAmount) || 0), 0);

      if (bankId && netPaid > 0) {
        batch.update(doc(db, 'Banks', bankId), {
          balance: increment(isIncome ? -netPaid : netPaid),
        });
      }
      if (invoice.userID) {
        const col = isIncome ? 'Clients' : 'Suppliers';
        batch.update(doc(db, col, invoice.userID), {
          balance: increment(isIncome ? -(Number(invoice.remainingAmount) || 0) : 0),
        });
      }
      if (invoice.DrUID && invoice.drAmount) {
        batch.update(doc(db, 'Users', invoice.DrUID), { balance: increment(-invoice.drAmount) });
      }
      batch.delete(doc(db, 'Finance', invoiceId));
      batch.delete(doc(db, 'Logs', invoiceId));
      await batch.commit();
      setSnack({ message: 'Invoice deleted', isError: false });
      router.push('/dashboard/finance/invoices');
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    } finally {
      setProcessing(false);
    }
  };

  const deletePayment = async (payment) => {
    if (!confirm(`Delete payment of ${formatPriceLE(payment.paidAmount)}?`)) return;
    setProcessing(true);
    try {
      const batch = writeBatch(db);
      const amt = Number(payment.paidAmount) || 0;
      const net = Number(payment.netAmountToBank) || amt;
      if (payment.bankId) {
        batch.update(doc(db, 'Banks', payment.bankId), {
          balance: increment(isIncome ? -net : net),
        });
      }
      batch.delete(doc(db, 'Finance', invoiceId, 'Payments', payment.id));
      batch.update(doc(db, 'Finance', invoiceId), {
        paidAmount: increment(-amt),
        remainingAmount: increment(amt),
        status: 'Remaining',
      });
      await batch.commit();
      setSnack({ message: 'Payment deleted', isError: false });
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <p className="text-center py-8">Loading invoice...</p>;
  if (!invoice) return <p className="text-center py-8 text-destructive">Invoice not found.</p>;

  return (
    <>
      <Header title={`${invoice.type} — ${invoice.name}`} />
      <PageCard title="Invoice Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><span className="text-muted-foreground">Date</span><p className="font-medium text-foreground">{invoice.Date} {invoice.Time}</p></div>
          <div><span className="text-muted-foreground">Status</span><p className="font-medium">{invoice.status}</p></div>
          <div><span className="text-muted-foreground">Bank</span><p className="font-medium">{invoice.bank}</p></div>
          <div><span className="text-muted-foreground">Total</span><p className="font-bold">{formatPriceLE(invoice.total)}</p></div>
          <div><span className="text-muted-foreground">Paid</span><p className="text-green-600 font-bold">{formatPriceLE(invoice.paidAmount)}</p></div>
          <div><span className="text-muted-foreground">Remaining</span><p className="text-destructive font-bold">{formatPriceLE(invoice.remainingAmount)}</p></div>
          {invoice.drName && <div><span className="text-muted-foreground">Doctor</span><p>{invoice.drName}</p></div>}
          {invoice.clinicName && <div><span className="text-muted-foreground">Clinic</span><p>{invoice.clinicName}</p></div>}
          {invoice.note && <div className="md:col-span-3"><span className="text-muted-foreground">Note</span><p>{invoice.note}</p></div>}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {remaining > 0 && (
            <button type="button" onClick={() => setShowPay(true)} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm">Pay Remaining</button>
          )}
          <button type="button" onClick={deleteInvoice} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm">Delete Invoice</button>
        </div>
      </PageCard>

      <PageCard title="Items">
        {items.length === 0 ? <p className="text-muted-foreground">No items.</p> : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between border rounded-lg p-3">
                <span>{item.name} x{item.quantity}</span>
                <span>{formatPriceLE((Number(item.price) || 0) * (Number(item.quantity) || 1))}</span>
              </div>
            ))}
          </div>
        )}
      </PageCard>

      <PageCard title="Payments">
        {payments.length === 0 ? <p className="text-muted-foreground">No payments.</p> : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between items-center border rounded-lg p-3">
                <div>
                  <p className="font-medium text-foreground">{formatPriceLE(p.paidAmount)} via {p.bank}</p>
                  <p className="text-xs text-muted-foreground">{p.Date} {p.Time}</p>
                </div>
                <button type="button" onClick={() => deletePayment(p)} className="text-destructive text-sm px-2 py-1 border border-destructive/30 rounded">Delete</button>
              </div>
            ))}
          </div>
        )}
      </PageCard>

      {showPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-xl p-6 max-w-md w-full">
            <h3 className="font-bold mb-4">Pay Remaining ({formatPriceLE(remaining)})</h3>
            <TextField label="Amount" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} type="number" />
            <SelectField
              label="Bank"
              value={banks.find((b) => b.id === payBankId)?.name || ''}
              onChange={(v) => setPayBankId(banks.find((b) => b.name === v)?.id || '')}
              options={banks.map((b) => b.name)}
              className="mt-3"
            />
            <div className="flex gap-2 justify-end mt-4">
              <button type="button" onClick={() => setShowPay(false)} className="px-4 py-2 border rounded-md">Cancel</button>
              <button type="button" onClick={payRemaining} disabled={processing} className="px-4 py-2 bg-green-600 text-white rounded-md">Pay</button>
            </div>
          </div>
        </div>
      )}
      <LoadingOverlay show={processing} />
      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: '', isError: false })} />
    </>
  );
}
