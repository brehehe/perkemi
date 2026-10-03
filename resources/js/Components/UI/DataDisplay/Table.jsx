import TableContainer from './TableContainer';

export default function Table({
    columns = [],
    data = [],
    keyExtractor = (item, idx) => item.id || idx,
    isLoading = false,
    emptyMessage = 'Tidak ada data untuk ditampilkan.',
    striped = false,
    hoverable = true,
    className = '',
}) {
    return (
        <div className={`w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs ${className}`}>
            <TableContainer>
                <table className="responsive-data-table whitespace-nowrap text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    scope="col"
                                    className={`py-3 px-4 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${
                                        col.headerClassName || ''
                                    }`}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs sm:text-sm">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, rIdx) => (
                                <tr key={rIdx} className="animate-pulse">
                                    {columns.map((_, cIdx) => (
                                        <td key={cIdx} className="py-3.5 px-4">
                                            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : data.length > 0 ? (
                            data.map((row, rIdx) => {
                                const isEven = rIdx % 2 === 1;
                                return (
                                    <tr
                                        key={keyExtractor(row, rIdx)}
                                        className={`transition-colors ${
                                            striped && isEven ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''
                                        } ${hoverable ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''}`}
                                    >
                                        {columns.map((col, cIdx) => (
                                            <td
                                                key={cIdx}
                                                className={`py-3 px-4 text-slate-700 dark:text-slate-300 ${
                                                    col.nowrap !== false ? 'whitespace-nowrap' : ''
                                                } ${
                                                    col.align === 'right'
                                                        ? 'text-right'
                                                        : col.align === 'center'
                                                        ? 'text-center'
                                                        : 'text-left'
                                                } ${col.cellClassName || ''}`}
                                            >
                                                {typeof col.render === 'function'
                                                    ? col.render(row, rIdx)
                                                    : col.accessor
                                                    ? row[col.accessor]
                                                    : null}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </TableContainer>
        </div>
    );
}

Table.Th = function TableTh({ children, className = '' }) {
    return (
        <th className={`whitespace-nowrap py-3 px-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 ${className}`}>
            {children}
        </th>
    );
};

Table.Td = function TableTd({ children, className = '' }) {
    return (
        <td className={`whitespace-nowrap py-3 px-4 text-xs text-slate-700 dark:text-slate-300 ${className}`}>
            {children}
        </td>
    );
};
