import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import AlertConfirm from '@/Components/UI/Feedback/AlertConfirm';
import { Button, Pagination } from '@/Components/UI';
import ActionMenuDropdown from '@/Components/UI/Elements/ActionMenuDropdown';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

const formatValue = (value) => {
    if (value === null || value === undefined || value === '' || value === '-') return '-';
    if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
    if (typeof value === 'object' && value !== null) {
        if ('athlete_label' in value) {
            return value.contingent ? `${value.athlete_label} (${value.contingent})` : value.athlete_label;
        }
        return JSON.stringify(value);
    }
    return String(value);
};

const renderCell = (row, column) => {
    const value = row[column.key];

    if (value === null || value === undefined || value === '' || value === '-') {
        return <span className="text-slate-400 font-medium">-</span>;
    }

    if (typeof value === 'object' && value !== null) {
        if ('athlete_label' in value) {
            return (
                <div className="space-y-0.5 min-w-[170px]">
                    <p className="font-bold text-slate-900 dark:text-white leading-snug">
                        {value.athlete_label || '-'}
                    </p>
                    {value.contingent ? (
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {value.contingent}
                        </p>
                    ) : null}
                </div>
            );
        }

        return String(JSON.stringify(value));
    }

    if (column.key === 'type') {
        const isEmbu = String(value).toLowerCase() === 'embu';
        return (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${isEmbu
                ? 'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                : 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                }`}>
                <i className={`fa-solid ${isEmbu ? 'fa-ranking-star' : 'fa-hand-fist'} text-[9px]`} />
                <span>{value}</span>
            </span>
        );
    }

    if (column.key === 'classification') {
        const isExhibition = String(value).toLowerCase().includes('ekshibisi') && !String(value).toLowerCase().includes('non');
        return (
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${isExhibition
                ? 'bg-purple-50 text-purple-700 border border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300'
                }`}>
                {value}
            </span>
        );
    }

    if (column.key === 'confirmed_at') {
        if (value === 'Belum Dikonfirmasi' || value === '-') {
            return <span className="text-[11px] font-medium text-slate-400">Belum Dikonfirmasi</span>;
        }
        return (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                <i className="fa-solid fa-circle-check text-emerald-600 text-[10px]" />
                {value}
            </span>
        );
    }

    if (column.key === 'category') {
        return <span className="font-bold text-slate-900 dark:text-white">{value}</span>;
    }

    if (column.key === 'status' && row.status_value) {
        const isSubmitted = row.status_value === 'submitted';

        return (
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ${isSubmitted
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300'
                }`}>
                {value}
            </span>
        );
    }

    if (typeof value === 'boolean') {
        return value ? 'Ya' : 'Tidak';
    }

    return String(value);
};

