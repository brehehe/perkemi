# Status implementasi perbaikan timer realtime

Tanggal: 22 November 2026

## Sudah diterapkan

| Area | Perubahan | Status |
| --- | --- | --- |
| Listener Court Monitor | Listener timer ganda dihapus; cleanup selalu menyertakan callback | Selesai |
| Resolusi state | Versi rendah ditolak; versi sama identik menjadi no-op; konflik versi sama meminta snapshot canonical | Selesai |
| Merge monitor | Snapshot HTTP canonical tidak lagi ditimpa live state dengan versi sama tetapi isi berbeda | Selesai |
| Isolasi | Payload dari event atau court lain ditolak | Selesai |
| VAR | Pause memakai lock, elapsed ms, membersihkan dua timestamp, menaikkan version sekali, dan broadcast `var_pause` | Selesai |
| Event VAR | Server dan frontend memakai `.var.review.updated` | Selesai |
| Broadcast backend | Pembentukan `PaniteraMatchStateUpdated` dipusatkan di `PaniteraTimerState` | Selesai |
| Jalur hasil | Workflow, Embu, Randori, reopen, endpoint Embu legacy, dan WO mengirim state timer konsisten | Selesai |

## Verifikasi otomatis

- Unit sinkronisasi dan ownership listener: 12 test lulus.
- Feature VAR dan weigh-in: 9 test, 86 assertion lulus.
- Feature Panitera scoring: 54 test, 835 assertion lulus.
- Production frontend build: lulus dengan Vite 8.2.2.
- Laravel Pint pada seluruh PHP yang berubah: lulus.

## Yang masih memerlukan uji lapangan

Perbaikan source code tidak dapat membuktikan kualitas jaringan venue atau proses Reverb produksi. Sebelum pertandingan besar, jalankan `TEST_MATRIX.md` minimal dengan satu perangkat Panitera dan tiga monitor fisik pada jaringan yang benar-benar akan dipakai.

Prioritas uji manual:

1. Pause pada Panitera harus membekukan semua layar tanpa menunggu polling.
2. Putuskan WebSocket satu monitor dan pastikan fallback HTTP memulihkan state.
3. Jalankan dua event dan dua court bersamaan untuk membuktikan isolasi UUID.
4. Uji VAR saat timer berjalan dan pastikan version serta elapsed ms sama pada semua layar.
5. Restart Reverb secara terkontrol dan pastikan monitor reconnect serta mengambil snapshot resmi.

## Pekerjaan operasional lanjutan

- WSS port 443 dan allowed origin produksi;
- process manager dan health check Reverb;
- indikator umur state atau stale warning yang lebih rinci;
- telemetri latency event-ke-monitor;
- konfirmasi aturan bel Embu sebelum memperbarui dua ekspektasi test bel lama.
