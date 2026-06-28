"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, getDocs } from "firebase/firestore";
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

export default function NewCaseForm() {
  const { user } = useAuth();
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
  const [allDoctors, setAllDoctors] = useState([]);
  const [drNames, setDrNames] = useState([]);
  const [deliveryCompanies, setDeliveryCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [types, setTypes] = useState([]);

  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ message: "", isError: false });
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [typePickerIndex, setTypePickerIndex] = useState(null);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    getDocs(collection(db, "Clinics")).then((snap) => {
      setClinics(
        snap.docs
          .map((d) => d.data().name)
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
      setUsers(
        snap.docs
          .map((d) => d.data().name)
          .filter(Boolean)
          .sort(),
      );
    });
    getDocs(collection(db, "Types")).then((snap) => {
      setTypes(
        snap.docs
          .map((d) => ({
            name: d.data().name || "",
            price: typeof d.data().price === "number" ? d.data().price : 0,
          }))
          .filter((t) => t.name)
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    });
  }, []);

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
    if (selectedClinic && selectedDrName) {
      const clinicCode = selectedClinic.substring(0, 3).toUpperCase();
      const drCode = selectedDrName.substring(0, 3).toUpperCase();
      const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
      setCaseCode(`${clinicCode}-${drCode}-${timestamp}`);
    } else {
      setCaseCode("");
    }
  }, [selectedClinic, selectedDrName]);

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
  };

  const submitCase = async (e) => {
    e.preventDefault();
    if (!selectedCaseType) {
      setSnack({ message: "Please select case type", isError: true });
      return;
    }
    if (selectedCaseType === "Physical") {
      if (!selectedClinic || !selectedDrName || !selectedDeliveryCompany) {
        setSnack({ message: "Please fill all required fields", isError: true });
        return;
      }
    } else if (!selectedClinic || !selectedDrName || !selectedUser) {
      setSnack({ message: "Please fill all required fields", isError: true });
      return;
    }
    if (!patientName || !shade || !caseRequestDate || !dueDate) {
      setSnack({ message: "Please fill all required fields", isError: true });
      return;
    }
    if (selectedTypesList.length === 0) {
      setSnack({ message: "Please add at least one type", isError: true });
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const caseData = {
        type: selectedTypesList.map((e) => e.name).join(", "),
        types: selectedTypesList.map((e) => ({ name: e.name, price: e.price })),
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
        status: selectedCaseType === "Physical" ? "Pending delivery" : "Design",
        phase: selectedCaseType === "Physical" ? "Phase 1" : "Phase 2",
        createdDate: formatDate(now),
        createdTime: formatTime(now),
        createdBy: user.uid,
        createdByName: user.name,
      };
      if (selectedCaseType === "Physical")
        caseData.deliveryCompany = selectedDeliveryCompany;
      else caseData.assignedUser = selectedUser;

      await addDoc(collection(db, "Cases"), caseData);
      setSnack({ message: "Case created successfully", isError: false });
      resetForm();
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
      <Header title="New Case" breadcrumbs={[{ label: 'Workflow', href: '/dashboard/workflow/new-case' }]} />
      <PageCard title="New Case" icon="💼">
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
                  <button
                    type="button"
                    disabled={types.length === 0}
                    onClick={() => {
                      setTypePickerIndex(null);
                      setShowTypePicker(true);
                    }}
                    className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
                  >
                    + Add Items
                  </button>
                </div>
                <div className="border rounded-xl p-3 bg-muted">
                  {selectedTypesList.length === 0 ? (
                    <p className="text-muted-foreground py-3">No types added yet</p>
                  ) : (
                    selectedTypesList.map((entry, index) => (
                      <div key={index} className="flex flex-wrap items-center gap-3 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTypePickerIndex(index);
                            setShowTypePicker(true);
                          }}
                          className="flex-1 text-left px-3 py-3 bg-white border rounded-lg text-foreground"
                        >
                          {entry.name || "Select type"}
                        </button>
                        <input
                          type="number"
                          value={entry.price}
                          onChange={(e) =>
                            onEntryPriceChanged(index, e.target.value)
                          }
                          className="w-28 px-2 py-2 border rounded-md text-foreground"
                        />
                        <button
                          type="button"
                          onClick={() => removeTypeRow(index)}
                          className="text-red-500 text-xl"
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
                  <SelectField
                    label="Number of Teeth"
                    value={teethCount}
                    onChange={setTeethCount}
                    options={Array.from({ length: 32 }, (_, i) =>
                      String(i + 1),
                    )}
                  />
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
                      label="Assign to User"
                      value={selectedUser}
                      onChange={setSelectedUser}
                      options={users}
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
                disabled={loading}
                className="mt-6 w-full max-w-md px-6 py-3 bg-primary rounded-lg font-bold flex items-center justify-center gap-2"
                
              >
                {loading ? "Creating..." : "Create Case"}
              </button>
            </>
          )}
        </form>
      </PageCard>

      {showTypePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-xl max-w-md w-full max-h-[70vh] overflow-y-auto p-4">
            <h3 className="font-bold text-foreground mb-3">
              {typePickerIndex !== null ? "Change Type" : "Select Type"}
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
                    if (typePickerIndex !== null)
                      changeTypeEntry(typePickerIndex, type);
                    else addTypeEntry(type);
                    setShowTypePicker(false);
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
              onClick={() => setShowTypePicker(false)}
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
