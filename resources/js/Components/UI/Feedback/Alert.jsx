import { useState } from 'react';

export default function Alert({
    variant = 'info', // 'info' | 'success' | 'warning' | 'danger'
    title = null,
    children,
    dismissible = false,
    onDismiss = null,
    className = '',
}) {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    const handleDismiss = () => {
        setDismissed(true);
        if (onDismiss) onDismiss();
    };

    const variants = {
        info: {
            container: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200',
            iconColor: 'text-blue-500 dark:text-blue-400',
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            ),
        },
        success: {
            container: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200',
            iconColor: 'text-emerald-500 dark:text-emerald-400',
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            ),
        },
        warning: {
            container: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200',
            iconColor: 'text-amber-500 dark:text-amber-400',
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            ),
        },
        danger: {
            container: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200',
            iconColor: 'text-rose-500 dark:text-rose-400',
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            ),
        },
    };

    const cfg = variants[variant] || variants.info;

    return (
        <div
            role="alert"
            className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-150 ${cfg.container} ${className}`}
        >
            <div className={`shrink-0 mt-0.5 ${cfg.iconColor}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {cfg.icon}
                </svg>
            </div>

            <div className="flex-1 text-xs sm:text-sm">
                {title && <h5 className="font-bold mb-0.5 tracking-tight">{title}</h5>}
                <div className="opacity-90 leading-relaxed">{children}</div>
            </div>

            {dismissible && (
                <button
                    type="button"
                    onClick={handleDismiss}
                    aria-label="Tutup pemberitahuan"
                    className="shrink-0 p-1 -m-1 rounded-md opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    );
}
