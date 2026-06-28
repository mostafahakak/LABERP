'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/layout/Header';
import { formatPriceLE, ACCENT_COLOR } from '@/lib/utils';

function formatMonthYear(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function parseRecordDate(dateString) {
  if (!dateString) return null;
  const parsed = new Date(dateString);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function SalaryHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'Finance'),
      where('type', '==', 'Salary'),
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
      <Header title="Salary History" />

      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 mb-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-gray-600">📅 Selected Month: {monthLabel}</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border rounded-md text-black"
          />
          {selectedMonth && (
            <button
              type="button"
              onClick={() => setSelectedMonth('')}
              className="px-3 py-2 text-red-600 border border-red-200 rounded-md text-sm"
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
          className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-black focus:outline-none focus:border-[#c3a28e]"
        />
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-[#c3a28e] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && <p className="text-red-600 text-center py-8">Error: {error}</p>}

      {!loading && !error && records.length === 0 && (
        <p className="text-center text-gray-500 py-12">No salary records found.</p>
      )}

      {!loading && !error && records.length > 0 && filteredRecords.length === 0 && (
        <p className="text-center text-gray-500 py-12">No matching salary records found.</p>
      )}

      {!loading && !error && filteredRecords.length > 0 && (
        <div className="space-y-3">
          {filteredRecords.map((item) => {
            const recordDate = parseRecordDate(item.dateString);
            return (
              <div
                key={item.id}
                className="flex gap-4 bg-white rounded-2xl shadow-md border p-5"
                style={{ borderColor: `${ACCENT_COLOR}15` }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold shrink-0"
                  style={{ backgroundColor: `${ACCENT_COLOR}20`, color: ACCENT_COLOR }}
                >
                  {item.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-black text-lg">{item.name}</p>
                  <p className="text-sm text-gray-600">Paid Amount: {formatPriceLE(item.paidAmount)}</p>
                  <p className="text-sm text-gray-600">Bank: {item.bank}</p>
                  <p className="text-sm text-gray-600">
                    Debit Before: {formatPriceLE(item.drBalanceBefore)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Debit After: {formatPriceLE(item.drBalanceAfter)}
                  </p>
                </div>
                {recordDate && (
                  <p className="text-sm shrink-0" style={{ color: ACCENT_COLOR }}>
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
