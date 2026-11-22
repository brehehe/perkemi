import { useEffect, useState } from 'react';
import EmptyState from '../Shared/EmptyState';
import EmbuParticipantPanel from '../Shared/EmbuParticipantPanel';
import {
    activeScoreBreakdown,
    competitorCardState,
    participantInitials,
    timerStatusLabel,
} from '../courtMonitorPresentation';

function TimerPanel({ match, timerText, timerDirection, timerDuration, isExpired, isResultSaved }) {
    const status = timerStatusLabel(match.timer, isExpired);
    const officialDuration = isResultSaved && match.result?.duration_seconds
        ? `${match.result.duration_seconds} detik`
        : `${timerDuration} detik`;

    return (
        <section className="relative shrink-0 overflow-hidden rounded-2xl border border-stone-200 bg-[#f7f4ee] px-4 py-3 shadow-[0_16px_40px_rgba(33,24,13,0.07)] dark:border-white/10 dark:bg-[#151210] sm:px-6 lg:px-8 lg:py-4">
            <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" aria-hidden="true" />
            <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-amber-800 dark:text-amber-300 sm:text-xs">
                Waktu pertandingan
            </p>
            <div className="mt-2 grid items-center gap-2 md:grid-cols-[minmax(150px,1fr)_minmax(300px,1.5fr)_minmax(150px,1fr)] lg:gap-3">
                <div className="text-center md:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600 dark:text-white/50">Mode timer</p>
                    <p className="mt-0.5 text-sm font-black text-slate-950 dark:text-white sm:text-base">
                        {timerDirection === 'down' ? 'Hitung mundur' : 'Hitung maju'}
                    </p>
                </div>
                <div className="border-y border-stone-300 px-3 py-2 text-center dark:border-white/15 md:border-x md:border-y-0 md:px-6 md:py-1">
                    <p className={`font-mono text-[clamp(3.25rem,7vw,6.5rem)] font-black leading-[0.9] tracking-[-0.08em] tabular-nums ${isExpired ? 'text-red-700 dark:text-red-400' : 'text-[#071126] dark:text-white'}`} aria-live="off">
                        {timerText}
                    </p>
                </div>
                <div className="text-center md:text-left">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600 dark:text-white/50">Status resmi</p>
                    <p className={`mt-0.5 text-sm font-black sm:text-base ${match.timer?.status === 'running' ? 'text-emerald-700 dark:text-emerald-300' : isExpired ? 'text-red-700 dark:text-red-300' : 'text-slate-950 dark:text-white'}`}>
                        {isResultSaved ? 'Durasi disahkan' : status}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold text-slate-600 dark:text-white/45 sm:text-xs">Durasi {officialDuration}</p>
                </div>
            </div>
        </section>
    );
}

