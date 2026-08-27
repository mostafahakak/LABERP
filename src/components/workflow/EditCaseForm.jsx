"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatTime } from "@/lib/utils";
import Header from "@/components/layout/Header";
import {
  PageCard,
  TextField,
  SelectField,
  ResponsiveRow,
  Snackbar,
  LoadingOverlay,
} from "@/components/ui/PageComponents";
import { DetailSkeleton } from "@/components/ui/PageSkeleton";
import { canEditLockedCase } from "@/lib/phase-utils";

export default function EditCaseForm({ caseId }) {
  const { user } = useAuth();
  const router = useRouter();

  const [caseData, setCaseData] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  const [clinics, setClinics] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);

  const [clinicName, setClinicName] = useState("");
  const [drName, setDrName] = useState("");
  const [patientName, setPatientName] = useState("");
  const [caseCode, setCaseCode] = useState("");
  const [caseRequestDate, setCaseRequestDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [shade, setShade] = useState("");
  const [price, setPrice] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ message: "", isError: false });

  useEffect(() => {
    getDoc(doc(db, "Cases", caseId)).then((snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setCaseData(data);
        setClinicName(data.clinicName || "");
        setDrName(data.drName || "");
        setPatientName(data.patientName || "");
        setCaseCode(data.caseCode || "");
        setCaseRequestDate(data.caseRequestDate || "");
        setDueDate(data.dueDate || "");
        setShade(data.shade || "");
        setPrice(String(data.price || 0));
        setNotes(data.notes || "");
      }
      setPageLoading(false);
    });
  }, [caseId]);

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, "Clinics")),
      getDocs(collection(db, "Drs")),
    ]).then(([clinicsSnap, drsSnap]) => {
      setClinics(
        clinicsSnap.docs
          .map((d) => d.data().name)
          .filter(Boolean)
          .sort(),
      );
      setAllDoctors(
        drsSnap.docs
          .map((d) => ({
            name: d.data().name || "",
            clinic: d.data().clinic || "",
          }))
          .filter((d) => d.name),
      );
    });
  }, []);

  const doctorOptions = useMemo(() => {
    const list = allDoctors
      .filter((d) => !clinicName || d.clinic === clinicName)
      .map((d) => d.name)
      .filter(Boolean);
    return [...new Set(list)].sort((a, b) => a.localeCompare(b));
  }, [allDoctors, clinicName]);

  useEffect(() => {
    if (drName && !doctorOptions.includes(drName)) {
      setDrName("");
    }
  }, [doctorOptions, drName]);

  const editLocked = !canEditLockedCase(user?.type, caseData?.status);

  const save = async () => {
    if (editLocked) {
      setSnack({ message: "Only Admin or Moderator can edit this case now.", isError: true });
      return;
    }
    if (!clinicName || !drName || !patientName.trim() || !caseRequestDate || !dueDate) {
      setSnack({ message: "Please fill all required fields", isError: true });
      return;
    }

    setSaving(true);
    try {
      const parsedPrice = parseFloat(price) || 0;
      const nextData = {
        clinicName,
        drName,
        patientName: patientName.trim(),
        caseCode: caseCode.trim(),
        caseRequestDate,
        dueDate,
        shade: shade.trim(),
        price: parsedPrice,
        notes: notes.trim(),
        isEdited: true,
      };

      await updateDoc(doc(db, "Cases", caseId), nextData);

      await addDoc(collection(db, "CasesTrack"), {
        action: "Edit Case",
        caseUID: caseId,
        clinicName,
        date: formatDate(new Date()),
        time: formatTime(new Date()),
        adminName: user?.name || "",
        adminID: user?.uid || "",
        status: caseData?.status || "",
        phase: caseData?.phase || "",
      });

      setSnack({ message: "Case updated successfully", isError: false });
      setTimeout(() => router.push("/dashboard/workflow/view-cases"), 1200);
    } catch (e) {
      setSnack({ message: e.message || "Failed to update case", isError: true });
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) return <DetailSkeleton />;
  if (!caseData) return <div className="p-8 text-center text-foreground">Case not found</div>;

  return (
    <>
      <Header
        title="Edit Case"
        breadcrumbs={[
          { label: "View Cases", href: "/dashboard/workflow/view-cases" },
        ]}
      />

      {editLocked && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Only Admin or Moderator can edit a case after it is ready to be delivered or invoiced.
        </p>
      )}
      <PageCard title="Edit Case Details">
        <ResponsiveRow>
          <SelectField
            label="Clinic Name *"
            value={clinicName}
            onChange={setClinicName}
            options={clinics}
            placeholder="Select clinic"
          />
          <SelectField
            label="Doctor Name *"
            value={drName}
            onChange={setDrName}
            options={doctorOptions}
            placeholder="Select doctor"
          />
        </ResponsiveRow>

        <ResponsiveRow>
          <TextField
            label="Patient Name *"
            value={patientName}
            onChange={setPatientName}
          />
          <TextField
            label="Case Code"
            value={caseCode}
            onChange={setCaseCode}
          />
        </ResponsiveRow>

        <ResponsiveRow>
          <TextField
            label="Arrival Date *"
            type="date"
            value={caseRequestDate}
            onChange={setCaseRequestDate}
          />
          <TextField
            label="Due Date *"
            type="date"
            value={dueDate}
            onChange={setDueDate}
          />
        </ResponsiveRow>

        <ResponsiveRow>
          <TextField label="Shade" value={shade} onChange={setShade} />
          <TextField
            label="Price"
            type="number"
            value={price}
            onChange={setPrice}
          />
        </ResponsiveRow>

        <TextField
          label="Notes"
          value={notes}
          onChange={setNotes}
          multiline
          rows={3}
        />

        <div className="flex flex-wrap gap-3 mt-6 justify-end">
          <button
            type="button"
            onClick={() => router.push("/dashboard/workflow/view-cases")}
            className="px-4 py-2 border rounded-md text-foreground"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
            disabled={saving || editLocked}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </PageCard>

      {saving && <LoadingOverlay />}
      <Snackbar
        message={snack.message}
        isError={snack.isError}
        onClose={() => setSnack({ message: "", isError: false })}
      />
    </>
  );
}
