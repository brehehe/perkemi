export default function Button({
    type = 'button',
    variant = 'primary', // primary, secondary, outline, ghost, danger, gold, dark, unstyled
    size = 'md', // none, xs, sm, md, lg
    loading = false,
    disabled = false,
    iconLeft = null,
    iconRight = null,
    className = '',
    children,
    ...props
}) {
    const baseStyles =
        'inline-flex touch-manipulation items-center justify-center font-semibold transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-200 cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

    const sizeStyles = {
        none: '',
        xs: 'min-h-8 text-[11px] px-2.5 py-1 rounded-md gap-1.5',
        sm: 'min-h-9 text-xs px-3 py-1.5 rounded-lg gap-2',
        md: 'min-h-11 text-xs md:text-sm px-3.5 py-2.5 rounded-xl gap-2',
        lg: 'min-h-12 text-sm md:text-base px-5 py-3 rounded-xl gap-2.5',
    };

    const variantStyles = {
        unstyled: '',
        primary:
            'bg-[#c0392b] hover:bg-[#a82718] active:bg-[#8e1f13] text-white shadow-xs focus-visible:outline-[#c0392b]',
        secondary:
            'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 focus-visible:outline-slate-500',
        outline:
            'border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 focus-visible:outline-slate-400',
        ghost:
            'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 focus-visible:outline-slate-400',
        danger:
            'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs focus-visible:outline-rose-600',
        gold:
            'bg-[#d4a843] hover:bg-[#c39735] active:bg-[#b08627] text-slate-950 font-bold shadow-xs focus-visible:outline-[#d4a843]',
        dark:
            'bg-[#0f0d0b] hover:bg-[#25201b] active:bg-black text-white shadow-xs focus-visible:outline-[#0f0d0b]',
    };

    const isUnstyled = variant === 'unstyled';

    return (
        <button
            type={type}
            disabled={disabled || loading}
            className={`${isUnstyled ? '' : baseStyles} ${sizeStyles[size] ?? sizeStyles.md} ${variantStyles[variant] ?? variantStyles.primary} ${className}`}
            {...props}
        >
            {isUnstyled ? (
                children
            ) : (
                <>
                    {loading ? (
                        <i className="fa-solid fa-circle-notch animate-spin"></i>
                    ) : (
                        iconLeft && <span className="shrink-0">{iconLeft}</span>
                    )}
                    <span>{children}</span>
                    {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
                </>
            )}
        </button>
    );
}
