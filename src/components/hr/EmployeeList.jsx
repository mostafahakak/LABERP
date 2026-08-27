'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ListSkeleton } from '@/components/ui/PageSkeleton';
import Header from '@/components/layout/Header';
import { Snackbar } from '@/components/ui/PageComponents';
import { formatPriceLE } from '@/lib/utils';

async function fetchSalaryCalcs(employeeName) {
  const q = query(
    collection(db, 'salariesCalc'),
    where('name', '==', employeeName),
    where('type', '==', 'Salary')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
}

async function deleteSalaryCalc(salaryDocRef, salaryDocId, employeeName, amount) {
  const batch = writeBatch(db);

  batch.delete(salaryDocRef);

  const notificationsQuery = query(
    collection(db, 'Notifications'),
    where('docID', '==', salaryDocId)
  );
  const notificationsSnap = await getDocs(notificationsQuery);
  notificationsSnap.docs.forEach((d) => batch.delete(d.ref));

  const userQuery = query(collection(db, 'Users'), where('name', '==', employeeName));
  const userSnap = await getDocs(userQuery);
  if (!userSnap.empty) {
    batch.update(userSnap.docs[0].ref, { balance: increment(-amount) });
  }

  await batch.commit();
  return notificationsSnap.docs.length;
}

function SalaryCalcDialog({ employeeName, onClose, onSnack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    fetchSalaryCalcs(employeeName)
      .then(setItems)
      .catch((e) => onSnack(e.message, true))
      .finally(() => setLoading(false));
  }, [employeeName, onSnack]);

  const handleDelete = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      const notifCount = await deleteSalaryCalc(
        confirm.ref,
        confirm.id,
        employeeName,
        confirm.amount
      );
      setItems((prev) => prev.filter((i) => i.id !== confirm.id));
      onSnack(
        `Salary calculation deleted successfully${notifCount ? ` (${notifCount} related notifications also deleted)` : ''}, user balance decremented by ${Math.trunc(confirm.amount)} LE`,
        false
      );
      setConfirm(null);
    } catch (e) {
      onSnack(`Error deleting salary calculation: ${e.message}`, true);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-cyan-200/40 p-6 max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl shadow-cyan-900/10">
        <h3 className="font-bold text-foreground mb-2">Salary Calculations - {employeeName}</h3>
        <p className="text-sm text-muted-foreground mb-4">Click delete on any salary calculation to remove it.</p>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No salary calculations found.</p>
        ) : (
          <div className="overflow-y-auto flex-1 space-y-2">
            {items.map((item) => {
              const amount = Number(item.amount) || 0;
              return (
                <div key={item.id} className="flex items-center justify-between border border-cyan-100 rounded-xl p-3 bg-white/70 dark:bg-card/80">
                  <div>
                    <p className="font-semibold text-foreground">
                      {item.month} - {formatPriceLE(amount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Date: {item.date} at {item.time}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirm({
                        id: item.id,
                        ref: item.ref,
                        amount,
                        month: item.month,
                      })
                    }
                    className="text-destructive hover:text-destructive/80 p-2"
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex justify-end mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md text-foreground hover:bg-muted transition-colors">
            Close
          </button>
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-red-200/40 p-6 max-w-md w-full shadow-xl">
            <h4 className="font-bold text-foreground mb-3">Confirm Deletion</h4>
            <p className="text-sm text-foreground/80 mb-4">
              Delete salary calculation for {employeeName}?
              <br />
              Month: {confirm.month}
              <br />
              Amount: {formatPriceLE(confirm.amount)}
              <br /><br />
              This will also delete related notifications and decrement user balance by {formatPriceLE(confirm.amount)}.
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setConfirm(null)} className="px-4 py-2 border rounded-md">
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmployeeList() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [salaryDialog, setSalaryDialog] = useState(null);
  const [snack, setSnack] = useState({ message: '', isError: false });

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'Users'),
      (snap) => {
        setEmployees(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const showSnack = (message, isError) => setSnack({ message, isError });

  return (
    <>
      <Header title="Employee Team" breadcrumbs={[{ label: 'HR', href: '/dashboard/hr/employees/list' }]} />

      <section className="relative mb-6 overflow-hidden rounded-2xl bg-secondary p-6 text-secondary-foreground shadow-md">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-primary/15 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">HR Module</p>
            <h2 className="text-2xl font-extrabold">Dental Employee Directory</h2>
            <p className="text-sm text-secondary-foreground/70">Manage dental employees in one place.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
              Employees: {employees.length}
            </div>
            <button
              type="button"
              onClick={() => router.push('/dashboard/hr/employees/add')}
              className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm hover:brightness-110"
            >
              Add Employee
            </button>
          </div>
        </div>
      </section>

      {loading && <ListSkeleton />}
      {error && <p className="text-destructive text-center py-8">Error: {error}</p>}
      {!loading && !error && employees.length === 0 && (
        <div className="text-center py-16 text-muted-foreground rounded-2xl border border-dashed border-primary/20 bg-primary/5">
          <p className="text-4xl mb-3">🦷</p>
          <p>No employees found.</p>
        </div>
      )}
      {!loading && !error && employees.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-secondary text-secondary-foreground">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Salary</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Balance</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {employees.map((emp, idx) => {
                  const salary = Number(emp.salary) || 0;
                  const balance = Number(emp.balance) || 0;
                  const name = emp.name || 'No name';
                  const avatarLetter = (name.trim().charAt(0) || 'E').toUpperCase();
                  const type = emp.role ? `${emp.type || 'N/A'} · ${emp.role}` : (emp.type || 'N/A');
                  const isEven = idx % 2 === 0;

                  return (
                    <tr
                      key={emp.id}
                      onContextMenu={async (e) => {
                        e.preventDefault();
                        try {
                          const results = await fetchSalaryCalcs(emp.name || 'Unknown');
                          if (results.length === 0) {
                            showSnack(`No salary calculations found for ${emp.name}`, true);
                            return;
                          }
                          setSalaryDialog({ name: emp.name || 'Unknown' });
                        } catch (err) {
                          showSnack(`Error loading salary calculations: ${err.message}`, true);
                        }
                      }}
                      className={`group cursor-pointer hover:bg-primary/8 ${isEven ? 'bg-card' : 'bg-muted/30'}`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
                            {avatarLetter}
                          </span>
                          <Link href={`/dashboard/hr/employees/detail?id=${emp.id}`} className="font-semibold text-foreground group-hover:text-primary">
                            {name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-md bg-secondary/20 px-2 py-0.5 text-xs font-medium text-foreground">
                          {type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{emp.email || '—'}</td>
                      <td className="px-5 py-4 font-medium text-foreground">{formatPriceLE(salary)}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${
                            balance >= 0
                              ? 'border-primary/20 bg-primary/10 text-primary'
                              : 'border-destructive/25 bg-destructive/10 text-destructive'
                          }`}
                        >
                          {formatPriceLE(balance)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/dashboard/hr/employees/detail?id=${emp.id}`}
                          className="inline-flex items-center rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:brightness-110"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border bg-muted/40 px-5 py-2.5 text-xs text-muted-foreground">
            Right-click any row to open salary calculations.
          </div>
        </div>
      )}

      {salaryDialog && (
        <SalaryCalcDialog
          employeeName={salaryDialog.name}
          onClose={() => setSalaryDialog(null)}
          onSnack={showSnack}
        />
      )}

      <Snackbar
        message={snack.message}
        isError={snack.isError}
        onClose={() => setSnack({ message: '', isError: false })}
      />
    </>
  );
}
