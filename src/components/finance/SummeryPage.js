'use client';

import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate, formatPriceLE } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { PageCard, Snackbar } from '@/components/ui/PageComponents';
import { buildFinancialTree } from './finance-helpers';

function TreeNode({ node, level = 0, expanded, toggle }) {
  const hasChildren = node.children?.length > 0;
  const isOpen = expanded.has(node.id);
  const colors = {
    income: 'border-green-200 bg-green-50',
    expense: 'border-red-200 bg-red-50',
    balance: 'border-blue-200 bg-blue-50',
  };

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => hasChildren && toggle(node.id)}
        className={`w-full text-left p-4 rounded-xl border ${colors[node.type] || 'border-gray-200 bg-white'}`}
        style={{ marginLeft: level * 16 }}
      >
        <div className="flex justify-between items-start gap-3">
          <div>
            <p className="font-semibold text-black">{hasChildren ? (isOpen ? '▼' : '▶') : '•'} {node.title}</p>
            <p className="text-sm text-gray-600">{node.subtitle}</p>
            {node.metadata && Object.keys(node.metadata).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(node.metadata).map(([k, v]) => (
                  <span key={k} className="text-xs bg-white/70 px-2 py-0.5 rounded">{k}: {v}</span>
                ))}
              </div>
            )}
          </div>
          {node.amount > 0 && <p className="font-bold text-black whitespace-nowrap">{formatPriceLE(node.amount)}</p>}
        </div>
      </button>
      {isOpen && hasChildren && node.children.map((child) => (
        <TreeNode key={child.id} node={child} level={level + 1} expanded={expanded} toggle={toggle} />
      ))}
    </div>
  );
}

export default function SummeryPage() {
  const [branches, setBranches] = useState(['All Branches']);
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [treeData, setTreeData] = useState(null);
  const [expanded, setExpanded] = useState(new Set(['root', 'profit', 'income', 'expenses']));
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [logsSnap, notifSnap, assetsSnap, allLogsSnap] = await Promise.all([
        getDocs(query(collection(db, 'Logs'), where('section', '==', 'Finance'))),
        getDocs(query(collection(db, 'Notifications'), where('collectionName', '==', 'Finance'))),
        getDocs(collection(db, 'Assets')),
        getDocs(collection(db, 'Logs')),
      ]);

      const branchSet = new Set();
      allLogsSnap.docs.forEach((d) => {
        const b = d.data().branch;
        if (b) branchSet.add(b);
      });
      setBranches(['All Branches', ...[...branchSet].sort()]);

      const logs = logsSnap.docs.map((d) => d.data());
      const notifications = notifSnap.docs.map((d) => d.data());
      const assets = assetsSnap.docs.map((d) => d.data());

      const tree = buildFinancialTree(logs, notifications, assets, {
        selectedBranch,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      });
      setTreeData(tree);
      setExpanded(new Set(['root', 'profit', 'income', 'expenses', 'remaining_payments', 'payments_due', 'assets']));
    } catch (e) {
      setSnack(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const marginPct = treeData && treeData.totalIncome > 0
    ? ((treeData.netProfit / treeData.totalIncome) * 100).toFixed(1)
    : '0.0';

  return (
    <>
      <Header title="Financial Summary" />
      <PageCard title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-600">Branch</label>
            <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md text-black">
              {branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md text-black" />
          </div>
          <div>
            <label className="text-sm text-gray-600">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md text-black" />
          </div>
        </div>
        <button type="button" onClick={load} className="mt-4 px-4 py-2 bg-black text-[#c3a28e] rounded-md text-sm">Refresh</button>
      </PageCard>

      {loading && <p className="text-center py-8">Loading financial data...</p>}

      {treeData && !loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            {[
              ['Total Income', treeData.totalIncome, 'text-green-600'],
              ['Total Expenses', treeData.totalExpenses, 'text-red-600'],
              ['Net Profit', treeData.netProfit, 'text-blue-600'],
              ['Profit Margin', `${marginPct}%`, 'text-purple-600'],
            ].map(([title, val, cls]) => (
              <div key={title} className="bg-white rounded-2xl border p-5 shadow-sm">
                <p className="text-sm text-gray-500">{title}</p>
                <p className={`text-2xl font-bold mt-1 ${cls}`}>
                  {typeof val === 'number' ? formatPriceLE(val) : val}
                </p>
              </div>
            ))}
          </div>
          <PageCard title={`Financial Tree — ${treeData.period}`}>
            <TreeNode node={treeData.root} expanded={expanded} toggle={toggle} />
          </PageCard>
        </>
      )}
      <Snackbar message={snack} isError onClose={() => setSnack('')} />
    </>
  );
}
