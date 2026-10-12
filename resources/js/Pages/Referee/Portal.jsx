import Button from '@/Components/UI/Elements/Button';
import Combobox from '@/Components/UI/Forms/Combobox';
import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import Modal from '@/Components/UI/Overlays/Modal';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const statusClass = {
    in_progress: 'border-red-200 bg-red-50 text-red-700',
    ready: 'border-amber-200 bg-amber-50 text-amber-700',
    pending: 'border-slate-200 bg-slate-50 text-slate-600',
};

function QrScannerModal({ target, onClose }) {
    const videoRef = useRef(null);
    const [scannerState, setScannerState] = useState({ type: 'loading', message: 'Menyiapkan kamera belakang…' });

    useEffect(() => {
        if (!target) return undefined;

        let active = true;
        let scanTimer;
        let stream;

        setScannerState({ type: 'loading', message: 'Menyiapkan kamera belakang…' });

        const startScanner = async () => {
            if (!window.isSecureContext) {
                setScannerState({ type: 'error', message: 'Kamera hanya dapat dibuka melalui HTTPS. Gunakan alamat https:// dengan port 8443.' });
                return;
            }

            if (!navigator.mediaDevices?.getUserMedia) {
                setScannerState({ type: 'error', message: 'Browser ini tidak menyediakan akses kamera. Gunakan kamera bawaan ponsel untuk memindai QR.' });
                return;
            }

            if (!('BarcodeDetector' in window)) {
                setScannerState({ type: 'error', message: 'Pemindai QR belum didukung browser ini. Gunakan Chrome terbaru atau kamera bawaan ponsel.' });
                return;
            }

            try {
                const supportedFormats = await window.BarcodeDetector.getSupportedFormats?.();
                if (supportedFormats && !supportedFormats.includes('qr_code')) {
                    setScannerState({ type: 'error', message: 'Browser ini belum mendukung pembacaan QR. Gunakan kamera bawaan ponsel.' });
                    return;
                }

                const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        facingMode: { ideal: 'environment' },
                        height: { ideal: 720 },
                        width: { ideal: 1280 },
                    },
                });

                if (!active || !videoRef.current) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setScannerState({ type: 'ready', message: `Arahkan kamera ke ${target.label}.` });

                const scanFrame = async () => {
                    if (!active || !videoRef.current) return;

                    try {
                        const barcodes = await detector.detect(videoRef.current);
                        const scannedValue = barcodes.at(0)?.rawValue;

                        if (scannedValue) {
                            const scannedUrl = new URL(scannedValue, window.location.origin);
                            const isExpectedQr = scannedUrl.origin === window.location.origin
                                && scannedUrl.pathname === target.expectedPath;

                            if (!isExpectedQr) {
                                setScannerState({ type: 'error', message: `QR tidak sesuai. Silakan scan ${target.label} dari Panitera.` });
                            } else {
                                active = false;
                                setScannerState({ type: 'success', message: 'QR berhasil dibaca. Membuka konfirmasi kehadiran…' });
                                window.location.assign(scannedUrl.toString());
                                return;
                            }
                        }
                    } catch {
                        if (active) setScannerState({ type: 'error', message: 'QR belum terbaca. Pastikan gambar terang dan berada di dalam bingkai.' });
                    }

                    scanTimer = window.setTimeout(scanFrame, 250);
                };

                scanFrame();
            } catch (error) {
                if (!active) return;

                const permissionDenied = error?.name === 'NotAllowedError' || error?.name === 'SecurityError';
                setScannerState({
                    type: 'error',
                    message: permissionDenied
                        ? 'Izin kamera ditolak. Izinkan kamera pada pengaturan browser lalu coba lagi.'
                        : 'Kamera tidak dapat dibuka. Pastikan kamera tidak sedang digunakan aplikasi lain.',
                });
            }
        };

        startScanner();

        return () => {
            active = false;
            window.clearTimeout(scanTimer);
            stream?.getTracks().forEach((track) => track.stop());
            if (videoRef.current) videoRef.current.srcObject = null;
        };
    }, [target]);

    return (
        <Modal
            isOpen={Boolean(target)}
            onClose={onClose}
            title={target?.title || 'Scan QR Kehadiran'}
            subtitle="Izinkan akses kamera saat browser meminta konfirmasi."
            size="md"
            footer={<Button variant="outline" onClick={onClose}>Tutup</Button>}
        >
            <div className="space-y-4">
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#0f0d0b]">
                    <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                    <div className="pointer-events-none absolute inset-[12%] rounded-2xl border-2 border-[#f0c060] shadow-[0_0_0_999px_rgba(0,0,0,.38)]" />
                    <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white">Posisikan QR di tengah</span>
                </div>
                <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${scannerState.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : scannerState.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                    <i className={`fa-solid mr-2 ${scannerState.type === 'loading' ? 'fa-circle-notch animate-spin' : scannerState.type === 'success' ? 'fa-circle-check' : scannerState.type === 'error' ? 'fa-triangle-exclamation' : 'fa-camera'}`} aria-hidden="true" />
                    {scannerState.message}
                </div>
            </div>
        </Modal>
    );
}

