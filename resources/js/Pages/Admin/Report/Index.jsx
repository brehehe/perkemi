import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import Combobox from '@/Components/UI/Forms/Combobox';
import { Button } from '@/Components/UI';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';

const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

export default function ReportIndex({ activeEvent, events = [], reportOptions = [], dataset }) {
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

    const exportUrl = `/admin/laporan/export?event_id=${encodeURIComponent(activeEvent.id)}&report=${encodeURIComponent(dataset.key)}`;
    const hasDetailPrint = dataset.rows.some((row) => Boolean(row.print_url));

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
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
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
                                        <span className="text-sm font-extrabold text-[#17120f] dark:text-slate-100">{report.title}</span>
                                    </span>
                                    <span className="mt-2 block text-xs leading-5 text-[#7a746e] dark:text-slate-300">{report.description}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="report-print-area overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm dark:border-slate-700 dark:bg-[#171a20]">
                    <div className="border-b border-[#e9e2d8] bg-[#faf8f5] p-4 dark:border-slate-700 dark:bg-[#1e222a] sm:p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a77420]">{activeEvent.name}</p>
                                <h2 className="mt-1 text-xl font-extrabold text-[#17120f] dark:text-slate-100">{dataset.title}</h2>
                                <p className="mt-1 max-w-3xl text-sm leading-6 text-[#756e67] dark:text-slate-300">{dataset.description}</p>
                            </div>
                            <div className="report-no-print flex flex-col gap-2 sm:flex-row">
                                <a
                                    href={`/admin/laporan/berita-acara?event_id=${encodeURIComponent(activeEvent.id)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#17120f] px-4 text-sm font-bold text-white transition hover:bg-[#2b241e] border border-white/20 shadow-xs"
                                >
                                    <i className="fa-solid fa-file-signature text-[#d4a843]" aria-hidden="true" />Berita Acara (A4)
                                </a>
                                <a href={exportUrl} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 shadow-xs">
                                    <i className="fa-solid fa-file-excel" aria-hidden="true" />Export Excel
                                </a>
                                <Button type="button" variant="dark" onClick={() => window.print()} className="min-h-11 dark:border dark:border-slate-600 dark:bg-slate-950 dark:hover:bg-slate-800">
                                    <i className="fa-solid fa-print mr-2" aria-hidden="true" />Cetak / Simpan PDF
                                </Button>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {dataset.summary.map((item) => (
                                <div key={item.label} className="rounded-xl border border-[#e8e0d6] bg-white px-4 py-3 dark:border-slate-600 dark:bg-[#171a20]">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8b837b] dark:text-slate-300">{item.label}</p>
                                    <p className="mt-1 text-2xl font-black text-[#17120f] dark:text-white">{formatValue(item.value)}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {dataset.rows.length > 0 ? (
                        <TableContainer className="custom-scrollbar" ariaLabel={`Tabel ${dataset.title}`}>
                            <table className="w-full min-w-max border-collapse text-left text-xs">
                                <thead>
                                    <tr className="border-b border-[#e7dfd5] bg-[#17120f] text-white dark:border-slate-600 dark:bg-slate-950">
                                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider">No.</th>
                                        {dataset.columns.map((column) => <th key={column.key} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">{column.label}</th>)}
                                        {hasDetailPrint && <th className="report-no-print px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider">Cetak</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#eee8e0] dark:divide-slate-700">
                                    {dataset.rows.map((row, index) => (
                                        <tr key={`${dataset.key}-${index}`} className="align-top odd:bg-white even:bg-[#fcfbf9] hover:bg-amber-50/50 dark:odd:bg-[#171a20] dark:even:bg-[#1b1f26] dark:hover:bg-[#272d36]">
                                            <td className="px-4 py-3 text-center font-bold text-[#9a7128] dark:text-amber-300">{index + 1}</td>
                                            {dataset.columns.map((column) => <td key={column.key} className="max-w-sm px-4 py-3 leading-5 text-[#403a35] dark:text-slate-200">{formatValue(row[column.key])}</td>)}
                                            {hasDetailPrint && (
                                                <td className="report-no-print px-4 py-3 text-center">
                                                    {row.print_url ? (
                                                        <a
                                                            href={row.print_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            aria-label={`Cetak detail ${row.match ?? row.category ?? `baris ${index + 1}`}`}
                                                            className="inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#d8c7a8] bg-[#fff8e8] px-3 text-xs font-bold text-[#805b16] transition hover:border-[#c79b43] hover:bg-[#ffefc8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a843] dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
                                                        >
                                                            <i className="fa-solid fa-print" aria-hidden="true" />
                                                            Detail
                                                        </a>
                                                    ) : <span className="text-[#9a938c] dark:text-slate-500">-</span>}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TableContainer>
                    ) : (
                        <div className="px-5 py-16 text-center">
                            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4efe7] text-xl text-[#b8872d] dark:bg-amber-500/15 dark:text-amber-300"><i className={`fa-solid ${dataset.icon}`} aria-hidden="true" /></span>
                            <h3 className="mt-4 font-bold text-[#17120f] dark:text-slate-100">Belum ada data untuk laporan ini</h3>
                            <p className="mt-1 text-sm text-[#7a746e] dark:text-slate-300">Data akan muncul setelah proses pertandingan dan pengesahan tersimpan.</p>
                        </div>
                    )}
                </section>
            </div>
        </AdminLayout>
    );
}
