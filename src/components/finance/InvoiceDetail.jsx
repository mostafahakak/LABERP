'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';
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
  const [caseCodesByCaseId, setCaseCodesByCaseId] = useState({});
  const [payments, setPayments] = useState([]);
  const [banks, setBanks] = useState([]);
  const [payAmount, setPayAmount] = useState('');
  const [payBankId, setPayBankId] = useState('');
  const [showPay, setShowPay] = useState(false);
  const [showDeletePreview, setShowDeletePreview] = useState(false);
  const [deleteImpact, setDeleteImpact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [snack, setSnack] = useState({ message: '', isError: false });

  useEffect(() => {
    if (!invoiceId) {
      setInvoice(null);
      setLoading(false);
      return;
    }
    setLoading(true);
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

  useEffect(() => {
    const loadCaseCodes = async () => {
      if (!invoice) {
        setCaseCodesByCaseId({});
        return;
      }

      const caseIdsFromItems = items
        .map((item) => item.caseId)
        .filter(Boolean);
      const caseIdsFromInvoice = Array.isArray(invoice.caseIds)
        ? invoice.caseIds.filter(Boolean)
        : [invoice.caseId].filter(Boolean);
      const uniqueCaseIds = [...new Set([...caseIdsFromItems, ...caseIdsFromInvoice])];

      if (uniqueCaseIds.length === 0) {
        setCaseCodesByCaseId({});
        return;
      }

      const codeMap = {};
      await Promise.all(uniqueCaseIds.map(async (caseId) => {
        const caseSnap = await getDoc(doc(db, 'Cases', caseId));
        if (caseSnap.exists()) {
          codeMap[caseId] = caseSnap.data()?.caseCode || '—';
        }
      }));

      setCaseCodesByCaseId(codeMap);
    };

    loadCaseCodes();
  }, [invoice, items]);

  const remaining = Number(invoice?.remainingAmount) || 0;
  const invoiceTotal = Number(invoice?.total) || 0;
  const isIncome = type === 'Income';

  const printRef = useRef(null);

  const previousBillVal = Number(invoice?.previousBillAmount) || 0;
  const currentBill = Number(invoice?.total) || 0;
  const paidPrintAmount = Number(invoice?.paidAmount) || 0;
  const remainingPrintAmount = Number(invoice?.remainingAmount) || 0;
  const grandPrintTotal = previousBillVal + currentBill;
  const invoiceCaseCode = invoice?.caseCode || '—';

  const getPrintedCaseCode = (item) => {
    if (item?.caseCode) return item.caseCode;
    if (item?.caseId && caseCodesByCaseId[item.caseId]) return caseCodesByCaseId[item.caseId];
    return invoiceCaseCode;
  };

  const handlePrint = useCallback(() => {
    const content = printRef.current;
    if (!content || !invoice) return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())} : ${pad(now.getMinutes())}`;
    const dr = (invoice.drName || '').replace(/[^a-zA-Z0-9\u0600-\u06FF ]/g, '').trim();
    const clinic = (invoice.clinicName || invoice.name || '').replace(/[^a-zA-Z0-9\u0600-\u06FF ]/g, '').trim();
    const fileName = `Invoice_${clinic}_ Dr:${dr} _ ${dateStr} _ ${timeStr}`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${fileName}</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a2e; }
  .invoice-page { max-width: 800px; margin: 0 auto; padding: 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #c2a18c; padding-bottom: 24px; }
  .header-left { display: flex; flex-direction: column; gap: 6px; }
  .logo {
    width: 200px;
    height: 64px;
    max-width: 100%;
    object-fit: contain;
    object-position: left center;
    margin-bottom: 8px;
    display: block;
  }
  .clinic-name { font-size: 22px; font-weight: 700; color: #1a1a2e; }
  .doctor-name { font-size: 14px; color: #6b6780; }
  .header-right { text-align: right; }
  .header-right .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b6780; }
  .header-right .value { font-size: 14px; font-weight: 600; margin-bottom: 6px; }
  .invoice-title { text-align: center; font-size: 28px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #c2a18c; margin-bottom: 28px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
  thead { background: #30394d; color: #fff; }
  th { padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
  th:last-child { text-align: right; }
  td { padding: 12px 16px; border-bottom: 1px solid #e4ddd5; font-size: 14px; }
  td:last-child { text-align: right; }
  tbody tr:nth-child(even) { background: #faf8f6; }
  .totals { display: flex; justify-content: flex-end; }
  .totals-table { min-width: 300px; }
  .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e4ddd5; font-size: 14px; }
  .totals-row.grand { border-top: 2px solid #30394d; border-bottom: 2px solid #30394d; font-size: 16px; font-weight: 700; margin-top: 4px; padding: 12px 0; }
  .totals-label { color: #6b6780; }
  .totals-value { font-weight: 600; }
  .footer { margin-top: 48px; text-align: center; font-size: 11px; color: #9b95a8; border-top: 1px solid #e4ddd5; padding-top: 16px; }
</style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 400);
  }, [invoice]);

  const syncInvoiceNotification = useCallback(async ({ batch, newRemaining, date, time }) => {
    const notifSnap = await getDocs(query(collection(db, 'Notifications'), where('docID', '==', invoiceId)));
    const matchedNotifs = notifSnap.docs;

    if (newRemaining <= 0) {
      matchedNotifs.forEach((d) => batch.delete(d.ref));
      return;
    }

    if (matchedNotifs.length > 0) {
      matchedNotifs.forEach((d) => {
        batch.update(d.ref, {
          amount: newRemaining,
          status: 'Remaining',
          date,
          time,
        });
      });
      return;
    }

    batch.set(doc(collection(db, 'Notifications')), {
      name: invoice?.name || invoice?.clinicName || 'Invoice',
      type: isIncome ? 'Invoice' : 'Purchase',
      amount: newRemaining,
      quantity: 0,
      docID: invoiceId,
      collectionName: 'Finance',
      date,
      time,
      status: 'Remaining',
      branch: user?.branch || 'New cairo',
    });
  }, [invoice, invoiceId, isIncome, user?.branch]);

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
        total: invoiceTotal,
        status: newRemaining <= 0 ? 'Paid' : 'Remaining',
        bank: bank.name,
        bankId: bank.id,
      });
      await syncInvoiceNotification({
        batch,
        newRemaining,
        date: formattedDate,
        time: logTime,
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
    setProcessing(true);
    try {
      const batch = writeBatch(db);

      const [
        paymentsSnap,
        itemsSnap,
        notifSnap,
        logsSnap,
        inventorySnap,
      ] = await Promise.all([
        getDocs(collection(db, 'Finance', invoiceId, 'Payments')),
        getDocs(collection(db, 'Finance', invoiceId, 'Items')),
        getDocs(query(collection(db, 'Notifications'), where('docID', '==', invoiceId))),
        getDocs(query(collection(db, 'Logs'), where('actionID', '==', invoiceId))),
        getDocs(query(collection(db, 'Inventory'), where('docID', '==', invoiceId))),
      ]);

      for (const paymentDoc of paymentsSnap.docs) {
        const payment = paymentDoc.data();
        const net = Number(payment.netAmountToBank) || Number(payment.paidAmount) || 0;
        const paymentAccountId = payment.bankId || payment.bankID;

        if (paymentAccountId && net > 0) {
          const bankRef = doc(db, 'Banks', paymentAccountId);
          const bankSnap = await getDoc(bankRef);
          if (bankSnap.exists()) {
            batch.update(bankRef, { balance: increment(isIncome ? -net : net) });
          } else {
            const userRef = doc(db, 'Users', paymentAccountId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              batch.update(userRef, { balance: increment(isIncome ? -net : net) });
            }
          }
        }

        batch.delete(paymentDoc.ref);
      }

      const remainingNow = Number(invoice.remainingAmount) || 0;
      if (invoice.userID) {
        const col = isIncome ? 'Clients' : 'Suppliers';
        const counterpartyRef = doc(db, col, invoice.userID);
        const counterpartySnap = await getDoc(counterpartyRef);
        if (counterpartySnap.exists()) {
          batch.update(counterpartyRef, { balance: increment(-remainingNow) });
        }
      }

      if (isIncome && invoice.clinicName && remainingNow > 0) {
        const clinicSnap = await getDocs(query(collection(db, 'Clinics'), where('name', '==', invoice.clinicName)));
        clinicSnap.docs.forEach((d) => {
          batch.update(d.ref, { balance: increment(-remainingNow) });
        });
      }

      if (invoice.DrUID && Number(invoice.drAmount || 0) > 0) {
        const drRef = doc(db, 'Users', invoice.DrUID);
        const drSnap = await getDoc(drRef);
        if (drSnap.exists()) {
          batch.update(drRef, { balance: increment(-Number(invoice.drAmount) || 0) });
        }
      }

      if (invoice.type === 'Purchase Invoice') {
        for (const itemDoc of itemsSnap.docs) {
          const item = itemDoc.data();
          const qty = Number(item.quantity) || 0;
          const itemId = item.itemId || itemDoc.id;
          if (!itemId || qty <= 0) continue;
          const stockRef = doc(db, 'Items', itemId);
          const stockSnap = await getDoc(stockRef);
          if (stockSnap.exists()) {
            batch.update(stockRef, { quantity: increment(-qty) });
          }
        }
      }

      const caseIds = Array.isArray(invoice.caseIds)
        ? invoice.caseIds.filter(Boolean)
        : [invoice.caseId].filter(Boolean);
      for (const caseId of caseIds) {
        const caseRef = doc(db, 'Cases', caseId);
        const caseSnap = await getDoc(caseRef);
        if (caseSnap.exists()) {
          batch.update(caseRef, { status: 'Pending delivery' });
        }
      }

      itemsSnap.docs.forEach((d) => batch.delete(d.ref));
      notifSnap.docs.forEach((d) => batch.delete(d.ref));
      logsSnap.docs.forEach((d) => batch.delete(d.ref));
      inventorySnap.docs.forEach((d) => batch.delete(d.ref));

      const directLogRef = doc(db, 'Logs', invoiceId);
      const directLogSnap = await getDoc(directLogRef);
      if (directLogSnap.exists()) batch.delete(directLogRef);

      batch.delete(doc(db, 'Finance', invoiceId));

      await batch.commit();

      const [
        financeAfter,
        paymentsAfter,
        itemsAfter,
        notifAfter,
        logsAfter,
        inventoryAfter,
        directLogAfter,
      ] = await Promise.all([
        getDoc(doc(db, 'Finance', invoiceId)),
        getDocs(collection(db, 'Finance', invoiceId, 'Payments')),
        getDocs(collection(db, 'Finance', invoiceId, 'Items')),
        getDocs(query(collection(db, 'Notifications'), where('docID', '==', invoiceId))),
        getDocs(query(collection(db, 'Logs'), where('actionID', '==', invoiceId))),
        getDocs(query(collection(db, 'Inventory'), where('docID', '==', invoiceId))),
        getDoc(doc(db, 'Logs', invoiceId)),
      ]);

      const checks = {
        financeDeleted: !financeAfter.exists(),
        paymentsDeleted: paymentsAfter.size === 0,
        itemsDeleted: itemsAfter.size === 0,
        notificationsDeleted: notifAfter.size === 0,
        logsDeleted: logsAfter.size === 0,
        inventoryDeleted: inventoryAfter.size === 0,
        directLogDeleted: !directLogAfter.exists(),
      };

      const allTrue = Object.values(checks).every(Boolean);
      if (!allTrue) {
        const failed = Object.entries(checks)
          .filter(([, ok]) => !ok)
          .map(([k]) => k)
          .join(', ');
        setSnack({ message: `Delete completed with verification warning: ${failed}`, isError: true });
        return;
      }

      setSnack({ message: 'Invoice deleted and verified', isError: false });
      router.push('/dashboard/finance/invoices');
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    } finally {
      setProcessing(false);
    }
  };

  const openDeletePreview = async () => {
    setProcessing(true);
    try {
      const [
        paymentsSnap,
        itemsSnap,
        notifSnap,
        logsSnap,
        inventorySnap,
      ] = await Promise.all([
        getDocs(collection(db, 'Finance', invoiceId, 'Payments')),
        getDocs(collection(db, 'Finance', invoiceId, 'Items')),
        getDocs(query(collection(db, 'Notifications'), where('docID', '==', invoiceId))),
        getDocs(query(collection(db, 'Logs'), where('actionID', '==', invoiceId))),
        getDocs(query(collection(db, 'Inventory'), where('docID', '==', invoiceId))),
      ]);

      const caseIds = Array.isArray(invoice?.caseIds)
        ? invoice.caseIds.filter(Boolean)
        : [invoice?.caseId].filter(Boolean);

      const netByAccount = {};
      let totalPaidNet = 0;
      for (const paymentDoc of paymentsSnap.docs) {
        const payment = paymentDoc.data();
        const accountId = payment.bankId || payment.bankID;
        const net = Number(payment.netAmountToBank) || Number(payment.paidAmount) || 0;
        totalPaidNet += net;
        if (accountId) netByAccount[accountId] = (netByAccount[accountId] || 0) + net;
      }

      const stockImpact = invoice?.type === 'Purchase Invoice'
        ? itemsSnap.docs.reduce((sum, d) => sum + (Number(d.data()?.quantity) || 0), 0)
        : 0;

      const accountDetails = [];
      for (const [accountId, amount] of Object.entries(netByAccount)) {
        const bankRef = doc(db, 'Banks', accountId);
        const bankSnap = await getDoc(bankRef);
        if (bankSnap.exists()) {
          accountDetails.push({
            id: accountId,
            name: bankSnap.data()?.name || 'Bank',
            type: 'Bank',
            amount,
            canRollback: true,
          });
          continue;
        }

        const userRef = doc(db, 'Users', accountId);
        const userSnap = await getDoc(userRef);
        accountDetails.push({
          id: accountId,
          name: userSnap.exists() ? (userSnap.data()?.name || 'User') : 'Missing account',
          type: 'User',
          amount,
          canRollback: userSnap.exists(),
        });
      }

      let counterpartyCheck = { canRollback: true, label: isIncome ? 'Client' : 'Supplier', name: '—' };
      if (invoice?.userID) {
        const col = isIncome ? 'Clients' : 'Suppliers';
        const counterpartyRef = doc(db, col, invoice.userID);
        const counterpartySnap = await getDoc(counterpartyRef);
        counterpartyCheck = {
          canRollback: counterpartySnap.exists(),
          label: isIncome ? 'Client' : 'Supplier',
          name: counterpartySnap.exists() ? (counterpartySnap.data()?.name || invoice?.name || '—') : 'Missing record',
        };
      }

      const clinicChecks = [];
      if (isIncome && invoice?.clinicName && Number(invoice?.remainingAmount || 0) > 0) {
        const clinicSnap = await getDocs(query(collection(db, 'Clinics'), where('name', '==', invoice.clinicName)));
        if (clinicSnap.empty) {
          clinicChecks.push({ name: invoice.clinicName, canRollback: false });
        } else {
          clinicSnap.docs.forEach((d) => {
            clinicChecks.push({ name: d.data()?.name || invoice.clinicName, canRollback: true });
          });
        }
      }

      let doctorCheck = { canRollback: true, name: invoice?.drName || '—' };
      if (invoice?.DrUID && Number(invoice?.drAmount || 0) > 0) {
        const drSnap = await getDoc(doc(db, 'Users', invoice.DrUID));
        doctorCheck = {
          canRollback: drSnap.exists(),
          name: drSnap.exists() ? (drSnap.data()?.name || invoice?.drName || 'Doctor') : 'Missing doctor record',
        };
      }

      const caseChecks = [];
      for (const caseId of caseIds) {
        const caseSnap = await getDoc(doc(db, 'Cases', caseId));
        caseChecks.push({ caseId, canRollback: caseSnap.exists() });
      }

      const itemRollbackChecks = [];
      if (invoice?.type === 'Purchase Invoice') {
        for (const itemDoc of itemsSnap.docs) {
          const data = itemDoc.data();
          const itemId = data.itemId || itemDoc.id;
          const qty = Number(data.quantity) || 0;
          const stockSnap = await getDoc(doc(db, 'Items', itemId));
          itemRollbackChecks.push({
            itemId,
            itemName: data.name || itemId,
            qty,
            canRollback: stockSnap.exists(),
          });
        }
      }

      const allChecksTrue = [
        ...accountDetails.map((a) => a.canRollback),
        counterpartyCheck.canRollback,
        ...clinicChecks.map((c) => c.canRollback),
        doctorCheck.canRollback,
        ...caseChecks.map((c) => c.canRollback),
        ...itemRollbackChecks.map((i) => i.canRollback),
      ].every(Boolean);

      setDeleteImpact({
        paymentsCount: paymentsSnap.size,
        itemsCount: itemsSnap.size,
        notificationsCount: notifSnap.size,
        logsCount: logsSnap.size,
        inventoryCount: inventorySnap.size,
        caseCount: caseIds.length,
        remainingNow: Number(invoice?.remainingAmount) || 0,
        doctorAmount: Number(invoice?.drAmount) || 0,
        totalPaidNet,
        uniqueAccounts: Object.keys(netByAccount).length,
        stockImpact,
        accountDetails,
        counterpartyCheck,
        clinicChecks,
        doctorCheck,
        caseChecks,
        itemRollbackChecks,
        allChecksTrue,
      });
      setShowDeletePreview(true);
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
      const newRemaining = remaining + amt;
      const now = new Date();
      const formattedDate = formatDate(now);
      const logTime = formatTime(now);
      if (payment.bankId) {
        batch.update(doc(db, 'Banks', payment.bankId), {
          balance: increment(isIncome ? -net : net),
        });
      }
      batch.delete(doc(db, 'Finance', invoiceId, 'Payments', payment.id));
      batch.update(doc(db, 'Finance', invoiceId), {
        paidAmount: increment(-amt),
        remainingAmount: increment(amt),
        total: invoiceTotal,
        status: newRemaining <= 0 ? 'Paid' : 'Remaining',
      });
      await syncInvoiceNotification({
        batch,
        newRemaining,
        date: formattedDate,
        time: logTime,
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
          <button type="button" onClick={handlePrint} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Print Invoice</button>
          <button type="button" onClick={openDeletePreview} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm">Delete Invoice</button>
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

      {showDeletePreview && deleteImpact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-xl p-6 max-w-lg w-full border border-border/70">
            <h3 className="font-bold text-foreground mb-2">Delete Invoice Preview</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This action will rollback all linked relations and cannot be undone.
            </p>

            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div className="border rounded-md p-2"><span className="text-muted-foreground">Payments</span><p className="font-semibold">{deleteImpact.paymentsCount}</p></div>
              <div className="border rounded-md p-2"><span className="text-muted-foreground">Items</span><p className="font-semibold">{deleteImpact.itemsCount}</p></div>
              <div className="border rounded-md p-2"><span className="text-muted-foreground">Notifications</span><p className="font-semibold">{deleteImpact.notificationsCount}</p></div>
              <div className="border rounded-md p-2"><span className="text-muted-foreground">Logs</span><p className="font-semibold">{deleteImpact.logsCount}</p></div>
              <div className="border rounded-md p-2"><span className="text-muted-foreground">Inventory Rows</span><p className="font-semibold">{deleteImpact.inventoryCount}</p></div>
              <div className="border rounded-md p-2"><span className="text-muted-foreground">Cases Reset</span><p className="font-semibold">{deleteImpact.caseCount}</p></div>
            </div>

            <ul className="text-sm text-muted-foreground space-y-1 mb-4">
              <li>Bank/User accounts rollback across {deleteImpact.uniqueAccounts} account(s), total {formatPriceLE(deleteImpact.totalPaidNet)}.</li>
              <li>Client/Supplier and Clinic balance rollback by remaining amount {formatPriceLE(deleteImpact.remainingNow)}.</li>
              <li>Doctor balance rollback amount {formatPriceLE(deleteImpact.doctorAmount)}.</li>
              {invoice?.type === 'Purchase Invoice' && (
                <li>Stock rollback total quantity: {deleteImpact.stockImpact}.</li>
              )}
            </ul>

            <div className="border rounded-md p-3 mb-4 bg-background/30">
              <p className="text-sm font-semibold text-foreground mb-2">Rollback Readiness</p>
              <p className={`text-xs mb-2 ${deleteImpact.allChecksTrue ? 'text-emerald-600' : 'text-destructive'}`}>
                Ready: {deleteImpact.allChecksTrue ? 'TRUE' : 'FALSE'}
              </p>
              <div className="space-y-1 text-xs text-muted-foreground max-h-40 overflow-auto">
                {deleteImpact.accountDetails.map((a) => (
                  <p key={a.id}>
                    {a.canRollback ? 'TRUE' : 'FALSE'} - {a.type}: {a.name} ({formatPriceLE(a.amount)})
                  </p>
                ))}
                <p>
                  {deleteImpact.counterpartyCheck.canRollback ? 'TRUE' : 'FALSE'} - {deleteImpact.counterpartyCheck.label}: {deleteImpact.counterpartyCheck.name}
                </p>
                {deleteImpact.clinicChecks.map((c, idx) => (
                  <p key={`${c.name}-${idx}`}>
                    {c.canRollback ? 'TRUE' : 'FALSE'} - Clinic: {c.name}
                  </p>
                ))}
                <p>
                  {deleteImpact.doctorCheck.canRollback ? 'TRUE' : 'FALSE'} - Doctor: {deleteImpact.doctorCheck.name}
                </p>
                {deleteImpact.caseChecks.map((c) => (
                  <p key={c.caseId}>
                    {c.canRollback ? 'TRUE' : 'FALSE'} - Case: {c.caseId}
                  </p>
                ))}
                {deleteImpact.itemRollbackChecks.map((i) => (
                  <p key={i.itemId}>
                    {i.canRollback ? 'TRUE' : 'FALSE'} - Item: {i.itemName} (qty {i.qty})
                  </p>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowDeletePreview(false);
                  setDeleteImpact(null);
                }}
                className="px-4 py-2 border rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!deleteImpact.allChecksTrue) {
                    setSnack({ message: 'Some rollback checks are FALSE. Please review before deleting.', isError: true });
                    return;
                  }
                  setShowDeletePreview(false);
                  await deleteInvoice();
                }}
                disabled={processing}
                className="px-4 py-2 bg-red-600 text-white rounded-md"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={printRef}>
          <div className="invoice-page">
            <div className="header">
              <div className="header-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Logo" className="logo" />
                <div className="clinic-name">{invoice.clinicName || invoice.name || '—'}</div>
                <div className="doctor-name">Dr. {invoice.drName || '—'}</div>
              </div>
              <div className="header-right">
                <div className="label">Invoice Date</div>
                <div className="value">{invoice.Date} {invoice.Time}</div>
                <div className="label">Status</div>
                <div className="value">{invoice.status}</div>
                <div className="label">Payment</div>
                <div className="value">{invoice.bank || '—'}</div>
                <div className="label">Plan</div>
                <div className="value">
                  {invoice.paymentPlan || '—'}
                  {invoice.paymentPlan === 'Installments' && Number(invoice.installmentMonths) > 0
                    ? ` (${invoice.installmentMonths} months)`
                    : ''}
                </div>
              </div>
            </div>

            <div className="invoice-title">Invoice</div>

            <table>
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>#</th>
                  <th style={{ width: '24%' }}>Case Code</th>
                  <th style={{ width: '26%' }}>Case</th>
                  <th style={{ width: '15%' }}>Quantity</th>
                  <th style={{ width: '25%' }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td>{getPrintedCaseCode(item)}</td>
                    <td>{item.patientName || invoice.patientName || invoice.name || '—'}</td>
                    <td>{item.quantity || 1}</td>
                    <td>{item.name || '—'}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td>1</td>
                    <td>{invoiceCaseCode}</td>
                    <td>{invoice.patientName || invoice.name || '—'}</td>
                    <td>1</td>
                    <td>{invoice.type || '—'}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="totals">
              <div className="totals-table">
                <div className="totals-row">
                  <span className="totals-label">Previous Bill</span>
                  <span className="totals-value">{formatPriceLE(previousBillVal)}</span>
                </div>
                <div className="totals-row">
                  <span className="totals-label">Current Bill</span>
                  <span className="totals-value">{formatPriceLE(currentBill)}</span>
                </div>
                <div className="totals-row grand">
                  <span>Total</span>
                  <span>{formatPriceLE(grandPrintTotal)}</span>
                </div>
                <div className="totals-row">
                  <span className="totals-label">Paid</span>
                  <span className="totals-value">{formatPriceLE(paidPrintAmount)}</span>
                </div>
                <div className="totals-row">
                  <span className="totals-label">Remaining</span>
                  <span className="totals-value">{formatPriceLE(remainingPrintAmount)}</span>
                </div>
              </div>
            </div>

            <div className="footer">360 Lab ERP &middot; Generated on {new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      <LoadingOverlay show={processing} />
      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: '', isError: false })} />
    </>
  );
}
