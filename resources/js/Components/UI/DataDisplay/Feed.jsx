export default function Feed({
    items = [], // Array of { id, title, description, timestamp, icon, iconBg, author }
    className = '',
}) {
    return (
        <div className={`flow-root ${className}`}>
            <ul className="-mb-8">
                {items.map((item, idx) => {
                    const isLast = idx === items.length - 1;

                    return (
                        <li key={item.id || idx}>
                            <div className="relative pb-8">
                                {/* Connector line */}
                                {!isLast && (
                                    <span
                                        className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200 dark:bg-slate-800"
                                        aria-hidden="true"
                                    />
                                )}

                                <div className="relative flex items-start space-x-3">
                                    {/* Icon */}
                                    <div>
                                        <div
                                            className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-900 ${
                                                item.iconBg || 'bg-[#c0392b] text-white'
                                            }`}
                                        >
                                            {item.icon || (
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="min-w-0 flex-1 pt-0.5">
                                        <div className="flex justify-between items-baseline gap-2">
                                            <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                                {item.author && <span className="font-bold mr-1">{item.author}</span>}
                                                {item.title}
                                            </p>
                                            {item.timestamp && (
                                                <time className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                                    {item.timestamp}
                                                </time>
                                            )}
                                        </div>

                                        {item.description && (
                                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                {item.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
