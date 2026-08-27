"use client";

import { useEffect, useMemo, useState } from "react";
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
import { formatDate, isDelayed, isOverdue, shortId, formatPriceLE } from "@/lib/utils";
import { canEditLockedCase, getPhaseInfo } from "@/lib/phase-utils";
import { useAuth } from "@/lib/auth-context";
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
import { Filter, X, CheckCircle2, Eye, Settings2, Trash2, Loader2, Pencil, User, Stethoscope, Calendar, Hash, DollarSign } from "lucide-react";

export default function ViewCasesForm() {
  const { user } = useAuth();
  const [allCases, setAllCases] = useState([]);

  const [selectedClinic, setSelectedClinic] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedDrName, setSelectedDrName] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [dueFilter, setDueFilter] = useState("All");

  const [manageCase, setManageCase] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [singleDeleting, setSingleDeleting] = useState(false);
  const [deleteDetails, setDeleteDetails] = useState(null);
  const [deleteDetailsLoading, setDeleteDetailsLoading] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deleteAllDetails, setDeleteAllDetails] = useState(null);
  const [deleteAllDetailsLoading, setDeleteAllDetailsLoading] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [snack, setSnack] = useState({ message: "", isError: false });

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

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
    "pending delivery": "P1",
    "physical": "P1",
    "design": "P2",
    "room1": "P2",
    "production": "P3",
    "try in": "P4",
    "try in order": "P4",
    "final order": "P4",
    "finishing": "P5",
    "finalized": "P5",
    "try in delivery": "P5",
    "back from try in": "P6",
    "ready to be delivered": "P6",
    "ready to invoice": "P7",
    "ready to get invoice": "P7",
    "done": "P7",
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
    setSingleDeleting(true);
    try {
      await deleteCase(caseId);
      setSnack({ message: "Case deleted", isError: false });
      setDeleteConfirm(null);
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    } finally {
      setSingleDeleting(false);
    }
  };

  const openDeleteCaseDialog = async (caseData) => {
    setDeleteConfirm(caseData.id);
    setDeleteDetails(null);
    setDeleteDetailsLoading(true);
    try {
      const [trackSnap, notesSnap] = await Promise.all([
        getDocs(query(collection(db, "CasesTrack"), where("caseUID", "==", caseData.id))),
        getDocs(collection(db, "Cases", caseData.id, "Notes")),
      ]);
      setDeleteDetails({
        clinicName: caseData.clinicName || "—",
        caseCode: caseData.caseCode || "—",
        patientName: caseData.patientName || "—",
        status: caseData.status || "—",
        phase: caseData.phase || getPhaseInfo(caseData).currentPhase,
        trackCount: trackSnap.size,
        notesCount: notesSnap.size,
      });
    } catch {
      setDeleteDetails({
        clinicName: caseData.clinicName || "—",
        caseCode: caseData.caseCode || "—",
        patientName: caseData.patientName || "—",
        status: caseData.status || "—",
        phase: caseData.phase || getPhaseInfo(caseData).currentPhase,
        trackCount: null,
        notesCount: null,
      });
    } finally {
      setDeleteDetailsLoading(false);
    }
  };

  const openDeleteAllDialog = async () => {
    setDeleteAllConfirm(true);
    setDeleteAllDetails(null);
    setDeleteAllDetailsLoading(true);
    try {
      const counts = await Promise.all(cases.map(async (c) => {
        const [trackSnap, notesSnap] = await Promise.all([
          getDocs(query(collection(db, "CasesTrack"), where("caseUID", "==", c.id))),
          getDocs(collection(db, "Cases", c.id, "Notes")),
        ]);
        return {
          id: c.id,
          code: c.caseCode || "—",
          clinic: c.clinicName || "—",
          patient: c.patientName || "—",
          tracks: trackSnap.size,
          notes: notesSnap.size,
        };
      }));

      setDeleteAllDetails({
        caseCount: cases.length,
        totalTracks: counts.reduce((s, x) => s + x.tracks, 0),
        totalNotes: counts.reduce((s, x) => s + x.notes, 0),
        preview: counts.slice(0, 5),
      });
    } catch {
      setDeleteAllDetails({
        caseCount: cases.length,
        totalTracks: null,
        totalNotes: null,
        preview: cases.slice(0, 5).map((c) => ({
          id: c.id,
          code: c.caseCode || "—",
          clinic: c.clinicName || "—",
          patient: c.patientName || "—",
        })),
      });
    } finally {
      setDeleteAllDetailsLoading(false);
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
        status: "Final order",
        phase: "P4",
        orderPath: "Final",
      });
      setSnack({ message: "Case marked as Final order", isError: false });
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
              onClick={openDeleteAllDialog}
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
            onDelete={() => openDeleteCaseDialog(c)}
            onFinalize={() => handleFinalize(c.id)}
            canEdit={canEditLockedCase(user?.type, c.status)}
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
            <AlertDialogTitle>Delete</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete this case, all phase tracking records (CasesTrack), and all case notes. This action cannot be undone.
            </AlertDialogDescription>
            <div className="mt-3 rounded-md border border-border/70 bg-background/40 p-3 text-sm text-left">
              {deleteDetailsLoading ? (
                <p className="text-muted-foreground">Loading delete details...</p>
              ) : deleteDetails ? (
                <div className="space-y-1 text-muted-foreground">
                  <p><span className="text-foreground font-medium">Clinic:</span> {deleteDetails.clinicName}</p>
                  <p><span className="text-foreground font-medium">Case Code:</span> {deleteDetails.caseCode}</p>
                  <p><span className="text-foreground font-medium">Patient:</span> {deleteDetails.patientName}</p>
                  <p><span className="text-foreground font-medium">Status/Phase:</span> {deleteDetails.status} / {deleteDetails.phase}</p>
                  <p><span className="text-foreground font-medium">Phase records to delete:</span> {deleteDetails.trackCount ?? 'Unknown'}</p>
                  <p><span className="text-foreground font-medium">Case notes to delete:</span> {deleteDetails.notesCount ?? 'Unknown'}</p>
                  <p><span className="text-foreground font-medium">Case document:</span> 1</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No details found.</p>
              )}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={singleDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteConfirm)}
              disabled={singleDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {singleDeleting ? <Loader2 className="size-4 animate-spin" /> : null}
              {singleDeleting ? "Deleting..." : "Delete"}
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
            <div className="mt-3 rounded-md border border-border/70 bg-background/40 p-3 text-sm text-left">
              {deleteAllDetailsLoading ? (
                <p className="text-muted-foreground">Loading delete details...</p>
              ) : deleteAllDetails ? (
                <div className="space-y-1 text-muted-foreground">
                  <p><span className="text-foreground font-medium">Cases to delete:</span> {deleteAllDetails.caseCount}</p>
                  <p><span className="text-foreground font-medium">Total phase records:</span> {deleteAllDetails.totalTracks ?? 'Unknown'}</p>
                  <p><span className="text-foreground font-medium">Total notes:</span> {deleteAllDetails.totalNotes ?? 'Unknown'}</p>
                  <p className="text-foreground font-medium mt-2">Preview:</p>
                  {deleteAllDetails.preview.map((c) => (
                    <p key={c.id}>- {c.clinic} | {c.code} | {c.patient}</p>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No details found.</p>
              )}
            </div>
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

function CaseCard({ caseData, onManage, onDelete, onFinalize, canEdit = true }) {
  const [balance, setBalance] = useState(null);
  const delayed = isDelayed(caseData);
  const overdue = isOverdue(caseData);
  const phase = caseData.phase || getPhaseInfo(caseData).currentPhase;
  const phaseColors = {
    "P1": "bg-orange-500/15 text-orange-600 dark:text-orange-300",
    "P2": "bg-blue-500/15 text-blue-600 dark:text-blue-300",
    "P3": "bg-violet-500/15 text-violet-600 dark:text-violet-300",
    "P4": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    "P5": "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
    "P6": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    "P7": "bg-rose-500/15 text-rose-600 dark:text-rose-300",
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
    caseData.status === "Final order" ||
    caseData.status === "Ready to be delivered" ||
    caseData.status === "Ready to Invoice" ||
    caseData.status === "Done";
  const isDelivered =
    caseData.status === "Ready to be delivered" ||
    caseData.status === "Ready to Invoice" ||
    caseData.status === "Done";

  const formatType = (typeStr) => {
    if (!typeStr) return "";
    const parts = typeStr.split(",").map((s) => s.trim()).filter(Boolean);
    const counts = {};
    parts.forEach((p) => { counts[p] = (counts[p] || 0) + 1; });
    return Object.entries(counts)
      .map(([name, count]) => (count > 1 ? `${count}x ${name}` : name))
      .join(", ");
  };

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
    <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl group ${
      overdue
        ? isDelivered
          ? "border border-emerald-500/50 shadow-emerald-500/10"
          : "border border-red-500/50 shadow-red-500/10"
        : delayed
          ? "border border-amber-500/50 shadow-amber-500/10"
          : "border-border/50 hover:border-primary/30"
    }`}>
      {/* Status ribbon */}
      {overdue && (
        <div className={`${isDelivered ? "bg-gradient-to-r from-emerald-600 to-emerald-500" : "bg-gradient-to-r from-red-600 to-red-500"} text-white text-xs font-semibold px-4 py-1.5 flex items-center gap-2`}>
          <span className={`inline-block w-1.5 h-1.5 bg-white rounded-full ${isDelivered ? "" : "animate-pulse"}`} />
          {isDelivered ? "✅ Delivered" : "⚠️ Overdue"}
        </div>
      )}
      {delayed && !overdue && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-400 text-white text-xs font-semibold px-4 py-1.5 flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          ⏰ Due Tomorrow
        </div>
      )}

      <CardContent className="p-0">
        {/* Top section — Clinic header with badges */}
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onFinalize}
              disabled={isFinalized}
              className="shrink-0"
              title="Mark as Finalized"
            >
              <CheckCircle2 className={`size-5 ${isFinalized ? 'text-emerald-500' : 'text-muted-foreground/30 hover:text-emerald-500'} transition-colors`} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base">🏥</span>
                <p className="font-bold text-foreground truncate">{caseData.clinicName}</p>
              </div>
              {caseData.caseCode && (
                <p className="text-xs text-muted-foreground ml-7 font-mono">{caseData.caseCode}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 shrink-0">
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-blue-400/40 text-blue-400">{caseData.caseType}</Badge>
            <Badge className={`text-[10px] px-2 py-0.5 ${phaseColors[phase] || "bg-muted text-foreground"}`}>{phase}</Badge>
            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${
              overdue && !isDelivered ? 'border-red-400/40 text-red-400' : delayed ? 'border-amber-400/40 text-amber-500' : 'border-emerald-400/40 text-emerald-400'
            }`}>{caseData.status}</Badge>
          </div>
        </div>

        {/* Info grid */}
        <div className="px-4 pb-3">
          <div className="rounded-xl bg-muted/40 border border-border/30 p-3 space-y-2">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Stethoscope className="size-3.5 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Doctor</p>
                  <p className="text-foreground font-medium truncate text-sm">{caseData.drName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                  <User className="size-3.5 text-violet-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Patient</p>
                  <p className="text-foreground font-medium truncate text-sm">{caseData.patientName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <DollarSign className="size-3.5 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Price</p>
                  <p className="text-foreground font-medium text-sm">{formatPriceLE(caseData.price)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Calendar className="size-3.5 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Due</p>
                  <p className="text-foreground font-medium text-sm">{caseData.dueDate || caseData.caseRequestDate}</p>
                </div>
              </div>
            </div>

            {/* Type tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1 self-center">🦷</span>
              {formatType(caseData.type).split(", ").map((t, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{t}</span>
              ))}
            </div>

            {/* Teeth / Jaw chips */}
            {Array.isArray(caseData.types) && caseData.types.some((t) => t.toothLabel || t.jawLabel) && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {caseData.types.map((t, i) => {
                  if (t.toothLabel) return (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-medium">
                      <span className="w-4 h-4 rounded-full bg-sky-500 text-white text-[9px] flex items-center justify-center font-bold">{t.toothLabel}</span>
                      {t.name}
                    </span>
                  );
                  if (t.jawLabel) return (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                      🦴 {t.jawLabel} — {t.name}
                    </span>
                  );
                  return null;
                })}
              </div>
            )}

            {balance !== null && (
              <div className="pt-1">
                <span className={`text-xs font-semibold ${balance >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                  Clinic Balance: {formatPriceLE(balance)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 px-4 pb-4">
          <Button size="sm" onClick={onManage} className="gap-1.5 rounded-lg h-8 text-xs">
            <Settings2 className="size-3" /> Manage
          </Button>
          <Button
            size="sm"
            variant="ghost"
            asChild
            className="gap-1.5 rounded-lg h-8 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
          >
            <Link href={`/dashboard/workflow/cases/detail?id=${caseData.id}`} className="inline-flex items-center gap-1.5">
              <Eye className="size-3 shrink-0" />
              View
            </Link>
          </Button>
          {canEdit && (
            <Button size="sm" variant="ghost" asChild className="gap-1.5 rounded-lg h-8 text-xs text-muted-foreground hover:text-foreground">
              <Link href={`/dashboard/workflow/new-case?id=${caseData.id}`}>
                <Pencil className="size-3" /> Edit
              </Link>
            </Button>
          )}
          <div className="flex-1" />
          <Button size="sm" variant="ghost" onClick={onDelete} className="gap-1 rounded-lg h-8 text-xs text-destructive/70 hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="size-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
