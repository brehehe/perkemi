import Button from '@/Components/UI/Elements/Button';
import Combobox from '@/Components/UI/Forms/Combobox';
import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import Modal from '@/Components/UI/Overlays/Modal';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const statusClass = {
    in_progress: 'border-red-200 bg-red-50 text-red-700',
    ready: 'border-amber-200 bg-amber-50 text-amber-700',
    pending: 'border-slate-200 bg-slate-50 text-slate-600',
};

const ROLE_LABELS = {
    chief: 'Wasit Utama',
    regional_1: 'Wasit Daerah 1',
    regional_2: 'Wasit Daerah 2',
    assistant_1: 'Wasit Pembantu 1',
    assistant_2: 'Wasit Pembantu 2',
};

function validateScannedQr(scannedValue, target) {
    if (!scannedValue) return { valid: false, message: 'QR tidak terbaca.' };

    let scannedUrl;
    try {
        scannedUrl = new URL(scannedValue, window.location.origin);
    } catch {
        return {
            valid: false,
            message: 'Format QR tidak valid. Pastikan Anda memindai QR resmi dari Panitera.',
        };
    }

    if (scannedUrl.host !== window.location.host) {
        return {
            valid: false,
            message: 'QR bukan berasal dari sistem Smart Perkemi. Silakan scan QR dari Panitera.',
        };
    }

    if (target.type === 'event') {
        const eventMatch = scannedUrl.pathname.match(/^\/wasit\/check-in\/event\/([^/]+)$/);
        if (eventMatch) {
            const [, scannedEventId] = eventMatch;
            if (scannedEventId !== target.eventId) {
                return {
                    valid: false,
                    message: 'QR absensi ini untuk event lain. Silakan scan QR absensi event ini.',
                };
            }
            return { valid: true, url: scannedUrl.toString() };
        }

        if (scannedUrl.pathname.includes('/court/')) {
            return {
                valid: false,
                message: 'Ini adalah QR Court. Silakan scan QR Absensi Event terlebih dahulu dari Panitera.',
            };
        }

        return {
            valid: false,
            message: `QR tidak sesuai. Silakan scan ${target.label} dari Panitera.`,
        };
    }

    if (target.type === 'court') {
        const courtMatch = scannedUrl.pathname.match(/^\/wasit\/check-in\/event\/([^/]+)\/court\/([^/]+)(?:\/([^/]+))?$/);
        if (courtMatch) {
            const [, scannedEventId, scannedCourtId, scannedRole] = courtMatch;

            if (scannedEventId !== target.eventId) {
                return {
                    valid: false,
                    message: `QR ini untuk event lain. Silakan scan QR ${target.courtName} pada event ini.`,
                };
            }

            if (scannedCourtId !== target.courtId) {
                return {
                    valid: false,
                    message: `QR ini untuk court lain. Silakan scan QR ${target.courtName} (${target.roleLabel}) dari Panitera.`,
                };
            }

            if (scannedRole && target.role && scannedRole !== target.role) {
                const scannedRoleLabel = ROLE_LABELS[scannedRole] || scannedRole;
                return {
                    valid: false,
                    message: `QR ini khusus untuk ${scannedRoleLabel}. Posisi Anda di ${target.courtName} adalah ${target.roleLabel}. Silakan scan QR ${target.roleLabel} dari Panitera.`,
                };
            }

            return { valid: true, url: scannedUrl.toString() };
        }

        if (scannedUrl.pathname.match(/^\/wasit\/check-in\/event\/[^/]+$/)) {
            return {
                valid: false,
                message: `Ini adalah QR Absensi Event. Silakan scan QR ${target.courtName} (${target.roleLabel}) dari Panitera.`,
            };
        }

        return {
            valid: false,
            message: `QR tidak sesuai. Silakan scan QR ${target.courtName} (${target.roleLabel}) dari Panitera.`,
        };
    }

    if (target.expectedPath && scannedUrl.pathname === target.expectedPath) {
        return { valid: true, url: scannedUrl.toString() };
    }

    return {
        valid: false,
        message: `QR tidak sesuai. Silakan scan ${target.label} dari Panitera.`,
    };
}

