import { useState } from 'react';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminPages/AdminDashboard'; 
import DoctorDashboard from './pages/DoctorPages/DoctorDashboard'; 
import PharmacistDashboard from './pages/PharmacistPages/PharmacistDashboard'; 
import type { User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);

  if (!user) {
    return <Login onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  if (user.role === 'admin') return <AdminDashboard />;
  if (user.role === 'doctor') return <DoctorDashboard user={user} onLogout={() => setUser(null)} />;
  
  // 2. TAMBAHKAN ROUTING APOTEKER
  if (user.role === 'pharmacist') {
    return <PharmacistDashboard user={user} onLogout={() => setUser(null)} />;
  }

  // Default / Kasir (Bisa diarahkan ke AdminDashboard juga jika kasir pakai dashboard admin)
  return <AdminDashboard />;
}

export default App;