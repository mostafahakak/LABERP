'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { DetailSkeleton } from '@/components/ui/PageSkeleton';
import Header from '@/components/layout/Header';
import { PageCard, TextField, SelectField, Snackbar, LoadingOverlay } from '@/components/ui/PageComponents';
import { formatPriceLE, formatDate, formatTime } from '@/lib/utils';
import { WORKFLOW_ROLE_LABELS, WORKFLOW_ROLES, WORKFLOW_USER_TYPE } from '@/lib/phase-utils';

const SHIFT_OPTIONS = ['Day', 'Night'];
const FULL_TIME_OPTIONS = ['Full time', 'Part time'];
const USER_TYPES_ADMIN = ['Admin', 'Moderator', 'Receptionist', 'Workflow', 'Dr', 'Website', 'HR'];
const USER_TYPES_HR = ['Dr', 'HR', 'Workflow', 'Receptionist'];
const BRANCH_OPTIONS = ['New cairo', 'Madinaty'];
const FEE_TYPE_OPTIONS = ['Fixed', '%'];

const FINANCE_TABS = [
  {
    label: 'All',
    value: 'All',
    activeClass: 'bg-sky-600 text-white border-sky-600',
    idleClass: 'border-sky-200 text-sky-700 hover:bg-sky-50',
  },
  {
    label: 'Salary',
    value: 'Salary',
    activeClass: 'bg-emerald-600 text-white border-emerald-600',
    idleClass: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
  },
  {
    label: 'Loan',
    value: 'Loan',
    activeClass: 'bg-amber-500 text-white border-amber-500',
    idleClass: 'border-amber-200 text-amber-700 hover:bg-amber-50',
  },
  {
    label: 'Bouns',
    value: 'Bonus',
    activeClass: 'bg-violet-600 text-white border-violet-600',
    idleClass: 'border-violet-200 text-violet-700 hover:bg-violet-50',
  },
  {
    label: 'Deductions',
    value: 'Deductions',
    activeClass: 'bg-rose-600 text-white border-rose-600',
    idleClass: 'border-rose-200 text-rose-700 hover:bg-rose-50',
  },
];

function FinanceRecordCard({ record, type }) {
  const paidAmount = Number(record.paidAmount) || 0;
  const drBefore = Number(record.drBalanceBefore);
  const drAfter = Number(record.drBalanceAfter);
  const bankBefore = Number(record.bankBalanceBefore);
  const bankAfter = Number(record.bankBalanceAfter);
  const detailType = type === 'Invoice' ? 'Income' : 'Outcome';
  const href = `/dashboard/finance/invoices/detail?id=${record.id}&type=${detailType}`;

  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-cyan-100 bg-linear-to-br from-white to-cyan-50/50 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-900/10 dark:from-card dark:to-card"
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <div>
          <p className="font-semibold text-foreground">{type}</p>
          <p className="text-sm text-muted-foreground">{record.Date} {record.Time ? `at ${record.Time}` : ''}</p>
        </div>
        {record.bank && <span className="text-xs bg-cyan-100/80 text-cyan-800 px-2 py-1 rounded-lg dark:text-cyan-200 dark:bg-cyan-900/30">{record.bank}</span>}
      </div>
      <p className="text-sm text-foreground/80">Paid: {formatPriceLE(paidAmount)}</p>
      {!Number.isNaN(drBefore) && !Number.isNaN(drAfter) && (
        <p className="text-sm text-muted-foreground">
          DR Balance: Before {formatPriceLE(drBefore)} → After {formatPriceLE(drAfter)}
        </p>
      )}
      {!Number.isNaN(bankBefore) && !Number.isNaN(bankAfter) && (
        <p className="text-sm text-muted-foreground">
          Bank Balance: Before {formatPriceLE(bankBefore)} → After {formatPriceLE(bankAfter)}
        </p>
      )}
      {record.drAmount != null && (
        <p className="text-sm text-muted-foreground">DR Amount: {formatPriceLE(record.drAmount)}</p>
      )}
      {record.note && (
        <p className="text-sm text-foreground/80 mt-1">Reason: {record.note}</p>
      )}
    </Link>
  );
}

