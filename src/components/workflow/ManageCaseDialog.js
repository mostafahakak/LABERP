'use client';

import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  getDocs,
  updateDoc,
  doc,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatTime, formatPriceLE } from '@/lib/utils';
import { getPhaseInfo } from '@/lib/phase-utils';
import { ACCENT_COLOR } from '@/lib/utils';

export default function ManageCaseDialog({ caseId, caseData, onClose, onSuccess }) {
  const { user } = useAuth();
  const phaseInfo = getPhaseInfo(caseData);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(caseData.assignedUser || '');
  const [dueDate, setDueDate] = useState(caseData.dueDate || caseData.caseRequestDate || '');
  const [note, setNote] = useState('');
  const [price, setPrice] = useState(String(caseData.price || 0));
  const [loading, setLoading] = useState(false);
  const [reassignLoading, setReassignLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getDocs(collection(db, 'Users')).then((snap) => {
      const names = snap.docs.map((d) => d.data().name).filter(Boolean).sort();
      setUsers(names);
    });
  }, []);

  const needsUser = phaseInfo.requiresUser;

  const moveToNextPhase = async () => {
    setError('');
    if (!phaseInfo.nextPhase) {
      setError('Case is already in final phase');
      return;
    }
    if (needsUser && !selectedUser) {
      setError('Please select a user');
      return;
    }
    if (!dueDate) {
      setError('Please select a due date');
      return;
    }
    if (phaseInfo.nextStatus === 'Ready to get invoice') {
      const parsedPrice = parseFloat(price);
      if (!parsedPrice || parsedPrice <= 0) {
        setError('Please enter a valid price');
        return;
      }
    }

    setLoading(true);
    try {
      const now = new Date();
      const date = formatDate(now);
      const time = formatTime(now);
      const updateData = {
        status: phaseInfo.nextStatus,
        phase: phaseInfo.nextPhase,
        dueDate,
      };
      if (phaseInfo.nextStatus === 'Ready to get invoice') {
        updateData.price = parseFloat(price);
      }
      if (needsUser) updateData.assignedUser = selectedUser;

      await updateDoc(doc(db, 'Cases', caseId), updateData);

      await addDoc(collection(db, 'CasesTrack'), {
        date,
        time,
        adminName: user.name,
        adminID: user.uid,
        caseUID: caseId,
        clinicName: caseData.clinicName || '',
        fromPhase: phaseInfo.currentPhase,
        toPhase: phaseInfo.nextPhase,
        fromStatus: caseData.status,
        toStatus: phaseInfo.nextStatus,
        assignedUser: selectedUser || caseData.assignedUser || '',
      });

      if (note.trim()) {
        await addDoc(collection(db, 'Cases', caseId, 'Notes'), {
          note: note.trim(),
          date,
          time,
          adminName: user.name,
          adminID: user.uid,
          fromPhase: phaseInfo.currentPhase,
          toPhase: phaseInfo.nextPhase,
          fromStatus: caseData.status,
          toStatus: phaseInfo.nextStatus,
        });
      }

      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const reassignDueDate = async () => {
    setError('');
    if (!dueDate) {
      setError('Please select a due date');
      return;
    }
    setReassignLoading(true);
    try {
      const now = new Date();
      const date = formatDate(now);
      const time = formatTime(now);
      await updateDoc(doc(db, 'Cases', caseId), { dueDate });
      await addDoc(collection(db, 'CasesTrack'), {
        date,
        time,
        adminName: user.name,
        adminID: user.uid,
        caseUID: caseId,
        clinicName: caseData.clinicName || '',
        action: 'Reassign Due Date',
        dueDate,
        status: caseData.status,
        phase: caseData.phase,
      });
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setReassignLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <h3 className="text-xl font-bold text-black mb-4">Manage Case</h3>

        <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm text-black space-y-1">
          <p><strong>Phase:</strong> {caseData.phase}</p>
          <p><strong>Status:</strong> {caseData.status}</p>
          {caseData.assignedUser && <p><strong>Assigned:</strong> {caseData.assignedUser}</p>}
        </div>

        {phaseInfo.nextPhase ? (
          <>
            <div className="mb-4 p-3 border rounded-lg text-black">
              <p className="font-semibold">Next: {phaseInfo.nextPhase}</p>
              <p className="text-sm text-gray-600">Status → {phaseInfo.nextStatus}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1 text-black">Note (optional)</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full border rounded-md p-2 text-black" />
              </div>
              <div>
                <label className="block text-sm mb-1 text-black">Due Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border rounded-md p-2 text-black" />
              </div>
              {needsUser && (
                <div>
                  <label className="block text-sm mb-1 text-black">Assign User *</label>
                  <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="w-full border rounded-md p-2 text-black">
                    <option value="">Select user</option>
                    {users.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              )}
              {phaseInfo.nextStatus === 'Ready to get invoice' && (
                <div>
                  <label className="block text-sm mb-1 text-black">Price *</label>
                  <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full border rounded-md p-2 text-black" />
                </div>
              )}
            </div>

            {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

            <div className="flex flex-wrap gap-2 mt-6 justify-end">
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md">Cancel</button>
              <button type="button" onClick={reassignDueDate} disabled={reassignLoading} className="px-4 py-2 border rounded-md" style={{ borderColor: ACCENT_COLOR, color: ACCENT_COLOR }}>
                {reassignLoading ? 'Saving...' : 'Reassign Date'}
              </button>
              <button type="button" onClick={moveToNextPhase} disabled={loading} className="px-4 py-2 rounded-md text-white bg-black">
                {loading ? 'Moving...' : `Move to ${phaseInfo.nextPhase}`}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-black mb-4">Case is ready to be delivered / in final phase.</p>
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-black text-white">Close</button>
          </>
        )}
      </div>
    </div>
  );
}

export async function deleteCase(caseId) {
  const trackQuery = query(collection(db, 'CasesTrack'), where('caseUID', '==', caseId));
  const trackSnap = await getDocs(trackQuery);
  const batch = writeBatch(db);
  trackSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'Cases', caseId));
  await batch.commit();
}
