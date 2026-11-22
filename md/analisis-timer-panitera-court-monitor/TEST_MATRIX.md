# Matriks pengujian timer Panitera dan Court Monitor

Dokumen ini dipakai setelah perbaikan diimplementasikan. Hasil pengujian harus mencatat waktu lokal, event, court, match, timer version, perangkat, browser, koneksi, dan bukti layar.

## 1. Persiapan

### Peran perangkat

| Kode | Peran | Contoh perangkat |
| --- | --- | --- |
| P1 | Panitera utama | Laptop meja pertandingan |
| M1 | Court Monitor utama | Laptop atau mini PC proyektor |
| M2 | Monitor pembanding | Tablet |
| M3 | Monitor bergerak | HP |
| O1 | Koordinator atau observer | Laptop lain |

Jumlah perangkat dapat ditambah sesuai kapasitas venue. Pengujian harus memakai perangkat fisik berbeda, bukan hanya beberapa tab pada satu komputer.

### Data uji

- minimal dua event yang aktif bersamaan;
- minimal dua court pada salah satu event;
- satu match Embu;
- satu match Randori;
- akun dengan assignment court yang sesuai;
- koneksi jaringan venue yang akan dipakai saat pertandingan.

## 2. Data yang dicatat pada setiap skenario

| Field | Nilai |
| --- | --- |
| Tanggal dan waktu | |
| Penguji | |
| Event ID | |
| Court ID | |
| Match ID | |
| Perangkat dan browser | |
| Kondisi jaringan | |
| Version sebelum aksi | |
| Version setelah aksi | |
| Waktu pada Panitera | |
| Waktu pada setiap monitor | |
| Latensi perubahan state | |
| Status WebSocket | |
| Status HTTP sync | |
| Hasil | Lulus atau gagal |
| Catatan dan bukti | |

## 3. Skenario fungsi dasar

| ID | Skenario | Langkah utama | Hasil yang diharapkan |
| --- | --- | --- | --- |
| T-001 | Start Embu | Panggil peserta, tekan start | Semua monitor masuk `running` pada version yang sama |
| T-002 | Pause Embu | Pause pada detik yang dicatat | Semua monitor membeku pada detik resmi yang sama |
| T-003 | Resume Embu | Resume setelah jeda | Timer melanjutkan elapsed lama tanpa reset |
| T-004 | Finish Embu | Tekan selesai saat running | Semua monitor stopped, durasi resmi terkunci |
| T-005 | Reset Embu | Reset setelah pause | Semua monitor kembali ke nol dan version naik |
| T-006 | Restart Embu | Restart setelah finish yang dapat dibuka ulang | Metadata finish dibersihkan dan timer kembali stopped nol |
| T-007 | Start Randori | Mulai countdown | Semua monitor menghitung turun dari durasi yang sama |
| T-008 | Pause Randori | Pause sebelum nol | Remaining time sama pada semua perangkat |
| T-009 | Resume Randori | Resume setelah pause | Countdown melanjutkan remaining time yang sama |
| T-010 | Randori mencapai nol | Biarkan timer habis | Semua monitor berhenti menurun pada nol |
| T-011 | Mulai ulang Randori | Start run baru setelah nol | Run ID dan version berubah, bel start hanya sekali |
| T-012 | Simpan hasil Randori | Simpan hasil pertandingan | State menjadi completed dan stopped pada semua layar |

## 4. Skenario realtime dan urutan pesan

| ID | Skenario | Gangguan | Hasil yang diharapkan |
| --- | --- | --- | --- |
| R-001 | Event pause normal | Tidak ada | Monitor tidak menunggu polling untuk berhenti |
| R-002 | Event broadcast hilang | Buang satu pesan pada M2 | M2 pulih melalui HTTP snapshot dalam target fallback |
| R-003 | Pesan datang terbalik | Kirim version lama setelah version baru | Version lama ditolak |
| R-004 | Pesan duplikat | Kirim payload sama dua kali | Tidak ada perubahan ganda atau bel ganda |
| R-005 | HTTP lambat | Tambah delay snapshot | WebSocket tetap memperbarui state |
| R-006 | WebSocket putus | Matikan koneksi socket M2 | M2 memakai fallback dan menampilkan status offline realtime |
| R-007 | Reconnect | Hidupkan kembali socket | Refresh langsung dan state sama dengan server |
| R-008 | Reverb restart | Graceful restart server | Monitor reconnect dan tidak mengubah waktu resmi |
| R-009 | Tab hidden | Sembunyikan tab lalu pause | Saat tab visible, state langsung disinkronkan sebelum dianggap sehat |
| R-010 | Device sleep | Tidurkan lalu bangunkan perangkat | Clock lama dibuang dan dikalibrasi ulang |

## 5. Skenario konkurensi operator

| ID | Skenario | Langkah utama | Hasil yang diharapkan |
| --- | --- | --- | --- |
| C-001 | Dua start bersamaan | P1 dan O1 mengirim start pada version sama | Satu sukses, satu mendapat stale state |
| C-002 | Pause dan reset bersamaan | Kirim dua aksi pada version sama | Hanya satu transaksi diterapkan |
| C-003 | Double click | Klik aksi dua kali cepat | Tidak terbentuk dua run |
| C-004 | Aksi dari perangkat lama | Perangkat offline mengirim version lama | Server menolak tanpa merusak state |
| C-005 | Finish dan pause bersamaan | Kirim pada version sama | State akhir konsisten dan version naik sekali |

## 6. Skenario VAR

