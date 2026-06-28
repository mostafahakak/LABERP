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
import { SelectField, Snackbar } from "@/components/ui/PageComponents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ManageCaseDialog, { deleteCase } from "./ManageCaseDialog";
import { Filter, X, CheckCircle2, Eye, Settings2, Trash2 } from "lucide-react";

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
      <Header title="View Cases" />

      {/* Filters */}
      <Card className="mb-5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Filter className="size-4" /> Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <SelectField label="Clinic Name" value={selectedClinic} onChange={setSelectedClinic} options={clinics} placeholder="All" />
            <SelectField label="Type" value={selectedType} onChange={setSelectedType} options={types} placeholder="All" />
            <SelectField label="Dr Name" value={selectedDrName} onChange={setSelectedDrName} options={drNames} placeholder="All" />
            <SelectField label="Status" value={selectedStatus} onChange={setSelectedStatus} options={statuses} placeholder="All" />
            <SelectField label="Due Status" value={dueFilter} onChange={setDueFilter} options={["All", "Delayed"]} placeholder="All" />
            <div className="space-y-1.5">
              <Label>Date Arrival</Label>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
          </div>
          <Button variant="outline" onClick={clearFilters} className="gap-1.5">
            <X className="size-3.5" /> Clear Filters
          </Button>
        </CardContent>
      </Card>

      {/* Cases List */}
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
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">No cases found.</CardContent>
          </Card>
        )}
      </div>

      {manageCase && (
        <ManageCaseDialog
          caseId={manageCase.id}
          caseData={manageCase}
          onClose={() => setManageCase(null)}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      )}

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Case</AlertDialogTitle>
            <AlertDialogDescription>Delete this case and its tracking records? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(deleteConfirm)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Snackbar message={snack.message} isError={snack.isError} onClose={() => setSnack({ message: "", isError: false })} />
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
    <Card className={`relative overflow-hidden ${delayed ? "border-destructive/60" : ""}`}>
      {delayed && (
        <div className="absolute inset-0 bg-destructive/5 animate-pulse pointer-events-none" />
      )}
      <CardContent className="pt-5">
        <div className="flex flex-wrap justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onFinalize}
              disabled={isFinalized}
              className="shrink-0"
              title="Mark as Finalized"
            >
              <CheckCircle2 className={`size-5 ${isFinalized ? 'text-emerald-500' : 'text-muted-foreground/40 hover:text-emerald-500'} transition-colors`} />
            </button>
            <div>
              <p className="font-bold text-foreground">{caseData.clinicName}</p>
              {caseData.caseCode && (
                <p className="text-xs text-muted-foreground">{caseData.caseCode}</p>
              )}
              {balance !== null && (
                <p className={`text-sm ${balance >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  Balance: {formatPriceLE(balance)}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 items-start">
            <Badge variant="secondary">{caseData.caseType}</Badge>
            <Badge variant={delayed ? 'destructive' : 'default'}>{caseData.status}</Badge>
          </div>
        </div>

        <Separator className="mb-3" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-foreground mb-4">
          <p><span className="text-muted-foreground">ID:</span> {shortId(caseData.id)}</p>
          <p><span className="text-muted-foreground">Price:</span> {formatPriceLE(caseData.price)}</p>
          <p><span className="text-muted-foreground">Type:</span> {caseData.type}</p>
          <p><span className="text-muted-foreground">Dr:</span> {caseData.drName}</p>
          <p><span className="text-muted-foreground">Patient:</span> {caseData.patientName}</p>
          <p><span className="text-muted-foreground">Due:</span> {caseData.dueDate || caseData.caseRequestDate}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onManage} className="gap-1.5">
            <Settings2 className="size-3.5" /> Manage
          </Button>
          <Button size="sm" variant="outline" asChild className="gap-1.5">
            <Link href={`/dashboard/workflow/cases/${caseData.id}`}>
              <Eye className="size-3.5" /> View
            </Link>
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete} className="gap-1.5 text-destructive hover:text-destructive">
            <Trash2 className="size-3.5" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
