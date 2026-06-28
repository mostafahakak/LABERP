'use client';

import Link from 'next/link';
import { formatPriceLE } from '@/lib/utils';

export default function FinanceDocCard({ doc, linkable = true }) {
  const type = doc.type || 'Unknown Type';
  const name = doc.name || 'Unknown';
  const date = doc.Date || '';
  const time = doc.Time || '';
  const bank = doc.bank || 'N/A';
  const paidAmount = Number(doc.paidAmount) || 0;
  const totalAmount = Number(doc.total) || 0;
  const remainingAmount = Number(doc.remainingAmount) || 0;
  const status = doc.status || 'N/A';
  const paymentPlan = doc.paymentPlan || 'N/A';
  const counterpartyName =
    type === 'Invoice' ? doc.drName || 'N/A' : doc.supplierName || doc.drName || 'N/A';

  const statusColor = status === 'Paid' ? 'text-green-600 bg-green-50' : 'text-destructive bg-destructive/10';
  const typeColor = type === 'Invoice' ? 'text-blue-600 bg-blue-50' : 'text-purple-600 bg-purple-50';
  const logType = type === 'Invoice' ? 'Income' : 'Expense';
  const href = `/dashboard/finance/invoices/${doc.id}?type=${logType}`;

  const inner = (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${typeColor}`}>
          <span className="text-xl">{type === 'Invoice' ? '🧾' : '🛒'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`font-bold ${typeColor.split(' ')[0]}`}>{type}</p>
            <span className={`text-xs font-semibold px-2 py-1 rounded ${statusColor}`}>{status}</span>
          </div>
          <p className="text-foreground font-medium truncate">{name}</p>
          <p className="text-sm text-muted-foreground">{date} at {time}</p>
          {counterpartyName !== 'N/A' && (
            <p className="text-sm text-muted-foreground mt-1">
              {type === 'Invoice' ? 'Doctor' : 'Supplier'}: {counterpartyName}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t">
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-bold text-foreground">{formatPriceLE(totalAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="font-semibold text-green-600">{formatPriceLE(paidAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className="font-semibold text-destructive">{formatPriceLE(remainingAmount)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
        <span>Payment: {bank}</span>
        <span>{paymentPlan}</span>
      </div>
      {linkable && (
        <span className="mt-4 block w-full text-center py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
          View Details
        </span>
      )}
    </div>
  );

  if (!linkable) return inner;
  return <Link href={href} className="block">{inner}</Link>;
}
