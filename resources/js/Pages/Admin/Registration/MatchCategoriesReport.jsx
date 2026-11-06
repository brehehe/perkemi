import AdminLayout from '@/Layouts/AdminLayout';
import Button from '@/Components/UI/Elements/Button';
import Combobox from '@/Components/UI/Forms/Combobox';
import Input from '@/Components/UI/Forms/Input';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

export default function MatchCategoriesReport({
    activeEvent = {},
    eventOptions = [],
    categories = [],
    stats = {},
}) {
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all'); // all, embu, randori
    const [techniqueFilter, setTechniqueFilter] = useState('all'); // all, complete, missing
    const [ageFilter, setAgeFilter] = useState('all');
    const [collapsedCategories, setCollapsedCategories] = useState({});

    // Unique age category names
    const ageOptions = useMemo(() => {
        const ages = new Set(categories.map((c) => c.age_category_name).filter(Boolean));
        return [
            { value: 'all', label: 'Semua Kelompok Usia' },
            ...Array.from(ages).map((age) => ({ value: age, label: age })),
        ];
    }, [categories]);

    // Filter categories based on search, type, technique status, age
    const filteredCategories = useMemo(() => {
        const query = search.trim().toLowerCase();

        return categories.filter((cat) => {
            // Type filter
            if (typeFilter !== 'all' && cat.type !== typeFilter) {
                return false;
            }

            // Age filter
            if (ageFilter !== 'all' && cat.age_category_name !== ageFilter) {
                return false;
            }

            // Technique status filter (for Embu)
            if (cat.type === 'embu') {
                if (techniqueFilter === 'missing' && cat.teams_without_techniques === 0) {
                    return false;
                }
                if (techniqueFilter === 'complete' && cat.teams_without_techniques > 0) {
                    return false;
                }
            } else if (techniqueFilter !== 'all') {
                // Randori doesn't have techniques
                return false;
            }

            // Search query
            if (!query) return true;

            const matchesCategoryName = cat.name.toLowerCase().includes(query);
            if (matchesCategoryName) return true;

            if (cat.type === 'embu') {
                return cat.teams.some((team) => {
                    const matchesContingent = (team.contingent_name || '').toLowerCase().includes(query)
                        || (team.contingent_city || '').toLowerCase().includes(query);
                    const matchesAthlete = team.athletes.some((a) => (a.name || '').toLowerCase().includes(query) || (a.kyu_dan || '').toLowerCase().includes(query));
                    const matchesTechnique = team.techniques.some((t) => (t.name || '').toLowerCase().includes(query));
                    return matchesContingent || matchesAthlete || matchesTechnique;
                });
            } else {
                return cat.randori_athletes.some((a) => {
                    return (a.name || '').toLowerCase().includes(query)
                        || (a.contingent_name || '').toLowerCase().includes(query)
                        || (a.kyu_dan || '').toLowerCase().includes(query);
                });
            }
        });
    }, [categories, search, typeFilter, techniqueFilter, ageFilter]);

    const toggleCollapse = (id) => {
        setCollapsedCategories((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const expandAll = () => setCollapsedCategories({});
    const collapseAll = () => {
        const all = {};
        categories.forEach((c) => {
            all[c.id] = true;
        });
        setCollapsedCategories(all);
    };

    const handleEventChange = (eventId) => {
        if (!eventId || eventId === activeEvent.id) return;
        router.get('/admin/pendaftaran/laporan-nomor-pertandingan', { event_id: eventId });
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <AdminLayout title="Laporan Nomor Pertandingan & Teknik">
            <Head title="Laporan Nomor Pertandingan & Teknik | Smart Perkemi" />

            <div className="space-y-6 pb-12 print:space-y-4 print:pb-0">
                {/* Print Only Header */}
                <div className="hidden print:block border-b-2 border-black pb-4 mb-4 text-center">
                    <h1 className="text-xl font-bold uppercase tracking-wider text-black">
                        PERSAUDARAAN BELA DIRI KEMPO INDONESIA (PERKEMI)
                    </h1>
                    <h2 className="text-base font-semibold text-gray-800 mt-1 uppercase">
                        LAPORAN NOMOR PERTANDINGAN, SUSUNAN TIM & TEKNIK EMBU
                    </h2>
                    <p className="text-xs text-gray-600 mt-1">
                        Event: <span className="font-bold text-black">{activeEvent.name || 'Semua Event'}</span>
                        {activeEvent.city && ` · ${activeEvent.city}`}
                        {' · '}Dicetak pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}, {new Date().toLocaleTimeString('id-ID', { timeStyle: 'short' })} WIB
                    </p>
                </div>

                {/* Top Action & Navigation Bar */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print:hidden">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                Laporan Pertandingan
                            </span>
                            <span className="text-xs text-slate-500 dark:text-white/40">•</span>
                            <span className="text-xs font-medium text-slate-600 dark:text-white/60">
                                {activeEvent.name || 'Event Aktif'}
                            </span>
                        </div>
                        <h1 className="mt-1 font-cinzel text-2xl font-bold text-[#17120f] dark:text-white md:text-3xl">
                            Laporan Nomor Pertandingan & Teknik
                        </h1>
                        <p className="mt-1 max-w-3xl text-sm text-[#706860] dark:text-white/60">
                            Cek menyeluruh seluruh nomor tanding, susunan tim, komposisi teknik Embu, dan daftar atlet tiap kontingen.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {eventOptions.length > 1 && (
                            <div className="w-56">
                                <Combobox
                                    value={activeEvent.id}
                                    onChange={handleEventChange}
                                    options={eventOptions.map((e) => ({ value: e.id, label: e.name }))}
                                    clearable={false}
                                    size="sm"
                                    ariaLabel="Pilih Event"
                                />
                            </div>
                        )}

                        <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            onClick={handlePrint}
                            className="gap-2 font-semibold shadow-xs"
                        >
                            <i className="fa-solid fa-print text-slate-500"></i>
                            <span>Cetak Laporan</span>
                        </Button>

                        <a
                            href={`/admin/pendaftaran/nomor-pertandingan/export?event_id=${activeEvent.id || ''}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                        >
                            <i className="fa-solid fa-file-excel"></i>
                            <span>Export Excel</span>
                        </a>

                        <Link
                            href={`/admin/pendaftaran/nomor-pertandingan?event_id=${activeEvent.id || ''}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                        >
                            <i className="fa-solid fa-sliders"></i>
                            <span>Kelola Tim & Nomor</span>
                        </Link>
                    </div>
                </div>

                {/* Summary Statistics Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
                    {/* Total Nomor */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-white/5 print:border-gray-300 print:p-2.5">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 print:text-[9px]">
                                Nomor Pertandingan
                            </p>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 print:hidden">
                                <i className="fa-solid fa-trophy text-xs"></i>
                            </span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white print:text-lg">
                            {stats.total_categories || 0}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-white/50 print:text-[10px]">
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{stats.total_embu_categories || 0} Embu</span>
                            {' · '}
                            <span className="font-semibold text-amber-600 dark:text-amber-400">{stats.total_randori_categories || 0} Randori</span>
                        </p>
                    </div>

                    {/* Total Atlet & Tim */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-white/5 print:border-gray-300 print:p-2.5">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 print:text-[9px]">
                                Peserta & Tim
                            </p>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 print:hidden">
                                <i className="fa-solid fa-users text-xs"></i>
                            </span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white print:text-lg">
                            {stats.total_athletes || 0}{' '}
                            <span className="text-sm font-medium text-slate-500 dark:text-white/50">Atlet</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-white/50 print:text-[10px]">
                            {stats.total_embu_teams || 0} Tim Embu · {stats.total_randori_athletes || 0} Kenshi Randori
                        </p>
                    </div>

                    {/* Kontingen Berpartisipasi */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-white/5 print:border-gray-300 print:p-2.5">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 print:text-[9px]">
                                Kontingen
                            </p>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 print:hidden">
                                <i className="fa-solid fa-flag text-xs"></i>
                            </span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white print:text-lg">
                            {stats.total_contingents || 0}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-white/50 print:text-[10px]">
                            Kontingen daerah terdaftar
                        </p>
                    </div>

                    {/* Status Teknik Embu */}
                    <div className={`rounded-2xl border p-4 shadow-xs print:border-gray-300 print:p-2.5 ${
                        stats.embu_teams_without_techniques > 0
                            ? 'border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20'
                            : 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                    }`}>
                        <div className="flex items-center justify-between">
                            <p className={`text-[11px] font-bold uppercase tracking-wider print:text-[9px] ${
                                stats.embu_teams_without_techniques > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-emerald-800 dark:text-emerald-300'
                            }`}>
                                Teknik Embu
                            </p>
                            <span className={`flex h-7 w-7 items-center justify-center rounded-lg print:hidden ${
                                stats.embu_teams_without_techniques > 0
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                            }`}>
                                <i className={`fa-solid ${stats.embu_teams_without_techniques > 0 ? 'fa-triangle-exclamation' : 'fa-check'} text-xs`}></i>
                            </span>
                        </div>
                        <p className={`mt-2 text-2xl font-black print:text-lg ${
                            stats.embu_teams_without_techniques > 0 ? 'text-amber-900 dark:text-amber-200' : 'text-emerald-900 dark:text-emerald-200'
                        }`}>
                            {stats.embu_completion_percent || 0}%{' '}
                            <span className="text-sm font-medium">Lengkap</span>
                        </p>
                        <p className={`mt-1 text-xs font-semibold print:text-[10px] ${
                            stats.embu_teams_without_techniques > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'
                        }`}>
                            {stats.embu_teams_without_techniques > 0
                                ? `⚠️ ${stats.embu_teams_without_techniques} Tim belum ada teknik`
                                : `✓ Seluruh ${stats.total_embu_teams || 0} tim lengkap`}
                        </p>
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-white/5 print:hidden">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto] lg:items-center">
                        {/* Search Input */}
                        <div className="min-w-0">
                            <Input
                                placeholder="Cari nomor tanding, nama atlet, kontingen, atau teknik..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full text-xs"
                                prefix={<i className="fa-solid fa-magnifying-glass text-slate-400"></i>}
                            />
                        </div>

                        {/* Filter Tipe */}
                        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100/70 p-1 dark:border-white/10 dark:bg-white/5">
                            <button
                                type="button"
                                onClick={() => setTypeFilter('all')}
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                    typeFilter === 'all'
                                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                                        : 'text-slate-600 hover:text-slate-900 dark:text-white/60 dark:hover:text-white'
                                }`}
                            >
                                Semua
                            </button>
                            <button
                                type="button"
                                onClick={() => setTypeFilter('embu')}
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                    typeFilter === 'embu'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-indigo-600 dark:text-white/60 dark:hover:text-white'
                                }`}
                            >
                                Embu
                            </button>
                            <button
                                type="button"
                                onClick={() => setTypeFilter('randori')}
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                    typeFilter === 'randori'
                                        ? 'bg-amber-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-amber-600 dark:text-white/60 dark:hover:text-white'
                                }`}
                            >
                                Randori
                            </button>
                        </div>

                        {/* Filter Status Teknik (for Embu) */}
                        <div className="min-w-[170px]">
                            <Combobox
                                value={techniqueFilter}
                                onChange={setTechniqueFilter}
                                options={[
                                    { value: 'all', label: 'Semua Status Teknik' },
                                    { value: 'complete', label: '✓ Teknik Sudah Terisi' },
                                    { value: 'missing', label: '⚠️ Teknik Belum Ada' },
                                ]}
                                clearable={false}
                                size="sm"
                                ariaLabel="Filter Status Teknik"
                            />
                        </div>

                        {/* Filter Usia */}
                        <div className="min-w-[170px]">
                            <Combobox
                                value={ageFilter}
                                onChange={setAgeFilter}
                                options={ageOptions}
                                clearable={false}
                                size="sm"
                                ariaLabel="Filter Kelompok Usia"
                            />
                        </div>

                        {/* Expand / Collapse Toggle */}
                        <div className="flex items-center gap-1.5 justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={expandAll}
                                title="Buka Semua Kartu"
                                className="text-xs"
                            >
                                <i className="fa-solid fa-angles-down text-slate-500"></i>
                                <span className="hidden xl:inline ml-1">Buka Semua</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={collapseAll}
                                title="Tutup Semua Kartu"
                                className="text-xs"
                            >
                                <i className="fa-solid fa-angles-up text-slate-500"></i>
                                <span className="hidden xl:inline ml-1">Tutup Semua</span>
                            </Button>
                        </div>
                    </div>

                    {/* Active Filters Summary */}
                    {(search || typeFilter !== 'all' || techniqueFilter !== 'all' || ageFilter !== 'all') && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-white/5">
                            <span className="text-xs text-slate-500">Filter aktif:</span>
                            {search && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800 dark:bg-white/10 dark:text-white">
                                    Pencarian: &quot;{search}&quot;
                                    <button type="button" onClick={() => setSearch('')} className="hover:text-rose-600">×</button>
                                </span>
                            )}
                            {typeFilter !== 'all' && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
                                    Tipe: {typeFilter.toUpperCase()}
                                    <button type="button" onClick={() => setTypeFilter('all')} className="hover:text-rose-600">×</button>
                                </span>
                            )}
                            {techniqueFilter !== 'all' && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                    Teknik: {techniqueFilter === 'complete' ? 'Sudah Ada' : 'Belum Ada'}
                                    <button type="button" onClick={() => setTechniqueFilter('all')} className="hover:text-rose-600">×</button>
                                </span>
                            )}
                            {ageFilter !== 'all' && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800 dark:bg-white/10 dark:text-white">
                                    Usia: {ageFilter}
                                    <button type="button" onClick={() => setAgeFilter('all')} className="hover:text-rose-600">×</button>
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    setTypeFilter('all');
                                    setTechniqueFilter('all');
                                    setAgeFilter('all');
                                }}
                                className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400 ml-2"
                            >
                                Reset Semua Filter
                            </button>
                        </div>
                    )}
                </div>

                {/* Empty State */}
                {filteredCategories.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs dark:border-white/15 dark:bg-white/5">
                        <i className="fa-solid fa-filter-circle-xmark text-4xl text-slate-400 dark:text-white/30"></i>
                        <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                            Tidak Ada Nomor Pertandingan Ditemukan
                        </h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-white/60">
                            Coba sesuaikan kata kunci pencarian atau ubah filter di atas.
                        </p>
                    </div>
                )}

                {/* Categories List */}
                <div className="space-y-5 print:space-y-6">
                    {filteredCategories.map((category, catIndex) => {
                        const isCollapsed = Boolean(collapsedCategories[category.id]);
                        const isEmbu = category.type === 'embu';

                        return (
                            <section
                                key={category.id}
                                className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-white/10 dark:bg-[#1a1714] print:border-gray-400 print:rounded-none print:shadow-none print:break-inside-avoid"
                            >
                                {/* Category Header Bar */}
                                <div
                                    onClick={() => toggleCollapse(category.id)}
                                    className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/70 p-4 transition-colors hover:bg-slate-100/60 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05] cursor-pointer print:bg-gray-100 print:border-b-2 print:border-gray-400 print:p-2.5"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white print:h-6 print:w-6 print:text-[10px] ${
                                            isEmbu ? 'bg-indigo-600' : 'bg-amber-600'
                                        }`}>
                                            {isEmbu ? 'EM' : 'RA'}
                                        </span>

                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-cinzel text-base font-bold text-slate-900 dark:text-white print:text-sm">
                                                    {catIndex + 1}. {category.name}
                                                </h3>
                                                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider print:border print:text-[9px] ${
                                                    isEmbu
                                                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 print:border-indigo-800'
                                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 print:border-amber-800'
                                                }`}>
                                                    {isEmbu ? 'EMBU' : 'RANDORI'}
                                                </span>
                                                <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-white/10 dark:text-white/70 print:text-[9px]">
                                                    {category.gender === 'male' ? 'Putra' : category.gender === 'female' ? 'Putri' : 'Campuran'}
                                                </span>
                                                <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-white/10 dark:text-white/70 print:text-[9px]">
                                                    {category.age_category_name}
                                                </span>
                                                {!isEmbu && (category.min_weight !== null || category.max_weight !== null) && (
                                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-white/10 dark:text-white/70 print:text-[9px]">
                                                        {category.min_weight || 0}–{category.max_weight || '∞'} kg
                                                    </span>
                                                )}
                                            </div>

                                            <p className="mt-0.5 text-xs text-slate-500 dark:text-white/50 print:text-[10px]">
                                                {isEmbu ? (
                                                    <span>{category.total_teams} Tim terdaftar · {category.total_athletes} Atlet</span>
                                                ) : (
                                                    <span>{category.total_athletes} Peserta terdaftar</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Status badge for Embu */}
                                        {isEmbu && (
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold print:text-[10px] ${
                                                category.teams_without_techniques > 0
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                            }`}>
                                                {category.teams_without_techniques > 0 ? (
                                                    <>
                                                        <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>
                                                        <span>{category.teams_without_techniques} Tim Belum Ada Teknik</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fa-solid fa-circle-check text-[10px]"></i>
                                                        <span>Semua Teknik Lengkap ({category.teams_with_techniques}/{category.total_teams})</span>
                                                    </>
                                                )}
                                            </span>
                                        )}

                                        <i className={`fa-solid fa-chevron-down text-xs text-slate-400 transition-transform dark:text-white/40 print:hidden ${
                                            isCollapsed ? '-rotate-90' : ''
                                        }`}></i>
                                    </div>
                                </div>

                                {/* Category Body Content */}
                                {!isCollapsed && (
                                    <div className="p-4 md:p-5 print:p-2.5">
                                        {isEmbu ? (
                                            /* EMBU TEAMS & TECHNIQUES */
                                            category.teams.length > 0 ? (
                                                <div className="space-y-4 print:space-y-3">
                                                    {category.teams.map((team, teamIndex) => (
                                                        <div
                                                            key={team.team_key || teamIndex}
                                                            className={`rounded-xl border p-4 transition-colors print:rounded-none print:border-gray-300 print:p-2.5 ${
                                                                team.has_techniques
                                                                    ? 'border-slate-200 bg-[#fdfcfa] dark:border-white/10 dark:bg-white/[0.02]'
                                                                    : 'border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/15'
                                                            }`}
                                                        >
                                                            {/* Team Title & Athletes Bar */}
                                                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-3 dark:border-white/10 print:border-gray-200 print:pb-1.5">
                                                                <div className="flex flex-wrap items-center gap-2.5">
                                                                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white dark:bg-white dark:text-slate-900 print:h-5 print:w-5 print:text-[9px]">
                                                                        {teamIndex + 1}
                                                                    </span>
                                                                    <h4 className="font-bold text-slate-900 dark:text-white print:text-xs">
                                                                        {team.contingent_name}
                                                                    </h4>
                                                                    <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-xs font-semibold text-slate-800 dark:bg-white/10 dark:text-white/80 print:text-[10px]">
                                                                        Tim {team.team_number}
                                                                    </span>
                                                                    {team.contingent_city && (
                                                                        <span className="text-xs text-slate-500 dark:text-white/40 print:text-[10px]">
                                                                            ({team.contingent_city})
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Athletes Pill List */}
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <span className="text-xs font-bold text-slate-400 dark:text-white/30 mr-1 print:text-[10px]">
                                                                        Atlet:
                                                                    </span>
                                                                    {team.athletes.map((ath) => (
                                                                        <span
                                                                            key={ath.id || ath.entry_id}
                                                                            className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-800 shadow-2xs dark:border-white/10 dark:bg-white/5 dark:text-white print:border-gray-300 print:text-[10px]"
                                                                        >
                                                                            <i className="fa-solid fa-user text-[10px] text-slate-400"></i>
                                                                            <span>{ath.name}</span>
                                                                            {ath.kyu_dan && (
                                                                                <span className="font-semibold text-amber-700 dark:text-amber-400 text-[11px]">
                                                                                    ({ath.kyu_dan})
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                    ))}
                                                                    {team.athletes.length === 0 && (
                                                                        <span className="text-xs italic text-rose-600 dark:text-rose-400">
                                                                            Belum ada atlet dimasukkan ke tim ini
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Techniques List / Badges */}
                                                            <div className="mt-3">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 print:text-[9px]">
                                                                        Komposisi & Urutan Teknik ({team.technique_count} Teknik)
                                                                    </p>
                                                                    {!team.has_techniques && (
                                                                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 print:text-[9px]">
                                                                            <i className="fa-solid fa-triangle-exclamation"></i>
                                                                            Belum diisi
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {team.has_techniques ? (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {team.techniques.map((tech, idx) => (
                                                                            <div
                                                                                key={tech.id || idx}
                                                                                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 shadow-2xs dark:border-white/10 dark:bg-white/5 dark:text-white print:border-gray-300 print:text-[10px] print:py-0.5"
                                                                            >
                                                                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-700 text-[10px] font-bold text-white print:h-3.5 print:w-3.5 print:text-[8px]">
                                                                                    {tech.order || idx + 1}
                                                                                </span>
                                                                                <span className="font-medium">{tech.name}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
                                                                        <div className="flex items-center gap-2">
                                                                            <i className="fa-solid fa-triangle-exclamation text-amber-600"></i>
                                                                            <span>
                                                                                Kontingen ini belum mendaftarkan urutan teknik Embu untuk Tim {team.team_number}.
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/50">
                                                    Belum ada kontingen atau tim yang terdaftar pada nomor pertandingan Embu ini.
                                                </div>
                                            )
                                        ) : (
                                            /* RANDORI ATHLETES TABLE */
                                            category.randori_athletes.length > 0 ? (
                                                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 print:border-gray-300 print:rounded-none">
                                                    <table className="w-full min-w-[500px] text-left text-xs">
                                                        <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60 print:bg-gray-100 print:border-gray-400 print:text-[9px]">
                                                            <tr>
                                                                <th className="w-12 px-3 py-2.5 text-center">#</th>
                                                                <th className="px-3 py-2.5">Nama Atlet</th>
                                                                <th className="px-3 py-2.5">Kontingen</th>
                                                                <th className="px-3 py-2.5 text-center">Tingkatan</th>
                                                                <th className="px-3 py-2.5 text-right">Berat Badan</th>
                                                                <th className="px-3 py-2.5">No. NIK / Kenshi</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5 print:divide-gray-200">
                                                            {category.randori_athletes.map((ath, idx) => (
                                                                <tr key={ath.entry_id || idx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                                                    <td className="px-3 py-2 text-center text-slate-400 font-medium">
                                                                        {idx + 1}
                                                                    </td>
                                                                    <td className="px-3 py-2 font-bold text-slate-900 dark:text-white print:text-xs">
                                                                        {ath.name}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-slate-700 dark:text-white/80">
                                                                        <span className="font-semibold">{ath.contingent_name}</span>
                                                                        {ath.contingent_city && (
                                                                            <span className="text-slate-400 text-[11px] ml-1">
                                                                                ({ath.contingent_city})
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-800 dark:bg-white/10 dark:text-white/90">
                                                                            {ath.kyu_dan || '—'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right font-medium text-slate-800 dark:text-white/90">
                                                                        {ath.weight ? `${ath.weight} kg` : '—'}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-slate-500 dark:text-white/50 font-mono text-[11px]">
                                                                        {ath.nik || ath.kenshi_number || '—'}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/50">
                                                    Belum ada atlet yang terdaftar pada nomor pertandingan Randori ini.
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>

                {/* Print Signatures Block */}
                <div className="hidden print:block pt-8 mt-8 border-t-2 border-gray-400">
                    <p className="text-right text-xs mb-6">
                        {activeEvent.city || 'Ngawi'}, {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}
                    </p>
                    <div className="grid grid-cols-3 gap-8 text-center text-xs">
                        <div>
                            <p className="font-bold text-gray-800">Technical Delegate</p>
                            <div className="h-20"></div>
                            <p className="border-t border-black font-semibold pt-1">( ............................................ )</p>
                        </div>
                        <div>
                            <p className="font-bold text-gray-800">Ketua Dewan Wasit</p>
                            <div className="h-20"></div>
                            <p className="border-t border-black font-semibold pt-1">( ............................................ )</p>
                        </div>
                        <div>
                            <p className="font-bold text-gray-800">Ketua Panitia Pelaksana</p>
                            <div className="h-20"></div>
                            <p className="border-t border-black font-semibold pt-1">( ............................................ )</p>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