function DeductionDialog({ userData, userId, authUser, onClose, onSnack }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const val = parseFloat(amount) || 0;
    if (val <= 0) {
      onSnack('Enter a valid amount', true);
      return;
    }
    if (!reason.trim()) {
      onSnack('Enter a reason for the deduction', true);
      return;
    }
    setSubmitting(true);
    try {
      const now = new Date();
      const logDate = formatDate(now);
      const logTime = formatTime(now);
      const balanceBefore = Number(userData.balance) || 0;
      const balanceAfter = balanceBefore - val;

      const financeRef = doc(collection(db, 'Finance'));
      await setDoc(financeRef, {
        DrUID: userId,
        userID: userId,
        name: userData.name,
        drName: userData.name,
        role: userData.type || '',
        paidAmount: val,
        total: val,
        Date: logDate,
        Time: logTime,
        adminID: authUser?.uid || '',
        type: 'Deductions',
        note: reason,
        bank: '',
        bankId: '',
        bankBalanceBefore: 0,
        bankBalanceAfter: 0,
        drBalanceBefore: balanceBefore,
        drBalanceAfter: balanceAfter,
        drAmount: val,
        drPaymentType: '',
        drPercent: 0,
        remainingAmount: 0,
        paymentPlan: 'Full Payment',
        installmentMonths: 0,
        discount: 0,
        branch: authUser?.branch || 'New cairo',
        branchTo: authUser?.branch || 'New cairo',
        status: 'Paid',
        documentID: financeRef.id,
        phone: '',
      });

      await updateDoc(doc(db, 'Users', userId), { balance: balanceAfter });

      await addDoc(collection(db, 'Logs'), {
        actionID: financeRef.id,
        section: 'Finance',
        adminID: authUser?.uid || '',
        adminName: authUser?.name || '',
        branch: authUser?.branch || 'New cairo',
        type: 'Deduction',
        cName: userData.name,
        bank: '',
        name: 'Deductions',
        Time: logTime,
        Date: logDate,
        amount: val,
      });

      onSnack(`Deduction of ${formatPriceLE(val)} applied — balance updated`, false);
      onClose();
    } catch (e) {
      onSnack(e.message, true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-rose-200/40 p-6 max-w-md w-full shadow-2xl">
        <h3 className="font-bold text-foreground text-lg mb-1">Apply Deduction</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Deduct from <span className="font-semibold text-foreground">{userData.name}</span>'s balance.
          Current balance: <span className="font-semibold">{formatPriceLE(userData.balance)}</span>
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Amount (LE)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Late attendance, Damage, etc."
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground"
            />
          </div>
        </div>

        {amount && parseFloat(amount) > 0 && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-sm dark:bg-rose-950/20">
            <p className="text-muted-foreground">Balance after deduction:</p>
            <p className="font-bold text-foreground">
              {formatPriceLE((Number(userData.balance) || 0) - parseFloat(amount))}
            </p>
          </div>
        )}

        <div className="flex gap-2 justify-end mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-xl text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="px-4 py-2 bg-rose-600 text-white rounded-xl font-semibold disabled:opacity-50"
          >
            {submitting ? 'Applying...' : 'Apply Deduction'}
          </button>
        </div>
      </div>
    </div>
  );
}

function buildFinanceQuery(userId, userName, type, startDate, endDate) {
  const constraints = [where('type', '==', type)];

  if (type === 'Purchase Invoice') {
    constraints.push(where('bank', '==', userName || ''));
  } else {
    constraints.push(where('DrUID', '==', userId));
  }

  if (startDate) constraints.push(where('Date', '>=', startDate));
  if (endDate) constraints.push(where('Date', '<=', endDate));

  constraints.push(orderBy('Date', 'desc'));
  return query(collection(db, 'Finance'), ...constraints);
}

async function cleanupUserData(userId, userName) {
  const financeQuery = query(collection(db, 'Finance'), where('DrUID', '==', userId));
  const financeSnap = await getDocs(financeQuery);
  for (const d of financeSnap.docs) await deleteDoc(d.ref);

  const purchaseQuery = query(
    collection(db, 'Finance'),
    where('type', '==', 'Purchase Invoice'),
    where('bank', '==', userName || '')
  );
  const purchaseSnap = await getDocs(purchaseQuery);
  for (const d of purchaseSnap.docs) await deleteDoc(d.ref);

  const notificationsQuery = query(collection(db, 'Notifications'), where('name', '==', userName || ''));
  const notificationsSnap = await getDocs(notificationsQuery);
  for (const d of notificationsSnap.docs) await deleteDoc(d.ref);

  const salariesQuery = query(collection(db, 'salariesCalc'), where('userId', '==', userId));
  const salariesSnap = await getDocs(salariesQuery);
  for (const d of salariesSnap.docs) await deleteDoc(d.ref);
}

