import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import ActionMenuDropdown from '@/Components/UI/Elements/ActionMenuDropdown';
import Button from '@/Components/UI/Elements/Button';
import Combobox from '@/Components/UI/Forms/Combobox';
import Modal from '@/Components/UI/Overlays/Modal';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

function QrPreview({ value, label, compact = false }) {
    const [failed, setFailed] = useState(false);
    const [copied, setCopied] = useState(false);
    const qrSource = value ? `https://quickchart.io/qr?size=280&margin=2&ecLevel=M&text=${encodeURIComponent(value)}` : '';

    const handleCopy = () => {
        if (!value) return;
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (compact) {
        return (
            <div className="flex flex-col items-center">
                <div className="relative aspect-square w-full max-w-[145px] overflow-hidden rounded-xl border border-[#e8e1d8] bg-white p-2 shadow-2xs">
                    {value && !failed ? (
                        <img
                            src={qrSource}
                            alt={`QR ${label}`}
                            className="aspect-square w-full rounded-lg object-contain"
                            onError={() => setFailed(true)}
                        />
                    ) : (
                        <div className="flex aspect-square w-full flex-col items-center justify-center rounded-lg border border-dashed border-amber-300 bg-amber-50 p-2 text-center text-amber-800">
                            <i className="fa-solid fa-qrcode text-2xl text-amber-600" aria-hidden="true" />
                            <p className="mt-1 text-[10px] font-bold">QR Siap</p>
                        </div>
                    )}
                </div>
                {value && (
                    <button
                        type="button"
                        onClick={handleCopy}
                        className={`mt-2 inline-flex items-center justify-center gap-1 rounded-md px-2.5 py-1 text-[10.5px] font-bold transition-all shadow-2xs cursor-pointer ${
                            copied
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#17120f] text-[#f0c060] hover:bg-[#2b2520]'
                        }`}
                        title="Salin tautan absensi QR"
                    >
                        <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'} text-[10px]`} />
                        <span>{copied ? 'Tersalin!' : 'Salin Link'}</span>
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-[#e5ded4] bg-white p-4 text-center shadow-xs">
            {value && !failed ? (
                <img
                    src={qrSource}
                    alt={`QR ${label}`}
                    className="mx-auto aspect-square w-full max-w-56 rounded-xl bg-white object-contain shadow-2xs p-2 border border-[#f0eae1]"
                    onError={() => setFailed(true)}
                />
            ) : (
                <div className="mx-auto flex aspect-square w-full max-w-56 flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-amber-800">
                    <i className="fa-solid fa-qrcode mb-2 text-3xl text-amber-600" aria-hidden="true" />
                    <p className="text-sm font-bold">{label}</p>
                    <p className="mt-1 text-xs">Tautan QR siap digunakan.</p>
                </div>
            )}
            <p className="mt-3 text-xs font-bold text-[#17120f]">{label}</p>
            {value && (
                <button
                    type="button"
                    onClick={handleCopy}
                    className={`mt-3 min-h-10 w-full rounded-xl px-3 text-xs font-semibold cursor-pointer flex items-center justify-center gap-2 transition-all ${
                        copied
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-[#17120f] text-[#f0c060] hover:bg-[#2b2520] shadow-sm'
                    }`}
                >
                    <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'} text-xs`} />
                    {copied ? 'Tautan Berhasil Disalin!' : 'Salin Tautan QR'}
                </button>
            )}
        </div>
    );
}

export default function CourtCoordinator({
    activeEvent,
    events = [],
    isSupervisor = false,
    isPanitera = false,
    isAssigned = false,
    canSwitchCourt = false,
    baseUrl = '/admin/koordinator-court',
    assignedCourtId = null,
    selectedCourtId = null,
    selectedCourt = null,
    courts = [],
    panel = [],
    reserves = [],
    categories = [],
}) {
    const { flash = {}, errors = {} } = usePage().props;
    const [tokenCopied, setTokenCopied] = useState(false);
    const [generateModalOpen, setGenerateModalOpen] = useState(false);
    const [rotateModalOpen, setRotateModalOpen] = useState(false);
    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [resetDutyModalOpen, setResetDutyModalOpen] = useState(false);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [activeQrRole, setActiveQrRole] = useState('all');
    const [expandedCategory, setExpandedCategory] = useState(categories[0]?.id || null);

    // Drag-and-drop & Swap states
    const [draggingReferee, setDraggingReferee] = useState(null);
    const [dragOverTargetId, setDragOverTargetId] = useState(null);
    const [swapModalOpen, setSwapModalOpen] = useState(false);
    const [swapSourceItem, setSwapSourceItem] = useState(null);
    const [isSwapping, setIsSwapping] = useState(false);
    const [swapError, setSwapError] = useState(null);

    const openQrModal = (role = 'all') => {
        setActiveQrRole(role);
        setQrModalOpen(true);
    };

    const generateForm = useForm({ event_id: activeEvent.id });
    const rotateForm = useForm({ event_id: activeEvent.id });
    const resetForm = useForm({ event_id: activeEvent.id });
    const resetDutyForm = useForm({ event_id: activeEvent.id, scope: 'court' });

    // Daftar semua wasit di court ini untuk modal tap-to-swap (aksesibilitas layar sentuh/tablet)
    const allCourtReferees = useMemo(() => {
        const list = [];
        panel.forEach((p, idx) => {
            if (p.referee) {
                list.push({
                    ...p,
                    displayRole: `W${idx + 1} · ${p.role_label}`,
                    isPanel: true,
                });
            }
        });
        reserves.forEach((r, idx) => {
            if (r.referee) {
                list.push({
                    ...r,
                    displayRole: `Cadangan #${idx + 1}`,
                    isPanel: false,
                });
            }
        });
        return list;
    }, [panel, reserves]);

    const courtMenuItems = useMemo(() => {
        if (!selectedCourt) return [];

        return [
            {
                id: 'generate',
                label: 'Generate Wasit Court Ini',
                description: selectedCourt.has_panel
                    ? 'Generate ulang susunan 5 wasit tatami & cadangan'
                    : 'Pilih otomatis 5 wasit tatami dan cadangan secara seimbang',
                icon: <i className="fa-solid fa-bolt text-amber-600" />,
                tone: 'gold',
                onClick: () => setGenerateModalOpen(true),
            },
            {
                id: 'qr',
                label: 'Tampilkan QR Absensi Court',
                description: 'Buka modal QR code seluruh wasit bertugas untuk absensi',
                icon: <i className="fa-solid fa-qrcode text-blue-600" />,
                tone: 'blue',
                disabled: !selectedCourt.has_panel,
                onClick: () => openQrModal('all'),
            },
            {
                id: 'rotate',
                label: 'Rotasi Wasit (Nomor Baru)',
                description: 'Rotasi posisi Wasit Utama & Wasit Pembantu untuk partai berikutnya',
                icon: <i className="fa-solid fa-arrows-rotate text-amber-700" />,
                tone: 'default',
                disabled: !selectedCourt.has_panel,
                onClick: () => setRotateModalOpen(true),
            },
            {
                id: 'panitera',
                label: 'Pusat Kendali Panitera',
                description: 'Buka dashboard meja panitera dan monitor skor court ini',
                icon: <i className="fa-solid fa-clipboard-check text-emerald-700" />,
                tone: 'emerald',
                href: `/admin/panitera/scoring?court_id=${selectedCourt.id}&event_id=${activeEvent.id}`,
                isLink: true,
            },
            {
                divider: true,
            },
            {
                id: 'reset-duty',
                label: 'Reset Jam Terbang Wasit',
                description: 'Kembalikan hitungan tugas wasit ke 0x (arsip soft delete)',
                icon: <i className="fa-solid fa-clock-rotate-left text-amber-600" />,
                tone: 'gold',
                onClick: () => {
                    resetDutyForm.setData('scope', 'court');
                    setResetDutyModalOpen(true);
                },
            },
            {
                id: 'reset-court',
                label: 'Reset Wasit Court Ini',
                description: 'Kosongkan susunan wasit tanpa menghapus rekap nilai',
                icon: <i className="fa-solid fa-rotate-left text-rose-600" />,
                tone: 'rose',
                disabled: !selectedCourt.has_panel,
                onClick: () => setResetModalOpen(true),
            },
        ];
    }, [selectedCourt, activeEvent.id]);

    const isChiefQualified = (ref) => {
        if (!ref) return false;
        const cert = (ref.certification_level || '').toUpperCase();
        if (cert.includes('NASIONAL')) return true;
        const dan = (ref.dan_grade || '').toUpperCase();
        return /\b(IV|V|VI|VII|VIII|[4-9])\b/.test(dan);
    };

    const hasChiefCandidateInCourt = useMemo(() => {
        return allCourtReferees.some((item) => isChiefQualified(item.referee));
    }, [allCourtReferees]);

    const getSwapValidationHint = (sourceItem, targetItem) => {
        if (!sourceItem?.referee || !targetItem?.referee) return null;

        // 1. Check Chief qualification (SOP 3.3)
        const isSourceChief = sourceItem.role === 'chief';
        const isTargetChief = targetItem.role === 'chief';

        if (isSourceChief && !isChiefQualified(targetItem.referee) && hasChiefCandidateInCourt) {
            return {
                type: 'error',
                message: `Wasit ${targetItem.referee.name} belum berkualifikasi IV DAN / Wasit Nasional untuk posisi Wasit Utama (SOP Wasit 3.3).`,
            };
        }

        if (isTargetChief && !isChiefQualified(sourceItem.referee) && hasChiefCandidateInCourt) {
            return {
                type: 'error',
                message: `Wasit ${sourceItem.referee.name} belum berkualifikasi IV DAN / Wasit Nasional untuk posisi Wasit Utama (SOP Wasit 3.3).`,
            };
        }

        // 2. Check region limit in Tatami (max 2 per region) (SOP 3.2 & 3.3)
        if (sourceItem.isPanel !== targetItem.isPanel) {
            const incomingRef = sourceItem.isPanel ? targetItem.referee : sourceItem.referee;
            const outgoingRef = sourceItem.isPanel ? sourceItem.referee : targetItem.referee;
            const incomingCity = (incomingRef.region || '').trim().toUpperCase();
            const outgoingCity = (outgoingRef.region || '').trim().toUpperCase();

            if (incomingCity !== outgoingCity) {
                let count = 0;
                panel.forEach((p) => {
                    if (p.referee && p.referee.id !== outgoingRef.id) {
                        if ((p.referee.region || '').trim().toUpperCase() === incomingCity) {
                            count++;
                        }
                    }
                });
                count++;
                if (count > 2) {
                    return {
                        type: 'error',
                        message: `Maksimal 2 wasit dari daerah yang sama di tatami (${incomingRef.region}: saat ini akan menjadi ${count} orang) (SOP Wasit 3.3).`,
                    };
                }
            }
        }

        return null;
    };

    const performSwap = (sourceRefId, targetRefId) => {
        if (!selectedCourt || !sourceRefId || !targetRefId || sourceRefId === targetRefId) return;

        setIsSwapping(true);
        setSwapError(null);
        router.post(
            `${baseUrl}/courts/${selectedCourt.id}/swap`,
            {
                event_id: activeEvent.id,
                source_referee_id: sourceRefId,
                target_referee_id: targetRefId,
            },
            {
                preserveScroll: true,
                onError: (errs) => {
                    const msg = errs.swap || Object.values(errs)[0];
                    if (msg) {
                        setSwapError(msg);
                    }
                },
                onSuccess: () => {
                    setSwapError(null);
                    setSwapModalOpen(false);
                    setSwapSourceItem(null);
                },
                onFinish: () => {
                    setIsSwapping(false);
                    setDraggingReferee(null);
                    setDragOverTargetId(null);
                },
            }
        );
    };

    const handleDragStart = (e, item) => {
        if (!item?.referee) return;
        e.dataTransfer.setData('text/plain', item.referee.id);
        e.dataTransfer.effectAllowed = 'move';
        setDraggingReferee({
            id: item.referee.id,
            name: item.referee.name,
            role: item.role,
            roleLabel: item.role_label,
        });
    };

    const handleDragOver = (e, targetRefId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverTargetId !== targetRefId) {
            setDragOverTargetId(targetRefId);
        }
    };

    const handleDragLeave = (e, targetRefId) => {
        if (dragOverTargetId === targetRefId) {
            setDragOverTargetId(null);
        }
    };

    const handleDrop = (e, targetRefId) => {
        e.preventDefault();
        setDragOverTargetId(null);
        const sourceRefId = e.dataTransfer.getData('text/plain') || draggingReferee?.id;
        if (sourceRefId && targetRefId && sourceRefId !== targetRefId) {
            performSwap(sourceRefId, targetRefId);
        }
    };

    const handleDragEnd = () => {
        setDraggingReferee(null);
        setDragOverTargetId(null);
    };

    const openSwapModal = (item) => {
        setSwapSourceItem(item);
        setSwapModalOpen(true);
    };

    const handleSwitchCourt = (courtId) => {
        router.get(baseUrl, {
            event_id: activeEvent.id,
            court_id: courtId,
        }, { preserveScroll: true });
    };

    const handleGenerate = (event) => {
        event.preventDefault();
        if (!selectedCourt) return;
        generateForm.post(`${baseUrl}/courts/${selectedCourt.id}/generate`, {
            preserveScroll: true,
            onSuccess: () => setGenerateModalOpen(false),
        });
    };

    const handleRotate = (event) => {
        event.preventDefault();
        if (!selectedCourt) return;
        rotateForm.post(`${baseUrl}/courts/${selectedCourt.id}/rotate`, {
            preserveScroll: true,
            onSuccess: () => setRotateModalOpen(false),
        });
    };

    const handleReset = (event) => {
        event.preventDefault();
        if (!selectedCourt) return;
        resetForm.delete(`${baseUrl}/courts/${selectedCourt.id}/panel`, {
            preserveScroll: true,
            onSuccess: () => setResetModalOpen(false),
        });
    };

    const handleResetDuty = (event) => {
        event.preventDefault();
        if (!selectedCourt) return;
        resetDutyForm.post(`${baseUrl}/courts/${selectedCourt.id}/reset-duty`, {
            preserveScroll: true,
            onSuccess: () => setResetDutyModalOpen(false),
        });
    };

    const copyToken = () => {
        if (!selectedCourt?.access_code) return;
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(selectedCourt.access_code);
            setTokenCopied(true);
            setTimeout(() => setTokenCopied(false), 2000);
        }
    };

    return (
        <AdminLayout title="Panel Koordinator Court">
            <Head title={`Panel Koordinator Court - ${selectedCourt?.name || 'Pertandingan'} | Smart Perkemi`} />

            <div className="space-y-6 pb-14">
                {/* Header Banner */}
                <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#0f0d0b] via-[#211b16] to-[#0f0d0b] p-5 text-white shadow-xl md:p-6">
                    <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#d4a843]/15 blur-3xl" />
                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-3xl">
                            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#e1b94e]">
                                <i className="fa-solid fa-chalkboard-user" aria-hidden="true" />
                                Koordinator Panitera & Court · Workspace Arena
                            </p>
                            <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight md:text-3xl">
                                {selectedCourt ? `Panel Koordinator Court · ${selectedCourt.name}` : 'Panel Koordinator Court'}
                            </h1>
                            <p className="mt-2 text-sm leading-relaxed text-white/70">
                                Ruang kendali wasit & meja panitera arena. Generate susunan 5 wasit per nomor pertandingan, monitor jam terbang menjaga court, dan lakukan rotasi berkala.
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4a843]/30 bg-[#d4a843]/10 px-3 py-1 font-semibold text-[#f0c060]">
                                    <i className="fa-solid fa-trophy" />
                                    {activeEvent.name}
                                </span>
                                {selectedCourt?.coordinator && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 font-medium text-white/90">
                                        <i className="fa-solid fa-user-tie text-[#f0c060]" />
                                        Koordinator: {selectedCourt.coordinator.name} ({selectedCourt.coordinator.coordinator_number})
                                    </span>
                                )}
                            </div>
                        </div>

                        {(isSupervisor || canSwitchCourt) && (
                            <Combobox
                                label="Pilih Event"
                                labelClassName="text-white/60"
                                containerClassName="w-full xl:w-80"
                                value={activeEvent.id}
                                clearable={false}
                                onChange={(value) => router.get(baseUrl, { event_id: value })}
                                options={events.map((e) => ({
                                    value: e.id,
                                    label: e.name,
                                    sublabel: [e.status_label, e.date_label, e.city].filter(Boolean).join(' · '),
                                }))}
                            />
                        )}
                    </div>
                </section>

                {/* Flash Messages & Validation Alerts */}
                {(flash.success || flash.error || errors.swap || errors.generate || errors.rotate || (Object.keys(errors).length > 0 ? Object.values(errors)[0] : null)) && (
                    <div
                        role="status"
                        className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-3 shadow-xs ${
                            (flash.error || errors.swap || errors.generate || errors.rotate || Object.keys(errors).length > 0)
                                ? 'border-red-300 bg-red-50/95 text-red-900'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        }`}
                    >
                        <i className={`fa-solid ${(flash.error || errors.swap || errors.generate || errors.rotate || Object.keys(errors).length > 0) ? 'fa-triangle-exclamation text-red-600' : 'fa-circle-check text-emerald-600'} mt-0.5 text-base shrink-0`} />
                        <div className="flex-1 min-w-0">
                            <strong className="block font-bold mb-0.5">
                                {(flash.error || errors.swap || errors.generate || errors.rotate || Object.keys(errors).length > 0) ? 'Validasi Penugasan (SOP Wasit 3.3)' : 'Berhasil'}
                            </strong>
                            <p className="leading-relaxed">
                                {errors.swap || errors.generate || errors.rotate || flash.error || flash.success || Object.values(errors)[0]}
                            </p>
                        </div>
                    </div>
                )}

                {/* Court Selector Tabs */}
                {(isSupervisor || canSwitchCourt) && courts.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2 border-b border-[#e9e2d8] pb-3">
                        <span className="mr-2 text-xs font-bold uppercase tracking-wider text-[#7a746e]">
                            Pilih Court:
                        </span>
                        {courts.map((court) => (
                            <button
                                key={court.id}
                                type="button"
                                onClick={() => handleSwitchCourt(court.id)}
                                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                                    court.id === selectedCourtId
                                        ? 'bg-[#17120f] text-[#f0c060] shadow-sm'
                                        : 'bg-white border border-[#e2d8c8] text-[#554e46] hover:bg-[#faf7f2]'
                                }`}
                            >
                                <i className="fa-solid fa-map-pin" />
                                {court.name}
                                {court.coordinator && (
                                    <span className="text-[10px] opacity-75 font-normal">
                                        ({court.coordinator.name})
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {!isAssigned && !isSupervisor && (
                    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 p-8 text-center text-amber-900">
                        <i className="fa-solid fa-triangle-exclamation mb-3 text-3xl text-amber-600" />
                        <h2 className="text-lg font-bold">Akun Anda Belum Ditugaskan ke Court</h2>
                        <p className="mt-1 text-sm text-amber-800/80 max-w-md mx-auto">
                            Akun Koordinator Court Anda belum ditempatkan pada Court aktif mana pun untuk event ini. Silakan hubungi Koordinator Pertandingan atau Panitia Pelaksana.
                        </p>
                    </div>
                )}

                {selectedCourt && (
                    <>
                        {/* Court Overview Card & Actions */}
                        <section className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm">
                            <div className="flex flex-col gap-4 border-b border-[#e9e2d8] bg-[#faf8f5] p-5 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <h2 className="text-xl font-bold text-[#17120f]">{selectedCourt.name}</h2>
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                                                selectedCourt.panel_ready
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : selectedCourt.has_panel
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}
                                        >
                                            {selectedCourt.panel_ready
                                                ? '5 Wasit Hadir & Siap'
                                                : selectedCourt.has_panel
                                                ? 'Menunggu Check-in Wasit'
                                                : 'Belum Ada Wasit'}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-[#7a746e]">
                                        {selectedCourt.location || 'Lokasi arena belum dicatat'}
                                    </p>

                                    {selectedCourt.access_code && (
                                        <div className="mt-2.5 flex items-center gap-2">
                                            <span className="text-[11px] font-medium text-[#7a746e]">Token Meja Panitera:</span>
                                            <span className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-900">
                                                {selectedCourt.access_code}
                                                <button
                                                    type="button"
                                                    onClick={copyToken}
                                                    className="cursor-pointer text-amber-700 hover:text-amber-950 p-0.5"
                                                    title="Salin Token Meja Panitera"
                                                >
                                                    <i className={`fa-solid ${tokenCopied ? 'fa-check text-emerald-600' : 'fa-copy'} text-[11px]`} />
                                                </button>
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Court Action Dropdown Menu */}
                                <div className="flex items-center gap-2">
                                    {!selectedCourt.has_panel && (
                                        <Button
                                            onClick={() => setGenerateModalOpen(true)}
                                            className="bg-[#17120f] text-[#f0c060] hover:bg-[#2b2520] text-xs font-bold shadow-xs"
                                        >
                                            <i className="fa-solid fa-bolt mr-1.5 text-amber-400" />
                                            Generate Wasit Court Ini
                                        </Button>
                                    )}

                                    <ActionMenuDropdown
                                        label="Menu Aksi Court"
                                        theme="light"
                                        menuHeader="Aksi & Opsi Court"
                                        width="w-72 sm:w-80"
                                        maxHeight="max-h-[380px]"
                                        icon={<i className="fa-solid fa-sliders text-xs text-amber-700" />}
                                        items={courtMenuItems}
                                    />
                                </div>
                            </div>

                            {/* Section 1: Roster Panel 5 Wasit & Cadangan */}
                            <div className="space-y-4 p-5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-[#3d3732] flex items-center gap-2">
                                            <i className="fa-solid fa-users-viewfinder text-[#d4a843]" />
                                            Susunan 5 Wasit Bertugas di Tatami
                                        </h3>
                                        <p className="mt-0.5 text-xs text-[#7a746e]">
                                            5 posisi wajib penilaian sesuai regulasi Shorinji Kempo (1 Wasit Utama & 4 Wasit Pembantu).
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openQrModal('all')}
                                            disabled={!selectedCourt.has_panel}
                                            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-[#d8c9ae] bg-[#fffbf2] px-3 py-1.5 text-xs font-bold text-[#8a631c] hover:bg-amber-100 disabled:opacity-50"
                                        >
                                            <i className="fa-solid fa-qrcode text-amber-700" />
                                            <span>Scan QR Wasit</span>
                                        </button>
                                        <p className="text-xs text-[#7a746e]">
                                            Nilai terikat permanen pada pertandingan.
                                        </p>
                                    </div>
                                </div>

                                {/* Banner Edukatif Drag & Drop, Scan Ulang, dan Jaminan Nilai Aman */}
                                {selectedCourt.has_panel && (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-[#fffcf7] to-amber-50/90 p-3.5 text-xs text-amber-950 shadow-2xs">
                                        <div className="flex items-start gap-2.5 min-w-0">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-800">
                                                <i className="fa-solid fa-arrow-right-arrow-left text-xs" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="font-bold text-[#17120f] flex items-center gap-2 flex-wrap">
                                                    <span>Rotasi & Drag-and-Drop Wasit Antar Posisi</span>
                                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200">
                                                        Bisa Digeser / Klik Tukar
                                                    </span>
                                                </p>
                                                <p className="text-[11px] text-[#7a6438] mt-0.5 leading-relaxed">
                                                    Tarik dan lepas (drag & drop) kartu wasit cadangan ke tatami untuk menggantikan tugas partai berikutnya.
                                                    Wasit yang bertukar posisi <strong>wajib memindai QR code posisi barunya</strong>.
                                                    Seluruh nilai pertandingan terdahulu <strong>tersimpan aman dan tidak akan hilang/ter-reset</strong>.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
                                            <i className="fa-solid fa-shield-check text-emerald-600" />
                                            Nilai Partai Aman
                                        </div>
                                    </div>
                                )}

                                {panel.length > 0 && panel.some((p) => p.referee) ? (
                                    <>
                                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            {panel.map((item, index) => {
                                                const ref = item.referee;
                                                const isDragging = draggingReferee?.id === ref?.id;
                                                const isDropTarget = dragOverTargetId === ref?.id && draggingReferee?.id !== ref?.id;

                                                const roleFullTitle = index === 0
                                                    ? 'Wasit Utama'
                                                    : `Wasit Pembantu ${index}`;

                                                return (
                                                    <div
                                                        key={item.role || item.id}
                                                        draggable={Boolean(ref && !isSwapping)}
                                                        onDragStart={(e) => handleDragStart(e, item)}
                                                        onDragOver={(e) => handleDragOver(e, ref?.id)}
                                                        onDragLeave={(e) => handleDragLeave(e, ref?.id)}
                                                        onDrop={(e) => handleDrop(e, ref?.id)}
                                                        onDragEnd={handleDragEnd}
                                                        className={`group relative flex flex-col justify-between rounded-2xl border p-4 sm:p-5 shadow-xs transition-all ${
                                                            isDragging
                                                                ? 'opacity-40 border-dashed border-amber-400 bg-amber-50/50 scale-[0.98]'
                                                                : isDropTarget
                                                                ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-100/70 shadow-md scale-[1.02]'
                                                                : index === 0
                                                                ? 'border-amber-300 bg-[#fffdfa] shadow-xs'
                                                                : 'border-[#e8e1d8] bg-white shadow-2xs hover:border-amber-300'
                                                        } ${ref ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                                    >
                                                        <div>
                                                            {/* Header Posisi & Status Kehadiran */}
                                                            <div className="flex items-center justify-between gap-2 border-b border-[#eee8e0] pb-3">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <i className="fa-solid fa-grip-vertical text-[#bda892] group-hover:text-amber-600 transition-colors text-sm shrink-0 cursor-grab" title="Geser untuk menukar posisi" />
                                                                    <span className="rounded-lg bg-[#17120f] px-2 py-0.5 text-xs font-black text-[#f0c060] tracking-wider shadow-2xs shrink-0">
                                                                        W{index + 1}
                                                                    </span>
                                                                    <span className="text-sm font-bold text-[#17120f]">
                                                                        {roleFullTitle}
                                                                    </span>
                                                                </div>
                                                                <div className="shrink-0">
                                                                    {item.is_checked_in ? (
                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                                                            <i className="fa-solid fa-circle-check text-emerald-600" /> Hadir ({item.checked_in_at})
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
                                                                            <i className="fa-regular fa-clock text-amber-600" /> Menunggu Scan
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {ref ? (
                                                                <div className="py-3.5 space-y-3">
                                                                    {/* Profil Wasit */}
                                                                    <div className="flex items-start gap-3">
                                                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#17120f] text-sm font-black text-[#f0c060] shadow-sm">
                                                                            {ref.name.slice(0, 1).toUpperCase()}
                                                                        </span>
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-sm sm:text-base font-bold text-[#17120f] leading-snug break-words">
                                                                                {ref.name}
                                                                            </p>
                                                                            <p className="mt-1 text-xs font-semibold text-[#8a631c]">
                                                                                {[ref.dan_grade, ref.region].filter(Boolean).join(' · ')}
                                                                            </p>
                                                                            {ref.certification_level && (
                                                                                <span className="mt-1 inline-block rounded bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                                                                                    {ref.certification_level}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Tombol QR Code Posisi Ini */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openQrModal(item.role)}
                                                                        className="cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/80 py-2 px-3 text-xs font-bold text-amber-950 hover:border-amber-400 hover:bg-amber-100/60 shadow-2xs transition-all"
                                                                        title="Tampilkan QR Code untuk dipindai oleh wasit di posisi ini"
                                                                    >
                                                                        <i className="fa-solid fa-qrcode text-amber-700 text-sm" />
                                                                        <span>{item.is_checked_in ? 'Tampilkan QR Posisi Ini' : 'Buka QR Code Check-in Wasit'}</span>
                                                                    </button>

                                                                    {/* Seksi Jam Terbang (Box Berbingkai Rapi Panjang Kebawah) */}
                                                                    <div className="rounded-xl border border-[#ede7df] bg-[#fbfaf8] p-3 text-xs">
                                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#9a6b20] mb-2 flex items-center gap-1.5">
                                                                            <i className="fa-solid fa-clock-rotate-left text-amber-600" />
                                                                            Jam Terbang & Penugasan
                                                                        </p>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <div className="rounded-lg bg-white border border-[#e8e1d8] p-2 text-center shadow-2xs">
                                                                                <p className="text-[10.5px] text-[#7a746e] font-medium">Court Ini</p>
                                                                                <p className="mt-0.5 text-base font-black text-[#17120f]">{ref.court_duty_count || 0}x</p>
                                                                            </div>
                                                                            <div className="rounded-lg bg-white border border-[#e8e1d8] p-2 text-center shadow-2xs">
                                                                                <p className="text-[10.5px] text-[#7a746e] font-medium">Total Event</p>
                                                                                <p className="mt-0.5 text-base font-black text-[#17120f]">{ref.total_duty_count || 0}x</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="py-8 text-center text-xs italic text-[#918981]">Belum ada wasit terpasang</div>
                                                            )}
                                                        </div>

                                                        {/* Drop Target Indicator Prompt */}
                                                        {isDropTarget && (
                                                            <div className="my-2 rounded-xl bg-amber-200/90 px-3 py-2 text-center text-xs font-bold text-amber-950 animate-pulse border border-amber-300">
                                                                <i className="fa-solid fa-arrow-down mr-1.5" />
                                                                Lepas untuk menukar posisi dengan {ref?.name}
                                                            </div>
                                                        )}

                                                        {/* Bottom Action: Tombol Tukar Posisi Wasit */}
                                                        {ref && (
                                                            <div className="mt-3 border-t border-[#ede7df] pt-3">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openSwapModal(item)}
                                                                    className="cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#ded5ca] bg-white py-2 px-3 text-xs font-bold text-[#443e38] hover:bg-amber-50 hover:text-amber-900 hover:border-amber-400 transition-all shadow-2xs"
                                                                    title="Tukar posisi wasit ini dengan wasit lain di court ini"
                                                                >
                                                                    <i className="fa-solid fa-arrow-right-arrow-left text-amber-700" />
                                                                    <span>Tukar Posisi Wasit (atau Geser Kartu)</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Pool Wasit Cadangan / Rotasi (Dapat di Drag & Drop) */}
                                        {reserves && reserves.length > 0 && (
                                            <div className="mt-4 rounded-xl border border-[#ede7df] bg-[#fbfaf8] p-4">
                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-[#7a746e] flex items-center gap-1.5">
                                                        <i className="fa-solid fa-user-clock text-amber-600" />
                                                        Pool Wasit Cadangan Court Ini ({reserves.length} Personel)
                                                    </p>
                                                    <span className="text-[11px] text-[#8a631c] font-medium flex items-center gap-1.5">
                                                        <i className="fa-solid fa-hand-pointer text-amber-600" />
                                                        Geser (drag) ke kartu di atas atau klik "Tukar" untuk menugaskan ke tatami
                                                    </span>
                                                </div>
                                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                    {reserves.map((res, rIdx) => {
                                                        const isDragging = draggingReferee?.id === res.referee?.id;
                                                        const isDropTarget = dragOverTargetId === res.referee?.id && draggingReferee?.id !== res.referee?.id;

                                                        return (
                                                            <div
                                                                key={res.id}
                                                                draggable={Boolean(res.referee && !isSwapping)}
                                                                onDragStart={(e) => handleDragStart(e, res)}
                                                                onDragOver={(e) => handleDragOver(e, res.referee?.id)}
                                                                onDragLeave={(e) => handleDragLeave(e, res.referee?.id)}
                                                                onDrop={(e) => handleDrop(e, res.referee?.id)}
                                                                onDragEnd={handleDragEnd}
                                                                className={`group flex items-center justify-between gap-2.5 rounded-xl border p-3 shadow-2xs transition-all ${
                                                                    isDragging
                                                                        ? 'opacity-40 border-dashed border-amber-400 bg-amber-50/50 scale-[0.98]'
                                                                        : isDropTarget
                                                                        ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-100/70 shadow-md scale-[1.02]'
                                                                        : 'border-dashed border-[#dcd4ca] bg-white hover:border-amber-400 hover:bg-[#fffdfa]'
                                                                } ${res.referee ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                                            >
                                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                    <i className="fa-solid fa-grip-vertical text-[#bda892] group-hover:text-amber-600 transition-colors text-xs shrink-0 cursor-grab" title="Geser ke tatami untuk menukar" />
                                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3d3732] text-xs font-black text-white shadow-2xs">
                                                                        {res.referee?.name?.slice(0, 1).toUpperCase()}
                                                                    </span>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <p className="text-xs font-bold text-[#17120f] leading-snug break-words">{res.referee?.name}</p>
                                                                            <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-900 shrink-0">
                                                                                C{rIdx + 1}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[10px] font-semibold text-[#8a631c] truncate">
                                                                            {[res.referee?.dan_grade, res.referee?.region].filter(Boolean).join(' · ')}
                                                                        </p>
                                                                        <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-[#7a746e] flex-wrap">
                                                                            <span className="rounded bg-[#fff8eb] border border-[#ecd9b8] px-1.5 py-0.2 font-bold text-[#8a631c]">
                                                                                Court: {res.referee?.court_duty_count}x
                                                                            </span>
                                                                            <span className="rounded bg-gray-100 border border-gray-200 px-1.5 py-0.2 font-bold text-gray-700">
                                                                                Total: {res.referee?.total_duty_count}x
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end justify-between gap-1.5 shrink-0">
                                                                    <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[9px] font-bold text-amber-800">
                                                                        Cadangan
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openSwapModal(res)}
                                                                        className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-[#dfd6cb] bg-white px-2 py-0.5 text-[9.5px] font-bold text-[#554e46] hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300 transition-colors shadow-2xs whitespace-nowrap"
                                                                        title="Tukar wasit cadangan ini ke tatami"
                                                                    >
                                                                        <i className="fa-solid fa-arrow-right-arrow-left text-[8.5px] text-amber-700" />
                                                                        Tukar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="rounded-xl border border-dashed border-[#dcd4ca] bg-[#faf8f5] p-8 text-center text-[#746c64]">
                                        <i className="fa-solid fa-user-slash mb-2 text-2xl text-[#b5afa6]" />
                                        <p className="text-sm font-semibold">Belum Ada Wasit yang Ditugaskan ke Court Ini</p>
                                        <p className="mt-1 text-xs text-[#8a8179]">
                                            Klik tombol "Generate Wasit Court Ini" untuk memilih 5 wasit dan cadangan secara seimbang.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Section 2: Daftar Nomor Pertandingan di Court Ini (Urutan Jam Awal) */}
                        <section className="space-y-4" aria-labelledby="category-list-title">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 id="category-list-title" className="text-lg font-bold text-[#17120f]">
                                        <i className="fa-solid fa-list-ol mr-2 text-[#d4a843]" />
                                        Nomor Pertandingan di {selectedCourt.name} ({categories.length} Nomor)
                                    </h2>
                                    <p className="text-xs text-[#7a746e]">
                                        Diurutkan berdasarkan jadwal partai paling awal (pagi ke sore).
                                    </p>
                                </div>
                                <div className="text-xs font-semibold text-[#8a631c] bg-[#fffbf2] border border-[#d8c9ae] rounded-lg px-3 py-1.5 inline-flex items-center gap-2">
                                    <i className="fa-regular fa-clock" />
                                    Jadwal Paling Awal Muncul Pertama
                                </div>
                            </div>

                            {categories.length > 0 ? (
                                <div className="space-y-4">
                                    {categories.map((cat, catIndex) => {
                                        const isExpanded = expandedCategory === cat.id;

                                        return (
                                            <article
                                                key={cat.id}
                                                className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm transition-all"
                                            >
                                                <div
                                                    onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                                                    className="flex cursor-pointer flex-col gap-4 border-b border-[#eee8e0] bg-[#fdfcfa] p-4.5 sm:flex-row sm:items-center sm:justify-between hover:bg-[#faf6ef]"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#17120f] text-xs font-bold text-[#f0c060]">
                                                            #{catIndex + 1}
                                                        </span>
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h3 className="text-base font-bold text-[#17120f]">
                                                                    {cat.name}
                                                                </h3>
                                                                <span
                                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                                                        cat.type === 'randori'
                                                                            ? 'bg-rose-100 text-rose-800'
                                                                            : 'bg-indigo-100 text-indigo-800'
                                                                    }`}
                                                                >
                                                                    {cat.type}
                                                                </span>
                                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 capitalize">
                                                                    {cat.gender}
                                                                </span>
                                                            </div>
                                                            <p className="mt-1 text-xs text-[#7a746e]">
                                                                <i className="fa-regular fa-clock mr-1 text-[#8a631c]" />
                                                                Jadwal: {cat.scheduled_time} · {cat.total_matches} Partai ({cat.completed_matches} Selesai)
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <span
                                                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                                                cat.is_completed
                                                                    ? 'bg-emerald-100 text-emerald-800'
                                                                    : cat.completed_matches > 0
                                                                    ? 'bg-amber-100 text-amber-800'
                                                                    : 'bg-gray-100 text-gray-700'
                                                            }`}
                                                        >
                                                            {cat.is_completed
                                                                ? 'Selesai'
                                                                : cat.completed_matches > 0
                                                                ? `${cat.completed_matches}/${cat.total_matches} Partai`
                                                                : 'Belum Mulai'}
                                                        </span>
                                                        <i
                                                            className={`fa-solid fa-chevron-down text-xs text-gray-400 transition-transform ${
                                                                isExpanded ? 'rotate-180 text-amber-600' : ''
                                                            }`}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Expanded Matches List for this Category on this Court */}
                                                {isExpanded && (
                                                    <div className="p-4 sm:p-5 bg-white">
                                                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#7a746e] mb-3">
                                                            Daftar Partai {cat.name} di {selectedCourt.name}:
                                                        </h4>
                                                        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                                                            {cat.matches.map((m) => (
                                                                <div
                                                                    key={m.id}
                                                                    className="rounded-xl border border-[#e8e1d8] bg-[#faf8f5] p-3 text-xs"
                                                                >
                                                                    <div className="flex items-center justify-between gap-1 border-b border-[#eee8e0] pb-1.5 mb-2">
                                                                        <span className="font-bold text-[#17120f]">
                                                                            Partai #{m.sequence}
                                                                        </span>
                                                                        <span className="text-[10px] text-[#7a746e]">
                                                                            {m.round_label || m.scheduled_time}
                                                                        </span>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <span className="inline-flex items-center gap-1 font-semibold text-rose-700 truncate">
                                                                                <span className="rounded bg-rose-600 px-1 py-0.2 text-[9px] font-black text-white">
                                                                                    AKA
                                                                                </span>
                                                                                {m.aka_name}
                                                                            </span>
                                                                            <span className="text-[10px] text-[#8a8179] truncate shrink-0">
                                                                                {m.aka_contingent}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <span className="inline-flex items-center gap-1 font-semibold text-slate-800 truncate">
                                                                                <span className="rounded bg-slate-700 px-1 py-0.2 text-[9px] font-black text-white">
                                                                                    SHIRO
                                                                                </span>
                                                                                {m.shiro_name}
                                                                            </span>
                                                                            <span className="text-[10px] text-[#8a8179] truncate shrink-0">
                                                                                {m.shiro_contingent}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="mt-2.5 flex items-center justify-between border-t border-[#eee8e0] pt-1.5">
                                                                        <span
                                                                            className={`rounded-full px-2 py-0.2 text-[9px] font-bold uppercase ${
                                                                                m.status === 'completed'
                                                                                    ? 'bg-emerald-100 text-emerald-800'
                                                                                    : m.status === 'in_progress'
                                                                                    ? 'bg-amber-100 text-amber-800'
                                                                                    : 'bg-gray-100 text-gray-600'
                                                                            }`}
                                                                        >
                                                                            {m.status === 'completed' ? 'Selesai' : m.status === 'in_progress' ? 'Tanding' : 'Menunggu'}
                                                                        </span>
                                                                        <Link
                                                                            href={`/admin/panitera/scoring/matches/${m.id}?event_id=${activeEvent.id}`}
                                                                            className="font-semibold text-amber-800 hover:text-amber-950 underline text-[10px]"
                                                                        >
                                                                            Detail Partai →
                                                                        </Link>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-[#dcd4ca] bg-white p-8 text-center text-[#746c64]">
                                    <i className="fa-regular fa-calendar-xmark mb-2 text-2xl text-[#b5afa6]" />
                                    <p className="text-sm font-semibold">Belum Ada Pertandingan Dijadwalkan di {selectedCourt.name}</p>
                                    <p className="mt-1 text-xs text-[#8a8179]">
                                        Pastikan Koordinator Pertandingan telah menetapkan jadwal dan court pada menu Jadwal Pertandingan.
                                    </p>
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>

            {/* Modal Generate Wasit */}
            <Modal
                isOpen={generateModalOpen}
                onClose={() => !generateForm.processing && setGenerateModalOpen(false)}
                title={`Generate Roster 5 Wasit ${selectedCourt?.name || ''}`}
                subtitle="Memilih Wasit Utama (IV DAN+) dan 4 Wasit Pembantu seimbang per kota dari pool yang hadir"
                closeOnBackdrop={!generateForm.processing}
                closeOnEscape={!generateForm.processing}
                footer={
                    <>
                        <Button
                            variant="outline"
                            onClick={() => setGenerateModalOpen(false)}
                            disabled={generateForm.processing}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleGenerate}
                            loading={generateForm.processing}
                            className="bg-[#17120f] text-[#f0c060] hover:bg-[#2a241f]"
                        >
                            <i className="fa-solid fa-bolt mr-2 text-amber-400" />
                            Generate Wasit Sekarang
                        </Button>
                    </>
                }
            >
                <div className="space-y-3 text-sm text-[#4a433d]">
                    <p>
                        Sistem akan menjalankan algoritma penugasan anti-bias:
                    </p>
                    <ul className="list-disc space-y-1 pl-5 text-xs text-[#625b54]">
                        <li>Memilih 1 Wasit Utama berkualifikasi minimal IV DAN / Wasit Nasional.</li>
                        <li>Memilih 4 Wasit Pembantu dari daerah yang berbeda (maksimal 2 dari daerah yang sama).</li>
                        <li>Memposisikan wasit selebihnya sebagai Wasit Cadangan (Reserve) untuk rotasi berikutnya.</li>
                        <li>Riwayat jam terbang penugasan akan otomatis tercatat di sistem audit.</li>
                    </ul>
                </div>
            </Modal>

            {/* Modal Rotasi Wasit */}
            <Modal
                isOpen={rotateModalOpen}
                onClose={() => !rotateForm.processing && setRotateModalOpen(false)}
                title={`Rotasi Wasit ${selectedCourt?.name || ''}`}
                subtitle="Rotasi untuk nomor pertandingan berikutnya"
                closeOnBackdrop={!rotateForm.processing}
                closeOnEscape={!rotateForm.processing}
                footer={
                    <>
                        <Button
                            variant="outline"
                            onClick={() => setRotateModalOpen(false)}
                            disabled={rotateForm.processing}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleRotate}
                            loading={rotateForm.processing}
                            className="bg-amber-600 text-white hover:bg-amber-700"
                        >
                            <i className="fa-solid fa-arrows-rotate mr-2" />
                            Lakukan Rotasi
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-[#4a433d]">
                    Wasit Cadangan akan dimasukkan ke dalam susunan bertugas dan posisi Wasit Utama / Pembantu akan dirotasi. Wasit yang baru masuk wajib melakukan scan QR court sebelum menilai.
                </p>
            </Modal>

            {/* Modal Reset Wasit */}
            <Modal
                isOpen={resetModalOpen}
                onClose={() => !resetForm.processing && setResetModalOpen(false)}
                title={`Reset Penugasan Wasit ${selectedCourt?.name || ''}?`}
                subtitle="Mengosongkan susunan wasit aktif di court ini"
                closeOnBackdrop={!resetForm.processing}
                closeOnEscape={!resetForm.processing}
                footer={
                    <>
                        <Button
                            variant="outline"
                            onClick={() => setResetModalOpen(false)}
                            disabled={resetForm.processing}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleReset}
                            loading={resetForm.processing}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            <i className="fa-solid fa-trash-can mr-2" />
                            Ya, Reset Susunan Wasit
                        </Button>
                    </>
                }
            >
                <div className="space-y-2 text-sm text-[#4a433d]">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 font-medium">
                        <i className="fa-solid fa-shield-halved mr-1.5 text-emerald-700" />
                        <strong>Jaminan Integritas Data:</strong> Reset court hanya mengosongkan status aktif arena saat ini. Seluruh rekam jejak penilaian wasit pada partai sebelumnya <strong>tetap 100% aman tersimpan</strong> di database dan tetap tercatat di laporan evaluasi.
                    </div>
                    <p className="text-xs text-[#746c64]">
                        Setelah direset, Anda dapat melakukan generate ulang susunan wasit baru kapan saja.
                    </p>
                </div>
            </Modal>

            {/* Modal Reset Jam Terbang Wasit */}
            <Modal
                isOpen={resetDutyModalOpen}
                onClose={() => !resetDutyForm.processing && setResetDutyModalOpen(false)}
                title={`Reset Jam Terbang Wasit · ${selectedCourt?.name || ''}?`}
                subtitle="Mengembalikan hitungan tugas/jam terbang wasit ke 0x secara aman"
                closeOnBackdrop={!resetDutyForm.processing}
                closeOnEscape={!resetDutyForm.processing}
                footer={
                    <>
                        <Button
                            variant="outline"
                            onClick={() => setResetDutyModalOpen(false)}
                            disabled={resetDutyForm.processing}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleResetDuty}
                            loading={resetDutyForm.processing}
                            className="bg-amber-600 text-white hover:bg-amber-700"
                        >
                            <i className="fa-solid fa-clock-rotate-left mr-2" />
                            Ya, Reset Jam Terbang
                        </Button>
                    </>
                }
            >
                <div className="space-y-4 text-sm text-[#4a433d]">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 font-medium">
                        <i className="fa-solid fa-shield-check mr-1.5 text-emerald-700" />
                        <strong>Aman & Terarsip (Soft Delete):</strong> Seluruh rekam jam terbang lama tidak akan dihapus permanen dari sistem, melainkan diarsipkan dengan <em>soft delete</em> di database sehingga hitungan jam terbang pada kartu wasit kembali bersih menjadi 0x.
                    </div>

                    <div>
                        <label className="text-xs font-bold text-[#17120f] block mb-2">
                            Pilih Cakupan Reset:
                        </label>
                        <div className="space-y-2">
                            <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                                resetDutyForm.data.scope === 'court'
                                    ? 'border-amber-400 bg-amber-50/70'
                                    : 'border-[#e5ded4] bg-white hover:bg-[#faf8f5]'
                            }`}>
                                <input
                                    type="radio"
                                    name="scope"
                                    value="court"
                                    checked={resetDutyForm.data.scope === 'court'}
                                    onChange={() => resetDutyForm.setData('scope', 'court')}
                                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                                />
                                <div>
                                    <p className="text-xs font-bold text-[#17120f]">Hanya {selectedCourt?.name}</p>
                                    <p className="text-[11px] text-[#7a746e]">Mereset hitungan tugas wasit pada court ini saja.</p>
                                </div>
                            </label>
                            <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                                resetDutyForm.data.scope === 'all'
                                    ? 'border-amber-400 bg-amber-50/70'
                                    : 'border-[#e5ded4] bg-white hover:bg-[#faf8f5]'
                            }`}>
                                <input
                                    type="radio"
                                    name="scope"
                                    value="all"
                                    checked={resetDutyForm.data.scope === 'all'}
                                    onChange={() => resetDutyForm.setData('scope', 'all')}
                                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                                />
                                <div>
                                    <p className="text-xs font-bold text-[#17120f]">Seluruh Court di Event Ini</p>
                                    <p className="text-[11px] text-[#7a746e]">Mereset hitungan jam terbang pada semua court di {activeEvent.name}.</p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Modal QR Absensi Wasit Court */}
            <Modal
                isOpen={qrModalOpen}
                onClose={() => setQrModalOpen(false)}
                title={`QR Absensi Wasit · ${selectedCourt?.name || ''}`}
                subtitle="Tampilkan QR code ini untuk dipindai oleh wasit menggunakan kamera HP atau menu Absensi Wasit."
                size={activeQrRole === 'all' ? '4xl' : 'md'}
                className={activeQrRole === 'all' ? 'sm:max-w-5xl md:max-w-6xl' : ''}
                footer={<Button onClick={() => setQrModalOpen(false)}>Tutup</Button>}
            >
                <div className="space-y-4">
                    {/* Role Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#e5ded4] bg-[#f5f1eb] p-1.5">
                        <button
                            type="button"
                            onClick={() => setActiveQrRole('all')}
                            className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                                activeQrRole === 'all'
                                    ? 'bg-[#17120f] text-[#f0c060] shadow-xs'
                                    : 'text-[#625b54] hover:text-[#17120f]'
                            }`}
                        >
                            <i className="fa-solid fa-border-all mr-1.5" />
                            Semua 5 Posisi
                        </button>
                        {panel.map((pm, idx) => {
                            const tabLabel = idx === 0 ? 'W1 · Wasit Utama' : `W${idx + 1} · Pembantu ${idx}`;
                            return (
                                <button
                                    key={pm.role}
                                    type="button"
                                    onClick={() => setActiveQrRole(pm.role)}
                                    className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                                        activeQrRole === pm.role
                                            ? 'bg-white text-[#17120f] shadow-xs'
                                            : 'text-[#625b54] hover:text-[#17120f]'
                                    }`}
                                >
                                    {tabLabel}
                                </button>
                            );
                        })}
                    </div>

                    {activeQrRole === 'all' ? (
                        <div className="space-y-3">
                            <p className="text-center text-xs text-[#7a746e]">
                                Tampilkan kelima QR berikut di meja Koordinator Court / meja arena {selectedCourt?.name}. Setiap wasit memindai QR sesuai posisi duduk/tugasnya.
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                                {panel.map((pm, idx) => {
                                    const roleTitle = idx === 0 ? 'Wasit Utama' : `Pembantu ${idx}`;
                                    return (
                                        <div key={pm.role} className="flex flex-col justify-between rounded-xl border border-[#e5ded4] bg-[#faf8f5] p-3 text-center shadow-2xs hover:border-amber-300 hover:bg-white transition-all">
                                            <div>
                                                <div className="mb-2.5 flex items-center justify-center gap-1.5">
                                                    <span className="rounded-md bg-[#17120f] px-1.5 py-0.5 text-[10px] font-black text-[#f0c060] tracking-wider shadow-2xs">
                                                        W{idx + 1}
                                                    </span>
                                                    <span className="text-xs font-bold text-[#17120f] whitespace-nowrap">
                                                        {roleTitle}
                                                    </span>
                                                </div>

                                                <QrPreview value={pm.check_in_url} label={`${selectedCourt?.name || 'Court'} · W${idx + 1}`} compact />

                                                <div className="mt-2.5 min-w-0">
                                                    <p className="text-xs sm:text-[13px] font-bold text-[#17120f] leading-snug line-clamp-2 min-h-[2.2rem] flex items-center justify-center text-center" title={pm.referee?.name}>
                                                        {pm.referee?.name || 'Belum terpasang'}
                                                    </p>
                                                    <p className="text-[10.5px] font-semibold text-[#8a631c] mt-0.5 truncate text-center">
                                                        {[pm.referee?.dan_grade, pm.referee?.region].filter(Boolean).join(' · ')}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-2.5 pt-2 border-t border-[#eee7df] flex items-center justify-center">
                                                {pm.is_checked_in ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                                        <i className="fa-solid fa-circle-check text-emerald-600" /> Hadir ({pm.checked_in_at})
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                                                        <i className="fa-regular fa-clock text-amber-600" /> Menunggu scan
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        (() => {
                            const currentMember = panel.find((p) => p.role === activeQrRole);
                            if (!currentMember) return null;
                            return (
                                <div className="mx-auto max-w-sm text-center">
                                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#ecdab8] bg-[#faf4e9] px-3.5 py-1 text-xs font-bold text-[#8a631c]">
                                        <i className="fa-solid fa-user-shield" />
                                        <span>Posisi: {currentMember.role_label} ({selectedCourt?.name})</span>
                                    </div>
                                    <QrPreview
                                        value={currentMember.check_in_url}
                                        label={`Check-in ${selectedCourt?.name || 'Court'} · ${currentMember.role_label}`}
                                    />
                                    <div className="mt-3 rounded-xl border border-[#e8e1d8] bg-[#faf8f5] p-3 text-left">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#9b7125]">Wasit Yang Ditugaskan</p>
                                        <p className="mt-0.5 text-sm font-bold text-[#17120f]">{currentMember.referee?.name || 'Belum ditugaskan'}</p>
                                        <p className="mt-0.5 text-xs text-[#7a746e]">
                                            {[currentMember.referee?.dan_grade, currentMember.referee?.region].filter(Boolean).join(' · ')}
                                        </p>
                                        <div className="mt-2 pt-2 border-t border-[#eee8e0]">
                                            {currentMember.is_checked_in ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                                                    <i className="fa-solid fa-circle-check" /> Sudah Check-in ({currentMember.checked_in_at})
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                                                    <i className="fa-solid fa-triangle-exclamation" /> Belum memindai QR code
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()
                    )}
                </div>
            </Modal>

            {/* Modal Tukar Posisi Wasit (Aksesibel untuk Layar Sentuh / Tablet) */}
            <Modal
                isOpen={swapModalOpen}
                onClose={() => !isSwapping && setSwapModalOpen(false)}
                title="Tukar Posisi Wasit Court"
                subtitle={
                    swapSourceItem?.referee
                        ? `Pilih wasit yang ingin ditukar posisinya dengan ${swapSourceItem.referee.name} (${swapSourceItem.role_label || 'Wasit'})`
                        : 'Pilih wasit untuk ditukar posisinya'
                }
                size="lg"
                closeOnBackdrop={!isSwapping}
                closeOnEscape={!isSwapping}
                footer={
                    <Button variant="outline" onClick={() => setSwapModalOpen(false)} disabled={isSwapping}>
                        Batal
                    </Button>
                }
            >
                <div className="space-y-4">
                    {/* Ringkasan Integritas */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 leading-relaxed">
                        <i className="fa-solid fa-circle-info mr-1.5 text-amber-700" />
                        <strong>Ketentuan Pertukaran:</strong> Wasit yang berpindah posisi wajib melakukan pemindaian (scan) ulang QR code posisi barunya. Seluruh rekam nilai partai sebelumnya yang dinilai oleh masing-masing wasit <strong>tetap tersimpan utuh dan tidak akan hilang</strong>.
                    </div>

                    {/* Wasit Asal */}
                    {swapSourceItem?.referee && (
                        <div className="rounded-xl border border-[#d8c9ae] bg-[#fffcf7] p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a631c] mb-1">
                                Wasit Yang Dipilih:
                            </p>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#17120f] text-xs font-black text-[#f0c060]">
                                        {swapSourceItem.referee.name.slice(0, 1).toUpperCase()}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-[#17120f]">
                                            {swapSourceItem.referee.name}
                                        </p>
                                        <p className="text-xs text-[#8a631c] font-medium">
                                            {[swapSourceItem.referee.dan_grade, swapSourceItem.referee.region].filter(Boolean).join(' · ')}
                                        </p>
                                    </div>
                                </div>
                                <span className="rounded-lg bg-[#17120f] px-2.5 py-1 text-xs font-bold text-[#f0c060] shrink-0">
                                    {swapSourceItem.role_label || 'Wasit'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Daftar Target Pertukaran */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#7a746e] mb-2.5">
                            Pilih Wasit Tujuan Pertukaran ({allCourtReferees.filter((c) => c.referee?.id !== swapSourceItem?.referee?.id).length} Opsi):
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2 max-h-72 overflow-y-auto pr-1">
                            {allCourtReferees
                                .filter((c) => c.referee?.id !== swapSourceItem?.referee?.id)
                                .map((target) => {
                                    const hint = getSwapValidationHint(swapSourceItem, target);

                                    return (
                                        <div
                                            key={target.referee?.id || target.role}
                                            className={`flex items-center justify-between gap-2.5 rounded-xl border p-3 transition-all ${
                                                hint
                                                    ? 'border-red-200 bg-red-50/30 hover:border-red-300'
                                                    : 'border-[#e5ded4] bg-white hover:border-amber-400 hover:bg-[#fffdfa]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3d3732] text-xs font-bold text-white">
                                                    {target.referee?.name?.slice(0, 1).toUpperCase()}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="truncate text-xs font-bold text-[#17120f]">
                                                        {target.referee?.name}
                                                    </p>
                                                    <p className="text-[10px] text-[#8a631c]">
                                                        {[target.referee?.dan_grade, target.referee?.region].filter(Boolean).join(' · ')}
                                                    </p>
                                                    <span className="inline-block mt-0.5 rounded bg-gray-100 px-1.5 py-0.2 text-[9.5px] font-semibold text-gray-700">
                                                        {target.displayRole}
                                                    </span>
                                                    {hint && (
                                                        <span className="block mt-1 text-[9.5px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 leading-tight">
                                                            <i className="fa-solid fa-triangle-exclamation text-[8.5px] mr-1 text-red-600" />
                                                            {hint.message}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                disabled={isSwapping}
                                                onClick={() => performSwap(swapSourceItem.referee.id, target.referee.id)}
                                                className={`shrink-0 text-xs px-2.5 py-1 min-h-8 ${
                                                    hint
                                                        ? 'bg-[#403831] text-[#f0c060] hover:bg-[#2b2520]'
                                                        : 'bg-[#17120f] text-[#f0c060] hover:bg-[#2b2520]'
                                                }`}
                                            >
                                                <i className="fa-solid fa-arrow-right-arrow-left text-[10px] mr-1 text-amber-400" />
                                                Tukar
                                            </Button>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Modal Validasi Pertukaran Ditolak Sistem (SOP Wasit 3.3) */}
            <Modal
                isOpen={Boolean(swapError)}
                onClose={() => setSwapError(null)}
                title="Pertukaran Ditolak oleh Sistem (SOP Wasit)"
                size="md"
            >
                <div className="space-y-4 p-1 text-sm">
                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
                        <i className="fa-solid fa-triangle-exclamation text-xl text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-red-900 mb-1">Ketentuan SOP Wasit Tidak Terpenuhi</h4>
                            <p className="leading-relaxed text-xs sm:text-sm">{swapError}</p>
                        </div>
                    </div>
                    <div className="rounded-xl border border-[#e5ded4] bg-[#fffcf7] p-3 text-xs text-[#7a6b58] space-y-2">
                        <p className="font-bold text-[#17120f] flex items-center gap-1.5">
                            <i className="fa-solid fa-book-bookmark text-amber-700" />
                            Ketentuan Validasi SOP Wasit POPDA XV Jatim (3.3):
                        </p>
                        <ul className="list-disc list-inside space-y-1 pl-1">
                            <li><strong>Wasit Utama (W1):</strong> Wajib berkualifikasi minimal IV DAN atau Wasit Nasional.</li>
                            <li><strong>Anti-bias Daerah:</strong> Maksimal 2 wasit dari kota/kabupaten yang sama dalam 1 susunan 5 wasit tatami.</li>
                            <li><strong>Check-in QR:</strong> Wasit yang bertukar posisi wajib melakukan pemindaian (scan) ulang QR code posisi barunya.</li>
                            <li><strong>Riwayat Nilai:</strong> Nilai pertandingan sebelumnya tetap aman tersimpan permanen dan tidak hilang.</li>
                        </ul>
                    </div>
                    <div className="flex justify-end pt-2">
                        <Button onClick={() => setSwapError(null)} className="bg-[#17120f] text-[#f0c060] hover:bg-[#2b2520]">
                            Saya Mengerti
                        </Button>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}

