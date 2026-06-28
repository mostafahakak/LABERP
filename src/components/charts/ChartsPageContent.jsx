'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/layout/Header';
import { PageCard } from '@/components/ui/PageComponents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

function PieTable({ title, rows }) {
  const total = rows.reduce((s, [, v]) => s + v, 0) || 1;
  return (
    <Card className="shadow-none border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.slice(0, 10).map(([label, value]) => (
          <div key={label} className="flex items-center gap-3 text-sm">
            <div className="flex-1 truncate text-foreground">{label}</div>
            <div className="w-28 bg-muted rounded-full h-2 overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(value / total) * 100}%` }} />
            </div>
            <span className="w-20 text-right font-medium text-muted-foreground">{formatPriceLE(value)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function ChartsPageContent() {
  const [tab, setTab] = useState('Income');
  const [incomeData, setIncomeData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);

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

  return (
    <>
      <Header />
      <PageCard title="Charts" icon="📈">
        <div className="flex gap-2 mb-6">
          {tabs.map((t) => (
            <Button
              key={t}
              variant={tab === t ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTab(t)}
            >
              {t}
            </Button>
          ))}
        </div>
        <PieTable title={`${tab} breakdown`} rows={data} />
      </PageCard>
    </>
  );
}
