import { useEffect, useState } from 'react';
import EmptyState from '../Shared/EmptyState';
import {
    activeScoreBreakdown,
    competitorCardState,
    embuAthletes,
    embuJudgePresentation,
    embuJudgeSlots,
    formatEmbuScore,
    formatTimer,
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

const embuJudgeToneClasses = {
    trimmed: {
        card: 'border-rose-400 bg-rose-50/80 dark:border-rose-400/55 dark:bg-rose-400/10',
        label: 'text-rose-700 dark:text-rose-300',
        score: 'text-rose-600 line-through decoration-2 dark:text-rose-300',
        divider: 'border-rose-200 dark:border-rose-400/20',
    },
    middle: {
        card: 'border-emerald-500 bg-emerald-50/80 dark:border-emerald-400/55 dark:bg-emerald-400/10',
        label: 'text-emerald-800 dark:text-emerald-300',
        score: 'text-emerald-700 dark:text-emerald-300',
        divider: 'border-emerald-200 dark:border-emerald-400/20',
    },
    submitted: {
        card: 'border-amber-300 bg-amber-50/70 dark:border-amber-400/45 dark:bg-amber-400/10',
        label: 'text-amber-800 dark:text-amber-300',
        score: 'text-[#071126] dark:text-white',
        divider: 'border-amber-200 dark:border-amber-400/20',
    },
    waiting: {
        card: 'border-stone-200 bg-[#f7f4ee] dark:border-white/10 dark:bg-white/5',
        label: 'text-slate-600 dark:text-white/55',
        score: 'text-slate-400 dark:text-white/35',
        divider: 'border-stone-200 dark:border-white/10',
    },
};

function EmbuMatchHeader({ match, timerText, isExpired, isResultSaved }) {
    const athletes = embuAthletes(match);
    const participant = match.participant || {};
    const durationText = isResultSaved && match.result?.duration_seconds
        ? formatTimer(match.result.duration_seconds)
        : timerText;
    const statusLabel = isResultSaved ? 'Disahkan' : timerStatusLabel(match.timer, isExpired);

    return (
        <section className="grid gap-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.07)] dark:border-white/10 dark:bg-[#151210] sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.38fr)] xl:items-center">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                    <span className="rounded-lg bg-amber-500 px-3 py-1.5 text-[#071126]">
                        Embu · Partai #{match.sequence}
                    </span>
                    <span className="rounded-lg border border-stone-300 bg-[#f7f4ee] px-3 py-1.5 text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-white/70">
                        {match.round_label || 'Babak belum ditentukan'}{match.pool ? ` · Pool ${match.pool}` : ''}
                    </span>
                    <span className="rounded-lg border border-stone-300 px-3 py-1.5 text-slate-600 dark:border-white/15 dark:text-white/60">
                        {match.status_label || 'Menunggu'}
                    </span>
                </div>

                <h2 className="mt-4 max-w-5xl break-words text-[clamp(1.65rem,2.75vw,3rem)] font-black leading-[1.05] tracking-[-0.035em] text-[#071126] dark:text-white">
                    {match.category_name || 'Nomor pertandingan Embu'}
                </h2>
                <p className="mt-3 break-words text-lg font-black text-amber-800 dark:text-amber-300 sm:text-xl">
                    {match.participant_label || participant.contingent_name || 'Peserta belum ditentukan'}
                </p>
                {participant.contingent_name && participant.contingent_name !== match.participant_label && (
                    <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-white/55">{participant.contingent_name}</p>
                )}
                {athletes.length > 0 && (
                    <p className="mt-4 max-w-4xl text-sm font-semibold leading-6 text-slate-600 dark:text-white/55">
                        <span className="font-black text-slate-800 dark:text-white/80">{participant.kind || 'Tim Embu'}:</span>{' '}
                        {athletes.map((athlete) => athlete.name).join(' · ')}
                    </p>
                )}
            </div>

            <div className="rounded-2xl border border-stone-300 bg-[#f3f0e9] p-5 dark:border-white/10 dark:bg-white/5 sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-800 dark:text-amber-300">
                    {isResultSaved ? 'Durasi resmi' : 'Waktu pertandingan'}
                </p>
                <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between xl:flex-col xl:items-start 2xl:flex-row 2xl:items-end">
                    <p className="font-mono text-[clamp(3rem,5.5vw,5.5rem)] font-black leading-none tracking-[-0.07em] text-[#071126] tabular-nums dark:text-white">
                        {durationText}
                    </p>
                    <div className="shrink-0 sm:text-right xl:text-left 2xl:text-right">
                        <p className={`text-sm font-black ${isResultSaved ? 'text-emerald-700 dark:text-emerald-300' : isExpired ? 'text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-white/70'}`}>
                            {statusLabel}
                        </p>
                        {isResultSaved && match.result?.duration_seconds !== null && match.result?.duration_seconds !== undefined && (
                            <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-white/50">Durasi {match.result.duration_seconds}s</p>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

function EmbuJudgeCard({ judge }) {
    const presentation = embuJudgePresentation(judge);
    const tone = embuJudgeToneClasses[presentation.tone];
    const judgeRole = Number(judge.judge_number) === 1 ? 'Juri 1 · Utama' : `Juri ${judge.judge_number}`;

    return (
        <li className={`flex min-h-56 min-w-0 flex-col rounded-xl border-2 p-3.5 ${tone.card}`}>
            <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.06em] text-[#071126] dark:text-white">{judgeRole}</p>
                    <p className="mt-1.5 line-clamp-2 min-h-9 text-[13px] font-bold leading-[1.125rem] text-slate-700 dark:text-white/70">
                        {judge.referee_name || `Juri ${judge.judge_number}`}
                    </p>
                </div>
                {judge.is_signed && <i className="fa-solid fa-signature shrink-0 text-emerald-700 dark:text-emerald-300" aria-label="Tanda tangan tercatat" />}
            </div>

            <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
                <p className={`font-mono text-[clamp(2.25rem,3.5vw,3.5rem)] font-black leading-none tracking-[-0.05em] tabular-nums ${tone.score}`}>
                    {formatEmbuScore(judge.total_score)}
                </p>
                <p className={`mt-2 text-[9px] font-black uppercase leading-3.5 ${tone.label}`}>
                    {presentation.statusLabel}
                </p>
            </div>

            <dl className={`grid grid-cols-2 gap-2 border-t pt-2.5 ${tone.divider}`}>
                <div className="text-center">
                    <dt className="text-[10px] font-bold text-slate-600 dark:text-white/55">Teknik</dt>
                    <dd className="mt-1 font-mono text-sm font-black text-[#071126] tabular-nums dark:text-white">
                        {formatEmbuScore(judge.technique_subtotal)}
                    </dd>
                </div>
                <div className="text-center">
                    <dt className="text-[10px] font-bold text-slate-600 dark:text-white/55">Ekspresi</dt>
                    <dd className="mt-1 font-mono text-sm font-black text-[#071126] tabular-nums dark:text-white">
                        {formatEmbuScore(judge.expression_subtotal)}
                    </dd>
                </div>
            </dl>
        </li>
    );
}

function EmbuJudgeBoard({ match, isResultSaved }) {
    const judges = embuJudgeSlots(match.judge_scores);
    const scoredJudges = judges.filter((judge) => embuJudgePresentation(judge).hasScore).length;

    return (
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] dark:border-white/10 dark:bg-[#151210] sm:p-5" aria-labelledby="embu-judge-board-title">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-800 dark:text-amber-300">Penilaian Embu</p>
                    <h2 id="embu-judge-board-title" className="mt-1 text-xl font-black text-[#071126] dark:text-white sm:text-2xl">Nilai lima juri</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-white/50">Skor penguasaan teknik dan penghayatan ekspresi.</p>
                </div>
                <p className={`self-start rounded-lg border px-3 py-2 text-xs font-black sm:self-auto ${isResultSaved ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300' : 'border-stone-300 bg-[#f7f4ee] text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/65'}`}>
                    {isResultSaved ? 'Disahkan Panitera' : `${scoredJudges}/5 nilai masuk`}
                </p>
            </div>

            <ol className="mt-4 grid grid-cols-1 gap-2.5 min-[430px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-label="Nilai lima juri Embu">
                {judges.map((judge) => <EmbuJudgeCard key={judge.judge_number} judge={judge} />)}
            </ol>
        </section>
    );
}

function EmbuResultSummary({ match, timerText, isResultSaved }) {
    const result = match.result || {};
    const finalScoreAvailable = result.final_score !== null && result.final_score !== undefined;
    const duration = isResultSaved && result.duration_seconds ? formatTimer(result.duration_seconds) : timerText;
    const totalPenalty = Number(result.total_penalty || 0);

    return (
        <section className="grid gap-3 sm:grid-cols-3" aria-label="Ringkasan hasil Embu">
            <div className="rounded-2xl border border-stone-300 bg-[#f3f0e9] p-5 text-center dark:border-white/10 dark:bg-[#151210]">
                <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-600 dark:text-white/55">Durasi penampilan</p>
                <p className="mt-3 font-mono text-4xl font-black text-[#071126] tabular-nums dark:text-white">{duration}</p>
            </div>
            <div className={`rounded-2xl border p-5 text-center ${totalPenalty > 0 ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-300' : 'border-stone-300 bg-white text-slate-700 dark:border-white/10 dark:bg-[#151210] dark:text-white/70'}`}>
                <p className="text-xs font-black uppercase tracking-[0.1em]">Total denda</p>
                <p className="mt-3 font-mono text-3xl font-black tabular-nums">{totalPenalty > 0 ? `-${formatEmbuScore(totalPenalty, '0')}` : '0'}</p>
            </div>
            <div className={`rounded-2xl border p-5 text-center ${result.is_disqualified ? 'border-rose-600 bg-rose-700 text-white' : finalScoreAvailable ? 'border-emerald-700 bg-emerald-700 text-white dark:border-emerald-400' : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200'}`}>
                <p className="text-xs font-black uppercase tracking-[0.1em]">Nilai akhir {isResultSaved ? 'resmi' : 'sementara'}</p>
                <p className="mt-3 font-mono text-3xl font-black tabular-nums">
                    {result.is_disqualified ? 'DQ' : formatEmbuScore(result.final_score, 'Menunggu')}
                </p>
            </div>
        </section>
    );
}

function EmbuTiebreakParameters({ match }) {
    const parameters = match.embu_parameters;
    const judges = embuJudgeSlots(match.judge_scores);
    const allScoresAvailable = judges.every((judge) => embuJudgePresentation(judge).hasScore);

    if (!parameters || !allScoresAvailable) return null;

    const items = [
        { label: 'Parameter 1', title: 'Nilai akhir', value: formatEmbuScore(parameters.param1_score), numeric: true },
        { label: 'Parameter 2', title: 'Teknik 3 wasit tengah', value: formatEmbuScore(parameters.param2_technique), numeric: true },
        { label: 'Parameter 3', title: 'Total Wasit Utama', value: formatEmbuScore(parameters.param3_chief_total), numeric: true },
        { label: 'Parameter 4', title: 'Teknik Wasit Utama', value: formatEmbuScore(parameters.param4_chief_technique), numeric: true },
        { label: 'Parameter 5', title: 'Keputusan Wasit Utama', value: 'Manual jika P1-P4 seri', numeric: false },
    ];

    return (
        <section className="rounded-2xl border border-amber-300 bg-amber-50/60 p-5 dark:border-amber-400/25 dark:bg-amber-400/5 sm:p-6" aria-labelledby="embu-tiebreak-title">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 id="embu-tiebreak-title" className="text-lg font-black text-[#071126] dark:text-white">Parameter pemutus nilai seri</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-white/50">Urutan prioritas resmi digunakan bila nilai akhir peserta sama.</p>
                </div>
                {parameters.middle_judges_label && (
                    <p className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-black text-amber-900 dark:border-amber-400/25 dark:bg-white/5 dark:text-amber-200">
                        Wasit tengah: {parameters.middle_judges_label}
                    </p>
                )}
            </div>
            <ol className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {items.map((item) => (
                    <li key={item.label} className="rounded-xl border border-stone-200 bg-white p-4 dark:border-white/10 dark:bg-[#151210]">
                        <p className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300">{item.label}</p>
                        <h3 className="mt-2 text-sm font-black leading-5 text-[#071126] dark:text-white">{item.title}</h3>
                        <p className={`mt-4 text-xl font-black leading-6 text-[#071126] dark:text-white ${item.numeric ? 'font-mono tabular-nums' : ''}`}>{item.value}</p>
                    </li>
                ))}
            </ol>
        </section>
    );
}

function EmbuMatch({ match, timerText, isExpired, isResultSaved }) {
    return (
        <div className="flex min-h-0 flex-col gap-3">
            <EmbuMatchHeader match={match} timerText={timerText} isExpired={isExpired} isResultSaved={isResultSaved} />
            <EmbuJudgeBoard match={match} isResultSaved={isResultSaved} />
            <EmbuResultSummary match={match} timerText={timerText} isResultSaved={isResultSaved} />
            <EmbuTiebreakParameters match={match} />
        </div>
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
        <div className={`flex min-h-full flex-col gap-3 ${match.category_type === 'randori' ? 'xl:h-full' : ''}`}>
            {match.category_type === 'randori' ? (
                <>
                    <TimerPanel
                        match={match}
                        timerText={timerText}
                        timerDirection={timerDirection}
                        timerDuration={timerDuration}
                        isExpired={isExpired}
                        isResultSaved={isResultSaved}
                    />
                    <RandoriMatch
                        match={match}
                        akaTotal={akaTotal}
                        shiroTotal={shiroTotal}
                        akaBreakdown={akaBreakdown}
                        shiroBreakdown={shiroBreakdown}
                        winnerCorner={winnerCorner}
                    />
                </>
            ) : (
                <EmbuMatch match={match} timerText={timerText} isExpired={isExpired} isResultSaved={isResultSaved} />
            )}
            {varPanel}
        </div>
    );
}
