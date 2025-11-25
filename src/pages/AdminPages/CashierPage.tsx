import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Transaction, Visit, Patient } from '../../types';

const CashierPage: React.FC = () => {
  const [pendingList, setPendingList] = useState<Transaction[]>([]);
  const [historyList, setHistoryList] = useState<Transaction[]>([]);
  
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'paid'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal & Payment State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'tunai' | 'nontunai'>('tunai');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [change, setChange] = useState<number>(0);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [visitsData, transactionsData, patientsData] = await Promise.all([
        api.getVisits(),       
        api.getTransactions(),
        api.getPatients()
      ]);

      // --- 1. OLAH DATA PENDING (TAGIHAN MASUK) ---
      const pendingVisits = visitsData.filter(v => v.status === 'payment');
      
      const formattedPending: Transaction[] = pendingVisits.map(v => {
        const foundPatient = patientsData.find(p => p.id === v.patientId);
        const realName = foundPatient?.name || v.patient?.name || v.patientName || `Pasien (${v.patientId})`;
        const totalAmount = v.prescription?.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
        
        return {
          id: v.id, 
          visitId: v.id,
          patientName: realName,
          description: `Tagihan Obat & Jasa (Tgl: ${v.date})`,
          amount: totalAmount,
          status: 'pending',
          date: v.date,
          items: v.prescription?.items.map(i => ({
             id: i.medicineId,
             name: i.medicineName,
             quantity: i.quantity,
             price: i.price,
             type: 'medicine'
          })) || []
        };
      });
      setPendingList(formattedPending);

      // --- 2. OLAH DATA RIWAYAT (HANYA YANG LUNAS) ---
      // PERBAIKAN DISINI: Kita filter hanya yang status === 'paid'
      const paidTransactions = transactionsData.filter(t => t.status === 'paid');
      
      setHistoryList(paidTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

    } catch (error) {
      console.error("Gagal memuat data kasir:", error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // --- FILTERING ---
  useEffect(() => {
    let result = activeTab === 'pending' ? pendingList : historyList;
    
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.patientName.toLowerCase().includes(lower) || 
        t.id.toLowerCase().includes(lower)
      );
    }
    setFilteredTransactions(result);
  }, [pendingList, historyList, activeTab, searchQuery]);

  // --- HELPER FUNCTIONS ---
  const handleCashInput = (val: string) => {
    const cleanVal = val.replace(/\D/g, '');
    setCashReceived(cleanVal);
    if (selectedTx && cleanVal) { 
      setChange(parseInt(cleanVal) - selectedTx.amount); 
    } else { 
      setChange(0); 
    }
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const openPaymentModal = (tx: Transaction) => {
    setSelectedTx(tx); 
    setPaymentMethod('tunai'); 
    setCashReceived(''); 
    setChange(-tx.amount); 
    setIsModalOpen(true);
  };

  // --- PROSES PEMBAYARAN ---
  const handleProcessPayment = async () => {
    if (!selectedTx) return;
    if (paymentMethod === 'tunai' && change < 0) { 
      alert("Uang pembayaran kurang!"); 
      return; 
    }

    if (confirm("Konfirmasi pembayaran dan cetak struk?")) {
      try {
        const newTransaction = {
            ...selectedTx,
            status: 'paid' as const, // Pastikan tersimpan sebagai PAID
            date: new Date().toISOString().split('T')[0]
        };
        
        await api.addTransaction(newTransaction);
        
        if (selectedTx.visitId) {
           await api.updateVisitStatus(selectedTx.visitId, 'done');
        }

        alert("Pembayaran Berhasil!");
        setIsModalOpen(false);
        loadData(); 
      } catch (error) {
        console.error(error);
        alert("Gagal memproses pembayaran.");
      }
    }
  };

  return (
    <div className="p-6 md:p-8 font-sans text-slate-800">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Kasir / Pembayaran</h1>
        <p className="text-slate-500">Proses pembayaran tagihan pasien.</p>
      </div>

      <div className="flex border-b border-gray-300 mb-6">
        <button 
            onClick={() => setActiveTab('pending')} 
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'pending' ? 'border-teal-600 text-teal-700 bg-teal-50' : 'border-transparent text-gray-500 hover:text-teal-600'}`}
        >
            Tagihan Masuk <span className="ml-2 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs">{pendingList.length}</span>
        </button>
        <button 
            onClick={() => setActiveTab('paid')} 
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'paid' ? 'border-teal-600 text-teal-700 bg-teal-50' : 'border-transparent text-gray-500 hover:text-teal-600'}`}
        >
            Riwayat Transaksi
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
           <div className="relative max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
                placeholder="Cari Nama Pasien / ID..." 
              />
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 border-b border-gray-200 text-gray-600 uppercase text-xs">
               <tr>
                  <th className="px-6 py-4 font-bold">Ref ID / Visit</th>
                  <th className="px-6 py-4 font-bold">Nama Pasien</th>
                  <th className="px-6 py-4 font-bold">Keterangan</th>
                  <th className="px-6 py-4 font-bold">Total Tagihan</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-center">Aksi</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && filteredTransactions.length === 0 ? (
                 <tr><td colSpan={6} className="text-center py-12 text-gray-500">Memuat data...</td></tr>
              ) : filteredTransactions.length === 0 ? (
                 <tr><td colSpan={6} className="text-center py-12 text-gray-400 italic">Tidak ada data ditemukan.</td></tr>
              ) : (
                 filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-teal-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{tx.id}</td>
                    <td className="px-6 py-4 font-bold text-gray-800">{tx.patientName}</td>
                    <td className="px-6 py-4 text-gray-600 truncate max-w-xs">{tx.description}</td>
                    <td className="px-6 py-4 font-bold text-teal-700 text-base">{formatRupiah(tx.amount)}</td>
                    <td className="px-6 py-4">
                        {tx.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700">
                                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span> Belum Bayar
                            </span>
                        ) : (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                                Lunas
                            </span>
                        )}
                    </td>
                    <td className="px-6 py-4 text-center">
                        {tx.status === 'pending' ? (
                            <button onClick={() => openPaymentModal(tx)} className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md shadow-teal-200 transition-all active:scale-95">
                                <span className="material-symbols-outlined text-sm">payments</span> Bayar
                            </button>
                        ) : (
                            <button className="text-gray-400 hover:text-gray-600 font-bold text-xs flex items-center justify-center gap-1 mx-auto">
                                <span className="material-symbols-outlined text-sm">receipt</span> Cetak
                            </button>
                        )}
                    </td>
                  </tr>
                 ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b p-5 bg-gray-50 rounded-t-2xl">
                <div>
                   <h2 className="text-xl font-bold text-gray-800">Konfirmasi Pembayaran</h2>
                   <p className="text-sm text-gray-500">Pasien: {selectedTx.patientName}</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><span className="material-symbols-outlined">close</span></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Rincian Tagihan</h3>
                  <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200 overflow-hidden">
                     {(selectedTx.items || [{ name: selectedTx.description, price: selectedTx.amount, quantity: 1 }]).map((item, idx) => (
                        <div key={idx} className="flex justify-between p-4 text-sm hover:bg-white transition-colors">
                           <div>
                              <p className="font-bold text-gray-700">{item.name || 'Jasa Medis'}</p>
                              <p className="text-xs text-gray-500">Qty: {item.quantity || 1}</p>
                           </div>
                           <p className="font-bold text-gray-800">{formatRupiah(item.price * (item.quantity || 1))}</p>
                        </div>
                     ))}
                  </div>
              </div>

              <div className="bg-teal-50 p-5 rounded-xl border border-teal-100 space-y-5">
                 <div className="flex justify-between items-center pb-4 border-b border-teal-200">
                    <span className="font-bold text-teal-800 text-lg">Total Tagihan</span>
                    <span className="font-black text-3xl text-teal-800">{formatRupiah(selectedTx.amount)}</span>
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-teal-700 uppercase mb-2">Metode Pembayaran</label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className={`cursor-pointer border-2 rounded-xl p-3 flex items-center gap-3 transition-all ${paymentMethod === 'tunai' ? 'border-teal-600 bg-white shadow-md' : 'border-transparent bg-teal-100/50 hover:bg-teal-100'}`}>
                           <input type="radio" name="pay" className="accent-teal-600 w-5 h-5" checked={paymentMethod === 'tunai'} onChange={() => setPaymentMethod('tunai')} />
                           <span className="font-bold text-teal-900">Tunai (Cash)</span>
                        </label>
                        <label className={`cursor-pointer border-2 rounded-xl p-3 flex items-center gap-3 transition-all ${paymentMethod === 'nontunai' ? 'border-teal-600 bg-white shadow-md' : 'border-transparent bg-teal-100/50 hover:bg-teal-100'}`}>
                           <input type="radio" name="pay" className="accent-teal-600 w-5 h-5" checked={paymentMethod === 'nontunai'} onChange={() => setPaymentMethod('nontunai')} />
                           <span className="font-bold text-teal-900">QRIS / Transfer</span>
                        </label>
                    </div>
                 </div>

                 {paymentMethod === 'tunai' && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                        <div>
                            <label className="block text-xs font-bold text-teal-700 uppercase mb-1">Uang Diterima</label>
                            <input 
                                autoFocus
                                type="text" 
                                value={cashReceived ? parseInt(cashReceived).toLocaleString('id-ID') : ''} 
                                onChange={(e) => handleCashInput(e.target.value)}
                                className="w-full p-3 rounded-lg border-2 border-teal-200 focus:border-teal-600 outline-none text-right font-bold text-xl text-gray-700"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-teal-700 uppercase mb-1">Kembalian</label>
                            <div className={`w-full p-3 rounded-lg border-2 border-transparent text-right font-bold text-xl ${change < 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                                {formatRupiah(change)}
                            </div>
                        </div>
                    </div>
                 )}
              </div>
            </div>

            <div className="p-5 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
               <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-colors">Batal</button>
               <button 
                  onClick={handleProcessPayment} 
                  disabled={paymentMethod === 'tunai' && change < 0}
                  className="bg-teal-700 hover:bg-teal-800 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-teal-700/30 flex items-center gap-2 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
               >
                  <span className="material-symbols-outlined">print</span> Bayar & Cetak
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierPage;