import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const GAP = 6;

export default function FloatingDropdown({ open, anchorRef, popupRef, children, className = '', maxHeight = 240, id, role }) {
    const [position, setPosition] = useState(null);

    useLayoutEffect(() => {
        if (!open) return undefined;

        let frame = 0;
        const updatePosition = () => {
            const anchor = anchorRef.current;
            if (!anchor) return;

            const rect = anchor.getBoundingClientRect();
            const below = window.innerHeight - rect.bottom - GAP - 8;
            const above = rect.top - GAP - 8;
            const placeAbove = below < Math.min(maxHeight, 160) && above > below;
            const available = Math.max(48, placeAbove ? above : below);
            const width = Math.min(rect.width, window.innerWidth - 16);

            setPosition({
                left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
                width,
                maxHeight: Math.min(maxHeight, available),
                ...(placeAbove ? { bottom: window.innerHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
            });
        };
        const scheduleUpdate = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(updatePosition);
        };

        updatePosition();
        window.addEventListener('resize', scheduleUpdate);
        window.addEventListener('scroll', scheduleUpdate, true);
        window.visualViewport?.addEventListener('resize', scheduleUpdate);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', scheduleUpdate);
            window.removeEventListener('scroll', scheduleUpdate, true);
            window.visualViewport?.removeEventListener('resize', scheduleUpdate);
        };
    }, [open, anchorRef, maxHeight]);

    if (!open || !position || typeof document === 'undefined') return null;

    return createPortal(
        <div id={id} role={role} ref={popupRef} className={className}
            style={{ position: 'fixed', zIndex: 1000, overflowY: 'auto', ...position }}>
            {children}
        </div>,
        document.body,
    );
}
