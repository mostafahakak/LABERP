'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/layout/Header';
import { PageCard, TextField, SelectField, Snackbar } from '@/components/ui/PageComponents';
import { formatPriceLE } from '@/lib/utils';

function CrudDialog({ title, fields, onSave, onClose }) {
  const [values, setValues] = useState(
    fields.reduce((acc, f) => ({ ...acc, [f.key]: f.value ?? '' }), {})
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-xl p-6 max-w-md w-full">
        <h3 className="font-bold text-foreground mb-4">{title}</h3>
        <div className="space-y-3">
          {fields.map((f) =>
            f.type === 'select' ? (
              <SelectField
                key={f.key}
                label={f.label}
                value={values[f.key]}
                onChange={(v) => setValues({ ...values, [f.key]: v })}
                options={f.options || []}
              />
            ) : (
              <TextField
                key={f.key}
                label={f.label}
                value={values[f.key]}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                type={f.inputType || 'text'}
                required={f.required !== false}
              />
            )
          )}
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md text-foreground">Cancel</button>
          <button type="button" onClick={() => onSave(values)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">Save</button>
        </div>
      </div>
    </div>
  );
}

function useCollection(collectionName, orderFields = ['name']) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const constraints = orderFields.map((f) => orderBy(f));
    const q = query(collection(db, collectionName), ...constraints);
    return onSnapshot(q, (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [collectionName, orderFields.join(',')]);
  return items;
}

export function ManageTypesForm() {
  const items = useCollection('Types');
  const [dialog, setDialog] = useState(null);
  const [snack, setSnack] = useState({ message: '', isError: false });

  const save = async (values) => {
    const name = values.name?.trim();
    if (!name) return;
    const price = parseFloat(values.price) || 0;
    try {
      if (dialog.mode === 'add') await addDoc(collection(db, 'Types'), { name, price });
      else await updateDoc(doc(db, 'Types', dialog.id), { name, price });
      setDialog(null);
      setSnack({ message: 'Saved successfully', isError: false });
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this type?')) return;
    await deleteDoc(doc(db, 'Types', id));
    setSnack({ message: 'Deleted', isError: false });
  };

  return (
    <>
      <Header title="Manage Types" breadcrumbs={[{ label: 'Workflow', href: '/dashboard/workflow/new-case' }]} />
      <PageCard
        title="Manage Types"
        icon="🏷️"
        action={
          <button type="button" onClick={() => setDialog({ mode: 'add' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
            + Add New Type
          </button>
        }
      >
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between border rounded-lg p-4">
              <div>
                <p className="font-semibold text-foreground">{item.name}</p>
                <p className="text-sm text-muted-foreground">{formatPriceLE(item.price)}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDialog({ mode: 'edit', id: item.id, item })} className="px-3 py-1 border rounded-md text-sm">Edit</button>
                <button type="button" onClick={() => remove(item.id)} className="px-3 py-1 border border-red-300 text-destructive rounded-md text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </PageCard>
      {dialog && (
        <CrudDialog
          title={dialog.mode === 'add' ? 'Add Type' : 'Edit Type'}
          fields={[
            { key: 'name', label: 'Type Name', value: dialog.item?.name },
            { key: 'price', label: 'Price', inputType: 'number', value: dialog.item?.price },
          ]}
          onSave={save}
          onClose={() => setDialog(null)}
        />
      )}
      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: '', isError: false })} />
    </>
  );
}

export function ManageClinicsForm() {
  const items = useCollection('Clinics');
  const [dialog, setDialog] = useState(null);
  const [snack, setSnack] = useState({ message: '', isError: false });

  const save = async (values) => {
    const name = values.name?.trim();
    if (!name) return;
    try {
      if (dialog.mode === 'add') {
        await addDoc(collection(db, 'Clinics'), {
          name,
          address: values.address?.trim() || '',
          phone: values.phone?.trim() || '',
          balance: 0,
        });
      } else {
        await updateDoc(doc(db, 'Clinics', dialog.id), {
          name,
          address: values.address?.trim() || '',
          phone: values.phone?.trim() || '',
        });
      }
      setDialog(null);
      setSnack({ message: 'Saved successfully', isError: false });
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    }
  };

  return (
    <>
      <Header title="Manage Clinics" breadcrumbs={[{ label: 'Workflow', href: '/dashboard/workflow/new-case' }]} />
      <PageCard
        title="Manage Clinics"
        icon="🏥"
        action={<button type="button" onClick={() => setDialog({ mode: 'add' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">+ Add Clinic</button>}
      >
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between border rounded-lg p-4 hover:bg-muted">
              <Link href={`/dashboard/workflow/clinics/${item.id}`} className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{item.name}</p>
                <p className="text-sm text-muted-foreground">Balance: {formatPriceLE(item.balance || 0)}</p>
              </Link>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={() => setDialog({ mode: 'edit', id: item.id, item })} className="px-3 py-1 border rounded-md text-sm">Edit</button>
                <button type="button" onClick={async () => { if (confirm('Delete?')) { await deleteDoc(doc(db, 'Clinics', item.id)); setSnack({ message: 'Deleted', isError: false }); } }} className="px-3 py-1 border border-red-300 text-destructive rounded-md text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </PageCard>
      {dialog && (
        <CrudDialog
          title={dialog.mode === 'add' ? 'Add Clinic' : 'Edit Clinic'}
          fields={[
            { key: 'name', label: 'Clinic Name', value: dialog.item?.name },
            { key: 'address', label: 'Address', value: dialog.item?.address, required: false },
            { key: 'phone', label: 'Phone Number', value: dialog.item?.phone, required: false },
          ]}
          onSave={save}
          onClose={() => setDialog(null)}
        />
      )}
      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: '', isError: false })} />
    </>
  );
}

export function ManageDrsForm() {
  const items = useCollection('Drs', ['clinic', 'name']);
  const [clinics, setClinics] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [snack, setSnack] = useState({ message: '', isError: false });

  useEffect(() => {
    getDocs(collection(db, 'Clinics')).then((snap) => {
      setClinics(snap.docs.map((d) => d.data().name).filter(Boolean).sort());
    });
  }, []);

  const save = async (values) => {
    const name = values.name?.trim();
    if (!name || !values.clinic) return;
    try {
      if (dialog.mode === 'add') await addDoc(collection(db, 'Drs'), { name, clinic: values.clinic });
      else await updateDoc(doc(db, 'Drs', dialog.id), { name, clinic: values.clinic });
      setDialog(null);
      setSnack({ message: 'Saved successfully', isError: false });
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    }
  };

  return (
    <>
      <Header title="Manage Doctors" breadcrumbs={[{ label: 'Workflow', href: '/dashboard/workflow/new-case' }]} />
      <PageCard
        title="Manage Doctors"
        icon="👨‍⚕️"
        action={<button type="button" onClick={() => setDialog({ mode: 'add' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">+ Add Doctor</button>}
      >
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between border rounded-lg p-4">
              <div>
                <p className="font-semibold text-foreground">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.clinic}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDialog({ mode: 'edit', id: item.id, item })} className="px-3 py-1 border rounded-md text-sm">Edit</button>
                <button type="button" onClick={async () => { if (confirm('Delete?')) { await deleteDoc(doc(db, 'Drs', item.id)); setSnack({ message: 'Deleted', isError: false }); } }} className="px-3 py-1 border border-red-300 text-destructive rounded-md text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </PageCard>
      {dialog && (
        <CrudDialog
          title={dialog.mode === 'add' ? 'Add Doctor' : 'Edit Doctor'}
          fields={[
            { key: 'clinic', label: 'Clinic', type: 'select', options: clinics, value: dialog.item?.clinic },
            { key: 'name', label: 'Doctor Name', value: dialog.item?.name },
          ]}
          onSave={save}
          onClose={() => setDialog(null)}
        />
      )}
      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: '', isError: false })} />
    </>
  );
}

export function ManageDeliveryForm() {
  const items = useCollection('Delivery');
  const [dialog, setDialog] = useState(null);
  const [snack, setSnack] = useState({ message: '', isError: false });

  const save = async (values) => {
    const name = values.name?.trim();
    if (!name) return;
    try {
      if (dialog.mode === 'add') await addDoc(collection(db, 'Delivery'), { name });
      else await updateDoc(doc(db, 'Delivery', dialog.id), { name });
      setDialog(null);
      setSnack({ message: 'Saved successfully', isError: false });
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    }
  };

  return (
    <>
      <Header title="Manage Delivery" breadcrumbs={[{ label: 'Workflow', href: '/dashboard/workflow/new-case' }]} />
      <PageCard
        title="Manage Delivery Companies"
        icon="🚚"
        action={<button type="button" onClick={() => setDialog({ mode: 'add' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">+ Add Company</button>}
      >
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between border rounded-lg p-4">
              <p className="font-semibold text-foreground">{item.name}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDialog({ mode: 'edit', id: item.id, item })} className="px-3 py-1 border rounded-md text-sm">Edit</button>
                <button type="button" onClick={async () => { if (confirm('Delete?')) { await deleteDoc(doc(db, 'Delivery', item.id)); setSnack({ message: 'Deleted', isError: false }); } }} className="px-3 py-1 border border-red-300 text-destructive rounded-md text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </PageCard>
      {dialog && (
        <CrudDialog
          title={dialog.mode === 'add' ? 'Add Delivery Company' : 'Edit Delivery Company'}
          fields={[{ key: 'name', label: 'Delivery Company Name', value: dialog.item?.name }]}
          onSave={save}
          onClose={() => setDialog(null)}
        />
      )}
      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: '', isError: false })} />
    </>
  );
}
