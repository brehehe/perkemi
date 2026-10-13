import { PublicSiteFooter, PublicSiteHeader } from '@/Components/PublicSiteChrome';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

function AthleteAvatar({ athlete, featured = false }) {
    const size = featured ? 'h-20 w-20 text-2xl' : 'h-16 w-16 text-lg';

    return athlete.photo_url
        ? <img src={athlete.photo_url} alt={`Foto ${athlete.name}`} className={`${size} shrink-0 rounded-lg border border-[var(--event-border)] object-cover`} />
        : <span className={`${size} flex shrink-0 items-center justify-center rounded-lg bg-[var(--event-accent-soft)] font-bold text-[var(--event-accent)]`}>{athlete.name?.slice(0, 2).toUpperCase()}</span>;
}

function AthleteCard({ athlete }) {
    return (
        <Link href={athlete.show_url} className="athlete-card group">
            <div className="flex items-start gap-4">
                <AthleteAvatar athlete={athlete} />
                <div className="min-w-0 flex-1">
                    <p className="athlete-card-kicker">Profil Kenshi</p>
                    <h2>{athlete.name}</h2>
                    <p className="athlete-card-contingent">{athlete.contingent || athlete.dojo_name || 'Kontingen belum tercatat'}</p>
                </div>
            </div>
            <div className="athlete-card-meta">
                <span><strong>{athlete.participation_count}</strong> Event</span>
                <span><strong>{athlete.medal_count}</strong> Juara</span>
                <span>{athlete.kyu_dan || 'Tingkat belum tercatat'}</span>
            </div>
            <span className="athlete-card-link">Lihat profil <i className="fa-solid fa-arrow-right" aria-hidden="true" /></span>
        </Link>
    );
}

function PaginationLink({ link, index, totalLinks }) {
    const isPrevious = index === 0;
    const isNext = index === totalLinks - 1;
    const accessibleLabel = isPrevious
        ? 'Halaman sebelumnya'
        : (isNext ? 'Halaman berikutnya' : `Halaman ${link.label}`);

    return (
        <Link
            href={link.url || '#'}
            preserveScroll
            className={link.active ? 'is-active' : (!link.url ? 'is-disabled' : '')}
            aria-current={link.active ? 'page' : undefined}
            aria-disabled={!link.url || undefined}
            aria-label={accessibleLabel}
            title={isPrevious || isNext ? accessibleLabel : undefined}
        >
            {isPrevious || isNext
                ? <i className={`fa-solid ${isPrevious ? 'fa-chevron-left' : 'fa-chevron-right'}`} aria-hidden="true" />
                : <span dangerouslySetInnerHTML={{ __html: link.label }} />}
        </Link>
    );
}

