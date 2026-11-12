import Button from '@/Components/UI/Elements/Button';
import ThemeToggle from '@/Components/UI/Elements/ThemeToggle';
import { Head, Link, router } from '@inertiajs/react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    CategoriesTab,
    ChampionsTab,
    ContingentsTab,
    CourtsTab,
    PaymentTab,
    RefereesTab,
    ScheduleTab,
} from './Partials/PublicEventGeneralTabs';
import {
    EmbuScoresTab,
    RandoriBracketTab,
} from './Partials/PublicEventPerformanceTabs';

const eventStatuses = {
    open_registration: { label: 'Pendaftaran dibuka', tone: 'open' },
    ongoing: { label: 'Kejuaraan berlangsung', tone: 'ongoing' },
    completed: { label: 'Kejuaraan selesai', tone: 'closed' },
};

const HASH_TO_TAB = {
    '#categories': 'categories',
    '#courts': 'courts',
    '#schedule': 'schedule',
    '#champions': 'champions',
    '#embu-scores': 'embu',
    '#embu': 'embu',
    '#randori-bracket': 'randori',
    '#randori': 'randori',
    '#contingents': 'contingents',
    '#referees': 'referees',
    '#payment': 'payment',
    '#contact': 'payment',
};

const VALID_TAB_IDS = new Set([
    'categories',
    'courts',
    'schedule',
    'champions',
    'embu',
    'randori',
    'contingents',
    'referees',
    'payment',
]);

const TAB_SLIDE_VARIANTS = {
    enter: (direction) => ({
        opacity: 0,
        x: direction > 0 ? 28 : -28,
    }),
    center: {
        opacity: 1,
        x: 0,
    },
    exit: (direction) => ({
        opacity: 0,
        x: direction > 0 ? -24 : 24,
    }),
};

function Icon({ name, className = '' }) {
    return <i className={`fa-solid ${name} ${className}`} aria-hidden="true" />;
}

function resolveTabFromLocation(availableTabIds) {
    if (typeof window === 'undefined') {
        return { tabId: 'categories', targetElementId: null, shouldScroll: false };
    }

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const hash = window.location.hash || '';

    if (hash.startsWith('#court-') && availableTabIds.has('courts')) {
        return {
            tabId: 'courts',
            targetElementId: hash.slice(1),
            shouldScroll: true,
        };
    }

    if (hash && HASH_TO_TAB[hash]) {
        const mapped = HASH_TO_TAB[hash];
        if (availableTabIds.has(mapped)) {
            return {
                tabId: mapped,
                targetElementId: hash === '#contact' ? 'contact' : 'event-tab-stage',
                shouldScroll: true,
            };
        }
    }

    if (tabParam && VALID_TAB_IDS.has(tabParam) && availableTabIds.has(tabParam)) {
        return {
            tabId: tabParam,
            targetElementId: 'event-tab-stage',
            shouldScroll: false,
        };
    }

    return { tabId: 'categories', targetElementId: null, shouldScroll: false };
}

