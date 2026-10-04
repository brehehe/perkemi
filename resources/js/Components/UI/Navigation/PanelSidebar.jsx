import { useEffect } from 'react';

export default function PanelSidebar({ children, isOpen, onClose, subtitle = 'Admin Panel · 2026' }) {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
        const handleResize = () => { if (window.innerWidth >= 1024) onClose(); };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', handleResize);
        };
    }, [isOpen, onClose]);

    return <>
        {isOpen && <button type="button" aria-label="Tutup navigasi" onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden" />}
        <aside className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col overflow-hidden bg-[#0f0d0b] text-[#f7f4ef] shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 bg-[radial-gradient(circle,rgba(192,57,43,0.35)_0%,transparent_70%)]" />
            <div className="relative flex shrink-0 items-center justify-between border-b border-white/10 p-6 pb-5">
                <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-cinzel text-xl font-bold text-[#d4a843]"
                        style={{ background: 'linear-gradient(135deg, #c0392b, #96281b)', boxShadow: '0 4px 20px rgba(192, 57, 43, 0.5)' }} aria-hidden="true">拳</div>
                    <div>
                        <p className="font-cinzel text-xs font-bold uppercase leading-snug tracking-widest text-white">Smart Perkemi</p>
                        <p className="mt-0.5 text-[9.5px] uppercase tracking-[0.14em] text-[#b5afa6]">{subtitle}</p>
                    </div>
                </div>
                <button type="button" onClick={onClose} aria-label="Tutup menu" className="p-1.5 text-lg text-white/60 hover:text-white lg:hidden">
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
            </div>
            {children}
        </aside>
    </>;
}
