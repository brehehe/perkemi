import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import Button from '@/Components/UI/Elements/Button';
import { Link } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import {
    FilterPillGroup,
    TabEmptyState,
    TabPagination,
    TabPanelMotion,
    TabSearchInput,
    TabSectionHeader,
} from './PublicEventTabPrimitives';

const CATEGORIES_PAGE_SIZE = 12;
const SCHEDULE_PAGE_SIZE = 18;
const CHAMPIONS_PAGE_SIZE = 8;
const CONTINGENTS_PAGE_SIZE = 12;
const REFEREES_PAGE_SIZE = 12;

function Icon({ name, className = '' }) {
    return <i className={`fa-solid ${name} ${className}`} aria-hidden="true" />;
}

function getGenderLabel(gender) {
    if (gender === 'male') {
        return 'Putra';
    }
    if (gender === 'female') {
        return 'Putri';
    }
    if (gender === 'mixed') {
        return 'Campuran';
    }
    return gender || 'Campuran';
}

function RefereeCard({ referee }) {
    const initials =
        referee.name
            ?.split(' ')
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase() || 'WS';

    return (
        <article className="event-referee-card min-w-0">
            {referee.photo_url ? (
                <img
                    src={referee.photo_url}
                    alt={`Foto ${referee.name}`}
                    loading="lazy"
                    className="event-referee-photo"
                />
            ) : (
                <span className="event-referee-photo event-referee-initials" aria-hidden="true">
                    {initials}
                </span>
            )}
            <div className="min-w-0 flex-1">
                <h3 className="break-words">{referee.name}</h3>
                <p className="event-accent mt-1 text-sm font-semibold">{referee.role}</p>
                <p className="event-muted mt-2 break-words text-xs leading-5">
                    {[referee.certification, referee.dan_grade, referee.region]
                        .filter(Boolean)
                        .join(' · ') || 'Profil perwasitan event'}
                </p>
            </div>
        </article>
    );
}

function ChampionGroup({ group }) {
    const medal = { 1: '🥇', 2: '🥈', 3: '🥉', 4: '🥉' };

    return (
        <article className="event-champion-group min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="event-accent text-xs font-bold uppercase tracking-[.12em]">
                        {group.type === 'randori' ? 'Randori' : 'Embu'}
                    </p>
                    <h3 className="mt-1 break-words">{group.category}</h3>
                </div>
                <span
                    className={`event-classification shrink-0 ${
                        group.is_exhibition ? 'event-classification-exhibition' : ''
                    }`}
                >
                    {group.is_exhibition ? 'Ekshibisi' : 'Non-ekshibisi'}
                </span>
            </div>

            <ol className="mt-5 grid gap-2">
                {(group.champions || []).map((champion) => (
                    <li key={champion.id} className="event-champion-row">
                        <span className="shrink-0 text-xl" aria-hidden="true">
                            {medal[champion.rank] || '🏅'}
                        </span>
                        <span className="min-w-0 flex-1">
                            <strong>{champion.rank_label}</strong>
                            <span>{champion.participant}</span>
                        </span>
                        {champion.contingent && (
                            <small className="min-w-0">{champion.contingent}</small>
                        )}
                    </li>
                ))}
            </ol>
        </article>
    );
}

