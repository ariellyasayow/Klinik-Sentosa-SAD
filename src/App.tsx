// src/App.tsx
import React, { useState } from 'react';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminPages/AdminDashboard'; 
import DoctorDashboard from './pages/DoctorPages/DoctorDashboard'; 
import PharmacistDashboard from './pages/PharmacistPages/PharmacistDashboard'; 
import type { User } from './types';

function App() {
  // Simpan user di state (biasanya dari LocalStorage di real app)
  const [user, setUser] = useState<User | null>(null);

  // Jika belum login, tampilkan halaman Login
  if (!user) {
    return <Login onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  // Routing Berdasarkan Role
  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
      
    case 'doctor':
      // Passing user props agar dashboard tahu siapa dokternya
      return <DoctorDashboard user={user} onLogout={() => setUser(null)} />;
      
    case 'pharmacist':
      return <PharmacistDashboard user={user} onLogout={() => setUser(null)} />;
      
    default:
      return (
        <div className="flex h-screen items-center justify-center flex-col">
          <h1 className="text-xl font-bold text-red-600">Akses Ditolak</h1>
          <p>Role pengguna tidak dikenali.</p>
          <button onClick={() => setUser(null)} className="mt-4 px-4 py-2 bg-gray-200 rounded">Keluar</button>
        </div>
      );
  }
}

export default App;