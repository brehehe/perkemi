export default function ListContainer({ children, divided = true, className = '' }) {
    return (
        <div
            className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs ${className}`}
        >
            <ul className={divided ? 'divide-y divide-slate-100 dark:divide-slate-800' : ''}>
                {children}
            </ul>
        </div>
    );
}

ListContainer.Item = function ListContainerItem({ children, onClick = null, className = '' }) {
    return (
        <li
            onClick={onClick}
            className={`px-5 py-4 flex items-center justify-between gap-4 transition-colors ${
                onClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60' : ''
            } ${className}`}
        >
            {children}
        </li>
    );
};
