export default function Toggle({
    label = null,
    description = null,
    checked = false,
    onChange,
    disabled = false,
    size = 'md', // 'sm' | 'md' | 'lg'
    className = '',
    id,
    ...props
}) {
    const toggleId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const sizes = {
        sm: {
            switch: 'w-8 h-4',
            dot: 'w-3 h-3 translate-x-0.5 peer-checked:translate-x-4',
        },
        md: {
            switch: 'w-11 h-6',
            dot: 'w-5 h-5 translate-x-0.5 peer-checked:translate-x-5',
        },
        lg: {
            switch: 'w-14 h-7',
            dot: 'w-6 h-6 translate-x-0.5 peer-checked:translate-x-7',
        },
    };

    const currentSize = sizes[size] || sizes.md;

    return (
        <label
            htmlFor={toggleId}
            className={`flex items-start justify-between gap-4 cursor-pointer select-none ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
            } ${className}`}
        >
            {(label || description) && (
                <div className="flex-1">
                    {label && (
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
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

            <div className="relative inline-flex items-center">
                <input
                    id={toggleId}
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange && onChange(e.target.checked)}
                    disabled={disabled}
                    className="peer sr-only"
                    {...props}
                />
                <div
                    className={`${currentSize.switch} bg-slate-200 dark:bg-slate-700 peer-checked:bg-[#c0392b] rounded-full transition-colors duration-200 focus:outline-none peer-focus:ring-2 peer-focus:ring-[#c0392b]/30`}
                />
                <div
                    className={`absolute left-0 bg-white rounded-full shadow-sm transition-transform duration-200 ${currentSize.dot}`}
                />
            </div>
        </label>
    );
}
