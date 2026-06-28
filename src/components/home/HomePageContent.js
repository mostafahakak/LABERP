'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { PageCard, SelectField } from '@/components/ui/PageComponents';
import { ACCENT_COLOR } from '@/lib/utils';

const LOG_TYPES = ['All', 'Invoice', 'Purchase Invoice', 'Salary', 'Loan', 'Utility', 'Inventory'];
const CHART_TYPES = ['Income', 'Expenses', 'Netprofit'];

export default function HomePageContent() {
  const [selectedChart, setSelectedChart] = useState('Income');
  const [logCategory, setLogCategory] = useState('All');
  const [logType, setLogType] = useState('All');
  const [logStart, setLogStart] = useState('');
  const [logEnd, setLogEnd] = useState('');
  const [logs, setLogs] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const constraints = [orderBy('Date', 'desc'), limit(100)];
    if (logStart) constraints.unshift(where('Date', '>=', logStart));
    if (logEnd) {
      const next = new Date(logEnd);
      next.setDate(next.getDate() + 1);
      constraints.unshift(where('Date', '<', formatDate(next)));
    }
    const q = query(collection(db, 'Logs'), ...constraints);
    return onSnapshot(q, (snap) => {
      let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (logCategory !== 'All') docs = docs.filter((d) => d.type === logCategory);
      if (logType !== 'All') docs = docs.filter((d) => d.cName === logType);
      setLogs(docs);
    });
  }, [logStart, logEnd, logCategory, logType]);

  useEffect(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(formatDate(d));
    }
    import('firebase/firestore').then(({ getDocs, query: q, where: w, collection: col }) => {
      getDocs(q(col(db, 'Finance'), w('Date', '>=', days[0]))).then((snap) => {
        const byDate = {};
        days.forEach((day) => { byDate[day] = { income: 0, expense: 0 }; });
        snap.docs.forEach((d) => {
          const data = d.data();
          const day = data.Date;
          if (!byDate[day]) return;
          const amt = Number(data.paidAmount) || 0;
          if (data.type === 'Invoice') byDate[day].income += amt;
          if (['Purchase Invoice', 'Salary', 'Loan', 'Utility'].includes(data.type)) byDate[day].expense += amt;
        });
        setChartData(days.map((day) => ({ day, ...byDate[day], net: byDate[day].income - byDate[day].expense })));
      });
    });
  }, []);

  return (
    <>
      <Header />
      <PageCard title="Dashboard" icon="🏠">
        <div className="flex flex-wrap gap-2 mb-6">
          {CHART_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedChart(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedChart === t ? 'bg-black text-[#c3a28e]' : 'border text-black'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm text-black">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Date</th>
                <th className="text-right py-2">Income</th>
                <th className="text-right py-2">Expenses</th>
                <th className="text-right py-2">Net</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => (
                <tr key={row.day} className="border-b border-gray-100">
                  <td className="py-2">{row.day}</td>
                  <td className="text-right text-green-600">{selectedChart !== 'Expenses' ? row.income.toFixed(0) : '-'}</td>
                  <td className="text-right text-red-600">{selectedChart !== 'Income' ? row.expense.toFixed(0) : '-'}</td>
                  <td className="text-right font-semibold">{selectedChart === 'Netprofit' ? row.net.toFixed(0) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="font-bold text-black mb-3">Activity Logs</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <SelectField label="Category" value={logCategory} onChange={setLogCategory} options={['All', 'Income', 'Expense']} />
          <SelectField label="Type" value={logType} onChange={setLogType} options={LOG_TYPES} />
          <div>
            <label className="block text-sm text-gray-600 mb-1">Start</label>
            <input type="date" value={logStart} onChange={(e) => setLogStart(e.target.value)} className="w-full border rounded-md p-2.5 text-black" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">End</label>
            <input type="date" value={logEnd} onChange={(e) => setLogEnd(e.target.value)} className="w-full border rounded-md p-2.5 text-black" />
          </div>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="flex justify-between items-center border rounded-lg p-3 text-black text-sm">
              <div>
                <p className="font-medium">{log.cName || log.name} — {log.type}</p>
                <p className="text-gray-500">{log.Date} {log.Time} · {log.adminName}</p>
              </div>
              <span className="font-bold" style={{ color: log.type === 'Income' ? '#16a34a' : ACCENT_COLOR }}>
                {Number(log.amount || 0).toFixed(0)} LE
              </span>
            </div>
          ))}
        </div>
      </PageCard>
    </>
  );
}
