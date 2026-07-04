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
import { Snackbar } from '@/components/ui/PageComponents';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Filter, X, Sparkles, CalendarRange, ShieldCheck } from 'lucide-react';

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
  const totalAmount = logs.reduce((s, d) => s + (Number(d.amount) || 0), 0);

  return (
    <div className="space-y-5">
      <Card className="border-primary/20 bg-gradient-to-b from-card to-card/90 shadow-lg shadow-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base tracking-wide">
            <span className="rounded-lg border border-primary/25 bg-primary/10 p-1.5">
              <Filter className="size-4 text-primary" />
            </span>
            {isExpense ? 'Filter Expenses' : 'Filter Income'} Stream
          </CardTitle>
          <CardDescription>Focus records by date and administrator scope.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {user?.type === 'Admin' && adminOptions.length > 0 && (
              <div className="space-y-1.5">
                <Label>Admin</Label>
                <Select value={adminFilterId} onValueChange={setAdminFilterId}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {adminOptions.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setStartDate(''); setEndDate(''); setNameFilter(allTypesLabel); setAdminFilterId('All Admins'); }} className="mt-4 gap-1.5 border-primary/30 hover:bg-primary/10">
            <X className="size-3.5" /> Clear Filters
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={nameFilter === allTypesLabel ? 'default' : 'outline'}
          size="sm"
          onClick={() => setNameFilter(allTypesLabel)}
          className={nameFilter === allTypesLabel ? 'shadow-md shadow-primary/20' : 'hover:border-primary/30 hover:bg-primary/10'}
        >
          {allTypesLabel}
        </Button>
        {nameTotals.map(([name, total]) => (
          <Button
            key={name}
            variant={nameFilter === name ? 'default' : 'outline'}
            size="sm"
            onClick={() => setNameFilter(name)}
            className={nameFilter === name ? 'shadow-md shadow-primary/20' : 'hover:border-primary/30 hover:bg-primary/10'}
          >
            {name}: {Math.round(total)} LE
          </Button>
        ))}
      </div>

      {!loading && logs.length > 0 && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              {isExpense ? <TrendingDown className="size-5 text-destructive" /> : <TrendingUp className="size-5 text-emerald-500" />}
              <span className="font-medium">{logs.length} records</span>
            </div>
            <span className={`text-xl font-bold ${isExpense ? 'text-destructive' : 'text-emerald-600'}`}>
              {isExpense ? '-' : '+'}{formatPriceLE(totalAmount)}
            </span>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card className="border-border/70 bg-card/90">
          <CardContent className="py-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive/40"><CardContent className="py-8 text-center text-destructive">{error}</CardContent></Card>
      ) : logs.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-muted/20"><CardContent className="py-10 text-center text-muted-foreground">No records found.</CardContent></Card>
      ) : (
        <Card className="overflow-hidden border-border/70 bg-card/90 shadow-lg shadow-black/5">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/35 hover:bg-muted/35">
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="hidden md:table-cell">Admin</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((d) => {
                  const row = (
                    <TableRow key={d.id} className={!isExpense && d.actionID ? 'cursor-pointer hover:bg-primary/5' : 'hover:bg-muted/30'}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{d.name}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">{d.Date} {d.Time}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{d.cName}</Badge></TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{d.Date} · {d.Time}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{d.adminName || '—'}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${isExpense ? 'text-destructive' : 'text-emerald-600'}`}>
                          {isExpense ? '-' : '+'}{formatPriceLE(d.amount)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                  if (!isExpense && d.actionID) {
                    return <Link key={d.id} href={`/dashboard/finance/invoices/${d.actionID}?type=Income`} className="contents">{row}</Link>;
                  }
                  return row;
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
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
      <Card className="border-primary/20 bg-gradient-to-b from-card to-card/90 shadow-lg shadow-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="rounded-lg border border-primary/25 bg-primary/10 p-1.5">
              <CalendarRange className="size-4 text-primary" />
            </span>
            Select Time Range
          </CardTitle>
          <CardDescription>Compute income, expenses, and net profit over any period.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <Button onClick={calculate} disabled={loading} className="mt-4">
            {loading ? 'Calculating...' : 'Calculate'}
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-emerald-500/25 bg-emerald-500/5">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Income</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-emerald-600">+{formatPriceLE(summary.totalIncome)}</p></CardContent>
          </Card>
          <Card className="border-destructive/25 bg-destructive/5">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Expenses</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-destructive">-{formatPriceLE(summary.totalExpenses)}</p></CardContent>
          </Card>
          <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Net Profit</CardTitle></CardHeader>
            <CardContent><p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{formatPriceLE(netProfit)}</p></CardContent>
          </Card>
        </div>
      )}

      {!summary && !loading && (
        <Card className="border-dashed border-border/80 bg-muted/20"><CardContent className="py-12 text-center text-muted-foreground">Select a time range and calculate net profit.</CardContent></Card>
      )}
      <Snackbar message={snack} isError onClose={() => setSnack('')} />
    </div>
  );
}

export default function FinanceScreen() {
  return (
    <>
      <Header title="Finance Dashboard" />
      <div className="relative mb-4 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/12 via-primary/5 to-transparent p-5">
        <div className="absolute -right-12 -top-10 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Financial Intelligence</p>
            <h2 className="text-2xl font-semibold text-foreground">Cash Flow Command Center</h2>
            <p className="text-sm text-muted-foreground">Analyze expenses, income activity, and net performance in one place.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground">
            <ShieldCheck className="size-4 text-primary" />
            Live ledger data
          </div>
        </div>
      </div>

      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList className="h-auto rounded-xl border border-border/70 bg-muted/30 p-1">
          <TabsTrigger value="expenses" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Expenses
          </TabsTrigger>
          <TabsTrigger value="income" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Income
          </TabsTrigger>
          <TabsTrigger value="profit" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Sparkles className="mr-1.5 size-4" />
            Net Profit
          </TabsTrigger>
        </TabsList>
        <TabsContent value="expenses"><LogsTab logType="Expense" allTypesLabel="All Expense Types" /></TabsContent>
        <TabsContent value="income"><LogsTab logType="Income" allTypesLabel="All Income Types" /></TabsContent>
        <TabsContent value="profit"><NetProfitTab /></TabsContent>
      </Tabs>
    </>
  );
}
