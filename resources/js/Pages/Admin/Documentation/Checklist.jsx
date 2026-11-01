import AdminLayout from '@/Layouts/AdminLayout';
import Modal from '@/Components/UI/Overlays/Modal';
import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';

export default function Checklist({
    markdownContent = '',
    stats = {
        total: 147,
        ready: 110,
        partial: 10,
        gap: 27,
        readyPercentage: 75,
        coreReadyPercentage: 95,
    },
    phases = [],
    categories = [],
    recentChanges = [],
    sampleEvent = null,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all'); // 'all', 'ready', 'partial', 'gap'
    const [selectedPhase, setSelectedPhase] = useState('all'); // 'all', 1, 2, 3, 4, 5, 6
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [activeTab, setActiveTab] = useState('interactive'); // 'interactive' | 'phases' | 'changes' | 'markdown'
    const [changeSearchQuery, setChangeSearchQuery] = useState('');
    const [selectedChangeCategory, setSelectedChangeCategory] = useState('all');
    const [copied, setCopied] = useState(false);
    const [gapModalItem, setGapModalItem] = useState(null);
    const [copiedModal, setCopiedModal] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState(() => [1, 2, 3, 4, 5, 6]);

    const activeEventId = sampleEvent?.id || '01a1019a-bd63-7007-9dcd-ac139687e38b';
    const activeEventSlug = sampleEvent?.slug || 'popda-xv-jawa-timur-2026';
    const activeEventName = sampleEvent?.name || 'POPDA XV Provinsi Jawa Timur 2026 — Shorinji Kempo';

    // Auto-resolve dynamic URL placeholders and inject active event_id where appropriate
    const resolveUrl = (urlPattern) => {
        if (!urlPattern) return null;
        let resolved = urlPattern;
        resolved = resolved.replace(/\{id\}/g, activeEventId);
        resolved = resolved.replace(/\{slug\}/g, activeEventSlug);
        resolved = resolved.replace(/\{eventCourt\}/g, '1');

        // Automatically inject event_id query parameter for event-dependent admin routes if missing
        const needsEventParam =
            resolved.startsWith('/admin/pertandingan/') ||
            resolved.startsWith('/admin/pendaftaran/verifikasi') ||
            resolved.startsWith('/admin/laporan');

        if (needsEventParam && !resolved.includes('event_id=')) {
            const separator = resolved.includes('?') ? '&' : '?';
            resolved = `${resolved}${separator}event_id=${activeEventId}`;
        }

        return resolved;
    };

    // Calculate aggregated stats for each of the 6 phases
    const phaseStats = useMemo(() => {
        const statsMap = {};
        phases.forEach((p) => {
            statsMap[p.id] = {
                ...p,
                total: 0,
                ready: 0,
                partial: 0,
                gap: 0,
                percentage: 0,
            };
        });

        categories.forEach((cat) => {
            const pId = cat.phase_id;
            if (statsMap[pId]) {
                cat.items.forEach((item) => {
                    const weight = item.no === '1-16' ? 16 : (item.no === '1-4' ? 4 : 1);
                    statsMap[pId].total += weight;
                    if (item.status === 'ready') statsMap[pId].ready += weight;
                    else if (item.status === 'partial') statsMap[pId].partial += weight;
                    else if (item.status === 'gap') statsMap[pId].gap += weight;
                });
            }
        });

        Object.values(statsMap).forEach((st) => {
            st.percentage = st.total > 0 ? Math.round((st.ready / st.total) * 100) : 0;
        });

        return statsMap;
    }, [phases, categories]);

    // Calculate status counts scoped to the currently selected phase
    const statusCountsInPhase = useMemo(() => {
        let total = 0;
        let ready = 0;
        let partial = 0;
        let gap = 0;

        categories.forEach((cat) => {
            if (selectedPhase !== 'all' && cat.phase_id !== Number(selectedPhase)) {
                return;
            }
            cat.items.forEach((item) => {
                const weight = item.no === '1-16' ? 16 : (item.no === '1-4' ? 4 : 1);
                total += weight;
                if (item.status === 'ready') ready += weight;
                else if (item.status === 'partial') partial += weight;
                else if (item.status === 'gap') gap += weight;
            });
        });

        return { total, ready, partial, gap };
    }, [categories, selectedPhase]);

    // Categories filter options scoped to the selected phase
    const availableCategoriesForSelect = useMemo(() => {
        if (selectedPhase === 'all') return categories;
        return categories.filter((c) => c.phase_id === Number(selectedPhase));
    }, [categories, selectedPhase]);

    const changeCategories = useMemo(() => {
        const cats = new Set();
        recentChanges.forEach((c) => {
            if (c.category) cats.add(c.category);
        });
        return Array.from(cats);
    }, [recentChanges]);

    const filteredChanges = useMemo(() => {
        const q = changeSearchQuery.toLowerCase().trim();
        return recentChanges.filter((change) => {
            const matchCategory =
                selectedChangeCategory === 'all' || change.category === selectedChangeCategory;
            const matchQuery =
                !q ||
                change.title.toLowerCase().includes(q) ||
                change.description.toLowerCase().includes(q) ||
                change.menu.toLowerCase().includes(q) ||
                (change.url && change.url.toLowerCase().includes(q)) ||
                (change.badge && change.badge.toLowerCase().includes(q)) ||
                (change.highlights &&
                    change.highlights.some((h) => h.toLowerCase().includes(q))) ||
                (change.files_modified &&
                    change.files_modified.some((f) => f.toLowerCase().includes(q)));
            return matchCategory && matchQuery;
        });
    }, [recentChanges, changeSearchQuery, selectedChangeCategory]);

    const toggleCategoryExpand = (catId) => {
        setExpandedCategories((prev) =>
            prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
        );
    };

    const expandAll = () => {
        setExpandedCategories(categories.map((c) => c.id));
    };

    const collapseAll = () => {
        setExpandedCategories([]);
    };

    const handleCopyMarkdown = () => {
        if (!markdownContent) return;
        navigator.clipboard.writeText(markdownContent).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        });
    };

    const handleCopyModalContent = () => {
        if (!gapModalItem) return;
        const text = `[RENCANA FITUR BELUM DIBUAT]\nJudul: ${gapModalItem.title}\nFase: ${gapModalItem.phase_title}\nKategori: ${gapModalItem.category_title}\nStatus: Belum Dibuat (Gap)\nHasil yang Diharapkan: ${gapModalItem.expected}\nSkenario Uji: ${gapModalItem.scenario}\nCatatan Teknis: ${gapModalItem.notes}`;
        navigator.clipboard.writeText(text).then(() => {
            setCopiedModal(true);
            setTimeout(() => setCopiedModal(false), 2500);
        });
    };

    // Filter categories and items by Phase, Status, Category, and Query
    const filteredCategories = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();

        return categories
            .map((cat) => {
                if (selectedCategory !== 'all' && cat.id !== Number(selectedCategory)) {
                    return null;
                }

                if (selectedPhase !== 'all' && cat.phase_id !== Number(selectedPhase)) {
                    return null;
                }

                const matchingItems = cat.items.filter((item) => {
                    const matchStatus =
                        selectedStatus === 'all' || item.status === selectedStatus;

                    const matchQuery =
                        !query ||
                        item.title.toLowerCase().includes(query) ||
                        item.expected.toLowerCase().includes(query) ||
                        item.scenario.toLowerCase().includes(query) ||
                        item.notes.toLowerCase().includes(query) ||
                        (item.menu && item.menu.toLowerCase().includes(query)) ||
                        (item.url && item.url.toLowerCase().includes(query)) ||
                        (item.phase_title && item.phase_title.toLowerCase().includes(query)) ||
                        (cat.menu_path && cat.menu_path.toLowerCase().includes(query)) ||
                        cat.title.toLowerCase().includes(query) ||
                        String(item.no).includes(query);

                    return matchStatus && matchQuery;
                });

                if (matchingItems.length === 0) {
                    return null;
                }

                return {
                    ...cat,
                    items: matchingItems,
                };
            })
            .filter(Boolean);
    }, [categories, searchQuery, selectedStatus, selectedCategory, selectedPhase]);

    const totalFilteredItems = useMemo(() => {
        return filteredCategories.reduce((acc, cat) => acc + cat.items.length, 0);
    }, [filteredCategories]);

    const getPhaseToneStyles = (phaseId, isActive = false) => {
        const tones = {
            1: {
                border: 'border-emerald-300 dark:border-emerald-800',
                bg: 'bg-emerald-50/60 dark:bg-emerald-950/20',
                text: 'text-emerald-700 dark:text-emerald-300',
                badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
                ring: 'ring-2 ring-emerald-500 shadow-md',
                bar: 'bg-emerald-500',
            },
            2: {
                border: 'border-indigo-300 dark:border-indigo-800',
                bg: 'bg-indigo-50/60 dark:bg-indigo-950/20',
                text: 'text-indigo-700 dark:text-indigo-300',
                badgeBg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
                ring: 'ring-2 ring-indigo-500 shadow-md',
                bar: 'bg-indigo-500',
            },
            3: {
                border: 'border-amber-300 dark:border-amber-800',
                bg: 'bg-amber-50/60 dark:bg-amber-950/20',
                text: 'text-amber-700 dark:text-amber-300',
                badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
                ring: 'ring-2 ring-amber-500 shadow-md',
                bar: 'bg-amber-500',
            },
            4: {
                border: 'border-teal-300 dark:border-teal-800',
                bg: 'bg-teal-50/60 dark:bg-teal-950/20',
                text: 'text-teal-700 dark:text-teal-300',
                badgeBg: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200',
                ring: 'ring-2 ring-teal-500 shadow-md',
                bar: 'bg-teal-500',
            },
            5: {
                border: 'border-rose-300 dark:border-rose-800',
                bg: 'bg-rose-50/60 dark:bg-rose-950/20',
                text: 'text-rose-700 dark:text-rose-300',
                badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
                ring: 'ring-2 ring-rose-500 shadow-md',
                bar: 'bg-rose-500',
            },
            6: {
                border: 'border-slate-300 dark:border-slate-700',
                bg: 'bg-slate-50/60 dark:bg-slate-900/40',
                text: 'text-slate-700 dark:text-slate-300',
                badgeBg: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
                ring: 'ring-2 ring-slate-500 shadow-md',
                bar: 'bg-slate-500',
            },
        };
        const tone = tones[phaseId] || tones[1];
        return {
            ...tone,
            activeClass: isActive ? tone.ring : 'hover:border-[#d4a843]/60 hover:shadow-xs',
        };
    };

    const statusBadge = (status) => {
        switch (status) {
            case 'ready':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <i className="fa-solid fa-circle-check text-[10px] text-emerald-600 dark:text-emerald-400"></i>
                        Sudah Dibuat (Ready)
                    </span>
                );
            case 'partial':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                        <i className="fa-solid fa-circle-half-stroke text-[10px] text-amber-600 dark:text-amber-400"></i>
                        Sebagian Dibuat
                    </span>
                );
            case 'gap':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                        <i className="fa-solid fa-circle-xmark text-[10px] text-rose-600 dark:text-rose-400"></i>
                        Belum Dibuat (Gap)
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <AdminLayout title="Checklist Blind Testing & Peta 6 Fase Sistem">
            <Head title="Checklist Blind Testing & Peta 6 Fase | Smart Perkemi" />

            <div className="space-y-6 font-dm text-[#17120f] dark:text-slate-100">
                {/* Header Banner */}
                <section className="relative overflow-hidden rounded-3xl border border-[#d4a843]/30 bg-gradient-to-r from-[#17120f] via-[#261f18] to-[#17120f] p-6 text-white shadow-xl md:p-8">
                    <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#d4a843]/15 blur-3xl" />
                    <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#d4a843]/40 bg-[#d4a843]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#f0c060]">
                                <i className="fa-solid fa-clipboard-check"></i>
                                <span>Audit 147 Butir Fitur · Peta 6 Fase Sistem</span>
                            </div>
                            <h1 className="mt-3 font-cinzel text-2xl font-bold tracking-tight text-white md:text-3xl">
                                Checklist Blind Testing — Smart Perkemi v2
                            </h1>
                            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-white/70 md:text-sm">
                                Memetakan seluruh fitur yang <strong className="text-emerald-400">Sudah Dibuat (Ready)</strong> dan yang <strong className="text-rose-400">Belum Dibuat (Gap Roadmap)</strong> ke dalam 6 Fase Implementasi terstruktur. Dilengkapi navigasi langsung satu-klik ke menu aktif.
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#d4a843]">
                                <span>
                                    <i className="fa-solid fa-link mr-1"></i> URL: <span className="bg-black/40 px-2 py-0.5 rounded text-white select-all">/admin/checklist-uji</span>
                                </span>
                                <span className="text-white/40">·</span>
                                <span>
                                    <i className="fa-solid fa-trophy mr-1"></i> Event Aktif: <span className="bg-black/40 px-2 py-0.5 rounded text-white">{activeEventName}</span>
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                            <a
                                href="/admin/checklist-uji/download"
                                className="inline-flex items-center gap-2 rounded-xl border border-[#d4a843]/50 bg-[#d4a843]/20 px-4 py-2.5 text-xs font-bold text-[#f0c060] transition-colors hover:bg-[#d4a843]/30"
                            >
                                <i className="fa-solid fa-download"></i>
                                <span>Unduh File .md</span>
                            </a>
                            <button
                                type="button"
                                onClick={handleCopyMarkdown}
                                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-white/20"
                            >
                                <i className={`fa-solid ${copied ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
                                <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Markdown'}</span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* Metrics Cards Overview */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="rounded-2xl border border-[#e4ddd3] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161a23]">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#8b847b] dark:text-slate-400">Total Item Uji</p>
                        <p className="mt-2 text-2xl font-black text-[#17120f] dark:text-white sm:text-3xl">{stats.total}</p>
                        <p className="mt-1 text-[11px] text-[#938a82]">19 Kategori · 6 Fase</p>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Sudah Dibuat (Ready)</p>
                        <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300 sm:text-3xl">{stats.ready}</p>
                        <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{stats.readyPercentage}% fitur aktif berjalan</p>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Sebagian Dibuat</p>
                        <p className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-300 sm:text-3xl">{stats.partial}</p>
                        <p className="mt-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">Fitur inti telah berjalan</p>
                    </div>

                    <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/20">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Belum Dibuat (Gap)</p>
                        <p className="mt-2 text-2xl font-black text-rose-700 dark:text-rose-300 sm:text-3xl">{stats.gap}</p>
                        <p className="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">Fase 5 (Wasit) & 6 (VAR)</p>
                    </div>

                    <div className="col-span-2 rounded-2xl border border-[#d4a843]/40 bg-gradient-to-br from-[#d4a843]/15 to-[#d4a843]/5 p-4 shadow-sm sm:col-span-1 dark:border-[#d4a843]/30 dark:bg-[#d4a843]/10">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#b8860b] dark:text-[#f0c060]">Kesiapan Operasional</p>
                        <p className="mt-2 text-2xl font-black text-[#8b6508] dark:text-[#f0c060] sm:text-3xl">{stats.coreReadyPercentage}%</p>
                        <p className="mt-1 text-[11px] font-medium text-[#8b6508] dark:text-[#e0b050]">Siap turnamen lapangan</p>
                    </div>
                </div>

                {/* Interactive 6-Phase Roadmap Selector */}
                <section className="rounded-3xl border border-[#e4ddd3] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#161a23]">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#eee8e0] pb-4 dark:border-slate-800">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#d4a843]/20 text-xs text-[#8b6508] dark:text-[#f0c060]">
                                    <i className="fa-solid fa-layer-group"></i>
                                </span>
                                <h2 className="text-sm font-bold text-[#17120f] dark:text-white md:text-base">
                                    Peta 6 Fase Sistem: Hubungkan Fitur yang Sudah Dibuat & Belum Dibuat
                                </h2>
                            </div>
                            <p className="mt-1 text-xs text-[#7e766e] dark:text-slate-400">
                                Klik salah satu kartu Fase di bawah untuk memfilter daftar uji, atau beralih ke tab <strong>Peta 6 Fase Sistem</strong> untuk analisis mendalam.
                            </p>
                        </div>
                        {selectedPhase !== 'all' && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedPhase('all');
                                    setSelectedCategory('all');
                                }}
                                className="inline-flex items-center gap-1.5 self-start rounded-xl border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                                <i className="fa-solid fa-rotate-left text-[10px]"></i>
                                <span>Reset ke Semua Fase</span>
                            </button>
                        )}
                    </div>

                    {/* 6 Phases Cards Grid */}
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {phases.map((p) => {
                            const st = phaseStats[p.id] || {
                                total: 0,
                                ready: 0,
                                partial: 0,
                                gap: 0,
                                percentage: 0,
                            };
                            const isSelected = selectedPhase === p.id;
                            const styles = getPhaseToneStyles(p.id, isSelected);

                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => {
                                        if (selectedPhase === p.id) {
                                            setSelectedPhase('all');
                                            setSelectedCategory('all');
                                        } else {
                                            setSelectedPhase(p.id);
                                            setSelectedCategory('all');
                                            if (activeTab !== 'interactive') setActiveTab('interactive');
                                        }
                                    }}
                                    className={`group flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${styles.border} ${styles.bg} ${styles.activeClass}`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold ${styles.badgeBg}`}>
                                                <i className={`fa-solid ${p.icon || 'fa-folder'} text-[10px]`}></i>
                                                <span>Fase {p.id}</span>
                                            </span>
                                            <span className="text-[11px] font-black font-mono">
                                                {st.percentage}% Ready
                                            </span>
                                        </div>

                                        <h3 className="mt-2.5 text-xs font-bold text-[#17120f] dark:text-white sm:text-sm group-hover:text-[#d4a843] transition-colors">
                                            {p.short_name}
                                        </h3>
                                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#6a6258] dark:text-slate-400">
                                            {p.description}
                                        </p>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5">
                                        {/* Progress Bar */}
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
                                                style={{ width: `${st.percentage}%` }}
                                            />
                                        </div>

                                        <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-[#7e766e] dark:text-slate-400">
                                            <span>{st.total} Butir Uji</span>
                                            <span className="flex items-center gap-1.5">
                                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{st.ready} Selesai</span>
                                                {st.partial > 0 && <span className="text-amber-600 dark:text-amber-400">· {st.partial} Sebagian</span>}
                                                {st.gap > 0 && <span className="text-rose-600 dark:text-rose-400">· {st.gap} Gap</span>}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* View Mode Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e4ddd3] pb-3 dark:border-slate-800">
                    <div className="inline-flex flex-wrap rounded-xl border border-[#e4ddd3] bg-white p-1 dark:border-slate-800 dark:bg-[#161a23]">
                        <button
                            type="button"
                            onClick={() => setActiveTab('interactive')}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${activeTab === 'interactive'
                                ? 'bg-[#17120f] text-white shadow-sm dark:bg-[#d4a843] dark:text-black'
                                : 'text-[#6e665d] hover:text-[#17120f] dark:text-slate-400 dark:hover:text-white'
                                }`}
                        >
                            <i className="fa-solid fa-table-list"></i>
                            <span>Tampilan Interaktif ({totalFilteredItems})</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('phases')}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${activeTab === 'phases'
                                ? 'bg-[#17120f] text-white shadow-sm dark:bg-[#d4a843] dark:text-black'
                                : 'text-[#6e665d] hover:text-[#17120f] dark:text-slate-400 dark:hover:text-white'
                                }`}
                        >
                            <i className="fa-solid fa-map-location-dot"></i>
                            <span>Peta 6 Fase Sistem (Roadmap)</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('changes')}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${activeTab === 'changes'
                                ? 'bg-[#17120f] text-white shadow-sm dark:bg-[#d4a843] dark:text-black'
                                : 'text-[#6e665d] hover:text-[#17120f] dark:text-slate-400 dark:hover:text-white'
                                }`}
                        >
                            <i className="fa-solid fa-clock-rotate-left"></i>
                            <span>Hasil Perubahan Terbaru ({recentChanges.length})</span>
                            <span className="ml-1 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                                Baru
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('markdown')}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${activeTab === 'markdown'
                                ? 'bg-[#17120f] text-white shadow-sm dark:bg-[#d4a843] dark:text-black'
                                : 'text-[#6e665d] hover:text-[#17120f] dark:text-slate-400 dark:hover:text-white'
                                }`}
                        >
                            <i className="fa-brands fa-markdown"></i>
                            <span>Dokumen Markdown Asli (.md)</span>
                        </button>
                    </div>

                    {activeTab === 'interactive' && (
                        <div className="flex items-center gap-2 text-xs">
                            <button
                                type="button"
                                onClick={expandAll}
                                className="text-[#8a631c] hover:underline dark:text-[#f0c060] font-semibold"
                            >
                                Buka Semua
                            </button>
                            <span className="text-[#c5beaf]">·</span>
                            <button
                                type="button"
                                onClick={collapseAll}
                                className="text-[#8a631c] hover:underline dark:text-[#f0c060] font-semibold"
                            >
                                Tutup Semua
                            </button>
                        </div>
                    )}
                </div>

                {/* Tab 1: Interactive Checklist */}
                {activeTab === 'interactive' && (
                    <div className="space-y-6">
                        {/* Filters Bar */}
                        <div className="grid gap-3 rounded-2xl border border-[#e4ddd3] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161a23] md:grid-cols-[1fr_auto_auto_auto]">
                            {/* Search Bar */}
                            <div className="relative">
                                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#9c9389]" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari fitur, menu (drawing, timbang-badan, wasit), skenario, atau fase..."
                                    className="w-full rounded-xl border border-[#e4ddd3] bg-[#faf8f5] py-2.5 pl-9 pr-3 text-xs text-[#17120f] placeholder-[#9c9389] transition focus:border-[#d4a843] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#d4a843]/20 dark:border-slate-700 dark:bg-[#0f1115] dark:text-white"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                                    >
                                        <i className="fa-solid fa-xmark" />
                                    </button>
                                )}
                            </div>

                            {/* Status Filter Tabs */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                {[
                                    { id: 'all', label: `Semua (${statusCountsInPhase.total})` },
                                    { id: 'ready', label: `Sudah Dibuat (${statusCountsInPhase.ready})` },
                                    { id: 'partial', label: `Sebagian (${statusCountsInPhase.partial})` },
                                    { id: 'gap', label: `Belum Dibuat (${statusCountsInPhase.gap})` },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setSelectedStatus(tab.id)}
                                        className={`rounded-xl px-3 py-2 text-xs font-bold transition ${selectedStatus === tab.id
                                            ? 'bg-[#d4a843] text-black shadow-sm'
                                            : 'border border-[#e4ddd3] bg-white text-[#6e665d] hover:bg-[#f7f4ef] dark:border-slate-700 dark:bg-[#0f1115] dark:text-slate-300'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Phase Dropdown */}
                            <select
                                value={selectedPhase}
                                onChange={(e) => {
                                    const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                                    setSelectedPhase(val);
                                    setSelectedCategory('all');
                                }}
                                className="rounded-xl border border-[#e4ddd3] bg-[#faf8f5] px-3 py-2 text-xs font-semibold text-[#17120f] transition focus:border-[#d4a843] focus:outline-none dark:border-slate-700 dark:bg-[#0f1115] dark:text-white"
                            >
                                <option value="all">Semua 6 Fase Sistem</option>
                                {phases.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        Fase {p.id}: {p.short_name} ({p.status_label})
                                    </option>
                                ))}
                            </select>

                            {/* Category Filter */}
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="rounded-xl border border-[#e4ddd3] bg-[#faf8f5] px-3 py-2 text-xs font-semibold text-[#17120f] transition focus:border-[#d4a843] focus:outline-none dark:border-slate-700 dark:bg-[#0f1115] dark:text-white"
                            >
                                <option value="all">
                                    Semua Kategori {selectedPhase !== 'all' ? `(Fase ${selectedPhase})` : '(19)'}
                                </option>
                                {availableCategoriesForSelect.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.id}. {c.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Active Event Reference Banner */}
                        <div className="flex flex-col gap-3 rounded-2xl border border-[#d4a843]/30 bg-gradient-to-r from-[#faf7f0] to-[#fffdf9] p-4 text-xs dark:border-[#d4a843]/20 dark:from-[#191d26] dark:to-[#141720] sm:flex-row sm:items-center sm:justify-between shadow-xs">
                            <div className="flex items-start gap-2.5">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#d4a843]/20 text-[#8b6508] dark:text-[#f0c060]">
                                    <i className="fa-solid fa-bullseye text-sm"></i>
                                </span>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-bold text-[#17120f] dark:text-white">
                                            Event Referensi Pengujian Lapangan:
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-md bg-[#d4a843]/20 px-2 py-0.5 font-bold text-[#8b6508] dark:text-[#f0c060]">
                                            <i className="fa-solid fa-trophy text-[10px]"></i>
                                            {activeEventName}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-[11px] text-[#786e64] dark:text-slate-400">
                                        Semua tombol <strong className="text-emerald-700 dark:text-emerald-400">"Buka Fitur ↗"</strong> di bawah otomatis menyuntikkan ID event aktif (<code className="font-mono text-[10px] bg-black/10 dark:bg-black/30 px-1 py-0.5 rounded">{activeEventId}</code>) untuk pengujian langsung tanpa perlu memilih event ulang.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <a
                                    href={`/admin/pertandingan/timbang-badan?event_id=${activeEventId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
                                >
                                    <i className="fa-solid fa-weight-scale"></i>
                                    <span>Stasiun Timbang Badan ↗</span>
                                </a>
                                <a
                                    href={`/admin/master/event/${activeEventId}/detail?tab=matches`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#d4a843] bg-[#d4a843] px-3 py-1.5 text-xs font-bold text-black shadow-sm transition hover:bg-[#c49838]"
                                >
                                    <i className="fa-solid fa-list-check"></i>
                                    <span>Detail Nomor Event ↗</span>
                                </a>
                            </div>
                        </div>

                        {/* List of Categories */}
                        {filteredCategories.length > 0 ? (
                            <div className="space-y-4">
                                {filteredCategories.map((cat) => {
                                    const isExpanded = expandedCategories.includes(cat.id);
                                    const readyCount = cat.items.filter((i) => i.status === 'ready').length;
                                    const partialCount = cat.items.filter((i) => i.status === 'partial').length;
                                    const gapCount = cat.items.filter((i) => i.status === 'gap').length;
                                    const toneStyles = getPhaseToneStyles(cat.phase_id);

                                    return (
                                        <section
                                            key={cat.id}
                                            className="overflow-hidden rounded-2xl border border-[#e4ddd3] bg-white shadow-sm dark:border-slate-800 dark:bg-[#161a23]"
                                        >
                                            {/* Category Header */}
                                            <button
                                                type="button"
                                                onClick={() => toggleCategoryExpand(cat.id)}
                                                className="flex w-full items-center justify-between border-b border-[#eee8e0] bg-[#faf8f5]/80 p-4 text-left transition hover:bg-[#faf8f5] dark:border-slate-800 dark:bg-[#11151b] dark:hover:bg-[#141922]"
                                            >
                                                <div className="min-w-0 flex-1 pr-4">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#d4a843]/20 text-xs font-bold text-[#8b6508] dark:text-[#f0c060]">
                                                            {cat.id}
                                                        </span>
                                                        <h2 className="text-sm font-bold text-[#17120f] dark:text-white md:text-base">
                                                            {cat.title}
                                                        </h2>
                                                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${toneStyles.badgeBg}`}>
                                                            <span>{cat.phase_title}</span>
                                                        </span>
                                                        <span className="rounded-full bg-[#ede9e1] px-2 py-0.5 text-[10px] font-bold text-[#6a635a] dark:bg-slate-800 dark:text-slate-400">
                                                            {cat.items.length} item
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-xs text-[#7e766e] dark:text-slate-400">
                                                        {cat.description}
                                                    </p>
                                                    {cat.menu_path && (
                                                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                                                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4ddd3] bg-white/90 px-2.5 py-1 font-semibold text-[#8b6508] dark:border-slate-700 dark:bg-slate-900/90 dark:text-[#f0c060] shadow-2xs">
                                                                <i className="fa-solid fa-compass text-[10px]" />
                                                                <span className="font-normal text-[#786e64] dark:text-slate-400">Lokasi Menu Utama:</span>
                                                                <strong className="font-bold text-[#17120f] dark:text-white">{cat.menu_path}</strong>
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold">
                                                        {readyCount > 0 && (
                                                            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                                {readyCount} Selesai
                                                            </span>
                                                        )}
                                                        {partialCount > 0 && (
                                                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                                {partialCount} Sebagian
                                                            </span>
                                                        )}
                                                        {gapCount > 0 && (
                                                            <span className="rounded-md bg-rose-100 px-2 py-0.5 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                                                {gapCount} Belum Dibuat
                                                            </span>
                                                        )}
                                                    </div>
                                                    <i
                                                        className={`fa-solid fa-chevron-down text-xs text-[#9a9187] transition-transform ${isExpanded ? 'rotate-180 text-[#d4a843]' : ''
                                                            }`}
                                                    />
                                                </div>
                                            </button>

                                            {/* Items Table / Cards */}
                                            {isExpanded && (
                                                <div className="divide-y divide-[#eee8e0] dark:divide-slate-800">
                                                    {cat.items.map((item) => {
                                                        const resolvedUrl = item.url ? resolveUrl(item.url) : null;
                                                        const isGap = item.status === 'gap';
                                                        const isReady = item.status === 'ready';

                                                        return (
                                                            <div
                                                                key={`${cat.id}-${item.no}`}
                                                                className={`p-4 transition ${isGap ? 'bg-rose-50/20 dark:bg-rose-950/10' : 'hover:bg-[#fbfaf8] dark:hover:bg-[#1a1f2c]'}`}
                                                            >
                                                                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-start gap-2.5">
                                                                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f2eee8] text-[10px] font-bold text-[#6a635a] dark:bg-slate-800 dark:text-slate-300">
                                                                                {item.no}
                                                                            </span>
                                                                            <div>
                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                    <h3 className="text-xs font-bold text-[#17120f] dark:text-white sm:text-sm">
                                                                                        {item.title}
                                                                                    </h3>
                                                                                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-bold ${toneStyles.badgeBg}`}>
                                                                                        <span>{item.phase_title || `Fase ${cat.phase_id}`}</span>
                                                                                    </span>
                                                                                </div>

                                                                                {/* Action Launcher Bar */}
                                                                                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                                                                    {item.menu && (
                                                                                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4ddd3] bg-[#faf8f5] px-2.5 py-1 text-[11px] font-semibold text-[#544d44] dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200">
                                                                                            <i className="fa-solid fa-compass text-[#d4a843] text-[10px]" />
                                                                                            <span className="font-normal text-[#7a7167] dark:text-slate-400">Menu:</span>
                                                                                            <strong className="text-[#17120f] dark:text-white font-bold">{item.menu}</strong>
                                                                                        </span>
                                                                                    )}

                                                                                    {/* Ready Feature -> Direct Live Link */}
                                                                                    {isReady && resolvedUrl && (
                                                                                        <div className="inline-flex items-center gap-1.5">
                                                                                            <span className="hidden md:inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                                                                                <i className="fa-solid fa-link text-[8px] text-slate-400" />
                                                                                                {resolvedUrl}
                                                                                            </span>
                                                                                            <a
                                                                                                href={resolvedUrl}
                                                                                                target={resolvedUrl.startsWith('http') || resolvedUrl.includes('/event/') || resolvedUrl.includes('/wasit') ? '_blank' : '_self'}
                                                                                                rel="noreferrer"
                                                                                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-800 transition hover:bg-emerald-600 hover:text-white dark:border-emerald-500/50 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-600 dark:hover:text-white shadow-2xs"
                                                                                                title={`Buka langsung fitur: ${resolvedUrl}`}
                                                                                            >
                                                                                                <span>Buka Fitur</span>
                                                                                                <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                                                                                            </a>
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Partial Feature -> Base Link + Info */}
                                                                                    {!isReady && !isGap && resolvedUrl && (
                                                                                        <div className="inline-flex items-center gap-1.5">
                                                                                            <a
                                                                                                href={resolvedUrl}
                                                                                                target="_blank"
                                                                                                rel="noreferrer"
                                                                                                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500 bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-800 transition hover:bg-amber-600 hover:text-white dark:border-amber-500/50 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-600 dark:hover:text-white shadow-2xs"
                                                                                            >
                                                                                                <span>Buka Fitur Dasar</span>
                                                                                                <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                                                                                            </a>
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Gap Feature -> Modal Trigger */}
                                                                                    {isGap && (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => setGapModalItem({
                                                                                                ...item,
                                                                                                category_id: cat.id,
                                                                                                category_title: cat.title,
                                                                                            })}
                                                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-800 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 shadow-2xs"
                                                                                        >
                                                                                            <i className="fa-solid fa-circle-info text-[10px] text-rose-600 dark:text-rose-400"></i>
                                                                                            <span>Detail Belum Dibuat (Rencana Fase)</span>
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="shrink-0 pl-7 sm:pl-0">
                                                                        {statusBadge(item.status)}
                                                                    </div>
                                                                </div>

                                                                <div className="mt-3 grid gap-2 pl-7 text-xs sm:grid-cols-2 lg:grid-cols-3">
                                                                    <div className="rounded-xl border border-[#e8e2d8] bg-[#fdfcfb] p-2.5 dark:border-slate-800 dark:bg-[#11141c]">
                                                                        <p className="font-bold text-[#867e75] dark:text-slate-400 text-[10px] uppercase tracking-wide">
                                                                            Hasil yang Diharapkan
                                                                        </p>
                                                                        <p className="mt-1 text-[#2d2722] dark:text-slate-200">
                                                                            {item.expected}
                                                                        </p>
                                                                    </div>

                                                                    <div className="rounded-xl border border-[#e8e2d8] bg-[#fdfcfb] p-2.5 dark:border-slate-800 dark:bg-[#11141c]">
                                                                        <p className="font-bold text-[#867e75] dark:text-slate-400 text-[10px] uppercase tracking-wide">
                                                                            Skenario Pengujian
                                                                        </p>
                                                                        <p className="mt-1 text-[#2d2722] dark:text-slate-200">
                                                                            {item.scenario}
                                                                        </p>
                                                                    </div>

                                                                    <div className={`rounded-xl border p-2.5 sm:col-span-2 lg:col-span-1 ${isGap
                                                                        ? 'border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20'
                                                                        : 'border-[#d4a843]/30 bg-[#d4a843]/5 dark:border-[#d4a843]/20 dark:bg-[#d4a843]/5'
                                                                        }`}>
                                                                        <p className={`font-bold text-[10px] uppercase tracking-wide ${isGap ? 'text-rose-700 dark:text-rose-400' : 'text-[#8b6508] dark:text-[#f0c060]'}`}>
                                                                            {isGap ? 'Rencana & Analisis Kebutuhan' : 'Catatan Teknis & Status Implementasi'}
                                                                        </p>
                                                                        <p className="mt-1 text-[#413932] dark:text-slate-300">
                                                                            {item.notes}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </section>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-[#d4cfc7] bg-white p-12 text-center dark:border-slate-800 dark:bg-[#161a23]">
                                <i className="fa-solid fa-filter text-3xl text-gray-400 mb-3" />
                                <h3 className="text-base font-bold text-gray-800 dark:text-white">Tidak ada item uji yang cocok</h3>
                                <p className="text-xs text-gray-500 mt-1">Coba ubah kata kunci pencarian atau reset filter fase & status.</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedStatus('all');
                                        setSelectedPhase('all');
                                        setSelectedCategory('all');
                                    }}
                                    className="mt-4 rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-white"
                                >
                                    Reset Semua Filter
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 2: Dedicated 6 Phases Matrix (Roadmap) */}
                {activeTab === 'phases' && (
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-[#d4a843]/30 bg-gradient-to-br from-[#17120f] via-[#201a14] to-[#17120f] p-6 text-white shadow-sm">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-lg bg-[#d4a843]/20 px-2.5 py-1 text-xs font-bold text-[#f0c060]">
                                        <i className="fa-solid fa-diagram-project"></i>
                                        <span>Matriks Eksekutif Pengembangan Sistem</span>
                                    </div>
                                    <h2 className="mt-2 text-xl font-bold font-cinzel text-white">
                                        Peta Lengkap 6 Fase Smart Perkemi v2
                                    </h2>
                                    <p className="mt-1 text-xs text-white/70 max-w-2xl">
                                        Perbandingan status implementasi antara fitur yang sudah selesai (Fase 1–4) dan roadmap fitur tingkat lanjut (Fase 5–6) yang masih memerlukan modul analitik atau hardware eksternal.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3.5 py-2 text-center">
                                        <p className="text-[10px] font-bold uppercase text-emerald-400">Fase Selesai</p>
                                        <p className="text-xl font-black text-emerald-300">4 / 6</p>
                                    </div>
                                    <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-3.5 py-2 text-center">
                                        <p className="text-[10px] font-bold uppercase text-rose-400">Roadmap / Gap</p>
                                        <p className="text-xl font-black text-rose-300">2 / 6</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Phase Cards */}
                        <div className="space-y-4">
                            {phases.map((p) => {
                                const st = phaseStats[p.id] || {
                                    total: 0,
                                    ready: 0,
                                    partial: 0,
                                    gap: 0,
                                    percentage: 0,
                                };
                                const styles = getPhaseToneStyles(p.id);
                                const isReady = p.status === 'ready';
                                const isPartial = p.status === 'partial';

                                // Find primary action URL for this phase
                                let primaryActionUrl = null;
                                let primaryActionLabel = null;
                                if (p.id === 1) {
                                    primaryActionUrl = `/admin/master/event/${activeEventId}/detail?tab=matches`;
                                    primaryActionLabel = 'Buka Master Event & Nomor Tanding ↗';
                                } else if (p.id === 2) {
                                    primaryActionUrl = `/admin/pertandingan/timbang-badan?event_id=${activeEventId}`;
                                    primaryActionLabel = 'Buka Stasiun Timbang Badan Hari-H ↗';
                                } else if (p.id === 3) {
                                    primaryActionUrl = `/admin/pertandingan/jadwal?event_id=${activeEventId}`;
                                    primaryActionLabel = 'Buka Penjadwalan Tatami ↗';
                                } else if (p.id === 4) {
                                    primaryActionUrl = `/event/${activeEventSlug}/court/1/monitor`;
                                    primaryActionLabel = 'Buka Layar Monitor Tatami (F11) ↗';
                                }

                                return (
                                    <div
                                        key={p.id}
                                        className="overflow-hidden rounded-2xl border border-[#e4ddd3] bg-white shadow-sm dark:border-slate-800 dark:bg-[#161a23]"
                                    >
                                        <div className={`border-b p-5 ${styles.bg} ${styles.border}`}>
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${styles.badgeBg}`}>
                                                        <i className={`fa-solid ${p.icon || 'fa-layer-group'}`}></i>
                                                    </span>
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h3 className="text-base font-bold text-[#17120f] dark:text-white">
                                                                {p.name}
                                                            </h3>
                                                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${isReady
                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                                : isPartial
                                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                                                }`}>
                                                                {p.status_label}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-xs text-[#6e665d] dark:text-slate-400">
                                                            {p.description}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    {primaryActionUrl && (
                                                        <a
                                                            href={primaryActionUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#17120f] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-black dark:bg-[#d4a843] dark:text-black dark:hover:bg-[#c49838]"
                                                        >
                                                            <span>{primaryActionLabel}</span>
                                                        </a>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedPhase(p.id);
                                                            setSelectedCategory('all');
                                                            setActiveTab('interactive');
                                                        }}
                                                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-[#0f1115] dark:text-slate-200"
                                                    >
                                                        <i className="fa-solid fa-filter text-[10px]"></i>
                                                        <span>Filter Item Fase Ini</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Phase Summary Details */}
                                        <div className="p-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-b border-[#eee8e0] dark:border-slate-800 bg-[#faf8f5]/50 dark:bg-[#11151b]">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8c847c]">Kesiapan Fase</p>
                                                <p className="mt-1 text-xl font-black text-[#17120f] dark:text-white">{st.percentage}%</p>
                                                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                                                    <div className={`h-full ${styles.bar}`} style={{ width: `${st.percentage}%` }} />
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8c847c]">Distribusi Butir Uji</p>
                                                <p className="mt-1 text-xs font-semibold text-[#17120f] dark:text-white">
                                                    <span className="text-emerald-600 font-bold">{st.ready} Selesai</span>
                                                    {' · '}
                                                    <span className="text-amber-600 font-bold">{st.partial} Sebagian</span>
                                                    {' · '}
                                                    <span className="text-rose-600 font-bold">{st.gap} Gap</span>
                                                </p>
                                                <p className="mt-1 text-[11px] text-[#8c847c]">Total {st.total} item dalam fase ini</p>
                                            </div>

                                            <div className="sm:col-span-2">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8c847c]">Kategori Terkait</p>
                                                <div className="mt-1 flex flex-wrap gap-1.5">
                                                    {categories
                                                        .filter((c) => c.phase_id === p.id)
                                                        .map((c) => (
                                                            <span
                                                                key={c.id}
                                                                className="inline-flex items-center gap-1 rounded-md border border-[#eee8e0] bg-white px-2 py-0.5 text-[11px] font-medium text-[#4b4339] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                                            >
                                                                <span className="font-bold text-[#d4a843]">{c.id}.</span>
                                                                <span>{c.title}</span>
                                                            </span>
                                                        ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Tab 3: Recent Changes & Enhancements Log */}
                {activeTab === 'changes' && (
                    <div className="space-y-6">
                        {/* Changes Header Card */}
                        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 p-6 shadow-sm dark:border-emerald-900/40 dark:bg-gradient-to-br dark:from-[#13201a] dark:via-[#161a23] dark:to-[#101915]">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                        <i className="fa-solid fa-code-commit"></i>
                                        <span>Changelog & Implementasi Fitur Terbaru</span>
                                    </div>
                                    <h2 className="mt-2 text-xl font-black text-[#17120f] dark:text-white">
                                        Hasil Perubahan yang Telah Dibuat
                                    </h2>
                                    <p className="mt-1 text-xs text-[#6e665d] dark:text-slate-400 max-w-2xl">
                                        Seluruh pembaruan teknis telah diintegrasikan langsung dengan basis kode Smart Perkemi v2.
                                        Setiap item dilengkapi dengan berkas yang dimodifikasi dan tombol akses satu-klik ke menu terkait.
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-center shadow-xs dark:border-emerald-800 dark:bg-[#0f1412]">
                                        <p className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">Total Fitur Baru</p>
                                        <p className="text-xl font-black text-emerald-800 dark:text-emerald-200">{recentChanges.length}</p>
                                    </div>
                                    <div className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-center shadow-xs dark:border-indigo-900 dark:bg-[#0f141a]">
                                        <p className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-400">Fase 2 Baru</p>
                                        <p className="text-xl font-black text-indigo-800 dark:text-indigo-200">Timbang Badan</p>
                                    </div>
                                    <div className="rounded-xl border border-purple-200 bg-white px-3 py-2 text-center shadow-xs dark:border-purple-900 dark:bg-[#15111c]">
                                        <p className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-400">Integrasi Menu</p>
                                        <p className="text-xl font-black text-purple-800 dark:text-purple-200">100%</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Search & Filter Bar for Changes */}
                        <div className="grid gap-3 rounded-2xl border border-[#e4ddd3] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161a23] md:grid-cols-[1fr_auto]">
                            <div className="relative">
                                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#9c9389]" />
                                <input
                                    type="text"
                                    value={changeSearchQuery}
                                    onChange={(e) => setChangeSearchQuery(e.target.value)}
                                    placeholder="Cari fitur (misal: timbang-badan, is_exhibition, champion, monitor court)..."
                                    className="w-full rounded-xl border border-[#e4ddd3] bg-[#faf8f5] py-2.5 pl-9 pr-3 text-xs text-[#17120f] placeholder-[#9c9389] transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-[#0f1115] dark:text-white"
                                />
                                {changeSearchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setChangeSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                                    >
                                        <i className="fa-solid fa-xmark" />
                                    </button>
                                )}
                            </div>

                            <select
                                value={selectedChangeCategory}
                                onChange={(e) => setSelectedChangeCategory(e.target.value)}
                                className="rounded-xl border border-[#e4ddd3] bg-[#faf8f5] px-3 py-2 text-xs font-semibold text-[#17120f] transition focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-[#0f1115] dark:text-white"
                            >
                                <option value="all">Semua Kategori Perubahan ({recentChanges.length})</option>
                                {changeCategories.map((catName) => (
                                    <option key={catName} value={catName}>
                                        {catName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Change Cards List */}
                        {filteredChanges.length > 0 ? (
                            <div className="space-y-4">
                                {filteredChanges.map((change, idx) => {
                                    const resolvedLink = resolveUrl(change.url);
                                    return (
                                        <div
                                            key={change.id || idx}
                                            className="overflow-hidden rounded-2xl border border-[#e4ddd3] bg-white shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-[#161a23]"
                                        >
                                            {/* Card Header */}
                                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee8e0] bg-[#faf8f5] px-5 py-3.5 dark:border-slate-800 dark:bg-[#12151c]">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                        {change.badge || 'Fitur Baru'}
                                                    </span>
                                                    <span className="rounded-lg border border-[#e4ddd3] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6e665d] dark:border-slate-700 dark:bg-[#1a1f2c] dark:text-slate-300">
                                                        {change.category}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                        <i className="fa-solid fa-circle-check text-[10px]"></i>
                                                        {change.status}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] font-medium text-[#9c9389] dark:text-slate-500">
                                                    <i className="fa-regular fa-calendar mr-1"></i>
                                                    {change.date}
                                                </div>
                                            </div>

                                            {/* Card Body */}
                                            <div className="p-5 space-y-4">
                                                <div>
                                                    <h3 className="text-base font-bold text-[#17120f] dark:text-white">
                                                        {change.title}
                                                    </h3>
                                                    <p className="mt-1.5 text-xs leading-relaxed text-[#5c5348] dark:text-slate-300">
                                                        {change.description}
                                                    </p>
                                                </div>

                                                {/* Menu & Direct Action Bar */}
                                                <div className="flex flex-col gap-3 rounded-xl border border-[#e4ddd3] bg-gradient-to-r from-[#faf8f5] to-white p-3.5 dark:border-slate-800 dark:from-[#0f1115] dark:to-[#161a23] sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5 text-xs text-[#5c5348] dark:text-slate-300">
                                                            <i className="fa-solid fa-location-dot text-[#d4a843] shrink-0"></i>
                                                            <span className="text-[11px] font-medium text-[#8c847c]">Akses Menu:</span>
                                                            <span className="truncate font-bold text-[#17120f] dark:text-white">
                                                                {change.menu}
                                                            </span>
                                                        </div>
                                                        {resolvedLink && (
                                                            <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                                                                <span className="text-[#8c847c]">Tautan:</span>
                                                                <code className="rounded bg-[#f0ebe3] px-1.5 py-0.5 font-mono text-[10px] text-[#8a631c] dark:bg-slate-800 dark:text-[#f0c060]">
                                                                    {resolvedLink}
                                                                </code>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {resolvedLink && (
                                                        <a
                                                            href={resolvedLink}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#17120f] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-black dark:bg-[#d4a843] dark:text-black dark:hover:bg-[#c49838]"
                                                        >
                                                            <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                                                            <span>Buka Menu Terkait ↗</span>
                                                        </a>
                                                    )}
                                                </div>

                                                {/* Key Highlights */}
                                                {change.highlights && change.highlights.length > 0 && (
                                                    <div className="space-y-1.5">
                                                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#8b847b] dark:text-slate-400">
                                                            Poin Implementasi Kunci:
                                                        </p>
                                                        <ul className="grid gap-1.5 sm:grid-cols-2">
                                                            {change.highlights.map((hl, hIdx) => (
                                                                <li
                                                                    key={hIdx}
                                                                    className="flex items-start gap-2 rounded-lg bg-[#faf8f5] p-2 text-xs text-[#473e35] dark:bg-[#0f1115] dark:text-slate-300"
                                                                >
                                                                    <i className="fa-solid fa-check text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0 text-[11px]"></i>
                                                                    <span className="leading-snug">{hl}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Modified Files */}
                                                {change.files_modified && change.files_modified.length > 0 && (
                                                    <div className="space-y-1.5">
                                                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#8b847b] dark:text-slate-400">
                                                            Berkas Terkait / Dimodifikasi:
                                                        </p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {change.files_modified.map((file, fIdx) => (
                                                                <div
                                                                    key={fIdx}
                                                                    className="inline-flex items-center gap-1.5 rounded-md border border-[#eee8e0] bg-[#faf8f5] px-2 py-1 font-mono text-[10px] text-[#6e665d] dark:border-slate-800 dark:bg-[#0f1115] dark:text-slate-400"
                                                                >
                                                                    <i className="fa-regular fa-file-code text-[#d4a843]"></i>
                                                                    <span>{file}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-[#d4cfc7] bg-white p-12 text-center dark:border-slate-800 dark:bg-[#161a23]">
                                <i className="fa-solid fa-filter text-3xl text-gray-400 mb-3" />
                                <h3 className="text-base font-bold text-gray-800 dark:text-white">Tidak ada perubahan yang cocok</h3>
                                <p className="text-xs text-gray-500 mt-1">Coba ubah kata kunci pencarian atau reset filter kategori.</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setChangeSearchQuery('');
                                        setSelectedChangeCategory('all');
                                    }}
                                    className="mt-4 rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-white"
                                >
                                    Reset Filter Perubahan
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 4: Full Markdown Viewer */}
                {activeTab === 'markdown' && (
                    <div className="rounded-2xl border border-[#e4ddd3] bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161a23]">
                        <div className="mb-4 flex items-center justify-between border-b border-[#eee8e0] pb-3 dark:border-slate-800">
                            <div>
                                <h2 className="text-sm font-bold text-[#17120f] dark:text-white">Dokumen Raw Markdown (.md)</h2>
                                <p className="text-xs text-[#8c847c]">Tersimpan di: <code className="bg-[#f0ebe3] px-1.5 py-0.5 rounded text-[11px] font-mono text-[#b92f24] dark:bg-slate-800 dark:text-amber-400">md/ANALISIS_FITUR_DAN_CHECKLIST_PENGUJIAN.md</code></p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCopyMarkdown}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-[#0f1115] dark:text-white"
                            >
                                <i className={`fa-solid ${copied ? 'fa-check text-emerald-500' : 'fa-copy'}`}></i>
                                <span>{copied ? 'Tersalin!' : 'Salin Semua'}</span>
                            </button>
                        </div>

                        <pre className="overflow-x-auto rounded-xl bg-[#faf8f5] p-5 font-mono text-xs leading-relaxed text-[#2d2722] whitespace-pre-wrap dark:bg-[#0f1115] dark:text-slate-300 border border-[#eee8e0] dark:border-slate-800 max-h-[75vh]">
                            {markdownContent}
                        </pre>
                    </div>
                )}
            </div>

            {/* Modal: Detail Rencana Fitur Belum Dibuat (Gap Roadmap) */}
            <Modal
                isOpen={Boolean(gapModalItem)}
                onClose={() => setGapModalItem(null)}
                title={gapModalItem ? `Detail Rencana: ${gapModalItem.title}` : 'Detail Fitur'}
                subtitle={gapModalItem ? `Kategori ${gapModalItem.category_id}: ${gapModalItem.category_title} · ${gapModalItem.phase_title || 'Roadmap Fase'}` : ''}
                size="2xl"
                footer={
                    <div className="flex w-full items-center justify-between">
                        <button
                            type="button"
                            onClick={handleCopyModalContent}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                            <i className={`fa-solid ${copiedModal ? 'fa-check text-emerald-500' : 'fa-copy'}`}></i>
                            <span>{copiedModal ? 'Tersalin!' : 'Salin Rencana'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setGapModalItem(null)}
                            className="rounded-xl bg-[#17120f] px-4 py-2 text-xs font-bold text-white hover:bg-black dark:bg-[#d4a843] dark:text-black dark:hover:bg-[#c49838]"
                        >
                            Tutup
                        </button>
                    </div>
                }
            >
                {gapModalItem && (
                    <div className="space-y-4 text-xs">
                        {/* Status Warning Banner */}
                        <div className="rounded-xl border border-rose-300 bg-rose-50 p-3.5 dark:border-rose-900/50 dark:bg-rose-950/30">
                            <div className="flex items-start gap-2.5">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-300">
                                    <i className="fa-solid fa-triangle-exclamation text-xs"></i>
                                </span>
                                <div>
                                    <p className="font-bold text-rose-900 dark:text-rose-200">
                                        Status: Belum Dibuat (Roadmap Pengembangan Lanjutan)
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-rose-800/80 dark:text-rose-300/80 leading-relaxed">
                                        Fitur ini tercakup dalam <strong>{gapModalItem.phase_title}</strong>. Belum dapat dioperasikan pada versi produksi saat ini karena ketergantungan perangkat keras atau perumusan algoritma khusus.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Hasil yang Diharapkan
                                </p>
                                <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                                    {gapModalItem.expected}
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Skenario Pengujian Masa Depan
                                </p>
                                <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                                    {gapModalItem.scenario}
                                </p>
                            </div>
                        </div>

                        {/* Technical Analysis Notes */}
                        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                                Catatan Kebutuhan & Analisis Implementasi
                            </p>
                            <p className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                                {gapModalItem.notes}
                            </p>
                        </div>

                        {/* Roadmap Context */}
                        <div className="rounded-xl border border-[#d4a843]/30 bg-[#faf8f5] p-3.5 dark:border-[#d4a843]/20 dark:bg-[#11151b]">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8b6508] dark:text-[#f0c060]">
                                Rekomendasi Solusi & Workaround Saat Ini di Lapangan
                            </p>
                            <ul className="mt-2 space-y-1.5 text-[11px] text-[#544d44] dark:text-slate-300">
                                {gapModalItem.category_id === 11 || gapModalItem.category_id === 15 ? (
                                    <>
                                        <li className="flex items-start gap-2">
                                            <i className="fa-solid fa-check text-emerald-600 mt-0.5 shrink-0"></i>
                                            <span><strong>VAR Hardware:</strong> Memerlukan 2-4 kamera NDI/HDMI capture card di masing-masing sudut tatami terhubung ke laptop Panitera/Dewan Juri.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <i className="fa-solid fa-check text-emerald-600 mt-0.5 shrink-0"></i>
                                            <span><strong>Solusi Lapangan Saat Ini:</strong> Challenge wasit/pelatih dicatat manual pada Berita Acara Pertandingan oleh Panitera Meja.</span>
                                        </li>
                                    </>
                                ) : gapModalItem.category_id === 14 ? (
                                    <>
                                        <li className="flex items-start gap-2">
                                            <i className="fa-solid fa-check text-emerald-600 mt-0.5 shrink-0"></i>
                                            <span><strong>Algoritma Anti-Bias:</strong> Direncanakan menggunakan rumus Standar Deviasi (z-score) terhadap deviasi skor wasit dari nilai tengah trimmed mean.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <i className="fa-solid fa-check text-emerald-600 mt-0.5 shrink-0"></i>
                                            <span><strong>Solusi Lapangan Saat Ini:</strong> Dewan Hakim / Wasit Kepala memeriksa rekapitulasi lembar skor fisik dan mengevaluasi integritas wasit pada sesi evaluasi harian.</span>
                                        </li>
                                    </>
                                ) : (
                                    <li className="flex items-start gap-2">
                                        <i className="fa-solid fa-check text-emerald-600 mt-0.5 shrink-0"></i>
                                        <span>Modul ini masuk antrean sprint pengembangan sistem setelah turnamen inti berjalan stabil.</span>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                )}
            </Modal>
        </AdminLayout>
    );
}
