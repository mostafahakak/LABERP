'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ChevronDown } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useTheme } from 'next-themes';
import Header from '@/components/layout/Header';
import Chart from '@/components/ui/Chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatPriceLE } from '@/lib/utils';

const PERIOD_OPTIONS = [
  { label: 'Hourly', value: 'hourly' },
  { label: 'Daily', value: 'daily' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

function periodKey(rawDate, rawTime, period) {
  if (!rawDate) return 'Unknown';
  const str = String(rawDate);
  switch (period) {
    case 'hourly': {
      const hour = rawTime ? String(rawTime).slice(0, 2) : '00';
      return `${str.slice(0, 10)} ${hour}:00`;
    }
    case 'daily':
      return str.slice(0, 10);
    case 'monthly':
      return str.slice(0, 7);
    case 'yearly':
      return str.slice(0, 4);
    default:
      return str.slice(0, 7);
  }
}

function periodSum(docs, dateField, valueField, period, timeField = 'Time') {
  const map = {};
  docs.forEach((d) => {
    const key = periodKey(d[dateField], d[timeField], period);
    map[key] = (map[key] || 0) + (Number(d[valueField]) || 0);
  });
  return Object.entries(map)
    .filter(([k]) => k !== 'Unknown')
    .sort((a, b) => a[0].localeCompare(b[0]));
}

function periodCount(docs, dateField, period, timeField = 'Time') {
  const map = {};
  docs.forEach((d) => {
    const key = periodKey(d[dateField], d[timeField], period);
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map)
    .filter(([k]) => k !== 'Unknown')
    .sort((a, b) => a[0].localeCompare(b[0]));
}

function groupCount(docs, keyField) {
  const map = {};
  docs.forEach((d) => {
    const key = d[keyField] || 'Unknown';
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function groupSum(docs, keyField, valueField = 'total') {
  const map = {};
  docs.forEach((d) => {
    const key = d[keyField] || 'Unknown';
    map[key] = (map[key] || 0) + (Number(d[valueField]) || 0);
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function chartTheme(isDark) {
  return {
    text: isDark ? '#e5e7eb' : '#374151',
    grid: isDark ? '#1f2937' : '#e5e7eb',
    bg: isDark ? '#0f1117' : '#ffffff',
    mode: isDark ? 'dark' : 'light',
  };
}

function EmptyChart() {
  return <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">No data available</div>;
}

function ChartCard({ title, description, children, className = '', periodSelect }) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {periodSelect}
        </div>
      </CardHeader>
      <CardContent className="overflow-visible pb-6">{children}</CardContent>
    </Card>
  );
}

function PeriodSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-lg border border-border bg-muted/50 px-2 text-xs font-medium text-foreground shadow-sm"
    >
      {PERIOD_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function AccordionGroup({ id, title, description, openGroup, setOpenGroup, children }) {
  const isOpen = openGroup === id;

  return (
    <Collapsible open={isOpen} onOpenChange={(open) => setOpenGroup(open ? id : '')} className="rounded-xl border bg-card">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
        <div>
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t p-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function ChartsPageContent() {
  const [financeDocs, setFinanceDocs] = useState([]);
  const [cases, setCases] = useState([]);
  const [casesTrack, setCasesTrack] = useState([]);
  const [inventoryDocs, setInventoryDocs] = useState([]);
  const [openGroup, setOpenGroup] = useState('finance');
  const [revenuePeriod, setRevenuePeriod] = useState('monthly');
  const [expensePeriod, setExpensePeriod] = useState('monthly');
  const [casesPeriod, setCasesPeriod] = useState('monthly');
  const [inventoryPeriod, setInventoryPeriod] = useState('monthly');
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = chartTheme(isDark);

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'Finance')),
      getDocs(collection(db, 'Cases')),
      getDocs(collection(db, 'CasesTrack')),
      getDocs(collection(db, 'Inventory')),
    ]).then(([financeSnap, casesSnap, trackSnap, inventorySnap]) => {
      setFinanceDocs(financeSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setCases(casesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setCasesTrack(trackSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setInventoryDocs(inventorySnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const invoices = useMemo(() => financeDocs.filter((d) => d.type === 'Invoice'), [financeDocs]);
  const expenses = useMemo(() => financeDocs.filter((d) => d.type && d.type !== 'Invoice'), [financeDocs]);

  const revenueMax = revenuePeriod === 'hourly' ? 24 : revenuePeriod === 'daily' ? 30 : revenuePeriod === 'monthly' ? 12 : 10;
  const expenseMax = expensePeriod === 'hourly' ? 24 : expensePeriod === 'daily' ? 30 : expensePeriod === 'monthly' ? 12 : 10;
  const casesMax = casesPeriod === 'hourly' ? 24 : casesPeriod === 'daily' ? 30 : casesPeriod === 'monthly' ? 12 : 10;
  const invMax = inventoryPeriod === 'hourly' ? 24 : inventoryPeriod === 'daily' ? 30 : inventoryPeriod === 'monthly' ? 12 : 10;

  const invoiceByPeriod = useMemo(() => periodSum(invoices, 'Date', 'total', revenuePeriod).slice(-revenueMax), [invoices, revenuePeriod, revenueMax]);
  const expenseByPeriod = useMemo(() => periodSum(expenses, 'Date', 'paidAmount', expensePeriod).slice(-expenseMax), [expenses, expensePeriod, expenseMax]);
  const invoiceByPlan = useMemo(() => groupCount(invoices, 'paymentPlan').slice(0, 6), [invoices]);
  const remainingByClinic = useMemo(() => groupSum(invoices, 'clinicName', 'remainingAmount').slice(0, 8), [invoices]);
  const paidByClinic = useMemo(() => groupSum(invoices, 'clinicName', 'paidAmount').slice(0, 8), [invoices]);
  const casesByClinic = useMemo(() => groupCount(cases, 'clinicName').slice(0, 8), [cases]);
  const expenseByType = useMemo(() => groupSum(expenses, 'type', 'paidAmount').slice(0, 8), [expenses]);

  const casesByPeriod = useMemo(() => periodCount(cases, 'Date', casesPeriod).slice(-casesMax), [cases, casesPeriod, casesMax]);
  const caseStatus = useMemo(() => groupCount(cases, 'status').slice(0, 8), [cases]);
  const actionType = useMemo(() => groupCount(casesTrack, 'action').slice(0, 8), [casesTrack]);
  const phaseDurations = useMemo(() => {
    // Group tracks by case, sort by time, compute hours spent in each phase
    const byCase = {};
    casesTrack.forEach((d) => {
      if (!d.caseUID || !d.date) return;
      if (!byCase[d.caseUID]) byCase[d.caseUID] = [];
      byCase[d.caseUID].push(d);
    });
    const totals = {};
    const counts = {};
    Object.values(byCase).forEach((tracks) => {
      tracks.sort((a, b) => {
        const dc = (a.date || '').localeCompare(b.date || '');
        if (dc !== 0) return dc;
        return (a.time || '').localeCompare(b.time || '');
      });
      for (let i = 0; i < tracks.length - 1; i++) {
        const phase = tracks[i].toPhase || tracks[i].fromPhase;
        if (!phase) continue;
        const t1 = new Date(`${tracks[i].date}T${tracks[i].time || '00:00'}`);
        const t2 = new Date(`${tracks[i + 1].date}T${tracks[i + 1].time || '00:00'}`);
        if (Number.isNaN(t1.getTime()) || Number.isNaN(t2.getTime())) continue;
        const hours = (t2 - t1) / 3600000;
        if (hours < 0) continue;
        totals[phase] = (totals[phase] || 0) + hours;
        counts[phase] = (counts[phase] || 0) + 1;
      }
    });
    return Object.entries(totals)
      .map(([phase, total]) => [phase, Math.round((total / counts[phase]) * 10) / 10])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [casesTrack]);

  const inventoryByCategory = useMemo(() => groupSum(inventoryDocs, 'category', 'amount').slice(0, 8), [inventoryDocs]);
  const inventoryByPeriod = useMemo(() => periodSum(inventoryDocs, 'Date', 'amount', inventoryPeriod).slice(-invMax), [inventoryDocs, inventoryPeriod, invMax]);
  const stockMovement = useMemo(() => groupSum(inventoryDocs, 'usageType', 'amount'), [inventoryDocs]);
  const topUsedIn = useMemo(() => groupSum(inventoryDocs.filter((d) => d.usageType === 'In'), 'itemName', 'quantityUsed').slice(0, 8), [inventoryDocs]);
  const topUsedOut = useMemo(() => groupSum(inventoryDocs.filter((d) => d.usageType === 'Out'), 'itemName', 'quantityUsed').slice(0, 8), [inventoryDocs]);

  const commonOptions = {
    chart: { background: 'transparent', toolbar: { show: false }, fontFamily: 'inherit' },
    dataLabels: { enabled: false },
    grid: { borderColor: colors.grid, strokeDashArray: 4 },
    legend: { labels: { colors: colors.text } },
    xaxis: { labels: { style: { colors: colors.text } } },
    yaxis: { labels: { style: { colors: colors.text } } },
    tooltip: { theme: colors.mode },
    theme: { mode: colors.mode },
  };

  return (
    <>
      <Header title="Charts" />

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total Invoices</CardDescription><CardTitle>{invoices.length}</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total Cases</CardDescription><CardTitle>{cases.length}</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Inventory Transactions</CardDescription><CardTitle>{inventoryDocs.length}</CardTitle></CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        <AccordionGroup
          id="finance"
          title="Finance Analytics"
          description="Invoices, plans, remaining balances, and expenses"
          openGroup={openGroup}
          setOpenGroup={setOpenGroup}
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard title="Invoice Revenue Trend" description={`Revenue grouped ${revenuePeriod}`} periodSelect={<PeriodSelect value={revenuePeriod} onChange={setRevenuePeriod} />}>
              {invoiceByPeriod.length > 0 ? (
                <Chart
                  type="area"
                  height={320}
                  series={[{ name: 'Revenue', data: invoiceByPeriod.map(([, v]) => v) }]}
                  options={{
                    ...commonOptions,
                    colors: ['#6fa8dc'],
                    stroke: { curve: 'smooth', width: 3 },
                    xaxis: { ...commonOptions.xaxis, categories: invoiceByPeriod.map(([k]) => k) },
                    fill: { type: 'gradient', gradient: { opacityFrom: 0.45, opacityTo: 0.05 } },
                    tooltip: { theme: colors.mode, y: { formatter: (v) => formatPriceLE(v) } },
                  }}
                />
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Expense Trend" description={`Expenses grouped ${expensePeriod}`} periodSelect={<PeriodSelect value={expensePeriod} onChange={setExpensePeriod} />}>
              {expenseByPeriod.length > 0 ? (
                <Chart
                  type="area"
                  height={320}
                  series={[{ name: 'Expenses', data: expenseByPeriod.map(([, v]) => v) }]}
                  options={{
                    ...commonOptions,
                    colors: ['#ef4444'],
                    stroke: { curve: 'smooth', width: 3 },
                    xaxis: { ...commonOptions.xaxis, categories: expenseByPeriod.map(([k]) => k) },
                    fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
                    tooltip: { theme: colors.mode, y: { formatter: (v) => formatPriceLE(v) } },
                  }}
                />
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Invoice Payment Plans" description="Distribution by payment plan">
              {invoiceByPlan.length > 0 ? (
                <Chart
                  type="donut"
                  height={320}
                  series={invoiceByPlan.map(([, v]) => v)}
                  options={{
                    ...commonOptions,
                    labels: invoiceByPlan.map(([k]) => k),
                    colors: ['#3b82f6', '#06b6d4', '#14b8a6', '#f59e0b', '#f97316', '#ef4444'],
                    stroke: { width: 2, colors: [colors.bg] },
                  }}
                />
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Expenses by Type" description="Paid expenses grouped by type">
              {expenseByType.length > 0 ? (
                <Chart
                  type="bar"
                  height={320}
                  series={[{ name: 'Expenses', data: expenseByType.map(([, v]) => v) }]}
                  options={{
                    ...commonOptions,
                    colors: ['#ef4444'],
                    plotOptions: { bar: { borderRadius: 5, columnWidth: '50%' } },
                    xaxis: { ...commonOptions.xaxis, categories: expenseByType.map(([k]) => k) },
                    tooltip: { theme: colors.mode, y: { formatter: (v) => formatPriceLE(v) } },
                  }}
                />
              ) : <EmptyChart />}
            </ChartCard>
          </div>
        </AccordionGroup>

        <AccordionGroup
          id="clinic"
          title="Clinic Analytics"
          description="Clinic balances, payments, and case orders"
          openGroup={openGroup}
          setOpenGroup={setOpenGroup}
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard title="Remaining Balances by Clinic" description="Top clinics with unpaid balances">
              {remainingByClinic.length > 0 ? (
                <Chart
                  type="bar"
                  height={320}
                  series={[{ name: 'Remaining', data: remainingByClinic.map(([, v]) => v) }]}
                  options={{
                    ...commonOptions,
                    colors: ['#f97316'],
                    plotOptions: { bar: { horizontal: true, borderRadius: 5 } },
                    xaxis: {
                      ...commonOptions.xaxis,
                      categories: remainingByClinic.map(([k]) => k),
                      position: 'top',
                      labels: {
                        ...commonOptions.xaxis.labels,
                        show: true,
                        formatter: (v) => Number(v).toFixed(0),
                      },
                      axisBorder: { show: true, color: colors.grid },
                      axisTicks: { show: true, color: colors.grid },
                    },
                    tooltip: { theme: colors.mode, y: { formatter: (v) => formatPriceLE(v) } },
                  }}
                />
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Paid Balances by Clinic" description="Top clinics with paid balances">
              {paidByClinic.length > 0 ? (
                <Chart
                  type="bar"
                  height={320}
                  series={[{ name: 'Paid', data: paidByClinic.map(([, v]) => v) }]}
                  options={{
                    ...commonOptions,
                    colors: ['#22c55e'],
                    plotOptions: { bar: { horizontal: true, borderRadius: 5 } },
                    xaxis: {
                      ...commonOptions.xaxis,
                      categories: paidByClinic.map(([k]) => k),
                      position: 'top',
                      labels: {
                        ...commonOptions.xaxis.labels,
                        show: true,
                        formatter: (v) => Number(v).toFixed(0),
                      },
                      axisBorder: { show: true, color: colors.grid },
                      axisTicks: { show: true, color: colors.grid },
                    },
                    tooltip: { theme: colors.mode, y: { formatter: (v) => formatPriceLE(v) } },
                  }}
                />
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Clinic Order Units (Cases)" description="Top clinics by number of cases" className="xl:col-span-2">
              {casesByClinic.length > 0 ? (
                <Chart
                  type="bar"
                  height={320}
                  series={[{ name: 'Cases', data: casesByClinic.map(([, v]) => v) }]}
                  options={{
                    ...commonOptions,
                    colors: ['#3b82f6'],
                    plotOptions: { bar: { borderRadius: 6, columnWidth: '50%' } },
                    xaxis: { ...commonOptions.xaxis, categories: casesByClinic.map(([k]) => k) },
                  }}
                />
              ) : <EmptyChart />}
            </ChartCard>
          </div>
        </AccordionGroup>

        <AccordionGroup
          id="workflow"
          title="Workflow Analytics"
          description="Cases status, actions, and phase transitions"
          openGroup={openGroup}
          setOpenGroup={setOpenGroup}
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard title="Cases Over Time" description={`Cases created grouped ${casesPeriod}`} periodSelect={<PeriodSelect value={casesPeriod} onChange={setCasesPeriod} />}>
              {casesByPeriod.length > 0 ? (
                <Chart
                  type="area"
                  height={320}
                  series={[{ name: 'Cases', data: casesByPeriod.map(([, v]) => v) }]}
                  options={{
                    ...commonOptions,
                    colors: ['#0ea5e9'],
                    stroke: { curve: 'smooth', width: 3 },
                    xaxis: { ...commonOptions.xaxis, categories: casesByPeriod.map(([k]) => k) },
                    fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
                  }}
                />
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Cases by Status" description="Current workflow pipeline distribution">
              {caseStatus.length > 0 ? (
                <Chart
                  type="donut"
                  height={320}
                  series={caseStatus.map(([, v]) => v)}
                  options={{
                    ...commonOptions,
                    labels: caseStatus.map(([k]) => k),
                    colors: ['#0ea5e9', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#6366f1', '#14b8a6', '#f97316'],
                    stroke: { width: 2, colors: [colors.bg] },
                  }}
                />
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Workflow Actions" description="Top action types from case tracking logs">
              {actionType.length > 0 ? (
                <Chart
                  type="bar"
                  height={320}
                  series={[{ name: 'Actions', data: actionType.map(([, v]) => v) }]}
                  options={{
                    ...commonOptions,
                    colors: ['#8b5cf6'],
                    plotOptions: { bar: { borderRadius: 6, columnWidth: '50%' } },
                    xaxis: { ...commonOptions.xaxis, categories: actionType.map(([k]) => k) },
                  }}
                />
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard
              title="Avg. Phase Duration"
              description="Average hours each phase takes before moving to the next"
              className="xl:col-span-2"
            >
              {phaseDurations.length > 0 ? (
                <Chart
                  type="bar"
                  height={360}
                  series={[{ name: 'Avg Hours', data: phaseDurations.map(([, v]) => v) }]}
                  options={{
                    ...commonOptions,
                    chart: { ...commonOptions.chart, parentHeightOffset: 0 },
                    colors: ['#14b8a6'],
                    plotOptions: { bar: { horizontal: true, borderRadius: 6 } },
                    xaxis: {
                      ...commonOptions.xaxis,
                      categories: phaseDurations.map(([k]) => k),
                      position: 'top',
                      axisBorder: { show: true, color: colors.grid },
                      axisTicks: { show: true, color: colors.grid },
                      labels: {
                        ...commonOptions.xaxis.labels,
                        show: true,
                        formatter: (v) => `${Number(v).toFixed(1)}h`,
                      },
                    },
                    tooltip: {
                      theme: colors.mode,
                      y: { formatter: (v) => `${v} hours` },
                    },
                    grid: {
                      ...commonOptions.grid,
                      padding: { bottom: 20 },
                    },
                  }}
                />
              ) : <EmptyChart />}
            </ChartCard>
          </div>
        </AccordionGroup>

        <AccordionGroup
          id="inventory"
          title="Inventory Analytics"
          description="Category value, stock movement, and top used items"
          openGroup={openGroup}
          setOpenGroup={setOpenGroup}
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard title="Inventory Over Time" description={`Transaction amounts grouped ${inventoryPeriod}`} periodSelect={<PeriodSelect value={inventoryPeriod} onChange={setInventoryPeriod} />}>
              {inventoryByPeriod.length > 0 ? (
                <Chart
                  type="area"
                  height={320}
                  series={[{ name: 'Amount', data: inventoryByPeriod.map(([, v]) => v) }]}
                  options={{
                    ...commonOptions,
                    colors: ['#f59e0b'],
                    stroke: { curve: 'smooth', width: 3 },
                    xaxis: { ...commonOptions.xaxis, categories: inventoryByPeriod.map(([k]) => k) },
                    fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
                    tooltip: { theme: colors.mode, y: { formatter: (v) => formatPriceLE(v) } },
                  }}
                />
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Inventory Amount by Category" description="Top categories by transaction amount">
              {inventoryByCategory.length > 0 ? (
                <Chart
                  type="bar"
                  height={320}
                  series={[{ name: 'Amount', data: inventoryByCategory.map(([, v]) => v) }]}
                  options={{
                    ...commonOptions,
                    colors: ['#3b82f6'],
                    plotOptions: { bar: { borderRadius: 5, columnWidth: '50%' } },
                    xaxis: { ...commonOptions.xaxis, categories: inventoryByCategory.map(([k]) => k) },
                    tooltip: { theme: colors.mode, y: { formatter: (v) => formatPriceLE(v) } },
                  }}
                />
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Stock Movement (In vs Out)" description="Total inventory movement by type">
              {stockMovement.length > 0 ? (
                <Chart
                  type="donut"
                  height={320}
                  series={stockMovement.map(([, v]) => v)}
                  options={{
                    ...commonOptions,
                    labels: stockMovement.map(([k]) => k),
                    colors: ['#22c55e', '#ef4444', '#64748b'],
                    stroke: { width: 2, colors: [colors.bg] },
                    tooltip: { theme: colors.mode, y: { formatter: (v) => formatPriceLE(v) } },
                  }}
                />
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Top Used Items (In)" description="Highest quantity items received">
              {topUsedIn.length > 0 ? (
                <Chart
                  type="bar"
                  height={320}
                  series={[{ name: 'Quantity In', data: topUsedIn.map(([, v]) => v) }]}
                  options={{
                    ...commonOptions,
                    colors: ['#22c55e'],
                    plotOptions: { bar: { horizontal: true, borderRadius: 6 } },
                    xaxis: {
                      ...commonOptions.xaxis,
                      categories: topUsedIn.map(([k]) => k),
                      position: 'top',
                      labels: {
                        ...commonOptions.xaxis.labels,
                        show: true,
                        formatter: (v) => Number(v).toFixed(0),
                      },
                      axisBorder: { show: true, color: colors.grid },
                      axisTicks: { show: true, color: colors.grid },
                    },
                    tooltip: { theme: colors.mode, y: { formatter: (v) => Number(v).toFixed(2) } },
                  }}
                />
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title="Top Used Items (Out)" description="Highest quantity items consumed">
              {topUsedOut.length > 0 ? (
                <Chart
                  type="bar"
                  height={320}
                  series={[{ name: 'Quantity Out', data: topUsedOut.map(([, v]) => v) }]}
                  options={{
                    ...commonOptions,
                    colors: ['#ef4444'],
                    plotOptions: { bar: { horizontal: true, borderRadius: 6 } },
                    xaxis: {
                      ...commonOptions.xaxis,
                      categories: topUsedOut.map(([k]) => k),
                      position: 'top',
                      labels: {
                        ...commonOptions.xaxis.labels,
                        show: true,
                        formatter: (v) => Number(v).toFixed(0),
                      },
                      axisBorder: { show: true, color: colors.grid },
                      axisTicks: { show: true, color: colors.grid },
                    },
                    tooltip: { theme: colors.mode, y: { formatter: (v) => Number(v).toFixed(2) } },
                  }}
                />
              ) : <EmptyChart />}
            </ChartCard>
          </div>
        </AccordionGroup>
      </div>
    </>
  );
}
