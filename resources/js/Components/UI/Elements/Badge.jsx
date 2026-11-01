export default function Badge({
    children,
    variant = 'gray', // gray, red, gold, green, blue, yellow, purple
    size = 'md', // sm, md, lg
    dot = false,
    className = '',
}) {
    const sizeStyles = {
        sm: 'text-[10px] px-2 py-0.5 gap-1',
        md: 'text-xs px-2.5 py-0.5 gap-1.5',
        lg: 'text-sm px-3 py-1 gap-2',
    };

    const variantStyles = {
        gray: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
        red: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 border-rose-200 dark:border-rose-800 font-bold',
        gold: 'bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-200 border-amber-300 dark:border-amber-700 font-bold shadow-2xs',
        green: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 font-bold',
        blue: 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200 border-blue-300 dark:border-blue-800 font-bold',
        yellow: 'bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-200 border-amber-300 dark:border-amber-700 font-bold shadow-2xs',
        purple: 'bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-200 border-purple-300 dark:border-purple-800 font-bold',
    };

    const dotColors = {
        gray: 'bg-slate-400',
        red: 'bg-rose-500',
        gold: 'bg-[#d4a843]',
        green: 'bg-emerald-500',
        blue: 'bg-blue-500',
        yellow: 'bg-amber-500',
        purple: 'bg-purple-500',
    };

    return (
        <span
            className={`inline-flex items-center font-medium border rounded-full select-none ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.gray} ${className}`}
        >
            {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant] || 'bg-current'}`} />}
            <span>{children}</span>
        </span>
    );
}
