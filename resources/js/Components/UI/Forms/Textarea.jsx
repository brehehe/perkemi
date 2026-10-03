import FormLabel from './FormLabel';

export default function Textarea({
    label = null,
    error = null,
    hint = null,
    required = false,
    rows = 4,
    className = '',
    containerClassName = 'w-full',
    labelClassName = '',
    id,
    ...props
}) {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
        <div className={`${containerClassName} space-y-1.5`}>
            {label && (
                <FormLabel htmlFor={textareaId} required={required} className={labelClassName}>{label}</FormLabel>
            )}

            <div className="relative rounded-xl shadow-xs">
                <textarea
                    id={textareaId}
                    rows={rows}
                    required={required}
                    className={`w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm rounded-xl border transition-all duration-150 p-3 outline-none resize-y ${
                        error
                            ? 'border-rose-300 dark:border-rose-700 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                            : 'border-slate-200 dark:border-slate-800 focus:border-[#c0392b] focus:ring-2 focus:ring-[#c0392b]/20'
                    } disabled:bg-slate-50 dark:disabled:bg-slate-800/40 disabled:cursor-not-allowed ${className}`}
                    {...props}
                />
            </div>

            {error ? (
                <p className="text-xs text-rose-500 font-medium">{error}</p>
            ) : hint ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>
            ) : null}
        </div>
    );
}
