import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import Badge from '@/Components/UI/Elements/Badge';
import Button from '@/Components/UI/Elements/Button';
import Combobox from '@/Components/UI/Forms/Combobox';
import Input from '@/Components/UI/Forms/Input';
import Pagination from '@/Components/UI/Navigation/Pagination';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { CourtMonitorButtons } from './Partials/CourtMonitorLinks';
import FlashMessage from './Partials/FlashMessage';
import PaniteraHeader from './Partials/PaniteraHeader';

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

function MatchTable({ matches, activeEvent }) {
    return (
        <TableContainer ariaLabel="Daftar pertandingan Embu dan Randori Panitera">
            <table className="responsive-data-table responsive-data-table--cards min-w-full text-left text-xs">
                <thead className="bg-[#f7f4ef] text-[10px] uppercase tracking-wide text-[#7a746e]">
                    <tr>
                        <th className="px-4 py-3">Jadwal</th>
                        <th className="px-4 py-3">Nomor Pertandingan</th>
                        <th className="px-4 py-3">Peserta</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Detail</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#ede9e1]">
                    {matches.map((match) => {
                        const isCompleted = match.status === 'completed';
                        const isInProgress = match.status === 'in_progress';

                        return (
                            <tr
                                key={match.id}
                                className={
                                    isCompleted
                                        ? '!bg-emerald-50/60 !border-emerald-200/80 hover:!bg-emerald-100/50 transition-colors'
                                        : isInProgress
                                        ? '!bg-purple-50/50 !border-purple-200/80 hover:!bg-purple-100/50 transition-colors'
                                        : 'hover:bg-[#fcfbf9] transition-colors'
                                }
                            >
                                <td data-label="Jadwal" className="min-w-44 px-4 py-3 align-top">
                                    <p className="font-bold text-[#17120f]">{match.scheduled_at || 'Belum dijadwalkan'}</p>
                                    <p className="mt-1 text-[#7a746e]">{match.court}</p>
                                </td>
                                <td data-label="Nomor pertandingan" className="min-w-64 px-4 py-3 align-top">
                                    <div className="flex items-start gap-2">
                                        <Badge variant={match.category_type === 'embu' ? 'blue' : 'red'} size="sm">{match.category_type?.toUpperCase()}</Badge>
                                        <div>
                                            <p className="font-bold text-[#17120f]">{match.category_name}</p>
                                            <p className="mt-1 text-[#7a746e]">Partai #{match.sequence} · {match.round_label}</p>
                                        </div>
                                    </div>
                                </td>
                                <td data-label="Peserta" className="min-w-64 px-4 py-3 align-top text-[#5f574f]">
                                    {match.category_type === 'randori' && match.red_label && match.blue_label ? (
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[9px] font-black ${match.result?.winner_corner === 'aka' ? 'bg-rose-600 text-white shadow-2xs' : 'bg-rose-100 text-rose-800'}`}>AKA</span>
                                                <span className={`text-xs ${match.result?.winner_corner === 'aka' ? 'font-bold text-[#17120f]' : 'text-[#7a746e]'}`}>{match.red_label}</span>
                                                {match.result && <span className="font-mono text-xs font-bold text-rose-700">({match.result.aka_total})</span>}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[9px] font-black ${match.result?.winner_corner === 'shiro' ? 'bg-slate-700 text-white shadow-2xs' : 'bg-slate-100 text-slate-700'}`}>SHIRO</span>
                                                <span className={`text-xs ${match.result?.winner_corner === 'shiro' ? 'font-bold text-[#17120f]' : 'text-[#7a746e]'}`}>{match.blue_label}</span>
                                                {match.result && <span className="font-mono text-xs font-bold text-slate-700">({match.result.shiro_total})</span>}
                                            </div>
                                            {match.result && (
                                                <div className="pt-1">
                                                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300/80 bg-emerald-100/90 px-2 py-0.5 text-[10.5px] font-bold text-emerald-900 shadow-2xs">
                                                        <i className="fa-solid fa-trophy text-amber-500" aria-hidden="true" />
                                                        Pemenang: {match.result.winner_corner === 'aka' ? 'AKA (Merah)' : match.result.winner_corner === 'shiro' ? 'SHIRO (Putih)' : match.result.winner_label}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="font-medium text-[#17120f]">{match.participant || 'Peserta belum ditentukan'}</p>
                                            {match.result && match.result.type === 'embu' && (
                                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300/80 bg-emerald-100/90 px-2 py-0.5 text-[10.5px] font-bold text-emerald-900 shadow-2xs">
                                                        <i className="fa-solid fa-star text-amber-500" aria-hidden="true" />
                                                        Nilai Akhir: {match.result.final_score?.toFixed(2)}
                                                    </span>
                                                    {Number(match.result.total_penalty || 0) > 0 && (
                                                        <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                                            Denda -{match.result.total_penalty.toFixed(2)}
                                                        </span>
                                                    )}
                                                    {match.result.is_disqualified && (
                                                        <span className="inline-flex items-center rounded-md border border-rose-300 bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                                                            Diskualifikasi
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td data-label="Status" className="min-w-48 px-4 py-3 align-top">
                                    <div className="flex flex-wrap gap-1.5">
                                        <Badge variant={statusVariants[match.status] || 'gray'}>{match.status_label}</Badge>
                                        {isCompleted && match.result?.type === 'randori' ? (
                                            <Badge variant={match.result.is_locked ? 'green' : 'yellow'}>
                                                <i className={`fa-solid ${match.result.is_locked ? 'fa-lock' : 'fa-file-signature'} mr-1`} aria-hidden="true" />
                                                {match.result.is_locked ? 'Terkunci' : `${match.result.signed_count}/6 TTD`}
                                            </Badge>
                                        ) : isCompleted && match.result?.type === 'embu' ? (
                                            <Badge variant={match.result.status === 'verified' ? 'green' : 'yellow'}>
                                                <i className={`fa-solid ${match.result.status === 'verified' ? 'fa-circle-check' : 'fa-hourglass-half'} mr-1`} aria-hidden="true" />
                                                {match.result.status_label}
                                            </Badge>
                                        ) : (
                                            <Badge variant={match.call_status === 'waiting' ? 'gray' : 'gold'}>
                                                {match.call_status_label}
                                            </Badge>
                                        )}
                                    </div>
                                </td>
                                <td data-label="Aksi" className="whitespace-nowrap px-4 py-3 text-right align-top">
                                    {match.is_placeholder ? (
                                        <span className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] font-semibold text-slate-500 sm:min-h-9">Menunggu lawan</span>
                                    ) : (
                                        <Link
                                            href={`/admin/panitera/scoring/matches/${match.id}?event_id=${encodeURIComponent(activeEvent.id)}`}
                                            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:min-h-9 ${
                                                isCompleted
                                                    ? 'bg-emerald-700 hover:bg-emerald-800 focus-visible:outline-emerald-700'
                                                    : 'bg-[#c0392b] hover:bg-[#a82718] focus-visible:outline-[#c0392b]'
                                            }`}
                                        >
                                            <i className={`fa-solid ${isCompleted ? 'fa-circle-check' : 'fa-arrow-up-right-from-square'}`} aria-hidden="true" />
                                            Buka Detail
                                        </Link>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    {matches.length === 0 && (
                        <tr>
                            <td colSpan="5" className="px-4 py-12 text-center text-[#7a746e]">Tidak ada pertandingan yang sesuai filter.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </TableContainer>
    );
}

export default function PaniteraDashboard({ activeEvent, events = [], stats = {}, courts = [], matches = { data: [] }, filters = {}, isCourtRestricted = false }) {
    const { flash = {} } = usePage().props;
    const [search, setSearch] = useState(filters.search || '');
    const eventQuery = `?event_id=${encodeURIComponent(activeEvent.id)}`;
    const visit = (changes = {}, page = 1) => router.get('/admin/panitera/scoring', {
        event_id: activeEvent.id,
        search: filters.search || '',
        status: filters.status || 'all',
        category_type: filters.category_type || 'all',
        court_id: filters.court_id || '',
        ...changes,
        page,
    }, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
    });
    const submitSearch = (event) => {
        event.preventDefault();
        visit({ search });
    };

    return (
        <AdminLayout title="Pusat Kendali Panitera">
            <Head title="Pusat Kendali Panitera | Smart Perkemi" />

            <div className="space-y-5">
                <PaniteraHeader
                    title="Pusat Kendali Panitera"
                    description="Seluruh jadwal Embu dan Randori court Anda berada dalam satu antrean yang mengikuti waktu pertandingan."
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
                    <h2 id="panitera-flow-title" className="text-base font-bold text-[#17120f]">Flow Satu Partai per Court</h2>
                    <p className="mt-0.5 text-xs text-[#7a746e]">Urutan daftar dan tombol partai berikutnya sama-sama mengikuti jadwal pada court ini.</p>
                    <ol className="mt-4 grid gap-3 md:grid-cols-4">
                        {[
                            ['1', 'Buka Detail', 'Pilih satu partai dari antrean gabungan.', 'fa-table-list'],
                            ['2', 'Panggil Ofisial', 'Pastikan perangkat pertandingan siap.', 'fa-bullhorn'],
                            ['3', 'Panggil Peserta', 'Panggil atlet atau tim ke court.', 'fa-users'],
                            ['4', 'Tanding & Nilai', 'Jalankan waktu dan simpan hasil.', 'fa-stopwatch'],
                        ].map(([number, label, description, icon]) => (
                            <li key={number} className="rounded-xl border border-[#ede9e1] bg-[#fbfaf8] p-3">
                                <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#c0392b] text-xs font-black text-white">{number}</span><i className={`fa-solid ${icon} text-[#d4a843]`} aria-hidden="true" /></div>
                                <h3 className="mt-3 text-sm font-bold">{label}</h3>
                                <p className="mt-1 text-xs leading-relaxed text-[#7a746e]">{description}</p>
                            </li>
                        ))}
                    </ol>
                </section>

                <section className="space-y-5" aria-label="Daftar pertandingan dan penugasan meja">
                    <div className="w-full overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm">
                        <div className="border-b border-[#ede9e1] p-4 sm:p-5">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-base font-bold text-[#17120f]">Daftar Pertandingan</h2>
                                        <Badge variant="gold">{matches.total || 0} partai</Badge>
                                        {isCourtRestricted && <Badge variant="green"><i className="fa-solid fa-lock mr-1" aria-hidden="true" />Court penugasan Anda</Badge>}
                                    </div>
                                    <p className="mt-1 text-xs text-[#7a746e]">Embu dan Randori tampil bersama, berurutan sesuai jadwal.</p>
                                </div>
                                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                                    <Link href={`/admin/panitera/scoring/embu-result${eventQuery}`}><Button size="sm" variant="outline" className="w-full">Rekap Embu</Button></Link>
                                    <Link href={`/admin/panitera/scoring/randori-result${eventQuery}`}><Button size="sm" variant="outline" className="w-full">Hasil Randori</Button></Link>
                                    <Link href={`/admin/panitera/scoring/champions${eventQuery}`} className="col-span-2 sm:col-span-1"><Button size="sm" variant="gold" className="w-full">Hasil Juara</Button></Link>
                                </div>
                            </div>

                            <form onSubmit={submitSearch} className="mt-4 grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1fr)_11rem_11rem_13rem_auto]">
                                <Input
                                    label="Cari Pertandingan"
                                    type="search"
                                    value={search}
                                    clearable
                                    onClear={() => {
                                        setSearch('');
                                        visit({ search: '' });
                                    }}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Nomor, peserta, atau court..."
                                    iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                                />
                                <Combobox
                                    label="Jenis Pertandingan"
                                    value={filters.category_type || 'all'}
                                    clearable={false}
                                    onChange={(value) => visit({ category_type: value })}
                                    options={[
                                        { value: 'all', label: 'Semua jenis' },
                                        { value: 'embu', label: 'Embu' },
                                        { value: 'randori', label: 'Randori' },
                                    ]}
                                />
                                <Combobox
                                    label="Status"
                                    value={filters.status || 'all'}
                                    clearable={false}
                                    onChange={(value) => visit({ status: value })}
                                    options={[
                                        { value: 'all', label: 'Semua status' },
                                        { value: 'unfinished', label: 'Belum selesai' },
                                        { value: 'completed', label: 'Sudah selesai' },
                                    ]}
                                />
                                <Combobox
                                    label="Court"
                                    value={filters.court_id || ''}
                                    clearable={false}
                                    disabled={isCourtRestricted && courts.length === 1}
                                    onChange={(value) => visit({ court_id: value })}
                                    options={[
                                        ...(!isCourtRestricted ? [{ value: '', label: 'Semua Court' }] : []),
                                        ...(isCourtRestricted && courts.length > 1 ? [{ value: '', label: 'Semua Court Penugasan' }] : []),
                                        ...courts.map((court) => ({ value: court.id, label: court.name })),
                                    ]}
                                />
                                <Button type="submit" className="w-full sm:col-span-2 xl:col-span-1 xl:w-auto" iconLeft={<i className="fa-solid fa-filter" aria-hidden="true" />}>Terapkan</Button>
                            </form>
                        </div>

                        <MatchTable matches={matches.data || []} activeEvent={activeEvent} />
                        <Pagination pagination={matches} label="partai" onPageChange={(page) => visit({}, page)} />
                    </div>

                    <div className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2 className="text-base font-bold text-[#17120f]">Penugasan Meja per Court</h2>
                                <p className="mt-0.5 text-xs text-[#7a746e]">{isCourtRestricted ? 'Hanya court yang menjadi tanggung jawab akun Panitera ini.' : 'Seluruh penugasan meja pada event ini.'}</p>
                            </div>
                            <Badge variant="gold">{courts.length} Court</Badge>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                            {courts.map((court) => (
                                <article key={court.id} className="rounded-xl border border-[#ede9e1] bg-[#fbfaf8] p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="font-bold">{court.name}</h3>
                                        <div className="flex items-center gap-2">
                                            {court.access_code && (
                                                <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-900" title="Token Meja Panitera (6 Digit)">
                                                    <i className="fa-solid fa-key text-[10px] text-amber-600" aria-hidden="true" />
                                                    {court.access_code}
                                                </span>
                                            )}
                                            <Badge variant={court.is_active ? 'green' : 'gray'}>{court.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                                        </div>
                                    </div>
                                    <p className="mt-1 text-xs text-[#7a746e]">{court.location || 'Lokasi belum dicatat'}</p>
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <div className="rounded-lg bg-white px-3 py-2"><p className="text-[10px] font-bold uppercase text-[#8c827a]">Progres</p><p className="mt-0.5 text-sm font-black text-[#17120f]">{court.completed_matches}/{court.total_matches}</p></div>
                                        <div className="rounded-lg bg-white px-3 py-2"><p className="text-[10px] font-bold uppercase text-[#8c827a]">Partai Aktif</p><p className="mt-0.5 truncate text-xs font-bold text-[#17120f]">{court.active_match?.label || 'Belum ada'}</p></div>
                                    </div>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                                        {court.clerks.map((clerk) => <p key={clerk.id} className="rounded-lg bg-white px-3 py-2 text-xs"><span className="font-semibold">{clerk.name}</span><span className="text-[#7a746e]"> · {clerk.role}</span></p>)}
                                        {court.clerks.length === 0 && <p className="text-xs font-medium text-amber-700 sm:col-span-2 md:col-span-1 xl:col-span-2">Belum ada Panitera ditugaskan.</p>}
                                    </div>
                                    <div className="mt-3 border-t border-[#e7e0d7] pt-3"><CourtMonitorButtons courtId={court.id} eventId={activeEvent.id} compact /></div>
                                </article>
                            ))}
                            {courts.length === 0 && <p className="rounded-xl border border-dashed border-[#d9d3c9] p-8 text-center text-sm text-[#7a746e] md:col-span-2 2xl:col-span-3">Belum ada court untuk akun Panitera ini.</p>}
                        </div>
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
}
