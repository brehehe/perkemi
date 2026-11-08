const monitorModes = [
    ['arena', 'Arena', 'fa-tv'],
    ['match', 'Layar Tanding', 'fa-display'],
    ['timer', 'Timer', 'fa-stopwatch'],
    ['result', 'Hasil', 'fa-ranking-star'],
    ['officials', 'Ofisial', 'fa-user-shield'],
];

export function CourtMonitorButtons({ courtId, eventId, compact = false, varUrl = null, isVarEnabled = true }) {
    const resolvedVarUrl = varUrl || 'https://var.smart-perkemi.id/kempo/demo/live_stream.html';

    return (
        <div className={`grid gap-2 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6'}`}>
            {monitorModes.map(([mode, label, icon]) => (
                <a
                    key={mode}
                    href={`/admin/panitera/scoring/monitors/${courtId}?event_id=${encodeURIComponent(eventId)}&mode=${mode}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#ddd5ca] bg-white px-3 text-xs font-semibold text-[#5f574f] transition-colors hover:border-[#d4a843] hover:bg-[#fffaf0] hover:text-[#8b651f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4a843] sm:min-h-10"
                >
                    <i className={`fa-solid ${icon}`} aria-hidden="true" />
                    {label}
                </a>
            ))}
            <a
                href={resolvedVarUrl}
                target="_blank"
                rel="noreferrer"
                title={isVarEnabled ? `Buka VAR Camera Stream (${resolvedVarUrl})` : `Sistem VAR dinonaktifkan di court ini (${resolvedVarUrl})`}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold transition-colors sm:min-h-10 ${
                    isVarEnabled
                        ? 'border-rose-200 bg-rose-50/70 text-rose-700 hover:border-rose-400 hover:bg-rose-100 hover:text-rose-900 focus-visible:outline-rose-500'
                        : 'border-slate-200 bg-slate-100/90 text-slate-500 hover:bg-slate-200 hover:text-slate-700 opacity-80'
                }`}
            >
                <i className={`fa-solid ${isVarEnabled ? 'fa-video text-rose-600' : 'fa-video-slash text-slate-400'}`} aria-hidden="true" />
                {isVarEnabled ? 'VAR' : 'VAR (Off)'}
            </a>
        </div>
    );
}

export default function CourtMonitorLinks({ activeEvent, courts = [] }) {
    return (
        <section className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm" aria-labelledby="court-monitor-title">
            <div>
                <h2 id="court-monitor-title" className="text-sm font-bold text-[#17120f]">Monitor per Court</h2>
                <p className="mt-0.5 text-xs text-[#7a746e]">Buka layar Arena, Timer, Hasil, atau Ofisial pada tab terpisah. Semua layar tetap mengikuti event dan court yang dipilih.</p>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {courts.map((court) => (
                    <article key={court.id} className="rounded-xl border border-[#ede9e1] bg-[#fbfaf8] p-3">
                        <div className="mb-3">
                            <h3 className="text-sm font-bold text-[#17120f]">{court.name}</h3>
                            <p className="mt-0.5 text-[11px] text-[#7a746e]">{court.location || 'Lokasi belum dicatat'}</p>
                        </div>
                        <CourtMonitorButtons courtId={court.id} eventId={activeEvent.id} varUrl={court.var_url} isVarEnabled={court.is_var_enabled !== false} />
                    </article>
                ))}
                {courts.length === 0 && <p className="rounded-xl border border-dashed border-[#d9d3c9] p-6 text-center text-xs text-[#7a746e] lg:col-span-2 2xl:col-span-3">Belum ada court aktif pada event ini.</p>}
            </div>
        </section>
    );
}
