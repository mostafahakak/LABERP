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
  const [currentPage, setCurrentPage] = useState(1);
  const [viewTab, setViewTab] = useState("All");
  const PAGE_SIZE = 40;

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
        setLoading(false);
      },
      (err) => { setSnack({ message: err.message, isError: true }); setLoading(false); },
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
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      docs = docs.filter((c) =>
        (c.caseCode || "").toLowerCase().includes(q) ||
        (c.clinicName || "").toLowerCase().includes(q) ||
        (c.patientName || "").toLowerCase().includes(q) ||
        (c.drName || "").toLowerCase().includes(q)
      );
    }
    return docs;
  }, [allCases, selectedClinic, selectedTypeSafe, selectedDrNameSafe, selectedStatusSafe, selectedDate, dueFilter, searchQuery]);

  const isDeliveredCase = (c) => c.status === "Ready to be delivered" || c.status === "Ready to Invoice" || c.status === "Done";
  const isOverdueNotDelivered = (c) => isOverdue(c) && !isDeliveredCase(c);

  const tabbedCases = useMemo(() => {
    if (viewTab === "Overdue") return cases.filter((c) => isOverdueNotDelivered(c));
    if (viewTab === "Delivered") return cases.filter((c) => isDeliveredCase(c));
    if (viewTab === "Edited") return cases.filter((c) => !!c.isEdited);
    if (viewTab === "Delayed") return cases.filter((c) => isDelayed(c) && !isOverdue(c) && !isDeliveredCase(c));
    if (viewTab === "Delivered+Edited") return cases.filter((c) => isDeliveredCase(c) && !!c.isEdited);
    if (viewTab === "Overdue+Edited") return cases.filter((c) => isOverdueNotDelivered(c) && !!c.isEdited);
    return cases;
  }, [cases, viewTab]);

  const overdueCount = useMemo(() => cases.filter((c) => isOverdueNotDelivered(c)).length, [cases]);
  const deliveredCount = useMemo(() => cases.filter((c) => isDeliveredCase(c)).length, [cases]);
  const editedCount = useMemo(() => cases.filter((c) => !!c.isEdited).length, [cases]);
  const delayedCount = useMemo(() => cases.filter((c) => isDelayed(c) && !isOverdue(c) && !isDeliveredCase(c)).length, [cases]);
  const deliveredEditedCount = useMemo(() => cases.filter((c) => isDeliveredCase(c) && !!c.isEdited).length, [cases]);
  const overdueEditedCount = useMemo(() => cases.filter((c) => isOverdueNotDelivered(c) && !!c.isEdited).length, [cases]);

  const totalPages = Math.max(1, Math.ceil(tabbedCases.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCases = tabbedCases.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);

  useEffect(() => { setCurrentPage(1); }, [selectedClinic, selectedTypeSafe, selectedDrNameSafe, selectedStatusSafe, selectedDate, dueFilter, searchQuery, viewTab]);

  const clearFilters = () => {
    setSelectedClinic(null);
    setSelectedType(null);
    setSelectedDrName(null);
    setSelectedStatus(null);
    setSelectedDate("");
    setDueFilter("All");
    setSearchQuery("");
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

  const getStatusColor = (status) => {
    const s = normalizeStatus(status);
    if (s.includes("done") || s.includes("ready to invoice")) return "text-emerald-600 bg-emerald-500/10 border-emerald-500/20";
    if (s.includes("ready") || s.includes("delivered")) return "text-sky-600 bg-sky-500/10 border-sky-500/20";
    if (s.includes("final") || s.includes("finishing")) return "text-amber-600 bg-amber-500/10 border-amber-500/20";
    return "text-foreground bg-muted border-border";
  };

  return (
    <>
      <Header title="View Cases" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by code, clinic, patient, or doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{cases.length} cases</span>
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="gap-1.5 rounded-xl text-xs"
          >
            <X className="size-3" /> Clear
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openDeleteAllDialog}
            disabled={bulkDeleting}
            className="gap-1.5 rounded-xl text-xs border-destructive/30 text-destructive hover:text-destructive"
          >
            <Trash2 className="size-3" /> Remove All
          </Button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Clinic</label>
          <select value={selectedClinic || "All"} onChange={(e) => setSelectedClinic(e.target.value === "All" ? null : e.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground">
            {withAllOption(clinicOptions).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Type</label>
          <select value={selectedTypeSafe || "All"} onChange={(e) => setSelectedType(e.target.value === "All" ? null : e.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground">
            {withAllOption(typeOptions).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Doctor</label>
          <select value={selectedDrNameSafe || "All"} onChange={(e) => setSelectedDrName(e.target.value === "All" ? null : e.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground">
            {withAllOption(drOptions).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Status</label>
          <select value={selectedStatusSafe || "All"} onChange={(e) => setSelectedStatus(e.target.value === "All" ? null : e.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground">
            {withAllOption(statusOptions).map((s) => <option key={s} value={s}>{s === "All" ? "All" : statusLabel(s)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Due Status</label>
          <select value={dueFilter} onChange={(e) => setDueFilter(e.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground">
            <option value="All">All</option>
            <option value="Delayed">Delayed</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Date Arrival</label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground" />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setViewTab("All")} className={`px-4 py-2 rounded-xl text-sm font-medium border ${viewTab === "All" ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-muted"}`}>
          All ({cases.length})
        </button>
        <button type="button" onClick={() => setViewTab("Overdue")} className={`px-4 py-2 rounded-xl text-sm font-medium border ${viewTab === "Overdue" ? "bg-red-600 text-white border-red-600" : "border-red-300 text-red-600 hover:bg-red-50"}`}>
          Overdue ({overdueCount})
        </button>
        <button type="button" onClick={() => setViewTab("Delivered")} className={`px-4 py-2 rounded-xl text-sm font-medium border ${viewTab === "Delivered" ? "bg-emerald-600 text-white border-emerald-600" : "border-emerald-300 text-emerald-600 hover:bg-emerald-50"}`}>
          Delivered ({deliveredCount})
        </button>
        <button type="button" onClick={() => setViewTab("Edited")} className={`px-4 py-2 rounded-xl text-sm font-medium border ${viewTab === "Edited" ? "bg-yellow-500 text-white border-yellow-500" : "border-yellow-400 text-yellow-600 hover:bg-yellow-50"}`}>
          Edited ({editedCount})
        </button>
        <button type="button" onClick={() => setViewTab("Delivered+Edited")} className={`px-4 py-2 rounded-xl text-sm font-medium border ${viewTab === "Delivered+Edited" ? "bg-emerald-600 text-white border-emerald-600" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}>
          Delivered & Edited ({deliveredEditedCount})
        </button>
        <button type="button" onClick={() => setViewTab("Overdue+Edited")} className={`px-4 py-2 rounded-xl text-sm font-medium border ${viewTab === "Overdue+Edited" ? "bg-red-600 text-white border-red-600" : "border-red-300 text-red-600 hover:bg-red-50"}`}>
          Overdue & Edited ({overdueEditedCount})
        </button>
        <button type="button" onClick={() => setViewTab("Delayed")} className={`px-4 py-2 rounded-xl text-sm font-medium border ${viewTab === "Delayed" ? "bg-blue-900 text-white border-blue-900" : "border-blue-800 text-blue-800 hover:bg-blue-50"}`}>
          Delayed ({delayedCount})
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-xs">
        <span className="text-muted-foreground font-medium">Legend:</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-3 rounded-sm bg-red-500/30" /> Overdue</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-3 rounded-sm bg-emerald-500/30" /> Delivered</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-3 rounded-sm bg-yellow-400/40" /> Edited</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-3 rounded-sm" style={{ background: 'linear-gradient(to right, rgb(250 204 21 / 0.4) 50%, rgb(34 197 94 / 0.4) 50%)' }} /> Delivered & Edited</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-3 rounded-sm" style={{ background: 'linear-gradient(to right, rgb(250 204 21 / 0.4) 50%, rgb(239 68 68 / 0.4) 50%)' }} /> Overdue & Edited</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-3 rounded-sm bg-blue-900" /> Delayed</span>
      </div>

      {loading ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="animate-pulse">
            <div className="bg-secondary/60 h-11" />
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-t border-border/50">
                <div className="h-4 w-16 rounded bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-4 w-16 rounded bg-muted" />
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-6 w-16 rounded-full bg-muted" />
                <div className="flex-1" />
                <div className="h-7 w-20 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ) : cases.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground rounded-2xl border border-dashed border-border bg-card">
          <p className="text-3xl mb-2">📋</p>
          <p>No cases found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-secondary text-secondary-foreground">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Clinic</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Doctor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Due</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginatedCases.map((c, idx) => {
                  const delayed = isDelayed(c);
                  const overdue = isOverdue(c);
                  const isDelivered = c.status === "Ready to be delivered" || c.status === "Ready to Invoice" || c.status === "Done";
                  const isEdited = !!c.isEdited;
                  const phase = c.phase || getPhaseInfo(c).currentPhase;
                  const rowBg = isEdited && overdue && !isDelivered
                    ? "[background:linear-gradient(to_right,rgb(250_204_21/0.4)_50%,rgb(239_68_68/0.4)_50%)]"
                    : isEdited && isDelivered
                      ? "[background:linear-gradient(to_right,rgb(250_204_21/0.4)_50%,rgb(34_197_94/0.4)_50%)]"
                      : isEdited
                      ? "bg-yellow-400/30 hover:bg-yellow-400/40"
                      : overdue && !isDelivered
                        ? "bg-red-500/25 hover:bg-red-500/35"
                        : isDelivered
                          ? "bg-emerald-500/25 hover:bg-emerald-500/35"
                          : delayed
                            ? "bg-blue-900 text-white hover:bg-blue-800"
                            : idx % 2 === 0 ? "bg-card hover:bg-primary/5" : "bg-muted/30 hover:bg-primary/5";

                  return (
                    <tr key={c.id} className={`group ${rowBg}`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-block rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-black dark:text-white">{c.caseCode || "—"}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-block rounded-md bg-blue-500/10 px-2 py-0.5 text-sm font-semibold text-black dark:text-white">{c.clinicName || "—"}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-block rounded-md bg-violet-500/10 px-2 py-0.5 text-sm text-black dark:text-white">{c.drName || "—"}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-block rounded-md bg-sky-500/10 px-2 py-0.5 text-sm text-black dark:text-white">{c.patientName || "—"}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-block rounded-md bg-emerald-500/10 px-2 py-0.5 text-sm font-medium text-black dark:text-white">{formatPriceLE(c.price)}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-block rounded-md bg-orange-500/10 px-2 py-0.5 text-sm text-black dark:text-white">
                          {c.dueDate || "—"}
                          {overdue && !isDelivered && <span className="ml-1 text-red-500 text-[10px]">⚠</span>}
                          {delayed && !overdue && <span className="ml-1 text-amber-500 text-[10px]">⏰</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusColor(c.status)}`}>
                          {phase} · {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button type="button" onClick={() => setManageCase(c)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary" title="Manage">
                            <Settings2 className="size-3.5" />
                          </button>
                          <Link href={`/dashboard/workflow/cases/detail?id=${c.id}`} className="p-1.5 rounded-lg hover:bg-sky-500/10 text-sky-500" title="View">
                            <Eye className="size-3.5" />
                          </Link>
                          {canEditLockedCase(user?.type, c.status) && (
                            <Link href={`/dashboard/workflow/new-case?id=${c.id}`} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title="Edit">
                              <Pencil className="size-3.5" />
                            </Link>
                          )}
                          <button type="button" onClick={() => openDeleteCaseDialog(c)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive" title="Delete">
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2.5">
            <span className="text-xs text-muted-foreground">
              Showing {(safeCurrentPage - 1) * PAGE_SIZE + 1}–{Math.min(safeCurrentPage * PAGE_SIZE, tabbedCases.length)} of {tabbedCases.length} cases
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-2.5 py-1 rounded-lg border border-border text-xs font-medium text-foreground disabled:opacity-40"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 2)
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`dot-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                        p === safeCurrentPage
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-2.5 py-1 rounded-lg border border-border text-xs font-medium text-foreground disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

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
