# Rencana implementasi perbaikan timer realtime

Dokumen ini memecah perbaikan menjadi perubahan kecil yang dapat diuji dan ditinjau terpisah. Urutan mempertahankan timer server sebagai sumber kebenaran.

## 1. Prinsip implementasi

- Jangan menyiarkan tick setiap detik.
- Jangan mempercayai jam dinding perangkat sebagai sumber waktu resmi.
- Jangan menggabungkan state tanpa membandingkan `timer.version`.
- Jangan mengubah kolom timer di luar service domain timer.
- Jangan menghapus listener tanpa callback jika channel dipakai lebih dari satu consumer.
- Jangan menganggap WebSocket selalu tersedia. HTTP snapshot tetap wajib.
- Event UUID dan court UUID harus dibawa pada setiap permintaan dan payload.

## 2. Tahap A: hilangkan keterlambatan Court Monitor

Prioritas: P0

### A1. Tetapkan satu pemilik listener timer

Berkas:

- `resources/js/Pages/Admin/Panitera/CourtMonitor.jsx`
- `resources/js/Pages/Admin/Panitera/Partials/useLiveTimer.js`

Perubahan:

1. Pertahankan listener `.panitera.match-state.updated` di `useLiveTimer`.
2. Hapus listener event yang sama dari effect `refreshSnapshot` pada Court Monitor.
3. Pertahankan listener score, penalties, judge score, Randori score, dan VAR sebagai pemicu refresh data non-timer.
4. Saat cleanup listener non-timer, selalu sertakan callback yang didaftarkan.

Hasil yang diharapkan:

- event pause langsung masuk ke state hook;
- effect lain tidak dapat menghapus callback timer;
- refresh data skor tidak mengubah kepemilikan subscription timer.

### A2. Terapkan merge berbasis versi

Berkas:

- `resources/js/Pages/Admin/Panitera/CourtMonitor.jsx`
- `resources/js/Pages/Admin/Panitera/Partials/timerSynchronization.js`

Perubahan:

1. Buat fungsi pemilihan state yang membandingkan event, court, match, version, dan observation time.
2. Jangan selalu menimpa timer snapshot dengan `liveTimer.state`.
3. Jika version sama dan isi canonical identik, perlakukan sebagai duplikat tanpa perubahan.
4. Jika version sama tetapi isi canonical berbeda, jangan memilih berdasarkan waktu kedatangan; ambil snapshot HTTP canonical.
5. Jika match berubah, tolak state match lama walaupun version lebih besar.

Hasil yang diharapkan:

- snapshot paused tidak dapat ditimpa state running lama;
- respons yang terlambat tidak dapat memundurkan state;
- pergantian match pada satu court tidak membawa timer lama.

### A3. Rapikan kepemilikan channel

Keputusan yang disarankan:

- halaman menjadi pemilik subscription channel;
- hook mendaftarkan dan melepas callback tertentu;
- `Echo.leave()` hanya dipanggil ketika tidak ada consumer lain pada channel tersebut.

Jika pola ownership tidak diubah, minimal pastikan cleanup hook tidak meninggalkan effect lain pada channel yang sudah di-unsubscribe.

## 3. Tahap B: satukan semua perubahan timer di backend

Prioritas: P0 untuk VAR, P1 untuk jalur legacy

### B1. Definisikan kontrak state

Setiap mutasi timer harus menghasilkan field berikut:

```php
[
    'timer_status' => 'running|paused|stopped',
    'timer_started_at' => Carbon|null,
    'timer_started_at_ms' => int|null,
    'timer_elapsed_seconds' => int,
    'timer_elapsed_ms' => int,
    'timer_version' => int,
]
```

Aturan:

- `running`: kedua kolom started at terisi;
- `paused` dan `stopped`: kedua kolom started at bernilai null;
- `elapsed_seconds` berasal dari floor `elapsed_ms / 1000`;
- version selalu naik tepat satu kali per state transition;
- event menggunakan model yang sudah di-refresh setelah update.

### B2. Ekstrak operasi timer domain

Pilihan implementasi mengikuti konvensi service yang sudah ada. Operasi dapat tetap berada di `PaniteraMatchWorkflow` atau dipindahkan ke service khusus jika dipakai VAR, hasil, dan walkover.

API internal yang diperlukan:

- start;
- pause;
- resume;
- reset;
- restart;
- finish Embu;
- complete Randori;
- complete karena walkover.

Setiap operasi menerima expected version jika berasal dari perintah operator.

### B3. Perbaiki auto-pause VAR

Berkas:

- `app/Services/Var/VarReviewService.php`
- `app/Events/VarReviewStateUpdated.php`
- `resources/js/Pages/Admin/Panitera/MatchDetail.jsx`
- `resources/js/Pages/Admin/Panitera/CourtMonitor.jsx`

Perubahan:

1. Lock row match sebelum menghitung waktu.
2. Gunakan kalkulasi elapsed milliseconds yang sama dengan workflow timer.
3. Set status paused dan kosongkan kedua timestamp.
4. Naikkan version.
5. Dispatch `PaniteraMatchStateUpdated` dengan action `var_pause` setelah commit.
6. Tetap dispatch `VarReviewStateUpdated` untuk data overlay VAR.
7. Samakan listener menjadi `.var.review.updated`.

### B4. Audit jalur mutasi langsung

Target audit:

