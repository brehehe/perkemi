import Button from '@/Components/UI/Elements/Button';
import ThemeToggle from '@/Components/UI/Elements/ThemeToggle';
import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import Select from '@/Components/UI/Forms/Select';
import { Head, Link } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

const eventStatuses = {
    open_registration: { label: 'Pendaftaran dibuka', tone: 'open' },
    ongoing: { label: 'Kejuaraan berlangsung', tone: 'ongoing' },
    completed: { label: 'Kejuaraan selesai', tone: 'closed' },
};

function Icon({ name, className = '' }) {
    return <i className={`fa-solid ${name} ${className}`} aria-hidden="true" />;
}

function SectionHeading({ title, description, children }) {
    return (
        <div className="event-section-heading flex flex-wrap items-end justify-between gap-5">
            <div>
                <h2>{title}</h2>
                <p>{description}</p>
            </div>
            {children}
        </div>
    );
}

function RefereeCard({ referee }) {
    const initials = referee.name?.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'WS';

    return (
        <article className="event-referee-card">
            {referee.photo_url
                ? <img src={referee.photo_url} alt={`Foto ${referee.name}`} loading="lazy" className="event-referee-photo" />
                : <span className="event-referee-photo event-referee-initials" aria-hidden="true">{initials}</span>}
            <div className="min-w-0">
                <h3>{referee.name}</h3>
                <p className="event-accent mt-1 text-sm font-semibold">{referee.role}</p>
                <p className="event-muted mt-2 text-xs leading-5">{[referee.certification, referee.dan_grade, referee.region].filter(Boolean).join(' · ') || 'Profil perwasitan event'}</p>
            </div>
        </article>
    );
}

function ChampionGroup({ group }) {
    const medal = { 1: '🥇', 2: '🥈', 3: '🥉', 4: '🥉' };

    return (
        <article className="event-champion-group">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="event-accent text-xs font-bold uppercase tracking-[.12em]">{group.type === 'randori' ? 'Randori' : 'Embu'}</p><h3 className="mt-1">{group.category}</h3></div>
                <span className={`event-classification ${group.is_exhibition ? 'event-classification-exhibition' : ''}`}>{group.is_exhibition ? 'Ekshibisi' : 'Non-ekshibisi'}</span>
            </div>
            <ol className="mt-5 grid gap-2">
                {group.champions.map((champion) => <li key={champion.id} className="event-champion-row"><span className="text-xl" aria-hidden="true">{medal[champion.rank] || '🏅'}</span><span className="min-w-0 flex-1"><strong>{champion.rank_label}</strong><span>{champion.participant}</span></span><small>{champion.contingent}</small></li>)}
            </ol>
        </article>
    );
}

function EmbuScoreCard({ score }) {
    return (
        <article className="event-score-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="event-accent text-xs font-bold">Partai #{score.sequence} · {score.round}{score.pool ? ` · Pool ${score.pool}` : ''}</p><h3 className="mt-1">{score.category}</h3><p className="event-muted mt-1 text-sm">{score.participant}</p></div>
                <div className="event-final-score"><span>Nilai akhir</span><strong>{Number(score.final_score).toFixed(2)}</strong></div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5">{score.judge_scores.map((judgeScore, index) => <div key={`${score.id}-${index}`} className="event-judge-score"><span>J{index + 1}</span><strong>{Number(judgeScore).toFixed(2)}</strong></div>)}</div>
            <div className="event-score-meta mt-4 flex flex-wrap gap-x-5 gap-y-2"><span>Skor tengah <strong>{Number(score.middle_score).toFixed(2)}</strong></span><span>Denda <strong>-{Number(score.penalty).toFixed(2)}</strong></span><span>{score.court || 'Court belum dicatat'}</span></div>
        </article>
    );
}

