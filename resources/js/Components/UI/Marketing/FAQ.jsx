import Button from "@/Components/UI/Elements/Button";
import { useState } from 'react';

export default function FAQ({
    badge = 'FAQ',
    title = 'Pertanyaan yang Sering Diajukan',
    description = 'Informasi seputar pendaftaran kontingen, regulasi pertandingan, timbangan badan, dan sertifikat.',
    items = [],
    className = '',
}) {
    const [openIndex, setOpenIndex] = useState(null);

    const toggle = (idx) => {
        setOpenIndex(openIndex === idx ? null : idx);
    };

    return (
        <section className={`py-16 ${className}`}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                {/* Header */}
                <div className="text-center mb-12">
                    {badge && (
                        <p className="text-xs font-bold text-[#c0392b] dark:text-[#f0c060] uppercase tracking-wider mb-2">
                            {badge}
                        </p>
                    )}
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {title}
                    </h2>
                    {description && (
                        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                            {description}
                        </p>
                    )}
                </div>

                {/* Accordion list */}
                <div className="space-y-3">
                    {items.map((item, idx) => {
                        const isOpen = openIndex === idx;
                        return (
                            <div
                                key={idx}
                                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all shadow-xs"
                            >
                                <Button variant="unstyled" size="none"
                                    type="button"
                                    onClick={() => toggle(idx)}
                                    className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                >
                                    <span className="text-sm font-bold text-slate-900 dark:text-white pr-4">
                                        {item.question}
                                    </span>
                                    <svg
                                        className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                                            isOpen ? 'rotate-180 text-[#c0392b]' : ''
                                        }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </Button>

                                {isOpen && (
                                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
                                        {item.answer}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
