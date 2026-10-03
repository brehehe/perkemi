export default function ButtonGroup({ children, className = '' }) {
    return (
        <div className={`max-w-full overflow-x-auto overscroll-x-contain rounded-xl ${className}`}>
            <div className="isolate inline-flex min-w-max overflow-hidden rounded-xl border border-slate-200 shadow-xs dark:border-slate-800">
                {children}
            </div>
        </div>
    );
}
