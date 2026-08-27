'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/layout/Header';
import { formatPriceLE } from '@/lib/utils';

const MODULES = [
  { key: 'finance', label: 'Finance' },
  { key: 'hr', label: 'Employees & Salaries' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'workflow', label: 'Workflow / Cases' },
];

const PERIODS = [
  { key: 'daily', label: 'Daily' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'yearly', label: 'Yearly' },
];

function getDateRange(period) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  let start;
  switch (period) {
    case 'daily':
      start = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      break;
    case 'monthly':
      start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      break;
    case 'quarterly': {
      const qm = Math.floor(m / 3) * 3;
      start = `${y}-${String(qm + 1).padStart(2, '0')}-01`;
      break;
    }
    case 'yearly':
      start = `${y}-01-01`;
      break;
    default:
      start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  }
  return start;
}

function exportCSV(headers, rows, filename) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportTable({ title, headers, rows, csvName }) {
  if (rows.length === 0) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-foreground">{title}</h3>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No data for this period.
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        <button
          type="button"
          onClick={() => exportCSV(headers, rows, csvName)}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-sm"
        >
          Export CSV
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-secondary text-secondary-foreground">
                {headers.map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-2.5 text-foreground whitespace-nowrap">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
          {rows.length} row{rows.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [module, setModule] = useState('finance');
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);

  const [financeDocs, setFinanceDocs] = useState([]);
  const [users, setUsers] = useState([]);
  const [inventoryDocs, setInventoryDocs] = useState([]);
  const [cases, setCases] = useState([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getDocs(collection(db, 'Finance')),
      getDocs(collection(db, 'Users')),
      getDocs(collection(db, 'Inventory')),
      getDocs(collection(db, 'Cases')),
    ]).then(([fSnap, uSnap, iSnap, cSnap]) => {
      setFinanceDocs(fSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setUsers(uSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setInventoryDocs(iSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setCases(cSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const startDate = getDateRange(period);

  const filteredFinance = useMemo(() => financeDocs.filter((d) => (d.Date || '') >= startDate), [financeDocs, startDate]);
  const filteredInventory = useMemo(() => inventoryDocs.filter((d) => (d.Date || d.date || '') >= startDate), [inventoryDocs, startDate]);
  const filteredCases = useMemo(() => cases.filter((d) => (d.createdDate || '') >= startDate), [cases, startDate]);

  const financeInvoices = useMemo(() => filteredFinance.filter((d) => d.type === 'Invoice'), [filteredFinance]);
  const financeExpenses = useMemo(() => filteredFinance.filter((d) => d.type && d.type !== 'Invoice'), [filteredFinance]);

  const totalInvoices = financeInvoices.reduce((s, d) => s + (Number(d.total) || 0), 0);
  const totalExpenses = financeExpenses.reduce((s, d) => s + (Number(d.paidAmount) || 0), 0);

  // Expense by type
  const expenseByType = useMemo(() => {
    const map = {};
    financeExpenses.forEach((d) => {
      const t = d.type || 'Other';
      if (!map[t]) map[t] = { count: 0, total: 0 };
      map[t].count++;
      map[t].total += Number(d.paidAmount) || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [financeExpenses]);

  // Inventory most used
  const inventoryUsage = useMemo(() => {
    const map = {};
    filteredInventory.forEach((d) => {
      const name = d.itemName || 'Unknown';
      if (!map[name]) map[name] = { inQty: 0, outQty: 0, totalAmount: 0 };
      const qty = Number(d.quantityUsed) || 0;
      const amt = Number(d.amount) || 0;
      if (d.usageType === 'In') map[name].inQty += qty;
      else map[name].outQty += qty;
      map[name].totalAmount += amt;
    });
    return Object.entries(map).sort((a, b) => b[1].totalAmount - a[1].totalAmount);
  }, [filteredInventory]);

  // Cases by status
  const casesByStatus = useMemo(() => {
    const map = {};
    filteredCases.forEach((c) => {
      const s = c.status || 'Unknown';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredCases]);

  // Cases by clinic
  const casesByClinic = useMemo(() => {
    const map = {};
    filteredCases.forEach((c) => {
      const cl = c.clinicName || 'Unknown';
      if (!map[cl]) map[cl] = { count: 0, totalPrice: 0 };
      map[cl].count++;
      map[cl].totalPrice += Number(c.price) || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [filteredCases]);

  const periodLabel = PERIODS.find((p) => p.key === period)?.label || period;

  return (
    <>
      <Header title="Reports" />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {MODULES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setModule(m.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border ${
                module === m.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-foreground hover:bg-muted'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                period === p.key
                  ? 'bg-secondary text-secondary-foreground border-secondary'
                  : 'border-border text-foreground hover:bg-muted'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-6">
              <div className="h-5 w-40 rounded bg-muted mb-4" />
              <div className="space-y-2">
                {[1, 2, 3].map((j) => <div key={j} className="h-4 rounded bg-muted" />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {module === 'finance' && (
            <>
              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground uppercase">Total Revenue ({periodLabel})</p>
                  <p className="text-xl font-bold text-emerald-600">{formatPriceLE(totalInvoices)}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground uppercase">Total Expenses ({periodLabel})</p>
                  <p className="text-xl font-bold text-red-500">{formatPriceLE(totalExpenses)}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground uppercase">Net Profit ({periodLabel})</p>
                  <p className={`text-xl font-bold ${totalInvoices - totalExpenses >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatPriceLE(totalInvoices - totalExpenses)}
                  </p>
                </div>
              </div>

              <ReportTable
                title={`Invoices — ${periodLabel}`}
                headers={['Date', 'Time', 'Name', 'Bank', 'Plan', 'Total', 'Paid', 'Remaining']}
                rows={financeInvoices.map((d) => [
                  d.Date, d.Time, d.drName || d.name, d.bank, d.paymentPlan,
                  formatPriceLE(d.total), formatPriceLE(d.paidAmount), formatPriceLE(d.remainingAmount),
                ])}
                csvName={`invoices-${period}`}
              />

              <ReportTable
                title={`Expenses by Type — ${periodLabel}`}
                headers={['Type', 'Count', 'Total Amount']}
                rows={expenseByType.map(([type, v]) => [type, v.count, formatPriceLE(v.total)])}
                csvName={`expenses-by-type-${period}`}
              />

              <ReportTable
                title={`All Expenses — ${periodLabel}`}
                headers={['Date', 'Time', 'Name', 'Type', 'Bank', 'Amount']}
                rows={financeExpenses.map((d) => [
                  d.Date, d.Time, d.name || d.drName, d.type, d.bank, formatPriceLE(d.paidAmount),
                ])}
                csvName={`expenses-${period}`}
              />
            </>
          )}

          {module === 'hr' && (
            <>
              <ReportTable
                title="Employee Directory"
                headers={['Name', 'Type', 'Role', 'Email', 'Phone', 'Salary', 'Balance', 'Branch', 'Shift']}
                rows={users.map((u) => [
                  u.name, u.type, u.role || '—', u.email || '—', u.phone || '—',
                  formatPriceLE(u.salary), formatPriceLE(u.balance), u.branch || '—', u.shift || '—',
                ])}
                csvName="employees"
              />

              <ReportTable
                title={`Salary Payments — ${periodLabel}`}
                headers={['Date', 'Time', 'Employee', 'Bank', 'Amount', 'Balance Before', 'Balance After']}
                rows={filteredFinance
                  .filter((d) => d.type === 'Salary')
                  .map((d) => [
                    d.Date, d.Time, d.name || d.drName, d.bank,
                    formatPriceLE(d.paidAmount), formatPriceLE(d.drBalanceBefore), formatPriceLE(d.drBalanceAfter),
                  ])}
                csvName={`salaries-${period}`}
              />

              <ReportTable
                title={`Loans — ${periodLabel}`}
                headers={['Date', 'Time', 'Employee', 'Bank', 'Amount']}
                rows={filteredFinance
                  .filter((d) => d.type === 'Loan')
                  .map((d) => [d.Date, d.Time, d.name || d.drName, d.bank, formatPriceLE(d.paidAmount)])}
                csvName={`loans-${period}`}
              />

              <ReportTable
                title={`Bonuses — ${periodLabel}`}
                headers={['Date', 'Time', 'Employee', 'Bank', 'Amount']}
                rows={filteredFinance
                  .filter((d) => d.type === 'Bonus')
                  .map((d) => [d.Date, d.Time, d.name || d.drName, d.bank, formatPriceLE(d.paidAmount)])}
                csvName={`bonuses-${period}`}
              />

              <ReportTable
                title={`Deductions — ${periodLabel}`}
                headers={['Date', 'Time', 'Employee', 'Amount', 'Reason']}
                rows={filteredFinance
                  .filter((d) => d.type === 'Deductions')
                  .map((d) => [d.Date, d.Time, d.name || d.drName, formatPriceLE(d.paidAmount), d.note || '—'])}
                csvName={`deductions-${period}`}
              />
            </>
          )}

          {module === 'inventory' && (
            <>
              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground uppercase">Transactions ({periodLabel})</p>
                  <p className="text-xl font-bold text-foreground">{filteredInventory.length}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground uppercase">Total In</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {filteredInventory.filter((d) => d.usageType === 'In').reduce((s, d) => s + (Number(d.quantityUsed) || 0), 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground uppercase">Total Out</p>
                  <p className="text-xl font-bold text-red-500">
                    {filteredInventory.filter((d) => d.usageType === 'Out').reduce((s, d) => s + (Number(d.quantityUsed) || 0), 0)}
                  </p>
                </div>
              </div>

              <ReportTable
                title={`Most Used Materials — ${periodLabel}`}
                headers={['Item', 'In Qty', 'Out Qty', 'Total Amount']}
                rows={inventoryUsage.map(([name, v]) => [name, v.inQty, v.outQty, formatPriceLE(v.totalAmount)])}
                csvName={`inventory-usage-${period}`}
              />

              <ReportTable
                title={`All Transactions — ${periodLabel}`}
                headers={['Date', 'Item', 'Category', 'Type', 'Qty', 'Amount']}
                rows={filteredInventory.map((d) => [
                  d.Date || d.date, d.itemName, d.category, d.usageType,
                  d.quantityUsed, formatPriceLE(d.amount),
                ])}
                csvName={`inventory-transactions-${period}`}
              />
            </>
          )}

          {module === 'workflow' && (
            <>
              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground uppercase">Cases ({periodLabel})</p>
                  <p className="text-xl font-bold text-foreground">{filteredCases.length}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground uppercase">Total Case Value</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {formatPriceLE(filteredCases.reduce((s, c) => s + (Number(c.price) || 0), 0))}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground uppercase">Avg Price / Case</p>
                  <p className="text-xl font-bold text-foreground">
                    {filteredCases.length ? formatPriceLE(filteredCases.reduce((s, c) => s + (Number(c.price) || 0), 0) / filteredCases.length) : '0 LE'}
                  </p>
                </div>
              </div>

              <ReportTable
                title={`Cases by Status — ${periodLabel}`}
                headers={['Status', 'Count']}
                rows={casesByStatus.map(([status, count]) => [status, count])}
                csvName={`cases-by-status-${period}`}
              />

              <ReportTable
                title={`Cases by Clinic — ${periodLabel}`}
                headers={['Clinic', 'Cases', 'Total Price']}
                rows={casesByClinic.map(([clinic, v]) => [clinic, v.count, formatPriceLE(v.totalPrice)])}
                csvName={`cases-by-clinic-${period}`}
              />

              <ReportTable
                title={`All Cases — ${periodLabel}`}
                headers={['Code', 'Clinic', 'Doctor', 'Patient', 'Type', 'Price', 'Status', 'Phase', 'Due Date']}
                rows={filteredCases.map((c) => [
                  c.caseCode || '—', c.clinicName, c.drName, c.patientName,
                  c.caseType, formatPriceLE(c.price), c.status, c.phase, c.dueDate || '—',
                ])}
                csvName={`cases-${period}`}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
