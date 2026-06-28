'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatPriceLE } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { PageCard, Snackbar } from '@/components/ui/PageComponents';

function LogsTab({ logType, allTypesLabel }) {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [nameFilter, setNameFilter] = useState(allTypesLabel);
  const [adminFilterId, setAdminFilterId] = useState('All Admins');
  const [adminOptions, setAdminOptions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.type === 'Admin') {
      getDocs(collection(db, 'Users')).then((snap) => {
        const opts = snap.docs.map((d) => ({ id: d.id, name: d.data().name || d.id }));
        setAdminOptions([{ id: 'All Admins', name: 'All Admins' }, ...opts]);
      });
    }
  }, [user?.type]);

  useEffect(() => {
    setLoading(true);
    const constraints = [where('type', '==', logType), orderBy('Date', 'desc'), orderBy('Time', 'desc'), limit(100)];
    if (nameFilter && nameFilter !== allTypesLabel) constraints.unshift(where('name', '==', nameFilter));
    if (startDate) constraints.unshift(where('Date', '>=', startDate));
    if (endDate) {
      const next = new Date(endDate);
      next.setDate(next.getDate() + 1);
      constraints.unshift(where('Date', '<', formatDate(next)));
    }
    const q = query(collection(db, 'Logs'), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (adminFilterId && adminFilterId !== 'All Admins') {
          docs = docs.filter((d) => d.adminID === adminFilterId);
        }
        setLogs(docs);
        setLoading(false);
        setError('');
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [logType, nameFilter, startDate, endDate, adminFilterId, allTypesLabel]);

  const nameTotals = useMemo(() => {
    const map = {};
    logs.forEach((d) => {
      const n = d.name || 'Unnamed';
      map[n] = (map[n] || 0) + (Number(d.amount) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [logs]);

  const isExpense = logType === 'Expense';

  return (
    <div className="space-y-5">
      <PageCard title={isExpense ? 'Filter Expenses' : 'Filter Income'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {user?.type === 'Admin' && (
            <div>
              <label className="text-sm text-muted-foreground">Filter by Admin</label>
              <select
                value={adminFilterId}
                onChange={(e) => setAdminFilterId(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md text-foreground"
              >
                {adminOptions.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-sm text-muted-foreground">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md text-foreground" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md text-foreground" />
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setStartDate(''); setEndDate(''); setNameFilter(allTypesLabel); setAdminFilterId('All Admins'); }}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md text-sm"
        >
          Clear Filters
        </button>
      </PageCard>

      <div>
        <h3 className="font-bold text-foreground mb-2">Summary by Type</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setNameFilter(allTypesLabel)}
            className={`px-3 py-1.5 rounded-full text-sm ${nameFilter === allTypesLabel ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}
          >
            {allTypesLabel}
          </button>
          {nameTotals.map(([name, total]) => (
            <button
              key={name}
              type="button"
              onClick={() => setNameFilter(name)}
              className={`px-3 py-1.5 rounded-full text-sm ${nameFilter === name ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}
            >
              {name}: {Math.round(total)} LE
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-center text-muted-foreground">Loading...</p>}
      {error && <p className="text-center text-destructive">{error}</p>}
      {!loading && !error && logs.length === 0 && <p className="text-center text-muted-foreground">No records found.</p>}

      <div className="space-y-3">
        {logs.map((d) => {
          const card = (
            <div key={d.id} className="border rounded-xl p-4 bg-white flex justify-between items-start gap-3">
              <div>
                <p className="font-bold text-foreground">{d.name} — {d.cName}</p>
                <p className="text-sm text-muted-foreground">{d.Date} at {d.Time}</p>
                <p className="text-sm text-muted-foreground">Logged by: {d.adminName || 'Unknown'}</p>
              </div>
              <p className={`font-bold ${isExpense ? 'text-primary' : 'text-green-600'}`}>
                {isExpense ? '-' : '+'}{formatPriceLE(d.amount)}
              </p>
            </div>
          );
          if (!isExpense && d.actionID) {
            return (
              <Link key={d.id} href={`/dashboard/finance/invoices/${d.actionID}?type=Income`}>
                {card}
              </Link>
            );
          }
          return card;
        })}
      </div>
    </div>
  );
}

function NetProfitTab() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState('');

  const calculate = async () => {
    if (!startDate || !endDate) {
      setSnack('Please select start and end date');
      return;
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, 'Logs'),
        where('Date', '>=', startDate),
        where('Date', '<=', endDate)
      );
      const snap = await getDocs(q);
      let totalIncome = 0;
      let totalExpenses = 0;
      snap.docs.forEach((d) => {
        const data = d.data();
        const amount = Number(data.amount) || 0;
        if (data.type === 'Income') totalIncome += amount;
        else if (data.type === 'Expense') totalExpenses += amount;
      });
      setSummary({ totalIncome, totalExpenses });
    } catch (e) {
      setSnack(e.message);
    } finally {
      setLoading(false);
    }
  };

  const netProfit = summary ? summary.totalIncome - summary.totalExpenses : 0;

  return (
    <div className="space-y-5">
      <PageCard title="Select Time Range">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border rounded-md text-foreground" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border rounded-md text-foreground" />
        </div>
        <button type="button" onClick={calculate} disabled={loading} className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium">
          {loading ? 'Calculating...' : 'Calculate'}
        </button>
      </PageCard>
      {summary && (
        <PageCard title="Financial Summary">
          <div className="space-y-3">
            <div className="flex justify-between"><span>Total Income</span><span className="text-green-600 font-bold">+{formatPriceLE(summary.totalIncome)}</span></div>
            <div className="flex justify-between"><span>Total Expenses</span><span className="text-primary font-bold">-{formatPriceLE(summary.totalExpenses)}</span></div>
            <hr />
            <div className="flex justify-between text-lg"><span className="font-bold">Net Profit</span><span className={`font-bold ${netProfit >= 0 ? 'text-green-700' : 'text-primary'}`}>{formatPriceLE(netProfit)}</span></div>
          </div>
        </PageCard>
      )}
      {!summary && !loading && <p className="text-center text-muted-foreground py-8">Select a time range and calculate net profit.</p>}
      <Snackbar message={snack} isError onClose={() => setSnack('')} />
    </div>
  );
}

export default function FinanceScreen() {
  const [tab, setTab] = useState('expenses');
  const tabs = [
    { id: 'expenses', label: 'Expenses' },
    { id: 'income', label: 'Income' },
    { id: 'profit', label: 'Net Profit' },
  ];

  return (
    <>
      <Header title="Finance Dashboard" />
      <div className="flex gap-2 mb-4 border-b overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'expenses' && <LogsTab logType="Expense" allTypesLabel="All Expense Types" />}
      {tab === 'income' && <LogsTab logType="Income" allTypesLabel="All Income Types" />}
      {tab === 'profit' && <NetProfitTab />}
    </>
  );
}
