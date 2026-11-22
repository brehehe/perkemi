export default function VarPanel({
    match,
    activeVarUrl,
    varKey,
    iframeRef,
    showConfig,
    varUrlInput,
    savingVarUrl,
    saveMessage,
    onClose,
    onReload,
    onFullscreen,
    onToggleConfig,
    onUrlChange,
    onSave,
}) {
    return (
        <section className="rounded-[2rem] border border-slate-800 bg-[#111827] p-4 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:p-6">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />
                        <h2 className="text-sm font-black uppercase tracking-[0.12em]">Video Assistant Review</h2>
                    </div>
                    <p className="mt-1 break-all text-xs text-white/55">{activeVarUrl}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                    <button type="button" onClick={onClose} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 text-xs font-bold text-red-200 hover:bg-red-500/20 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">
                        <i className="fa-solid fa-video-slash" aria-hidden="true" /> Tutup VAR
                    </button>
                    <button type="button" onClick={onReload} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold hover:bg-white/10 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">
                        <i className="fa-solid fa-arrows-rotate" aria-hidden="true" /> Muat ulang
                    </button>
                    <button type="button" onClick={onFullscreen} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold hover:bg-white/10 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">
                        <i className="fa-solid fa-expand" aria-hidden="true" /> Layar penuh
                    </button>
                    <button type="button" onClick={onToggleConfig} aria-expanded={showConfig} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold hover:bg-white/10 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">
                        <i className="fa-solid fa-gear" aria-hidden="true" /> Atur URL
                    </button>
                </div>
            </div>

            {showConfig && (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
                    <label htmlFor="court-var-url" className="text-xs font-bold text-white/75">URL streaming VAR</label>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input
                            id="court-var-url"
                            type="url"
                            value={varUrlInput}
                            onChange={(event) => onUrlChange(event.target.value)}
                            placeholder={activeVarUrl}
                            className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/20 bg-black/40 px-3 text-sm text-white placeholder:text-white/60 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                        />
                        <button type="button" disabled={savingVarUrl} onClick={onSave} className="min-h-11 cursor-pointer rounded-xl bg-amber-400 px-4 text-sm font-black text-[#071126] hover:bg-amber-300 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">
                            {savingVarUrl ? 'Menyimpan...' : 'Simpan URL'}
                        </button>
                    </div>
                    {saveMessage && <p className="mt-2 text-xs font-bold text-emerald-300" role="status">{saveMessage}</p>}
                </div>
            )}

            {match?.var_review?.is_under_review && (
                <div className="mt-4 rounded-xl border-2 border-amber-400 bg-amber-400/10 p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-amber-300">Review sedang berlangsung</p>
                    <p className="mt-1 text-sm font-semibold text-white">{match.var_review.reason || 'Pemeriksaan video pertandingan'}</p>
                </div>
            )}

            <div ref={iframeRef} className="mt-4 aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
                <iframe
                    key={varKey}
                    src={activeVarUrl}
                    title="VAR Video Assistant Review"
                    width="1600"
                    height="900"
                    className="h-full w-full border-0"
                    allow="autoplay; fullscreen; camera; microphone"
                />
            </div>
        </section>
    );
}
