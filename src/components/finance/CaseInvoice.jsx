"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatPriceLE, formatTime } from "@/lib/utils";
import Header from "@/components/layout/Header";
import {
  PageCard,
  TextField,
  SelectField,
  Snackbar,
  LoadingOverlay,
} from "@/components/ui/PageComponents";
import { calcCardFee, calcNetAmountToBank } from "./finance-helpers";

export default function CaseInvoice() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [allCases, setAllCases] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [banks, setBanks] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [previousInvoices, setPreviousInvoices] = useState([]);
  const [hasCheckedOldBills, setHasCheckedOldBills] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState([]);
  const [clinicName, setClinicName] = useState("");
  const [drFilter, setDrFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [paymentPlan, setPaymentPlan] = useState("Full Payment");
  const [bankName, setBankName] = useState("");
  const [bankId, setBankId] = useState("");
  const [previousBill, setPreviousBill] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0");
  const [installmentMonths, setInstallmentMonths] = useState("0");
  const [note, setNote] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(formatDate(new Date()));
  const [invoiceTime, setInvoiceTime] = useState(formatTime());
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ message: "", isError: false });

  useEffect(() => {
    Promise.all([
      getDocs(
        query(
          collection(db, "Cases"),
          where("status", "==", "Ready to Invoice"),
        ),
      ),
      getDocs(collection(db, "Clinics")),
      getDocs(collection(db, "Banks")),
      getDocs(collection(db, "Drs")),
    ]).then(([casesSnap, clinicsSnap, banksSnap, drsSnap]) => {
      const allC = casesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllCases(allC);
      setCases(allC);
      setClinics(clinicsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setBanks(banksSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
    const normalize = (v) => String(v || "").trim().toLowerCase();
    const selectedClinic = normalize(clinicName);

    const list = allDoctors
      .filter((d) => {
        if (!selectedClinic) return true;
        return normalize(d.clinic) === selectedClinic;
      })
      .map((d) => d.name)
      .filter(Boolean);

    return [...new Set(list)].sort((a, b) => a.localeCompare(b));
  }, [allDoctors, clinicName]);

  useEffect(() => {
    if (drFilter && !doctorOptions.includes(drFilter)) {
      setDrFilter("");
    }
  }, [clinicName, doctorOptions, drFilter]);

  useEffect(() => {
    let filtered = allCases;
    if (clinicName)
      filtered = filtered.filter((c) => c.clinicName === clinicName);
    if (drFilter) filtered = filtered.filter((c) => c.drName === drFilter);
    if (dateFilter)
      filtered = filtered.filter(
        (c) => c.caseRequestDate === dateFilter || c.dueDate === dateFilter,
      );
    setCases(filtered);
  }, [clinicName, drFilter, dateFilter, allCases]);

  const fetchOldUnpaidBills = async () => {
    const hasDoctor = !!drFilter;
    const hasClinic = !!clinicName;

    if (!hasDoctor && !hasClinic) {
      setSnack({
        message: "Choose doctor or clinic first",
        isError: true,
      });
      return;
    }

    setHasCheckedOldBills(true);

    const constraints = [
      where("type", "==", "Invoice"),
    ];

    if (hasDoctor) {
      constraints.push(where("drName", "==", drFilter));
    } else {
      constraints.push(where("clinicName", "==", clinicName));
    }

    try {
      const snap = await getDocs(query(collection(db, "Finance"), ...constraints));
      const unpaid = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((inv) => Number(inv.remainingAmount || 0) > 0)
        .sort((a, b) => {
          const aDate = `${a.Date || ""} ${a.Time || ""}`;
          const bDate = `${b.Date || ""} ${b.Time || ""}`;
          return bDate.localeCompare(aDate);
        });
      setPreviousInvoices(unpaid);
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    }
  };

  const selectedCases = useMemo(
    () => cases.filter((c) => selectedCaseIds.includes(c.id)),
    [cases, selectedCaseIds],
  );

  const invoiceItems = useMemo(
    () =>
      selectedCases.map((c) => ({
        item: c.type || c.caseType || "Case",
        price: Number(c.price) || Number(c.total) || 0,
        quantity: 1,
        caseId: c.id,
        patientName: c.patientName,
        drName: c.drName,
      })),
    [selectedCases],
  );

  const subtotal = invoiceItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const previousBillVal = parseFloat(previousBill) || 0;
  const discountVal = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal + previousBillVal - discountVal);
  const showPaidAmountInput =
    paymentPlan === "Partial Payment" || paymentPlan === "Installments";
  const paidVal = parseFloat(paidAmount) || 0;
  const effectivePaidAmount = showPaidAmountInput ? paidVal : total;
  const remaining = Math.max(0, total - effectivePaidAmount);
  const invoiceStatus = remaining <= 0 ? "Paid" : "Remaining";
  const netAmountToBank = calcNetAmountToBank(bankName, effectivePaidAmount);
  const cardFee = calcCardFee(bankName, effectivePaidAmount);

  const toggleCase = (id) => {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectBank = (bName) => {
    const b = banks.find((x) => x.name === bName);
    setBankName(bName);
    setBankId(b?.id || "");
  };

  const submit = async () => {
    if (!clinicName || !bankName || invoiceItems.length === 0) {
      setSnack({ message: "Select clinic, bank, and cases", isError: true });
      return;
    }
    setLoading(true);
    try {
      const bankRef = doc(db, "Banks", bankId);
      const bankSnap = await (
        await import("firebase/firestore")
      ).getDoc(bankRef);
      const bankBalanceBefore = Number(bankSnap.data()?.balance) || 0;
      await updateDoc(bankRef, {
        balance: bankBalanceBefore + netAmountToBank,
      });

      const financeRef = doc(collection(db, "Finance"));
      await setDoc(financeRef, {
        Date: invoiceDate,
        Time: invoiceTime,
        adminID: user.uid,
        bankId,
        bankBalanceAfter: bankBalanceBefore + netAmountToBank,
        bankBalanceBefore,
        note,
        bank: bankName,
        name: clinicName,
        clinicName,
        patientName: invoiceItems[0]?.patientName || "",
        drName: invoiceItems[0]?.drName || "",
        caseId: invoiceItems[0]?.caseId || "",
        caseIds: invoiceItems.map((i) => i.caseId),
        paidAmount: effectivePaidAmount,
        remainingAmount: remaining,
        total,
        previousBillAmount: previousBillVal,
        paymentPlan,
        installmentMonths: parseInt(installmentMonths, 10) || 0,
        discount: discountVal,
        type: "Invoice",
        branch: user.branch || "New cairo",
        status: invoiceStatus,
      });

      for (const item of invoiceItems) {
        await addDoc(collection(db, "Finance", financeRef.id, "Items"), {
          name: item.item,
          price: item.price,
          quantity: item.quantity,
          caseId: item.caseId,
        });
      }

      await addDoc(collection(db, "Finance", financeRef.id, "Payments"), {
        balanceBefore: bankBalanceBefore,
        balanceAfter: bankBalanceBefore + netAmountToBank,
        bank: bankName,
        bankID: bankId,
        Date: invoiceDate,
        Time: invoiceTime,
        paidAmount: effectivePaidAmount,
        netAmountToBank,
        cardFee,
      });

      const now = new Date();
      await setDoc(doc(db, "Logs", financeRef.id), {
        actionID: financeRef.id,
        section: "Finance",
        adminID: user.uid,
        adminName: user.name,
        branch: user.branch || "New cairo",
        bank: bankName,
        name: clinicName,
        clinicName,
        type: "Income",
        cName: "Invoice",
        Time: formatTime(now),
        Date: formatDate(now),
        amount: effectivePaidAmount,
        netAmountToBank,
        cardFee,
      });

      if (invoiceStatus === "Remaining") {
        await addDoc(collection(db, "Notifications"), {
          name: clinicName,
          type: "Invoice",
          amount: remaining,
          quantity: 0,
          docID: financeRef.id,
          collectionName: "Finance",
          date: invoiceDate,
          time: invoiceTime,
          status: "Remaining",
          branch: user.branch || "New cairo",
        });
        const clinicQuery = await getDocs(
          query(collection(db, "Clinics"), where("name", "==", clinicName)),
        );
        if (!clinicQuery.empty) {
          const clinicDoc = clinicQuery.docs[0];
          const currentBalance = Number(clinicDoc.data().balance) || 0;
          await updateDoc(clinicDoc.ref, {
            balance: currentBalance + remaining,
          });
        }
      }

      for (const item of invoiceItems) {
        await updateDoc(doc(db, "Cases", item.caseId), { status: "Done" });
      }

      setSnack({ message: "Case invoice created", isError: false });
      setSelectedCaseIds([]);
      setPaidAmount("0");
    } catch (e) {
      setSnack({ message: e.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Case Invoice" />
      <PageCard title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectField
            label="Clinic Name"
            value={clinicName}
            onChange={setClinicName}
            options={clinics.map((c) => c.name)}
            placeholder="All"
          />
          <SelectField
            label="Doctor Name"
            value={drFilter}
            onChange={setDrFilter}
            options={doctorOptions}
            placeholder="All"
          />
          <TextField
            label="Date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            type="date"
          />
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={fetchOldUnpaidBills}
            className="px-4 py-2 rounded-md border text-foreground hover:bg-muted/60 transition-colors"
          >
            Show Old Unpaid Bills
          </button>
        </div>
      </PageCard>

      <PageCard title="Invoice Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            label="Bank"
            value={bankName}
            onChange={(v) => selectBank(v)}
            options={banks.map((b) => b.name)}
          />
          <SelectField
            label="Payment Plan"
            value={paymentPlan}
            onChange={setPaymentPlan}
            options={["Full Payment", "Partial Payment", "Installments"]}
          />
          <TextField
            label="Invoice Date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            type="date"
          />
          <TextField
            label="Time"
            value={invoiceTime}
            onChange={(e) => setInvoiceTime(e.target.value)}
          />
          <TextField
            label="Discount"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            type="number"
          />
          <TextField
            label="Previous Bill"
            value={previousBill}
            onChange={(e) => setPreviousBill(e.target.value)}
            type="number"
          />
          {showPaidAmountInput && (
            <TextField
              label="Paid Amount"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              type="number"
            />
          )}
          <TextField
            label="Notes"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required={false}
          />
        </div>
      </PageCard>

      <PageCard title="Cases Ready to Invoice">
        {cases.length === 0 ? (
          <p className="text-muted-foreground">No cases ready to invoice.</p>
        ) : (
          <div className="space-y-2">
            {cases.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedCaseIds.includes(c.id)}
                  onChange={() => toggleCase(c.id)}
                />
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {c.patientName} — {c.type || c.caseType}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {c.clinicName || c.clinic} · Dr. {c.drName}
                  </p>
                  {c.teethCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Teeth: {c.teethCount}
                    </p>
                  )}
                </div>
                <span className="font-semibold">
                  {formatPriceLE(c.price || c.total)}
                </span>
              </label>
            ))}
          </div>
        )}
        <div className="mt-4 border-t pt-4 space-y-1 text-sm text-foreground">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <strong>{formatPriceLE(subtotal)}</strong>
          </div>
          <div className="flex justify-between">
            <span>Previous Bill:</span>
            <strong>{formatPriceLE(previousBillVal)}</strong>
          </div>
          <div className="flex justify-between">
            <span>Discount:</span>
            <strong>- {formatPriceLE(discountVal)}</strong>
          </div>
          <div className="flex justify-between text-base font-bold border-t pt-2 mt-2">
            <span>Grand Total:</span>
            <span>{formatPriceLE(total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Paid:</span>
            <strong>{formatPriceLE(effectivePaidAmount)}</strong>
          </div>
          <div className="flex justify-between">
            <span>Remaining:</span>
            <strong className="text-destructive">{formatPriceLE(remaining)}</strong>
          </div>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground rounded-md"
        >
          Create Invoice
        </button>
      </PageCard>

      {(hasCheckedOldBills || previousInvoices.length > 0) && (
        <PageCard title="Previous Bills">
          {previousInvoices.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No unpaid old bills found for the selected {drFilter ? "doctor" : "clinic"}.
            </p>
          ) : (
            <div className="space-y-2">
              {previousInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex justify-between items-center border rounded-lg p-3 text-sm text-foreground"
                >
                  <div>
                    <p className="font-medium">{inv.Date}</p>
                    <p className="text-muted-foreground">
                      {inv.drName ? `${inv.drName} · ` : ""}
                      {inv.paymentPlan} · {inv.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatPriceLE(inv.total)}</p>
                    <p className="text-destructive text-xs">
                      Remaining: {formatPriceLE(inv.remainingAmount || 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageCard>
      )}

      <LoadingOverlay show={loading} />
      <Snackbar
        message={snack.message}
        isError={snack.isError}
        onClose={() => setSnack({ message: "", isError: false })}
      />
    </>
  );
}
