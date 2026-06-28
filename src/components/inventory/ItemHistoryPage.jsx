'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/layout/Header';
import { PageCard } from '@/components/ui/PageComponents';
import { formatPriceLE } from '@/lib/utils';

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
  const isStockIn = usageType.toLowerCase() === 'in';
  const typeColor = isStockIn ? 'text-green-700' : 'text-red-700';

  return (
    <div className="border rounded-lg p-4 bg-card shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className={`font-bold text-lg ${typeColor}`}>
            {isStockIn ? '↑ Stock In' : '↓ Stock Out'}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">{date} at {time}</p>
      </div>
      <hr className="mb-3" />
      <div className="space-y-1 text-sm mb-4">
        <p><span className="font-medium text-foreground">User:</span> {userName}</p>
        <p><span className="font-medium text-foreground">Supplier:</span> {supplier}</p>
        <p><span className="font-medium text-foreground">Amount:</span> {formatPriceLE(amount)}</p>
      </div>
      <div className="flex items-center justify-around text-center">
        <div>
          <p className="text-xl font-bold text-foreground/80">{prevStock}</p>
          <p className="text-xs text-muted-foreground">Previous</p>
        </div>
        <span className="text-muted-foreground/70">→</span>
        <div>
          <p className={`text-xl font-bold ${typeColor}`}>{qtyUsed}</p>
          <p className="text-xs text-muted-foreground">Quantity Used</p>
        </div>
        <span className="text-muted-foreground/70">→</span>
        <div>
          <p className="text-xl font-bold text-blue-600">{newStock}</p>
          <p className="text-xs text-muted-foreground">New Stock</p>
        </div>
      </div>
    </div>
  );
}

export default function ItemHistoryPage({ itemId, itemName }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!itemId) return undefined;
    const q = query(
      collection(db, 'Inventory'),
      where('itemId', '==', itemId),
      orderBy('Date', 'desc'),
      orderBy('Time', 'desc')
    );
    return onSnapshot(
      q,
      (snap) => {
        setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
  }, [itemId]);

  return (
    <>
      <Header />
      <PageCard title={`Item History: ${itemName || itemId}`} icon="📋">
        {loading && <p className="text-muted-foreground text-center py-8">Loading history...</p>}
        {error && <p className="text-destructive text-center py-8">Error loading history: {error}</p>}
        {!loading && !error && records.length === 0 && (
          <p className="text-muted-foreground text-center py-8">No history found for this item.</p>
        )}
        {!loading && !error && records.length > 0 && (
          <div className="space-y-3">
            {records.map((rec) => (
              <TransactionCard key={rec.id} doc={rec} />
            ))}
          </div>
        )}
      </PageCard>
    </>
  );
}
