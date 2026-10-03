export default function Checkbox({
    label = null,
    description = null,
    error = null,
    checked = false,
    onChange,
    disabled = false,
    className = '',
    id,
    ...props
}) {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
        <div className="space-y-1">
            <label
                htmlFor={inputId}
                className={`flex items-start gap-3 cursor-pointer select-none ${
                    disabled ? 'opacity-50 cursor-not-allowed' : ''
                } ${className}`}
            >
                <div className="relative flex items-center pt-0.5">
                    <input
                        id={inputId}
                        type="checkbox"
                        checked={checked}
                        onChange={onChange}
                        disabled={disabled}
                        className="peer sr-only"
                        {...props}
                    />
                    <div className="w-5 h-5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 peer-checked:bg-[#c0392b] peer-checked:border-[#c0392b] peer-focus:ring-2 peer-focus:ring-[#c0392b]/20 transition-all duration-150 flex items-center justify-center">
                        <svg
                            className={`w-3.5 h-3.5 text-white stroke-[2.5] transition-transform duration-150 ${
                                checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>

                {(label || description) && (
                    <div className="text-sm">
                        {label && (
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                                {label}
                            </span>
                        )}
                        {description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {description}
                            </p>
                        )}
                    </div>
                )}
            </label>

            {error && <p className="text-xs text-rose-500 font-medium pl-8">{error}</p>}
        </div>
    );
}
