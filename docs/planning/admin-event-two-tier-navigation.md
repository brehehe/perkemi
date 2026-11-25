# Perencanaan Arsitektur Navigasi Dua Tingkat Admin & Dekomposisi Event Detail
**Smart Perkemi (Shorinji Kempo Tournament Management System)**
*Dokumen Spesifikasi Perencanaan UI/UX & Teknis*

---

## 1. Latar Belakang & Analisis Permasalahan

### 1.1 Kondisi Saat Ini (As-Is)
1. **Sidebar yang *Overcrowded* (Beban Kognitif Tinggi)**:
   - Sidebar admin saat ini menampilkan seluruh menu sekaligus dalam satu bilah navigasi: *Dashboard, Pendaftaran (4 sub), Pertandingan (5 sub), Panitera (5 sub), Koordinator Court, Arbitrase (3 sub), Laporan & Hasil (10 sub), dan Master Data (12 sub)*.
   - Total terdapat lebih dari 40 tautan aktif di sidebar secara simultan, terlepas dari apakah admin sedang mengelola event tertentu atau hanya ingin melihat data umum.
2. **Kepadatan Ekstrem pada Halaman Detail Event (`Detail.jsx`)**:
   - Berkas `resources/js/Pages/Admin/Master/Event/Detail.jsx` mencapai **4.839 baris kode**.
   - Halaman tersebut memuat **14 tab horizontal** yang membutuhkan tombol geser (*scroll button*) ke kiri dan ke kanan:
     1. `age_categories` (Kelompok Umur)
     2. `participant_rules` (Persyaratan Peserta)
     3. `courts` (Lapangan / Court & VAR)
     4. `matches` (Nomor Pertandingan)
     5. `rundown` (Sesi Acara & Rundown)
     6. `tournament` (Pertandingan & Drawing)
     7. `referees` (Wasit & Juri)
     8. `arbitration` (Dewan Arbitrase)
     9. `clerks` (Panitera Meja)
     10. `field_coordinators` (Koordinator Lapangan)
     11. `info` (Informasi & Lokasi Event)
     12. `dates` (Tanggal Acara & Pendaftaran)
     13. `fees` (Biaya Kontingen & Atlet)
     14. `sync` (Ekspor/Impor Offline)
   - Navigasi melalui 14 tab horizontal menyulitkan panitia di lapangan saat menggunakan perangkat tablet atau laptop layar ringkas.
3. **Pencampuran Konteks Global vs. Konteks Event**:
   - Master Data global (seperti referensi tingkatan Sabuk/Kyu se-Indonesia, katalog 135 teknik Embu, dan manajemen akun pengguna) bercampur baur dengan data operasional turnamen yang sedang berjalan.

---

## 2. Konsep Arsitektur Baru: Model Navigasi Dua Tingkat (Two-Tier Architecture)

Arsitektur navigasi baru memisahkan sistem menjadi **2 Mode Utama**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TIER 1: GLOBAL ADMIN MODE                       │
│                        (Lobi & Pengaturan Pusat)                       │
│                                                                        │
│   ├── [1] Dashboard (Statistik Global Multi-Turnamen)                  │
│   ├── [2] Event (Daftar & Manajemen Seluruh Event) ───────────┐        │
│   ├── [3] Laporan & Hasil (Rekapitulasi Cross-Event & Arsip)  │        │
│   └── [4] Master Data (Katalog Global: Kyu, Teknik, User)     │        │
└───────────────────────────────────────────────────────────────┼────────┘
                                                                │
                                   Klik Event / Pilih Turnamen │
                                   (?event_id=UUID / Masuk)    │
                                                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        TIER 2: EVENT WORKSPACE MODE                    │
│                      (Konteks Spesifik Turnamen Aktif)                 │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ [BANNER EVENT AKTIF] Nama Event · Kota · [Ganti / Keluar Event]│   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│   ├── [1] Dashboard Event (Statistik & Live Progress Event Ini)        │
│   ├── [2] Pengaturan & Info Event (Pecahan tab: info, dates, fees...)  │
│   ├── [3] Kategori & Nomor Tanding (Pecahan tab: age_cat, matches)    │
│   ├── [4] Gelanggang & Rundown (Pecahan tab: courts, rundown)          │
│   ├── [5] Perangkat Pertandingan / SDM (Wasit, Juri, Panitera, Korlap)│
│   ├── [6] Pendaftaran Kontingen & Verifikasi Atlet                     │
│   ├── [7] Operasional Tanding (Drawing Bagan, Jadwal, Merge, Timbang)  │
│   ├── [8] Scoring Gelanggang (Pusat Kendali, Live Embu & Randori)      │
│   └── [9] Hasil & Medali Event (Juara, Klasemen Kontingen, Piagam)     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Spesifikasi Menu Navigasi

