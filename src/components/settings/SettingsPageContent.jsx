'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import Header from '@/components/layout/Header';
import { PageCard, Snackbar } from '@/components/ui/PageComponents';
import { formatDate, formatTime } from '@/lib/utils';

export default function SettingsPageContent() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const [snack, setSnack] = useState({ message: '', isError: false });
  const [salaryDialog, setSalaryDialog] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (salaryDialog) {
      getDocs(query(collection(db, 'Users'), where('fullTime', '==', 'Full time'))).then((snap) => {
        setEmployees(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      });
    }
  }, [salaryDialog]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const toggleAll = (checked) => {
    if (checked) setSelected(new Set(employees.filter((e) => Number(e.salary) > 0).map((e) => e.id)));
    else setSelected(new Set());
  };

  const calculateSalaries = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      const now = new Date();
      const date = formatDate(now);
      const time = formatTime(now);
      const month = now.toLocaleString('en', { month: 'long', year: 'numeric' });
      const batch = writeBatch(db);

      for (const empId of selected) {
        const emp = employees.find((e) => e.id === empId);
        if (!emp || !emp.salary) continue;
        const salary = Number(emp.salary);
        batch.update(doc(db, 'Users', empId), { balance: increment(salary) });
        const calcRef = doc(collection(db, 'salariesCalc'));
        batch.set(calcRef, {
          userId: empId,
          name: emp.name,
          amount: salary,
          date,
          time,
          month,
          createdAt: now.toISOString(),
          branch: user?.branch || 'New cairo',
          type: 'Salary',
        });
        batch.set(doc(collection(db, 'Notifications')), {
          amount: salary,
          branch: user?.branch || 'New cairo',
          collectionName: 'Finance',
          date,
          docID: calcRef.id,
          name: emp.name,
          quantity: 0,
          status: 'Remaining',
          time,
          type: 'Salary',
        });
      }
      await batch.commit();
      setSnack({ message: 'Salaries calculated successfully', isError: false });
      setSalaryDialog(false);
      setSelected(new Set());
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <PageCard title="Settings" icon="⚙️">
        <div className="space-y-4 text-foreground">
          <p><strong>Name:</strong> {user?.name}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Role:</strong> {user?.type}</p>
          <p><strong>Branch:</strong> {user?.branch}</p>
          <div className="flex flex-wrap gap-3 pt-4">
            <button type="button" onClick={() => setSalaryDialog(true)} className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold">
              Calculate Salaries
            </button>
            <button type="button" onClick={handleLogout} className="px-6 py-3 border border-red-300 text-destructive rounded-lg font-semibold">
              Logout
            </button>
          </div>
        </div>
      </PageCard>

      {salaryDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold text-foreground mb-4">Calculate Salaries</h3>
            <label className="flex items-center gap-2 mb-4 text-foreground">
              <input type="checkbox" onChange={(e) => toggleAll(e.target.checked)} />
              Select all full-time employees
            </label>
            <div className="space-y-2 mb-6">
              {employees.map((emp) => (
                <label key={emp.id} className="flex flex-wrap items-center gap-2 text-foreground border rounded-lg p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(emp.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(emp.id);
                      else next.delete(emp.id);
                      setSelected(next);
                    }}
                    disabled={!emp.salary}
                  />
                  <span className="flex-1">{emp.name}</span>
                  <span className="text-muted-foreground">{emp.salary || 0} LE</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setSalaryDialog(false)} className="px-4 py-2 border rounded-md">Cancel</button>
              <button type="button" onClick={calculateSalaries} disabled={submitting} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
                {submitting ? 'Calculating...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: '', isError: false })} />
    </>
  );
}
