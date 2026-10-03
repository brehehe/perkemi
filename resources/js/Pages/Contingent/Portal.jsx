import ContingentLayout from '@/Layouts/ContingentLayout';
import { Link } from '@inertiajs/react';

const sectionMeta = {
    registration: ['Registrasi', 'Kelola berkas pendaftaran kontingen untuk event aktif.', 'fa-file-signature'],
    schedule: ['Jadwal', 'Pantau rundown event dan jadwal pertandingan kontingen.', 'fa-calendar-days'],
    results: ['Hasil', 'Lihat perolehan medali dan hasil pertandingan kontingen.', 'fa-medal'],
    athletes: ['Data Atlet', 'Daftar atlet yang terdaftar pada kontingen dan nomor tandingnya.', 'fa-user-group'],
    officials: ['Data Official', 'Daftar manajer, pelatih, dan pendamping kontingen.', 'fa-id-badge'],
    history: ['Riwayat Pendaftaran', 'Arsip pendaftaran kontingen pada seluruh event.', 'fa-clock-rotate-left'],
};

const statusClass = {
    pending: 'border-amber-200 bg-amber-50 text-amber-700',
    verified: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rejected: 'border-red-200 bg-red-50 text-red-700',
    submitted: 'border-blue-200 bg-blue-50 text-blue-700',
};

const valueOf = (value) => (typeof value === 'object' && value !== null ? value.value : value);
const formatDate = (value, withTime = false) => value ? new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
}).format(new Date(value)) : '-';
const formatCurrency = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));