### 3.1 Tier 1: Mode Global (Root Admin)
Hanya menampilkan **4 menu utama** yang bersih dan fokus:

| No | Menu Utama | Deskripsi & Isi | Rute URL |
| :---: | :--- | :--- | :--- |
| **1** | **Dashboard** | Overview lintas kejuaraan: total atlet terdaftar di semua event, grafik kejuaraan tahunan, statistik sistem | `/admin/dashboard` |
| **2** | **Event** | Katalog seluruh kejuaraan. Tampilan kartu (*card grid*) dan tabel event, status (Draft, Pendaftaran Buka, Sedang Berlangsung, Selesai), tombol **"Kelola / Masuk Event"**, dan tombol tambah event baru | `/admin/master/event` |
| **3** | **Laporan & Hasil** | Pusat arsip hasil pertandingan resmi PB PERKEMI, rekapitulasi data nasional, dan log audit | `/admin/laporan` |
| **4** | **Master Data** | Master referensi global yang berlaku permanen di seluruh sistem (bukan per-event):<br>• Master Kyu & Tingkatan Dan<br>• Master 135 Teknik Gerakan Embu<br>• Master Standar Kelas Berat Badan<br>• Master Template Rekening & Pembayaran<br>• Master Direktori Wasit Nasional<br>• Master Akun Pengguna & Hak Akses (Role/Permission) | `/admin/master/kyu`<br>`/admin/master/technique`<br>`/admin/master/weight-class`<br>`/admin/master/payment-method`<br>`/admin/master/referee`<br>`/admin/master/user` |

> [!NOTE]
> Di **Mode Global**, seluruh menu operasional turnamen (seperti Drawing, Timbang Badan, Scoring Embu/Randori) disembunyikan karena menu-menu tersebut wajib memiliki konteks event spesifik.

---

### 3.2 Tier 2: Mode Event (Event Workspace)
Terpicu saat admin mengklik salah satu event dari daftar event (misal `?event_id=01a1b071-607d-704a-b810-7195290e0aa1` atau tenant URL).

#### A. Header Konteks Event (Event Switcher)
Terletak di bagian atas Sidebar atau Topbar saat berada di Mode Event:
- **Nama Event & Kota**: Contoh: *"Kejurprov Shorinji Kempo Jawa Barat 2026 · Bandung"*
- **Status Badge**: `Sedang Berlangsung` (Hijau) / `Pendaftaran Buka` (Biru) / `Draft` (Abu-abu)
- **Tombol "Ganti / Keluar Event"**: Satu klik untuk membersihkan `event_id` / session dan kembali ke Tier 1 (Mode Global).
- **Tautan Cepat**: Ikon "Lihat Publik" (`/event/{slug}`) dan "Mode Fullscreen Lapangan".

#### B. Struktur Menu Mode Event (Pecahan dari `Detail.jsx` & Operasional)
14 tab yang sebelumnya menumpuk di `Detail.jsx` dipecah ke dalam struktur menu terarah berikut:

```
MODE EVENT: [Kejurprov Jabar 2026]
│
├── 📊 Dashboard Event
│   └── Ringkasan metrik event aktif (peserta, kontingen, court, jadwal live)
│
├── ⚙️ Pengaturan & Info Event (Pecahan Tab Info, Dates, Fees, Rules, Sync)
│   ├── Informasi Dasar & Cover (Tab: info)
│   ├── Tanggal & Batas Waktu (Tab: dates)
│   ├── Biaya & Rekening Event (Tab: fees)
│   ├── Persyaratan Peserta (Tab: participant_rules)
│   └── Ekspor & Impor Data (Tab: sync)
│
├── 🏷️ Nomor & Kategori Tanding (Pecahan Tab Age Categories & Matches)
│   ├── Kelompok Umur Event (Tab: age_categories)
│   └── Nomor Pertandingan & Exhibition (Tab: matches)
│
├── 🥋 Gelanggang & Rundown (Pecahan Tab Courts & Rundown)
│   ├── Manajemen Court & Akses VAR (Tab: courts)
│   └── Jadwal Sesi & Rundown (Tab: rundown)
│
├── 👥 Perangkat Pertandingan (Pecahan Tab Referees, Arbitration, Clerks, Korlap)
│   ├── Wasit & Juri Ditugaskan (Tab: referees)
│   ├── Dewan Arbitrase (Tab: arbitration)
│   ├── Panitera Meja (Tab: clerks)
│   └── Koordinator Lapangan (Tab: field_coordinators)
│
├── 📝 Pendaftaran & Verifikasi
│   ├── Registrasi Kontingen Event
│   ├── Verifikasi Berkas & Atlet Event
│   └── Timbang Badan Hari-H
│
├── ⚔️ Bagan & Pertandingan
│   ├── Drawing & Bagan TM (Tab: tournament)
│   ├── Penjadwalan Pertandingan
│   └── Merge / Penggabungan Kelas
│
├── ⏱️ Scoring & Kendali Lapangan
│   ├── Pusat Kendali Panitera
│   ├── Input Penilaian Embu (5 Juri)
│   ├── Input Penilaian Randori
│   └── Panel Koordinator Court
│
└── 🏆 Hasil & Laporan Event
    ├── Hasil Juara Per Nomor
    ├── Klasemen Medali & Juara Umum
    └── Cetak Berita Acara Pertandingan
```

