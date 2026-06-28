'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/layout/Header';
import { PageCard, SelectField, Snackbar, LoadingOverlay } from '@/components/ui/PageComponents';
import { formatDate, formatPriceLE } from '@/lib/utils';

const PAGE_SIZE = 30;

function TransactionCard({ doc }) {
  const date = doc.Date || 'N/A';
  const time = doc.Time || 'N/A';
  const amount = Number(doc.amount) || 0;
  const newStock = Number(doc.newStock) || 0;
  const prevStock = Number(doc.previousStock) || 0;
  const qtyUsed = Number(doc.quantityUsed) || 0;
  const supplier = doc.supplier || 'N/A';
  const usageType = doc.usageType || 'N/A';
  const userName = doc.userName || 'N/A';
  const itemName = doc.itemName || 'N/A';
  const isStockIn = usageType.toLowerCase() === 'in';
  const typeColor = isStockIn ? 'text-green-700' : 'text-red-700';

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <p className="font-bold text-lg text-black">{itemName}</p>
          <p className={`font-medium text-sm ${typeColor}`}>{isStockIn ? 'Stock In' : 'Stock Out'}</p>
        </div>
        <p className="text-xs text-gray-500 whitespace-nowrap">{date} at {time}</p>
      </div>
      <hr className="my-3" />
      <div className="space-y-1 text-sm mb-4">
        <p><span className="font-medium text-black">User:</span> {userName}</p>
        <p><span className="font-medium text-black">Supplier:</span> {supplier}</p>
        <p><span className="font-medium text-black">Amount:</span> {formatPriceLE(amount)}</p>
      </div>
      <div className="flex items-center justify-around text-center">
        <div>
          <p className="text-xl font-bold text-gray-700">{prevStock}</p>
          <p className="text-xs text-gray-600">Previous</p>
        </div>
        <span className="text-gray-400">→</span>
        <div>
          <p className={`text-xl font-bold ${typeColor}`}>{qtyUsed}</p>
          <p className="text-xs text-gray-600">Quantity Used</p>
        </div>
        <span className="text-gray-400">→</span>
        <div>
          <p className="text-xl font-bold text-blue-600">{newStock}</p>
          <p className="text-xs text-gray-600">New Stock</p>
        </div>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const [items, setItems] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [usageType, setUsageType] = useState('');
  const [itemAmounts, setItemAmounts] = useState({});
  const loadedAmountsRef = useRef(new Set());
  const [snack, setSnack] = useState({ message: '', isError: false });

  useEffect(() => {
    return onSnapshot(collection(db, 'Items'), (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const buildQuery = useCallback(() => {
    let q = collection(db, 'Inventory');
    const constraints = [];
    if (selectedItemId) constraints.push(where('itemId', '==', selectedItemId));
    if (startDate) constraints.push(where('Date', '>=', startDate));
    if (endDate) constraints.push(where('Date', '<=', endDate));
    if (usageType) constraints.push(where('usageType', '==', usageType));
    constraints.push(orderBy('Date', 'desc'), orderBy('Time', 'desc'));
    return query(q, ...constraints);
  }, [selectedItemId, startDate, endDate, usageType]);

  const fetchInitial = useCallback(async () => {
    setLoading(true);
    setHasMore(true);
    setLastDoc(null);
    setRecords([]);
    try {
      const snap = await getDocs(query(buildQuery(), limit(PAGE_SIZE)));
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data(), _snap: d }));
      setRecords(docs);
      setHasMore(docs.length >= PAGE_SIZE);
      if (docs.length > 0) setLastDoc(snap.docs[snap.docs.length - 1]);
    } catch (e) {
      setSnack({ message: `Error fetching transactions: ${e.message}`, isError: true });
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  const fetchMore = async () => {
    if (!hasMore || fetchingMore || !lastDoc) return;
    setFetchingMore(true);
    try {
      const snap = await getDocs(query(buildQuery(), startAfter(lastDoc), limit(PAGE_SIZE)));
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data(), _snap: d }));
      setRecords((prev) => [...prev, ...docs]);
      setHasMore(docs.length >= PAGE_SIZE);
      if (docs.length > 0) setLastDoc(snap.docs[snap.docs.length - 1]);
    } catch (e) {
      setSnack({ message: `Error fetching more transactions: ${e.message}`, isError: true });
    } finally {
      setFetchingMore(false);
    }
  };

  const clearFilters = () => {
    setSelectedItemId(null);
    setStartDate('');
    setEndDate('');
    setUsageType('');
  };

  const loadItemAmounts = useCallback(async (itemId) => {
    if (loadedAmountsRef.current.has(itemId)) return;
    loadedAmountsRef.current.add(itemId);

    try {
      const snap = await getDocs(query(collection(db, 'Inventory'), where('itemId', '==', itemId)));
      let inAmount = 0;
      let outAmount = 0;
      snap.docs.forEach((d) => {
        const amount = Number(d.data().amount) || 0;
        const type = (d.data().usageType || '').toLowerCase();
        if (type === 'in') inAmount += amount;
        else if (type === 'out') outAmount += amount;
      });
      setItemAmounts((prev) => ({ ...prev, [itemId]: { in: inAmount, out: outAmount } }));
    } catch {
      setItemAmounts((prev) => ({ ...prev, [itemId]: { in: 0, out: 0 } }));
    }
  }, []);

  useEffect(() => {
    items.forEach((item) => {
      loadItemAmounts(item.id);
    });
  }, [items, loadItemAmounts]);

  const exportCsv = async () => {
    try {
      const snap = await getDocs(buildQuery());
      if (snap.empty) {
        setSnack({ message: 'No data to export for the selected filters.', isError: true });
        return;
      }
      const headers = ['Item Name', 'Type', 'Date', 'Time', 'User', 'Supplier', 'Amount (LE)', 'Previous Stock', 'Quantity Used', 'New Stock'];
      const rows = snap.docs.map((d) => {
        const data = d.data();
        return [
          data.itemName || 'N/A',
          data.usageType || 'N/A',
          data.Date || 'N/A',
          data.Time || 'N/A',
          data.userName || 'N/A',
          data.supplier || 'N/A',
          Number(data.amount) || 0,
          Number(data.previousStock) || 0,
          Number(data.quantityUsed) || 0,
          Number(data.newStock) || 0,
        ];
      });
      const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `InventoryTransactions_${formatDate(new Date())}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setSnack({ message: 'Export downloaded', isError: false });
    } catch (e) {
      setSnack({ message: `Error exporting data: ${e.message}`, isError: true });
    }
  };

  return (
    <>
      <Header />
      <PageCard title="All Transactions" icon="📊">
        <div className="border rounded-lg mb-4">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left font-bold text-black"
          >
            <span>Filters</span>
            <span>{filtersOpen ? '▲' : '▼'}</span>
          </button>
          {filtersOpen && (
            <div className="px-4 pb-4 space-y-4 border-t pt-4">
              <div>
                <p className="text-sm font-semibold text-black mb-2">Filter by Item</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {items.map((item) => {
                    const isSelected = selectedItemId === item.id;
                    const amounts = itemAmounts[item.id];
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItemId(isSelected ? null : item.id)}
                        className={`shrink-0 w-36 p-2 rounded-lg border text-sm ${
                          isSelected ? 'bg-[#d9ae02] text-white border-black' : 'bg-white text-black border-gray-300'
                        }`}
                      >
                        <p className="font-bold truncate">{item.name || 'N/A'}</p>
                        {amounts ? (
                          <>
                            <p className={`text-xs mt-1 ${isSelected ? 'text-white/80' : 'text-green-600'}`}>
                              In: {amounts.in.toFixed(2)}
                            </p>
                            <p className={`text-xs ${isSelected ? 'text-white/80' : 'text-red-600'}`}>
                              Out: {amounts.out.toFixed(2)}
                            </p>
                          </>
                        ) : (
                          <p className={`text-xs mt-1 ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>Loading...</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-black"
                  />
                </div>
              </div>

              <SelectField
                label="Transaction Type"
                value={usageType}
                onChange={(v) => setUsageType(v || '')}
                options={['In', 'Out']}
                placeholder="All"
              />

              <div className="flex flex-wrap gap-2 justify-end">
                <button type="button" onClick={clearFilters} className="px-4 py-2 text-red-600">
                  Clear All
                </button>
                <button type="button" onClick={exportCsv} className="px-4 py-2 bg-teal-600 text-white rounded-md">
                  Export
                </button>
                <button type="button" onClick={fetchInitial} className="px-4 py-2 bg-black text-[#d9ae02] rounded-md">
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-gray-600 text-center py-8">Loading transactions...</p>
        ) : records.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No transactions found for the selected filters.</p>
        ) : (
          <div className="space-y-3">
            {records.map((rec) => (
              <TransactionCard key={rec.id} doc={rec} />
            ))}
            {hasMore && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={fetchMore}
                  disabled={fetchingMore}
                  className="px-4 py-2 text-[#d9ae02] font-medium"
                >
                  {fetchingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </PageCard>

      <LoadingOverlay show={loading && records.length === 0} />
      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: '', isError: false })} />
    </>
  );
}
