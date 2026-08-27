"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatTime } from "@/lib/utils";

export default function EditCaseDialog({ caseId, caseData, onClose, onSuccess }) {
  const { user } = useAuth();
  const [clinics, setClinics] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);

  const [clinicName, setClinicName] = useState(caseData.clinicName || "");
  const [drName, setDrName] = useState(caseData.drName || "");
  const [patientName, setPatientName] = useState(caseData.patientName || "");
  const [caseCode, setCaseCode] = useState(caseData.caseCode || "");
  const [caseRequestDate, setCaseRequestDate] = useState(caseData.caseRequestDate || "");
  const [dueDate, setDueDate] = useState(caseData.dueDate || "");
  const [shade, setShade] = useState(caseData.shade || "");
  const [price, setPrice] = useState(String(caseData.price || 0));
  const [notes, setNotes] = useState(caseData.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  const save = async () => {
    setError("");

    if (!clinicName || !drName || !patientName.trim() || !caseRequestDate || !dueDate) {
      setError("Please fill all required fields");
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
        status: caseData.status || "",
        phase: caseData.phase || "",
      });

      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e.message || "Failed to update case");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h3 className="text-xl font-bold text-foreground mb-4">Edit Case</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1 text-foreground">Clinic Name *</label>
            <select
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              className="w-full border rounded-md p-2 text-foreground"
            >
              <option value="">Select clinic</option>
              {clinics.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1 text-foreground">Doctor Name *</label>
            <select
              value={drName}
              onChange={(e) => setDrName(e.target.value)}
              className="w-full border rounded-md p-2 text-foreground"
            >
              <option value="">Select doctor</option>
              {doctorOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1 text-foreground">Patient Name *</label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full border rounded-md p-2 text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-foreground">Case Code</label>
            <input
              type="text"
              value={caseCode}
              onChange={(e) => setCaseCode(e.target.value)}
              className="w-full border rounded-md p-2 text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-foreground">Arrival Date *</label>
            <input
              type="date"
              value={caseRequestDate}
              onChange={(e) => setCaseRequestDate(e.target.value)}
              className="w-full border rounded-md p-2 text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-foreground">Due Date *</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border rounded-md p-2 text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-foreground">Shade</label>
            <input
              type="text"
              value={shade}
              onChange={(e) => setShade(e.target.value)}
              className="w-full border rounded-md p-2 text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-foreground">Price</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full border rounded-md p-2 text-foreground"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm mb-1 text-foreground">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border rounded-md p-2 text-foreground"
            />
          </div>
        </div>

        {error && <p className="text-destructive text-sm mt-3">{error}</p>}

        <div className="flex flex-wrap gap-2 mt-6 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md" disabled={saving}>
            Cancel
          </button>
          <button type="button" onClick={save} className="px-4 py-2 rounded-md bg-primary text-primary-foreground" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