> [!IMPORTANT]
> **Prinsip Utama Master Data di Mode Event**:
> Master Data global (135 teknik, kyu, pengguna sistem) **TIDAK dimunculkan**. Mode Event hanya menampilkan data yang dialokasikan dan relevan untuk event tersebut (misalnya nomor pertandingan yang dibuka pada event ini, wasit yang ditugaskan di event ini, dan rekening pembayaran yang aktif untuk event ini).

---

## 4. Rincian Pemecahan Tab `Detail.jsx`

Tabel pemetaan pemecahan 14 tab yang ada di `Detail.jsx`:

| Tab Asal di `Detail.jsx` | Menu Tujuan di Mode Event | Rute / Sub-Halaman Baru | Komponen Yang Didekomposisi |
| :--- | :--- | :--- | :--- |
| **`info`** | Pengaturan Event $\rightarrow$ Info Umum | `/admin/event/{id}/settings/general` | Form identitas event, venue, kota, kontak, dokumen aturan |
| **`dates`** | Pengaturan Event $\rightarrow$ Tanggal Acara | `/admin/event/{id}/settings/dates` | Form tanggal tanding & rentang pendaftaran |
| **`fees`** | Pengaturan Event $\rightarrow$ Biaya & Rekening | `/admin/event/{id}/settings/fees` | Form fee per atlet/kontingen & pemilihan kanal bayar |
| **`participant_rules`** | Pengaturan Event $\rightarrow$ Aturan Peserta | `/admin/event/{id}/settings/rules` | `ParticipantRulesForm.jsx` |
| **`sync`** | Pengaturan Event $\rightarrow$ Backup & Sync | `/admin/event/{id}/settings/sync` | `EventDataSyncForm.jsx` |
| **`age_categories`** | Kategori $\rightarrow$ Kelompok Umur | `/admin/event/{id}/categories/age-groups` | CRUD Kelompok Umur khusus event ini |
| **`matches`** | Kategori $\rightarrow$ Nomor Pertandingan | `/admin/event/{id}/categories/matches` | Tabel kategori tanding, kuota, sakelar exhibition |
| **`courts`** | Gelanggang $\rightarrow$ Pengaturan Court & VAR | `/admin/event/{id}/courts` | Grid lapangan, kode akses meja, URL streaming VAR |
| **`rundown`** | Gelanggang $\rightarrow$ Rundown Acara | `/admin/event/{id}/rundown` | Timeline rundown & alokasi sesi per lapangan |
| **`referees`** | Perangkat Pertandingan $\rightarrow$ Wasit & Juri | `/admin/event/{id}/officials/referees` | Penugasan wasit, kode check-in, sertifikasi |
| **`arbitration`** | Perangkat Pertandingan $\rightarrow$ Arbitrase | `/admin/event/{id}/officials/arbitration` | `ArbitrationTab.jsx` |
| **`clerks`** | Perangkat Pertandingan $\rightarrow$ Panitera | `/admin/event/{id}/officials/clerks` | Penugasan panitera meja per gelanggang |
| **`field_coordinators`** | Perangkat Pertandingan $\rightarrow$ Korlap | `/admin/event/{id}/officials/coordinators` | Penugasan koordinator lapangan |
| **`tournament`** | Operasional $\rightarrow$ Drawing & Bagan | `/admin/pertandingan/drawing?event_id=...` | Integrasi langsung dengan modul drawing eksisting |

---

## 5. Strategi Arsitektur Teknis (React + Inertia & Laravel)

### 5.1 Penanganan State & URL Scoping (`?event_id=UUID`)
Sesuai aturan arsitektur pada `.ai/rules/general.md`:
> *"Events may be active concurrently, including overlapping dates. Activating one event must not deactivate another. Registration and tournament menus must preserve an explicit event_id and scope records by the event UUID; tenantEvent remains authoritative in tenant mode."*

1. **Resolusi Event Aktif di Frontend (`AdminLayout.jsx`)**:
   ```javascript
   const currentEventId = tenant?.id
       || currentSearchParams.get('event_id')
       || props.activeEvent?.id
       || null;

   const isEventMode = Boolean(currentEventId);
   ```
