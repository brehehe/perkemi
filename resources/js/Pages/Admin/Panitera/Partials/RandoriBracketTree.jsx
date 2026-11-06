import { Link } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';

// Status badge helper for bracket match cards
function getStatusBadge(match, isMonitor = false) {
    const isGf2Skipped =
        match.metadata?.gf2_status === 'skipped' ||
        match.metadata?.notes?.includes('dilewati') ||
        match.notes?.includes('dilewati') ||
        (match.is_bye && (match.round_label?.includes('GF2') || match.round_label?.includes('Grand Final Ulang')));

    if (isGf2Skipped) {
        return (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/20">
                <i className="fa-solid fa-ban text-[9px]" /> DILEWATI
            </span>
        );
    }
    if (match.is_bye) {
        return (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                BYE
            </span>
        );
    }
    if (match.score?.is_locked) {
        return (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-white border border-slate-200 dark:border-white/15">
                <i className="fa-solid fa-lock text-[9px]" /> Selesai
            </span>
        );
    }
    if (match.score) {
        return (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <i className="fa-solid fa-check text-[9px]" /> Selesai
            </span>
        );
    }
    if (match.status === 'in_progress' || match.is_active) {
        return (
            <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 dark:bg-purple-950/80 px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700 animate-pulse">
                <i className="fa-solid fa-stopwatch text-[9px]" /> Live
            </span>
        );
    }
    if (match.is_ready) {
        return (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Siap
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 dark:bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:text-white/40 border border-slate-200 dark:border-white/10">
            Menunggu
        </span>
    );
}

// Single Match Card in the Bracket Tree
function BracketMatchCard({
    match,
    activeEvent,
    canManage = false,
    isMonitor = false,
    isActive = false,
    className = '',
    highlightContingentId = null,
    highlightContingentName = null,
    highlightEntryIds = [],
    highlightAthleteNames = [],
}) {
    const isCompleted = Boolean(match.score);
    const winnerCorner = match.score?.winner_corner;
    const akaLabel = match.aka_label || match.red_label || '';
    const shiroLabel = match.shiro_label || match.blue_label || '';
    const isAkaWinner = winnerCorner === 'aka' || (match.is_bye && akaLabel && shiroLabel?.toUpperCase() === 'BYE');
    const isShiroWinner = winnerCorner === 'shiro' || (match.is_bye && shiroLabel && akaLabel?.toUpperCase() === 'BYE');
    const scheduledTime = match.scheduled_at || match.scheduled_start_formatted || null;
    const isGf2Skipped =
        match.metadata?.gf2_status === 'skipped' ||
        match.metadata?.notes?.includes('dilewati') ||
        match.notes?.includes('dilewati') ||
        (match.is_bye && (match.round_label?.includes('GF2') || match.round_label?.includes('Grand Final Ulang')));

    const getContingentName = (contingentDirect, metaCorner, entry) => {
        if (contingentDirect && typeof contingentDirect === 'string') return contingentDirect;
        if (contingentDirect?.name) return contingentDirect.name;
        if (metaCorner?.contingent_name) return metaCorner.contingent_name;
        if (metaCorner?.city) return metaCorner.city;
        if (metaCorner?.contingent && typeof metaCorner.contingent === 'string') return metaCorner.contingent;
        if (metaCorner?.contingent?.name) return metaCorner.contingent.name;
        if (entry?.athlete?.contingent?.name) return entry.athlete.contingent.name;
        return '';
    };

    const akaContingent = getContingentName(
        match.aka_contingent || match.red_contingent,
        match.metadata?.red,
        match.redEntry
    );

    const shiroContingent = getContingentName(
        match.shiro_contingent || match.blue_contingent,
        match.metadata?.blue,
        match.blueEntry
    );

    const isPlaceholder = (label) => {
        if (!label) return true;
        const trimmed = label.trim();
        const upper = trimmed.toUpperCase();
        if (upper === 'BYE' || upper === '-' || upper === '—') return true;
        const lower = trimmed.toLowerCase();
        return lower.startsWith('pemenang') || lower.startsWith('kalah') || lower.startsWith('menunggu') || lower.startsWith('sudut');
    };

    const checkIsAthleteHighlighted = (label, contingentName, entryId, contingentId) => {
        if (isPlaceholder(label)) return false;
        const normalizedLabel = (label || '').trim().toLowerCase();
        if (highlightAthleteNames?.length && highlightAthleteNames.some((n) => (n || '').trim().toLowerCase() === normalizedLabel)) {
            return true;
        }
        if (highlightEntryIds?.length && entryId && highlightEntryIds.map(String).includes(String(entryId))) {
            return true;
        }
        if (highlightContingentId && contingentId && String(contingentId) === String(highlightContingentId)) {
            return true;
        }
        if (highlightContingentName && contingentName && contingentName.trim().toLowerCase() === highlightContingentName.trim().toLowerCase()) {
            return true;
        }
        return false;
    };

    const isAkaHighlighted = checkIsAthleteHighlighted(
        akaLabel,
        akaContingent,
        match.red_entry_id || match.metadata?.red?.entry_id,
        match.aka_contingent_id || match.metadata?.red?.contingent_id
    );

    const isShiroHighlighted = checkIsAthleteHighlighted(
        shiroLabel,
        shiroContingent,
        match.blue_entry_id || match.metadata?.blue?.entry_id,
        match.shiro_contingent_id || match.metadata?.blue?.contingent_id
    );

    const hasHighlightedAthlete = isAkaHighlighted || isShiroHighlighted;

    return (
        <div className={`relative flex flex-col justify-center shrink-0 group ${className || 'my-2.5 w-76'}`}>
            {/* Main Match Container */}
            <div
                className={`overflow-hidden rounded-xl border transition-all duration-200 shadow-xs hover:shadow-md ${
                    isActive
                        ? 'border-blue-500 dark:border-blue-400 bg-blue-50/40 dark:bg-blue-950/40 ring-4 ring-blue-500/20'
                        : hasHighlightedAthlete
                        ? 'border-amber-400 dark:border-amber-500 bg-white dark:bg-[#1c1917] ring-2 ring-amber-400/50 shadow-md shadow-amber-200/40 dark:shadow-amber-950/50'
                        : match.is_bye
                        ? 'border-dashed border-[#d8d1c8] dark:border-white/15 bg-[#faf8f5]/80 dark:bg-white/[.02]'
                        : isCompleted
                        ? 'border-[#d4c8b8] dark:border-white/20 bg-white dark:bg-[#1c1917] hover:border-[#b8872d]'
                        : match.status === 'in_progress'
                        ? 'border-purple-400 dark:border-purple-500 bg-purple-50/20 dark:bg-purple-950/30 ring-2 ring-purple-300'
                        : match.is_ready
                        ? 'border-[#e0d6c8] dark:border-white/15 bg-white dark:bg-[#1c1917] hover:border-[#c0392b]'
                        : 'border-[#ede7df] dark:border-white/10 bg-[#faf8f5]/60 dark:bg-white/[.02]'
                }`}
            >
                {/* Match Header Bar */}
                <div className="flex items-center justify-between border-b border-[#eee7dd] dark:border-white/10 bg-[#f8f5f0] dark:bg-white/5 px-3 py-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-[#17120f] dark:text-white">
                        <span className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-black ${
                            hasHighlightedAthlete
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-[#17120f] dark:bg-white text-[#f0c060] dark:text-slate-900'
                        }`}>
                            #{match.sequence}
                        </span>
                        <span className="text-[10px] text-[#7a746e] dark:text-white/60">
                            {match.court || 'Court —'}
                        </span>
                        {hasHighlightedAthlete && (
                            <span className="ml-1 inline-flex items-center gap-1 rounded bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.5 text-[9px] font-black text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60">
                                <i className="fa-solid fa-star text-[7.5px] text-amber-600" /> Kontingen Anda
                            </span>
                        )}
                    </div>
                    <div>{getStatusBadge(match, isMonitor)}</div>
                </div>

                {/* Opponents Container */}
                <div className="divide-y divide-[#eee7dd] dark:divide-white/10 text-xs">
                    {/* AKA (Sudut Merah) */}
                    <div
                        className={`flex items-center justify-between gap-2 px-3 py-2 transition-colors ${
                            isAkaHighlighted
                                ? isAkaWinner
                                    ? 'bg-amber-100 dark:bg-amber-950/80 border-l-4 border-amber-500 font-black text-amber-950 dark:text-amber-100 ring-2 ring-inset ring-amber-400/80'
                                    : 'bg-amber-50/90 dark:bg-amber-950/50 border-l-4 border-amber-400 font-extrabold text-amber-950 dark:text-amber-100 ring-1 ring-inset ring-amber-300/60'
                                : isAkaWinner
                                ? 'bg-rose-50/90 dark:bg-rose-950/40 font-bold text-rose-950 dark:text-rose-200'
                                : match.is_bye && akaLabel?.toUpperCase() === 'BYE'
                                ? 'bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-white/30 italic'
                                : 'bg-white dark:bg-[#1c1917] text-[#17120f] dark:text-white'
                        }`}
                    >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`shrink-0 self-start mt-0.5 rounded px-1.5 py-0.5 text-[9px] font-black shadow-2xs ${
                                isAkaHighlighted
                                    ? 'bg-amber-500 text-slate-950 font-black'
                                    : 'bg-rose-600 text-white'
                            }`}>
                                AKA
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className={`truncate text-xs ${isAkaHighlighted ? 'font-black' : 'font-semibold'}`} title={akaLabel || 'Menunggu peserta'}>
                                        {akaLabel || 'Menunggu peserta'}
                                    </span>
                                    {isAkaHighlighted && (
                                        <span className="shrink-0 inline-flex items-center gap-1 rounded bg-amber-400 text-slate-950 px-1.5 py-0.2 text-[8.5px] font-black uppercase tracking-wider shadow-2xs">
                                            <i className="fa-solid fa-star text-[7px]" /> Atlet Anda
                                        </span>
                                    )}
                                    {isAkaWinner && (
                                        <i className="fa-solid fa-crown text-amber-500 text-[11px] shrink-0" title="Pemenang" />
                                    )}
                                </div>
                                {akaContingent && !isPlaceholder(akaLabel) && (
                                    <p className={`truncate text-[11px] leading-tight mt-0.5 ${
                                        isAkaHighlighted
                                            ? 'font-bold text-amber-900 dark:text-amber-200'
                                            : 'font-medium text-[#625b54] dark:text-white/70'
                                    }`} title={akaContingent}>
                                        {akaContingent}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="shrink-0 font-mono font-bold text-xs sm:text-sm pl-1">
                            {match.score ? (
                                <span className={isAkaHighlighted ? 'text-amber-950 dark:text-amber-200 font-black' : isAkaWinner ? 'text-rose-700 dark:text-rose-400 font-black' : 'text-[#7a746e] dark:text-white/50'}>
                                    {match.score.aka_total}
                                </span>
                            ) : match.is_bye && isAkaWinner ? (
                                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">BYE</span>
                            ) : (
                                <span className="text-[#a8a199] dark:text-white/30">—</span>
                            )}
                        </div>
                    </div>

                    {/* SHIRO (Sudut Putih) */}
                    <div
                        className={`flex items-center justify-between gap-2 px-3 py-2 transition-colors ${
                            isShiroHighlighted
                                ? isShiroWinner
                                    ? 'bg-amber-100 dark:bg-amber-950/80 border-l-4 border-amber-500 font-black text-amber-950 dark:text-amber-100 ring-2 ring-inset ring-amber-400/80'
                                    : 'bg-amber-50/90 dark:bg-amber-950/50 border-l-4 border-amber-400 font-extrabold text-amber-950 dark:text-amber-100 ring-1 ring-inset ring-amber-300/60'
                                : isShiroWinner
                                ? 'bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-950 dark:text-white'
                                : match.is_bye && shiroLabel?.toUpperCase() === 'BYE'
                                ? 'bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-white/30 italic'
                                : 'bg-white dark:bg-[#1c1917] text-[#17120f] dark:text-white'
                        }`}
                    >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`shrink-0 self-start mt-0.5 rounded px-1.5 py-0.5 text-[9px] font-black shadow-2xs ${
                                isShiroHighlighted
                                    ? 'bg-amber-500 text-slate-950 font-black'
                                    : 'bg-slate-700 dark:bg-slate-300 text-white dark:text-slate-900'
                            }`}>
                                SHIRO
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className={`truncate text-xs ${isShiroHighlighted ? 'font-black' : 'font-semibold'}`} title={shiroLabel || 'Menunggu peserta'}>
                                        {shiroLabel || 'Menunggu peserta'}
                                    </span>
                                    {isShiroHighlighted && (
                                        <span className="shrink-0 inline-flex items-center gap-1 rounded bg-amber-400 text-slate-950 px-1.5 py-0.2 text-[8.5px] font-black uppercase tracking-wider shadow-2xs">
                                            <i className="fa-solid fa-star text-[7px]" /> Atlet Anda
                                        </span>
                                    )}
                                    {isShiroWinner && (
                                        <i className="fa-solid fa-crown text-amber-500 text-[11px] shrink-0" title="Pemenang" />
                                    )}
                                </div>
                                {shiroContingent && !isPlaceholder(shiroLabel) && (
                                    <p className={`truncate text-[11px] leading-tight mt-0.5 ${
                                        isShiroHighlighted
                                            ? 'font-bold text-amber-900 dark:text-amber-200'
                                            : 'font-medium text-[#625b54] dark:text-white/70'
                                    }`} title={shiroContingent}>
                                        {shiroContingent}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="shrink-0 font-mono font-bold text-xs sm:text-sm pl-1">
                            {match.score ? (
                                <span className={isShiroHighlighted ? 'text-amber-950 dark:text-amber-200 font-black' : isShiroWinner ? 'text-slate-900 dark:text-white font-black' : 'text-[#7a746e] dark:text-white/50'}>
                                    {match.score.shiro_total}
                                </span>
                            ) : match.is_bye && isShiroWinner ? (
                                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">BYE</span>
                            ) : (
                                <span className="text-[#a8a199] dark:text-white/30">—</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Match Footer & Action Link */}
                <div className="flex items-center justify-between bg-[#fbfaf8] dark:bg-white/[.04] px-3 py-1.5 border-t border-[#eee7dd] dark:border-white/10 text-[10px] text-[#7a746e] dark:text-white/60">
                    <span className="truncate">
                        {scheduledTime ? (
                            <>
                                <i className="fa-regular fa-clock mr-1" />
                                {scheduledTime}
                            </>
                        ) : (
                            'Jadwal fleksibel'
                        )}
                    </span>
                    {!isMonitor && canManage && match.is_ready && !match.is_bye && !isGf2Skipped ? (
                        <Link
                            href={`/admin/panitera/scoring/matches/${match.id}?event_id=${encodeURIComponent(activeEvent?.id || '')}`}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold transition-all shadow-2xs ${
                                match.score
                                    ? 'bg-[#17120f] dark:bg-white text-[#f0c060] dark:text-slate-950 hover:bg-black'
                                    : 'bg-[#c0392b] text-white hover:bg-[#a82718]'
                            }`}
                        >
                            <span>{match.score ? 'Lihat Hasil' : 'Buka & Nilai'}</span>
                            <i className="fa-solid fa-chevron-right text-[8px]" />
                        </Link>
                    ) : isGf2Skipped ? (
                        <span className="text-[10px] italic text-[#9a9187] dark:text-white/50 font-medium">
                            Tidak diperlukan (WB menang GF)
                        </span>
                    ) : match.is_bye ? (
                        <span className="text-[10px] italic text-[#9a9187] dark:text-white/40">Lolos otomatis</span>
                    ) : (
                        <span className="text-[10px] text-[#a8a199] dark:text-white/40">
                            {isCompleted ? 'Selesai' : match.is_ready ? 'Siap tanding' : 'Menunggu bagan'}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// Single Round Column inside Bracket
function BracketRoundColumn({
    roundName,
    matches,
    activeEvent,
    canManage = false,
    isMonitor = false,
    activeMatchId = null,
    isFirstRound = false,
    isLastRound = false,
    highlightContingentId = null,
    highlightContingentName = null,
    highlightEntryIds = [],
    highlightAthleteNames = [],
}) {
    return (
        <div className="flex flex-col items-center shrink-0 w-80">
            {/* Round Column Header */}
            <div className="w-full mb-3 pb-2 border-b border-[#e5ded4] dark:border-white/10 text-center">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9a6b20] dark:text-amber-400">
                    {isLastRound ? 'Babak Puncak' : isFirstRound ? 'Babak Awal' : 'Babak Lanjutan'}
                </p>
                <h3 className="mt-0.5 text-sm font-bold text-[#17120f] dark:text-white">{roundName}</h3>
                <span className="mt-1 inline-block rounded-full bg-[#f4eee6] dark:bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-[#7a746e] dark:text-white/60">
                    {matches.length} partai
                </span>
            </div>

            {/* Matches Container */}
            <div className="w-full flex-1 flex flex-col justify-around py-2">
                {matches.map((match) => (
                    <BracketMatchCard
                        key={match.id}
                        match={match}
                        activeEvent={activeEvent}
                        canManage={canManage}
                        isMonitor={isMonitor}
                        isActive={activeMatchId && String(match.id) === String(activeMatchId)}
                        highlightContingentId={highlightContingentId}
                        highlightContingentName={highlightContingentName}
                        highlightEntryIds={highlightEntryIds}
                        highlightAthleteNames={highlightAthleteNames}
                    />
                ))}
            </div>
        </div>
    );
}

// Winner Podium / Champion Display at the end of the bracket
function BracketChampionPodium({
    matches,
    isMonitor = false,
    className = '',
    highlightContingentId = null,
    highlightContingentName = null,
    highlightEntryIds = [],
    highlightAthleteNames = [],
}) {
    const finalMatch =
        matches.find((m) => m.phase === 'final' || m.round_label?.toLowerCase().includes('final')) ||
        matches[matches.length - 1];
    if (!finalMatch || !finalMatch.score) return null;

    const winnerCorner = finalMatch.score.winner_corner;
    const championName =
        winnerCorner === 'aka' ? finalMatch.aka_label : winnerCorner === 'shiro' ? finalMatch.shiro_label : null;
    const runnerUpName =
        winnerCorner === 'aka' ? finalMatch.shiro_label : winnerCorner === 'shiro' ? finalMatch.aka_label : null;

    const championContingent =
        winnerCorner === 'aka'
            ? finalMatch.aka_contingent || finalMatch.red_contingent || finalMatch.metadata?.red?.contingent_name
            : winnerCorner === 'shiro'
            ? finalMatch.shiro_contingent || finalMatch.blue_contingent || finalMatch.metadata?.blue?.contingent_name
            : null;

    const runnerUpContingent =
        winnerCorner === 'aka'
            ? finalMatch.shiro_contingent || finalMatch.blue_contingent || finalMatch.metadata?.blue?.contingent_name
            : winnerCorner === 'shiro'
            ? finalMatch.aka_contingent || finalMatch.red_contingent || finalMatch.metadata?.red?.contingent_name
            : null;

    if (!championName) return null;

    const isChampionHighlighted = Boolean(
        championName && (
            (highlightAthleteNames?.length && highlightAthleteNames.some((n) => (n || '').trim().toLowerCase() === (championName || '').trim().toLowerCase())) ||
            (highlightContingentName && championContingent && championContingent.trim().toLowerCase() === highlightContingentName.trim().toLowerCase())
        )
    );

    return (
        <div className={`flex flex-col items-center justify-center shrink-0 my-auto self-center ${className || 'w-72 ml-4'}`}>
            <div className={`w-full rounded-2xl border-2 p-5 text-center shadow-lg ${
                isChampionHighlighted
                    ? 'border-amber-400 bg-gradient-to-b from-amber-100 dark:from-amber-950/70 to-amber-200/60 dark:to-amber-950/40 ring-4 ring-amber-400/30'
                    : 'border-amber-300 dark:border-amber-500/40 bg-gradient-to-b from-amber-50 dark:from-amber-950/40 to-amber-100/60 dark:to-amber-950/20'
            }`}>
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#17120f] dark:bg-amber-400 text-amber-400 dark:text-slate-950 shadow-md ring-4 ring-amber-400/20">
                    <i className="fa-solid fa-trophy text-2xl" />
                </span>
                <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-[#9a6b20] dark:text-amber-300">
                    Juara 1 · Medali Emas
                </p>
                <h4 className="mt-1.5 text-base font-black text-[#17120f] dark:text-white leading-snug break-words">
                    {championName}
                </h4>
                {championContingent && (
                    <p className="mt-0.5 text-xs font-semibold text-[#7a746e] dark:text-white/70">
                        {championContingent}
                    </p>
                )}

                {isChampionHighlighted && (
                    <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-amber-400 text-slate-950 px-3 py-1 text-[10.5px] font-black shadow-xs">
                        <i className="fa-solid fa-crown text-[10px]" />
                        <span>Juara dari Kontingen Anda!</span>
                    </div>
                )}

                {runnerUpName && (
                    <div className="mt-4 pt-3 border-t border-amber-200/80 dark:border-amber-800/40 text-[11px]">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
                            Juara 2 · Medali Perak
                        </p>
                        <p className="mt-0.5 font-bold text-slate-800 dark:text-white/80 break-words">{runnerUpName}</p>
                        {runnerUpContingent && (
                            <p className="mt-0.5 text-[10.5px] font-normal text-slate-500 dark:text-white/60">
                                {runnerUpContingent}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function RandoriBracketTree({
    matches = [],
    activeEvent = null,
    categoryName = '',
    categoryFormat = 'single_elimination',
    canManage = false,
    isMonitor = false,
    activeMatchId = null,
    highlightContingentId = null,
    highlightContingentName = null,
    highlightEntryIds = [],
    highlightAthleteNames = [],
}) {
    const [doubleElimTab, setDoubleElimTab] = useState('all'); // 'all' | 'upper' | 'lower'
    const scrollContainerRef = useRef(null);

    const isDoubleElim =
        categoryFormat === 'double_elimination' ||
        matches.some((m) => m.round_label?.toLowerCase().includes('upper') || m.round_label?.toLowerCase().includes('lower'));

    const isRoundRobin =
        categoryFormat === 'round_robin' ||
        matches.some((m) => m.round_label?.toLowerCase().includes('putaran'));

    // Group matches by round for generic bracket view
    const matchesByRound = useMemo(() => {
        return matches.reduce((groups, match) => {
            const key = match.round_label || 'Penyisihan';
            if (!groups[key]) groups[key] = [];
            groups[key].push(match);
            return groups;
        }, {});
    }, [matches]);

    // Double Elimination specific sub-groups
    const upperRound1 = useMemo(
        () => matches.filter((m) => m.round_label === 'Upper Bracket' || (m.round_label?.toLowerCase().includes('upper') && !m.round_label?.toLowerCase().includes('final'))),
        [matches]
    );
    const upperFinalMatches = useMemo(
        () => matches.filter((m) => m.round_label?.toLowerCase().includes('upper') && m.round_label?.toLowerCase().includes('final')),
        [matches]
    );

    const lowerRound1 = useMemo(
        () => matches.filter((m) => m.round_label?.toLowerCase().includes('lower') && !m.round_label?.toLowerCase().includes('final')),
        [matches]
    );
    const lowerFinalMatches = useMemo(
        () => matches.filter((m) => m.round_label?.toLowerCase().includes('lower') && m.round_label?.toLowerCase().includes('final')),
        [matches]
    );

    const grandFinalMatches = useMemo(
        () => matches.filter((m) => m.round_label?.toLowerCase().includes('grand final') || m.phase === 'final'),
        [matches]
    );

    // Round Robin live standings
    const roundRobinStandings = useMemo(() => {
        if (!isRoundRobin) return [];

        const standings = {};
        matches.forEach((m) => {
            const red = m.aka_label || m.red_label;
            const blue = m.shiro_label || m.blue_label;
            const redContingent = m.aka_contingent || m.red_contingent || m.metadata?.red?.contingent_name;
            const blueContingent = m.shiro_contingent || m.blue_contingent || m.metadata?.blue?.contingent_name;

            if (red && !standings[red]) {
                standings[red] = { name: red, contingent: redContingent, played: 0, won: 0, lost: 0, points: 0 };
            }
            if (blue && !standings[blue]) {
                standings[blue] = { name: blue, contingent: blueContingent, played: 0, won: 0, lost: 0, points: 0 };
            }

            if (m.score) {
                const akaWins = m.score.winner_corner === 'aka';
                const shiroWins = m.score.winner_corner === 'shiro';

                if (red && standings[red]) {
                    standings[red].played += 1;
                    if (akaWins) standings[red].won += 1;
                    else if (shiroWins) standings[red].lost += 1;
                    standings[red].points += (Number(m.score.aka_total) || 0);
                }
                if (blue && standings[blue]) {
                    standings[blue].played += 1;
                    if (shiroWins) standings[blue].won += 1;
                    else if (akaWins) standings[blue].lost += 1;
                    standings[blue].points += (Number(m.score.shiro_total) || 0);
                }
            }
        });

        return Object.values(standings).sort((a, b) => {
            if (b.won !== a.won) return b.won - a.won;
            return b.points - a.points;
        });
    }, [matches, isRoundRobin]);

    // Scroll controls for horizontal bracket navigation
    const scrollBracket = (direction) => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -350 : 350,
                behavior: 'smooth',
            });
        }
    };

    if (!matches || matches.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-[#d9d3c9] dark:border-white/10 bg-white dark:bg-[#151210] p-10 text-center text-sm text-[#7a746e] dark:text-white/50">
                <i className="fa-solid fa-sitemap text-3xl mb-2 text-slate-400" />
                <p className="font-semibold">Bagan pertandingan Randori belum digenerate untuk nomor ini.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header / Sub-nav bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
                <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 text-white font-black text-xs shadow-2xs">
                        <i className={`fa-solid ${isRoundRobin ? 'fa-arrows-rotate' : 'fa-sitemap'}`} />
                    </span>
                    <div>
                        <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                            Bagan Pertandingan {categoryName ? `· ${categoryName}` : ''}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-white/60">
                            {isRoundRobin
                                ? 'Setengah Kompetisi (Round Robin)'
                                : isDoubleElim
                                ? 'Sistem Gugur Ganda (Double Elimination)'
                                : 'Sistem Gugur Tunggal (Single Elimination)'} · {matches.length} Total Partai
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Double elimination tab selector */}
                    {isDoubleElim && (
                        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-white/10 p-1 text-xs">
                            <button
                                type="button"
                                onClick={() => setDoubleElimTab('all')}
                                className={`rounded-lg px-2.5 py-1 font-bold transition ${
                                    doubleElimTab === 'all'
                                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                        : 'text-slate-600 dark:text-white/60 hover:text-slate-900'
                                }`}
                            >
                                Semua (Atas & Bawah)
                            </button>
                            <button
                                type="button"
                                onClick={() => setDoubleElimTab('upper')}
                                className={`rounded-lg px-2.5 py-1 font-bold transition ${
                                    doubleElimTab === 'upper'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'text-slate-600 dark:text-white/60 hover:text-slate-900'
                                }`}
                            >
                                Upper
                            </button>
                            <button
                                type="button"
                                onClick={() => setDoubleElimTab('lower')}
                                className={`rounded-lg px-2.5 py-1 font-bold transition ${
                                    doubleElimTab === 'lower'
                                        ? 'bg-amber-600 text-white shadow-xs'
                                        : 'text-slate-600 dark:text-white/60 hover:text-slate-900'
                                }`}
                            >
                                Lower
                            </button>
                        </div>
                    )}

                    {/* Scroll buttons */}
                    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-1 shadow-2xs">
                        <button
                            type="button"
                            onClick={() => scrollBracket('left')}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 transition"
                            title="Geser Kiri"
                        >
                            <i className="fa-solid fa-chevron-left text-xs" />
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollBracket('right')}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 transition"
                            title="Geser Kanan"
                        >
                            <i className="fa-solid fa-chevron-right text-xs" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Round Robin Standings Table if Round Robin format */}
            {isRoundRobin && roundRobinStandings.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-gradient-to-r from-amber-50/50 via-white dark:via-[#1c1917] to-amber-50/30 dark:to-transparent p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-amber-200 dark:border-amber-900/40">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-600 text-white text-[11px] font-bold">
                            <i className="fa-solid fa-ranking-star" />
                        </span>
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-300">
                                Klasemen Sementara Setengah Kompetisi
                            </h4>
                            <p className="text-[10px] text-amber-700 dark:text-amber-400">
                                Peringkat juara dihitung dari jumlah partai yang dimenangkan dan akumulasi total poin
                            </p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-[#e5ded4] dark:border-white/10 text-[10px] font-black uppercase text-[#7a746e] dark:text-white/50">
                                    <th className="py-2 px-3">Peringkat</th>
                                    <th className="py-2 px-3">Nama Atlet</th>
                                    <th className="py-2 px-3 text-center">Main</th>
                                    <th className="py-2 px-3 text-center">Menang</th>
                                    <th className="py-2 px-3 text-center">Kalah</th>
                                    <th className="py-2 px-3 text-right">Total Poin</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#eee7dd] dark:divide-white/10">
                                {roundRobinStandings.map((row, idx) => {
                                    const isRowHighlighted = Boolean(
                                        (highlightAthleteNames?.length && highlightAthleteNames.some((n) => (n || '').trim().toLowerCase() === (row.name || '').trim().toLowerCase())) ||
                                        (highlightContingentName && row.contingent && row.contingent.trim().toLowerCase() === highlightContingentName.trim().toLowerCase())
                                    );

                                    return (
                                        <tr key={row.name} className={isRowHighlighted ? 'bg-amber-100/90 dark:bg-amber-950/70 border-l-4 border-amber-500 font-bold' : 'hover:bg-amber-50/40 dark:hover:bg-white/5'}>
                                            <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                                                {idx === 0 ? (
                                                    <span className="inline-flex items-center gap-1 text-amber-600 font-black">
                                                        <i className="fa-solid fa-medal" /> #1
                                                    </span>
                                                ) : idx === 1 ? (
                                                    <span className="inline-flex items-center gap-1 text-slate-500 font-black">
                                                        <i className="fa-solid fa-medal" /> #2
                                                    </span>
                                                ) : idx === 2 ? (
                                                    <span className="inline-flex items-center gap-1 text-amber-800 font-black">
                                                        <i className="fa-solid fa-medal" /> #3
                                                    </span>
                                                ) : (
                                                    `#${idx + 1}`
                                                )}
                                            </td>
                                            <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={isRowHighlighted ? 'font-black text-amber-950 dark:text-amber-100' : ''}>{row.name}</span>
                                                    {isRowHighlighted && (
                                                        <span className="shrink-0 rounded bg-amber-400 text-slate-950 px-1.5 py-0.2 text-[8.5px] font-black uppercase tracking-wider">
                                                            Atlet Anda
                                                        </span>
                                                    )}
                                                </div>
                                                {row.contingent && (
                                                    <div className={`text-[10px] ${isRowHighlighted ? 'font-bold text-amber-900 dark:text-amber-200' : 'font-normal text-slate-500 dark:text-white/50'}`}>{row.contingent}</div>
                                                )}
                                            </td>
                                            <td className="py-2 px-3 text-center font-mono">{row.played}</td>
                                            <td className="py-2 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                {row.won}
                                            </td>
                                            <td className="py-2 px-3 text-center font-mono text-slate-500">
                                                {row.lost}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                                {row.points}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Bracket Canvas with Horizontal Scroll */}
            <div className="overflow-hidden rounded-2xl border border-[#e5ded4] dark:border-white/10 bg-white dark:bg-[#151210] shadow-sm">
                <div
                    ref={scrollContainerRef}
                    tabIndex={0}
                    aria-label={`Bagan Randori ${categoryName}, geser horizontal untuk melihat alur babak`}
                    className="overflow-x-auto p-6 scrollbar-thin scrollbar-thumb-amber-300 dark:scrollbar-thumb-amber-600 scrollbar-track-stone-100 dark:scrollbar-track-stone-900 bg-gradient-to-r from-stone-50/50 dark:from-black/20 via-white dark:via-[#151210] to-stone-50/50 dark:to-black/20"
                >
                    {/* DOUBLE ELIMINATION VIEW: UPPER ON TOP, LOWER ON BOTTOM */}
                    {isDoubleElim && doubleElimTab === 'all' ? (
                        <div className="flex items-start gap-8 min-w-max pb-4">
                            {/* Left Column: Upper Bracket on Top, Lower Bracket directly below */}
                            <div className="flex flex-col gap-6">
                                {/* 1. UPPER BRACKET (BAGAN PEMENANG) */}
                                <div className="rounded-2xl border border-blue-200/90 dark:border-blue-900/50 bg-gradient-to-r from-blue-50/50 via-white dark:via-blue-950/15 to-blue-50/20 dark:to-transparent p-5 shadow-xs">
                                    <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-blue-200/70 dark:border-blue-900/40">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-600 text-white text-xs font-black shadow-xs">
                                                <i className="fa-solid fa-sitemap" />
                                            </span>
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-wider text-blue-950 dark:text-blue-300">
                                                    Bagan Pemenang (Upper Bracket)
                                                </h4>
                                                <p className="text-[10px] text-blue-700/80 dark:text-blue-400/80">
                                                    Pemenang babak awal melaju ke Final Upper Bracket. Atlet yang kalah turun ke Lower Bracket.
                                                </p>
                                            </div>
                                        </div>
                                        <span className="rounded-full bg-blue-100 dark:bg-blue-950 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 dark:text-blue-300">
                                            Jalur Utama
                                        </span>
                                    </div>

                                    <div className="flex items-stretch gap-6">
                                        <BracketRoundColumn
                                            roundName="Upper Bracket · Babak 1"
                                            matches={upperRound1}
                                            activeEvent={activeEvent}
                                            canManage={canManage}
                                            isMonitor={isMonitor}
                                            activeMatchId={activeMatchId}
                                            isFirstRound={true}
                                            highlightContingentId={highlightContingentId}
                                            highlightContingentName={highlightContingentName}
                                            highlightEntryIds={highlightEntryIds}
                                            highlightAthleteNames={highlightAthleteNames}
                                        />

                                        <div className="flex flex-col items-center justify-center text-blue-300 dark:text-blue-700">
                                            <i className="fa-solid fa-arrow-right text-lg" />
                                            <span className="text-[9px] font-bold mt-1 uppercase tracking-wider text-blue-500">Lolos</span>
                                        </div>

                                        <BracketRoundColumn
                                            roundName="Final Upper Bracket"
                                            matches={upperFinalMatches}
                                            activeEvent={activeEvent}
                                            canManage={canManage}
                                            isMonitor={isMonitor}
                                            activeMatchId={activeMatchId}
                                            isLastRound={true}
                                            highlightContingentId={highlightContingentId}
                                            highlightContingentName={highlightContingentName}
                                            highlightEntryIds={highlightEntryIds}
                                            highlightAthleteNames={highlightAthleteNames}
                                        />
                                    </div>
                                </div>

                                {/* 2. LOWER BRACKET (BAGAN HARAPAN) */}
                                <div className="rounded-2xl border border-amber-200/90 dark:border-amber-900/50 bg-gradient-to-r from-amber-50/50 via-white dark:via-amber-950/15 to-amber-50/20 dark:to-transparent p-5 shadow-xs">
                                    <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-amber-200/70 dark:border-amber-900/40">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-600 text-white text-xs font-black shadow-xs">
                                                <i className="fa-solid fa-arrow-rotate-left" />
                                            </span>
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-300">
                                                    Bagan Harapan (Lower Bracket)
                                                </h4>
                                                <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80">
                                                    Kesempatan kedua bagi atlet yang gugur dari Upper Bracket. Pemenang melaju ke Grand Final.
                                                </p>
                                            </div>
                                        </div>
                                        <span className="rounded-full bg-amber-100 dark:bg-amber-950 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                                            Jalur Harapan
                                        </span>
                                    </div>

                                    <div className="flex items-stretch gap-6">
                                        <BracketRoundColumn
                                            roundName="Lower Bracket · Babak 1"
                                            matches={lowerRound1}
                                            activeEvent={activeEvent}
                                            canManage={canManage}
                                            isMonitor={isMonitor}
                                            activeMatchId={activeMatchId}
                                            isFirstRound={true}
                                            highlightContingentId={highlightContingentId}
                                            highlightContingentName={highlightContingentName}
                                            highlightEntryIds={highlightEntryIds}
                                            highlightAthleteNames={highlightAthleteNames}
                                        />

                                        <div className="flex flex-col items-center justify-center text-amber-300 dark:text-amber-700">
                                            <i className="fa-solid fa-arrow-right text-lg" />
                                            <span className="text-[9px] font-bold mt-1 uppercase tracking-wider text-amber-600">Lolos</span>
                                        </div>

                                        <BracketRoundColumn
                                            roundName="Final Lower Bracket"
                                            matches={lowerFinalMatches}
                                            activeEvent={activeEvent}
                                            canManage={canManage}
                                            isMonitor={isMonitor}
                                            activeMatchId={activeMatchId}
                                            isLastRound={true}
                                            highlightContingentId={highlightContingentId}
                                            highlightContingentName={highlightContingentName}
                                            highlightEntryIds={highlightEntryIds}
                                            highlightAthleteNames={highlightAthleteNames}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Arrow indicator converging to Grand Final */}
                            <div className="flex flex-col items-center justify-center text-stone-300 dark:text-white/20 self-center">
                                <i className="fa-solid fa-angles-right text-2xl text-amber-500 animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-wider mt-1 text-stone-500 dark:text-white/50">Finalis</span>
                            </div>

                            {/* Right Column: Grand Final & Podium */}
                            <div className="flex flex-col items-center gap-5 self-center shrink-0">
                                <div className="rounded-2xl border-2 border-amber-400 dark:border-amber-500/50 bg-[#17120f] dark:bg-[#151210] text-white p-4 sm:p-5 shadow-xl w-[350px] max-w-full overflow-hidden">
                                    <div className="flex items-center gap-2.5 mb-3.5 pb-2.5 border-b border-white/15">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-400 text-slate-950 text-xs font-black shadow-xs">
                                            <i className="fa-solid fa-crown" />
                                        </span>
                                        <div>
                                            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                                                Babak Puncak · Grand Final
                                            </h4>
                                            <p className="text-[10px] text-white/60">
                                                Juara Upper vs Juara Lower
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3.5 w-full">
                                        {grandFinalMatches.map((match) => (
                                            <BracketMatchCard
                                                key={match.id}
                                                match={match}
                                                activeEvent={activeEvent}
                                                canManage={canManage}
                                                isMonitor={isMonitor}
                                                isActive={activeMatchId && String(match.id) === String(activeMatchId)}
                                                className="w-full my-0"
                                                highlightContingentId={highlightContingentId}
                                                highlightContingentName={highlightContingentName}
                                                highlightEntryIds={highlightEntryIds}
                                                highlightAthleteNames={highlightAthleteNames}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <BracketChampionPodium
                                    matches={matches}
                                    isMonitor={isMonitor}
                                    className="w-[350px] max-w-full ml-0"
                                    highlightContingentId={highlightContingentId}
                                    highlightContingentName={highlightContingentName}
                                    highlightEntryIds={highlightEntryIds}
                                    highlightAthleteNames={highlightAthleteNames}
                                />
                            </div>
                        </div>
                    ) : isDoubleElim && doubleElimTab === 'upper' ? (
                        <div className="flex items-stretch gap-8 min-w-max pb-4">
                            <BracketRoundColumn
                                roundName="Upper Bracket · Babak 1"
                                matches={upperRound1}
                                activeEvent={activeEvent}
                                canManage={canManage}
                                isMonitor={isMonitor}
                                activeMatchId={activeMatchId}
                                isFirstRound={true}
                                highlightContingentId={highlightContingentId}
                                highlightContingentName={highlightContingentName}
                                highlightEntryIds={highlightEntryIds}
                                highlightAthleteNames={highlightAthleteNames}
                            />
                            <BracketRoundColumn
                                roundName="Final Upper Bracket"
                                matches={upperFinalMatches}
                                activeEvent={activeEvent}
                                canManage={canManage}
                                isMonitor={isMonitor}
                                activeMatchId={activeMatchId}
                                highlightContingentId={highlightContingentId}
                                highlightContingentName={highlightContingentName}
                                highlightEntryIds={highlightEntryIds}
                                highlightAthleteNames={highlightAthleteNames}
                            />
                            <BracketRoundColumn
                                roundName="Grand Final"
                                matches={grandFinalMatches}
                                activeEvent={activeEvent}
                                canManage={canManage}
                                isMonitor={isMonitor}
                                activeMatchId={activeMatchId}
                                isLastRound={true}
                                highlightContingentId={highlightContingentId}
                                highlightContingentName={highlightContingentName}
                                highlightEntryIds={highlightEntryIds}
                                highlightAthleteNames={highlightAthleteNames}
                            />
                            <BracketChampionPodium
                                matches={matches}
                                isMonitor={isMonitor}
                                highlightContingentId={highlightContingentId}
                                highlightContingentName={highlightContingentName}
                                highlightEntryIds={highlightEntryIds}
                                highlightAthleteNames={highlightAthleteNames}
                            />
                        </div>
                    ) : isDoubleElim && doubleElimTab === 'lower' ? (
                        <div className="flex items-stretch gap-8 min-w-max pb-4">
                            <BracketRoundColumn
                                roundName="Lower Bracket · Babak 1"
                                matches={lowerRound1}
                                activeEvent={activeEvent}
                                canManage={canManage}
                                isMonitor={isMonitor}
                                activeMatchId={activeMatchId}
                                isFirstRound={true}
                                highlightContingentId={highlightContingentId}
                                highlightContingentName={highlightContingentName}
                                highlightEntryIds={highlightEntryIds}
                                highlightAthleteNames={highlightAthleteNames}
                            />
                            <BracketRoundColumn
                                roundName="Final Lower Bracket"
                                matches={lowerFinalMatches}
                                activeEvent={activeEvent}
                                canManage={canManage}
                                isMonitor={isMonitor}
                                activeMatchId={activeMatchId}
                                highlightContingentId={highlightContingentId}
                                highlightContingentName={highlightContingentName}
                                highlightEntryIds={highlightEntryIds}
                                highlightAthleteNames={highlightAthleteNames}
                            />
                            <BracketRoundColumn
                                roundName="Grand Final"
                                matches={grandFinalMatches}
                                activeEvent={activeEvent}
                                canManage={canManage}
                                isMonitor={isMonitor}
                                activeMatchId={activeMatchId}
                                isLastRound={true}
                                highlightContingentId={highlightContingentId}
                                highlightContingentName={highlightContingentName}
                                highlightEntryIds={highlightEntryIds}
                                highlightAthleteNames={highlightAthleteNames}
                            />
                            <BracketChampionPodium
                                matches={matches}
                                isMonitor={isMonitor}
                                highlightContingentId={highlightContingentId}
                                highlightContingentName={highlightContingentName}
                                highlightEntryIds={highlightEntryIds}
                                highlightAthleteNames={highlightAthleteNames}
                            />
                        </div>
                    ) : (
                        /* SINGLE ELIMINATION & ROUND ROBIN STANDARD COLUMNS */
                        <div className="flex items-stretch gap-10 min-w-max pb-4">
                            {Object.entries(matchesByRound).map(([roundName, roundMatches], roundIdx, allRounds) => (
                                <BracketRoundColumn
                                    key={roundName}
                                    roundName={roundName}
                                    matches={roundMatches}
                                    activeEvent={activeEvent}
                                    canManage={canManage}
                                    isMonitor={isMonitor}
                                    activeMatchId={activeMatchId}
                                    isFirstRound={roundIdx === 0}
                                    isLastRound={roundIdx === allRounds.length - 1}
                                    highlightContingentId={highlightContingentId}
                                    highlightContingentName={highlightContingentName}
                                    highlightEntryIds={highlightEntryIds}
                                    highlightAthleteNames={highlightAthleteNames}
                                />
                            ))}

                            {/* Champion Podium banner when final is completed */}
                            <BracketChampionPodium
                                matches={matches}
                                isMonitor={isMonitor}
                                highlightContingentId={highlightContingentId}
                                highlightContingentName={highlightContingentName}
                                highlightEntryIds={highlightEntryIds}
                                highlightAthleteNames={highlightAthleteNames}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

