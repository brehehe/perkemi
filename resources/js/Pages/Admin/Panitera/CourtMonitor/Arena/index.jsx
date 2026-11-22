import EmptyState from '../Shared/EmptyState';
import EmbuParticipantPanel from '../Shared/EmbuParticipantPanel';

export default function ArenaMode({ activeMatch, snapshot, timerText, court }) {
    if (!activeMatch) return <EmptyState court={court} />;

    return (
        <div className="grid min-h-full gap-4 xl:h-full xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="flex min-h-0 flex-col rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] dark:border-white/10 dark:bg-[#151210] sm:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-800 dark:text-amber-300">
                            {activeMatch.category_type} · Partai #{activeMatch.sequence}
                        </p>
                        <h2 className="mt-1.5 break-words text-2xl font-black leading-tight text-[#071126] dark:text-white sm:text-3xl">{activeMatch.category_name}</h2>
                        <p className="mt-1.5 text-sm font-semibold text-slate-600 dark:text-white/55">
                            {activeMatch.round_label}{activeMatch.pool ? ` · Pool ${activeMatch.pool}` : ''}
                        </p>
                    </div>
                    <div className="shrink-0 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-center dark:border-amber-400/25 dark:bg-amber-400/10">
                        <p className="text-[10px] font-bold text-amber-900 dark:text-amber-200">{activeMatch.call_status_label}</p>
                        <p className="mt-1 font-mono text-3xl font-black tabular-nums text-[#071126] dark:text-white">{timerText}</p>
                    </div>
                </div>

                <div className="mt-5 grid min-h-0 flex-1 gap-3 sm:grid-cols-2">
                    {activeMatch.category_type === 'randori' ? (
                        <>
                            <article className="rounded-xl bg-red-700 p-4 text-white">
                                <p className="text-xs font-black uppercase tracking-wider text-red-100">AKA · Merah</p>
                                <h3 className="mt-2 text-xl font-black">{activeMatch.aka_label || 'Menunggu peserta'}</h3>
                                <p className="mt-1.5 text-xs font-semibold text-red-100">{activeMatch.aka_contingent || activeMatch.red_contingent || 'Kontingen belum tersedia'}</p>
                            </article>
                            <article className="rounded-xl border-2 border-slate-300 bg-[#f7f4ee] p-4 text-[#071126] dark:border-white/15">
                                <p className="text-xs font-black uppercase tracking-wider text-slate-600">SHIRO · Putih</p>
                                <h3 className="mt-2 text-xl font-black">{activeMatch.shiro_label || 'Menunggu peserta'}</h3>
                                <p className="mt-1.5 text-xs font-semibold text-slate-600">{activeMatch.shiro_contingent || activeMatch.blue_contingent || 'Kontingen belum tersedia'}</p>
                            </article>
                        </>
                    ) : <EmbuParticipantPanel match={activeMatch} compact className="h-full sm:col-span-2" />}
                </div>
            </section>

            <aside className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#151210]">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="font-black text-[#071126] dark:text-white">Antrean berikutnya</h2>
                    <span className="text-xs font-bold text-slate-500 dark:text-white/45">{snapshot.progress.completed}/{snapshot.progress.total}</span>
                </div>
                <ol className="mt-4 space-y-3">
                    {snapshot.queue.map((item) => (
                        <li key={item.id} className="rounded-xl border border-stone-200 bg-[#f7f4ee] p-4 dark:border-white/10 dark:bg-white/5">
                            <p className="text-xs font-black text-amber-800 dark:text-amber-300">{item.scheduled_at || 'Belum dijadwalkan'} · Partai #{item.sequence}</p>
                            <p className="mt-1 text-sm font-black text-[#071126] dark:text-white">{item.category_name}</p>
                            <p className="mt-1 text-xs text-slate-600 dark:text-white/45">{item.round_label}</p>
                        </li>
                    ))}
                    {snapshot.queue.length === 0 && (
                        <li className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/45">Tidak ada antrean berikutnya.</li>
                    )}
                </ol>
            </aside>
        </div>
    );
}
