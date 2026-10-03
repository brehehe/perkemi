export default function DescriptionList({
    items = [],
    columns = 2, // 1 | 2 | 3
    striped = false,
    className = '',
}) {
    const colClasses = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    };

    if (striped) {
        return (
            <div className={`rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 ${className}`}>
                {items.map((item, idx) => (
                    <div
                        key={idx}
                        className={`px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs sm:text-sm ${
                            idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-800/30'
                        }`}
                    >
                        <dt className="font-semibold text-slate-500 dark:text-slate-400 sm:w-1/3">
                            {item.label}
                        </dt>
                        <dd className="font-medium text-slate-900 dark:text-white sm:w-2/3 text-left sm:text-right">
                            {item.value || '-'}
                        </dd>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <dl className={`grid ${colClasses[columns] || 'grid-cols-1 sm:grid-cols-2'} gap-4 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs ${className}`}>
            {items.map((item, idx) => (
                <div key={idx} className="space-y-1">
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {item.label}
                    </dt>
                    <dd className="text-sm font-semibold text-slate-800 dark:text-white">
                        {item.value || '-'}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
