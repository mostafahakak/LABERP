'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/layout/Header';
import { PageCard, SelectField } from '@/components/ui/PageComponents';
import { shortId } from '@/lib/utils';

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
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border rounded-md p-2.5 text-foreground" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border rounded-md p-2.5 text-foreground" />
          </div>
          <SelectField label="Admin Name" value={selectedAdmin} onChange={setSelectedAdmin} options={adminNames} placeholder="All Admins" />
        </div>
        <button type="button" onClick={clearFilters} className="mb-6 px-4 py-2 border rounded-md text-foreground">Clear Filters</button>

        <div className="space-y-3">
          {actions.map((action) => (
            <div key={action.id} className="border rounded-lg p-4 bg-card">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-foreground">
                  {action.action === 'Reassign Due Date' ? 'Reassign Due Date' : 'Phase Transition'}
                </h4>
                <span className="text-sm text-muted-foreground">{action.date} {action.time}</span>
              </div>
              {action.fromPhase && (
                <p className="text-sm text-foreground mb-2">
                  <span className="px-2 py-1 bg-muted rounded">{action.fromPhase}</span>
                  {' → '}
                  <span className="px-2 py-1 bg-primary/20 rounded">{action.toPhase}</span>
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-foreground">
                <p><strong>Admin:</strong> {action.adminName}</p>
                <p><strong>Clinic:</strong> {action.clinicName}</p>
                <p><strong>Case ID:</strong> {shortId(action.caseUID)}</p>
                {action.assignedUser && <p><strong>Assigned:</strong> {action.assignedUser}</p>}
                {action.dueDate && <p><strong>Due Date:</strong> {action.dueDate}</p>}
              </div>
            </div>
          ))}
          {actions.length === 0 && <p className="text-muted-foreground">No actions found.</p>}
        </div>
      </PageCard>
    </>
  );
}
