'use client';

import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
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

const PAYMENT_TYPES = ['Salary', 'Loan', 'Bonus', 'Utility', 'Invoice Payment'];

export default function PaySalaries() {
  const { user } = useAuth();
  const [paymentType, setPaymentType] = useState('Salary');
  const [recipients, setRecipients] = useState([]);
  const [banks, setBanks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedNotificationUID, setSelectedNotificationUID] = useState('');
  const [selectedSalaryDocId, setSelectedSalaryDocId] = useState('');
  const [salaryDocs, setSalaryDocs] = useState([]);
  const [paidAmount, setPaidAmount] = useState('');
  const [currentBalance, setCurrentBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ message: '', isError: false });

  useEffect(() => {
    getDocs(collection(db, 'Banks')).then((snap) => {
      setBanks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    const loadRecipients = async () => {
      if (paymentType === 'Utility') {
        const snap = await getDocs(collection(db, 'Utilities'));
        setRecipients(snap.docs.map((d) => ({ id: d.id, collection: 'Utilities', ...d.data() })));
      } else {
        const snap = await getDocs(collection(db, 'Users'));
        setRecipients(snap.docs.map((d) => ({ id: d.id, collection: 'Users', ...d.data() })));
      }
      setSelectedRecipientId('');
      setCurrentBalance(null);
    };
    loadRecipients();
  }, [paymentType]);

  useEffect(() => {
    if (!selectedRecipientId || paymentType === 'Utility') return;
    const r = recipients.find((x) => x.id === selectedRecipientId);
    if (r) setCurrentBalance(Number(r.balance) || 0);
    if (paymentType === 'Salary') {
      getDocs(query(collection(db, 'Salaries'), where('userId', '==', selectedRecipientId))).then((snap) => {
        setSalaryDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
    }
    if (paymentType === 'Invoice Payment' || paymentType === 'Salary') {
      const rName = r?.name;
      if (rName) {
        getDocs(query(
          collection(db, 'Notifications'),
          where('name', '==', rName),
          where('type', 'in', paymentType === 'Invoice Payment' ? ['Invoice Payment', 'Invoice payment'] : [paymentType])
        )).then((snap) => setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
      }
    }
  }, [selectedRecipientId, paymentType, recipients]);

  const recipient = recipients.find((r) => r.id === selectedRecipientId);
  const bank = banks.find((b) => b.id === selectedBankId);
  const paidVal = parseFloat(paidAmount) || 0;
  const newBalance = currentBalance !== null ? currentBalance - paidVal : null;

  const submit = async () => {
    if (!selectedRecipientId || !selectedBankId || paidVal <= 0) {
      setSnack({ message: 'Select recipient, bank, and valid amount', isError: true });
      return;
    }
    const bankData = bank;
    const bankBalanceBefore = Number(bankData.balance) || 0;
    const allowsNegative = ['Instapay', 'Card', 'Cash'].includes(bankData.name);
    if (!allowsNegative && bankBalanceBefore < paidVal) {
      setSnack({ message: 'Insufficient bank balance', isError: true });
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      const logDate = formatDate(now);
      const logTime = formatTime(now);
      const balanceBeforeUser = Number(recipient.balance) || 0;
      const balanceAfterUser = balanceBeforeUser - paidVal;
      const bankBalanceAfter = bankBalanceBefore - paidVal;

      const financeData = {
        DrUID: selectedRecipientId,
        paidAmount: paidVal,
        Date: logDate,
        Time: logTime,
        adminID: user.uid,
        type: paymentType,
        bank: bankData.name,
        bankId: selectedBankId,
        bankBalanceAfter,
        bankBalanceBefore,
        note: '',
        phone: '',
        remainingAmount: 0,
        total: paidVal,
        paymentPlan: 'Full Payment',
        installmentMonths: 0,
        discount: 0,
        branch: user.branch || 'New cairo',
        branchTo: user.branch || 'New cairo',
        status: 'Paid',
        documentID: '',
        drBalanceAfter: paymentType === 'Utility' ? 0 : balanceAfterUser,
        drBalanceBefore: paymentType === 'Utility' ? 0 : balanceBeforeUser,
      };

      if (selectedPaymentTypeIsUtility()) {
        financeData.userID = selectedRecipientId;
        financeData.name = recipient.name;
        financeData.role = 'Utility';
        financeData.drName = recipient.name;
        financeData.drAmount = 0;
        financeData.drPaymentType = '';
        financeData.drPercent = 0;
      } else {
        financeData.userID = selectedRecipientId;
        financeData.name = recipient.name;
        financeData.role = recipient.type || '';
        financeData.drBalanceBefore = balanceBeforeUser;
        financeData.drBalanceAfter = balanceAfterUser;
        financeData.drAmount = paidVal;
        financeData.drName = recipient.name;
        financeData.drPaymentType = '';
        financeData.drPercent = 0;
        await updateDoc(doc(db, 'Users', selectedRecipientId), { balance: balanceAfterUser });
      }

      if (paymentType === 'Salary' && selectedSalaryDocId) {
        financeData.selectedSalaryUID = selectedSalaryDocId;
        const salDoc = salaryDocs.find((s) => s.id === selectedSalaryDocId);
        if (salDoc) {
          const newAmt = (Number(salDoc.amount) || 0) - paidVal;
          if (newAmt > 0) await updateDoc(doc(db, 'Salaries', selectedSalaryDocId), { amount: newAmt });
          else await deleteDoc(doc(db, 'Salaries', selectedSalaryDocId));
        }
      }

      if ((paymentType === 'Salary' || paymentType === 'Invoice Payment') && notifications.length > 0) {
        let remainingToPay = paidVal;
        for (const n of notifications) {
          if (remainingToPay <= 0) break;
          const notifAmount = Number(n.amount) || 0;
          const ref = doc(db, 'Notifications', n.id);
          if (notifAmount > remainingToPay) {
            await updateDoc(ref, { amount: notifAmount - remainingToPay });
            remainingToPay = 0;
          } else {
            await deleteDoc(ref);
            remainingToPay -= notifAmount;
          }
        }
      }

      const financeRef = doc(collection(db, 'Finance'));
      if (paymentType === 'Invoice Payment' && selectedInvoiceId) {
        financeData.documentID = selectedInvoiceId;
        if (selectedNotificationUID) financeData.selectedNotificationUID = selectedNotificationUID;
      } else {
        financeData.documentID = financeRef.id;
      }

      await addDoc(collection(db, 'Logs'), {
        actionID: financeRef.id,
        section: 'Finance',
        adminID: user.uid,
        adminName: user.name,
        branch: user.branch || 'New cairo',
        type: 'Expense',
        cName: recipient.name,
        bank: bankData.name,
        name: paymentType,
        Time: logTime,
        Date: logDate,
        amount: paidVal,
      });

      financeData.documentID = financeRef.id;
      await setDoc(financeRef, financeData);
      await updateDoc(doc(db, 'Banks', selectedBankId), { balance: bankBalanceAfter });

      setSnack({ message: 'Payment submitted and balances updated', isError: false });
      setPaidAmount('');
      setSelectedRecipientId('');
      setSelectedBankId('');
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  function selectedPaymentTypeIsUtility() {
    return paymentType === 'Utility';
  }

  return (
    <>
      <Header title="Pay Expense" />
      <PageCard title="Expense Payment">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField label="Payment Type" value={paymentType} onChange={setPaymentType} options={PAYMENT_TYPES} />
          <SelectField
            label={paymentType === 'Utility' ? 'Utility' : 'Recipient'}
            value={recipient?.name || ''}
            onChange={(v) => {
              const r = recipients.find((x) => x.name === v);
              setSelectedRecipientId(r?.id || '');
            }}
            options={recipients.map((r) => r.name)}
          />
          <SelectField
            label="Bank"
            value={bank?.name || ''}
            onChange={(v) => {
              const b = banks.find((x) => x.name === v);
              setSelectedBankId(b?.id || '');
            }}
            options={banks.map((b) => b.name)}
          />
          <TextField label="Paid Amount (LE)" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} type="number" />
          {paymentType === 'Salary' && salaryDocs.length > 0 && (
            <SelectField
              label="Salary Record"
              value={selectedSalaryDocId}
              onChange={setSelectedSalaryDocId}
              options={salaryDocs.map((s) => `${s.id.substring(0, 8)} — ${formatPriceLE(s.amount)}`)}
              placeholder="Optional"
            />
          )}
          {paymentType === 'Invoice Payment' && notifications.length > 0 && (
            <SelectField
              label="Notification"
              value={selectedNotificationUID}
              onChange={(id) => {
                setSelectedNotificationUID(id);
                const n = notifications.find((x) => x.id === id);
                setSelectedInvoiceId(n?.docID || '');
              }}
              options={notifications.map((n) => n.id)}
              placeholder="Select notification"
            />
          )}
        </div>
        {currentBalance !== null && paymentType !== 'Utility' && (
          <p className="text-sm text-muted-foreground mt-3">
            Current balance: {formatPriceLE(currentBalance)}
            {newBalance !== null && <> → New: {formatPriceLE(newBalance)}</>}
          </p>
        )}
        <button type="button" onClick={submit} disabled={loading} className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground rounded-md">Submit Payment</button>
      </PageCard>
      <LoadingOverlay show={loading} />
      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: '', isError: false })} />
    </>
  );
}
