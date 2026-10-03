export default function RadioGroup({
    label = null,
    error = null,
    options = [],
    value,
    onChange,
    name,
    variant = 'list', // 'list' | 'cards' | 'inline'
    disabled = false,
    className = '',
}) {
    const groupName = name || (label ? label.toLowerCase().replace(/\s+/g, '-') : 'radio-group');

    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 tracking-wide uppercase">
                    {label}
                </label>
            )}

            <div
                className={
                    variant === 'cards'
                        ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
                        : variant === 'inline'
                        ? 'flex flex-wrap gap-4'
                        : 'space-y-2'
                }
            >
                {options.map((option, idx) => {
                    const isObj = typeof option === 'object' && option !== null;
                    const optVal = isObj ? option.value : option;
                    const optLabel = isObj ? option.label || option.name || option.value : option;
                    const optDesc = isObj ? option.description : null;
                    const optIcon = isObj ? option.icon : null;
                    const isChecked = value === optVal;
                    const optDisabled = disabled || (isObj && option.disabled);

                    if (variant === 'cards') {
                        return (
                            <label
                                key={idx}
                                className={`relative flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                                    optDisabled ? 'opacity-50 cursor-not-allowed' : ''
                                } ${
                                    isChecked
                                        ? 'border-[#c0392b] bg-[#c0392b]/5 dark:bg-[#c0392b]/10 shadow-xs'
                                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name={groupName}
                                    value={optVal}
                                    checked={isChecked}
                                    onChange={() => !optDisabled && onChange && onChange(optVal)}
                                    disabled={optDisabled}
                                    className="sr-only"
                                />
                                <div className="mt-0.5 w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center">
                                    {isChecked && <div className="w-2 h-2 rounded-full bg-[#c0392b]" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        {optIcon && <span>{optIcon}</span>}
                                        <span className={`text-sm font-medium ${isChecked ? 'text-[#c0392b] dark:text-[#f0c060]' : 'text-slate-800 dark:text-slate-200'}`}>
                                            {optLabel}
                                        </span>
                                    </div>
                                    {optDesc && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            {optDesc}
                                        </p>
                                    )}
                                </div>
                            </label>
                        );
                    }

                    return (
                        <label
                            key={idx}
                            className={`flex items-start gap-3 cursor-pointer select-none ${
                                optDisabled ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            <input
                                type="radio"
                                name={groupName}
                                value={optVal}
                                checked={isChecked}
                                onChange={() => !optDisabled && onChange && onChange(optVal)}
                                disabled={optDisabled}
                                className="sr-only"
                            />
                            <div className="mt-0.5 w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center transition-colors">
                                {isChecked && <div className="w-2 h-2 rounded-full bg-[#c0392b]" />}
                            </div>
                            <div>
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                    {optLabel}
                                </span>
                                {optDesc && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {optDesc}
                                    </p>
                                )}
                            </div>
                        </label>
                    );
                })}
            </div>

            {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
        </div>
    );
}
