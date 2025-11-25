
# Sistem Informasi Manajemen Klinik Sentosa (SIM-KS)

![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5-purple?style=for-the-badge&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-cyan?style=for-the-badge&logo=tailwindcss)

Aplikasi manajemen klinik berbasis web modern ("Clean Medical Dashboard") yang dirancang untuk mendigitalkan seluruh operasional Klinik Sentosa. Sistem ini mengintegrasikan pendaftaran, rekam medis elektronik (EMR), manajemen farmasi, hingga pembayaran kasir dalam satu alur kerja yang mulus.

## ✨ Fitur Utama

Aplikasi ini dibagi berdasarkan role pengguna dengan antarmuka yang modern dan responsif:

### 1. Administrator (Pendaftaran)
* **Dashboard Statistik:** Ringkasan kunjungan, dokter aktif, dan pasien dalam antrian.
* **Pendaftaran Cepat:** Pencarian pasien lama (autocomplete) atau input pasien baru.
* **Mode Darurat (Emergency):** Tombol khusus untuk mendaftarkan pasien darurat tanpa input data lengkap di awal.
* **Manajemen Antrian:** Mengatur alur pasien ke poli dokter.

### 2. Dokter (Pemeriksaan)
* **Antrian Real-time:** Melihat daftar pasien yang menunggu di poli.
* **Rekam Medis (SOAP):** Input Subjective, Objective, Assessment, dan Planning secara digital.
* **Riwayat Medis:** Melihat history pemeriksaan pasien sebelumnya (diagnosis & obat).
* **E-Prescription:** Input resep obat digital yang langsung terhubung ke stok farmasi.

### 3. Apoteker (Farmasi)
* **Notifikasi Resep:** Menerima data resep langsung dari dokter.
* **Manajemen Stok:** Sistem otomatis mengurangi stok obat saat resep diproses.
* **Kartu Resep Digital:** Tampilan detail obat dan dosis yang jelas.

### 4. Kasir (Pembayaran)
* **Tagihan Terintegrasi:** Menerima total biaya (Jasa Medis + Obat) secara otomatis.
* **Multi-Metode:** Dukungan simulasi pembayaran Tunai (hitung kembalian) dan Non-Tunai.
* **Riwayat Transaksi:** Mencatat semua transaksi yang sudah lunas.

## 🛠️ Teknologi

* **Frontend:** React + TypeScript (Vite)
* **Styling:** Tailwind CSS (dengan kustomisasi animasi & glassmorphism)
* **Icons:** Material Symbols (Google Fonts)
* **Backend (Simulasi):** JSON Server (Mensimulasikan REST API penuh dengan database lokal)

## 🚀 Cara Menjalankan (Instalasi)

Ikuti langkah berikut untuk menjalankan proyek di komputer lokal Anda.

### 1. Prasyarat
Pastikan **Node.js** (versi 18+) sudah terinstal di komputer Anda.

### 2. Instalasi Dependency
Buka terminal di dalam folder proyek dan jalankan:

```bash
npm install
````

### 3\. Menjalankan Aplikasi

Aplikasi ini memerlukan **dua terminal** yang berjalan bersamaan:

**Terminal 1 (Backend / Mock API):**
Jalankan server database tiruan (berjalan di port 3000).

```bash
npm run mock
```

**Terminal 2 (Frontend / UI):**
Jalankan tampilan aplikasi (berjalan di port 5173).

```bash
npm run dev
```

Buka browser dan akses: **http://localhost:5173**

## 🔐 Akun Demo (Login)

Gunakan kredensial berikut untuk masuk ke berbagai dashboard:

| Role | Username | Password | Deskripsi |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Akses Dashboard Pendaftaran & Pengaturan |
| **Dokter** | `dokter` | `dokter123` | Akses Poli & Rekam Medis |
| **Apoteker** | `apotek` | `apotek123` | Akses Farmasi & Stok Obat |
| **Kasir** | `kasir` | `kasir123` | Akses Pembayaran |

*(Catatan: Anda dapat menambahkan user baru melalui menu Pengaturan di Dashboard Admin)*

## 📂 Struktur Database (`db.json`)

Data aplikasi disimpan secara lokal dalam file `db.json` yang bertindak sebagai database.

  * **users:** Data pengguna untuk login.
  * **patients:** Database induk pasien (Nama, NIK, Alamat).
  * **visits:** Data kunjungan (Menyimpan status antrian, data SOAP dokter, dan resep).
  * **medicines:** Data master obat dan jumlah stok.
  * **transactions:** Data riwayat pembayaran yang sukses/lunas.
  * **doctorSchedules:** Jadwal praktek dokter.

## 🔄 Alur Kerja Sistem (Workflow)

1.  **Admin** mendaftarkan pasien (Baru/Lama) -\> Data masuk ke `visits` dengan status `waiting`.
2.  **Dokter** melihat antrian, memeriksa pasien, mengisi SOAP & Resep -\> Status berubah menjadi `pharmacy`.
3.  **Apoteker** melihat resep masuk, menyiapkan obat, mengurangi stok -\> Status berubah menjadi `payment`.
4.  **Kasir** melihat tagihan, memproses pembayaran -\> Status berubah menjadi `done` dan data tersimpan di `transactions`.

-----

*Dikembangkan untuk modernisasi Klinik Sentosa.*

```
```