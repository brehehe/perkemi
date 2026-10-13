import { PublicSiteFooter, PublicSiteHeader } from '@/Components/PublicSiteChrome';
import { Head, Link } from '@inertiajs/react';

const formatDate = (value) => value ? new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
}).format(new Date(value)) : '-';

const formatPercentage = (value) => `${Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;

function ProfilePhoto({ athlete }) {
    return athlete.photo_url
        ? <img src={athlete.photo_url} alt={`Foto ${athlete.name}`} className="athlete-profile-photo" />
        : <span className="athlete-profile-photo athlete-profile-initials">{athlete.name?.slice(0, 2).toUpperCase()}</span>;
}

function PerformanceCard({ label, value, detail, icon }) {
    return (
        <div className="athlete-performance-card">
            <span className="athlete-performance-icon"><i className={`fa-solid ${icon}`} aria-hidden="true" /></span>
            <div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div>
        </div>
    );
}

export default function AthleteProfile({ athlete, auth = {} }) {
    const user = auth?.user;

    return (
        <div className="event-page federation-home athlete-public min-h-screen antialiased">
            <Head title={`${athlete.name} — Profil Peserta`}>
                <meta name="description" content={`Profil, statistik, riwayat pertandingan, dan prestasi ${athlete.name} di kejuaraan Shorinji Kempo.`} />
            </Head>
            <a href="#athlete-statistics" className="event-skip-link">Langsung ke statistik atlet</a>
            <PublicSiteHeader user={user} active="athletes" />

            <main>
                <div className="event-container py-7 sm:py-9">
                    <nav aria-label="Breadcrumb" className="event-breadcrumb flex flex-wrap items-center gap-2 text-xs">
                        <Link href="/" className="event-text-link">Beranda</Link>
                        <i className="fa-solid fa-chevron-right text-[9px]" aria-hidden="true" />
                        <Link href="/athelete" className="event-text-link">Peserta</Link>
                        <i className="fa-solid fa-chevron-right text-[9px]" aria-hidden="true" />
                        <span aria-current="page">{athlete.name}</span>
                    </nav>
                </div>

                <section className="athlete-profile-hero">
                    <div className="event-container grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:py-14">
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                            <ProfilePhoto athlete={athlete} />
                            <div>
                                <p className="home-intro-label">Profil Kenshi</p>
                                <h1>{athlete.name}</h1>
                                <p className="athlete-profile-affiliation">{athlete.contingent || athlete.dojo_name || 'Kontingen belum tercatat'}{athlete.city ? ` · ${athlete.city}` : ''}</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <span className="athlete-profile-badge">{athlete.kyu_dan || 'Tingkat belum tercatat'}</span>
                                    {athlete.kenshi_number && <span className="athlete-profile-badge">No. Kenshi {athlete.kenshi_number}</span>}
                                    {athlete.age && <span className="athlete-profile-badge">{athlete.age} tahun</span>}
                                </div>
                            </div>
                        </div>
                        <div className="athlete-medal-summary" aria-label="Ringkasan medali">
                            <div><span>🥇</span><strong>{athlete.gold_count}</strong><small>Emas</small></div>
                            <div><span>🥈</span><strong>{athlete.silver_count}</strong><small>Perak</small></div>
                            <div><span>🥉</span><strong>{athlete.bronze_count}</strong><small>Perunggu</small></div>
                        </div>
                    </div>
                </section>

                <section id="athlete-statistics" className="event-container athlete-profile-content">
                    <div className="home-section-heading">
                        <p className="home-about-label">Performa pertandingan</p>
                        <h2>Statistik atlet.</h2>
                        <p>Main, menang, dan win rate dihitung dari hasil Randori yang sudah terverifikasi. Juara mencakup hasil resmi Embu maupun Randori.</p>
                    </div>
                    <div className="athlete-performance-grid">
                        <PerformanceCard label="Main" value={athlete.played_count} detail="Partai terverifikasi" icon="fa-hand-fist" />
                        <PerformanceCard label="Menang" value={athlete.wins_count} detail="Kemenangan Randori" icon="fa-award" />
                        <PerformanceCard label="Win Rate" value={formatPercentage(athlete.win_rate)} detail="Persentase kemenangan" icon="fa-chart-line" />
                        <PerformanceCard label="Juara" value={athlete.medal_count} detail={`${athlete.participation_count} event diikuti`} icon="fa-trophy" />
                    </div>

                    <section className="athlete-section-block" aria-labelledby="yearly-statistics-title">
                        <div className="athlete-section-heading">
                            <div><p>Rekap performa</p><h2 id="yearly-statistics-title">Statistik per tahun</h2></div>
                            <span>{athlete.yearly_statistics?.length || 0} tahun tercatat</span>
                        </div>
                        {athlete.yearly_statistics?.length ? (
                            <div className="athlete-year-list">
                                {athlete.yearly_statistics.map((statistic) => (
                                    <article key={statistic.year} className="athlete-year-row">
                                        <div className="athlete-year-label"><strong>{statistic.year}</strong><span>{statistic.titles} gelar</span></div>
                                        <div className="athlete-year-numbers">
                                            <span><strong>{statistic.played}</strong>Main</span>
                                            <span><strong>{statistic.wins}</strong>Menang</span>
                                            <span><strong>{formatPercentage(statistic.win_rate)}</strong>Win rate</span>
                                        </div>
                                        <div className="athlete-year-progress" aria-label={`Win rate ${statistic.year}: ${formatPercentage(statistic.win_rate)}`}>
                                            <span style={{ width: `${Math.max(0, Math.min(100, Number(statistic.win_rate || 0)))}%` }} />
                                        </div>
                                        <div className="athlete-year-medals">🥇 {statistic.gold} &nbsp; 🥈 {statistic.silver} &nbsp; 🥉 {statistic.bronze}</div>
                                    </article>
                                ))}
                            </div>
                        ) : <div className="event-empty">Statistik tahunan akan tampil setelah atlet memiliki pertandingan atau hasil juara resmi.</div>}
                    </section>

                    <section className="athlete-section-block" aria-labelledby="match-history-title">
                        <div className="athlete-section-heading">
                            <div><p>Jejak kompetisi</p><h2 id="match-history-title">Riwayat pertandingan</h2></div>
                            <span>{athlete.match_history?.length || 0} partai</span>
                        </div>
                        {athlete.match_history?.length ? (
                            <div className="athlete-match-list">
                                {athlete.match_history.map((match) => (
                                    <article key={match.id} className="athlete-match-row">
                                        <div className={`athlete-match-result ${match.result === 'win' ? 'is-win' : 'is-loss'}`}>
                                            <i className={`fa-solid ${match.result === 'win' ? 'fa-check' : 'fa-minus'}`} aria-hidden="true" />
                                            <span>{match.result === 'win' ? 'Menang' : 'Kalah'}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="athlete-match-event">{match.event_url ? <Link href={match.event_url}>{match.event}</Link> : match.event}</p>
                                            <h3>{match.category || 'Nomor Randori'}</h3>
                                            <p className="athlete-match-meta">Partai #{match.sequence || '-'} · {match.round || '-'} · {match.court || 'Court belum tercatat'} · {formatDate(match.date)}</p>
                                        </div>
                                        <div className="athlete-match-opponent">
                                            <small>Lawan</small>
                                            <strong>{match.opponent || 'Lawan belum tercatat'}</strong>
                                        </div>
                                        <div className="athlete-match-score"><strong>{match.own_score}</strong><span>:</span><strong>{match.opponent_score}</strong></div>
                                    </article>
                                ))}
                            </div>
                        ) : <div className="event-empty">Belum ada pertandingan Randori terverifikasi untuk atlet ini.</div>}
                    </section>

                    <section className="athlete-section-block" aria-labelledby="event-history-title">
                        <div className="athlete-section-heading">
                            <div><p>Partisipasi dan prestasi</p><h2 id="event-history-title">Riwayat event dan gelar</h2></div>
                            <span>{athlete.history?.length || 0} catatan</span>
                        </div>
                        {athlete.history?.length ? (
                            <div className="athlete-event-history">
                                {athlete.history.map((item, index) => (
                                    <article key={`${item.event_id}-${item.category}-${index}`}>
                                        <time>{formatDate(item.date)}</time>
                                        <div><p>{item.event || 'Event'}</p><h3>{item.category || 'Nomor pertandingan'}</h3><span>{item.type || 'Pertandingan'}</span></div>
                                        {item.title ? <strong>{item.title}</strong> : <em>Peserta</em>}
                                    </article>
                                ))}
                            </div>
                        ) : <div className="event-empty">Riwayat event belum tersedia.</div>}
                    </section>
                </section>
            </main>

            <PublicSiteFooter />
        </div>
    );
}
