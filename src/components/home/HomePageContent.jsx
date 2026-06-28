'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate } from '@/lib/utils';
import { useTheme } from 'next-themes';
import Header from '@/components/layout/Header';
import Chart from '@/components/ui/Chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';

const LOG_TYPES = ['All', 'Invoice', 'Purchase Invoice', 'Salary', 'Loan', 'Utility', 'Inventory'];
const CHART_TYPES = ['Income', 'Expenses', 'Netprofit'];

export default function HomePageContent() {
  const [selectedChart, setSelectedChart] = useState('Income');
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
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

  const totals = chartData.reduce(
    (acc, row) => ({
      income: acc.income + row.income,
      expense: acc.expense + row.expense,
      net: acc.net + row.net,
    }),
    { income: 0, expense: 0, net: 0 }
  );

  return (
    <>
      <Header title="Dashboard" />

      {/* ── Summary Cards ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
            <TrendingUp className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{totals.income.toFixed(0)} LE</div>
            <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            <TrendingDown className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{totals.expense.toFixed(0)} LE</div>
            <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
            <DollarSign className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.net >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {totals.net.toFixed(0)} LE
            </div>
            <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activity</CardTitle>
            <Activity className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Log entries</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Financial Overview ── */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7 mb-6">
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle>Financial Overview</CardTitle>
                <CardDescription>Daily breakdown for the last 7 days</CardDescription>
              </div>
              <div className="flex gap-1">
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
            </div>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <Chart
                type="area"
                height={300}
                series={[
                  ...(selectedChart !== 'Expenses' ? [{ name: 'Income', data: chartData.map((r) => r.income) }] : []),
                  ...(selectedChart !== 'Income' ? [{ name: 'Expenses', data: chartData.map((r) => r.expense) }] : []),
                  ...(selectedChart === 'Netprofit' ? [{ name: 'Net', data: chartData.map((r) => r.net) }] : []),
                ]}
                options={{
                  chart: { type: 'area', toolbar: { show: false }, background: 'transparent', fontFamily: 'inherit', sparkline: { enabled: false } },
                  xaxis: { categories: chartData.map((r) => r.day), labels: { style: { colors: isDark ? '#9ca3af' : '#6b7280', fontSize: '11px' } } },
                  yaxis: { labels: { style: { colors: isDark ? '#9ca3af' : '#6b7280' }, formatter: (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0) } },
                  colors: ['#22c55e', '#ef4444', '#c2a18c'],
                  fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 95, 100] } },
                  stroke: { curve: 'smooth', width: 2 },
                  grid: { borderColor: isDark ? '#1f2937' : '#e5e7eb', strokeDashArray: 4 },
                  dataLabels: { enabled: false },
                  tooltip: { theme: isDark ? 'dark' : 'light' },
                  legend: { position: 'top', labels: { colors: isDark ? '#d1d5db' : '#374151' } },
                  theme: { mode: isDark ? 'dark' : 'light' },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">Loading chart data...</div>
            )}
          </CardContent>
        </Card>

        {/* ── Quick Filters ── */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter activity logs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Category</Label>
              <Select value={logCategory} onValueChange={setLogCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['All', 'Income', 'Expense'].map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Type</Label>
              <Select value={logType} onValueChange={setLogType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOG_TYPES.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Start Date</Label>
                <Input type="date" value={logStart} onChange={(e) => setLogStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">End Date</Label>
                <Input type="date" value={logEnd} onChange={(e) => setLogEnd(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Activity Logs ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-5 text-primary" />
            Activity Logs
          </CardTitle>
          <CardDescription>{logs.length} entries found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-foreground truncate">
                    {log.cName || log.name} — {log.type}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {log.Date} {log.Time} · {log.adminName}
                  </p>
                </div>
                <Badge
                  variant={log.type === 'Income' || log.type === 'Invoice' ? 'default' : 'secondary'}
                  className="ml-3 font-semibold shrink-0"
                >
                  {Number(log.amount || 0).toFixed(0)} LE
                </Badge>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">No log entries found</div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