| ID | Skenario | Langkah utama | Hasil yang diharapkan |
| --- | --- | --- | --- |
| V-001 | VAR saat timer running | Buka review VAR | Timer paused dengan elapsed ms resmi |
| V-002 | VAR saat timer paused | Buka review VAR | Tidak terjadi penambahan elapsed |
| V-003 | VAR event | Amati semua monitor | Overlay VAR dan timer pause diterima |
| V-004 | Resolve VAR | Selesaikan review | Overlay hilang, timer tetap paused sampai operator resume |
| V-005 | Event VAR hilang | Buang event overlay | Snapshot memulihkan status tanpa mengubah elapsed |

## 7. Skenario multi-event dan multi-court

| ID | Skenario | Langkah utama | Hasil yang diharapkan |
| --- | --- | --- | --- |
| I-001 | Dua event aktif | Start Event A | Monitor Event B tidak berubah |
| I-002 | Dua court satu event | Pause Court 1 | Court 2 tidak berubah |
| I-003 | Payload event salah | Injeksi event ID lain | Client menolak payload |
| I-004 | Payload court salah | Injeksi court ID lain | Client menolak payload |
| I-005 | Pergantian match court | Selesaikan match dan panggil berikutnya | Monitor meninggalkan timer lama dan memakai match baru |
| I-006 | Assignment access | Akses court tanpa assignment | Server menolak sesuai policy |

## 8. Skenario jalur hasil dan status khusus

| ID | Skenario | Langkah utama | Hasil yang diharapkan |
| --- | --- | --- | --- |
| S-001 | Simpan hasil Embu utama | Simpan dari Match Detail | Monitor completed dan stopped |
| S-002 | Simpan hasil Embu legacy | Simpan dari halaman hasil lama | Event timer tetap dikirim |
| S-003 | Reopen hasil Embu | Buka ulang hasil | Monitor menerima in-progress dan stopped |
| S-004 | Walkover timbang badan | Terapkan WO pada match yang memiliki court | Monitor melepas atau menyelesaikan match tanpa menunggu polling lama |
| S-005 | Release match lama | Panggil match baru pada court sama | Timer match lama stopped dan monitor beralih |

## 9. Skenario clock dan tampilan

| ID | Skenario | Kondisi | Hasil yang diharapkan |
| --- | --- | --- | --- |
| K-001 | Jam perangkat maju | Ubah clock M2 | Tampilan tetap mengikuti clock server |
| K-002 | Jam perangkat mundur | Ubah clock M3 | Tampilan tidak berjalan mundur |
| K-003 | Latensi berbeda | Beri delay berbeda per perangkat | Detik tampilan tetap sama setelah kalibrasi |
| K-004 | Koreksi clock | Ganti kualitas jaringan | Koreksi tidak membuat timer mundur |
| K-005 | Countdown rounding | Amati mendekati nol | Semua perangkat memakai aturan pembulatan sama |
| K-006 | Count-up panjang | Embu melewati durasi bel terakhir | Timer terus berjalan sampai finish |

## 10. Skenario audio bel

| ID | Skenario | Hasil yang diharapkan |
| --- | --- | --- |
| B-001 | Start dengan audio aktif | Bel start satu kali |
| B-002 | Reconnect saat running | Bel historis tidak diputar ulang |
| B-003 | Pause dan resume | Bel start tidak diputar ulang jika bukan run baru |
| B-004 | Checkpoint Embu | Bel sesuai aturan kategori resmi |
| B-005 | Nol Randori | Bel akhir satu kali |
| B-006 | Run Randori baru | Bel start tersedia kembali |
| B-007 | Finish manual | Bel penutup sesuai aturan UI |

Aturan checkpoint harus dikonfirmasi oleh penanggung jawab pertandingan sebelum ekspektasi tes dikunci. Saat analisis, implementasi dan dua tes masih berbeda mengenai bel Embu pada detik ke-120.

## 11. Uji durasi panjang

Jalankan simulasi pertandingan berulang dengan kondisi berikut:

- start, pause, dan resume berulang;
- pergantian match dalam satu court;
- beberapa court aktif bersamaan;
- reconnect acak pada monitor;
- restart Reverb terkontrol;
- satu perangkat dibiarkan background lalu dikembalikan;
- satu perangkat memakai jaringan dengan latensi tinggi.

Jumlah perangkat dan lama pengujian ditentukan berdasarkan skala event sebenarnya. Tujuan uji adalah menemukan state yang tidak pulih, listener yang bocor, dan perbedaan version, bukan mengejar angka perangkat yang tidak mewakili venue.

## 12. Kriteria gagal langsung

Skenario dianggap gagal tanpa toleransi jika terjadi salah satu kondisi berikut:

- monitor terus berjalan setelah menerima state paused atau stopped;
- state version lama mengganti state baru;
- event lain mengubah court yang salah;
- elapsed time resmi berubah setelah pause tanpa resume;
- dua operator berhasil menerapkan aksi berbeda pada version yang sama;
- reconnect memulai run baru;
- VAR menjeda pada waktu berbeda antara database dan monitor;
- layar menyatakan realtime sehat padahal WebSocket dan HTTP tidak tersedia.

## 13. Form ringkasan hasil

| Kelompok | Lulus | Gagal | Belum diuji | Catatan |
| --- | ---: | ---: | ---: | --- |
| Fungsi dasar | | | | |
| Realtime dan urutan pesan | | | | |
| Konkurensi | | | | |
| VAR | | | | |
| Multi-event dan multi-court | | | | |
| Jalur hasil khusus | | | | |
| Clock dan tampilan | | | | |
| Audio bel | | | | |
| Uji durasi panjang | | | | |

