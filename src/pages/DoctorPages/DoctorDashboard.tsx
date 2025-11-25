// src/pages/DoctorPages/DoctorDashboard.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Visit, User, Medicine, MedicalRecord, Prescription, Patient } from '../../types';

interface DoctorDashboardProps {
  user: User;
  onLogout: () => void;
}

const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ user, onLogout }) => {
  // --- STATE DATA UTAMA ---
  const [visits, setVisits] = useState<Visit[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]); // TAMBAHAN: Simpan data semua pasien
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
      // Kita load Visits, Medicines, DAN Patients sekaligus
      const [visitsData, medsData, patientsData] = await Promise.all([
        api.getVisits(),
        api.getMedicines(),
        api.getPatients() // Fetch manual agar nama pasti ada
      ]);

      setVisits(visitsData);
      setMedicines(medsData);
      setPatients(patientsData);
    } catch (error) {
      console.error("Gagal memuat data:", error);
    }
  };

  // --- HELPER: MENDAPATKAN NAMA PASIEN ---
  // Fungsi ini mencari nama pasien dari list patients berdasarkan ID
  const getPatientName = (visit: Visit) => {
    // 1. Coba ambil dari properti patientName (jika ada dari API)
    if (visit.patientName && visit.patientName !== 'Tanpa Nama') return visit.patientName;
    // 2. Coba ambil dari object nested patient (jika expand berhasil)
    if (visit.patient?.name) return visit.patient.name;
    // 3. CARA PALING AMPUH: Cari manual di state patients
    const found = patients.find(p => p.id === visit.patientId);
    return found ? found.name : 'Nama Tidak Ditemukan';
  };

  // --- LOGIKA HISTORY ---
  const handleOpenHistory = () => {
    if (!activeVisit) return;
    
    // Filter visit milik pasien ini yang sudah selesai/di farmasi/kasir
    const history = visits.filter(v => 
      v.patientId === activeVisit.patientId && 
      v.id !== activeVisit.id &&
      (v.status === 'done' || v.status === 'pharmacy' || v.status === 'cashier' || v.status === 'payment')
    );
    
    // Urutkan dari yang terbaru
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
      // Reset form kecil
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
      // 1. Siapkan Data Medical Record
      const newMedicalRecord: MedicalRecord = {
        id: `mr-${Date.now()}`,
        visitId: activeVisit.id,
        complaints: complaints,
        vitalSigns: vitalSigns,
        diagnosis: diagnosis
      };

      // 2. Siapkan Data Resep
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

      // 3. Tentukan Status Berikutnya
      const nextStatus = cart.length > 0 ? 'pharmacy' : 'payment';

      // 4. Update ke Server
      const payload = {
        status: nextStatus as any,
        medicalRecord: newMedicalRecord,
        prescription: newPrescription
      };

      await api.updateVisit(activeVisit.id, payload);

      alert(`Pemeriksaan selesai. Pasien diarahkan ke ${nextStatus === 'pharmacy' ? 'Farmasi' : 'Kasir'}.`);
      
      // Reset & Refresh
      setActiveVisit(null);
      setComplaints(''); setVitalSigns(''); setDiagnosis(''); setCart([]);
      loadData(); // Refresh data
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

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar Antrian */}
      <div className="w-80 bg-white border-r flex flex-col fixed inset-y-0 left-0 z-10">
        <div className="p-5 border-b bg-[#004346] text-white">
          <h2 className="font-bold text-lg">Dr. {user.name}</h2>
          <p className="text-xs opacity-80">{user.specialty || 'Dokter Umum'}</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
           {myQueue.length === 0 && (
             <p className="text-center text-gray-400 text-sm mt-10">Tidak ada antrian.</p>
           )}
           {myQueue.map(visit => (
             <div 
               key={visit.id} 
               onClick={() => {
                 setActiveVisit(visit);
                 setComplaints(''); setVitalSigns(''); setDiagnosis(''); setCart([]);
               }}
               className={`p-4 rounded-xl cursor-pointer border transition-all ${activeVisit?.id === visit.id ? 'bg-teal-50 border-teal-500 ring-1 ring-teal-500' : 'bg-white border-gray-100 hover:border-teal-200'}`}
             >
               {/* Gunakan Helper Function agar nama pasti muncul */}
               <h3 className="font-bold text-gray-800">{getPatientName(visit)}</h3>
               <div className="flex justify-between mt-2 text-xs text-gray-500">
                 <span>No. Antrian: {visit.queueNumber}</span>
                 <span className={`px-2 py-0.5 rounded ${visit.isEmergency ? 'bg-red-100 text-red-600' : 'bg-gray-100'}`}>
                   {visit.isEmergency ? 'Urgent' : 'Reguler'}
                 </span>
               </div>
             </div>
           ))}
        </div>
        
        <div className="p-4 border-t">
          <button onClick={onLogout} className="w-full py-2 text-red-600 font-bold hover:bg-red-50 rounded-lg">Keluar</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="ml-80 flex-1 p-8 pb-24 overflow-y-auto">
        {activeVisit ? (
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* --- HEADER VISIT (PERBAIKAN UTAMA DISINI) --- */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-1">
                  {getPatientName(activeVisit)}
                </h1>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded">No. RM: {activeVisit.patientId}</span>
                  <span>|</span>
                  <span>Tgl: {activeVisit.date}</span>
                </div>
              </div>
              <button 
                onClick={handleOpenHistory}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold hover:bg-blue-100 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">history</span> Riwayat Medis
              </button>
            </div>
            {/* --------------------------------------------- */}

            {/* Form SOAP */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-bold text-gray-700 border-b pb-2">Catatan Medis (SOAP)</h3>
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Keluhan (Subjective)</label>
                  <textarea 
                    rows={3}
                    className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-shadow"
                    value={complaints}
                    onChange={e => setComplaints(e.target.value)}
                    placeholder="Contoh: Demam sejak 3 hari lalu, pusing..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Pemeriksaan Fisik (Objective)</label>
                  <textarea 
                    rows={2}
                    className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-shadow"
                    value={vitalSigns}
                    onChange={e => setVitalSigns(e.target.value)}
                    placeholder="Contoh: TD 120/80, Suhu 38C..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Diagnosa (Assessment)</label>
                  <input 
                    className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-shadow"
                    value={diagnosis}
                    onChange={e => setDiagnosis(e.target.value)}
                    placeholder="Contoh: Febris H-3, Susp. Typoid..."
                  />
                </div>
              </div>
            </div>

            {/* Form Resep */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 border-b pb-2 mb-4">Resep Obat (Planning)</h3>
              
              {/* Input Bar */}
              <form onSubmit={handleAddMedicine} className="bg-gray-50 p-4 rounded-xl mb-4 grid grid-cols-12 gap-3 items-end">
                <div className="col-span-5">
                   <label className="text-xs font-bold text-gray-500 uppercase">Nama Obat</label>
                   <select 
                      value={selectedMedId}
                      onChange={e => setSelectedMedId(e.target.value)}
                      className="w-full p-2.5 border rounded-lg bg-white mt-1"
                   >
                     <option value="">-- Pilih Obat --</option>
                     {medicines.map(m => (
                       <option key={m.id} value={m.id}>{m.name} (Stok: {m.stock})</option>
                     ))}
                   </select>
                </div>
                <div className="col-span-2">
                   <label className="text-xs font-bold text-gray-500 uppercase">Jumlah</label>
                   <input 
                      type="number" min="1"
                      value={quantity}
                      onChange={e => setQuantity(parseInt(e.target.value))}
                      className="w-full p-2.5 border rounded-lg mt-1"
                   />
                </div>
                <div className="col-span-4">
                   <label className="text-xs font-bold text-gray-500 uppercase">Aturan Pakai</label>
                   <input 
                      type="text"
                      value={dosage}
                      onChange={e => setDosage(e.target.value)}
                      placeholder="3x1 sesudah makan"
                      className="w-full p-2.5 border rounded-lg mt-1"
                   />
                </div>
                <div className="col-span-1">
                   <button type="submit" className="w-full bg-teal-700 text-white p-2.5 rounded-lg hover:bg-teal-800 flex justify-center items-center h-[42px]">
                     <span className="material-symbols-outlined">add</span>
                   </button>
                </div>
              </form>

              {/* Tabel Obat */}
              {cart.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-xs">
                      <tr>
                        <th className="p-3">Nama Obat</th>
                        <th className="p-3">Jml</th>
                        <th className="p-3">Aturan</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {cart.map((item, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="p-3 font-medium text-gray-800">{item.med.name}</td>
                          <td className="p-3">{item.qty}</td>
                          <td className="p-3 text-gray-600">{item.dosage}</td>
                          <td className="p-3 text-right">
                            <button onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700 font-bold text-xs uppercase tracking-wide">Hapus</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <p className="text-gray-400 italic text-sm">Belum ada obat yang ditambahkan.</p>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-80 right-0 bg-white border-t p-4 flex justify-between items-center shadow-lg z-20">
               <div className="text-sm text-gray-500 italic px-4">
                  Pastikan semua data sudah benar sebelum disimpan.
               </div>
               <div className="flex gap-4">
                 <button onClick={() => setActiveVisit(null)} className="px-6 py-2.5 rounded-lg text-gray-600 font-bold hover:bg-gray-100 transition-colors">
                   Batal
                 </button>
                 <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 px-8 py-2.5 bg-teal-700 text-white rounded-lg font-bold hover:bg-teal-800 disabled:opacity-50 shadow-lg shadow-teal-700/20 transition-all">
                   {loading ? 'Menyimpan...' : (
                     <><span className="material-symbols-outlined">check_circle</span> Selesai & Kirim</>
                   )}
                 </button>
               </div>
            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-300">
            <span className="material-symbols-outlined text-8xl mb-4 text-gray-200">medical_services</span>
            <p className="text-xl font-medium text-gray-400">Pilih pasien dari antrian untuk memulai pemeriksaan</p>
          </div>
        )}
      </div>

      {/* --- MODAL HISTORY PASIEN --- */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                 <div>
                    <h3 className="font-bold text-lg text-gray-800">Riwayat Medis</h3>
                    <p className="text-sm text-gray-500">Pasien: {activeVisit ? getPatientName(activeVisit) : '-'}</p>
                 </div>
                 <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-2 rounded-full transition-colors">
                    <span className="material-symbols-outlined">close</span>
                 </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6 bg-slate-50">
                 {historyVisits.length > 0 ? (
                    historyVisits.map((h, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative">
                         <div className="absolute top-5 right-5 text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                           {h.date}
                         </div>
                         <div className="mb-4 pr-16">
                            <p className="font-bold text-teal-800 text-lg">{h.doctorName || 'Dokter Umum'}</p>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold mt-1 inline-block uppercase tracking-wide">{h.status}</span>
                         </div>
                         
                         {/* Hasil Medical Record */}
                         <div className="grid grid-cols-1 gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            {h.medicalRecord ? (
                              <>
                                <div><span className="text-xs font-bold text-gray-400 uppercase block mb-1">Diagnosa (A)</span> <span className="font-medium text-gray-800">{h.medicalRecord.diagnosis}</span></div>
                                <div><span className="text-xs font-bold text-gray-400 uppercase block mb-1">Keluhan (S)</span> <span className="text-sm text-gray-600">{h.medicalRecord.complaints}</span></div>
                              </>
                            ) : (
                              <p className="text-sm text-gray-400 italic">Data medis tidak tersedia.</p>
                            )}
                         </div>

                         {/* Hasil Resep */}
                         {h.prescription && h.prescription.items.length > 0 && (
                           <div>
                             <p className="text-xs font-bold text-gray-400 uppercase mb-2">Obat Diberikan:</p>
                             <div className="flex flex-wrap gap-2">
                               {h.prescription.items.map((item, i) => (
                                 <span key={i} className="text-xs px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-blue-700 font-medium">
                                   {item.medicineName} <span className="opacity-70">({item.quantity})</span>
                                 </span>
                               ))}
                             </div>
                           </div>
                         )}
                      </div>
                    ))
                 ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                       <span className="material-symbols-outlined text-4xl mb-2 opacity-50">history_edu</span>
                       <p>Belum ada riwayat medis sebelumnya.</p>
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