export default function PageHeading({
    title,
    subtitle = null,
    badge = null,
    breadcrumb = null,
    actions = null,
    className = '',
}) {
    return (
        <div className={`space-y-2 mb-6 ${className}`}>
            {breadcrumb && <div className="mb-2">{breadcrumb}</div>}

            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-pretty text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl lg:text-3xl">
                            {title}
                        </h1>
                        {badge && <div>{badge}</div>}
                    </div>

                    {subtitle && (
                        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
                            {subtitle}
                        </p>
                    )}
                </div>

                {actions && (
                    <div className="flex w-full flex-wrap items-center gap-2.5 md:w-auto md:shrink-0 [&>button]:flex-1 sm:[&>button]:flex-none">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
}
