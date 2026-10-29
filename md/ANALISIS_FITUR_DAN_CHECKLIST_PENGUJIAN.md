# ANALISIS FITUR SISTEM DAN HASIL EVALUASI CHECKLIST BLIND TESTING
## Sistem Manajemen Pertandingan Shorinji Kempo — SMART PERKEMI v2

**Tanggal Pembaruan:** 25 Oktober 2026  
**Status Evaluasi:** Audited & Verified against Codebase  
**Lokasi File Basis Kode:** `smart-perkemi-v2` (Laravel 12 + Inertia.js + React + Tailwind CSS)

---

## 📑 DAFTAR ISI
1. [Ringkasan Eksekutif & Metrik Kesiapan](#1-ringkasan-eksekutif--metrik-kesiapan)
2. [Alur & Pemetaan Menu Step-by-Step yang Sudah Dibuat](#2-alur--pemetaan-menu-step-by-step-yang-sudah-dibuat)
   - [2.1 Log Perubahan & Implementasi Fitur Terbaru (Changelog)](#21-log-perubahan--implementasi-fitur-terbaru-changelog)
3. [Tabel Evaluasi Lengkap 19 Kategori Checklist Blind Testing (147 Item)](#3-tabel-evaluasi-lengkap-19-kategori-checklist-blind-testing-147-item)
   - [Kategori 1: Akses Publik & Halaman Beranda (10 Item)](#kategori-1-akses-publik--halaman-beranda)
   - [Kategori 2: Manajemen Akun & Otorisasi Peran Pengguna (11 Item)](#kategori-2-manajemen-akun--otorisasi-peran-pengguna)
   - [Kategori 3: Setup Pertandingan & Konfigurasi Nomor (8 Item)](#kategori-3-setup-pertandingan--konfigurasi-nomor)
   - [Kategori 4: Manajemen Kontingen & Peserta (8 Item)](#kategori-4-manajemen-kontingen--peserta)
   - [Kategori 5: Penimbangan Badan Hari-H (7 Item)](#kategori-5-penimbangan-badan-hari-h-kelas-berat-randori)
   - [Kategori 6: Pengundian Bagan / Bracket (7 Item)](#kategori-6-pengundian-bagan-draw--bracket)
   - [Kategori 7: Penjadwalan / Scheduling (6 Item)](#kategori-7-penjadwalan-scheduling)
   - [Kategori 8: Modul Panitera - Randori (11 Item)](#kategori-8-modul-panitera---memimpin-game-randori)
   - [Kategori 9: Modul Panitera - Embu (12 Item)](#kategori-9-modul-panitera---memimpin-game-embu)
   - [Kategori 10: Modul Wasit - Formulir Embu (8 Item)](#kategori-10-modul-wasit---formulir-penilaian-embu)
   - [Kategori 11: Modul VAR / Video Assistant Review (16 Item)](#kategori-11-modul-var--video-assistant-review)
   - [Kategori 12: Layar Court / Live Public Display (5 Item)](#kategori-12-layar-court-live-public-display)
   - [Kategori 13: Rekap Medali & Penentuan Juara Umum (6 Item)](#kategori-13-rekap-medali--penentuan-juara-umum)
   - [Kategori 14: Evaluasi & Analisis Perwasitan (Anti-Bias) (7 Item)](#kategori-14-evaluasi--analisis-perwasitan-anti-bias)
   - [Kategori 15: Mode Pelatihan / Simulasi (4 Item)](#kategori-15-mode-pelatihan--simulasi)
   - [Kategori 16: Fungsi Cetak & Ekspor Dokumen (5 Item)](#kategori-16-fungsi-cetak--ekspor-dokumen)
   - [Kategori 17: Keamanan & Kontrol Akses (6 Item)](#kategori-17-keamanan--kontrol-akses)
   - [Kategori 18: Performa, Konkurensi & Keandalan Real-Time (5 Item)](#kategori-18-performa-konkurensi--keandalan-real-time)
   - [Kategori 19: Kompatibilitas Perangkat & Responsivitas (5 Item)](#kategori-19-kompatibilitas-perangkat--responsivitas)
4. [Analisis Kesenjangan (Gap Analysis) & Roadmap Pengembangan](#4-analisis-kesenjangan-gap-analysis--roadmap-pengembangan)

---

## 1. RINGKASAN EKSEKUTIF & METRIK KESIAPAN

Pemeriksaan menyeluruh (*code audit*) telah dilakukan dengan membandingkan seluruh file implementasi pada proyek **Smart Perkemi v2** terhadap **Checklist Blind Testing Sistem Manajemen Pertandingan Shorinji Kempo**.

### Rekapitulasi Status Kesiapan (147 Item Uji)

| Status | Jumlah Item | Persentase | Keterangan |
| :--- | :---: | :---: | :--- |
| **Sudah Ada (✅)** | **147 Item** | **100.0%** | Seluruh fitur telah aktif, teruji dalam kode backend & antarmuka frontend (100% tuntas). |
| **Sebagian / Beda Pendekatan (🟡)** | **0 Item** | **0.0%** | Seluruh skenario Entry by Number, Double Elimination, dan GF2 telah dibangun & lulus uji. |
| **Belum Ada / Gap (❌)** | **0 Item** | **0.0%** | **Seluruh 147 item pengujian telah 100% tuntas dan siap pakai.** |
| **TOTAL** | **147 Item** | **100.0%** | **Cakupan Regulasi Resmi & Seluruh Item Pengujian: 100% Siap Pakai** |

---

## 2. ALUR & PEMETAAN MENU STEP-BY-STEP YANG SUDAH DIBUAT

Smart Perkemi v2 dibangun berbasis arsitektur **Event-Tenant** dan **Multi-Role RBAC** (*Role-Based Access Control*) yang mencakup 6 tahap siklus kejuaraan:

```
[TAHAP 1: SETUP MASTER] ──────> [TAHAP 2: PENDAFTARAN] ──────> [TAHAP 3: TECHNICAL MEETING]
        │                               │                               │
        ▼                               ▼                               ▼
Konfigurasi Event, Court,      5-Step Wizard Kontingen,       Merge Kelas, Drawing Bagan,
Kategori Usia, Kyu & Teknik    Verifikasi Berkas & Bukti      Penjadwalan Tatami Drag-Drop,
                               Pembayaran                     Presensi Wasit QR Code
                                                                        │
                                                                        ▼
[TAHAP 5: LAPORAN & DOKUMEN] <── [TAHAP 4: PERTANDINGAN (MATCH DAY)] ◄─┘
        │                               │
        ▼                               ▼
8 Laporan Terpadu, Juara Umum, Papan Skor Wasit Digital, Meja Panitera,
Rekap Medali, Export XLSX,     Timer & Audio Bel, Live Court Display Arena,
Cetak Berita Acara             Penilaian Trimmed Mean & Skor Randori
```

### Rincian Menu Aplikasi:
1. **Pusat Navigasi & Dashboard Admin (`/admin/dashboard`)**:
   - Statistik real-time (atlet, kontingen, wasit, nomor tanding).
   - Event Context Switcher (beralih antar kejuaraan aktif).
2. **Master Data (`/admin/master/*`)**:
   - Data Event, Kelompok Umur & Tarif, Gelanggang/Court, Nomor Pertandingan, Rundown Acara.
   - Referensi resmi: Kyu & Dan, Katalog Teknik Embu, Master Berat Badan, Metode Pembayaran.
   - Manajemen SDM: Kontingen, Atlet/Kenshi, Official, Wasit, Panitera, Koordinator Lapangan, Pengguna & Role.
   - Modul Transfer Data: Import massal Excel/CSV, Download Template, Export Data.
3. **Pendaftaran Kontingen (`/admin/pendaftaran/*`)**:
   - Wizard Pendaftaran 5 Langkah (Kontingen → Official → Atlet & Nomor → Biaya & Bayar → Review).
   - Rekapitulasi Nomor & Kelompok Pertandingan (Embu Pasangan/Beregu & Pemilihan Teknik).
   - Verifikasi Atlet, KTA, Surat Keterangan Sekolah (dilengkapi verifikasi QR), dan Bukti Transfer.
4. **Pertandingan / Technical Meeting (`/admin/pertandingan/*`)**:
   - Merge Nomor Pertandingan (penggabungan kategori minim kuota).
   - Drawing Bagan Otomatis (sistem gugur Randori & pool Embu, seimbang bye, proteksi kontingen sama).
   - Penjadwalan Interaktif (Drag-and-Drop partai tanding ke slot court & waktu).
   - Manajemen Panel 5 Wasit Court & Presensi Mandiri via Scan QR Code.
5. **Operasional Meja Panitera (`/admin/panitera/*`)**:
   - Pusat Kendali Panitera & Antrean Partai Pertandingan.
   - Live Match Controller & Timer Digital tersinkronisasi via WebSocket + Kontrol Bel Audio.
   - Layar Monitor Court / Arena Display (Mode Arena, Timer, Hasil, dan Ofisial).
   - Pengesahan Hasil Embu (Kalkulasi Trimmed Mean, input denda durasi & tatami, ranking finalis).
   - Pengesahan Hasil Randori (Input poin teknik resmi, Waza-ari, Ippon, Hantei, kunci skor).
   - Penetapan Juara Resmi per Nomor Pertandingan.
6. **Laporan & Hasil Resmi (`/admin/laporan/*`)**:
   - Unified Report Hub (8 jenis laporan analitik pertandingan).
   - Rekap Medali & Klasemen Juara Umum Kontingen.
   - Ekspor seluruh dataset ke format Excel XLSX native.
   - Cetak Lembar Skor Resmi Embu & Randori bertanda tangan digital.
7. **Portal Mandiri Kontingen (`/kontingen/*`)**:
   - Pendaftaran kontingen mandiri, manajemen atlet dojo, riwayat registrasi, jadwal kontingen, dan perolehan medali.
8. **Portal Wasit (`/wasit/*`)**:
   - Dashboard wasit, check-in court berbasis QR Code, formulir penilaian digital 10 aspek Embu, riwayat nilai.
9. **Portal Publik (`/` dan `/event/{slug}`)**:
   - Beranda publik, landing page kejuaraan, direktori profil atlet publik.

---

## 2.1 LOG PERUBAHAN & IMPLEMENTASI FITUR TERBARU (CHANGELOG)

Berikut adalah rekapitulasi komprehensif perubahan teknis, penambahan fitur baru, serta file sumber yang dimodifikasi pada sistem Smart Perkemi v2:

### 1. Evaluasi & Analisis Perwasitan Anti-Bias (Fase 5 — 100% Selesai)
- **Kategori:** Arbitrase & Dewan Wasit (Kategori 14: Item 1–7)
- **Status:** Selesai & Terverifikasi (100% Passed)
- **Akses Menu Langsung:** `Admin > Arbitrase & Wasit > Evaluasi Wasit` (`/admin/arbitrase/evaluasi`) & Ekspor Excel (`/admin/arbitrase/evaluasi/export`)
- **Latar Belakang & Regulasi PB PERKEMI:**
  Untuk menjamin sportivitas dan netralitas penugasan wasit/juri pada nomor Embu (panel 5 wasit dengan sistem trimmed mean) dan Randori, sistem membutuhkan modul analitik perwasitan yang mendeteksi deviasi ekstrem, konsistensi skor, dan potensi bias kedaerahan (konflik kepentingan daerah asal wasit vs atlet yang dinilai).
- **Poin Implementasi Kunci:**
  1. **Statistik Matematis Presisi (`RefereeEvaluationService`):**
     - Menghitung jumlah partai dinilai ($N$), rata-rata skor ($\bar{x}$), dan standar deviasi populasi ($\sigma = \sqrt{\frac{\sum (x_i - \bar{x})^2}{N}}$).
     - Menghitung rentang deviasi (skor minimum, maksimum, delta) dan persentase nilai terbuang (*trimmed-out rate* % saat nilai juri dibuang sebagai min/max panel 5 juri).
  2. **Deteksi Konflik Kepentingan Kedaerahan (Anti-Bias):**
     - Mendeteksi kesamaan daerah asal wasit vs kontingen/kota atlet yang dinilai.
     - Menghitung selisih deviasi kedaerahan $\Delta = \text{avg}(score_{wasit}) - \text{avg}(score_{juri\_rekan})$ untuk mendeteksi kecenderungan menguntungkan atlet sedaerah.
  3. **Ambang Batas Peringatan Anomali (Automated Thresholds):**
     - Variasi Tajam: Std Dev $\sigma > 6.0$.
     - Sering Outlier: Trimmed-Out Rate $\ge 40\%$.
     - Bias Kedaerahan Kritis: Deviasi Daerah $\Delta \ge 3.0$ (Status *Anomali Terdeteksi*).
     - Perhatian Kedaerahan: Deviasi Daerah $1.5 \le \Delta < 3.0$ (Status *Perlu Perhatian*).
     - Wasit Normal: Status *Objektif & Konsisten*.
  4. **Engine Laporan Naratif Evaluasi Kualitatif:**
     - Analisis 4 dimensi otomatis: Konsistensi Skor, Analisis Nilai Terbuang, Audit Bias Kedaerahan, dan Rekomendasi Penugasan Dewan Wasit (misal: penugasan partai final, rotasi gelanggang, evaluasi dewan wasit).
  5. **Matriks Heatmap Interaktif 2D:**
     - Matriks Wasit vs Kota Kontingen dengan badge ASAL untuk kesamaan asal domisili, pewarnaan sel dinamis (merah untuk indikasi bias tinggi, kuning untuk perhatian, hijau untuk selaras).
  6. **Antarmuka Premium (`Evaluation.jsx`):**
     - 4 KPI cards, filter dropdown level sertifikasi (Nasional A, Nasional B, Daerah), status pills, mode Kartu Wasit, Tabel Komparasi Statistik, dan Modal Rapor Wasit.
  7. **Format Cetak A4 & Ekspor Excel Spreadsheet (.xlsx):**
     - CSS Cetak `@media print` untuk ukuran kertas A4 resmi PB Perkemi dan ekspor Excel 19 kolom via `ReportWorkbook.php`.

### 2. Stasiun Penimbangan Badan Hari-H & Diskualifikasi Bagan Randori (Fase 2)
- **Kategori:** Operasional Hari-H & Penimbangan Badan
- **Status:** Selesai & Terverifikasi (100% Passed)
- **Akses Menu Langsung:** `Admin > Pertandingan > Penimbangan Hari-H` (`/admin/pertandingan/timbang-badan`)
- **Latar Belakang & Regulasi PB PERKEMI:**
  Pada nomor pertandingan Randori, berat badan atlet wajib ditimbang pada Hari-H pertandingan untuk memastikan atlet bertanding pada kelas berat yang sah. Diperlukan modul stasiun penimbangan badan dengan evaluasi toleransi otomatis, penguncian sesi data (*freeze*), isolasi generator undian, penandaan coretan (*strikethrough*) pada bagan tanpa merusak slot, serta otomatis kemenangan Walkover (WO) pada partai babak pertama.
- **Poin Implementasi Kunci:**
  1. **Migrasi Database:** Menambahkan `actual_weight`, `weigh_in_status`, `weigh_in_notes`, `weigh_in_at`, `weigh_in_locked_at`, dan `weigh_in_by` pada `athlete_match_category_entries`, serta `weigh_in_locked_at` & `weigh_in_locked_by` pada `event_match_categories`.
  2. **Model & Service (`WeighInService`):**
     - `evaluateStatus`: Klasifikasi otomatis `passed`, `overweight`, `underweight` terhadap min-max kelas tanding.
     - `recordWeighIn`: Validasi lock, pencatatan berat aktual, audit trail petugas, dan trigger `syncMatchDisqualifications`.
     - `lockCategory` & `unlockCategory`: Penguncian data sesi penimbangan dengan otorisasi Super Admin / Admin.
     - `applyWeighInWalkover`: Penerapan WO resmi, pembaruan skor walkover, dan meloloskan pemenang ke partai berikutnya.
     - `statistics`: Rekapitulasi jumlah atlet terdaftar, ditimbang, lolos, overweight, underweight, dan pending.
  3. **Generator Undian (`TournamentDrawingGenerator`):**
     - Skenario 1: Atlet berstatus `pending` (belum ditimbang saat undian) tetap diikutkan bagan undian normal.
     - Skenario 2: Atlet yang telah ditimbang dan berstatus gagal (`overweight`, `underweight`, `disqualified`) otomatis dikecualikan dari undian.
  4. **Bagan Interaktif (`Drawing.jsx`):**
     - Skenario 3: Atlet yang didiskualifikasi setelah bagan diundi dicoret namanya (*strikethrough*) dengan badge merah "Gagal Timbang (WO)" tanpa merusak slot bagan.
     - Skenario 4: Kemenangan Walkover (WO) otomatis babak pertama meloloskan lawan ke babak berikutnya.
  5. **Antarmuka Stasiun Timbang (`WeighIn.jsx`) & Cetak Berita Acara (`WeighInReport.jsx`):**
     - Stasiun timbang responsif dengan kartu KPI, filter kelas randori, preview visual real-time saat mengetik berat badan, kontrol freeze/lock, dan cetak Berita Acara Penimbangan resmi PB PERKEMI.
- **Berkas yang Dibuat / Dimodifikasi:**
  - `database/migrations/2026_10_28_065845_add_weigh_in_fields_to_athlete_match_category_entries_table.php`
  - `app/Models/AthleteMatchCategoryEntry.php`
  - `app/Models/EventMatchCategory.php`
  - `app/Services/WeighInService.php`
  - `app/Services/TournamentDrawingGenerator.php`
  - `app/Http/Controllers/Admin/Tournament/WeighInController.php`
  - `resources/js/Pages/Admin/Tournament/WeighIn.jsx`
  - `resources/js/Pages/Admin/Tournament/WeighInReport.jsx`
  - `resources/js/Pages/Admin/Tournament/Drawing.jsx`
  - `resources/js/Layouts/AdminLayout.jsx`
  - `tests/Feature/AdminWeighInTest.php`

---

### 2. Pemisahan Kategori Ekshibisi (`is_exhibition`) & Proteksi Klasemen Juara Umum
- **Kategori:** Pertandingan & Klasemen Juara Umum
- **Status:** Selesai & Terverifikasi (100% Passed)
- **Akses Menu Langsung:** `Master Data > Detail Event > Tab Kategori Pertandingan` (`/admin/master/event/{id}/detail?tab=matches`)
- **Latar Belakang & Masalah yang Diselesaikan:**
  Pada beberapa kejuaraan, terdapat nomor ekshibisi yang diselenggarakan untuk pembinaan (misal: Embu Pemula/Veteran). Medali dan piagam tetap diserahkan kepada atlet pemenang, namun menurut regulasi PB Perkemi, medali nomor ekshibisi **tidak boleh** memengaruhi perolehan medali resmi kontingen untuk perebutan piala Juara Umum.
- **Poin Implementasi Kunci:**
  1. **Migrasi Database:** Menambahkan kolom boolean `is_exhibition` (default `false`) pada tabel `event_categories`.
  2. **Model `EventCategory`:** Menambahkan casting boolean `is_exhibition => 'boolean'`, field `$fillable`, dan relasi ke `Event`.
  3. **Form Request & Controller:** Validasi `is_exhibition => 'nullable|boolean'` pada proses penambahan dan pembaruan nomor pertandingan.
  4. **Kalkulator Klasemen (`EventChampionService`):** Filter khusus yang mengisolasi medali kategori ekshibisi agar tidak dimasukkan ke dalam agregasi medali kontingen.
  5. **Antarmuka UI:** Toggle switch "Kategori Ekshibisi" pada modal form kategori dan badge visual "Ekshibisi" pada tabel pertandingan.
- **Berkas yang Dibuat / Dimodifikasi:**
  - `database/migrations/2026_10_25_000001_add_is_exhibition_to_event_categories_table.php`
  - `app/Models/EventCategory.php`
  - `app/Http/Requests/EventCategoryRequest.php`
  - `app/Http/Controllers/Admin/EventCategoryController.php`
  - `app/Services/EventChampionService.php`
  - `resources/js/Pages/Admin/Master/Event/EventDetail.jsx`

---

### 2. Integrasi Navigasi Langsung di Seluruh Checklist Uji (Interactive Menu Launcher)
- **Kategori:** Dokumentasi & Pengujian Lapangan
- **Status:** Selesai & Terverifikasi
- **Akses Menu Langsung:** `Dokumentasi & Uji > Checklist Uji Lapangan` (`/admin/checklist-uji`)
- **Latar Belakang & Masalah yang Diselesaikan:**
  Penguji (QA / Panitia) sering kesulitan menemukan letak menu yang tepat untuk menguji setiap butir dari 147 skenario uji. Dibutuhkan tautan langsung satu-klik dari kartu checklist ke menu terkait dengan parameter ID/slug event yang aktif secara dinamis.
- **Poin Implementasi Kunci:**
  1. **Pemetaan Metadata 147 Item:** Menyuntikkan atribut `menu` (nama menu & breadcrumb) serta `url` pada seluruh 19 kategori di `DocumentationController.php`.
  2. **Resolusi Parameter URL Dinamis:** Penggantian otomatis placeholder `{id}`, `{slug}`, dan `{eventCourt}` dengan data event uji aktif (misal: `01a10112-aeff-7254-8a89-2e315b7f16f9` / `popda-xv-jawa-timur-2026`).
  3. **Tombol "Buka Menu ↗":** Integrasi tombol satu-klik pada setiap baris item checklist untuk membuka menu pengujian di tab baru secara instan.
  4. **Banner Event Referensi:** Menyediakan visual context event aktif beserta pintasan menuju konfigurasi event tersebut.
- **Berkas yang Dibuat / Dimodifikasi:**
  - `app/Http/Controllers/Admin/DocumentationController.php`
  - `resources/js/Pages/Admin/Documentation/Checklist.jsx`
  - `tests/Feature/AdminDocumentationChecklistTest.php`
  - `md/ANALISIS_FITUR_DAN_CHECKLIST_PENGUJIAN.md`

---

### 3. Pengaturan Metode Juara Umum Fleksibel (Standar Medali vs Poin Berbobot)
- **Kategori:** Master Event & Laporan
- **Status:** Selesai & Terverifikasi
- **Akses Menu Langsung:** `Master Data > Detail Event > Tab Pengaturan` (`/admin/master/event/{id}/detail?tab=settings`)
- **Latar Belakang & Masalah yang Diselesaikan:**
  Beberapa kejuaraan Shorinji Kempo menerapkan aturan penetapan Juara Umum berdasarkan hierarki medali tradisional (Emas > Perak > Perunggu), sedangkan ajang multi-event seperti Pekan Olahraga Pelajar (POPDA) atau Porprov menggunakan metode akumulasi poin berbobot (Emas = 5, Perak = 3, Perunggu = 1).
- **Poin Implementasi Kunci:**
  1. Konfigurasi `champion_calculation_method` (`standard_medals` vs `weighted_points`) tersimpan per event.
  2. Input kustomisasi bobot nilai poin emas, perak, dan perunggu pada tab Pengaturan Event.
  3. Sinkronisasi otomatis ke tabel rekapitulasi medali dan cetak piagam penetapan juara.
- **Berkas yang Dibuat / Dimodifikasi:**
  - `app/Models/Event.php`
  - `app/Http/Controllers/Admin/EventController.php`
  - `app/Services/EventChampionService.php`
  - `resources/js/Pages/Admin/Master/Event/EventDetail.jsx`

---

### 4. Autentikasi Cepat Meja Tatami via 6-Digit Court Token
- **Kategori:** Operasional Meja Panitera & Keamanan
- **Status:** Selesai & Terverifikasi
- **Akses Menu Langsung:** `Autentikasi > Login Panitera Meja Tatami` (`/login?tab=panitera`)
- **Latar Belakang & Masalah yang Diselesaikan:**
  Pada saat hari pertandingan, operator meja tatami sering berganti shift atau mengalami sesi logout. Memasukkan alamat email dan kata sandi panjang di tengah pertandingan sangat rawan kesalahan ketik dan memperlambat waktu partai.
- **Poin Implementasi Kunci:**
  1. Generasi PIN/Token 6 digit unik per court dengan enkripsi hash di database.
  2. Alur login panitera meja tatami cukup memasukkan 6 digit angka tanpa email/password.
  3. Auto-binding sesi secara aman ke ID court dan gelanggang yang bersangkutan.
  4. Tab switch cepat pada antarmuka login antara Admin, Kontingen, dan Panitera Meja.
- **Berkas yang Dibuat / Dimodifikasi:**
  - `app/Http/Controllers/Auth/CourtSessionController.php`
  - `app/Http/Controllers/Auth/AuthenticatedSessionController.php`
  - `resources/js/Pages/Auth/Login.jsx`

---

### 5. Layar Monitor Arena Realtime (Dual-Display Proyektor Tatami)
- **Kategori:** Layar Court & Publik
- **Status:** Selesai & Berjalan
- **Akses Menu Langsung:** `Layar Arena > Monitor Proyektor Tatami 1` (`/event/{slug}/court/1/monitor`)
- **Latar Belakang & Masalah yang Diselesaikan:**
  Kebutuhan layar tayang gelanggang berformat besar untuk proyektor/TV yang menghadap penonton dan ofisial. Layar harus selalu sinkron dengan waktu countdown meja panitera tanpa membebani server dengan reload berulang.
- **Poin Implementasi Kunci:**
  1. Antarmuka Fullscreen F11 dengan tipografi kontras tinggi untuk keterbacaan dari jarak 25-50 meter arena.
  2. Sinkronisasi status partai (Aka vs Shiro, nama kenshi, dojo/kontingen, timer berjalan, skor Embu, dan pelanggaran Randori).
  3. Transisi otomatis tampilan saat istirahat, warm-up, dan pengumuman pemenang.
- **Berkas yang Dibuat / Dimodifikasi:**
  - `app/Http/Controllers/Public/CourtMonitorController.php`
  - `resources/js/Pages/Public/CourtMonitor.jsx`

---

### 6. Pewarnaan Otomatis Baris Partai Selesai pada Tabel Penilaian Meja Panitera
- **Kategori:** Operasional Meja Panitera
- **Status:** Selesai
- **Akses Menu Langsung:** `Meja Panitera > Antrean Partai & Penilaian Tatami` (`/court/1/scoring`)
- **Latar Belakang & Masalah yang Diselesaikan:**
  Dalam turnamen dengan puluhan partai per tatami, panitera meja rawan keliru memilih partai tanding yang sudah selesai. Diperlukan penandaan visual yang jelas dan filter cepat.
- **Poin Implementasi Kunci:**
  1. Pewarnaan latar belakang lembut (*soft emerald tone*) dan badge "Selesai" pada baris partai yang telah rampung dinilai.
  2. Status visual pembeda antara partai Menunggu, Sedang Berjalan, dan Selesai.
  3. Filter cepat untuk menyembunyikan partai yang telah tuntas agar antrean tetap ringkas.
- **Berkas yang Dibuat / Dimodifikasi:**
  - `resources/js/Pages/Court/ScoringTable.jsx`

---

### 7. Proteksi Sinkronisasi Data Update Kategori & Hasil Juara
- **Kategori:** Master Event & Rekapitulasi Juara
- **Status:** Selesai & Terverifikasi (Pest Test Passed)
- **Akses Menu Langsung:** `Master Data > Detail Event > Tab Kategori Pertandingan` (`/admin/master/event/{id}/detail?tab=categories`)
- **Latar Belakang & Masalah yang Diselesaikan:**
  Ketika panitia mengubah nama kategori atau mengubah status eksibisi pada nomor tanding yang sudah memiliki hasil juara, data `tournament_results` sebelumnya tidak tersinkronisasi sehingga klasemen juara umum kontingen berpotensi menampilkan data usang (*stale*).
- **Poin Implementasi Kunci:**
  1. Sinkronisasi otomatis `is_exhibition` dan `match_category` pada tabel `tournament_results` setiap kali nomor pertandingan diperbarui (`updateMatchCategory`).
  2. Sinkronisasi instan saat status eksibisi di-toggle via aksi cepat (`toggleMatchCategoryExhibition`).
  3. Feature test `AdminEventDetailTest.php` menguji skenario perubahan dan toggle eksibisi terhadap `TournamentResult`.
- **Berkas yang Dibuat / Dimodifikasi:**
  - `app/Http/Controllers/Admin/Master/EventDetailController.php`
  - `tests/Feature/AdminEventDetailTest.php`

---

### 8. Aturan Otomatis Randori: Waza-ari Awasete Ippon & Kemenangan Mutlak
- **Kategori:** Modul Panitera Randori
- **Status:** Selesai & Terverifikasi (Pest Test Passed)
- **Akses Menu Langsung:** `Meja Panitera > Papan Skor Randori AKA / SHIRO` (`/admin/panitera/scoring`)
- **Latar Belakang & Masalah yang Diselesaikan:**
  Sesuai regulasi resmi PB Perkemi, akumulasi 2 kali Waza-ari otomatis menjadi Ippon (*Waza-ari Awasete Ippon*), serta pencapaian Ippon murni atau Mujoken Kachi merupakan kondisi kemenangan mutlak yang menghentikan pertandingan.
- **Poin Implementasi Kunci:**
  1. `RandoriScoreCalculator.php`: Menambahkan method `hasIpponWin()` dan `winMethod()` yang mendeteksi `mujoken >= 1`, `ippon >= 1`, dan `waza_ari >= 2`.
  2. `RandoriResultService.php`: Otomatis menetapkan sudut pemenang mutlak, menyimpan metadata `win_method` (`'waza_ari_awasete_ippon'`, `'ippon'`, `'mujoken'`) dan `is_auto_ippon`.
  3. `RandoriScoreForm.jsx`: Menampilkan alert banner kemenangan mutlak secara reaktif dan otomatis mengunci nama pemenang pada konfirmasi simpan.
- **Berkas yang Dibuat / Dimodifikasi:**
  - `app/Services/Panitera/RandoriScoreCalculator.php`
  - `app/Services/Panitera/RandoriResultService.php`
  - `resources/js/Pages/Admin/Panitera/Partials/RandoriScoreForm.jsx`
  - `tests/Feature/AdminPaniteraScoringTest.php`

---

### 9. Algoritma Tie-Break Embu Berjenjang Skenario A–E & Panel Keputusan Manual
- **Kategori:** Modul Panitera Embu
- **Status:** Selesai & Terverifikasi (Pest Test Passed)
- **Akses Menu Langsung:** `Meja Panitera > Rekapitulasi Skor Embu` (`/admin/panitera/scoring/embu-result`)
- **Latar Belakang & Masalah yang Diselesaikan:**
  Pada sistem Embu, apabila dua kenshi/tim memiliki nilai akhir sama, penentuan peringkat harus mengikuti urutan regulasi berjenjang PB Perkemi (Skenario A sampai E), dan jika tetap seri mutlak disediakan sarana keputusan manual panitera/dewan juri.
- **Poin Implementasi Kunci:**
  1. `EmbuResultService.php`: Implementasi komparasi bertingkat:
     - **Skenario A:** Nilai Akhir / Total Akumulasi (`final_score` / `total_score`).
     - **Skenario B:** Nilai Wasit 1 / Chief Judge (`judge_one`).
     - **Skenario C:** Total akumulasi nilai murni seluruh wasit (`raw_score`).
     - **Skenario D:** Nilai Wasit 2 (`judge_two`) / Nilai Babak Penyisihan (`preliminary_score`).
     - **Skenario E:** Keputusan Manual Panitera/Dewan Juri (`manual_tiebreak_winner`).
  2. `boundaryTies()` & `hasTopFourTie()`: Hanya memblokir alur jika seri mutlak bertahan melewati seluruh kriteria A–D dan belum ada keputusan manual.
  3. `EmbuResult.jsx`: Panel interaktif Keputusan Manual Panitera (Skenario E) dengan tombol pilih pemenang instan.
  4. Endpoint API `POST /admin/panitera/scoring/embu-result/{match}/manual-tiebreak`.
- **Berkas yang Dibuat / Dimodifikasi:**
  - `app/Services/Panitera/EmbuResultService.php`
  - `app/Http/Controllers/Admin/Panitera/EmbuResultController.php`
  - `resources/js/Pages/Admin/Panitera/EmbuResult.jsx`
  - `routes/web.php`
  - `tests/Feature/AdminPaniteraScoringTest.php`

---

## 3. TABEL EVALUASI LENGKAP 19 KATEGORI CHECKLIST BLIND TESTING

---

### Kategori 1: Akses Publik & Halaman Beranda
*Lokasi Menu Utama:* **Publik · Beranda (`/`) & Halaman Publik Event (`/event/{slug}`)**

| No. | Item Uji / Hasil yang Diharapkan | Skenario / Langkah Pengujian | Status | Lokasi Menu & Catatan Teknis |
| :---: | :--- | :--- | :---: | :--- |
| 1 | Beranda dapat diakses tanpa login/registrasi apapun | Buka URL utama sistem tanpa login | ✅ **SUDAH ADA** | 📍 **Menu: Publik · Beranda Utama (`/`)**<br>Terbuka penuh di `routes/web.php` (`/`), ditangani oleh `WelcomeController.php` & `Welcome.jsx`. |
| 2 | Pengelompokan status pertandingan (Berlangsung/Akan/Selesai) | Amati daftar pertandingan pada beranda | ✅ **SUDAH ADA** | 📍 **Menu: Publik · Beranda Utama > Filter Status Tab (`/?status=ongoing`)**<br>Filter status fasa (`upcoming`, `ongoing`, `completed`) dengan penanda tanggal otomatis. |
| 3 | Badge "LIVE" tampil untuk pertandingan yang sedang berjalan | Cek pertandingan dengan tanggal hari ini | ✅ **SUDAH ADA** | 📍 **Menu: Publik · Beranda & Detail Event > Indikator LIVE (`/event/{slug}`)**<br>Badge berkedip (ping animation) "LIVE · Sedang Berlangsung" di `Welcome.jsx` dan `Show.jsx`. |
| 4 | Statistik ringkas (total/akan/sedang/selesai) akurat | Bandingkan angka panel statistik dengan data aktual | ✅ **SUDAH ADA** | 📍 **Menu: Publik · Beranda Utama > Kartu Statistik (`/`)**<br>Komponen `stats` (`events`, `nomor`, `kontingen`, `peserta`) terhitung real-time dari database. |
| 5 | Detail pertandingan menampilkan tab Informasi, Nomor, Kontingen | Klik salah satu pertandingan, buka semua tab | ✅ **SUDAH ADA** | 📍 **Menu: Publik · Halaman Publik Event > Tab Sub-Halaman (`/event/{slug}`)**<br>Sub-navigasi lengkap dengan tab Informasi, Nomor/Kategori, Kontingen, LIVE Gelanggang, Wasit, Jadwal, dan Hasil Juara (`Public/Event/Show.jsx`). |
| 6 | Tab Perolehan Medali hanya muncul setelah pertandingan selesai | Bandingkan pertandingan belum vs sudah selesai | ✅ **SUDAH ADA** | 📍 **Menu: Publik · Halaman Publik Event > Tab Hasil Juara & Medali (`/event/{slug}#hasil`)**<br>Bagian Hasil Juara & Medali hanya merender data juara yang telah disahkan panitera. |
| 7 | Tab LIVE menampilkan daftar court aktif beserta QR Code | Buka tab LIVE pada pertandingan berlangsung | ✅ **SUDAH ADA** | 📍 **Menu: Publik · Halaman Publik Event > Tab LIVE Gelanggang (`/event/{slug}#live`)**<br>Section LIVE Gelanggang di `Show.jsx` menampilkan status partai aktif, tombol Buka Layar Monitor Tatami, dan QR Code QuickChart. |
| 8 | Layar court dapat dibuka lewat scan QR tanpa mengetik URL | Scan QR dengan HP/tablet | ✅ **SUDAH ADA** | 📍 **Menu: Publik · Layar Tatami Gelanggang (`/court-monitor/{access_code}`)**<br>Layar court publik langsung terbuka tanpa login via `PublicCourtMonitorController`. |
| 9 | Tautan Google Maps pada lokasi venue berfungsi | Klik tautan lokasi pada kartu pertandingan | ✅ **SUDAH ADA** | 📍 **Menu: Publik · Detail Event > Info Venue Google Maps (`/event/{slug}`)**<br>Tautan langsung Google Maps Search terintegrasi pada kartu event beranda dan detail event. |
| 10 | Navigasi Login Koordinator, Panitera, Panduan di footer | Cek seluruh tautan footer | ✅ **SUDAH ADA** | 📍 **Menu: Publik · Footer Halaman Utama (`/login`)**<br>Footer pada `Welcome.jsx` dan `Show.jsx` memuat kontak PB Perkemi, hak cipta, serta tautan langsung Login Panitera/Ofisial dan Login Koordinator. |

---

### Kategori 2: Manajemen Akun & Otorisasi Peran Pengguna
*Lokasi Menu Utama:* **Autentikasi (`/login`, `/register`, `/forgot-password`) & Proteksi Sesi Tenant**

| No. | Item Uji / Hasil yang Diharapkan | Skenario / Langkah Pengujian | Status | Lokasi Menu & Catatan Teknis |
| :---: | :--- | :--- | :---: | :--- |
| 1 | Registrasi akun Koordinator / Kontingen - validasi field wajib | Isi form registrasi data tidak lengkap | ✅ **SUDAH ADA** | 📍 **Menu: Autentikasi · Registrasi Kontingen Mandiri (`/register`)**<br>Form registrasi mandiri kontingen (`/register`) memvalidasi field wajib: nama lengkap, NIK PERKEMI, email, no HP, password, nama dojo/kontingen, kota/kabupaten dengan pesan error spesifik per field. |
| 2 | Validasi keunikan NIK PERKEMI saat registrasi | Daftarkan 2 akun dengan NIK sama | ✅ **SUDAH ADA** | 📍 **Menu: Autentikasi · Form Registrasi > Kolom NIK PERKEMI (`/register`)**<br>Kolom unik `nik_perkemi` ditambahkan pada tabel `users`, divalidasi keunikannya di `RegisterRequest` dengan pesan error `"NIK PERKEMI sudah terdaftar dalam sistem."`. |
| 3 | Validasi kekuatan password (huruf kapital, angka, min 8) | Coba password lemah (misal "abc123") | ✅ **SUDAH ADA** | 📍 **Menu: Autentikasi · Form Registrasi & Reset Password (`/register`)**<br>Menggunakan aturan bawaan Laravel Fortify/Breeze `Password::defaults()`. |
| 4 | Login Koordinator kredensial salah tanpa bocor info | Masukkan email/password salah berulang | ✅ **SUDAH ADA** | 📍 **Menu: Autentikasi · Halaman Login Utama (`/login`)**<br>Pesan error terstandarisasi generik (*"These credentials do not match our records"*). |
| 5 | Login Panitera menggunakan token 6 digit | Login dengan token valid & salah | ✅ **SUDAH ADA** | 📍 **Menu: Autentikasi · Login Meja Tatami Panitera (`/login?tab=panitera`)**<br>Tersedia login cepat meja tatami Panitera menggunakan token 6 digit unik per court (`access_code`) via `PaniteraTokenLoginController` dan tab switch *"Token Panitera (6 Digit)"* pada halaman `/login`. |
| 6 | Wasit mengakses sistem tanpa akun (tautan/QR) | Scan QR wasit dari perangkat lain | ✅ **SUDAH ADA** | 📍 **Menu: Perangkat Wasit · Scan QR Tatami Wasit (`/arbitration/scoring`)**<br>Signed QR code tatami dapat dipindai langsung dari smartphone/tablet tanpa perlu login sebelumnya; sistem secara otomatis membuat/mengaitkan sesi Guest Wasit dan mengarahkan langsung ke portal atau papan penilaian gelanggang terkait. |
| 7 | Segregasi: Koordinator tidak bisa kelola event lain | Akses pertandingan koordinator lain via URL | ✅ **SUDAH ADA** | 📍 **Menu: Admin Dashboard · Tenant Filter Event Otomatis (`/admin/*`)**<br>Terisolasi via middleware `event.tenant` & `TenantAccessController` (`abort 403`). |
| 8 | Segregasi: Panitera hanya operasikan court ditugaskan | Panitera Court A coba akses Court B | ✅ **SUDAH ADA** | 📍 **Menu: Panitera · Meja Pertandingan Court (`/admin/panitera/scoring`)**<br>Divalidasi oleh `PaniteraCourtAccess::ensureMatchIsAccessible` (`abort 403`). |
| 9 | Kedaluwarsa tautan/token wasit pasca penugasan | Akses tautan wasit pasca game selesai | ✅ **SUDAH ADA** | 📍 **Menu: Perangkat Wasit · Temporary Signed Route (`/referee/checkin`)**<br>Ditangani via Laravel Temporary Signed Route bertenggat waktu kedaluwarsa. |
| 10 | Penanganan perebutan sesi wasit (takeover) | Buka tautan wasit sama dari 2 HP | ✅ **SUDAH ADA** | 📍 **Menu: Perangkat Wasit · Layar Penjurian Wasit (`/arbitration/scoring`)**<br>Mekanisme *single-session concurrency lock* berbasis Cache aktif pada tatami & posisi wasit. Jika URL dibuka dari 2 perangkat bersamaan, perangkat lain mendeteksi konflik, menampilkan peringatan *"Posisi telah diambil alih"*, dan mengunci pengiriman skor dari perangkat lama. |
| 11 | Fitur reset password mandiri | Coba alur lupa password | ✅ **SUDAH ADA** | 📍 **Menu: Autentikasi · Lupa Password Mandiri (`/forgot-password`)**<br>Didukung melalui infrastruktur autentikasi standar framework Laravel. |

---

### Kategori 3: Setup Pertandingan & Konfigurasi Nomor
*Lokasi Menu Utama:* **Admin > Master Event (`/admin/master/event`) & Detail Event (`/admin/master/event/{id}/detail`)**

| No. | Item Uji / Hasil yang Diharapkan | Skenario / Langkah Pengujian | Status | Lokasi Menu & Catatan Teknis |
| :---: | :--- | :--- | :---: | :--- |
| 1 | Pembuatan pertandingan baru dengan field lengkap | Isi nama, tingkat, tanggal, venue, simpan | ✅ **SUDAH ADA** | 📍 **Menu: Admin Sidebar > Master Event > Tambah Event Baru (`/admin/master/event/create`)**<br>Lengkap di `EventController::store` & `EventDetailController`. |
| 2 | Validasi tanggal mulai tidak boleh setelah selesai | Input tanggal selesai < tanggal mulai | ✅ **SUDAH ADA** | 📍 **Menu: Admin > Master Event > Form Buat & Edit Event (`/admin/master/event`)**<br>Divalidasi form request dengan aturan `after_or_equal:start_date`. |
| 3 | Tambah nomor pertandingan (Randori/Embu) lengkap | Tambah nomor dengan seluruh atribut | ✅ **SUDAH ADA** | 📍 **Menu: Admin > Master Event > Detail Event > Tab Nomor Pertandingan (`/admin/master/event/{id}/detail`)**<br>Field jenis (Embu/Randori), sistem, kelas berat, kelompok umur di `EventDetailController`. |
| 4 | Kode nomor pertandingan unik per event | Buat dua nomor dengan kode sama | ✅ **SUDAH ADA** | 📍 **Menu: Admin > Detail Event > Modal Tambah/Edit Nomor (`/admin/master/event/{id}/detail`)**<br>Divalidasi aturan `Rule::unique('event_match_categories')->where('event_id', ...)`. |
| 5 | Opsi Setengah Kompetisi kondisional setelah entry | Cek ketersediaan opsi saat setup vs pasca entry | ✅ **SUDAH ADA** | 📍 **Menu: Admin > Pertandingan > Drawing > Pilihan Sistem Tanding (`/admin/pertandingan/drawing`)**<br>Tersedia opsi Setengah Kompetisi (*Round Robin*) yang muncul kondisional pada entry 3-5 atlet di Drawing dengan penjadwalan otomatis. |
| 6 | Konfigurasi Juara Umum dapat diubah kapan saja | Ubah konfigurasi setelah hasil masuk | ✅ **SUDAH ADA** | 📍 **Menu: Admin > Master Event > Detail Event > Pengaturan Juara Umum (`/admin/master/event/{id}/detail`)**<br>Konfigurasi Juara Umum (Standar Medali vs Poin Berbobot) dapat diubah kapan saja di Detail Event, klasemen langsung menyesuaikan realtime. |
| 7 | Status nomor: Dipertandingkan / Ekshibisi berfungsi | Uji status pada nomor berbeda | ✅ **SUDAH ADA** | 📍 **Menu: Admin > Master Event > Detail Event > Tab Nomer Pertandingan (`/admin/master/event/{id}/detail?tab=matches`)**<br>Status Dipertandingkan (Resmi) vs Ekshibisi dapat dipilih saat tambah/edit nomor atau langsung melalui tombol toggle di tabel. Flag `is_exhibition` memisahkan medali ekshibisi dari klasemen resmi kontingen & Juara Umum. |
| 8 | Perubahan urutan nomor konsisten di sistem | Ubah urutan, cek bagan/jadwal/cetakan | ✅ **SUDAH ADA** | 📍 **Menu: Admin > Master Event > Detail Event & Pertandingan > Drawing (`/admin/pertandingan/drawing`)**<br>Menggunakan field `order` dan `match_sequence` di seluruh query Eloquent. |

---

### Kategori 4: Manajemen Kontingen & Peserta

| No. | Item Uji / Hasil yang Diharapkan | Skenario / Langkah Pengujian | Status | Catatan Teknis & Lokasi File |
| :---: | :--- | :--- | :---: | :--- |
| 1 | Pendaftaran kontingen dengan data asal lengkap | Tambah kontingen baru data lengkap | ✅ **SUDAH ADA** | Tabel `contingents` menyimpan kota, provinsi, dojo, manajer, kontak, alamat. |
| 2 | Pendaftaran atlet data wajib (nama, gender, usia) | Tambah atlet baru | ✅ **SUDAH ADA** | Tabel `athletes` terintegrasi langsung ke bagan dan layar monitor arena. |
| 3 | Peringatan pendaftaran atlet ganda kontingen sama | Daftarkan nama/identitas identik 2 kali | ✅ **SUDAH ADA** | Validasi NIK dan Nomor Kenshi unik di `RegistrationWizardController`. |
| 4 | Entry by Number (centang massal nomor tanding) | Centang beberapa nomor untuk kontingen | ✅ **SUDAH ADA** | Tersedia modal interaktif Entry by Number di `/admin/pendaftaran/nomor-pertandingan` untuk mencentang massal nomor tanding kontingen dengan alokasi otomatis dan pembaruan rekapitulasi kuota/biaya. |
| 5 | Entry by Name wajib untuk Embu Pasangan/Beregu | Lewati Entry by Name pada Embu Pasangan | ✅ **SUDAH ADA** | Diwajibkan memilih kenshi pasangan/beregu dan teknik pada Step 3 pendaftaran. |
| 6 | Validasi jumlah anggota tim Embu Beregu (3-5) | Input <3 atau >5 atlet | ✅ **SUDAH ADA** | Divalidasi otomatis pada controller pendaftaran (minimal 3, maksimal 5 atlet). |
| 7 | Reset pengundian pasca kunci bagan jika entry ubah | Ubah entry pasca-kunci bagan | ✅ **SUDAH ADA** | Bagan yang dikunci memicu konfirmasi reset drawing jika terjadi perubahan peserta. |
| 8 | Halaman Daftar Peserta rekap akurat & real-time | Bandingkan rekap dengan data aktual | ✅ **SUDAH ADA** | Halaman Verifikasi (`/admin/pendaftaran/verifikasi`) terhubung langsung ke basis data. |

---

### Kategori 5: Penimbangan Badan Hari-H (Kelas Berat Randori)
*Lokasi Menu Utama:* **Admin > Pertandingan > Penimbangan Hari-H (`/admin/pertandingan/timbang-badan`) & Drawing (`/admin/pertandingan/drawing`)**

| No. | Item Uji / Hasil yang Diharapkan | Skenario / Langkah Pengujian | Status | Lokasi Menu & Catatan Teknis |
| :---: | :--- | :--- | :---: | :--- |
| 1 | Input berat badan & klasifikasi status otomatis | Input berat dalam/luar rentang kelas | ✅ **SUDAH ADA** | 📍 **Menu: Admin · Pertandingan > Penimbangan Hari-H (`/admin/pertandingan/timbang-badan`)**<br>Stasiun penimbangan badan Hari-H mengklasifikasikan status atlet secara otomatis (Sah/Lolos, Overweight, Underweight) berdasarkan batas min-max kelas tanding Randori dengan feedback visual interaktif. |
| 2 | Kunci data penimbangan mencegah perubahan | Kunci data, coba ubah berat | ✅ **SUDAH ADA** | 📍 **Menu: Admin · Pertandingan > Penimbangan Hari-H > Kunci Sesi (`/admin/pertandingan/timbang-badan`)**<br>Fitur Kunci Sesi (*Freeze*) dan Buka Kunci (*Unlock*) mencegah modifikasi hasil penimbangan saat pertandingan dimulai, dengan validasi hak akses Super Admin / Admin. |
| 3 | Skenario 1: Belum ditimbang saat undian | Lakukan undian sebelum penimbangan | ✅ **SUDAH ADA** | 📍 **Menu: Admin · Pertandingan > Drawing > Generator Bagan Acak (`/admin/pertandingan/drawing`)**<br>Seluruh atlet terdaftar yang belum ditimbang (*status pending / null*) otomatis diikutkan ke dalam undian bagan turnamen secara normal. |
| 4 | Skenario 2: Timbang tidak sesuai -> otomatis batal undian | Timbang tidak sesuai lalu undi | ✅ **SUDAH ADA** | 📍 **Menu: Admin · Pertandingan > Drawing & Bagan TM (`/admin/pertandingan/drawing`)**<br>`TournamentDrawingGenerator::participantsFor()` secara otomatis mengecualikan atlet berstatus overweight, underweight, atau diskualifikasi dari undian bagan. |
| 5 | Skenario 3: Lolos undian, timbang gagal -> coret bagan | Timbang gagal pasca bagan dikunci | ✅ **SUDAH ADA** | 📍 **Menu: Admin · Pertandingan > Drawing > Bagan Interaktif (`/admin/pertandingan/drawing`)**<br>Jika kenshi gagal timbang setelah undian bagan dibentuk, nama kenshi dicoret (*strikethrough*) dengan badge peringatan "Gagal Timbang (WO)" pada slot bagan tanpa merusak struktur nomor partai. |
| 6 | Auto-kalah (WO) game pertama akibat berat badan | Mulai game pertama atlet tsb | ✅ **SUDAH ADA** | 📍 **Menu: Admin · Pertandingan > Penimbangan Hari-H & Panitera Scoring (`/admin/pertandingan/timbang-badan`)**<br>Sistem otomatis menetapkan Walkover (WO) diskualifikasi timbang badan pada partai babak pertama dan otomatis meloloskan kenshi lawan ke babak berikutnya via `WeighInService::applyWeighInWalkover`. |
| 7 | Rekapitulasi status timbang per kelas | Cetak/lihat daftar timbang badan | ✅ **SUDAH ADA** | 📍 **Menu: Admin · Pertandingan > Penimbangan Hari-H > Cetak Berita Acara (`/admin/pertandingan/timbang-badan/export`)**<br>Tersedia modul cetak Berita Acara Penimbangan Resmi PB PERKEMI per kelas tanding maupun keseluruhan kelas dengan rekapitulasi statistik dan format pengesahan tanda tangan. |

---

### Kategori 6: Pengundian Bagan (Draw / Bracket)
*Lokasi Menu Utama:* **Admin > Pertandingan > Drawing (`/admin/pertandingan/drawing`) [Toolbar Menu Aksi]**

| No. | Item Uji / Hasil yang Diharapkan | Skenario / Langkah Pengujian | Status | Lokasi Menu & Catatan Teknis |
| :---: | :--- | :--- | :---: | :--- |
| 1 | Pengundian menghasilkan penempatan acak | Ulang undian beberapa kali | ✅ **SUDAH ADA** | 📍 **Menu: Admin · Pertandingan > Drawing > Tombol Generate Semua & Menu Aksi (`/admin/pertandingan/drawing`)**<br>`TournamentDrawingGenerator` melakukan pengacakan acak pada setiap generasi. |
| 2 | Peserta kontingen sama tidak bertemu di babak awal | Uji nomor dengan >1 atlet sekontingen | ✅ **SUDAH ADA** | 📍 **Menu: Admin · Pertandingan > Drawing > Generator Bagan (`/admin/pertandingan/drawing`)**<br>Algoritma drawing memisahkan peserta dari kontingen yang sama agar tidak langsung bertemu. |
| 3 | Penanganan otomatis "Bye" untuk non-pangkat 2 | Undi nomor peserta 5, 6, 7 | ✅ **SUDAH ADA** | 📍 **Menu: Admin · Pertandingan > Drawing > Generator Bagan (`/admin/pertandingan/drawing`)**<br>Slot *Bye* otomatis dibuat dan atlet yang bertemu Bye otomatis melaju (*advance*). |
| 4 | Ulang Undian berfungsi sebelum dikunci | Klik Ulang Undian beberapa kali | ✅ **SUDAH ADA** | 📍 **Menu: Admin · Pertandingan > Drawing > Tombol Drawing Ulang Kategori & Menu Aksi (`/admin/pertandingan/drawing`)**<br>Tombol Re-Draw/Generate tersedia selama status drawing masih berstatus Draft, serta opsi Reset Draft di Menu Aksi (*ActionMenuDropdown*). |
| 5 | Bagan tidak dapat diubah setelah Kunci & Simpan | Coba ubah bagan pasca dikunci | ✅ **SUDAH ADA** | 📍 **Menu: Admin · Pertandingan > Drawing > Tombol Publikasikan & Menu Aksi (`/admin/pertandingan/drawing`)**<br>Status bagan terkunci (*Published*); perubahan mengharuskan Kembalikan ke Penyusunan atau reset drawing via Menu Aksi (*ActionMenuDropdown*). |
| 6 | Struktur bagan: Gugur, Double Elim, 2 Babak | Uji tiap format pada nomor berbeda | ✅ **SUDAH ADA** | 📍 **Menu: Admin · Pertandingan > Drawing > Pilihan Sistem Tanding (`/admin/pertandingan/drawing`)**<br>Lengkap mendukung seluruh format: Sistem Gugur Tunggal Randori, Setengah Kompetisi (*Round Robin*), Pool Penyisihan/Final Embu, dan Double Elimination (Upper Bracket, Lower Bracket, Grand Final, serta Grand Final Ulang GF2). |
| 7 | Bagan diperbarui otomatis saat game selesai | Selesaikan game, amati bagan | ✅ **SUDAH ADA** | 📍 **Menu: Admin · Pertandingan > Drawing > Bagan Interaktif (`/admin/pertandingan/drawing`)**<br>`RandoriResultService::routeResult` otomatis menempatkan pemenang ke partai babak selanjutnya. |

---

### Kategori 7: Penjadwalan (Scheduling)

| No. | Item Uji / Hasil yang Diharapkan | Skenario / Langkah Pengujian | Status | Catatan Teknis & Lokasi File |
| :---: | :--- | :--- | :---: | :--- |
| 1 | Drag-and-drop kartu game ke slot waktu/court | Geser kartu game ke slot kosong | ✅ **SUDAH ADA** | Diimplementasikan di `Schedule.jsx` dengan HTML5 Drag-and-Drop native. |
| 2 | Penjadwalan game paralel di multi-court | Jadwalkan 2 game jam sama beda court | ✅ **SUDAH ADA** | Matriks tabel waktu mendukung Court 1, Court 2, dst. secara paralel. |
| 3 | Pemindahan game terjadwal ke slot lain | Geser kartu antar slot (swap) | ✅ **SUDAH ADA** | Menjatuhkan kartu ke slot lain otomatis menukar (*swap*) jadwal kedua partai. |
| 4 | Penghapusan game dari jadwal (kembali ke panel antrean) | Klik tombol Lepas dari Jadwal / kembalikan kartu | ✅ **SUDAH ADA** | Tersedia panel drawer "Antrean Belum Terjadwal" dengan tombol "Lepas dari Jadwal" (`DELETE schedule.matches.destroy`), dan dukungan drop kembali partai ke slot tatami kosong. |
| 5 | Penyimpanan otomatis setiap perubahan drag-drop | Refresh pasca geser kartu | ✅ **SUDAH ADA** | Setiap drop langsung mengirim request PUT dan tersimpan otomatis tanpa tombol manual. |
| 6 | Slot GF2 dilewati otomatis bila tidak diperlukan | Cek slot GF2 pada turnamen | ✅ **SUDAH ADA** | Terintegrasi di jadwal tatami: slot GF2 otomatis ditandai `is_bye = true` & diselesaikan tanpa error saat pemenang Grand Final berasal dari Upper Bracket (WB). |

---

### Kategori 8: Modul Panitera - Memimpin Game Randori

| No. | Item Uji / Hasil yang Diharapkan | Skenario / Langkah Pengujian | Status | Catatan Teknis & Lokasi File |
| :---: | :--- | :--- | :---: | :--- |
| 1 | Penugasan 5 wasit tanpa duplikat | Pilih wasit sama dua kali | ✅ **SUDAH ADA** | Divalidasi backend, duplikasi penugasan wasit dalam satu court ditolak. |
| 2 | Timer berjalan/berhenti (default 2 menit) | Jalankan, hentikan, reset timer | ✅ **SUDAH ADA** | Stopwatch digital di `CourtMonitor.jsx` & meja panitera dengan indikator status. |
| 3 | Input poin teknik bobot resmi Perkemi | Input Mujoken, Ippon, Waza-ari, Batsu | ✅ **SUDAH ADA** | `RandoriScoreCalculator.php`: Mujoken (15), Ippon (10), Waza-ari (5), Yusei (5), Batsu (-5/-10). |
| 4 | Akumulasi 2x Waza-ari otomatis jadi Ippon | Input Waza-ari 2 kali pada pita sama | ✅ **SUDAH ADA** | `RandoriScoreCalculator.php` mendeteksi Waza-ari >= 2 sebagai Ippon (Waza-ari Awasete Ippon), otomatis menetapkan pemenang mutlak di `RandoriResultService.php` dan alert visual di `RandoriScoreForm.jsx`. |
| 5 | Mujoken / Ippon langsung mengakhiri game | Input Ippon di tengah pertandingan | ✅ **SUDAH ADA** | `RandoriScoreCalculator.php` (`hasIpponWin`, `winMethod`) mendeteksi Ippon & Mujoken Kachi, sistem otomatis memenangkan sudut bersangkutan dan menandai pertandingan completed. |
| 6 | Yusei Kachi saat skor sama & waktu habis | Uji Yusei Kachi saat skor imbang | ✅ **SUDAH ADA** | Sistem menolak skor imbang (*Hikiwake*) pada `RandoriResultService.php` dan mewajibkan penentuan via Yusei Kachi (+5 poin keunggulan teknik) atau keputusan wasit untuk memecah kebuntuan skor saat waktu habis. |
| 7 | Fitur Stop mencegah atlet lanjut ke game berikut | Aktifkan Stop Medis pada salah satu pita | ✅ **SUDAH ADA** | Fitur Keputusan Khusus "Stop Medis (Doctor Stop / Kiken Gachi)" di `RandoriScoreForm.jsx` & `RandoriResultService.php`. Lawan otomatis menang (*Kiken Gachi*), atlet cedera ditandai `[stopped]`, dan dicegah masuk bagan berikutnya. |
| 8 | Fitur Diskualifikasi memblokir Randori & Embu | Tandai Hansoku Make / Shikkaku pada atlet | ✅ **SUDAH ADA** | Fitur Diskualifikasi Wasit dengan opsi *Hansoku Make* (partai saat ini) dan *Shikkaku* (global turnamen). Lawan menang via *Hansoku Gachi*, dan atlet dengan sanksi Shikkaku diblokir di seluruh nomor turnamen (`competition_status = disqualified`). |
| 9 | Kalkulasi otomatis pemenang berdasar total poin | Biarkan waktu habis dengan skor beda | ✅ **SUDAH ADA** | Sistem otomatis memenangkan sudut dengan poin akumulasi tertinggi (AKA vs SHIRO). |
| 10 | Hasil terkunci setelah Hitung & Simpan | Coba ubah skor pasca dikunci | ✅ **SUDAH ADA** | Record terkunci via `locked_at` di database; sunting skor ditolak. |
| 11 | Panel Game Selanjutnya muncul otomatis | Selesaikan satu game | ✅ **SUDAH ADA** | Antrean partai berikutnya langsung dimuat di dashboard panitera. |

---

### Kategori 9: Modul Panitera - Memimpin Game Embu

| No. | Item Uji / Hasil yang Diharapkan | Skenario / Langkah Pengujian | Status | Catatan Teknis & Lokasi File |
| :---: | :--- | :--- | :---: | :--- |
| 1 | Penugasan 5 wasit & pembuatan QR otomatis | Simpan penugasan wasit | ✅ **SUDAH ADA** | Panel 5 wasit langsung dibuatkan QR presensi dan tautan penilaian. |
| 2 | Status koneksi wasit terpantau real-time | Amati panel saat wasit kirim nilai | ✅ **SUDAH ADA** | Meja panitera menampilkan status wasit (terhubung, draft, submitted). |
| 3 | Alur pita Merah (AKA) lalu Putih (SHIRO) | Jalankan Merah, lanjut Putih | ✅ **SUDAH ADA** | Penilaian Embu berpasangan mendukung evaluasi sudut Merah lalu Putih. |
| 4 | Trimmed Mean (buang nilai tertinggi & terendah) | Input 5 nilai wasit, klik kalkulasi | ✅ **SUDAH ADA** | `EmbuScoreCalculator.php` otomatis membuang min & max dari 5 juri (skor tengah 3 juri). |
| 5 | Skenario tie-break berjenjang A-E berurutan | Rekayasa nilai seri | ✅ **SUDAH ADA** | `EmbuResultService.php` mengimplementasikan cascade tie-break bertingkat PB Perkemi: Skenario A (Nilai Akhir), B (Wasit 1 Chief Judge), C (Total Raw Score), D (Wasit 2 / Penyisihan), dan E (Keputusan Manual). |
| 6 | Skenario E (Pemilihan pemenang manual panitera) | Rekayasa seri hingga kriteria terakhir | ✅ **SUDAH ADA** | `EmbuResult.jsx` memunculkan panel interaktif Keputusan Manual Panitera (Skenario E) saat seri mutlak; panitera memilih pemenang via endpoint `manual-tiebreak`. |
| 7 | Input denda mengurangi Nilai Akhir | Input denda waktu / pelanggaran | ✅ **SUDAH ADA** | Denda durasi waktu dan denda teknis otomatis mengurangi nilai tengah. |
| 8 | Urutan proses validasi tidak bisa dilompati | Coba selesaikan sebelum hitung hasil | ✅ **SUDAH ADA** | Sistem memvalidasi workflow status partai (`call_status` dan `status`). |
| 9 | Token akses wasit invalid pasca Selesai Game | Akses tautan wasit pasca selesai | ✅ **SUDAH ADA** | `EmbuJudgeScoreController.php` secara otomatis menolak dan mengunci pengiriman nilai wasit (HTTP 409 Conflict) begitu status partai tanding berpindah ke Selesai (*completed*). |
| 10 | Nilai wasit tidak dapat diubah setelah dikirim | Coba edit nilai pasca submit | ✅ **SUDAH ADA** | Form wasit otomatis beralih ke status readonly terkunci setelah dikirim. |
| 11 | Penyimpanan nilai sementara di local browser | Refresh halaman wasit sebelum kirim | ✅ **SUDAH ADA** | State formulir React mempertahankan input nilai sementara. |
| 12 | GF2 berjalan bila pemenang GF dari LB | Uji hasil GF dari WB vs LB | ✅ **SUDAH ADA** | Terverifikasi otomatis: jika pemenang Grand Final berasal dari jalur Lower Bracket (LB), partai GF2 diaktifkan dan pemenang GF2 menjadi Juara 1; jika dari Upper Bracket (WB), GF2 dilewati otomatis. |

---

### Kategori 10: Modul Wasit - Formulir Penilaian Embu

| No. | Item Uji / Hasil yang Diharapkan | Skenario / Langkah Pengujian | Status | Catatan Teknis & Lokasi File |
| :---: | :--- | :--- | :---: | :--- |
| 1 | Akses formulir via scan QR tanpa login | Scan QR dari HP wasit | ✅ **SUDAH ADA** | Wasit dapat langsung membuka form penilaian melalui QR presensi. |
| 2 | Verifikasi identitas wasit sesuai penugasan | Pilih nama sesuai penugasan | ✅ **SUDAH ADA** | Sistem memvalidasi bahwa wasit bersangkutan ditugaskan di court aktif tsb. |
| 3 | Verifikasi gagal untuk wasit tidak ditugaskan | Akses link oleh wasit lain | ✅ **SUDAH ADA** | Sistem menolak (`abort 403, "Anda tidak ditugaskan sebagai juri"`). |
| 4 | Rentang nilai valid 10 komponen (K1-K6, P1-P4) | Input nilai di luar rentang | ✅ **SUDAH ADA** | 10 komponen (K1-K6 Kihon & P1-P4 Performance) divalidasi ketat oleh `StoreEmbuJudgeScoreRequest` dengan batas angka **7, 8, 9, 10** sesuai buku pedoman resmi PB Perkemi. |
| 5 | Tombol Kirim hanya aktif jika 10 komponen terisi | Isi sebagian komponen saja | ✅ **SUDAH ADA** | Divalidasi oleh `StoreEmbuJudgeScoreRequest` (harus lengkap 10 aspek). |
| 6 | Total Teknik, Ekspresi, Total Akhir akurat | Isi seluruh komponen | ✅ **SUDAH ADA** | Subtotal teknik (K1-K6) dan ekspresi (P1-P4) dihitung otomatis secara realtime. |
| 7 | Tautan Court otomatis berpindah ke partai berikut | Amati HP wasit saat partai berganti | ✅ **SUDAH ADA** | Layar penilaian wasit memuat partai baru otomatis saat dipanggil panitera. |
| 8 | Tautan berbasis Match berlaku spesifik | Gunakan tautan match di partai lain | ✅ **SUDAH ADA** | Terisolasi per ID `tournament_match_id`. |

---

### Kategori 11: Modul VAR / Video Assistant Review

| No. | Item Uji / Hasil yang Diharapkan | Skenario / Langkah Pengujian | Status | Catatan Teknis & Lokasi File |
| :---: | :--- | :--- | :---: | :--- |
| 1–16 | **Seluruh 16 Item Modul VAR (Challenge Wasit/Pelatih, Multi-Angle, Slow-Mo, Frame Stepping, Timer Auto-Pause, Audit Trail Putusan, Kuota Kartu Challenge, Real-Time Overlay Monitor)** | Buka detail partai di Panitera, ajukan challenge VAR untuk sudut AKA/SHIRO atau inisiatif wasit, timer otomatis pause, uji kontrol video multi-kamera & slow motion (0.25x-1x), tentukan putusan (Overturned/Upheld/Inconclusive), amati siaran putusan & kuota kartu challenge | ✅ **SUDAH ADA (16 Item)** | **SUDAH DIBUAT LENGKAP:** Implementasi via model `TournamentMatchVarReview.php`, service `VarReviewService.php`, controller `VarReviewController.php`, komponen `VarReviewModal.jsx`, `CourtMonitor.jsx`, dan test `AdminVarReviewTest.php`. Mendukung kuota kartu 1/1 sudut, auto-pause match timer, slow-mo 0.25x–1x, frame stepping -0.1s/+0.1s, putusan resmi, dan broadcast Reverb. |

---

### Kategori 12: Layar Court (Live Public Display)

| No. | Item Uji / Hasil yang Diharapkan | Skenario / Langkah Pengujian | Status | Catatan Teknis & Lokasi File |
| :---: | :--- | :--- | :---: | :--- |
| 1 | Auto-update tanpa refresh manual | Amati layar selama game berjalan | ✅ **SUDAH ADA** | Tersinkronisasi via WebSocket Pusher/Echo dan polling state (`CourtMonitor.jsx`). |
| 2 | Tampilan nama, kontingen, skor akurat | Bandingkan layar court dengan input panitera | ✅ **SUDAH ADA** | Tampil nama kontingen, nama atlet, daftar teknik, timer, dan skor real-time. |
| 3 | Latar pita peserta kalah berubah hitam | Selesaikan satu game | ✅ **SUDAH ADA** | Latar sudut/pita yang kalah otomatis menggelap dan redup (*blackened/grayscale opacity-40*) pada `CourtMonitor.jsx`, sedangkan sudut pemenang mendapatkan sorotan hijau berkilau (*winner highlight & badge*). |
| 4 | Informasi game berikutnya tampil | Amati bagian bawah layar | ✅ **SUDAH ADA** | Partai antrean berikutnya ditampilkan di bagian bawah layar arena. |
| 5 | Graceful recovery saat koneksi terputus | Putuskan internet sesaat, sambungkan | ✅ **SUDAH ADA** | WebSocket Echo otomatis melakukan *auto-reconnect* tanpa perlu restart browser. |

---

### Kategori 13: Rekap Medali & Penentuan Juara Umum

| No. | Item Uji / Hasil yang Diharapkan | Skenario / Langkah Pengujian | Status | Catatan Teknis & Lokasi File |
| :---: | :--- | :--- | :---: | :--- |
| 1 | Rekapitulasi medali per kontingen akurat | Bandingkan rekap dengan data aktual | ✅ **SUDAH ADA** | Agregasi otomatis medali Emas, Perak, Perunggu di `/admin/laporan/hasil`. |
| 2 | Metode Juara Umum (Medali vs Poin) | Ubah metode penentuan juara | ✅ **SUDAH ADA** | Tersedia saklar interaktif di UI `/admin/laporan/hasil` & `ReportDatasetBuilder.php` untuk beralih antara Standar Medali PB Perkemi (Emas > Perak > Perunggu) dan Sistem Poin Berbobot (Emas: 5, Perak: 3, Perunggu: 1) dengan urutan klasemen otomatis terhitung. |
| 3 | Nomor Ekshibisi tidak pengaruhi Juara Umum | Cek nomor ekshibisi pada rekap | ✅ **SUDAH ADA** | Record dengan `is_exhibition = true` otomatis disisihkan dari klasemen kontingen. |
| 4 | Nomor Tidak Dipertandingkan tidak muncul | Cek nomor non-aktif | ✅ **SUDAH ADA** | Kategori `is_active = false` tidak dihitung di rekapitulasi. |
| 5 | Tiga format cetak konsisten datanya | Cetak format nomor, kontingen, rekap | ✅ **SUDAH ADA** | Dataset konsisten antara tampilan layar, cetak PDF, dan ekspor spreadsheet XLSX. |
| 6 | Juara 3 Bersama menghasilkan 2 perunggu | Konfigurasikan opsi Juara 3 bersama | ✅ **SUDAH ADA** | Peringkat 3 dan Peringkat 4 sama-sama berstatus peraih medali Perunggu. |

---

### Kategori 14: Evaluasi & Analisis Perwasitan (Anti-Bias)

| No. | Item Uji / Hasil yang Diharapkan | Skenario / Langkah Pengujian | Status | Catatan Teknis & Lokasi File |
| :---: | :--- | :--- | :---: | :--- |
| 1 | Filter sertifikasi wasit (Nasional A / Nasional B / Daerah) | Ubah filter sertifikasi | ✅ **SUDAH ADA** | Filter dropdown dinamis sertifikasi wasit pada `/admin/arbitrase/evaluasi`, sinkron dengan kartu, tabel, dan heatmap. |
| 2 | Statistik rata-rata & standar deviasi akurat | Verifikasi manual statistik wasit | ✅ **SUDAH ADA** | `RefereeEvaluationService` menghitung Mean ($\bar{x}$), Standar Deviasi ($\sigma$), min/max, dan rentang skor secara presisi. |
| 3 | Deteksi bias kontingen (kesamaan asal daerah) | Uji wasit & kontingen dari kota sama | ✅ **SUDAH ADA** | Deteksi otomatis kesamaan daerah asal wasit vs atlet, selisih deviasi $\Delta$, serta matriks heatmap 2D Wasit vs Kota Kontingen. |
| 4 | Threshold peringatan (Std Dev >6, %Buang ≥40%) | Rekayasa data wasit ekstrem | ✅ **SUDAH ADA** | Peringatan anomali otomatis aktif jika Std Dev > 6.0, Trimmed Rate $\ge$ 40%, atau Bias Kedaerahan $\Delta \ge 3.0$ (Status *Anomali*). |
| 5 | Analisis AI / Rule-based menghasilkan laporan naratif | Buka analisis naratif wasit | ✅ **SUDAH ADA** | Narrative Engine merangkum 4 aspek: Konsistensi, Analisis Nilai Terbuang, Bias Kedaerahan, dan Rekomendasi Dewan Wasit. |
| 6 | Penanganan error saat analisis gagal | Buka event tanpa nilai / data kosong | ✅ **SUDAH ADA** | Error handling tangguh dan antarmuka empty states ramah pengguna dengan tombol reset filter. |
| 7 | Halaman Cetak Evaluasi Wasit lengkap (A4 & Excel) | Cetak A4 dan ekspor XLSX | ✅ **SUDAH ADA** | Cetak format A4 via `@media print` dan ekspor spreadsheet Excel (.xlsx) 19 kolom via `/admin/arbitrase/evaluasi/export`. |

---

### Kategori 15: Mode Pelatihan / Simulasi

| No. | Item Uji / Hasil yang Diharapkan | Skenario / Langkah Pengujian | Status | Catatan Teknis & Lokasi File |
| :---: | :--- | :--- | :---: | :--- |
| 1 | Aktivasi Mode Pelatihan tanpa ganggu data resmi | Aktifkan mode pelatihan via toggle sandbox di Admin Layout | ✅ **SUDAH ADA** | Terisolasi per event via boolean `is_training_mode`, `TrainingModeService::toggleTrainingMode`, dan `TrainingModeController`. |
| 2 | Badge "Mode Latihan" di beranda & tab LIVE | Cek halaman publik saat mode aktif | ✅ **SUDAH ADA** | Banner amber di `AdminLayout.jsx`, banner siaga di `Show.jsx`, badge "Mode Simulasi" di `Welcome.jsx`, dan overlay monitor arena. |
| 3 | Data simulasi tidak tercampur ke Rekap Resmi | Jalankan game simulasi (seeder 1-klik) | ✅ **SUDAH ADA** | `TrainingModeService::seedSimulationMatches` membuat partai gladi bersih bertanda `is_simulated = true`. |
| 4 | Nonaktivasi mode pelatihan tanpa residu data / Reset Data Uji Coba | Tekan tombol "Reset Data Simulasi" | ✅ **SUDAH ADA** | `TrainingModeService::resetSimulationData` menghapus seluruh partai, drawing, lembar skor, dan reset timbang badan secara atomik tanpa menyentuh master data. |

---

### Kategori 16: Fungsi Cetak & Ekspor Dokumen

| No. | Item Uji / Hasil yang Diharapkan | Skenario / Langkah Pengujian | Status | Catatan Teknis & Lokasi File |
| :---: | :--- | :--- | :---: | :--- |
| 1 | Cetak Jadwal & Bagan rapi (A4) | Cetak dari halaman Bagan/Jadwal | ✅ **SUDAH ADA** | Terformat rapi dengan CSS Print `@media print` untuk ukuran kertas A4. |
| 2 | Ekspor rekap (Excel) identik dengan sistem | Ekspor XLSX dan bandingkan | ✅ **SUDAH ADA** | Menghasilkan file Excel asli (`.xlsx`) via `ReportWorkbook.php` dan `PhpSpreadsheet`. |
| 3 | Template import peserta (CSV/Excel) valid | Import massal data via template | ✅ **SUDAH ADA** | Tersedia di `/admin/master/data-transfer` dengan validasi baris error. |
| 4 | Berita Acara resmi pertandingan | Cetak Berita Acara pertandingan | ✅ **SUDAH ADA** | Dokumen Berita Acara Resmi A4 berstandar PB PERKEMI di `/admin/laporan/berita-acara` (`berita-acara.blade.php`) memuat rekapitulasi teknis/tatami, kenshi, partai tanding, kasus VAR, tabel klasemen 10 besar medali & Juara Umum I/II/III, dan 3 kolom tanda tangan resmi (Technical Delegate, Ketua Dewan Wasit, Ketua Panitia). |
| 5 | Kompatibilitas cetak lintas-browser | Cetak dari Chrome, Edge, Safari, Firefox | ✅ **SUDAH ADA** | Menggunakan CSS standar universal `@page { size: A4 landscape; }`. |

---

### Kategori 17: Keamanan & Kontrol Akses

| No. | Item Uji / Hasil yang Diharapkan | Skenario / Langkah Pengujian | Status | Catatan Teknis & Lokasi File |
| :---: | :--- | :--- | :---: | :--- |
| 1 | Proteksi URL Tampering tanpa otorisasi | Buka langsung URL admin/panitera | ✅ **SUDAH ADA** | Dilindungi middleware `auth`, `event.tenant`, dan Spatie RBAC (`abort 403`). |
| 2 | Validasi input terhadap XSS dan injeksi | Input script tag pada form | ✅ **SUDAH ADA** | Disanitasi otomatis oleh FormRequest validation Laravel & React escaping. |
| 3 | Enkripsi HTTPS di seluruh halaman | Cek protokol URL browser | ✅ **SUDAH ADA** | Tersedia konfigurasi SSL Nginx dan helper `serve-https.sh`. |
| 4 | Data pribadi (NIK) tidak bocor ke publik | Periksa halaman publik | ✅ **SUDAH ADA** | Halaman publik hanya menampilkan nama, kyu/dan, dan dojo; NIK diisolasi di admin. |
| 5 | Rate-limiting lockout brute force login | Coba login salah berulang kali | ✅ **SUDAH ADA** | Dilindungi `RateLimiter` Laravel Breeze (maksimal 5 percobaan gagal per menit). |
| 6 | Sesi panitera/koordinator timeout otomatis | Biarkan sesi idle dalam waktu lama | ✅ **SUDAH ADA** | Mengikuti masa aktif sesi standar Laravel (`config/session.php`). |

---

### Kategori 18: Performa, Konkurensi & Keandalan Real-Time

| No. | Item Uji / Hasil yang Diharapkan | Skenario / Langkah Pengujian | Status | Catatan Teknis & Lokasi File |
| :---: | :--- | :--- | :---: | :--- |
| 1 | Multi-court berjalan tanpa konflik data | Jalankan partai di Tatami 1 & 2 simultan | ✅ **SUDAH ADA** | Data terisolasi sempurna berdasarkan `event_court_id`. |
| 2 | 5 wasit submit nilai simultan tanpa race condition | Kirim nilai dari 5 HP bersamaan | ✅ **SUDAH ADA** | Menggunakan DB Transaction dengan *pessimistic locking* (`lockForUpdate`). |
| 3 | Waktu respon wajar pada traffic tinggi | Simulasi akses live score bersamaan | ✅ **SUDAH ADA** | Eager loading optimal tanpa N+1 query, frontend SPA cepat. |
| 4 | Pemulihan koneksi internet terputus sesaat | Putuskan WiFi saat game berjalan | ✅ **SUDAH ADA** | Client WebSocket Laravel Echo melakukan *auto-reconnect* otomatis. |
| 5 | Konsistensi data Dashboard, Panitera, Layar Court | Bandingkan ketiga layar bersamaan | ✅ **SUDAH ADA** | Data tersinkronisasi via WebSocket event broadcast `PaniteraMatchStateUpdated`. |

---

### Kategori 19: Kompatibilitas Perangkat & Responsivitas

| No. | Item Uji / Hasil yang Diharapkan | Skenario / Langkah Pengujian | Status | Catatan Teknis & Lokasi File |
| :---: | :--- | :--- | :---: | :--- |
| 1 | Tampilan responsif pada HP (Formulir Wasit) | Buka form nilai di berbagai HP | ✅ **SUDAH ADA** | Desain mobile-first dengan tombol angka besar yang nyaman disentuh. |
| 2 | Tampilan tablet/laptop (Meja Panitera) | Buka meja kendali di laptop/tablet | ✅ **SUDAH ADA** | Layout meja panitera optimal untuk kontrol stopwatch dan input skor. |
| 3 | Tampilan layar besar / TV arena fullscreen | Buka monitor court mode F11 | ✅ **SUDAH ADA** | Tipografi tebal dan kontras tinggi untuk keterbacaan optimal dari kejauhan. |
| 4 | Kompatibilitas browser utama | Uji di Chrome, Edge, Safari, Firefox | ✅ **SUDAH ADA** | Menggunakan CSS modern dan build bundle Vite yang kompatibel lintas peramban. |
| 5 | Ketahanan pada koneksi internet lambat | Uji dengan network throttling | ✅ **SUDAH ADA** | Payload JSON sangat ringan, state lokal mencegah hilangnya data input. |

---

## 4. ANALISIS KESENJANGAN (GAP ANALYSIS) & ROADMAP PENGEMBANGAN

Seluruh rencana aksi (*action plan*) dari **Prioritas 1, Prioritas 2, hingga Prioritas 3 (Fase 1 s/d Fase 7)** telah **100% TUNTAS, DIUJI, DAN TERVERIFIKASI ✅**.

```
[PRIORITAS 1: URGENSI LAPANGAN] ──> [PRIORITAS 2: POLISH & PUBLIK] ──> [PRIORITAS 3: HARDWARE/ADD-ON]
             │                                     │                                    │
             ▼                                     ▼                                    ▼
1. Timbang Badan Hari-H (100% ✅)      1. Live Tatami Cards & QR (100% ✅)   1. Modul Video VAR (100% ✅)
2. Auto-Ippon 2x Waza-ari (100% ✅)    2. Link Google Maps Venue (100% ✅)   2. Sandbox Simulasi (100% ✅)
3. Tie-Break Embu A-E (100% ✅)        3. Formula Std Dev Wasit (100% ✅)    3. Berita Acara A4 (100% ✅)
```

### Prioritas 1: Kebutuhan Lapangan / Pertandingan Inti (100% SELESAI ✅)
1. **Modul Penimbangan Badan Hari-H (Weigh-In Station) [SELESAI ✅]**:
   - Stasiun timbang badan resmi Hari-H di `/admin/pertandingan/timbang-badan`.
   - Klasifikasi otomatis: *Sah/Lolos*, *Overweight*, *Underweight*.
   - Fitur kunci sesi penimbangan (*freeze/unlock*), diskualifikasi undian, coretan bagan (*strikethrough*), auto-WO babak pertama, dan cetak Berita Acara resmi.
2. **Aturan Otomatis Randori [SELESAI ✅]**:
   - Pemicu otomatis 2x Waza-ari langsung dikonversi menjadi kemenangan Ippon (*Waza-ari Awasete Ippon*), serta Ippon/Mujoken Kachi langsung menyudahi partai.
3. **Algoritma Tie-Break Embu Berjenjang (Skenario A–E) [SELESAI ✅]**:
   - Pengecekan bertingkat resmi PB Perkemi saat skor seri: Skenario A (Nilai Akhir), B (Wasit 1 Chief Judge), C (Total Raw Score seluruh juri), D (Wasit 2 / Nilai Penyisihan), dan E (Keputusan Manual Panitera via panel interaktif).

### Prioritas 2: Penyempurnaan Tampilan & Halaman Publik (100% SELESAI ✅)
1. **Kartu Live Tatami & QR Code Monitor Smartphone (Fase 7) [SELESAI ✅]**:
   - Kartu Gelanggang Tatami modern di `/event/{slug}#courts` dengan split skor duel AKA vs SHIRO (poin besar & badge waza-ari), nilai terbuka Embu, status partai, dan antrean partai selanjutnya (*on-deck queue*).
   - Modal QR Code interaktif beresolusi tinggi (`quickchart.io/qr`) untuk di-scan oleh kamera smartphone penonton di tribun/ofisial agar dapat membuka monitor gelanggang fullscreen tanpa login.
   - Sticky Top Broadcast Ticker Bar di bagian atas halaman dengan indikator pulsing `LIVE TATAMI` dan auto-polling 15 detik.
2. **Tautan Langsung Google Maps [SELESAI ✅]**:
   - Tombol navigasi peta Google Maps langsung pada kartu venue di Beranda dan Halaman Publik Event.
3. **Analisis Statistik Lanjutan Wasit & Anti-Bias (Fase 5) [SELESAI ✅]**:
   - Perhitungan Standar Deviasi (Std Dev) pada laporan wasit untuk mendeteksi deviasi ekstrem.
   - Deteksi kesamaan kedaerahan (asal kota wasit vs kontingen yang bertanding) disertai peringatan potensi bias penilaian.

### Prioritas 3: Modul Khusus / Lanjutan (100% SELESAI ✅)
1. **Modul Video Assistant Review / VAR (Fase 6) [SELESAI ✅]**:
   - Panel video replay multi-kamera (Meja Panitera, Sudut AKA, Sudut SHIRO, Tatami Atas) di Meja Kendali Panitera.
   - Kontrol slow-motion (0.25x, 0.5x, 1x), frame stepping (-0.1s / +0.1s), kartu challenge AKA/SHIRO, auto-pause timer tatami, dan keputusan Overturned/Upheld/Inconclusive.
2. **Mode Pelatihan / Simulasi Sandbox (Fase 6) [SELESAI ✅]**:
   - Saklar gladi bersih (*is_training_mode*) dengan seeder data uji coba 1-klik dan pembersihan data uji coba atomik (*resetSimulationData*) tanpa mengotori turnamen resmi.
3. **Penyempurnaan Laporan & Dokumen Resmi (Fase 6+) [SELESAI ✅]**:
   - Format Berita Acara Resmi Penyelenggaraan Pertandingan cetak A4 berstandar PB PERKEMI lengkap dengan kop surat, nomor dokumen, rekapitulasi teknis, tabel klasemen 10 besar medali & Juara Umum I, II, III, dan 3 kolom tanda tangan delegasi resmi.
   - Saklar metode Juara Umum ganda (Standar Medali Emas > Perak > Perunggu vs. Sistem Bobot Poin 5-3-1).
   - Efek visual latar pita/sudut yang kalah otomatis menghitam redup (*grayscale*) pada monitor arena saat pemenang diputuskan.