export default function EmployeeProfile({ userId }) {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedTab, setSelectedTab] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [financeRecords, setFinanceRecords] = useState([]);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [snack, setSnack] = useState({ message: '', isError: false });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeduction, setShowDeduction] = useState(false);

  const typeOptions = authUser?.type === 'Admin' ? USER_TYPES_ADMIN : USER_TYPES_HR;
  const isAdmin = authUser?.type === 'Admin';

  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(
      doc(db, 'Users', userId),
      (d) => {
        setUserData(d.exists() ? { id: d.id, ...d.data() } : null);
        setLoading(false);
      },
      (err) => {
        setSnack({ message: err.message, isError: true });
        setLoading(false);
      }
    );
    return () => unsub();
  }, [userId]);

  useEffect(() => {
    if (!userId || !userData) return;

    if (selectedTab === 'All') {
      setFinanceLoading(true);
      const types = FINANCE_TABS.filter((tab) => tab.value !== 'All').map((tab) => tab.value);
      const unsubs = [];
      const allRecords = {};

      types.forEach((type) => {
        let q;
        try {
          q = buildFinanceQuery(userId, userData.name, type, startDate || null, endDate || null);
        } catch {
          return;
        }
        const unsub = onSnapshot(q, (snap) => {
          allRecords[type] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          const merged = Object.entries(allRecords).flatMap(([t, recs]) =>
            recs.map((r) => ({ ...r, _type: t }))
          );
          merged.sort((a, b) => {
            const dateCmp = (b.Date || '').localeCompare(a.Date || '');
            if (dateCmp !== 0) return dateCmp;
            return (b.Time || '').localeCompare(a.Time || '');
          });
          setFinanceRecords(merged);
          setFinanceLoading(false);
        });
        unsubs.push(unsub);
      });

      return () => unsubs.forEach((u) => u());
    }

    setFinanceLoading(true);
    let q;
    try {
      q = buildFinanceQuery(userId, userData.name, selectedTab, startDate || null, endDate || null);
    } catch (e) {
      setSnack({ message: e.message, isError: true });
      setFinanceLoading(false);
      return undefined;
    }

    const unsub = onSnapshot(
      q,
      (snap) => {
        setFinanceRecords(snap.docs.map((d) => ({ id: d.id, ...d.data(), _type: selectedTab })));
        setFinanceLoading(false);
      },
      (err) => {
        setSnack({ message: err.message, isError: true });
        setFinanceLoading(false);
      }
    );
    return () => unsub();
  }, [userId, userData, selectedTab, startDate, endDate]);

  const updateField = (field, value) => {
    setUserData((prev) => ({ ...prev, [field]: value }));
  };

  const saveProfile = async () => {
    if (!userData) return;
    setSaving(true);
    try {
      const { id, ...data } = userData;
      const payload = { ...data };
      if (payload.salary != null) payload.salary = Number(payload.salary) || 0;
      if (payload.feeValue != null) payload.feeValue = Number(payload.feeValue) || 0;
      await updateDoc(doc(db, 'Users', userId), payload);
      setSnack({ message: 'User updated successfully!', isError: false });
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async () => {
    if (!userData) return;
    setDeleting(true);
    try {
      await cleanupUserData(userId, userData.name);
      await deleteDoc(doc(db, 'Users', userId));
      setSnack({ message: 'User deleted successfully!', isError: false });
      router.push('/dashboard/hr/employees/list');
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const profileFields = useMemo(
    () => [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'tel' },
      { key: 'familyPhone', label: 'Family Phone', type: 'tel' },
      { key: 'address', label: 'Address', type: 'text' },
      { key: 'salary', label: 'Salary', type: 'number' },
      { key: 'feeValue', label: 'Fee Value', type: 'number' },
      { key: 'balance', label: 'Balance', type: 'readonly' },
    ],
    []
  );

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!userData) {
    return (
      <>
        <Header title="Employee Profile" breadcrumbs={[{ label: 'HR', href: '/dashboard/hr/employees/list' }]} />
        <p className="text-center text-muted-foreground py-12">User not found.</p>
      </>
    );
  }

  return (
    <>
      <Header title={userData.name || 'Employee Profile'} breadcrumbs={[{ label: 'HR', href: '/dashboard/hr/employees/list' }]} />

      <section className="relative mb-5 overflow-hidden rounded-3xl border border-cyan-100 bg-linear-to-r from-cyan-600 to-sky-600 p-6 text-white shadow-lg shadow-cyan-900/20">
        <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute -left-10 -bottom-12 h-40 w-40 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">Dental Staff Profile</p>
            <h2 className="text-2xl font-extrabold">{userData.name || 'Team Member'}</h2>
            <p className="text-sm text-cyan-50/90">Professional details, role, and finance activity overview.</p>
          </div>
          <div className="inline-flex items-center rounded-2xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
            {userData.type || 'N/A'}
          </div>
        </div>
      </section>

      <PageCard
        title="Profile"
        icon="🦷"
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-linear-to-r from-cyan-600 to-sky-600 shadow-sm disabled:opacity-50"
            >
              Save
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 border border-red-300 text-destructive rounded-xl text-sm"
              >
                Delete
              </button>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profileFields.map((f) =>
            f.type === 'readonly' ? (
              <TextField
                key={f.key}
                label={f.label}
                value={String(Math.trunc(Number(userData[f.key]) || 0))}
                onChange={() => {}}
                readOnly
              />
            ) : (
              <TextField
                key={f.key}
                label={f.label}
                value={String(userData[f.key] ?? '')}
                onChange={(e) => updateField(f.key, e.target.value)}
                type={f.type}
              />
            )
          )}
          <SelectField
            label="Shift"
            value={SHIFT_OPTIONS.includes(userData.shift) ? userData.shift : ''}
            onChange={(v) => updateField('shift', v)}
            options={SHIFT_OPTIONS}
          />
          <SelectField
            label="Type"
            value={typeOptions.includes(userData.type) ? userData.type : ''}
            onChange={(v) => updateField('type', v)}
            options={typeOptions}
          />
          {userData.type === WORKFLOW_USER_TYPE && (
            <SelectField
              label="Role (phase)"
              value={WORKFLOW_ROLES.includes(userData.role) ? userData.role : ''}
              onChange={(v) => updateField('role', v)}
              options={WORKFLOW_ROLES.map((role) => ({
                value: role,
                label: WORKFLOW_ROLE_LABELS[role] || role,
              }))}
            />
          )}
          <SelectField
            label="Branch"
            value={BRANCH_OPTIONS.includes(userData.branch) ? userData.branch : ''}
            onChange={(v) => updateField('branch', v)}
            options={BRANCH_OPTIONS}
          />
          <SelectField
            label="Fee Type"
            value={FEE_TYPE_OPTIONS.includes(userData.feeType) ? userData.feeType : ''}
            onChange={(v) => updateField('feeType', v)}
            options={FEE_TYPE_OPTIONS}
          />
          <SelectField
            label="Full Time"
            value={FULL_TIME_OPTIONS.includes(userData.fullTime) ? userData.fullTime : ''}
            onChange={(v) => updateField('fullTime', v)}
            options={FULL_TIME_OPTIONS}
          />
        </div>
        <div
          className="mt-4 inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10"
        >
          <span className="text-sm text-muted-foreground">Balance</span>
          <span className="font-bold text-green-700">{formatPriceLE(userData.balance)}</span>
        </div>
      </PageCard>

      <PageCard
        title="Finance Records"
        icon="🧾"
        action={
          <button
            type="button"
            onClick={() => setShowDeduction(true)}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 shadow-sm hover:bg-rose-700"
          >
            + Deduction
          </button>
        }
      >
        <div className="flex flex-wrap gap-2 mb-4">
          {FINANCE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSelectedTab(tab.value)}
              className={`border px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                selectedTab === tab.value
                  ? tab.activeClass
                  : tab.idleClass
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mb-4 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-cyan-200 rounded-xl text-foreground bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-cyan-200 rounded-xl text-foreground bg-white"
            />
          </div>
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="self-end px-3 py-2 text-destructive border border-destructive/30 rounded-xl text-sm bg-white"
            >
              Clear dates
            </button>
          )}
        </div>

        {financeLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : financeRecords.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No records found.</p>
        ) : (
          <div className="space-y-3">
            {financeRecords.map((rec) => (
              <FinanceRecordCard key={rec.id} record={rec} type={rec._type} />
            ))}
          </div>
        )}
      </PageCard>

      {showDeduction && (
        <DeductionDialog
          userData={userData}
          userId={userId}
          authUser={authUser}
          onClose={() => setShowDeduction(false)}
          onSnack={(msg, isErr) => setSnack({ message: msg, isError: isErr })}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-red-200/40 p-6 max-w-md w-full shadow-xl">
            <h3 className="font-bold text-foreground mb-3">Delete User</h3>
            <p className="text-sm text-foreground/80 mb-2">
              Are you sure you want to delete {userData.name}?
            </p>
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-foreground/80 mb-4">
              <p className="font-bold text-red-700 mb-1">⚠️ WARNING: This action will:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Delete the user from the Users collection</li>
                <li>Remove all related financial records</li>
                <li>Delete associated notifications</li>
                <li>Remove calculated salary records</li>
                <li>This action CANNOT be undone!</li>
              </ul>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 border rounded-xl">
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={deleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded-xl disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <LoadingOverlay show={saving || deleting} />
      <Snackbar
        message={snack.message}
        isError={snack.isError}
        onClose={() => setSnack({ message: '', isError: false })}
      />
    </>
  );
}
