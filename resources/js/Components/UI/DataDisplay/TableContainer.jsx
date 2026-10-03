export default function TableContainer({ children, className = '', ariaLabel = 'Tabel data', ...props }) {
    return (
        <div
            className={`responsive-table-container ${className}`.trim()}
            role="region"
            aria-label={ariaLabel}
            tabIndex={0}
            {...props}
        >
            {children}
        </div>
    );
}
