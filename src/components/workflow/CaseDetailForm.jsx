'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, onSnapshot, orderBy, query, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/layout/Header';
import { PageCard } from '@/components/ui/PageComponents';
import { formatPriceLE } from '@/lib/utils';
import { getStatusBadgeColor } from '@/lib/phase-utils';
import ManageCaseDialog from './ManageCaseDialog';

export default function CaseDetailForm({ caseId }) {
  const router = useRouter();
  const [caseData, setCaseData] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showManage, setShowManage] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getDoc(doc(db, 'Cases', caseId)).then((snap) => {
      if (snap.exists()) setCaseData({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
  }, [caseId, refreshKey]);

  useEffect(() => {
    const q = query(collection(db, 'Cases', caseId, 'Notes'), orderBy('date', 'desc'), orderBy('time', 'desc'));
    return onSnapshot(q, (snap) => setNotes(snap.docs.map((d) => d.data())));
  }, [caseId, refreshKey]);

  if (loading) return <div className="p-8 text-center text-black">Loading...</div>;
  if (!caseData) return <div className="p-8 text-center text-black">Case not found</div>;

  const rows = [
    ['Clinic', caseData.clinicName],
    ['Type', caseData.type],
    ['Case Type', caseData.caseType],
    ['Doctor', caseData.drName],
    ['Patient', caseData.patientName],
    ['Price', formatPriceLE(caseData.price)],
    ['Shade', caseData.shade],
    ['Request Date', caseData.caseRequestDate],
    ['Due Date', caseData.dueDate],
    ['Phase', caseData.phase],
    ['Created', `${caseData.createdDate} ${caseData.createdTime}`],
    ['Created By', caseData.createdByName],
  ];
  if (caseData.caseType === 'Physical') rows.push(['Delivery', caseData.deliveryCompany]);
  if (caseData.caseType === 'Digital') rows.push(['Assigned User', caseData.assignedUser]);

  return (
    <>
      <Header />
      <PageCard title={`Case ${caseId.substring(0, 8)}`} icon="📄">
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-3 py-1 rounded-full text-sm ${getStatusBadgeColor(caseData.status)}`}>{caseData.status}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {rows.map(([label, value]) => (
            <div key={label} className="flex gap-2 text-black">
              <span className="font-semibold min-w-[120px]">{label}:</span>
              <span>{value || 'N/A'}</span>
            </div>
          ))}
        </div>
        {caseData.notes && (
          <div className="mb-6">
            <p className="font-semibold text-black mb-1">Notes</p>
            <p className="text-black">{caseData.notes}</p>
          </div>
        )}

        {notes.length > 0 && (
          <div className="mb-6">
            <h3 className="font-bold text-black mb-3">Phase Notes</h3>
            <div className="space-y-3">
              {notes.map((note, i) => (
                <div key={i} className="border rounded-lg p-3 bg-gray-50 text-black text-sm">
                  <p>{note.note}</p>
                  <p className="text-gray-500 mt-1">{note.date} {note.time} — {note.adminName}</p>
                  <p className="text-gray-500">{note.fromPhase} → {note.toPhase}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => setShowManage(true)} className="px-4 py-2 bg-black text-[#c3a28e] rounded-md">Manage Case</button>
          <button type="button" onClick={() => router.back()} className="px-4 py-2 border rounded-md text-black">Back</button>
        </div>
      </PageCard>

      {showManage && (
        <ManageCaseDialog
          caseId={caseId}
          caseData={caseData}
          onClose={() => setShowManage(false)}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </>
  );
}
