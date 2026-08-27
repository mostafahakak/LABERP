"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  formatDate,
  formatTime,
  formatPrice,
  formatPriceLE,
} from "@/lib/utils";
import Header from "@/components/layout/Header";
import {
  PageCard,
  TextField,
  SelectField,
  ResponsiveRow,
  Snackbar,
  LoadingOverlay,
} from "@/components/ui/PageComponents";
import DentalChart, { ALL_TEETH } from "@/components/workflow/DentalChart";
import { canEditLockedCase, filterUsersForRole } from "@/lib/phase-utils";

export default function NewCaseForm({ editCaseId }) {
  const { user } = useAuth();
  const router = useRouter();
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );

  const [selectedCaseType, setSelectedCaseType] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [selectedDrName, setSelectedDrName] = useState(null);
  const [selectedDeliveryCompany, setSelectedDeliveryCompany] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTypesList, setSelectedTypesList] = useState([]);
  const [teethCount, setTeethCount] = useState("");

  const [patientName, setPatientName] = useState("");
  const [totalPrice, setTotalPrice] = useState("0");
  const [shade, setShade] = useState("");
  const [notes, setNotes] = useState("");
  const [caseRequestDate, setCaseRequestDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [caseCode, setCaseCode] = useState("");

  const [clinics, setClinics] = useState([]);
  const [clinicDocs, setClinicDocs] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [allCases, setAllCases] = useState([]);
  const [drNames, setDrNames] = useState([]);
  const [deliveryCompanies, setDeliveryCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [allTypes, setAllTypes] = useState([]);

  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ message: "", isError: false });
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [typePickerIndex, setTypePickerIndex] = useState(null);
  // pickerContext: { mode: 'tooth', tooth } | { mode: 'jaw', jaw: 'upper'|'lower' } | null
  const [pickerContext, setPickerContext] = useState(null);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    getDocs(collection(db, "Clinics")).then((snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setClinicDocs(docs);
      setClinics(
        docs
          .map((d) => d.name)
          .filter(Boolean)
          .sort(),
      );
    });
    getDocs(collection(db, "Drs")).then((snap) => {
      setAllDoctors(
        snap.docs
          .map((d) => ({
            name: d.data().name || "",
            clinic: d.data().clinic || "",
          }))
          .filter((d) => d.name),
      );
    });
    getDocs(collection(db, "Delivery")).then((snap) => {
      setDeliveryCompanies(
        snap.docs
          .map((d) => d.data().name)
          .filter(Boolean)
          .sort(),
      );
    });
    getDocs(collection(db, "Users")).then((snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    getDocs(collection(db, "Types")).then((snap) => {
      setAllTypes(
        snap.docs
          .map((d) => ({
            name: d.data().name || "",
            price: typeof d.data().price === "number" ? d.data().price : 0,
          }))
          .filter((t) => t.name)
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    });
    getDocs(collection(db, "Cases")).then((snap) => {
      setAllCases(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Load existing case data when editing
  const isEdit = Boolean(editCaseId);
  const [editCaseData, setEditCaseData] = useState(null);

  useEffect(() => {
    if (!editCaseId) return;
    getDoc(doc(db, "Cases", editCaseId)).then((snap) => {
      if (!snap.exists()) return;
      const data = { id: snap.id, ...snap.data() };
      setEditCaseData(data);
      setSelectedCaseType(data.caseType || null);
      setSelectedClinic(data.clinicName || null);
      setSelectedDrName(data.drName || null);
      setSelectedDeliveryCompany(data.deliveryCompany || null);
      setSelectedUser(data.assignedUser || null);
      setPatientName(data.patientName || "");
      setShade(data.shade || "");
      setNotes(data.notes || "");
      setCaseRequestDate(data.caseRequestDate || "");
      setDueDate(data.dueDate || "");
      setCaseCode(data.caseCode || "");
      if (Array.isArray(data.types) && data.types.length > 0) {
        setSelectedTypesList(data.types);
        const sum = data.types.reduce((s, e) => s + (Number(e.price) || 0), 0);
        setTotalPrice(formatPrice(sum));
        setTeethCount(String(
          data.types.filter((e) => e.toothId)
            .map((e) => e.toothId)
            .filter((v, i, a) => a.indexOf(v) === i).length
        ));
      } else {
        setTotalPrice(String(data.price || 0));
      }
    });
  }, [editCaseId]);

  const designUsers = useMemo(
    () => filterUsersForRole(users, "Design").map((u) => u.name),
    [users],
  );
  const editLocked = isEdit && !canEditLockedCase(user?.type, editCaseData?.status);

  // Derive effective types: use clinic-specific prices when a clinic is selected
  const types = allTypes.map((t) => {
    if (!selectedClinic) return t;
    const clinicDoc = clinicDocs.find((c) => c.name === selectedClinic);
    if (clinicDoc?.customPrices && clinicDoc.customPrices[t.name] !== undefined) {
      return { ...t, price: clinicDoc.customPrices[t.name] };
    }
    return t;
  });

  useEffect(() => {
    if (selectedClinic) {
      const filtered = allDoctors
        .filter((d) => d.clinic === selectedClinic)
        .map((d) => d.name)
        .sort();
      setDrNames(filtered);
      if (selectedDrName && !filtered.includes(selectedDrName))
        setSelectedDrName(null);
    } else {
      setDrNames([]);
    }
  }, [selectedClinic, allDoctors, selectedDrName]);

  useEffect(() => {
    if (!selectedClinic || !selectedDrName) {
      setCaseCode("");
      return;
    }

    const clinicNum = (clinics.indexOf(selectedClinic) + 1).toString().padStart(2, "0");
    const drNum = (drNames.indexOf(selectedDrName) + 1).toString().padStart(2, "0");
    const prefix = `${clinicNum}-${drNum}-`;

    const maxCaseNumFromCodes = allCases.reduce((maxNum, c) => {
      if (typeof c.caseCode !== "string" || !c.caseCode.startsWith(prefix)) return maxNum;
      const lastPart = c.caseCode.slice(prefix.length);
      const parsed = parseInt(lastPart, 10);
      return Number.isFinite(parsed) ? Math.max(maxNum, parsed) : maxNum;
    }, 0);

    const sameClinicDoctorCount = allCases.filter(
      (c) => c.clinicName === selectedClinic && c.drName === selectedDrName,
    ).length;

    const nextCaseNum = Math.max(maxCaseNumFromCodes, sameClinicDoctorCount) + 1;
    setCaseCode(`${clinicNum}-${drNum}-${String(nextCaseNum).padStart(3, "0")}`);
  }, [selectedClinic, selectedDrName, clinics, drNames, allCases]);

  const updateTotalPrice = (list) => {
    const sum = list.reduce((prev, el) => prev + (Number(el.price) || 0), 0);
    setTotalPrice(formatPrice(sum));
  };

  const addTypeEntry = (type) => {
    const newList = [
      ...selectedTypesList,
      { name: type.name, price: type.price },
    ];
    setSelectedTypesList(newList);
    updateTotalPrice(newList);
  };

  const removeTypeRow = (index) => {
    const newList = selectedTypesList.filter((_, i) => i !== index);
    setSelectedTypesList(newList);
    updateTotalPrice(newList);
  };

  const changeTypeEntry = (index, type) => {
    const newList = [...selectedTypesList];
    newList[index] = { ...newList[index], name: type.name, price: type.price };
    setSelectedTypesList(newList);
    updateTotalPrice(newList);
  };

  const onEntryPriceChanged = (index, value) => {
    const newList = [...selectedTypesList];
    newList[index] = { ...newList[index], price: parseFloat(value) || 0 };
    setSelectedTypesList(newList);
    updateTotalPrice(newList);
  };

  // Derive selectedTeeth from selectedTypesList entries that have toothId
  const selectedTeeth = selectedTypesList
    .filter((e) => e.toothId)
    .map((e) => ALL_TEETH.find((t) => t.id === e.toothId))
    .filter(Boolean)
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);

  const selectedJaws = selectedTypesList
    .filter((e) => e.jaw)
    .map((e) => e.jaw)
    .filter((jaw, i, arr) => arr.indexOf(jaw) === i);

  const resetForm = () => {
    setSelectedCaseType(null);
    setSelectedClinic(null);
    setSelectedDrName(null);
    setSelectedDeliveryCompany(null);
    setSelectedUser(null);
    setSelectedTypesList([]);
    setTotalPrice("0");
    setPatientName("");
    setShade("");
    setNotes("");
    setCaseRequestDate("");
    setDueDate("");
    setTeethCount("");
    setCaseCode("");
    setPickerContext(null);
  };

  const handleToothClick = (tooth) => {
    setPickerContext({ mode: "tooth", tooth });
    setTypePickerIndex(null);
    setShowTypePicker(true);
  };

  const handleJawClick = (jaw) => {
    setPickerContext({ mode: "jaw", jaw });
    setTypePickerIndex(null);
    setShowTypePicker(true);
  };

  const addTypeForContext = (type) => {
    let newEntries = [];
    if (pickerContext?.mode === "tooth") {
      newEntries = [{
        name: type.name,
        price: type.price,
        toothId: pickerContext.tooth.id,
        toothLabel: pickerContext.tooth.label,
      }];
    } else if (pickerContext?.mode === "jaw") {
      const jawLabel = pickerContext.jaw === "upper" ? "Upper Jaw" : "Lower Jaw";
      newEntries = [{
        name: type.name,
        price: type.price,
        jaw: pickerContext.jaw,
        jawLabel,
      }];
    } else {
      // Fallback: no tooth/jaw context (manual add from list)
      newEntries = [{ name: type.name, price: type.price }];
    }
    const newList = [...selectedTypesList, ...newEntries];
    setSelectedTypesList(newList);
    updateTotalPrice(newList);
    setTeethCount(String(
      newList.filter((e) => e.toothId)
        .map((e) => e.toothId)
        .filter((v, i, a) => a.indexOf(v) === i).length
    ));
  };

  const submitCase = async (e) => {
    e.preventDefault();
    const missingFields = [];

    if (!selectedCaseType) missingFields.push("Case Type");
    if (!selectedClinic) missingFields.push("Clinic Name");
    if (!selectedDrName) missingFields.push("Dr Name");
    if (!patientName.trim()) missingFields.push("Patient Name");
    if (!shade.trim()) missingFields.push("Shade");
    if (!caseRequestDate) missingFields.push("Arrival Date");
    if (!dueDate) missingFields.push("Due Date");
    if (selectedTypesList.length === 0) missingFields.push("At least one Type selection");

    if (selectedCaseType === "Physical") {
      if (!selectedDeliveryCompany) missingFields.push("Delivery Company");
    } else if (selectedCaseType === "Digital") {
      if (!selectedUser) missingFields.push("Assign to User");
    }

    if (missingFields.length > 0) {
      setSnack({
        message: `Missing required fields: ${missingFields.join(", ")}. Notes is optional.`,
        isError: true,
      });
      return;
    }

    if (editLocked) {
      setSnack({
        message: "Only Admin or Moderator can edit this case now.",
        isError: true,
      });
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const caseData = {
        type: selectedTypesList.map((e) => e.name).join(", "),
        types: selectedTypesList.map((e) => {
          const entry = { name: e.name, price: e.price };
          if (e.toothId) { entry.toothId = e.toothId; entry.toothLabel = e.toothLabel; }
          if (e.jaw) { entry.jaw = e.jaw; entry.jawLabel = e.jawLabel; }
          return entry;
        }),
        caseType: selectedCaseType,
        clinicName: selectedClinic,
        drName: selectedDrName,
        patientName,
        price: parseFloat(totalPrice) || 0,
        shade,
        teethCount: parseInt(teethCount, 10) || 0,
        caseCode,
        caseRequestDate,
        dueDate,
        notes,
      };
      if (selectedCaseType === "Physical")
        caseData.deliveryCompany = selectedDeliveryCompany;
      else caseData.assignedUser = selectedUser;

      if (isEdit) {
        caseData.isEdited = true;
        await updateDoc(doc(db, "Cases", editCaseId), caseData);

        await addDoc(collection(db, "CasesTrack"), {
          action: "Edit Case",
          caseUID: editCaseId,
          clinicName: selectedClinic,
          date: formatDate(now),
          time: formatTime(now),
          adminName: user?.name || "",
          adminID: user?.uid || "",
          status: editCaseData?.status || "",
          phase: editCaseData?.phase || "",
        });

        setSnack({ message: "Case updated successfully", isError: false });
        setTimeout(() => router.push("/dashboard/workflow/view-cases"), 800);
      } else {
        caseData.status = selectedCaseType === "Physical" ? "Physical" : "Design";
        caseData.phase = selectedCaseType === "Physical" ? "P1" : "P2";
        caseData.createdDate = formatDate(now);
        caseData.createdTime = formatTime(now);
        caseData.createdBy = user.uid;
        caseData.createdByName = user.name;

        await addDoc(collection(db, "Cases"), caseData);
        setSnack({ message: "Case created successfully", isError: false });
        resetForm();
      }
    } catch (err) {
      setSnack({
        message: `Error creating case: ${err.message}`,
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title={isEdit ? "Edit Case" : "New Case"} breadcrumbs={[{ label: 'Workflow', href: '/dashboard/workflow/new-case' }]} />
      <PageCard title={isEdit ? "Edit Case" : "New Case"} icon="??">
        {editLocked && (
          <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Only Admin or Moderator can edit a case after it is ready to be delivered or invoiced.
          </p>
        )}
        <form onSubmit={submitCase}>
          <ResponsiveRow width={width}>
            <SelectField
              label="Case Type"
              value={selectedCaseType}
              onChange={(val) => {
                setSelectedCaseType(val);
                if (val === "Physical") setSelectedUser(null);
                else setSelectedDeliveryCompany(null);
              }}
              options={["Physical", "Digital"]}
            />
          </ResponsiveRow>

          {selectedCaseType && (
            <>
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground">
                    Selected Types
                  </span>
                </div>
                <div className="border rounded-xl p-3 bg-muted">
                  {selectedTypesList.length === 0 ? (
                    <p className="text-muted-foreground py-3">No types added yet — click a tooth or jaw to add items</p>
                  ) : (
                    selectedTypesList.map((entry, index) => (
                      <div key={index} className="flex flex-wrap items-center gap-2 py-2 border-b border-border/40 last:border-b-0">
                        {entry.toothLabel && (
                          <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white text-xs font-bold">
                            {entry.toothLabel}
                          </span>
                        )}
                        {!entry.toothLabel && entry.jawLabel && (
                          <span className="shrink-0 inline-flex items-center justify-center px-3 h-10 rounded-full bg-blue-500 text-white text-xs font-semibold">
                            {entry.jawLabel}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setPickerContext(null);
                            setTypePickerIndex(index);
                            setShowTypePicker(true);
                          }}
                          className="flex-1 text-left px-3 py-2.5 bg-card border rounded-lg text-foreground text-sm"
                        >
                          {entry.name || "Select type"}
                        </button>
                        <input
                          type="number"
                          value={entry.price}
                          onChange={(e) =>
                            onEntryPriceChanged(index, e.target.value)
                          }
                          className="w-24 px-2 py-2 border rounded-md text-foreground text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeTypeRow(index)}
                          className="text-red-500 text-xl leading-none"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                  <div className="text-right font-semibold text-foreground mt-2">
                    Total: {totalPrice} LE
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <ResponsiveRow width={width}>
                  <SelectField
                    label="Clinic Name"
                    value={selectedClinic}
                    onChange={setSelectedClinic}
                    options={clinics}
                  />
                  {selectedClinic && (
                    <SelectField
                      label="Dr Name"
                      value={selectedDrName}
                      onChange={setSelectedDrName}
                      options={drNames}
                    />
                  )}
                </ResponsiveRow>
                {caseCode && (
                  <div className="px-3 py-2 bg-muted rounded-md text-sm text-foreground">
                    <strong>Case Code:</strong> {caseCode}
                  </div>
                )}
                <ResponsiveRow width={width}>
                  <div className="w-full col-span-full">
                    <label className="text-muted-foreground text-sm font-medium mb-2 block">
                      Select Teeth ({selectedTeeth.length} selected)
                    </label>
                    <div className="border rounded-xl p-4 bg-muted/30">
                      <DentalChart
                        selectedTeeth={selectedTeeth}
                        selectedJaws={selectedJaws}
                        onToothClick={handleToothClick}
                        onJawClick={handleJawClick}
                      />
                    </div>
                  </div>
                </ResponsiveRow>
                <ResponsiveRow width={width}>
                  <TextField
                    label="Patient Name"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                  />
                  <TextField
                    label="Shade"
                    value={shade}
                    onChange={(e) => setShade(e.target.value)}
                  />
                </ResponsiveRow>
                <ResponsiveRow width={width}>
                  <TextField label="Total Price" value={totalPrice} readOnly />
                  <TextField
                    label="Arrival Date"
                    type="date"
                    value={caseRequestDate}
                    onChange={(e) => setCaseRequestDate(e.target.value)}
                  />
                  <TextField
                    label="Due Date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </ResponsiveRow>
                <ResponsiveRow width={width}>
                  {selectedCaseType === "Physical" ? (
                    <SelectField
                      label="Delivery Company"
                      value={selectedDeliveryCompany}
                      onChange={setSelectedDeliveryCompany}
                      options={deliveryCompanies}
                    />
                  ) : (
                    <SelectField
                      label="Assign to Designer"
                      value={selectedUser}
                      onChange={setSelectedUser}
                      options={designUsers}
                    />
                  )}
                </ResponsiveRow>
                <TextField
                  label="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  required={false}
                  maxLines={3}
                />
              </div>

              <button
                type="submit"
                disabled={loading || editLocked}
                className="mt-6 w-full max-w-md px-6 py-3 bg-primary rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                
              >
                {loading ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : "Create Case")}
              </button>
            </>
          )}
        </form>
      </PageCard>

      {showTypePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-xl max-w-md w-full max-h-[70vh] overflow-y-auto p-4">
            <h3 className="font-bold text-foreground mb-3">
              {typePickerIndex !== null
                ? "Change Type"
                : pickerContext?.mode === "tooth"
                  ? `Select Type for Tooth #${pickerContext.tooth.label}`
                  : pickerContext?.mode === "jaw"
                    ? `Select Type for ${pickerContext.jaw === "upper" ? "Upper Jaw" : "Lower Jaw"}`
                    : "Select Type"}
            </h3>
            {types.length === 0 ? (
              <p className="text-foreground">
                Please add types first in the Types section.
              </p>
            ) : (
              types.map((type) => (
                <button
                  key={type.name}
                  type="button"
                  onClick={() => {
                    if (typePickerIndex !== null) {
                      changeTypeEntry(typePickerIndex, type);
                    } else {
                      addTypeForContext(type);
                    }
                    setShowTypePicker(false);
                    setPickerContext(null);
                  }}
                  className="w-full flex justify-between px-4 py-3 hover:bg-muted text-foreground border-b"
                >
                  <span>{type.name}</span>
                  <span className="text-muted-foreground">
                    {formatPriceLE(type.price)}
                  </span>
                </button>
              ))
            )}
            <button
              type="button"
              onClick={() => {
                setShowTypePicker(false);
                setPickerContext(null);
              }}
              className="mt-4 w-full py-2 border rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <Snackbar
        message={snack.message}
        isError={snack.isError}
        onClose={() => setSnack({ message: "", isError: false })}
      />
      <LoadingOverlay show={loading} />
    </>
  );
}
