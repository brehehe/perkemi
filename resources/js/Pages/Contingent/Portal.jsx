import ContingentLayout from '@/Layouts/ContingentLayout';
import SchoolFields, { schoolData, schoolDefaults } from '@/Components/UI/Forms/SchoolFields';
import { AlertConfirm, Button, Input, Modal, Select, Textarea } from '@/Components/UI';
import RandoriBracketTree from '@/Pages/Admin/Panitera/Partials/RandoriBracketTree';
import { Link, router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

const sectionMeta = {
    registration: ['Registrasi', 'Kelola berkas pendaftaran kontingen untuk event aktif.', 'fa-file-signature'],
    schedule: ['Jadwal', 'Pantau rundown event dan jadwal pertandingan kontingen.', 'fa-calendar-days'],
    bracket: ['Bagan Randori', 'Pantau bagan undian dan skema tanding atlet kontingen.', 'fa-sitemap'],
    results: ['Hasil Juara', 'Lihat perolehan medali resmi kontingen pada event terpilih.', 'fa-trophy'],
    'embu-results': ['Hasil Embu', 'Rincian nilai Embu kontingen (tanding maupun belum tanding).', 'fa-ranking-star'],
    'randori-results': ['Hasil Randori', 'Rincian skor Randori kontingen (tanding maupun belum tanding).', 'fa-hand-fist'],
    'category-results': ['Laporan Nomor Pertandingan', 'Pantau seluruh hasil nomor pertandingan yang diikuti beserta perbandingan kontingen lain.', 'fa-layer-group'],
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
    bracket: '/kontingen/bagan',
    results: '/kontingen/hasil/juara',
    'embu-results': '/kontingen/hasil/embu',
    'randori-results': '/kontingen/hasil/randori',
    'category-results': '/kontingen/hasil/nomor-pertandingan',
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

function BracketSection({
    categories = [],
    selectedCategory = null,
    matches = [],
    highlightContingentId = null,
    highlightContingentName = null,
    highlightEntryIds = [],
    highlightAthleteNames = [],
    activeEvent = null,
}) {
    const hasCategories = categories.length > 0;
    const enteredCategories = categories.filter((c) => c.is_entered);
    const otherCategories = categories.filter((c) => !c.is_entered);

    const switchCategory = (categoryId) => {
        router.get(
            '/kontingen/bagan',
            {
                event_id: activeEvent?.id,
                category: categoryId,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            }
        );
    };

    if (!hasCategories) {
        return (
            <EmptyState
                icon="fa-sitemap"
                title="Belum Ada Nomor Pertandingan Randori"
                description="Panitia belum menambahkan kategori tanding Randori pada event ini."
            />
        );
    }

    return (
        <div className="space-y-5">
            {/* Category Switcher & Filter Card */}
            <section className="rounded-2xl border border-[#e6dfd6] bg-white p-5 shadow-sm shadow-stone-200/50">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#c93629] text-[11px] font-bold text-white shadow-2xs">
                                <i className="fa-solid fa-sitemap" />
                            </span>
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#a47c25]">
                                Nomor Pertandingan Randori
                            </p>
                        </div>
                        <h2 className="mt-1 text-base font-black text-[#1c1815]">
                            {selectedCategory?.name || 'Nomor Pertandingan Randori'}
                        </h2>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#817970]">
                            <span>Format: <strong className="text-[#1c1815]">{selectedCategory?.format === 'double_elimination' ? 'Gugur Ganda (Double Elimination)' : selectedCategory?.format === 'round_robin' ? 'Setengah Kompetisi' : 'Sistem Gugur Tunggal'}</strong></span>
                            <span>•</span>
                            <span>Gender: <strong className="text-[#1c1815]">{selectedCategory?.gender === 'female' ? 'Putri' : 'Putra'}</strong></span>
                            {selectedCategory?.is_entered && (
                                <>
                                    <span>•</span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950 px-2.5 py-0.5 text-[10.5px] font-black text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 shadow-2xs">
                                        <i className="fa-solid fa-star text-amber-500 text-[8.5px]" /> {selectedCategory.my_athletes_count} Atlet Kontingen Anda ({selectedCategory.my_athlete_names?.join(', ') || 'Terdaftar'})
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="w-full lg:w-[420px]">
                        <label className="block">
                            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-[#756d65]">
                                Pilih Kategori Pertandingan
                            </span>
                            <select
                                value={selectedCategory?.id || ''}
                                onChange={(e) => switchCategory(e.target.value)}
                                className="h-11 w-full rounded-xl border border-[#ded7ce] bg-[#fcfaf7] px-3 text-xs font-semibold text-[#413b35] outline-none transition focus:border-[#c93629] focus:ring-2 focus:ring-[#c93629]/15"
                            >
                                {enteredCategories.length > 0 && (
                                    <optgroup label="⭐ Diikuti Atlet Kontingen Anda">
                                        {enteredCategories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                ★ {cat.name} ({cat.my_athletes_count} Atlet Anda){cat.has_drawing ? '' : ' - Bagan Belum Ada'}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                                {otherCategories.length > 0 && (
                                    <optgroup label="Nomor Randori Lainnya">
                                        {otherCategories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}{cat.has_drawing ? '' : ' (Bagan Belum Ada)'}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                        </label>
                    </div>
                </div>

                {/* Quick Pill Buttons for Categories with Athletes */}
                {enteredCategories.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-[#ede7df]">
                        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-[#918980]">
                            Kategori yang Diikuti Atlet Anda:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {enteredCategories.map((cat) => {
                                const isSelected = selectedCategory?.id === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => switchCategory(cat.id)}
                                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-2xs ${isSelected
                                                ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-500/50 font-black'
                                                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                                            }`}
                                    >
                                        <i className={`fa-solid ${isSelected ? 'fa-circle-check text-amber-800' : 'fa-star text-amber-500'} text-[10px]`} />
                                        <span>{cat.name}</span>
                                        <span className={`rounded px-1.5 py-0.2 text-[10px] font-black ${isSelected ? 'bg-amber-500/50 text-slate-950' : 'bg-amber-200/80 text-amber-900'
                                            }`}>
                                            {cat.my_athletes_count} Atlet
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </section>

            {/* Legend & Athlete Indicator Note */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs dark:border-amber-900/50 dark:bg-amber-950/30">
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950 font-black shadow-xs">
                        <i className="fa-solid fa-lightbulb text-sm" />
                    </span>
                    <div>
                        <p className="font-extrabold text-amber-950 dark:text-amber-200 text-xs">
                            Penanda Atlet Kontingen di Bagan Pertandingan
                        </p>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300/80 mt-0.5">
                            Atlet dari kontingen <strong>{highlightContingentName || 'Anda'}</strong> ditandai khusus dengan <strong>warna kuning emas</strong> serta badge <span className="inline-block rounded bg-amber-400 px-1.5 py-0.2 text-[9px] font-black text-slate-950">Atlet Anda</span> agar posisi dan alur pertandingan mudah dipantau.
                        </p>
                    </div>
                </div>
                {selectedCategory?.is_entered && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-200/90 px-3 py-1.5 text-xs font-black text-amber-950 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 shadow-2xs">
                        <i className="fa-solid fa-user-check text-amber-700 dark:text-amber-400" />
                        {selectedCategory.my_athletes_count} Atlet Anda di Bagan Ini
                    </span>
                )}
            </div>

            {/* The Tree Component */}
            {selectedCategory?.has_drawing && matches.length > 0 ? (
                <RandoriBracketTree
                    matches={matches}
                    activeEvent={activeEvent}
                    categoryName={selectedCategory?.name || ''}
                    categoryFormat={selectedCategory?.format || 'single_elimination'}
                    highlightContingentId={highlightContingentId}
                    highlightContingentName={highlightContingentName}
                    highlightEntryIds={highlightEntryIds}
                    highlightAthleteNames={highlightAthleteNames}
                />
            ) : (
                <EmptyState
                    icon="fa-sitemap"
                    title="Bagan Pertandingan Belum Digenerate"
                    description={`Bagan untuk nomor ${selectedCategory?.name || 'Randori'} belum digenerate oleh panitia. Jadwal dan skema tanding akan tampil otomatis setelah undian dirilis oleh panitia.`}
                />
            )}
        </div>
    );
}

function ResultsSection({ results = [], medalSummary = {} }) {
    return <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3"><StatCard label="Emas" value={medalSummary.gold || 0} icon="fa-medal" tone="gold" /><StatCard label="Perak" value={medalSummary.silver || 0} icon="fa-medal" tone="blue" /><StatCard label="Perunggu" value={medalSummary.bronze || 0} icon="fa-medal" tone="red" /></div>
        {results.length ? <div className="overflow-hidden rounded-2xl border border-[#e6dfd6] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-[#f8f5f1] text-[10px] uppercase tracking-[0.08em] text-[#7e766e]"><tr><th className="px-4 py-3">Peringkat</th><th className="px-4 py-3">Atlet</th><th className="px-4 py-3">Nomor Pertandingan</th><th className="px-4 py-3">Kontingen</th></tr></thead><tbody className="divide-y divide-[#eee8e0]">{results.map((result) => <tr key={result.id} className="hover:bg-[#fcfaf7]"><td className="px-4 py-3 font-bold text-[#b17c13]">{result.rank_label}</td><td className="px-4 py-3 font-semibold">{result.athlete?.name || '-'}</td><td className="px-4 py-3">{result.match_category}</td><td className="px-4 py-3 text-[#766e67]">{result.contingent_name}</td></tr>)}</tbody></table></div></div> : <EmptyState icon="fa-trophy" title="Belum ada hasil pertandingan" description="Perolehan medali kontingen akan tampil setelah hasil disahkan panitia." />}
    </div>;
}

const EMBU_TECHNIQUE_ASPECTS = [
    { key: 'goho_attack', label: 'GOHO 1 · Serangan (Kougeki)' },
    { key: 'goho_defense', label: 'GOHO 2 · Bertahan (Bougyo)' },
    { key: 'goho_counter', label: 'GOHO 3 · Serangan Balasan & 5 Unsur Serangan' },
    { key: 'juho_escape', label: 'JUHO 1 · Shuha & Nukiwaza' },
    { key: 'juho_lock_throw', label: 'JUHO 2 · Gyakuwaza & Nagewaza' },
    { key: 'juho_ground', label: 'JUHO 3 · Katamewaza' },
];

const EMBU_EXPRESSION_ASPECTS = [
    { key: 'expression_sequence', label: 'EKSPRESI 1 · Rangkaian, Irama & Harmoni' },
    { key: 'expression_stance', label: 'EKSPRESI 2 · Tai Gamae, Kuda-kuda & Keindahan Gerak' },
    { key: 'expression_spirit', label: 'EKSPRESI 3 · Semangat & Disiplin' },
    { key: 'expression_breath_zanshin', label: 'EKSPRESI 4 · Nafas, Pandangan Mata & Zanshin' },
];

function EmbuJudgeTableMatrix({ judges = [] }) {
    if (!judges.length) {
        return (
            <div className="p-5 text-center text-xs italic text-[#817970] dark:text-slate-400">
                <i className="fa-solid fa-circle-info mr-1.5 text-amber-600 dark:text-amber-400" />
                Rincian 10 aspek per wasit belum tersedia untuk partai ini.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] border-collapse text-left text-xs">
                <thead>
                    <tr className="border-b border-[#e6dfd6] bg-[#fbf9f6] text-[11px] text-slate-700 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                        <th className="w-10 px-3 py-3 text-center font-bold">No</th>
                        <th className="px-4 py-3 font-bold">Aspek Penilaian (PERKEMI)</th>
                        {judges.map((j) => (
                            <th
                                key={j.id || j.judge_number}
                                className={`px-3 py-2.5 text-center font-bold transition-colors ${j.is_middle
                                        ? 'bg-amber-100/40 dark:bg-amber-950/20'
                                        : ''
                                    }`}
                            >
                                <div className="flex flex-col items-center">
                                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${j.judge_number === 1
                                            ? 'bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100'
                                            : 'bg-stone-200 text-stone-800 dark:bg-slate-700 dark:text-slate-200'
                                        }`}>
                                        Wasit {j.judge_number}
                                    </span>
                                    <span className="mt-1 max-w-[120px] truncate text-[10px] font-bold text-slate-900 dark:text-white" title={j.referee_name}>
                                        {j.referee_name || `Wasit ${j.judge_number}`}
                                    </span>
                                    <span className="text-[9px] text-[#857d75] dark:text-slate-400">
                                        {j.role_label || (j.judge_number === 1 ? 'Wasit Utama' : 'Juri')}
                                    </span>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#eee8e0] dark:divide-slate-800">
                    {/* Section I: Penguasaan Teknik */}
                    <tr className="bg-[#f5f2ec]/90 dark:bg-slate-800/90">
                        <td colSpan={2 + judges.length} className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#695f54] dark:text-slate-300">
                            I. Penguasaan Teknik (Maksimal 60.00)
                        </td>
                    </tr>
                    {EMBU_TECHNIQUE_ASPECTS.map((aspect, idx) => (
                        <tr key={aspect.key} className="transition-colors hover:bg-amber-50/20 dark:hover:bg-slate-800/30">
                            <td className="px-3 py-2 text-center font-mono text-[#8a7f74] dark:text-slate-500">{idx + 1}</td>
                            <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">
                                {aspect.label}
                            </td>
                            {judges.map((j) => (
                                <td
                                    key={j.id || j.judge_number}
                                    className={`px-3 py-2 text-center font-mono font-semibold ${j.is_middle ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                                        }`}
                                >
                                    {j.aspect_scores?.[aspect.key] !== undefined && j.aspect_scores?.[aspect.key] !== null
                                        ? Number(j.aspect_scores[aspect.key]).toFixed(2)
                                        : '—'}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {/* Subtotal Teknik */}
                    <tr className="border-t-2 border-stone-200 bg-[#faf6ee] font-bold text-slate-900 dark:border-slate-700 dark:bg-amber-950/30 dark:text-amber-200">
                        <td className="px-3 py-2 text-center font-mono font-black text-amber-700 dark:text-amber-400">Σ</td>
                        <td className="px-4 py-2 text-[11px] font-black uppercase tracking-wide text-amber-950 dark:text-amber-200">
                            Subtotal Penguasaan Teknik (Maks. 60)
                        </td>
                        {judges.map((j) => (
                            <td
                                key={j.id || j.judge_number}
                                className="px-3 py-2 text-center font-mono text-sm font-black text-amber-900 dark:text-amber-300"
                            >
                                {j.technique_subtotal !== undefined && j.technique_subtotal !== null
                                    ? Number(j.technique_subtotal).toFixed(2)
                                    : '—'}
                            </td>
                        ))}
                    </tr>

                    {/* Section II: Penghayatan & Keserasian */}
                    <tr className="bg-[#f5f2ec]/90 dark:bg-slate-800/90">
                        <td colSpan={2 + judges.length} className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#695f54] dark:text-slate-300">
                            II. Penghayatan & Keserasian (Maksimal 40.00)
                        </td>
                    </tr>
                    {EMBU_EXPRESSION_ASPECTS.map((aspect, idx) => (
                        <tr key={aspect.key} className="transition-colors hover:bg-amber-50/20 dark:hover:bg-slate-800/30">
                            <td className="px-3 py-2 text-center font-mono text-[#8a7f74] dark:text-slate-500">{idx + 7}</td>
                            <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">
                                {aspect.label}
                            </td>
                            {judges.map((j) => (
                                <td
                                    key={j.id || j.judge_number}
                                    className={`px-3 py-2 text-center font-mono font-semibold ${j.is_middle ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                                        }`}
                                >
                                    {j.aspect_scores?.[aspect.key] !== undefined && j.aspect_scores?.[aspect.key] !== null
                                        ? Number(j.aspect_scores[aspect.key]).toFixed(2)
                                        : '—'}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {/* Subtotal Penghayatan */}
                    <tr className="border-t-2 border-stone-200 bg-[#faf6ee] font-bold text-slate-900 dark:border-slate-700 dark:bg-amber-950/30 dark:text-amber-200">
                        <td className="px-3 py-2 text-center font-mono font-black text-amber-700 dark:text-amber-400">Σ</td>
                        <td className="px-4 py-2 text-[11px] font-black uppercase tracking-wide text-amber-950 dark:text-amber-200">
                            Subtotal Penghayatan & Keserasian (Maks. 40)
                        </td>
                        {judges.map((j) => (
                            <td
                                key={j.id || j.judge_number}
                                className="px-3 py-2 text-center font-mono text-sm font-black text-amber-900 dark:text-amber-300"
                            >
                                {j.expression_subtotal !== undefined && j.expression_subtotal !== null
                                    ? Number(j.expression_subtotal).toFixed(2)
                                    : '—'}
                            </td>
                        ))}
                    </tr>

                    {/* Total Nilai Wasit */}
                    <tr className="border-t-2 border-stone-300 bg-stone-100 font-black dark:border-slate-700 dark:bg-slate-800">
                        <td className="px-3 py-2.5 text-center font-mono text-amber-600 dark:text-amber-400">★</td>
                        <td className="px-4 py-2.5 text-xs font-black uppercase tracking-wide text-slate-900 dark:text-white">
                            Total Nilai Wasit (Maks. 100)
                        </td>
                        {judges.map((j) => (
                            <td
                                key={j.id || j.judge_number}
                                className={`px-3 py-2.5 text-center font-mono text-base font-black ${j.is_trimmed
                                        ? 'text-stone-400 line-through dark:text-slate-500'
                                        : 'text-[#b17c13] dark:text-[#f0c060]'
                                    }`}
                            >
                                {j.total_score !== undefined && j.total_score !== null
                                    ? Number(j.total_score).toFixed(2)
                                    : '—'}
                            </td>
                        ))}
                    </tr>

                    {/* Status Perhitungan Wasit (Dicoret / Dihitung) */}
                    <tr className="bg-[#fcfaf7] dark:bg-slate-900">
                        <td className="px-3 py-2 text-center text-xs">⚖</td>
                        <td className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#797168] dark:text-slate-400">
                            Status Perhitungan
                        </td>
                        {judges.map((j) => (
                            <td key={j.id || j.judge_number} className="px-3 py-2 text-center">
                                {j.is_trimmed_max ? (
                                    <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                        Dicoret (Tertinggi)
                                    </span>
                                ) : j.is_trimmed_min ? (
                                    <span className="inline-flex rounded-full bg-stone-200 px-2 py-0.5 text-[9px] font-bold text-stone-700 dark:bg-slate-800 dark:text-slate-300">
                                        Dicoret (Terendah)
                                    </span>
                                ) : j.is_middle ? (
                                    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                        ✓ Dihitung
                                    </span>
                                ) : (
                                    <span className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-medium text-stone-600 dark:bg-slate-800 dark:text-slate-400">
                                        Tercatat
                                    </span>
                                )}
                            </td>
                        ))}
                    </tr>

                    {/* Tanda Tangan Digital */}
                    <tr className="bg-white text-[10px] dark:bg-slate-950">
                        <td className="px-3 py-2 text-center text-xs">✍</td>
                        <td className="px-4 py-2 font-medium text-slate-500 dark:text-slate-400">
                            Tanda Tangan Digital
                        </td>
                        {judges.map((j) => (
                            <td key={j.id || j.judge_number} className="px-3 py-2 text-center">
                                {j.is_signed ? (
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        <i className="fa-solid fa-signature mr-1" /> Tercatat
                                    </span>
                                ) : (
                                    <span className="italic text-stone-400 dark:text-slate-500">
                                        Belum TTD
                                    </span>
                                )}
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

function EmbuResultsSection({ results = [], categories = [] }) {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'completed', 'pending'
    const [search, setSearch] = useState('');

    const completedCount = useMemo(() => {
        return results.filter((r) => r.status === 'completed' || r.status === 'verified' || (r.final_score !== null && r.final_score !== undefined)).length;
    }, [results]);

    const pendingCount = useMemo(() => {
        return results.filter((r) => r.status !== 'completed' && r.status !== 'verified' && (r.final_score === null || r.final_score === undefined)).length;
    }, [results]);

    const filteredResults = useMemo(() => {
        return results.filter((item) => {
            // Filter kategori
            if (selectedCategory !== 'all') {
                if (item.category_id && item.category_id !== selectedCategory) {
                    return false;
                }
                if (!item.category_id && item.category !== selectedCategory) {
                    return false;
                }
            }
            // Filter status
            if (statusFilter === 'completed') {
                if (item.status !== 'completed' && item.status !== 'verified' && (item.final_score === null || item.final_score === undefined)) {
                    return false;
                }
            } else if (statusFilter === 'pending') {
                if (item.status === 'completed' || item.status === 'verified' || (item.final_score !== null && item.final_score !== undefined)) {
                    return false;
                }
            }
            // Filter text search
            if (search.trim()) {
                const query = search.toLowerCase();
                const athleteMatch = (item.athlete_name || '').toLowerCase().includes(query);
                const categoryMatch = (item.category || item.category_name || '').toLowerCase().includes(query);
                const courtMatch = (item.court || '').toLowerCase().includes(query);
                const roundMatch = (item.round || item.round_label || '').toLowerCase().includes(query);
                const seqMatch = String(item.sequence || '').includes(query);
                if (!athleteMatch && !categoryMatch && !courtMatch && !roundMatch && !seqMatch) {
                    return false;
                }
            }
            return true;
        });
    }, [results, selectedCategory, statusFilter, search]);

    return (
        <div className="space-y-5">
            {/* Filter Bar: Kategori (Select Dropdown) & Status */}
            <div className="rounded-2xl border border-[#e6dfd6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-4">
                    {/* Top Row: Dropdown Select Kategori */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-1 flex-col gap-1.5 sm:flex-row sm:items-center">
                            <label htmlFor="embu-category-select" className="text-xs font-black uppercase tracking-wider text-[#817970] dark:text-slate-400 shrink-0 sm:mr-2">
                                <i className="fa-solid fa-ranking-star mr-1.5 text-amber-500" />
                                Nomor Pertandingan:
                            </label>
                            <div className="relative flex-1 max-w-xl">
                                <select
                                    id="embu-category-select"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full rounded-xl border border-[#d9d0c5] bg-[#fcfbf9] px-3.5 py-2 pr-9 text-xs font-bold text-[#201a16] transition-colors focus:border-[#b17c13] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                >
                                    <option value="all">
                                        Semua Nomor Pertandingan ({results.length} Partai)
                                    </option>
                                    {categories.map((cat) => {
                                        const catResultsCount = results.filter(
                                            (r) => (r.category_id && r.category_id === cat.id) || r.category === cat.name
                                        ).length;
                                        return (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name} ({catResultsCount || cat.own_athletes_count} Partai)
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>

                        {(selectedCategory !== 'all' || statusFilter !== 'all' || search) && (
                            <button
                                type="button"
                                onClick={() => { setSelectedCategory('all'); setStatusFilter('all'); setSearch(''); }}
                                className="self-start text-xs font-bold text-[#b17c13] hover:underline dark:text-amber-400 sm:self-auto"
                            >
                                <i className="fa-solid fa-rotate-left mr-1" />
                                Reset Filter
                            </button>
                        )}
                    </div>

                    {/* Secondary Bar: Status Filter + Search */}
                    <div className="flex flex-col gap-3 border-t border-[#eee8e0] pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                onClick={() => setStatusFilter('all')}
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${statusFilter === 'all'
                                        ? 'bg-stone-900 text-white dark:bg-slate-100 dark:text-slate-900'
                                        : 'bg-[#f5f2ec] text-[#635a51] hover:bg-[#eae5dd] dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                            >
                                Semua Status ({results.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('completed')}
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${statusFilter === 'completed'
                                        ? 'bg-emerald-700 text-white dark:bg-emerald-600'
                                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    }`}
                            >
                                ✓ Selesai ({completedCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('pending')}
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${statusFilter === 'pending'
                                        ? 'bg-amber-600 text-white dark:bg-amber-500'
                                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                                    }`}
                            >
                                ⏳ Belum Tanding ({pendingCount})
                            </button>
                        </div>

                        <div className="relative w-full sm:w-72">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#9c9389] dark:text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari atlet, nomor, arena..."
                                className="w-full rounded-xl border border-[#d9d0c5] bg-white py-1.5 pl-8 pr-8 text-xs text-[#201a16] placeholder:text-[#a0978c] focus:border-[#b17c13] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#9c9389] hover:text-stone-700 dark:text-slate-400"
                                >
                                    <i className="fa-solid fa-xmark" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Results List */}
            {filteredResults.length ? (
                <div className="space-y-4">
                    {filteredResults.map((result) => {
                        const hasScore = result.final_score !== null && result.final_score !== undefined;
                        const hasJudges = (result.judges || []).length > 0;

                        return (
                            <article
                                key={result.id}
                                className="overflow-hidden rounded-2xl border border-[#e6dfd6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                            >
                                {/* Header Card */}
                                <div className="p-5">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#b17c13] dark:text-amber-400">
                                                    Embu · Partai #{result.sequence || '-'} · {result.round || result.round_label || '-'}
                                                </span>
                                                <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${result.status === 'verified'
                                                        ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                        : result.status === 'in_progress'
                                                            ? 'border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                                            : result.status === 'ready'
                                                                ? 'border border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                                                                : 'border border-stone-200 bg-stone-100 text-stone-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}>
                                                    {result.status_label || (hasScore ? 'Selesai' : 'Belum Tanding')}
                                                </span>
                                            </div>
                                            <h2 className="mt-1.5 text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                                {result.athlete_name || result.participant_details?.contingent_name || result.participant || 'Tim Kontingen'}
                                            </h2>
                                            <p className="mt-1 text-xs text-[#817970] dark:text-slate-400">
                                                <strong>{result.category || result.category_name || 'Nomor Embu'}</strong> · Arena: {result.court || 'Court belum tercatat'}
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-2">
                                            {result.print_url && (
                                                <a
                                                    href={result.print_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#d9d0c5] bg-white px-3.5 text-xs font-bold text-[#4e4640] transition-colors hover:bg-[#f8f5f1] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                                >
                                                    <i className="fa-solid fa-print" aria-hidden="true" />
                                                    Cetak Detail
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Calculation Summary Bar: Nilai Awal | Denda | Nilai Akhir */}
                                <div className="grid grid-cols-1 divide-y divide-stone-200 border-t border-b border-[#eee8e0] bg-[#faf8f5] md:grid-cols-3 md:divide-y-0 md:divide-x dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/60">
                                    {/* Kolom 1: Nilai Awal */}
                                    <div className="p-4 sm:p-5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-[#817970] dark:text-slate-400">
                                                Nilai Awal (Skor Juri)
                                            </span>
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                                                Skor Tengah
                                            </span>
                                        </div>
                                        <p className="mt-1 font-mono text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                            {result.middle_score !== null && result.middle_score !== undefined
                                                ? Number(result.middle_score).toFixed(2)
                                                : '—'}
                                        </p>
                                        <p className="mt-2 text-[11px] text-[#766e67] dark:text-slate-400">
                                            Skor 3 wasit tengah (sebelum denda)
                                        </p>
                                    </div>

                                    {/* Kolom 2: Denda */}
                                    <div className="p-4 sm:p-5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-[#817970] dark:text-slate-400">
                                                Denda (Pengurangan)
                                            </span>
                                            {result.duration_seconds ? (
                                                <span className="rounded-full bg-stone-200/80 px-2 py-0.5 text-[9px] font-bold text-stone-700 dark:bg-slate-800 dark:text-slate-300">
                                                    Durasi: {result.duration_seconds} dtk
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className={`mt-1 font-mono text-2xl sm:text-3xl font-black ${Number(result.total_penalty) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'
                                            }`}>
                                            {result.total_penalty !== null && result.total_penalty !== undefined
                                                ? (Number(result.total_penalty) > 0 ? `- ${Number(result.total_penalty).toFixed(2)}` : '0.00')
                                                : '—'}
                                        </p>
                                        <p className="mt-2 text-[11px] text-[#766e67] dark:text-slate-400">
                                            Waktu: <strong className="font-mono text-slate-800 dark:text-slate-200">{Number(result.time_penalty || 0).toFixed(2)}</strong>
                                            <span className="mx-1.5">|</span>
                                            Pelanggaran: <strong className="font-mono text-slate-800 dark:text-slate-200">{Number(result.violation_penalty || 0).toFixed(2)}</strong>
                                        </p>
                                    </div>

                                    {/* Kolom 3: Nilai Akhir */}
                                    <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50/50 via-yellow-50/30 to-amber-100/20 dark:from-amber-950/20 dark:via-yellow-950/10 dark:to-transparent">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-[#b17c13] dark:text-[#f0c060]">
                                                Nilai Akhir
                                            </span>
                                            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-black uppercase text-[#925f00] dark:text-amber-300">
                                                Skor Resmi
                                            </span>
                                        </div>
                                        <p className="mt-1 font-mono text-3xl sm:text-4xl font-black text-[#b17c13] dark:text-[#f0c060]">
                                            {result.final_score !== null && result.final_score !== undefined
                                                ? Number(result.final_score).toFixed(2)
                                                : '—'}
                                        </p>
                                        <p className="mt-2 text-[11px] font-medium text-[#7a6b57] dark:text-amber-300/80">
                                            {result.final_score !== null && result.final_score !== undefined
                                                ? `Nilai Awal (${Number(result.middle_score || 0).toFixed(2)}) − Denda (${Number(result.total_penalty || 0).toFixed(2)})`
                                                : 'Menunggu hasil pertandingan'}
                                        </p>
                                    </div>
                                </div>

                                {/* Rincian 10 Aspek Table Matrix */}
                                {hasJudges ? (
                                    <details open className="group border-t border-[#eee8e0] p-4 sm:p-5 dark:border-slate-800">
                                        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl bg-[#f8f5f1] px-4 text-xs font-black text-[#4f4740] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b17c13] dark:bg-slate-800 dark:text-slate-200">
                                            <span className="flex items-center gap-2">
                                                <i className="fa-solid fa-table-list text-[#b17c13] dark:text-amber-400" />
                                                <span>Rincian 10 Aspek per Wasit ({result.judges.length} Wasit Penilai)</span>
                                            </span>
                                            <i className="fa-solid fa-chevron-down transition-transform group-open:rotate-180 text-stone-500" />
                                        </summary>
                                        <div className="mt-4 rounded-xl border border-[#eee8e0] bg-white shadow-xs dark:border-slate-800 dark:bg-slate-950">
                                            <EmbuJudgeTableMatrix judges={result.judges} />
                                        </div>
                                    </details>
                                ) : (
                                    <div className="border-t border-[#eee8e0] px-5 py-4 text-xs italic text-[#817970] dark:border-slate-800 dark:text-slate-400">
                                        <i className="fa-solid fa-hourglass-half mr-1.5 text-amber-500" />
                                        Partai ini belum dinilai oleh dewan wasit atau sedang menunggu giliran tampil di arena.
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            ) : (
                <EmptyState
                    icon="fa-ranking-star"
                    title="Tidak Ada Pertandingan Embu"
                    description="Tidak ditemukan pertandingan Embu yang sesuai dengan filter yang Anda pilih."
                />
            )}
        </div>
    );
}

function RandoriResultsSection({
    results = [],
    categories = [],
    selectedCategory = null,
    bracketMatches = [],
    myContingent = null,
    highlightEntryIds = [],
    highlightAthleteNames = [],
    activeEvent = null,
}) {
    const hasAnyData = results.length > 0 || (bracketMatches && bracketMatches.length > 0) || (categories && categories.length > 0);

    if (!hasAnyData) {
        return (
            <EmptyState
                icon="fa-hand-fist"
                title="Belum ada hasil Randori"
                description="Nomor pertandingan Randori yang diikuti kontingen akan tampil di sini baik yang sudah maupun belum bertanding."
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Category Selector Dropdown if categories available */}
            {categories && categories.length > 0 && (
                <div className="rounded-2xl border border-[#e6dfd6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-1 flex-col gap-1.5 sm:flex-row sm:items-center">
                            <label htmlFor="randori-category-select" className="shrink-0 text-xs font-black uppercase tracking-wider text-[#817970] dark:text-slate-400 sm:mr-2">
                                <i className="fa-solid fa-hand-fist mr-1.5 text-red-500" />
                                Nomor Randori:
                            </label>
                            <div className="relative flex-1 max-w-xl">
                                <select
                                    id="randori-category-select"
                                    value={selectedCategory?.id || ''}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            router.visit(`/kontingen/hasil/randori?event_id=${encodeURIComponent(activeEvent?.id || '')}&category_id=${e.target.value}`, {
                                                preserveScroll: true,
                                                preserveState: true,
                                            });
                                        }
                                    }}
                                    className="w-full rounded-xl border border-[#d9d0c5] bg-[#fcfbf9] px-3.5 py-2.5 pr-9 text-xs font-bold text-[#201a16] transition-colors focus:border-[#b17c13] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                >
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name} ({cat.own_athletes_count} Atlet Anda)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {selectedCategory && (
                            <div className="flex items-center gap-2 self-start sm:self-auto">
                                <span className="rounded-lg bg-amber-200/80 px-2.5 py-1 text-xs font-black text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                                    {selectedCategory.own_athletes_count ?? categories.find(c => c.id === selectedCategory.id)?.own_athletes_count ?? 1} Atlet Kontingen Anda
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Interactive Tournament Bracket Tree */}
            {bracketMatches && bracketMatches.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-[#e6dfd6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <RandoriBracketTree
                        matches={bracketMatches}
                        activeEvent={activeEvent}
                        categoryName={selectedCategory?.name || ''}
                        categoryFormat={selectedCategory?.format || 'single_elimination'}
                        highlightContingentId={myContingent?.id}
                        highlightContingentName={myContingent?.name}
                        highlightEntryIds={highlightEntryIds}
                        highlightAthleteNames={highlightAthleteNames}
                    />
                </div>
            )}

            {/* List of Matches for Contingent */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#817970] dark:text-slate-400">
                        Daftar Partai Randori Kontingen Anda ({results.length} Partai)
                    </h3>
                </div>

                {results.length ? (
                    results.map((result) => (
                        <article key={result.id} className="rounded-2xl border border-[#e6dfd6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${result.is_winner
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                : result.is_played
                                                    ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                                    : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                                            }`}>
                                            {result.status_label || (result.is_winner ? 'MENANG' : 'SELESAI')}
                                        </span>
                                        <span className="text-[10px] font-bold uppercase text-[#a47c25] dark:text-[#f0c060]">
                                            Partai #{result.sequence || '-'} · {result.round || '-'}
                                        </span>
                                    </div>
                                    <h2 className="mt-2 text-sm font-black text-slate-900 dark:text-white">{result.category || 'Nomor Randori'}</h2>
                                    <p className="mt-1 text-xs text-[#817970] dark:text-slate-400">
                                        {result.court || 'Court belum tercatat'} · {result.signatures_count ? `${result.signatures_count}/6 tanda tangan` : 'Belum selesai'}
                                    </p>
                                </div>
                                <div className="grid min-w-[280px] grid-cols-[1fr_auto_1fr] items-center overflow-hidden rounded-xl border border-[#e6dfd6] text-center dark:border-slate-800">
                                    <div className={`p-3 ${result.winner_corner === 'aka' ? 'bg-red-50 dark:bg-red-950/30' : ''}`}>
                                        <p className="truncate text-[10px] font-bold text-red-700 dark:text-red-400">{result.aka_label || 'AKA'}</p>
                                        <p className="font-mono text-2xl font-black text-red-600 dark:text-red-400">{result.aka_total ?? '-'}</p>
                                    </div>
                                    <span className="px-2 text-[10px] font-bold text-[#aaa29a]">VS</span>
                                    <div className={`p-3 ${result.winner_corner === 'shiro' ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}>
                                        <p className="truncate text-[10px] font-bold text-blue-700 dark:text-blue-400">{result.shiro_label || 'SHIRO'}</p>
                                        <p className="font-mono text-2xl font-black text-blue-600 dark:text-blue-400">{result.shiro_total ?? '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))
                ) : (
                    <div className="rounded-2xl border border-dashed border-[#ddd4c9] bg-white p-8 text-center text-xs text-[#817970] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                        Belum ada partai Randori yang terdaftar untuk kontingen Anda.
                    </div>
                )}
            </div>
        </div>
    );
}

function CategoryResultsSection({
    categories = [],
    selectedCategory = null,
    champions = [],
    matches = [],
    myContingent = null,
    activeEvent = null,
    highlightEntryIds = [],
    highlightAthleteNames = [],
}) {
    if (!categories.length) {
        return (
            <EmptyState
                icon="fa-layer-group"
                title="Belum Ada Nomor Pertandingan"
                description="Kontingen Anda belum terdaftar pada nomor pertandingan di event ini atau nomor pertandingan belum diaktifkan."
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Category Selector Dropdown */}
            <div className="rounded-2xl border border-[#e6dfd6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-1 flex-col gap-1.5 sm:flex-row sm:items-center">
                        <label htmlFor="category-report-select" className="shrink-0 text-xs font-black uppercase tracking-wider text-[#817970] dark:text-slate-400 sm:mr-2">
                            <i className="fa-solid fa-layer-group mr-1.5 text-amber-500" />
                            Pilih Nomor Pertandingan:
                        </label>
                        <div className="relative flex-1 max-w-xl">
                            <select
                                id="category-report-select"
                                value={selectedCategory?.id || ''}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        router.visit(`/kontingen/hasil/nomor-pertandingan?event_id=${encodeURIComponent(activeEvent?.id || '')}&category_id=${e.target.value}`, {
                                            preserveScroll: true,
                                            preserveState: true,
                                        });
                                    }
                                }}
                                className="w-full rounded-xl border border-[#d9d0c5] bg-[#fcfbf9] px-3.5 py-2.5 pr-9 text-xs font-bold text-[#201a16] transition-colors focus:border-[#b17c13] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            >
                                <optgroup label="Nomor Embu">
                                    {categories.filter((c) => c.type === 'embu').map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            [EMBU] {cat.name} ({cat.own_athletes_count} Atlet Anda)
                                        </option>
                                    ))}
                                </optgroup>
                                <optgroup label="Nomor Randori">
                                    {categories.filter((c) => c.type === 'randori').map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            [RANDORI] {cat.name} ({cat.own_athletes_count} Atlet Anda)
                                        </option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>
                    </div>

                    {selectedCategory && (
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black ${
                                selectedCategory.type === 'embu'
                                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                                    : 'bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-200'
                            }`}>
                                <i className={`fa-solid ${selectedCategory.type === 'embu' ? 'fa-ranking-star' : 'fa-hand-fist'}`} />
                                {selectedCategory.type === 'embu' ? 'Embu' : 'Randori'}
                            </span>
                            <span className="rounded-lg bg-amber-200/80 px-2.5 py-1 text-xs font-black text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                                {selectedCategory.own_athletes_count ?? categories.find((c) => c.id === selectedCategory.id)?.own_athletes_count ?? 1} Atlet Kontingen Anda
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Selected Category Header & Notice */}
            {selectedCategory && (
                <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50/90 via-amber-100/60 to-yellow-50/80 p-4 shadow-sm dark:border-amber-600/40 dark:from-amber-950/40 dark:via-amber-900/30 dark:to-yellow-950/20">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase text-slate-950">
                                    {selectedCategory.type === 'embu' ? 'EMBU' : 'RANDORI'}
                                </span>
                                <h2 className="text-base font-black text-amber-950 dark:text-amber-100">
                                    {selectedCategory.name}
                                </h2>
                            </div>
                            <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-300/80">
                                <i className="fa-solid fa-circle-info mr-1 text-amber-600" />
                                Peserta dari <strong>{myContingent?.name || 'Kontingen Anda'}</strong> ditandai khusus dengan <strong>warna kuning emas</strong> agar mudah dibandingkan dengan kontingen lain.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Podium / Juara Resmi jika ada */}
            {champions && champions.length > 0 && (
                <div className="rounded-2xl border border-[#e6dfd6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <h3 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#817970] dark:text-slate-400">
                        <i className="fa-solid fa-trophy text-amber-500" />
                        Hasil Juara Resmi
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {champions.map((champ) => {
                            const medalTone = champ.rank === 1 ? 'border-yellow-400 bg-yellow-50/80 text-yellow-950' : champ.rank === 2 ? 'border-slate-300 bg-slate-50 text-slate-800' : 'border-amber-400 bg-amber-50/70 text-amber-950';
                            return (
                                <div
                                    key={champ.id}
                                    className={`relative overflow-hidden rounded-xl border p-3.5 transition-all ${champ.is_own
                                            ? 'border-2 border-amber-400 bg-amber-100/90 text-amber-950 shadow-md ring-2 ring-amber-300/50'
                                            : medalTone
                                        }`}
                                >
                                    {champ.is_own && (
                                        <div className="absolute right-2 top-2 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-950 shadow-xs">
                                            Kontingen Anda
                                        </div>
                                    )}
                                    <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">
                                        {champ.rank_label}
                                    </p>
                                    <h4 className="mt-1 font-black text-sm text-slate-900 dark:text-white">
                                        {champ.athlete_name}
                                    </h4>
                                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                                        {champ.contingent_name}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Matches / Participants list */}
            {selectedCategory?.type === 'embu' ? (
                <div className="overflow-hidden rounded-2xl border border-[#e6dfd6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="border-b border-[#eee8e0] px-5 py-3.5 dark:border-slate-800">
                        <h3 className="text-xs font-black uppercase tracking-wider text-[#817970] dark:text-slate-400">
                            Daftar Penampilan & Nilai Peserta Embu ({matches.length} Peserta)
                        </h3>
                    </div>
                    {matches.length ? (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[750px] text-left text-xs">
                                <thead className="bg-[#f8f5f1] text-[10px] uppercase tracking-[0.08em] text-[#7e766e] dark:bg-slate-800 dark:text-slate-300">
                                    <tr>
                                        <th className="px-4 py-3">Giliran</th>
                                        <th className="px-4 py-3">Babak / Pool</th>
                                        <th className="px-4 py-3">Nama Atlet / Tim</th>
                                        <th className="px-4 py-3">Kontingen</th>
                                        <th className="px-4 py-3">Arena</th>
                                        <th className="px-4 py-3 text-center">Skor Tengah</th>
                                        <th className="px-4 py-3 text-center">Denda</th>
                                        <th className="px-4 py-3 text-center">Nilai Akhir</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#eee8e0] dark:divide-slate-800">
                                    {matches.map((m) => (
                                        <tr
                                            key={m.id}
                                            className={`transition-colors ${m.is_own
                                                    ? 'bg-amber-100/90 font-bold text-amber-950 dark:bg-amber-950/50 dark:text-amber-100 hover:bg-amber-200/90'
                                                    : 'hover:bg-[#fcfaf7] dark:hover:bg-slate-800/40 text-[#2c2621] dark:text-slate-200'
                                                }`}
                                        >
                                            <td className="px-4 py-3 font-mono font-black">
                                                #{m.sequence || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {m.round_label} {m.pool ? `(Pool ${m.pool})` : ''}
                                            </td>
                                            <td className="px-4 py-3 font-extrabold">
                                                {m.participant_label}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span>{m.contingent_name}</span>
                                                    {m.is_own && (
                                                        <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-950 shadow-xs">
                                                            Kontingen Anda
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-[#766e67] dark:text-slate-400">
                                                {m.court}
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono font-semibold">
                                                {m.middle_score !== null && m.middle_score !== undefined ? Number(m.middle_score).toFixed(2) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono font-semibold">
                                                {m.total_penalty !== null && m.total_penalty !== undefined ? (
                                                    <span className={Number(m.total_penalty) > 0 ? 'text-red-600' : 'text-slate-600 dark:text-slate-300'}>
                                                        {Number(m.total_penalty).toFixed(2)}
                                                    </span>
                                                ) : (
                                                    <span className="text-[#817970] dark:text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {m.final_score !== null && m.final_score !== undefined ? (
                                                    <span className={`font-mono text-sm font-black ${m.is_own ? 'text-[#854d0e] dark:text-amber-300' : 'text-[#b17c13] dark:text-amber-400'}`}>
                                                        {Number(m.final_score).toFixed(2)}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-[#817970] dark:text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${m.status === 'completed'
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : m.status === 'in_progress'
                                                            ? 'bg-amber-200 text-amber-900'
                                                            : m.status === 'ready'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : 'bg-stone-100 text-stone-600 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}>
                                                    {m.status_label}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-xs text-[#817970] dark:text-slate-400">
                            Bagan atau jadwal pertandingan Embu belum dibuat untuk nomor ini.
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Interactive Tournament Bracket Tree */}
                    {matches && matches.length > 0 && (
                        <div className="overflow-hidden rounded-2xl border border-[#e6dfd6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <RandoriBracketTree
                                matches={matches}
                                activeEvent={activeEvent}
                                categoryName={selectedCategory?.name || ''}
                                categoryFormat={selectedCategory?.format || 'single_elimination'}
                                highlightContingentId={myContingent?.id}
                                highlightContingentName={myContingent?.name}
                                highlightEntryIds={highlightEntryIds}
                                highlightAthleteNames={highlightAthleteNames}
                            />
                        </div>
                    )}

                    {/* Match Cards List */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-xs font-black uppercase tracking-wider text-[#817970] dark:text-slate-400">
                                Daftar Partai Tanding Randori ({matches.length} Partai)
                            </h3>
                        </div>
                        {matches.length ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {matches.map((m) => (
                                    <div
                                        key={m.id}
                                        className={`overflow-hidden rounded-2xl border p-4 transition-all ${m.is_involving_own
                                                ? 'border-2 border-amber-400/90 bg-amber-50/50 dark:border-amber-500/70 dark:bg-amber-950/20 shadow-sm'
                                                : 'border-[#e6dfd6] bg-white dark:border-slate-800 dark:bg-slate-900'
                                            }`}
                                    >
                                        <div className="mb-3 flex items-center justify-between text-[11px]">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-black text-amber-700 dark:text-amber-400">
                                                    Partai #{m.sequence || '-'}
                                                </span>
                                                <span className="text-[#817970] dark:text-slate-400">· {m.round_label}</span>
                                                <span className="text-[#817970] dark:text-slate-400">· {m.court}</span>
                                            </div>
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${m.status === 'completed'
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : m.status === 'in_progress'
                                                        ? 'bg-amber-200 text-amber-900'
                                                        : 'bg-stone-100 text-stone-600 dark:bg-slate-800 dark:text-slate-400'
                                                }`}>
                                                {m.status_label}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
                                            {/* AKA */}
                                            <div className={`rounded-xl border p-2.5 ${m.red?.is_own
                                                    ? 'border-2 border-amber-400 bg-amber-100/90 text-amber-950 font-bold dark:bg-amber-950/60 dark:text-amber-100'
                                                    : 'border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20'
                                                }`}>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase text-red-600">AKA</span>
                                                    {m.red?.is_own && (
                                                        <span className="rounded bg-amber-400 px-1 py-0.2 text-[8px] font-black uppercase text-slate-950">
                                                            Anda
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 font-bold text-slate-900 dark:text-white truncate">
                                                    {m.red?.athlete_name || m.aka_label}
                                                </p>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                    {m.red?.contingent_name || m.aka_contingent}
                                                </p>
                                                <p className="mt-1 font-mono text-xl font-black text-red-600">
                                                    {m.red?.score ?? (m.score?.aka_total ?? '-')}
                                                </p>
                                            </div>

                                            <span className="px-1 text-center font-black text-[#aaa29a]">VS</span>

                                            {/* SHIRO */}
                                            <div className={`rounded-xl border p-2.5 ${m.blue?.is_own
                                                    ? 'border-2 border-amber-400 bg-amber-100/90 text-amber-950 font-bold dark:bg-amber-950/60 dark:text-amber-100'
                                                    : 'border-blue-200 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20'
                                                }`}>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase text-blue-600">SHIRO</span>
                                                    {m.blue?.is_own && (
                                                        <span className="rounded bg-amber-400 px-1 py-0.2 text-[8px] font-black uppercase text-slate-950">
                                                            Anda
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 font-bold text-slate-900 dark:text-white truncate">
                                                    {m.blue?.athlete_name || m.shiro_label}
                                                </p>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                    {m.blue?.contingent_name || m.shiro_contingent}
                                                </p>
                                                <p className="mt-1 font-mono text-xl font-black text-blue-600">
                                                    {m.blue?.score ?? (m.score?.shiro_total ?? '-')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-[#ddd4c9] bg-white p-8 text-center text-xs text-[#817970] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                                Bagan atau jadwal pertandingan Randori belum dibuat untuk nomor ini.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
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
        form.transform((data) => ({ ...data, ...(editing ? { _method: 'put' } : {}) }));
        form.post(endpoint, {
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
        bracket: (
            <BracketSection
                categories={props.categories}
                selectedCategory={props.selected_category}
                matches={props.matches}
                highlightContingentId={props.highlight_contingent_id}
                highlightContingentName={props.highlight_contingent_name}
                highlightEntryIds={props.highlight_entry_ids}
                highlightAthleteNames={props.highlight_athlete_names}
                activeEvent={props.portal?.event}
            />
        ),
        results: <ResultsSection results={props.results} medalSummary={props.medal_summary} />,
        'embu-results': (
            <EmbuResultsSection
                results={props.embu_results}
                categories={props.categories}
                activeEvent={props.portal?.event}
            />
        ),
        'randori-results': (
            <RandoriResultsSection
                results={props.randori_results}
                categories={props.categories}
                selectedCategory={props.selected_category}
                bracketMatches={props.bracket_matches}
                myContingent={props.my_contingent}
                highlightEntryIds={props.highlight_entry_ids}
                highlightAthleteNames={props.highlight_athlete_names}
                activeEvent={props.portal?.event}
            />
        ),
        'category-results': (
            <CategoryResultsSection
                categories={props.categories}
                selectedCategory={props.selected_category}
                champions={props.champions}
                matches={props.matches}
                myContingent={props.my_contingent}
                activeEvent={props.portal?.event}
                highlightEntryIds={props.highlight_entry_ids}
                highlightAthleteNames={props.highlight_athlete_names}
            />
        ),
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
                {['schedule', 'bracket', 'results', 'embu-results', 'randori-results', 'category-results'].includes(props.section) && <EventFilter portal={props.portal} section={props.section} />}
                {content}
            </div>
        </ContingentLayout>
    );
}
