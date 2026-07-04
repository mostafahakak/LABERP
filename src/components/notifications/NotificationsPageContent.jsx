'use client';

import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/layout/Header';
import { PageCard } from '@/components/ui/PageComponents';
import { formatPriceLE } from '@/lib/utils';
import { Bell, CheckCircle2, CircleDollarSign, FileText, ShoppingCart, Wallet } from 'lucide-react';

const FILTERS = [
  {
    key: 'invoice',
    label: 'Invoice',
    icon: FileText,
    tone: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10',
  },
  {
    key: 'purchase',
    label: 'Purchase',
    icon: ShoppingCart,
    tone: 'text-rose-500 border-rose-500/30 bg-rose-500/10',
  },
  {
    key: 'salary',
    label: 'Salary',
    icon: Wallet,
    tone: 'text-sky-500 border-sky-500/30 bg-sky-500/10',
  },
];

function StatTile({ label, value, hint, Icon, tone }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-90" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={`rounded-xl border px-2.5 py-2 ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPageContent() {
  const [showInvoice, setShowInvoice] = useState(true);
  const [showPurchase, setShowPurchase] = useState(true);
  const [showSalary, setShowSalary] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const noFilterSelected = !showInvoice && !showPurchase && !showSalary;

  useEffect(() => {
    let q = query(collection(db, 'Notifications'), orderBy('date', 'desc'), orderBy('time', 'desc'));
    if (!showInvoice || !showPurchase || !showSalary) {
      const types = [];
      if (showInvoice) types.push('Invoice');
      if (showPurchase) types.push('Purchase');
      if (showSalary) types.push('Salary');
      if (types.length === 0) {
        return;
      }
      q = query(collection(db, 'Notifications'), orderBy('date', 'desc'), orderBy('time', 'desc'), where('type', 'in', types));
    }
    return onSnapshot(q, async (snap) => {
      const incoming = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const visible = [];

      for (const n of incoming) {
        const isFinanceReminder = (n.type === 'Invoice' || n.type === 'Purchase') && n.docID;
        if (!isFinanceReminder) {
          visible.push(n);
          continue;
        }

        try {
          const financeSnap = await getDoc(doc(db, 'Finance', n.docID));
          const financeData = financeSnap.data() || {};
          const isSettled = !financeSnap.exists()
            || Number(financeData.remainingAmount || 0) <= 0
            || financeData.status === 'Paid';

          if (isSettled) {
            await deleteDoc(doc(db, 'Notifications', n.id));
            continue;
          }
        } catch {
          // Keep notification visible when lookup fails to avoid hiding valid reminders.
        }

        visible.push(n);
      }

      setNotifications(visible);
    });
  }, [showInvoice, showPurchase, showSalary]);

  const displayedNotifications = noFilterSelected ? [] : notifications;

  const totals = displayedNotifications.reduce(
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

  const netProfit = totals.invoice - totals.purchase - totals.salary;
  const activeFilters = Number(showInvoice) + Number(showPurchase) + Number(showSalary);

  return (
    <>
      <Header />
      <PageCard title="Notifications" icon="🔔" className="border-primary/20 bg-linear-to-b from-card to-card/90 shadow-xl shadow-primary/5">
        <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-r from-primary/10 via-primary/5 to-transparent p-5 mb-6">
          <div className="absolute -right-14 -top-10 h-28 w-28 rounded-full bg-primary/20 blur-2xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Financial Pulse</p>
              <h2 className="mt-1 text-2xl font-semibold text-foreground">Live Financial Notifications</h2>
              <p className="mt-1 text-sm text-muted-foreground">Track recent invoices, purchases, and salaries in one stream.</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-3 py-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{displayedNotifications.length} events</span>
            </div>
          </div>
        </section>

        <div className="mb-6 rounded-2xl border border-border/70 bg-muted/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Notification Filters</p>
            <span className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-foreground">
              {activeFilters} active
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2.5 text-foreground">
            {FILTERS.map((filter) => {
              const checked =
                filter.key === 'invoice' ? showInvoice :
                filter.key === 'purchase' ? showPurchase :
                showSalary;

              const onChange =
                filter.key === 'invoice' ? (e) => setShowInvoice(e.target.checked) :
                filter.key === 'purchase' ? (e) => setShowPurchase(e.target.checked) :
                (e) => setShowSalary(e.target.checked);

              const Icon = filter.icon;

              return (
                <label
                  key={filter.key}
                  className={`group inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    checked ? `${filter.tone} shadow-sm` : 'border-border/70 bg-background text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
                  <Icon className="h-4 w-4" />
                  {filter.label}
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Total"
            value={formatPriceLE(totals.total)}
            hint="Combined amount across selected types"
            Icon={CircleDollarSign}
            tone="text-primary border-primary/30 bg-primary/10"
          />
          <StatTile
            label="Invoice"
            value={formatPriceLE(totals.invoice)}
            hint="Revenue from invoices"
            Icon={FileText}
            tone="text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
          />
          <StatTile
            label="Purchase"
            value={formatPriceLE(totals.purchase)}
            hint="Procurement spending"
            Icon={ShoppingCart}
            tone="text-rose-500 border-rose-500/30 bg-rose-500/10"
          />
          <StatTile
            label="Salary"
            value={formatPriceLE(totals.salary)}
            hint="Payroll disbursements"
            Icon={Wallet}
            tone="text-sky-500 border-sky-500/30 bg-sky-500/10"
          />
        </div>

        <div className="mb-5 flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 px-4 py-3">
          <div className={`rounded-lg border px-2 py-1 ${netProfit >= 0 ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-rose-500/30 bg-rose-500/10 text-rose-500'}`}>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Net Profit</p>
            <p className={`text-lg font-semibold ${netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatPriceLE(netProfit)}</p>
          </div>
        </div>

        <div className="space-y-3">
          {displayedNotifications.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-8 text-center">
              <p className="text-base font-medium text-foreground">No notifications found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try changing filters to load a different notification stream.</p>
            </div>
          )}

          {displayedNotifications.map((n) => (
            <article key={n.id} className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-4 text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
              <div className="absolute -top-10 right-0 h-20 w-20 rounded-full bg-primary/10 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-base">{n.name}</p>
                    <span className="rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-xs text-muted-foreground">{n.type}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.date} at {n.time}</p>
                </div>
                <span className="rounded-lg border border-border/70 bg-background/70 px-3 py-1.5 text-sm font-semibold">{formatPriceLE(n.amount)}</span>
              </div>

              <span className={`inline-flex mt-3 items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${n.status === 'Remaining' ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                {n.status}
              </span>
            </article>
          ))}
        </div>
      </PageCard>
    </>
  );
}
