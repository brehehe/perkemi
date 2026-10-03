export default function GridList({
    items = [],
    columns = 3, // 2 | 3 | 4
    className = '',
}) {
    const colClasses = {
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    };

    return (
        <div className={`grid ${colClasses[columns] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'} gap-4 ${className}`}>
            {items.map((item, idx) => (
                <div
                    key={item.id || idx}
                    className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-start justify-between gap-3">
                            {item.icon || item.avatar ? (
                                <div className="shrink-0 mb-3">{item.icon || item.avatar}</div>
                            ) : null}
                            {item.badge && <div>{item.badge}</div>}
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {item.title}
                        </h4>

                        {item.subtitle && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                {item.subtitle}
                            </p>
                        )}
                    </div>

                    {item.actions && (
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                            {item.actions}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
