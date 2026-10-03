export default function SectionHeading({
    title,
    description = null,
    badge = null,
    action = null,
    tabs = null,
    className = '',
}) {
    return (
        <div className={`border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 ${className}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                            {title}
                        </h2>
                        {badge && <div>{badge}</div>}
                    </div>

                    {description && (
                        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            {description}
                        </p>
                    )}
                </div>

                {action && <div className="shrink-0">{action}</div>}
            </div>

            {tabs && <div className="mt-4">{tabs}</div>}
        </div>
    );
}
