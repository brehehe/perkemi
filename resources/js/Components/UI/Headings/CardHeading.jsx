export default function CardHeading({
    title,
    subtitle = null,
    badge = null,
    icon = null,
    action = null,
    className = '',
}) {
    return (
        <div className={`mb-4 flex flex-col items-stretch justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800/80 sm:flex-row sm:items-center ${className}`}>
            <div className="flex items-center gap-2.5 min-w-0">
                {icon && <span className="text-[#c0392b] shrink-0">{icon}</span>}
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {title}
                        </h3>
                        {badge && <div>{badge}</div>}
                    </div>
                    {subtitle && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {action && <div className="w-full shrink-0 sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">{action}</div>}
        </div>
    );
}
