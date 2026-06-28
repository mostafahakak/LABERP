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
import Header from '@/components/layout/Header';
import { Snackbar } from '@/components/ui/PageComponents';
import { formatPriceLE, ACCENT_COLOR } from '@/lib/utils';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[80vh] flex flex-col">
        <h3 className="font-bold text-black mb-2">Salary Calculations — {employeeName}</h3>
        <p className="text-sm text-gray-500 mb-4">Click delete on any salary calculation to remove it.</p>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-[#c3a28e] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No salary calculations found.</p>
        ) : (
          <div className="overflow-y-auto flex-1 space-y-2">
            {items.map((item) => {
              const amount = Number(item.amount) || 0;
              return (
                <div key={item.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="font-semibold text-black">
                      {item.month} — {formatPriceLE(amount)}
                    </p>
                    <p className="text-sm text-gray-500">
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
                    className="text-red-600 hover:text-red-800 p-2"
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
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md text-black">
            Close
          </button>
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h4 className="font-bold text-black mb-3">Confirm Deletion</h4>
            <p className="text-sm text-gray-700 mb-4">
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

function EmployeeCard({ employee, onLongPress }) {
  const name = employee.name || 'No name';
  const type = employee.type || 'N/A';
  const email = employee.email || '';
  const salary = Number(employee.salary) || 0;
  const balance = Number(employee.balance) || 0;

  return (
    <Link
      href={`/dashboard/hr/employees/${employee.id}`}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress();
      }}
      className="block bg-white rounded-2xl shadow-md border border-gray-100 p-5 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${ACCENT_COLOR}20` }}
        >
          👤
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-black truncate">{name}</p>
          <p className="text-sm text-gray-600 truncate">{type}</p>
        </div>
      </div>
      {email && (
        <p className="text-xs text-gray-600 mb-1 truncate">✉ {email}</p>
      )}
      <p className="text-xs text-gray-600 mb-2">Monthly Salary: {formatPriceLE(salary)}</p>
      <div
        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold ${
          balance >= 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}
      >
        Balance: {formatPriceLE(balance)}
      </div>
      <p className="text-xs text-gray-400 mt-2">Right-click for salary calculations</p>
    </Link>
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
      <Header title="Employee Records" />
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-[#c3a28e] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && <p className="text-red-600 text-center py-8">Error: {error}</p>}
      {!loading && !error && employees.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">👥</p>
          <p>No employees found.</p>
        </div>
      )}
      {!loading && !error && employees.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {employees.map((emp) => (
            <EmployeeCard
              key={emp.id}
              employee={emp}
              onLongPress={async () => {
                try {
                  const results = await fetchSalaryCalcs(emp.name || 'Unknown');
                  if (results.length === 0) {
                    showSnack(`No salary calculations found for ${emp.name}`, true);
                    return;
                  }
                  setSalaryDialog({ name: emp.name || 'Unknown' });
                } catch (e) {
                  showSnack(`Error loading salary calculations: ${e.message}`, true);
                }
              }}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => router.push('/dashboard/hr/employees/add')}
        className="fixed bottom-8 right-8 w-14 h-14 bg-black rounded-2xl shadow-lg flex items-center justify-center text-2xl hover:scale-105 transition-transform z-40"
        style={{ color: ACCENT_COLOR }}
        aria-label="Add employee"
      >
        +
      </button>

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