export default function EventShow({
    auth = {},
    event,
    ageCategories = [],
    courts = [],
    contingents = [],
    matchCategories = [],
    rundowns = [],
    paymentMethods = [],
    referees = [],
    matchSchedule = [],
    championGroups = [],
    embuScores = [],
    randoriBrackets = [],
    canAccessDashboard = false,
    isHomepage = false,
}) {
    const [copiedId, setCopiedId] = useState(null);
    const [selectedQrCourt, setSelectedQrCourt] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [tabDirection, setTabDirection] = useState(1);
    const [overscrollProgress, setOverscrollProgress] = useState(0);

    const tabButtonRefs = useRef({});
    const copyTimerRef = useRef(null);
    const overscrollAccumRef = useRef(0);
    const overscrollResetTimerRef = useRef(null);
    const overscrollProgressRef = useRef(0);
    const autoSwitchCooldownRef = useRef(0);
    const touchGestureRef = useRef({
        startX: 0,
        startY: 0,
        startedAtBottom: false,
        skipHorizontal: false,
        eligibleVertical: true,
    });

    const status = eventStatuses[event?.status] || {
        label: 'Dalam persiapan',
        tone: 'preparation',
    };
    const isAuthenticated = Boolean(auth?.user);
    const hasDashboard = canAccessDashboard;
    const dashboardHref = canAccessDashboard
        ? `/event/${event.slug}/admin`
        : auth?.user?.dashboard_url || '/admin/dashboard';
    const registrationHref = `/event/${event.slug}/register`;
    const actionHref = hasDashboard ? dashboardHref : registrationHref;

    const tabs = useMemo(() => {
        const items = [
            { id: 'categories', label: 'Kategori & Nomor', count: matchCategories.length },
        ];

        if (contingents.length > 0) {
            items.push({ id: 'contingents', label: 'Kontingen', count: contingents.length });
        }

        if (courts.length > 0) {
            items.push({
                id: 'courts',
                label: 'LIVE Gelanggang',
                count: courts.length,
                isLive: courts.some((c) => c.active_match?.status === 'in_progress'),
            });
        }

        items.push(
            { id: 'referees', label: 'Wasit', count: referees.length },
            { id: 'schedule', label: 'Jadwal', count: matchSchedule.length },
            { id: 'champions', label: 'Hasil Juara', count: championGroups.length },
            { id: 'embu', label: 'Skor Embu', count: embuScores.length },
            { id: 'randori', label: 'Randori', count: randoriBrackets.length },
            { id: 'payment', label: 'Biaya & kontak', count: null },
        );

        return items;
    }, [
        matchCategories.length,
        contingents.length,
        courts,
        referees.length,
        matchSchedule.length,
        championGroups.length,
        embuScores.length,
        randoriBrackets.length,
    ]);

    const availableTabIds = useMemo(() => new Set(tabs.map((t) => t.id)), [tabs]);

    const [activeTab, setActiveTab] = useState(
        () => resolveTabFromLocation(availableTabIds).tabId,
    );

    const activeTabIndex = useMemo(() => {
        const idx = tabs.findIndex((t) => t.id === activeTab);
        return idx >= 0 ? idx : 0;
    }, [tabs, activeTab]);

    const prevTab = useMemo(
        () => tabs[(activeTabIndex - 1 + tabs.length) % tabs.length],
        [tabs, activeTabIndex],
    );
    const nextTab = useMemo(
        () => tabs[(activeTabIndex + 1) % tabs.length],
        [tabs, activeTabIndex],
    );

    const scrollToElement = useCallback((elementId) => {
        if (typeof window === 'undefined' || !elementId) {
            return;
        }

        window.requestAnimationFrame(() => {
            window.setTimeout(() => {
                const target = document.getElementById(elementId);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 60);
        });
    }, []);

    const activateTab = useCallback(
        (tabId, options = {}) => {
            const {
                scrollTargetId = 'event-tab-stage',
                shouldScroll = true,
                syncUrl = true,
                direction = null,
            } = options;
            const resolvedTab = availableTabIds.has(tabId) ? tabId : 'categories';

            if (direction !== null) {
                setTabDirection(direction);
            } else {
                const currentIdx = tabs.findIndex((t) => t.id === activeTab);
                const nextIdx = tabs.findIndex((t) => t.id === resolvedTab);
                if (currentIdx >= 0 && nextIdx >= 0 && nextIdx !== currentIdx) {
                    setTabDirection(nextIdx > currentIdx ? 1 : -1);
                }
            }

            setActiveTab(resolvedTab);
            setMobileMenuOpen(false);

            if (syncUrl && typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.set('tab', resolvedTab);
                if (scrollTargetId && scrollTargetId !== 'event-tab-stage') {
                    url.hash = `#${scrollTargetId}`;
                } else {
                    url.hash = '';
                }
                window.history.replaceState({}, '', url.toString());
            }

            if (shouldScroll) {
                scrollToElement(scrollTargetId);
            }
        },
        [availableTabIds, scrollToElement, tabs, activeTab],
    );

    const goToAdjacentTab = useCallback(
        (step) => {
            if (tabs.length <= 1) {
                return;
            }
            const nextIdx = (activeTabIndex + step + tabs.length) % tabs.length;
            autoSwitchCooldownRef.current = Date.now() + 850;
            overscrollAccumRef.current = 0;
            overscrollProgressRef.current = 0;
            setOverscrollProgress(0);
            activateTab(tabs[nextIdx].id, {
                scrollTargetId: 'event-tab-stage',
                shouldScroll: true,
                direction: step >= 0 ? 1 : -1,
            });
        },
        [tabs, activeTabIndex, activateTab],
    );

    // Auto-center active tab button inside sticky horizontal nav on desktop & mobile
    useEffect(() => {
        const activeButton = tabButtonRefs.current[activeTab];
        if (activeButton && typeof activeButton.scrollIntoView === 'function') {
            activeButton.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest',
            });
        }
    }, [activeTab]);

    // Auto-shift to next tab when hitting bottom ("mentok") on desktop wheel/keys & mobile touch,
    // plus horizontal swipe left/right between tabs on mobile/touchscreens.
    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const isNearBottom = () => {
            const doc = document.documentElement;
            const scrollTop = window.scrollY || doc.scrollTop || 0;
            return scrollTop + window.innerHeight >= doc.scrollHeight - 28;
        };

        const isInsideInteractiveScroll = (target, axis = 'y') => {
            if (!(target instanceof Element)) {
                return false;
            }
            if (target.closest('[role="listbox"]')) {
                return true;
            }
            if (axis === 'x') {
                if (target.closest('input, select, textarea, .event-section-nav-scroll')) {
                    return true;
                }
                let node = target;
                while (node && node !== document.body) {
                    const style = window.getComputedStyle(node);
                    const canScrollX =
                        (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
                        node.scrollWidth > node.clientWidth + 4;
                    if (canScrollX) {
                        return true;
                    }
                    node = node.parentElement;
                }
            }
            return false;
        };

        const scheduleOverscrollReset = () => {
            if (overscrollResetTimerRef.current) {
                window.clearTimeout(overscrollResetTimerRef.current);
            }
            overscrollResetTimerRef.current = window.setTimeout(() => {
                overscrollAccumRef.current = 0;
                overscrollProgressRef.current = 0;
                setOverscrollProgress(0);
            }, 520);
        };

        const handleWheel = (e) => {
            if (selectedQrCourt || Date.now() < autoSwitchCooldownRef.current) {
                return;
            }
            if (isInsideInteractiveScroll(e.target, 'y')) {
                return;
            }
            if (e.deltaY > 6 && isNearBottom()) {
                overscrollAccumRef.current = Math.min(
                    115,
                    overscrollAccumRef.current + Math.min(44, e.deltaY),
                );
                const progress = Math.min(1, overscrollAccumRef.current / 105);
                overscrollProgressRef.current = progress;
                setOverscrollProgress(progress);
                scheduleOverscrollReset();

                if (overscrollAccumRef.current >= 105) {
                    goToAdjacentTab(1);
                }
            } else if (e.deltaY < -6 && overscrollAccumRef.current > 0) {
                overscrollAccumRef.current = 0;
                overscrollProgressRef.current = 0;
                setOverscrollProgress(0);
            }
        };

        const handleKeyDown = (e) => {
            if (selectedQrCourt || Date.now() < autoSwitchCooldownRef.current) {
                return;
            }
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
                return;
            }
            if ((e.key === 'PageDown' || e.key === 'ArrowDown') && isNearBottom()) {
                overscrollAccumRef.current = Math.min(115, overscrollAccumRef.current + 58);
                const progress = Math.min(1, overscrollAccumRef.current / 105);
                overscrollProgressRef.current = progress;
                setOverscrollProgress(progress);
                scheduleOverscrollReset();

                if (overscrollAccumRef.current >= 105) {
                    e.preventDefault();
                    goToAdjacentTab(1);
                }
            }
        };

        const handleTouchStart = (e) => {
            if (selectedQrCourt || e.touches.length !== 1) {
                return;
            }
            const touch = e.touches[0];
            touchGestureRef.current = {
                startX: touch.clientX,
                startY: touch.clientY,
                startedAtBottom: isNearBottom(),
                skipHorizontal: isInsideInteractiveScroll(e.target, 'x'),
                eligibleVertical: !isInsideInteractiveScroll(e.target, 'y'),
            };
        };

        const handleTouchMove = (e) => {
            if (
                selectedQrCourt ||
                Date.now() < autoSwitchCooldownRef.current ||
                e.touches.length !== 1
            ) {
                return;
            }
            if (!touchGestureRef.current.eligibleVertical) {
                return;
            }
            const touch = e.touches[0];
            const pullUpDy = touchGestureRef.current.startY - touch.clientY;
            const swipeDx = Math.abs(touch.clientX - touchGestureRef.current.startX);

            if (pullUpDy > 8 && pullUpDy > swipeDx && isNearBottom()) {
                const progress = Math.min(1, pullUpDy / 64);
                overscrollProgressRef.current = progress;
                setOverscrollProgress(progress);

                if (
                    (touchGestureRef.current.startedAtBottom && pullUpDy >= 68) ||
                    pullUpDy >= 92
                ) {
                    goToAdjacentTab(1);
                }
            } else if (overscrollProgressRef.current > 0 && pullUpDy <= 0) {
                overscrollProgressRef.current = 0;
                setOverscrollProgress(0);
            }
        };

        const handleTouchEnd = (e) => {
            if (selectedQrCourt || Date.now() < autoSwitchCooldownRef.current) {
                overscrollProgressRef.current = 0;
                setOverscrollProgress(0);
                return;
            }

            if (overscrollProgressRef.current >= 0.65 && isNearBottom()) {
                goToAdjacentTab(1);
                return;
            }

            overscrollProgressRef.current = 0;
            setOverscrollProgress(0);

            if (touchGestureRef.current.skipHorizontal || e.changedTouches.length !== 1) {
                return;
            }

            const touch = e.changedTouches[0];
            const dx = touch.clientX - touchGestureRef.current.startX;
            const dy = touch.clientY - touchGestureRef.current.startY;

            if (Math.abs(dx) >= 64 && Math.abs(dx) > Math.abs(dy) * 1.65) {
                goToAdjacentTab(dx < 0 ? 1 : -1);
            }
        };

        window.addEventListener('wheel', handleWheel, { passive: true });
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        window.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            window.removeEventListener('wheel', handleWheel);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            if (overscrollResetTimerRef.current) {
                window.clearTimeout(overscrollResetTimerRef.current);
            }
        };
    }, [selectedQrCourt, goToAdjacentTab]);

    // Auto-open & scroll when landing directly via #hash or navigating browser history
    useEffect(() => {
        const initial = resolveTabFromLocation(availableTabIds);
        if (initial.tabId !== activeTab) {
            setActiveTab(initial.tabId);
        }
        if (initial.shouldScroll && initial.targetElementId) {
            scrollToElement(initial.targetElementId);
        }

        const handleLocationChange = () => {
            const resolved = resolveTabFromLocation(availableTabIds);
            setActiveTab(resolved.tabId);
            if (resolved.shouldScroll && resolved.targetElementId) {
                scrollToElement(resolved.targetElementId);
            }
        };

        window.addEventListener('hashchange', handleLocationChange);
        window.addEventListener('popstate', handleLocationChange);
        return () => {
            window.removeEventListener('hashchange', handleLocationChange);
            window.removeEventListener('popstate', handleLocationChange);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableTabIds, scrollToElement]);

    // Auto-poll every 15s when a court has a live match in progress
    const hasLiveCourt = useMemo(
        () => courts.some((court) => court.active_match?.status === 'in_progress'),
        [courts],
    );

    useEffect(() => {
        if (!hasLiveCourt) {
            return undefined;
        }

        const timer = window.setInterval(() => {
            router.reload({
                only: [
                    'courts',
                    'matchSchedule',
                    'championGroups',
                    'embuScores',
                    'randoriBrackets',
                ],
                preserveScroll: true,
                preserveState: true,
            });
        }, 15000);

        return () => window.clearInterval(timer);
    }, [hasLiveCourt]);

    useEffect(() => {
        return () => {
            if (copyTimerRef.current) {
                window.clearTimeout(copyTimerRef.current);
            }
        };
    }, []);

    const handleCopy = useCallback((text, id) => {
        if (!text || typeof navigator === 'undefined' || !navigator.clipboard) {
            return;
        }

        navigator.clipboard.writeText(String(text)).then(() => {
            setCopiedId(id);
            if (copyTimerRef.current) {
                window.clearTimeout(copyTimerRef.current);
            }
            copyTimerRef.current = window.setTimeout(() => {
                setCopiedId(null);
            }, 2200);
        });
    }, []);

    const handleTabKeyDown = (e, index) => {
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            const next = tabs[(index + 1) % tabs.length];
            activateTab(next.id, { shouldScroll: false, direction: 1 });
            tabButtonRefs.current[next.id]?.focus();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const prev = tabs[(index - 1 + tabs.length) % tabs.length];
            activateTab(prev.id, { shouldScroll: false, direction: -1 });
            tabButtonRefs.current[prev.id]?.focus();
        } else if (e.key === 'Home') {
            e.preventDefault();
            activateTab(tabs[0].id, { shouldScroll: false, direction: -1 });
            tabButtonRefs.current[tabs[0].id]?.focus();
        } else if (e.key === 'End') {
            e.preventDefault();
            const last = tabs[tabs.length - 1];
            activateTab(last.id, { shouldScroll: false, direction: 1 });
            tabButtonRefs.current[last.id]?.focus();
        }
    };

    const activeTabContent = () => {
        switch (activeTab) {
            case 'courts':
                return (
                    <CourtsTab
                        courts={courts}
                        event={event}
                        copiedId={copiedId}
                        onCopy={handleCopy}
                        onShowQr={(court) => setSelectedQrCourt(court)}
                    />
                );
            case 'schedule':
                return <ScheduleTab matchSchedule={matchSchedule} rundowns={rundowns} />;
            case 'champions':
                return <ChampionsTab championGroups={championGroups} />;
            case 'embu':
                return <EmbuScoresTab embuScores={embuScores} />;
            case 'randori':
                return <RandoriBracketTab randoriBrackets={randoriBrackets} />;
            case 'contingents':
                return <ContingentsTab contingents={contingents} />;
            case 'referees':
                return <RefereesTab referees={referees} />;
            case 'payment':
                return (
                    <PaymentTab
                        event={event}
                        ageCategories={ageCategories}
                        paymentMethods={paymentMethods}
                        copiedId={copiedId}
                        onCopy={handleCopy}
                        hasDashboard={hasDashboard}
                        actionHref={actionHref}
                    />
                );
            case 'categories':
            default:
                return (
                    <CategoriesTab
                        ageCategories={ageCategories}
                        matchCategories={matchCategories}
                        participantRequirements={event?.participant_requirements}
                    />
                );
        }
    };

    const mapsHref =
        event?.google_maps_url ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            [event?.venue, event?.city, event?.province].filter(Boolean).join(', '),
        )}`;

    const liveTickerCourts = useMemo(
        () => courts.filter((c) => Boolean(c.active_match)),
        [courts],
    );

    return (
        <MotionConfig reducedMotion="user">
            <div className="event-page min-h-screen antialiased">
                <Head title={`${event.name} - Smart PERKEMI`}>
                    {event.description && <meta name="description" content={event.description} />}
                </Head>
                <a href="#event-tab-stage" className="event-skip-link">
                    Langsung ke informasi kejuaraan
                </a>

                {/* Original Brand & Menu Header + Responsive Mobile Drawer */}
                <header id="event-top" className="event-header">
                    <div className="event-container flex min-h-20 items-center justify-between gap-3 py-3">
                        <Link
                            href="/"
                            className="event-brand flex min-w-0 shrink items-center gap-3"
                            aria-label="SMART PERKEMI, beranda"
                        >
                            <img
                                src="/android-chrome-192x192.png"
                                width="44"
                                height="44"
                                alt=""
                                className="h-11 w-11 shrink-0 object-contain"
                            />
                            <span className="min-w-0">
                                <span className="event-brand-name block truncate">
                                    SMART PERKEMI
                                </span>
                                <span className="event-brand-caption block truncate">
                                    Portal kejuaraan Shorinji Kempo
                                </span>
                            </span>
                        </Link>

                        <nav aria-label="Navigasi utama" className="hidden items-center gap-7 xl:flex">
                            <button
                                type="button"
                                onClick={() => activateTab('referees')}
                                className="event-text-link"
                            >
                                Wasit
                            </button>
                            <Link className="event-text-link" href="/athelete">
                                Peserta
                            </Link>
                            <button
                                type="button"
                                onClick={() => activateTab('schedule')}
                                className="event-text-link"
                            >
                                Jadwal
                            </button>
                            <button
                                type="button"
                                onClick={() => activateTab('champions')}
                                className="event-text-link"
                            >
                                Hasil Juara
                            </button>
                            <button
                                type="button"
                                onClick={() => activateTab('embu')}
                                className="event-text-link"
                            >
                                Skor Embu
                            </button>
                            <button
                                type="button"
                                onClick={() => activateTab('randori')}
                                className="event-text-link"
                            >
                                Randori
                            </button>
                        </nav>

                        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                            <ThemeToggle />
                            {hasDashboard ? (
                                <>
                                    <Link
                                        href="/logout"
                                        method="post"
                                        as="button"
                                        className="event-text-link hidden sm:inline-flex"
                                    >
                                        Keluar
                                    </Link>
                                    <Link
                                        href={dashboardHref}
                                        className="event-button event-button-primary"
                                    >
                                        Dashboard
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        className="event-text-link hidden sm:inline-flex"
                                    >
                                        Masuk
                                    </Link>
                                    <Link
                                        href={registrationHref}
                                        className="event-button event-button-primary"
                                    >
                                        <span className="sm:hidden">Daftar</span>
                                        <span className="hidden sm:inline">Daftar kontingen</span>
                                    </Link>
                                </>
                            )}
                            <Button
                                variant="unstyled"
                                size="none"
                                className="home-menu-button xl:hidden"
                                aria-expanded={mobileMenuOpen}
                                aria-controls="event-mobile-nav"
                                aria-label={mobileMenuOpen ? 'Tutup navigasi' : 'Buka navigasi'}
                                onClick={() => setMobileMenuOpen((prev) => !prev)}
                            >
                                <Icon name={mobileMenuOpen ? 'fa-xmark' : 'fa-bars'} />
                            </Button>
                        </div>
                    </div>

                    {mobileMenuOpen && (
                        <nav
                            id="event-mobile-nav"
                            aria-label="Navigasi seluler"
                            className="home-mobile-nav event-container flex flex-col border-t border-[var(--event-border)] xl:hidden"
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setMobileMenuOpen(false);
                                }
                            }}
                        >
                            <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                                Beranda Event
                            </Link>
                            <Link href="/athelete" onClick={() => setMobileMenuOpen(false)}>
                                Peserta &amp; Prestasi Atlet
                            </Link>
                            <button
                                type="button"
                                className="py-3 text-left text-sm text-[var(--event-muted)]"
                                onClick={() => activateTab('referees')}
                            >
                                Wasit ({referees.length})
                            </button>
                            <button
                                type="button"
                                className="py-3 text-left text-sm text-[var(--event-muted)]"
                                onClick={() => activateTab('schedule')}
                            >
                                Jadwal ({matchSchedule.length})
                            </button>
                            <button
                                type="button"
                                className="py-3 text-left text-sm text-[var(--event-muted)]"
                                onClick={() => activateTab('champions')}
                            >
                                Hasil Juara ({championGroups.length})
                            </button>
                            <button
                                type="button"
                                className="py-3 text-left text-sm text-[var(--event-muted)]"
                                onClick={() => activateTab('embu')}
                            >
                                Skor Embu ({embuScores.length})
                            </button>
                            <button
                                type="button"
                                className="py-3 text-left text-sm text-[var(--event-muted)]"
                                onClick={() => activateTab('randori')}
                            >
                                Bagan Randori ({randoriBrackets.length})
                            </button>
                            {hasDashboard ? (
                                <Link
                                    href="/logout"
                                    method="post"
                                    as="button"
                                    className="py-3 text-left text-sm font-medium text-[var(--event-accent)]"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Keluar
                                </Link>
                            ) : (
                                <Link
                                    href="/login"
                                    className="font-medium text-[var(--event-accent)]"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Masuk ke portal
                                </Link>
                            )}
                        </nav>
                    )}
                </header>

                {event.is_training_mode && (
                    <div
                        role="alert"
                        className="flex items-center justify-center gap-2.5 border-b border-amber-600/30 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 px-4 py-3 text-center text-xs font-bold text-amber-950 shadow-inner sm:text-sm"
                    >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-950/15 text-amber-950">
                            <Icon name="fa-flask" />
                        </span>
                        <span>
                            <strong>MODE GLADI BERSIH / SIMULASI:</strong> Seluruh jadwal, bagan,
                            dan perolehan skor pada event ini adalah data simulasi uji coba dan
                            bukan hasil resmi kejuaraan.
                        </span>
                    </div>
                )}

                {/* Non-sticky Live Tatami Ticker Banner (clicking auto-opens Gelanggang tab & scrolls to court) */}
                {liveTickerCourts.length > 0 && (
                    <aside
                        aria-label="Ticker Pertandingan Tatami Terbuka"
                        className="border-b border-[#d4a843]/30 bg-[#120f0d] px-4 py-2.5 shadow-md"
                    >
                        <div className="event-container flex items-center justify-between gap-4">
                            <div className="flex shrink-0 items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
                                </span>
                                <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-red-500">
                                    <span>LIVE TATAMI</span>
                                </span>
                            </div>
                            <div className="no-scrollbar flex flex-1 items-center gap-3 overflow-x-auto py-0.5">
                                {liveTickerCourts.map((court) => (
                                    <button
                                        key={`ticker-${court.id}`}
                                        type="button"
                                        onClick={() =>
                                            activateTab('courts', {
                                                scrollTargetId: `court-${court.id}`,
                                                shouldScroll: true,
                                            })
                                        }
                                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs whitespace-nowrap text-white shadow-xs transition hover:border-[#d4a843]/60 hover:bg-white/10"
                                    >
                                        <span className="font-bold text-[#d4a843]">{court.name}:</span>
                                        <span className="font-medium text-white/80">
                                            Partai #{court.active_match.sequence} ·{' '}
                                            {court.active_match.category}
                                        </span>
                                        <span className="rounded border border-white/10 bg-black/40 px-2 py-0.5 font-mono font-bold text-amber-300">
                                            {court.active_match.score_display}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => activateTab('courts')}
                                className="hidden shrink-0 items-center gap-1.5 text-xs font-bold text-[#d4a843] hover:underline lg:inline-flex"
                            >
                                <span>Layar Arena</span>
                                <Icon name="fa-arrow-down" className="text-[10px]" />
                            </button>
                        </div>
                    </aside>
                )}

                {/* Original Event Hero & Summary Strip */}
                <section className="event-hero" aria-labelledby="event-title">
                    <div className="event-container">
                        <div className="event-breadcrumb flex flex-wrap items-center gap-2 pt-7 text-xs sm:pt-9">
                            {isHomepage ? (
                                <span>Portal kejuaraan</span>
                            ) : (
                                <Link href="/" className="event-text-link">
                                    Beranda
                                </Link>
                            )}
                            <Icon name="fa-chevron-right" className="text-[8px]" />
                            <span>Informasi event</span>
                        </div>

                        <div className="grid items-center gap-10 py-9 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)] lg:gap-16 lg:pt-10 lg:pb-14">
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                className="min-w-0"
                            >
                                {event.status === 'ongoing' ? (
                                    <div className="mb-3 inline-flex animate-pulse items-center gap-2 rounded-full border border-red-500/40 bg-red-500/15 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-red-600 shadow-sm dark:text-red-400">
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
                                        </span>
                                        LIVE · Sedang Berlangsung
                                    </div>
                                ) : (
                                    <div className={`event-status event-status-${status.tone}`}>
                                        <span aria-hidden="true" />
                                        {status.label}
                                    </div>
                                )}

                                <h1 id="event-title" className="event-title">
                                    {event.name}
                                </h1>
                                {event.description && (
                                    <p className="event-intro">{event.description}</p>
                                )}

                                <dl className="event-hero-details grid gap-5 sm:grid-cols-2">
                                    <div className="flex items-start gap-3">
                                        <Icon name="fa-calendar-days" className="event-detail-icon" />
                                        <div>
                                            <dt>Pelaksanaan</dt>
                                            <dd>{event.dates_formatted}</dd>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Icon
                                            name="fa-location-dot"
                                            className="event-detail-icon text-red-500"
                                        />
                                        <div className="min-w-0">
                                            <dt>Lokasi kejuaraan</dt>
                                            <dd>
                                                <a
                                                    href={mapsHref}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 font-medium text-inherit hover:underline"
                                                    title="Buka petunjuk arah di Google Maps"
                                                >
                                                    <span>{event.venue}</span>
                                                    <Icon
                                                        name="fa-arrow-up-right-from-square"
                                                        className="shrink-0 text-[10px] opacity-70"
                                                    />
                                                </a>
                                                {event.city && (
                                                    <span className="event-muted mt-1 block font-normal">
                                                        {event.city}
                                                        {event.province ? `, ${event.province}` : ''}
                                                    </span>
                                                )}
                                            </dd>
                                        </div>
                                    </div>
                                </dl>

                                <div className="mt-8 flex flex-wrap items-center gap-3">
                                    <Link
                                        href={actionHref}
                                        className="event-button event-button-primary event-button-large"
                                    >
                                        {hasDashboard ? 'Buka dashboard' : 'Daftarkan kontingen'}
                                        <Icon
                                            name={hasDashboard ? 'fa-gauge-high' : 'fa-arrow-right'}
                                            className="text-xs"
                                        />
                                    </Link>
                                    {event.rules_doc ? (
                                        <a
                                            href={event.rules_doc}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="event-button event-button-secondary event-button-large"
                                        >
                                            <Icon name="fa-file-arrow-down" />
                                            Proposal &amp; juknis
                                        </a>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => activateTab('categories')}
                                            className="event-button event-button-secondary event-button-large"
                                        >
                                            Lihat nomor pertandingan
                                        </button>
                                    )}
                                </div>

                                {!isAuthenticated && (
                                    <p className="event-login-note">
                                        Sudah memiliki akun?{' '}
                                        <Link href="/login">Masuk ke portal kontingen</Link>
                                    </p>
                                )}
                            </motion.div>

                            <figure className="event-poster mx-auto w-full max-w-sm lg:mr-0 lg:ml-auto">
                                {event.cover_image_url ? (
                                    <a
                                        href={event.cover_image_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-label={`Lihat poster lengkap ${event.name}`}
                                        className="event-poster-link block"
                                    >
                                        <img
                                            src={event.cover_image_url}
                                            alt={`Poster ${event.name}`}
                                            width="800"
                                            height="1000"
                                            fetchPriority="high"
                                            className="event-poster-image"
                                        />
                                    </a>
                                ) : (
                                    <div className="event-poster-placeholder flex aspect-[4/5] flex-col items-center justify-center gap-6 p-8 text-center">
                                        <img
                                            src="/android-chrome-192x192.png"
                                            width="100"
                                            height="100"
                                            alt=""
                                        />
                                        <p className="text-xl font-semibold">{event.name}</p>
                                        <p className="event-muted text-sm">
                                            Poster kejuaraan akan diumumkan panitia.
                                        </p>
                                    </div>
                                )}
                                <figcaption className="flex items-center justify-between gap-4 px-1 pt-4 text-xs">
                                    <span>{event.edition || 'Shorinji Kempo'}</span>
                                    {event.cover_image_url && (
                                        <Icon
                                            name="fa-up-right-from-square"
                                            className="shrink-0"
                                        />
                                    )}
                                </figcaption>
                            </figure>
                        </div>
                    </div>
                </section>

                <section className="event-summary" aria-label="Ringkasan pendaftaran">
                    <dl className="event-container grid grid-cols-2 lg:grid-cols-4">
                        <div>
                            <dt>Batas pendaftaran</dt>
                            <dd>{event.registration_end_formatted || 'Hingga kuota terpenuhi'}</dd>
                        </div>
                        <div>
                            <dt>Biaya kontingen</dt>
                            <dd>{event.is_paid ? event.fee_per_contingent_formatted : 'Gratis'}</dd>
                        </div>
                        <div>
                            <dt>Biaya per atlet</dt>
                            <dd>{event.is_paid ? event.fee_per_athlete_formatted : 'Gratis'}</dd>
                        </div>
                        <div>
                            <dt>Nomor per atlet</dt>
                            <dd>
                                {event.max_match_categories_per_athlete > 0
                                    ? `Maksimal ${event.max_match_categories_per_athlete} nomor`
                                    : 'Tidak dibatasi'}
                            </dd>
                        </div>
                    </dl>
                </section>

                {/* Sticky Scrollable Tab Navigation */}
                <nav
                    className="event-section-nav"
                    aria-label="Navigasi informasi event"
                >
                    <div className="event-container flex items-center gap-2">
                        <div
                            role="tablist"
                            aria-label="Bagian halaman kejuaraan"
                            className="event-section-nav-scroll flex min-w-0 flex-1 items-center gap-5 overflow-x-auto sm:gap-8"
                        >
                            {tabs.map((tab, index) => {
                                const isSelected = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        ref={(el) => {
                                            tabButtonRefs.current[tab.id] = el;
                                        }}
                                        id={`tab-btn-${tab.id}`}
                                        role="tab"
                                        type="button"
                                        aria-selected={isSelected}
                                        aria-controls="event-tab-stage"
                                        tabIndex={isSelected ? 0 : -1}
                                        onClick={() => activateTab(tab.id)}
                                        onKeyDown={(e) => handleTabKeyDown(e, index)}
                                        className={`event-tab-btn ${
                                            tab.id === 'courts' ? 'font-bold text-red-500' : ''
                                        }`}
                                    >
                                        {tab.id === 'courts' && (
                                            <Icon name="fa-tv" className="text-xs" />
                                        )}
                                        <span>{tab.label}</span>
                                        {typeof tab.count === 'number' && (
                                            <span className="event-tab-badge">{tab.count}</span>
                                        )}
                                        {isSelected && (
                                            <motion.span
                                                layoutId="public-event-active-tab"
                                                transition={{
                                                    type: 'spring',
                                                    stiffness: 420,
                                                    damping: 34,
                                                }}
                                                className="event-tab-indicator"
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {tabs.length > 1 && (
                            <div className="flex shrink-0 items-center gap-1 border-l border-[var(--event-border)] pl-2">
                                <button
                                    type="button"
                                    onClick={() => goToAdjacentTab(-1)}
                                    aria-label={`Tab sebelumnya: ${prevTab.label}`}
                                    title={`Tab sebelumnya: ${prevTab.label}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--event-border)] bg-[var(--event-surface)] text-xs font-semibold text-[var(--event-ink)] transition hover:border-[var(--event-accent)] hover:text-[var(--event-accent)]"
                                >
                                    ←
                                </button>
                                <button
                                    type="button"
                                    onClick={() => goToAdjacentTab(1)}
                                    aria-label={`Tab berikutnya: ${nextTab.label}`}
                                    title={`Tab berikutnya: ${nextTab.label}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--event-border)] bg-[var(--event-surface)] text-xs font-semibold text-[var(--event-ink)] transition hover:border-[var(--event-accent)] hover:text-[var(--event-accent)]"
                                >
                                    →
                                </button>
                            </div>
                        )}
                    </div>
                </nav>

                {/* Active Tab Panel Stage */}
                <main
                    id="event-tab-stage"
                    role="tabpanel"
                    aria-labelledby={`tab-btn-${activeTab}`}
                    className="event-tab-stage event-container min-w-0 py-8 sm:py-10"
                >
                    <AnimatePresence mode="wait" custom={tabDirection} initial={false}>
                        <motion.div
                            key={activeTab}
                            custom={tabDirection}
                            variants={TAB_SLIDE_VARIANTS}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                            className="min-w-0"
                        >
                            {activeTabContent()}
                        </motion.div>
                    </AnimatePresence>

                    {/* Auto-advance boundary strip (Desktop & Mobile) */}
                    {tabs.length > 1 && (
                        <section
                            aria-label="Navigasi antar tab"
                            className="mt-10 overflow-hidden rounded-2xl border border-[var(--event-border)] bg-[var(--event-surface)]/80 p-4"
                        >
                            <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-[var(--event-border)]">
                                <motion.div
                                    className="h-full rounded-full bg-[var(--event-accent)]"
                                    animate={{ width: `${Math.round(overscrollProgress * 100)}%` }}
                                    transition={{ duration: 0.08, ease: 'linear' }}
                                />
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <button
                                    type="button"
                                    onClick={() => goToAdjacentTab(-1)}
                                    className="inline-flex items-center justify-between gap-2 rounded-xl border border-[var(--event-border)] bg-[var(--event-bg)] px-3.5 py-2.5 text-left text-xs font-medium text-[var(--event-ink)] transition hover:border-[var(--event-accent)] sm:justify-start"
                                >
                                    <span className="text-[var(--event-muted)]">← Sebelumnya</span>
                                    <span className="font-semibold">{prevTab.label}</span>
                                </button>

                                <p className="text-center text-[11px] text-[var(--event-muted)]">
                                    {overscrollProgress > 0.05
                                        ? `Lanjut geser untuk membuka tab ${nextTab.label}…`
                                        : activeTabIndex === tabs.length - 1
                                          ? `Sudah di tab terakhir — scroll mentok ke bawah untuk kembali ke ${nextTab.label}`
                                          : `Scroll mentok ke bawah (atau geser kiri) untuk otomatis pindah ke ${nextTab.label}`}
                                </p>

                                <button
                                    type="button"
                                    onClick={() => goToAdjacentTab(1)}
                                    className="inline-flex items-center justify-between gap-2 rounded-xl bg-[var(--event-accent)] px-4 py-2.5 text-right text-xs font-semibold text-white transition hover:opacity-90 sm:justify-end"
                                >
                                    <span>
                                        {activeTabIndex === tabs.length - 1 ? 'Awal: ' : 'Lanjut: '}
                                        {nextTab.label} →
                                    </span>
                                </button>
                            </div>
                        </section>
                    )}
                </main>

                {/* Original Footer */}
                <footer className="event-footer mt-16 border-t border-white/10 py-12">
                    <div className="event-container flex flex-col justify-between gap-7 md:flex-row md:items-center">
                        <div>
                            <p className="event-brand-name font-black tracking-wider">
                                SMART PERKEMI
                            </p>
                            <p className="event-muted mt-2 text-xs leading-6">
                                Pengurus Besar Persaudaraan Shorinji Kempo Indonesia
                                <br />
                                Jl. Percetakan Negara No. 10 Jakarta Pusat · Kontak:
                                sekretariat@perkemi.org
                                <br />
                                &copy; {new Date().getFullYear()} SMART PERKEMI. Hak cipta
                                dilindungi.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-6 text-sm">
                            <Link href="/" className="event-text-link">
                                Beranda
                            </Link>
                            <Link href="/athelete" className="event-text-link">
                                Peserta
                            </Link>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-1.5 font-semibold text-[#d4a843] hover:underline"
                            >
                                <Icon name="fa-user-shield" className="text-xs" />
                                Login Panitera / Ofisial
                            </Link>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-1.5 font-semibold hover:underline"
                            >
                                <Icon name="fa-users" className="text-xs" />
                                Login Koordinator
                            </Link>
                            <a
                                href="#event-top"
                                className="event-text-link inline-flex items-center gap-1"
                            >
                                Kembali ke atas <Icon name="fa-arrow-up" className="text-xs" />
                            </a>
                        </div>
                    </div>
                </footer>

                {/* Original QR Monitor Modal with Framer Motion */}
                <AnimatePresence>
                    {selectedQrCourt && (
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="qr-modal-title"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.16 }}
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
                            onClick={() => setSelectedQrCourt(null)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.94, y: 8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.96, y: 6 }}
                                transition={{ duration: 0.18 }}
                                className="relative w-full max-w-sm rounded-3xl border border-white/20 bg-[#161d26] p-6 text-white shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d4a843]/20 text-[#d4a843]">
                                            <Icon name="fa-qrcode" className="text-sm" />
                                        </span>
                                        <div>
                                            <h4 id="qr-modal-title" className="text-sm font-bold text-white">
                                                QR Monitor Arena
                                            </h4>
                                            <p className="text-[11px] text-[#d4a843]">
                                                {selectedQrCourt.name}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="unstyled"
                                        size="none"
                                        onClick={() => setSelectedQrCourt(null)}
                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
                                        aria-label="Tutup modal QR"
                                    >
                                        <Icon name="fa-xmark" />
                                    </Button>
                                </div>

                                <div className="my-5 flex flex-col items-center">
                                    <div className="rounded-2xl bg-white p-4 shadow-xl">
                                        <img
                                            src={selectedQrCourt.qr_url}
                                            alt={`QR Code ${selectedQrCourt.name}`}
                                            width="220"
                                            height="220"
                                            className="h-56 w-56 rounded-lg object-contain"
                                        />
                                    </div>
                                    <p className="mt-4 text-center text-xs leading-relaxed text-white/70">
                                        Arahkan kamera smartphone penonton di tribun atau ofisial di
                                        area pemanasan untuk membuka layar gelanggang ini langsung
                                        tanpa login.
                                    </p>
                                </div>

                                {selectedQrCourt.monitor_full_url && (
                                    <div className="rounded-xl border border-white/10 bg-black/40 p-2.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate font-mono text-[11px] text-white/60 select-all">
                                                {selectedQrCourt.monitor_full_url}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="unstyled"
                                                size="none"
                                                onClick={() =>
                                                    handleCopy(
                                                        selectedQrCourt.monitor_full_url,
                                                        `court-${selectedQrCourt.id}`,
                                                    )
                                                }
                                                className="shrink-0 rounded bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-white/20"
                                            >
                                                {copiedId === `court-${selectedQrCourt.id}`
                                                    ? 'Tersalin!'
                                                    : 'Salin'}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-5 flex gap-2">
                                    {selectedQrCourt.monitor_url && (
                                        <a
                                            href={selectedQrCourt.monitor_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="event-button event-button-primary flex-1 text-center text-xs font-bold"
                                        >
                                            <Icon name="fa-arrow-up-right-from-square" /> Buka Layar
                                            Penuh
                                        </a>
                                    )}
                                    <Button
                                        type="button"
                                        variant="unstyled"
                                        size="none"
                                        onClick={() => setSelectedQrCourt(null)}
                                        className="event-button event-button-secondary text-xs"
                                    >
                                        Tutup
                                    </Button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </MotionConfig>
    );
}
