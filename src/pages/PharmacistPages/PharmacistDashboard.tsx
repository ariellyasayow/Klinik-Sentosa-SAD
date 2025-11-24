import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { User, Visit, Medicine, Prescription, TransactionItem } from '../../types';
import logo from '../../assets/logo.png';

interface PharmacistDashboardProps {
  user: User;
  onLogout: () => void;
}

const PharmacistDashboard: React.FC<PharmacistDashboardProps> = ({ user, onLogout }) => {
  const [queue, setQueue] = useState<Visit[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // MANUAL JOIN: Ambil Visits DAN Patients terpisah
      const [visits, meds, patients] = await Promise.all([
        api.getVisits(),
        api.getMedicines(),
        api.getPatients() // <-- Fetch Patients
      ]);
      
      // Gabungkan data pasien ke visit secara manual (Anti-Fail)
      const visitsWithPatient = visits.map(visit => {
         // Jika visit.patient sudah ada dari server, pakai itu. Jika tidak, cari manual di array patients
         const foundPatient = visit.patient || patients.find(p => p.id === visit.patientId);
         return { ...visit, patient: foundPatient };
      });

      const pharmacyQueue = visitsWithPatient.filter(v => v.status === 'pharmacy');
      setQueue(pharmacyQueue);
      setMedicines(meds);
    } catch (error) { console.error("Gagal load data farmasi", error); }
  };

  const handleSelectPatient = async (visit: Visit) => {
    setSelectedVisit(visit);
    setLoading(true);
    try {
      const prescs = await api.getPrescriptionByVisit(visit.id);
      if (prescs.length > 0) {
        setPrescription(prescs[prescs.length - 1]); 
      } else {
        setPrescription(null);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate || birthDate === '1900-01-01') return '-';
    const today = new Date();
    const dob = new Date(birthDate);
    let age = today.getFullYear() - dob.getFullYear();
    if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) age--;
    return age;
  };

  const handleProcess = async () => {
    if (!selectedVisit || !prescription) return;
    if (!confirm("Konfirmasi obat disiapkan? Stok akan dikurangi & tagihan dibuat.")) return;

    setLoading(true);
    try {
      // 1. Kurangi Stok
      for (const item of prescription.items) {
        const currentMed = medicines.find(m => m.id === item.medicineId);
        if (currentMed) {
          const newStock = currentMed.stock - item.quantity;
          if (newStock < 0) {
             alert(`Stok ${currentMed.name} tidak cukup!`);
             setLoading(false); return;
          }
          await api.updateMedicineStock(currentMed.id, newStock);
        }
      }

      // 2. Buat Transaksi (PASTIKAN NAMA PASIEN TERISI)
      const patientNameFinal = selectedVisit.patient?.name || 'Tanpa Nama (Error)';
      
      let totalMedicinePrice = 0;
      const txItems: TransactionItem[] = prescription.items.map(item => {
         const price = item.price * item.quantity;
         totalMedicinePrice += price;
         return {
            id: item.medicineId, name: item.medicineName, quantity: item.quantity, price: price, type: 'medicine'
         };
      });

      const doctorFee = 150000;
      txItems.push({ id: 'svc-doc', name: 'Jasa Konsultasi Dokter', quantity: 1, price: doctorFee, type: 'service' });

      await api.addTransaction({
         visitId: selectedVisit.id,
         patientName: patientNameFinal, // <--- NAMA PASIEN DISINI
         description: `Farmasi & Poli (No. ${selectedVisit.queueNumber})`,
         amount: totalMedicinePrice + doctorFee,
         status: 'pending',
         date: new Date().toISOString().split('T')[0],
         items: txItems
      });

      await api.updateVisitStatus(selectedVisit.id, 'cashier');

      alert("Selesai! Pasien diarahkan ke Kasir.");
      setSelectedVisit(null); setPrescription(null); loadData();

    } catch (error) { alert("Gagal memproses."); } finally { setLoading(false); }
  };

  return (
    <div className="flex h-screen w-full bg-green-50 font-sans text-slate-800 overflow-hidden">
      <aside className="w-80 bg-white border-r border-green-200 flex flex-col shadow-sm z-10">
        <div className="h-20 border-b border-green-100 flex items-center px-6 gap-3">
           <img src={logo} alt="Logo" className="h-8 w-auto" />
           <div><h1 className="font-bold text-lg text-green-800 leading-tight">Farmasi</h1><p className="text-xs text-green-600">Klinik Sentosa</p></div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-green-50/30">
           <div className="flex justify-between items-center mb-2 px-1">
              <h3 className="font-bold text-slate-600 text-xs uppercase">Resep Masuk</h3>
              <span className="bg-green-200 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full">{queue.length}</span>
           </div>
           {queue.length === 0 ? <div className="flex flex-col items-center justify-center h-40 text-slate-400 italic text-sm border-2 border-dashed border-green-200 rounded-xl"><span className="material-symbols-outlined mb-2 opacity-50">local_pharmacy</span>Tidak ada resep.</div> : queue.map(visit => (
              <div key={visit.id} onClick={() => handleSelectPatient(visit)} className={`relative p-4 rounded-xl border cursor-pointer transition-all group ${selectedVisit?.id === visit.id ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-300 border-transparent' : 'bg-white border-green-100 hover:border-green-400 hover:shadow-sm'}`}>
                 <div className="flex justify-between items-start">
                    <div><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mb-1 inline-block ${selectedVisit?.id === visit.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{visit.queueNumber}</span><h4 className="font-bold text-base">{visit.patient?.name || 'Loading...'}</h4><p className={`text-xs mt-1 ${selectedVisit?.id === visit.id ? 'text-green-100' : 'text-slate-500'}`}>Menunggu Obat</p></div>
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                 </div>
              </div>
           ))}
        </div>
        <div className="p-4 border-t border-green-100 bg-white"><button onClick={onLogout} className="w-full py-2 text-red-500 font-bold hover:bg-red-50 rounded-lg flex items-center justify-center gap-2 text-sm"><span className="material-symbols-outlined text-lg">logout</span> Keluar</button></div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
         <header className="h-20 border-b border-slate-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-sm z-10">
            <div><h1 className="text-xl font-bold text-slate-800">Halo, {user.name}</h1><p className="text-xs text-slate-500 font-medium">Apoteker Jaga</p></div>
            <div className="h-10 w-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm">A</div>
         </header>

         <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
            {!selectedVisit ? (
               <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 animate-in zoom-in-95 duration-300">
                  <div className="bg-white p-8 rounded-full shadow-sm mb-6 border border-green-50"><span className="material-symbols-outlined text-7xl text-green-400">medication_liquid</span></div>
                  <h3 className="text-2xl font-bold text-slate-700 mb-2">Siap Melayani Resep</h3>
                  <p className="text-sm max-w-md">Pilih pasien dari antrian kiri.</p>
               </div>
            ) : (
               <div className="flex flex-col lg:flex-row gap-6 h-full">
                  <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-right-4 duration-300">
                     <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex justify-between items-start">
                        <div><p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Resep Digital</p><h2 className="text-2xl font-bold text-slate-800">{selectedVisit.patient?.name}</h2><div className="flex gap-4 text-sm text-slate-500 mt-2"><span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">badge</span> {selectedVisit.patient?.nik || '-'}</span></div></div>
                        <div className="text-right"><p className="text-xs text-slate-400 uppercase font-bold">Antrian</p><p className="text-3xl font-black text-slate-700">{selectedVisit.queueNumber}</p></div>
                     </div>
                     <div className="flex-1 p-6 overflow-y-auto">
                        {loading ? <div className="text-center py-10">Memuat...</div> : !prescription ? <div className="text-center py-10 text-red-500">Resep Kosong</div> : (
                           <div className="space-y-4">
                              <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Daftar Obat ({prescription.items.length})</h3><span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">ID: {prescription.id}</span></div>
                              {prescription.items.map((item, idx) => {
                                 const realStock = medicines.find(m => m.id === item.medicineId)?.stock || 0;
                                 const isStockLow = realStock < item.quantity;
                                 return (
                                    <div key={idx} className="flex justify-between items-start p-4 rounded-xl border border-slate-100 hover:border-green-300 transition-colors bg-white shadow-sm group">
                                       <div className="flex gap-4"><div className="h-12 w-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center font-bold border border-green-100">{idx + 1}</div><div><p className="font-bold text-slate-800 text-lg">{item.medicineName}</p><div className="flex gap-2 text-xs mt-1"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">Aturan: {item.dosage}</span>{isStockLow && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200 font-bold animate-pulse">STOK KURANG ({realStock})</span>}</div></div></div><div className="text-right"><p className="text-2xl font-bold text-slate-800">{item.quantity}</p><p className="text-xs text-slate-400 font-medium uppercase">Unit</p></div>
                                    </div>
                                 );
                              })}
                           </div>
                        )}
                     </div>
                  </div>
                  <div className="w-80 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-fit sticky top-0">
                     <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-blue-600">person_search</span> Data Pasien</h3>
                     <div className="space-y-4 flex-1 mb-6 text-sm">
                        <div className="pb-3 border-b border-slate-100"><p className="text-slate-400 text-xs font-bold uppercase mb-1">Nama Lengkap</p><p className="font-semibold text-slate-800 text-base">{selectedVisit.patient?.name}</p></div>
                        <div className="pb-3 border-b border-slate-100"><p className="text-slate-400 text-xs font-bold uppercase mb-1">NIK</p><p className="font-medium text-slate-700">{selectedVisit.patient?.nik || '-'}</p></div>
                        <div className="pb-3 border-b border-slate-100"><p className="text-slate-400 text-xs font-bold uppercase mb-1">Usia / Tgl Lahir</p><p className="font-medium text-slate-700">{calculateAge(selectedVisit.patient?.birthDate || '')} Thn ({selectedVisit.patient?.birthDate})</p></div>
                        <div><p className="text-slate-400 text-xs font-bold uppercase mb-1">Tipe Pasien</p><span className={`px-2 py-1 rounded text-xs font-bold ${selectedVisit.patient?.type === 'BPJS' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{selectedVisit.patient?.type || 'Umum'}</span></div>
                     </div>
                     <div className="pt-4 border-t border-slate-100"><button onClick={handleProcess} disabled={!prescription || loading} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2">{loading ? <span className="material-symbols-outlined animate-spin">refresh</span> : <><span className="material-symbols-outlined">check_circle</span> Selesai & Kirim</>}</button><p className="text-xs text-center text-slate-400 mt-3">Stok berkurang & tagihan terkirim.</p></div>
                  </div>
               </div>
            )}
         </div>
      </main>
    </div>
  );
};

export default PharmacistDashboard;