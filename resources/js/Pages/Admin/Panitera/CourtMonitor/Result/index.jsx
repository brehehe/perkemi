import RandoriBracketTree from '../../Partials/RandoriBracketTree';
import EmptyState from '../Shared/EmptyState';
import { formatTimer } from '../courtMonitorPresentation';

function ResultHeader({ recap, court }) {
    const remaining = Math.max(0, Number(recap.total_matches) - Number(recap.completed_matches));

    return (
        <header className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] dark:border-white/10 dark:bg-[#151210] sm:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-lg px-3 py-1 text-xs font-black uppercase text-white ${recap.type === 'embu' ? 'bg-amber-700' : 'bg-red-700'}`}>{recap.type}</span>
                        <span className="rounded-lg border border-stone-300 bg-[#f7f4ee] px-3 py-1 text-xs font-bold text-slate-700 dark:border-white/10">{court.name}</span>
                        {recap.is_locked && <span className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">Hasil terkunci</span>}
                    </div>
                    <h2 className="mt-3 text-2xl font-black leading-tight text-[#071126] dark:text-white sm:text-3xl">{recap.name}</h2>
                    <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-white/50">Rekap partai pada court ini diperbarui langsung dari Panitera.</p>
                </div>
                <div className="grid shrink-0 grid-cols-2 gap-3 rounded-2xl border border-stone-200 bg-[#f7f4ee] p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-center">
                        <p className="text-[10px] font-bold uppercase text-slate-600 dark:text-white/50">Selesai</p>
                        <p className="mt-1 text-2xl font-black text-[#071126] dark:text-white">{recap.completed_matches}/{recap.total_matches}</p>
                    </div>
                    <div className="border-l border-stone-300 pl-3 text-center dark:border-white/10">
                        <p className="text-[10px] font-bold uppercase text-slate-600 dark:text-white/50">Tersisa</p>
                        <p className="mt-1 text-2xl font-black text-amber-800 dark:text-amber-300">{remaining}</p>
                    </div>
                </div>
            </div>
        </header>
    );
}

function EmbuRecap({ matches, activeMatchId }) {
    return (
        <ol className="grid gap-3">
            {matches.map((row) => {
                const score = row.embu_result;
                const isActive = row.id === activeMatchId;

                return (
                    <li key={row.id} className={`grid gap-4 rounded-2xl border p-4 sm:grid-cols-[80px_minmax(0,1.2fr)_minmax(0,1fr)_110px] sm:items-center ${isActive ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'border-stone-200 bg-white dark:border-white/10 dark:bg-[#151210]'}`}>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 dark:text-white/50">Partai</p>
                            <p className="mt-1 text-xl font-black text-[#071126] dark:text-white">#{row.sequence}</p>
                            <p className="text-[10px] text-slate-500 dark:text-white/45">{row.round_label}</p>
                        </div>
                        <div className="min-w-0">
                            <p className="break-words font-black text-[#071126] dark:text-white">{row.participant_label}</p>
                            {row.athletes?.length > 0 && <p className="mt-1 text-xs text-slate-600 dark:text-white/55">{row.athletes.join(' · ')}</p>}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {(score?.judge_scores || []).map((judgeScore, index) => (
                                <span key={`${row.id}-${index}`} className="rounded-lg border border-stone-200 bg-[#f7f4ee] px-2 py-1 font-mono text-xs font-bold text-slate-700 dark:border-white/10">
                                    J{index + 1} {Number(judgeScore).toFixed(1)}
                                </span>
                            ))}
                            {!score?.judge_scores?.length && <span className="text-xs font-semibold text-slate-500 dark:text-white/45">Belum dinilai</span>}
                        </div>
                        <div className="text-left sm:text-right">
                            <p className="text-[10px] font-black uppercase text-slate-500 dark:text-white/50">Nilai akhir</p>
                            <p className={`mt-1 font-mono text-2xl font-black ${score?.is_disqualified ? 'text-red-700' : score?.is_live ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                {score?.is_disqualified ? 'DQ' : score?.final_score !== null && score?.final_score !== undefined ? Number(score.final_score).toFixed(2) : '–'}
                            </p>
                            {score?.duration_seconds && <p className="text-[10px] text-slate-500 dark:text-white/45">{formatTimer(score.duration_seconds)}</p>}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

function SingleResult({ match }) {
    return (
        <section className="rounded-[2rem] border border-stone-200 bg-white p-6 text-center shadow-[0_20px_55px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#151210] sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-800 dark:text-amber-300">Hasil terakhir · Partai #{match.sequence}</p>
            <h2 className="mt-3 text-3xl font-black text-[#071126] dark:text-white sm:text-5xl">{match.category_name}</h2>
            <p className="mt-2 font-semibold text-slate-600 dark:text-white/50">{match.round_label}</p>
            {match.category_type === 'randori' ? (
                <div className="mx-auto mt-8 grid max-w-4xl items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
                    <div className="rounded-2xl bg-red-700 p-5 text-white">
                        <p className="text-sm font-black">{match.aka_label}</p>
                        <p className="mt-2 font-mono text-5xl font-black">{match.result.aka_total}</p>
                    </div>
                    <span className="font-black text-slate-500">VS</span>
                    <div className="rounded-2xl border-2 border-slate-300 bg-[#f7f4ee] p-5 text-[#071126]">
                        <p className="text-sm font-black">{match.shiro_label}</p>
                        <p className="mt-2 font-mono text-5xl font-black">{match.result.shiro_total}</p>
                    </div>
                </div>
            ) : (
                <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-[#f7f4ee] p-5 text-[#071126]"><p className="text-xs font-bold text-slate-600">Durasi</p><p className="mt-2 text-3xl font-black">{formatTimer(match.result.duration_seconds || 0)}</p></div>
                    <div className="rounded-2xl bg-red-50 p-5 text-red-800"><p className="text-xs font-bold">Total denda</p><p className="mt-2 text-3xl font-black">-{Number(match.result.total_penalty || 0).toFixed(2)}</p></div>
                    <div className="rounded-2xl bg-emerald-700 p-5 text-white"><p className="text-xs font-bold">Nilai akhir</p><p className="mt-2 text-3xl font-black">{Number(match.result.final_score || 0).toFixed(2)}</p></div>
                </div>
            )}
        </section>
    );
}

export default function ResultMode({ snapshot, court, activeEvent, activeMatch, resultMatch, showLockedArchive, onToggleLockedArchive }) {
    const recap = snapshot.category_recap;

    if (!recap) {
        return resultMatch?.result
            ? <SingleResult match={resultMatch} />
            : <EmptyState court={court} title="Menunggu Nilai Partai" detail={`Belum ada hasil pertandingan untuk ${court.name}.`} />;
    }

    return (
        <section className="min-h-full space-y-4">
            <ResultHeader recap={recap} court={court} />
            {recap.is_locked && !showLockedArchive ? (
                <div className="flex min-h-[45dvh] flex-col items-center justify-center rounded-[2rem] border-2 border-emerald-300 bg-emerald-50 p-8 text-center dark:border-emerald-500/30 dark:bg-emerald-950/20">
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-700 text-2xl text-white"><i className="fa-solid fa-lock" aria-hidden="true" /></span>
                    <h2 className="mt-5 text-3xl font-black text-[#071126] dark:text-white">Hasil telah dikunci resmi</h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-white/60">Rekap {recap.name} tersimpan dan tidak lagi menerima perubahan nilai.</p>
                    <button type="button" onClick={onToggleLockedArchive} className="mt-6 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-emerald-700 bg-white px-4 text-sm font-black text-emerald-800 hover:bg-emerald-100 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:bg-transparent dark:text-emerald-200">
                        <i className="fa-solid fa-eye" aria-hidden="true" /> Lihat rekap akhir
                    </button>
                </div>
            ) : (
                <>
                    {recap.is_locked && (
                        <button type="button" onClick={onToggleLockedArchive} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-stone-100 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 dark:border-white/15 dark:bg-[#151210] dark:text-white">
                            <i className="fa-solid fa-lock" aria-hidden="true" /> Tutup rekap akhir
                        </button>
                    )}
                    {recap.type === 'embu' ? (
                        <EmbuRecap matches={recap.matches} activeMatchId={activeMatch?.id} />
                    ) : (
                        <RandoriBracketTree
                            matches={recap.matches}
                            activeEvent={activeEvent}
                            categoryName={recap.name}
                            categoryFormat={recap.format}
                            isMonitor
                            activeMatchId={activeMatch?.id}
                        />
                    )}
                </>
            )}
        </section>
    );
}
