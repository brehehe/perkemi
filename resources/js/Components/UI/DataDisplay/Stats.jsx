export default function Stats({
    title,
    value,
    change = null, // e.g. "+12%" or -5%
    changeType = 'increase', // 'increase' | 'decrease' | 'neutral'
    changePeriod = 'vs bulan lalu',
    icon = null,
    variant = 'default', // 'default' | 'gold' | 'crimson'
    className = '',
}) {
    const isIncrease = changeType === 'increase';
    const isDecrease = changeType === 'decrease';

    const borderGradients = {
        default: 'border-slate-200 dark:border-slate-800',
        gold: 'border-[#d4a843]/30 bg-gradient-to-br from-white via-white to-amber-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/10',
        crimson: 'border-red-500/20 bg-gradient-to-br from-white via-white to-red-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-red-950/10',
    };

    return (
        <div
            className={`p-5 rounded-2xl border bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                borderGradients[variant] || borderGradients.default
            } ${className}`}
        >
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {title}
                </p>
                {icon && (
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                        {icon}
                    </div>
                )}
            </div>

            <div className="mt-3">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {value}
                </h3>

                {change && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs">
                        <span
                            className={`inline-flex items-center font-bold px-1.5 py-0.5 rounded-md ${
                                isIncrease
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                                    : isDecrease
                                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            {isIncrease ? '↑ ' : isDecrease ? '↓ ' : ''}
                            {change}
                        </span>
                        {changePeriod && (
                            <span className="text-slate-400 dark:text-slate-500">
                                {changePeriod}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
