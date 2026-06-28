"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDate, isDelayed, shortId, formatPriceLE } from "@/lib/utils";
import Header from "@/components/layout/Header";
import {
  PageCard,
  SelectField,
  Snackbar,
} from "@/components/ui/PageComponents";
import ManageCaseDialog, { deleteCase } from "./ManageCaseDialog";

export default function ViewCasesForm() {
  const [clinics, setClinics] = useState([]);
  const [types, setTypes] = useState([]);
  const [drNames, setDrNames] = useState([]);
  const [statuses, setStatuses] = useState([]);

  const [selectedClinic, setSelectedClinic] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedDrName, setSelectedDrName] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [dueFilter, setDueFilter] = useState("All");

  const [cases, setCases] = useState([]);
  const [manageCase, setManageCase] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [snack, setSnack] = useState({ message: "", isError: false });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getDocs(collection(db, "Cases")).then((snap) => {
      const clinicSet = new Set();
      const statusSet = new Set();
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.clinicName) clinicSet.add(data.clinicName);
        if (data.status) statusSet.add(data.status);
      });
      setClinics([...clinicSet].sort());
      setStatuses([...statusSet].sort());
    });
    getDocs(collection(db, "Types")).then((snap) => {
      setTypes(
        snap.docs
          .map((d) => d.data().name)
          .filter(Boolean)
          .sort(),
      );
    });
    getDocs(collection(db, "Drs")).then((snap) => {
      setDrNames(
        snap.docs
          .map((d) => d.data().name)
          .filter(Boolean)
          .sort(),
      );
    });
  }, []);

  useEffect(() => {
    let q = query(
      collection(db, "Cases"),
      orderBy("createdDate", "desc"),
      orderBy("createdTime", "desc"),
    );
    const constraints = [
      orderBy("createdDate", "desc"),
      orderBy("createdTime", "desc"),
    ];
    const wheres = [];
    if (selectedClinic) wheres.push(where("clinicName", "==", selectedClinic));
    if (selectedType) wheres.push(where("type", "==", selectedType));
    if (selectedDrName) wheres.push(where("drName", "==", selectedDrName));
    if (selectedStatus) wheres.push(where("status", "==", selectedStatus));
    if (selectedDate) wheres.push(where("caseRequestDate", "==", selectedDate));

    q = query(collection(db, "Cases"), ...wheres, ...constraints);

    const unsub = onSnapshot(
      q,
      (snap) => {
        let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (dueFilter === "Delayed") docs = docs.filter((c) => isDelayed(c));
        setCases(docs);
      },
      (err) => setSnack({ message: err.message, isError: true }),
    );

    return () => unsub();
  }, [
    selectedClinic,
    selectedType,
    selectedDrName,
    selectedStatus,
    selectedDate,
    dueFilter,
    refreshKey,
  ]);

  const clearFilters = () => {
    setSelectedClinic(null);
    setSelectedType(null);
    setSelectedDrName(null);
    setSelectedStatus(null);
    setSelectedDate("");
    setDueFilter("All");
  };

  const handleDelete = async (caseId) => {
    try {
      await deleteCase(caseId);
      setSnack({ message: "Case deleted", isError: false });
      setDeleteConfirm(null);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    }
  };

  const handleFinalize = async (caseId) => {
    try {
      await updateDoc(doc(db, "Cases", caseId), {
        status: "Finalized",
        phase: "Phase 4",
      });
      setSnack({ message: "Case marked as Finalized", isError: false });
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    }
  };

  return (
    <>
      <Header />
      <PageCard title="View Cases" icon="📋">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <SelectField
            label="Clinic Name"
            value={selectedClinic}
            onChange={setSelectedClinic}
            options={clinics}
            placeholder="All"
          />
          <SelectField
            label="Type"
            value={selectedType}
            onChange={setSelectedType}
            options={types}
            placeholder="All"
          />
          <SelectField
            label="Dr Name"
            value={selectedDrName}
            onChange={setSelectedDrName}
            options={drNames}
            placeholder="All"
          />
          <SelectField
            label="Status"
            value={selectedStatus}
            onChange={setSelectedStatus}
            options={statuses}
            placeholder="All"
          />
          <SelectField
            label="Due Status"
            value={dueFilter}
            onChange={setDueFilter}
            options={["All", "Delayed"]}
            placeholder="All"
          />
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Date Arrival
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border rounded-md p-2.5 text-foreground"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={clearFilters}
          className="mb-6 px-4 py-2 border rounded-md text-foreground"
        >
          Clear Filters
        </button>

        <div className="space-y-4">
          {cases.map((c) => (
            <CaseCard
              key={c.id}
              caseData={c}
              onManage={() => setManageCase(c)}
              onDelete={() => setDeleteConfirm(c.id)}
              onFinalize={() => handleFinalize(c.id)}
            />
          ))}
          {cases.length === 0 && (
            <p className="text-muted-foreground">No cases found.</p>
          )}
        </div>
      </PageCard>

      {manageCase && (
        <ManageCaseDialog
          caseId={manageCase.id}
          caseData={manageCase}
          onClose={() => setManageCase(null)}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-xl p-6 max-w-sm w-full">
            <p className="text-foreground mb-4">
              Delete this case and its tracking records?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <Snackbar
        message={snack.message}
        isError={snack.isError}
        onClose={() => setSnack({ message: "", isError: false })}
      />
    </>
  );
}

function CaseCard({ caseData, onManage, onDelete, onFinalize }) {
  const [balance, setBalance] = useState(null);
  const delayed = isDelayed(caseData);
  const isFinalized =
    caseData.status === "Finalized" ||
    caseData.status === "Ready to be delivered" ||
    caseData.status === "Ready to Invoice" ||
    caseData.status === "Done";

  useEffect(() => {
    if (!caseData.clinicName) return;
    const q = query(
      collection(db, "Clinics"),
      where("name", "==", caseData.clinicName),
      limit(1),
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) setBalance(snap.docs[0].data().balance);
    });
    return () => unsub();
  }, [caseData.clinicName]);

  return (
    <div
      className={`relative border rounded-xl p-4 bg-white ${delayed ? "border-red-400" : "border-border"}`}
    >
      {delayed && (
        <div className="absolute inset-0 bg-destructive/100/5 animate-pulse rounded-xl pointer-events-none" />
      )}
      <div className="flex flex-wrap justify-between gap-2 mb-2">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isFinalized}
            disabled={isFinalized}
            onChange={onFinalize}
            title="Mark as Finalized"
            className="w-5 h-5 accent-green-600"
          />
          <div>
            <p className="font-bold text-foreground">{caseData.clinicName}</p>
            {caseData.caseCode && (
              <p className="text-xs text-muted-foreground">{caseData.caseCode}</p>
            )}
            {balance !== null && (
              <p
                className={`text-sm ${balance >= 0 ? "text-green-600" : "text-destructive"}`}
              >
                Balance: {formatPriceLE(balance)}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <span className="text-xs px-2 py-1 bg-muted rounded text-foreground">
            {caseData.caseType}
          </span>
          <span className="text-xs px-2 py-1 bg-blue-100 rounded text-blue-800">
            {caseData.status}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm text-foreground mb-3">
        <p>
          <strong>ID:</strong> {shortId(caseData.id)}
        </p>
        <p>
          <strong>Price:</strong> {formatPriceLE(caseData.price)}
        </p>
        <p>
          <strong>Type:</strong> {caseData.type}
        </p>
        <p>
          <strong>Dr:</strong> {caseData.drName}
        </p>
        <p>
          <strong>Patient:</strong> {caseData.patientName}
        </p>
        <p>
          <strong>Due:</strong> {caseData.dueDate || caseData.caseRequestDate}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onManage}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm"
        >
          Manage
        </button>
        <Link
          href={`/dashboard/workflow/cases/${caseData.id}`}
          className="px-3 py-1.5 border rounded-md text-sm text-foreground"
        >
          View
        </Link>
        <button
          type="button"
          onClick={onDelete}
          className="px-3 py-1.5 border border-red-300 text-destructive rounded-md text-sm"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
