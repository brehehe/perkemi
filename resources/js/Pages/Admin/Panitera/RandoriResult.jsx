import Badge from '@/Components/UI/Elements/Badge';
import Button from '@/Components/UI/Elements/Button';
import Combobox from '@/Components/UI/Forms/Combobox';
import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessage from './Partials/FlashMessage';
import CourtMonitorLinks from './Partials/CourtMonitorLinks';
import PaniteraHeader from './Partials/PaniteraHeader';
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

// Single Match Card in the Bracket Tree
function BracketMatchCard({ match, activeEvent, canManage, isLastInRound = false, hasPairConnection = false }) {
    const isCompleted = Boolean(match.score);
    const winnerCorner = match.score?.winner_corner;
    const isAkaWinner = winnerCorner === 'aka' || (match.is_bye && match.aka_label && match.shiro_label?.toUpperCase() === 'BYE');
    const isShiroWinner = winnerCorner === 'shiro' || (match.is_bye && match.shiro_label && match.aka_label?.toUpperCase() === 'BYE');

    return (
        <div className="relative flex flex-col justify-center my-3 w-72 shrink-0 group">
            {/* Main Match Container */}
            <div className={`overflow-hidden rounded-xl border transition-all duration-200 shadow-xs hover:shadow-md ${
                match.is_bye
                    ? 'border-dashed border-[#d8d1c8] bg-[#faf8f5]/80'
                    : isCompleted
                    ? 'border-[#d4c8b8] bg-white hover:border-[#b8872d]'
                    : match.status === 'in_progress'
                    ? 'border-purple-400 bg-purple-50/20 ring-2 ring-purple-200'
                    : match.is_ready
                    ? 'border-[#e0d6c8] bg-white hover:border-[#c0392b]'
                    : 'border-[#ede7df] bg-[#faf8f5]/60'
            }`}>
                {/* Match Header Bar */}
                <div className="flex items-center justify-between border-b border-[#eee7dd] bg-[#f8f5f0] px-3 py-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-[#17120f]">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-[#17120f] text-[10px] font-black text-[#f0c060]">
                            #{match.sequence}
                        </span>
                        <span className="text-[10px] text-[#7a746e]">
                            {match.court || 'Court —'}
                        </span>
                    </div>
                    <div>
                        {getStatusBadge(match)}
                    </div>
                </div>

                {/* Opponents Container */}
                <div className="divide-y divide-[#eee7dd] text-xs">
                    {/* AKA (Sudut Merah) */}
                    <div className={`flex items-center justify-between gap-2 px-3 py-2 transition-colors ${
                        isAkaWinner
                            ? 'bg-rose-50/90 font-bold text-rose-950'
                            : match.is_bye && match.aka_label?.toUpperCase() === 'BYE'
                            ? 'bg-slate-50 text-slate-400 italic'
                            : 'bg-white text-[#17120f]'
                    }`}>
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black bg-rose-600 text-white shadow-2xs">
                                AKA
                            </span>
                            <span className="truncate text-xs" title={match.aka_label}>
                                {match.aka_label || 'Menunggu peserta'}
                            </span>
                            {isAkaWinner && (
                                <i className="fa-solid fa-crown text-amber-500 text-[11px] shrink-0" title="Pemenang" />
                            )}
                        </div>
                        <div className="shrink-0 font-mono font-bold text-xs sm:text-sm">
                            {match.score ? (
                                <span className={isAkaWinner ? 'text-rose-700 font-black' : 'text-[#7a746e]'}>
                                    {match.score.aka_total}
                                </span>
                            ) : match.is_bye && isAkaWinner ? (
                                <span className="text-[10px] font-semibold text-emerald-700">BYE</span>
                            ) : (
                                <span className="text-[#a8a199]">—</span>
                            )}
                        </div>
                    </div>

                    {/* SHIRO (Sudut Putih) */}
                    <div className={`flex items-center justify-between gap-2 px-3 py-2 transition-colors ${
                        isShiroWinner
                            ? 'bg-slate-100 font-bold text-slate-950'
                            : match.is_bye && match.shiro_label?.toUpperCase() === 'BYE'
                            ? 'bg-slate-50 text-slate-400 italic'
                            : 'bg-white text-[#17120f]'
                    }`}>
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black bg-slate-700 text-white shadow-2xs">
                                SHIRO
                            </span>
                            <span className="truncate text-xs" title={match.shiro_label}>
                                {match.shiro_label || 'Menunggu peserta'}
                            </span>
                            {isShiroWinner && (
                                <i className="fa-solid fa-crown text-amber-500 text-[11px] shrink-0" title="Pemenang" />
                            )}
                        </div>
                        <div className="shrink-0 font-mono font-bold text-xs sm:text-sm">
                            {match.score ? (
                                <span className={isShiroWinner ? 'text-slate-900 font-black' : 'text-[#7a746e]'}>
                                    {match.score.shiro_total}
                                </span>
                            ) : match.is_bye && isShiroWinner ? (
                                <span className="text-[10px] font-semibold text-emerald-700">BYE</span>
                            ) : (
                                <span className="text-[#a8a199]">—</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Match Footer & Action Link */}
                <div className="flex items-center justify-between bg-[#fbfaf8] px-3 py-1.5 border-t border-[#eee7dd] text-[10px] text-[#7a746e]">
                    <span className="truncate">
                        {match.scheduled_at ? <><i className="fa-regular fa-clock mr-1" />{match.scheduled_at}</> : 'Jadwal fleksibel'}
                    </span>
                    {canManage && match.is_ready && !match.is_bye ? (
                        <Link
                            href={`/admin/panitera/scoring/matches/${match.id}?event_id=${encodeURIComponent(activeEvent.id)}`}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold transition-all shadow-2xs ${
                                match.score
                                    ? 'bg-[#17120f] text-[#f0c060] hover:bg-black'
                                    : 'bg-[#c0392b] text-white hover:bg-[#a82718]'
                            }`}
                        >
                            <span>{match.score ? 'Lihat Hasil' : 'Buka & Nilai'}</span>
                            <i className="fa-solid fa-chevron-right text-[8px]" />
                        </Link>
                    ) : match.is_bye ? (
                        <span className="text-[10px] italic text-[#9a9187]">Lolos otomatis</span>
                    ) : (
                        <span className="text-[10px] text-[#a8a199]">Menunggu partai</span>
                    )}
                </div>
            </div>

            {/* Right Horizontal Connector Line (leads toward next round) */}
            {match.next_match_id && (
                <div className="absolute right-[-24px] top-1/2 w-6 h-0.5 bg-[#d4c8b8] group-hover:bg-[#b8872d] transition-colors" />
            )}
        </div>
    );
}

// Single Round Column inside Bracket
function BracketRoundColumn({ roundName, matches, activeEvent, canManage, isFirstRound, isLastRound }) {
    return (
        <div className="flex flex-col items-center shrink-0 w-76">
            {/* Round Column Header */}
            <div className="w-full mb-3 pb-2 border-b border-[#e5ded4] text-center">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9a6b20]">
                    {isLastRound ? 'Babak Puncak' : isFirstRound ? 'Babak Awal' : 'Babak Lanjutan'}
                </p>
                <h3 className="mt-0.5 text-sm font-bold text-[#17120f]">
                    {roundName}
                </h3>
                <span className="mt-1 inline-block rounded-full bg-[#f4eee6] px-2 py-0.5 text-[10px] font-semibold text-[#7a746e]">
                    {matches.length} partai
                </span>
            </div>

            {/* Matches Container (Distributed evenly across vertical space) */}
            <div className="w-full flex-1 flex flex-col justify-around py-2">
                {matches.map((match, idx) => (
                    <BracketMatchCard
                        key={match.id}
                        match={match}
                        activeEvent={activeEvent}
                        canManage={canManage}
                        hasPairConnection={!isLastRound && idx % 2 === 0 && idx + 1 < matches.length}
                    />
                ))}
            </div>
        </div>
    );
}

// Winner Podium / Champion Display at the end of the bracket
function BracketChampionPodium({ matches }) {
    // Find final match
    const finalMatch = matches.find((m) => m.phase === 'final' || m.round_label?.toLowerCase().includes('final')) || matches[matches.length - 1];
    if (!finalMatch || !finalMatch.score) return null;

    const winnerCorner = finalMatch.score.winner_corner;
    const championName = winnerCorner === 'aka' ? finalMatch.aka_label : winnerCorner === 'shiro' ? finalMatch.shiro_label : null;
    const runnerUpName = winnerCorner === 'aka' ? finalMatch.shiro_label : winnerCorner === 'shiro' ? finalMatch.aka_label : null;

    if (!championName) return null;

    return (
        <div className="flex flex-col items-center justify-center shrink-0 w-64 ml-4 my-auto self-center">
            <div className="w-full rounded-2xl border-2 border-amber-300 bg-gradient-to-b from-amber-50 to-amber-100/60 p-4 text-center shadow-md">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#17120f] text-amber-400 shadow-md">
                    <i className="fa-solid fa-trophy text-xl" />
                </span>
                <p className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-[#9a6b20]">Juara 1 · Medali Emas</p>
                <h4 className="mt-1 text-sm font-black text-[#17120f] leading-snug break-words">
                    {championName}
                </h4>

                {runnerUpName && (
                    <div className="mt-3 pt-3 border-t border-amber-200/80 text-[11px]">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Juara 2 · Medali Perak</p>
                        <p className="mt-0.5 font-bold text-slate-800 break-words">{runnerUpName}</p>
                    </div>
                )}
            </div>
        </div>
    );
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
    const [doubleElimTab, setDoubleElimTab] = useState('all'); // 'all' | 'upper' | 'lower' | 'final'
    const scrollContainerRef = useRef(null);

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

    // Separate groups for Double Elimination if needed
    const doubleElimSections = useMemo(() => {
        if (!isDoubleElim) return null;

        const upper = {};
        const lower = {};
        const grandFinal = {};

        Object.entries(matchesByRound).forEach(([round, roundMatches]) => {
            if (round.toLowerCase().includes('upper')) {
                upper[round] = roundMatches;
            } else if (round.toLowerCase().includes('lower')) {
                lower[round] = roundMatches;
            } else {
                grandFinal[round] = roundMatches;
            }
        });

        return { upper, lower, grandFinal };
    }, [matchesByRound, isDoubleElim]);

    const changeCategory = (value) => router.get('/admin/panitera/scoring/randori-result', {
        event_id: activeEvent.id,
        category: value,
    }, { preserveState: false });

    // Scroll controls for horizontal bracket navigation
    const scrollBracket = (direction) => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -350 : 350,
                behavior: 'smooth',
            });
        }
    };

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

                            {/* Horizontal scroll helpers when in bracket view */}
                            {viewMode === 'bracket' && (
                                <div className="hidden sm:inline-flex items-center gap-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => scrollBracket('left')}
                                        title="Geser ke kiri"
                                        className="h-8 w-8 p-0"
                                    >
                                        <i className="fa-solid fa-chevron-left text-xs" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => scrollBracket('right')}
                                        title="Geser ke kanan"
                                        className="h-8 w-8 p-0"
                                    >
                                        <i className="fa-solid fa-chevron-right text-xs" />
                                    </Button>
                                </div>
                            )}
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

                            {/* Double Elimination Sub-tabs */}
                            {isDoubleElim && viewMode === 'bracket' && (
                                <div className="inline-flex rounded-lg border border-[#e5ded4] bg-white p-0.5 text-xs font-semibold">
                                    <button
                                        type="button"
                                        onClick={() => setDoubleElimTab('all')}
                                        className={`px-2.5 py-1 rounded-md text-[11px] ${doubleElimTab === 'all' ? 'bg-[#17120f] text-[#f0c060]' : 'text-[#625b54] hover:text-black'}`}
                                    >
                                        Semua
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDoubleElimTab('upper')}
                                        className={`px-2.5 py-1 rounded-md text-[11px] ${doubleElimTab === 'upper' ? 'bg-[#17120f] text-[#f0c060]' : 'text-[#625b54] hover:text-black'}`}
                                    >
                                        Upper Bracket
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDoubleElimTab('lower')}
                                        className={`px-2.5 py-1 rounded-md text-[11px] ${doubleElimTab === 'lower' ? 'bg-[#17120f] text-[#f0c060]' : 'text-[#625b54] hover:text-black'}`}
                                    >
                                        Lower Bracket
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Main Content Area */}
                {selectedCategory && matches.length > 0 ? (
                    viewMode === 'bracket' ? (
                        /* ══════════════════════════════════════════════════════════
                           1. VISUAL TOURNAMENT BRACKET (BAGAN POHON GUGUR)
                           ══════════════════════════════════════════════════════════ */
                        <div className="space-y-6">
                            {/* Standard Single Elimination / Unified Bracket */}
                            {(!isDoubleElim || doubleElimTab === 'all') && (
                                <section className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm">
                                    <div className="border-b border-[#ede9e1] bg-[#fbfaf8] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                        <div>
                                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9a6b20]">
                                                Bagan Gugur Pertandingan
                                            </p>
                                            <h2 className="text-base font-bold text-[#17120f]">
                                                {category.name}
                                            </h2>
                                        </div>
                                        <p className="text-xs text-[#7a746e]">
                                            Geser horizontal <i className="fa-solid fa-arrows-left-right mx-1 text-amber-600" /> untuk melihat alur babak hingga final.
                                        </p>
                                    </div>

                                    {/* Bracket Canvas with Horizontal Scroll */}
                                    <div
                                        ref={scrollContainerRef}
                                        tabIndex={0}
                                        aria-label={`Bagan Randori ${category.name}, geser horizontal untuk melihat setiap babak`}
                                        className="overflow-x-auto p-6 scrollbar-thin scrollbar-thumb-amber-300 scrollbar-track-stone-100 bg-gradient-to-r from-stone-50/50 via-white to-stone-50/50"
                                    >
                                        <div className="flex items-stretch gap-10 min-w-max pb-4">
                                            {Object.entries(matchesByRound).map(([roundName, roundMatches], roundIdx, allRounds) => (
                                                <BracketRoundColumn
                                                    key={roundName}
                                                    roundName={roundName}
                                                    matches={roundMatches}
                                                    activeEvent={activeEvent}
                                                    canManage={canManage}
                                                    isFirstRound={roundIdx === 0}
                                                    isLastRound={roundIdx === allRounds.length - 1}
                                                />
                                            ))}

                                            {/* Champion Podium banner when final is completed */}
                                            <BracketChampionPodium matches={matches} />
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Double Elimination: Specific Upper / Lower Bracket tabs */}
                            {isDoubleElim && doubleElimTab === 'upper' && (
                                <section className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm">
                                    <div className="border-b border-blue-200 bg-blue-50/60 p-4">
                                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800">Bagan Pemenang</p>
                                        <h2 className="text-base font-bold text-blue-950">Upper Bracket</h2>
                                    </div>
                                    <div className="overflow-x-auto p-6 bg-gradient-to-r from-blue-50/20 via-white to-blue-50/20">
                                        <div className="flex items-stretch gap-10 min-w-max pb-4">
                                            {Object.entries(doubleElimSections.upper).map(([roundName, roundMatches], roundIdx, allRounds) => (
                                                <BracketRoundColumn
                                                    key={roundName}
                                                    roundName={roundName}
                                                    matches={roundMatches}
                                                    activeEvent={activeEvent}
                                                    canManage={canManage}
                                                    isFirstRound={roundIdx === 0}
                                                    isLastRound={roundIdx === allRounds.length - 1}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            )}

                            {isDoubleElim && doubleElimTab === 'lower' && (
                                <section className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm">
                                    <div className="border-b border-amber-200 bg-amber-50/60 p-4">
                                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">Bagan Harapan</p>
                                        <h2 className="text-base font-bold text-amber-950">Lower Bracket</h2>
                                    </div>
                                    <div className="overflow-x-auto p-6 bg-gradient-to-r from-amber-50/20 via-white to-amber-50/20">
                                        <div className="flex items-stretch gap-10 min-w-max pb-4">
                                            {Object.entries(doubleElimSections.lower).map(([roundName, roundMatches], roundIdx, allRounds) => (
                                                <BracketRoundColumn
                                                    key={roundName}
                                                    roundName={roundName}
                                                    matches={roundMatches}
                                                    activeEvent={activeEvent}
                                                    canManage={canManage}
                                                    isFirstRound={roundIdx === 0}
                                                    isLastRound={roundIdx === allRounds.length - 1}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            )}
                        </div>
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
