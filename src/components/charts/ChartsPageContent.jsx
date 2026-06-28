'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useTheme } from 'next-themes';
import Header from '@/components/layout/Header';
import Chart from '@/components/ui/Chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPriceLE } from '@/lib/utils';

function groupSum(docs, keyField, valueField = 'paidAmount') {
  const map = {};
  docs.forEach((d) => {
    const key = d[keyField] || 'Unknown';
    map[key] = (map[key] || 0) + (Number(d[valueField]) || 0);
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

export default function ChartsPageContent() {
  const [tab, setTab] = useState('Income');
  const [incomeData, setIncomeData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    getDocs(query(collection(db, 'Finance'), where('type', '==', 'Invoice'))).then((snap) => {
      setIncomeData(groupSum(snap.docs.map((d) => d.data()), 'drName'));
    });
    Promise.all([
      getDocs(query(collection(db, 'Finance'), where('type', '==', 'Salary'))),
      getDocs(query(collection(db, 'Finance'), where('type', '==', 'Loan'))),
    ]).then(([salary, loan]) => {
      const combined = [...salary.docs, ...loan.docs].map((d) => d.data());
      setExpenseData(groupSum(combined, 'name'));
    });
    getDocs(collection(db, 'Inventory')).then((snap) => {
      setInventoryData(groupSum(snap.docs.map((d) => d.data()), 'category', 'amount'));
    });
  }, []);

  const tabs = ['Income', 'Expenses', 'Inventory'];
  const data = tab === 'Income' ? incomeData : tab === 'Expenses' ? expenseData : inventoryData;
  const top10 = data.slice(0, 10);
  const labels = top10.map(([l]) => l);
  const values = top10.map(([, v]) => v);
  const total = values.reduce((s, v) => s + v, 0);

  const themeColors = {
    text: isDark ? '#e5e7eb' : '#374151',
    grid: isDark ? '#1f2937' : '#e5e7eb',
    bg: isDark ? '#0f1117' : '#ffffff',
  };

  const barOptions = {
    chart: { type: 'bar', toolbar: { show: false }, background: 'transparent', fontFamily: 'inherit' },
    plotOptions: { bar: { borderRadius: 6, horizontal: false, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: labels, labels: { style: { colors: themeColors.text, fontSize: '11px' }, rotate: -45, rotateAlways: labels.length > 5 } },
    yaxis: { labels: { style: { colors: themeColors.text }, formatter: (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0) } },
    grid: { borderColor: themeColors.grid, strokeDashArray: 4 },
    colors: ['#c2a18c'],
    tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (v) => formatPriceLE(v) } },
    theme: { mode: isDark ? 'dark' : 'light' },
  };

  const donutOptions = {
    chart: { type: 'donut', background: 'transparent', fontFamily: 'inherit' },
    labels,
    colors: ['#c2a18c', '#30394d', '#6b8f71', '#e8927c', '#7c9eb2', '#d4a574', '#8b7ec8', '#5ba08e', '#cc6b8e', '#a0845c'],
    legend: { position: 'bottom', labels: { colors: themeColors.text }, fontSize: '12px' },
    dataLabels: { enabled: true, formatter: (val) => `${val.toFixed(1)}%` },
    tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (v) => formatPriceLE(v) } },
    stroke: { width: 2, colors: [themeColors.bg] },
    plotOptions: { pie: { donut: { size: '55%', labels: { show: true, total: { show: true, label: 'Total', formatter: () => formatPriceLE(total) }, value: { color: themeColors.text } } } } },
    theme: { mode: isDark ? 'dark' : 'light' },
  };

  return (
    <>
      <Header title="Charts" />

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <Button key={t} variant={tab === t ? 'default' : 'outline'} size="sm" onClick={() => setTab(t)}>
            {t}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        {/* Bar Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>{tab} by {tab === 'Inventory' ? 'Category' : 'Name'}</CardTitle>
            <CardDescription>Top 10 entries — bar chart</CardDescription>
          </CardHeader>
          <CardContent>
            {values.length > 0 ? (
              <Chart type="bar" series={[{ name: tab, data: values }]} options={barOptions} height={350} />
            ) : (
              <div className="flex items-center justify-center h-[350px] text-muted-foreground text-sm">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Donut Chart */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{tab} Distribution</CardTitle>
            <CardDescription>Proportion breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {values.length > 0 ? (
              <Chart type="donut" series={values} options={donutOptions} height={350} />
            ) : (
              <div className="flex items-center justify-center h-[350px] text-muted-foreground text-sm">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{tab} Breakdown</CardTitle>
          <CardDescription>{data.length} entries total</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {top10.map(([label, value]) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <div className="flex-1 min-w-0 truncate text-foreground">{label}</div>
                <div className="w-24 sm:w-32 bg-muted rounded-full h-2 overflow-hidden shrink-0">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(value / (total || 1)) * 100}%` }} />
                </div>
                <span className="w-20 text-right font-medium text-muted-foreground shrink-0">{formatPriceLE(value)}</span>
              </div>
            ))}
            {data.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">No data available</div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
