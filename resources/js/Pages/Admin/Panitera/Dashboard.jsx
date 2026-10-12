import Badge from '@/Components/UI/Elements/Badge';
import Button from '@/Components/UI/Elements/Button';
import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessage from './Partials/FlashMessage';
import PaniteraHeader from './Partials/PaniteraHeader';
import { CourtMonitorButtons } from './Partials/CourtMonitorLinks';
import { Head, Link, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const statCards = [
    ['total_matches', 'Total Partai', 'fa-list-ol', 'blue'],
    ['completed_matches', 'Partai Selesai', 'fa-circle-check', 'green'],
    ['embu_scored', 'Nilai Embu', 'fa-ranking-star', 'gold'],
    ['randori_scored', 'Hasil Randori', 'fa-hand-fist', 'red'],
];

const statusVariants = {
    pending: 'gray',
    ready: 'yellow',
    in_progress: 'purple',
    completed: 'green',
};

function MatchTable({ matches, activeEvent, type }) {
    return (
        <TableContainer ariaLabel={`Daftar pertandingan ${type === 'embu' ? 'Embu' : 'Randori'} Panitera`}>
            <table className="responsive-data-table responsive-data-table--cards min-w-full text-left text-xs">
                <thead className="bg-[#f7f4ef] text-[10px] uppercase tracking-wide text-[#7a746e]">
                    <tr>
                        <th className="px-4 py-3">Jadwal</th>
                        <th className="px-4 py-3">Nomor Pertandingan</th>
                        <th className="px-4 py-3">Peserta</th>
                        <th className="px-4 py-3">Alur Panitera</th>
                        <th className="px-4 py-3 text-right">Detail</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#ede9e1]">
                    {matches.map((match) => (
                        <tr key={match.id} className={match.status === 'in_progress' ? 'bg-purple-50/50' : ''}>
                            <td data-label="Jadwal" className="min-w-44 px-4 py-3 align-top">
                                <p className="font-bold text-[#17120f]">{match.scheduled_at || 'Belum dijadwalkan'}</p>
                                <p className="mt-1 text-[#7a746e]">{match.court}</p>
                            </td>
                            <td data-label="Nomor pertandingan" className="min-w-64 px-4 py-3 align-top">
                                <div className="flex items-start gap-2">
                                    <Badge variant={type === 'embu' ? 'blue' : 'red'} size="sm">{type.toUpperCase()}</Badge>
                                    <div>
                                        <p className="font-bold text-[#17120f]">{match.category_name}</p>
                                        <p className="mt-1 text-[#7a746e]">Partai #{match.sequence} · {match.round_label}</p>
                                    </div>
                                </div>
                            </td>
                            <td data-label="Peserta" className="min-w-60 px-4 py-3 align-top text-[#5f574f]">{match.participant || 'Peserta belum ditentukan'}</td>
                            <td data-label="Alur Panitera" className="min-w-48 px-4 py-3 align-top">
                                <div className="flex flex-wrap gap-1.5">
                                    <Badge variant={statusVariants[match.status] || 'gray'}>{match.status_label}</Badge>
                                    <Badge variant={match.call_status === 'waiting' ? 'gray' : 'gold'}>{match.call_status_label}</Badge>
                                </div>
                            </td>
                            <td data-label="Aksi" className="whitespace-nowrap px-4 py-3 text-right align-top">
                                {match.is_placeholder ? (
                                    <span className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] font-semibold text-slate-500 sm:min-h-9">Menunggu lawan</span>
                                ) : (
                                    <Link
                                        href={`/admin/panitera/scoring/matches/${match.id}?event_id=${encodeURIComponent(activeEvent.id)}`}
                                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#c0392b] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#a82718] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c0392b] sm:min-h-9"
                                    >
                                        <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                                        Buka Detail
                                    </Link>
                                )}
                            </td>
                        </tr>
                    ))}
                    {matches.length === 0 && (
                        <tr>
                            <td colSpan="5" className="px-4 py-12 text-center text-[#7a746e]">Tidak ada pertandingan pada daftar ini.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </TableContainer>
    );
}

export default function PaniteraDashboard({ activeEvent, events = [], stats = {}, courts = [], embuMatches = [], randoriMatches = [] }) {
    const { flash = {} } = usePage().props;
    const [activeType, setActiveType] = useState(embuMatches.length > 0 || randoriMatches.length === 0 ? 'embu' : 'randori');
    const [activeCourtId, setActiveCourtId] = useState('all');
    const [search, setSearch] = useState('');
    const eventQuery = `?event_id=${encodeURIComponent(activeEvent.id)}`;
    const visibleMatches = useMemo(() => {
        const matches = (activeType === 'embu' ? embuMatches : randoriMatches)
            .filter((match) => activeCourtId === 'all' || match.court_id === activeCourtId);
        const keyword = search.trim().toLocaleLowerCase('id-ID');

        if (!keyword) return matches;

        return matches.filter((match) => [
            match.category_name,
            match.round_label,
            match.participant,
            match.court,
            match.status_label,
        ].filter(Boolean).some((value) => value.toLocaleLowerCase('id-ID').includes(keyword)));
    }, [activeCourtId, activeType, embuMatches, randoriMatches, search]);

    return (
        <AdminLayout title="Pusat Kendali Panitera">
            <Head title="Pusat Kendali Panitera | Smart Perkemi" />

            <div className="space-y-5">
                <PaniteraHeader
                    title="Pusat Kendali Panitera"
                    description="Pilih daftar Embu atau Randori, buka satu partai, lalu jalankan pemanggilan dan penilaian tanpa keluar dari konteks event."
                    activeEvent={activeEvent}
                    events={events}
                    path="/admin/panitera/scoring"
                />
                <FlashMessage flash={flash} />

                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan Panitera">
                    {statCards.map(([key, label, icon, variant]) => (
                        <article key={key} className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-bold uppercase tracking-wide text-[#7a746e]">{label}</span>
                                <Badge variant={variant}><i className={`fa-solid ${icon}`} aria-hidden="true" /></Badge>
                            </div>
                            <p className="mt-3 text-3xl font-black tracking-tight text-[#17120f]">{stats[key] || 0}</p>
                        </article>
                    ))}
                </section>

                <section className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm" aria-labelledby="panitera-flow-title">
                    <div>
                        <h2 id="panitera-flow-title" className="text-base font-bold text-[#17120f]">Flow Satu Partai per Court</h2>
                        <p className="mt-0.5 text-xs text-[#7a746e]">Saat partai baru dipanggil, partai aktif sebelumnya pada court yang sama otomatis dilepas dari meja Panitera.</p>
                    </div>
                    <ol className="mt-4 grid gap-3 md:grid-cols-4">
                        {[
                            ['1', 'Buka Detail', 'Pilih tepat satu partai dari tabel Embu atau Randori.', 'fa-table-list'],
                            ['2', 'Panggil Ofisial', 'Pastikan wasit, Panitera, dan koordinator siap di court.', 'fa-bullhorn'],
                            ['3', 'Panggil Peserta', 'Panggil atlet atau tim yang tampil pada partai tersebut.', 'fa-users'],
                            ['4', 'Tanding & Nilai', 'Jalankan timer lalu buka input hasil sesuai jenis pertandingan.', 'fa-stopwatch'],
                        ].map(([number, label, description, icon]) => (
                            <li key={number} className="relative rounded-xl border border-[#ede9e1] bg-[#fbfaf8] p-3">
                                <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#c0392b] text-xs font-black text-white">{number}</span><i className={`fa-solid ${icon} text-[#d4a843]`} aria-hidden="true" /></div>
                                <h3 className="mt-3 text-sm font-bold">{label}</h3>
                                <p className="mt-1 text-xs leading-relaxed text-[#7a746e]">{description}</p>
                            </li>
                        ))}
                    </ol>
                </section>

                <section className="space-y-5" aria-label="Daftar pertandingan dan penugasan meja">
                    <div className="w-full overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm">
                        <div className="border-b border-[#ede9e1] p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <h2 className="text-base font-bold text-[#17120f]">Daftar Pertandingan</h2>
                                    <p className="mt-0.5 text-xs text-[#7a746e]">Embu dan Randori dipisahkan agar pemanggilan meja tidak tertukar.</p>
                                </div>
                                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                                    <Link href={`/admin/panitera/scoring/embu-result${eventQuery}`} className="min-w-0"><Button size="sm" variant="outline" className="w-full">Rekap Embu</Button></Link>
                                    <Link href={`/admin/panitera/scoring/randori-result${eventQuery}`} className="min-w-0"><Button size="sm" variant="outline" className="w-full">Hasil Randori</Button></Link>
                                    <Link href={`/admin/panitera/scoring/champions${eventQuery}`} className="col-span-2 min-w-0 sm:col-span-1"><Button size="sm" variant="gold" className="w-full">Hasil Juara</Button></Link>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div role="tablist" aria-label="Jenis pertandingan" className="inline-flex w-full rounded-xl bg-slate-100 p-1 sm:w-auto">
                                    {[
                                        ['embu', 'Embu', 'fa-ranking-star', embuMatches.length],
                                        ['randori', 'Randori', 'fa-hand-fist', randoriMatches.length],
                                    ].map(([key, label, icon, count]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            role="tab"
                                            aria-selected={activeType === key}
                                            aria-controls="panitera-match-table"
                                            onClick={() => setActiveType(key)}
                                            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c0392b] sm:min-h-10 sm:flex-none ${activeType === key ? 'bg-white text-[#c0392b] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            <i className={`fa-solid ${icon}`} aria-hidden="true" />
                                            {label}
                                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700">{count}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl">
                                    <label className="block w-full sm:max-w-52">
                                        <span className="sr-only">Filter court</span>
                                        <select value={activeCourtId} onChange={(event) => setActiveCourtId(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-[#c0392b] focus:ring-2 focus:ring-[#c0392b]/15">
                                            <option value="all">Semua Court</option>
                                            {courts.map((court) => <option key={court.id} value={court.id}>{court.name}</option>)}
                                        </select>
                                    </label>
                                    <label className="relative block w-full">
                                        <span className="sr-only">Cari pertandingan</span>
                                        <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" aria-hidden="true" />
                                        <input
                                            type="search"
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Cari nomor, peserta, court..."
                                            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs outline-none transition focus:border-[#c0392b] focus:ring-2 focus:ring-[#c0392b]/15"
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div id="panitera-match-table" role="tabpanel">
                            <MatchTable matches={visibleMatches} activeEvent={activeEvent} type={activeType} />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2 className="text-base font-bold text-[#17120f]">Penugasan Meja per Court</h2>
                                <p className="mt-0.5 text-xs text-[#7a746e]">Panitera dan pencatat waktu yang ditugaskan pada event ini.</p>
                            </div>
                            <Badge variant="gold">{courts.length} Court</Badge>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                            {courts.map((court) => (
                                <article key={court.id} className="rounded-xl border border-[#ede9e1] bg-[#fbfaf8] p-4">
                                    <div className="flex items-center justify-between gap-3"><h3 className="font-bold">{court.name}</h3><Badge variant={court.is_active ? 'green' : 'gray'}>{court.is_active ? 'Aktif' : 'Nonaktif'}</Badge></div>
                                    <p className="mt-1 text-xs text-[#7a746e]">{court.location || 'Lokasi belum dicatat'}</p>
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <div className="rounded-lg bg-white px-3 py-2"><p className="text-[10px] font-bold uppercase text-[#8c827a]">Progres</p><p className="mt-0.5 text-sm font-black text-[#17120f]">{court.completed_matches}/{court.total_matches}</p></div>
                                        <div className="rounded-lg bg-white px-3 py-2"><p className="text-[10px] font-bold uppercase text-[#8c827a]">Partai Aktif</p><p className="mt-0.5 truncate text-xs font-bold text-[#17120f]">{court.active_match?.label || 'Belum ada'}</p></div>
                                    </div>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                                        {court.clerks.map((clerk) => <p key={clerk.id} className="rounded-lg bg-white px-3 py-2 text-xs"><span className="font-semibold">{clerk.name}</span><span className="text-[#7a746e]"> · {clerk.role}</span></p>)}
                                        {court.clerks.length === 0 && <p className="text-xs font-medium text-amber-700 sm:col-span-2 md:col-span-1 xl:col-span-2">Belum ada Panitera ditugaskan.</p>}
                                    </div>
                                    <div className="mt-3 border-t border-[#e7e0d7] pt-3">
                                        <CourtMonitorButtons courtId={court.id} eventId={activeEvent.id} compact />
                                    </div>
                                </article>
                            ))}
                            {courts.length === 0 && <p className="rounded-xl border border-dashed border-[#d9d3c9] p-8 text-center text-sm text-[#7a746e] md:col-span-2 2xl:col-span-3">Belum ada court untuk event ini.</p>}
                        </div>
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
}