function Badge({ value, label }) {
    const status = valueOf(value) || 'pending';
    return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusClass[status] || 'border-[#ddd6cc] bg-[#f5f1ec] text-[#6c645d]'}`}>{label || status}</span>;
}

function EmptyState({ icon, title, description }) {
    return (
        <div className="rounded-2xl border border-dashed border-[#d9d1c7] bg-white px-5 py-12 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7eee7] text-[#c93629]"><i className={`fa-solid ${icon}`} /></span>
            <h2 className="mt-4 text-sm font-bold">{title}</h2>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#817970]">{description}</p>
        </div>
    );
}

function StatCard({ label, value, icon, tone = 'red' }) {
    const tones = {
        red: 'bg-red-50 text-[#c93629]', gold: 'bg-amber-50 text-[#b17c13]', green: 'bg-emerald-50 text-emerald-600', blue: 'bg-blue-50 text-blue-600',
    };
    return (
        <div className="rounded-2xl border border-[#e8e1d8] bg-white p-4 shadow-sm shadow-stone-200/50">
            <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8d857c]">{label}</p>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}><i className={`fa-solid ${icon}`} /></span>
            </div>
            <p className="mt-2 text-2xl font-black text-[#1c1815]">{value}</p>
        </div>
    );
}

function RegistrationSection({ registration, summary = {}, createUrl }) {
    return (
        <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Atlet" value={summary.athletes || 0} icon="fa-user-group" tone="blue" />
                <StatCard label="Official" value={summary.officials || 0} icon="fa-id-badge" tone="gold" />
                <StatCard label="Nomor Tanding" value={summary.match_entries || 0} icon="fa-people-group" tone="green" />
                <StatCard label="Biaya Event" value={summary.is_paid ? 'Berbayar' : 'Gratis'} icon="fa-wallet" />
            </div>

            {registration ? (
                <section className="overflow-hidden rounded-2xl border border-[#e6dfd6] bg-white shadow-sm shadow-stone-200/50">
                    <div className="flex flex-col gap-4 border-b border-[#eee8e0] p-5 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#a47c25]">Nomor Registrasi</p>
                            <h2 className="mt-1 text-lg font-black text-[#1c1815]">{registration.registration_number}</h2>
                            <p className="mt-1 text-xs text-[#8a8279]">Dibuat {formatDate(registration.created_at, true)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge value={registration.status} label={registration.status_label} />
                            <Badge value={registration.payment_status} label={registration.payment_status_label} />
                        </div>
                    </div>
                    <div className="grid gap-4 p-5 md:grid-cols-3">
                        <div className="rounded-xl bg-[#f8f5f1] p-4"><p className="text-[10px] font-bold uppercase text-[#918980]">Total Tagihan</p><p className="mt-1 text-base font-black">{summary.is_paid ? formatCurrency(registration.final_amount) : 'Gratis'}</p></div>
                        <div className="rounded-xl bg-[#f8f5f1] p-4"><p className="text-[10px] font-bold uppercase text-[#918980]">Pembayaran</p><p className="mt-1 text-sm font-bold">{registration.payment_status_label}</p></div>
                        <div className="rounded-xl bg-[#f8f5f1] p-4"><p className="text-[10px] font-bold uppercase text-[#918980]">Terakhir Diperbarui</p><p className="mt-1 text-sm font-bold">{formatDate(registration.updated_at, true)}</p></div>
                    </div>
                    <div className="flex flex-wrap gap-3 border-t border-[#eee8e0] bg-[#fcfaf7] p-4">
                        <Link href={registration.detail_url} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#c93629] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#ae2c23]"><i className="fa-solid fa-pen-to-square" /> Lengkapi Registrasi</Link>
                        <Link href={registration.match_groups_url} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#d9b04e] bg-[#fff8e8] px-4 py-2 text-xs font-bold text-[#8b6512] hover:bg-[#fff1ce]"><i className="fa-solid fa-people-group" /> Atur Nomor Pertandingan</Link>
                    </div>
                </section>
            ) : (
                <EmptyState icon="fa-file-circle-plus" title="Belum ada berkas registrasi" description="Mulai registrasi untuk menambahkan official, atlet, dan nomor pertandingan pada event ini." />
            )}
            {!registration && <Link href={createUrl} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#c93629] px-4 py-2 text-xs font-bold text-white"><i className="fa-solid fa-plus" /> Buat Registrasi</Link>}
        </div>
    );
}

function ScheduleSection({ rundowns = [], matches = [] }) {
    return (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)]">
            <section className="rounded-2xl border border-[#e6dfd6] bg-white p-5 shadow-sm">
                <div className="mb-4"><h2 className="text-base font-black">Rundown Event</h2><p className="mt-1 text-xs text-[#8b837b]">Susunan kegiatan resmi dari panitia.</p></div>
                {rundowns.length ? <div className="space-y-3">{rundowns.map((item, index) => (
                    <article key={item.id} className="flex gap-3 rounded-xl border border-[#ede7df] p-3.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f8eee8] text-xs font-black text-[#c93629]">{String(index + 1).padStart(2, '0')}</span>
                        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-sm font-bold">{item.name}</h3><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">{formatDate(item.date, true)}{item.end_time ? ` – ${new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(item.end_time))}` : ''}</span></div><p className="mt-1 text-xs leading-5 text-[#817970]">{item.description || item.type || 'Agenda event'}</p></div>
                    </article>
                ))}</div> : <EmptyState icon="fa-calendar-xmark" title="Rundown belum tersedia" description="Panitia belum menerbitkan susunan acara untuk event ini." />}
            </section>

            <section className="rounded-2xl border border-[#e6dfd6] bg-white p-5 shadow-sm">
                <div className="mb-4"><h2 className="text-base font-black">Jadwal Pertandingan Saya</h2><p className="mt-1 text-xs text-[#8b837b]">Pertandingan yang melibatkan atlet kontingen.</p></div>
                {matches.length ? <div className="space-y-3">{matches.map((match) => (
                    <article key={match.id} className="rounded-xl border border-[#ede7df] p-3.5">
                        <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase text-[#c93629]">{match.match_category?.name || 'Pertandingan'}</span><Badge value={match.status} label={match.status || 'Terjadwal'} /></div>
                        <p className="mt-2 text-sm font-bold">{match.red_label || match.participant_label || 'Peserta'} {match.blue_label ? `vs ${match.blue_label}` : ''}</p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#777068]"><span><i className="fa-regular fa-clock mr-1.5 text-[#d4a843]" />{formatDate(match.scheduled_start_at || match.rundown?.date, true)}</span><span><i className="fa-solid fa-location-dot mr-1.5 text-[#d4a843]" />{match.court?.name || 'Lapangan belum ditentukan'}</span></div>
                    </article>
                ))}</div> : <EmptyState icon="fa-stopwatch" title="Belum ada jadwal pertandingan" description="Jadwal akan muncul setelah panitia menerbitkan drawing dan waktu pertandingan." />}
            </section>
        </div>
    );
}

function ResultsSection({ results = [], medalSummary = {} }) {
    return <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3"><StatCard label="Emas" value={medalSummary.gold || 0} icon="fa-medal" tone="gold" /><StatCard label="Perak" value={medalSummary.silver || 0} icon="fa-medal" tone="blue" /><StatCard label="Perunggu" value={medalSummary.bronze || 0} icon="fa-medal" tone="red" /></div>
        {results.length ? <div className="overflow-hidden rounded-2xl border border-[#e6dfd6] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-[#f8f5f1] text-[10px] uppercase tracking-[0.08em] text-[#7e766e]"><tr><th className="px-4 py-3">Peringkat</th><th className="px-4 py-3">Atlet</th><th className="px-4 py-3">Nomor Pertandingan</th><th className="px-4 py-3">Kontingen</th></tr></thead><tbody className="divide-y divide-[#eee8e0]">{results.map((result) => <tr key={result.id} className="hover:bg-[#fcfaf7]"><td className="px-4 py-3 font-bold text-[#b17c13]">{result.rank_label}</td><td className="px-4 py-3 font-semibold">{result.athlete?.name || '-'}</td><td className="px-4 py-3">{result.match_category}</td><td className="px-4 py-3 text-[#766e67]">{result.contingent_name}</td></tr>)}</tbody></table></div></div> : <EmptyState icon="fa-trophy" title="Belum ada hasil pertandingan" description="Perolehan medali kontingen akan tampil setelah hasil disahkan panitia." />}
    </div>;
}

function AthletesSection({ athletes = [], manageUrl }) {
    return <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#7d756d]"><strong className="text-[#1c1815]">{athletes.length}</strong> atlet terdaftar</p>{manageUrl && <Link href={manageUrl} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#c93629] px-4 py-2 text-xs font-bold text-white"><i className="fa-solid fa-user-plus" /> Kelola Atlet</Link>}</div>
        {athletes.length ? <div className="overflow-hidden rounded-2xl border border-[#e6dfd6] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left text-xs"><thead className="bg-[#f8f5f1] text-[10px] uppercase tracking-[0.08em] text-[#7e766e]"><tr><th className="px-4 py-3">Atlet</th><th className="px-4 py-3">Gender</th><th className="px-4 py-3">Tingkat</th><th className="px-4 py-3">Kelompok Umur</th><th className="px-4 py-3">Nomor Pertandingan</th></tr></thead><tbody className="divide-y divide-[#eee8e0]">{athletes.map((athlete) => <tr key={athlete.id} className="align-top hover:bg-[#fcfaf7]"><td className="px-4 py-3"><p className="font-bold">{athlete.name}</p><p className="mt-0.5 text-[10px] text-[#8c847d]">{athlete.kenshi_number || athlete.nik || 'Nomor belum dilengkapi'}</p></td><td className="px-4 py-3">{athlete.gender || '-'}</td><td className="px-4 py-3">{athlete.kyu_dan || '-'}</td><td className="px-4 py-3">{athlete.age_category?.name || '-'}</td><td className="px-4 py-3"><div className="flex max-w-md flex-wrap gap-1.5">{athlete.match_category_entries?.length ? athlete.match_category_entries.map((entry) => <span key={entry.id} className="rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">{entry.match_category?.name}</span>) : <span className="text-[#99918a]">Belum dipilih</span>}</div></td></tr>)}</tbody></table></div></div> : <EmptyState icon="fa-user-group" title="Belum ada atlet" description="Tambahkan atlet melalui detail registrasi kontingen." />}
    </div>;
}

function OfficialsSection({ officials = [], manageUrl }) {
    return <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#7d756d]"><strong className="text-[#1c1815]">{officials.length}</strong> official terdaftar</p>{manageUrl && <Link href={manageUrl} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#c93629] px-4 py-2 text-xs font-bold text-white"><i className="fa-solid fa-plus" /> Kelola Official</Link>}</div>
        {officials.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{officials.map((official) => <article key={official.id} className="rounded-2xl border border-[#e6dfd6] bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff4df] text-[#b17c13]"><i className="fa-solid fa-id-badge" /></span><div className="min-w-0"><h2 className="truncate text-sm font-bold">{official.name}</h2><p className="mt-0.5 text-xs font-semibold text-[#c93629]">{official.role || 'Official'}</p></div></div><dl className="mt-4 space-y-2 border-t border-[#eee8e0] pt-3 text-xs"><div className="flex justify-between gap-3"><dt className="text-[#8b837b]">Telepon</dt><dd className="text-right font-semibold">{official.phone || '-'}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#8b837b]">Email</dt><dd className="truncate text-right font-semibold">{official.email || '-'}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#8b837b]">Gender</dt><dd className="text-right font-semibold">{official.gender || '-'}</dd></div></dl></article>)}</div> : <EmptyState icon="fa-id-badge" title="Belum ada official" description="Tambahkan manajer, pelatih, dan pendamping melalui detail registrasi." />}
    </div>;
}

function HistorySection({ registrations = [] }) {
    return registrations.length ? <div className="space-y-4">{registrations.map((registration) => <article key={registration.id} className="rounded-2xl border border-[#e6dfd6] bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Badge value={registration.status} label={registration.status_label} /><Badge value={registration.payment_status} label={registration.payment_status_label} /></div><h2 className="mt-3 text-base font-black">{registration.event?.name}</h2><p className="mt-1 text-xs text-[#847c74]">{registration.registration_number} · {formatDate(registration.event?.start_date)} – {formatDate(registration.event?.end_date)}</p></div><div className="flex flex-wrap items-center gap-3"><div className="rounded-xl bg-[#f8f5f1] px-4 py-2.5 text-center"><p className="text-sm font-black">{registration.contingent?.athletes_count || 0}</p><p className="text-[10px] text-[#8e867e]">Atlet</p></div><div className="rounded-xl bg-[#f8f5f1] px-4 py-2.5 text-center"><p className="text-sm font-black">{registration.contingent?.officials_count || 0}</p><p className="text-[10px] text-[#8e867e]">Official</p></div><Link href={registration.detail_url} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#ded6cc] px-4 py-2 text-xs font-bold hover:bg-[#f8f5f1]">Lihat Detail <i className="fa-solid fa-arrow-right" /></Link></div></div></article>)}</div> : <EmptyState icon="fa-box-archive" title="Belum ada riwayat pendaftaran" description="Riwayat event yang pernah diikuti kontingen akan muncul di halaman ini." />;
}

export default function ContingentPortal(props) {
    const meta = sectionMeta[props.section] || sectionMeta.registration;
    const content = {
        registration: <RegistrationSection registration={props.registration} summary={props.summary} createUrl={props.create_url} />,
        schedule: <ScheduleSection rundowns={props.rundowns} matches={props.matches} />,
        results: <ResultsSection results={props.results} medalSummary={props.medal_summary} />,
        athletes: <AthletesSection athletes={props.athletes} manageUrl={props.manage_url} />,
        officials: <OfficialsSection officials={props.officials} manageUrl={props.manage_url} />,
        history: <HistorySection registrations={props.registrations} />,
    }[props.section];

    return (
        <ContingentLayout title={meta[0]} portal={props.portal}>
            <div className="mx-auto w-full max-w-[1500px] space-y-5">
                <section className="relative overflow-hidden rounded-2xl border border-[#342922] bg-gradient-to-r from-[#15110f] via-[#241713] to-[#321911] px-5 py-5 text-white shadow-lg shadow-stone-300/40 md:px-6">
                    <div className="absolute -right-8 -top-14 text-[150px] font-black leading-none text-white/[0.035]">拳</div>
                    <div className="relative flex items-center gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#e5b64a]/25 bg-[#e5b64a]/10 text-lg text-[#e5b64a]"><i className={`fa-solid ${meta[2]}`} /></span>
                        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d7a93e]">{props.portal?.contingent?.name}</p><h1 className="mt-1 font-cinzel text-xl font-bold md:text-2xl">{meta[0]}</h1><p className="mt-1 max-w-2xl text-xs leading-5 text-[#bdb4ac]">{meta[1]}</p></div>
                    </div>
                </section>
                {content}
            </div>
        </ContingentLayout>
    );
}
