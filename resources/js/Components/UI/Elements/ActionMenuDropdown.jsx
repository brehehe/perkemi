import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@inertiajs/react';

export default function ActionMenuDropdown({
    label = 'Menu Aksi',
    icon = <i className="fa-solid fa-ellipsis-vertical" aria-hidden="true" />,
    items = [],
    trigger = null,
    theme = 'dark', // 'dark', 'gold', 'light', 'glass'
    align = 'right',
    width = 'w-64 sm:w-72',
    menuHeader = 'Pilihan Aksi',
    badge = null,
    className = '',
    children = null,
}) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const [coords, setCoords] = useState(null);

    const updatePosition = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const menuWidth = Math.min(288, window.innerWidth - 24);
        const GAP = 8;

        const belowSpace = window.innerHeight - rect.bottom - GAP;
        const placeAbove = belowSpace < 220 && rect.top > belowSpace;

        let left = align === 'left' ? rect.left : rect.right - menuWidth;
        left = Math.max(12, Math.min(left, window.innerWidth - menuWidth - 12));

        setCoords({
            left,
            width: menuWidth,
            top: placeAbove ? undefined : rect.bottom + GAP,
            bottom: placeAbove ? window.innerHeight - rect.top + GAP : undefined,
        });
    };

    useLayoutEffect(() => {
        if (!open) return undefined;
        updatePosition();

        let frame = 0;
        const scheduleUpdate = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(updatePosition);
        };

        window.addEventListener('resize', scheduleUpdate);
        window.addEventListener('scroll', scheduleUpdate, true);
        window.visualViewport?.addEventListener('resize', scheduleUpdate);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', scheduleUpdate);
            window.removeEventListener('scroll', scheduleUpdate, true);
            window.visualViewport?.removeEventListener('resize', scheduleUpdate);
        };
    }, [open, align]);

    useEffect(() => {
        if (!open) return undefined;

        const handleClickOutside = (event) => {
            if (
                triggerRef.current &&
                !triggerRef.current.contains(event.target) &&
                menuRef.current &&
                !menuRef.current.contains(event.target)
            ) {
                setOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    const themeTriggerStyles = {
        dark: 'bg-[#1e1b18] hover:bg-[#2a2622] text-[#f7f4ef] border border-white/15 shadow-sm focus-visible:ring-amber-500/50',
        gold: 'bg-gradient-to-r from-[#d4a843] to-[#c39735] hover:from-[#c39735] hover:to-[#b08627] text-[#0f0d0b] font-bold border border-[#d4a843]/60 shadow-md focus-visible:ring-amber-600/50',
        glass: 'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md shadow-sm focus-visible:ring-white/50',
        light: 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-xs focus-visible:ring-slate-400',
    };

    const dropdownContent = open && coords && typeof document !== 'undefined' ? (
        createPortal(
            <div
                ref={menuRef}
                style={{
                    position: 'fixed',
                    top: coords.top,
                    bottom: coords.bottom,
                    left: coords.left,
                    width: coords.width,
                    zIndex: 9999,
                }}
                className="rounded-2xl bg-white dark:bg-[#181512] border border-slate-200/90 dark:border-white/10 shadow-2xl focus:outline-none overflow-hidden animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/10"
            >
                {menuHeader && (
                    <div className="px-4 pt-3 pb-2 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest font-sans">
                            {menuHeader}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#d4a843] animate-pulse"></span>
                    </div>
                )}

                <div className="p-1.5 space-y-0.5 max-h-[80vh] overflow-y-auto" onClick={() => setOpen(false)}>
                    {children ||
                        items.map((item, index) => {
                            if (item.divider) {
                                return <div key={`div-${index}`} className="h-px bg-slate-100 dark:bg-white/5 my-1" />;
                            }

                            return (
                                <ActionMenuDropdown.Item
                                    key={item.id || item.label || index}
                                    href={item.href}
                                    onClick={item.onClick}
                                    icon={item.icon}
                                    isLink={item.isLink}
                                    download={item.download}
                                    disabled={item.disabled}
                                    tone={item.tone}
                                    badge={item.badge}
                                    description={item.description}
                                >
                                    {item.label}
                                </ActionMenuDropdown.Item>
                            );
                        })}
                </div>
            </div>,
            document.body
        )
    ) : null;

    return (
        <div className={`relative inline-block text-left ${className}`} ref={triggerRef}>
            {trigger ? (
                <div onClick={() => setOpen((prev) => !prev)} role="button" tabIndex={0}>
                    {trigger}
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setOpen((prev) => !prev)}
                    aria-expanded={open}
                    aria-haspopup="true"
                    className={`group inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 cursor-pointer select-none focus:outline-none focus-visible:ring-2 active:scale-95 ${themeTriggerStyles[theme] || themeTriggerStyles.dark}`}
                >
                    <span className="flex items-center justify-center text-sm">{icon}</span>
                    <span className="tracking-tight">{label}</span>
                    {badge && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white/20 text-white">
                            {badge}
                        </span>
                    )}
                    <i
                        className={`fa-solid fa-chevron-down text-[10px] opacity-70 transition-transform duration-200 ${
                            open ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                    />
                </button>
            )}

            {dropdownContent}
        </div>
    );
}

ActionMenuDropdown.Item = function ActionMenuItem({
    children,
    href = null,
    onClick = null,
    icon = null,
    isLink = false,
    download = false,
    disabled = false,
    tone = 'default', // 'default', 'emerald', 'gold', 'rose', 'blue'
    badge = null,
    description = null,
    className = '',
}) {
    const toneStyles = {
        default: 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/5',
        emerald: 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20',
        gold: 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20',
        rose: 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20',
        blue: 'text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20',
    };

    const iconBgStyles = {
        default: 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300',
        emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
        gold: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
        rose: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
        blue: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
    };

    const content = (
        <div
            className={`w-full flex items-start gap-3 p-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
                disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
            } ${toneStyles[tone] || toneStyles.default} ${className}`}
        >
            {icon && (
                <div
                    className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs mt-0.5 transition-transform duration-150 group-hover:scale-105 ${
                        iconBgStyles[tone] || iconBgStyles.default
                    }`}
                >
                    {icon}
                </div>
            )}
            <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold leading-snug truncate">{children}</span>
                    {badge && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                            {badge}
                        </span>
                    )}
                </div>
                {description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 line-clamp-2 font-normal">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );

    if (disabled) {
        return <div className="block w-full">{content}</div>;
    }

    if (href && isLink) {
        return (
            <Link href={href} className="block w-full group">
                {content}
            </Link>
        );
    }

    if (href) {
        return (
            <a href={href} download={download ? true : undefined} className="block w-full group">
                {content}
            </a>
        );
    }

    return (
        <button type="button" onClick={onClick} className="block w-full text-left group">
            {content}
        </button>
    );
};

ActionMenuDropdown.Header = function ActionMenuHeader({ children }) {
    return (
        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider font-sans">
            {children}
        </div>
    );
};

ActionMenuDropdown.Divider = function ActionMenuDivider() {
    return <div className="h-px bg-slate-100 dark:bg-white/5 my-1" />;
};