function RandoriBracket({ bracket }) {
    const maxMatchesInRound = Math.max(...bracket.rounds.map((round) => round.matches.length), 1);
    const bracketHeight = Math.max(maxMatchesInRound * 148, 296);

    return (
        <article className="event-bracket">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="event-accent text-xs font-bold uppercase tracking-[.12em]">Bagan {bracket.format?.replaceAll('_', ' ') || 'pertandingan'}</p><h3 className="mt-1">{bracket.category}</h3></div><span className="event-match-type">{bracket.status}</span></div>
            <div className="event-bracket-scroll mt-6" tabIndex="0" aria-label={`Bagan Randori ${bracket.category}, geser horizontal untuk melihat setiap babak`}>
                <div className="event-bracket-rounds" style={{ '--event-bracket-height': `${bracketHeight}px` }}>
                    {bracket.rounds.map((round, roundIndex) => {
                        const isFirstRound = roundIndex === 0;
                        const isLastRound = roundIndex === bracket.rounds.length - 1;
                        const connectorSpan = bracketHeight / Math.max(round.matches.length, 1);

                        return (
                            <section
                                key={round.name}
                                className={`event-bracket-round ${isFirstRound ? 'event-bracket-first' : ''} ${isLastRound ? 'event-bracket-last' : ''}`}
                                style={{ '--event-connector-span': `${connectorSpan}px` }}
                            >
                                <h4>{round.name}</h4>
                                <div className="event-bracket-matches">
                                    {round.matches.map((match, matchIndex) => {
                                        const akaAdvancesByBye = match.is_bye && match.aka?.toUpperCase() !== 'BYE';
                                        const shiroAdvancesByBye = match.is_bye && match.shiro?.toUpperCase() !== 'BYE';
                                        const startsPair = !isLastRound && matchIndex % 2 === 0 && matchIndex + 1 < round.matches.length;

                                        return (
                                            <div key={match.id} className={`event-bracket-match-slot ${match.is_bye ? 'event-bracket-bye' : ''}`}>
                                                {startsPair && <span className="event-bracket-pair-line" aria-hidden="true" />}
                                                <div className="event-bracket-match">
                                                    <div className={match.winner === 'aka' || akaAdvancesByBye ? 'event-bracket-winner' : ''}>
                                                        <span>{match.aka}</span>
                                                        <strong>{akaAdvancesByBye ? 'Lolos' : match.aka_score ?? '—'}</strong>
                                                    </div>
                                                    <div className={match.winner === 'shiro' || shiroAdvancesByBye ? 'event-bracket-winner' : ''}>
                                                        <span>{match.shiro}</span>
                                                        <strong>{shiroAdvancesByBye ? 'Lolos' : match.shiro_score ?? '—'}</strong>
                                                    </div>
                                                    <p>
                                                        <span>Partai #{match.sequence}{match.court ? ` · ${match.court}` : ''}{match.scheduled_at ? ` · ${match.scheduled_at}` : ''}</span>
                                                        {match.is_bye && <strong className="event-bye-badge">BYE</strong>}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>
        </article>
    );
}

function formatScheduleDate(date) {
    if (!date) {
        return 'Tanggal menyusul';
    }

    return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(`${date}T00:00:00`));
}

function formatScheduleTabDate(date) {
    if (!date) {
        return 'Menyusul';
    }

    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
    }).format(new Date(`${date}T00:00:00`));
}

function initialPublicFilter(key, fallback = 'all') {
    if (typeof window === 'undefined') {
        return fallback;
    }

    return new URLSearchParams(window.location.search).get(key) || fallback;
}

function updatePublicFilter(key, value, fallback = 'all') {
    if (typeof window === 'undefined') {
        return;
    }

    const url = new URL(window.location.href);

    if (!value || value === fallback) {
        url.searchParams.delete(key);
    } else {
        url.searchParams.set(key, value);
    }

    window.history.replaceState(window.history.state, '', url);
}

function handleDateTabKeyDown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        return;
    }

    const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll('[role="tab"]') || []);
    const currentIndex = tabs.indexOf(event.currentTarget);

    if (currentIndex < 0 || tabs.length === 0) {
        return;
    }

    event.preventDefault();

    const nextIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
            ? tabs.length - 1
            : event.key === 'ArrowRight'
                ? (currentIndex + 1) % tabs.length
                : (currentIndex - 1 + tabs.length) % tabs.length;

    tabs[nextIndex].click();
    tabs[nextIndex].focus();
}

export default function EventShow({
    auth = {},
    event,
    ageCategories = [],
    courts = [],
    matchCategories = [],
    rundowns = [],
    paymentMethods = [],
    referees = [],
    matchSchedule = [],
    championGroups = [],
    embuScores = [],
    randoriBrackets = [],
    canAccessDashboard = false,
    isHomepage = false,
}) {
    const [matchFilter, setMatchFilter] = useState('all');
    const [championFilter, setChampionFilter] = useState('all');
    const [activeScheduleDate, setActiveScheduleDate] = useState(() => initialPublicFilter('schedule_date', ''));
    const [embuScoreFilter, setEmbuScoreFilter] = useState(() => initialPublicFilter('embu_category'));
    const [randoriBracketFilter, setRandoriBracketFilter] = useState(() => initialPublicFilter('randori_bracket'));
    const [copiedAccount, setCopiedAccount] = useState(null);
    const [copyMessage, setCopyMessage] = useState('');
    const copyTimer = useRef(null);
    const status = eventStatuses[event.status] || { label: 'Dalam persiapan', tone: 'preparation' };
    const isAuthenticated = Boolean(auth?.user);
    const hasDashboard = canAccessDashboard;
    const dashboardHref = canAccessDashboard ? `/event/${event.slug}/admin` : (auth?.user?.dashboard_url || '/admin/dashboard');
    const registrationHref = `/event/${event.slug}/register`;
    const actionHref = hasDashboard ? dashboardHref : registrationHref;
    const filteredMatches = matchCategories.filter((category) => matchFilter === 'all' || category.type === matchFilter);
    const filteredChampionGroups = championGroups.filter((group) => championFilter === 'all' || group.type === championFilter);
    const championCounts = {
        all: championGroups.length,
        embu: championGroups.filter((group) => group.type === 'embu').length,
        randori: championGroups.filter((group) => group.type === 'randori').length,
    };
    const scheduleDays = useMemo(() => rundowns.reduce((days, session) => {
        const date = session.date_only || '';
        const day = days.find((item) => item.date === date);
        if (day) {
            day.sessions.push(session);
        } else {
            days.push({ date, sessions: [session] });
        }
        return days;
    }, []), [rundowns]);
    const matchScheduleDays = useMemo(() => matchSchedule.reduce((days, match) => {
        const day = days.find((item) => item.date === match.date);
        if (day) day.matches.push(match);
        else days.push({ date: match.date, dateLabel: match.date_label, matches: [match] });
        return days;
    }, []), [matchSchedule]);
    const selectedScheduleDay = matchScheduleDays.find((day) => day.date === activeScheduleDate) || matchScheduleDays[0];
    const embuScoreOptions = useMemo(() => {
        const categoryCounts = embuScores.reduce((counts, score) => {
            const category = score.category || 'Nomor Embu belum tercatat';
            counts.set(category, (counts.get(category) || 0) + 1);
            return counts;
        }, new Map());

        return [
            { value: 'all', label: 'Semua nomor Embu', sublabel: `${embuScores.length} hasil` },
            ...Array.from(categoryCounts, ([category, count]) => ({
                value: category,
                label: category,
                sublabel: `${count} hasil`,
            })),
        ];
    }, [embuScores]);
    const activeEmbuScoreFilter = embuScoreOptions.some((option) => option.value === embuScoreFilter) ? embuScoreFilter : 'all';
    const filteredEmbuScores = embuScores.filter((score) => (
        activeEmbuScoreFilter === 'all'
        || (score.category || 'Nomor Embu belum tercatat') === activeEmbuScoreFilter
    ));
    const randoriBracketOptions = useMemo(() => [
        { value: 'all', label: 'Semua bagan Randori', sublabel: `${randoriBrackets.length} bagan` },
        ...randoriBrackets.map((bracket) => ({
            value: bracket.id,
            label: bracket.category || 'Nomor Randori belum tercatat',
            sublabel: bracket.format?.replaceAll('_', ' ') || 'Bagan pertandingan',
        })),
    ], [randoriBrackets]);
    const activeRandoriBracketFilter = randoriBracketOptions.some((option) => String(option.value) === String(randoriBracketFilter)) ? randoriBracketFilter : 'all';
    const filteredRandoriBrackets = randoriBrackets.filter((bracket) => (
        activeRandoriBracketFilter === 'all' || String(bracket.id) === String(activeRandoriBracketFilter)
    ));

    useEffect(() => () => clearTimeout(copyTimer.current), []);

    const handleCopy = async (accountNumber, id) => {
        clearTimeout(copyTimer.current);
        setCopiedAccount(null);
        try {
            await navigator.clipboard.writeText(accountNumber);
            setCopiedAccount(id);
            setCopyMessage('Nomor rekening berhasil disalin.');
            copyTimer.current = setTimeout(() => {
                setCopiedAccount(null);
                setCopyMessage('');
            }, 2500);
        } catch {
            setCopyMessage('Nomor rekening belum tersalin. Silakan pilih dan salin nomor secara manual.');
        }
    };

    return (
        <div className="event-page min-h-screen antialiased">
            <Head title={`${event.name} - Smart PERKEMI`}>
                {event.description && <meta name="description" content={event.description} />}
            </Head>
            <a href="#event-content" className="event-skip-link">Langsung ke informasi kejuaraan</a>

            <header id="event-top" className="event-header">
                <div className="event-container flex min-h-20 items-center justify-between gap-4 py-3">
                    <Link href="/" className="event-brand flex shrink-0 items-center gap-3" aria-label="SMART PERKEMI, beranda">
                        <img src="/android-chrome-192x192.png" width="44" height="44" alt="" className="h-11 w-11 object-contain" />
                        <span>
                            <span className="event-brand-name block">SMART PERKEMI</span>
                            <span className="event-brand-caption block">Portal kejuaraan Shorinji Kempo</span>
                        </span>
                    </Link>
                    <nav aria-label="Navigasi utama" className="hidden items-center gap-7 xl:flex">
                        <a className="event-text-link" href="#referees">Wasit</a>
                        <Link className="event-text-link" href="/athelete">Peserta</Link>
                        <a className="event-text-link" href="#schedule">Jadwal</a>
                        <a className="event-text-link" href="#champions">Hasil Juara</a>
                        <a className="event-text-link" href="#embu-scores">Skor Embu</a>
                        <a className="event-text-link" href="#randori-bracket">Randori</a>
                    </nav>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <ThemeToggle />
                        {hasDashboard ? (
                            <>
                                <Link href="/logout" method="post" as="button" className="event-text-link hidden sm:inline-flex">Keluar</Link>
                                <Link href={dashboardHref} className="event-button event-button-primary">Dashboard</Link>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="event-text-link hidden sm:inline-flex">Masuk</Link>
                                <Link href={registrationHref} className="event-button event-button-primary">
                                    <span className="sm:hidden">Daftar</span><span className="hidden sm:inline">Daftar kontingen</span>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main id="event-content">
                <section className="event-hero" aria-labelledby="event-title">
                    <div className="event-container">
                        <div className="event-breadcrumb flex flex-wrap items-center gap-2 pt-7 text-xs sm:pt-9">
                            {isHomepage ? <span>Portal kejuaraan</span> : <Link href="/" className="event-text-link">Beranda</Link>}
                            <Icon name="fa-chevron-right" className="text-[8px]" />
                            <span>Informasi event</span>
                        </div>
                        <div className="grid items-center gap-10 py-9 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)] lg:gap-16 lg:pb-14 lg:pt-10">
                            <div className="min-w-0">
                                <div className={`event-status event-status-${status.tone}`}>
                                    <span aria-hidden="true" />{status.label}
                                </div>
                                <h1 id="event-title" className="event-title">{event.name}</h1>
                                {event.description && <p className="event-intro">{event.description}</p>}
                                <dl className="event-hero-details grid gap-5 sm:grid-cols-2">
                                    <div className="flex items-start gap-3">
                                        <Icon name="fa-calendar-days" className="event-detail-icon" />
                                        <div><dt>Pelaksanaan</dt><dd>{event.dates_formatted}</dd></div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Icon name="fa-location-dot" className="event-detail-icon" />
                                        <div><dt>Lokasi kejuaraan</dt><dd>{event.venue}{event.city && <span className="event-muted mt-1 block font-normal">{event.city}{event.province ? `, ${event.province}` : ''}</span>}</dd></div>
                                    </div>
                                </dl>
                                <div className="mt-8 flex flex-wrap items-center gap-3">
                                    <Link href={actionHref} className="event-button event-button-primary event-button-large">
                                        {hasDashboard ? 'Buka dashboard' : 'Daftarkan kontingen'}
                                        <Icon name={hasDashboard ? 'fa-gauge-high' : 'fa-arrow-right'} className="text-xs" />
                                    </Link>
                                    {event.rules_doc ? (
                                        <a href={event.rules_doc} target="_blank" rel="noreferrer" className="event-button event-button-secondary event-button-large">
                                            <Icon name="fa-file-arrow-down" />Proposal & juknis
                                        </a>
                                    ) : <a href="#categories" className="event-button event-button-secondary event-button-large">Lihat nomor pertandingan</a>}
                                </div>
                                {!isAuthenticated && <p className="event-login-note">Sudah memiliki akun? <Link href="/login">Masuk ke portal kontingen</Link></p>}
                            </div>
                            <figure className="event-poster mx-auto w-full max-w-sm lg:ml-auto lg:mr-0">
                                {event.cover_image_url ? (
                                    <a href={event.cover_image_url} target="_blank" rel="noreferrer" aria-label={`Lihat poster lengkap ${event.name}`} className="event-poster-link block">
                                        <img src={event.cover_image_url} alt={`Poster ${event.name}`} width="800" height="1000" fetchPriority="high" className="event-poster-image" />
                                    </a>
                                ) : (
                                    <div className="event-poster-placeholder flex aspect-[4/5] flex-col items-center justify-center gap-6 p-8 text-center">
                                        <img src="/android-chrome-192x192.png" width="100" height="100" alt="" />
                                        <p className="text-xl font-semibold">{event.name}</p>
                                        <p className="event-muted text-sm">Poster kejuaraan akan diumumkan panitia.</p>
                                    </div>
                                )}
                                <figcaption className="flex items-center justify-between gap-4 px-1 pt-4 text-xs">
                                    <span>{event.edition || 'Shorinji Kempo'}</span>
                                    {event.cover_image_url && <Icon name="fa-up-right-from-square" className="shrink-0" />}
                                </figcaption>
                            </figure>
                        </div>
                    </div>
                </section>

                <section className="event-summary" aria-label="Ringkasan pendaftaran">
                    <dl className="event-container grid grid-cols-2 lg:grid-cols-4">
                        <div><dt>Batas pendaftaran</dt><dd>{event.registration_end_formatted || 'Hingga kuota terpenuhi'}</dd></div>
                        <div><dt>Biaya kontingen</dt><dd>{event.is_paid ? event.fee_per_contingent_formatted : 'Gratis'}</dd></div>
                        <div><dt>Biaya per atlet</dt><dd>{event.is_paid ? event.fee_per_athlete_formatted : 'Gratis'}</dd></div>
                        <div><dt>Nomor per atlet</dt><dd>{event.max_match_categories_per_athlete > 0 ? `Maksimal ${event.max_match_categories_per_athlete} nomor` : 'Tidak dibatasi'}</dd></div>
                    </dl>
                </section>

                <div className="event-section-nav">
                    <nav className="event-container flex gap-7 overflow-x-auto sm:gap-10" aria-label="Navigasi informasi event">
                        <a href="#categories">Kategori pertandingan <span>{matchCategories.length}</span></a>
                        <a href="#referees">Wasit <span>{referees.length}</span></a>
                        <a href="#schedule">Jadwal <span>{matchSchedule.length}</span></a>
                        <a href="#champions">Hasil Juara <span>{championGroups.length}</span></a>
                        <a href="#embu-scores">Skor Embu <span>{embuScores.length}</span></a>
                        <a href="#randori-bracket">Randori <span>{randoriBrackets.length}</span></a>
                        <a href="#courts">Lokasi & gelanggang</a>
                        <a href="#payment">Biaya & kontak</a>
                    </nav>
                </div>

                <div className="event-container">
                    {event.participant_requirements?.length > 0 && <section className="event-section"><SectionHeading title="Persyaratan peserta" description="Ketentuan usia dan sekolah yang berlaku untuk event ini." /><ul className="event-muted mt-5 list-disc space-y-2 pl-5 text-sm leading-7">{event.participant_requirements.map((line) => <li key={line}>{line}</li>)}</ul></section>}
                    <section id="categories" className="event-section">
                        <SectionHeading title="Kategori pertandingan" description="Temukan nomor tanding yang sesuai dengan usia dan tingkatan atlet." />
                        <div className={`grid gap-4 ${ageCategories.length > 1 ? 'md:grid-cols-2' : ''}`}>
                            {ageCategories.length > 0 ? ageCategories.map((category) => (
                                <div key={category.id} className="event-eligibility grid gap-4 sm:grid-cols-[minmax(140px,0.65fr)_minmax(0,2fr)] sm:gap-8">
                                    <div><h3>{category.name}</h3><p className="event-accent mt-1 text-sm font-medium">{category.age_range}</p></div>
                                    <div>
                                        <p className="event-muted text-sm leading-7">{category.description || 'Peserta mengikuti ketentuan usia yang ditetapkan panitia.'}</p>
                                        <p className="event-muted mt-3 text-xs">Tarif kategori <span className="event-strong ml-2 font-semibold">{category.fee_formatted}</span></p>
                                    </div>
                                </div>
                            )) : <p className="event-empty">Ketentuan kelompok umur akan diumumkan panitia.</p>}
                        </div>

                        <div className="mb-5 mt-9 flex flex-wrap items-center justify-between gap-4">
                            <p className="event-muted text-sm" role="status"><strong className="event-strong font-semibold">{filteredMatches.length} nomor pertandingan</strong>{matchFilter !== 'all' ? ` ${matchFilter === 'embu' ? 'Embu' : 'Randori'}` : ' tersedia'}</p>
                            <div className="event-filters inline-flex gap-1" role="group" aria-label="Filter jenis pertandingan">
                                {[['all', 'Semua'], ['embu', 'Embu'], ['randori', 'Randori']].map(([value, label]) => (
                                    <Button key={value} variant="unstyled" size="none" className="event-filter" aria-pressed={matchFilter === value} onClick={() => setMatchFilter(value)}>{label}</Button>
                                ))}
                            </div>
                        </div>
                        <div className="event-table-wrap">
                            <TableContainer ariaLabel="Daftar nomor pertandingan, geser untuk melihat semua kolom">
                                <table className="event-table responsive-data-table w-full text-left text-sm">
                                    <thead><tr>
                                        <th scope="col">Nomor pertandingan</th><th scope="col">Jenis</th><th scope="col">Peserta</th><th scope="col">Tingkatan</th><th scope="col">Berat badan</th><th scope="col" className="text-right">Kapasitas</th>
                                    </tr></thead>
                                    <tbody>
                                        {filteredMatches.length > 0 ? filteredMatches.map((category) => (
                                            <tr key={category.id}>
                                                <th scope="row" className="whitespace-normal font-medium">{category.name}</th>
                                                <td><span className={`event-match-type ${category.type === 'randori' ? 'event-match-randori' : ''}`}>{category.type === 'randori' ? 'Randori' : category.type === 'embu' ? 'Embu' : category.type}</span></td>
                                                <td>{category.gender === 'male' ? 'Putra' : category.gender === 'female' ? 'Putri' : 'Campuran'}</td>
                                                <td>{category.min_kyu && category.max_kyu ? category.min_kyu === category.max_kyu ? category.min_kyu : `${category.min_kyu} – ${category.max_kyu}` : '—'}</td>
                                                <td>{category.weight_range || '—'}</td>
                                                <td className="text-right">{category.capacity ? `${category.capacity} peserta` : 'Tidak dibatasi'}</td>
                                            </tr>
                                        )) : <tr><td colSpan={6} className="event-empty">{matchCategories.length ? 'Belum ada nomor untuk jenis pertandingan ini.' : 'Nomor pertandingan akan diumumkan panitia.'}</td></tr>}
                                    </tbody>
                                </table>
                            </TableContainer>
                        </div>
                        <p className="event-muted mt-3 text-xs sm:hidden">Geser tabel ke samping untuk melihat seluruh informasi.</p>
                    </section>

                    <section id="referees" className="event-section">
                        <SectionHeading title="Wasit & juri event" description="Daftar korps Wasit yang terdaftar untuk memimpin dan menilai pertandingan." />
                        {referees.length > 0
                            ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{referees.map((referee) => <RefereeCard key={referee.id} referee={referee} />)}</div>
                            : <p className="event-empty">Susunan Wasit event akan diumumkan panitia.</p>}
                    </section>

                    <section id="schedule" className="event-section">
                        <SectionHeading title="Jadwal pertandingan" description="Urutan partai per court berdasarkan jadwal resmi panitia." />
                        {matchScheduleDays.length > 0 ? (
                            <div className="event-schedule">
                                <div className="event-date-tabs" role="tablist" aria-label="Pilih tanggal jadwal pertandingan">
                                    {matchScheduleDays.map((day, index) => {
                                        const isSelected = day.date === selectedScheduleDay?.date;
                                        return (
                                            <Button
                                                key={day.date || index}
                                                id={`schedule-tab-${index + 1}`}
                                                type="button"
                                                variant="unstyled"
                                                size="none"
                                                role="tab"
                                                aria-selected={isSelected}
                                                aria-controls="schedule-date-panel"
                                                tabIndex={isSelected ? 0 : -1}
                                                className="event-date-tab"
                                                onKeyDown={handleDateTabKeyDown}
                                                onClick={() => {
                                                    setActiveScheduleDate(day.date);
                                                    updatePublicFilter('schedule_date', day.date, '');
                                                }}
                                            >
                                                <span>Tanggal {index + 1}</span>
                                                <small>{formatScheduleTabDate(day.date)}</small>
                                            </Button>
                                        );
                                    })}
                                </div>
                                <div
                                    id="schedule-date-panel"
                                    role="tabpanel"
                                    aria-labelledby={`schedule-tab-${Math.max(matchScheduleDays.findIndex((day) => day.date === selectedScheduleDay?.date), 0) + 1}`}
                                    className="event-schedule-panel"
                                >
                                    <div className="event-schedule-day grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
                                        <h3>{selectedScheduleDay?.dateLabel || formatScheduleDate(selectedScheduleDay?.date)}</h3>
                                        <ol>
                                            {selectedScheduleDay?.matches.map((match) => (
                                                <li key={match.id} className="event-session grid grid-cols-[90px_minmax(0,1fr)] gap-4 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-7">
                                                    <div className="event-session-time">
                                                        <p>{match.time || 'Menyusul'}{match.end_time && <span className="block sm:inline"> – {match.end_time}</span>}</p>
                                                        {match.time && <span className="event-muted text-xs font-normal">WIB</span>}
                                                    </div>
                                                    <div><div className="flex flex-wrap items-center gap-2"><h4>{match.category}</h4><span className={`event-match-type ${match.type === 'randori' ? 'event-match-randori' : ''}`}>{match.type === 'randori' ? 'Randori' : 'Embu'}</span></div><p className="event-muted mt-2 text-sm leading-6">Partai #{match.sequence} · {match.round}{match.court ? ` · ${match.court}` : ''}</p>{match.participant && <p className="event-strong mt-1 text-sm font-medium">{match.participant}</p>}</div>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        ) : <p className="event-empty">Jadwal pertandingan akan diumumkan panitia.</p>}
                        {scheduleDays.length > 0 && <details className="event-rundown mt-7"><summary>Rangkaian acara umum</summary><div className="mt-5">{scheduleDays.map((day) => <div key={day.date} className="event-schedule-day grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12"><h3>{formatScheduleDate(day.date)}</h3><ol>{day.sessions.map((session) => <li key={session.id} className="event-session grid grid-cols-[90px_minmax(0,1fr)] gap-4 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-7"><div className="event-session-time"><p>{session.time_only || 'Menyusul'}</p></div><div><h4>{session.name}</h4>{session.description && <p className="event-muted mt-2 text-sm leading-6">{session.description}</p>}</div></li>)}</ol></div>)}</div></details>}
                    </section>

                    <section id="champions" className="event-section">
                        <SectionHeading title="Hasil juara" description="Juara resmi per nomor pertandingan yang telah dikonfirmasi panitia.">
                            <div className="event-filters inline-flex gap-1" role="group" aria-label="Filter hasil juara">
                                {[['all', 'Semua'], ['embu', 'Embu'], ['randori', 'Randori']].map(([value, label]) => (
                                    <Button key={value} variant="unstyled" size="none" className="event-filter" aria-pressed={championFilter === value} onClick={() => setChampionFilter(value)}>
                                        {label} <span className="event-filter-count">{championCounts[value]}</span>
                                    </Button>
                                ))}
                            </div>
                        </SectionHeading>
                        <p className="sr-only" role="status">Menampilkan {filteredChampionGroups.length} hasil {championFilter === 'all' ? 'semua nomor pertandingan' : championFilter}.</p>
                        {filteredChampionGroups.length > 0
                            ? <div className="grid gap-5 lg:grid-cols-2">{filteredChampionGroups.map((group) => <ChampionGroup key={group.id} group={group} />)}</div>
                            : <p className="event-empty">Belum ada hasil juara {championFilter === 'all' ? 'yang dikonfirmasi' : championFilter === 'embu' ? 'Embu' : 'Randori'}.</p>}
                    </section>

                    <section id="embu-scores" className="event-section">
                        <SectionHeading title="Skor Embu" description="Nilai akhir terverifikasi, lima nilai Juri, skor tengah, dan denda waktu.">
                            {embuScores.length > 0 && (
                                <Select
                                    id="embu-score-filter"
                                    label="Filter nomor Embu"
                                    ariaLabel="Filter skor berdasarkan nomor Embu"
                                    options={embuScoreOptions}
                                    value={activeEmbuScoreFilter}
                                    onChange={(value) => {
                                        setEmbuScoreFilter(value);
                                        updatePublicFilter('embu_category', value);
                                    }}
                                    clearable={false}
                                    searchPlaceholder="Cari nomor Embu..."
                                    containerClassName="event-filter-select w-full sm:w-80"
                                    labelClassName="event-select-label"
                                />
                            )}
                        </SectionHeading>
                        <p className="sr-only" role="status">Menampilkan {filteredEmbuScores.length} dari {embuScores.length} skor Embu.</p>
                        {embuScores.length > 0
                            ? <div className="grid gap-5 lg:grid-cols-2">{filteredEmbuScores.map((score) => <EmbuScoreCard key={score.id} score={score} />)}</div>
                            : <p className="event-empty">Belum ada skor Embu terverifikasi.</p>}
                    </section>

                    <section id="randori-bracket" className="event-section">
                        <SectionHeading title="Bagan Randori" description="Perjalanan pertandingan AKA dan SHIRO dari babak awal hingga final.">
                            {randoriBrackets.length > 0 && (
                                <Select
                                    id="randori-bracket-filter"
                                    label="Filter nomor Randori"
                                    ariaLabel="Filter bagan berdasarkan nomor Randori"
                                    options={randoriBracketOptions}
                                    value={activeRandoriBracketFilter}
                                    onChange={(value) => {
                                        setRandoriBracketFilter(value);
                                        updatePublicFilter('randori_bracket', value);
                                    }}
                                    clearable={false}
                                    searchPlaceholder="Cari nomor Randori..."
                                    containerClassName="event-filter-select w-full sm:w-80"
                                    labelClassName="event-select-label"
                                />
                            )}
                        </SectionHeading>
                        <p className="sr-only" role="status">Menampilkan {filteredRandoriBrackets.length} dari {randoriBrackets.length} bagan Randori.</p>
                        {randoriBrackets.length > 0
                            ? <div className="space-y-6">{filteredRandoriBrackets.map((bracket) => <RandoriBracket key={bracket.id} bracket={bracket} />)}</div>
                            : <p className="event-empty">Bagan Randori belum dipublikasikan.</p>}
                    </section>

                    <section id="courts" className="event-section">
                        <SectionHeading title="Lokasi & gelanggang" description="Informasi tempat pelaksanaan pertandingan." />
                        <div className="grid gap-7 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
                            <div className="event-venue">
                                <Icon name="fa-location-dot" className="event-accent mb-5 text-xl" />
                                <h3>{event.venue || 'Lokasi akan diumumkan'}</h3>
                                <p className="event-muted mt-3 text-sm leading-6">{[event.city, event.province].filter(Boolean).join(', ')}</p>
                                {event.dates_formatted && <p className="event-muted mt-6 border-t pt-5 text-sm" style={{ borderColor: 'var(--event-border)' }}>{event.dates_formatted}</p>}
                            </div>
                            <div className="event-courts">
                                {courts.length > 0 ? courts.map((court) => (
                                    <div key={court.id} className="event-court">
                                        <h3>{court.name}</h3>
                                        {court.location && <p className="event-accent mt-2 text-sm">{court.location}</p>}
                                        {court.description && <p className="event-muted mt-3 text-sm leading-7">{court.description}</p>}
                                    </div>
                                )) : <p className="event-empty">Pembagian gelanggang akan diumumkan panitia.</p>}
                            </div>
                        </div>
                    </section>

                    <section id="payment" className="event-section">
                        <SectionHeading title="Biaya & informasi pendaftaran" description="Ketentuan administrasi dan narahubung panitia kejuaraan." />
                        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-14">
                            <div>
                                <div className="event-payment-note flex items-start gap-4">
                                    <Icon name={event.is_paid ? 'fa-circle-info' : 'fa-circle-check'} className="event-accent mt-1 text-lg" />
                                    <div>
                                        <h3>{event.is_paid ? 'Pembayaran melalui rekening resmi' : 'Pendaftaran tanpa biaya'}</h3>
                                        <p className="event-muted mt-2 text-sm leading-7">{event.is_paid ? 'Transfer biaya kontingen dan atlet ke rekening resmi panitia. Simpan bukti transfer untuk diunggah saat verifikasi pendaftaran.' : 'Tidak ada biaya pendaftaran kontingen maupun atlet. Anda dapat melanjutkan pendaftaran tanpa mengunggah bukti pembayaran.'}</p>
                                    </div>
                                </div>
                                {event.is_paid && <div className="mt-6 grid gap-4">
                                    {paymentMethods.length > 0 ? paymentMethods.map((method) => (
                                        <div key={method.id} className="event-bank">
                                            <div className="flex items-center justify-between gap-3"><h3>{method.provider || method.name}</h3><span className="event-muted text-xs capitalize">{method.type}</span></div>
                                            <p className="event-muted mb-2 mt-5 text-xs">Nomor rekening / akun</p>
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="min-w-0 break-all text-lg font-semibold tabular-nums select-all">{method.account_number}</span>
                                                <Button variant="unstyled" size="none" className="event-button event-button-secondary" onClick={() => handleCopy(method.account_number, method.id)} aria-label={`Salin nomor rekening ${method.provider || method.name}`}>{copiedAccount === method.id ? 'Tersalin' : 'Salin'}</Button>
                                            </div>
                                            <p className="event-muted mt-3 text-sm">Atas nama <strong className="event-strong font-medium">{method.account_name}</strong></p>
                                            {method.instructions && <p className="event-muted mt-4 text-sm leading-6">{method.instructions}</p>}
                                        </div>
                                    )) : <p className="event-empty">Informasi rekening akan diumumkan panitia.</p>}
                                    <p className="event-muted text-sm" role="status">{copyMessage}</p>
                                </div>}
                            </div>
                            <aside id="contact" className="event-contact">
                                <p className="event-muted mb-3 text-sm">Narahubung panitia</p>
                                <h3>{event.contact_person || 'Sekretariat panitia kejuaraan'}</h3>
                                {event.contact_phone ? (
                                    <a href={`https://wa.me/${event.contact_phone.replace(/[^0-9]/g, '').replace(/^0/, '62')}`} target="_blank" rel="noreferrer" className="event-button event-button-secondary mt-6">
                                        <i className="fa-brands fa-whatsapp text-lg" aria-hidden="true" />{event.contact_phone}
                                    </a>
                                ) : <p className="event-muted mt-3 text-sm">Kontak panitia akan diumumkan.</p>}
                            </aside>
                        </div>
                    </section>

                    <section className="event-registration flex flex-col items-start justify-between gap-7 lg:flex-row lg:items-center">
                        <div>
                            <h2>{hasDashboard ? 'Kelola keikutsertaan Anda.' : 'Persiapkan kontingen Anda.'}</h2>
                            <p>{hasDashboard ? 'Lanjutkan pengelolaan data dan pendaftaran melalui dashboard.' : 'Lengkapi data kontingen dan atlet untuk mengikuti kejuaraan.'}</p>
                            {!hasDashboard && event.registration_end_formatted && <p className="event-registration-deadline">Pendaftaran hingga {event.registration_end_formatted}</p>}
                        </div>
                        <Link href={actionHref} className="event-button event-button-light shrink-0">{hasDashboard ? 'Buka dashboard' : 'Daftar kontingen'}<Icon name="fa-arrow-right" className="text-xs" /></Link>
                    </section>
                </div>
            </main>

            <footer className="event-footer">
                <div className="event-container flex flex-col justify-between gap-6 py-9 sm:flex-row sm:items-center">
                    <div><p className="event-brand-name">SMART PERKEMI</p><p className="event-muted mt-2 text-xs leading-6">&copy; {new Date().getFullYear()} Persaudaraan Shorinji Kempo Indonesia</p></div>
                    <div className="flex items-center gap-6 text-sm"><Link href="/" className="event-text-link">Beranda</Link><a href="#event-top" className="event-text-link">Kembali ke atas <Icon name="fa-arrow-up" className="ml-2 text-xs" /></a></div>
                </div>
            </footer>
        </div>
    );
}
