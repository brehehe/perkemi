import FormLabel from './FormLabel';

export default function Input({
    label = null,
    type = 'text',
    error = null,
    hint = null,
    required = false,
    iconLeft = null,
    iconRight = null,
    clearable = false,
    onClear,
    className = '',
    containerClassName = 'w-full',
    labelClassName = '',
    id,
    size = 'md', // 'sm' | 'md'
    ...props
}) {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
        <div className={`${containerClassName} space-y-1.5`}>
            {label && (
                <FormLabel htmlFor={inputId} required={required} className={labelClassName}>{label}</FormLabel>
            )}

            <div className="relative rounded-xl shadow-xs">
                {iconLeft && (
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 text-sm">
                        {iconLeft}
                    </div>
                )}

                <input
                    id={inputId}
                    type={type}
                    required={required}
                    className={`w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl border transition-all duration-150 outline-none ${
                        size === 'sm' ? 'min-h-9 py-1.5 text-xs' : 'min-h-11 py-2.5 text-sm'
                    } ${
                        iconLeft ? 'pl-10' : 'pl-3.5'
                    } ${iconRight || (clearable && props.value) ? 'pr-10' : 'pr-3.5'} ${
                        error
                            ? 'border-rose-300 dark:border-rose-700 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                            : 'border-slate-200 dark:border-slate-800 focus:border-[#c0392b] focus:ring-2 focus:ring-[#c0392b]/20'
                    } disabled:bg-slate-50 dark:disabled:bg-slate-800/40 disabled:cursor-not-allowed ${className}`}
                    {...props}
                />

                {clearable && props.value && !props.disabled ? (
                    <button
                        type="button"
                        aria-label={`Hapus ${label || 'isian'}`}
                        onClick={onClear}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-[#c0392b] focus-visible:outline-2 focus-visible:outline-[#c0392b]"
                    >
                        <i className="fa-solid fa-xmark text-xs" aria-hidden="true" />
                    </button>
                ) : iconRight && (
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-slate-500 text-sm">
                        {iconRight}
                    </div>
                )}
            </div>

            {error ? (
                <p className="text-xs text-rose-500 font-medium">{error}</p>
            ) : hint ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>
            ) : null}
        </div>
    );
}
