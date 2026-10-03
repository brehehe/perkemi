import { useState, useRef, useEffect } from 'react';

export default function Dropdown({
    trigger,
    children,
    align = 'right', // left, right
    width = 'w-48',
    className = '',
}) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const alignStyles = {
        left: 'left-0 origin-top-left',
        right: 'right-0 origin-top-right',
    };

    return (
        <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
            <div onClick={() => setOpen(!open)}>{trigger}</div>

            {open && (
                <div
                    className={`absolute z-50 mt-2 ${width} ${alignStyles[align]} rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl focus:outline-none overflow-hidden animate-in fade-in zoom-in-95 duration-100`}
                >
                    <div className="py-1" onClick={() => setOpen(false)}>
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}

Dropdown.Item = function DropdownItem({
    children,
    href = null,
    onClick = null,
    icon = null,
    danger = false,
    className = '',
}) {
    const content = (
        <div
            className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs md:text-sm font-medium transition-colors cursor-pointer ${
                danger
                    ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            } ${className}`}
        >
            {icon && <span className="flex-shrink-0 text-slate-400 dark:text-slate-500">{icon}</span>}
            <span className="truncate">{children}</span>
        </div>
    );

    if (href) {
        return (
            <a href={href} className="block w-full">
                {content}
            </a>
        );
    }

    return (
        <button type="button" onClick={onClick} className="block w-full text-left">
            {content}
        </button>
    );
};

Dropdown.Divider = function DropdownDivider() {
    return <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />;
};

Dropdown.Header = function DropdownHeader({ children }) {
    return (
        <div className="px-4 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {children}
        </div>
    );
};
