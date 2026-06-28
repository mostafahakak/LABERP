'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/layout/Header';
import { TextField, SelectField, Snackbar } from '@/components/ui/PageComponents';
import { formatPriceLE } from '@/lib/utils';

function AddClientDialog({ onClose, onSaved, onError }) {
  const [submitting, setSubmitting] = useState(false);
  const [referralOptions, setReferralOptions] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [secondPhone, setSecondPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [referal, setReferal] = useState('');

  useEffect(() => {
    getDocs(collection(db, 'Users'))
      .then((snap) => {
        setReferralOptions(
          snap.docs
            .map((d) => d.data().name?.toString() || '')
            .filter(Boolean)
        );
      })
      .catch(() => {});
  }, []);

  const submit = async () => {
    if (!name.trim()) return onError('Please enter full name');
    if (!phone.trim()) return onError('Please enter phone number');
    if (!companyName.trim()) return onError('Please enter company name');
    if (!address.trim()) return onError('Please enter address');

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'Clients'), {
        name: name.trim(),
        phone: phone.trim(),
        secondPhone: secondPhone.trim(),
        companyName: companyName.trim(),
        address: address.trim(),
        referal: referal || '',
        balance: 0,
      });
      onSaved();
    } catch (e) {
      onError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-foreground mb-4">Add New Client</h3>
        <div className="space-y-3">
          <TextField label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
          <TextField label="Second Phone" value={secondPhone} onChange={(e) => setSecondPhone(e.target.value)} type="tel" required={false} />
          <TextField label="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          <TextField label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <SelectField
            label="Referral (Optional)"
            value={referal || null}
            onChange={(v) => setReferal(v || '')}
            options={referralOptions}
            placeholder="Select referral"
          />
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 border rounded-md text-foreground">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClientCard({ client }) {
  const name = client.name || 'No name';
  const phone = client.phone || '';
  const companyName = client.companyName || '';
  const address = client.address || '';
  const secondPhone = client.secondPhone || '';
  const balance = Number(client.balance) || 0;

  return (
    <Link
      href={`/dashboard/hr/clients/${client.id}`}
      className="block bg-card rounded-2xl shadow-sm border border-border p-5 hover:shadow-lg transition-shadow h-full"
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-primary/10"
        >
          👤
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-foreground truncate">{name}</p>
          <p className="text-sm text-muted-foreground truncate">{companyName}</p>
        </div>
      </div>
      {phone && <p className="text-xs text-muted-foreground mb-1 truncate">📞 {phone}</p>}
      {secondPhone && <p className="text-xs text-muted-foreground mb-1 truncate">📱 {secondPhone}</p>}
      {address && <p className="text-xs text-muted-foreground mb-2 truncate">📍 {address}</p>}
      <div
        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold ${
          balance >= 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-destructive/10 text-red-700 border border-destructive/30'
        }`}
      >
        Balance: {formatPriceLE(balance)}
      </div>
    </Link>
  );
}

export default function ClientsList() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [snack, setSnack] = useState({ message: '', isError: false });

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'Clients'),
      (snap) => {
        setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return clients.filter((c) => {
      const name = (c.name || '').toString().toLowerCase();
      const phone = (c.phone || '').toString().toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [clients, searchQuery]);

  return (
    <>
      <Header title="Clients" />

      <div className="bg-card rounded-2xl shadow-sm border border-border p-4 mb-5">
        <input
          type="search"
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 bg-muted rounded-2xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && <p className="text-destructive text-center py-8">Error loading clients: {error}</p>}

      {!loading && !error && clients.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">👥</p>
          <p>No clients found.</p>
        </div>
      )}

      {!loading && !error && clients.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">🔍</p>
          <p>No clients match your search.</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowAdd(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-primary-foreground rounded-2xl shadow-lg flex items-center justify-center text-2xl hover:scale-105 transition-transform z-40"
        style={{ color: 'var(--primary)' }}
        aria-label="Add client"
      >
        +
      </button>

      {showAdd && (
        <AddClientDialog
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            setSnack({ message: 'Client added successfully', isError: false });
          }}
          onError={(message) => setSnack({ message, isError: true })}
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
