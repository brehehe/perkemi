export default function OverlayNotification({
    isOpen = false,
    onClose,
    title = 'Pemberitahuan Sistem',
    children,
    type = 'banner', // 'banner' | 'corner'
    className = '',
}) {
    if (!isOpen) return null;

    if (type === 'banner') {
        return (
            <div className={`fixed top-0 inset-x-0 z-50 bg-[#0f0d0b] text-white border-b border-[#d4a843]/40 px-4 py-3 shadow-lg animate-in slide-in-from-top duration-300 ${className}`}>
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-[#d4a843] animate-ping" />
                        <div>
                            {title && <span className="font-bold text-[#f0c060] mr-2">{title}:</span>}
                            <span>{children}</span>
                        </div>
                    </div>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={`fixed bottom-4 right-4 z-50 max-w-sm w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-4 duration-300 ${className}`}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                    <h5 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h5>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">{children}</div>
                </div>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}
