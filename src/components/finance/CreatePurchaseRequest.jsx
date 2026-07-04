"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatPriceLE, formatTime } from "@/lib/utils";
import Header from "@/components/layout/Header";
import {
  PageCard,
  TextField,
  SelectField,
  Snackbar,
  LoadingOverlay,
} from "@/components/ui/PageComponents";

export default function CreatePurchaseRequest() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [assignedUserName, setAssignedUserName] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ message: "", isError: false });

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, "Items")),
      getDocs(collection(db, "Suppliers")),
      getDocs(collection(db, "Users")),
    ]).then(([itemsSnap, supSnap, usersSnap]) => {
      setItems(itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setSuppliers(supSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const total = useMemo(
    () => selectedItems.reduce((s, i) => s + i.price * i.quantity, 0),
    [selectedItems],
  );

  const addItem = (item) => {
    setSelectedItems((prev) => {
      const idx = prev.findIndex((i) => i.itemId === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          itemId: item.id,
          name: item.name,
          price: Number(item.price) || 0,
          quantity: 1,
        },
      ];
    });
  };

  const updateItemQuantity = (itemId, quantity) => {
    const parsed = Math.max(1, Number(quantity) || 1);
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.itemId === itemId ? { ...item, quantity: parsed } : item,
      ),
    );
  };

  const changeItemQuantityBy = (itemId, delta) => {
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.itemId !== itemId) return item;
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }),
    );
  };

  const updateItemPrice = (itemId, price) => {
    const parsed = Math.max(0, Number(price) || 0);
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.itemId === itemId ? { ...item, price: parsed } : item,
      ),
    );
  };

  const submit = async () => {
    if (selectedItems.length === 0 || !supplierId || !assignedUserId) {
      setSnack({
        message: "Select items, supplier, and assigned user",
        isError: true,
      });
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      await addDoc(collection(db, "PurchaseRequests"), {
        date: formatDate(now),
        time: formatTime(now),
        note: note.trim(),
        status: "Hold",
        createdById: user.uid,
        createdByName: user.name,
        assignedUserId,
        assignedUserName,
        supplierId,
        supplierName,
        items: selectedItems.map((e) => ({
          itemId: e.itemId,
          name: e.name,
          price: e.price,
          quantity: e.quantity,
        })),
        total,
        branch: user.branch || "New cairo",
      });
      setSnack({ message: "Purchase request created", isError: false });
      setSelectedItems([]);
      setSupplierId("");
      setSupplierName("");
      setAssignedUserId("");
      setAssignedUserName("");
      setNote("");
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Create Purchase Request" />
      <PageCard title="Request Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <SelectField
            label="Supplier"
            value={supplierName}
            onChange={(v) => {
              const s = suppliers.find((x) => x.name === v);
              setSupplierName(v);
              setSupplierId(s?.id || "");
            }}
            options={suppliers.map((s) => s.name)}
          />
          <SelectField
            label="Assign To"
            value={assignedUserName}
            onChange={(v) => {
              const u = users.find((x) => x.name === v);
              setAssignedUserName(v);
              setAssignedUserId(u?.id || "");
            }}
            options={users.map((u) => u.name)}
          />
          <TextField
            label="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required={false}
            className="md:col-span-2"
            maxLines={2}
          />
        </div>
      </PageCard>

      <PageCard title="Items">
        <div className="flex flex-wrap gap-2 mb-4">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => addItem(item)}
              className="px-3 py-1.5 bg-muted rounded-lg text-sm text-foreground"
            >
              {item.name} — {formatPriceLE(item.price)}
            </button>
          ))}
        </div>
        {selectedItems.map((item) => (
          <div
            key={item.itemId}
            className="flex flex-col gap-3 border rounded-lg p-3 mb-2 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="font-medium text-foreground">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                Line total: {formatPriceLE(item.price * item.quantity)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => changeItemQuantityBy(item.itemId, -1)}
                className="h-8 w-8 rounded-md border border-input text-foreground"
                aria-label={`Decrease quantity for ${item.name}`}
              >
                -
              </button>
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => updateItemQuantity(item.itemId, e.target.value)}
                className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm"
                aria-label={`Quantity for ${item.name}`}
              />
              <button
                type="button"
                onClick={() => changeItemQuantityBy(item.itemId, 1)}
                className="h-8 w-8 rounded-md border border-input text-foreground"
                aria-label={`Increase quantity for ${item.name}`}
              >
                +
              </button>

              <input
                type="number"
                min="0"
                step="0.01"
                value={item.price}
                onChange={(e) => updateItemPrice(item.itemId, e.target.value)}
                className="h-8 w-28 rounded-md border border-input bg-background px-2 text-sm"
                aria-label={`Price for ${item.name}`}
              />
              <span className="text-xs text-muted-foreground">LE</span>
            </div>
          </div>
        ))}
        <p className="text-sm mt-2">
          Estimated total: <strong>{formatPriceLE(total)}</strong>
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground rounded-md"
        >
          Submit Request
        </button>
      </PageCard>
      <LoadingOverlay show={loading} />
      <Snackbar
        message={snack.message}
        isError={snack.isError}
        onClose={() => setSnack({ message: "", isError: false })}
      />
    </>
  );
}
