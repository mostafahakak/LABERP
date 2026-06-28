'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/layout/Header';
import { PageCard } from '@/components/ui/PageComponents';
import { formatPriceLE, shortId } from '@/lib/utils';

export default function ClinicDetailForm({ clinicId }) {
  const [clinic, setClinic] = useState(null);
  const [cases, setCases] = useState([]);
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    return onSnapshot(doc(db, 'Clinics', clinicId), (snap) => {
      if (snap.exists()) setClinic({ id: snap.id, ...snap.data() });
    });
  }, [clinicId]);

  useEffect(() => {
    if (!clinic?.name) return;
    const casesQ = query(
      collection(db, 'Cases'),
      where('clinicName', '==', clinic.name),
      orderBy('createdDate', 'desc')
    );
    const drsQ = query(collection(db, 'Drs'), where('clinic', '==', clinic.name), orderBy('name'));
    const unsub1 = onSnapshot(casesQ, (snap) => setCases(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsub2 = onSnapshot(drsQ, (snap) => setDoctors(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unsub1(); unsub2(); };
  }, [clinic?.name]);

  if (!clinic) return <p className="text-black p-8">Loading...</p>;

  return (
    <>
      <Header />
      <PageCard title={clinic.name} icon="🏥">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-black">
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">Balance</p>
            <p className={`text-xl font-bold ${(clinic.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPriceLE(clinic.balance || 0)}
            </p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">Address</p>
            <p>{clinic.address || 'N/A'}</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">Phone</p>
            <p>{clinic.phone || 'N/A'}</p>
          </div>
        </div>

        <h3 className="font-bold text-black mb-3">Doctors ({doctors.length})</h3>
        <div className="flex flex-wrap gap-2 mb-6">
          {doctors.map((d) => (
            <span key={d.id} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-black">{d.name}</span>
          ))}
        </div>

        <h3 className="font-bold text-black mb-3">Cases ({cases.length})</h3>
        <div className="space-y-2">
          {cases.map((c) => (
            <Link key={c.id} href={`/dashboard/workflow/cases/${c.id}`} className="block border rounded-lg p-3 hover:bg-gray-50 text-black">
              <div className="flex justify-between">
                <span>{c.patientName} — {c.type}</span>
                <span className="text-sm text-gray-500">{shortId(c.id)} · {c.status}</span>
              </div>
            </Link>
          ))}
        </div>
      </PageCard>
    </>
  );
}
