import Button from '@/Components/UI/Elements/Button';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const phaseOptions = [
    { value: 'all', label: 'Semua event' },
    { value: 'upcoming', label: 'Akan datang' },
    { value: 'ongoing', label: 'Sedang berlangsung' },
    { value: 'completed', label: 'Selesai' },
];

const registrationSteps = [
    { title: 'Pilih kejuaraan', description: 'Lihat jadwal, lokasi, dan nomor pertandingan. Pelajari ketentuan pada halaman event yang ingin Anda ikuti.' },
    { title: 'Daftarkan kontingen', description: 'Isi data penanggung jawab dan kontingen. Informasi akun akan dikirimkan ke alamat email yang Anda daftarkan.' },
    { title: 'Lengkapi data peserta', description: 'Masuk ke portal kontingen untuk melengkapi data atlet, memilih nomor pertandingan, dan mengikuti proses verifikasi.' },
];

function Icon({ name, className = '' }) {
    return <i className={`fa-solid ${name} ${className}`} aria-hidden="true" />;
}

function PhaseBadge({ event }) {
    return <span className={`home-phase home-phase-${event.phase}`}><span aria-hidden="true" />{event.phase_label}</span>;
}

function EventDate({ event }) {
    return (
        <div className="home-date-tile" aria-hidden="true">
            <span>{event.start_month}</span>
            <strong>{event.start_day}</strong>
            <span>{event.year}</span>
        </div>
    );
}

function EventRow({ event }) {
    return (
        <article className="home-event-row">
            <Link href={event.url} className="home-event-art" aria-label={`Lihat ${event.name}`}>
                {event.cover_image_url ? <img src={event.cover_image_url} alt={`Poster ${event.name}`} width="160" height="200" loading="lazy" /> : <EventDate event={event} />}
            </Link>
            <div className="home-event-info min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                    <PhaseBadge event={event} />
                    <span className="event-muted text-xs">{event.year}</span>
                </div>
                <h3><Link href={event.url}>{event.name}</Link></h3>
                <div className="home-event-meta mt-4 flex flex-wrap gap-x-6 gap-y-2">
                    <span><Icon name="fa-calendar-days" />{event.dates_formatted}</span>
                    <span><Icon name="fa-location-dot" />{[event.city, event.province].filter(Boolean).join(', ')}</span>
                </div>
                <p className="event-muted mt-2 text-xs leading-6">{event.venue}</p>
                <div className="event-muted mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                    <span>{event.match_categories_count.toLocaleString('id-ID')} nomor pertandingan</span>
                    <span>{event.contingents_count.toLocaleString('id-ID')} kontingen terdaftar</span>
                </div>
            </div>
            <div className="home-event-action">
                <p className={`home-registration-state ${event.registration_state === 'open' ? 'home-registration-open' : ''}`}>{event.registration_label}</p>
                {event.registration_state === 'open' && event.registration_end_formatted && <p className="event-muted mt-1 text-xs leading-5">Hingga {event.registration_end_formatted}</p>}
                {event.registration_state === 'scheduled' && event.registration_start_formatted && <p className="event-muted mt-1 text-xs leading-5">Mulai {event.registration_start_formatted}</p>}
                <p className="home-fee mt-4">{event.is_paid ? <><strong>{event.fee_per_athlete_formatted}</strong><span> / atlet</span></> : <strong>Pendaftaran gratis</strong>}</p>
                {event.is_paid && <p className="event-muted mt-1 text-xs">Kontingen {event.fee_per_contingent_formatted}</p>}
                <Link href={event.url} className="event-button event-button-secondary mt-5">Lihat detail event <Icon name="fa-arrow-right" className="text-xs" /></Link>
            </div>
        </article>
    );
}

