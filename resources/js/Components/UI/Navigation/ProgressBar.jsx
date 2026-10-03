export default function ProgressBar({
    value = 0,
    max = 100,
    showLabel = false,
    label = null,
    variant = 'primary', // 'primary' | 'gold' | 'success' | 'info'
    size = 'md', // 'sm' | 'md' | 'lg'
    className = '',
}) {
    const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

    const variants = {
        primary: 'bg-[#c0392b]',
        gold: 'bg-gradient-to-r from-[#d4a843] to-[#f0c060]',
        success: 'bg-emerald-500',
        info: 'bg-blue-500',
    };

    const sizes = {
        sm: 'h-1.5',
        md: 'h-2.5',
        lg: 'h-4',
    };

    return (
        <div className={`w-full space-y-1 ${className}`}>
            {(showLabel || label) && (
                <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <span>{label || 'Kemajuan'}</span>
                    <span>{percentage}%</span>
                </div>
            )}

            <div className={`w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ${sizes[size] || sizes.md}`}>
                <div
                    className={`${sizes[size] || sizes.md} ${variants[variant] || variants.primary} rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                />
            </div>
        </div>
    );
}
