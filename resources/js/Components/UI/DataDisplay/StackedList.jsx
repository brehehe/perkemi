import { Link } from '@inertiajs/react';

export default function StackedList({
    items = [],
    className = '',
}) {
    return (
        <ul className={`divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs ${className}`}>
            {items.map((item, idx) => {
                const Content = (
                    <div className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-3.5 min-w-0">
                            {item.avatar && <div className="shrink-0">{item.avatar}</div>}
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                    {item.title}
                                </p>
                                {item.subtitle && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                        {item.subtitle}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            {item.badge && <div>{item.badge}</div>}
                            {item.meta && (
                                <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
                                    {item.meta}
                                </span>
                            )}
                            {(item.href || item.onClick) && (
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            )}
                        </div>
                    </div>
                );

                return (
                    <li key={item.id || idx}>
                        {item.href ? (
                            <Link href={item.href} className="block">
                                {Content}
                            </Link>
                        ) : item.onClick ? (
                            <button
                                type="button"
                                onClick={item.onClick}
                                className="w-full text-left block"
                            >
                                {Content}
                            </button>
                        ) : (
                            Content
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
