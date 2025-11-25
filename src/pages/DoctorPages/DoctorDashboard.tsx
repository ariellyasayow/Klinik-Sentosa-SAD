import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Visit, User, Medicine, MedicalRecord, Prescription, Patient } from '../../types';

interface DoctorDashboardProps {
  user: User;
  onLogout: () => void;
}

const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ user, onLogout }) => {
  // --- STATE DATA UTAMA (LOGIKA TETAP) ---
  const [visits, setVisits] = useState<Visit[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(false);

  // --- STATE HISTORY PASIEN ---
  const [historyVisits, setHistoryVisits] = useState<Visit[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // --- STATE FORM SOAP ---
  const [complaints, setComplaints] = useState(''); // S
  const [vitalSigns, setVitalSigns] = useState(''); // O
  const [diagnosis, setDiagnosis] = useState('');   // A

  // --- STATE RESEP OBAT ---
  const [cart, setCart] = useState<{ med: Medicine; dosage: string; qty: number }[]>([]);
  const [selectedMedId, setSelectedMedId] = useState('');
  const [dosage, setDosage] = useState('');
  const [quantity, setQuantity] = useState(1);

  // --- LOAD DATA AWAL ---
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [visitsData, medsData, patientsData] = await Promise.all([
        api.getVisits(),
        api.getMedicines(),
        api.getPatients()
      ]);

      setVisits(visitsData);
      setMedicines(medsData);
      setPatients(patientsData);
    } catch (error) {
      console.error("Gagal memuat data:", error);
    }
  };

  // --- HELPER: MENDAPATKAN NAMA PASIEN ---
  const getPatientName = (visit: Visit) => {
    if (visit.patientName && visit.patientName !== 'Tanpa Nama') return visit.patientName;
    if (visit.patient?.name) return visit.patient.name;
    const found = patients.find(p => p.id === visit.patientId);
    return found ? found.name : `Pasien (${visit.patientId})`;
  };

  // --- LOGIKA HISTORY ---
  const handleOpenHistory = () => {
    if (!activeVisit) return;
    const history = visits.filter(v => 
      v.patientId === activeVisit.patientId && 
      v.id !== activeVisit.id &&
      (v.status === 'done' || v.status === 'pharmacy' || v.status === 'cashier' || v.status === 'payment')
    );
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setHistoryVisits(history);
    setShowHistoryModal(true);
  };

  // --- LOGIKA TAMBAH OBAT KE CART ---
  const handleAddMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedId || !dosage) return;
    const med = medicines.find(m => m.id === selectedMedId);
    if (med) {
      setCart([...cart, { med, dosage, qty: quantity }]);
      setSelectedMedId('');
      setDosage('');
      setQuantity(1);
    }
  };

  const handleRemoveItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // --- SIMPAN PEMERIKSAAN ---
  const handleSubmit = async () => {
    if (!activeVisit) return;
    setLoading(true);

    try {
      const newMedicalRecord: MedicalRecord = {
        id: `mr-${Date.now()}`,
        visitId: activeVisit.id,
        complaints: complaints,
        vitalSigns: vitalSigns,
        diagnosis: diagnosis
      };

      let newPrescription: Prescription | undefined = undefined;
      if (cart.length > 0) {
        newPrescription = {
          id: `pr-${Date.now()}`,
          visitId: activeVisit.id,
          status: 'pending',
          items: cart.map(item => ({
            medicineId: item.med.id,
            medicineName: item.med.name,
            dosage: item.dosage,
            quantity: item.qty,
            price: item.med.price
          }))
        };
      }

      const nextStatus = cart.length > 0 ? 'pharmacy' : 'payment';
      const payload = {
        status: nextStatus as any,
        medicalRecord: newMedicalRecord,
        prescription: newPrescription
      };

      await api.updateVisit(activeVisit.id, payload);
      alert(`Pemeriksaan selesai. Pasien diarahkan ke ${nextStatus === 'pharmacy' ? 'Farmasi' : 'Kasir'}.`);
      
      setActiveVisit(null);
      setComplaints(''); setVitalSigns(''); setDiagnosis(''); setCart([]);
      loadData();
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan data.');
    } finally {
      setLoading(false);
    }
  };

  // Filter Antrian untuk Dokter Ini
  const myQueue = visits.filter(v => 
    (v.status === 'examining' || v.status === 'waiting') && 
    (v.doctorId === user.id || !v.doctorId)
  );

  // --- UI RENDER START ---
  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden text-slate-800">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-80 bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-20 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        {/* Header Sidebar */}
        <div className="p-6 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-600/20">
                <span className="material-symbols-outlined text-white">stethoscope</span>
             </div>
             <div>
                <h2 className="font-bold text-lg text-slate-800 leading-none">Poli Umum</h2>
                <p className="text-xs text-slate-400 font-bold tracking-wider mt-1 uppercase">Ruang Pemeriksaan</p>
             </div>
          </div>
          <div className="bg-teal-50 rounded-xl p-3 border border-teal-100 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-teal-600 font-bold border border-teal-100">
                {user.name.charAt(0)}
             </div>
             <div className="overflow-hidden">
                <p className="text-sm font-bold text-teal-900 truncate">Dr. {user.name}</p>
                <p className="text-[10px] text-teal-600 truncate">{user.specialty || 'Dokter Umum'}</p>
             </div>
          </div>
        </div>
        
        {/* List Antrian */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
           <div className="flex justify-between items-center px-1 mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Antrian Pasien</span>
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{myQueue.length}</span>
           </div>

           {myQueue.length === 0 && (
             <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                <span className="material-symbols-outlined text-slate-300 text-3xl mb-2">person_off</span>
                <p className="text-slate-400 text-sm">Tidak ada antrian.</p>
             </div>
           )}

           {myQueue.map(visit => (
             <div 
               key={visit.id} 
               onClick={() => {
                 setActiveVisit(visit);
                 setComplaints(''); setVitalSigns(''); setDiagnosis(''); setCart([]);
               }}
               className={`group p-4 rounded-xl cursor-pointer border transition-all duration-200 relative overflow-hidden ${
                  activeVisit?.id === visit.id 
                  ? 'bg-teal-600 border-teal-600 text-white shadow-lg shadow-teal-600/30' 
                  : 'bg-white border-slate-100 hover:border-teal-300 hover:shadow-md'
               }`}
             >
               <div className="flex justify-between items-start mb-1">
                 <h3 className={`font-bold text-base truncate pr-2 ${activeVisit?.id === visit.id ? 'text-white' : 'text-slate-800'}`}>
                    {getPatientName(visit)}
                 </h3>
                 {visit.isEmergency && (
                    <span className="animate-pulse w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                 )}
               </div>
               
               <div className={`flex justify-between items-center text-xs mt-2 ${activeVisit?.id === visit.id ? 'text-teal-100' : 'text-slate-500'}`}>
                 <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">tag</span> {visit.queueNumber}
                 </span>
                 <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                    activeVisit?.id === visit.id 
                    ? 'bg-white/20 text-white' 
                    : visit.isEmergency ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'
                 }`}>
                   {visit.isEmergency ? 'Urgent' : 'Reguler'}
                 </span>
               </div>
             </div>
           ))}
        </div>
        
        {/* Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button onClick={onLogout} className="w-full py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100 flex items-center justify-center gap-2">
             <span className="material-symbols-outlined">logout</span> Keluar
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="ml-80 flex-1 h-full overflow-y-auto p-8 pb-32 custom-scrollbar bg-slate-50/50">
        {activeVisit ? (
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Header Visit */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-4">
                 <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-teal-500/30">
                    {getPatientName(activeVisit).charAt(0)}
                 </div>
                 <div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-1">
                       {getPatientName(activeVisit)}
                    </h1>
                    <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                       <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">ID: {activeVisit.patientId}</span>
                       <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                       <span>{activeVisit.date}</span>
                    </div>
                 </div>
              </div>
              <button 
                onClick={handleOpenHistory}
                className="mt-4 md:mt-0 flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 transition-all border border-blue-100 hover:shadow-lg hover:shadow-blue-500/10 active:scale-95"
              >
                <span className="material-symbols-outlined text-xl">history</span> Riwayat Medis
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Form SOAP */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                     <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
                        <span className="material-symbols-outlined">clinical_notes</span>
                     </div>
                     <h3 className="font-bold text-lg text-slate-800">Pemeriksaan (SOAP)</h3>
                  </div>
                  
                  <div className="space-y-4 flex-1">
                    <div className="group">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase ml-1 group-focus-within:text-teal-600 transition-colors">Keluhan (Subjective)</label>
                      <textarea 
                        rows={3}
                        className="w-full border border-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all bg-slate-50 focus:bg-white resize-none"
                        value={complaints}
                        onChange={e => setComplaints(e.target.value)}
                        placeholder="Keluhan utama pasien..."
                      />
                    </div>
                    <div className="group">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase ml-1 group-focus-within:text-teal-600 transition-colors">Pemeriksaan Fisik (Objective)</label>
                      <textarea 
                        rows={3}
                        className="w-full border border-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all bg-slate-50 focus:bg-white resize-none"
                        value={vitalSigns}
                        onChange={e => setVitalSigns(e.target.value)}
                        placeholder="Tanda vital, suhu, tensi..."
                      />
                    </div>
                    <div className="group">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase ml-1 group-focus-within:text-teal-600 transition-colors">Diagnosa (Assessment)</label>
                      <input 
                        className="w-full border border-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all bg-slate-50 focus:bg-white font-bold text-slate-800"
                        value={diagnosis}
                        onChange={e => setDiagnosis(e.target.value)}
                        placeholder="Kesimpulan diagnosa..."
                      />
                    </div>
                  </div>
                </div>

                {/* Form Resep */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                     <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                        <span className="material-symbols-outlined">prescriptions</span>
                     </div>
                     <h3 className="font-bold text-lg text-slate-800">Resep Obat (Planning)</h3>
                  </div>
                  
                  {/* Input Resep */}
                  <form onSubmit={handleAddMedicine} className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-200 space-y-3">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Pilih Obat</label>
                        <select 
                           value={selectedMedId}
                           onChange={e => setSelectedMedId(e.target.value)}
                           className="w-full mt-1 p-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer"
                        >
                           <option value="">-- Cari Obat --</option>
                           {medicines.map(m => (
                           <option key={m.id} value={m.id}>{m.name} (Stok: {m.stock})</option>
                           ))}
                        </select>
                     </div>
                     <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                           <label className="text-xs font-bold text-slate-500 uppercase ml-1">Aturan Pakai</label>
                           <input 
                              type="text"
                              value={dosage}
                              onChange={e => setDosage(e.target.value)}
                              placeholder="3x1 sesudah makan"
                              className="w-full mt-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white"
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-slate-500 uppercase ml-1">Jumlah</label>
                           <input 
                              type="number" min="1"
                              value={quantity}
                              onChange={e => setQuantity(parseInt(e.target.value))}
                              className="w-full mt-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white"
                           />
                        </div>
                     </div>
                     <button type="submit" className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined">add_circle</span> Tambah ke Resep
                     </button>
                  </form>

                  {/* List Obat */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar border rounded-xl bg-white min-h-[150px]">
                     {cart.length > 0 ? (
                        <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 sticky top-0">
                           <tr>
                              <th className="p-3 font-bold uppercase text-xs">Obat</th>
                              <th className="p-3 font-bold uppercase text-xs text-center">Jml</th>
                              <th className="p-3 font-bold uppercase text-xs">Aturan</th>
                              <th className="p-3 font-bold uppercase text-xs text-right">#</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {cart.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-bold text-slate-700">{item.med.name}</td>
                              <td className="p-3 text-center font-medium bg-slate-50 rounded-lg">{item.qty}</td>
                              <td className="p-3 text-slate-500">{item.dosage}</td>
                              <td className="p-3 text-right">
                                 <button onClick={() => handleRemoveItem(idx)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                 </button>
                              </td>
                              </tr>
                           ))}
                        </tbody>
                        </table>
                     ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300">
                           <span className="material-symbols-outlined text-3xl mb-2">medication_liquid</span>
                           <p className="text-sm">Belum ada obat ditambahkan</p>
                        </div>
                     )}
                  </div>
                </div>
            </div>

            {/* Bottom Floating Action */}
            <div className="fixed bottom-0 left-80 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 flex justify-between items-center z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
               <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="material-symbols-outlined text-teal-600">info</span>
                  <p>Pastikan data sudah benar sebelum disimpan.</p>
               </div>
               <div className="flex gap-4">
                  <button onClick={() => setActiveVisit(null)} className="px-6 py-3 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors">
                    Batal
                  </button>
                  <button onClick={handleSubmit} disabled={loading} className="px-8 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 shadow-lg shadow-teal-600/30 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2">
                    {loading ? 'Menyimpan...' : (
                      <><span className="material-symbols-outlined">check_circle</span> Selesai & Kirim</>
                    )}
                  </button>
               </div>
            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300">
            <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
               <span className="material-symbols-outlined text-6xl text-slate-300">medical_services</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-400 mb-2">Ruang Pemeriksaan Siap</h2>
            <p className="text-slate-400">Pilih pasien dari antrian di sebelah kiri untuk memulai.</p>
          </div>
        )}
      </main>

      {/* --- MODAL HISTORY PASIEN --- */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <div>
                    <h3 className="font-bold text-lg text-slate-800">Riwayat Medis</h3>
                    <p className="text-sm text-slate-500">Pasien: {activeVisit ? getPatientName(activeVisit) : '-'}</p>
                 </div>
                 <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors">
                    <span className="material-symbols-outlined">close</span>
                 </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/50 custom-scrollbar">
                 {historyVisits.length > 0 ? (
                    historyVisits.map((h, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative group">
                         <div className="absolute top-5 right-5 text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                           {h.date}
                         </div>
                         <div className="mb-4 pr-24">
                            <p className="font-bold text-teal-800 text-lg flex items-center gap-2">
                               <span className="material-symbols-outlined">person</span>
                               {h.doctorName || 'Dokter Umum'}
                            </p>
                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold mt-1 inline-block uppercase tracking-wide border border-green-200">{h.status}</span>
                         </div>
                         
                         {/* Hasil SOAP */}
                         <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 mb-4">
                            {h.medicalRecord ? (
                              <>
                                <div className="grid grid-cols-[80px_1fr] gap-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase pt-0.5">Diagnosa</span>
                                    <span className="font-bold text-slate-800 text-sm">{h.medicalRecord.diagnosis}</span>
                                </div>
                                <div className="grid grid-cols-[80px_1fr] gap-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase pt-0.5">Keluhan</span>
                                    <span className="text-sm text-slate-600 leading-relaxed">{h.medicalRecord.complaints}</span>
                                </div>
                              </>
                            ) : (
                              <p className="text-sm text-slate-400 italic flex items-center gap-2">
                                 <span className="material-symbols-outlined text-lg">folder_off</span> Data medis tidak tersedia.
                              </p>
                            )}
                         </div>

                         {/* Hasil Resep */}
                         {h.prescription && h.prescription.items.length > 0 && (
                           <div>
                             <p className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">pill</span> Obat Diberikan
                             </p>
                             <div className="flex flex-wrap gap-2">
                               {h.prescription.items.map((item, i) => (
                                 <span key={i} className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 font-medium shadow-sm">
                                   {item.medicineName} <span className="text-slate-400 ml-1">x{item.quantity}</span>
                                 </span>
                               ))}
                             </div>
                           </div>
                         )}
                      </div>
                    ))
                 ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                       <span className="material-symbols-outlined text-5xl mb-3 opacity-30">history_edu</span>
                       <p className="font-medium">Belum ada riwayat medis.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;