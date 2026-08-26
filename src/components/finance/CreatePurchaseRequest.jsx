"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatPriceLE, formatTime } from "@/lib/utils";
import { itemBelongsToSupplier } from "@/lib/item-suppliers";
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
  const [itemQuery, setItemQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
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

  const supplierItems = useMemo(() => {
    if (!supplierName) return [];
    return items.filter((item) => itemBelongsToSupplier(item, supplierName));
  }, [items, supplierName]);

  const suggestions = useMemo(() => {
    const q = itemQuery.trim().toLowerCase();
    const available = supplierItems.filter(
      (item) => !selectedItems.some((selected) => selected.itemId === item.id),
    );
    if (!q) return available.slice(0, 10);
    return available
      .filter((item) => (item.name || "").toLowerCase().includes(q))
      .slice(0, 10);
  }, [supplierItems, itemQuery, selectedItems]);

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
    setItemQuery("");
    setShowSuggestions(false);
  };

  const removeItem = (itemId) => {
    setSelectedItems((prev) => prev.filter((item) => item.itemId !== itemId));
  };

  const selectSupplier = (name) => {
    const s = suppliers.find((x) => x.name === name);
    setSupplierName(name);
    setSupplierId(s?.id || "");
    setSelectedItems((prev) =>
      prev.filter((selected) =>
        itemBelongsToSupplier(
          items.find((item) => item.id === selected.itemId) || selected,
          name,
        ),
      ),
    );
    setItemQuery("");
    setShowSuggestions(false);
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
      setItemQuery("");
      setShowSuggestions(false);
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
            onChange={(v) => selectSupplier(v)}
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
        <div className="relative mb-4">
          <div className="space-y-1.5">
            <label className="block text-sm text-muted-foreground">Search items</label>
            <input
              type="text"
              value={itemQuery}
              disabled={!supplierName}
              placeholder={supplierName ? "Type to find an item" : "Select a supplier first"}
              onFocus={() => {
                if (supplierName) setShowSuggestions(true);
              }}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 120);
              }}
              onChange={(e) => {
                setItemQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (suggestions[0]) addItem(suggestions[0]);
                }
              }}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          {!supplierName && (
            <p className="mt-1 text-xs text-muted-foreground">
              Select a supplier first to search their items.
            </p>
          )}
          {supplierName && showSuggestions && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {suggestions.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  {itemQuery.trim()
                    ? "No matching items for this supplier."
                    : "No items belong to this supplier."}
                </p>
              ) : (
                suggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addItem(item);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                  >
                    <span>{item.name}</span>
                    <span className="text-muted-foreground">{formatPriceLE(item.price)}</span>
                  </button>
                ))
              )}
            </div>
          )}
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
              <button
                type="button"
                onClick={() => removeItem(item.itemId)}
                className="h-8 rounded-md border border-input px-2 text-sm text-destructive"
              >
                Remove
              </button>
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
