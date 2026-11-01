import Badge from '@/Components/UI/Elements/Badge';
import Button from '@/Components/UI/Elements/Button';
import Combobox from '@/Components/UI/Forms/Combobox';
import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessage from './Partials/FlashMessage';
import CourtMonitorLinks from './Partials/CourtMonitorLinks';
import PaniteraHeader from './Partials/PaniteraHeader';
import RandoriBracketTree from './Partials/RandoriBracketTree';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useMemo, useState, useRef } from 'react';

// Status badge helper
function getStatusBadge(match) {
    if (match.is_bye) {
        return <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">BYE</span>;
    }
    if (match.score?.is_locked) {
        return <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200"><i className="fa-solid fa-lock text-[9px]" /> Selesai</span>;
    }
    if (match.score) {
        return <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200"><i className="fa-solid fa-check text-[9px]" /> Selesai</span>;
    }
    if (match.status === 'in_progress') {
        return <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 border border-purple-300 animate-pulse"><i className="fa-solid fa-stopwatch text-[9px]" /> Live</span>;
    }
    if (match.is_ready) {
        return <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">Siap</span>;
    }
    return <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 border border-slate-200">Menunggu</span>;
}

export default function RandoriResult({
    activeEvent,
    events = [],
    courts = [],
    categories = [],
    selectedCategory,
    categoryDetails,
    matches = [],
    canManage = false,
}) {
    const { flash = {}, errors = {} } = usePage().props;
    const [viewMode, setViewMode] = useState('bracket'); // 'bracket' | 'list'

    const category = categoryDetails || categories.find((item) => item.id === selectedCategory);
    const isDoubleElim = category?.format === 'double_elimination';

    // Group matches by round for bracket view
    const matchesByRound = useMemo(() => {
        return matches.reduce((groups, match) => {
            const key = match.round_label || 'Penyisihan';
            if (!groups[key]) groups[key] = [];
            groups[key].push(match);
            return groups;
        }, {});
    }, [matches]);

    const changeCategory = (value) => router.get('/admin/panitera/scoring/randori-result', {
        event_id: activeEvent.id,
        category: value,
    }, { preserveState: false });

    return (
        <AdminLayout title="Hasil & Bagan Randori">
            <Head title="Bagan Pertandingan Randori | Smart Perkemi" />
            <div className="space-y-5">
                <PaniteraHeader
                    title="Bagan Pertandingan Randori"
                    description="Pantau bagan pohon gugur dan hasil pertandingan Randori secara langsung. Buka detail partai untuk menjalankan timer, input skor, dan pengesahan hasil."
                    activeEvent={activeEvent}
                    events={events}
                    path="/admin/panitera/scoring/randori-result"
                    icon="fa-sitemap"
                />
                <FlashMessage flash={flash} errors={errors} />
                <CourtMonitorLinks activeEvent={activeEvent} courts={courts} />

                {/* Filter and View Mode Switcher Header Card */}
                <section className="rounded-2xl border border-[#e5ded4] bg-white p-4 sm:p-5 shadow-sm space-y-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex-1 max-w-xl">
                            <Combobox
                                label="Nomor Pertandingan Randori"
                                value={selectedCategory || ''}
                                onChange={changeCategory}
                                clearable={false}
                                options={categories.map((item) => ({
                                    value: item.id,
                                    label: item.name,
                                    sublabel: `${item.format?.replaceAll('_', ' ').toUpperCase() || 'BAGAN'} · ${item.drawing_status || 'draft'}`,
                                }))}
                                placeholder="Pilih nomor pertandingan Randori"
                            />
                        </div>

                        {/* View Switcher: Bagan (Bracket) vs Daftar (List) */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex rounded-xl border border-[#e5ded4] bg-[#f5f1eb] p-1">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('bracket')}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                        viewMode === 'bracket'
                                            ? 'bg-[#17120f] text-[#f0c060] shadow-xs'
                                            : 'text-[#625b54] hover:text-[#17120f]'
                                    }`}
                                >
                                    <i className="fa-solid fa-sitemap text-xs" />
                                    <span>Bagan Turnamen</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                        viewMode === 'list'
                                            ? 'bg-[#17120f] text-[#f0c060] shadow-xs'
                                            : 'text-[#625b54] hover:text-[#17120f]'
                                    }`}
                                >
                                    <i className="fa-solid fa-list-ul text-xs" />
                                    <span>Daftar Babak</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {category && (
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#f0eae1] pt-3 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="red">Randori</Badge>
                                <Badge variant="blue">{category.format?.replaceAll('_', ' ').toUpperCase() || 'ELIMINASI'}</Badge>
                                <Badge variant="gold">
                                    {matches.filter((m) => m.score).length}/{matches.filter((m) => !m.is_bye).length} Selesai
                                </Badge>
                                <span className="text-[#7a746e] text-[11px] ml-1">
                                    Total {matches.length} Slot ({matches.filter((m) => m.is_bye).length} Lolos BYE)
                                </span>
                            </div>
                        </div>
                    )}
                </section>

                {/* Main Content Area */}
                {selectedCategory && matches.length > 0 ? (
                    viewMode === 'bracket' ? (
                        /* VISUAL TOURNAMENT BRACKET (BAGAN POHON GUGUR: Upper on Top, Lower on Bottom, Grand Final right, Podium right) */
                        <RandoriBracketTree
                            matches={matches}
                            activeEvent={activeEvent}
                            categoryName={category?.name}
                            categoryFormat={category?.format}
                            canManage={canManage}
                        />
                    ) : (
                        /* ══════════════════════════════════════════════════════════
                           2. ALTERNATIVE LIST VIEW (DAFTAR PER BABAK)
                           ══════════════════════════════════════════════════════════ */
                        <div className="space-y-4">
                            {Object.entries(matchesByRound).map(([round, roundMatches]) => (
                                <section key={round} className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm">
                                    <div className="flex flex-col gap-3 border-b border-[#ede9e1] bg-[#fbfaf8] p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9a6b20]">
                                                Babak Pertandingan
                                            </p>
                                            <h2 className="mt-0.5 font-bold text-base text-[#17120f]">{round}</h2>
                                        </div>
                                        <Badge variant="gray" className="w-fit">{roundMatches.length} partai</Badge>
                                    </div>
                                    <div className="divide-y divide-[#ede9e1]">
                                        {roundMatches.map((match) => (
                                            <article key={match.id} className="p-4 hover:bg-[#fcfbf9] transition-colors">
                                                <div className="grid gap-4 lg:grid-cols-[120px_1fr_auto] lg:items-center">
                                                    <div>
                                                        <p className="text-xs font-bold text-[#9a6b20]">Partai #{match.sequence}</p>
                                                        <p className="mt-1 text-[11px] text-[#7a746e]">
                                                            {match.scheduled_at || 'Jadwal menyusul'}
                                                            <br />
                                                            {match.court || 'Court —'}
                                                        </p>
                                                    </div>
                                                    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch overflow-hidden rounded-xl border border-[#e5ded4]">
                                                        <div className={`min-w-0 p-2.5 sm:p-3 ${match.score?.winner_corner === 'aka' ? 'bg-rose-100/70 font-bold' : 'bg-rose-50/40'}`}>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="rounded px-1.5 py-0.5 text-[9px] font-black bg-rose-600 text-white">AKA</span>
                                                                <span className="text-[10px] text-rose-700 font-bold uppercase">Sudut Merah</span>
                                                            </div>
                                                            <p className="mt-1 break-words text-xs sm:text-sm font-semibold">{match.aka_label || '—'}</p>
                                                            {match.score && <p className="mt-2 text-xl font-black text-rose-900">{match.score.aka_total}</p>}
                                                        </div>
                                                        <div className="flex items-center border-x border-[#e5ded4] px-2 text-[10px] font-black text-[#9b9188] sm:px-3 sm:text-xs bg-[#faf8f5]">
                                                            VS
                                                        </div>
                                                        <div className={`min-w-0 p-2.5 text-right sm:p-3 ${match.score?.winner_corner === 'shiro' ? 'bg-slate-200/70 font-bold' : 'bg-slate-50'}`}>
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <span className="text-[10px] text-slate-600 font-bold uppercase">Sudut Putih</span>
                                                                <span className="rounded px-1.5 py-0.5 text-[9px] font-black bg-slate-700 text-white">SHIRO</span>
                                                            </div>
                                                            <p className="mt-1 break-words text-xs sm:text-sm font-semibold">{match.shiro_label || '—'}</p>
                                                            {match.score && <p className="mt-2 text-xl font-black text-slate-900">{match.score.shiro_total}</p>}
                                                        </div>
                                                    </div>
                                                    <div className="flex w-full flex-col items-stretch gap-2 lg:min-w-36 lg:w-auto">
                                                        {getStatusBadge(match)}
                                                        {canManage && match.is_ready && !match.is_bye && (
                                                            <Link
                                                                href={`/admin/panitera/scoring/matches/${match.id}?event_id=${encodeURIComponent(activeEvent.id)}`}
                                                                className={`inline-flex min-h-10 w-full items-center justify-center rounded-lg border px-3 text-xs font-bold transition-colors ${
                                                                    match.score
                                                                        ? 'border-[#d8c9ae] bg-white text-[#5b5148] hover:bg-[#fbfaf8]'
                                                                        : 'border-[#c0392b] bg-[#c0392b] text-white hover:bg-[#a82718]'
                                                                }`}
                                                            >
                                                                {match.score?.is_locked ? 'Lihat Hasil' : match.score ? 'Buka & Ubah' : 'Buka Partai'}
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="rounded-2xl border border-dashed border-[#d9d3c9] bg-white p-8 text-center text-sm text-[#7a746e] sm:p-12">
                        <i className="fa-solid fa-diagram-project text-3xl text-amber-500/70 mb-3 block" />
                        <h3 className="font-bold text-base text-[#17120f]">Belum Ada Bagan Randori</h3>
                        <p className="mt-1 text-xs max-w-md mx-auto">
                            Drawing pertandingan untuk kategori ini belum dibuat atau belum ada peserta.
                        </p>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
