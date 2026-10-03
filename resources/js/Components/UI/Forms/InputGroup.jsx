import FormLabel from './FormLabel';

export default function InputGroup({
    label = null,
    prefix = null,
    suffix = null,
    error = null,
    required = false,
    className = '',
    ...props
}) {
    return (
        <div className="w-full space-y-1.5">
            {label && (
                <FormLabel required={required}>{label}</FormLabel>
            )}

            <div className="flex min-h-11 rounded-xl shadow-xs overflow-hidden border border-slate-200 dark:border-slate-800 focus-within:border-[#c0392b] focus-within:ring-2 focus-within:ring-[#c0392b]/20 bg-white dark:bg-slate-900">
                {prefix && (
                    <span className="inline-flex items-center px-3.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs sm:text-sm border-r border-slate-200 dark:border-slate-800 font-medium select-none">
                        {prefix}
                    </span>
                )}

                <input
                    required={required}
                    className={`flex-1 bg-transparent px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none ${className}`}
                    {...props}
                />

                {suffix && (
                    <span className="inline-flex items-center px-3.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs sm:text-sm border-l border-slate-200 dark:border-slate-800 font-medium select-none">
                        {suffix}
                    </span>
                )}
            </div>

            {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
        </div>
    );
}