export function CategoriesTab({
    ageCategories = [],
    matchCategories = [],
    participantRequirements = [],
}) {
    const [typeFilter, setTypeFilter] = useState('__all__');
    const [genderFilter, setGenderFilter] = useState('__all__');
    const [ageFilter, setAgeFilter] = useState('__all__');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [typeFilter, genderFilter, ageFilter, searchQuery]);

    const ageNameMap = useMemo(() => {
        const map = new Map();
        ageCategories.forEach((age) => {
            map.set(age.id, age.name);
        });
        return map;
    }, [ageCategories]);

    const filteredCategories = useMemo(() => {
        const term = searchQuery.trim().toLowerCase();

        return matchCategories.filter((cat) => {
            if (typeFilter !== '__all__' && cat.type !== typeFilter) {
                return false;
            }
            if (genderFilter !== '__all__' && cat.gender !== genderFilter) {
                return false;
            }
            if (ageFilter !== '__all__' && String(cat.age_category_id) !== String(ageFilter)) {
                return false;
            }
            if (term) {
                const ageName = ageNameMap.get(cat.age_category_id) || '';
                const text = [
                    cat.name,
                    cat.type,
                    getGenderLabel(cat.gender),
                    cat.weight_range,
                    ageName,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                if (!text.includes(term)) {
                    return false;
                }
            }
            return true;
        });
    }, [matchCategories, typeFilter, genderFilter, ageFilter, searchQuery, ageNameMap]);

    const totalPages = Math.max(1, Math.ceil(filteredCategories.length / CATEGORIES_PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pagedCategories = useMemo(() => {
        const start = (safePage - 1) * CATEGORIES_PAGE_SIZE;
        return filteredCategories.slice(start, start + CATEGORIES_PAGE_SIZE);
    }, [filteredCategories, safePage]);

    const ageOptions = useMemo(() => {
        if (ageCategories.length <= 1) {
            return [];
        }
        return [
            { value: '__all__', label: 'Semua Kelompok Usia' },
            ...ageCategories.map((age) => ({
                value: String(age.id),
                label: age.name,
            })),
        ];
    }, [ageCategories]);

    return (
        <TabPanelMotion tabKey="categories-panel">
            {participantRequirements?.length > 0 && (
                <div className="rounded-xl border border-[var(--event-border)] bg-[var(--event-surface)] p-5">
                    <h3 className="text-base font-semibold text-[var(--event-ink)]">
                        Persyaratan peserta
                    </h3>
                    <p className="event-muted mt-1 text-xs">
                        Ketentuan usia dan sekolah yang berlaku untuk event ini.
                    </p>
                    <ul className="event-muted mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6">
                        {participantRequirements.map((line) => (
                            <li key={line}>{line}</li>
                        ))}
                    </ul>
                </div>
            )}

            <TabSectionHeader
                title="Kategori pertandingan"
                subtitle="Temukan nomor tanding yang sesuai dengan usia dan tingkatan atlet."
                count={filteredCategories.length}
            />

            {/* Kelompok Umur (preserved .event-eligibility design, safe text wrapping on mobile) */}
            <div className={`grid gap-4 ${ageCategories.length > 1 ? 'md:grid-cols-2' : ''}`}>
                {ageCategories.length > 0 ? (
                    ageCategories.map((category) => (
                        <div
                            key={category.id}
                            className="event-eligibility grid min-w-0 gap-4 sm:grid-cols-[minmax(140px,0.75fr)_minmax(0,1.8fr)] sm:gap-8"
                        >
                            <div className="min-w-0">
                                <h3 className="break-words">{category.name}</h3>
                                {category.age_range && (
                                    <p className="event-accent mt-1.5 break-words text-sm font-medium leading-snug">
                                        {category.age_range}
                                    </p>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="event-muted break-words text-sm leading-7">
                                    {category.description ||
                                        'Peserta mengikuti ketentuan usia yang ditetapkan panitia.'}
                                </p>
                                <p className="event-muted mt-3 text-xs">
                                    Tarif kategori{' '}
                                    <span className="event-strong ml-2 font-semibold">
                                        {category.fee_formatted}
                                    </span>
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="event-empty">Ketentuan kelompok umur akan diumumkan panitia.</p>
                )}
            </div>

            {/* Filter terpisah untuk daftar nomor pertandingan */}
            <div className="space-y-3 rounded-xl border border-[var(--event-border)] bg-[var(--event-surface)] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="event-filters inline-flex flex-wrap gap-1" role="group" aria-label="Filter jenis pertandingan">
                            {[
                                ['__all__', 'Semua', matchCategories.length],
                                ['embu', 'Embu', matchCategories.filter((c) => c.type === 'embu').length],
                                ['randori', 'Randori', matchCategories.filter((c) => c.type === 'randori').length],
                            ].map(([value, label, count]) => (
                                <Button
                                    key={value}
                                    variant="unstyled"
                                    size="none"
                                    className="event-filter"
                                    aria-pressed={typeFilter === value}
                                    onClick={() => setTypeFilter(value)}
                                >
                                    {label} ({count})
                                </Button>
                            ))}
                        </div>

                        <FilterPillGroup
                            label="Filter Gender"
                            value={genderFilter}
                            onChange={setGenderFilter}
                            options={[
                                { value: '__all__', label: 'Semua' },
                                { value: 'male', label: 'Putra' },
                                { value: 'female', label: 'Putri' },
                                { value: 'mixed', label: 'Campuran' },
                            ]}
                        />
                    </div>

                    <TabSearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Cari nomor pertandingan..."
                        ariaLabel="Cari nomor pertandingan"
                    />
                </div>

                {ageOptions.length > 0 && (
                    <div className="border-t border-[var(--event-border)] pt-3">
                        <FilterPillGroup
                            label="Filter Kelompok Usia"
                            options={ageOptions}
                            value={ageFilter}
                            onChange={setAgeFilter}
                        />
                    </div>
                )}
            </div>

            {pagedCategories.length === 0 ? (
                <TabEmptyState
                    title="Tidak ada nomor pertandingan cocok"
                    description="Ubah filter jenis, gender, usia, atau kata kunci pencarian."
                    actionLabel="Reset Filter Kategori"
                    onAction={() => {
                        setTypeFilter('__all__');
                        setGenderFilter('__all__');
                        setAgeFilter('__all__');
                        setSearchQuery('');
                    }}
                />
            ) : (
                <>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${typeFilter}-${genderFilter}-${ageFilter}-${safePage}`}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.16 }}
                            className="event-table-wrap"
                        >
                            <TableContainer ariaLabel="Daftar nomor pertandingan, geser untuk melihat semua kolom">
                                <table className="event-table responsive-data-table w-full text-left text-sm">
                                    <thead>
                                        <tr>
                                            <th scope="col">Nomor pertandingan</th>
                                            <th scope="col">Jenis</th>
                                            <th scope="col">Peserta</th>
                                            <th scope="col">Tingkatan</th>
                                            <th scope="col">Berat badan</th>
                                            <th scope="col" className="text-right">
                                                Kapasitas
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagedCategories.map((category) => (
                                            <tr key={category.id}>
                                                <th scope="row" className="whitespace-normal font-medium">
                                                    {category.name}
                                                </th>
                                                <td>
                                                    <span
                                                        className={`event-match-type ${
                                                            category.type === 'randori'
                                                                ? 'event-match-randori'
                                                                : ''
                                                        }`}
                                                    >
                                                        {category.type === 'randori'
                                                            ? 'Randori'
                                                            : category.type === 'embu'
                                                              ? 'Embu'
                                                              : category.type}
                                                    </span>
                                                </td>
                                                <td>{getGenderLabel(category.gender)}</td>
                                                <td>
                                                    {category.min_kyu && category.max_kyu
                                                        ? category.min_kyu === category.max_kyu
                                                            ? category.min_kyu
                                                            : `${category.min_kyu} – ${category.max_kyu}`
                                                        : '—'}
                                                </td>
                                                <td>{category.weight_range || '—'}</td>
                                                <td className="text-right">
                                                    {category.capacity
                                                        ? `${category.capacity} peserta`
                                                        : 'Tidak dibatasi'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </TableContainer>
                        </motion.div>
                    </AnimatePresence>

                    <TabPagination
                        currentPage={safePage}
                        totalPages={totalPages}
                        totalItems={filteredCategories.length}
                        pageSize={CATEGORIES_PAGE_SIZE}
                        onPageChange={setCurrentPage}
                    />
                </>
            )}
        </TabPanelMotion>
    );
}

export function CourtsTab({ courts = [], event, copiedId, onCopy, onShowQr }) {
    const mapsHref =
        event?.google_maps_url ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            [event?.venue, event?.city, event?.province].filter(Boolean).join(', '),
        )}`;

    return (
        <TabPanelMotion tabKey="courts-panel">
            <TabSectionHeader
                title="Lokasi & layar monitor gelanggang"
                subtitle="Pantau langsung skor, antrean partai, dan waktu pertandingan per gelanggang secara publik (tanpa login)."
                count={courts.length}
            />

            <div className="grid gap-7 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12">
                <div className="event-venue flex min-w-0 flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 p-5 shadow-xs sm:p-7 dark:border-slate-800 dark:bg-slate-900/60">
                    <div>
                        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-800 dark:border-red-800/40 dark:bg-red-950/50 dark:text-red-300">
                            <Icon name="fa-location-dot" className="text-xs text-red-600 dark:text-red-400" />
                            Lokasi Arena
                        </div>
                        <h3 className="break-words text-xl font-black leading-snug text-slate-950 sm:text-2xl dark:text-white">
                            {event?.venue || 'Lokasi akan diumumkan'}
                        </h3>
                        <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                            <Icon name="fa-city" className="shrink-0 text-xs text-slate-400" />
                            <span>
                                {[event?.city, event?.province].filter(Boolean).join(', ') ||
                                    'Lokasi Kota/Provinsi belum dicatat'}
                            </span>
                        </p>
                        <div className="mt-5">
                            <a
                                href={mapsHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-2xs transition hover:border-red-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-red-500 dark:hover:bg-slate-700/60"
                                title="Buka petunjuk arah di Google Maps"
                            >
                                <Icon name="fa-map-location-dot" className="text-sm text-red-600 dark:text-red-400" />
                                Buka Google Maps
                            </a>
                        </div>
                    </div>
                    {event?.dates_formatted && (
                        <div className="mt-8 flex items-center gap-2 border-t border-slate-200 pt-5 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
                            <Icon name="fa-calendar-days" className="text-amber-600 dark:text-amber-400" />
                            <span className="font-semibold">{event.dates_formatted}</span>
                        </div>
                    )}
                </div>

                <div className="event-courts grid min-w-0 gap-6">
                    {courts.length > 0 ? (
                        courts.map((court) => {
                            const copyKey = `court-${court.id}`;
                            return (
                                <article
                                    key={court.id}
                                    id={`court-${court.id}`}
                                    className="relative min-w-0 scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs transition-all hover:border-amber-300 hover:shadow-md sm:p-6 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-amber-500/40"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700 shadow-2xs dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
                                                <Icon name="fa-tv" className="text-lg" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="truncate text-lg font-black leading-snug tracking-tight text-slate-950 sm:text-xl dark:text-white">
                                                    {court.name}
                                                </h3>
                                                {court.location && (
                                                    <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                                                        <Icon
                                                            name="fa-location-dot"
                                                            className="shrink-0 text-[10px] text-amber-600 dark:text-amber-400"
                                                        />
                                                        <span className="truncate">{court.location}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            {court.active_match ? (
                                                <span
                                                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                                                        court.active_match.status === 'in_progress'
                                                            ? 'animate-pulse border border-red-300 bg-red-100 text-red-950 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200'
                                                            : 'border border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-200'
                                                    }`}
                                                >
                                                    <span
                                                        className={`h-2 w-2 rounded-full ${
                                                            court.active_match.status === 'in_progress'
                                                                ? 'bg-red-600 dark:bg-red-400'
                                                                : 'bg-amber-500'
                                                        }`}
                                                    />
                                                    {court.active_match.status_label || 'LIVE'}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                                                    Standby
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {court.active_match ? (
                                        <div className="mt-4 space-y-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                                <span className="font-bold text-slate-900 dark:text-slate-100">
                                                    {court.active_match.category}
                                                </span>
                                                <span className="font-mono text-slate-500 dark:text-slate-400">
                                                    Partai #{court.active_match.sequence}
                                                    {court.active_match.round ? ` · ${court.active_match.round}` : ''}
                                                </span>
                                            </div>

                                            {court.active_match.type === 'randori' ||
                                            court.active_match.aka_score !== null ? (
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <div className="relative overflow-hidden rounded-xl border-2 border-red-500/40 bg-gradient-to-br from-red-50 via-white to-red-50/50 p-4 shadow-2xs dark:from-red-950/40 dark:via-red-900/20 dark:to-slate-900">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <span className="rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-2xs">
                                                                AKA (MERAH)
                                                            </span>
                                                            {Boolean(court.active_match.aka_waza_ari) && (
                                                                <span className="rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-200">
                                                                    Waza-ari: {court.active_match.aka_waza_ari}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="mt-2 line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">
                                                            {court.active_match.aka_label || 'Sudut Merah'}
                                                        </p>
                                                        {court.active_match.aka_contingent && (
                                                            <p className="mt-0.5 truncate text-xs font-medium text-rose-800/80 dark:text-rose-300/80">
                                                                {court.active_match.aka_contingent}
                                                            </p>
                                                        )}
                                                        <div className="mt-2 flex items-baseline justify-end">
                                                            <span className="text-4xl font-black tabular-nums text-red-600 dark:text-red-400">
                                                                {court.active_match.aka_score ?? 0}
                                                            </span>
                                                            <span className="ml-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                                                poin
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="relative overflow-hidden rounded-xl border-2 border-sky-500/40 bg-gradient-to-br from-sky-50 via-white to-sky-50/50 p-4 shadow-2xs dark:from-sky-950/40 dark:via-sky-900/20 dark:to-slate-900">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <span className="rounded-md bg-sky-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-2xs">
                                                                SHIRO (PUTIH)
                                                            </span>
                                                            {Boolean(court.active_match.shiro_waza_ari) && (
                                                                <span className="rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-200">
                                                                    Waza-ari: {court.active_match.shiro_waza_ari}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="mt-2 line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">
                                                            {court.active_match.shiro_label || 'Sudut Putih'}
                                                        </p>
                                                        {court.active_match.shiro_contingent && (
                                                            <p className="mt-0.5 truncate text-xs font-medium text-sky-800/80 dark:text-sky-300/80">
                                                                {court.active_match.shiro_contingent}
                                                            </p>
                                                        )}
                                                        <div className="mt-2 flex items-baseline justify-end">
                                                            <span className="text-4xl font-black tabular-nums text-sky-600 dark:text-sky-400">
                                                                {court.active_match.shiro_score ?? 0}
                                                            </span>
                                                            <span className="ml-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                                                poin
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/30 dark:bg-amber-950/20">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                        {court.active_match.participant || 'Penampilan Embu'}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                                        Skor:{' '}
                                                        <strong className="font-mono text-base text-amber-700 dark:text-amber-300">
                                                            {court.active_match.embu_final_score ??
                                                                court.active_match.score_display ??
                                                                '—'}
                                                        </strong>
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="mt-4 rounded-xl border border-dashed border-slate-200 py-5 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                            Belum ada pertandingan aktif di gelanggang ini.
                                        </p>
                                    )}

                                    {court.next_match && (
                                        <div className="mt-3.5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50 px-3.5 py-2 text-xs dark:border-slate-700/60 dark:bg-slate-800/60">
                                            <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                                Partai Selanjutnya
                                            </span>
                                            <span className="font-bold text-amber-600 dark:text-amber-400">
                                                #{court.next_match.sequence}
                                            </span>
                                            <span className="min-w-0 truncate font-medium text-slate-800 dark:text-slate-200">
                                                {court.next_match.participant}
                                            </span>
                                            <span className="font-normal text-slate-500 dark:text-slate-400">
                                                ({court.next_match.category}
                                                {court.next_match.round ? ` · ${court.next_match.round}` : ''})
                                            </span>
                                        </div>
                                    )}

                                    <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {court.monitor_url && (
                                                <a
                                                    href={court.monitor_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-red-800"
                                                    title={`Buka monitor layar penuh ${court.name}`}
                                                >
                                                    <Icon name="fa-tv" /> Buka Layar Penuh
                                                </a>
                                            )}
                                            {court.qr_url && onShowQr && (
                                                <Button
                                                    type="button"
                                                    variant="unstyled"
                                                    size="none"
                                                    onClick={() => onShowQr(court)}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/60"
                                                    title="Tampilkan QR code untuk scan dari HP tribun"
                                                >
                                                    <Icon
                                                        name="fa-qrcode"
                                                        className="text-sm text-slate-600 dark:text-slate-400"
                                                    />
                                                    QR Code Penonton
                                                </Button>
                                            )}
                                            {court.monitor_full_url && onCopy && (
                                                <Button
                                                    type="button"
                                                    variant="unstyled"
                                                    size="none"
                                                    onClick={() => onCopy(court.monitor_full_url, copyKey)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                                                    title="Salin tautan monitor gelanggang"
                                                >
                                                    <Icon
                                                        name={
                                                            copiedId === copyKey
                                                                ? 'fa-check text-emerald-600'
                                                                : 'fa-copy'
                                                        }
                                                    />
                                                    <span>
                                                        {copiedId === copyKey ? 'Tersalin!' : 'Salin Link'}
                                                    </span>
                                                </Button>
                                            )}
                                        </div>

                                        {court.qr_url && onShowQr && (
                                            <button
                                                type="button"
                                                onClick={() => onShowQr(court)}
                                                className="group flex items-center gap-2.5 self-start rounded-xl border border-slate-200 bg-white p-1.5 pr-3 text-left shadow-2xs transition hover:border-amber-400 hover:ring-2 hover:ring-amber-400/20 sm:self-auto dark:border-slate-700 dark:bg-slate-800"
                                                title="Klik untuk memperbesar QR Code"
                                            >
                                                <img
                                                    src={court.qr_url}
                                                    alt={`QR Code ${court.name}`}
                                                    width="44"
                                                    height="44"
                                                    className="h-11 w-11 rounded border border-slate-100 object-contain dark:border-slate-700"
                                                    loading="lazy"
                                                />
                                                <div className="text-[11px] leading-tight">
                                                    <span className="block font-bold text-slate-900 dark:text-white">
                                                        Scan HP
                                                    </span>
                                                    <span className="text-[9px] text-slate-500 dark:text-slate-400">
                                                        Buka di tribun
                                                    </span>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })
                    ) : (
                        <p className="event-empty">Pembagian gelanggang akan diumumkan panitia.</p>
                    )}
                </div>
            </div>
        </TabPanelMotion>
    );
}

export function ScheduleTab({ matchSchedule = [], rundowns = [] }) {
    const dates = useMemo(() => {
        const seen = new Map();
        matchSchedule.forEach((item) => {
            const key = item.date || item.date_label || 'all';
            if (!seen.has(key)) {
                seen.set(key, item.date_label || item.date || 'Semua Tanggal');
            }
        });
        return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
    }, [matchSchedule]);

    const [selectedDate, setSelectedDate] = useState(dates[0]?.value || '__all__');
    const [courtFilter, setCourtFilter] = useState('__all__');
    const [typeFilter, setTypeFilter] = useState('__all__');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (dates.length > 0 && !dates.some((d) => d.value === selectedDate) && selectedDate !== '__all__') {
            setSelectedDate(dates[0].value);
        }
    }, [dates, selectedDate]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedDate, courtFilter, typeFilter, searchQuery]);

    const courtOptions = useMemo(() => {
        const courtNames = Array.from(new Set(matchSchedule.map((m) => m.court).filter(Boolean)));
        if (courtNames.length <= 1) {
            return [];
        }
        return [
            { value: '__all__', label: 'Semua Gelanggang' },
            ...courtNames.map((c) => ({ value: c, label: c })),
        ];
    }, [matchSchedule]);

    const filteredSchedule = useMemo(() => {
        const term = searchQuery.trim().toLowerCase();

        return matchSchedule.filter((item) => {
            const itemDate = item.date || item.date_label || 'all';
            if (selectedDate !== '__all__' && itemDate !== selectedDate) {
                return false;
            }
            if (courtFilter !== '__all__' && item.court !== courtFilter) {
                return false;
            }
            if (typeFilter !== '__all__' && item.type !== typeFilter) {
                return false;
            }
            if (term) {
                const text = [item.category, item.participant, item.court, item.round]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                if (!text.includes(term)) {
                    return false;
                }
            }
            return true;
        });
    }, [matchSchedule, selectedDate, courtFilter, typeFilter, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredSchedule.length / SCHEDULE_PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pagedSchedule = useMemo(() => {
        const start = (safePage - 1) * SCHEDULE_PAGE_SIZE;
        return filteredSchedule.slice(start, start + SCHEDULE_PAGE_SIZE);
    }, [filteredSchedule, safePage]);

    return (
        <TabPanelMotion tabKey="schedule-panel">
            <TabSectionHeader
                title="Jadwal pertandingan & rundown"
                subtitle="Filter terpisah per hari, gelanggang, dan nomor untuk memantau partai tanpa menggulir halaman panjang."
                count={filteredSchedule.length}
            />

            {matchSchedule.length === 0 ? (
                <TabEmptyState
                    title="Jadwal pertandingan belum diterbitkan"
                    description="Daftar partai dan jam bertanding akan tampil setelah penjadwalan selesai."
                />
            ) : (
                <>
                    <div className="space-y-3 rounded-xl border border-[var(--event-border)] bg-[var(--event-surface)] p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            {dates.length > 0 && (
                                <FilterPillGroup
                                    label="Filter Tanggal"
                                    options={
                                        dates.length > 1
                                            ? [...dates, { value: '__all__', label: 'Semua Hari' }]
                                            : dates
                                    }
                                    value={selectedDate}
                                    onChange={setSelectedDate}
                                />
                            )}
                            <TabSearchInput
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Cari nomor / peserta / partai..."
                                ariaLabel="Cari jadwal pertandingan"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--event-border)] pt-3">
                            <FilterPillGroup
                                label="Filter Jenis"
                                options={[
                                    { value: '__all__', label: 'Semua Jenis' },
                                    { value: 'embu', label: 'Embu' },
                                    { value: 'randori', label: 'Randori' },
                                ]}
                                value={typeFilter}
                                onChange={setTypeFilter}
                            />
                            <FilterPillGroup
                                label="Filter Gelanggang"
                                options={courtOptions}
                                value={courtFilter}
                                onChange={setCourtFilter}
                            />
                        </div>
                    </div>

                    {pagedSchedule.length === 0 ? (
                        <TabEmptyState
                            title="Tidak ada jadwal sesuai filter"
                            description="Coba pilih tanggal atau gelanggang lain."
                            actionLabel="Reset Filter Jadwal"
                            onAction={() => {
                                setSelectedDate(dates[0]?.value || '__all__');
                                setCourtFilter('__all__');
                                setTypeFilter('__all__');
                                setSearchQuery('');
                            }}
                        />
                    ) : (
                        <>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={`${selectedDate}-${courtFilter}-${typeFilter}-${safePage}`}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    transition={{ duration: 0.16 }}
                                    className="event-table-wrap"
                                >
                                    <TableContainer ariaLabel="Jadwal pertandingan event, geser untuk melihat semua kolom">
                                        <table className="event-table responsive-data-table w-full text-left text-sm">
                                            <thead>
                                                <tr>
                                                    <th scope="col">Waktu</th>
                                                    <th scope="col">Gelanggang</th>
                                                    <th scope="col">Nomor &amp; babak</th>
                                                    <th scope="col">Peserta / partai</th>
                                                    <th scope="col" className="text-right">
                                                        Status
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pagedSchedule.map((item) => (
                                                    <tr key={item.id}>
                                                        <td className="whitespace-nowrap font-mono text-xs">
                                                            {item.time || '-'}
                                                            {item.end_time ? ` – ${item.end_time}` : ''}
                                                        </td>
                                                        <td className="whitespace-nowrap text-xs font-medium">
                                                            {item.court || '—'}
                                                        </td>
                                                        <td>
                                                            <div className="font-medium text-[var(--event-ink)]">
                                                                {item.category}
                                                            </div>
                                                            <div className="event-muted text-xs">
                                                                {[
                                                                    item.sequence ? `Partai #${item.sequence}` : null,
                                                                    item.round,
                                                                ]
                                                                    .filter(Boolean)
                                                                    .join(' · ')}
                                                            </div>
                                                        </td>
                                                        <td className="whitespace-normal text-xs">
                                                            {item.participant || '—'}
                                                        </td>
                                                        <td className="text-right whitespace-nowrap">
                                                            <span className="inline-flex rounded-full border border-[var(--event-border)] bg-[var(--event-surface)] px-2.5 py-0.5 text-[11px] font-semibold">
                                                                {item.status === 'in_progress'
                                                                    ? 'Berlangsung'
                                                                    : item.status === 'completed'
                                                                      ? 'Selesai'
                                                                      : 'Terjadwal'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </TableContainer>
                                </motion.div>
                            </AnimatePresence>

                            <TabPagination
                                currentPage={safePage}
                                totalPages={totalPages}
                                totalItems={filteredSchedule.length}
                                pageSize={SCHEDULE_PAGE_SIZE}
                                onPageChange={setCurrentPage}
                            />
                        </>
                    )}
                </>
            )}

            {rundowns.length > 0 && (
                <details className="event-rundown">
                    <summary>Susunan acara resmi / rundown ({rundowns.length})</summary>
                    <div className="mt-3 divide-y divide-[var(--event-border)] border-t border-[var(--event-border)] pt-2">
                        {rundowns.map((row) => (
                            <div
                                key={row.id}
                                className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <p className="text-sm font-medium text-[var(--event-ink)]">{row.name}</p>
                                    {row.description && (
                                        <p className="event-muted text-xs">{row.description}</p>
                                    )}
                                </div>
                                <span className="event-muted shrink-0 font-mono text-xs">
                                    {row.date_formatted ||
                                        [row.date_only, row.time_only].filter(Boolean).join(' · ')}
                                </span>
                            </div>
                        ))}
                    </div>
                </details>
            )}
        </TabPanelMotion>
    );
}

export function ChampionsTab({ championGroups = [] }) {
    const [typeFilter, setTypeFilter] = useState('__all__');
    const [exhibitionFilter, setExhibitionFilter] = useState('__all__');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [typeFilter, exhibitionFilter, searchQuery]);

    const filteredGroups = useMemo(() => {
        const term = searchQuery.trim().toLowerCase();

        return championGroups.filter((group) => {
            if (typeFilter !== '__all__' && group.type !== typeFilter) {
                return false;
            }
            if (exhibitionFilter === 'regular' && group.is_exhibition) {
                return false;
            }
            if (exhibitionFilter === 'exhibition' && !group.is_exhibition) {
                return false;
            }
            if (term) {
                const championsText = (group.champions || [])
                    .map((c) => `${c.participant || ''} ${c.contingent || ''}`)
                    .join(' ');
                const text = `${group.category || ''} ${championsText}`.toLowerCase();
                if (!text.includes(term)) {
                    return false;
                }
            }
            return true;
        });
    }, [championGroups, typeFilter, exhibitionFilter, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredGroups.length / CHAMPIONS_PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pagedGroups = useMemo(() => {
        const start = (safePage - 1) * CHAMPIONS_PAGE_SIZE;
        return filteredGroups.slice(start, start + CHAMPIONS_PAGE_SIZE);
    }, [filteredGroups, safePage]);

    return (
        <TabPanelMotion tabKey="champions-panel">
            <TabSectionHeader
                title="Hasil juara & podium medali"
                subtitle="Daftar peraih medali per nomor pertandingan dengan pencarian kontingen dan atlet."
                count={filteredGroups.length}
            />

            {championGroups.length === 0 ? (
                <TabEmptyState
                    title="Hasil juara belum dipublikasikan"
                    description="Podium juara akan muncul otomatis setelah hasil pertandingan disahkan."
                />
            ) : (
                <>
                    <div className="flex flex-col gap-3 rounded-xl border border-[var(--event-border)] bg-[var(--event-surface)] p-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap items-center gap-3">
                            <FilterPillGroup
                                label="Filter Jenis Juara"
                                options={[
                                    { value: '__all__', label: 'Semua' },
                                    { value: 'embu', label: 'Embu' },
                                    { value: 'randori', label: 'Randori' },
                                ]}
                                value={typeFilter}
                                onChange={setTypeFilter}
                            />
                            <FilterPillGroup
                                label="Filter Klasifikasi"
                                options={[
                                    { value: '__all__', label: 'Semua Kelas' },
                                    { value: 'regular', label: 'Non-ekshibisi' },
                                    { value: 'exhibition', label: 'Ekshibisi' },
                                ]}
                                value={exhibitionFilter}
                                onChange={setExhibitionFilter}
                            />
                        </div>
                        <TabSearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Cari juara / kontingen / nomor..."
                            ariaLabel="Cari hasil juara"
                        />
                    </div>

                    {pagedGroups.length === 0 ? (
                        <TabEmptyState
                            title="Tidak ada hasil juara cocok"
                            description="Coba ubah filter atau kata kunci pencarian."
                            actionLabel="Reset Filter Juara"
                            onAction={() => {
                                setTypeFilter('__all__');
                                setExhibitionFilter('__all__');
                                setSearchQuery('');
                            }}
                        />
                    ) : (
                        <>
                            <div className="grid min-w-0 gap-5 lg:grid-cols-2">
                                {pagedGroups.map((group) => (
                                    <ChampionGroup key={group.id} group={group} />
                                ))}
                            </div>

                            <TabPagination
                                currentPage={safePage}
                                totalPages={totalPages}
                                totalItems={filteredGroups.length}
                                pageSize={CHAMPIONS_PAGE_SIZE}
                                onPageChange={setCurrentPage}
                            />
                        </>
                    )}
                </>
            )}
        </TabPanelMotion>
    );
}

export function ContingentsTab({ contingents = [] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const filtered = useMemo(() => {
        const term = searchQuery.trim().toLowerCase();
        if (!term) {
            return contingents;
        }
        return contingents.filter((c) =>
            [c.name, c.city, c.province, c.manager_name]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(term),
        );
    }, [contingents, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / CONTINGENTS_PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const paged = useMemo(() => {
        const start = (safePage - 1) * CONTINGENTS_PAGE_SIZE;
        return filtered.slice(start, start + CONTINGENTS_PAGE_SIZE);
    }, [filtered, safePage]);

    return (
        <TabPanelMotion tabKey="contingents-panel">
            <TabSectionHeader
                title="Kontingen terdaftar"
                subtitle={`${contingents.length} kontingen dari berbagai daerah telah terdaftar untuk mengikuti kejuaraan.`}
                count={filtered.length}
                rightSlot={
                    <TabSearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Cari kontingen / daerah..."
                        ariaLabel="Cari kontingen"
                    />
                }
            />

            {paged.length === 0 ? (
                <TabEmptyState
                    title="Kontingen tidak ditemukan"
                    description="Coba kata kunci kota, provinsi, atau nama kontingen lain."
                    actionLabel={searchQuery ? 'Reset Pencarian' : undefined}
                    onAction={searchQuery ? () => setSearchQuery('') : undefined}
                />
            ) : (
                <>
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {paged.map((contingent) => (
                            <article
                                key={contingent.id}
                                className="flex min-w-0 flex-col justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs transition-all hover:border-amber-300 hover:shadow-md sm:p-5 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-amber-500/40"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-start justify-between gap-2.5">
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200/60 bg-red-50 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/50 dark:text-red-400">
                                                <Icon name="fa-flag" />
                                            </span>
                                            <h3
                                                className="truncate text-sm font-bold leading-snug text-slate-900 sm:text-base dark:text-white"
                                                title={contingent.name}
                                            >
                                                {contingent.name}
                                            </h3>
                                        </div>
                                        {typeof contingent.athletes_count === 'number' && (
                                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-950 shadow-2xs dark:border-amber-700/80 dark:bg-amber-950/80 dark:text-amber-200">
                                                <Icon
                                                    name="fa-user-group"
                                                    className="text-[10px] text-amber-800 dark:text-amber-400"
                                                />
                                                {contingent.athletes_count} atlet
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                                        <Icon
                                            name="fa-location-dot"
                                            className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500"
                                        />
                                        <span className="truncate">
                                            {[contingent.city, contingent.province]
                                                .filter(Boolean)
                                                .join(', ') || 'Daerah belum disetel'}
                                        </span>
                                    </p>
                                </div>
                                {contingent.manager_name && (
                                    <div className="flex items-center gap-1.5 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                        <Icon
                                            name="fa-user-tie"
                                            className="shrink-0 text-[10px] text-slate-400"
                                        />
                                        <span className="text-slate-400 dark:text-slate-500">Manajer:</span>
                                        <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
                                            {contingent.manager_name}
                                        </span>
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>

                    <TabPagination
                        currentPage={safePage}
                        totalPages={totalPages}
                        totalItems={filtered.length}
                        pageSize={CONTINGENTS_PAGE_SIZE}
                        onPageChange={setCurrentPage}
                    />
                </>
            )}
        </TabPanelMotion>
    );
}

export function RefereesTab({ referees = [] }) {
    const [roleFilter, setRoleFilter] = useState('__all__');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [roleFilter, searchQuery]);

    const roleOptions = useMemo(() => {
        const roles = Array.from(new Set(referees.map((r) => r.role).filter(Boolean)));
        if (roles.length <= 1) {
            return [];
        }
        return [
            { value: '__all__', label: 'Semua Peran', count: referees.length },
            ...roles.map((role) => ({
                value: role,
                label: role,
                count: referees.filter((r) => r.role === role).length,
            })),
        ];
    }, [referees]);

    const filtered = useMemo(() => {
        const term = searchQuery.trim().toLowerCase();
        return referees.filter((ref) => {
            if (roleFilter !== '__all__' && ref.role !== roleFilter) {
                return false;
            }
            if (term) {
                const text = [ref.name, ref.role, ref.region, ref.certification, ref.dan_grade]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                if (!text.includes(term)) {
                    return false;
                }
            }
            return true;
        });
    }, [referees, roleFilter, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / REFEREES_PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const paged = useMemo(() => {
        const start = (safePage - 1) * REFEREES_PAGE_SIZE;
        return filtered.slice(start, start + REFEREES_PAGE_SIZE);
    }, [filtered, safePage]);

    return (
        <TabPanelMotion tabKey="referees-panel">
            <TabSectionHeader
                title="Perangkat pertandingan: wasit & juri"
                subtitle="Daftar wasit utama, juri, dan koordinator yang bertugas pada kejuaraan."
                count={filtered.length}
            />

            {referees.length === 0 ? (
                <TabEmptyState
                    title="Data wasit & juri belum tersedia"
                    description="Daftar perangkat pertandingan akan ditampilkan setelah ditetapkan oleh panitia."
                />
            ) : (
                <>
                    <div className="flex flex-col gap-3 rounded-xl border border-[var(--event-border)] bg-[var(--event-surface)] p-4 lg:flex-row lg:items-center lg:justify-between">
                        <FilterPillGroup
                            label="Filter Peran Wasit"
                            options={roleOptions}
                            value={roleFilter}
                            onChange={setRoleFilter}
                        />
                        <TabSearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Cari nama wasit / daerah..."
                            ariaLabel="Cari wasit dan juri"
                        />
                    </div>

                    {paged.length === 0 ? (
                        <TabEmptyState
                            title="Wasit/Juri tidak ditemukan"
                            description="Coba pilih peran lain atau ubah pencarian."
                            actionLabel="Reset Filter Wasit"
                            onAction={() => {
                                setRoleFilter('__all__');
                                setSearchQuery('');
                            }}
                        />
                    ) : (
                        <>
                            <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {paged.map((ref) => (
                                    <RefereeCard key={ref.id} referee={ref} />
                                ))}
                            </div>

                            <TabPagination
                                currentPage={safePage}
                                totalPages={totalPages}
                                totalItems={filtered.length}
                                pageSize={REFEREES_PAGE_SIZE}
                                onPageChange={setCurrentPage}
                            />
                        </>
                    )}
                </>
            )}
        </TabPanelMotion>
    );
}

export function PaymentTab({
    event,
    ageCategories = [],
    paymentMethods = [],
    copiedId,
    onCopy,
    hasDashboard = false,
    actionHref = '/login',
}) {
    return (
        <TabPanelMotion tabKey="payment-panel">
            <TabSectionHeader
                title="Biaya & informasi pendaftaran"
                subtitle="Ketentuan administrasi, rekening pembayaran, dan narahubung panitia kejuaraan."
            />

            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-14">
                <div className="min-w-0">
                    <div className="event-payment-note flex items-start gap-4">
                        <Icon
                            name={event?.is_paid ? 'fa-circle-info' : 'fa-circle-check'}
                            className="event-accent mt-1 shrink-0 text-lg"
                        />
                        <div className="min-w-0">
                            <h3>
                                {event?.is_paid
                                    ? 'Pembayaran melalui rekening resmi'
                                    : 'Pendaftaran tanpa biaya'}
                            </h3>
                            <p className="event-muted mt-2 text-sm leading-7">
                                {event?.is_paid
                                    ? 'Transfer biaya kontingen dan atlet ke rekening resmi panitia. Simpan bukti transfer untuk diunggah saat verifikasi pendaftaran.'
                                    : 'Tidak ada biaya pendaftaran kontingen maupun atlet. Anda dapat melanjutkan pendaftaran tanpa mengunggah bukti pembayaran.'}
                            </p>
                        </div>
                    </div>

                    {event?.is_paid && (
                        <div className="mt-6 grid gap-4">
                            {paymentMethods.length > 0 ? (
                                paymentMethods.map((method) => {
                                    const copyKey = `pay-${method.id}`;
                                    return (
                                        <div key={method.id} className="event-bank min-w-0">
                                            <div className="flex items-center justify-between gap-3">
                                                <h3>{method.provider || method.name}</h3>
                                                <span className="event-muted text-xs capitalize">
                                                    {method.type}
                                                </span>
                                            </div>
                                            <p className="event-muted mt-5 mb-2 text-xs">
                                                Nomor rekening / akun
                                            </p>
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <span className="min-w-0 break-all text-lg font-semibold tabular-nums select-all">
                                                    {method.account_number}
                                                </span>
                                                {method.account_number && onCopy && (
                                                    <Button
                                                        variant="unstyled"
                                                        size="none"
                                                        className="event-button event-button-secondary"
                                                        onClick={() => onCopy(method.account_number, copyKey)}
                                                        aria-label={`Salin nomor rekening ${
                                                            method.provider || method.name
                                                        }`}
                                                    >
                                                        {copiedId === copyKey ? 'Tersalin ✓' : 'Salin'}
                                                    </Button>
                                                )}
                                            </div>
                                            {method.account_name && (
                                                <p className="event-muted mt-3 text-sm">
                                                    Atas nama{' '}
                                                    <strong className="event-strong font-medium">
                                                        {method.account_name}
                                                    </strong>
                                                </p>
                                            )}
                                            {method.instructions && (
                                                <p className="event-muted mt-4 text-sm leading-6">
                                                    {method.instructions}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="event-empty">
                                    Informasi rekening akan diumumkan panitia.
                                </p>
                            )}
                        </div>
                    )}

                    {ageCategories.some((a) => a.fee_formatted) && (
                        <div className="mt-6 rounded-xl border border-[var(--event-border)] bg-[var(--event-surface)] p-5">
                            <h3 className="text-sm font-semibold text-[var(--event-ink)]">
                                Rincian tarif kategori usia
                            </h3>
                            <ul className="mt-3 divide-y divide-[var(--event-border)]">
                                {ageCategories.map((age) => (
                                    <li
                                        key={age.id}
                                        className="flex items-center justify-between gap-3 py-2.5 text-sm"
                                    >
                                        <span className="text-[var(--event-ink)]">{age.name}</span>
                                        <span className="event-accent font-semibold">
                                            {age.fee_formatted || '—'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <aside id="contact" className="event-contact min-w-0">
                    <p className="event-muted mb-3 text-sm">Narahubung panitia</p>
                    <h3>{event?.contact_person || 'Sekretariat panitia kejuaraan'}</h3>
                    {event?.contact_phone ? (
                        <a
                            href={`https://wa.me/${event.contact_phone
                                .replace(/[^0-9]/g, '')
                                .replace(/^0/, '62')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="event-button event-button-secondary mt-6"
                        >
                            <i className="fa-brands fa-whatsapp text-lg" aria-hidden="true" />
                            {event.contact_phone}
                        </a>
                    ) : (
                        <p className="event-muted mt-3 text-sm">Kontak panitia akan diumumkan.</p>
                    )}
                </aside>
            </div>

            <section className="event-registration flex flex-col items-start justify-between gap-7 lg:flex-row lg:items-center">
                <div>
                    <h2>
                        {hasDashboard
                            ? 'Kelola keikutsertaan Anda.'
                            : 'Persiapkan kontingen Anda.'}
                    </h2>
                    <p>
                        {hasDashboard
                            ? 'Lanjutkan pengelolaan data dan pendaftaran melalui dashboard.'
                            : 'Lengkapi data kontingen dan atlet untuk mengikuti kejuaraan.'}
                    </p>
                    {!hasDashboard && event?.registration_end_formatted && (
                        <p className="event-registration-deadline">
                            Pendaftaran hingga {event.registration_end_formatted}
                        </p>
                    )}
                </div>
                <Link href={actionHref} className="event-button event-button-light shrink-0">
                    {hasDashboard ? 'Buka dashboard' : 'Daftar kontingen'}
                    <Icon name="fa-arrow-right" className="text-xs" />
                </Link>
            </section>
        </TabPanelMotion>
    );
}