export default function RefereePortal({ activeEvent, events = [], referee, attendance, assignments = [], matches = [] }) {
    const eventQuery = activeEvent?.id ? `?event_id=${encodeURIComponent(activeEvent.id)}` : '';
    const [scannerTarget, setScannerTarget] = useState(null);

    useEffect(() => {
        if (scannerTarget) return undefined;

        const interval = window.setInterval(() => router.reload({
            only: ['attendance', 'assignments', 'matches'],
            preserveScroll: true,
            preserveState: true,
        }), 10000);

        return () => window.clearInterval(interval);
    }, [scannerTarget]);

    const openEventScanner = () => setScannerTarget({
        title: 'Scan QR Absensi Event',
        label: 'QR absensi event',
        expectedPath: `/wasit/check-in/event/${activeEvent.id}`,
    });
    const openCourtScanner = (assignment) => setScannerTarget({
        title: `Scan QR ${assignment.court_name}`,
        label: `QR ${assignment.court_name}`,
        expectedPath: `/wasit/check-in/event/${activeEvent.id}/court/${assignment.court_id}`,
    });

    return (
        <AdminLayout title="Portal Wasit">
            <Head title="Portal Wasit | Smart Perkemi" />
            <div className="space-y-5 pb-8 sm:space-y-6 sm:pb-10">
                <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#0f0d0b] via-[#211b16] to-[#0f0d0b] p-5 text-white shadow-xl md:p-6">
                    <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#d4a843]/15 blur-3xl" />
                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-3xl">
                            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#e1b94e]"><i className="fa-solid fa-gavel" aria-hidden="true" /> Sistem Wasit per Event</p>
                            <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight md:text-3xl">Selamat bertugas, {referee.name}</h1>
                            <p className="mt-2.5 text-sm leading-relaxed text-white/70">Absensi event, check-in court, posisi dewan wasit, dan antrean pertandingan tersinkron dengan meja Panitera.</p>
                            <p className="mt-3 flex w-full items-start gap-2 rounded-xl border border-[#d4a843]/30 bg-[#d4a843]/10 px-3 py-2 text-xs font-semibold leading-relaxed text-[#f0c060] sm:inline-flex sm:w-auto sm:items-center sm:rounded-full sm:py-1"><i className="fa-solid fa-trophy mt-0.5 shrink-0 sm:mt-0" aria-hidden="true" /><span className="min-w-0 break-words">{activeEvent.name} · {activeEvent.city}</span></p>
                        </div>
                        {events.length > 1 && <Combobox label="Event tugas" labelClassName="text-white/60" containerClassName="w-full xl:w-96" value={activeEvent.id} clearable={false} onChange={(value) => router.get('/wasit', { event_id: value })} options={events.map((event) => ({ value: event.id, label: event.name, sublabel: [event.status_label, event.date_label, event.city].filter(Boolean).join(' · ') }))} />}
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-3" aria-label="Status Wasit">
                    <article className={`rounded-2xl border p-5 shadow-sm ${attendance.event_present ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                        <div className="flex items-center justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#b8872d]"><i className="fa-solid fa-qrcode" aria-hidden="true" /></span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${attendance.event_present ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>{attendance.event_present ? 'Hadir' : 'Belum Scan'}</span></div>
                        <h2 className="mt-4 text-sm font-bold text-[#17120f]">Absensi Event</h2>
                        <p className="mt-1 text-xs leading-5 text-[#6f665d]">{attendance.event_present ? `Tercatat ${attendance.event_checked_in_at}` : 'Scan QR event yang ditampilkan Panitera.'}</p>
                        {!attendance.event_present && <Button variant="dark" className="mt-4 w-full" onClick={openEventScanner} iconLeft={<i className="fa-solid fa-camera" aria-hidden="true" />}>Scan QR Absensi</Button>}
                    </article>
                    <article className="rounded-2xl border border-[#e5ded4] bg-white p-5 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><i className="fa-solid fa-map-location-dot" aria-hidden="true" /></span><h2 className="mt-4 text-sm font-bold text-[#17120f]">Penugasan Court</h2><p className="mt-1 text-2xl font-black text-[#17120f]">{assignments.length}</p><p className="text-xs text-[#7a746e]">court aktif</p></article>
                    <article className="rounded-2xl border border-[#e5ded4] bg-white p-5 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700"><i className="fa-solid fa-list-ol" aria-hidden="true" /></span><h2 className="mt-4 text-sm font-bold text-[#17120f]">Antrean Tugas</h2><p className="mt-1 text-2xl font-black text-[#17120f]">{matches.length}</p><p className="text-xs text-[#7a746e]">pertandingan berikutnya</p></article>
                </section>

                <section className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="referee-assignment-title">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="referee-assignment-title" className="text-lg font-bold text-[#17120f]">Posisi Dewan Wasit</h2><p className="mt-1 text-sm text-[#7a746e]">Posisi ditetapkan Panitera. Scan QR court sebelum membuka papan penilaian.</p></div><p className="break-words text-xs text-[#8a8179]">{referee.license_number || 'Nomor lisensi belum diisi'} · {referee.certification_level || referee.dan_grade || 'Sertifikasi belum diisi'}</p></div>
                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        {assignments.map((assignment) => <article key={`${assignment.court_id}-${assignment.role}`} className="rounded-xl border border-[#e6dfd6] bg-[#fbfaf8] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#a57622]">{assignment.role_label}</p><h3 className="mt-1 text-base font-bold text-[#17120f]">{assignment.court_name}</h3><p className="mt-0.5 text-xs text-[#7a746e]">{assignment.court_location || 'Lokasi court belum dicatat'}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${assignment.is_checked_in ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{assignment.is_checked_in ? 'Aktif' : 'Wajib Scan QR'}</span></div>{assignment.is_checked_in && <p className="mt-3 text-xs text-emerald-700">Check-in court tercatat {assignment.checked_in_at}.</p>}{!assignment.is_checked_in && <Button variant="gold" className="mt-4 w-full" onClick={() => openCourtScanner(assignment)} iconLeft={<i className="fa-solid fa-camera" aria-hidden="true" />}>Scan QR Court</Button>}<Link href={`/admin/arbitrase/scoring${eventQuery}&court_id=${encodeURIComponent(assignment.court_id)}`} aria-disabled={!assignment.is_checked_in} className={`${assignment.is_checked_in ? 'mt-4' : 'mt-2'} inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 ${assignment.is_checked_in ? 'bg-[#17120f] text-white hover:bg-[#2b2520] focus-visible:outline-[#d4a843]' : 'pointer-events-none bg-[#e9e4dd] text-[#9c948b]'}`}><i className="fa-solid fa-star" aria-hidden="true" /> Buka Papan Penilaian</Link></article>)}
                        {assignments.length === 0 && <div className="rounded-xl border border-dashed border-[#d9d3c9] p-8 text-center text-sm text-[#7a746e] lg:col-span-2"><i className="fa-solid fa-user-clock mb-3 block text-2xl text-[#d4a843]" aria-hidden="true" />Panitera belum menetapkan Anda ke salah satu dari lima posisi court.</div>}
                    </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm" aria-labelledby="referee-queue-title">
                    <div className="border-b border-[#e9e2d8] p-4 sm:p-5"><h2 id="referee-queue-title" className="text-lg font-bold text-[#17120f]">Daftar Pertandingan Court Anda</h2><p className="mt-1 text-sm text-[#7a746e]">Urutan pertandingan aktif dan berikutnya sesuai jadwal Panitera.</p></div>
                    {matches.length ? <TableContainer ariaLabel="Daftar pertandingan yang ditugaskan"><table className="responsive-data-table responsive-data-table--cards w-full text-left text-sm"><thead><tr className="border-b border-[#e9e2d8] bg-[#f8f5f0] text-[10px] font-bold uppercase tracking-wider text-[#817970]"><th className="px-5 py-3">Jadwal</th><th className="px-5 py-3">Court</th><th className="px-5 py-3">Nomor pertandingan</th><th className="px-5 py-3">Peserta</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-[#eee8e0]">{matches.map((match) => <tr key={match.id} className="hover:bg-[#fcfaf7]"><td data-label="Jadwal" className="px-5 py-4 font-semibold text-[#17120f]">{match.scheduled_at || 'Belum dijadwalkan'}</td><td data-label="Court" className="px-5 py-4 text-[#625b54]">{match.court}</td><td data-label="Nomor pertandingan" className="px-5 py-4"><span className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${match.category_type === 'embu' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>{match.category_type}</span><span className="font-semibold text-[#17120f]">{match.category_name}</span><p className="mt-1 text-xs text-[#847b73]">Partai #{match.sequence} · {match.round_label}</p></td><td data-label="Peserta" className="px-5 py-4 text-[#625b54]">{match.participant || 'Menunggu hasil partai sebelumnya'}</td><td data-label="Status" className="px-5 py-4"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusClass[match.status] || statusClass.pending}`}>{match.status_label}</span></td></tr>)}</tbody></table></TableContainer> : <p className="p-8 text-center text-sm text-[#7a746e]">Belum ada antrean pertandingan untuk court Anda.</p>}
                </section>
            </div>
            <QrScannerModal target={scannerTarget} onClose={() => setScannerTarget(null)} />
        </AdminLayout>
    );
}
