'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ListSkeleton } from '@/components/ui/PageSkeleton';
import Header from '@/components/layout/Header';
import { formatPriceLE } from '@/lib/utils';

function formatMonthYear(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function parseRecordDate(dateString) {
  if (!dateString) return null;
  const parsed = new Date(dateString);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function LoanHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'Finance'),
      where('type', '==', 'Loan'),
      orderBy('Date', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRecords(
          snap.docs.map((d) => ({
            id: d.id,
            name: d.data().name || 'N/A',
            paidAmount: Number(d.data().paidAmount) || 0,
            drBalanceBefore: Number(d.data().drBalanceBefore) || 0,
            drBalanceAfter: Number(d.data().drBalanceAfter) || 0,
            bank: d.data().bank || 'N/A',
            dateString: d.data().Date || '',
          }))
        );
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

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesDate = true;
      if (selectedMonth) {
        const itemDate = parseRecordDate(item.dateString);
        const filterDate = new Date(`${selectedMonth}-01`);
        if (!itemDate) {
          matchesDate = false;
        } else {
          matchesDate =
            itemDate.getFullYear() === filterDate.getFullYear() &&
            itemDate.getMonth() === filterDate.getMonth();
        }
      }

      return matchesDate && matchesSearch;
    });
  }, [records, selectedMonth, searchQuery]);

  const monthLabel = selectedMonth
    ? formatMonthYear(new Date(`${selectedMonth}-01`))
    : 'All Months';

  return (
    <>
      <Header title="Loans History" breadcrumbs={[{ label: 'HR', href: '/dashboard/hr/employees' }]} />

      <div className="bg-card rounded-2xl shadow-sm border border-border p-5 mb-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-muted-foreground">📅 Selected Month: {monthLabel}</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border rounded-md text-foreground"
          />
          {selectedMonth && (
            <button
              type="button"
              onClick={() => setSelectedMonth('')}
              className="px-3 py-2 text-destructive border border-destructive/30 rounded-md text-sm"
            >
              Clear
            </button>
          )}
        </div>

        <input
          type="search"
          placeholder="Search employee by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2.5 border border-input rounded-md text-foreground focus:outline-none focus:border-primary"
        />
      </div>

      {loading && <ListSkeleton rows={4} />}

      {error && <p className="text-destructive text-center py-8">Error: {error}</p>}

      {!loading && !error && records.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No loan records found.</p>
      )}

      {!loading && !error && records.length > 0 && filteredRecords.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No matching loan records found.</p>
      )}

      {!loading && !error && filteredRecords.length > 0 && (
        <div className="space-y-3">
          {filteredRecords.map((item) => {
            const recordDate = parseRecordDate(item.dateString);
            return (
              <div
                key={item.id}
                className="flex gap-4 bg-card rounded-2xl shadow-sm border border-primary/10 p-5"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold shrink-0 bg-primary/10 text-primary"
                >
                  {item.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-lg">{item.name}</p>
                  <p className="text-sm text-muted-foreground">Paid Amount: {formatPriceLE(item.paidAmount)}</p>
                  <p className="text-sm text-muted-foreground">Bank: {item.bank}</p>
                  <p className="text-sm text-muted-foreground">
                    Debit Before: {formatPriceLE(item.drBalanceBefore)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Debit After: {formatPriceLE(item.drBalanceAfter)}
                  </p>
                </div>
                {recordDate && (
                  <p className="text-sm shrink-0" style={{ color: 'var(--primary)' }}>
                    {recordDate.toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
