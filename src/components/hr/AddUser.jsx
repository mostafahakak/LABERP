'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Header from '@/components/layout/Header';
import { PageCard, TextField, SelectField, Snackbar, LoadingOverlay } from '@/components/ui/PageComponents';

const USER_TYPES = ['Admin', 'Sales'];
const FULL_TIME_OPTIONS = ['Full time', 'Part time'];
const FEE_TYPE_OPTIONS = ['Fixed', '%'];

export default function AddUser() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ message: '', isError: false });

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [familyPhone, setFamilyPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedType, setSelectedType] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedFeeType, setSelectedFeeType] = useState(null);
  const [feeValue, setFeeValue] = useState('3');
  const [salary, setSalary] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetForm = () => {
    setName('');
    setAddress('');
    setPhone('');
    setFamilyPhone('');
    setEmail('');
    setSelectedType(null);
    setSelectedTime(null);
    setSelectedFeeType(null);
    setFeeValue('3');
    setSalary('');
    setPassword('');
    setConfirmPassword('');
  };

  const validate = () => {
    if (!name.trim()) return 'Please enter full name';
    if (!address.trim()) return 'Please enter address';
    if (!phone.trim()) return 'Please enter phone number';
    if (!familyPhone.trim()) return 'Please enter family phone';
    if (!email.trim()) return 'Please enter email';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email';
    if (!selectedType) return 'Please select user type';
    if (!selectedTime) return 'Please select employment type';
    if (!selectedFeeType) return 'Please select fee type';
    if (!feeValue.trim() || Number(feeValue) < 0) return 'Enter valid fee value';
    if (!salary.trim() || Number(salary) < 0) return 'Enter valid salary';
    if (!password) return 'Please enter password';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const createUser = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setSnack({ message: err, isError: true });
      return;
    }

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password.trim()
      );
      const uid = credential.user.uid;

      await setDoc(doc(db, 'Users', uid), {
        type: selectedType,
        address: address.trim(),
        balance: 0,
        feeValue: parseFloat(feeValue.trim()) || 3,
        feeType: selectedFeeType || '%',
        email: email.trim(),
        familyPhone: familyPhone.trim(),
        name: name.trim(),
        phone: phone.trim(),
        shift: '',
        fullTime: selectedTime || 'Full time',
        salary: parseFloat(salary.trim()) || 0,
        createdAt: serverTimestamp(),
      });

      setSnack({ message: 'User Created Successfully!', isError: false });
      resetForm();
    } catch (e) {
      let errorMessage = e.message || 'Failed to create user.';
      if (e.code === 'auth/weak-password') errorMessage = 'The password provided is too weak.';
      if (e.code === 'auth/email-already-in-use') errorMessage = 'The account already exists for that email.';
      setSnack({ message: errorMessage, isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Add Employee" />
      <PageCard title="Employee Details" icon="👤">
        <form onSubmit={createUser} className="max-w-xl mx-auto space-y-4">
          <TextField label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <TextField label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
          <TextField label="Family Phone" value={familyPhone} onChange={(e) => setFamilyPhone(e.target.value)} type="tel" />
          <TextField label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          <SelectField label="User Type" value={selectedType} onChange={setSelectedType} options={USER_TYPES} />
          <SelectField label="Employment Type" value={selectedTime} onChange={setSelectedTime} options={FULL_TIME_OPTIONS} />
          <SelectField label="Fee Type" value={selectedFeeType} onChange={setSelectedFeeType} options={FEE_TYPE_OPTIONS} />
          <TextField label="Fee Value" value={feeValue} onChange={(e) => setFeeValue(e.target.value)} type="number" />
          <TextField label="Monthly Salary" value={salary} onChange={(e) => setSalary(e.target.value)} type="number" />
          <TextField label="Password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          <TextField label="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" />
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2.5 border rounded-lg text-black"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-black text-[#c3a28e] rounded-lg font-semibold disabled:opacity-50"
            >
              Create User Account
            </button>
          </div>
        </form>
      </PageCard>
      <LoadingOverlay show={loading} />
      <Snackbar
        message={snack.message}
        isError={snack.isError}
        onClose={() => setSnack({ message: '', isError: false })}
      />
    </>
  );
}
