import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import AlertConfirm from '@/Components/UI/Feedback/AlertConfirm';
import Combobox from '@/Components/UI/Forms/Combobox';
import { Button } from '@/Components/UI';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
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
        return <span className="text-[#9a938c] dark:text-slate-500 font-medium">-</span>;
    }

    if (typeof value === 'object' && value !== null) {
        if ('athlete_label' in value) {
            return (
                <div className="space-y-0.5 min-w-[170px]">
                    <p className="font-extrabold text-[#17120f] dark:text-white leading-snug">
                        {value.athlete_label || '-'}
                    </p>
                    {value.contingent ? (
                        <p className="text-[11px] font-semibold text-[#8b837b] dark:text-slate-400">
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
            <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                isEmbu
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300'
                    : 'bg-red-100 text-red-900 dark:bg-red-950/70 dark:text-red-300'
            }`}>
                <i className={`fa-solid ${isEmbu ? 'fa-ranking-star' : 'fa-hand-fist'} text-[9px]`} />
                {value}
            </span>
        );
    }

    if (column.key === 'classification') {
        const isExhibition = String(value).toLowerCase().includes('ekshibisi') && !String(value).toLowerCase().includes('non');
        return (
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                isExhibition
                    ? 'bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-300'
                    : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
            }`}>
                {value}
            </span>
        );
    }

    if (column.key === 'confirmed_at') {
        if (value === 'Belum Dikonfirmasi' || value === '-') {
            return <span className="text-[11px] font-medium text-[#9a938c] dark:text-slate-500">Belum Dikonfirmasi</span>;
        }
        return (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#3d3630] dark:text-slate-300">
                <i className="fa-solid fa-circle-check text-emerald-600 text-[10px]" />
                {value}
            </span>
        );
    }

    if (column.key === 'category') {
        return <span className="font-bold text-[#17120f] dark:text-slate-100">{value}</span>;
    }

    if (column.key === 'status' && row.status_value) {
        const isSubmitted = row.status_value === 'submitted';

        return (
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                isSubmitted
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
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
    const [submittingScoreId, setSubmittingScoreId] = useState(null);
    const [scoreToSubmit, setScoreToSubmit] = useState(null);
    const [submissionError, setSubmissionError] = useState('');
    const [submissionFeedback, setSubmissionFeedback] = useState('');

    // Pagination & Search States
    const [searchTerm, setSearchTerm] = useState('');
    const [perPage, setPerPage] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);

    // Reset pagination and search on report switch
    useEffect(() => {
        setCurrentPage(1);
        setSearchTerm('');
    }, [dataset.key]);

    const eventOptions = events.map((event) => ({
        value: event.id,
        label: event.name,
        sublabel: [event.city, event.start_date].filter(Boolean).join(' · '),
    }));

    const visitReport = (report, eventId = activeEvent?.id) => {
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

            <div className="space-y-5">
                <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(120deg,#17120f_0%,#211b16_64%,#3a1b15_100%)] p-5 text-white shadow-xl sm:p-6 report-print-area">
                    <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#d4a843]/15 blur-3xl" />
                    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#d4a843]"><i className="fa-solid fa-file-lines mr-2" aria-hidden="true" />Laporan resmi per event</p>
                            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Pusat Laporan & Hasil</h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Satu tempat untuk hasil juara, skor pertandingan, rekap Embu/Randori, dan analisis penilaian Wasit.</p>
                        </div>
                        <div className="w-full lg:max-w-md report-no-print">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/55">Event dipilih</p>
                            <Combobox
                                ariaLabel="Pilih event laporan"
                                options={eventOptions}
                                value={activeEvent.id}
                                onChange={(eventId) => visitReport(dataset.key, eventId)}
                                clearable={false}
                                className="min-h-12 border-white/20"
                            />
                        </div>
                    </div>
                </section>

                <section className="report-no-print rounded-2xl border border-[#e5ded4] bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-[#171a20] sm:p-4">
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                        {reportOptions.map((report) => {
                            const isActive = report.value === dataset.key;
                            return (
                                <button
                                    key={report.value}
                                    type="button"
                                    aria-pressed={isActive}
                                    onClick={() => visitReport(report.value)}
                                    className={`min-h-20 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a843] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#171a20] ${isActive ? 'border-[#d4a843] bg-[#fff8e8] shadow-sm ring-1 ring-[#d4a843]/20 dark:border-[#d4a843]/80 dark:bg-[#332a18] dark:ring-[#d4a843]/30' : 'border-[#e8e1d8] bg-[#fbfaf8] hover:border-[#d7c7ad] hover:bg-white dark:border-slate-700 dark:bg-[#1e222a] dark:hover:border-slate-500 dark:hover:bg-[#252a33]'}`}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isActive ? 'bg-[#d4a843] !text-[#17120f]' : 'bg-[#efeae3] text-[#756c63] dark:bg-slate-700 dark:text-slate-100'}`}><i className={`fa-solid ${report.icon}`} aria-hidden="true" /></span>
                                        <span className="text-xs font-extrabold text-[#17120f] dark:text-slate-100 leading-tight">{report.title}</span>
                                    </span>
                                    <span className="mt-1.5 block line-clamp-2 text-[11px] leading-4 text-[#7a746e] dark:text-slate-300">{report.description}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="report-print-area overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm dark:border-slate-700 dark:bg-[#171a20]">
                    <div className="border-b border-[#e9e2d8] bg-[#faf8f5] p-4 dark:border-slate-700 dark:bg-[#1e222a] sm:p-5">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a77420]">{activeEvent.name}</p>
                                <h2 className="mt-1 text-xl font-extrabold text-[#17120f] dark:text-slate-100">{dataset.title}</h2>
                                <p className="mt-1 max-w-3xl text-sm leading-6 text-[#756e67] dark:text-slate-300">{dataset.description}</p>
                            </div>
                            <div className="report-no-print flex flex-wrap items-center gap-2">
                                {eligibleDraftCount > 0 ? (
                                    <Button
                                        type="button"
                                        variant="gold"
                                        disabled={Boolean(submittingScoreId)}
                                        onClick={() => {
                                            setSubmissionError('');
                                            setScoreToSubmit({ submit_all: true });
                                        }}
                                        className="min-h-10 whitespace-nowrap text-xs font-bold"
                                    >
                                        <i className="fa-solid fa-paper-plane mr-2" aria-hidden="true" />
                                        Kirim Draft ({eligibleDraftCount})
                                    </Button>
                                ) : null}

                                <a
                                    href={beritaAcaraUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#17120f] px-3.5 text-xs font-bold text-white transition hover:bg-[#2b241e] border border-white/20 shadow-xs"
                                >
                                    <i className="fa-solid fa-file-signature text-[#d4a843]" aria-hidden="true" />Berita Acara (A4)
                                </a>

                                <a
                                    href={exportExcelUrl}
                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3.5 text-xs font-bold text-white transition hover:bg-emerald-800 shadow-xs"
                                    title="Export file Excel (.xlsx)"
                                >
                                    <i className="fa-solid fa-file-excel" aria-hidden="true" />Excel (.xlsx)
                                </a>

                                <a
                                    href={exportPdfUrl}
                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-rose-700 px-3.5 text-xs font-bold text-white transition hover:bg-rose-800 shadow-xs"
                                    title="Download dokumen resmi PDF (.pdf)"
                                >
                                    <i className="fa-solid fa-file-pdf" aria-hidden="true" />Unduh PDF
                                </a>

                                <a
                                    href={previewPdfUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#d6cdbf] bg-white px-3 text-xs font-bold text-[#3d3630] transition hover:bg-[#f7f4ef] shadow-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                                    title="Pratinjau PDF di browser"
                                >
                                    <i className="fa-solid fa-arrow-up-right-from-square text-[#8a631c]" aria-hidden="true" />Preview PDF
                                </a>

                                <Button
                                    type="button"
                                    variant="dark"
                                    size="sm"
                                    onClick={() => window.print()}
                                    className="min-h-10 text-xs dark:border dark:border-slate-600 dark:bg-slate-950 dark:hover:bg-slate-800"
                                >
                                    <i className="fa-solid fa-print mr-1.5" aria-hidden="true" />Cetak Layar
                                </Button>
                            </div>
                        </div>

                        {/* KPI Summary Boxes */}
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {dataset.summary.map((item) => (
                                <div key={item.label} className="rounded-xl border border-[#e8e0d6] bg-white px-4 py-3 dark:border-slate-600 dark:bg-[#171a20]">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8b837b] dark:text-slate-300">{item.label}</p>
                                    <p className="mt-1 text-2xl font-black text-[#17120f] dark:text-white">{formatValue(item.value)}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {submissionFeedback ? (
                        <div role="status" className="report-no-print border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <i className="fa-solid fa-circle-check mr-2" aria-hidden="true" />
                            {submissionFeedback}
                        </div>
                    ) : null}

                    {/* Table Filtering & Pagination Control Toolbar */}
                    <div className="report-no-print flex flex-col gap-3 border-b border-[#eee8e0] bg-[#fdfcfa] px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-[#171a20]">
                        <div className="relative flex-1 max-w-md">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#9c9389] dark:text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder="Cari data atlet, nomor, kontingen, wasit..."
                                className="w-full rounded-xl border border-[#d9d0c5] bg-white py-2 pl-9 pr-8 text-xs font-medium text-[#201a16] transition-colors focus:border-[#b17c13] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setCurrentPage(1);
                                    }}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <i className="fa-solid fa-circle-xmark" />
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 text-xs text-[#6e665d] dark:text-slate-400">
                                <span className="font-semibold">Tampilkan:</span>
                                <select
                                    value={perPage}
                                    onChange={(e) => {
                                        setPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="rounded-lg border border-[#d9d0c5] bg-white px-2.5 py-1 text-xs font-bold text-[#17120f] focus:border-[#b17c13] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                                >
                                    <option value={10}>10 baris</option>
                                    <option value={25}>25 baris</option>
                                    <option value={50}>50 baris</option>
                                    <option value={100}>100 baris</option>
                                    <option value="all">Semua baris</option>
                                </select>
                            </div>

                            <span className="text-xs font-bold text-[#8a7f73] dark:text-slate-400">
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
                                        <tr className="border-b border-[#e7dfd5] bg-[#17120f] text-white dark:border-slate-600 dark:bg-slate-950">
                                            <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider">No.</th>
                                            {dataset.columns.map((column) => (
                                                <th key={column.key} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">
                                                    {column.key === 'champion_1' && <i className="fa-solid fa-medal mr-1.5 text-yellow-400" />}
                                                    {column.key === 'champion_2' && <i className="fa-solid fa-medal mr-1.5 text-slate-300" />}
                                                    {(column.key === 'champion_3_a' || column.key === 'champion_3_b') && <i className="fa-solid fa-medal mr-1.5 text-amber-500" />}
                                                    {column.label}
                                                </th>
                                            ))}
                                            {hasDetailPrint && <th className="report-no-print px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider">Cetak</th>}
                                            {hasRefereeScoreAction && <th className="report-no-print px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider">Aksi</th>}
                                        </tr>
                                    </thead>

                                    {/* 1. SCREEN TBODY (Paginated for lightweight DOM) */}
                                    <tbody className="divide-y divide-[#eee8e0] dark:divide-slate-700 print:hidden">
                                        {paginatedRows.map((row, index) => {
                                            const rowNumber = isAll ? index + 1 : (safeCurrentPage - 1) * effectivePerPage + index + 1;
                                            return (
                                                <tr key={`${dataset.key}-${row.score_id || row.id || index}`} className="align-top odd:bg-white even:bg-[#fcfbf9] hover:bg-amber-50/50 dark:odd:bg-[#171a20] dark:even:bg-[#1b1f26] dark:hover:bg-[#272d36]">
                                                    <td className="px-4 py-3 text-center font-bold text-[#9a7128] dark:text-amber-300">{rowNumber}</td>
                                                    {dataset.columns.map((column) => (
                                                        <td
                                                            key={column.key}
                                                            className={`px-4 py-3 leading-5 text-[#403a35] dark:text-slate-200 ${
                                                                ['champion_1', 'champion_2', 'champion_3_a', 'champion_3_b'].includes(column.key)
                                                                    ? 'min-w-[170px]'
                                                                    : 'max-w-sm'
                                                            }`}
                                                        >
                                                            {renderCell(row, column)}
                                                        </td>
                                                    ))}
                                                    {hasDetailPrint && (
                                                        <td className="report-no-print px-4 py-3 text-center">
                                                            {row.print_url ? (
                                                                <a
                                                                    href={row.print_url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    aria-label={`Cetak detail ${row.match ?? row.category ?? `baris ${rowNumber}`}`}
                                                                    className="inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#d8c7a8] bg-[#fff8e8] px-3 text-xs font-bold text-[#805b16] transition hover:border-[#c79b43] hover:bg-[#ffefc8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a843] dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
                                                                >
                                                                    <i className="fa-solid fa-print" aria-hidden="true" />
                                                                    Detail
                                                                </a>
                                                            ) : <span className="text-[#9a938c] dark:text-slate-500">-</span>}
                                                        </td>
                                                    )}
                                                    {hasRefereeScoreAction && (
                                                        <td className="report-no-print px-4 py-3 text-center">
                                                            {row.status_value === 'submitted' ? (
                                                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                                                    <i className="fa-solid fa-circle-check" aria-hidden="true" />Sudah Dikirim
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
                                                                    className="whitespace-nowrap border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                                                                >
                                                                    <i className="fa-solid fa-paper-plane mr-2" aria-hidden="true" />Simpan ke Sudah Dikirim
                                                                </Button>
                                                            ) : (
                                                                <span className="inline-block max-w-36 text-[11px] font-semibold leading-4 text-amber-700 dark:text-amber-300">
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
                                    <tbody className="divide-y divide-[#eee8e0] dark:divide-slate-700 hidden print:table-row-group">
                                        {filteredRows.map((row, index) => (
                                            <tr key={`print-${dataset.key}-${row.score_id || row.id || index}`} className="align-top odd:bg-white even:bg-[#fcfbf9]">
                                                <td className="px-4 py-3 text-center font-bold text-[#9a7128]">{index + 1}</td>
                                                {dataset.columns.map((column) => (
                                                    <td
                                                        key={column.key}
                                                        className={`px-4 py-3 leading-5 text-[#403a35] ${
                                                            ['champion_1', 'champion_2', 'champion_3_a', 'champion_3_b'].includes(column.key)
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

                            {/* Pagination Controls Bar */}
                            {!isAll && totalPages > 1 && (
                                <div className="report-no-print flex flex-col gap-3 border-t border-[#eee8e0] bg-[#fbfaf8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-[#171a20]">
                                    <p className="text-xs text-[#7e756b] dark:text-slate-400">
                                        Halaman <strong className="text-[#17120f] dark:text-white">{safeCurrentPage}</strong> dari <strong className="text-[#17120f] dark:text-white">{totalPages}</strong> ({totalFiltered} data)
                                    </p>

                                    <div className="flex flex-wrap items-center gap-1">
                                        <button
                                            type="button"
                                            disabled={safeCurrentPage <= 1}
                                            onClick={() => setCurrentPage(1)}
                                            className="rounded-lg border border-[#dcd4c8] bg-white px-2.5 py-1 text-xs font-bold text-[#3d3630] transition hover:bg-[#eee8e0] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                                            title="Halaman Pertama"
                                        >
                                            <i className="fa-solid fa-angles-left" />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={safeCurrentPage <= 1}
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            className="rounded-lg border border-[#dcd4c8] bg-white px-3 py-1 text-xs font-bold text-[#3d3630] transition hover:bg-[#eee8e0] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                                        >
                                            <i className="fa-solid fa-chevron-left mr-1" />
                                            Sebelumnya
                                        </button>

                                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                                            .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 2)
                                            .reduce((acc, p, idx, arr) => {
                                                if (idx > 0 && p - arr[idx - 1] > 1) {
                                                    acc.push('ellipsis-' + p);
                                                }
                                                acc.push(p);
                                                return acc;
                                            }, [])
                                            .map((item) => {
                                                if (typeof item === 'string') {
                                                    return (
                                                        <span key={item} className="px-2 text-xs font-bold text-slate-400">
                                                            ...
                                                        </span>
                                                    );
                                                }
                                                const isActive = item === safeCurrentPage;
                                                return (
                                                    <button
                                                        key={item}
                                                        type="button"
                                                        onClick={() => setCurrentPage(item)}
                                                        className={`min-w-8 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                                                            isActive
                                                                ? 'bg-[#17120f] text-white shadow dark:bg-amber-500 dark:text-slate-950'
                                                                : 'border border-[#dcd4c8] bg-white text-[#3d3630] hover:bg-[#eee8e0] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
                                                        }`}
                                                    >
                                                        {item}
                                                    </button>
                                                );
                                            })}

                                        <button
                                            type="button"
                                            disabled={safeCurrentPage >= totalPages}
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            className="rounded-lg border border-[#dcd4c8] bg-white px-3 py-1 text-xs font-bold text-[#3d3630] transition hover:bg-[#eee8e0] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                                        >
                                            Selanjutnya
                                            <i className="fa-solid fa-chevron-right ml-1" />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={safeCurrentPage >= totalPages}
                                            onClick={() => setCurrentPage(totalPages)}
                                            className="rounded-lg border border-[#dcd4c8] bg-white px-2.5 py-1 text-xs font-bold text-[#3d3630] transition hover:bg-[#eee8e0] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                                            title="Halaman Terakhir"
                                        >
                                            <i className="fa-solid fa-angles-right" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="px-5 py-16 text-center">
                            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4efe7] text-xl text-[#b8872d] dark:bg-amber-500/15 dark:text-amber-300"><i className={`fa-solid ${dataset.icon}`} aria-hidden="true" /></span>
                            <h3 className="mt-4 font-bold text-[#17120f] dark:text-slate-100">
                                {searchTerm ? 'Data Tidak Ditemukan' : 'Belum ada data untuk laporan ini'}
                            </h3>
                            <p className="mt-1 text-sm text-[#7a746e] dark:text-slate-300">
                                {searchTerm
                                    ? `Tidak ada hasil yang sesuai dengan kata kunci "${searchTerm}". Silakan periksa kembali pencarian.`
                                    : 'Data akan muncul setelah proses pertandingan dan pengesahan tersimpan.'}
                            </p>
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="mt-3 text-xs font-bold text-[#b17c13] hover:underline dark:text-amber-400"
                                >
                                    Bersihkan Pencarian
                                </button>
                            )}
                        </div>
                    )}
                </section>
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
