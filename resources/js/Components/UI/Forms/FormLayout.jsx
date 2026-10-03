export default function FormLayout({
    title = null,
    description = null,
    children,
    actions = null,
    onSubmit,
    className = '',
}) {
    return (
        <form
            onSubmit={onSubmit}
            className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden ${className}`}
        >
            {(title || description) && (
                <div className="p-6 border-b border-slate-100 dark:border-slate-800/80">
                    {title && (
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                            {title}
                        </h3>
                    )}
                    {description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {description}
                        </p>
                    )}
                </div>
            )}

            <div className="p-6 space-y-6">{children}</div>

            {actions && (
                <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                    {actions}
                </div>
            )}
        </form>
    );
}

FormLayout.Section = function FormLayoutSection({
    title,
    description,
    children,
    columns = 2,
    className = '',
}) {
    const colClasses = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {(title || description) && (
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    {title && (
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                            {title}
                        </h4>
                    )}
                    {description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {description}
                        </p>
                    )}
                </div>
            )}
            <div className={`grid ${colClasses[columns] || 'grid-cols-1 md:grid-cols-2'} gap-4`}>
                {children}
            </div>
        </div>
    );
};
