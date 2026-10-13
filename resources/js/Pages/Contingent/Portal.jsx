import ContingentLayout from '@/Layouts/ContingentLayout';
import SchoolFields, { schoolData, schoolDefaults } from '@/Components/UI/Forms/SchoolFields';
import { AlertConfirm, Button, Input, Modal, Select, Textarea } from '@/Components/UI';
import { Link, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const sectionMeta = {
    registration: ['Registrasi', 'Kelola berkas pendaftaran kontingen untuk event aktif.', 'fa-file-signature'],
    schedule: ['Jadwal', 'Pantau rundown event dan jadwal pertandingan kontingen.', 'fa-calendar-days'],
    results: ['Hasil Juara', 'Lihat perolehan medali resmi kontingen pada event terpilih.', 'fa-trophy'],
    'embu-results': ['Hasil Embu', 'Rincian nilai Embu yang telah diverifikasi untuk kontingen.', 'fa-ranking-star'],
    'randori-results': ['Hasil Randori', 'Rincian skor Randori yang telah disahkan untuk kontingen.', 'fa-hand-fist'],
    athletes: ['Data Atlet', 'Master atlet kontingen lintas event, tanpa bergantung pada event aktif.', 'fa-user-group'],
    officials: ['Data Official', 'Master official kontingen lintas event, tanpa bergantung pada event aktif.', 'fa-id-badge'],
    history: ['Riwayat Pendaftaran', 'Arsip pendaftaran kontingen pada seluruh event.', 'fa-clock-rotate-left'],
};

const statusClass = {
    draft: 'border-stone-200 bg-stone-50 text-stone-700',
    open_registration: 'border-blue-200 bg-blue-50 text-blue-700',
    ongoing: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    completed: 'border-violet-200 bg-violet-50 text-violet-700',
    closed: 'border-slate-200 bg-slate-50 text-slate-700',
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
const dateOnly = (value) => value ? String(value).slice(0, 10) : '';
const sectionPath = {
    registration: '/kontingen/registrasi',
    schedule: '/kontingen/jadwal',
    results: '/kontingen/hasil/juara',
    'embu-results': '/kontingen/hasil/embu',
    'randori-results': '/kontingen/hasil/randori',
    athletes: '/kontingen/atlet',
    officials: '/kontingen/official',
    history: '/kontingen/riwayat-pendaftaran',
};

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

function EventFilter({ portal, section }) {
    const event = portal?.event;
    const eventOptions = portal?.event_options || [];
    if (!event) return null;

    const switchEvent = (eventId) => router.get(sectionPath[section] || '/kontingen/registrasi', { event_id: eventId }, {
        preserveScroll: false,
        preserveState: false,
        replace: true,
    });

    return <section aria-label="Filter event" className="rounded-2xl border border-[#e4ddd4] bg-white p-4 shadow-sm shadow-stone-200/50">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#968d84]">Filter Event</p>
                <p className="mt-1 truncate text-sm font-black text-[#1c1815]">{event.name}</p>
                <p className="mt-1 text-xs text-[#7f776f]">{formatDate(event.start_date)} – {formatDate(event.end_date)} · {event.status_label}</p>
            </div>
            {eventOptions.length > 1 && <label className="block min-w-0 md:w-[390px]">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-[#756d65]">Pilih event yang diikuti</span>
                <select value={event.id} onChange={(changeEvent) => switchEvent(changeEvent.target.value)}
                    className="h-11 w-full rounded-xl border border-[#ded7ce] bg-[#fcfaf7] px-3 text-xs font-semibold text-[#413b35] outline-none transition focus:border-[#c93629] focus:ring-2 focus:ring-[#c93629]/15">
                    {eventOptions.map((option) => <option key={option.id} value={option.id}>{option.name} · {option.status_label}</option>)}
                </select>
            </label>}
        </div>
    </section>;
}

function RegistrationSection({ registration, summary = {}, registrationEvents = [], activeEventId }) {
    return (
        <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Atlet" value={summary.athletes || 0} icon="fa-user-group" tone="blue" />
                <StatCard label="Official" value={summary.officials || 0} icon="fa-id-badge" tone="gold" />
                <StatCard label="Nomor Tanding" value={summary.match_entries || 0} icon="fa-people-group" tone="green" />
                <StatCard label="Biaya Event" value={summary.is_paid ? 'Berbayar' : 'Gratis'} icon="fa-wallet" />
            </div>

            <section className="rounded-2xl border border-[#e6dfd6] bg-white p-5 shadow-sm shadow-stone-200/50">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#a47c25]">Event Kontingen</p>
                    <h2 className="mt-1 text-base font-black text-[#1c1815]">Pilih event untuk melanjutkan registrasi</h2>
                    <p className="mt-1 text-xs leading-5 text-[#817970]">Hanya event yang terhubung dengan akun kontingen ini yang ditampilkan.</p></div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">{registrationEvents.map((event) => <article key={event.id}
                    className={`rounded-xl border p-4 ${event.id === activeEventId ? 'border-[#d7a743] bg-[#fffaf0]' : 'border-[#e8e1d8] bg-[#fcfaf7]'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2">
                        <Badge value={event.status} label={event.status_label} />
                        {event.registration
                            ? <Badge value={event.registration.status} label={`Registrasi: ${event.registration.status_label}`} />
                            : <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">Belum Registrasi</span>}
                        <span className="rounded-full border border-[#e4ddd4] bg-white px-2.5 py-1 text-[10px] font-bold text-[#746c64]">{event.is_paid ? 'Berbayar' : 'Gratis'}</span>
                    </div><h3 className="mt-3 text-sm font-black text-[#1c1815]">{event.name}</h3>
                        <p className="mt-1 text-xs text-[#817970]">{formatDate(event.start_date)} – {formatDate(event.end_date)}</p>
                        <p className="mt-1 text-[11px] text-[#918980]">{event.contingent_name}</p></div>
                        {event.registration && <p className="text-right text-[10px] font-bold uppercase tracking-wide text-[#8b6512]">{event.registration.registration_number}</p>}</div>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#ebe4dc] pt-3">
                        <p className="text-[11px] text-[#817970]">{event.registration ? `Diperbarui ${formatDate(event.registration.updated_at, true)}` : 'Belum ada berkas registrasi'}</p>
                        <Link href={event.action_url} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ${event.registration ? 'border border-[#d9b04e] bg-white text-[#8b6512] hover:bg-[#fff5dc]' : 'bg-[#c93629] text-white hover:bg-[#ae2c23]'}`}>
                            <i className={`fa-solid ${event.registration ? 'fa-arrow-right' : 'fa-plus'}`} /> {event.action_label}
                        </Link>
                    </div>
                </article>)}</div>
            </section>

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
                <EmptyState icon="fa-file-circle-plus" title="Belum ada berkas registrasi pada event terpilih" description="Gunakan tombol Mulai Registrasi pada daftar event di atas untuk menambahkan official, atlet, dan nomor pertandingan." />
            )}
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

function EmbuJudgeBreakdown({ judge }) {
    return (
        <section className="rounded-xl border border-[#e7dfd5] bg-[#fcfbf9] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#a37019]">Juri {judge.judge_number} · {judge.role_label}</p>
                    <h3 className="mt-1 text-sm font-black text-[#201a16]">{judge.referee_name}</h3>
                </div>
                <div className="text-right">
                    <p className="font-mono text-xl font-black text-[#bd3428]">{Number(judge.total_score || 0).toFixed(2)}</p>
                    <p className={`text-[9px] font-bold uppercase ${judge.is_signed ? 'text-emerald-700' : 'text-amber-700'}`}>{judge.is_signed ? 'TTD tercatat' : 'Belum TTD'}</p>
                </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {Object.entries(judge.aspect_labels || {}).map(([key, label], index) => (
                    <div key={key} className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-[#eee7de] bg-white px-3 py-2">
                        <span className="text-[11px] leading-4 text-[#5f5750]"><strong className="mr-1 text-[#9b6c18]">{index + 1}.</strong>{label}</span>
                        <strong className="shrink-0 font-mono text-base text-[#17120f]">{judge.aspect_scores?.[key] ?? '-'}</strong>
                    </div>
                ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-700">Teknik {Number(judge.technique_subtotal || 0).toFixed(2)}</span>
                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-700">Ekspresi {Number(judge.expression_subtotal || 0).toFixed(2)}</span>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{judge.completed_items || 0}/10 aspek</span>
            </div>
        </section>
    );
}

function EmbuResultsSection({ results = [] }) {
    return results.length ? <div className="space-y-4">{results.map((result) => (
        <article key={result.id} className="overflow-hidden rounded-2xl border border-[#e6dfd6] bg-white shadow-sm">
            <div className="border-b border-[#eee8e0] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600">Embu · Partai #{result.sequence || '-'}</p><h2 className="mt-1 text-sm font-black">{result.category || 'Nomor Embu'}</h2><p className="mt-1 text-xs text-[#817970]">{result.participant_details?.contingent_name || result.participant || 'Tim kontingen'}</p></div>
                    <div className="flex shrink-0 items-center gap-2">
                        <a href={result.print_url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#d9d0c5] bg-white px-3 text-xs font-bold text-[#4e4640] transition-colors hover:bg-[#f8f5f1]"><i className="fa-solid fa-print" aria-hidden="true" />Cetak Detail</a>
                        <div className="rounded-xl bg-amber-50 px-4 py-2 text-right"><p className="text-[9px] font-bold uppercase text-amber-700">Nilai akhir</p><p className="font-mono text-2xl font-black text-[#b17c13]">{Number(result.final_score || 0).toFixed(2)}</p></div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-3 p-5 text-center text-xs">
                <div className="rounded-xl bg-[#f8f5f1] p-3"><p className="text-[9px] uppercase text-[#918980]">Skor tengah</p><p className="mt-1 font-bold">{Number(result.middle_score || 0).toFixed(2)}</p></div>
                <div className="rounded-xl bg-[#f8f5f1] p-3"><p className="text-[9px] uppercase text-[#918980]">Denda</p><p className="mt-1 font-bold text-red-600">{Number(result.time_penalty || 0).toFixed(2)}</p></div>
                <div className="rounded-xl bg-[#f8f5f1] p-3"><p className="text-[9px] uppercase text-[#918980]">Durasi</p><p className="mt-1 font-bold">{result.duration_seconds || 0} dtk</p></div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-[#eee8e0] px-5 py-4">{(result.judge_scores || []).map((score, index) => <span key={`${result.id}-${index}`} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">J{index + 1}: {Number(score).toFixed(2)}</span>)}</div>
            <details className="group border-t border-[#eee8e0] px-5 py-4">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl bg-[#f8f5f1] px-4 text-xs font-black text-[#4f4740] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b17c13]">
                    <span><i className="fa-solid fa-list-check mr-2 text-[#b17c13]" aria-hidden="true" />Rincian 10 Aspek per Wasit</span>
                    <i className="fa-solid fa-chevron-down transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="mt-3 grid gap-3 xl:grid-cols-2">
                    {(result.judges || []).length ? result.judges.map((judge) => <EmbuJudgeBreakdown key={judge.id} judge={judge} />) : <p className="rounded-xl border border-dashed border-[#ddd4c9] px-4 py-6 text-center text-xs text-[#847c74] xl:col-span-2">Rincian nilai per Wasit belum tersedia.</p>}
                </div>
            </details>
        </article>
    ))}</div> : <EmptyState icon="fa-ranking-star" title="Belum ada hasil Embu" description="Nilai Embu kontingen akan tampil setelah disimpan dan diverifikasi panitera." />;
}

function RandoriResultsSection({ results = [] }) {
    return results.length ? <div className="space-y-4">{results.map((result) => (
        <article key={result.id} className="rounded-2xl border border-[#e6dfd6] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${result.is_winner ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{result.is_winner ? 'MENANG' : 'SELESAI'}</span><span className="text-[10px] font-bold uppercase text-[#a47c25]">Partai #{result.sequence || '-'} · {result.round || '-'}</span></div><h2 className="mt-2 text-sm font-black">{result.category || 'Nomor Randori'}</h2><p className="mt-1 text-xs text-[#817970]">{result.court || 'Court belum tercatat'} · {result.signatures_count}/6 tanda tangan</p></div>
                <div className="grid min-w-[280px] grid-cols-[1fr_auto_1fr] items-center overflow-hidden rounded-xl border border-[#e6dfd6] text-center">
                    <div className={`p-3 ${result.winner_corner === 'aka' ? 'bg-red-50' : ''}`}><p className="truncate text-[10px] font-bold text-red-700">{result.aka_label || 'AKA'}</p><p className="font-mono text-2xl font-black text-red-600">{result.aka_total}</p></div><span className="px-2 text-[10px] font-bold text-[#aaa29a]">VS</span><div className={`p-3 ${result.winner_corner === 'shiro' ? 'bg-blue-50' : ''}`}><p className="truncate text-[10px] font-bold text-blue-700">{result.shiro_label || 'SHIRO'}</p><p className="font-mono text-2xl font-black text-blue-600">{result.shiro_total}</p></div>
                </div>
            </div>
        </article>
    ))}</div> : <EmptyState icon="fa-hand-fist" title="Belum ada hasil Randori" description="Skor Randori kontingen akan tampil setelah hasil disahkan panitera." />;
}

const athleteDefaults = {
    ...schoolDefaults,
    name: '', nik: '', kenshi_number: '', gender: 'male', birth_place: '', birth_date: '', blood_type: '',
    home_address: '', dojo_name: '', kyu_dan: '', weight: '', height: '', bpjs_number: '', bpjs_status: '', profile_photo: null,
};

function AthletesSection({ athletes = [], kyus = [] }) {
    const [editing, setEditing] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [deleteError, setDeleteError] = useState('');
    const [deleteProcessing, setDeleteProcessing] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const photoInputRef = useRef(null);
    const form = useForm(athleteDefaults);
    const hasSelectedPhoto = typeof File !== 'undefined' && form.data.profile_photo instanceof File;

    useEffect(() => {
        if (typeof File === 'undefined' || !(form.data.profile_photo instanceof File)) {
            setPhotoPreview(null);

            return undefined;
        }

        const previewUrl = URL.createObjectURL(form.data.profile_photo);
        setPhotoPreview(previewUrl);

        return () => URL.revokeObjectURL(previewUrl);
    }, [form.data.profile_photo]);

    const clearSelectedPhoto = () => {
        form.setData('profile_photo', null);
        form.clearErrors('profile_photo');
        if (photoInputRef.current) photoInputRef.current.value = '';
    };

    const resetAthleteForm = () => {
        setFormOpen(false);
        setEditing(null);
        form.reset();
        form.clearErrors();
        if (photoInputRef.current) photoInputRef.current.value = '';
    };
    const closeForm = () => {
        if (!form.processing) resetAthleteForm();
    };
    const createAthlete = () => {
        setEditing(null);
        form.setData({ ...athleteDefaults });
        form.clearErrors();
        if (photoInputRef.current) photoInputRef.current.value = '';
        setFormOpen(true);
    };
    const editAthlete = (athlete) => {
        setEditing(athlete);
        form.setData({
            ...athleteDefaults,
            ...schoolData(athlete),
            name: athlete.name || '',
            nik: athlete.nik || '',
            kenshi_number: athlete.kenshi_number || '',
            gender: athlete.gender || 'male',
            birth_place: athlete.birth_place || '',
            birth_date: dateOnly(athlete.birth_date),
            blood_type: athlete.blood_type || '',
            home_address: athlete.home_address || '',
            dojo_name: athlete.dojo_name || '',
            kyu_dan: athlete.kyu_dan || '',
            weight: athlete.weight || '',
            height: athlete.height || '',
            bpjs_number: athlete.bpjs_number || '',
            bpjs_status: athlete.bpjs_status || '',
            profile_photo: null,
        });
        form.clearErrors();
        if (photoInputRef.current) photoInputRef.current.value = '';
        setFormOpen(true);
    };
    const submit = (event) => {
        event.preventDefault();
        const endpoint = editing ? `/kontingen/atlet/${editing.id}` : '/kontingen/atlet';
        form.transform((data) => ({ ...data, ...(editing ? { _method: 'put' } : {}) })).post(endpoint, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: resetAthleteForm,
        });
    };
    const deleteAthlete = () => {
        if (!deleting || deleteProcessing) return;
        setDeleteProcessing(true);
        setDeleteError('');
        router.delete(`/kontingen/atlet/${deleting.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleting(null),
            onError: (errors) => setDeleteError(Object.values(errors).flat().join(' ')),
            onFinish: () => setDeleteProcessing(false),
        });
    };

    return <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs text-[#7d756d]"><strong className="text-[#1c1815]">{athletes.length}</strong> atlet master</p><p className="mt-1 text-[11px] text-[#918980]">Data dapat digunakan kembali saat mengikuti event berikutnya.</p></div>
            <Button type="button" onClick={createAthlete} iconLeft={<i className="fa-solid fa-user-plus" />}>Tambah Atlet</Button>
        </div>
        {athletes.length ? <div className="overflow-hidden rounded-2xl border border-[#e6dfd6] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead className="bg-[#f8f5f1] text-[10px] uppercase tracking-[0.08em] text-[#7e766e]"><tr><th className="px-4 py-3">Atlet</th><th className="px-4 py-3">Gender</th><th className="px-4 py-3">Lahir</th><th className="px-4 py-3">Tingkat</th><th className="px-4 py-3">Riwayat Nomor</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-[#eee8e0]">{athletes.map((athlete) => {
            const categories = [...new Set((athlete.match_category_entries || []).map((entry) => entry.match_category?.name).filter(Boolean))];
            return <tr key={athlete.id} className="align-top hover:bg-[#fcfaf7]"><td className="px-4 py-3"><div className="flex items-center gap-3">{athlete.profile_photo_url ? <img src={athlete.profile_photo_url} alt={`Foto ${athlete.name}`} className="h-10 w-10 rounded-xl object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f7e9e4] font-bold text-[#b73528]">{athlete.name.slice(0, 2).toUpperCase()}</span>}<div><p className="font-bold">{athlete.name}</p><p className="mt-0.5 text-[10px] text-[#8c847d]">{athlete.kenshi_number || 'Nomor kenshi belum dilengkapi'}</p></div></div></td><td className="px-4 py-3">{athlete.gender === 'male' ? 'Putra' : 'Putri'}</td><td className="px-4 py-3">{athlete.birth_place || '-'}{athlete.birth_date ? `, ${formatDate(athlete.birth_date)}` : ''}</td><td className="px-4 py-3">{athlete.kyu_dan || '-'}</td><td className="px-4 py-3"><div className="flex max-w-md flex-wrap gap-1.5">{categories.length ? categories.map((category) => <span key={category} className="rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">{category}</span>) : <span className="text-[#99918a]">Belum pernah dipilih</span>}</div></td><td className="px-4 py-3"><div className="flex justify-end gap-2"><Button type="button" size="sm" variant="outline" onClick={() => editAthlete(athlete)} iconLeft={<i className="fa-solid fa-pen" />}>Edit</Button><Button type="button" size="sm" variant="danger" onClick={() => { setDeleteError(''); setDeleting(athlete); }} aria-label={`Hapus ${athlete.name}`}><i className="fa-solid fa-trash" /></Button></div></td></tr>;
        })}</tbody></table></div></div> : <EmptyState icon="fa-user-group" title="Belum ada atlet master" description="Tambahkan atlet sekali, lalu gunakan kembali datanya pada registrasi event mana pun." />}

        <Modal isOpen={formOpen} onClose={closeForm} title={editing ? 'Edit Master Atlet' : 'Tambah Master Atlet'} subtitle="Data ini tidak terikat pada satu event." size="4xl" closeOnBackdrop={!form.processing} footer={<><Button type="button" variant="outline" onClick={closeForm} disabled={form.processing}>Batal</Button><Button type="submit" form="master-athlete-form" loading={form.processing}>{editing ? 'Simpan Perubahan' : 'Simpan Atlet'}</Button></>}>
            <form id="master-athlete-form" onSubmit={submit} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                    <Input id="athlete-name" label="Nama Lengkap" required value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} error={form.errors.name} />
                    <Input id="athlete-nik" label="NIK" inputMode="numeric" maxLength={16} value={form.data.nik} onChange={(event) => form.setData('nik', event.target.value.replace(/\D/g, ''))} error={form.errors.nik} hint="Disimpan privat dan tidak ditampilkan pada halaman publik." />
                    <Input id="athlete-kenshi-number" label="Nomor Induk Kenshi" value={form.data.kenshi_number} onChange={(event) => form.setData('kenshi_number', event.target.value)} error={form.errors.kenshi_number} />
                    <Select label="Gender" required clearable={false} value={form.data.gender} onChange={(value) => form.setData('gender', value)} options={[{ value: 'male', label: 'Putra' }, { value: 'female', label: 'Putri' }]} error={form.errors.gender} />
                    <Input id="athlete-birth-place" label="Tempat Lahir" value={form.data.birth_place} onChange={(event) => form.setData('birth_place', event.target.value)} error={form.errors.birth_place} />
                    <Input id="athlete-birth-date" label="Tanggal Lahir" type="date" value={form.data.birth_date} onChange={(event) => form.setData('birth_date', event.target.value)} error={form.errors.birth_date} />
                    <Select label="Golongan Darah" value={form.data.blood_type} onChange={(value) => form.setData('blood_type', value)} options={['A', 'B', 'AB', 'O']} error={form.errors.blood_type} />
                    <Input id="athlete-dojo" label="Dojo" value={form.data.dojo_name} onChange={(event) => form.setData('dojo_name', event.target.value)} error={form.errors.dojo_name} />
                    <Select label="Tingkatan Kyu/Dan" required value={form.data.kyu_dan} onChange={(value) => form.setData('kyu_dan', value)} options={kyus} error={form.errors.kyu_dan} />
                    <div className="grid grid-cols-2 gap-3"><Input id="athlete-weight" label="Berat (kg)" type="number" min="20" max="200" step="0.01" value={form.data.weight} onChange={(event) => form.setData('weight', event.target.value)} error={form.errors.weight} /><Input id="athlete-height" label="Tinggi (cm)" type="number" min="80" max="250" step="0.01" value={form.data.height} onChange={(event) => form.setData('height', event.target.value)} error={form.errors.height} /></div>
                    <Input id="athlete-bpjs" label="Nomor BPJS" value={form.data.bpjs_number} onChange={(event) => form.setData('bpjs_number', event.target.value)} error={form.errors.bpjs_number} />
                    <Select label="Status BPJS" value={form.data.bpjs_status} onChange={(value) => form.setData('bpjs_status', value)} options={[{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Tidak aktif' }, { value: 'none', label: 'Tidak memiliki' }]} error={form.errors.bpjs_status} />
                    <div className="md:col-span-2">
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-[#34425d] dark:text-slate-200">Foto Profil</p>
                        <div className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center ${form.errors.profile_photo ? 'border-red-400 bg-red-50/60 dark:border-red-500 dark:bg-red-950/20' : 'border-[#d9e0e9] bg-[#f8fafc] dark:border-slate-700 dark:bg-slate-900/70'}`}>
                            <div className="relative mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-[#d9e0e9] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:mx-0">
                                {(photoPreview || editing?.profile_photo_url) ? (
                                    <img src={photoPreview || editing.profile_photo_url} alt={`Preview foto ${form.data.name || 'atlet'}`} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#9aa5b5] dark:text-slate-500">
                                        <i className="fa-solid fa-user text-3xl" aria-hidden="true" />
                                        <span className="text-[10px] font-bold uppercase">Belum ada foto</span>
                                    </span>
                                )}
                                {photoPreview && <span className="absolute bottom-1.5 left-1.5 rounded-md bg-emerald-600 px-2 py-1 text-[9px] font-bold text-white">PREVIEW BARU</span>}
                            </div>
                            <div className="min-w-0 flex-1 text-center sm:text-left">
                                <p className="text-sm font-black text-[#172033] dark:text-white">Unggah foto atlet</p>
                                <p className="mt-1 text-xs leading-5 text-[#728098] dark:text-slate-400">Format JPG, PNG, atau WebP. Maksimal 2 MB. Foto akan tampil di daftar kontingen dan profil peserta publik.</p>
                                {hasSelectedPhoto && (
                                    <p className="mt-2 truncate text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                        <i className="fa-solid fa-circle-check mr-1.5" aria-hidden="true" />
                                        {form.data.profile_photo.name} · {(form.data.profile_photo.size / 1024).toFixed(0)} KB
                                    </p>
                                )}
                                <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                                    <label htmlFor="athlete-photo" className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#c0392b] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#a82718] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#c0392b]">
                                        <i className="fa-solid fa-camera" aria-hidden="true" />
                                        {photoPreview || editing?.profile_photo_url ? 'Ganti Foto' : 'Pilih Foto'}
                                    </label>
                                    {photoPreview && <Button type="button" variant="outline" size="sm" onClick={clearSelectedPhoto}>Batalkan Foto Baru</Button>}
                                </div>
                                <input
                                    ref={photoInputRef}
                                    id="athlete-photo"
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="sr-only"
                                    onChange={(event) => form.setData('profile_photo', event.target.files?.[0] || null)}
                                />
                                {form.errors.profile_photo && <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-300">{form.errors.profile_photo}</p>}
                            </div>
                        </div>
                    </div>
                    <Textarea id="athlete-address" label="Alamat Rumah" rows={3} value={form.data.home_address} onChange={(event) => form.setData('home_address', event.target.value)} error={form.errors.home_address} containerClassName="md:col-span-2" />
                </div>
                <SchoolFields form={form} />
            </form>
        </Modal>
        <AlertConfirm isOpen={Boolean(deleting)} title="Hapus master atlet?" message={`${deleting?.name || 'Atlet'} akan dihapus dari daftar aktif. Riwayat pertandingan yang sudah tercatat tetap tersimpan.`} confirmText="Hapus Atlet" isLoading={deleteProcessing} error={deleteError} onConfirm={deleteAthlete} onCancel={() => { if (!deleteProcessing) setDeleting(null); }} />
    </div>;
}

const officialDefaults = { name: '', role: '', gender: 'male', phone: '', email: '', notes: '' };

function OfficialsSection({ officials = [] }) {
    const [editing, setEditing] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [deleteError, setDeleteError] = useState('');
    const [deleteProcessing, setDeleteProcessing] = useState(false);
    const form = useForm(officialDefaults);

    const resetOfficialForm = () => {
        setFormOpen(false);
        setEditing(null);
        form.reset();
        form.clearErrors();
    };
    const closeForm = () => {
        if (!form.processing) resetOfficialForm();
    };
    const createOfficial = () => {
        setEditing(null);
        form.setData({ ...officialDefaults });
        form.clearErrors();
        setFormOpen(true);
    };
    const editOfficial = (official) => {
        setEditing(official);
        form.setData({
            name: official.name || '',
            role: official.role || '',
            gender: official.gender || 'male',
            phone: official.phone || '',
            email: official.email || '',
            notes: official.notes || '',
        });
        form.clearErrors();
        setFormOpen(true);
    };
    const submit = (event) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: resetOfficialForm };
        if (editing) form.put(`/kontingen/official/${editing.id}`, options);
        else form.post('/kontingen/official', options);
    };
    const deleteOfficial = () => {
        if (!deleting || deleteProcessing) return;
        setDeleteProcessing(true);
        setDeleteError('');
        router.delete(`/kontingen/official/${deleting.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleting(null),
            onError: (errors) => setDeleteError(Object.values(errors).flat().join(' ')),
            onFinish: () => setDeleteProcessing(false),
        });
    };

    return <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-[#7d756d]"><strong className="text-[#1c1815]">{officials.length}</strong> official master</p><p className="mt-1 text-[11px] text-[#918980]">Tidak terikat event dan dapat dipilih kembali saat registrasi.</p></div><Button type="button" onClick={createOfficial} iconLeft={<i className="fa-solid fa-plus" />}>Tambah Official</Button></div>
        {officials.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{officials.map((official) => <article key={official.id} className="rounded-2xl border border-[#e6dfd6] bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff4df] text-[#b17c13]"><i className="fa-solid fa-id-badge" /></span><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-bold">{official.name}</h2><p className="mt-0.5 text-xs font-semibold text-[#c93629]">{official.role || 'Official'}</p></div></div><dl className="mt-4 space-y-2 border-t border-[#eee8e0] pt-3 text-xs"><div className="flex justify-between gap-3"><dt className="text-[#8b837b]">Telepon</dt><dd className="text-right font-semibold">{official.phone || '-'}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#8b837b]">Email</dt><dd className="truncate text-right font-semibold">{official.email || '-'}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#8b837b]">Gender</dt><dd className="text-right font-semibold">{official.gender === 'male' ? 'Putra' : 'Putri'}</dd></div></dl><div className="mt-4 flex justify-end gap-2 border-t border-[#eee8e0] pt-3"><Button type="button" size="sm" variant="outline" onClick={() => editOfficial(official)} iconLeft={<i className="fa-solid fa-pen" />}>Edit</Button><Button type="button" size="sm" variant="danger" onClick={() => { setDeleteError(''); setDeleting(official); }} aria-label={`Hapus ${official.name}`}><i className="fa-solid fa-trash" /></Button></div></article>)}</div> : <EmptyState icon="fa-id-badge" title="Belum ada official master" description="Tambahkan manajer, pelatih, medis, atau pendamping yang dapat digunakan pada seluruh event." />}

        <Modal isOpen={formOpen} onClose={closeForm} title={editing ? 'Edit Master Official' : 'Tambah Master Official'} subtitle="Data ini tidak terikat pada satu event." size="2xl" closeOnBackdrop={!form.processing} footer={<><Button type="button" variant="outline" onClick={closeForm} disabled={form.processing}>Batal</Button><Button type="submit" form="master-official-form" loading={form.processing}>{editing ? 'Simpan Perubahan' : 'Simpan Official'}</Button></>}>
            <form id="master-official-form" onSubmit={submit} className="grid gap-4 md:grid-cols-2">
                <Input id="official-name" label="Nama Official" required value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} error={form.errors.name} />
                <Input id="official-role" label="Jabatan" required placeholder="Pelatih, Manajer, Medis..." value={form.data.role} onChange={(event) => form.setData('role', event.target.value)} error={form.errors.role} />
                <Select label="Gender" required clearable={false} value={form.data.gender} onChange={(value) => form.setData('gender', value)} options={[{ value: 'male', label: 'Putra' }, { value: 'female', label: 'Putri' }]} error={form.errors.gender} />
                <Input id="official-phone" label="Nomor HP / WhatsApp" inputMode="tel" value={form.data.phone} onChange={(event) => form.setData('phone', event.target.value)} error={form.errors.phone} />
                <Input id="official-email" label="Email" type="email" value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} error={form.errors.email} />
                <Textarea id="official-notes" label="Catatan" rows={3} value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} error={form.errors.notes} containerClassName="md:col-span-2" />
            </form>
        </Modal>
        <AlertConfirm isOpen={Boolean(deleting)} title="Hapus master official?" message={`${deleting?.name || 'Official'} akan dihapus dari daftar aktif kontingen.`} confirmText="Hapus Official" isLoading={deleteProcessing} error={deleteError} onConfirm={deleteOfficial} onCancel={() => { if (!deleteProcessing) setDeleting(null); }} />
    </div>;
}

function HistorySection({ registrations = [] }) {
    return registrations.length ? <div className="space-y-4">{registrations.map((registration) => <article key={registration.id} className="rounded-2xl border border-[#e6dfd6] bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Badge value={registration.status} label={registration.status_label} /><Badge value={registration.payment_status} label={registration.payment_status_label} /></div><h2 className="mt-3 text-base font-black">{registration.event?.name}</h2><p className="mt-1 text-xs text-[#847c74]">{registration.registration_number} · {formatDate(registration.event?.start_date)} – {formatDate(registration.event?.end_date)}</p></div><div className="flex flex-wrap items-center gap-3"><div className="rounded-xl bg-[#f8f5f1] px-4 py-2.5 text-center"><p className="text-sm font-black">{registration.contingent?.athletes_count || 0}</p><p className="text-[10px] text-[#8e867e]">Atlet</p></div><div className="rounded-xl bg-[#f8f5f1] px-4 py-2.5 text-center"><p className="text-sm font-black">{registration.contingent?.officials_count || 0}</p><p className="text-[10px] text-[#8e867e]">Official</p></div><Link href={registration.detail_url} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#ded6cc] px-4 py-2 text-xs font-bold hover:bg-[#f8f5f1]">Lihat Detail <i className="fa-solid fa-arrow-right" /></Link></div></div></article>)}</div> : <EmptyState icon="fa-box-archive" title="Belum ada riwayat pendaftaran" description="Riwayat event yang pernah diikuti kontingen akan muncul di halaman ini." />;
}

export default function ContingentPortal(props) {
    const meta = sectionMeta[props.section] || sectionMeta.registration;
    const content = {
        registration: <RegistrationSection registration={props.registration} summary={props.summary} registrationEvents={props.registration_events} activeEventId={props.portal?.event?.id} />,
        schedule: <ScheduleSection rundowns={props.rundowns} matches={props.matches} />,
        results: <ResultsSection results={props.results} medalSummary={props.medal_summary} />,
        'embu-results': <EmbuResultsSection results={props.embu_results} />,
        'randori-results': <RandoriResultsSection results={props.randori_results} />,
        athletes: <AthletesSection athletes={props.athletes} kyus={props.kyus} />,
        officials: <OfficialsSection officials={props.officials} />,
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
                {['schedule', 'results', 'embu-results', 'randori-results'].includes(props.section) && <EventFilter portal={props.portal} section={props.section} />}
                {content}
            </div>
        </ContingentLayout>
    );
}
