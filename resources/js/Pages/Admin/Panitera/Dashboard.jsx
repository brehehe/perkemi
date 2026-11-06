import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import Badge from '@/Components/UI/Elements/Badge';
import Button from '@/Components/UI/Elements/Button';
import Combobox from '@/Components/UI/Forms/Combobox';
import Input from '@/Components/UI/Forms/Input';
import Pagination from '@/Components/UI/Navigation/Pagination';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Fragment, useMemo, useState, useEffect } from 'react';
import { CourtMonitorButtons } from './Partials/CourtMonitorLinks';
import FlashMessage from './Partials/FlashMessage';
import PaniteraHeader from './Partials/PaniteraHeader';
import RandoriBracketTree from './Partials/RandoriBracketTree';
import EmbuTiebreakPanel from '@/Components/Tiebreak/EmbuTiebreakPanel';

const statCards = [
    ['total_matches', 'Total Partai', 'fa-list-ol', 'blue'],
    ['completed_matches', 'Partai Selesai', 'fa-circle-check', 'green'],
    ['embu_scored', 'Nilai Embu', 'fa-ranking-star', 'gold'],
    ['randori_scored', 'Hasil Randori', 'fa-hand-fist', 'red'],
];

const statusVariants = {
    pending: 'gray',
    ready: 'yellow',
    in_progress: 'purple',
    completed: 'green',
};

