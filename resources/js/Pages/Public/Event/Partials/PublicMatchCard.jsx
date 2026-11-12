import React from 'react';

export function PublicMatchCard({ match, className = '' }) {
    const akaAdvancesByBye = match.is_bye && match.aka?.toUpperCase() !== 'BYE';
    const shiroAdvancesByBye = match.is_bye && match.shiro?.toUpperCase() !== 'BYE';
    const isAkaWinner = match.winner === 'aka' || akaAdvancesByBye;
    const isShiroWinner = match.winner === 'shiro' || shiroAdvancesByBye;
    const isGf2Skipped =
        match.metadata?.gf2_status === 'skipped' ||
        match.metadata?.notes?.includes('dilewati') ||
        (match.is_bye && (match.round_label?.includes('GF2') || match.round_label?.includes('Grand Final Ulang')));

    const isPlaceholderAka = !match.aka || match.aka.toLowerCase().startsWith('pemenang') || match.aka.toLowerCase().startsWith('kalah') || match.aka.toLowerCase().includes('menunggu') || match.aka.trim().toUpperCase() === 'BYE';
    const isPlaceholderShiro = !match.shiro || match.shiro.toLowerCase().startsWith('pemenang') || match.shiro.toLowerCase().startsWith('kalah') || match.shiro.toLowerCase().includes('menunggu') || match.shiro.trim().toUpperCase() === 'BYE';

    const resolveContingent = (contingentDirect, metaCorner) => {
        if (contingentDirect && typeof contingentDirect === 'string') return contingentDirect;
        if (contingentDirect?.name) return contingentDirect.name;
        if (metaCorner?.contingent_name) return metaCorner.contingent_name;
        if (metaCorner?.city) return metaCorner.city;
        if (metaCorner?.contingent && typeof metaCorner.contingent === 'string') return metaCorner.contingent;
        if (metaCorner?.contingent?.name) return metaCorner.contingent.name;
        return '';
    };

    const akaContingent = resolveContingent(match.aka_contingent, match.metadata?.red);
    const shiroContingent = resolveContingent(match.shiro_contingent, match.metadata?.blue);

    return (
        <div
            className={`event-bracket-match ${
                match.is_bye ? 'event-bracket-bye' : ''
            } !bg-white dark:!bg-[#1c1917] !text-stone-900 dark:!text-stone-100 ${className || 'w-72'} shrink-0 rounded-xl border border-stone-200 dark:border-stone-700/80 shadow-md overflow-hidden transition-all`}
        >
            {/* Header: Partai & Court */}
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-700/80 !bg-stone-100 dark:!bg-stone-800/90 px-3 py-1.5 text-[10px] font-bold !text-stone-800 dark:!text-stone-200">
                <span className="flex items-center gap-1.5">
                    <span className="rounded bg-stone-800 dark:bg-white text-white dark:text-stone-900 px-1 py-0.2 text-[9px] font-mono font-black">
                        #{match.sequence}
                    </span>
                    <span>Partai #{match.sequence}</span>
                </span>
                <span className="!text-stone-600 dark:!text-stone-400 font-medium">
                    {match.court || 'Court —'}
                </span>
            </div>

            {/* AKA Competitor */}
            <div
                className={`flex items-center justify-between border-b border-stone-100 dark:border-stone-800/80 px-3 py-2 text-xs transition-colors ${
                    isAkaWinner
                        ? '!bg-emerald-50 dark:!bg-emerald-950/60 !text-emerald-950 dark:!text-emerald-200 font-bold'
                        : match.is_bye && match.aka?.toUpperCase() === 'BYE'
                        ? '!bg-stone-50/60 dark:!bg-stone-900/40 !text-stone-400 italic'
                        : '!bg-white dark:!bg-[#1c1917] !text-stone-900 dark:!text-stone-100'
                }`}
            >
                <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-2">
                    <span className="shrink-0 self-start mt-0.5 rounded bg-rose-600 px-1.5 py-0.5 text-[8.5px] font-black text-white shadow-2xs">
                        AKA
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <span
                                className={`truncate text-xs ${
                                    isAkaWinner
                                        ? 'font-bold !text-emerald-950 dark:!text-emerald-200'
                                        : isPlaceholderAka
                                        ? 'font-medium !text-stone-600 dark:!text-stone-300'
                                        : 'font-semibold !text-stone-900 dark:!text-stone-100'
                                }`}
                                title={match.aka}
                            >
                                {match.aka || 'Menunggu peserta'}
                            </span>
                            {isAkaWinner && (
                                <i className="fa-solid fa-crown text-amber-500 text-[10px] shrink-0" title="Pemenang" />
                            )}
                        </div>
                        {akaContingent && !isPlaceholderAka && (
                            <p className="truncate text-[10.5px] font-normal !text-stone-500 dark:!text-stone-400 leading-tight mt-0.5" title={akaContingent}>
                                {akaContingent}
                            </p>
                        )}
                    </div>
                </div>
                <strong className="shrink-0 font-mono font-bold text-xs !text-stone-900 dark:text-white">
                    {akaAdvancesByBye ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Lolos</span>
                    ) : (
                        match.aka_score ?? '—'
                    )}
                </strong>
            </div>

            {/* SHIRO Competitor */}
            <div
                className={`flex items-center justify-between border-b border-stone-100 dark:border-stone-800/80 px-3 py-2 text-xs transition-colors ${
                    isShiroWinner
                        ? '!bg-emerald-50 dark:!bg-emerald-950/60 !text-emerald-950 dark:!text-emerald-200 font-bold'
                        : match.is_bye && match.shiro?.toUpperCase() === 'BYE'
                        ? '!bg-stone-50/60 dark:!bg-stone-900/40 !text-stone-400 italic'
                        : '!bg-white dark:!bg-[#1c1917] !text-stone-900 dark:!text-stone-100'
                }`}
            >
                <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-2">
                    <span className="shrink-0 self-start mt-0.5 rounded bg-slate-700 dark:bg-slate-600 px-1.5 py-0.5 text-[8.5px] font-black text-white shadow-2xs">
                        SHIRO
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <span
                                className={`truncate text-xs ${
                                    isShiroWinner
                                        ? 'font-bold !text-emerald-950 dark:!text-emerald-200'
                                        : isPlaceholderShiro
                                        ? 'font-medium !text-stone-600 dark:!text-stone-300'
                                        : 'font-semibold !text-stone-900 dark:!text-stone-100'
                                }`}
                                title={match.shiro}
                            >
                                {match.shiro || 'Menunggu peserta'}
                            </span>
                            {isShiroWinner && (
                                <i className="fa-solid fa-crown text-amber-500 text-[10px] shrink-0" title="Pemenang" />
                            )}
                        </div>
                        {shiroContingent && !isPlaceholderShiro && (
                            <p className="truncate text-[10.5px] font-normal !text-stone-500 dark:!text-stone-400 leading-tight mt-0.5" title={shiroContingent}>
                                {shiroContingent}
                            </p>
                        )}
                    </div>
                </div>
                <strong className="shrink-0 font-mono font-bold text-xs !text-stone-900 dark:text-white">
                    {shiroAdvancesByBye ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Lolos</span>
                    ) : (
                        match.shiro_score ?? '—'
                    )}
                </strong>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between !bg-stone-50 dark:!bg-stone-800/60 px-3 py-1.5 text-[10px] !text-stone-600 dark:!text-stone-400 border-t border-stone-100 dark:border-stone-800">
                <span className="truncate">
                    {match.scheduled_at ? (
                        <>
                            <i className="fa-regular fa-clock mr-1 text-[9px]" />
                            {match.scheduled_at}
                        </>
                    ) : (
                        'Jadwal fleksibel'
                    )}
                </span>
                {isGf2Skipped ? (
                    <span className="inline-flex items-center rounded bg-stone-200 dark:bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-stone-700 dark:text-stone-300" title="Tidak diperlukan karena Juara Upper Bracket memenangkan Grand Final">
                        DILEWATI
                    </span>
                ) : match.is_bye ? (
                    <strong className="event-bye-badge">BYE</strong>
                ) : match.status === 'completed' || match.winner ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                        <i className="fa-solid fa-check text-[9px]" /> Selesai
                    </span>
                ) : (
                    <span className="!text-stone-600 dark:!text-stone-300 font-medium">Menunggu</span>
                )}
            </div>
        </div>
    );
}

