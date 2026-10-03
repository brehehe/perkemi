export default function EmptyState({
    icon = null,
    title = 'Belum Ada Data',
    description = 'Tidak ada catatan atau aktivitas yang ditemukan untuk kriteria ini.',
    action = null,
    secondaryAction = null,
    className = '',
}) {
    return (
        <div
            className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 ${className}`}
        >
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 shadow-inner">
                {icon || (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                    </svg>
                )}
            </div>

            <h3 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">
                {title}
            </h3>

            {description && (
                <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                    {description}
                </p>
            )}

            {(action || secondaryAction) && (
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    {action}
                    {secondaryAction}
                </div>
            )}
        </div>
    );
}
