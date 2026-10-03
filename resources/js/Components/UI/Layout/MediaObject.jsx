export default function MediaObject({
    media,
    title,
    subtitle = null,
    children = null,
    action = null,
    align = 'start', // start, center
    className = '',
}) {
    const alignStyles = {
        start: 'items-start',
        center: 'items-center',
    };

    return (
        <div className={`flex gap-4 ${alignStyles[align] || alignStyles.start} ${className}`}>
            <div className="flex-shrink-0">{media}</div>
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {title}
                </h4>
                {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
                {children && <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">{children}</div>}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
        </div>
    );
}
