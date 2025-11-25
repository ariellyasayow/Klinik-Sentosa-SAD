import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { User, Visit, Medicine, Prescription, Patient } from '../../types'; // Pastikan Patient diimport

interface PharmacistDashboardProps {
  user: User;
  onLogout: () => void;
}

const PharmacistDashboard: React.FC<PharmacistDashboardProps> = ({ user, onLogout }) => {
  // --- STATE ---
  const [queue, setQueue] = useState<Visit[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]); // State untuk data pasien
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
    // Auto refresh setiap 5 detik
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // PERBAIKAN: Ambil Visits, Medicines, DAN Patients sekaligus
      const [visitsData, medsData, patientsData] = await Promise.all([
        api.getVisits(),
        api.getMedicines(),
        api.getPatients() // <-- Fetch Data Pasien
      ]);
      
      setMedicines(medsData);
      setPatients(patientsData); // Simpan data pasien

      // Filter visit yang statusnya 'pharmacy' (dikirim dokter)
      // dan pastikan resepnya belum diproses (status pending)
      const pharmacyQueue = visitsData.filter(v => 
          v.status === 'pharmacy' && 
          v.prescription?.status === 'pending'
      );
      
      setQueue(pharmacyQueue);
    } catch (err) {
      console.error("Error loading pharmacy data", err);
    }
  };

  // --- HELPER: FUNGSI UNTUK MENDAPATKAN NAMA PASIEN ---
  const getPatientName = (visit: Visit) => {
    // 1. Cari di daftar patients berdasarkan ID
    const found = patients.find(p => p.id === visit.patientId);
    if (found) return found.name;

    // 2. Cek properti nested atau flat
    if (visit.patient?.name) return visit.patient.name;
    if (visit.patientName) return visit.patientName;

    // 3. Fallback
    return `Pasien (${visit.patientId})`;
  };

  const calculateTotalPrice = (items: any[]) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleProcess = async () => {
    if (!selectedVisit || !selectedVisit.prescription) return;
    setLoading(true);

    try {
        // 1. Kurangi Stok Obat di Database
        for (const item of selectedVisit.prescription.items) {
           const med = medicines.find(m => m.id === item.medicineId);
           if (med) {
             const newStock = med.stock - item.quantity;
             await api.updateMedicine(med.id, { stock: newStock });
           }
        }

        // 2. Update Status Resep menjadi 'processed'
        // PENTING: Kita update objek prescription di dalam visit
        const updatedPrescription = {
            ...selectedVisit.prescription,
            status: 'processed' as const
        };

        // 3. Update Visit: Status -> 'payment' (Kirim ke Kasir)
        await api.updateVisit(selectedVisit.id, {
            status: 'payment', 
            prescription: updatedPrescription
        } as any);

        // 4. (Opsional) Langsung buat transaksi pending agar muncul di kasir
        // Langkah ini sudah ditangani logika kasir, tapi biar aman kita biarkan updateVisit saja.

        alert('Resep selesai disiapkan. Data dikirim ke Kasir.');
        setSelectedVisit(null);
        loadData(); // Refresh
    } catch (error) {
        console.error("Gagal memproses resep", error);
        alert("Terjadi kesalahan sistem saat memproses resep.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-slate-800">
      {/* Sidebar List Pasien */}
      <div className="w-96 bg-white border-r flex flex-col h-screen fixed left-0 top-0 z-10">
         <div className="p-6 border-b bg-[#004346] text-white">
            <h1 className="text-xl font-bold flex items-center gap-2">
               <span className="material-symbols-outlined">medication</span>
               Farmasi
            </h1>
            <p className="text-blue-100 text-sm mt-1">Menunggu Penyerahan Obat</p>
         </div>
         
         <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {queue.length === 0 ? (
                <div className="text-center text-gray-400 mt-10">
                    <p>Tidak ada resep masuk</p>
                </div>
            ) : (
                queue.map(visit => (
                    <div 
                      key={visit.id}
                      onClick={() => setSelectedVisit(visit)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${selectedVisit?.id === visit.id ? 'border-[#004346] bg-green-50 ring-1 ring-[#004346]' : 'border-gray-100 bg-white'}`}
                    >
                       <div className="flex justify-between items-start mb-2">
                          {/* GUNAKAN HELPER NAME DISINI */}
                          <h3 className="font-bold text-slate-700">{getPatientName(visit)}</h3>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">{visit.status}</span>
                       </div>
                       <p className="text-xs text-slate-500 mb-2">Dari: Dr. {visit.doctorName || 'Umum'}</p>
                       <div className="text-xs text-slate-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">prescriptions</span>
                          {visit.prescription?.items.length || 0} Item Obat
                       </div>
                    </div>
                ))
            )}
         </div>
         
         <div className="p-4 border-t bg-gray-50">
            <button onClick={onLogout} className="w-full py-2 text-red-600 font-bold text-sm hover:bg-red-50 rounded transition-colors">Keluar</button>
         </div>
      </div>

      {/* Main Detail View */}
      <div className="ml-96 flex-1 p-8">
         {selectedVisit ? (
            <div className="max-w-3xl mx-auto">
               <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                     <div>
                        <h2 className="text-2xl font-bold text-[#004346]">Detail Resep</h2>
                        <p className="text-slate-500">Ref: {selectedVisit.prescription?.id || '-'}</p>
                     </div>
                     <div className="text-right">
                        {/* GUNAKAN HELPER NAME DISINI JUGA */}
                        <p className="text-lg font-bold text-slate-700">{getPatientName(selectedVisit)}</p>
                        <p className="text-xs text-slate-500">{selectedVisit.patientId}</p>
                     </div>
                  </div>

                  <div className="p-6">
                     <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">Daftar Obat Diminta</h3>
                     
                     <div className="space-y-3">
                        {selectedVisit.prescription?.items && selectedVisit.prescription.items.length > 0 ? (
                            selectedVisit.prescription.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-white hover:border-blue-200 transition-colors">
                                   <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                                         {idx + 1}
                                      </div>
                                      <div>
                                         <p className="font-bold text-slate-700 text-lg">{item.medicineName}</p>
                                         <p className="text-sm text-slate-500 bg-gray-100 inline-block px-2 py-0.5 rounded mt-1">
                                            {item.dosage}
                                         </p>
                                      </div>
                                   </div>
                                   <div className="text-right">
                                      <p className="font-bold text-slate-700 text-lg">x {item.quantity}</p>
                                      <p className="text-xs text-slate-400">@{item.price}</p>
                                   </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-center">
                                Data resep kosong atau rusak.
                            </div>
                        )}
                     </div>

                     <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
                        <div>
                            <p className="text-sm text-slate-500">Total Estimasi Harga</p>
                            <p className="text-2xl font-bold text-[#004346]">
                                Rp {calculateTotalPrice(selectedVisit.prescription?.items || []).toLocaleString('id-ID')}
                            </p>
                        </div>
                        <button 
                           onClick={handleProcess} 
                           disabled={loading}
                           className="px-8 py-3 bg-[#004346] hover:bg-[#003336] text-white rounded-xl font-bold shadow-lg shadow-teal-900/20 transition-all flex items-center gap-2 disabled:opacity-70"
                        >
                           {loading ? 'Memproses...' : (
                               <>
                                 <span className="material-symbols-outlined">check_circle</span>
                                 Konfirmasi & Kirim ke Kasir
                               </>
                           )}
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-300">
               <span className="material-symbols-outlined text-8xl mb-4 opacity-20">prescriptions</span>
               <p className="text-xl font-medium text-gray-400">Pilih resep untuk diproses</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default PharmacistDashboard;