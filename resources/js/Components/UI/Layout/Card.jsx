export default function Card({
    children,
    header = null,
    footer = null,
    padding = true,
    hover = false,
    className = '',
}) {
    return (
        <div
            className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden ${
                hover ? 'hover:shadow-md transition-shadow duration-200' : ''
            } ${className}`}
        >
            {header && (
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    {header}
                </div>
            )}
            <div className={padding ? 'p-5 md:p-6' : ''}>{children}</div>
            {footer && (
                <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
                    {footer}
                </div>
            )}
        </div>
    );
}

Card.Header = function CardHeader({ title, subtitle = null, action = null, className = '' }) {
    return (
        <div className={`flex items-center justify-between gap-3 ${className}`}>
            <div>
                <h3 className="font-cinzel text-sm md:text-base font-bold text-slate-900 dark:text-white">
                    {title}
                </h3>
                {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
        </div>
    );
};
