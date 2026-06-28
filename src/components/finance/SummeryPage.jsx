'use client';

import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatPriceLE } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { Snackbar } from '@/components/ui/PageComponents';
import { buildFinancialTree } from './finance-helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { TrendingUp, TrendingDown, DollarSign, Percent, ChevronRight, RefreshCw } from 'lucide-react';

function TreeNode({ node, level = 0, expanded, toggle }) {
  const hasChildren = node.children?.length > 0;
  const isOpen = expanded.has(node.id);

  return (
    <div className={level > 0 ? 'ml-4 border-l border-border/50 pl-3' : ''}>
      <Collapsible open={isOpen} onOpenChange={() => hasChildren && toggle(node.id)}>
        <CollapsibleTrigger className="w-full" disabled={!hasChildren}>
          <div className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors group">
            <div className="flex items-center gap-2 min-w-0">
              {hasChildren && (
                <ChevronRight className={`size-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              )}
              {!hasChildren && <div className="size-1.5 rounded-full bg-muted-foreground/40 shrink-0 ml-1 mr-0.5" />}
              <div className="text-left min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{node.title}</p>
                {node.subtitle && <p className="text-xs text-muted-foreground truncate">{node.subtitle}</p>}
              </div>
            </div>
            {node.amount > 0 && (
              <span className="font-semibold text-sm text-foreground whitespace-nowrap shrink-0">
                {formatPriceLE(node.amount)}
              </span>
            )}
          </div>
        </CollapsibleTrigger>
        {hasChildren && (
          <CollapsibleContent>
            {node.children.map((child) => (
              <TreeNode key={child.id} node={child} level={level + 1} expanded={expanded} toggle={toggle} />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
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

      {/* Filters */}
      <Card className="mb-5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <Button onClick={load} disabled={loading} className="mt-4 gap-1.5">
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </CardContent>
      </Card>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-28" /></CardContent>
            </Card>
          ))}
        </div>
      )}

      {treeData && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
                <TrendingUp className="size-4 text-emerald-500" />
              </CardHeader>
              <CardContent><p className="text-2xl font-bold text-emerald-600">{formatPriceLE(treeData.totalIncome)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
                <TrendingDown className="size-4 text-destructive" />
              </CardHeader>
              <CardContent><p className="text-2xl font-bold text-destructive">{formatPriceLE(treeData.totalExpenses)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
                <DollarSign className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${treeData.netProfit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {formatPriceLE(treeData.netProfit)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Profit Margin</CardTitle>
                <Percent className="size-4 text-primary" />
              </CardHeader>
              <CardContent><p className="text-2xl font-bold text-primary">{marginPct}%</p></CardContent>
            </Card>
          </div>

          {/* Financial Tree */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Tree — {treeData.period}</CardTitle>
            </CardHeader>
            <CardContent>
              <TreeNode node={treeData.root} expanded={expanded} toggle={toggle} />
            </CardContent>
          </Card>
        </>
      )}
      <Snackbar message={snack} isError onClose={() => setSnack('')} />
    </>
  );
}