- `app/Http/Controllers/Admin/Panitera/EmbuResultController.php`
- `app/Services/Panitera/VerifyEmbuResult.php`
- `app/Services/Panitera/RandoriResultService.php`
- `app/Services/Panitera/ReopenEmbuResult.php`
- `app/Services/Var/VarReviewService.php`
- `app/Services/WeighInService.php`

Untuk setiap jalur, periksa transaksi, version, presisi, event, dan event context.

## 4. Tahap C: tingkatkan fallback dan status kesehatan

Prioritas: P1

### C1. Target pemulihan

Target harus ditetapkan oleh tim operasional sebelum implementasi. Contoh target yang dapat diuji:

- WebSocket terhubung: perubahan state terlihat tanpa menunggu siklus polling;
- satu event hilang: snapshot memulihkan state dalam batas fallback yang disepakati;
- reconnect: refresh dilakukan segera;
- tab kembali visible: refresh dilakukan segera sebelum timer dianggap sinkron.

Polling yang terlalu cepat pada semua layar dapat membebani server. Karena itu, interval perlu dibedakan antara timer running, idle, offline, dan hidden.

### C2. Status pada antarmuka

Informasi minimum:

| Field | Tujuan |
| --- | --- |
| Realtime | Menunjukkan koneksi WebSocket |
| Server sync | Menunjukkan endpoint snapshot dapat diakses |
| Clock sync | Menunjukkan kalibrasi clock selesai |
| Last update | Menunjukkan umur state terakhir |
| Timer version | Membantu diagnosis state stale |
| Event dan court | Memastikan layar berada pada konteks yang benar |

Jika state melewati ambang stale, layar harus menampilkan peringatan jelas dan melakukan refresh tanpa mengubah waktu resmi secara spekulatif.

### C3. Telemetri diagnostik

Catat event berikut pada mode diagnostik:

- subscription succeeded atau failed;
- reconnect dan disconnect;
- event diterima;
- event ditolak karena event, court, match, atau version;
- snapshot diterima;
- selisih waktu dan uncertainty clock;
- waktu dari aksi server sampai diterima client.

Data ini perlu memiliki batas retensi dan tidak boleh memuat rahasia, token, atau payload penilaian yang tidak diperlukan.

## 5. Tahap D: kesiapan deployment pertandingan

Prioritas: P1 sebelum digunakan pada kejuaraan besar

### D1. Endpoint WebSocket

- Gunakan hostname Reverb yang dapat diakses semua perangkat.
- Terminasi TLS pada port 443.
- Proxy ke proses Reverb internal.
- Batasi allowed origins ke domain aplikasi.
- Pastikan jaringan venue tidak memblokir WSS.

### D2. Manajemen proses

- Jalankan Reverb melalui Supervisor, systemd, atau platform terkelola.
- Pastikan proses otomatis hidup kembali setelah crash.
- Jalankan graceful restart saat deployment.
- Pantau file descriptor, koneksi, pesan, dan penggunaan memori.

### D3. Skalabilitas

Jika memakai lebih dari satu node Reverb:

- aktifkan Reverb scaling;
- gunakan Redis pusat;
- tempatkan node di belakang load balancer;
- uji pesan antar-node;
- pastikan semua aplikasi memakai credential dan channel contract yang sama.

## 6. Perubahan tes yang wajib

### Frontend unit test

- state version lebih rendah ditolak;
- snapshot version lebih tinggi mengalahkan live state lama;
- match lama tidak mengganti match baru;
- pause membekukan elapsed milliseconds;
- reconnect tidak memutar ulang bel;
- cleanup satu callback tidak menghapus callback lain.

### Backend feature test

- setiap aksi menaikkan version sekali;
- stale command ditolak;
- event timer membawa state yang sama dengan response JSON;
- VAR pause memakai milliseconds dan mengirim dua event yang tepat;
- penyimpanan hasil dan walkover mengirim stopped state;
- event dan court access tetap terisolasi.

### Integration test realtime

Gunakan fake channel atau browser test untuk membuktikan:

1. Panitera dan beberapa monitor memulai dari version sama.
2. Panitera mengirim pause.
3. Semua monitor menerima version baru.
4. Satu monitor yang event-nya dibuang pulih melalui snapshot.
5. Payload lama yang datang terlambat tidak mengubah tampilan.

## 7. Urutan pull request yang disarankan

1. Perbaiki ownership listener dan merge version-aware.
2. Tambahkan regression test listener Court Monitor.
3. Satukan operasi timer dan perbaiki VAR.
4. Migrasikan jalur hasil legacy dan walkover.
5. Tambahkan indikator kesehatan realtime.
6. Siapkan deployment WSS, process monitor, dan observability.
7. Jalankan uji lapangan multi-device berdasarkan `TEST_MATRIX.md`.

Memisahkan perubahan tersebut membuat akar masalah frontend dapat diperbaiki lebih dahulu tanpa mencampurnya dengan refactor backend dan pekerjaan infrastruktur.

## 8. Definition of done

Pekerjaan belum selesai hanya karena tes unit lulus. Selesai berarti:

- seluruh test timer terkait lulus;
- dua test bel yang tidak sesuai sudah diperbarui berdasarkan aturan bel resmi;
- pengujian minimal dua jenis perangkat dilakukan;
- pengujian disconnect dan reconnect dilakukan;
- event dan court isolation diverifikasi;
- tidak ada penulisan `timer_status` yang melewati kontrak timer;
- operator dapat melihat status realtime dan stale state;
- prosedur restart Reverb dan fallback jaringan terdokumentasi untuk petugas teknis.