function CompetitorCard({ corner, name, contingent, photoUrl, score, breakdown, winner, imageFailed, onImageError }) {
    const isAka = corner === 'aka';
    const { isWinner } = competitorCardState(corner, winner);
    const scoreDetails = activeScoreBreakdown(breakdown);
    const label = isAka ? 'AKA · MERAH' : 'SHIRO · PUTIH';

    return (
        <article className={`relative flex min-h-[280px] min-w-0 flex-col overflow-hidden rounded-2xl border-2 p-4 sm:p-5 lg:min-h-0 lg:p-6 ${isAka
            ? 'border-red-700 bg-[linear-gradient(135deg,#a90d18_0%,#d81725_58%,#b50d1a_100%)] text-white shadow-[0_18px_45px_rgba(190,24,37,0.18)]'
            : 'border-slate-300 bg-white text-[#071126] shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:border-white/15 dark:bg-[#f7f4ee]'} ${isWinner ? 'ring-4 ring-amber-400/35' : ''}`}>
            <div className="flex items-center justify-between gap-3">
                <span className={`inline-flex min-h-8 items-center rounded-lg border px-3 text-[10px] font-black uppercase tracking-[0.08em] sm:text-xs ${isAka ? 'border-white/50 bg-red-950/55 text-white' : 'border-[#071126] bg-[#071126] text-white'}`}>
                    {label}
                </span>
                {isWinner && (
                    <span className="inline-flex min-h-8 items-center gap-2 rounded-lg bg-amber-400 px-3 text-[10px] font-black uppercase text-[#071126] sm:text-xs">
                        <i className="fa-solid fa-trophy" aria-hidden="true" /> Pemenang
                    </span>
                )}
            </div>

            <div className="mt-4 grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 text-base font-black sm:h-16 sm:w-16 ${isAka ? 'border-white/55 bg-red-950/25 text-white' : 'border-stone-300 bg-stone-100 text-slate-600'}`}>
                    {photoUrl && !imageFailed ? (
                        <img
                            src={photoUrl}
                            alt={`Foto ${name || label}`}
                            width="80"
                            height="80"
                            className="h-full w-full object-cover"
                            onError={onImageError}
                        />
                    ) : participantInitials(name, isAka ? 'AKA' : 'SH')}
                </div>

                <div className="min-w-0">
                    <h3 className="break-words text-balance text-[clamp(1.25rem,2vw,2.25rem)] font-black leading-[1.08] tracking-[-0.03em]">
                        {name || 'Menunggu peserta'}
                    </h3>
                    {contingent && (
                        <p className={`mt-2 inline-flex max-w-full items-center gap-2 rounded-lg border px-2.5 py-1 text-[10px] font-bold sm:text-xs ${isAka ? 'border-white/30 bg-red-950/45 text-white' : 'border-slate-300 bg-slate-50 text-slate-700'}`}>
                            <i className="fa-solid fa-shield-halved shrink-0 text-amber-500" aria-hidden="true" />
                            <span className="line-clamp-2 text-left leading-tight">{contingent}</span>
                        </p>
                    )}
                </div>

                <div className={`col-span-2 border-t-2 pt-3 text-center sm:col-span-1 sm:border-l-2 sm:border-t-0 sm:pl-4 sm:pt-0 ${isAka ? 'border-white/35' : 'border-slate-300'}`}>
                    <p className="font-mono text-[clamp(3.5rem,6vw,6.75rem)] font-black leading-none tracking-[-0.08em] tabular-nums">{score}</p>
                    <p className={`mt-1 text-[9px] font-black uppercase tracking-[0.12em] sm:text-[10px] ${isAka ? 'text-white/85' : 'text-slate-600'}`}>Total poin</p>
                </div>
            </div>

            {scoreDetails.length > 0 && (
                <div className={`mt-4 flex flex-wrap gap-1.5 border-t pt-3 ${isAka ? 'border-white/25' : 'border-slate-200'}`}>
                    {scoreDetails.map((item) => (
                        <span key={item.key} className={`rounded-md px-2 py-1 text-[10px] font-bold sm:text-xs ${isAka ? 'bg-red-950/45 text-white' : 'bg-slate-100 text-slate-700'}`}>
                            {item.label}: {item.value}
                        </span>
                    ))}
                </div>
            )}
        </article>
    );
}

function RandoriMatch({ match, akaTotal, shiroTotal, akaBreakdown, shiroBreakdown, winnerCorner }) {
    const [akaImgError, setAkaImgError] = useState(false);
    const [shiroImgError, setShiroImgError] = useState(false);

    useEffect(() => {
        setAkaImgError(false);
        setShiroImgError(false);
    }, [match.id, match.aka_photo_url, match.shiro_photo_url]);

    return (
        <section className="grid min-h-0 flex-1 items-stretch gap-3 xl:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)]">
            <CompetitorCard
                corner="aka"
                name={match.aka_label}
                contingent={match.aka_contingent || match.red_contingent}
                photoUrl={match.aka_photo_url}
                score={akaTotal}
                breakdown={akaBreakdown}
                winner={winnerCorner}
                imageFailed={akaImgError}
                onImageError={() => setAkaImgError(true)}
            />
            <div className="flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-stone-300 bg-[#ece7de] text-base font-black text-[#071126] shadow-sm dark:border-white/10 dark:bg-[#211d19] dark:text-white">VS</span>
            </div>
            <CompetitorCard
                corner="shiro"
                name={match.shiro_label}
                contingent={match.shiro_contingent || match.blue_contingent}
                photoUrl={match.shiro_photo_url}
                score={shiroTotal}
                breakdown={shiroBreakdown}
                winner={winnerCorner}
                imageFailed={shiroImgError}
                onImageError={() => setShiroImgError(true)}
            />
        </section>
    );
}

function EmbuMatch({ match }) {
    return (
        <EmbuParticipantPanel match={match} className="min-h-0 flex-1" />
    );
}

export default function MatchMode({
    match,
    court,
    timerText,
    timerDirection,
    timerDuration,
    isExpired,
    isResultSaved,
    akaTotal,
    shiroTotal,
    akaBreakdown,
    shiroBreakdown,
    winnerCorner,
    varPanel,
}) {
    if (!match) return <EmptyState court={court} />;

    return (
        <div className="flex min-h-full flex-col gap-3 xl:h-full">
            <TimerPanel
                match={match}
                timerText={timerText}
                timerDirection={timerDirection}
                timerDuration={timerDuration}
                isExpired={isExpired}
                isResultSaved={isResultSaved}
            />
            {match.category_type === 'randori' ? (
                <RandoriMatch
                    match={match}
                    akaTotal={akaTotal}
                    shiroTotal={shiroTotal}
                    akaBreakdown={akaBreakdown}
                    shiroBreakdown={shiroBreakdown}
                    winnerCorner={winnerCorner}
                />
            ) : <EmbuMatch match={match} />}
            {varPanel}
        </div>
    );
}
