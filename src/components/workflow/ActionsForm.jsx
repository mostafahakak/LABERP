'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { FlaskConical, Stethoscope } from 'lucide-react';
import { db } from '@/lib/firebase';
import Header from '@/components/layout/Header';
import { PageCard, SelectField } from '@/components/ui/PageComponents';
import { shortId } from '@/lib/utils';

function getPhaseBadgeClass(phase, fallback = false) {
  const match = String(phase || '').match(/(\d+)/);
  const phaseNumber = match ? Number(match[1]) : null;

  if (!phaseNumber) {
    return fallback
      ? 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-200 dark:border-cyan-800/60'
      : 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/60 dark:text-slate-200 dark:border-slate-700';
  }

  const phaseColorByNumber = {
    1: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800/60',
    2: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800/60',
    3: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-800/60',
    4: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-950/40 dark:text-fuchsia-200 dark:border-fuchsia-800/60',
    5: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800/60',
    6: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800/60',
  };

  return phaseColorByNumber[phaseNumber] || 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800/60';
}

export default function ActionsForm() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [adminNames, setAdminNames] = useState([]);
  const [actions, setActions] = useState([]);

  useEffect(() => {
    getDocs(collection(db, 'CasesTrack')).then((snap) => {
      const names = new Set();
      snap.docs.forEach((d) => { if (d.data().adminName) names.add(d.data().adminName); });
      setAdminNames([...names].sort());
    });
  }, []);

  useEffect(() => {
    const constraints = [orderBy('date', 'desc'), orderBy('time', 'desc')];
    const wheres = [];
    if (startDate) wheres.push(where('date', '>=', startDate));
    if (endDate) wheres.push(where('date', '<=', endDate));
    if (selectedAdmin) wheres.push(where('adminName', '==', selectedAdmin));

    const q = query(collection(db, 'CasesTrack'), ...wheres, ...constraints);
    return onSnapshot(q, (snap) => {
      setActions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [startDate, endDate, selectedAdmin]);

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedAdmin(null);
  };

  return (
    <>
      <Header title="Actions" breadcrumbs={[{ label: 'Workflow', href: '/dashboard/workflow/new-case' }]} />
      <PageCard title="Case Actions" icon="📊">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border rounded-md p-2.5 text-foreground bg-background" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border rounded-md p-2.5 text-foreground bg-background" />
          </div>
          <SelectField label="Admin Name" value={selectedAdmin} onChange={setSelectedAdmin} options={adminNames} placeholder="All Admins" />
        </div>
        <button type="button" onClick={clearFilters} className="mb-6 px-4 py-2 border rounded-md text-foreground bg-background hover:bg-muted/60 transition-colors">Clear Filters</button>

        <div className="space-y-3">
          {actions.map((action) => (
            <div
              key={action.id}
              className="rounded-xl border border-cyan-100 bg-linear-to-r from-cyan-50/40 via-background to-background p-4 shadow-sm dark:border-cyan-900/60 dark:from-cyan-950/20"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <h4 className="flex items-center gap-2 font-semibold text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-cyan-200 text-cyan-700 dark:bg-cyan-950/50 dark:border-cyan-800/60 dark:text-cyan-200">
                    {action.action === 'Reassign Due Date' ? <Stethoscope className="h-4 w-4" /> : <FlaskConical className="h-4 w-4" />}
                  </span>
                  {action.action === 'Reassign Due Date' ? 'Reassign Due Date' : 'Phase Transition'}
                </h4>
                <span className="text-sm text-muted-foreground">{action.date} {action.time}</span>
              </div>
              {action.fromPhase && (
                <p className="mb-3 text-sm text-foreground">
                  <span className={`rounded-full border px-2.5 py-1 font-medium ${getPhaseBadgeClass(action.fromPhase)}`}>
                    {action.fromPhase}
                  </span>
                  {' → '}
                  <span className={`rounded-full border px-2.5 py-1 font-medium ${getPhaseBadgeClass(action.toPhase, true)}`}>
                    {action.toPhase}
                  </span>
                </p>
              )}
              <div className="grid grid-cols-1 gap-2 text-sm text-foreground sm:grid-cols-2">
                <p className="rounded-md bg-white/80 px-2 py-1.5 border border-border/50 dark:bg-slate-900/70 dark:border-slate-800"><strong>Admin:</strong> {action.adminName}</p>
                <p className="rounded-md bg-white/80 px-2 py-1.5 border border-border/50 dark:bg-slate-900/70 dark:border-slate-800"><strong>Clinic:</strong> {action.clinicName}</p>
                <p className="rounded-md bg-white/80 px-2 py-1.5 border border-border/50 dark:bg-slate-900/70 dark:border-slate-800"><strong>Case ID:</strong> {shortId(action.caseUID)}</p>
                {action.assignedUser && <p className="rounded-md bg-white/80 px-2 py-1.5 border border-border/50 dark:bg-slate-900/70 dark:border-slate-800"><strong>Assigned:</strong> {action.assignedUser}</p>}
                {action.dueDate && <p className="rounded-md bg-white/80 px-2 py-1.5 border border-border/50 dark:bg-slate-900/70 dark:border-slate-800"><strong>Due Date:</strong> {action.dueDate}</p>}
              </div>
            </div>
          ))}
          {actions.length === 0 && <p className="text-muted-foreground">No actions found.</p>}
        </div>
      </PageCard>
    </>
  );
}