function EmbuPoolStandingTable({ standings = [], quota = null, isFinal = false }) {
    if (!standings || standings.length === 0) return null;

    return (
        <div className="overflow-x-auto border-b border-[#ede9e1] bg-[#fdfcfb]">
            <table className="w-full text-left text-xs">
                <thead className="bg-[#f8f5f0] text-[10px] uppercase tracking-wide text-[#7a746e] border-b border-[#eee8e0]">
                    <tr>
                        <th className="px-3.5 py-2 font-bold">Peringkat</th>
                        <th className="px-3.5 py-2 font-bold">Peserta / Kontingen</th>
                        <th className="px-3.5 py-2 font-bold">{isFinal ? 'P1: Akumulasi' : 'P1: Nilai Akhir'}</th>
                        <th className="px-3.5 py-2 font-bold">P2: Teknik 3 Wasit</th>
                        <th className="px-3.5 py-2 font-bold">P3: W1 Total</th>
                        <th className="px-3.5 py-2 font-bold">P4: W1 Teknik</th>
                        <th className="px-3.5 py-2 font-bold">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#ede9e1]">
                    {standings.map((row, idx) => {
                        const rankNum = idx + 1;
                        const qualified = quota && quota !== 999 && idx < quota;
                        const isMedalist = isFinal && rankNum <= 4;
                        const middleJudges = row.middle_judge_numbers?.length ? `W${row.middle_judge_numbers.join(', W')}` : '3 Wasit';

                        return (
                            <tr
                                key={row.match_id || idx}
                                className={`transition-colors ${
                                    isMedalist
                                        ? rankNum === 1
                                            ? 'bg-amber-50/60'
                                            : rankNum === 2
                                            ? 'bg-slate-50/70'
                                            : 'bg-orange-50/50'
                                        : qualified
                                        ? 'bg-emerald-50/50'
                                        : 'hover:bg-white'
                                }`}
                            >
                                <td className="px-3.5 py-2 font-black whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded text-[11px] ${
                                            isFinal && rankNum === 1
                                                ? 'bg-amber-500 text-slate-950 font-black'
                                                : isFinal && rankNum === 2
                                                ? 'bg-slate-300 text-slate-800 font-black'
                                                : isFinal && rankNum <= 4
                                                ? 'bg-amber-700 text-white font-black'
                                                : 'bg-slate-200 text-slate-700 font-bold'
                                        }`}>
                                            #{rankNum}
                                        </span>
                                        {isFinal && rankNum === 1 && <span className="text-[10px] font-bold text-amber-800">🥇 Emas</span>}
                                        {isFinal && rankNum === 2 && <span className="text-[10px] font-bold text-slate-700">🥈 Perak</span>}
                                        {isFinal && (rankNum === 3 || rankNum === 4) && <span className="text-[10px] font-bold text-orange-800">🥉 Perunggu</span>}
                                    </div>
                                </td>
                                <td className="px-3.5 py-2">
                                    <p className="font-bold text-slate-900 leading-tight">{row.participant_label}</p>
                                    {row.metadata?.members && row.metadata.members.length > 0 && (
                                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-800 mt-1">
                                            <span className="inline-flex items-center justify-center rounded bg-slate-100 text-slate-600 px-1.5 py-0.5 text-[9px] font-bold border border-slate-200">
                                                <i className="fa-solid fa-user-ninja mr-1 text-[8px] text-slate-500" />
                                                Kenshi
                                            </span>
                                            <span className="text-slate-800">{row.metadata.members.join(' & ')}</span>
                                        </div>
                                    )}
                                    {row.metadata?.contingent_name && row.metadata.contingent_name !== row.participant_label && (
                                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{row.metadata.contingent_name}</p>
                                    )}
                                </td>
                                <td className="px-3.5 py-2 whitespace-nowrap">
                                    {isFinal ? (
                                        <div>
                                            <span className="font-mono text-xs font-black text-amber-900">{Number(row.total_score || 0).toFixed(2)}</span>
                                            <span className="block text-[9.5px] text-slate-400">P:{Number(row.preliminary_score || 0).toFixed(2)} + F:{Number(row.final_round_score || 0).toFixed(2)}</span>
                                        </div>
                                    ) : (
                                        <span className="font-mono text-xs font-black text-amber-900">{Number(row.score?.final_score || row.param1_score || 0).toFixed(2)}</span>
                                    )}
                                </td>
                                <td className="px-3.5 py-2 whitespace-nowrap">
                                    <span className="font-mono text-xs font-bold text-slate-800">{Number((isFinal ? (row.final_middle_technique_sum ?? row.middle_technique_sum) : (row.param2_technique ?? row.middle_technique_sum)) || 0).toFixed(2)}</span>
                                    <span className="block text-[9px] text-slate-400">{middleJudges}</span>
                                </td>
                                <td className="px-3.5 py-2 whitespace-nowrap font-mono text-xs font-semibold text-slate-700">
                                    {Number((isFinal ? (row.final_chief_judge_total ?? row.chief_judge_total) : (row.param3_chief_total ?? row.chief_judge_total)) || 0).toFixed(2)}
                                </td>
                                <td className="px-3.5 py-2 whitespace-nowrap font-mono text-xs font-semibold text-slate-700">
                                    {Number((isFinal ? (row.final_chief_judge_technique ?? row.chief_judge_technique) : (row.param4_chief_technique ?? row.chief_judge_technique)) || 0).toFixed(2)}
                                </td>
                                <td className="px-3.5 py-2 whitespace-nowrap">
                                    {qualified ? (
                                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[9.5px] font-black border border-emerald-300">
                                            <i className="fa-solid fa-check text-[8px]" /> Tiket Final
                                        </span>
                                    ) : isMedalist ? (
                                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-900 px-1.5 py-0.5 text-[9.5px] font-black border border-amber-300">
                                            <i className="fa-solid fa-medal text-[8px]" /> Podium
                                        </span>
                                    ) : row.score ? (
                                        <span className="text-[10px] font-medium text-slate-500">Selesai</span>
                                    ) : (
                                        <span className="text-[10px] text-slate-400 italic">Menunggu</span>
                                    )}
                                    {row.manual_tiebreak_winner && (
                                        <span className="ml-1 inline-flex items-center rounded bg-amber-200 text-amber-900 px-1 py-0.5 text-[9px] font-bold">
                                            P5: Manual
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function MatchSectionTable({ matches, activeEvent, isLocked }) {
    return (
        <TableContainer ariaLabel="Daftar pertandingan Panitera">
            <table className="responsive-data-table responsive-data-table--cards min-w-full text-left text-xs">
                <thead className="bg-[#f7f4ef] text-[10px] uppercase tracking-wide text-[#7a746e]">
                    <tr>
                        <th className="px-4 py-3">Jadwal & Court</th>
                        <th className="px-4 py-3">Partai & Babak</th>
                        <th className="px-4 py-3">Peserta / Kontingen</th>
                        <th className="px-4 py-3">Status & Hasil</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#ede9e1]">
                    {matches.map((match) => {
                        const isCompleted = match.status === 'completed';
                        const isInProgress = match.status === 'in_progress';

                        return (
                            <tr
                                key={match.id}
                                className={
                                    isCompleted
                                        ? '!bg-emerald-50/60 !border-emerald-200/80 hover:!bg-emerald-100/50 transition-colors'
                                        : isInProgress
                                        ? '!bg-purple-50/50 !border-purple-200/80 hover:!bg-purple-100/50 transition-colors'
                                        : 'hover:bg-[#fcfbf9] transition-colors'
                                }
                            >
                                <td data-label="Jadwal" className="min-w-44 px-4 py-3 align-top">
                                    <p className="font-bold text-[#17120f]">{match.scheduled_at || 'Belum dijadwalkan'}</p>
                                    <p className="mt-1 text-[#7a746e] flex items-center gap-1">
                                        <i className="fa-solid fa-location-dot text-[#c0392b] text-[10px]" />
                                        {match.court}
                                    </p>
                                </td>
                                <td data-label="Partai & Babak" className="min-w-56 px-4 py-3 align-top">
                                    <div className="flex items-start gap-2">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white font-black text-xs shadow-2xs">
                                            #{match.sequence}
                                        </span>
                                        <div>
                                            <p className="font-bold text-[#17120f]">{match.round_label}</p>
                                            {match.pool && <p className="text-[11px] text-[#7a746e]">Pool {match.pool}</p>}
                                        </div>
                                    </div>
                                </td>
                                <td data-label="Peserta" className="min-w-64 px-4 py-3 align-top text-[#5f574f]">
                                    {match.is_placeholder ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900">
                                            <i className="fa-solid fa-hourglass-start text-amber-600" />
                                            {match.participant || 'Menunggu lolos penyisihan'}
                                        </span>
                                    ) : match.category_type === 'randori' && match.red_label && match.blue_label ? (
                                        <div className="space-y-1.5">
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[9px] font-black ${match.result?.winner_corner === 'aka' ? 'bg-rose-600 text-white shadow-2xs' : 'bg-rose-100 text-rose-800'}`}>AKA</span>
                                                    <span className={`text-xs ${match.result?.winner_corner === 'aka' ? 'font-bold text-[#17120f]' : 'text-[#7a746e]'}`}>{match.red_label}</span>
                                                    {match.result && <span className="font-mono text-xs font-bold text-rose-700">({match.result.aka_total})</span>}
                                                </div>
                                                {match.red_contingent && (
                                                    <p className="ml-8 text-[11px] font-medium text-[#7a746e] leading-tight mt-0.5">
                                                        {match.red_contingent}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[9px] font-black ${match.result?.winner_corner === 'shiro' ? 'bg-slate-700 text-white shadow-2xs' : 'bg-slate-100 text-slate-700'}`}>SHIRO</span>
                                                    <span className={`text-xs ${match.result?.winner_corner === 'shiro' ? 'font-bold text-[#17120f]' : 'text-[#7a746e]'}`}>{match.blue_label}</span>
                                                    {match.result && <span className="font-mono text-xs font-bold text-slate-700">({match.result.shiro_total})</span>}
                                                </div>
                                                {match.blue_contingent && (
                                                    <p className="ml-10 text-[11px] font-medium text-[#7a746e] leading-tight mt-0.5">
                                                        {match.blue_contingent}
                                                    </p>
                                                )}
                                            </div>
                                            {match.result && (
                                                <div className="pt-1">
                                                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300/80 bg-emerald-100/90 px-2 py-0.5 text-[10.5px] font-bold text-emerald-900 shadow-2xs">
                                                        <i className="fa-solid fa-trophy text-amber-500" aria-hidden="true" />
                                                        Pemenang: {match.result.winner_corner === 'aka' ? 'AKA (Merah)' : match.result.winner_corner === 'shiro' ? 'SHIRO (Putih)' : match.result.winner_label}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="font-bold text-[#17120f]">{match.participant || 'Peserta belum ditentukan'}</p>
                                            {match.athlete_names && match.athlete_names.length > 0 && (
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 mt-1">
                                                    <span className="inline-flex items-center justify-center rounded bg-blue-50 text-blue-700 px-1.5 py-0.5 text-[9.5px] font-bold border border-blue-200">
                                                        <i className="fa-solid fa-user-ninja mr-1 text-[8.5px] text-blue-600" />
                                                        Kenshi
                                                    </span>
                                                    <span className="text-slate-800">{match.athlete_names.join(' & ')}</span>
                                                </div>
                                            )}
                                            {match.contingent_name && match.contingent_name !== match.participant && (
                                                <p className="text-[11px] text-[#7a746e] mt-0.5">{match.contingent_name}</p>
                                            )}
                                            {match.result && match.result.type === 'embu' && (
                                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300/80 bg-emerald-100/90 px-2 py-0.5 text-[10.5px] font-bold text-emerald-900 shadow-2xs">
                                                        <i className="fa-solid fa-star text-amber-500" aria-hidden="true" />
                                                        Nilai Akhir: {match.result.final_score?.toFixed(2)}
                                                    </span>
                                                    {Number(match.result.total_penalty || 0) > 0 && (
                                                        <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                                            Denda -{match.result.total_penalty.toFixed(2)}
                                                        </span>
                                                    )}
                                                    {match.result.is_disqualified && (
                                                        <span className="inline-flex items-center rounded-md border border-rose-300 bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                                                            Diskualifikasi
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td data-label="Status" className="min-w-44 px-4 py-3 align-top">
                                    <div className="flex flex-wrap gap-1.5">
                                        <Badge variant={statusVariants[match.status] || 'gray'}>{match.status_label}</Badge>
                                        {isCompleted && match.result?.type === 'randori' ? (
                                            <Badge variant={match.result.is_locked ? 'green' : 'yellow'}>
                                                <i className={`fa-solid ${match.result.is_locked ? 'fa-lock' : 'fa-file-signature'} mr-1`} aria-hidden="true" />
                                                {match.result.is_locked ? 'Terkunci' : `${match.result.signed_count}/6 TTD`}
                                            </Badge>
                                        ) : isCompleted && match.result?.type === 'embu' ? (
                                            <Badge variant={match.result.status === 'verified' ? 'green' : 'yellow'}>
                                                <i className={`fa-solid ${match.result.status === 'verified' ? 'fa-circle-check' : 'fa-hourglass-half'} mr-1`} aria-hidden="true" />
                                                {match.result.status_label}
                                            </Badge>
                                        ) : (
                                            <Badge variant={match.call_status === 'waiting' ? 'gray' : 'gold'}>
                                                {match.call_status_label}
                                            </Badge>
                                        )}
                                    </div>
                                </td>
                                <td data-label="Aksi" className="whitespace-nowrap px-4 py-3 text-right align-top">
                                    {match.is_placeholder ? (
                                        <span className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] font-semibold text-slate-500 sm:min-h-9">Menunggu lawan</span>
                                    ) : (
                                        <Link
                                            href={`/admin/panitera/scoring/matches/${match.id}?event_id=${encodeURIComponent(activeEvent.id)}`}
                                            className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:min-h-9 ${
                                                isLocked
                                                    ? 'bg-slate-700 hover:bg-slate-800 text-white'
                                                    : isCompleted
                                                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white focus-visible:outline-emerald-700'
                                                        : 'bg-[#c0392b] hover:bg-[#a82718] text-white focus-visible:outline-[#c0392b]'
                                            }`}
                                        >
                                            <i className={`fa-solid ${isLocked ? 'fa-eye' : isCompleted ? 'fa-circle-check' : 'fa-arrow-up-right-from-square'}`} aria-hidden="true" />
                                            {isLocked ? 'Lihat Detail' : isCompleted ? 'Hasil Nilai' : 'Buka Partai'}
                                        </Link>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    {matches.length === 0 && (
                        <tr>
                            <td colSpan="5" className="px-4 py-8 text-center text-[#7a746e]">
                                Belum ada partai pada babak ini.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </TableContainer>
    );
}

function TimelineMatchTable({ matches, activeEvent, onSelectCategory }) {
    let lastCategoryId = null;

    return (
        <TableContainer ariaLabel="Daftar pertandingan Embu dan Randori Panitera">
            <table className="responsive-data-table responsive-data-table--cards min-w-full text-left text-xs">
                <thead className="bg-[#f7f4ef] text-[10px] uppercase tracking-wide text-[#7a746e]">
                    <tr>
                        <th className="px-4 py-3">Jadwal</th>
                        <th className="px-4 py-3">Nomor Pertandingan</th>
                        <th className="px-4 py-3">Peserta</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Detail</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#ede9e1]">
                    {matches.map((match, index) => {
                        const isCategoryChange = index > 0 && match.category_id && lastCategoryId && match.category_id !== lastCategoryId;
                        lastCategoryId = match.category_id;
                        const isCompleted = match.status === 'completed';
                        const isInProgress = match.status === 'in_progress';

                        return (
                            <Fragment key={match.id}>
                                {isCategoryChange && (
                                    <tr key={`change-${match.id}`} className="border-t-2 border-b border-indigo-200 bg-gradient-to-r from-slate-100 via-indigo-50/60 to-slate-100">
                                        <td colSpan="5" className="px-4 py-2.5">
                                            <div className="flex flex-wrap items-center justify-between gap-2.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white px-2.5 py-1 text-xs font-black shadow-2xs">
                                                        <i className="fa-solid fa-layer-group text-[10px]" /> {match.category_name}
                                                    </span>
                                                    <Badge variant={match.category_type === 'embu' ? 'blue' : 'red'} size="xs">{match.category_type?.toUpperCase()}</Badge>
                                                    {match.category_is_locked && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold border border-emerald-300">
                                                            <i className="fa-solid fa-lock text-[9px]" /> Terkunci
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {onSelectCategory && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onSelectCategory(match.category_id)}
                                                            className="text-xs font-bold text-indigo-700 hover:text-indigo-900 hover:underline inline-flex items-center gap-1"
                                                        >
                                                            <span>Buka Nomor Ini</span>
                                                            <i className="fa-solid fa-arrow-right text-[10px]" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                <tr
                                    key={match.id}
                                    className={
                                        isCompleted
                                            ? '!bg-emerald-50/60 !border-emerald-200/80 hover:!bg-emerald-100/50 transition-colors'
                                            : isInProgress
                                            ? '!bg-purple-50/50 !border-purple-200/80 hover:!bg-purple-100/50 transition-colors'
                                            : 'hover:bg-[#fcfbf9] transition-colors'
                                    }
                                >
                                    <td data-label="Jadwal" className="min-w-44 px-4 py-3 align-top">
                                        <p className="font-bold text-[#17120f]">{match.scheduled_at || 'Belum dijadwalkan'}</p>
                                        <p className="mt-1 text-[#7a746e]">{match.court}</p>
                                    </td>
                                    <td data-label="Nomor pertandingan" className="min-w-64 px-4 py-3 align-top">
                                        <div className="flex items-start gap-2">
                                            <Badge variant={match.category_type === 'embu' ? 'blue' : 'red'} size="sm">{match.category_type?.toUpperCase()}</Badge>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <p className="font-bold text-[#17120f]">{match.category_name}</p>
                                                    {match.category_is_locked && (
                                                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[9px] font-black" title={`Nomor pertandingan ini telah dikunci pada ${match.category_locked_at}`}>
                                                            <i className="fa-solid fa-lock text-[8px]" /> Terkunci
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-[#7a746e]">Partai #{match.sequence} · {match.round_label}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td data-label="Peserta" className="min-w-64 px-4 py-3 align-top text-[#5f574f]">
                                        <p className="font-bold text-[#17120f]">{match.participant || 'Peserta belum ditentukan'}</p>
                                        {match.athlete_names && match.athlete_names.length > 0 && (
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 mt-1">
                                                <span className="inline-flex items-center justify-center rounded bg-blue-50 text-blue-700 px-1.5 py-0.5 text-[9.5px] font-bold border border-blue-200">
                                                    <i className="fa-solid fa-user-ninja mr-1 text-[8.5px] text-blue-600" />
                                                    Kenshi
                                                </span>
                                                <span className="text-slate-800">{match.athlete_names.join(' & ')}</span>
                                            </div>
                                        )}
                                        {match.contingent_name && match.contingent_name !== match.participant && (
                                            <p className="text-[11px] text-[#7a746e] mt-0.5">{match.contingent_name}</p>
                                        )}
                                    </td>
                                    <td data-label="Status" className="min-w-48 px-4 py-3 align-top">
                                        <div className="flex flex-wrap gap-1.5">
                                            <Badge variant={statusVariants[match.status] || 'gray'}>{match.status_label}</Badge>
                                        </div>
                                    </td>
                                    <td data-label="Aksi" className="whitespace-nowrap px-4 py-3 text-right align-top">
                                        <Link
                                            href={`/admin/panitera/scoring/matches/${match.id}?event_id=${encodeURIComponent(activeEvent.id)}`}
                                            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-[#c0392b] hover:bg-[#a82718]"
                                        >
                                            Buka Detail
                                        </Link>
                                    </td>
                                </tr>
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </TableContainer>
    );
}

export default function PaniteraDashboard({
    activeEvent,
    events = [],
    stats = {},
    courts = [],
    categories = [],
    matches = { data: [] },
    randoriMatches = [],
    championship = null,
    embuData = null,
    canManage = false,
    filters = {},
    isCourtRestricted = false,
}) {
    const { flash = {} } = usePage().props;
    const [search, setSearch] = useState(filters.search || '');
    const [viewModeTab, setViewModeTab] = useState(filters.category_id ? 'single' : (filters.view_mode || 'categories'));
    const [randoriViewTab, setRandoriViewTab] = useState('bracket');
    const [generatingChampions, setGeneratingChampions] = useState(false);
    const [editingVarCourt, setEditingVarCourt] = useState(null);
    const [varUrlInput, setVarUrlInput] = useState('');
    const [savingVarUrl, setSavingVarUrl] = useState(false);

    const handleOpenVarModal = (court) => {
        setEditingVarCourt(court);
        setVarUrlInput(court.raw_var_url || court.var_url || '');
    };

    const handleSaveVarUrl = (e) => {
        e.preventDefault();
        if (!editingVarCourt) return;
        setSavingVarUrl(true);
        router.put(
            `/admin/panitera/scoring/courts/${editingVarCourt.id}/var-url`,
            { var_url: varUrlInput.trim() || null },
            {
                preserveScroll: true,
                onFinish: () => {
                    setSavingVarUrl(false);
                    setEditingVarCourt(null);
                },
            }
        );
    };
    const eventQuery = `?event_id=${encodeURIComponent(activeEvent.id)}`;
    const selectedCategory = categories.find((c) => c.id === filters.category_id);

    const hasActiveFilters = Boolean(
        filters.search ||
        filters.category_id ||
        (filters.status && filters.status !== 'all') ||
        (filters.category_type && filters.category_type !== 'all') ||
        filters.court_id ||
        (filters.sort_by && filters.sort_by !== 'schedule')
    );

    // Sinkronisasi Real-Time (Reverb / Echo) untuk penetapan tie-break dari Wasit Utama
    useEffect(() => {
        if (!window.Echo || !activeEvent?.id) return undefined;

        const channelName = `event.${activeEvent.id}`;
        const eventChannel = window.Echo.private(channelName);
        const handleTiebreakUpdate = (event) => {
            if (event.event_id !== activeEvent.id) return;
            router.reload({
                only: ['embuData', 'matches', 'stats', 'championship', 'flash'],
                preserveScroll: true,
                preserveState: false,
            });
        };

        eventChannel.listen('.embu.tiebreak.updated', handleTiebreakUpdate);

        return () => {
            window.Echo.leave(channelName);
        };
    }, [activeEvent?.id]);

    // Polling fallback jika ada kasus tie-break aktif
    useEffect(() => {
        if (!embuData?.active_ties || embuData.active_ties.length === 0) return undefined;

        const interval = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                router.reload({
                    only: ['embuData', 'matches', 'stats', 'championship'],
                    preserveScroll: true,
                    preserveState: true,
                });
            }
        }, 5000);

        return () => window.clearInterval(interval);
    }, [embuData?.active_ties?.length]);

    const visit = (changes = {}, page = 1) => router.get('/admin/panitera/scoring', {
        event_id: activeEvent.id,
        search: filters.search || '',
        status: filters.status || 'all',
        category_type: filters.category_type || 'all',
        court_id: filters.court_id || '',
        category_id: filters.category_id || '',
        sort_by: filters.sort_by || 'schedule',
        ...changes,
        page,
    }, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
    });

    const submitSearch = (event) => {
        event.preventDefault();
        visit({ search });
    };

    const resetFilters = () => {
        setSearch('');
        visit({
            search: '',
            category_id: '',
            status: 'all',
            category_type: 'all',
            court_id: '',
            sort_by: 'schedule',
        });
    };

    const handleSelectCategory = (categoryId) => {
        visit({ category_id: categoryId });
    };

    const handleAdvanceFinalists = () => {
        if (!selectedCategory) return;
        if (confirm(`Generate peserta babak final dari hasil klasemen penyisihan untuk nomor "${selectedCategory.name}"?`)) {
            router.post(
                `/admin/panitera/scoring/embu-result/${selectedCategory.id}/advance-finalists`,
                { event_id: activeEvent.id },
                { preserveScroll: true }
            );
        }
    };

    const handleGenerateChampions = () => {
        if (!selectedCategory) return;
        setGeneratingChampions(true);
        router.post(`/admin/panitera/scoring/champions/${selectedCategory.id}/generate`, {
            event_id: activeEvent.id,
        }, {
            preserveScroll: true,
            onFinish: () => setGeneratingChampions(false),
        });
    };

    const handleConfirmChampions = () => {
        if (!selectedCategory) return;
        if (confirm(`Simpan dan kunci hasil juara resmi (Emas, Perak, Perunggu 1 & 2) untuk nomor "${selectedCategory.name}"?`)) {
            router.post(
                `/admin/panitera/scoring/embu-result/${selectedCategory.id}/confirm-champions`,
                { event_id: activeEvent.id },
                { preserveScroll: true }
            );
        }
    };

    const handleResolveTiebreakRanks = (categoryId, ranks) => {
        router.post(
            `/admin/panitera/scoring/embu-result/${categoryId}/resolve-tiebreak-ranks`,
            { event_id: activeEvent.id, ranks },
            { preserveScroll: true }
        );
    };

    // Filter categories for the initial boxes view
    const filteredCategories = categories.filter((c) => {
        if (search) {
            const q = search.toLowerCase();
            if (!c.name.toLowerCase().includes(q)) return false;
        }
        if (filters.category_type && filters.category_type !== 'all') {
            if (c.type !== filters.category_type) return false;
        }
        if (filters.status && filters.status !== 'all') {
            if (filters.status === 'completed' && !c.is_completed) return false;
            if (filters.status === 'unfinished' && c.is_completed) return false;
        }
        return true;
    });

    // Partition matches into Preliminary pools and Final when a single category is opened
    const allCategoryMatches = matches.data || [];
    const matchesPenyisihan = allCategoryMatches.filter((m) => m.phase !== 'final');
    const matchesFinal = allCategoryMatches.filter((m) => m.phase === 'final');

    const preliminaryPools = useMemo(() => {
        const map = {};
        if (embuData?.preliminary_rankings) {
            Object.keys(embuData.preliminary_rankings).forEach((poolKey) => {
                map[poolKey] = {
                    key: poolKey,
                    label: `Pool ${poolKey}`,
                    matches: [],
                    standings: embuData.preliminary_rankings[poolKey] || [],
                };
            });
        }
        matchesPenyisihan.forEach((m) => {
            const p = m.pool || 'A';
            if (!map[p]) {
                map[p] = {
                    key: p,
                    label: `Pool ${p}`,
                    matches: [],
                    standings: embuData?.preliminary_rankings?.[p] || [],
                };
            }
            map[p].matches.push(m);
        });

        return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
    }, [matchesPenyisihan, embuData]);

    const preliminaryTies = useMemo(() => {
        return (embuData?.active_ties || []).filter((t) => t.phase === 'preliminary');
    }, [embuData?.active_ties]);

    const finalTies = useMemo(() => {
        return (embuData?.active_ties || []).filter((t) => t.phase === 'final');
    }, [embuData?.active_ties]);

    return (
        <AdminLayout title="Pusat Kendali Panitera">
            <Head title="Pusat Kendali Panitera | Smart Perkemi" />

            <div className="space-y-5">
                <PaniteraHeader
                    title="Pusat Kendali Panitera"
                    description="Pilih nomor pertandingan untuk membuka alur pencatatan nilai dan penentuan finalis secara tertib."
                    activeEvent={activeEvent}
                    events={events}
                    path="/admin/panitera/scoring"
                />
                <FlashMessage flash={flash} />

                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan Panitera">
                    {statCards.map(([key, label, icon, variant]) => (
                        <article key={key} className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-bold uppercase tracking-wide text-[#7a746e]">{label}</span>
                                <Badge variant={variant}><i className={`fa-solid ${icon}`} aria-hidden="true" /></Badge>
                            </div>
                            <p className="mt-3 text-3xl font-black tracking-tight text-[#17120f]">{stats[key] || 0}</p>
                        </article>
                    ))}
                </section>

                <section className="space-y-5" aria-label="Daftar pertandingan dan penugasan meja">
                    {/* BREADCRUMB / TOMBOL KEMBALI JIKA NOMOR PERTANDINGAN DIBUKA */}
                    {selectedCategory && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm">
                            <button
                                type="button"
                                onClick={() => visit({ category_id: '' })}
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white hover:bg-slate-800 transition shadow-2xs"
                            >
                                <i className="fa-solid fa-arrow-left text-[11px]" />
                                <span>← Kembali ke Kotak Nomor Pertandingan</span>
                            </button>
                            <div className="flex items-center gap-2">
                                {selectedCategory.is_locked ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-3.5 py-1 text-xs font-black">
                                        <i className="fa-solid fa-lock text-[11px]" /> Terkunci (Mode Hanya Lihat)
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 px-3.5 py-1 text-xs font-black">
                                        <i className="fa-solid fa-door-open text-[11px]" /> Nomor Sedang Terbuka
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="w-full overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm">
                        <div className="border-b border-[#ede9e1] p-4 sm:p-5">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-base font-bold text-[#17120f]">
                                            {selectedCategory ? selectedCategory.name : 'Daftar Nomor Pertandingan'}
                                        </h2>
                                        <Badge variant="gold">
                                            {selectedCategory ? `${matches.total || 0} partai` : `${filteredCategories.length} nomor`}
                                        </Badge>
                                        {isCourtRestricted && <Badge variant="green"><i className="fa-solid fa-lock mr-1" aria-hidden="true" />Court penugasan Anda</Badge>}
                                    </div>
                                    <p className="mt-1 text-xs text-[#7a746e]">
                                        {selectedCategory
                                            ? 'Daftar partai dipisahkan antara Babak Penyisihan dan Babak Final. Finalis dapat di-generate langsung dari klasemen.'
                                            : 'Pilih kotak nomor pertandingan di bawah ini untuk membuka partai dan mengisi nilai sesuai urutan jadwal.'}
                                    </p>
                                </div>
                                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                                    <Link href={`/admin/panitera/scoring/embu-result${eventQuery}`}><Button size="sm" variant="outline" className="w-full">Rekap Embu</Button></Link>
                                    <Link href={`/admin/panitera/scoring/randori-result${eventQuery}`}><Button size="sm" variant="outline" className="w-full">Hasil Randori</Button></Link>
                                    <Link href={`/admin/panitera/scoring/champions${eventQuery}`} className="col-span-2 sm:col-span-1"><Button size="sm" variant="gold" className="w-full">Hasil Juara</Button></Link>
                                </div>
                            </div>

                            {/* Filter Bar (Hanya tampil saat di kotak-kotak awal atau pencarian global) */}
                            {!selectedCategory && (
                                <form onSubmit={submitSearch} className="mt-4 space-y-3 rounded-2xl border border-[#ede9e1] bg-[#fbfaf8] p-4">
                                    <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-12 items-end">
                                        <div className="md:col-span-5">
                                            <Input
                                                label="Cari Nomor Pertandingan"
                                                type="search"
                                                value={search}
                                                clearable
                                                onClear={() => {
                                                    setSearch('');
                                                    visit({ search: '' });
                                                }}
                                                onChange={(event) => setSearch(event.target.value)}
                                                placeholder="Nama nomor pertandingan..."
                                                iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                                            />
                                        </div>
                                        <div className="md:col-span-5">
                                            <Combobox
                                                label="Filter Langsung Nomor Pertandingan"
                                                value={filters.category_id || ''}
                                                clearable
                                                onChange={(value) => visit({ category_id: value })}
                                                options={[
                                                    { value: '', label: 'Semua Nomor Pertandingan' },
                                                    ...categories.map((c) => ({
                                                        value: c.id,
                                                        label: c.name,
                                                        sublabel: `${c.type.toUpperCase()}${c.earliest_scheduled_at ? ` · ⏰ ${c.earliest_scheduled_at}` : ''}${c.earliest_court_name ? ` (${c.earliest_court_name})` : ''} · ${c.completed_matches}/${c.total_matches} selesai${c.is_locked ? ' (Terkunci)' : ''}`,
                                                    })),
                                                ]}
                                            />
                                        </div>
                                        <div className="md:col-span-2 flex items-center gap-2">
                                            <Button
                                                type="submit"
                                                className="w-full min-h-10 text-xs font-bold"
                                                iconLeft={<i className="fa-solid fa-filter" aria-hidden="true" />}
                                            >
                                                Terapkan
                                            </Button>
                                            {hasActiveFilters && (
                                                <button
                                                    type="button"
                                                    onClick={resetFilters}
                                                    className="min-h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition shrink-0 shadow-2xs"
                                                    title="Reset Filter"
                                                >
                                                    <i className="fa-solid fa-rotate-left" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid gap-3 grid-cols-2 md:grid-cols-4 pt-2 border-t border-[#ede9e1]/70">
                                        <Combobox
                                            label="Urutan Tampilan"
                                            value={filters.sort_by || 'schedule'}
                                            clearable={false}
                                            onChange={(value) => visit({ sort_by: value })}
                                            options={[
                                                { value: 'schedule', label: '⏰ Urut Jadwal (Jam Awal)' },
                                                { value: 'category', label: '🔢 Urut Nomor Master (#)' },
                                            ]}
                                        />
                                        <Combobox
                                            label="Jenis"
                                            value={filters.category_type || 'all'}
                                            clearable={false}
                                            onChange={(value) => visit({ category_type: value })}
                                            options={[
                                                { value: 'all', label: 'Semua jenis' },
                                                { value: 'embu', label: 'Embu' },
                                                { value: 'randori', label: 'Randori' },
                                            ]}
                                        />
                                        <Combobox
                                            label="Status"
                                            value={filters.status || 'all'}
                                            clearable={false}
                                            onChange={(value) => visit({ status: value })}
                                            options={[
                                                { value: 'all', label: 'Semua status' },
                                                { value: 'unfinished', label: 'Belum selesai' },
                                                { value: 'completed', label: 'Sudah selesai' },
                                            ]}
                                        />
                                        <Combobox
                                            label="Court"
                                            value={filters.court_id || ''}
                                            clearable={false}
                                            disabled={isCourtRestricted && courts.length === 1}
                                            onChange={(value) => visit({ court_id: value })}
                                            options={[
                                                ...(!isCourtRestricted ? [{ value: '', label: 'Semua Court' }] : []),
                                                ...(isCourtRestricted && courts.length > 1 ? [{ value: '', label: 'Semua Court Penugasan' }] : []),
                                                ...courts.map((court) => ({ value: court.id, label: court.name })),
                                            ]}
                                        />
                                    </div>
                                </form>
                            )}

                            {/* Banner Nomor Pertandingan Terpilih & Tombol Kunci Langsung */}
                            {selectedCategory && (
                                <div className={`mt-4 p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs ${
                                    selectedCategory.is_locked
                                        ? 'bg-emerald-50/90 border-emerald-300'
                                        : selectedCategory.is_completed
                                            ? 'bg-amber-50/90 border-amber-300'
                                            : 'bg-white border-slate-200'
                                }`}>
                                    <div className="flex items-start sm:items-center gap-3.5">
                                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-black text-lg shadow-xs ${
                                            selectedCategory.is_locked ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'
                                        }`}>
                                            <i className={`fa-solid ${selectedCategory.is_locked ? 'fa-lock' : 'fa-layer-group'}`} />
                                        </span>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-base sm:text-lg font-black text-slate-900">{selectedCategory.name}</h3>
                                                <Badge variant={selectedCategory.type === 'embu' ? 'blue' : 'red'} size="xs">{selectedCategory.type.toUpperCase()}</Badge>
                                                {selectedCategory.gender && <Badge variant="gray" size="xs">{selectedCategory.gender === 'male' ? 'Putra' : selectedCategory.gender === 'female' ? 'Putri' : 'Campuran'}</Badge>}
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-slate-600">
                                                <span className="font-semibold">
                                                    Progres: <strong className="text-slate-900">{selectedCategory.completed_matches}/{selectedCategory.total_matches} Partai Selesai</strong> ({selectedCategory.total_matches > 0 ? Math.round((selectedCategory.completed_matches / selectedCategory.total_matches) * 100) : 0}%)
                                                </span>
                                                {selectedCategory.is_locked ? (
                                                    <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
                                                        · <i className="fa-solid fa-lock text-[10px]" /> Dikunci pada {selectedCategory.locked_at} (Mode Hanya Lihat)
                                                    </span>
                                                ) : selectedCategory.is_completed ? (
                                                    <span className="inline-flex items-center gap-1 font-bold text-amber-900">
                                                        · <i className="fa-solid fa-circle-check text-[10px]" /> Seluruh partai selesai — Siap dikunci
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {selectedCategory.is_locked ? (
                                            <Link
                                                as="button"
                                                method="post"
                                                href={`/admin/panitera/scoring/categories/${selectedCategory.id}/unlock`}
                                                data={{ redirect_to: `/admin/panitera/scoring?category_id=${selectedCategory.id}&event_id=${activeEvent.id}` }}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-white px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition shadow-2xs"
                                            >
                                                <i className="fa-solid fa-lock-open text-[11px]" /> Buka Kunci Nomor
                                            </Link>
                                        ) : (
                                            <Link
                                                as="button"
                                                method="post"
                                                href={`/admin/panitera/scoring/categories/${selectedCategory.id}/lock`}
                                                data={{ redirect_to: `/admin/panitera/scoring?category_id=&event_id=${activeEvent.id}` }}
                                                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition ${
                                                    selectedCategory.is_completed ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-slate-800 hover:bg-slate-900'
                                                }`}
                                            >
                                                <i className="fa-solid fa-lock text-[11px]" /> Kunci Nomor & Kembali ke Kotak
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Banner Juara Resmi jika sudah dikonfirmasi */}
                            {selectedCategory && championship?.is_confirmed && championship?.current_champions?.length > 0 && (
                                <div className="mt-4 rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50 via-yellow-50/50 to-white p-4 sm:p-5 shadow-xs space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-amber-200/70 pb-3">
                                        <div className="flex items-center gap-2.5">
                                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black shadow-xs">
                                                <i className="fa-solid fa-trophy" />
                                            </span>
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                                                    Juara Resmi Telah Ditetapkan
                                                    <Badge variant="green" size="xs">Resmi</Badge>
                                                </h3>
                                                <p className="text-xs text-slate-600">
                                                    Hasil medali dan juara telah tercatat secara sah untuk nomor {selectedCategory.name}.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Link
                                                href={`/admin/panitera/scoring/champions?category=${selectedCategory.id}&event_id=${encodeURIComponent(activeEvent.id)}`}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-50 transition shadow-2xs"
                                            >
                                                <i className="fa-solid fa-medal text-amber-600" /> Kelola di Menu Juara
                                            </Link>
                                            {canManage && championship?.generation_ready && (
                                                <Button
                                                    size="xs"
                                                    variant="outline"
                                                    onClick={handleGenerateChampions}
                                                    disabled={generatingChampions}
                                                    className="border-amber-300 text-amber-900 hover:bg-amber-100"
                                                    iconLeft={<i className="fa-solid fa-arrows-rotate" />}
                                                >
                                                    {generatingChampions ? 'Memproses...' : 'Generate Ulang Juara'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                        {championship.current_champions.map((champ) => {
                                            const isGold = Number(champ.rank) === 1;
                                            const isSilver = Number(champ.rank) === 2;

                                            return (
                                                <div
                                                    key={champ.id || champ.rank}
                                                    className={`rounded-xl border p-3.5 shadow-2xs transition-all ${
                                                        isGold
                                                            ? 'border-amber-300 bg-amber-50/70'
                                                            : isSilver
                                                            ? 'border-slate-300 bg-slate-50/70'
                                                            : 'border-orange-200 bg-orange-50/50'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-1 mb-1.5">
                                                        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${
                                                            isGold
                                                                ? 'bg-amber-500 text-slate-950'
                                                                : isSilver
                                                                ? 'bg-slate-300 text-slate-800'
                                                                : 'bg-amber-700 text-white'
                                                        }`}>
                                                            <i className="fa-solid fa-medal text-[9px]" />
                                                            {champ.rank_label || `Juara ${champ.rank}`}
                                                        </span>
                                                        <span className="text-xs font-black text-slate-400">#{champ.rank}</span>
                                                    </div>
                                                    <p className="font-bold text-slate-900 text-sm leading-snug">{champ.label}</p>
                                                    <p className="mt-1 text-xs text-slate-600 flex items-center gap-1">
                                                        <i className="fa-solid fa-shield-halved text-[10px] text-slate-400" />
                                                        {champ.contingent_name || '—'}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Banner Siap Generate Juara jika belum dikonfirmasi */}
                            {selectedCategory && !championship?.is_confirmed && championship?.generation_ready && (
                                <div className="mt-4 rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10 p-4 sm:p-5 shadow-sm space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div className="flex items-start sm:items-center gap-3">
                                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-black text-lg shadow-sm">
                                                <i className="fa-solid fa-crown" />
                                            </span>
                                            <div>
                                                <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                                                    Seluruh Pertandingan Selesai — Siap Generate Hasil Juara!
                                                </h3>
                                                <p className="text-xs text-slate-700 mt-0.5">
                                                    {championship.generation_message || 'Seluruh partai telah tuntas. Klik tombol di samping untuk otomatis menetapkan susunan juara.'}
                                                </p>
                                            </div>
                                        </div>
                                        {canManage && (
                                            <Button
                                                variant="gold"
                                                size="md"
                                                onClick={handleGenerateChampions}
                                                disabled={generatingChampions}
                                                className="shrink-0 shadow-sm font-black"
                                                iconLeft={<i className="fa-solid fa-crown" />}
                                            >
                                                {generatingChampions ? 'Men-generate Juara...' : 'Generate Hasil Juara'}
                                            </Button>
                                        )}
                                    </div>

                                    {/* Preview Calon Juara */}
                                    {championship.candidates?.length > 0 && (
                                        <div className="mt-2 pt-3 border-t border-amber-300/60">
                                            <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-2">
                                                Kandidat Juara Berdasarkan Hasil Pertandingan:
                                            </p>
                                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                                {championship.candidates.map((cand) => (
                                                    <div key={cand.rank} className="rounded-xl border border-amber-200/80 bg-white/90 p-2.5 text-xs shadow-2xs">
                                                        <div className="flex items-center justify-between font-bold text-amber-900">
                                                            <span>{cand.rank === 1 ? '🥇 Juara 1 (Emas)' : cand.rank === 2 ? '🥈 Juara 2 (Perak)' : cand.rank === 3 ? '🥉 Juara 3 (Perunggu)' : '🥉 Juara 3 Bersama'}</span>
                                                        </div>
                                                        <p className="mt-1 font-semibold text-slate-900 truncate">{cand.label}</p>
                                                        {cand.members && cand.members.length > 0 && (
                                                            <p className="text-[11px] font-semibold text-slate-700 flex items-center gap-1 mt-0.5 truncate">
                                                                <i className="fa-solid fa-user-ninja text-[9px] text-slate-400" />
                                                                {cand.members.join(' & ')}
                                                            </p>
                                                        )}
                                                        {cand.contingent_name && cand.contingent_name !== cand.label && (
                                                            <p className="text-[11px] text-slate-500 truncate">{cand.contingent_name}</p>
                                                        )}
                                                        {cand.basis && (
                                                            <p className="mt-0.5 text-[10px] text-amber-700 italic">{cand.basis}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* VIEW 1: KOTAK-KOTAK NOMOR PERTANDINGAN (GRID CARDS) - Ditampilkan Pertama Kali */}
                        {!selectedCategory && (
                            <div className="p-4 sm:p-6">
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {filteredCategories.map((c) => {
                                        const percent = c.total_matches > 0 ? Math.round((c.completed_matches / c.total_matches) * 100) : 0;

                                        return (
                                            <article
                                                key={c.id}
                                                className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 shadow-xs hover:shadow-md ${
                                                    c.is_locked
                                                        ? 'border-emerald-300 bg-emerald-50/40'
                                                        : c.is_completed
                                                            ? 'border-amber-300 bg-amber-50/40'
                                                            : 'border-[#ede9e1] bg-white hover:border-slate-400'
                                                }`}
                                            >
                                                <div>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-2 py-0.5 text-[11px] font-black shadow-2xs" title={`Nomor Master #${c.order}`}>
                                                                #{c.order || '·'}
                                                            </span>
                                                            {c.has_schedule && c.earliest_scheduled_time && (
                                                                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-[10.5px] font-black shadow-2xs" title={`Jam awal jadwal: ${c.earliest_scheduled_at}`}>
                                                                    <i className="fa-regular fa-clock text-[9px]" />
                                                                    {c.earliest_scheduled_time}
                                                                </span>
                                                            )}
                                                            <Badge variant={c.type === 'embu' ? 'blue' : 'red'} size="xs">
                                                                {c.type.toUpperCase()}
                                                            </Badge>
                                                            {c.gender && (
                                                                <Badge variant="gray" size="xs">
                                                                    {c.gender === 'male' ? 'Putra' : c.gender === 'female' ? 'Putri' : 'Campuran'}
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        {c.is_locked ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-black">
                                                                <i className="fa-solid fa-lock text-[9px]" /> Terkunci
                                                            </span>
                                                        ) : c.is_completed ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold">
                                                                <i className="fa-solid fa-circle-check text-[9px]" /> Siap Dikunci
                                                            </span>
                                                        ) : c.completed_matches > 0 ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-900 border border-blue-300 px-2.5 py-0.5 text-[10px] font-bold">
                                                                <i className="fa-solid fa-spinner fa-spin text-[9px]" /> Berjalan
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 text-[10px] font-semibold">
                                                                Belum Dimulai
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h3 className="mt-3 text-base sm:text-lg font-black text-slate-900 leading-snug line-clamp-2">
                                                        {c.name}
                                                    </h3>

                                                    {/* Jadwal Jam Awal Tanding */}
                                                    {c.has_schedule && c.earliest_scheduled_at ? (
                                                        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-950 bg-amber-50/90 px-2.5 py-1.5 rounded-xl border border-amber-200/90 font-medium">
                                                            <i className="fa-regular fa-clock text-amber-600 text-xs shrink-0" />
                                                            <span className="truncate">
                                                                Mulai: <strong>{c.earliest_scheduled_at}</strong>
                                                                {c.earliest_court_name ? ` · ${c.earliest_court_name}` : ''}
                                                                {c.earliest_match_sequence ? ` · Partai #${c.earliest_match_sequence}` : ''}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                                                            <i className="fa-regular fa-calendar-xmark text-slate-400 text-xs shrink-0" />
                                                            <span>Jadwal jam belum ditentukan</span>
                                                        </div>
                                                    )}

                                                    {/* Progress Bar */}
                                                    <div className="mt-3">
                                                        <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                                                            <span className="font-semibold">Progres Partai</span>
                                                            <span className="font-bold text-slate-900">
                                                                {c.completed_matches} / {c.total_matches} ({percent}%)
                                                            </span>
                                                        </div>
                                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                            <div
                                                                className={`h-full transition-all duration-300 ${
                                                                    c.is_locked
                                                                        ? 'bg-emerald-600'
                                                                        : c.is_completed
                                                                            ? 'bg-amber-500'
                                                                            : 'bg-blue-600'
                                                                }`}
                                                                style={{ width: `${percent}%` }}
                                                            />
                                                        </div>

                                                        {/* Rincian Babak Penyisihan & Final jika ada */}
                                                        {(c.prelim_total > 0 || c.final_total > 0) && (
                                                            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                                                                <span>
                                                                    <i className="fa-solid fa-users mr-1 text-[10px]" />
                                                                    Penyisihan: <strong>{c.prelim_completed}/{c.prelim_total}</strong>
                                                                </span>
                                                                <span>
                                                                    <i className="fa-solid fa-trophy mr-1 text-[10px]" />
                                                                    Final: <strong>{c.final_completed}/{c.final_total}</strong>
                                                                </span>
                                                            </div>
                                                        )}

                                                        {c.is_locked && (
                                                            <p className="mt-2 text-[11px] text-emerald-800 font-medium">
                                                                <i className="fa-solid fa-circle-check mr-1" />
                                                                Dikunci {c.locked_at}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-5 pt-3 border-t border-[#ede9e1] space-y-2">
                                                    <Button
                                                        onClick={() => visit({ category_id: c.id })}
                                                        className={`w-full text-xs font-bold ${
                                                            c.is_locked
                                                                ? 'bg-slate-800 hover:bg-slate-900 text-white'
                                                                : 'bg-[#c0392b] hover:bg-[#a82718] text-white shadow-xs'
                                                        }`}
                                                        iconLeft={<i className={`fa-solid ${c.is_locked ? 'fa-eye' : 'fa-door-open'}`} />}
                                                    >
                                                        {c.is_locked ? 'Buka Partai (Mode Hanya Lihat)' : 'Buka Partai / Nomor Pertandingan'}
                                                    </Button>

                                                    {c.is_locked ? (
                                                        <Link
                                                            as="button"
                                                            method="post"
                                                            href={`/admin/panitera/scoring/categories/${c.id}/unlock`}
                                                            data={{ redirect_to: `/admin/panitera/scoring?category_id=&event_id=${activeEvent.id}` }}
                                                            className="w-full text-center text-xs text-emerald-800 hover:underline font-bold py-1 inline-flex items-center justify-center gap-1"
                                                        >
                                                            <i className="fa-solid fa-lock-open text-[10px]" /> Buka Kunci Nomor
                                                        </Link>
                                                    ) : c.is_completed ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => visit({ category_id: c.id })}
                                                                className="w-full text-center text-xs text-amber-900 bg-amber-100/80 hover:bg-amber-200/80 border border-amber-300 rounded-lg py-1.5 font-black inline-flex items-center justify-center gap-1.5 transition"
                                                            >
                                                                <i className="fa-solid fa-crown text-amber-600 text-[11px]" />
                                                                Buka & Tetapkan Juara
                                                            </button>
                                                            <Link
                                                                as="button"
                                                                method="post"
                                                                href={`/admin/panitera/scoring/categories/${c.id}/lock`}
                                                                data={{ redirect_to: `/admin/panitera/scoring?category_id=&event_id=${activeEvent.id}` }}
                                                                className="w-full text-center text-xs text-emerald-800 hover:underline font-black py-1 inline-flex items-center justify-center gap-1"
                                                            >
                                                                <i className="fa-solid fa-lock text-[10px]" /> Kunci Nomor Ini
                                                            </Link>
                                                        </>
                                                    ) : null}
                                                </div>
                                            </article>
                                        );
                                    })}
                                    {filteredCategories.length === 0 && (
                                        <div className="col-span-full py-12 text-center text-slate-500 rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                                            <i className="fa-solid fa-layer-group text-3xl text-slate-400 mb-2" />
                                            <p className="font-semibold">Tidak ada nomor pertandingan yang sesuai filter.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* VIEW 2: NOMOR PERTANDINGAN DIBUKA */}
                        {selectedCategory && (
                            <div className="p-4 sm:p-6 space-y-6">
                                {selectedCategory.type === 'randori' ? (
                                    /* SEKSI RANDORI: TAMPILAN BAGAN PERTANDINGAN */
                                    <div className="space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
                                            <div className="flex items-center gap-2.5">
                                                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 text-white font-black text-xs shadow-2xs">
                                                    <i className="fa-solid fa-sitemap" />
                                                </span>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-black text-slate-900 text-sm sm:text-base">
                                                            Bagan Pertandingan Randori
                                                        </h3>
                                                        <Badge variant="red">{selectedCategory.total_matches} Partai</Badge>
                                                    </div>
                                                    <p className="text-[11px] text-slate-600 mt-0.5">
                                                        Bagan pohon eliminasi dari babak awal hingga final.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-start sm:self-center">
                                                <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs">
                                                    <button
                                                        type="button"
                                                        onClick={() => setRandoriViewTab('bracket')}
                                                        className={`rounded-lg px-3 py-1 font-bold transition ${
                                                            randoriViewTab === 'bracket' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                                        }`}
                                                    >
                                                        <i className="fa-solid fa-sitemap mr-1" /> Bagan
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setRandoriViewTab('table')}
                                                        className={`rounded-lg px-3 py-1 font-bold transition ${
                                                            randoriViewTab === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                                        }`}
                                                    >
                                                        <i className="fa-solid fa-list mr-1" /> Tabel Partai
                                                    </button>
                                                </div>
                                                <Link
                                                    href={`/admin/panitera/scoring/randori-result?event_id=${encodeURIComponent(activeEvent.id)}&category=${encodeURIComponent(selectedCategory.id)}`}
                                                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                                                >
                                                    <i className="fa-solid fa-up-right-from-square text-[11px]" />
                                                    Buka Layar Penuh
                                                </Link>
                                            </div>
                                        </div>

                                        {randoriViewTab === 'bracket' ? (
                                            <RandoriBracketTree
                                                matches={randoriMatches.length > 0 ? randoriMatches : allCategoryMatches}
                                                activeEvent={activeEvent}
                                                categoryName={selectedCategory.name}
                                                categoryFormat={selectedCategory.format}
                                                canManage={true}
                                            />
                                        ) : (
                                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                                                <div className="border-b border-slate-100 bg-slate-50 p-4">
                                                    <h3 className="font-black text-slate-900 text-sm sm:text-base">Daftar Seluruh Partai Randori</h3>
                                                </div>
                                                <MatchSectionTable
                                                    matches={allCategoryMatches}
                                                    activeEvent={activeEvent}
                                                    isLocked={selectedCategory.is_locked}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* SEKSI EMBU: BABAK PENYISIHAN (TERPISAH PER POOL) & BABAK FINAL */
                                    <div className="space-y-6">
                                        {/* PANEL TIE-BREAK PARAMETER 5 BABAK PENYISIHAN */}
                                        {preliminaryTies.length > 0 && (
                                            <EmbuTiebreakPanel
                                                ties={preliminaryTies}
                                                isArbitration={false}
                                            />
                                        )}

                                        {/* SEKSI 1: BABAK PENYISIHAN (TERPISAH PER POOL A, POOL B, DST) */}
                                        {preliminaryPools.length > 0 && preliminaryPools.map((pool) => {
                                            const poolCompleted = pool.matches.filter((m) => m.status === 'completed').length;
                                            const poolTotal = pool.matches.length;
                                            const isPoolDone = poolTotal > 0 && poolCompleted === poolTotal;

                                            return (
                                                <div key={pool.key} className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-xs">
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-blue-100 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 p-4">
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-xs shadow-2xs">
                                                                <i className="fa-solid fa-users" />
                                                            </span>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <h3 className="font-black text-slate-900 text-sm sm:text-base">
                                                                        Babak Penyisihan — {pool.label}
                                                                    </h3>
                                                                    <Badge variant="blue">{poolTotal} Partai</Badge>
                                                                    {isPoolDone && <Badge variant="green">Selesai</Badge>}
                                                                </div>
                                                                <p className="text-[11px] text-slate-600 mt-0.5">
                                                                    Kuota Lolos Final: Top {embuData?.quota_per_pool && embuData.quota_per_pool !== 999 ? embuData.quota_per_pool : 4} dari {pool.label}. Penentuan peringkat sesuai 5 Parameter PB PERKEMI.
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 self-start sm:self-center">
                                                            <span className="text-xs font-bold text-blue-900">
                                                                Progres: {poolCompleted}/{poolTotal} Selesai
                                                            </span>
                                                            <Link
                                                                href={`/admin/panitera/scoring/embu-result?event_id=${encodeURIComponent(activeEvent.id)}&category=${encodeURIComponent(selectedCategory.id)}`}
                                                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-800 hover:text-blue-950 underline ml-2"
                                                            >
                                                                <i className="fa-solid fa-table-list text-[10px]" /> Rekap Lengkap
                                                            </Link>
                                                        </div>
                                                    </div>

                                                    {/* TABEL KLASEMEN SEMENTARA POOL INI */}
                                                    {pool.standings && pool.standings.length > 0 && (
                                                        <div className="border-b border-slate-100">
                                                            <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-200/60 flex items-center justify-between text-xs font-bold text-slate-700">
                                                                <span className="flex items-center gap-1.5">
                                                                    <i className="fa-solid fa-ranking-star text-amber-600" />
                                                                    Klasemen Sementara {pool.label} (5 Parameter PB PERKEMI)
                                                                </span>
                                                                <span className="text-[11px] font-normal text-slate-500">
                                                                    P1: Nilai Akhir · P2: Teknik 3 Wasit · P3: W1 Total · P4: W1 Teknik · P5: Unggul Manual
                                                                </span>
                                                            </div>
                                                            <EmbuPoolStandingTable
                                                                standings={pool.standings}
                                                                quota={embuData?.quota_per_pool}
                                                                isFinal={false}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* TABEL PARTAI PERTANDINGAN POOL */}
                                                    <MatchSectionTable
                                                        matches={pool.matches}
                                                        activeEvent={activeEvent}
                                                        isLocked={selectedCategory.is_locked}
                                                    />
                                                </div>
                                            );
                                        })}

                                        {/* AKSI KUNCI & LOLOSKAN KE FINAL DARI KLASEMEN PENYISIHAN */}
                                        {matchesPenyisihan.length > 0 && (
                                            <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition-all ${
                                                selectedCategory.prelim_all_done && selectedCategory.has_placeholders
                                                    ? 'border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white'
                                                    : 'border-slate-200 bg-slate-50/60'
                                            }`}>
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                    <div className="flex items-start sm:items-center gap-3">
                                                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-sm shadow-2xs ${
                                                            selectedCategory.prelim_all_done
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'bg-slate-300 text-slate-700'
                                                        }`}>
                                                            <i className={`fa-solid ${selectedCategory.prelim_all_done ? 'fa-circle-check' : 'fa-hourglass-half'}`} />
                                                        </span>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                                                                Kunci & Loloskan Peserta ke Babak Final
                                                                {selectedCategory.prelim_all_done ? (
                                                                    <Badge variant="green" size="xs">Penyisihan Lengkap</Badge>
                                                                ) : (
                                                                    <Badge variant="gray" size="xs">Penyisihan Berjalan</Badge>
                                                                )}
                                                            </h4>
                                                            <p className="text-xs text-slate-600 mt-0.5">
                                                                {selectedCategory.prelim_all_done
                                                                    ? selectedCategory.has_placeholders
                                                                        ? 'Semua pool penyisihan telah dinilai lengkap. Klik tombol di samping untuk mengunci ranking dan memasukkan atlet yang lolos ke slot Babak Final.'
                                                                        : 'Peserta babak final telah berhasil diloloskan dari klasemen penyisihan.'
                                                                    : `Menunggu penyisihan selesai (${matchesPenyisihan.filter(m => m.status === 'completed').length}/${matchesPenyisihan.length} partai dinilai).`}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {selectedCategory.can_advance_finalists && (
                                                        <Button
                                                            size="sm"
                                                            variant={selectedCategory.prelim_all_done ? 'gold' : 'outline'}
                                                            onClick={handleAdvanceFinalists}
                                                            disabled={selectedCategory.is_locked || !selectedCategory.prelim_all_done}
                                                            iconLeft={<i className="fa-solid fa-bolt" />}
                                                            className="shrink-0 font-black"
                                                        >
                                                            Kunci & Loloskan ke Babak Final
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* PANEL TIE-BREAK PARAMETER 5 BABAK FINAL */}
                                        {finalTies.length > 0 && (
                                            <EmbuTiebreakPanel
                                                ties={finalTies}
                                                isArbitration={false}
                                            />
                                        )}

                                        {/* SEKSI 2: BABAK FINAL + TOMBOL SIMPAN & KUNCI JUARA */}
                                        {(matchesFinal.length > 0 || selectedCategory.can_advance_finalists) && (
                                            <div className="overflow-hidden rounded-2xl border border-amber-300 bg-white shadow-xs">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/40 p-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black text-xs shadow-2xs">
                                                            <i className="fa-solid fa-trophy" />
                                                        </span>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-black text-slate-900 text-sm sm:text-base">Babak Final</h3>
                                                                <Badge variant="gold">{matchesFinal.length} Partai</Badge>
                                                                {matchesFinal.length > 0 && matchesFinal.every((m) => m.status === 'completed') && (
                                                                    <Badge variant="green">Final Tuntas</Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-slate-600 mt-0.5">
                                                                Partai perebutan gelar juara dan medali. Nilai akumulasi (Penyisihan + Final) dievaluasi dengan 5 Parameter PB PERKEMI.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {matchesFinal.length > 0 && matchesFinal.every((m) => m.status === 'completed') && !selectedCategory.is_locked && (
                                                            <Button
                                                                size="sm"
                                                                variant="gold"
                                                                onClick={handleConfirmChampions}
                                                                iconLeft={<i className="fa-solid fa-crown" />}
                                                                className="font-black shadow-xs"
                                                            >
                                                                Simpan & Kunci Juara
                                                            </Button>
                                                        )}
                                                        <Link
                                                            href={`/admin/panitera/scoring/champions?category=${selectedCategory.id}&event_id=${encodeURIComponent(activeEvent.id)}`}
                                                            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-50 transition shadow-2xs"
                                                        >
                                                            <i className="fa-solid fa-medal text-[11px]" />
                                                            Buku Juara
                                                        </Link>
                                                    </div>
                                                </div>

                                                {selectedCategory.has_placeholders && (
                                                    <div className="p-3.5 bg-amber-50/70 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
                                                        <span className="flex items-center gap-2 font-medium">
                                                            <i className="fa-solid fa-triangle-exclamation text-amber-600 shrink-0" />
                                                            Slot babak final masih menunggu penetapan atlet yang lolos dari penyisihan.
                                                        </span>
                                                        {selectedCategory.prelim_all_done && !selectedCategory.is_locked && (
                                                            <span className="font-bold text-emerald-800">
                                                                ✓ Babak penyisihan selesai. Siap di-generate!
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* TABEL KLASEMEN HASIL BABAK FINAL */}
                                                {embuData?.final_rankings && embuData.final_rankings.length > 0 && (
                                                    <div className="border-b border-amber-100">
                                                        <div className="px-4 py-2 bg-amber-50/60 border-b border-amber-200/60 flex items-center justify-between text-xs font-bold text-amber-950">
                                                            <span className="flex items-center gap-1.5">
                                                                <i className="fa-solid fa-trophy text-amber-600" />
                                                                Klasemen Akhir & Peringkat Podium Juara (5 Parameter PB PERKEMI)
                                                            </span>
                                                            <span className="text-[11px] font-normal text-amber-800">
                                                                Akumulasi = Nilai Penyisihan + Nilai Final
                                                            </span>
                                                        </div>
                                                        <EmbuPoolStandingTable
                                                            standings={embuData.final_rankings}
                                                            isFinal={true}
                                                        />
                                                    </div>
                                                )}

                                                <MatchSectionTable
                                                    matches={matchesFinal}
                                                    activeEvent={activeEvent}
                                                    isLocked={selectedCategory.is_locked}
                                                />
                                            </div>
                                        )}

                                        {/* JIKA KATEGORI MERUPAKAN FINAL LANGSUNG TANPA PENYISIHAN */}
                                        {matchesPenyisihan.length === 0 && matchesFinal.length === 0 && (
                                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                                                <div className="border-b border-slate-100 bg-slate-50 p-4">
                                                    <h3 className="font-black text-slate-900 text-sm sm:text-base">Daftar Partai Babak Final Langsung</h3>
                                                </div>
                                                <MatchSectionTable
                                                    matches={allCategoryMatches}
                                                    activeEvent={activeEvent}
                                                    isLocked={selectedCategory.is_locked}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedCategory && (selectedCategory.type !== 'randori' || randoriViewTab === 'table') && (
                            <Pagination pagination={matches} label="partai" onPageChange={(page) => visit({}, page)} />
                        )}
                    </div>

                    {/* Penugasan Meja per Court */}
                    <div className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2 className="text-base font-bold text-[#17120f]">Penugasan Meja per Court</h2>
                                <p className="mt-0.5 text-xs text-[#7a746e]">{isCourtRestricted ? 'Hanya court yang menjadi tanggung jawab akun Panitera ini.' : 'Seluruh penugasan meja pada event ini.'}</p>
                            </div>
                            <Badge variant="gold">{courts.length} Court</Badge>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                            {courts.map((court) => (
                                <article key={court.id} className="rounded-xl border border-[#ede9e1] bg-[#fbfaf8] p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="font-bold">{court.name}</h3>
                                        <div className="flex items-center gap-2">
                                            {court.access_code && (
                                                <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-0.5 font-mono text-[11px] font-black text-amber-950 dark:text-amber-200 shadow-2xs" title="Token Meja Panitera (6 Digit)">
                                                    <i className="fa-solid fa-key text-[10px] text-amber-700 dark:text-amber-400" aria-hidden="true" />
                                                    {court.access_code}
                                                </span>
                                            )}
                                            <Badge variant={court.is_active ? 'green' : 'gray'}>{court.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                                        </div>
                                    </div>
                                    <p className="mt-1 text-xs text-[#7a746e]">{court.location || 'Lokasi belum dicatat'}</p>
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <div className="rounded-lg bg-white px-3 py-2"><p className="text-[10px] font-bold uppercase text-[#8c827a]">Progres</p><p className="mt-0.5 text-sm font-black text-[#17120f]">{court.completed_matches}/{court.total_matches}</p></div>
                                        <div className="rounded-lg bg-white px-3 py-2"><p className="text-[10px] font-bold uppercase text-[#8c827a]">Partai Aktif</p><p className="mt-0.5 truncate text-xs font-bold text-[#17120f]">{court.active_match?.label || 'Belum ada'}</p></div>
                                    </div>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                                        {court.clerks.map((clerk) => <p key={clerk.id} className="rounded-lg bg-white px-3 py-2 text-xs"><span className="font-semibold">{clerk.name}</span><span className="text-[#7a746e]"> · {clerk.role}</span></p>)}
                                        {court.clerks.length === 0 && (
                                            <div className="sm:col-span-2 md:col-span-1 xl:col-span-2 flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                                                <i className="fa-solid fa-circle-info text-amber-600 dark:text-amber-400 text-xs shrink-0" aria-hidden="true" />
                                                <span>Belum ada Panitera ditugaskan.</span>
                                            </div>
                                        )}
                                    </div>
                                    {/* VAR Stream Link Row */}
                                    <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs shadow-2xs">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <i className="fa-solid fa-video text-rose-600 text-xs shrink-0" aria-hidden="true" />
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 shrink-0">VAR:</span>
                                            <a
                                                href={court.var_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="truncate font-mono text-[11px] font-semibold text-rose-700 hover:text-rose-900 hover:underline"
                                                title={`Buka Link VAR (${court.var_url})`}
                                            >
                                                {court.var_url}
                                            </a>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenVarModal(court)}
                                            className="shrink-0 inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                            title="Sesuaikan Link VAR"
                                        >
                                            <i className="fa-solid fa-pen-to-square text-[10px]" />
                                            <span>Ubah</span>
                                        </button>
                                    </div>

                                    <div className="mt-3 border-t border-[#e7e0d7] pt-3">
                                        <CourtMonitorButtons courtId={court.id} eventId={activeEvent.id} varUrl={court.var_url} compact />
                                    </div>
                                </article>
                            ))}
                            {courts.length === 0 && <p className="rounded-xl border border-dashed border-[#d9d3c9] p-8 text-center text-sm text-[#7a746e] md:col-span-2 2xl:col-span-3">Belum ada court untuk akun Panitera ini.</p>}
                        </div>
                    </div>
                </section>
            </div>

            {/* Modal Sesuaikan Link VAR Court */}
            {editingVarCourt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4">
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                    <i className="fa-solid fa-video text-rose-600" />
                                    Sesuaikan Link VAR — {editingVarCourt.name}
                                </h3>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    Link ini akan otomatis dibuka tombol VAR dan dimuat pada Layar Tanding Monitor saat nomor Randori.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingVarCourt(null)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                                <i className="fa-solid fa-xmark text-sm" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveVarUrl} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    URL Streaming VAR (Kamera Court)
                                </label>
                                <Input
                                    type="url"
                                    value={varUrlInput}
                                    onChange={(e) => setVarUrlInput(e.target.value)}
                                    placeholder={`https://var.smart-perkemi.id/kempo/var/court-${editingVarCourt.order || 1}`}
                                    required={false}
                                    autoFocus
                                />
                                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                    <span>Tautan bawaan sistem:</span>
                                    <button
                                        type="button"
                                        onClick={() => setVarUrlInput(`https://var.smart-perkemi.id/kempo/var/court-${editingVarCourt.order || 1}`)}
                                        className="font-mono text-[11px] font-bold text-rose-600 hover:underline"
                                    >
                                        Gunakan Default Court {editingVarCourt.order || 1}
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                                <p className="font-bold flex items-center gap-1.5">
                                    <i className="fa-solid fa-circle-info text-amber-600" />
                                    Contoh format:
                                </p>
                                <p className="mt-1 text-[11px] text-amber-800">
                                    <code>https://var.smart-perkemi.id/kempo/var/court-{editingVarCourt.order || 1}</code>, IP camera local stream, atau tautan video replay external.
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setEditingVarCourt(null)}
                                    disabled={savingVarUrl}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={savingVarUrl}
                                    iconLeft={<i className="fa-solid fa-floppy-disk" />}
                                >
                                    {savingVarUrl ? 'Menyimpan…' : 'Simpan Link VAR'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
