import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import AdminLayout from '@/Layouts/AdminLayout';
import Button from '@/Components/UI/Elements/Button';
import ActionMenuDropdown from '@/Components/UI/Elements/ActionMenuDropdown';
import Combobox from '@/Components/UI/Forms/Combobox';
import Input from '@/Components/UI/Forms/Input';
import AlertConfirm from '@/Components/UI/Feedback/AlertConfirm';
import Modal from '@/Components/UI/Overlays/Modal';
import RandoriBracketTree from '@/Pages/Admin/Panitera/Partials/RandoriBracketTree';
import { Head, Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';

const statusMeta = {
    draft: { label: 'Belum digenerate', classes: 'bg-amber-50 text-amber-800 border-amber-300' },
    not_generated: { label: 'Belum digenerate', classes: 'bg-amber-50 text-amber-800 border-amber-300' },
    generated: { label: 'Sudah dibuat', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
    published: { label: 'Dipublikasikan', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    in_progress: { label: 'Sedang berlangsung', classes: 'bg-violet-50 text-violet-700 border-violet-200' },
    completed: { label: 'Selesai', classes: 'bg-slate-800 text-white border-slate-800' },
    skipped: { label: 'Perlu merge', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const formatLabels = {
    round_robin: 'Setengah Kompetisi (Round Robin)',
    double_elimination: 'Sistem Gugur Ganda (Double Elimination)',
    single_elimination: 'Sistem Gugur Tunggal (Single Elimination)',
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
    const schedule = match.is_bye
        ? 'Lolos otomatis · Tidak memerlukan jadwal'
        : match.scheduled_start_formatted
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

    const redDisqualified = Boolean(match.metadata?.red_weigh_in_disqualified);
    const blueDisqualified = Boolean(match.metadata?.blue_weigh_in_disqualified);
    const isWO = match.metadata?.result?.is_walkover || match.metadata?.result?.win_method === 'walkover_weigh_in';

    const resolveContingent = (contingentDirect, metaCorner) => {
        if (contingentDirect && typeof contingentDirect === 'string') return contingentDirect;
        if (contingentDirect?.name) return contingentDirect.name;
        if (metaCorner?.contingent_name) return metaCorner.contingent_name;
        if (metaCorner?.city) return metaCorner.city;
        if (metaCorner?.contingent && typeof metaCorner.contingent === 'string') return metaCorner.contingent;
        if (metaCorner?.contingent?.name) return metaCorner.contingent.name;
        return '';
    };

    const redContingent = resolveContingent(
        match.aka_contingent || match.red_contingent,
        match.metadata?.red
    );

    const blueContingent = resolveContingent(
        match.shiro_contingent || match.blue_contingent,
        match.metadata?.blue
    );

    const isPlaceholder = (label) => {
        if (!label) return true;
        const trimmed = label.trim();
        const upper = trimmed.toUpperCase();
        if (upper === 'BYE' || upper === '-' || upper === '—') return true;
        const lower = trimmed.toLowerCase();
        return lower.startsWith('pemenang') || lower.startsWith('kalah') || lower.startsWith('menunggu') || lower.startsWith('sudut');
    };

    return (
        <article className="overflow-hidden rounded-xl border border-[#e8e1d8] bg-white shadow-sm">
            <div className="flex items-center justify-between bg-[#f7f4ef] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#746b63]">
                <span>{match.is_bye ? 'Slot' : 'Partai'} #{match.sequence} · {match.round_label}</span>
                <div className="flex items-center gap-1.5">
                    {isWO && <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-extrabold text-white">SELESAI (WO)</span>}
                    {match.is_bye && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${match.notes?.includes('dilewati') ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-800'}`}>
                            {match.notes?.includes('dilewati') ? 'DILEWATI (WB MENANG GF)' : 'BYE'}
                        </span>
                    )}
                </div>
            </div>
            <div className="divide-y divide-[#eee8e0]">
                <div className={`flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold ${redDisqualified ? 'bg-red-50/60 text-slate-400' : ''}`}>
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="h-3 w-3 shrink-0 self-start mt-1 rounded-full bg-red-600" />
                        <div className="min-w-0 flex-1">
                            <p className={`truncate text-sm font-bold text-[#17120f] ${redDisqualified ? 'line-through text-slate-400' : ''}`}>
                                {match.red_label || 'Menunggu hasil'}
                            </p>
                            {redContingent && !isPlaceholder(match.red_label) && (
                                <p className="truncate text-xs font-normal text-[#8c827a] mt-0.5">
                                    {redContingent}
                                </p>
                            )}
                        </div>
                    </div>
                    {redDisqualified && (
                        <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                            Gagal Timbang (WO)
                        </span>
                    )}
                </div>
                <div className={`flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold ${blueDisqualified ? 'bg-blue-50/60 text-slate-400' : ''}`}>
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="h-3 w-3 shrink-0 self-start mt-1 rounded-full border border-slate-300 bg-white" />
                        <div className="min-w-0 flex-1">
                            <p className={`truncate text-sm font-bold text-[#17120f] ${blueDisqualified ? 'line-through text-slate-400' : ''}`}>
                                {match.blue_label || 'Menunggu hasil'}
                            </p>
                            {blueContingent && !isPlaceholder(match.blue_label) && (
                                <p className="truncate text-xs font-normal text-[#8c827a] mt-0.5">
                                    {blueContingent}
                                </p>
                            )}
                        </div>
                    </div>
                    {blueDisqualified && (
                        <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                            Gagal Timbang (WO)
                        </span>
                    )}
                </div>
            </div>
            <p className="border-t border-[#eee8e0] px-3 py-2 text-xs leading-relaxed text-[#746b63]">
                {match.is_bye ? schedule : `${schedule} · ${match.court || 'Lapangan belum ditentukan'}`}
                {isWO && match.metadata?.result?.walkover_reason && ` · ${match.metadata.result.walkover_reason}`}
            </p>
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

function BracketRound({ round, nodes, position }) {
    const matchGridClasses = nodes.length === 1
        ? 'mx-auto max-w-xl'
        : 'grid gap-3 md:grid-cols-2 2xl:grid-cols-3';

    return (
        <section className="rounded-2xl border border-[#e8e1d8] bg-[#f8f5f0] p-3.5 md:p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#17120f] text-xs font-bold text-[#f0c060]">
                        {position}
                    </span>
                    <h4 className="text-sm font-bold uppercase tracking-wide text-[#4f4740]">{round}</h4>
                </div>
                <span className="self-start rounded-full border border-[#e2d8ca] bg-white px-2.5 py-1 text-xs font-semibold text-[#746b63] sm:self-auto">
                    {nodes.length} partai
                </span>
            </div>
            <div className={matchGridClasses}>
                {nodes.map((match) => <MatchCard key={match.id} match={match} />)}
            </div>
        </section>
    );
}

function BracketSection({ title, description, icon, rounds, tone = 'neutral' }) {
    const headerClasses = {
        neutral: 'bg-slate-50 text-slate-900',
        upper: 'bg-blue-50 text-blue-950',
        lower: 'bg-amber-50 text-amber-950',
        final: 'bg-[#17120f] text-white',
    }[tone];
    const iconClasses = {
        neutral: 'bg-white text-slate-700',
        upper: 'bg-white text-blue-700',
        lower: 'bg-white text-amber-700',
        final: 'bg-[#f0c060] text-[#17120f]',
    }[tone];
    const descriptionClasses = tone === 'final' ? 'text-white/65' : 'text-[#746b63]';

    return (
        <section className="overflow-hidden rounded-2xl border border-[#e8e1d8] bg-white shadow-sm">
            <div className={`flex items-start gap-3 border-b border-[#e8e1d8] px-4 py-4 md:px-5 ${headerClasses}`}>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/5 shadow-sm ${iconClasses}`}>
                    <i className={`fa-solid ${icon}`} aria-hidden="true" />
                </span>
                <div>
                    <h3 className="font-cinzel text-sm font-bold uppercase tracking-wide md:text-base">{title}</h3>
                    <p className={`mt-1 text-xs leading-relaxed ${descriptionClasses}`}>{description}</p>
                </div>
            </div>
            <div className="space-y-3 p-3.5 md:space-y-4 md:p-5">
                {rounds.map(([round, nodes], index) => (
                    <div key={round}>
                        {index > 0 && (
                            <div className="flex items-center gap-3 px-2 pb-3 md:pb-4" aria-hidden="true">
                                <span className="h-px flex-1 bg-[#e8e1d8]" />
                                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#ded5ca] bg-white text-xs text-[#9a6b20]">
                                    <i className="fa-solid fa-arrow-down" />
                                </span>
                                <span className="h-px flex-1 bg-[#e8e1d8]" />
                            </div>
                        )}
                        <BracketRound round={round} nodes={nodes} position={index + 1} />
                    </div>
                ))}
            </div>
        </section>
    );
}

function BracketView({ category, drawing, matches, activeEvent, canManageDrawing, isLocked, processing, post, selectedFormat }) {
    if (!drawing || drawing.status === 'not_generated' || drawing.status === 'draft') {
        return (
            <div className="rounded-2xl border border-dashed border-amber-300 bg-[#fffdfa] p-8 text-center sm:p-12 shadow-xs">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-xs">
                    <i className="fa-solid fa-diagram-project text-2xl" />
                </span>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">
                    <i className="fa-solid fa-clock-rotate-left text-amber-600" />
                    Status: Belum Digenerate
                </div>
                <h3 className="mt-3 text-xl font-bold leading-snug text-[#17120f]">Bagan Nomor Ini Belum Digenerate</h3>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-[#746b63]">
                    Nomor pertandingan <strong>{category?.name}</strong> memiliki <strong>{category?.participant_count} {category?.participant_label?.toLowerCase()}</strong> terdaftar dari <strong>{category?.contingent_count} kontingen</strong>.
                    Bagan pertandingan dan jadwal jam tanding belum dibuat untuk nomor ini.
                </p>

                {canManageDrawing && !isLocked && category?.is_eligible ? (
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <Button
                            type="button"
                            onClick={() => post(`/admin/pertandingan/drawing/category/${category.id}/generate`, { bracket_type: selectedFormat || undefined }, 'category')}
                            disabled={!!processing}
                            className="bg-[#17120f] text-[#f0c060] hover:bg-black font-bold px-6 py-3 text-sm shadow-md cursor-pointer"
                        >
                            <i className={`fa-solid ${processing === 'category' ? 'fa-spinner animate-spin' : 'fa-wand-magic-sparkles'} mr-2`} />
                            Generate Bagan Nomor Ini Sekarang
                        </Button>
                    </div>
                ) : !category?.is_eligible ? (
                    <div className="mx-auto mt-6 max-w-md rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-left shadow-xs">
                        <div className="flex items-start gap-2.5 text-xs text-amber-900">
                            <i className="fa-solid fa-triangle-exclamation text-amber-600 mt-0.5 text-sm shrink-0" />
                            <div>
                                <p className="font-bold">Nomor Tidak Memenuhi Syarat Minimal</p>
                                <p className="mt-1 text-amber-800 leading-relaxed">{category?.reason || 'Jumlah peserta atau kontingen belum memenuhi kuota regulasi PB PERKEMI.'}</p>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        );
    }

    if (drawing.status === 'skipped') {
        return <EmptyState icon="fa-object-group" title="Kategori memerlukan merge" description={drawing.skip_reason} />;
    }

    const scheduleBanner = (
        <>
            {category?.has_unscheduled_matches && (
                <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-950 shadow-xs">
                    <i className="fa-solid fa-triangle-exclamation text-rose-600 mt-0.5 text-base shrink-0" />
                    <div className="flex-1">
                        <p className="font-bold text-rose-950">
                            Jadwal Belum Lengkap: {category.unscheduled_matches_count} dari {category.total_matches_count} Partai Belum Memiliki Jam & Lapangan
                        </p>
                        <p className="mt-1 text-xs text-rose-800 leading-relaxed">
                            Partai-partai tersebut belum mendapatkan jadwal otomatis karena kapasitas sesi rundown tidak mencukupi atau durasi per partai terlalu panjang.
                            Anda dapat generate ulang dengan interval durasi lebih singkat (misal 7 menit), menambah durasi sesi rundown di Detail Event, atau mengatur jam manual pada papan jadwal di bawah.
                        </p>
                    </div>
                </div>
            )}
            {!category?.has_unscheduled_matches && (category?.total_matches_count > 0) && (
                <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-2 text-xs text-emerald-900">
                    <span className="flex items-center gap-1.5 font-semibold">
                        <i className="fa-solid fa-circle-check text-emerald-600" />
                        Seluruh {category.total_matches_count} partai telah terjadwal lengkap di gelanggang dan sesi rundown
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                        100% Terjadwal
                    </span>
                </div>
            )}
        </>
    );

    if (category?.type === 'embu') {
        const groups = groupBy(matches, (match) => `${match.round_label}${match.pool ? ` · Pool ${match.pool}` : ''}`);
        return (
            <div className="space-y-4">
                {scheduleBanner}
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
    const isDoubleElim = (drawing.format || category?.format) === 'double_elimination';
    const isRoundRobin = (drawing.format || category?.format) === 'round_robin';

    return (
        <div className="space-y-6">
            {scheduleBanner}
            {/* Interactive Visual Tree (Upper on Top, Lower on Bottom, Grand Final right, Podium right) */}
            <RandoriBracketTree
                matches={matches}
                activeEvent={activeEvent}
                categoryName={category?.name}
                categoryFormat={drawing.format || category?.format}
                canManage={false}
            />

            {/* Section match details */}
            <div className="border-t border-[#e8e1d8] pt-5">
                <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#746b63] flex items-center gap-1.5">
                        <i className="fa-solid fa-list-check text-[#9a6b20]" />
                        Rincian Kartu Partai per Babak
                    </h4>
                    <span className="text-xs text-[#8c827a]">{matches.length} total partai</span>
                </div>

                {isRoundRobin ? (
                    <BracketSection
                        title="Jadwal Putaran Setengah Kompetisi"
                        description="Seluruh partai per putaran pertandingan antar-atlet nomor ini."
                        icon="fa-arrows-rotate"
                        rounds={rounds}
                        tone="upper"
                    />
                ) : isDoubleElim ? (
                    <div className="space-y-4">
                        <BracketSection
                            title="Bagan Pemenang (Upper Bracket)"
                            description="Pemenang setiap partai melanjutkan perjalanan pada bagan utama."
                            icon="fa-sitemap"
                            rounds={groupBy(
                                matches.filter((match) => match.round_label?.includes('Upper Bracket')),
                                (match) => match.round_label,
                            )}
                            tone="upper"
                        />
                        <BracketSection
                            title="Bagan Harapan (Lower Bracket)"
                            description="Atlet yang kalah pada bagan utama mendapat kesempatan berikutnya melalui bagan harapan."
                            icon="fa-arrow-rotate-left"
                            rounds={groupBy(
                                matches.filter((match) => match.round_label?.includes('Lower Bracket')),
                                (match) => match.round_label,
                            )}
                            tone="lower"
                        />
                        <BracketSection
                            title="Grand Final"
                            description="Pemenang upper bracket dan lower bracket bertemu pada pertandingan penentuan."
                            icon="fa-crown"
                            rounds={groupBy(
                                matches.filter((match) => match.round_label?.includes('Grand Final')),
                                (match) => match.round_label,
                            )}
                            tone="final"
                        />
                    </div>
                ) : (
                    <BracketSection
                        title="Bagan Eliminasi Tunggal"
                        description="Setiap babak ditampilkan berurutan dari atas ke bawah hingga pertandingan final."
                        icon="fa-diagram-project"
                        rounds={rounds}
                    />
                )}
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
    const isEmbu = match.category_type === 'embu';
    const isExactClash = match.clash_type === 'exact';
    const isTightClash = match.clash_type === 'tight';

    const redContingent = match.aka_contingent || match.red_contingent || match.metadata?.red?.contingent_name;
    const blueContingent = match.shiro_contingent || match.blue_contingent || match.metadata?.blue?.contingent_name;

    const redDisplay = match.red_athlete || match.red_label || 'Menunggu lawan';
    const blueDisplay = match.blue_athlete || match.blue_label || 'Menunggu lawan';

    return (
        <article
            className={`rounded-xl p-3 shadow-sm transition ${
                isExactClash
                    ? 'border-2 border-rose-500 bg-rose-50/90 ring-2 ring-rose-500/20'
                    : isTightClash
                        ? 'border-2 border-amber-400 bg-amber-50/80 ring-2 ring-amber-400/20'
                        : isEmbu
                            ? 'border border-blue-200 bg-white hover:border-blue-300'
                            : 'border border-[#e5ddd3] bg-white hover:border-[#cfc5b8]'
            }`}
        >
            {/* Header: Kategori & Jam */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isExactClash
                                ? 'bg-rose-600 text-white'
                                : isTightClash
                                    ? 'bg-amber-500 text-white'
                                    : isEmbu
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-[#17120f] text-[#f0c060]'
                        }`}
                    >
                        {isEmbu ? 'Embu' : 'Randori'}
                    </span>
                    <span className="text-[11px] font-semibold text-[#8c827a]">Partai #{match.sequence}</span>
                </div>
                <span className="whitespace-nowrap font-mono text-xs font-bold text-[#9a6b20]">
                    {match.scheduled_start_formatted}–{match.scheduled_end_formatted}
                </span>
            </div>

            <p className="mt-2 text-sm font-bold leading-snug text-[#17120f]">{match.category_name}</p>
            <p className="mt-0.5 text-xs font-semibold text-[#5f574f]">{match.round_label}</p>

            {/* Banner Peringatan Bentrok Waktu (MERAH) atau Jeda Mepet (KUNING) */}
            {isExactClash && (
                <div className="mt-2.5 rounded-lg border border-rose-300 bg-rose-100/90 p-2 text-xs text-rose-950">
                    <div className="flex items-center gap-1.5 font-bold text-rose-800">
                        <i className="fa-solid fa-triangle-exclamation text-rose-600" />
                        <span>BENTROK WAKTU BERSAMAAN</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-tight text-rose-900 font-medium">
                        {match.clash_summary}
                    </p>
                </div>
            )}

            {isTightClash && (
                <div className="mt-2.5 rounded-lg border border-amber-300 bg-amber-100/90 p-2 text-xs text-amber-950">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <i className="fa-solid fa-clock-rotate-left text-amber-700" />
                        <span>JEDA WAKTU MEPET (BUTUH SPACE)</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-tight text-amber-950 font-medium">
                        {match.clash_summary}
                    </p>
                </div>
            )}

            {/* Rincian Atlet & Kontingen */}
            {isEmbu ? (
                <div className="mt-2.5 rounded-lg border border-[#e8dfd5] bg-white/95 p-2 text-xs">
                    <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-[#17120f]">
                        <span className="flex items-center gap-1.5 truncate">
                            <i className="fa-solid fa-flag text-[#9a6b20] text-[10px]" />
                            <span className="truncate">{match.contingent_name || 'Kontingen'}</span>
                        </span>
                        {match.participant_label && (
                            <span className="text-[10px] font-medium text-[#746b63] shrink-0">
                                {match.participant_label}
                            </span>
                        )}
                    </div>
                    {match.athlete_names && match.athlete_names.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {match.athlete_names.map((name, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 rounded-md border border-[#e2d7ca] bg-[#faf8f5] px-1.5 py-0.5 text-[10px] font-semibold text-[#4f4740]"
                                >
                                    <i className="fa-solid fa-user text-[9px] text-[#8c827a]" />
                                    <span>{name}</span>
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-1 text-[11px] text-[#8c827a] italic">
                            {match.participant || 'Menunggu peserta'}
                        </p>
                    )}
                </div>
            ) : (
                <div className="mt-2.5 space-y-1.5 text-xs">
                    {/* AKA (Merah) */}
                    <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-2">
                        <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-rose-800">
                            <span className="inline-flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-rose-600" />
                                AKA (Merah)
                            </span>
                            <span className="truncate max-w-[140px] text-rose-700/80 font-medium">
                                {redContingent || '-'}
                            </span>
                        </div>
                        <p className="mt-1 font-bold text-[#17120f] text-[11px] truncate">
                            {redDisplay}
                        </p>
                    </div>

                    {/* SHIRO (Putih) */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50/90 p-2">
                        <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-slate-700">
                            <span className="inline-flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-slate-400" />
                                SHIRO (Putih)
                            </span>
                            <span className="truncate max-w-[140px] text-slate-600 font-medium">
                                {blueContingent || '-'}
                            </span>
                        </div>
                        <p className="mt-1 font-bold text-[#17120f] text-[11px] truncate">
                            {blueDisplay}
                        </p>
                    </div>
                </div>
            )}

            <div className="mt-2.5 flex items-center justify-between gap-2 pt-1 border-t border-black/5">
                {match.is_bye ? (
                    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        BYE
                    </span>
                ) : (
                    <span />
                )}
                {editable && (
                    <Button
                        variant="unstyled"
                        size="none"
                        type="button"
                        onClick={() => onEdit(match)}
                        className="rounded-lg border border-[#d8cdbf] bg-white px-2.5 py-1.5 text-xs font-bold text-[#5f574f] hover:border-[#c0392b] hover:text-[#c0392b] transition shadow-2xs"
                    >
                        <i className="fa-solid fa-pen-to-square mr-1.5" />
                        Ubah Partai
                    </Button>
                )}
            </div>
        </article>
    );
}

function EventScheduleBoard({ courts, sessions, matches, conflictSummary = {}, editable, onEdit }) {
    if (matches.length === 0 || courts.length === 0 || sessions.length === 0) {
        return null;
    }

    const [filterClashOnly, setFilterClashOnly] = useState(false);

    const hasClashes = conflictSummary?.has_clashes || matches.some((m) => m.clash_type && m.clash_type !== 'none');
    const exactCount = conflictSummary?.exact_clashes_count ?? matches.filter((m) => m.clash_type === 'exact').length;
    const tightCount = conflictSummary?.tight_clashes_count ?? matches.filter((m) => m.clash_type === 'tight').length;

    const displayedMatches = filterClashOnly
        ? matches.filter((m) => m.clash_type && m.clash_type !== 'none')
        : matches;

    const gridTemplateColumns = `220px repeat(${courts.length}, minmax(300px, 1fr))`;

    return (
        <section className="overflow-hidden rounded-2xl border border-[#e8e1d8] bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[#e8e1d8] p-4 md:flex-row md:items-center md:justify-between md:p-5">
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-bold uppercase tracking-[.12em] text-[#9a6b20]">Hasil generate semua</p>
                        {hasClashes && (
                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-300">
                                Perlu Penyesuaian Ruang Waktu
                            </span>
                        )}
                    </div>
                    <h2 className="mt-1 text-lg font-bold text-[#17120f]">Jadwal Pertandingan per Sesi & Court</h2>
                    <p className="mt-1 text-sm leading-relaxed text-[#746b63]">
                        Nama kontingen dan atlet ditampilkan di tiap partai. Warna <strong>kuning</strong> menandakan jeda mepet, dan <strong>merah</strong> menandakan bentrok waktu bersamaan.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                    {hasClashes && (
                        <button
                            type="button"
                            onClick={() => setFilterClashOnly(!filterClashOnly)}
                            className={`rounded-full px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                filterClashOnly
                                    ? 'bg-[#17120f] text-[#f0c060] shadow-sm'
                                    : 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                            }`}
                        >
                            <i className="fa-solid fa-filter text-[10px]" />
                            {filterClashOnly ? 'Tampilkan Semua Partai' : `Sorot Bentrok/Mepet (${exactCount + tightCount})`}
                        </button>
                    )}

                    {editable && (
                        <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
                            <i className="fa-solid fa-pen mr-1.5" />Mode edit aktif
                        </span>
                    )}

                    <span className="rounded-full border border-[#ded5ca] bg-[#f8f5f0] px-3 py-1.5 text-xs font-semibold text-[#5f574f]">
                        {displayedMatches.length} partai ditampilkan
                    </span>
                </div>
            </div>

            {/* Legend Indikator Warna */}
            <div className="flex flex-wrap items-center gap-2.5 border-b border-[#eee8e0] bg-[#faf8f5] px-4 py-2.5 text-xs text-[#5f574f]">
                <span className="font-bold text-[#17120f]">Panduan Warna:</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-800">
                    <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
                    Merah: Bentrok Waktu Sama ({exactCount})
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Kuning: Jeda Mepet Butuh Space ({tightCount})
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-800">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Embu
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d8cdbf] bg-white px-2.5 py-1 text-[11px] font-medium text-[#4f4740]">
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                    Randori
                </span>
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
                                const courtMatches = displayedMatches.filter((match) => match.session_id === session.id && match.court_id === court.id);

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
                        <i className="fa-solid fa-circle-info mr-2 text-blue-600" />Perubahan court, sesi, dan waktu hanya berlaku untuk partai yang dipilih.
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

function CapacityAndCourtStatsSection({ capacityStats, activeEvent }) {
    if (!capacityStats || !capacityStats.courts || capacityStats.courts.length === 0) {
        return null;
    }

    const {
        total_capacity_slots = 0,
        total_used_slots = 0,
        total_remaining_slots = 0,
        utilization_percent = 0,
        match_duration_minutes = 7,
        courts = [],
        dates = [],
    } = capacityStats;

    return (
        <section className="overflow-hidden rounded-2xl border border-[#e8e1d8] bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[#e8e1d8] bg-[#fdfcf9] p-4 md:flex-row md:items-center md:justify-between md:p-5">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="rounded-md bg-[#17120f] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[#f0c060]">
                            Kapasitas & Jadwal
                        </span>
                        <span className="text-xs font-semibold text-[#8c827a]">
                            Durasi {match_duration_minutes} Menit/Partai
                        </span>
                    </div>
                    <h3 className="mt-1.5 text-lg font-bold text-[#17120f]">
                        Statistik Keseluruhan, Kapasitas Court & Estimasi Waktu Selesai
                    </h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#746b63]">
                        Pemantauan beban alokasi partai pada gelanggang dan estimasi jam partai terakhir tuntas tiap tanggal pertandingan.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <a
                        href={`/admin/pertandingan/drawing/laporan-jadwal?event_id=${activeEvent?.id}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#17120f] px-4 py-2.5 text-xs font-bold text-[#f0c060] shadow-sm hover:bg-black transition cursor-pointer"
                    >
                        <i className="fa-solid fa-file-arrow-down text-rose-500 text-sm" />
                        Download PDF Laporan Jadwal
                    </a>
                    <a
                        href={`/admin/pertandingan/drawing/laporan-jadwal?event_id=${activeEvent?.id}&format=html`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-[#d8c9ae] bg-white px-3.5 py-2.5 text-xs font-bold text-[#17120f] shadow-2xs hover:bg-[#faf8f5] transition cursor-pointer"
                        title="Lihat tampilan cetak A4 di peramban"
                    >
                        <i className="fa-solid fa-eye text-[#746b63] text-sm" />
                        Pratinjau Cetak
                    </a>
                </div>
            </div>

            <div className="p-4 md:p-5 space-y-5">
                {/* 1. Stat Keseluruhan Event */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-[#e8e1d8] bg-[#faf8f5] p-3.5 shadow-2xs">
                        <div className="flex items-center justify-between text-xs font-semibold text-[#746b63]">
                            <span>Total Kapasitas Event</span>
                            <i className="fa-solid fa-boxes-stacked text-[#9a6b20]" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold tracking-tight text-[#17120f]">{total_capacity_slots}</span>
                            <span className="text-xs font-semibold text-[#746b63]">Slot Waktu</span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#8c827a]">Dihasilkan dari seluruh court & sesi rundown</p>
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 shadow-2xs">
                        <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                            <span>Slot Terpakai (Partai)</span>
                            <i className="fa-solid fa-circle-check text-emerald-600" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold tracking-tight text-emerald-950">{total_used_slots}</span>
                            <span className="text-xs font-bold text-emerald-700">/ {total_capacity_slots} Slot</span>
                            <span className="ml-auto inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                {utilization_percent}% Terisi
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-emerald-800">100% partai non-bye telah terjadwal</p>
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 shadow-2xs">
                        <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                            <span>Sisa Slot Cadangan</span>
                            <i className="fa-solid fa-shield-halved text-emerald-600" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold tracking-tight text-emerald-950">{total_remaining_slots}</span>
                            <span className="text-xs font-semibold text-emerald-700">Slot Kosong</span>
                        </div>
                        <p className="mt-1 text-[11px] text-emerald-800">Buffer aman untuk jeda atlet / kendala jadwal</p>
                    </div>

                    <div className="rounded-xl border border-[#e8e1d8] bg-[#faf8f5] p-3.5 shadow-2xs">
                        <div className="flex items-center justify-between text-xs font-semibold text-[#746b63]">
                            <span>Interval per Partai</span>
                            <i className="fa-solid fa-stopwatch text-[#a93226]" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold tracking-tight text-[#17120f]">{match_duration_minutes}</span>
                            <span className="text-xs font-semibold text-[#746b63]">Menit</span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#8c827a]">Standar durasi turnamen PB PERKEMI</p>
                    </div>
                </div>

                {/* 2. Rincian Sisa Slot per Court */}
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#746b63] mb-2.5 flex items-center gap-1.5">
                        <i className="fa-solid fa-chalkboard-user text-[#9a6b20]" />
                        Kapasitas & Sisa Slot per Gelanggang (Court)
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {courts.map((court, idx) => (
                            <div key={court.court_id || idx} className="rounded-xl border border-[#e8e1d8] bg-[#faf8f5] p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <span className="text-[11px] font-bold text-[#9a6b20] uppercase tracking-wider">Court {idx + 1}</span>
                                        <p className="text-sm font-bold text-[#17120f]">{court.court_name}</p>
                                    </div>
                                    <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                                        Sisa {court.remaining_slots} Slot
                                    </span>
                                </div>

                                <div className="mt-3">
                                    <div className="flex justify-between text-xs font-semibold text-[#746b63] mb-1">
                                        <span>Partai Terjadwal: {court.used_slots} / {court.capacity_slots} Slot</span>
                                        <span>{court.utilization_percent}%</span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-600 rounded-full transition-all"
                                            style={{ width: `${Math.min(100, court.utilization_percent)}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between text-[11px] text-[#746b63] border-t border-[#eee8e0] pt-2">
                                    <span>Tanding: <strong>{court.first_match_time || '-'}</strong></span>
                                    <span>Partai Terakhir: <strong>pkl {court.last_match_end || '-'}</strong></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Estimasi Waktu Akhir per Tanggal */}
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#746b63] mb-2.5 flex items-center gap-1.5">
                        <i className="fa-regular fa-calendar-days text-[#9a6b20]" />
                        Estimasi Waktu Tuntas & Akhir Slot per Tanggal
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-3">
                        {dates.map((d) => (
                            <div key={d.date} className="rounded-xl border border-[#e8e1d8] bg-white p-3.5 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-[#eee8e0] pb-2">
                                    <p className="text-xs font-bold text-[#17120f]">{d.date_formatted}</p>
                                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                        d.used_slots > 0 ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {d.used_slots} Partai
                                    </span>
                                </div>

                                <div className="mt-2.5 space-y-1.5 text-xs text-[#555]">
                                    <div className="flex justify-between">
                                        <span className="text-[#8c827a]">Kapasitas Harian:</span>
                                        <span className="font-semibold text-[#17120f]">{d.capacity_slots} Slot (Sisa {d.remaining_slots})</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#8c827a]">Mulai Pertandingan:</span>
                                        <span className="font-semibold text-[#17120f]">{d.first_match_time ? `pkl ${d.first_match_time}` : '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#8c827a]">Estimasi Tuntas:</span>
                                        <span className="font-bold text-blue-900">{d.last_match_end ? `pkl ${d.last_match_end}` : '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#8c827a]">Batas Sesi Rundown:</span>
                                        <span className="font-semibold text-[#17120f]">{d.rundown_end ? `pkl ${d.rundown_end}` : '-'}</span>
                                    </div>
                                </div>

                                {d.courts && d.courts.length > 0 && (
                                    <div className="mt-2.5 border-t border-[#eee8e0] pt-2 space-y-1 text-[11px] text-[#746b63]">
                                        {d.courts.map((c, i) => (
                                            <div key={i} className="flex justify-between">
                                                <span className="truncate max-w-[140px]">{c.court_name}:</span>
                                                <span className="font-semibold text-[#17120f]">
                                                    {c.matches_count > 0 ? `${c.matches_count} m (${c.last_end})` : 'Kosong'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default function TournamentDrawing({ activeEvent, events = [], categories = [], selectedCategory, drawing, matches = [], scheduleCourts = [], scheduleSessions = [], eventSchedule = [], scheduleConflictSummary = {}, workflow, settings, capacityStats = {}, canManageDrawing }) {
    const [processing, setProcessing] = useState('');
    const [generateModalOpen, setGenerateModalOpen] = useState(false);
    const [matchDuration, setMatchDuration] = useState(settings?.match_duration_minutes ? Math.max(1, Number(settings.match_duration_minutes)) : 7);
    const [resetConfirmation, setResetConfirmation] = useState(null);
    const [resetError, setResetError] = useState('');
    const [scheduleEditMode, setScheduleEditMode] = useState(false);
    const [editingMatch, setEditingMatch] = useState(null);
    const [scheduleDraft, setScheduleDraft] = useState({ event_court_id: '', rundown_id: '', start_time: '' });
    const [scheduleErrors, setScheduleErrors] = useState({});
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [categorySearch, setCategorySearch] = useState('');
    const category = categories.find((item) => item.id === selectedCategory);
    const [selectedFormat, setSelectedFormat] = useState(drawing?.format || category?.format || '');

    useEffect(() => {
        setSelectedFormat(drawing?.format || category?.format || '');
    }, [category?.id, drawing?.format, category?.format]);

    const isPublished = workflow?.status === 'published';
    const isInProgress = workflow?.status === 'in_progress';
    const isCompleted = workflow?.status === 'completed';
    const isLocked = isPublished || isInProgress || isCompleted;
    const eventQuery = activeEvent?.id ? `?event_id=${activeEvent.id}` : '';

    const visit = (data = {}) => router.get('/admin/pertandingan/drawing', { event_id: activeEvent?.id, ...data }, { preserveScroll: true, preserveState: true });
    const post = (url, data = {}, key) => router.post(url, { event_id: activeEvent.id, ...data }, { preserveScroll: true, onStart: () => setProcessing(key), onFinish: () => setProcessing('') });
    const reset = () => { setResetError(''); setResetConfirmation('draft'); };
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
        setResetError('');
        setResetConfirmation('competition');
    };
    const confirmReset = () => {
        if (!resetConfirmation || processing) return;
        const competition = resetConfirmation === 'competition';
        setProcessing(competition ? 'reset-competition' : 'reset');
        setResetError('');
        const options = {
            preserveScroll: true,
            onSuccess: () => setResetConfirmation(null),
            onError: (errors) => setResetError(Object.values(errors).flat().join(' ')),
            onFinish: () => setProcessing(''),
        };
        if (competition) {
            router.post('/admin/pertandingan/drawing/reset-competition', { event_id: activeEvent.id }, options);
        } else {
            router.delete('/admin/pertandingan/drawing/reset', { ...options, data: { event_id: activeEvent.id } });
        }
    };

    const stages = [
        {
            title: 'Precheck',
            caption: `${workflow?.ready_categories || 0} siap · ${workflow?.merge_categories || 0} perlu merge`,
            active: workflow?.status === 'draft',
            complete: (workflow?.generated_categories || 0) > 0,
        },
        {
            title: 'Drawing',
            caption: (workflow?.ungenerated_categories ?? 0) > 0
                ? `${workflow?.generated_categories || 0}/${workflow?.total_categories || 0} kategori (${workflow?.ungenerated_categories} belum)`
                : `${workflow?.generated_categories || 0}/${workflow?.total_categories || 0} kategori lengkap`,
            active: workflow?.status === 'generated' || workflow?.status === 'draft',
            complete: (workflow?.generated_categories || 0) > 0 && (workflow?.ungenerated_categories ?? 0) === 0,
        },
        {
            title: 'Penjadwalan',
            caption: (workflow?.total_unscheduled_matches ?? 0) > 0
                ? `${workflow?.total_scheduled_matches || 0}/${workflow?.total_non_bye_matches || 0} partai (${workflow?.total_unscheduled_matches} belum ada slot)`
                : `${workflow?.total_scheduled_matches || 0} partai terjadwal (100%)`,
            active: workflow?.status === 'generated',
            complete: isPublished || ((workflow?.total_non_bye_matches || 0) > 0 && (workflow?.total_unscheduled_matches ?? 0) === 0),
        },
        {
            title: 'Publikasi',
            caption: isCompleted
                ? 'Event selesai'
                : isInProgress
                    ? 'Pertandingan berlangsung'
                    : isPublished
                        ? 'Terkunci dan siap digunakan'
                        : 'Menunggu pemeriksaan admin',
            active: isPublished || isInProgress,
            complete: isCompleted,
        },
    ];

    const drawingMenuItems = activeEvent ? [
        {
            label: 'Pengaturan Event',
            description: 'Konfigurasi durasi, matras & persyaratan',
            icon: <i className="fa-solid fa-gear text-slate-600" />,
            href: `/admin/master/event/${activeEvent.id}/detail`,
            isLink: true,
            tone: 'default',
        },
        {
            label: 'Merge Kategori',
            description: 'Gabungkan kelas pertandingan yang kurang kuota',
            icon: <i className="fa-solid fa-object-group text-amber-600" />,
            href: `/admin/pertandingan/merge${eventQuery}`,
            isLink: true,
            tone: 'gold',
        },
        {
            label: 'Kelola Jadwal',
            description: 'Buka kalender dan manajemen jadwal lengkap',
            icon: <i className="fa-solid fa-calendar-days text-blue-600" />,
            href: `/admin/pertandingan/jadwal${eventQuery}`,
            isLink: true,
            tone: 'blue',
        },
        {
            divider: true,
        },
        {
            label: 'Download Excel Jadwal',
            description: 'Unduh jadwal pertandingan format .xlsx',
            icon: <i className="fa-solid fa-file-excel text-emerald-600" />,
            href: `/admin/pertandingan/jadwal/export${eventQuery}`,
            download: true,
            tone: 'emerald',
            badge: 'XLSX',
        },
        {
            label: 'Download Laporan Jadwal (PDF)',
            description: 'Download langsung file PDF kapasitas slot court & estimasi jam tanding',
            icon: <i className="fa-solid fa-file-arrow-down text-rose-600" />,
            href: `/admin/pertandingan/drawing/laporan-jadwal${eventQuery}`,
            isLink: true,
            tone: 'rose',
            badge: 'PDF',
        },
        {
            label: 'Pratinjau Cetak Laporan (HTML)',
            description: 'Lihat pratinjau cetak A4 laporan jadwal di peramban',
            icon: <i className="fa-solid fa-file-lines text-amber-600" />,
            href: `/admin/pertandingan/drawing/laporan-jadwal${eventQuery}&format=html`,
            target: '_blank',
            isLink: true,
            tone: 'default',
            badge: 'HTML',
        },
        {
            label: 'Cetak Dokumen / Bagan',
            description: 'Cetak tampilan bagan ke printer atau PDF',
            icon: <i className="fa-solid fa-print text-slate-600" />,
            onClick: () => window.print(),
            tone: 'default',
            badge: 'Print',
        },
        ...(canManageDrawing && workflow.generated_categories > 0 && !isLocked
            ? [
                  {
                      divider: true,
                  },
                  {
                      label: scheduleEditMode ? 'Selesai Edit Jadwal' : 'Edit Jadwal Papan',
                      description: scheduleEditMode
                          ? 'Keluar dari mode penyuntingan jadwal langsung'
                          : 'Aktifkan pengubahan waktu/matras langsung di papan jadwal',
                      icon: <i className={`fa-solid ${scheduleEditMode ? 'fa-check text-rose-600' : 'fa-calendar-pen text-slate-600'}`} />,
                      onClick: () => setScheduleEditMode((active) => !active),
                      tone: scheduleEditMode ? 'rose' : 'default',
                      badge: scheduleEditMode ? 'Aktif' : undefined,
                  },
              ]
            : []),
        ...(canManageDrawing && isPublished
            ? [
                  {
                      divider: true,
                  },
                  {
                      label: processing === 'unpublish' ? 'Mengembalikan...' : 'Kembalikan ke Penyusunan',
                      description: 'Buka kembali status publikasi agar bagan dapat diedit',
                      icon: <i className={`fa-solid ${processing === 'unpublish' ? 'fa-spinner animate-spin text-amber-600' : 'fa-lock-open text-amber-600'}`} />,
                      onClick: () => post('/admin/pertandingan/drawing/unpublish', {}, 'unpublish'),
                      disabled: !!processing,
                      tone: 'gold',
                  },
              ]
            : []),
        ...(canManageDrawing && (isInProgress || isCompleted)
            ? [
                  {
                      divider: true,
                  },
                  {
                      label: processing === 'reset-competition' ? 'Mereset...' : 'Reset Pertandingan',
                      description: 'Reset status turnamen, nilai & hasil juara kembali ke jadwal tanpa menghapus susunan bagan',
                      icon: <i className={`fa-solid ${processing === 'reset-competition' ? 'fa-spinner animate-spin text-rose-600' : 'fa-arrow-rotate-left text-rose-600'}`} />,
                      onClick: resetCompetition,
                      disabled: !!processing,
                      tone: 'rose',
                      badge: 'Reset',
                  },
              ]
            : []),
        ...(canManageDrawing && workflow.generated_categories > 0
            ? [
                  {
                      divider: true,
                  },
                  {
                      label: processing === 'reset' ? 'Mereset Draft...' : 'Reset Draft Bagan',
                      description: 'Reset seluruh susunan bagan, nilai wasit, hasil juara & laporan (soft delete aman)',
                      icon: <i className="fa-solid fa-rotate-left text-rose-600" />,
                      onClick: reset,
                      disabled: !!processing,
                      tone: 'rose',
                      badge: 'Reset',
                  },
              ]
            : []),
    ] : [];

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
                        <Combobox label="Event dipilih" labelClassName="text-white/60" containerClassName="w-full xl:w-96"
                            value={activeEvent?.id || ''} onChange={(value) => router.get('/admin/pertandingan/drawing', { event_id: value })}
                            clearable={false} options={events.map((item) => ({ value: item.id, label: item.name, sublabel: item.option_description }))} />
                    </div>
                    <div className="relative mt-5 flex gap-3 overflow-x-auto">{stages.map((stage, index) => <WorkflowStep key={stage.title} number={index + 1} {...stage} />)}</div>
                </section>

                {!activeEvent ? <EmptyState icon="fa-calendar-xmark" title="Event belum dipilih" description="Pilih event agar precheck dan drawing dapat dijalankan." /> : <>
                    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        {[
                            ['Kategori siap', workflow.ready_categories, 'fa-circle-check', 'text-emerald-600', 'Memenuhi kuota syarat'],
                            ['Perlu merge', workflow.merge_categories, 'fa-object-group', 'text-amber-600', 'Kurang kuota syarat'],
                            ['Sudah digenerate', workflow.generated_categories, 'fa-diagram-project', 'text-blue-600', `${workflow.generated_categories}/${workflow.total_categories} nomor selesai`],
                            ['Belum digenerate', workflow.ungenerated_categories, 'fa-clock-rotate-left', (workflow.ungenerated_categories ?? 0) > 0 ? 'text-amber-600' : 'text-slate-400', (workflow.ungenerated_categories ?? 0) > 0 ? 'Perlu dibuat bagan' : 'Semua nomor selesai'],
                            ['Partai terjadwal', `${workflow.total_scheduled_matches || 0}/${workflow.total_non_bye_matches || 0}`, 'fa-calendar-check', (workflow.total_unscheduled_matches ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-600', (workflow.total_unscheduled_matches ?? 0) > 0 ? `${workflow.total_unscheduled_matches} belum ada slot` : '100% terjadwal'],
                        ].map(([label, value, icon, color, subtitle]) => (
                            <div key={label} className="rounded-xl border border-[#e8e1d8] bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-[#746b63]">{label}</p>
                                    <i className={`fa-solid ${icon} ${color}`} />
                                </div>
                                <p className="mt-2 text-2xl font-bold leading-none text-[#17120f]">{value ?? 0}</p>
                                {subtitle && <p className="mt-2 text-[11px] text-[#8c827a] truncate">{subtitle}</p>}
                            </div>
                        ))}
                    </section>

                    {(workflow?.ungenerated_categories ?? 0) > 0 && (
                        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-sm text-amber-950 shadow-xs">
                            <i className="fa-solid fa-triangle-exclamation text-amber-600 text-base mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <p className="font-bold text-amber-950">
                                    Terdapat {workflow.ungenerated_categories} Nomor Pertandingan yang Belum Digenerate
                                </p>
                                <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                                    Nomor pertandingan tersebut belum memiliki bagan dan jadwal pertandingan. Silakan tekan tombol <strong>"Generate Semua"</strong> di bawah atau pilih nomor pertandingan pada daftar di samping dan generate secara mandiri.
                                </p>
                            </div>
                        </div>
                    )}

                    {(workflow?.total_unscheduled_matches ?? 0) > 0 && (
                        <div className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50/90 p-4 text-sm text-rose-950 shadow-xs">
                            <i className="fa-solid fa-clock text-rose-600 text-base mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <p className="font-bold text-rose-950">
                                    Peringatan Kapasitas Slot: {workflow.total_unscheduled_matches} Partai Belum Mendapatkan Jam & Gelanggang
                                </p>
                                <p className="mt-1 text-xs text-rose-800 leading-relaxed">
                                    Total durasi sesi rundown pertandingan pada event ini tidak mencukupi untuk menampung seluruh partai dengan durasi saat ini ({settings?.match_duration_minutes} menit/partai).
                                    Solusi: Generate ulang dengan interval durasi lebih singkat (misal 7 menit), tambah jam sesi rundown di Detail Event, atau atur jam manual pada papan jadwal di bawah.
                                </p>
                            </div>
                        </div>
                    )}

                    {(settings.courts_count === 0 || settings.sessions_count === 0) && <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><i className="fa-solid fa-triangle-exclamation mt-0.5" /><div><p className="font-bold">Jadwal otomatis belum lengkap</p><p className="mt-1 text-sm leading-relaxed text-amber-800">Tambahkan {settings.courts_count === 0 ? 'lapangan aktif' : ''}{settings.courts_count === 0 && settings.sessions_count === 0 ? ' dan ' : ''}{settings.sessions_count === 0 ? 'rundown yang ditandai sebagai sesi pertandingan' : ''} di Detail Event.</p></div></div>}

                    <section className="flex flex-col gap-3 rounded-xl border border-[#e8e1d8] bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-wide text-[#9a6b20]">{activeEvent.name}</p>
                            <p className="mt-1.5 text-sm leading-relaxed text-[#746b63]">Durasi {settings.match_duration_minutes} menit · istirahat minimal {settings.minimum_rest_minutes} menit · syarat {settings.minimum_entries_per_category} peserta/tim dari {settings.minimum_contingents_per_category} kontingen.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {scheduleEditMode && (
                                <button
                                    type="button"
                                    onClick={() => setScheduleEditMode(false)}
                                    className="rounded-lg border border-[#c0392b] bg-[#fff2ef] px-3.5 py-2 text-xs font-semibold text-[#a93226] hover:bg-[#ffe6e1] transition"
                                >
                                    <i className="fa-solid fa-check mr-1.5" />
                                    Selesai Edit Jadwal
                                </button>
                            )}

                            {canManageDrawing && !isLocked && (
                                <Button
                                    variant="unstyled"
                                    size="none"
                                    type="button"
                                    onClick={() => setGenerateModalOpen(true)}
                                    disabled={!!processing}
                                    className="rounded-lg bg-[#17120f] px-4 py-2.5 text-sm font-bold text-[#f0c060] hover:bg-black disabled:opacity-50 transition shadow-sm cursor-pointer"
                                >
                                    <i className={`fa-solid ${processing === 'generate' ? 'fa-spinner animate-spin' : 'fa-wand-magic-sparkles'} mr-1.5`} />
                                    {processing === 'generate' ? 'Membentuk bagan...' : 'Generate Semua'}
                                </Button>
                            )}

                            {canManageDrawing && workflow.generated_categories > 0 && !isLocked && (
                                <Button
                                    variant="unstyled"
                                    size="none"
                                    type="button"
                                    onClick={() => post('/admin/pertandingan/drawing/publish', {}, 'publish')}
                                    disabled={!!processing}
                                    className="rounded-lg bg-[#a93226] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#8e281e] disabled:opacity-50 transition shadow-sm"
                                >
                                    <i className="fa-solid fa-lock mr-1.5" />
                                    {processing === 'publish' ? 'Menyimpan...' : 'Publikasikan'}
                                </Button>
                            )}

                            {canManageDrawing && isPublished && (
                                <Button
                                    variant="unstyled"
                                    size="none"
                                    type="button"
                                    onClick={() => post('/admin/pertandingan/drawing/start', {}, 'start')}
                                    disabled={!!processing}
                                    className="rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-50 transition shadow-sm"
                                >
                                    <i className="fa-solid fa-play mr-1.5" />
                                    Mulai Pertandingan
                                </Button>
                            )}

                            {canManageDrawing && isInProgress && (
                                <Button
                                    variant="unstyled"
                                    size="none"
                                    type="button"
                                    onClick={() => post('/admin/pertandingan/drawing/complete', {}, 'complete')}
                                    disabled={!!processing}
                                    className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50 transition shadow-sm"
                                >
                                    <i className="fa-solid fa-flag-checkered mr-1.5" />
                                    Selesaikan Event
                                </Button>
                            )}

                            <a
                                href={`/admin/pertandingan/drawing/laporan-jadwal?event_id=${activeEvent?.id}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#d8c9ae] bg-white px-3.5 py-2.5 text-xs font-bold text-[#17120f] hover:border-[#a93226] hover:text-[#a93226] transition shadow-2xs"
                                title="Download langsung dokumen resmi PDF laporan jadwal & kapasitas gelanggang"
                            >
                                <i className="fa-solid fa-file-arrow-down text-rose-600 text-sm" />
                                Download PDF Jadwal
                            </a>

                            <ActionMenuDropdown
                                label="Menu Aksi"
                                theme="light"
                                menuHeader="Opsi & Aksi Pertandingan"
                                maxHeight="max-h-[300px]"
                                icon={<i className="fa-solid fa-sliders text-xs text-[#a93226]" />}
                                items={drawingMenuItems}
                            />
                        </div>
                    </section>

                    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                        <aside className="rounded-2xl border border-[#e8e1d8] bg-white p-3 shadow-sm xl:sticky xl:top-20 xl:self-start">
                            <div className="px-2 pb-3 border-b border-[#eee8e0]">
                                <h2 className="text-base font-bold text-[#17120f]">Nomor Pertandingan</h2>
                                <p className="mt-1 text-xs leading-relaxed text-[#8c827a]">Klik kategori untuk memeriksa hasil drawing & jadwal.</p>

                                {/* Search & Filters */}
                                <div className="mt-3 space-y-2">
                                    <div className="relative">
                                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-xs text-slate-400" />
                                        <input
                                            type="text"
                                            value={categorySearch}
                                            onChange={(e) => setCategorySearch(e.target.value)}
                                            placeholder="Cari kelas / nomor..."
                                            className="w-full rounded-lg border border-[#e2d8ca] bg-[#fcfbf9] py-1.5 pl-8 pr-3 text-xs text-[#17120f] placeholder:text-[#a59a8e] focus:border-[#d4a843] focus:outline-hidden"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setCategoryFilter('all')}
                                            className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                                                categoryFilter === 'all'
                                                    ? 'bg-[#17120f] text-[#f0c060]'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            Semua ({categories.length})
                                        </button>
                                        {(workflow?.ungenerated_categories ?? 0) > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setCategoryFilter('ungenerated')}
                                                className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                                                    categoryFilter === 'ungenerated'
                                                        ? 'bg-amber-600 text-white'
                                                        : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                                                }`}
                                            >
                                                Belum Dibuat ({workflow.ungenerated_categories})
                                            </button>
                                        )}
                                        {(workflow?.total_unscheduled_matches ?? 0) > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setCategoryFilter('unscheduled')}
                                                className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                                                    categoryFilter === 'unscheduled'
                                                        ? 'bg-rose-600 text-white'
                                                        : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                                                }`}
                                            >
                                                Belum Terjadwal
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 max-h-[640px] space-y-2 overflow-y-auto pr-1">
                                {categories
                                    .filter((item) => {
                                        if (categorySearch) {
                                            const query = categorySearch.toLowerCase();
                                            if (!item.name?.toLowerCase().includes(query) && !item.type_label?.toLowerCase().includes(query)) {
                                                return false;
                                            }
                                        }
                                        if (categoryFilter === 'ungenerated') {
                                            return !item.is_generated;
                                        }
                                        if (categoryFilter === 'unscheduled') {
                                            return item.has_unscheduled_matches;
                                        }
                                        return true;
                                    })
                                    .map((item) => (
                                        <Button
                                            variant="unstyled"
                                            size="none"
                                            key={item.id}
                                            type="button"
                                            onClick={() => visit({ category: item.id })}
                                            className={`w-full rounded-xl border p-3.5 text-left transition ${
                                                selectedCategory === item.id
                                                    ? 'border-[#d4a843] bg-[#fff9e9]'
                                                    : 'border-transparent hover:border-[#e8e1d8] hover:bg-[#faf8f4]'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-bold leading-snug text-[#17120f]">{item.name}</p>
                                                <StatusBadge status={item.drawing_status} />
                                            </div>
                                            <p className="mt-1.5 text-xs leading-relaxed text-[#746b63]">
                                                {item.type_label} · {item.participant_count} {item.participant_label.toLowerCase()} · {item.contingent_count} kontingen
                                            </p>
                                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                {!item.is_generated ? (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                                        <i className="fa-solid fa-clock-rotate-left text-amber-600 text-[9px]" />
                                                        Belum Digenerate
                                                    </span>
                                                ) : item.has_unscheduled_matches ? (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                                                        <i className="fa-solid fa-triangle-exclamation text-rose-600 text-[9px]" />
                                                        {item.unscheduled_matches_count} Partai Belum Terjadwal
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                                        <i className="fa-solid fa-circle-check text-emerald-600 text-[9px]" />
                                                        {item.total_matches_count} Partai Terjadwal
                                                    </span>
                                                )}
                                            </div>
                                            {!item.is_eligible && <p className="mt-1.5 text-xs leading-relaxed text-amber-700">{item.reason}</p>}
                                        </Button>
                                    ))}
                            </div>
                        </aside>

                        <main className="min-w-0 rounded-2xl border border-[#e8e1d8] bg-white p-4 shadow-sm md:p-5">
                            {category ? <>
                                <div className="mb-5 flex flex-col gap-3 border-b border-[#eee8e0] pb-4 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase ${category.type === 'embu' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>{category.type_label}</span>
                                            <StatusBadge status={drawing?.status || category.drawing_status} />
                                            {category.is_round_robin_eligible && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                                                    <i className="fa-solid fa-arrows-rotate text-emerald-600" />
                                                    Kondisional Entry {category.participant_count} Atlet · Mendukung Round Robin
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="mt-2.5 text-xl font-bold leading-snug tracking-tight text-[#17120f]">{category.name}</h2>
                                        <p className="mt-1.5 text-sm leading-relaxed text-[#746b63]">{formatLabels[drawing?.format || category.format] || 'Format ditentukan saat generate'} · {category.participant_count} {category.participant_label.toLowerCase()} dari {category.contingent_count} kontingen.</p>

                                        {canManageDrawing && !isLocked && category.available_formats && Object.keys(category.available_formats).length > 1 && (
                                            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-2.5">
                                                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                                    <i className="fa-solid fa-sliders text-amber-600" />
                                                    Pilihan Sistem Tanding:
                                                </span>
                                                <select
                                                    value={selectedFormat}
                                                    onChange={(e) => setSelectedFormat(e.target.value)}
                                                    disabled={!!processing}
                                                    className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-[#17120f] shadow-xs focus:border-[#d4a843] focus:outline-none"
                                                >
                                                    {Object.entries(category.available_formats).map(([val, label]) => (
                                                        <option key={val} value={val}>{label}</option>
                                                    ))}
                                                </select>
                                                {selectedFormat !== (drawing?.format || category.format) && (
                                                    <Button
                                                        variant="unstyled"
                                                        size="none"
                                                        type="button"
                                                        onClick={() => post(`/admin/pertandingan/drawing/category/${category.id}/generate`, { bracket_type: selectedFormat }, 'category')}
                                                        disabled={!!processing}
                                                        className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-700 shadow-xs"
                                                    >
                                                        <i className={`fa-solid ${processing === 'category' ? 'fa-spinner animate-spin' : 'fa-check'} mr-1`} />
                                                        Terapkan & Generate Format Baru
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {canManageDrawing && !isLocked && (
                                        <Button
                                            variant="unstyled"
                                            size="none"
                                            type="button"
                                            onClick={() => post(`/admin/pertandingan/drawing/category/${category.id}/generate`, { bracket_type: selectedFormat || undefined }, 'category')}
                                            disabled={!!processing || !category.is_eligible}
                                            className="shrink-0 rounded-lg border border-[#ded5ca] px-3.5 py-2.5 text-sm font-semibold text-[#5f574f] hover:bg-[#f7f4ef] disabled:cursor-not-allowed disabled:opacity-45"
                                        >
                                            <i className={`fa-solid ${processing === 'category' ? 'fa-spinner animate-spin' : 'fa-shuffle'} mr-1.5`} />
                                            {drawing ? 'Drawing Ulang Kategori' : 'Generate Kategori Ini'}
                                        </Button>
                                    )}
                                </div>

                                {/* Statistik Partai Nomor Ini */}
                                <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="rounded-xl border border-[#e8e1d8] bg-[#fdfcf9] p-3.5 shadow-2xs transition hover:border-[#d4a843]">
                                        <div className="flex items-center justify-between text-xs font-semibold text-[#746b63]">
                                            <span>Total Partai</span>
                                            <i className="fa-solid fa-sitemap text-[#9a6b20] text-sm" />
                                        </div>
                                        <div className="mt-2 flex items-baseline gap-1.5">
                                            <span className="text-2xl font-bold tracking-tight text-[#17120f]">
                                                {category.total_matches_count || 0}
                                            </span>
                                            <span className="text-xs font-semibold text-[#746b63]">Partai</span>
                                        </div>
                                        <p className="mt-1 text-[11px] text-[#8c827a] truncate">
                                            {category.bye_matches_count > 0
                                                ? `${category.non_bye_matches_count} tanding · ${category.bye_matches_count} bye otomatis`
                                                : category.total_nodes_count > 0
                                                    ? `${category.total_nodes_count} slot pertandingan`
                                                    : `${category.participant_count} ${category.participant_label.toLowerCase()} terdaftar`}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 shadow-2xs transition hover:border-emerald-300">
                                        <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                                            <span>Partai Berhasil Generate</span>
                                            <i className="fa-solid fa-circle-check text-emerald-600 text-sm" />
                                        </div>
                                        <div className="mt-2 flex items-baseline gap-1.5">
                                            <span className="text-2xl font-bold tracking-tight text-emerald-950">
                                                {category.scheduled_matches_count || 0}
                                            </span>
                                            <span className="text-xs font-bold text-emerald-700">
                                                / {category.non_bye_matches_count || category.total_matches_count || 0}
                                            </span>
                                            {category.non_bye_matches_count > 0 && (
                                                <span className="ml-auto inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                                    {category.scheduled_percent ?? 100}%
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-[11px] text-emerald-800 truncate">
                                            {category.is_generated
                                                ? (category.unscheduled_matches_count === 0
                                                    ? '100% Terjadwal di sesi rundown & court'
                                                    : `${category.scheduled_matches_count} partai telah memiliki jadwal`)
                                                : 'Bagan belum digenerate'}
                                        </p>
                                    </div>

                                    <div className={`rounded-xl border p-3.5 shadow-2xs transition ${
                                        category.has_unscheduled_matches
                                            ? 'border-rose-300 bg-rose-50/70 hover:border-rose-400'
                                            : 'border-[#e8e1d8] bg-[#fdfcf9] hover:border-[#d4a843]'
                                    }`}>
                                        <div className="flex items-center justify-between text-xs font-semibold">
                                            <span className={category.has_unscheduled_matches ? 'text-rose-900 font-bold' : 'text-[#746b63]'}>
                                                Yang Belum Terjadwal
                                            </span>
                                            <i className={`text-sm ${
                                                category.has_unscheduled_matches
                                                    ? 'fa-solid fa-triangle-exclamation text-rose-600'
                                                    : 'fa-regular fa-calendar-check text-slate-400'
                                            }`} />
                                        </div>
                                        <div className="mt-2 flex items-baseline gap-1.5">
                                            <span className={`text-2xl font-bold tracking-tight ${
                                                category.has_unscheduled_matches ? 'text-rose-900' : 'text-[#17120f]'
                                            }`}>
                                                {category.unscheduled_matches_count || 0}
                                            </span>
                                            <span className={`text-xs font-medium ${
                                                category.has_unscheduled_matches ? 'text-rose-700' : 'text-[#746b63]'
                                            }`}>
                                                Partai
                                            </span>
                                            {category.has_unscheduled_matches && (
                                                <span className="ml-auto inline-flex items-center rounded-md bg-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                                                    Perlu Slot
                                                </span>
                                            )}
                                        </div>
                                        <p className={`mt-1 text-[11px] truncate ${
                                            category.has_unscheduled_matches ? 'text-rose-800 font-medium' : 'text-[#8c827a]'
                                        }`}>
                                            {category.has_unscheduled_matches
                                                ? 'Slot sesi rundown tidak mencukupi'
                                                : (category.is_generated ? 'Semua partai aman mendapatkan jam' : 'Menunggu generate bagan')}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-[#e8e1d8] bg-[#fdfcf9] p-3.5 shadow-2xs transition hover:border-[#d4a843]">
                                        <div className="flex items-center justify-between text-xs font-semibold text-[#746b63]">
                                            <span>Gelanggang & Waktu</span>
                                            <i className="fa-solid fa-map-pin text-[#a93226] text-sm" />
                                        </div>
                                        <div className="mt-2">
                                            <p className="text-sm font-bold text-[#17120f] truncate">
                                                {category.court_names || (matches[0]?.court) || 'Belum ditentukan'}
                                            </p>
                                        </div>
                                        <p className="mt-1 text-[11px] text-[#8c827a] truncate">
                                            {category.schedule_range_formatted || (matches[0]?.scheduled_start_formatted ? `Mulai ${matches[0].scheduled_start_formatted}` : 'Jadwal jam belum ditentukan')}
                                        </p>
                                    </div>
                                </section>

                                <BracketView
                                    category={category}
                                    drawing={drawing}
                                    matches={matches}
                                    activeEvent={activeEvent}
                                    canManageDrawing={canManageDrawing}
                                    isLocked={isLocked}
                                    processing={processing}
                                    post={post}
                                    selectedFormat={selectedFormat}
                                />
                            </> : <EmptyState icon="fa-list-check" title="Nomor pertandingan belum tersedia" description="Aktifkan nomor pertandingan di Detail Event terlebih dahulu." />}
                        </main>
                    </div>

                    <CapacityAndCourtStatsSection capacityStats={capacityStats} activeEvent={activeEvent} />

                    <EventScheduleBoard courts={scheduleCourts} sessions={scheduleSessions} matches={eventSchedule} conflictSummary={scheduleConflictSummary} editable={scheduleEditMode && canManageDrawing && !isLocked} onEdit={openScheduleEditor} />

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
            <AlertConfirm isOpen={Boolean(resetConfirmation)} title={resetConfirmation === 'competition' ? 'Reset status & nilai pertandingan?' : 'Reset draft bagan, nilai, dan hasil juara?'}
                message={resetConfirmation === 'competition' ? 'Bagan dan jadwal tetap disimpan. Status partai, nilai wasit, dan hasil juara sementara akan direset aman (disimpan dalam arsip soft delete).' : 'Seluruh susunan bagan, jadwal, nilai Embu & Randori, hasil juara, dan laporan pada event ini akan direset. Seluruh data lama tetap tersimpan aman sebagai arsip soft delete. Data atlet dan pendaftaran kontingen tetap utuh.'}
                confirmText={resetConfirmation === 'competition' ? 'Reset pertandingan' : 'Ya, reset draft & nilai'} error={resetError} isLoading={Boolean(processing)}
                onConfirm={confirmReset} onCancel={() => { if (!processing) setResetConfirmation(null); }} />

            {/* Modal Konfirmasi & Pengaturan Durasi Generate */}
            <Modal
                isOpen={generateModalOpen}
                onClose={() => !processing && setGenerateModalOpen(false)}
                title="Generate Bagan & Jadwal Pertandingan"
                subtitle={`Atur interval durasi partai untuk seluruh nomor pertandingan di ${activeEvent.name}`}
                size="md"
                footer={
                    <div className="flex w-full items-center justify-end gap-2">
                        <Button
                            variant="outline"
                            type="button"
                            onClick={() => setGenerateModalOpen(false)}
                            disabled={!!processing}
                        >
                            Batal
                        </Button>
                        <Button
                            variant="primary"
                            type="button"
                            disabled={!!processing}
                            onClick={() => {
                                post('/admin/pertandingan/drawing/generate', { match_duration_minutes: matchDuration }, 'generate');
                                setGenerateModalOpen(false);
                            }}
                            className="bg-[#17120f] text-[#f0c060] hover:bg-black font-bold"
                        >
                            <i className={`fa-solid ${processing === 'generate' ? 'fa-spinner animate-spin' : 'fa-wand-magic-sparkles'} mr-1.5`} />
                            Mulai Generate ({matchDuration} Menit/Partai)
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4 p-1 text-sm">
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 leading-relaxed">
                        <i className="fa-solid fa-circle-info mr-1.5 text-amber-700" />
                        Setiap partai pertandingan akan otomatis dijadwalkan dengan interval waktu <strong>{matchDuration} menit</strong> (contoh: 08:30–08:{30 + Number(matchDuration) < 60 ? 30 + Number(matchDuration) : '40'}, berikutnya 10 menit kemudian) di seluruh court aktif.
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#746b63] mb-1.5">
                            Durasi Satu Partai / Jarak Antar Match (Menit):
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="1"
                                max="120"
                                value={matchDuration}
                                onChange={(e) => setMatchDuration(Math.max(1, Number(e.target.value)))}
                                className="w-28 rounded-lg border border-[#d8c9ae] px-3 py-2 text-sm font-bold text-[#17120f] focus:border-[#d4a843] focus:outline-hidden"
                            />
                            <span className="text-sm font-semibold text-[#746b63]">Menit per partai</span>
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {[7, 10, 12, 15, 8, 5].map((dur) => (
                                <button
                                    key={dur}
                                    type="button"
                                    onClick={() => setMatchDuration(dur)}
                                    className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                        Number(matchDuration) === dur
                                            ? 'bg-[#17120f] text-[#f0c060] shadow-xs'
                                            : 'border border-[#dcd4ca] bg-white text-[#625b54] hover:bg-[#f7f4ef]'
                                    }`}
                                >
                                    {dur === 7 ? '⭐ 7 Menit (Optimal)' : dur === 10 ? '10 Menit' : `${dur} Menit`}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-[#e8e1d8] bg-[#fbfaf8] p-3 text-xs text-[#746b63] space-y-1">
                        <p><strong>Lapangan Aktif:</strong> {settings.courts_count} Court</p>
                        <p><strong>Sesi Pertandingan:</strong> {settings.sessions_count} Sesi Rundown</p>
                        <p><strong>Jeda Istirahat Minimal:</strong> {settings.minimum_rest_minutes} Menit</p>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}
