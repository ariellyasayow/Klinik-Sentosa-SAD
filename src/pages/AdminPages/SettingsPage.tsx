import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { User, Medicine, ClinicInfo } from '../../types';

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'medicines' | 'clinic'>('users');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo>({ name: '', address: '', phone: '', email: '' });
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '', role: 'doctor' as const });
  const [medForm, setMedForm] = useState({ name: '', price: 0, stock: 0 });

  useEffect(() => { loadData(); }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') { const data = await api.getUsers(); setUsers(data); }
      else if (activeTab === 'medicines') { const data = await api.getMedicines(); setMedicines(data); }
      else if (activeTab === 'clinic') { 
         try { const data = await api.getClinicInfo(); setClinicInfo(data); } 
         catch { setClinicInfo({ name: "Klinik Sentosa", address: "", phone: "", email: "" }); }
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleAddUser = async (e: React.FormEvent) => { e.preventDefault(); await api.addUser(userForm); setIsUserModalOpen(false); setUserForm({ name: '', username: '', password: '', role: 'doctor' }); loadData(); alert("User ditambahkan!"); };
  const handleDeleteUser = async (id: string) => { if(confirm("Hapus user?")) { await api.deleteUser(id); loadData(); } };
  const handleAddMedicine = async (e: React.FormEvent) => { e.preventDefault(); await api.addMedicine(medForm); setIsMedModalOpen(false); setMedForm({ name: '', price: 0, stock: 0 }); loadData(); alert("Obat ditambahkan!"); };
  const handleDeleteMedicine = async (id: string) => { if(confirm("Hapus obat?")) { await api.deleteMedicine(id); loadData(); } };
  const handleSaveClinic = async (e: React.FormEvent) => { e.preventDefault(); await api.updateClinicInfo(clinicInfo); alert("Profil disimpan!"); };

  return (
    <div className="p-6 md:p-8 font-display text-[#004346]">
      <div className="mb-6"><h1 className="text-2xl font-bold text-[#172A3A]">Pengaturan Sistem</h1><p className="text-[#508991]">Kelola akses, data obat, dan profil klinik.</p></div>
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {['users', 'medicines', 'clinic'].map((tab) => (
           <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-3 text-sm font-bold border-b-2 transition-all capitalize whitespace-nowrap ${activeTab === tab ? 'border-[#74B3CE] text-[#74B3CE]' : 'border-transparent text-gray-500 hover:text-[#004346]'}`}>{tab === 'users' ? 'Manajemen User' : tab === 'medicines' ? 'Master Obat' : 'Profil Klinik'}</button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50"><h3 className="font-bold text-slate-700">Daftar Pengguna</h3><button onClick={() => setIsUserModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><span className="material-symbols-outlined text-lg">person_add</span> Tambah</button></div>
          <table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-500 uppercase text-xs"><tr><th className="p-4">Nama</th><th className="p-4">Username</th><th className="p-4">Role</th><th className="p-4 text-center">Aksi</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-blue-50/20">
                  <td className="p-4 font-bold text-slate-700">{u.name}</td><td className="p-4 text-slate-500 font-mono">@{u.username}</td>
                  <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'doctor' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{u.role}</span></td>
                  <td className="p-4 text-center">{u.username !== 'admin' && <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><span className="material-symbols-outlined text-lg">delete</span></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'medicines' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50"><h3 className="font-bold text-slate-700">Stok Obat & Harga</h3><button onClick={() => setIsMedModalOpen(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><span className="material-symbols-outlined text-lg">add_box</span> Tambah</button></div>
          <table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-500 uppercase text-xs"><tr><th className="p-4">Nama Obat</th><th className="p-4">Stok</th><th className="p-4">Harga</th><th className="p-4 text-center">Aksi</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {medicines.map(m => (
                <tr key={m.id} className="hover:bg-green-50/20"><td className="p-4 font-bold text-slate-700">{m.name}</td><td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${m.stock < 10 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>{m.stock} Unit</span></td><td className="p-4 font-mono font-bold">Rp {m.price.toLocaleString('id-ID')}</td><td className="p-4 text-center"><button onClick={() => handleDeleteMedicine(m.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><span className="material-symbols-outlined text-lg">delete</span></button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'clinic' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-3xl">
           <form onSubmit={handleSaveClinic} className="space-y-5 w-full">
             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Klinik</label><input required className="w-full border border-gray-300 rounded-lg p-3 font-bold text-slate-800" value={clinicInfo.name} onChange={e => setClinicInfo({...clinicInfo, name: e.target.value})} /></div>
             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alamat</label><textarea required className="w-full border border-gray-300 rounded-lg p-3 text-slate-800" rows={3} value={clinicInfo.address} onChange={e => setClinicInfo({...clinicInfo, address: e.target.value})}></textarea></div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telepon</label><input required className="w-full border border-gray-300 rounded-lg p-3 text-slate-800" value={clinicInfo.phone} onChange={e => setClinicInfo({...clinicInfo, phone: e.target.value})} /></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label><input required type="email" className="w-full border border-gray-300 rounded-lg p-3 text-slate-800" value={clinicInfo.email} onChange={e => setClinicInfo({...clinicInfo, email: e.target.value})} /></div></div>
             <button type="submit" className="bg-[#004346] text-white px-8 py-3 rounded-lg font-bold shadow hover:opacity-90 flex items-center gap-2"><span className="material-symbols-outlined">save</span> Simpan</button>
           </form>
        </div>
      )}

      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="font-bold text-lg mb-4">Tambah User</h3>
              <form onSubmit={handleAddUser} className="space-y-3">
                 <input required placeholder="Nama" className="w-full border p-2 rounded" value={userForm.name} onChange={e=>setUserForm({...userForm, name: e.target.value})} />
                 <input required placeholder="Username" className="w-full border p-2 rounded" value={userForm.username} onChange={e=>setUserForm({...userForm, username: e.target.value})} />
                 <select className="w-full border p-2 rounded bg-white" value={userForm.role} onChange={e=>setUserForm({...userForm, role: e.target.value as any})}>
                    <option value="doctor">Dokter</option><option value="pharmacist">Apoteker</option><option value="admin">Admin</option>
                 </select>
                 <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={()=>setIsUserModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded">Batal</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-bold">Simpan</button></div>
              </form>
           </div>
        </div>
      )}
      {isMedModalOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white p-6 rounded-xl w-full max-w-md"><h3 className="font-bold text-lg mb-4">Tambah Obat</h3><form onSubmit={handleAddMedicine} className="space-y-3"><input className="w-full border p-2 rounded" placeholder="Nama Obat" value={medForm.name} onChange={e=>setMedForm({...medForm, name: e.target.value})}/><div className="grid grid-cols-2 gap-3"><input type="number" className="w-full border p-2 rounded" placeholder="Harga" value={medForm.price || ''} onChange={e=>setMedForm({...medForm, price: parseInt(e.target.value)})}/><input type="number" className="w-full border p-2 rounded" placeholder="Stok" value={medForm.stock || ''} onChange={e=>setMedForm({...medForm, stock: parseInt(e.target.value)})}/></div><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={()=>setIsMedModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded">Batal</button><button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Simpan</button></div></form></div></div>)}
    </div>
  );
};

export default SettingsPage;