export interface User {
  password: string;
  id: string;
  username: string;
  role: 'admin' | 'doctor' | 'pharmacist' ;
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

export type VisitStatus = 'waiting' | 'examining' | 'pharmacy' | 'cashier' | 'done' | 'skipped';

export interface Visit {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  queueNumber: string;
  isEmergency: boolean;
  status: VisitStatus;
  patient?: Patient; 
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

export interface MedicalRecord {
  id: string;
  visitId: string;
  complaints: string;
  vitalSigns: string;
  diagnosis: string;
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
  visitId?: string; // TAMBAHAN PENTING: Link ke Kunjungan
  patientName: string;
  description: string;
  amount: number;
  status: 'pending' | 'paid';
  date: string;
  items?: TransactionItem[];
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

export interface ClinicInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
}