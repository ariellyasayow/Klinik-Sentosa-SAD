import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { User, Visit, Medicine, Prescription, Patient } from '../../types';

interface PharmacistDashboardProps {
  user: User;
  onLogout: () => void;
}

const PharmacistDashboard: React.FC<PharmacistDashboardProps> = ({ user, onLogout }) => {
  // --- STATE ---
  const [queue, setQueue] = useState<Visit[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [visitsData, medsData, patientsData] = await Promise.all([
        api.getVisits(),
        api.getMedicines(),
        api.getPatients()
      ]);
      setMedicines(medsData);
      setPatients(patientsData);
      
      const pharmacyQueue = visitsData.filter(v => 
          v.status === 'pharmacy' && 
          v.prescription?.status === 'pending'
      );
      setQueue(pharmacyQueue);
    } catch (err) {
      console.error("Error loading pharmacy data", err);
    }
  };

  const getPatientName = (visit: Visit) => {
    const found = patients.find(p => p.id === visit.patientId);
    if (found) return found.name;
    if (visit.patient?.name) return visit.patient.name;
    if (visit.patientName) return visit.patientName;
    return `Pasien (${visit.patientId})`;
  };

  const calculateTotalPrice = (items: any[]) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleProcess = async () => {
    if (!selectedVisit || !selectedVisit.prescription) return;
    setLoading(true);

    try {
        for (const item of selectedVisit.prescription.items) {
           const med = medicines.find(m => m.id === item.medicineId);
           if (med) {
             const newStock = med.stock - item.quantity;
             await api.updateMedicine(med.id, { stock: newStock });
           }
        }

        const updatedPrescription = {
            ...selectedVisit.prescription,
            status: 'processed' as const
        };

        await api.updateVisit(selectedVisit.id, {
            status: 'payment', 
            prescription: updatedPrescription
        } as any);

        alert('Resep selesai disiapkan. Data dikirim ke Kasir.');
        setSelectedVisit(null);
        loadData();
    } catch (error) {
        console.error("Gagal memproses resep", error);
        alert("Terjadi kesalahan sistem saat memproses resep.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800 overflow-hidden">
      
      {/* --- SIDEBAR LIST RESEP --- */}
      <aside className="w-96 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 left-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
         <div className="p-6 border-b border-slate-100">
            <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
               <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-600/20">
                 <span className="material-symbols-outlined text-white">medication</span>
               </div>
               Instalasi Farmasi
            </h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-4 ml-1">Daftar Resep Masuk</p>
         </div>
         
         <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {queue.length === 0 ? (
                <div className="text-center py-10 px-6 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50">
                    <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">assignment_turned_in</span>
                    <p className="text-slate-500 font-medium">Semua resep sudah diproses.</p>
                </div>
            ) : (
                queue.map(visit => (
                    <div 
                      key={visit.id}
                      onClick={() => setSelectedVisit(visit)}
                      className={`group p-5 rounded-2xl border cursor-pointer transition-all duration-200 hover:shadow-md ${
                          selectedVisit?.id === visit.id 
                          ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-600' 
                          : 'border-slate-100 bg-white hover:border-teal-200'
                      }`}
                    >
                       <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-slate-800 text-lg leading-tight">{getPatientName(visit)}</h3>
                          <span className="flex items-center justify-center w-6 h-6 bg-white rounded-full text-teal-600 shadow-sm text-xs font-bold border border-teal-100">
                             {visit.prescription?.items.length || 0}
                          </span>
                       </div>
                       <p className="text-xs text-slate-500 font-medium mb-3 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">person</span>
                          Dr. {visit.doctorName || 'Umum'}
                       </p>
                       <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border ${selectedVisit?.id === visit.id ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                             Menunggu
                          </span>
                          <span className="text-[10px] text-slate-400">{visit.date}</span>
                       </div>
                    </div>
                ))
            )}
         </div>
         
         <div className="p-4 border-t border-slate-100 bg-slate-50">
            <button onClick={onLogout} className="w-full py-3 text-red-600 font-bold text-sm hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200 flex items-center justify-center gap-2">
               <span className="material-symbols-outlined">logout</span> Keluar Sistem
            </button>
         </div>
      </aside>

      {/* --- MAIN DETAIL VIEW --- */}
      <main className="ml-96 flex-1 p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50/50 flex items-center justify-center">
         {selectedVisit ? (
            <div className="w-full max-w-2xl animate-in zoom-in-95 duration-300">
               <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden relative">
                  
                  {/* Decorative Header */}
                  <div className="h-2 bg-gradient-to-r from-teal-400 to-teal-600 w-full"></div>
                  
                  <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex justify-between items-start">
                     <div>
                        <p className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-1">Kartu Resep Elektronik</p>
                        <h2 className="text-3xl font-bold text-slate-800">{getPatientName(selectedVisit)}</h2>
                        <p className="text-slate-500 text-sm mt-1">ID Pasien: <span className="font-mono text-slate-700">{selectedVisit.patientId}</span></p>
                     </div>
                     <div className="text-right">
                        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-center">
                           <p className="text-xs text-slate-400 uppercase font-bold">Total Item</p>
                           <p className="text-xl font-bold text-teal-600">{selectedVisit.prescription?.items.length || 0}</p>
                        </div>
                     </div>
                  </div>

                  <div className="p-8">
                     <div className="flex items-center gap-2 mb-6">
                        <span className="material-symbols-outlined text-slate-400">pill</span>
                        <h3 className="font-bold text-slate-700 text-lg">Daftar Obat Diminta</h3>
                     </div>
                     
                     <div className="space-y-4 mb-8">
                        {selectedVisit.prescription?.items && selectedVisit.prescription.items.length > 0 ? (
                            selectedVisit.prescription.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-white hover:border-teal-200 hover:shadow-md transition-all group">
                                   <div className="flex items-center gap-5">
                                      <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-lg group-hover:bg-teal-600 group-hover:text-white transition-colors">
                                         {idx + 1}
                                      </div>
                                      <div>
                                         <p className="font-bold text-slate-800 text-lg">{item.medicineName}</p>
                                         <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                               {item.dosage}
                                            </span>
                                            <span className="text-xs text-slate-400">@{item.price}</span>
                                         </div>
                                      </div>
                                   </div>
                                   <div className="text-right">
                                      <p className="font-bold text-slate-800 text-xl">x{item.quantity}</p>
                                      <p className="text-xs text-slate-400 font-medium">Qty</p>
                                   </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-6 bg-red-50 text-red-600 rounded-xl text-center border border-red-100 font-medium">
                                Data resep kosong atau rusak.
                            </div>
                        )}
                     </div>

                     <div className="pt-6 border-t border-slate-100">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Estimasi Total Harga</p>
                                <p className="text-xs text-slate-400">*Harga dapat berubah di kasir</p>
                            </div>
                            <p className="text-4xl font-bold text-slate-800 tracking-tight">
                                <span className="text-lg text-slate-400 font-normal mr-1">Rp</span>
                                {calculateTotalPrice(selectedVisit.prescription?.items || []).toLocaleString('id-ID')}
                            </p>
                        </div>
                        
                        <button 
                           onClick={handleProcess} 
                           disabled={loading}
                           className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-teal-600/30 transition-all flex items-center justify-center gap-3 disabled:opacity-70 active:scale-[0.98]"
                        >
                           {loading ? (
                              <>
                                 <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                 Memproses Resep...
                              </>
                           ) : (
                               <>
                                 <span className="material-symbols-outlined text-2xl">check_circle</span>
                                 Konfirmasi & Serahkan ke Kasir
                               </>
                           )}
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         ) : (
            <div className="flex flex-col items-center justify-center text-center max-w-md">
               <div className="w-64 h-64 bg-slate-100 rounded-full flex items-center justify-center mb-8 relative">
                  <div className="absolute inset-0 bg-teal-50 rounded-full animate-ping opacity-20"></div>
                  <span className="material-symbols-outlined text-9xl text-slate-300">prescriptions</span>
               </div>
               <h2 className="text-3xl font-bold text-slate-800 mb-3">Siap Memproses Resep</h2>
               <p className="text-slate-500 text-lg leading-relaxed">
                  Silakan pilih salah satu resep dari daftar antrian di sebelah kiri untuk melihat detail dan memproses obat.
               </p>
            </div>
         )}
      </main>
    </div>
  );
};

export default PharmacistDashboard;