function QrScannerModal({ target, onClose }) {
    const videoRef = useRef(null);
    const [scannerState, setScannerState] = useState({ type: 'loading', message: 'Menyiapkan kamera belakang…' });
    const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'code'
    const [inputCode, setInputCode] = useState('');
    const [codeLoading, setCodeLoading] = useState(false);
    const [codeError, setCodeError] = useState('');
    const [manualOpen, setManualOpen] = useState(false);
    const [manualUrl, setManualUrl] = useState('');

    useEffect(() => {
        if (!target) return;

        setScannerState({ type: 'loading', message: 'Menyiapkan kamera belakang…' });
        setActiveTab('camera');
        setInputCode('');
        setCodeError('');
        setManualOpen(false);
        setManualUrl('');
    }, [target]);

    useEffect(() => {
        if (!target || activeTab !== 'camera') return undefined;

        let active = true;
        let scanTimer;
        let stream;

        const startScanner = async () => {
            if (!window.isSecureContext) {
                setScannerState({ type: 'error', message: 'Kamera hanya dapat dibuka melalui HTTPS. Masukkan 6 digit kode check-in di tab sebelah.' });
                return;
            }

            if (!navigator.mediaDevices?.getUserMedia) {
                setScannerState({ type: 'error', message: 'Browser tidak menyediakan akses kamera. Gunakan tab Kode 6-Digit di atas.' });
                return;
            }

            if (!('BarcodeDetector' in window)) {
                setScannerState({ type: 'error', message: 'Browser belum mendukung BarcodeDetector. Gunakan tab Kode 6-Digit di atas.' });
                return;
            }

            try {
                const supportedFormats = await window.BarcodeDetector.getSupportedFormats?.();
                if (supportedFormats && !supportedFormats.includes('qr_code')) {
                    setScannerState({ type: 'error', message: 'Browser belum mendukung QR. Gunakan tab Kode 6-Digit di atas.' });
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
                            const result = validateScannedQr(scannedValue, target);
                            if (!result.valid) {
                                setScannerState({ type: 'error', message: result.message });
                            } else {
                                active = false;
                                setScannerState({ type: 'success', message: 'QR berhasil dibaca. Membuka konfirmasi kehadiran…' });
                                window.location.assign(result.url);
                                return;
                            }
                        }
                    } catch {
                        if (active) setScannerState({ type: 'error', message: 'QR belum terbaca. Posisikan gambar di dalam bingkai.' });
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
                        ? 'Izin kamera ditolak. Gunakan tab Masukkan Kode 6-Digit di atas.'
                        : 'Kamera tidak dapat dibuka. Gunakan tab Masukkan Kode 6-Digit di atas.',
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
    }, [target, activeTab]);

    const handleCodeSubmit = async (e) => {
        e?.preventDefault();
        const cleanCode = inputCode.trim();
        if (cleanCode.length !== 6) {
            setCodeError('Masukkan 6 digit kode angka (contoh: 651234).');
            return;
        }

        setCodeLoading(true);
        setCodeError('');

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const response = await fetch('/wasit/code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ code: cleanCode }),
            });

            const data = await response.json();

            if (response.ok && data.target_url) {
                window.location.assign(data.target_url);
            } else {
                setCodeError(data.message || 'Kode 6 digit tidak valid atau sudah kadaluarsa.');
            }
        } catch {
            setCodeError('Gagal memverifikasi kode. Periksa koneksi internet Anda.');
        } finally {
            setCodeLoading(false);
        }
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        const trimmed = manualUrl.trim();
        if (!trimmed) return;

        const result = validateScannedQr(trimmed, target);
        if (!result.valid) {
            setScannerState({ type: 'error', message: result.message });
        } else {
            setScannerState({ type: 'success', message: 'Tautan valid. Membuka konfirmasi kehadiran…' });
            window.location.assign(result.url);
        }
    };

    return (
        <Modal
            isOpen={Boolean(target)}
            onClose={onClose}
            title={target?.title || 'Scan QR Kehadiran'}
            subtitle={target?.subtitle || 'Gunakan kamera atau masukkan kode 6-digit dari Panitera.'}
            size="md"
            footer={<Button variant="outline" onClick={onClose}>Tutup</Button>}
        >
            <div className="space-y-4">
                {/* Switcher Tab: Kamera vs Kode 6-Digit */}
                <div className="flex items-center rounded-xl border border-[#e5ded4] bg-[#f5f1eb] p-1 text-xs font-bold">
                    <button
                        type="button"
                        onClick={() => setActiveTab('camera')}
                        className={`flex-1 rounded-lg py-2 transition-all ${
                            activeTab === 'camera'
                                ? 'bg-white text-[#17120f] shadow-xs'
                                : 'text-[#655d56] hover:text-[#17120f]'
                        }`}
                    >
                        <i className="fa-solid fa-camera mr-1.5" /> Scan Kamera
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('code')}
                        className={`flex-1 rounded-lg py-2 transition-all ${
                            activeTab === 'code'
                                ? 'bg-[#17120f] text-[#f0c060] shadow-xs'
                                : 'text-[#655d56] hover:text-[#17120f]'
                        }`}
                    >
                        <i className="fa-solid fa-keyboard mr-1.5" /> Masukkan Kode 6-Digit
                    </button>
                </div>

                {target?.roleLabel && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-xs leading-5 text-amber-900">
                        <i className="fa-solid fa-user-shield mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
                        <div>
                            <span>Posisi penugasan Anda: <strong className="font-bold text-amber-950">{target.roleLabel}</strong> ({target.courtName}).</span>
                            <p className="mt-0.5 text-[11px] text-amber-800">Pastikan scan atau masukkan kode khusus untuk <strong>{target.roleLabel}</strong>.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'camera' ? (
                    <>
                        <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#0f0d0b]">
                            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                            <div className="pointer-events-none absolute inset-[12%] rounded-2xl border-2 border-[#f0c060] shadow-[0_0_0_999px_rgba(0,0,0,.38)]" />
                            <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white">Posisikan QR di tengah</span>
                        </div>
                        <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${scannerState.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : scannerState.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                            <i className={`fa-solid mr-2 ${scannerState.type === 'loading' ? 'fa-circle-notch animate-spin' : scannerState.type === 'success' ? 'fa-circle-check' : scannerState.type === 'error' ? 'fa-triangle-exclamation' : 'fa-camera'}`} aria-hidden="true" />
                            {scannerState.message}
                        </div>

                        {/* Opsi Cepat Beralih ke Kode */}
                        <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-center">
                            <p className="text-xs font-semibold text-amber-900">
                                Kamera buram atau tidak bisa dibuka?
                            </p>
                            <button
                                type="button"
                                onClick={() => setActiveTab('code')}
                                className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-[#17120f] px-3 py-1.5 text-xs font-bold text-[#f0c060] hover:bg-[#2b2520] transition-colors"
                            >
                                <i className="fa-solid fa-keyboard" />
                                Masukkan Kode 6-Digit Saja
                            </button>
                        </div>

                        {/* Alternatif input tautan manual */}
                        <div className="border-t border-[#ede7df] pt-2 text-center">
                            <button
                                type="button"
                                onClick={() => setManualOpen(!manualOpen)}
                                className="text-xs font-semibold text-[#8a631c] hover:underline"
                            >
                                <i className={`fa-solid ${manualOpen ? 'fa-chevron-up' : 'fa-link'} mr-1.5`} aria-hidden="true" />
                                {manualOpen ? 'Tutup input tautan' : 'Tempel tautan URL QR manual'}
                            </button>
                            {manualOpen && (
                                <form onSubmit={handleManualSubmit} className="mt-2.5 flex gap-2 text-left">
                                    <input
                                        type="url"
                                        value={manualUrl}
                                        onChange={(e) => setManualUrl(e.target.value)}
                                        placeholder="Tempel tautan check-in dari Panitera…"
                                        className="min-h-10 flex-1 rounded-lg border border-[#d8d1c8] bg-white px-3 text-xs text-[#17120f] focus:border-[#d4a843] focus:outline-none"
                                    />
                                    <Button type="submit" variant="dark" size="sm" className="shrink-0 text-xs">
                                        Buka
                                    </Button>
                                </form>
                            )}
                        </div>
                    </>
                ) : (
                    /* Tab Masukkan Kode 6-Digit */
                    <form onSubmit={handleCodeSubmit} className="space-y-4 py-2 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 text-2xl shadow-inner">
                            <i className="fa-solid fa-key" aria-hidden="true" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-[#17120f]">
                                Masukkan 6 Digit Kode Check-in
                            </h3>
                            <p className="mt-1 text-xs text-[#70675f]">
                                Masukkan nomor 6 angka yang tertera di bawah QR pada layar meja Panitera.
                            </p>
                        </div>
                        <div className="flex justify-center">
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                value={inputCode}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setInputCode(val);
                                    if (codeError) setCodeError('');
                                }}
                                placeholder="651234"
                                autoFocus
                                className="w-56 rounded-2xl border-2 border-amber-300 bg-amber-50/50 py-3 text-center font-mono text-3xl font-black tracking-[0.3em] text-[#17120f] focus:border-[#d4a843] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#d4a843]/20 transition-all shadow-inner"
                            />
                        </div>
                        {codeError && (
                            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                                <i className="fa-solid fa-circle-exclamation mr-1.5" aria-hidden="true" />
                                {codeError}
                            </div>
                        )}
                        <Button
                            type="submit"
                            variant="dark"
                            className="w-full min-h-12 text-sm font-bold bg-[#17120f] text-white hover:bg-[#2b2520]"
                            loading={codeLoading}
                            disabled={inputCode.length !== 6}
                        >
                            <i className="fa-solid fa-arrow-right mr-2 text-[#f0c060]" aria-hidden="true" />
                            Buka Konfirmasi Kehadiran
                        </Button>
                    </form>
                )}
            </div>
        </Modal>
    );
}

