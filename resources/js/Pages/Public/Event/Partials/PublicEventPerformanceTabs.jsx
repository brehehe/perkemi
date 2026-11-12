import Select from '@/Components/UI/Forms/Select';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { RandoriBracket } from './PublicMatchCard';
import {
    FilterPillGroup,
    TabEmptyState,
    TabPagination,
    TabPanelMotion,
    TabSearchInput,
    TabSectionHeader,
} from './PublicEventTabPrimitives';

const EMBU_PAGE_SIZE = 10;

function formatDuration(seconds) {
    if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) {
        return null;
    }

    const total = Math.max(0, Math.round(Number(seconds)));
    const mins = Math.floor(total / 60);
    const secs = total % 60;

    return `${mins}:${String(secs).padStart(2, '0')}`;
}

function getInitialQueryParam(name) {
    if (typeof window === 'undefined') {
        return null;
    }

    return new URLSearchParams(window.location.search).get(name);
}

export function EmbuScoresTab({ embuScores = [] }) {
    const categories = useMemo(() => {
        const counts = new Map();

        embuScores.forEach((item) => {
            const name = item.category || 'Lainnya';
            counts.set(name, (counts.get(name) || 0) + 1);
        });

        return Array.from(counts.entries()).map(([name, count]) => ({
            name,
            count,
        }));
    }, [embuScores]);

    const [selectedCategory, setSelectedCategory] = useState(() => {
        const fromUrl = getInitialQueryParam('embu_category');
        if (fromUrl && categories.some((c) => c.name === fromUrl)) {
            return fromUrl;
        }

        return categories[0]?.name || '__all__';
    });

    const [selectedPool, setSelectedPool] = useState('__all__');
    const [selectedRound, setSelectedRound] = useState('__all__');
    const [sortBy, setSortBy] = useState('sequence');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (
            selectedCategory !== '__all__' &&
            !categories.some((c) => c.name === selectedCategory)
        ) {
            setSelectedCategory(categories[0]?.name || '__all__');
        }
    }, [categories, selectedCategory]);

    useEffect(() => {
        setSelectedPool('__all__');
        setSelectedRound('__all__');
        setCurrentPage(1);
    }, [selectedCategory]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedPool, selectedRound, sortBy, searchQuery]);

    const categoryOptions = useMemo(() => {
        const opts = categories.map((cat) => ({
            value: cat.name,
            label: cat.name,
            sublabel: `${cat.count} penampilan`,
        }));

        if (categories.length > 1) {
            opts.push({
                value: '__all__',
                label: 'Semua Nomor Embu',
                sublabel: `${embuScores.length} penampilan (dipaginasi)`,
            });
        }

        return opts;
    }, [categories, embuScores.length]);

    const categoryScopedScores = useMemo(() => {
        if (selectedCategory === '__all__') {
            return embuScores;
        }

        return embuScores.filter(
            (item) => (item.category || 'Lainnya') === selectedCategory,
        );
    }, [embuScores, selectedCategory]);

    const poolOptions = useMemo(() => {
        const pools = Array.from(
            new Set(
                categoryScopedScores
                    .map((item) => item.pool)
                    .filter((pool) => pool !== null && pool !== undefined && String(pool).trim() !== ''),
            ),
        );

        if (pools.length <= 1) {
            return [];
        }

        return [
            { value: '__all__', label: 'Semua Pool', count: categoryScopedScores.length },
            ...pools.map((pool) => ({
                value: String(pool),
                label: `Pool ${pool}`,
                count: categoryScopedScores.filter((item) => String(item.pool) === String(pool)).length,
            })),
        ];
    }, [categoryScopedScores]);

    const roundOptions = useMemo(() => {
        const rounds = Array.from(
            new Set(
                categoryScopedScores
                    .map((item) => item.round)
                    .filter((round) => round !== null && round !== undefined && String(round).trim() !== ''),
            ),
        );

        if (rounds.length <= 1) {
            return [];
        }

        return [
            { value: '__all__', label: 'Semua Babak', count: categoryScopedScores.length },
            ...rounds.map((round) => ({
                value: String(round),
                label: String(round),
                count: categoryScopedScores.filter((item) => String(item.round) === String(round)).length,
            })),
        ];
    }, [categoryScopedScores]);

    const filteredScores = useMemo(() => {
        const term = searchQuery.trim().toLowerCase();

        const list = categoryScopedScores.filter((item) => {
            if (selectedPool !== '__all__' && String(item.pool || '') !== selectedPool) {
                return false;
            }
            if (selectedRound !== '__all__' && String(item.round || '') !== selectedRound) {
                return false;
            }
            if (term) {
                const haystack = [
                    item.participant,
                    item.category,
                    item.court,
                    item.round,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                if (!haystack.includes(term)) {
                    return false;
                }
            }
            return true;
        });

        return [...list].sort((a, b) => {
            if (sortBy === 'score_desc') {
                if (Boolean(a.is_disqualified) !== Boolean(b.is_disqualified)) {
                    return a.is_disqualified ? 1 : -1;
                }
                const scoreA = Number(a.final_score ?? -1);
                const scoreB = Number(b.final_score ?? -1);
                if (scoreB !== scoreA) {
                    return scoreB - scoreA;
                }
            }

            const seqA = Number(a.sequence ?? Number.MAX_SAFE_INTEGER);
            const seqB = Number(b.sequence ?? Number.MAX_SAFE_INTEGER);
            if (seqA !== seqB) {
                return seqA - seqB;
            }

            return String(a.participant || '').localeCompare(String(b.participant || ''), 'id');
        });
    }, [categoryScopedScores, selectedPool, selectedRound, searchQuery, sortBy]);

    const totalPages = Math.max(1, Math.ceil(filteredScores.length / EMBU_PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pagedScores = useMemo(() => {
        const start = (safePage - 1) * EMBU_PAGE_SIZE;
        return filteredScores.slice(start, start + EMBU_PAGE_SIZE);
    }, [filteredScores, safePage]);

    const handleCategoryChange = (value) => {
        const nextVal = value || categories[0]?.name || '__all__';
        setSelectedCategory(nextVal);

        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (nextVal === '__all__') {
                url.searchParams.delete('embu_category');
            } else {
                url.searchParams.set('embu_category', nextVal);
            }
            window.history.replaceState({}, '', url.toString());
        }
    };

    const selectedCategoryIndex = categories.findIndex((c) => c.name === selectedCategory);

    return (
        <TabPanelMotion tabKey="embu-panel">
            <TabSectionHeader
                title="Skor & Penilaian Embu"
                subtitle="Filter khusus Embu terpisah per nomor pertandingan agar ringan dan mudah dipantau."
                count={filteredScores.length}
                rightSlot={
                    categories.length > 1 && selectedCategoryIndex >= 0 && (
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                disabled={selectedCategoryIndex <= 0}
                                onClick={() => handleCategoryChange(categories[selectedCategoryIndex - 1].name)}
                                className="rounded-lg border border-[var(--event-border)] bg-[var(--event-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--event-ink)] transition hover:border-[var(--event-accent)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                ← Nomor Sebelumnya
                            </button>
                            <button
                                type="button"
                                disabled={selectedCategoryIndex >= categories.length - 1}
                                onClick={() => handleCategoryChange(categories[selectedCategoryIndex + 1].name)}
                                className="rounded-lg border border-[var(--event-border)] bg-[var(--event-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--event-ink)] transition hover:border-[var(--event-accent)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Berikutnya →
                            </button>
                        </div>
                    )
                }
            />

            {embuScores.length === 0 ? (
                <TabEmptyState
                    title="Belum ada skor Embu dipublikasikan"
                    description="Skor juri dan nilai akhir nomor Embu akan muncul otomatis setelah pertandingan dinilai."
                />
            ) : (
                <>
                    {/* Filter khusus Embu */}
                    <div className="rounded-xl border border-[var(--event-border)] bg-[var(--event-surface)] p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
                                <Select
                                    id="embu-score-filter"
                                    label="Filter Nomor Embu"
                                    ariaLabel="Filter skor berdasarkan nomor Embu"
                                    options={categoryOptions}
                                    value={selectedCategory}
                                    onChange={handleCategoryChange}
                                    clearable={false}
                                    searchPlaceholder="Cari nomor Embu..."
                                    containerClassName="event-filter-select w-full sm:w-80"
                                    labelClassName="event-select-label"
                                />

                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[11px] font-semibold tracking-wider text-[var(--event-muted)] uppercase">
                                        Urutkan
                                    </span>
                                    <FilterPillGroup
                                        label="Urutan skor Embu"
                                        value={sortBy}
                                        onChange={setSortBy}
                                        options={[
                                            { value: 'sequence', label: 'Urutan Tampil' },
                                            { value: 'score_desc', label: 'Nilai Tertinggi' },
                                        ]}
                                    />
                                </div>
                            </div>

                            <TabSearchInput
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Cari peserta / kontingen..."
                                ariaLabel="Cari peserta atau kontingen Embu"
                            />
                        </div>

                        {(poolOptions.length > 0 || roundOptions.length > 0) && (
                            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--event-border)] pt-3">
                                <FilterPillGroup
                                    label="Filter Pool Embu"
                                    options={poolOptions}
                                    value={selectedPool}
                                    onChange={setSelectedPool}
                                />
                                <FilterPillGroup
                                    label="Filter Babak Embu"
                                    options={roundOptions}
                                    value={selectedRound}
                                    onChange={setSelectedRound}
                                />
                            </div>
                        )}
                    </div>

                    {pagedScores.length === 0 ? (
                        <TabEmptyState
                            title="Tidak ada skor Embu sesuai filter"
                            description="Coba ubah nomor Embu, pool, babak, atau kata kunci pencarian."
                            actionLabel="Reset Filter Embu"
                            onAction={() => {
                                setSelectedPool('__all__');
                                setSelectedRound('__all__');
                                setSearchQuery('');
                            }}
                        />
                    ) : (
                        <>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={`${selectedCategory}-${selectedPool}-${selectedRound}-${sortBy}-${safePage}`}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    transition={{ duration: 0.16 }}
                                    className="grid gap-5 lg:grid-cols-2"
                                >
                                    {pagedScores.map((score) => {
                                        const durationText = formatDuration(score.duration_seconds);
                                        const judgeScores = Array.isArray(score.judge_scores)
                                            ? score.judge_scores
                                            : [];

                                        return (
                                            <article key={score.id} className="event-score-card min-w-0">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="event-accent text-xs font-bold">
                                                            Partai #{score.sequence ?? '-'}
                                                            {score.round ? ` · ${score.round}` : ''}
                                                            {score.pool ? ` · Pool ${score.pool}` : ''}
                                                        </p>
                                                        <h3 className="mt-1 break-words text-base font-semibold text-[var(--event-ink)]">
                                                            {score.category}
                                                        </h3>
                                                        <p className="event-muted mt-1 break-words text-sm">
                                                            {score.participant || 'Peserta'}
                                                        </p>
                                                    </div>

                                                    {score.is_disqualified ? (
                                                        <span className="inline-flex shrink-0 items-center rounded-md bg-rose-500/15 px-2.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                                                            DISKUALIFIKASI
                                                        </span>
                                                    ) : (
                                                        <div className="event-final-score shrink-0">
                                                            <span>Nilai akhir</span>
                                                            <strong>
                                                                {score.final_score !== null && score.final_score !== undefined
                                                                    ? Number(score.final_score).toFixed(2)
                                                                    : '-'}
                                                            </strong>
                                                        </div>
                                                    )}
                                                </div>

                                                {judgeScores.length > 0 && (
                                                    <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5">
                                                        {judgeScores.map((judgeScore, index) => (
                                                            <div
                                                                key={`${score.id}-${index}`}
                                                                className="event-judge-score"
                                                            >
                                                                <span>J{index + 1}</span>
                                                                <strong>{Number(judgeScore).toFixed(2)}</strong>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="event-score-meta mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[var(--event-border)] pt-3">
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                        {score.middle_score !== null && score.middle_score !== undefined && (
                                                            <span>
                                                                Skor tengah{' '}
                                                                <strong>{Number(score.middle_score).toFixed(2)}</strong>
                                                            </span>
                                                        )}
                                                        <span>
                                                            Denda{' '}
                                                            <strong>-{Number(score.penalty || 0).toFixed(2)}</strong>
                                                        </span>
                                                        <span>{score.court || 'Court belum dicatat'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {durationText && (
                                                            <span className="font-mono">{durationText}</span>
                                                        )}
                                                        {score.verified_at && (
                                                            <span className="inline-flex items-center rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                                                Terverifikasi
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </motion.div>
                            </AnimatePresence>

                            <TabPagination
                                currentPage={safePage}
                                totalPages={totalPages}
                                totalItems={filteredScores.length}
                                pageSize={EMBU_PAGE_SIZE}
                                onPageChange={setCurrentPage}
                            />
                        </>
                    )}
                </>
            )}
        </TabPanelMotion>
    );
}

export function RandoriBracketTab({ randoriBrackets = [] }) {
    const [selectedBracketId, setSelectedBracketId] = useState(() => {
        const fromUrl = getInitialQueryParam('randori_bracket');
        if (fromUrl && randoriBrackets.some((b) => String(b.id) === String(fromUrl))) {
            return String(fromUrl);
        }

        return randoriBrackets[0]?.id ? String(randoriBrackets[0].id) : '';
    });

    const [statusFilter, setStatusFilter] = useState('__all__');
    const [athleteSearch, setAthleteSearch] = useState('');

    const statusOptions = useMemo(() => {
        const statuses = Array.from(
            new Set(randoriBrackets.map((b) => b.status).filter(Boolean)),
        );

        if (statuses.length <= 1) {
            return [];
        }

        const labelMap = {
            draft: 'Draft',
            ready: 'Siap',
            in_progress: 'Berlangsung',
            ongoing: 'Berlangsung',
            completed: 'Selesai',
        };

        return [
            { value: '__all__', label: 'Semua Status', count: randoriBrackets.length },
            ...statuses.map((st) => ({
                value: st,
                label: labelMap[st] || st,
                count: randoriBrackets.filter((b) => b.status === st).length,
            })),
        ];
    }, [randoriBrackets]);

    const filteredBrackets = useMemo(() => {
        const term = athleteSearch.trim().toLowerCase();

        return randoriBrackets.filter((bracket) => {
            if (statusFilter !== '__all__' && bracket.status !== statusFilter) {
                return false;
            }
            if (!term) {
                return true;
            }

            if ((bracket.category || '').toLowerCase().includes(term)) {
                return true;
            }

            const rounds = bracket.rounds || [];
            return rounds.some((round) =>
                (round.matches || []).some((m) => {
                    const text = [
                        m.aka_label,
                        m.shiro_label,
                        m.aka_contingent,
                        m.shiro_contingent,
                        m.participant,
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();
                    return text.includes(term);
                }),
            );
        });
    }, [randoriBrackets, statusFilter, athleteSearch]);

    useEffect(() => {
        if (
            filteredBrackets.length > 0 &&
            !filteredBrackets.some((b) => String(b.id) === String(selectedBracketId))
        ) {
            setSelectedBracketId(String(filteredBrackets[0].id));
        }
    }, [filteredBrackets, selectedBracketId]);

    const bracketSelectOptions = useMemo(
        () =>
            filteredBrackets.map((bracket) => {
                const matchCount = (bracket.rounds || []).reduce(
                    (sum, r) => sum + (r.matches?.length || 0),
                    0,
                );
                const formatLabel =
                    bracket.format === 'double_elimination'
                        ? 'Gugur Ganda'
                        : bracket.format === 'round_robin'
                          ? 'Round Robin'
                          : 'Sistem Gugur';

                return {
                    value: String(bracket.id),
                    label: bracket.category || `Bagan #${bracket.id}`,
                    sublabel: `${formatLabel} · ${matchCount} partai`,
                };
            }),
        [filteredBrackets],
    );

    const activeIndex = filteredBrackets.findIndex(
        (b) => String(b.id) === String(selectedBracketId),
    );
    const activeBracket =
        activeIndex >= 0 ? filteredBrackets[activeIndex] : filteredBrackets[0] || null;

    const handleBracketChange = (value) => {
        const nextId = String(value || '');
        setSelectedBracketId(nextId);

        if (typeof window !== 'undefined' && nextId) {
            const url = new URL(window.location.href);
            url.searchParams.set('randori_bracket', nextId);
            window.history.replaceState({}, '', url.toString());
        }
    };

    return (
        <TabPanelMotion tabKey="randori-panel">
            <TabSectionHeader
                title="Bagan Pertandingan Randori"
                subtitle="Pilih 1 kelas Randori pada filter khusus di bawah agar bagan tetap ringkas dan ringan."
                count={filteredBrackets.length}
                rightSlot={
                    filteredBrackets.length > 1 && activeIndex >= 0 && (
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                disabled={activeIndex <= 0}
                                onClick={() =>
                                    handleBracketChange(filteredBrackets[activeIndex - 1].id)
                                }
                                className="rounded-lg border border-[var(--event-border)] bg-[var(--event-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--event-ink)] transition hover:border-[var(--event-accent)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                ← Kelas Sebelumnya
                            </button>
                            <button
                                type="button"
                                disabled={activeIndex >= filteredBrackets.length - 1}
                                onClick={() =>
                                    handleBracketChange(filteredBrackets[activeIndex + 1].id)
                                }
                                className="rounded-lg border border-[var(--event-border)] bg-[var(--event-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--event-ink)] transition hover:border-[var(--event-accent)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Berikutnya →
                            </button>
                        </div>
                    )
                }
            />

            {randoriBrackets.length === 0 ? (
                <TabEmptyState
                    title="Belum ada bagan Randori dipublikasikan"
                    description="Bagan pertandingan Randori akan tersedia setelah proses drawing / pengundian selesai."
                />
            ) : (
                <>
                    {/* Filter khusus Randori */}
                    <div className="rounded-xl border border-[var(--event-border)] bg-[var(--event-surface)] p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <Select
                                id="randori-bracket-filter"
                                label="Filter Kelas Randori"
                                ariaLabel="Pilih bagan kelas Randori"
                                options={bracketSelectOptions}
                                value={activeBracket ? String(activeBracket.id) : ''}
                                onChange={handleBracketChange}
                                clearable={false}
                                searchPlaceholder="Cari kelas Randori..."
                                containerClassName="event-filter-select w-full sm:w-96"
                                labelClassName="event-select-label"
                            />

                            <TabSearchInput
                                value={athleteSearch}
                                onChange={setAthleteSearch}
                                placeholder="Cari atlet / kontingen di bagan..."
                                ariaLabel="Cari atlet atau kontingen pada bagan Randori"
                            />
                        </div>

                        {statusOptions.length > 0 && (
                            <div className="mt-3 border-t border-[var(--event-border)] pt-3">
                                <FilterPillGroup
                                    label="Filter Status Bagan Randori"
                                    options={statusOptions}
                                    value={statusFilter}
                                    onChange={setStatusFilter}
                                />
                            </div>
                        )}

                        {athleteSearch.trim() !== '' && filteredBrackets.length > 1 && (
                            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--event-border)] pt-3">
                                <span className="text-xs font-medium text-[var(--event-muted)]">
                                    Kelas cocok ({filteredBrackets.length}):
                                </span>
                                {filteredBrackets.slice(0, 8).map((bracket) => {
                                    const isCurrent =
                                        activeBracket && String(bracket.id) === String(activeBracket.id);
                                    return (
                                        <button
                                            key={bracket.id}
                                            type="button"
                                            onClick={() => handleBracketChange(bracket.id)}
                                            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                                                isCurrent
                                                    ? 'border-[var(--event-accent)] bg-[var(--event-accent)] text-white'
                                                    : 'border-[var(--event-border)] bg-[var(--event-bg)] text-[var(--event-ink)] hover:border-[var(--event-accent)]'
                                            }`}
                                        >
                                            {bracket.category}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {!activeBracket ? (
                        <TabEmptyState
                            title="Tidak ada bagan Randori cocok"
                            description="Coba bersihkan pencarian atlet atau ubah filter status."
                            actionLabel="Reset Filter Randori"
                            onAction={() => {
                                setStatusFilter('__all__');
                                setAthleteSearch('');
                            }}
                        />
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeBracket.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.18 }}
                            >
                                <RandoriBracket bracket={activeBracket} />
                            </motion.div>
                        </AnimatePresence>
                    )}
                </>
            )}
        </TabPanelMotion>
    );
}

