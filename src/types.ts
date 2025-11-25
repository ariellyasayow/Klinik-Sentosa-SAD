// src/types.ts

export interface User {
  password: string;
  id: string;
  username: string;
  role: 'admin' | 'doctor' | 'pharmacist'; // Role sesuai request
  name: string;
  specialty?: string;
  image?: string;
}

export interface Patient {
  id: string;
  name: string;
  nik: string;
  birthDate: string;
  address: string;
  phone: string;
  createdAt: string;
  type: 'Umum' | 'BPJS';
  insuranceNumber?: string;
}

export interface Medicine {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export type VisitStatus = 'waiting' | 'examining' | 'pharmacy' | 'payment' | 'cashier' | 'done' | 'skipped';

export interface MedicalRecord {
  id: string;
  visitId: string;
  complaints: string; // S (Subjective)
  vitalSigns: string; // O (Objective)
  diagnosis: string;  // A (Assessment)
}

export interface Prescription {
  id: string;
  visitId: string;
  items: {
    medicineId: string;
    medicineName: string;
    dosage: string;
    quantity: number;
    price: number;
  }[];
  status: 'pending' | 'processed' | 'completed';
}

export interface TransactionItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  type: 'service' | 'medicine';
}

export interface Transaction {
  id: string;
  visitId?: string;
  patientName: string;
  description: string;
  amount: number;
  status: 'pending' | 'paid';
  date: string;
  items?: TransactionItem[];
}

export interface DoctorSchedule {
  id: string;
  doctorId: string;
  name: string;
  specialty: string;
  day: string;
  time: string;
  status: 'Praktek' | 'Libur' | 'Cuti';
  quota: number;
  filled: number;
  image: string;
}

export interface Visit {
  id: string;
  patientId: string;
  patientName: string; // Helper untuk UI
  doctorId: string;
  doctorName?: string; // Helper untuk UI
  date: string;
  queueNumber: string;
  isEmergency: boolean;
  status: VisitStatus;
  
  // Relasi (Opsional, agar data bisa dimuat bersamaan)
  patient?: Patient;
  medicalRecord?: MedicalRecord; // Link ke hasil periksa
  prescription?: Prescription;   // Link ke resep
  transaction?: Transaction;     // Link ke pembayaran
}

export interface ClinicInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
}