export default function AthleteDirectory({ athletes = { data: [], links: [] }, topChampions = [], filters = {}, auth = {} }) {
    const [search, setSearch] = useState(filters.search || '');
    const user = auth?.user;
    const medalTotal = topChampions.reduce((total, athlete) => total + Number(athlete.medal_count || 0), 0);

    const submitSearch = (event) => {
        event.preventDefault();
        router.get('/athelete', { search: search.trim() || undefined }, { preserveState: true, replace: true });
    };

    return (
        <div className="event-page federation-home athlete-public min-h-screen antialiased">
            <Head title="Peserta & Prestasi Atlet">
                <meta name="description" content="Direktori peserta Shorinji Kempo, riwayat pertandingan, dan prestasi resmi atlet pada event PB PERKEMI." />
            </Head>
            <a href="#athlete-list" className="event-skip-link">Langsung ke daftar peserta</a>
            <PublicSiteHeader user={user} active="athletes" />

            <main>
                <section className="home-hero athlete-directory-hero" aria-labelledby="athlete-directory-title">
                    <div className="event-container grid items-center gap-10 py-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,.92fr)] lg:gap-20 lg:py-16">
                        <div>
                            <p className="home-intro-label">Direktori Kenshi Indonesia</p>
                            <h1 id="athlete-directory-title">Peserta, perjalanan, dan prestasi.</h1>
                            <p className="home-intro">Temukan profil atlet, pertandingan yang pernah dijalani, statistik kemenangan, serta gelar yang tercatat pada kejuaraan PB PERKEMI.</p>
                            <form onSubmit={submitSearch} role="search" className="athlete-search mt-8">
                                <label className="sr-only" htmlFor="athlete-search">Cari peserta</label>
                                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                                <input id="athlete-search" type="search" value={search} maxLength={100} onChange={(event) => setSearch(event.target.value)} placeholder="Nama, kontingen, dojo, atau nomor kenshi" />
                                <button type="submit">Cari</button>
                            </form>
                            {/* <p className="event-muted mt-4 text-xs leading-6"><i className="fa-solid fa-shield-halved mr-2 text-[var(--event-accent)]" aria-hidden="true" />Data pribadi seperti NIK tidak ditampilkan pada halaman publik.</p> */}
                        </div>

                        <aside className="athlete-ranking-preview" aria-label="Atlet berprestasi">
                            <div className="athlete-ranking-heading"><span>Peringkat prestasi</span><i className="fa-solid fa-trophy" aria-hidden="true" /></div>
                            {topChampions.slice(0, 3).length ? topChampions.slice(0, 3).map((athlete, index) => (
                                <Link key={athlete.id} href={athlete.show_url} className="athlete-ranking-row">
                                    <span className="athlete-ranking-number">{String(index + 1).padStart(2, '0')}</span>
                                    <AthleteAvatar athlete={athlete} featured />
                                    <span className="min-w-0 flex-1">
                                        <strong>{athlete.name}</strong>
                                        <small>{athlete.contingent || athlete.dojo_name || 'Kontingen belum tercatat'}</small>
                                        <em>🥇 {athlete.gold_count} &nbsp; 🥈 {athlete.silver_count} &nbsp; 🥉 {athlete.bronze_count}</em>
                                    </span>
                                </Link>
                            )) : <div className="athlete-ranking-empty">Prestasi atlet akan tampil setelah hasil juara dikonfirmasi.</div>}
                        </aside>
                    </div>
                </section>

                <section className="home-stats" aria-label="Ringkasan direktori peserta">
                    <div className="event-container">
                        <dl className="grid grid-cols-2 lg:grid-cols-4">
                            <div><dd>{Number(athletes.total || 0).toLocaleString('id-ID')}</dd><dt>Profil atlet</dt></div>
                            <div><dd>{topChampions.length.toLocaleString('id-ID')}</dd><dt>Atlet berprestasi</dt></div>
                            <div><dd>{medalTotal.toLocaleString('id-ID')}</dd><dt>Gelar tercatat</dt></div>
                            <div><dd>3</dd><dt>Medali utama</dt></div>
                        </dl>
                        <p>Statistik dirangkum dari data pertandingan dan hasil juara yang telah tercatat.</p>
                    </div>
                </section>

                <section id="athlete-list" className="home-directory event-container">
                    <div className="flex flex-col justify-between gap-5 border-b border-[var(--event-border)] pb-7 sm:flex-row sm:items-end">
                        <div className="home-section-heading">
                            <h2>Daftar peserta.</h2>
                            <p>{filters.search ? `Hasil pencarian “${filters.search}”.` : 'Buka profil untuk melihat statistik dan riwayat pertandingan atlet.'}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="event-muted text-xs">{athletes.total || 0} profil ditemukan</span>
                            {filters.search && <Link href="/athelete" className="home-reset-button">Hapus pencarian <i className="fa-solid fa-xmark" aria-hidden="true" /></Link>}
                        </div>
                    </div>

                    {athletes.data?.length ? (
                        <div className="athlete-card-grid">
                            {athletes.data.map((athlete) => <AthleteCard key={athlete.id} athlete={athlete} />)}
                        </div>
                    ) : (
                        <div className="home-empty-state">
                            <i className="fa-solid fa-user-group mb-5 text-2xl" aria-hidden="true" />
                            <h3>Peserta tidak ditemukan.</h3>
                            <p>Coba nama, kontingen, dojo, atau nomor kenshi yang lain.</p>
                        </div>
                    )}

                    {athletes.links?.length > 3 && (
                        <nav aria-label="Paginasi peserta" className="athlete-pagination">
                            {athletes.links.map((link, index) => (
                                <PaginationLink
                                    key={`${link.label}-${index}`}
                                    link={link}
                                    index={index}
                                    totalLinks={athletes.links.length}
                                />
                            ))}
                        </nav>
                    )}
                </section>
            </main>

            <PublicSiteFooter />
        </div>
    );
}
