"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDate, isDelayed, isOverdue, shortId, formatPriceLE } from "@/lib/utils";
import { getPhaseInfo } from "@/lib/phase-utils";
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
  const [allCases, setAllCases] = useState([]);

  const [selectedClinic, setSelectedClinic] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedDrName, setSelectedDrName] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [dueFilter, setDueFilter] = useState("All");

  const [manageCase, setManageCase] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [snack, setSnack] = useState({ message: "", isError: false });

  const withAllOption = (arr) => ["All", ...arr.filter(Boolean)];
  const toList = (val) => String(val || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const getPhaseText = (caseData) => caseData?.phase || getPhaseInfo(caseData).currentPhase;
  const isAll = (v) => v === null || v === "" || v === "All";

  const clinicScopedCases = useMemo(() => {
    if (isAll(selectedClinic)) return allCases;
    return allCases.filter((c) => c.clinicName === selectedClinic);
  }, [allCases, selectedClinic]);

  const statusPhaseMap = useMemo(() => {
    const phaseCountByStatus = {};

    clinicScopedCases.forEach((c) => {
      const status = c.status;
      const phase = c.phase;
      if (!status || !phase) return;
      if (!phaseCountByStatus[status]) phaseCountByStatus[status] = {};
      phaseCountByStatus[status][phase] = (phaseCountByStatus[status][phase] || 0) + 1;
    });

    const result = {};
    Object.entries(phaseCountByStatus).forEach(([status, counts]) => {
      const topPhase = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (topPhase) result[status] = topPhase;
    });
    return result;
  }, [clinicScopedCases]);

  const canonicalPhaseByStatus = {
    "pending delivery": "Phase 1",
    "design": "Phase 2",
    "try in": "Phase 3",
    "finishing": "Phase 4",
    "finalized": "Phase 4",
    "ready to be delivered": "Phase 5",
    "ready to invoice": "Phase 6",
    "ready to get invoice": "Phase 6",
    "done": "Phase 7",
  };

  const normalizeStatus = (status) => String(status || "").trim().toLowerCase();

  const getPhaseShort = (status) => {
    const normalized = normalizeStatus(status);
    const phase =
      canonicalPhaseByStatus[normalized]
      || statusPhaseMap[status]
      || getPhaseInfo({ status }).currentPhase
      || "";
    const match = String(phase).match(/\d+/);
    return match ? `P${match[0]}` : phase;
  };
  const statusLabel = (status) => `${status} (${getPhaseShort(status)})`;

  useEffect(() => {
    const constraints = [
      orderBy("createdDate", "desc"),
      orderBy("createdTime", "desc"),
    ];
    const q = query(collection(db, "Cases"), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAllCases(docs);
      },
      (err) => setSnack({ message: err.message, isError: true }),
    );

    return () => unsub();
  }, []);

  const clinicOptions = useMemo(() => {
    const clinicSet = new Set();
    allCases.forEach((c) => {
      if (c.clinicName) clinicSet.add(c.clinicName);
    });
    return [...clinicSet].sort();
  }, [allCases]);

  const typeOptions = useMemo(() => {
    const typeSet = new Set();
    clinicScopedCases.forEach((c) => {
      toList(c.type).forEach((t) => typeSet.add(t));
    });
    return [...typeSet].sort();
  }, [clinicScopedCases]);

  const drOptions = useMemo(() => {
    const drSet = new Set();
    clinicScopedCases.forEach((c) => {
      if (c.drName) drSet.add(c.drName);
    });
    return [...drSet].sort();
  }, [clinicScopedCases]);

  const statusOptions = useMemo(() => {
    const statusSet = new Set();
    clinicScopedCases.forEach((c) => {
      if (c.status) statusSet.add(c.status);
    });
    return [...statusSet].sort();
  }, [clinicScopedCases]);

  const selectedTypeSafe = !isAll(selectedType) && !typeOptions.includes(selectedType)
    ? null
    : selectedType;
  const selectedDrNameSafe = !isAll(selectedDrName) && !drOptions.includes(selectedDrName)
    ? null
    : selectedDrName;
  const selectedStatusSafe = !isAll(selectedStatus) && !statusOptions.includes(selectedStatus)
    ? null
    : selectedStatus;

  const cases = useMemo(() => {
    let docs = [...allCases];
    if (!isAll(selectedClinic)) docs = docs.filter((c) => c.clinicName === selectedClinic);
    if (!isAll(selectedTypeSafe)) docs = docs.filter((c) => toList(c.type).includes(selectedTypeSafe));
    if (!isAll(selectedDrNameSafe)) docs = docs.filter((c) => c.drName === selectedDrNameSafe);
    if (!isAll(selectedStatusSafe)) docs = docs.filter((c) => c.status === selectedStatusSafe);
    if (selectedDate) docs = docs.filter((c) => c.caseRequestDate === selectedDate);
    if (dueFilter === "Delayed") docs = docs.filter((c) => isDelayed(c));
    if (dueFilter === "Overdue") docs = docs.filter((c) => isOverdue(c));
    return docs;
  }, [allCases, selectedClinic, selectedTypeSafe, selectedDrNameSafe, selectedStatusSafe, selectedDate, dueFilter]);

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
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    }
  };

  const handleDeleteAllCases = async () => {
    if (cases.length === 0) {
      setSnack({ message: "No cases to remove", isError: true });
      setDeleteAllConfirm(false);
      return;
    }

    setBulkDeleting(true);
    try {
      const count = cases.length;
      for (const c of cases) {
        await deleteCase(c.id);
      }
      setSnack({
        message: `${count} case(s) and all phase records deleted`,
        isError: false,
      });
      setDeleteAllConfirm(false);
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    } finally {
      setBulkDeleting(false);
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
            <SelectField label="Clinic Name" value={selectedClinic} onChange={(v) => setSelectedClinic(v === "All" ? null : v)} options={withAllOption(clinicOptions)} placeholder="All" />
            <SelectField label="Type" value={selectedTypeSafe} onChange={(v) => setSelectedType(v === "All" ? null : v)} options={withAllOption(typeOptions)} placeholder="All" />
            <SelectField label="Dr Name" value={selectedDrNameSafe} onChange={(v) => setSelectedDrName(v === "All" ? null : v)} options={withAllOption(drOptions)} placeholder="All" />
            <SelectField
              label="Status"
              value={selectedStatusSafe}
              onChange={(v) => setSelectedStatus(v === "All" ? null : v)}
              options={withAllOption(statusOptions).map((s) => (
                s === "All"
                  ? { label: "All", value: "All" }
                  : { label: statusLabel(s), value: s }
              ))}
              placeholder="All"
            />
            <SelectField label="Due Status" value={dueFilter} onChange={setDueFilter} options={["All", "Delayed", "Overdue"]} placeholder="All" />
            <div className="space-y-1.5">
              <Label>Date Arrival</Label>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={clearFilters} className="gap-1.5">
              <X className="size-3.5" /> Clear Filters
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteAllConfirm(true)}
              className="gap-1.5 border-destructive/40 text-destructive hover:text-destructive"
              disabled={bulkDeleting}
            >
              <Trash2 className="size-3.5" /> Remove All Cases
            </Button>
          </div>
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
        />
      )}

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Phases</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the case and all phase tracking records (CasesTrack) for this case. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(deleteConfirm)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete All Phases
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAllConfirm} onOpenChange={setDeleteAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove All Cases</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all currently filtered cases and all phase tracking records for each one.
              Total selected: {cases.length}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllCases}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? "Removing..." : "Remove All Cases"}
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
  const overdue = isOverdue(caseData);
  const phase = caseData.phase || getPhaseInfo(caseData).currentPhase;
  const phaseColors = {
    "Phase 1": "bg-orange-500/15 text-orange-600 dark:text-orange-300",
    "Phase 2": "bg-blue-500/15 text-blue-600 dark:text-blue-300",
    "Phase 3": "bg-violet-500/15 text-violet-600 dark:text-violet-300",
    "Phase 4": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    "Phase 5": "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
    "Phase 6": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    "Phase 7": "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  };
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
    <Card className={`relative overflow-hidden transition-all ${
      overdue
        ? "border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] ring-2 ring-red-500/20"
        : delayed
          ? "border-2 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/20"
          : ""
    }`}>
      {overdue && (
        <div className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse" />
          ⚠️ OVERDUE — This case has passed its due date!
        </div>
      )}
      {delayed && !overdue && (
        <div className="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse" />
          ⏰ DUE TOMORROW — Action required!
        </div>
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
            <Badge className={phaseColors[phase] || "bg-muted text-foreground"}>{phase}</Badge>
            <Badge variant={overdue ? 'destructive' : delayed ? 'outline' : 'default'}
              className={overdue ? 'animate-pulse bg-red-600' : delayed ? 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950' : ''}
            >{caseData.status}</Badge>
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
            <Trash2 className="size-3.5" /> Delete All Phases
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
