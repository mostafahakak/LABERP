"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { formatPriceLE } from "@/lib/utils";
import Header from "@/components/layout/Header";
import {
  PageCard,
  SelectField,
  Snackbar,
  LoadingOverlay,
} from "@/components/ui/PageComponents";
import {
  createPurchaseInvoice,
  fetchBanksAndDRAccounts,
} from "./finance-helpers";

const PR_STATUSES = ["Hold", "Ordered", "Pending", "Delivered", "Expired"];

function DeliverDialog({ request, onClose, onDone }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [bankName, setBankName] = useState("");
  const [isFullPayment, setIsFullPayment] = useState(true);
  const [paidAmount, setPaidAmount] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const items = request.items || [];
  const total =
    Number(request.total) ||
    items.reduce(
      (s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0),
      0,
    );
  const paidVal = isFullPayment ? total : parseFloat(paidAmount) || 0;

  useEffect(() => {
    fetchBanksAndDRAccounts().then(setAccounts);
    if (isFullPayment) setPaidAmount(total.toFixed(2));
  }, [isFullPayment, total]);

  const confirm = async () => {
    if (!bankName) {
      setError("Select payment method");
      return;
    }
    const account = accounts.find((a) => a.name === bankName);
    if (!account) return;
    if (account.sourceCollection !== "Users" && account.balance < paidVal) {
      setError("Insufficient balance");
      return;
    }
    setLoading(true);
    try {
      const supplierSnap = await getDoc(
        doc(db, "Suppliers", request.supplierId),
      );
      const supplierBalanceBefore = Number(supplierSnap.data()?.balance) || 0;
      const purchaseItems = items.map((i) => ({
        itemId: i.itemId,
        id: i.itemId,
        name: i.name,
        price: Number(i.price) || 0,
        quantity: Number(i.quantity) || 0,
        previousStock: 0,
      }));
      await createPurchaseInvoice({
        user,
        supplierId: request.supplierId,
        supplierName: request.supplierName,
        supplierBalanceBefore,
        selectedAccount: account,
        items: purchaseItems,
        total,
        paidAmount: paidVal,
        isFullPayment,
        note: request.note || "",
        date: request.date,
        time: request.time,
      });
      await updateDoc(doc(db, "PurchaseRequests", request.id), {
        status: "Delivered",
      });
      onDone("Request delivered and purchase invoice created");
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-xl p-6 max-w-md w-full">
        <h3 className="font-bold text-foreground mb-2">
          Deliver Purchase Request
        </h3>
        <p className="text-primary font-semibold mb-4">
          Total: {formatPriceLE(total)}
        </p>
        <select
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-foreground mb-3"
        >
          <option value="">Payment Method / DR Account</option>
          {accounts.map((a) => (
            <option key={`${a.sourceCollection}-${a.id}`} value={a.name}>
              {a.name} ({formatPriceLE(a.balance)})
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-foreground mb-2">
          <input
            type="checkbox"
            checked={isFullPayment}
            onChange={(e) => setIsFullPayment(e.target.checked)}
          />
          Full Payment
        </label>
        {!isFullPayment && (
          <input
            type="number"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            placeholder="Paid Amount"
            className="w-full px-3 py-2 border rounded-md text-foreground mb-2"
          />
        )}
        {error && <p className="text-destructive text-sm mb-2">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-md"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded-md"
          >
            {loading ? "Processing..." : "Confirm Delivery"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ViewPurchaseRequests() {
  const { user } = useAuth();
  const isAdmin = user?.type !== "HR" && user?.type !== "Sales";
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [deliverRequest, setDeliverRequest] = useState(null);
  const [snack, setSnack] = useState({ message: "", isError: false });

  useEffect(() => {
    const constraints = [orderBy("date", "desc"), orderBy("time", "desc")];
    if (!isAdmin && user?.uid)
      constraints.unshift(where("assignedUserId", "==", user.uid));
    if (statusFilter) constraints.unshift(where("status", "==", statusFilter));
    const q = query(collection(db, "PurchaseRequests"), ...constraints);
    return onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [isAdmin, user?.uid, statusFilter]);

  const markOrdered = async (id) => {
    try {
      await updateDoc(doc(db, "PurchaseRequests", id), { status: "Ordered" });
      setSnack({ message: "Marked as Ordered", isError: false });
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    }
  };

  const changeStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "PurchaseRequests", id), { status: newStatus });
      setSnack({ message: `Status changed to ${newStatus}`, isError: false });
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    }
  };

  const statusColor = (status) => {
    if (status === "Hold") return "text-gray-600 bg-gray-100";
    if (status === "Requested" || status === "Pending")
      return "text-orange-600 bg-orange-50";
    if (status === "Ordered") return "text-blue-600 bg-blue-50";
    if (status === "Delivered") return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10";
    if (status === "Expired") return "text-red-600 dark:text-red-400 bg-red-500/10";
    return "text-muted-foreground bg-muted";
  };

  return (
    <>
      <Header
        title={isAdmin ? "All Purchase Requests" : "My Purchase Requests"}
      />
      <div className="mb-4 max-w-xs">
        <SelectField
          label="Filter by Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={PR_STATUSES}
          placeholder="All"
        />
      </div>
      {requests.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No requests found.
        </p>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <PageCard
              key={r.id}
              title={`Request #${r.id.substring(0, 8)}`}
              action={
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded ${statusColor(r.status)}`}
                >
                  {r.status}
                </span>
              }
            >
              <p className="text-sm text-foreground">
                Supplier: {r.supplierName}
              </p>
              {r.total > 0 && (
                <p className="text-sm text-muted-foreground">
                  Estimated: {formatPriceLE(r.total)}
                </p>
              )}
              <p className="text-sm text-foreground/80 mt-1">
                {r.note || "No details"}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {r.createdByName} · {r.date} {r.time}
              </p>
              {(r.items || []).length > 0 && (
                <ul className="mt-2 text-sm text-muted-foreground list-disc pl-5">
                  {r.items.map((i) => (
                    <li key={i.itemId}>
                      {i.name} x{i.quantity}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2 flex-wrap justify-end mt-3">
                {r.status === "Hold" && (
                  <button
                    type="button"
                    onClick={() => changeStatus(r.id, "Ordered")}
                    className="px-3 py-1.5 border rounded-md text-sm"
                  >
                    Mark as Ordered
                  </button>
                )}
                {r.status === "Requested" && (
                  <>
                    <button
                      type="button"
                      onClick={() => changeStatus(r.id, "Hold")}
                      className="px-3 py-1.5 border rounded-md text-sm text-gray-600"
                    >
                      Hold
                    </button>
                    <button
                      type="button"
                      onClick={() => markOrdered(r.id)}
                      className="px-3 py-1.5 border rounded-md text-sm"
                    >
                      Mark as Ordered
                    </button>
                  </>
                )}
                {r.status === "Ordered" && (
                  <button
                    type="button"
                    onClick={() => changeStatus(r.id, "Pending")}
                    className="px-3 py-1.5 border rounded-md text-sm"
                  >
                    Mark as Pending
                  </button>
                )}
                {(r.status === "Pending" || r.status === "Ordered") && (
                  <button
                    type="button"
                    onClick={() => setDeliverRequest(r)}
                    className="px-3 py-1.5 bg-primary text-white rounded-md text-sm"
                  >
                    Deliver
                  </button>
                )}
                {(r.status === "Pending" || r.status === "Hold") && (
                  <button
                    type="button"
                    onClick={() => changeStatus(r.id, "Expired")}
                    className="px-3 py-1.5 border border-red-300 text-red-600 rounded-md text-sm"
                  >
                    Expired
                  </button>
                )}
              </div>
            </PageCard>
          ))}
        </div>
      )}
      {deliverRequest && (
        <DeliverDialog
          request={deliverRequest}
          onClose={() => setDeliverRequest(null)}
          onDone={(m) => setSnack({ message: m, isError: false })}
        />
      )}
      <Snackbar
        message={snack.message}
        isError={snack.isError}
        onClose={() => setSnack({ message: "", isError: false })}
      />
    </>
  );
}
