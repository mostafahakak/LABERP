'use client';

import { useRef, useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/layout/Header';
import { PageCard, Snackbar, LoadingOverlay } from '@/components/ui/PageComponents';

function cleanStringForFirebase(text) {
  return String(text || '').replace(/\uFFFD/g, '').trim();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch === '\r') {
      // skip
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function createDataList(csvData) {
  if (!csvData.length) return [];
  const headerRow = csvData[0].map((e) => String(e).trim().toLowerCase());
  const dataList = [];

  for (let i = 1; i < csvData.length; i += 1) {
    const rowData = {};
    const currentRow = csvData[i];
    for (let j = 0; j < headerRow.length; j += 1) {
      rowData[headerRow[j]] = j < currentRow.length ? String(currentRow[j] ?? '') : '';
    }
    dataList.push(rowData);
  }

  return dataList;
}

export default function UploadPage() {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [snack, setSnack] = useState({ message: '', isError: false });

  const processFile = async (file) => {
    setUploading(true);
    setProgress({ current: 0, total: 0 });

    try {
      const buffer = await file.arrayBuffer();
      let csvString;
      try {
        csvString = new TextDecoder('utf-8').decode(buffer);
      } catch {
        csvString = new TextDecoder('iso-8859-1').decode(buffer);
      }

      const csvData = parseCsv(csvString);
      if (csvData.length < 2) {
        setSnack({ message: 'CSV file is empty or contains only headers.', isError: true });
        return;
      }

      const dataList = createDataList(csvData);
      setProgress({ current: 0, total: dataList.length });

      const itemsCollection = collection(db, 'Items');

      for (let i = 0; i < dataList.length; i += 1) {
        const rowData = dataList[i];
        const docId =
          rowData.id == null || String(rowData.id).trim() === ''
            ? crypto.randomUUID()
            : String(rowData.id).trim();

        let name = cleanStringForFirebase(rowData.name ?? 'N/A');
        let catName = cleanStringForFirebase(rowData.category ?? 'N/A');
        let supplierName = cleanStringForFirebase(rowData.supplier ?? 'N/A');
        const price = parseInt(rowData.price, 10) || 0;
        const lowStock = parseInt(rowData['low stock'], 10) || 0;
        let typeName = cleanStringForFirebase(rowData.type ?? 'N/A');

        name = cleanStringForFirebase(name);
        typeName = cleanStringForFirebase(typeName);
        catName = cleanStringForFirebase(catName);

        await setDoc(doc(itemsCollection, docId), {
          category: catName,
          lowStock,
          name,
          price,
          quantity: 0,
          supplier: supplierName,
          type: typeName,
        });

        setProgress({ current: i + 1, total: dataList.length });
      }

      setSnack({ message: 'Data uploaded successfully!', isError: false });
    } catch (e) {
      setSnack({ message: `Error uploading data: ${e.message}`, isError: true });
    } finally {
      setUploading(false);
      setProgress({ current: 0, total: 0 });
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleUpload = () => {
    fileRef.current?.click();
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <>
      <Header />
      <PageCard title="CSV File Upload" icon="📁">
        <p className="text-gray-600 text-center mb-6">
          Please ensure your CSV file is saved with UTF-8 encoding (e.g., &quot;CSV UTF-8 (Comma delimited)&quot; in Excel)
          to avoid issues with special characters (like Arabic).
        </p>

        <p className="text-sm text-gray-500 text-center mb-4">
          Expected columns: id, name, category, supplier, price, low stock, type
        </p>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="px-8 py-4 bg-black text-white rounded-lg text-lg font-medium disabled:opacity-50"
          >
            Upload CSV Data to Inventory
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={onFileChange}
        />

        {uploading && progress.total > 0 && (
          <div className="mt-6">
            <p className="text-center text-sm text-gray-600 mb-2">
              Uploading data... ({progress.current}/{progress.total} rows)
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#d9ae02] h-2 rounded-full transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </PageCard>

      <LoadingOverlay show={uploading} />
      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: '', isError: false })} />
    </>
  );
}
