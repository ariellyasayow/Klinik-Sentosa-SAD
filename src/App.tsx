import { useState } from 'react';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminPages/AdminDashboard'; 
import DoctorDashboard from './pages/DoctorPages/DoctorDashboard'; // 1. Import DoctorDashboard
import type { User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);

  // Jika belum login, tampilkan halaman Login
  if (!user) {
    return <Login onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  // LOGIC ROUTING: Tentukan tampilan berdasarkan Role user
  
  // A. Jika Role = ADMIN
  if (user.role === 'admin') {
    return <AdminDashboard />;
  }

  // B. Jika Role = DOKTER
  if (user.role === 'doctor') {
    // 2. Render DoctorDashboard
    return (
      <DoctorDashboard 
        user={user} 
        onLogout={() => setUser(null)} 
      />
    );
  }

  // C. Jika Role = LAINNYA (Apoteker/Kasir)
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 font-display">
      <div className="text-center p-8 bg-white rounded-xl shadow-lg">
        <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">engineering</span>
        <h1 className="text-2xl font-bold text-[#004346] mb-2">Halo, {user.name}</h1>
        <p className="text-gray-500 mb-6">Anda login sebagai <span className="font-bold uppercase">{user.role}</span>.<br/>Modul ini sedang dalam pengembangan.</p>
        <button 
          onClick={() => setUser(null)} 
          className="px-6 py-2 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default App;