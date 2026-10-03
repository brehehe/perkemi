export function RequiredMark() {
    return (
        <>
            <span aria-hidden="true" className="text-rose-500 dark:text-rose-400">*</span>
            <span className="sr-only"> (wajib)</span>
        </>
    );
}

export default function FormLabel({ htmlFor, required = false, className = '', children, ...props }) {
    return (
        <label
            htmlFor={htmlFor}
            className={`block text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200 ${className}`}
            {...props}
        >
            {children} {required && <RequiredMark />}
        </label>
    );
}
