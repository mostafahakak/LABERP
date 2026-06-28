'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDoc,
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

export default function CreateInvoice() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [banks, setBanks] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [userID, setUserID] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [drUID, setDrUID] = useState('');
  const [paymentPlan, setPaymentPlan] = useState('Full Payment');
  const [bankName, setBankName] = useState('');
  const [bankId, setBankId] = useState('');
  const [discount, setDiscount] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [doctorFeeType, setDoctorFeeType] = useState('Percent');
  const [doctorFeeValue, setDoctorFeeValue] = useState('0');
  const [installmentMonths, setInstallmentMonths] = useState('0');
  const [note, setNote] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(formatDate(new Date()));
  const [invoiceTime, setInvoiceTime] = useState(formatTime());
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ message: '', isError: false });

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'Clients')),
      getDocs(query(collection(db, 'Users'), where('type', 'in', ['Dr', 'Admin']))),
      getDocs(collection(db, 'Banks')),
      getDocs(collection(db, 'InvoiceItems')),
    ]).then(([clientsSnap, usersSnap, banksSnap, itemsSnap]) => {
      setClients(clientsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setDoctors(usersSnap.docs.map((d) => ({ id: d.id, name: d.data().name, ...d.data() })));
      setBanks(banksSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setInvoiceItems(itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const subtotal = useMemo(
    () => selectedItems.reduce((s, i) => s + i.price * i.quantity, 0),
    [selectedItems]
  );
  const discountVal = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountVal);
  const paidVal = parseFloat(paidAmount) || 0;
  const remaining = Math.max(0, total - paidVal);
  const invoiceStatus = remaining <= 0 ? 'Paid' : 'Remaining';
  const feeVal = parseFloat(doctorFeeValue) || 0;
  const salesFee = doctorFeeType === 'Percent' ? (total * feeVal) / 100 : feeVal;
  const cardFee = calcCardFee(bankName, paidVal);
  const netAmountToBank = calcNetAmountToBank(bankName, paidVal);

  const addItem = (item) => {
    setSelectedItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { id: item.id, item: item.name, price: Number(item.price) || 0, quantity: 1 }];
    });
  };

  const selectClient = (clientName) => {
    const c = clients.find((x) => x.name === clientName);
    if (c) {
      setName(c.name);
      setPhone(c.phone || '');
      setUserID(c.id);
    }
  };

  const selectDoctor = (drName) => {
    const d = doctors.find((x) => x.name === drName);
    setSelectedDoctor(drName);
    setDrUID(d?.id || '');
  };

  const selectBank = (bName) => {
    const b = banks.find((x) => x.name === bName);
    setBankName(bName);
    setBankId(b?.id || '');
  };

  const submit = async () => {
    if (!name || !phone || !selectedDoctor || !bankName || selectedItems.length === 0) {
      setSnack({ message: 'Fill required fields and add items', isError: true });
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      let clientId = userID;
      if (!clientId) {
        const ref = await addDoc(collection(db, 'Clients'), {
          phone,
          balance: remaining,
          name,
        });
        clientId = ref.id;
      } else {
        const clientRef = doc(db, 'Clients', clientId);
        const snap = await getDoc(clientRef);
        const currentBalance = Number(snap.data()?.balance) || 0;
        await updateDoc(clientRef, { balance: currentBalance + remaining });
      }

      const drRef = doc(db, 'Users', drUID);
      const drSnap = await getDoc(drRef);
      const drBalanceBefore = Number(drSnap.data()?.balance) || 0;
      await updateDoc(drRef, { balance: drBalanceBefore + salesFee });

      const bankRef = doc(db, 'Banks', bankId);
      const bankSnap = await getDoc(bankRef);
      const bankBalanceBefore = Number(bankSnap.data()?.balance) || 0;
      await updateDoc(bankRef, { balance: bankBalanceBefore + netAmountToBank });

      const financeRef = doc(collection(db, 'Finance'));
      await setDoc(financeRef, {
        Date: invoiceDate,
        Time: invoiceTime,
        adminID: user.uid,
        drBalanceAfter: drBalanceBefore + salesFee,
        drBalanceBefore,
        drPercent: feeVal,
        bankId,
        bankBalanceAfter: bankBalanceBefore + netAmountToBank,
        bankBalanceBefore,
        note,
        bank: bankName,
        phone: name,
        name: phone,
        paidAmount: paidVal,
        remainingAmount: remaining,
        total,
        paymentPlan,
        installmentMonths: parseInt(installmentMonths, 10) || 0,
        role: 'Dr',
        discount: discountVal,
        type: 'Invoice',
        userID: clientId,
        DrUID: drUID,
        drName: selectedDoctor,
        drAmount: salesFee,
        drPaymentType: doctorFeeType,
        branch: user.branch || 'New cairo',
        status: invoiceStatus,
      });

      for (const item of selectedItems) {
        await addDoc(collection(db, 'Finance', financeRef.id, 'Items'), {
          name: item.item,
          price: item.price,
          quantity: item.quantity,
          itemId: item.id,
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

      await setDoc(doc(db, 'Logs', financeRef.id), {
        actionID: financeRef.id,
        section: 'Finance',
        adminID: user.uid,
        adminName: user.name,
        branch: user.branch || 'New cairo',
        bank: bankName,
        name: phone,
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
          name: phone,
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
      }
      if (salesFee > 0) {
        await addDoc(collection(db, 'Notifications'), {
          name: selectedDoctor,
          type: 'Invoice Payment',
          amount: salesFee,
          quantity: 0,
          docID: financeRef.id,
          collectionName: 'Finance',
          date: invoiceDate,
          time: invoiceTime,
          status: 'Remaining',
          branch: user.branch || 'New cairo',
        });
      }

      setSnack({ message: 'Invoice created successfully', isError: false });
      setSelectedItems([]);
      setName('');
      setPhone('');
      setUserID('');
      setPaidAmount('0');
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Create Invoice" />
      <PageCard title="Patient Invoice">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Client Name</label>
            <input list="clients-list" value={name} onChange={(e) => { setName(e.target.value); selectClient(e.target.value); }} className="w-full mt-1 px-3 py-2 border rounded-md text-foreground" />
            <datalist id="clients-list">{clients.map((c) => <option key={c.id} value={c.name} />)}</datalist>
          </div>
          <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <TextField label="Date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} type="date" />
          <TextField label="Time" value={invoiceTime} onChange={(e) => setInvoiceTime(e.target.value)} />
          <SelectField label="Sales Doctor" value={selectedDoctor} onChange={(v) => selectDoctor(v)} options={doctors.map((d) => d.name)} />
          <SelectField label="Payment Plan" value={paymentPlan} onChange={setPaymentPlan} options={['Full Payment', 'Partial Payment', 'Installments']} />
          <SelectField label="Bank" value={bankName} onChange={(v) => selectBank(v)} options={banks.map((b) => b.name)} />
          <TextField label="Discount" value={discount} onChange={(e) => setDiscount(e.target.value)} type="number" />
          <TextField label="Paid Amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} type="number" />
          <SelectField label="Doctor Fee Type" value={doctorFeeType} onChange={setDoctorFeeType} options={['Percent', 'Fixed']} />
          <TextField label="Doctor Fee Value" value={doctorFeeValue} onChange={(e) => setDoctorFeeValue(e.target.value)} type="number" />
          <TextField label="Installment Months" value={installmentMonths} onChange={(e) => setInstallmentMonths(e.target.value)} type="number" required={false} />
          <TextField label="Notes" value={note} onChange={(e) => setNote(e.target.value)} maxLines={2} required={false} className="md:col-span-2" />
        </div>
      </PageCard>

      <PageCard title="Invoice Items">
        <div className="flex flex-wrap gap-2 mb-4">
          {invoiceItems.map((item) => (
            <button key={item.id} type="button" onClick={() => addItem(item)} className="px-3 py-1.5 bg-muted rounded-lg text-sm text-foreground hover:bg-primary/20">
              {item.name} — {formatPriceLE(item.price)}
            </button>
          ))}
        </div>
        {selectedItems.length > 0 && (
          <div className="space-y-2 mb-4">
            {selectedItems.map((item) => (
              <div key={item.id} className="flex justify-between border rounded-lg p-3">
                <span>{item.item} x{item.quantity}</span>
                <span className="font-medium">{formatPriceLE(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>Subtotal: <strong>{formatPriceLE(subtotal)}</strong></div>
          <div>Total: <strong>{formatPriceLE(total)}</strong></div>
          <div>Remaining: <strong>{formatPriceLE(remaining)}</strong></div>
          <div>Sales Fee: <strong>{formatPriceLE(salesFee)}</strong></div>
        </div>
        <button type="button" onClick={submit} disabled={loading} className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground rounded-md font-medium">
          Submit Invoice
        </button>
      </PageCard>
      <LoadingOverlay show={loading} />
      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: '', isError: false })} />
    </>
  );
}