export default function ReportIndex({ activeEvent, events = [], reportOptions = [], dataset, canSubmitRefereeScores = false }) {
    const { tenant } = usePage().props;
    const isEventMode = Boolean(tenant?.event);
    const [submittingScoreId, setSubmittingScoreId] = useState(null);
    const [scoreToSubmit, setScoreToSubmit] = useState(null);
    const [submissionError, setSubmissionError] = useState('');
    const [submissionFeedback, setSubmissionFeedback] = useState('');

    // Pagination & Search States (defaults to 10 per user requirements)
    const [searchTerm, setSearchTerm] = useState('');
    const [perPage, setPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // Reset pagination and search on report switch
    useEffect(() => {
        setCurrentPage(1);
        setSearchTerm('');
    }, [dataset.key]);

    const visitReport = (report, eventId = activeEvent?.id) => {
        if (eventId && eventId !== activeEvent?.id) {
            router.visit(`/admin/event/${eventId}/enter?target=${encodeURIComponent(`/admin/laporan?report=${report}&event_id=${eventId}`)}`);
            return;
        }

        router.get('/admin/laporan', { event_id: eventId, report }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const exportExcelUrl = `/admin/laporan/export?event_id=${encodeURIComponent(activeEvent.id)}&report=${encodeURIComponent(dataset.key)}`;
    const exportPdfUrl = `/admin/laporan/pdf?event_id=${encodeURIComponent(activeEvent.id)}&report=${encodeURIComponent(dataset.key)}`;
    const previewPdfUrl = `/admin/laporan/pdf?event_id=${encodeURIComponent(activeEvent.id)}&report=${encodeURIComponent(dataset.key)}&stream=1`;
    const beritaAcaraUrl = `/admin/laporan/berita-acara?event_id=${encodeURIComponent(activeEvent.id)}`;

    const printAndExportItems = [
        {
            label: 'Unduh Dokumen PDF (.pdf)',
            description: 'Download dokumen laporan resmi dalam format PDF siap cetak',
            icon: <i className="fa-solid fa-file-pdf text-rose-600" />,
            href: exportPdfUrl,
            tone: 'rose',
            badge: 'PDF',
        },
        {
            label: 'Pratinjau PDF di Tab Baru',
            description: 'Buka dan periksa dokumen PDF langsung di browser',
            icon: <i className="fa-solid fa-arrow-up-right-from-square text-[#d4a843]" />,
            href: previewPdfUrl,
            target: '_blank',
        },
        {
            divider: true,
        },
        {
            label: 'Cetak Tampilan Layar (Web)',
            description: 'Cetak tabel saat ini langsung ke printer (A4 Landscape)',
            icon: <i className="fa-solid fa-print text-stone-600" />,
            onClick: () => window.print(),
        },
    ];

    const hasDetailPrint = dataset.rows.some((row) => Boolean(row.print_url));
    const hasRefereeScoreAction = dataset.key === 'referee-scores' && canSubmitRefereeScores;
    const eligibleDraftCount = hasRefereeScoreAction
        ? dataset.rows.filter((row) => row.can_submit).length
        : 0;

    // Filter rows based on search term
    const filteredRows = useMemo(() => {
        const rows = dataset.rows || [];
        if (!searchTerm.trim()) return rows;

        const query = searchTerm.toLowerCase();
        return rows.filter((row) => {
            return Object.values(row).some((val) => {
                if (val === null || val === undefined) return false;
                if (typeof val === 'object') {
                    if (val.athlete_label && String(val.athlete_label).toLowerCase().includes(query)) return true;
                    if (val.contingent && String(val.contingent).toLowerCase().includes(query)) return true;
                    return JSON.stringify(val).toLowerCase().includes(query);
                }
                return String(val).toLowerCase().includes(query);
            });
        });
    }, [dataset.rows, searchTerm]);

    // Pagination calculations
    const totalFiltered = filteredRows.length;
    const isAll = perPage === 'all';
    const effectivePerPage = isAll ? Math.max(1, totalFiltered) : Number(perPage);
    const totalPages = Math.max(1, Math.ceil(totalFiltered / effectivePerPage));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    const paginatedRows = useMemo(() => {
        if (isAll) return filteredRows;
        const startIndex = (safeCurrentPage - 1) * effectivePerPage;
        return filteredRows.slice(startIndex, startIndex + effectivePerPage);
    }, [filteredRows, safeCurrentPage, effectivePerPage, isAll]);

    const startIndex = isAll ? 1 : Math.min((safeCurrentPage - 1) * effectivePerPage + 1, totalFiltered);
    const endIndex = isAll ? totalFiltered : Math.min(safeCurrentPage * effectivePerPage, totalFiltered);

    const submitRefereeScore = () => {
        if (!scoreToSubmit || submittingScoreId) return;

        const isBulkSubmission = scoreToSubmit.submit_all === true;
        const submissionUrl = isBulkSubmission
            ? `/admin/laporan/events/${encodeURIComponent(activeEvent.id)}/submitted-referee-scores`
            : `/admin/laporan/events/${encodeURIComponent(activeEvent.id)}/submitted-referee-scores/${encodeURIComponent(scoreToSubmit.score_id)}`;

        setSubmissionError('');
        setSubmissionFeedback('');
        router.post(
            submissionUrl,
            {},
            {
                preserveScroll: true,
                onStart: () => setSubmittingScoreId(isBulkSubmission ? 'all' : scoreToSubmit.score_id),
                onSuccess: (page) => {
                    setScoreToSubmit(null);
                    setSubmissionFeedback(
                        page.props.flash?.success
                        || page.props.flash?.info
                        || (isBulkSubmission
                            ? 'Semua draft lengkap berhasil disimpan sebagai Sudah Dikirim.'
                            : 'Penilaian berhasil disimpan sebagai Sudah Dikirim.'),
                    );
                },
                onError: (errors) => setSubmissionError(Object.values(errors).flat().join(' ') || 'Penilaian belum dapat dikirim.'),
                onFinish: () => setSubmittingScoreId(null),
            },
        );
    };

    return (
        <AdminLayout title="Pusat Laporan & Hasil">
            <Head title={`${dataset.title} | Laporan SMART PERKEMI`} />

            <style>{`
                @media print {
                    @page { size: A4 landscape; margin: 10mm; }
                    body { background: #fff !important; }
                    aside, header, nav, .report-no-print { display: none !important; }
                    main { margin: 0 !important; padding: 0 !important; }
                    .report-print-area { box-shadow: none !important; border: 0 !important; }
                    .report-print-area table { font-size: 9px !important; }
                    .report-print-area tr { break-inside: avoid; }
                }
            `}</style>

            <div className="space-y-6">
                {/* ════ HEADER SECTION ════ */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="font-sans text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Pusat Laporan & Hasil
                        </h1>
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Rekapitulasi perolehan juara, skor pertandingan Embu & Randori, serta analisis penilaian wasit.
                        </p>
                    </div>

                    {/* Event Context Card / Event Switcher */}
                    <div className="report-no-print shrink-0 flex items-center gap-2.5">
                        {isEventMode ? (
                            <div className="inline-flex items-center gap-3 px-3.5 py-2 rounded-2xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                                <div className="size-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-[#b8860b] flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-900/30">
                                    <i className="fa-solid fa-trophy text-xs" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#b8860b] dark:text-[#f0c060]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span>Mode Event Aktif</span>
                                    </div>
                                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[220px] sm:max-w-xs" title={activeEvent?.name}>
                                        {activeEvent?.name}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full sm:w-72">
                                <div className="relative">
                                    <select
                                        aria-label="Pilih event untuk laporan"
                                        value={activeEvent.id}
                                        onChange={(e) => visitReport(dataset.key, e.target.value)}
                                        className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 pr-9 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 focus:border-[#d4a843] focus:outline-none focus:ring-2 focus:ring-[#d4a843]/20 cursor-pointer"
                                    >
                                        {events.map((event) => (
                                            <option key={event.id} value={event.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                                {event.name} {event.city ? `· ${event.city}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                                        <i className="fa-solid fa-chevron-down text-[10px]" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ════ ACTIVE REPORT SUBHEADER & ACTION BUTTONS ════ */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                                <i className="fa-solid fa-trophy text-[9px] text-[#b8860b]" />
                                {activeEvent?.name}
                            </span>
                        </div>
                        <h2 className="font-sans text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            {dataset.title}
                        </h2>
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {dataset.description}
                        </p>
                    </div>

                    <div className="report-no-print flex items-center gap-2.5 shrink-0 flex-wrap">
                        {eligibleDraftCount > 0 && (
                            <Button
                                variant="gold"
                                type="button"
                                disabled={Boolean(submittingScoreId)}
                                onClick={() => {
                                    setSubmissionError('');
                                    setScoreToSubmit({ submit_all: true });
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-transparent font-semibold text-xs md:text-sm shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
                            >
                                <i className="fa-solid fa-paper-plane text-xs" />
                                <span>Kirim Draft ({eligibleDraftCount})</span>
                            </Button>
                        )}

                        <a
                            href={beritaAcaraUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#1e1b18] hover:bg-[#2a2622] text-white font-semibold text-xs md:text-sm shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
                            title="Buka Berita Acara resmi format A4"
                        >
                            <i className="fa-solid fa-file-signature text-[#d4a843] text-xs" />
                            <span>Berita Acara (A4)</span>
                        </a>

                        <a
                            href={exportExcelUrl}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-transparent bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs md:text-sm shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
                            title="Export data laporan ke format spreadsheet Excel (.xlsx)"
                        >
                            <i className="fa-solid fa-file-excel text-xs" />
                            <span>Excel (.xlsx)</span>
                        </a>

                        <ActionMenuDropdown
                            label="Cetak & PDF"
                            theme="light"
                            size="md"
                            menuHeader="Pilihan Cetak & Ekspor PDF"
                            icon={<i className="fa-solid fa-print text-xs text-slate-600 dark:text-slate-300" />}
                            items={printAndExportItems}
                        />
                    </div>
                </div>

                {/* ════ 4 POLISHED STAT CARDS ════ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {dataset.summary.map((item, idx) => {
                        const metaList = [
                            { icon: 'fa-trophy', color: 'text-[#b8860b] bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/30' },
                            { icon: 'fa-circle-check', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/30' },
                            { icon: 'fa-medal', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/30' },
                            { icon: 'fa-flag', color: 'text-[#c0392b] bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/30' },
                        ];
                        const meta = metaList[idx % metaList.length];
                        const formatted = formatValue(item.value);
                        const isLongText = typeof formatted === 'string' && formatted.length > 10;
                        return (
                            <div
                                key={item.label}
                                className="p-4 sm:p-5 rounded-2xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        {item.label}
                                    </span>
                                    <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${meta.color}`}>
                                        <i className={`fa-solid ${meta.icon} text-xs`} />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <div className={`font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums ${isLongText ? 'text-lg leading-snug' : 'text-2xl'}`}>
                                        {formatted}
                                    </div>
                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] border border-slate-200 dark:border-slate-700">
                                            <i className="fa-solid fa-chart-simple text-[9px] text-[#c0392b]" />
                                            Data terverifikasi
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ════ TABLE CONTAINER & SEARCH BAR ════ */}
                <div className="report-print-area overflow-hidden rounded-2xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                    {submissionFeedback ? (
                        <div role="status" className="report-no-print border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2">
                            <i className="fa-solid fa-circle-check text-emerald-600 text-sm" />
                            <span>{submissionFeedback}</span>
                        </div>
                    ) : null}

                    {/* Table Filtering & Pagination Control Toolbar */}
                    <div className="report-no-print flex flex-col gap-3 border-b border-[#ede9e1] dark:border-slate-800 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900">
                        <div className="relative w-full sm:max-w-sm">
                            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder="Cari data atlet, nomor, kontingen, wasit..."
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-9 pr-8 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#c0392b] focus:outline-none focus:ring-2 focus:ring-[#c0392b]/20 transition-colors"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setCurrentPage(1);
                                    }}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                >
                                    <i className="fa-solid fa-circle-xmark" />
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <span className="font-semibold">Tampilkan:</span>
                                <select
                                    value={perPage}
                                    onChange={(e) => {
                                        setPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-[#c0392b] focus:outline-none cursor-pointer shadow-2xs"
                                >
                                    <option value={10}>10 baris</option>
                                    <option value={25}>25 baris</option>
                                    <option value={50}>50 baris</option>
                                    <option value={100}>100 baris</option>
                                    <option value="all">Semua baris</option>
                                </select>
                            </div>

                            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                                {totalFiltered > 0
                                    ? `Menampilkan ${startIndex}–${endIndex} dari ${totalFiltered} data`
                                    : '0 data'}
                                {dataset.rows.length > totalFiltered && (
                                    <span className="ml-1 text-[11px] font-normal text-amber-700 dark:text-amber-400">
                                        (filter dari total {dataset.rows.length})
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>

                    {filteredRows.length > 0 ? (
                        <>
                            <TableContainer className="custom-scrollbar" ariaLabel={`Tabel ${dataset.title}`}>
                                <table className="w-full min-w-max border-collapse text-left text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#ede9e1] dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                                            <th className="px-4 py-3 text-center">No.</th>
                                            {dataset.columns.map((column) => (
                                                <th key={column.key} className="px-4 py-3">
                                                    {column.key === 'champion_1' && <i className="fa-solid fa-medal mr-1.5 text-amber-500" />}
                                                    {column.key === 'champion_2' && <i className="fa-solid fa-medal mr-1.5 text-slate-400" />}
                                                    {(column.key === 'champion_3_a' || column.key === 'champion_3_b') && <i className="fa-solid fa-medal mr-1.5 text-amber-700" />}
                                                    {column.label}
                                                </th>
                                            ))}
                                            {hasDetailPrint && <th className="report-no-print px-4 py-3 text-center">Cetak</th>}
                                            {hasRefereeScoreAction && <th className="report-no-print px-4 py-3 text-center">Aksi</th>}
                                        </tr>
                                    </thead>

                                    {/* 1. SCREEN TBODY (Paginated for lightweight DOM) */}
                                    <tbody className="divide-y divide-[#ede9e1] dark:divide-slate-800 print:hidden">
                                        {paginatedRows.map((row, index) => {
                                            const rowNumber = isAll ? index + 1 : (safeCurrentPage - 1) * effectivePerPage + index + 1;
                                            return (
                                                <tr key={`${dataset.key}-${row.score_id || row.id || index}`} className="align-top hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="px-4 py-3.5 text-center font-bold text-slate-500 dark:text-slate-400 tabular-nums">{rowNumber}</td>
                                                    {dataset.columns.map((column) => (
                                                        <td
                                                            key={column.key}
                                                            className={`px-4 py-3.5 leading-5 text-slate-700 dark:text-slate-200 ${['champion_1', 'champion_2', 'champion_3_a', 'champion_3_b'].includes(column.key)
                                                                ? 'min-w-[170px]'
                                                                : 'max-w-sm'
                                                                }`}
                                                        >
                                                            {renderCell(row, column)}
                                                        </td>
                                                    ))}
                                                    {hasDetailPrint && (
                                                        <td className="report-no-print px-4 py-3.5 text-center">
                                                            {row.print_url ? (
                                                                <a
                                                                    href={row.print_url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    aria-label={`Cetak detail ${row.match ?? row.category ?? `baris ${rowNumber}`}`}
                                                                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
                                                                >
                                                                    <i className="fa-solid fa-print text-[11px]" aria-hidden="true" />
                                                                    <span>Detail</span>
                                                                </a>
                                                            ) : <span className="text-slate-400 font-medium">-</span>}
                                                        </td>
                                                    )}
                                                    {hasRefereeScoreAction && (
                                                        <td className="report-no-print px-4 py-3.5 text-center">
                                                            {row.status_value === 'submitted' ? (
                                                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                                                    <i className="fa-solid fa-circle-check text-xs" aria-hidden="true" />
                                                                    <span>Sudah Dikirim</span>
                                                                </span>
                                                            ) : row.can_submit ? (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled={Boolean(submittingScoreId)}
                                                                    onClick={() => {
                                                                        setSubmissionError('');
                                                                        setScoreToSubmit(row);
                                                                    }}
                                                                    className="whitespace-nowrap border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/40 text-xs font-semibold"
                                                                >
                                                                    <i className="fa-solid fa-paper-plane mr-1.5 text-xs" aria-hidden="true" />
                                                                    <span>Kirim Nilai</span>
                                                                </Button>
                                                            ) : (
                                                                <span className="inline-block max-w-36 text-[11px] font-medium leading-4 text-amber-700 dark:text-amber-300">
                                                                    Lengkapi 10 aspek nilai
                                                                </span>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>

                                    {/* 2. PRINT TBODY (Full filtered rows for complete printer output) */}
                                    <tbody className="divide-y divide-[#ede9e1] dark:divide-slate-800 hidden print:table-row-group">
                                        {filteredRows.map((row, index) => (
                                            <tr key={`print-${dataset.key}-${row.score_id || row.id || index}`} className="align-top odd:bg-white even:bg-slate-50/50">
                                                <td className="px-4 py-3 text-center font-bold text-slate-700">{index + 1}</td>
                                                {dataset.columns.map((column) => (
                                                    <td
                                                        key={column.key}
                                                        className={`px-4 py-3 leading-5 text-slate-700 ${['champion_1', 'champion_2', 'champion_3_a', 'champion_3_b'].includes(column.key)
                                                            ? 'min-w-[170px]'
                                                            : 'max-w-sm'
                                                            }`}
                                                    >
                                                        {renderCell(row, column)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </TableContainer>

                            {/* Standard Responsive Pagination */}
                            {!isAll && totalFiltered > 0 && (
                                <div className="report-no-print border-t border-[#ede9e1] dark:border-slate-800">
                                    <Pagination
                                        currentPage={safeCurrentPage}
                                        totalPages={totalPages}
                                        total={totalFiltered}
                                        from={startIndex}
                                        to={endIndex}
                                        onPageChange={(page) => setCurrentPage(page)}
                                        label="data"
                                        variant="footer"
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="p-12 text-center">
                            <div className="size-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-[#b8860b] flex items-center justify-center mx-auto mb-3 border border-amber-200 dark:border-amber-900/30 text-xl">
                                <i className={`fa-solid ${dataset.icon}`} aria-hidden="true" />
                            </div>
                            <h3 className="font-sans text-base font-bold text-slate-900 dark:text-white">
                                {searchTerm ? 'Data Tidak Ditemukan' : 'Belum Ada Data untuk Laporan Ini'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                                {searchTerm
                                    ? `Tidak ada hasil yang sesuai dengan kata kunci "${searchTerm}". Silakan periksa kembali kata kunci pencarian.`
                                    : 'Data laporan akan muncul secara otomatis setelah pertandingan dan penilaian tersimpan di sistem.'}
                            </p>
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer shadow-2xs"
                                >
                                    <i className="fa-solid fa-circle-xmark text-slate-400" />
                                    <span>Bersihkan Pencarian</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <AlertConfirm
                isOpen={Boolean(scoreToSubmit)}
                title={scoreToSubmit?.submit_all ? 'Kirim semua draft lengkap?' : 'Simpan sebagai Sudah Dikirim?'}
                message={scoreToSubmit?.submit_all
                    ? `${eligibleDraftCount} draft dengan 10 aspek lengkap akan disimpan sekaligus sebagai Sudah Dikirim. TTD tetap opsional dan draft yang belum lengkap tidak akan diubah.`
                    : `${scoreToSubmit?.referee || 'Penilaian Wasit'} · ${scoreToSubmit?.category || 'Nomor pertandingan'}. Status draft akan menjadi nilai resmi yang dikirim ke Panitera.`}
                confirmText={scoreToSubmit?.submit_all ? 'Ya, Kirim Semua' : 'Ya, Simpan & Kirim'}
                variant="primary"
                error={submissionError}
                isLoading={Boolean(submittingScoreId)}
                onConfirm={submitRefereeScore}
                onCancel={() => {
                    if (!submittingScoreId) {
                        setScoreToSubmit(null);
                        setSubmissionError('');
                    }
                }}
            />
        </AdminLayout>
    );
}
