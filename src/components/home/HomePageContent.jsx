'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { PageCard, SelectField } from '@/components/ui/PageComponents';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
        {/* Chart Type Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CHART_TYPES.map((t) => (
            <Button
              key={t}
              variant={selectedChart === t ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedChart(t)}
            >
              {t}
            </Button>
          ))}
        </div>

        {/* Summary Table */}
        <div className="overflow-x-auto mb-6 rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Date</th>
                <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Income</th>
                <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Expenses</th>
                <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Net</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => (
                <tr key={row.day} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-medium">{row.day}</td>
                  <td className="text-right px-3 text-emerald-600 font-medium">{selectedChart !== 'Expenses' ? row.income.toFixed(0) : '-'}</td>
                  <td className="text-right px-3 text-destructive font-medium">{selectedChart !== 'Income' ? row.expense.toFixed(0) : '-'}</td>
                  <td className="text-right px-3 font-semibold">{selectedChart === 'Netprofit' ? row.net.toFixed(0) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Activity Logs */}
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <span className="text-primary">📋</span>
          Activity Logs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <SelectField label="Category" value={logCategory} onChange={setLogCategory} options={['All', 'Income', 'Expense']} />
          <SelectField label="Type" value={logType} onChange={setLogType} options={LOG_TYPES} />
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Start</Label>
            <Input type="date" value={logStart} onChange={(e) => setLogStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">End</Label>
            <Input type="date" value={logEnd} onChange={(e) => setLogEnd(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {logs.map((log) => (
            <Card key={log.id} className="shadow-none border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="flex justify-between items-center py-3 px-4">
                <div>
                  <p className="font-medium text-sm text-foreground">{log.cName || log.name} — {log.type}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{log.Date} {log.Time} · {log.adminName}</p>
                </div>
                <Badge variant={log.type === 'Income' || log.type === 'Invoice' ? 'default' : 'secondary'} className="font-semibold">
                  {Number(log.amount || 0).toFixed(0)} LE
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageCard>
    </>
  );
}
