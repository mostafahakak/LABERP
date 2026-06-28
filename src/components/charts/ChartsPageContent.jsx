'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/layout/Header';
import { PageCard } from '@/components/ui/PageComponents';
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
    <div className="border rounded-xl p-4 bg-white">
      <h4 className="font-bold text-black mb-3">{title}</h4>
      <div className="space-y-2">
        {rows.slice(0, 10).map(([label, value]) => (
          <div key={label} className="flex items-center gap-2 text-sm text-black">
            <div className="flex-1 truncate">{label}</div>
            <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-[#c3a28e]" style={{ width: `${(value / total) * 100}%` }} />
            </div>
            <span className="w-20 text-right">{formatPriceLE(value)}</span>
          </div>
        ))}
      </div>
    </div>
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
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-black text-[#c3a28e]' : 'border text-black'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <PieTable title={`${tab} breakdown`} rows={data} />
      </PageCard>
    </>
  );
}