export function RandoriBracket({ bracket }) {
    if (bracket.format === 'double_elimination') {
        const upperRounds = bracket.rounds.filter((r) => r.name?.toLowerCase().includes('upper'));
        const lowerRounds = bracket.rounds.filter((r) => r.name?.toLowerCase().includes('lower'));
        const grandFinalRounds = bracket.rounds.filter(
            (r) => r.name?.toLowerCase().includes('grand final') || (!r.name?.toLowerCase().includes('upper') && !r.name?.toLowerCase().includes('lower'))
        );

        const gf = grandFinalRounds[grandFinalRounds.length - 1]?.matches?.[0];
        const champion = gf?.winner === 'aka' ? gf.aka : gf?.winner === 'shiro' ? gf.shiro : null;
        const runnerUp = gf?.winner === 'aka' ? gf.shiro : gf?.winner === 'shiro' ? gf.aka : null;

        return (
            <article className="event-bracket">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="event-accent text-xs font-bold uppercase tracking-[.12em]">
                            Bagan Sistem Gugur Ganda (Double Elimination)
                        </p>
                        <h3 className="mt-1">{bracket.category}</h3>
                    </div>
                    <span className="event-match-type">{bracket.status}</span>
                </div>

                <div className="event-bracket-scroll mt-6" tabIndex="0" aria-label={`Bagan Randori ${bracket.category}`}>
                    <div className="flex items-start gap-8 min-w-max pb-4">
                        {/* Left Column: Upper Bracket on top, Lower Bracket directly below */}
                        <div className="flex flex-col gap-6">
                            {/* UPPER BRACKET */}
                            <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 p-4">
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-200 dark:border-blue-900/50">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-bold">
                                        <i className="fa-solid fa-sitemap" />
                                    </span>
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-950 dark:text-blue-300">
                                            Bagan Pemenang (Upper Bracket)
                                        </h4>
                                        <p className="text-[10px] text-blue-700/80 dark:text-blue-400/80">
                                            Pemenang melaju ke Final Upper; yang kalah turun ke Lower Bracket
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-6">
                                    {upperRounds.map((round) => (
                                        <div key={round.name} className="flex flex-col gap-3 min-w-[260px]">
                                            <p className="text-[11px] font-bold uppercase text-blue-900 dark:text-blue-200">{round.name}</p>
                                            <div className="space-y-3">
                                                {round.matches.map((match) => (
                                                    <PublicMatchCard key={match.id} match={match} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* LOWER BRACKET */}
                            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 p-4">
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-amber-200 dark:border-amber-900/50">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-600 text-white text-xs font-bold">
                                        <i className="fa-solid fa-arrow-rotate-left" />
                                    </span>
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950 dark:text-amber-300">
                                            Bagan Harapan (Lower Bracket)
                                        </h4>
                                        <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80">
                                            Kesempatan kedua bagi atlet yang kalah dari Upper Bracket
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-6">
                                    {lowerRounds.map((round) => (
                                        <div key={round.name} className="flex flex-col gap-3 min-w-[260px]">
                                            <p className="text-[11px] font-bold uppercase text-amber-900 dark:text-amber-200">{round.name}</p>
                                            <div className="space-y-3">
                                                {round.matches.map((match) => (
                                                    <PublicMatchCard key={match.id} match={match} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Grand Final on Right */}
                        <div className="rounded-2xl border border-stone-800 bg-gradient-to-b from-stone-900 to-black text-white p-4 sm:p-5 shrink-0 self-center shadow-xl w-[340px] max-w-full overflow-hidden">
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-stone-900 text-xs font-black">
                                    <i className="fa-solid fa-crown" />
                                </span>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                                        Grand Final Penentuan
                                    </h4>
                                    <p className="text-[10px] text-stone-400">
                                        Juara Upper vs Juara Lower
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-4 w-full">
                                {grandFinalRounds.flatMap((r) => r.matches).map((match) => (
                                    <PublicMatchCard key={match.id} match={match} className="w-full" />
                                ))}
                            </div>
                            {champion && (
                                <div className="mt-4 pt-3 border-t border-amber-400/30 text-center">
                                    <i className="fa-solid fa-trophy text-amber-400 text-xl mb-1" />
                                    <p className="text-[9px] uppercase tracking-widest text-amber-300 font-black">Juara 1 · Medali Emas</p>
                                    <p className="text-sm font-bold text-white mt-0.5">{champion}</p>
                                    {runnerUp && (
                                        <p className="text-xs text-stone-400 mt-1">Juara 2: {runnerUp}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </article>
        );
    }

    if (bracket.format === 'round_robin') {
        const allMatches = bracket.rounds.flatMap((r) => r.matches);
        const standingsMap = {};
        allMatches.forEach((m) => {
            if (m.aka && m.aka !== 'Menunggu peserta') {
                if (!standingsMap[m.aka]) standingsMap[m.aka] = { name: m.aka, played: 0, won: 0, lost: 0, points: 0 };
            }
            if (m.shiro && m.shiro !== 'Menunggu peserta') {
                if (!standingsMap[m.shiro]) standingsMap[m.shiro] = { name: m.shiro, played: 0, won: 0, lost: 0, points: 0 };
            }
            if (m.winner) {
                if (m.aka && standingsMap[m.aka]) {
                    standingsMap[m.aka].played += 1;
                    if (m.winner === 'aka') standingsMap[m.aka].won += 1;
                    else if (m.winner === 'shiro') standingsMap[m.aka].lost += 1;
                    standingsMap[m.aka].points += (Number(m.aka_score) || 0);
                }
                if (m.shiro && standingsMap[m.shiro]) {
                    standingsMap[m.shiro].played += 1;
                    if (m.winner === 'shiro') standingsMap[m.shiro].won += 1;
                    else if (m.winner === 'aka') standingsMap[m.shiro].lost += 1;
                    standingsMap[m.shiro].points += (Number(m.shiro_score) || 0);
                }
            }
        });
        const standings = Object.values(standingsMap).sort((a, b) => b.won - a.won || b.points - a.points);

        return (
            <article className="event-bracket">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="event-accent text-xs font-bold uppercase tracking-[.12em]">
                            Setengah Kompetisi (Round Robin)
                        </p>
                        <h3 className="mt-1">{bracket.category}</h3>
                    </div>
                    <span className="event-match-type">{bracket.status}</span>
                </div>

                {standings.length > 0 && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 mb-2">
                            Klasemen Sementara
                        </h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead>
                                    <tr className="border-b border-amber-200 text-[10px] text-amber-800 uppercase">
                                        <th className="py-1.5 px-2">Peringkat</th>
                                        <th className="py-1.5 px-2">Nama Kenshi</th>
                                        <th className="py-1.5 px-2 text-center">Main</th>
                                        <th className="py-1.5 px-2 text-center">Menang</th>
                                        <th className="py-1.5 px-2 text-center">Kalah</th>
                                        <th className="py-1.5 px-2 text-right">Poin</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-amber-100">
                                    {standings.map((s, idx) => (
                                        <tr key={s.name}>
                                            <td className="py-1.5 px-2 font-bold">{idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}</td>
                                            <td className="py-1.5 px-2 font-semibold">{s.name}</td>
                                            <td className="py-1.5 px-2 text-center">{s.played}</td>
                                            <td className="py-1.5 px-2 text-center font-bold text-emerald-600">{s.won}</td>
                                            <td className="py-1.5 px-2 text-center text-stone-500">{s.lost}</td>
                                            <td className="py-1.5 px-2 text-right font-mono font-bold">{s.points}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="event-bracket-scroll mt-6" tabIndex="0" aria-label={`Jadwal Putaran ${bracket.category}`}>
                    <div className="flex items-start gap-6 min-w-max pb-4">
                        {bracket.rounds.map((round) => (
                            <div key={round.name} className="flex flex-col gap-3 min-w-[260px]">
                                <h4 className="text-xs font-bold uppercase text-stone-600">{round.name}</h4>
                                <div className="space-y-3">
                                    {round.matches.map((match) => (
                                        <PublicMatchCard key={match.id} match={match} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </article>
        );
    }

    const maxMatchesInRound = Math.max(...bracket.rounds.map((round) => round.matches.length), 1);
    const bracketHeight = Math.max(maxMatchesInRound * 148, 296);

    return (
        <article className="event-bracket">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="event-accent text-xs font-bold uppercase tracking-[.12em]">Bagan {bracket.format?.replaceAll('_', ' ') || 'pertandingan'}</p>
                    <h3 className="mt-1">{bracket.category}</h3>
                </div>
                <span className="event-match-type">{bracket.status}</span>
            </div>
            <div className="event-bracket-scroll mt-6" tabIndex="0" aria-label={`Bagan Randori ${bracket.category}, geser horizontal untuk melihat setiap babak`}>
                <div className="event-bracket-rounds" style={{ '--event-bracket-height': `${bracketHeight}px` }}>
                    {bracket.rounds.map((round, roundIndex) => {
                        const isFirstRound = roundIndex === 0;
                        const isLastRound = roundIndex === bracket.rounds.length - 1;
                        const connectorSpan = bracketHeight / Math.max(round.matches.length, 1);

                        return (
                            <section
                                key={round.name}
                                className={`event-bracket-round ${isFirstRound ? 'event-bracket-first' : ''} ${isLastRound ? 'event-bracket-last' : ''}`}
                                style={{ '--event-connector-span': `${connectorSpan}px` }}
                            >
                                <h4>{round.name}</h4>
                                <div className="event-bracket-matches">
                                    {round.matches.map((match, matchIndex) => {
                                        const startsPair = !isLastRound && matchIndex % 2 === 0 && matchIndex + 1 < round.matches.length;

                                        return (
                                            <div key={match.id} className={`event-bracket-match-slot ${match.is_bye ? 'event-bracket-bye' : ''}`}>
                                                {startsPair && <span className="event-bracket-pair-line" aria-hidden="true" />}
                                                <PublicMatchCard match={match} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>
        </article>
    );
}

