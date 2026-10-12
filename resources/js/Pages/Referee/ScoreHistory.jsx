import Combobox from '@/Components/UI/Forms/Combobox';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';

const aspectGroups = [
    {
        label: 'Penguasaan Teknik',
        items: [
            ['goho_attack', 'Serangan (Kougeki)'],
            ['goho_defense', 'Bertahan (Bougyo)'],
            ['goho_counter', 'Serangan Balasan'],
            ['juho_escape', 'Shuha & Nukiwaza'],
            ['juho_lock_throw', 'Gyakuwaza & Nagewaza'],
            ['juho_ground', 'Katamewaza'],
        ],
    },
    {
        label: 'Penghayatan & Ekspresi',
        items: [
            ['expression_sequence', 'Rangkaian, Irama & Harmoni'],
            ['expression_stance', 'Tai Gamae & Kuda-kuda'],
            ['expression_spirit', 'Semangat & Disiplin'],
            ['expression_breath_zanshin', 'Nafas, Pandangan & Zanshin'],
        ],
    },
];

const formatScore = (value) => Number(value || 0).toFixed(Number(value || 0) % 1 === 0 ? 0 : 2);

function SummaryCard({ icon, label, value, helper, tone = 'amber' }) {
    const tones = {
        amber: 'bg-amber-50 text-amber-700',
        emerald: 'bg-emerald-50 text-emerald-700',
        blue: 'bg-blue-50 text-blue-700',
        slate: 'bg-slate-100 text-slate-700',
    };

    return (
        <article className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
                <i className={`fa-solid ${icon}`} aria-hidden="true" />
            </span>
            <p className="mt-4 text-xs font-semibold text-[#766e66]">{label}</p>
            <p className="mt-1 text-2xl font-black text-[#17120f]">{value}</p>
            <p className="mt-1 text-xs text-[#958c83]">{helper}</p>
        </article>
    );
}

