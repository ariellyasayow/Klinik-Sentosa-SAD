import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Visit, User, Medicine } from '../../types';

interface DoctorDashboardProps {
  user: User;
  onLogout: () => void;
}

const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ user, onLogout }) => {
  // State Data
  const [visits, setVisits] = useState<Visit[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  
  // State Form SOAP
  const [soap, setSoap] = useState({ s: '', o: '', a: '' });
  
  // State Resep Obat
  const [selectedMedId, setSelectedMedId] = useState('');
  const [dosage, setDosage] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [cart, setCart] = useState<{ med: Medicine; dosage: string; qty: number }[]>([]);

  // Loading State
  const [loading, setLoading] = useState(false);

  // 1. Load Antrian & Obat saat pertama kali buka
  useEffect(() => {
    loadQueue();
    loadMedicines();
  }, []);

  const loadQueue = async () => {
    try {
      const [allVisits, allPatients] = await Promise.all([
        api.getVisits(),
        api.getPatients()
      ]);

      // Filter: Hanya kunjungan untuk dokter ini & status belum selesai
      const myVisits = allVisits.filter(v => 
        v.doctorId === user.id && 
        (v.status === 'waiting' || v.status === 'examining')
      );

      // Join data pasien
      const joinedVisits = myVisits.map(v => ({
        ...v,
        patient: allPatients.find(p => p.id === v.patientId)
      }));

      setVisits(joinedVisits);
    } catch (error) {
      console.error("Gagal memuat antrian", error);
    }
  };

  const loadMedicines = async () => {
    const data = await api.getMedicines();
    setMedicines(data);
  };

  // 2. Handle Klik Pasien (Mulai Pemeriksaan)
  const handleSelectPatient = async (visit: Visit) => {
    if (activeVisit && activeVisit.id !== visit.id) {
        if(!confirm("Pindah pasien? Data SOAP yang belum disimpan akan hilang.")) return;
    }
    
    setLoading(true);
    try {
      // Ubah status jadi examining jika masih waiting
      if (visit.status === 'waiting') {
        await api.updateVisitStatus(visit.id, 'examining');
        visit.status = 'examining'; // Optimistic update
      }
      setActiveVisit(visit);
      
      // Reset Form
      setSoap({ s: '', o: '', a: '' });
      setCart([]);
      loadQueue(); // Refresh list agar status terupdate di sidebar
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 3. Tambah Obat ke Resep Sementara
  const handleAddMedicine = () => {
    if (!selectedMedId || !dosage || quantity < 1) return;
    
    const med = medicines.find(m => m.id === selectedMedId);
    if (med) {
      setCart([...cart, { med, dosage, qty: quantity }]);
      // Reset input obat
      setSelectedMedId('');
      setDosage('');
      setQuantity(1);
    }
  };

  const handleRemoveMedicine = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // 4. Submit Pemeriksaan (Selesai)
  const handleSubmit = async () => {
    if (!activeVisit) return;
    if (!soap.s || !soap.o || !soap.a) {
        alert("Mohon lengkapi data SOAP (Keluhan, Fisik, Diagnosa).");
        return;
    }
    
    if(!confirm("Selesaikan pemeriksaan dan kirim resep ke apotek?")) return;

    setLoading(true);
    try {
      // A. Simpan Rekam Medis (SOAP)
      await api.addMedicalRecord({
        visitId: activeVisit.id,
        complaints: soap.s,
        vitalSigns: soap.o, // Mapping 'O' ke vitalSigns atau buat field baru di types
        diagnosis: soap.a
      });

      // B. Simpan Resep (Jika ada obat)
      if (cart.length > 0) {
        await api.addPrescription({
          visitId: activeVisit.id,
          status: 'pending', // Menunggu diproses apotek
          items: cart.map(item => ({
             medicineId: item.med.id,
             medicineName: item.med.name,
             price: item.med.price,
             dosage: item.dosage,
             quantity: item.qty
          }))
        });
      }

      // C. Update Status Kunjungan -> Pharmacy
      await api.updateVisitStatus(activeVisit.id, 'pharmacy');

      alert("Pemeriksaan Selesai!");
      setActiveVisit(null);
      loadQueue(); // Refresh antrian (pasien tadi akan hilang dari list)

    } catch (error) {
      alert("Gagal menyimpan data.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-display overflow-hidden">
      
      {/* SIDEBAR: DAFTAR ANTRIAN */}
      <aside className="w-80 bg-white border-r border-gray-200 flex flex-col z-10 shadow-lg">
        <div className="p-6 border-b border-gray-100 bg-slate-50">
          <h1 className="text-xl font-bold text-[#004346]">Poli Dokter</h1>
          <p className="text-sm text-gray-500">{user.name}</p>
          <p className="text-xs text-blue-600 font-semibold mt-1">{user.specialty}</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h2 className="text-xs font-bold text-gray-400 uppercase mb-2">Antrian Pasien</h2>
          {visits.length === 0 ? (
            <div className="text-center py-10 text-gray-400 italic text-sm">Tidak ada antrian.</div>
          ) : (
            visits.map(visit => (
              <div 
                key={visit.id}
                onClick={() => handleSelectPatient(visit)}
                className={`p-4 rounded-xl cursor-pointer transition-all border ${
                  activeVisit?.id === visit.id 
                    ? 'bg-blue-600 text-white shadow-md border-blue-600' 
                    : 'bg-white hover:bg-blue-50 border-gray-100 text-gray-700'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                   <span className={`font-bold text-lg ${activeVisit?.id === visit.id ? 'text-white' : 'text-[#004346]'}`}>{visit.queueNumber}</span>
                   {visit.status === 'examining' && <span className="text-[10px] bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-bold animate-pulse">Diperiksa</span>}
                </div>
                <p className="font-bold text-sm truncate">{visit.patient?.name}</p>
                <p className={`text-xs ${activeVisit?.id === visit.id ? 'text-blue-100' : 'text-gray-400'}`}>{visit.patient?.type}</p>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-gray-200">
           <button onClick={onLogout} className="w-full py-2 text-sm text-red-600 font-bold hover:bg-red-50 rounded-lg">Logout</button>
        </div>
      </aside>

      {/* MAIN CONTENT: FORM PEMERIKSAAN */}
      <main className="flex-1 overflow-y-auto bg-[#F0F4F8] p-4 md:p-8">
        {!activeVisit ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <span className="material-symbols-outlined text-6xl mb-4 text-gray-300">medical_services</span>
            <p className="text-lg font-medium">Pilih pasien dari antrian untuk memulai pemeriksaan.</p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Header Pasien */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex justify-between items-center">
               <div>
                  <h2 className="text-2xl font-bold text-[#172A3A]">{activeVisit.patient?.name}</h2>
                  <div className="flex gap-4 text-sm text-gray-500 mt-1">
                     <span>{activeVisit.patient?.nik}</span>
                     <span>•</span>
                     <span>{activeVisit.patient?.birthDate} (Usia: {new Date().getFullYear() - new Date(activeVisit.patient?.birthDate || '').getFullYear()} th)</span>
                  </div>
               </div>
               <div className="text-right">
                  <span className="block text-xs text-gray-400 font-bold uppercase">No. Antrian</span>
                  <span className="text-3xl font-black text-blue-600">{activeVisit.queueNumber}</span>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               
               {/* KOLOM KIRI: SOAP FORM */}
               <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                     <h3 className="font-bold text-[#004346] mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined">clinical_notes</span> Rekam Medis (SOAP)
                     </h3>
                     <div className="space-y-4">
                        <div>
                           <label className="block text-sm font-bold text-gray-700 mb-1">Subjective (Keluhan Pasien)</label>
                           <textarea 
                              rows={3} 
                              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              placeholder="Contoh: Demam sejak 3 hari lalu, pusing, mual..."
                              value={soap.s} onChange={e => setSoap({...soap, s: e.target.value})}
                           ></textarea>
                        </div>
                        <div>
                           <label className="block text-sm font-bold text-gray-700 mb-1">Objective (Pemeriksaan Fisik)</label>
                           <textarea 
                              rows={3} 
                              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              placeholder="Contoh: TD 120/80, Suhu 38C, Tenggorokan merah..."
                              value={soap.o} onChange={e => setSoap({...soap, o: e.target.value})}
                           ></textarea>
                        </div>
                        <div>
                           <label className="block text-sm font-bold text-gray-700 mb-1">Assessment (Diagnosa)</label>
                           <input 
                              type="text"
                              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
                              placeholder="Contoh: ISPA, Febris"
                              value={soap.a} onChange={e => setSoap({...soap, a: e.target.value})}
                           />
                        </div>
                     </div>
                  </div>
               </div>

               {/* KOLOM KANAN: E-PRESCRIPTION */}
               <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-full flex flex-col">
                     <h3 className="font-bold text-[#004346] mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined">pill</span> E-Prescription
                     </h3>
                     
                     {/* Form Tambah Obat */}
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 space-y-3">
                        <select 
                           value={selectedMedId} 
                           onChange={(e) => setSelectedMedId(e.target.value)}
                           className="w-full p-2 border rounded-lg text-sm"
                        >
                           <option value="">-- Pilih Obat --</option>
                           {medicines.map(m => (
                              <option key={m.id} value={m.id}>{m.name} (Stok: {m.stock})</option>
                           ))}
                        </select>
                        <input 
                           placeholder="Dosis (cth: 3x1)" 
                           value={dosage} onChange={e => setDosage(e.target.value)}
                           className="w-full p-2 border rounded-lg text-sm"
                        />
                        <div className="flex gap-2">
                           <input 
                              type="number" min="1" placeholder="Jml" 
                              value={quantity} onChange={e => setQuantity(parseInt(e.target.value))}
                              className="w-20 p-2 border rounded-lg text-sm"
                           />
                           <button 
                              onClick={handleAddMedicine}
                              disabled={!selectedMedId}
                              className="flex-1 bg-[#004346] text-white rounded-lg text-sm font-bold hover:bg-[#003336] disabled:opacity-50"
                           >
                              + Tambah
                           </button>
                        </div>
                     </div>

                     {/* List Resep */}
                     <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-[300px]">
                        {cart.length === 0 ? (
                           <p className="text-center text-xs text-gray-400 italic mt-4">Belum ada resep.</p>
                        ) : (
                           cart.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg shadow-sm text-sm">
                                 <div>
                                    <p className="font-bold text-slate-700">{item.med.name}</p>
                                    <p className="text-xs text-slate-500">{item.dosage} • {item.qty} pcs</p>
                                 </div>
                                 <button onClick={() => handleRemoveMedicine(idx)} className="text-red-400 hover:text-red-600">
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                 </button>
                              </div>
                           ))
                        )}
                     </div>
                  </div>
               </div>
            </div>

            {/* ACTION BUTTON */}
            <div className="fixed bottom-0 left-80 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex justify-end items-center gap-4 z-20">
               <p className="text-sm text-gray-500 italic mr-auto">
                  Status akan berubah menjadi <span className="font-bold text-blue-600">Pharmacy</span> setelah disimpan.
               </p>
               <button 
                  onClick={() => setActiveVisit(null)}
                  className="px-6 py-2.5 rounded-lg text-gray-600 font-bold hover:bg-gray-100 transition-colors"
               >
                  Batal
               </button>
               <button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-[#004346] text-white font-bold hover:bg-[#003336] shadow-lg shadow-[#004346]/20 transition-all active:scale-95 disabled:opacity-70"
               >
                  {loading ? 'Menyimpan...' : (
                     <>
                        <span className="material-symbols-outlined">send</span> Selesai & Kirim
                     </>
                  )}
               </button>
            </div>
            
            {/* Spacer agar konten tidak tertutup fixed button */}
            <div className="h-20"></div>

          </div>
        )}
      </main>
    </div>
  );
};

export default DoctorDashboard;