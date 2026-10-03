import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import AdminLayout from '@/Layouts/AdminLayout';
import Button from '@/Components/UI/Elements/Button';
import Combobox from '@/Components/UI/Forms/Combobox';
import Input from '@/Components/UI/Forms/Input';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

const statusMeta = {
    draft: { label: 'Draft', classes: 'bg-slate-100 text-slate-700 border-slate-200' },
    generated: { label: 'Sudah dibuat', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
    published: { label: 'Dipublikasikan', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    in_progress: { label: 'Sedang berlangsung', classes: 'bg-violet-50 text-violet-700 border-violet-200' },
    completed: { label: 'Selesai', classes: 'bg-slate-800 text-white border-slate-800' },
    skipped: { label: 'Perlu merge', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const formatLabels = {
    single_elimination: 'Sistem gugur tunggal',
    double_elimination: 'Sistem gugur ganda',
    embu_direct_final: 'Embu satu pool + final',
    embu_2_pools: 'Embu 2 pool · 4 terbaik/pool',
    embu_3_pools: 'Embu 3 pool · 3 terbaik/pool',
    embu_4_pools: 'Embu 4 pool · 2 terbaik/pool',
};

const groupBy = (items, keyFor) => Object.entries(items.reduce((groups, item) => {
    const key = keyFor(item);
    return { ...groups, [key]: [...(groups[key] || []), item] };
}, {}));

function StatusBadge({ status }) {
    const meta = statusMeta[status] || statusMeta.draft;
    return <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none ${meta.classes}`}>{meta.label}</span>;
}

function WorkflowStep({ number, title, caption, active, complete }) {
    return (
        <div className={`min-w-[220px] flex-1 rounded-xl border p-3.5 ${active ? 'border-[#d4a843] bg-[#fff9e9]' : 'border-white/10 bg-white/5'}`}>
            <div className="flex items-center gap-2.5">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${complete ? 'bg-emerald-500 text-white' : active ? 'bg-[#d4a843] text-[#17120f]' : 'bg-white/10 text-white'}`}>
                    {complete ? <i className="fa-solid fa-check" /> : number}
                </span>
                <div className="min-w-0">
                    <p className={`text-sm font-bold leading-tight ${active ? 'text-[#17120f]' : 'text-white'}`}>{title}</p>
                    <p className={`mt-1 text-xs leading-tight ${active ? 'text-[#786a55]' : 'text-white/60'}`}>{caption}</p>
                </div>
            </div>
        </div>
    );
}

function MatchCard({ match }) {
    const schedule = match.scheduled_start_formatted
        ? `${match.scheduled_start_formatted}–${match.scheduled_end_formatted}`
        : 'Belum terjadwal';

    if (match.participant_label) {
        return (
            <article className="rounded-xl border border-[#e8e1d8] bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-[#9a6b20]">Partai #{match.sequence} · {match.pool ? `Pool ${match.pool}` : match.round_label}</p>
                        <p className="mt-1.5 text-base font-bold leading-snug text-[#17120f]">{match.participant_label}</p>
                        {match.metadata?.members?.length > 0 && <p className="mt-1 text-sm leading-relaxed text-[#746b63]">{match.metadata.members.join(' · ')}</p>}
                    </div>
                    <i className="fa-solid fa-people-group mt-1 text-[#c0392b]" />
                </div>
                <p className="mt-3 border-t border-[#eee8e0] pt-2 text-xs leading-relaxed text-[#746b63]">{schedule} · {match.court || 'Lapangan belum ditentukan'}</p>
            </article>
        );
    }

    return (
        <article className="overflow-hidden rounded-xl border border-[#e8e1d8] bg-white shadow-sm">
            <div className="flex items-center justify-between bg-[#f7f4ef] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#746b63]">
                <span>Partai #{match.sequence} · {match.round_label}</span>
                {match.is_bye && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">BYE</span>}
            </div>
            <div className="divide-y divide-[#eee8e0]">
                <div className="flex items-center gap-2 px-3 py-3 text-sm font-semibold"><span className="h-3 w-3 rounded-full bg-red-600" />{match.red_label || 'Menunggu hasil'}</div>
                <div className="flex items-center gap-2 px-3 py-3 text-sm font-semibold"><span className="h-3 w-3 rounded-full border border-slate-300 bg-white" />{match.blue_label || 'Menunggu hasil'}</div>
            </div>
            <p className="border-t border-[#eee8e0] px-3 py-2 text-xs leading-relaxed text-[#746b63]">{schedule} · {match.court || 'Lapangan belum ditentukan'}</p>
        </article>
    );
}

function EmbuStandingsTable({ title, nodes }) {
    const orderedNodes = [...nodes].sort((left, right) => {
        const leftRank = Number(left.metadata?.rank || Number.MAX_SAFE_INTEGER);
        const rightRank = Number(right.metadata?.rank || Number.MAX_SAFE_INTEGER);

        return leftRank - rightRank || left.position - right.position;
    });

    return (
        <section className="overflow-hidden rounded-2xl border border-[#e8e1d8] bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-[#e8e1d8] bg-[#f8f5f0] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#3f3933]">{title}</h3>
                    <p className="mt-1 text-xs text-[#8c827a]">Urutan sementara mengikuti nomor tampil sampai nilai dan peringkat disahkan.</p>
                </div>
                <span className="self-start rounded-full border border-[#e2d8ca] bg-white px-3 py-1 text-xs font-semibold text-[#6f655c] sm:self-auto">
                    {nodes.length} peserta / tim
                </span>
            </div>

            <TableContainer ariaLabel="Tabel data">
                <table className="responsive-data-table whitespace-nowrap w-full min-w-[980px] border-collapse text-left text-sm">
                    <thead>
                        <tr className="border-b border-[#e8e1d8] bg-white text-xs font-bold uppercase tracking-wide text-[#7a7067]">
                            <th className="w-20 px-4 py-3 text-center">Peringkat</th>
                            <th className="w-20 px-4 py-3 text-center">No. Tampil</th>
                            <th className="min-w-[250px] px-4 py-3">Tim / Kontingen</th>
                            <th className="min-w-[260px] px-4 py-3">Anggota</th>
                            <th className="w-32 px-4 py-3 text-center">Nilai</th>
                            <th className="min-w-[190px] px-4 py-3">Jadwal</th>
                            <th className="w-36 px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eee8e0]">
                        {orderedNodes.map((match, index) => {
                            const rank = match.metadata?.rank;
                            const score = match.metadata?.total_score;
                            const members = match.metadata?.members || [];
                            const teamLabel = match.participant_label || 'Menunggu hasil pool';

                            return (
                                <tr key={match.id} className="transition-colors hover:bg-[#fcfaf6]">
                                    <td className="px-4 py-3.5 text-center">
                                        <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-bold ${rank ? 'bg-[#17120f] text-[#f0c060]' : 'bg-[#f1ede7] text-[#766d65]'}`}>
                                            {rank || '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-center font-mono text-sm font-bold text-[#4f4740]">{match.position || index + 1}</td>
                                    <td className="px-4 py-3.5">
                                        <p className="font-bold leading-snug text-[#17120f]">{teamLabel}</p>
                                        {match.metadata?.city && <p className="mt-1 text-xs text-[#8c827a]">{match.metadata.city}</p>}
                                    </td>
                                    <td className="px-4 py-3.5">
                                        {members.length > 0 ? (
                                            <ol className="space-y-1 text-sm text-[#5f574f]">
                                                {members.map((member, memberIndex) => <li key={`${match.id}-${member}`}><span className="mr-1.5 text-xs text-[#a79c91]">{memberIndex + 1}.</span>{member}</li>)}
                                            </ol>
                                        ) : <span className="text-sm italic text-[#a79c91]">Peserta ditentukan dari hasil pool</span>}
                                    </td>
                                    <td className="px-4 py-3.5 text-center">
                                        <span className={`text-base font-bold ${score !== undefined && score !== null ? 'text-[#17120f]' : 'text-[#a79c91]'}`}>
                                            {score !== undefined && score !== null ? Number(score).toLocaleString('id-ID', { minimumFractionDigits: 2 }) : '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <p className="font-medium text-[#4f4740]">{match.scheduled_start_formatted ? `${match.scheduled_start_formatted}–${match.scheduled_end_formatted}` : 'Belum terjadwal'}</p>
                                        <p className="mt-1 text-xs text-[#8c827a]">{match.court || 'Lapangan belum ditentukan'}</p>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${match.status === 'finished' ? 'bg-emerald-50 text-emerald-700' : match.status === 'live' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {match.status === 'finished' ? 'Selesai dinilai' : match.status === 'live' ? 'Sedang tampil' : 'Menunggu'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table></TableContainer>
        </section>
    );
}

function BracketView({ category, drawing, matches }) {
    if (!drawing) {
        return <EmptyState icon="fa-diagram-project" title="Bagan kategori ini belum dibuat" description="Jalankan Generate Semua atau buat ulang kategori ini untuk membentuk node pertandingan." />;
    }

    if (drawing.status === 'skipped') {
        return <EmptyState icon="fa-object-group" title="Kategori memerlukan merge" description={drawing.skip_reason} />;
    }

    if (category?.type === 'embu') {
        const groups = groupBy(matches, (match) => `${match.round_label}${match.pool ? ` · Pool ${match.pool}` : ''}`);
        return (
            <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-blue-900">
                    <i className="fa-solid fa-ranking-star mt-0.5 text-blue-600" />
                    <div>
                        <p className="text-sm font-bold">Format klasemen Embu</p>
                        <p className="mt-1 text-xs leading-relaxed text-blue-800">Nilai dan peringkat akan tampil pada tabel setelah penilaian disahkan. Jika memakai beberapa pool, peserta final berasal dari peringkat terbaik setiap pool.</p>
                    </div>
                </div>
                {groups.map(([group, nodes]) => <EmbuStandingsTable key={group} title={group} nodes={nodes} />)}
            </div>
        );
    }

    const rounds = groupBy(matches, (match) => match.round_label);
    return (
        <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max items-stretch gap-4">
                {rounds.map(([round, nodes]) => <section key={round} className="w-72 rounded-2xl bg-[#f8f5f0] p-3">
                    <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold uppercase tracking-wide text-[#5f574f]">{round}</h3><span className="rounded-full bg-white px-2 py-1 text-xs text-[#8c827a]">{nodes.length} partai</span></div>
                    <div className="space-y-3">{nodes.map((match) => <MatchCard key={match.id} match={match} />)}</div>
                </section>)}
            </div>
        </div>
    );
}

function EmptyState({ icon, title, description }) {
    return (
        <div className="rounded-2xl border border-dashed border-[#d9c9ad] bg-[#fcfaf6] px-6 py-12 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff1cc] text-[#a47420]"><i className={`fa-solid ${icon}`} /></span>
            <h3 className="mt-4 text-lg font-bold leading-snug text-[#17120f]">{title}</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[#746b63]">{description}</p>
        </div>
    );
}

function ScheduleMatchItem({ match, editable, onEdit }) {
    const participant = match.category_type === 'embu'
        ? match.participant_label || 'Menunggu hasil pool'
        : `${match.red_label || 'Menunggu lawan'} vs ${match.blue_label || 'Menunggu lawan'}`;

    return (
        <article className="rounded-xl border border-[#e5ddd3] bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase ${match.category_type === 'embu' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                    {match.category_type}
                </span>
                <span className="whitespace-nowrap font-mono text-xs font-bold text-[#9a6b20]">{match.scheduled_start_formatted}–{match.scheduled_end_formatted}</span>
            </div>
            <p className="mt-2 text-sm font-bold leading-snug text-[#17120f]">{match.category_name}</p>
            <p className="mt-1 text-xs font-semibold text-[#5f574f]">Partai #{match.sequence} · {match.round_label}</p>
            <p className="mt-2 rounded-lg bg-[#f8f5f0] px-2.5 py-2 text-xs leading-relaxed text-[#4f4740]">{participant}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
                {match.is_bye ? <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">BYE</span> : <span />}
                {editable && <Button variant="unstyled" size="none" type="button" onClick={() => onEdit(match)} className="rounded-lg border border-[#d8cdbf] bg-white px-2.5 py-1.5 text-xs font-bold text-[#5f574f] hover:border-[#c0392b] hover:text-[#c0392b]"><i className="fa-solid fa-pen-to-square mr-1.5" />Ubah</Button>}
            </div>
        </article>
    );
}

function EventScheduleBoard({ courts, sessions, matches, editable, onEdit }) {
    if (matches.length === 0 || courts.length === 0 || sessions.length === 0) {
        return null;
    }

    const gridTemplateColumns = `220px repeat(${courts.length}, minmax(300px, 1fr))`;

    return (
        <section className="overflow-hidden rounded-2xl border border-[#e8e1d8] bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[#e8e1d8] p-4 md:flex-row md:items-center md:justify-between md:p-5">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[.12em] text-[#9a6b20]">Hasil generate semua</p>
                    <h2 className="mt-1 text-lg font-bold text-[#17120f]">Jadwal Pertandingan per Sesi & Court</h2>
                    <p className="mt-1 text-sm leading-relaxed text-[#746b63]">Setiap nomor pertandingan ditempatkan pada satu court tetap dari babak awal sampai final.</p>
                </div>
                <div className="flex items-center gap-2 self-start md:self-auto">
                    {editable && <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800"><i className="fa-solid fa-pen mr-1.5" />Mode edit aktif</span>}
                    <span className="rounded-full border border-[#ded5ca] bg-[#f8f5f0] px-3 py-1.5 text-xs font-semibold text-[#5f574f]">{matches.length} partai terjadwal</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <div className="min-w-max">
                    <div className="grid border-b border-[#e8e1d8] bg-[#17120f] text-white" style={{ gridTemplateColumns }}>
                        <div className="border-r border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-wide text-white/65">Sesi / Tanggal</div>
                        {courts.map((court, index) => (
                            <div key={court.id} className="border-r border-white/10 px-4 py-3 last:border-r-0">
                                <p className="text-sm font-bold text-[#f0c060]">Court {index + 1}</p>
                                <p className="mt-0.5 text-xs text-white/60">{court.name}</p>
                            </div>
                        ))}
                    </div>

                    {sessions.map((session) => (
                        <div key={session.id} className="grid border-b border-[#e8e1d8] last:border-b-0" style={{ gridTemplateColumns }}>
                            <div className="border-r border-[#e8e1d8] bg-[#f8f5f0] p-4">
                                <p className="text-sm font-bold text-[#17120f]">{session.name}</p>
                                <p className="mt-2 text-xs font-semibold text-[#9a6b20]">{session.date_formatted}</p>
                                <p className="mt-1 text-xs text-[#746b63]">{session.start_time}{session.end_time ? `–${session.end_time}` : ''}</p>
                            </div>
                            {courts.map((court) => {
                                const courtMatches = matches.filter((match) => match.session_id === session.id && match.court_id === court.id);

                                return (
                                    <div key={`${session.id}-${court.id}`} className="min-h-36 space-y-2.5 border-r border-[#e8e1d8] bg-[#fcfbf9] p-3 last:border-r-0">
                                        {courtMatches.length > 0
                                            ? courtMatches.map((match) => <ScheduleMatchItem key={match.id} match={match} editable={editable} onEdit={onEdit} />)
                                            : <div className="flex h-full min-h-28 items-center justify-center rounded-xl border border-dashed border-[#ddd4c9] text-xs text-[#a79c91]">Belum ada pertandingan</div>}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function ScheduleEditorModal({ match, courts, sessions, draft, errors, processing, onChange, onClose, onSave }) {
    if (!match) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <Button variant="unstyled" size="none" type="button" aria-label="Tutup edit jadwal" onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
            <section role="dialog" aria-modal="true" aria-labelledby="schedule-editor-title" className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#e4dbd0] bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-[#eee8e0] px-5 py-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[.12em] text-[#9a6b20]">Edit Jadwal Partai</p>
                        <h2 id="schedule-editor-title" className="mt-1 text-lg font-bold leading-snug text-[#17120f]">{match.category_name}</h2>
                        <p className="mt-1 text-sm text-[#746b63]">Partai #{match.sequence} · {match.round_label}</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 shrink-0 rounded-full p-0" aria-label="Tutup"><i className="fa-solid fa-xmark" aria-hidden="true" /></Button>
                </div>

                <div className="space-y-4 p-5">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-900">
                        <i className="fa-solid fa-circle-info mr-2 text-blue-600" />Perubahan court diterapkan ke seluruh partai dalam nomor pertandingan ini.
                    </div>
                    {(errors.schedule || errors.start_time) && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{errors.schedule || errors.start_time}</div>}

                    <Combobox label="Court Tetap" value={draft.event_court_id} onChange={(value) => onChange('event_court_id', value)}
                        clearable={false} options={courts.map((court) => ({ value: court.id, label: court.name }))} />

                    <Combobox label="Sesi Pertandingan" value={draft.rundown_id} clearable={false} onChange={(value) => {
                        const session = sessions.find((item) => String(item.id) === String(value));
                        onChange('rundown_id', value, session?.start_time);
                    }} options={sessions.map((session) => ({ value: session.id, label: `${session.name} · ${session.date_formatted} (${session.start_time}${session.end_time ? `–${session.end_time}` : ''})` }))} />

                    <Input type="time" label="Jam Mulai" required value={draft.start_time}
                        onChange={(event) => onChange('start_time', event.target.value)} />
                </div>

                <div className="flex flex-col-reverse justify-end gap-2 border-t border-[#eee8e0] bg-[#fcfaf7] px-5 py-4 sm:flex-row">
                    <Button type="button" variant="outline" onClick={onClose} disabled={processing} className="w-full sm:w-auto">Batal</Button>
                    <Button type="button" onClick={onSave} loading={processing} disabled={!draft.event_court_id || !draft.rundown_id || !draft.start_time} className="w-full sm:w-auto"
                        iconLeft={<i className="fa-solid fa-floppy-disk" aria-hidden="true" />}>Simpan Jadwal</Button>
                </div>
            </section>
        </div>
    );
}

export default function TournamentDrawing({ activeEvent, events = [], categories = [], selectedCategory, drawing, matches = [], scheduleCourts = [], scheduleSessions = [], eventSchedule = [], workflow, settings, canManageDrawing }) {
    const [processing, setProcessing] = useState('');
    const [scheduleEditMode, setScheduleEditMode] = useState(false);
    const [editingMatch, setEditingMatch] = useState(null);
    const [scheduleDraft, setScheduleDraft] = useState({ event_court_id: '', rundown_id: '', start_time: '' });
    const [scheduleErrors, setScheduleErrors] = useState({});
    const category = categories.find((item) => item.id === selectedCategory);
    const isPublished = workflow?.status === 'published';
    const isInProgress = workflow?.status === 'in_progress';
    const isCompleted = workflow?.status === 'completed';
    const isLocked = isPublished || isInProgress || isCompleted;
    const eventQuery = activeEvent?.id ? `?event_id=${activeEvent.id}` : '';

    const visit = (data = {}) => router.get('/admin/pertandingan/drawing', { event_id: activeEvent?.id, ...data }, { preserveScroll: true, preserveState: true });
    const post = (url, data = {}, key) => router.post(url, { event_id: activeEvent.id, ...data }, { preserveScroll: true, onStart: () => setProcessing(key), onFinish: () => setProcessing('') });
    const reset = () => router.delete('/admin/pertandingan/drawing/reset', { data: { event_id: activeEvent.id }, preserveScroll: true, onStart: () => setProcessing('reset'), onFinish: () => setProcessing('') });
    const openScheduleEditor = (match) => {
        setEditingMatch(match);
        setScheduleDraft({
            event_court_id: match.court_id || scheduleCourts[0]?.id || '',
            rundown_id: match.session_id || scheduleSessions[0]?.id || '',
            start_time: match.scheduled_start_input || scheduleSessions.find((session) => session.id === match.session_id)?.start_time || '',
        });
        setScheduleErrors({});
    };
    const updateScheduleDraft = (key, value, suggestedStartTime) => setScheduleDraft((current) => ({
        ...current,
        [key]: value,
        ...(key === 'rundown_id' && suggestedStartTime ? { start_time: suggestedStartTime } : {}),
    }));
    const saveSchedule = () => router.put(`/admin/pertandingan/drawing/matches/${editingMatch.id}/schedule`, {
        event_id: activeEvent.id,
        ...scheduleDraft,
    }, {
        preserveScroll: true,
        onStart: () => setProcessing('schedule'),
        onSuccess: () => {
            setEditingMatch(null);
            setScheduleErrors({});
        },
        onError: (errors) => setScheduleErrors(errors),
        onFinish: () => setProcessing(''),
    });
    const resetCompetition = () => {
        if (!window.confirm('Reset seluruh status pertandingan? Bagan dan jadwal tetap disimpan, tetapi status partai serta nilai sementara akan dikembalikan ke awal.')) {
            return;
        }

        post('/admin/pertandingan/drawing/reset-competition', {}, 'reset-competition');
    };

    const stages = [
        { title: 'Precheck', caption: `${workflow?.ready_categories || 0} siap · ${workflow?.merge_categories || 0} perlu merge`, active: workflow?.status === 'draft', complete: workflow?.generated_categories > 0 },
        { title: 'Drawing', caption: `${workflow?.generated_categories || 0}/${workflow?.total_categories || 0} kategori`, active: workflow?.status === 'generated', complete: isPublished },
        { title: 'Penjadwalan', caption: `${workflow?.total_matches || 0} node pertandingan`, active: workflow?.status === 'generated', complete: isPublished },
        { title: 'Publikasi', caption: isCompleted ? 'Event selesai' : isInProgress ? 'Pertandingan berlangsung' : isPublished ? 'Terkunci dan siap digunakan' : 'Menunggu pemeriksaan admin', active: isPublished || isInProgress, complete: isCompleted },
    ];

    return (
        <AdminLayout title="Drawing & Bagan Pertandingan">
            <Head title="Drawing Pertandingan | Smart Perkemi" />
            <div className="space-y-5 font-sans text-[#17120f]">
                <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#0f0d0b] via-[#211b16] to-[#0f0d0b] p-5 text-white shadow-xl md:p-6">
                    <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#d4a843]/15 blur-3xl" />
                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-[.14em] text-[#e1b94e]">Drawing per event</p>
                            <h1 className="mt-1.5 text-2xl font-bold leading-tight tracking-tight md:text-3xl">Generate Bagan & Jadwal Pertandingan</h1>
                            <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-white/70">Peserta terverifikasi dipisahkan antar-kontingen, dibentuk menjadi pool atau bracket, lalu dijadwalkan ke sesi dan lapangan event.</p>
                        </div>
                        <Combobox label="Event aktif" labelClassName="text-white/60" containerClassName="w-full xl:w-96"
                            value={activeEvent?.id || ''} onChange={(value) => router.get('/admin/pertandingan/drawing', { event_id: value })}
                            clearable={false} options={events.map((item) => ({ value: item.id, label: item.name }))} />
                    </div>
                    <div className="relative mt-5 flex gap-3 overflow-x-auto">{stages.map((stage, index) => <WorkflowStep key={stage.title} number={index + 1} {...stage} />)}</div>
                </section>

                {!activeEvent ? <EmptyState icon="fa-calendar-xmark" title="Event belum dipilih" description="Pilih event aktif agar precheck dan drawing dapat dijalankan." /> : <>
                    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                            ['Kategori siap', workflow.ready_categories, 'fa-circle-check', 'text-emerald-600'],
                            ['Perlu merge', workflow.merge_categories, 'fa-object-group', 'text-amber-600'],
                            ['Sudah digenerate', workflow.generated_categories, 'fa-diagram-project', 'text-blue-600'],
                            ['Node pertandingan', workflow.total_matches, 'fa-sitemap', 'text-[#c0392b]'],
                        ].map(([label, value, icon, color]) => <div key={label} className="rounded-xl border border-[#e8e1d8] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-[#746b63]">{label}</p><i className={`fa-solid ${icon} ${color}`} /></div><p className="mt-2 text-3xl font-bold leading-none text-[#17120f]">{value || 0}</p></div>)}
                    </section>

                    {(settings.courts_count === 0 || settings.sessions_count === 0) && <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><i className="fa-solid fa-triangle-exclamation mt-0.5" /><div><p className="font-bold">Jadwal otomatis belum lengkap</p><p className="mt-1 text-sm leading-relaxed text-amber-800">Tambahkan {settings.courts_count === 0 ? 'lapangan aktif' : ''}{settings.courts_count === 0 && settings.sessions_count === 0 ? ' dan ' : ''}{settings.sessions_count === 0 ? 'rundown yang ditandai sebagai sesi pertandingan' : ''} di Detail Event.</p></div></div>}

                    <section className="flex flex-col gap-3 rounded-xl border border-[#e8e1d8] bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-wide text-[#9a6b20]">{activeEvent.name}</p>
                            <p className="mt-1.5 text-sm leading-relaxed text-[#746b63]">Durasi {settings.match_duration_minutes} menit · istirahat minimal {settings.minimum_rest_minutes} menit · syarat {settings.minimum_entries_per_category} peserta/tim dari {settings.minimum_contingents_per_category} kontingen.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link href={`/admin/master/event/${activeEvent.id}/detail`} className="rounded-lg border border-[#ded5ca] px-3.5 py-2.5 text-sm font-semibold text-[#5f574f] hover:bg-[#f7f4ef]"><i className="fa-solid fa-gear mr-1.5" />Pengaturan Event</Link>
                            <Link href={`/admin/pertandingan/merge${eventQuery}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100"><i className="fa-solid fa-object-group mr-1.5" />Merge Kategori</Link>
                            {canManageDrawing && workflow.generated_categories > 0 && !isLocked && <Button variant="unstyled" size="none" type="button" onClick={() => setScheduleEditMode((active) => !active)} className={`rounded-lg border px-3.5 py-2.5 text-sm font-semibold ${scheduleEditMode ? 'border-[#c0392b] bg-[#fff2ef] text-[#a93226]' : 'border-[#ded5ca] text-[#5f574f] hover:bg-[#f7f4ef]'}`}><i className="fa-solid fa-calendar-pen mr-1.5" />{scheduleEditMode ? 'Selesai Edit Jadwal' : 'Edit Jadwal'}</Button>}
                            {canManageDrawing && workflow.generated_categories > 0 && !isInProgress && !isCompleted && <Button variant="unstyled" size="none" type="button" onClick={reset} disabled={!!processing} className="rounded-lg border border-rose-200 px-3.5 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><i className="fa-solid fa-rotate-left mr-1.5" />{processing === 'reset' ? 'Mereset...' : 'Reset Draft'}</Button>}
                            {canManageDrawing && !isLocked && <Button variant="unstyled" size="none" type="button" onClick={() => post('/admin/pertandingan/drawing/generate', {}, 'generate')} disabled={!!processing} className="rounded-lg bg-[#17120f] px-4 py-2.5 text-sm font-bold text-[#f0c060] hover:bg-black disabled:opacity-50"><i className={`fa-solid ${processing === 'generate' ? 'fa-spinner animate-spin' : 'fa-wand-magic-sparkles'} mr-1.5`} />{processing === 'generate' ? 'Membentuk bagan...' : 'Generate Semua'}</Button>}
                            {canManageDrawing && workflow.generated_categories > 0 && !isLocked && <Button variant="unstyled" size="none" type="button" onClick={() => post('/admin/pertandingan/drawing/publish', {}, 'publish')} disabled={!!processing} className="rounded-lg bg-[#a93226] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#8e281e] disabled:opacity-50"><i className="fa-solid fa-lock mr-1.5" />{processing === 'publish' ? 'Menyimpan...' : 'Publikasikan'}</Button>}
                            {canManageDrawing && isPublished && <Button variant="unstyled" size="none" type="button" onClick={() => post('/admin/pertandingan/drawing/unpublish', {}, 'unpublish')} disabled={!!processing} className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50"><i className={`fa-solid ${processing === 'unpublish' ? 'fa-spinner animate-spin' : 'fa-lock-open'} mr-1.5`} />{processing === 'unpublish' ? 'Mengembalikan...' : 'Kembalikan ke Penyusunan'}</Button>}
                            {canManageDrawing && isPublished && <Button variant="unstyled" size="none" type="button" onClick={() => post('/admin/pertandingan/drawing/start', {}, 'start')} disabled={!!processing} className="rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-50"><i className="fa-solid fa-play mr-1.5" />Mulai Pertandingan</Button>}
                            {canManageDrawing && isInProgress && <Button variant="unstyled" size="none" type="button" onClick={() => post('/admin/pertandingan/drawing/complete', {}, 'complete')} disabled={!!processing} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"><i className="fa-solid fa-flag-checkered mr-1.5" />Selesaikan Event</Button>}
                            {canManageDrawing && (isInProgress || isCompleted) && <Button variant="unstyled" size="none" type="button" onClick={resetCompetition} disabled={!!processing} className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"><i className={`fa-solid ${processing === 'reset-competition' ? 'fa-spinner animate-spin' : 'fa-arrow-rotate-left'} mr-1.5`} />{processing === 'reset-competition' ? 'Mereset...' : 'Reset Pertandingan'}</Button>}
                            <Button variant="unstyled" size="none" type="button" onClick={() => window.print()} className="rounded-lg border border-[#ded5ca] px-3.5 py-2.5 text-sm font-semibold text-[#5f574f] hover:bg-[#f7f4ef]"><i className="fa-solid fa-print mr-1.5" />Cetak</Button>
                        </div>
                    </section>

                    <EventScheduleBoard courts={scheduleCourts} sessions={scheduleSessions} matches={eventSchedule} editable={scheduleEditMode && canManageDrawing && !isLocked} onEdit={openScheduleEditor} />

                    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                        <aside className="rounded-2xl border border-[#e8e1d8] bg-white p-3 shadow-sm xl:sticky xl:top-20 xl:self-start">
                            <div className="px-2 pb-3"><h2 className="text-base font-bold">Nomor Pertandingan</h2><p className="mt-1 text-xs leading-relaxed text-[#8c827a]">Klik kategori untuk memeriksa hasil drawing.</p></div>
                            <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">{categories.map((item) => <Button variant="unstyled" size="none" key={item.id} type="button" onClick={() => visit({ category: item.id })} className={`w-full rounded-xl border p-3.5 text-left transition ${selectedCategory === item.id ? 'border-[#d4a843] bg-[#fff9e9]' : 'border-transparent hover:border-[#e8e1d8] hover:bg-[#faf8f4]'}`}><div className="flex items-start justify-between gap-3"><p className="text-sm font-bold leading-snug text-[#17120f]">{item.name}</p><StatusBadge status={item.drawing_status} /></div><p className="mt-2 text-xs leading-relaxed text-[#746b63]">{item.type_label} · {item.participant_count} {item.participant_label.toLowerCase()} · {item.contingent_count} kontingen</p>{!item.is_eligible && <p className="mt-1.5 text-xs leading-relaxed text-amber-700">{item.reason}</p>}</Button>)}</div>
                        </aside>

                        <main className="min-w-0 rounded-2xl border border-[#e8e1d8] bg-white p-4 shadow-sm md:p-5">
                            {category ? <>
                                <div className="mb-5 flex flex-col gap-3 border-b border-[#eee8e0] pb-4 md:flex-row md:items-start md:justify-between">
                                    <div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase ${category.type === 'embu' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>{category.type_label}</span><StatusBadge status={drawing?.status || category.drawing_status} /></div><h2 className="mt-2.5 text-xl font-bold leading-snug tracking-tight text-[#17120f]">{category.name}</h2><p className="mt-1.5 text-sm leading-relaxed text-[#746b63]">{formatLabels[drawing?.format || category.format] || 'Format ditentukan saat generate'} · {category.participant_count} {category.participant_label.toLowerCase()} dari {category.contingent_count} kontingen.</p></div>
                                    {canManageDrawing && !isLocked && <Button variant="unstyled" size="none" type="button" onClick={() => post(`/admin/pertandingan/drawing/category/${category.id}/generate`, {}, 'category')} disabled={!!processing || !category.is_eligible} className="shrink-0 rounded-lg border border-[#ded5ca] px-3.5 py-2.5 text-sm font-semibold text-[#5f574f] hover:bg-[#f7f4ef] disabled:cursor-not-allowed disabled:opacity-45"><i className={`fa-solid ${processing === 'category' ? 'fa-spinner animate-spin' : 'fa-shuffle'} mr-1.5`} />Drawing Ulang Kategori</Button>}
                                </div>
                                <BracketView category={category} drawing={drawing} matches={matches} />
                            </> : <EmptyState icon="fa-list-check" title="Nomor pertandingan belum tersedia" description="Aktifkan nomor pertandingan di Detail Event terlebih dahulu." />}
                        </main>
                    </div>

                </>}
            </div>
            <ScheduleEditorModal
                match={editingMatch}
                courts={scheduleCourts}
                sessions={scheduleSessions}
                draft={scheduleDraft}
                errors={scheduleErrors}
                processing={processing === 'schedule'}
                onChange={updateScheduleDraft}
                onClose={() => setEditingMatch(null)}
                onSave={saveSchedule}
            />
        </AdminLayout>
    );
}
