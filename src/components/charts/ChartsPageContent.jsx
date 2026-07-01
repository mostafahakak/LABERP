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

function monthKey(rawDate) {
  if (!rawDate) return 'Unknown';
  const str = String(rawDate);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str.slice(0, 7);
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
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

function monthlySum(docs, dateField = 'Date', valueField = 'total') {
  const map = {};
  docs.forEach((d) => {
    const key = monthKey(d[dateField]);
    map[key] = (map[key] || 0) + (Number(d[valueField]) || 0);
  });
  return Object.entries(map)
    .filter(([k]) => k !== 'Unknown')
    .sort((a, b) => a[0].localeCompare(b[0]));
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

function ChartCard({ title, description, children, className = '' }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-visible pb-6">{children}</CardContent>
    </Card>
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

  const invoiceByMonth = useMemo(() => monthlySum(invoices, 'Date', 'total').slice(-8), [invoices]);
  const invoiceByPlan = useMemo(() => groupCount(invoices, 'paymentPlan').slice(0, 6), [invoices]);
  const remainingByClinic = useMemo(() => groupSum(invoices, 'clinicName', 'remainingAmount').slice(0, 8), [invoices]);
  const expenseByType = useMemo(() => groupSum(expenses, 'type', 'paidAmount').slice(0, 8), [expenses]);

  const caseStatus = useMemo(() => groupCount(cases, 'status').slice(0, 8), [cases]);
  const actionType = useMemo(() => groupCount(casesTrack, 'action').slice(0, 8), [casesTrack]);
  const phaseTransitions = useMemo(() => {
    const map = {};
    casesTrack.forEach((d) => {
      if (!d.fromPhase || !d.toPhase) return;
      const key = `${d.fromPhase} -> ${d.toPhase}`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [casesTrack]);

  const inventoryByCategory = useMemo(() => groupSum(inventoryDocs, 'category', 'amount').slice(0, 8), [inventoryDocs]);
  const stockMovement = useMemo(() => groupSum(inventoryDocs, 'usageType', 'amount'), [inventoryDocs]);
  const topUsedItems = useMemo(() => groupSum(inventoryDocs, 'itemName', 'quantityUsed').slice(0, 8), [inventoryDocs]);

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
            <ChartCard title="Invoice Revenue Trend" description="Monthly total invoice value">
              {invoiceByMonth.length > 0 ? (
                <Chart
                  type="area"
                  height={320}
                  series={[{ name: 'Revenue', data: invoiceByMonth.map(([, v]) => v) }]}
                  options={{
                    ...commonOptions,
                    colors: ['#6fa8dc'],
                    stroke: { curve: 'smooth', width: 3 },
                    xaxis: { ...commonOptions.xaxis, categories: invoiceByMonth.map(([k]) => k) },
                    fill: { type: 'gradient', gradient: { opacityFrom: 0.45, opacityTo: 0.05 } },
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
                    xaxis: { ...commonOptions.xaxis, categories: remainingByClinic.map(([k]) => k) },
                    tooltip: { theme: colors.mode, y: { formatter: (v) => formatPriceLE(v) } },
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
          id="workflow"
          title="Workflow Analytics"
          description="Cases status, actions, and phase transitions"
          openGroup={openGroup}
          setOpenGroup={setOpenGroup}
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
              title="Most Common Phase Transitions"
              description="Top transition pairs in operations"
              className="xl:col-span-2"
            >
              {phaseTransitions.length > 0 ? (
                <Chart
                  type="bar"
                  height={360}
                  series={[{ name: 'Transitions', data: phaseTransitions.map(([, v]) => v) }]}
                  options={{
                    ...commonOptions,
                    chart: { ...commonOptions.chart, parentHeightOffset: 0 },
                    colors: ['#14b8a6'],
                    plotOptions: { bar: { horizontal: true, borderRadius: 6 } },
                    xaxis: {
                      ...commonOptions.xaxis,
                      categories: phaseTransitions.map(([k]) => k),
                      axisBorder: { show: true, color: colors.grid },
                      axisTicks: { show: true, color: colors.grid },
                      labels: {
                        ...commonOptions.xaxis.labels,
                        show: true,
                        formatter: (v) => Number(v).toFixed(0),
                      },
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

            <ChartCard title="Top Used Items" description="Highest quantity consumed items" className="xl:col-span-2">
              {topUsedItems.length > 0 ? (
                <Chart
                  type="bar"
                  height={320}
                  series={[{ name: 'Quantity Used', data: topUsedItems.map(([, v]) => v) }]}
                  options={{
                    ...commonOptions,
                    colors: ['#f59e0b'],
                    plotOptions: { bar: { horizontal: true, borderRadius: 6 } },
                    xaxis: { ...commonOptions.xaxis, categories: topUsedItems.map(([k]) => k) },
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