export default function Welcome({
    auth = {},
    stats = { events: 0, peserta: 0, nomor: 0, kontingen: 0 },
    featuredEvent = null,
    events = { data: [], total: 0, current_page: 1, last_page: 1 },
    filters = { search: '', status: 'all' },
    statusCounts = {},
    directoryUrl = '/',
}) {
    const [search, setSearch] = useState(filters.search);
    const [isLoading, setIsLoading] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const user = auth?.user;

    useEffect(() => setSearch(filters.search), [filters.search]);

    const filterEvents = (status, searchValue = search) => {
        router.get(directoryUrl, { search: searchValue.trim(), status }, {
            preserveState: true,
            preserveScroll: true,
            onStart: () => setIsLoading(true),
            onFinish: () => setIsLoading(false),
        });
    };

    const clearFilters = () => {
        setSearch('');
        filterEvents('all', '');
    };

    const closeMobileMenu = () => setMobileMenuOpen(false);

    return (
        <div className="event-page federation-home min-h-screen antialiased">
            <Head title="PB PERKEMI — Portal Kejuaraan Shorinji Kempo">
                <meta name="description" content="Temukan event Shorinji Kempo, jadwal pertandingan, ketentuan peserta, dan pendaftaran kontingen melalui portal kejuaraan PB PERKEMI." />
            </Head>
            <a href="#events" className="event-skip-link">Langsung ke daftar event</a>
            <header id="home-top" className="event-header">
                <div className="event-container flex min-h-22 items-center justify-between gap-4 py-4">
                    <Link href={directoryUrl} className="home-brand flex items-center gap-3" aria-label="PB PERKEMI, beranda">
                        <img src="/android-chrome-192x192.png" width="48" height="48" alt="" className="h-12 w-12 shrink-0 object-contain" />
                        <span><strong className="home-brand-name block">PB PERKEMI</strong><span className="home-brand-caption block">Persaudaraan Shorinji Kempo Indonesia</span></span>
                    </Link>
                    <nav aria-label="Navigasi utama" className="hidden items-center gap-8 lg:flex">
                        <a href="#events" className="event-text-link">Event kejuaraan</a>
                        <a href="#guide" className="event-text-link">Panduan pendaftaran</a>
                        <a href="#about" className="event-text-link">Tentang portal</a>
                    </nav>
                    <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                        <Link href={user ? '/admin/dashboard' : '/login'} className="event-button event-button-primary">{user ? 'Dashboard' : 'Masuk'}<Icon name={user ? 'fa-gauge-high' : 'fa-arrow-right-to-bracket'} className="hidden sm:inline" /></Link>
                        <Button variant="unstyled" size="none" className="home-menu-button lg:hidden" aria-expanded={mobileMenuOpen} aria-controls="home-mobile-nav" aria-label={mobileMenuOpen ? 'Tutup navigasi' : 'Buka navigasi'} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                            <Icon name={mobileMenuOpen ? 'fa-xmark' : 'fa-bars'} />
                        </Button>
                    </div>
                </div>
                {mobileMenuOpen && <nav id="home-mobile-nav" aria-label="Navigasi seluler" className="home-mobile-nav event-container flex flex-col lg:hidden" onKeyDown={(event) => { if (event.key === 'Escape') { closeMobileMenu(); } }}>
                    <a href="#events" onClick={closeMobileMenu}>Event kejuaraan</a><a href="#guide" onClick={closeMobileMenu}>Panduan pendaftaran</a><a href="#about" onClick={closeMobileMenu}>Tentang portal</a>
                </nav>}
            </header>

            <main>
                <section className="home-hero" aria-labelledby="home-title">
                    <div className={`event-container grid items-center gap-10 py-12 lg:gap-20 lg:py-16 ${featuredEvent ? 'lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]' : ''}`}>
                        <div>
                            <p className="home-intro-label">Portal kejuaraan PB PERKEMI</p>
                            <h1 id="home-title">Kejuaraan Shorinji Kempo Indonesia.</h1>
                            <p className="home-intro">Temukan agenda kejuaraan, persiapkan atlet, dan daftarkan kontingen Anda. Seluruh informasi pertandingan dalam satu tempat.</p>
                            <div className="mt-8 flex flex-wrap items-center gap-4">
                                <a href="#events" className="event-button event-button-primary event-button-large">Jelajahi event <Icon name="fa-arrow-down" className="text-xs" /></a>
                                <a href="#guide" className="event-text-link home-guide-link">Cara mendaftar <Icon name="fa-arrow-up-right-from-square" className="ml-2 text-[10px]" /></a>
                            </div>
                            <div className="home-next-agenda mt-10 flex items-center gap-4">
                                <span className="home-agenda-icon"><Icon name="fa-calendar-days" /></span>
                                <p><strong>{(statusCounts.upcoming || 0).toLocaleString('id-ID')} event akan datang</strong><span>{(statusCounts.ongoing || 0).toLocaleString('id-ID')} event sedang berlangsung</span></p>
                            </div>
                        </div>
                        {featuredEvent && <aside className="home-feature" aria-label="Sorotan kejuaraan">
                            <div className="home-feature-heading flex items-center justify-between gap-3"><span>Sorotan kejuaraan</span><PhaseBadge event={featuredEvent} /></div>
                            <Link href={featuredEvent.url} className="home-feature-visual" aria-label={`Lihat ${featuredEvent.name}`}>
                                {featuredEvent.cover_image_url ? <img src={featuredEvent.cover_image_url} alt={`Poster ${featuredEvent.name}`} width="800" height="1000" fetchPriority="high" /> : <div className="home-feature-fallback"><EventDate event={featuredEvent} /><span>{featuredEvent.city}</span></div>}
                            </Link>
                            <div className="home-feature-caption">
                                <h2><Link href={featuredEvent.url}>{featuredEvent.name}</Link></h2>
                                <p>{featuredEvent.dates_formatted}</p>
                                <Link href={featuredEvent.url} className="home-feature-link">Informasi kejuaraan <Icon name="fa-arrow-up-right-from-square" className="text-xs" /></Link>
                            </div>
                        </aside>}
                    </div>
                </section>

                <section className="home-stats" aria-label="Statistik event di portal">
                    <div className="event-container">
                        <dl className="grid grid-cols-2 lg:grid-cols-4">
                            {[['events', 'Event kejuaraan'], ['nomor', 'Nomor pertandingan'], ['kontingen', 'Kontingen terdaftar'], ['peserta', 'Atlet terdaftar']].map(([key, label]) => <div key={key}><dd>{Number(stats[key] || 0).toLocaleString('id-ID')}</dd><dt>{label}</dt></div>)}
                        </dl>
                        <p>Akumulasi data pada event yang dipublikasikan di portal.</p>
                    </div>
                </section>

                <section id="events" className="home-directory event-container">
                    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                        <div className="home-section-heading"><h2>Temukan kejuaraan Anda.</h2><p>Agenda mendatang, pertandingan berlangsung, dan arsip event.</p></div>
                        <form role="search" className="home-search" onSubmit={(event) => { event.preventDefault(); filterEvents(filters.status); }}>
                            <label htmlFor="event-search" className="sr-only">Cari nama event, kota, atau provinsi</label>
                            <Icon name="fa-magnifying-glass" />
                            <input id="event-search" type="search" value={search} maxLength={120} onChange={(event) => setSearch(event.target.value)} placeholder="Cari event atau kota" />
                            <Button type="submit" variant="unstyled" size="none" disabled={isLoading}>Cari</Button>
                        </form>
                    </div>
                    <div className="home-directory-toolbar mt-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                        <div className="home-phase-filters flex gap-2 overflow-x-auto" role="group" aria-label="Filter status event">
                            {phaseOptions.map(({ value, label }) => <Button key={value} variant="unstyled" size="none" className="home-phase-filter" aria-pressed={filters.status === value} onClick={() => filterEvents(value)} disabled={isLoading}>{label}<span>{statusCounts[value] || 0}</span></Button>)}
                        </div>
                        <p className="event-muted text-xs" role="status">{isLoading ? 'Memuat event…' : `${events.total} event ditemukan`}</p>
                    </div>
                    {filters.search && <div className="home-search-result mt-5 flex flex-wrap items-center gap-3 text-sm"><span>Hasil pencarian “{filters.search}”</span><Button variant="unstyled" size="none" className="home-reset-button" onClick={clearFilters}>Hapus pencarian <Icon name="fa-xmark" /></Button></div>}
                    <div className="home-event-list" aria-busy={isLoading}>
                        {events.data.length ? events.data.map((event) => <EventRow key={event.id} event={event} />) : <div className="home-empty-state">
                            <Icon name="fa-calendar" className="mb-5 text-2xl" />
                            <h3>{stats.events ? 'Belum ada event yang sesuai.' : 'Agenda kejuaraan akan hadir di sini.'}</h3>
                            <p>{stats.events ? 'Coba kata pencarian lain atau lihat semua status event.' : 'Informasi event akan tampil setelah dipublikasikan oleh panitia.'}</p>
                            {stats.events > 0 && <Button variant="unstyled" size="none" className="event-button event-button-secondary mt-6" onClick={clearFilters}>Lihat semua event</Button>}
                        </div>}
                    </div>
                    {events.last_page > 1 && <nav aria-label="Halaman daftar event" className="home-pagination mt-7 flex flex-wrap items-center justify-between gap-4">
                        <p className="event-muted text-sm">Halaman {events.current_page} dari {events.last_page}</p>
                        <div className="flex gap-2">
                            {events.prev_page_url ? <Link href={events.prev_page_url} preserveScroll className="event-button event-button-secondary">Sebelumnya</Link> : <span className="event-button home-disabled" aria-disabled="true">Sebelumnya</span>}
                            {events.next_page_url ? <Link href={events.next_page_url} preserveScroll className="event-button event-button-secondary">Berikutnya</Link> : <span className="event-button home-disabled" aria-disabled="true">Berikutnya</span>}
                        </div>
                    </nav>}
                </section>

                <section id="guide" className="home-guide">
                    <div className="event-container">
                        <div className="home-section-heading"><h2>Siapkan kontingen dalam tiga langkah.</h2><p>Mulai dari memilih event hingga melengkapi data peserta.</p></div>
                        <ol className="mt-9 grid gap-8 md:grid-cols-3 md:gap-12">
                            {registrationSteps.map((step, index) => <li key={step.title} className="home-step"><span className="home-step-number" aria-hidden="true">{index + 1}</span><h3>{step.title}</h3><p>{step.description}</p></li>)}
                        </ol>
                        <div className="home-guide-help mt-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"><p>Sudah memiliki akun kontingen? Lanjutkan pendaftaran melalui portal.</p><Link href={user ? '/admin/dashboard' : '/login'} className="event-button event-button-secondary">{user ? 'Buka dashboard' : 'Masuk ke portal'}<Icon name="fa-arrow-right" className="text-xs" /></Link></div>
                    </div>
                </section>

                <section id="about" className="home-about event-container grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
                    <div className="home-section-heading">
                        <p className="home-about-label">Tentang portal</p>
                        <h2>Terhubung melalui Shorinji Kempo.</h2>
                        <p>Portal PB PERKEMI menyediakan informasi kejuaraan dan layanan pendaftaran bagi kontingen. Jadwal, kategori pertandingan, serta ketentuan peserta tersedia pada masing-masing halaman event.</p>
                        <p className="home-about-signature">Didukung oleh SMART PERKEMI</p>
                    </div>
                    <div className="home-faq">
                        <details><summary>Bagaimana mengetahui pendaftaran masih dibuka?<Icon name="fa-plus" /></summary><p>Periksa status pendaftaran dan batas tanggal pada event yang Anda pilih. Status “Akan datang” menunjukkan waktu pelaksanaan kejuaraan; informasi pendaftarannya ditampilkan secara terpisah.</p></details>
                        <details><summary>Apakah semua kejuaraan berbayar?<Icon name="fa-plus" /></summary><p>Ketentuan biaya berbeda untuk setiap event. Biaya kontingen dan biaya per atlet tersedia di halaman detail. Event tanpa biaya ditandai dengan “Pendaftaran gratis”.</p></details>
                        <details><summary>Ke mana saya dapat menghubungi panitia?<Icon name="fa-plus" /></summary><p>Buka halaman detail kejuaraan dan lihat bagian “Biaya & informasi pendaftaran”. Narahubung yang dicantumkan di sana merupakan kontak panitia event tersebut.</p></details>
                    </div>
                </section>
            </main>

            <footer className="home-footer">
                <div className="event-container flex flex-col justify-between gap-7 py-10 md:flex-row md:items-center">
                    <div><p className="home-brand-name">PB PERKEMI</p><p className="mt-2 text-xs leading-6">Persaudaraan Shorinji Kempo Indonesia<br />&copy; {new Date().getFullYear()} SMART PERKEMI</p></div>
                    <nav aria-label="Navigasi footer" className="flex flex-wrap items-center gap-7 text-sm"><a href="#events">Event kejuaraan</a><a href="#guide">Panduan</a><a href="#home-top">Kembali ke atas <Icon name="fa-arrow-up" className="ml-2 text-xs" /></a></nav>
                </div>
            </footer>
        </div>
    );
}
