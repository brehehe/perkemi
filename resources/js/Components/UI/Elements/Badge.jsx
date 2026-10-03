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
        gray: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        red: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        gold: 'bg-[#d4a843]/15 text-[#b8860b] dark:bg-[#d4a843]/20 dark:text-[#f5d77f] border-[#d4a843]/30',
        green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        yellow: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        purple: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
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