export default function RefereePortal({ activeEvent, events = [], referee, attendance, assignments = [], activeMatch = null, evaluatedMatches = [], matches = [] }) {
    const { flash = {} } = usePage().props;
    const listScores = evaluatedMatches.length ? evaluatedMatches : matches;
    const eventQuery = activeEvent?.id ? `?event_id=${encodeURIComponent(activeEvent.id)}` : '';
    const [scannerTarget, setScannerTarget] = useState(null);
    const [quickCode, setQuickCode] = useState('');
    const [quickLoading, setQuickLoading] = useState(false);
    const [quickError, setQuickError] = useState('');

    const handleQuickCodeSubmit = async (e) => {
        e.preventDefault();
        const cleanCode = quickCode.trim();
        if (cleanCode.length !== 6) {
            setQuickError('Masukkan 6 digit kode angka (contoh: 651234).');
            return;
        }

        setQuickLoading(true);
        setQuickError('');

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const response = await fetch('/wasit/code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ code: cleanCode }),
            });

            const data = await response.json();

            if (response.ok && data.target_url) {
                window.location.assign(data.target_url);
            } else {
                setQuickError(data.message || 'Kode 6 digit tidak valid atau sudah kadaluarsa.');
            }
        } catch {
            setQuickError('Gagal memverifikasi kode. Periksa koneksi internet Anda.');
        } finally {
            setQuickLoading(false);
        }
    };

    useEffect(() => {
        if (scannerTarget) return undefined;

        const interval = window.setInterval(() => router.reload({
            only: ['attendance', 'assignments', 'activeMatch', 'evaluatedMatches', 'matches'],
            preserveScroll: true,
            preserveState: true,
        }), 10000);

        return () => window.clearInterval(interval);
    }, [scannerTarget]);

    const openEventScanner = () => setScannerTarget({
        type: 'event',
        title: 'Scan QR Absensi Event',
        subtitle: `Arahkan kamera ke QR Absensi Event ${activeEvent.name} dari Panitera.`,
        eventId: activeEvent.id,
        label: 'QR absensi event',
        expectedPath: `/wasit/check-in/event/${activeEvent.id}`,
    });
    const openCourtScanner = (assignment) => setScannerTarget({
        type: 'court',
        title: `Scan QR ${assignment.court_name}`,
        subtitle: `Posisi: ${assignment.role_label}. Arahkan kamera ke QR ${assignment.role_label} di meja Panitera.`,
        courtId: assignment.court_id,
        courtName: assignment.court_name,
        role: assignment.role,
        roleLabel: assignment.role_label,
        eventId: activeEvent.id,
        label: `QR ${assignment.court_name} (${assignment.role_label})`,
        expectedPath: `/wasit/check-in/event/${activeEvent.id}/court/${assignment.court_id}`,
    });

    return (
        <AdminLayout title="Portal Wasit">
            <Head title="Portal Wasit | Smart Perkemi" />
            <div className="space-y-5 pb-8 sm:space-y-6 sm:pb-10">
                {flash?.error && (
                    <div
                        role="alert"
                        aria-live="polite"
                        className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 shadow-xs"
                    >
                        <i className="fa-solid fa-circle-exclamation mt-0.5 text-base text-rose-600" aria-hidden="true" />
                        <div>
                            <p className="font-bold text-rose-950">Perhatian</p>
                            <p className="mt-0.5 text-xs text-rose-800">{flash.error}</p>
                        </div>
                    </div>
                )}
                <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#0f0d0b] via-[#211b16] to-[#0f0d0b] p-5 text-white shadow-xl md:p-6">
                    <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#d4a843]/15 blur-3xl" />
                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-3xl">
                            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#e1b94e]"><i className="fa-solid fa-gavel" aria-hidden="true" /> Sistem Wasit per Event</p>
                            <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight md:text-3xl">Selamat bertugas, {referee.name}</h1>
                            <p className="mt-2.5 text-sm leading-relaxed text-white/70">Absensi event, check-in court, posisi dewan wasit, dan penilaian tersinkron dengan meja Panitera.</p>
                            <p className="mt-3 flex w-full items-start gap-2 rounded-xl border border-[#d4a843]/30 bg-[#d4a843]/10 px-3 py-2 text-xs font-semibold leading-relaxed text-[#f0c060] sm:inline-flex sm:w-auto sm:items-center sm:rounded-full sm:py-1"><i className="fa-solid fa-trophy mt-0.5 shrink-0 sm:mt-0" aria-hidden="true" /><span className="min-w-0 break-words">{activeEvent.name} · {activeEvent.city}</span></p>
                        </div>
                        {events.length > 1 && <Combobox label="Event tugas" labelClassName="text-white/60" containerClassName="w-full xl:w-96" value={activeEvent.id} clearable={false} onChange={(value) => router.get('/wasit', { event_id: value })} options={events.map((event) => ({ value: event.id, label: event.name, sublabel: [event.status_label, event.date_label, event.city].filter(Boolean).join(' · ') }))} />}
                    </div>
                </section>

                {/* Alternatif Check-in Cepat Menggunakan Kode 6-Digit */}
                <section className="rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-[#fffdf9] to-amber-50/60 p-4 sm:p-5 shadow-xs">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-3.5">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-800 text-lg shadow-inner">
                                <i className="fa-solid fa-keyboard" aria-hidden="true" />
                            </span>
                            <div>
                                <h2 className="text-sm font-bold text-[#17120f]">
                                    Check-in Menggunakan Kode 6-Digit (Tanpa Kamera)
                                </h2>
                                <p className="mt-0.5 text-xs text-[#70675f] leading-relaxed">
                                    Kamera bermasalah atau buram? Masukkan 6 angka kode yang tertera di bawah QR meja Panitera untuk check-in event atau court langsung.
                                </p>
                            </div>
                        </div>
                        <form onSubmit={handleQuickCodeSubmit} className="flex items-center gap-2 w-full md:w-auto shrink-0">
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                value={quickCode}
                                onChange={(e) => {
                                    setQuickCode(e.target.value.replace(/\D/g, ''));
                                    if (quickError) setQuickError('');
                                }}
                                placeholder="651234"
                                className="min-h-11 w-32 rounded-xl border border-[#d8d1c8] bg-white px-3 text-center font-mono text-base font-black tracking-widest text-[#17120f] focus:border-[#d4a843] focus:outline-none focus:ring-2 focus:ring-[#d4a843]/20"
                            />
                            <Button
                                type="submit"
                                variant="dark"
                                className="min-h-11 shrink-0 bg-[#17120f] hover:bg-[#2b2520]"
                                loading={quickLoading}
                                disabled={quickCode.length !== 6}
                            >
                                <i className="fa-solid fa-arrow-right mr-1.5 text-[#f0c060]" aria-hidden="true" />
                                Check-in
                            </Button>
                        </form>
                    </div>
                    {quickError && (
                        <p className="mt-2.5 text-xs font-semibold text-rose-700 flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-lg p-2">
                            <i className="fa-solid fa-circle-exclamation text-rose-600" /> {quickError}
                        </p>
                    )}
                </section>

                <section className="grid gap-4 md:grid-cols-3" aria-label="Status Wasit">
                    <article className={`rounded-2xl border p-5 shadow-sm ${attendance.event_present ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                        <div className="flex items-center justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#b8872d]"><i className="fa-solid fa-qrcode" aria-hidden="true" /></span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${attendance.event_present ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>{attendance.event_present ? 'Hadir' : 'Belum Scan'}</span></div>
                        <h2 className="mt-4 text-sm font-bold text-[#17120f]">Absensi Event</h2>
                        <p className="mt-1 text-xs leading-5 text-[#6f665d]">{attendance.event_present ? `Tercatat ${attendance.event_checked_in_at}` : 'Scan QR event yang ditampilkan Panitera.'}</p>
                        {!attendance.event_present && <Button variant="dark" className="mt-4 w-full" onClick={openEventScanner} iconLeft={<i className="fa-solid fa-camera" aria-hidden="true" />}>Scan QR Absensi</Button>}
                    </article>
                    <article className="rounded-2xl border border-[#e5ded4] bg-white p-5 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><i className="fa-solid fa-map-location-dot" aria-hidden="true" /></span><h2 className="mt-4 text-sm font-bold text-[#17120f]">Penugasan Court</h2><p className="mt-1 text-2xl font-black text-[#17120f]">{assignments.length}</p><p className="text-xs text-[#7a746e]">court aktif</p></article>
                    <article className="rounded-2xl border border-[#e5ded4] bg-white p-5 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><i className="fa-solid fa-circle-check" aria-hidden="true" /></span><h2 className="mt-4 text-sm font-bold text-[#17120f]">Selesai Dinilai</h2><p className="mt-1 text-2xl font-black text-[#17120f]">{listScores.length}</p><p className="text-xs text-[#7a746e]">pertandingan telah dinilai</p></article>
                </section>

                {/* Pertandingan Aktif Saat Ini yang Sedang Dinilai */}
                {activeMatch && (
                    <section className="relative overflow-hidden rounded-2xl border-2 border-[#b92f24] bg-gradient-to-r from-[#fff5f5] to-white p-5 shadow-md" aria-label="Pertandingan sedang aktif">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="animate-pulse rounded-full bg-[#b92f24] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                                        <i className="fa-solid fa-play mr-1.5" aria-hidden="true" /> Sedang Berlangsung
                                    </span>
                                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase text-blue-800">
                                        {activeMatch.court_name}
                                    </span>
                                    <span className="text-xs font-bold text-[#8a631c]">
                                        Partai #{activeMatch.sequence} · {activeMatch.round_label}
                                    </span>
                                </div>
                                <h2 className="mt-2 text-lg font-black text-[#17120f] sm:text-xl">{activeMatch.category_name}</h2>
                                <p className="mt-1 text-sm font-semibold text-[#514a43]">
                                    <i className="fa-solid fa-users mr-1.5 text-[#b92f24]" aria-hidden="true" />
                                    Peserta: <strong className="text-[#17120f]">{activeMatch.participant}</strong>
                                </p>
                            </div>
                            <div className="shrink-0">
                                <Link
                                    href={activeMatch.scoring_url}
                                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#b92f24] px-6 text-sm font-bold text-white shadow-lg shadow-red-900/20 hover:bg-[#99251c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b92f24]"
                                >
                                    <i className="fa-solid fa-star" aria-hidden="true" />
                                    Buka Papan Penilaian
                                </Link>
                            </div>
                        </div>
                    </section>
                )}

                <section className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="referee-assignment-title">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="referee-assignment-title" className="text-lg font-bold text-[#17120f]">Posisi Dewan Wasit</h2><p className="mt-1 text-sm text-[#7a746e]">Posisi ditetapkan Panitera. Scan QR court sebelum membuka papan penilaian.</p></div><p className="break-words text-xs text-[#8a8179]">{referee.license_number || 'Nomor lisensi belum diisi'} · {referee.certification_level || referee.dan_grade || 'Sertifikasi belum diisi'}</p></div>
                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        {assignments.map((assignment) => <article key={`${assignment.court_id}-${assignment.role}`} className="rounded-xl border border-[#e6dfd6] bg-[#fbfaf8] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#a57622]">{assignment.role_label}</p><h3 className="mt-1 text-base font-bold text-[#17120f]">{assignment.court_name}</h3><p className="mt-0.5 text-xs text-[#7a746e]">{assignment.court_location || 'Lokasi court belum dicatat'}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${assignment.is_checked_in ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{assignment.is_checked_in ? 'Aktif' : 'Wajib Scan QR'}</span></div>{assignment.is_checked_in && <p className="mt-3 text-xs text-emerald-700">Check-in court tercatat {assignment.checked_in_at}.</p>}{!assignment.is_checked_in && <Button variant="gold" className="mt-4 w-full" onClick={() => openCourtScanner(assignment)} iconLeft={<i className="fa-solid fa-camera" aria-hidden="true" />}>Scan QR Court</Button>}<Link href={`/admin/arbitrase/scoring${eventQuery}&court_id=${encodeURIComponent(assignment.court_id)}`} aria-disabled={!assignment.is_checked_in} className={`${assignment.is_checked_in ? 'mt-4' : 'mt-2'} inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 ${assignment.is_checked_in ? 'bg-[#17120f] text-white hover:bg-[#2b2520] focus-visible:outline-[#d4a843]' : 'pointer-events-none bg-[#e9e4dd] text-[#9c948b]'}`}><i className="fa-solid fa-star" aria-hidden="true" /> Buka Papan Penilaian</Link></article>)}
                        {assignments.length === 0 && <div className="rounded-xl border border-dashed border-[#d9d3c9] p-8 text-center text-sm text-[#7a746e] lg:col-span-2"><i className="fa-solid fa-user-clock mb-3 block text-2xl text-[#d4a843]" aria-hidden="true" />Panitera belum menetapkan Anda ke salah satu dari lima posisi court.</div>}
                    </div>
                </section>

                {/* Daftar Pertandingan Yang Telah Selesai Dinilai */}
                <section className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm" aria-labelledby="referee-scored-title">
                    <div className="border-b border-[#e9e2d8] p-4 sm:p-5">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 id="referee-scored-title" className="text-lg font-bold text-[#17120f]">Daftar Pertandingan Yang Telah Selesai Dinilai</h2>
                                <p className="mt-1 text-sm text-[#7a746e]">Hanya menampilkan data atlet/partai yang telah Anda nilai (jadwal partai berikutnya disembunyikan untuk menjaga integritas penilaian).</p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Total: {listScores.length} Atlet</span>
                        </div>
                    </div>
                    {listScores.length ? (
                        <TableContainer ariaLabel="Daftar pertandingan yang telah dinilai">
                            <table className="responsive-data-table responsive-data-table--cards w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-[#e9e2d8] bg-[#0d2f50] text-[10px] font-bold uppercase tracking-wider text-white">
                                        <th className="px-4 py-3 text-center" style={{ width: '45px' }}>No.</th>
                                        <th className="px-4 py-3">Nama Atlet</th>
                                        <th className="px-4 py-3">Kontingen</th>
                                        <th className="px-4 py-3">Kategori / Partai</th>
                                        <th className="px-4 py-3 text-center">Nilai Teknik (60)</th>
                                        <th className="px-4 py-3 text-center">Nilai Ekspresi (40)</th>
                                        <th className="px-4 py-3 text-center">Nilai Akhir (100)</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#eee8e0]">
                                    {listScores.map((score, index) => (
                                        <tr key={score.id || index} className="hover:bg-[#fcfaf7]">
                                            <td data-label="No." className="px-4 py-4 text-center font-bold text-[#17120f]">{index + 1}</td>
                                            <td data-label="Nama Atlet" className="px-4 py-4 font-bold text-[#0c203b]">{score.participant}</td>
                                            <td data-label="Kontingen" className="px-4 py-4 text-[#514a43]">{score.contingent || '—'}</td>
                                            <td data-label="Kategori" className="px-4 py-4">
                                                <span className="font-semibold text-[#17120f]">{score.category_name}</span>
                                                <p className="mt-0.5 text-xs text-[#847b73]">Partai #{score.sequence} · {score.court}</p>
                                            </td>
                                            <td data-label="Nilai Teknik" className="px-4 py-4 text-center font-mono font-bold text-[#17120f]">{score.technique_subtotal ?? '-'}</td>
                                            <td data-label="Nilai Ekspresi" className="px-4 py-4 text-center font-mono font-bold text-[#17120f]">{score.expression_subtotal ?? '-'}</td>
                                            <td data-label="Nilai Akhir" className="px-4 py-4 text-center font-mono text-base font-black text-[#0f172a]">{score.total_score ?? '-'}</td>
                                            <td data-label="Status" className="px-4 py-4 text-center">
                                                <span className="inline-block rounded-full bg-[#008b51] px-3 py-1 text-[11px] font-bold text-white shadow-sm">
                                                    Selesai
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TableContainer>
                    ) : (
                        <div className="p-8 text-center text-sm text-[#7a746e]">
                            <i className="fa-solid fa-clipboard-check mb-2 block text-2xl text-slate-400" aria-hidden="true" />
                            Belum ada pertandingan yang selesai Anda nilai pada event ini.
                        </div>
                    )}
                </section>
            </div>
            <QrScannerModal target={scannerTarget} onClose={() => setScannerTarget(null)} />
        </AdminLayout>
    );
}
