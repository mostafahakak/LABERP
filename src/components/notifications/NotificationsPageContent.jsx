'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/layout/Header';
import { PageCard } from '@/components/ui/PageComponents';
import { formatPriceLE } from '@/lib/utils';

export default function NotificationsPageContent() {
  const [showInvoice, setShowInvoice] = useState(true);
  const [showPurchase, setShowPurchase] = useState(true);
  const [showSalary, setShowSalary] = useState(true);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let q = query(collection(db, 'Notifications'), orderBy('date', 'desc'), orderBy('time', 'desc'));
    if (!showInvoice || !showPurchase || !showSalary) {
      const types = [];
      if (showInvoice) types.push('Invoice');
      if (showPurchase) types.push('Purchase');
      if (showSalary) types.push('Salary');
      if (types.length === 0) {
        setNotifications([]);
        return;
      }
      q = query(collection(db, 'Notifications'), orderBy('date', 'desc'), orderBy('time', 'desc'), where('type', 'in', types));
    }
    return onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [showInvoice, showPurchase, showSalary]);

  const totals = notifications.reduce(
    (acc, n) => {
      const amt = Number(n.amount) || 0;
      acc.total += amt;
      if (n.type === 'Invoice') acc.invoice += amt;
      if (n.type === 'Purchase') acc.purchase += amt;
      if (n.type === 'Salary') acc.salary += amt;
      return acc;
    },
    { total: 0, invoice: 0, purchase: 0, salary: 0 }
  );

  return (
    <>
      <Header />
      <PageCard title="Notifications" icon="🔔">
        <div className="flex flex-wrap gap-4 mb-6 text-foreground">
          <label className="flex items-center gap-2"><input type="checkbox" checked={showInvoice} onChange={(e) => setShowInvoice(e.target.checked)} /> Invoice</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={showPurchase} onChange={(e) => setShowPurchase(e.target.checked)} /> Purchase</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={showSalary} onChange={(e) => setShowSalary(e.target.checked)} /> Salary</label>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="border rounded-lg p-3 text-foreground"><p className="text-sm text-muted-foreground">Total</p><p className="font-bold">{formatPriceLE(totals.total)}</p></div>
          <div className="border rounded-lg p-3 text-foreground"><p className="text-sm text-muted-foreground">Invoice</p><p className="font-bold text-green-600">{formatPriceLE(totals.invoice)}</p></div>
          <div className="border rounded-lg p-3 text-foreground"><p className="text-sm text-muted-foreground">Purchase</p><p className="font-bold text-destructive">{formatPriceLE(totals.purchase)}</p></div>
          <div className="border rounded-lg p-3 text-foreground"><p className="text-sm text-muted-foreground">Salary</p><p className="font-bold">{formatPriceLE(totals.salary)}</p></div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Net Profit: {formatPriceLE(totals.invoice - totals.purchase - totals.salary)}</p>
        <div className="space-y-3">
          {notifications.map((n) => (
            <div key={n.id} className="border rounded-xl p-4 bg-card text-foreground">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{n.name}</p>
                  <p className="text-sm text-muted-foreground">{n.type} · {n.date} {n.time}</p>
                </div>
                <span className="font-bold">{formatPriceLE(n.amount)}</span>
              </div>
              <span className={`inline-block mt-2 text-xs px-2 py-1 rounded ${n.status === 'Remaining' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                {n.status}
              </span>
            </div>
          ))}
        </div>
      </PageCard>
    </>
  );
}
