export default function Avatar({
    src = null,
    alt = '',
    name = '',
    size = 'md', // xs, sm, md, lg, xl
    status = null, // online, offline, busy, away
    className = '',
}) {
    const sizeStyles = {
        xs: 'w-6 h-6 text-[10px]',
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-lg',
    };

    const statusSizes = {
        xs: 'w-1.5 h-1.5',
        sm: 'w-2 h-2',
        md: 'w-2.5 h-2.5',
        lg: 'w-3 h-3',
        xl: 'w-4 h-4',
    };

    const statusColors = {
        online: 'bg-emerald-500',
        offline: 'bg-slate-400',
        busy: 'bg-rose-500',
        away: 'bg-amber-500',
    };

    const initials = name
        ? name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
        : 'SK';

    return (
        <div className={`relative inline-block flex-shrink-0 ${className}`}>
            <div
                className={`rounded-full overflow-hidden flex items-center justify-center font-bold text-white shadow-xs ${sizeStyles[size] || sizeStyles.md}`}
                style={{
                    background: src ? 'transparent' : 'linear-gradient(135deg, #c0392b, #96281b)',
                }}
            >
                {src ? (
                    <img src={src} alt={alt || name} className="w-full h-full object-cover" />
                ) : (
                    <span>{initials}</span>
                )}
            </div>

            {status && (
                <span
                    className={`absolute bottom-0 right-0 rounded-full ring-2 ring-white dark:ring-slate-900 ${statusColors[status] || 'bg-slate-400'} ${statusSizes[size] || statusSizes.md}`}
                />
            )}
        </div>
    );
}
