'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatPriceLE, formatTime } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { PageCard, TextField, SelectField, Snackbar, LoadingOverlay } from '@/components/ui/PageComponents';
import { calcCardFee, calcNetAmountToBank } from './finance-helpers';

export default function CaseInvoice() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [banks, setBanks] = useState([]);
  const [selectedCaseIds, setSelectedCaseIds] = useState([]);
  const [clinicName, setClinicName] = useState('');
  const [paymentPlan, setPaymentPlan] = useState('Full Payment');
  const [bankName, setBankName] = useState('');
  const [bankId, setBankId] = useState('');
  const [discount, setDiscount] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [installmentMonths, setInstallmentMonths] = useState('0');
  const [note, setNote] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(formatDate(new Date()));
  const [invoiceTime, setInvoiceTime] = useState(formatTime());
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ message: '', isError: false });

  useEffect(() => {
    Promise.all([
      getDocs(query(collection(db, 'Cases'), where('status', '==', 'Ready to Invoice'))),
      getDocs(collection(db, 'Clinics')),
      getDocs(collection(db, 'Banks')),
    ]).then(([casesSnap, clinicsSnap, banksSnap]) => {
      setCases(casesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setClinics(clinicsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setBanks(banksSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const selectedCases = useMemo(
    () => cases.filter((c) => selectedCaseIds.includes(c.id)),
    [cases, selectedCaseIds]
  );

  const invoiceItems = useMemo(
    () => selectedCases.map((c) => ({
      item: c.type || c.caseType || 'Case',
      price: Number(c.price) || Number(c.total) || 0,
      quantity: 1,
      caseId: c.id,
      patientName: c.patientName,
      drName: c.drName,
    })),
    [selectedCases]
  );

  const subtotal = invoiceItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountVal = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountVal);
  const paidVal = parseFloat(paidAmount) || 0;
  const remaining = Math.max(0, total - paidVal);
  const invoiceStatus = remaining <= 0 ? 'Paid' : 'Remaining';
  const netAmountToBank = calcNetAmountToBank(bankName, paidVal);
  const cardFee = calcCardFee(bankName, paidVal);

  const toggleCase = (id) => {
    setSelectedCaseIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectBank = (bName) => {
    const b = banks.find((x) => x.name === bName);
    setBankName(bName);
    setBankId(b?.id || '');
  };

  const submit = async () => {
    if (!clinicName || !bankName || invoiceItems.length === 0) {
      setSnack({ message: 'Select clinic, bank, and cases', isError: true });
      return;
    }
    setLoading(true);
    try {
      const bankRef = doc(db, 'Banks', bankId);
      const bankSnap = await (await import('firebase/firestore')).getDoc(bankRef);
      const bankBalanceBefore = Number(bankSnap.data()?.balance) || 0;
      await updateDoc(bankRef, { balance: bankBalanceBefore + netAmountToBank });

      const financeRef = doc(collection(db, 'Finance'));
      await setDoc(financeRef, {
        Date: invoiceDate,
        Time: invoiceTime,
        adminID: user.uid,
        bankId,
        bankBalanceAfter: bankBalanceBefore + netAmountToBank,
        bankBalanceBefore,
        note,
        bank: bankName,
        name: clinicName,
        clinicName,
        patientName: invoiceItems[0]?.patientName || '',
        drName: invoiceItems[0]?.drName || '',
        caseId: invoiceItems[0]?.caseId || '',
        caseIds: invoiceItems.map((i) => i.caseId),
        paidAmount: paidVal,
        remainingAmount: remaining,
        total,
        paymentPlan,
        installmentMonths: parseInt(installmentMonths, 10) || 0,
        discount: discountVal,
        type: 'Invoice',
        branch: user.branch || 'New cairo',
        status: invoiceStatus,
      });

      for (const item of invoiceItems) {
        await addDoc(collection(db, 'Finance', financeRef.id, 'Items'), {
          name: item.item,
          price: item.price,
          quantity: item.quantity,
          caseId: item.caseId,
        });
      }

      await addDoc(collection(db, 'Finance', financeRef.id, 'Payments'), {
        balanceBefore: bankBalanceBefore,
        balanceAfter: bankBalanceBefore + netAmountToBank,
        bank: bankName,
        bankID: bankId,
        Date: invoiceDate,
        Time: invoiceTime,
        paidAmount: paidVal,
        netAmountToBank,
        cardFee,
      });

      const now = new Date();
      await setDoc(doc(db, 'Logs', financeRef.id), {
        actionID: financeRef.id,
        section: 'Finance',
        adminID: user.uid,
        adminName: user.name,
        branch: user.branch || 'New cairo',
        bank: bankName,
        name: clinicName,
        clinicName,
        type: 'Income',
        cName: 'Invoice',
        Time: formatTime(now),
        Date: formatDate(now),
        amount: paidVal,
        netAmountToBank,
        cardFee,
      });

      if (invoiceStatus === 'Remaining') {
        await addDoc(collection(db, 'Notifications'), {
          name: clinicName,
          type: 'Invoice',
          amount: remaining,
          quantity: 0,
          docID: financeRef.id,
          collectionName: 'Finance',
          date: invoiceDate,
          time: invoiceTime,
          status: 'Remaining',
          branch: user.branch || 'New cairo',
        });
        const clinicQuery = await getDocs(query(collection(db, 'Clinics'), where('name', '==', clinicName)));
        if (!clinicQuery.empty) {
          const clinicDoc = clinicQuery.docs[0];
          const currentBalance = Number(clinicDoc.data().balance) || 0;
          await updateDoc(clinicDoc.ref, { balance: currentBalance + remaining });
        }
      }

      for (const item of invoiceItems) {
        await updateDoc(doc(db, 'Cases', item.caseId), { status: 'Done' });
      }

      setSnack({ message: 'Case invoice created', isError: false });
      setSelectedCaseIds([]);
      setPaidAmount('0');
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Case Invoice" />
      <PageCard title="Invoice Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField label="Clinic" value={clinicName} onChange={setClinicName} options={clinics.map((c) => c.name)} />
          <SelectField label="Bank" value={bankName} onChange={(v) => selectBank(v)} options={banks.map((b) => b.name)} />
          <SelectField label="Payment Plan" value={paymentPlan} onChange={setPaymentPlan} options={['Full Payment', 'Partial Payment', 'Installments']} />
          <TextField label="Date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} type="date" />
          <TextField label="Time" value={invoiceTime} onChange={(e) => setInvoiceTime(e.target.value)} />
          <TextField label="Discount" value={discount} onChange={(e) => setDiscount(e.target.value)} type="number" />
          <TextField label="Paid Amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} type="number" />
          <TextField label="Notes" value={note} onChange={(e) => setNote(e.target.value)} required={false} />
        </div>
      </PageCard>

      <PageCard title="Cases Ready to Invoice">
        {cases.length === 0 ? (
          <p className="text-gray-500">No cases ready to invoice.</p>
        ) : (
          <div className="space-y-2">
            {cases.map((c) => (
              <label key={c.id} className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer">
                <input type="checkbox" checked={selectedCaseIds.includes(c.id)} onChange={() => toggleCase(c.id)} />
                <div className="flex-1">
                  <p className="font-medium text-black">{c.patientName} — {c.type || c.caseType}</p>
                  <p className="text-sm text-gray-600">{c.clinicName || c.clinic} · Dr. {c.drName}</p>
                </div>
                <span className="font-semibold">{formatPriceLE(c.price || c.total)}</span>
              </label>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <span>Total: <strong>{formatPriceLE(total)}</strong></span>
          <span>Remaining: <strong>{formatPriceLE(remaining)}</strong></span>
        </div>
        <button type="button" onClick={submit} disabled={loading} className="mt-4 px-6 py-2.5 bg-black text-[#c3a28e] rounded-md">Create Invoice</button>
      </PageCard>
      <LoadingOverlay show={loading} />
      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: '', isError: false })} />
    </>
  );
}
