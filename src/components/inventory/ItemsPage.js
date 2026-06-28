'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/layout/Header';
import {
  PageCard,
  TextField,
  SelectField,
  Snackbar,
  LoadingOverlay,
} from '@/components/ui/PageComponents';

const STOCK_FILTERS = ['All', 'Low stock only', 'Above low stock'];

function ItemDialog({ mode, item, categories, suppliers, onClose, onSave, onDelete, saving }) {
  const isEditing = mode === 'edit';
  const [name, setName] = useState(item?.name || '');
  const [price, setPrice] = useState(item?.price?.toString() || '');
  const [lowStock, setLowStock] = useState(item?.lowStock?.toString() || '');
  const [barcode, setBarcode] = useState(item?.barcode || item?.id || '');
  const [grams, setGrams] = useState(item?.grams?.toString() || '');
  const [category, setCategory] = useState(item?.category || null);
  const [supplier, setSupplier] = useState(item?.supplier || null);

  const catOptions = useMemo(() => {
    const list = [...categories];
    if (category && !list.includes(category)) list.push(category);
    return list.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [categories, category]);

  const supOptions = useMemo(() => {
    const list = [...suppliers];
    if (supplier && !list.includes(supplier)) list.push(supplier);
    return list.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [suppliers, supplier]);

  const handleSubmit = () => {
    if (!barcode.trim()) return;
    if (!category || !supplier) return;
    if (!name.trim()) return;
    const priceNum = parseFloat(price);
    if (!priceNum || priceNum <= 0) return;
    const lowStockNum = parseInt(lowStock, 10);
    if (Number.isNaN(lowStockNum) || lowStockNum < 0) return;
    if (category === 'Powder' && grams && (Number.isNaN(parseFloat(grams)) || parseFloat(grams) <= 0)) return;

    const data = {
      name: name.trim(),
      price: priceNum,
      category,
      supplier,
      lowStock: lowStockNum,
      barcode: barcode.trim(),
    };
    if (category === 'Powder' && grams.trim()) {
      data.grams = parseFloat(grams);
    }
    onSave(data, isEditing ? item.id : barcode.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-black mb-4">{isEditing ? 'Edit Item' : 'Add New Item'}</h3>
        <div className="space-y-3">
          <TextField
            label="Barcode"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            readOnly={isEditing}
          />
          <SelectField label="Category" value={category} onChange={setCategory} options={catOptions} />
          <SelectField label="Supplier" value={supplier} onChange={setSupplier} options={supOptions} />
          <TextField label="Item Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Price (LE)" value={price} onChange={(e) => setPrice(e.target.value)} type="number" />
          <TextField
            label="Low Stock Threshold"
            value={lowStock}
            onChange={(e) => setLowStock(e.target.value)}
            type="number"
          />
          {category === 'Powder' && (
            <TextField
              label="Grams (Optional)"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              type="number"
              required={false}
            />
          )}
        </div>
        <div className="flex gap-2 justify-between mt-6">
          <div>
            {isEditing && (
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                disabled={saving}
                className="px-4 py-2 text-red-600 border border-red-300 rounded-md"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md text-black">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-black text-[#c3a28e] rounded-md">
              {isEditing ? 'Save' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MakeItemsDialog({ item, onClose, onDone, saving, setSaving }) {
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [quantity, setQuantity] = useState('');

  const grams = item.grams != null ? Number(item.grams) : null;
  const stock = Number(item.quantity) || 0;

  const submit = async () => {
    const itemsToMake = parseInt(quantity, 10);
    const priceNum = parseFloat(newPrice);
    if (!newName.trim() || !priceNum || priceNum <= 0 || !itemsToMake || itemsToMake <= 0) return;
    if (itemsToMake > stock) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'Items', item.id), { quantity: increment(-1) });
      await addDoc(collection(db, 'Items'), {
        name: newName.trim(),
        price: priceNum,
        category: item.category,
        supplier: item.supplier,
        lowStock: item.lowStock,
        quantity: itemsToMake,
        barcode: '',
        grams: grams / itemsToMake,
      });
      onDone('Successfully created items from powder!');
      onClose();
    } catch (e) {
      onDone(e.message, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h3 className="font-bold text-black mb-4">Make Items from Powder</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm">
          <p className="font-semibold">Source Item: {item.name}</p>
          <p className="text-gray-600">Available: {stock} items ({grams}g each)</p>
        </div>
        <div className="space-y-3">
          <TextField label="New Item Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <TextField label="New Item Price (LE)" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} type="number" />
          <TextField label="How many items to make" value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" />
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md text-black">Cancel</button>
          <button type="button" onClick={submit} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-md">
            Make Items
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('All');
  const [dialog, setDialog] = useState(null);
  const [makeDialog, setMakeDialog] = useState(null);
  const [snack, setSnack] = useState({ message: '', isError: false });

  useEffect(() => {
    return onSnapshot(collection(db, 'Items'), (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [catSnap, supSnap] = await Promise.all([
          getDocs(collection(db, 'Categories')),
          getDocs(collection(db, 'Suppliers')),
        ]);
        const cats = [...new Set(catSnap.docs.map((d) => (d.data().name || '').trim()).filter(Boolean))];
        const sups = [...new Set(supSnap.docs.map((d) => (d.data().name || '').trim()).filter(Boolean))];
        cats.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        sups.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        setCategories(cats);
        setSuppliers(sups);
      } catch (e) {
        setSnack({ message: `Error fetching dropdown data: ${e.message}`, isError: true });
      }
    };
    loadDropdowns();
  }, []);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const name = (item.name || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      const supplier = (item.supplier || '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || category.includes(q) || supplier.includes(q);

      const quantity = Number(item.quantity) || 0;
      const low = Number(item.lowStock) || 0;
      let matchesStock = true;
      if (stockFilter === 'Low stock only') matchesStock = quantity <= low;
      else if (stockFilter === 'Above low stock') matchesStock = quantity > low;

      return matchesSearch && matchesStock;
    });
  }, [items, searchQuery, stockFilter]);

  const totalValue = useMemo(
    () => filteredItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0),
    [filteredItems]
  );

  const notify = (message, isError = false) => setSnack({ message, isError });

  const saveItem = async (data, docId) => {
    setSaving(true);
    try {
      if (dialog.mode === 'edit') {
        await updateDoc(doc(db, 'Items', docId), data);
        notify('Item updated successfully!');
      } else {
        const existing = await getDoc(doc(db, 'Items', docId));
        if (existing.exists()) {
          notify(`Item with barcode ${docId} already exists!`, true);
          return;
        }
        await setDoc(doc(db, 'Items', docId), { ...data, quantity: 0 });
        notify('Item added successfully!');
      }
      setDialog(null);
    } catch (e) {
      notify(`Error saving item: ${e.message}`, true);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (docId) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'Items', docId));
      notify('Item deleted successfully!');
      setDialog(null);
    } catch (e) {
      notify(`Error deleting item: ${e.message}`, true);
    } finally {
      setSaving(false);
    }
  };

  const quantityColor = (quantity, lowStock) => {
    if (quantity <= lowStock) return 'text-red-600';
    if (quantity <= lowStock * 2) return 'text-orange-500';
    return 'text-green-600';
  };

  return (
    <>
      <Header />
      <PageCard
        title="Items"
        icon="📦"
        action={
          <button
            type="button"
            onClick={() => setDialog({ mode: 'add' })}
            className="px-4 py-2 bg-black text-[#c3a28e] rounded-md text-sm"
          >
            + Add Item
          </button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <SelectField
            label="Filter by stock"
            value={stockFilter}
            onChange={setStockFilter}
            options={STOCK_FILTERS}
            placeholder=""
          />
          <TextField
            label="Search items"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            required={false}
          />
        </div>

        <div className="flex justify-between items-center mb-4 px-1">
          <span className="text-sm font-semibold text-gray-700">Total Inventory Value</span>
          <span className="font-bold text-black">{totalValue.toFixed(2)} LE</span>
        </div>

        {loading ? (
          <p className="text-gray-600 text-center py-8">Loading items...</p>
        ) : filteredItems.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No items found.</p>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const quantity = Number(item.quantity) || 0;
              const lowStock = Number(item.lowStock) || 0;
              const price = Number(item.price) || 0;
              const grams = item.grams != null ? Number(item.grams) : null;
              const isPowder = item.category === 'Powder';

              return (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/dashboard/inventory/items/${item.id}/history?name=${encodeURIComponent(item.name || '')}`
                    )
                  }
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-bold text-black text-lg">{item.name}</p>
                    <p className="font-bold text-blue-600">{price.toFixed(2)} LE</p>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">Category: {item.category || 'N/A'}</p>
                  <p className="text-sm text-gray-700">Supplier: {item.supplier || 'N/A'}</p>
                  {isPowder && grams != null && (
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-sm text-purple-700">Grams: {grams.toFixed(1)}g</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!grams) notify("This powder item doesn't have grams information!", true);
                          else if (quantity <= 0) notify('This powder item is out of stock!', true);
                          else setMakeDialog(item);
                        }}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded-md"
                      >
                        Make Items
                      </button>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-2">
                    <p className={`font-bold ${quantityColor(quantity, lowStock)}`}>Quantity: {quantity}</p>
                    <p className="text-sm text-gray-600">Low Stock: {lowStock}</p>
                  </div>
                  <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setDialog({ mode: 'edit', item })}
                      className="px-3 py-1 border rounded-md text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/inventory/items/${item.id}/history?name=${encodeURIComponent(item.name || '')}`
                        )
                      }
                      className="px-3 py-1 border rounded-md text-sm text-[#c3a28e]"
                    >
                      History
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageCard>

      {dialog && (
        <ItemDialog
          mode={dialog.mode}
          item={dialog.item}
          categories={categories}
          suppliers={suppliers}
          onClose={() => setDialog(null)}
          onSave={saveItem}
          onDelete={deleteItem}
          saving={saving}
        />
      )}

      {makeDialog && (
        <MakeItemsDialog
          item={makeDialog}
          onClose={() => setMakeDialog(null)}
          onDone={notify}
          saving={saving}
          setSaving={setSaving}
        />
      )}

      <LoadingOverlay show={saving} />
      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: '', isError: false })} />
    </>
  );
}