2. **Helper Navigasi Bersyarat**:
   - Saat `isEventMode === false`: Sidebar me-render `GlobalNavigationSections`.
   - Saat `isEventMode === true`: Sidebar me-render `EventNavigationSections` dengan parameter `event_id` otomatis di-injeksi ke setiap rute operasional.
3. **Mekanisme Switcher Cepat**:
   - Di daftar event (`/admin/master/event`), tombol aksi setiap kartu turnamen memiliki aksi:
     `router.visit(`/admin/dashboard?event_id=${event.id}`)` atau masuk ke sub-modul turnamen yang dipilih.

### 5.2 Refactoring Berkas Monolitik `Detail.jsx`
- Berkas `Detail.jsx` (4.839 baris) dipecah menjadi komponen modular di bawah direktori `resources/js/Pages/Admin/Event/`:
  - `Pages/Admin/Event/Dashboard.jsx` (Dashboard khusus event)
  - `Pages/Admin/Event/Settings/GeneralSettings.jsx`
  - `Pages/Admin/Event/Settings/DatesSettings.jsx`
  - `Pages/Admin/Event/Settings/FeesSettings.jsx`
  - `Pages/Admin/Event/Categories/AgeCategories.jsx`
  - `Pages/Admin/Event/Categories/MatchCategories.jsx`
  - `Pages/Admin/Event/Courts/CourtsIndex.jsx`
  - `Pages/Admin/Event/Rundown/RundownIndex.jsx`
  - `Pages/Admin/Event/Officials/OfficialsIndex.jsx`
- Mengurangi ukuran berkas dari ~4.800 baris menjadi file-file kecil yang masing-masing berukuran 200–400 baris, mempermudah perawatan (*maintainability*) dan meningkatkan kecepatan render Vite/React.

### 5.3 Kompatibilitas Mundur (Backward Compatibility)
- Rute lama `GET /admin/master/event/{event}/detail?tab={tabId}` tetap dipertahankan. Jika diakses, sistem secara otomatis me-redirect ke sub-menu baru yang sesuai:
  - Contoh: `/admin/master/event/{id}/detail?tab=courts` $\rightarrow$ `/admin/event/{id}/courts`.

---

## 6. Rencana Tahapan Eksekusi (Implementation Roadmap)

```
┌────────────────────────────────────────────────────────────────────────┐
│ TAHAP 1: Navigasi & Layout Mode Switcher                               │
│ • Update AdminLayout.jsx untuk mendukung isEventMode                   │
│ • Desain Event Context Banner di Sidebar                               │
│ • Pembuatan GlobalSidebar vs EventSidebar                              │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ TAHAP 2: Pembaruan Halaman Katalog Event                               │
│ • Update Index.jsx pada Admin/Master/Event                             │
│ • Tambahkan tombol jelas "Buka / Kelola Mode Event"                    │
│ • Dukungan transisi URL ?event_id=UUID                                 │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ TAHAP 3: Dekomposisi Halaman Detail Event                              │
│ • Ekstraksi tab info, dates, fees, rules, sync ke sub-halaman terpisah │
│ • Ekstraksi tab age_categories & matches                               │
│ • Ekstraksi tab courts & rundown                                       │
│ • Ekstraksi tab perangkat pertandingan (referees, clerks, korlap)      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ TAHAP 4: Quality Assurance & Verifikasi                                │
│ • Pengujian navigasi multi-event konkuren tanpa de-aktivasi event lain │
│ • Verifikasi responsivitas mobile & desktop                            │
│ • Pengujian fitur simpan/update form pada halaman yang telah dipecah   │
│ • Validasi kepatuhan aturan .ai/rules/general.md                       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Indikator Keberhasilan (Success Criteria)

1. **Beban Visual Sidebar Berkurang Signifikan**:
   - Di Mode Global: Sidebar hanya memiliki 4 menu utama (ringkas, bersih, tanpa distraksi operasional turnamen).
2. **Aksesibilitas Mode Event Meningkat**:
   - Pengguna tidak lagi perlu menggulir (*scroll*) 14 tab horizontal di layar.
   - Semua fungsi konfigurasi event dapat diakses langsung dari menu vertikal sebelah kiri.
3. **Kepatuhan Terhadap Aturan Multi-Event**:
   - Beberapa event tetap dapat aktif secara bersamaan tanpa saling mengganggu.
   - Parameter `event_id` terjaga konsisten di seluruh URL operasional.
4. **Performa Kode & Maintainability**:
   - Berkas monolitik 4.839 baris terpecah menjadi komponen modular terstandar TypeScript/JSX.
   - Waktu build Vite dan re-render React menjadi lebih cepat.
