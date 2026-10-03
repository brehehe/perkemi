export default function Divider({
    label = null,
    gold = false,
    className = '',
}) {
    if (!label) {
        return (
            <hr
                className={`border-0 h-px ${
                    gold
                        ? 'bg-gradient-to-r from-transparent via-[#d4a843]/60 to-transparent'
                        : 'bg-slate-200 dark:bg-slate-800'
                } my-6 ${className}`}
            />
        );
    }

    return (
        <div className={`relative flex items-center justify-center my-6 ${className}`}>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span
                className={`px-3 text-[11px] font-semibold uppercase tracking-wider ${
                    gold ? 'text-[#d4a843]' : 'text-slate-400 dark:text-slate-500'
                }`}
            >
                {label}
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
        </div>
    );
}
