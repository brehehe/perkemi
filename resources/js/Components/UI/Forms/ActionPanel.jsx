export default function ActionPanel({
    title,
    description,
    children,
    action,
    variant = 'default', // 'default' | 'danger' | 'gold'
    className = '',
}) {
    const variantStyles = {
        default: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
        danger: 'border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20',
        gold: 'border-[#d4a843]/30 bg-[#d4a843]/5 dark:bg-[#d4a843]/10',
    };

    return (
        <div
            className={`flex flex-col justify-between gap-5 rounded-2xl border p-4 shadow-xs sm:p-6 md:flex-row md:items-center md:gap-6 ${
                variantStyles[variant] || variantStyles.default
            } ${className}`}
        >
            <div className="min-w-0 max-w-xl space-y-1">
                {title && (
                    <h4
                        className={`text-base font-bold ${
                            variant === 'danger'
                                ? 'text-rose-900 dark:text-rose-200'
                                : 'text-slate-900 dark:text-white'
                        }`}
                    >
                        {title}
                    </h4>
                )}
                {description && (
                    <p
                        className={`text-xs ${
                            variant === 'danger'
                                ? 'text-rose-700 dark:text-rose-400'
                                : 'text-slate-500 dark:text-slate-400'
                        }`}
                    >
                        {description}
                    </p>
                )}
                {children && <div className="mt-3">{children}</div>}
            </div>

            {action && <div className="flex w-full shrink-0 items-center md:w-auto [&>button]:w-full md:[&>button]:w-auto">{action}</div>}
        </div>
    );
}