function ScoreCard({ score }) {
    const isSubmitted = score.status === 'submitted';

    return (
        <article className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm">
            <div className="border-b border-[#eee8e0] bg-[#fbfaf8] p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">Embu</span>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${isSubmitted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{score.status_label}</span>
                            {score.tiebreak_round > 0 && <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">Tanding ulang {score.tiebreak_round}</span>}
                        </div>
                        <h2 className="mt-3 break-words text-lg font-bold leading-snug text-[#17120f]">{score.category_name || 'Nomor Embu'}</h2>
                        <p className="mt-1 text-sm font-semibold text-[#8a631c]">{score.participant || 'Peserta belum dicatat'}</p>
                    </div>
                    <div className="shrink-0 rounded-xl border border-[#eadfcd] bg-white px-4 py-3 text-left sm:text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#9b8e81]">Total Nilai</p>
                        <p className="mt-1 font-mono text-3xl font-black text-[#b92f24]">{formatScore(score.total_score)}</p>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#756d65]">
                    <span><i className="fa-solid fa-location-dot mr-1.5 text-[#b92f24]" aria-hidden="true" />{score.court || 'Court belum dicatat'}</span>
                    <span><i className="fa-solid fa-list-ol mr-1.5 text-[#b92f24]" aria-hidden="true" />Partai #{score.sequence || '-'} · {score.round_label || 'Babak belum dicatat'}{score.pool ? ` · Pool ${score.pool}` : ''}</span>
                    <span><i className="fa-solid fa-calendar-days mr-1.5 text-[#b92f24]" aria-hidden="true" />{score.scheduled_at || 'Jadwal belum dicatat'}</span>
                    <span><i className="fa-solid fa-user-shield mr-1.5 text-[#b92f24]" aria-hidden="true" />Juri {score.judge_number} · {score.role_label}</span>
                </div>
            </div>

            <div className="space-y-5 p-4 sm:p-5">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="rounded-xl bg-[#f7f4ef] p-3 text-center"><p className="text-[9px] font-bold uppercase tracking-wider text-[#91877e]">Teknik</p><p className="mt-1 font-mono text-xl font-black text-[#17120f]">{formatScore(score.technique_subtotal)}</p></div>
                    <div className="rounded-xl bg-[#f7f4ef] p-3 text-center"><p className="text-[9px] font-bold uppercase tracking-wider text-[#91877e]">Ekspresi</p><p className="mt-1 font-mono text-xl font-black text-[#17120f]">{formatScore(score.expression_subtotal)}</p></div>
                    <div className="rounded-xl bg-[#fff6df] p-3 text-center"><p className="text-[9px] font-bold uppercase tracking-wider text-[#9d711e]">Aspek</p><p className="mt-1 font-mono text-xl font-black text-[#9d711e]">{score.completed_items}/10</p></div>
                </div>

                {aspectGroups.map((group) => (
                    <section key={group.label} aria-label={group.label}>
                        <h3 className="text-xs font-bold uppercase tracking-[.12em] text-[#9b7329]">{group.label}</h3>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {group.items.map(([key, label], index) => (
                                <div key={key} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-[#eee7de] bg-[#fcfbf9] px-3 py-2.5">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f0e7d7] text-[10px] font-bold text-[#8a631c]">{index + 1}</span>
                                        <span className="text-xs font-medium leading-4 text-[#514a43]">{label}</span>
                                    </div>
                                    <strong className="font-mono text-lg text-[#17120f]">{score.aspect_scores?.[key] ?? '-'}</strong>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}

                {score.notes && <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800"><strong className="block text-xs uppercase tracking-wide">Catatan</strong>{score.notes}</div>}

                <div className="flex flex-col gap-2 border-t border-[#eee8e0] pt-4 text-xs text-[#777068] sm:flex-row sm:items-center sm:justify-between">
                    <span className={score.is_signed ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'}><i className={`fa-solid ${score.is_signed ? 'fa-signature' : 'fa-triangle-exclamation'} mr-1.5`} aria-hidden="true" />{score.is_signed ? 'Tanda tangan tercatat' : 'Belum ditandatangani'}</span>
                    <span>{isSubmitted ? `Dikirim ${score.submitted_at}` : `Terakhir disimpan ${score.updated_at}`}</span>
                </div>
            </div>
        </article>
    );
}

export default function RefereeScoreHistory({ activeEvent, events = [], referee, summary, scores }) {
    const history = scores?.data || [];

    return (
        <AdminLayout title="Riwayat Penilaian">
            <Head title="Riwayat Penilaian | Portal Wasit" />
            <div className="space-y-5 pb-8 sm:space-y-6 sm:pb-10">
                <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#0f0d0b] via-[#211b16] to-[#0f0d0b] p-5 text-white shadow-xl md:p-6">
                    <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#d4a843]/15 blur-3xl" />
                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-3xl">
                            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#e1b94e]"><i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /> Arsip Nilai Wasit</p>
                            <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight md:text-3xl">Riwayat Penilaian Embu</h1>
                            <p className="mt-2.5 text-sm leading-relaxed text-white/70">Seluruh draft dan nilai yang pernah Anda kirim pada event ini. Riwayat hanya dapat dilihat oleh akun {referee.name}.</p>
                            <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-[#d4a843]/30 bg-[#d4a843]/10 px-3 py-1 text-xs font-semibold text-[#f0c060]"><i className="fa-solid fa-trophy shrink-0" aria-hidden="true" /><span className="truncate">{activeEvent.name}</span></p>
                        </div>
                        {events.length > 1 && <Combobox label="Event tugas" labelClassName="text-white/60" containerClassName="w-full xl:w-96" value={activeEvent.id} clearable={false} onChange={(value) => router.get('/wasit/history', { event_id: value })} options={events.map((event) => ({ value: event.id, label: event.name, sublabel: [event.status_label, event.date_label, event.city].filter(Boolean).join(' · ') }))} />}
                    </div>
                </section>

                <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4" aria-label="Ringkasan riwayat penilaian">
                    <SummaryCard icon="fa-clipboard-list" label="Seluruh Penilaian" value={summary.total} helper="draft dan terkirim" />
                    <SummaryCard icon="fa-circle-check" label="Sudah Dikirim" value={summary.submitted} helper="nilai resmi tersimpan" tone="emerald" />
                    <SummaryCard icon="fa-pen-ruler" label="Draft" value={summary.drafts} helper="belum dikirim" tone="blue" />
                    <SummaryCard icon="fa-chart-simple" label="Rata-rata Nilai" value={summary.average_score ?? '-'} helper="dari nilai terkirim" tone="slate" />
                </section>

                {history.length > 0 ? (
                    <section className="space-y-4" aria-label="Daftar riwayat penilaian">
                        {history.map((score) => <ScoreCard key={score.id} score={score} />)}
                    </section>
                ) : (
                    <section className="rounded-2xl border border-dashed border-[#d8d0c5] bg-white px-5 py-14 text-center shadow-sm">
                        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5efe5] text-2xl text-[#b8872d]"><i className="fa-solid fa-clipboard-check" aria-hidden="true" /></span>
                        <h2 className="mt-4 text-lg font-bold text-[#17120f]">Belum ada riwayat penilaian</h2>
                        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#7a746e]">Nilai akan muncul di sini setelah Anda mulai mengisi lembar penilaian Embu pada Papan Penilaian.</p>
                    </section>
                )}

                {scores.last_page > 1 && (
                    <nav aria-label="Navigasi halaman riwayat" className="flex items-center justify-between gap-3 rounded-2xl border border-[#e5ded4] bg-white p-3 shadow-sm sm:p-4">
                        {scores.prev_page_url ? <Link href={scores.prev_page_url} preserveScroll className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#ded6cb] px-4 text-sm font-bold text-[#514a43] hover:bg-[#f8f5f0]"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Sebelumnya</Link> : <span />}
                        <span className="text-xs font-semibold text-[#766e66]">Halaman {scores.current_page} dari {scores.last_page}</span>
                        {scores.next_page_url ? <Link href={scores.next_page_url} preserveScroll className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#ded6cb] px-4 text-sm font-bold text-[#514a43] hover:bg-[#f8f5f0]">Berikutnya <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link> : <span />}
                    </nav>
                )}
            </div>
        </AdminLayout>
    );
}
