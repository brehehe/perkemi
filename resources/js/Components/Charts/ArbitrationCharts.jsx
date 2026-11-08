import { useEffect, useRef } from 'react';
import ChartJS from 'chart.js/auto';

/**
 * Horizontal Bar Chart: Peringkat Wasit Terbaik (Quality Index 0-100)
 */
export function RefereeRankingChart({ data = [] }) {
    const canvasRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        const topJudges = data.slice(0, 10);
        if (topJudges.length === 0) return;

        const labels = topJudges.map((j) => {
            const prefix = j.rank === 1 ? '🥇 ' : j.rank === 2 ? '🥈 ' : j.rank === 3 ? '🥉 ' : `#${j.rank} `;
            const shortName = j.name.length > 20 ? j.name.substring(0, 18) + '...' : j.name;
            return [prefix + shortName, `(${j.region || 'Nasional'})`];
        });

        const scores = topJudges.map((j) => Number(j.quality_index || 0));

        const backgroundColors = topJudges.map((j) => {
            if (j.rank === 1) return 'rgba(212, 168, 67, 0.95)'; // Gold
            if (j.rank === 2) return 'rgba(156, 163, 175, 0.95)'; // Silver
            if (j.rank === 3) return 'rgba(180, 83, 9, 0.9)';   // Bronze
            return 'rgba(30, 41, 59, 0.85)'; // Dark Slate
        });

        const borderColors = topJudges.map((j) => {
            if (j.rank === 1) return '#d4a843';
            if (j.rank === 2) return '#9ca3af';
            if (j.rank === 3) return '#b45309';
            return '#0f172a';
        });

        const ctx = canvasRef.current.getContext('2d');
        chartInstanceRef.current = new ChartJS(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Indeks Kualitas & Objektivitas',
                        data: scores,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 1.5,
                        borderRadius: 6,
                        borderSkipped: false,
                        barPercentage: 0.72,
                        categoryPercentage: 0.85,
                    },
                ],
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        backgroundColor: '#17120f',
                        titleFont: { size: 12, weight: 'bold' },
                        bodyFont: { size: 11 },
                        padding: 10,
                        cornerRadius: 8,
                        borderColor: '#d4a843',
                        borderWidth: 1,
                        callbacks: {
                            label: (context) => {
                                const judge = topJudges[context.dataIndex];
                                return [
                                    ` Indeks: ${context.parsed.x.toFixed(1)} / 100`,
                                    ` Predikat: ${judge.grade || '—'} (${judge.grade_label || '—'})`,
                                    ` Total Partai Dinilai: ${judge.matches_judged_count || 0}`,
                                    ` Std Dev: ${judge.std_dev ?? 0} · Trimmed: ${judge.trimmed_rate ?? 0}%`,
                                ];
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        min: 0,
                        max: 100,
                        grid: {
                            color: 'rgba(226, 232, 240, 0.6)',
                        },
                        ticks: {
                            font: { size: 10, weight: 'bold' },
                            stepSize: 20,
                            callback: (value) => `${value}`,
                        },
                    },
                    y: {
                        grid: {
                            display: false,
                        },
                        ticks: {
                            font: { size: 11, weight: '600' },
                            color: '#1f2937',
                        },
                    },
                },
            },
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                <i className="fa-solid fa-chart-bar mb-2 text-3xl" aria-hidden="true" />
                <p className="text-xs font-semibold">Belum ada wasit aktif dengan data penilaian untuk diperingkatkan.</p>
            </div>
        );
    }

    return (
        <div className="relative h-72 w-full">
            <canvas ref={canvasRef} />
        </div>
    );
}

/**
 * Doughnut Chart: Proporsi Objektivitas Wasit (Objektif vs Perlu Perhatian vs Anomali)
 */
export function RefereeObjectivityDoughnut({ normal = 0, warning = 0, flagged = 0, rate = 100 }) {
    const canvasRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        const ctx = canvasRef.current.getContext('2d');
        const total = normal + warning + flagged;

        chartInstanceRef.current = new ChartJS(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Objektif & Konsisten', 'Perlu Perhatian', 'Anomali Terdeteksi'],
                datasets: [
                    {
                        data: total > 0 ? [normal, warning, flagged] : [1, 0, 0],
                        backgroundColor: ['#10b981', '#f59e0b', '#f43f5e'],
                        borderColor: '#ffffff',
                        borderWidth: 3,
                        hoverOffset: 6,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        backgroundColor: '#17120f',
                        titleFont: { size: 12, weight: 'bold' },
                        bodyFont: { size: 11 },
                        padding: 10,
                        cornerRadius: 8,
                        borderColor: 'rgba(212, 168, 67, 0.4)',
                        borderWidth: 1,
                        callbacks: {
                            label: (context) => {
                                const val = context.parsed;
                                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                                return ` ${context.label}: ${val} Wasit (${pct}%)`;
                            },
                        },
                    },
                },
            },
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [normal, warning, flagged]);

    return (
        <div className="relative flex h-56 w-full items-center justify-center">
            <canvas ref={canvasRef} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-mono text-3xl font-black tracking-tight text-[#17120f]">
                    {Number(rate || 100).toFixed(0)}%
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716c]">Objektivitas</span>
            </div>
        </div>
    );
}

/**
 * Bar Chart: Distribusi & Akumulasi Skor Penilaian (Histogram)
 */
export function ScoreDistributionChart({ distribution = [] }) {
    const canvasRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        if (!distribution || distribution.length === 0) return;

        const labels = distribution.map((d) => d.label);
        const counts = distribution.map((d) => d.count);
        const colors = distribution.map((d) => d.color || '#3b82f6');

        const ctx = canvasRef.current.getContext('2d');
        chartInstanceRef.current = new ChartJS(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Frekuensi Nilai Masuk',
                        data: counts,
                        backgroundColor: colors,
                        borderColor: colors,
                        borderWidth: 1,
                        borderRadius: 6,
                        barPercentage: 0.65,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        backgroundColor: '#17120f',
                        titleFont: { size: 12, weight: 'bold' },
                        bodyFont: { size: 11 },
                        padding: 10,
                        cornerRadius: 8,
                        borderColor: '#d4a843',
                        borderWidth: 1,
                        callbacks: {
                            label: (context) => {
                                const item = distribution[context.dataIndex];
                                return [
                                    ` Jumlah: ${context.parsed.y} Lembar Nilai`,
                                    ` Porsi: ${item?.percentage ?? 0}% dari total penilaian`,
                                ];
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                        },
                        ticks: {
                            font: { size: 10, weight: 'bold' },
                            color: '#475569',
                        },
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                            font: { size: 10 },
                        },
                        grid: {
                            color: 'rgba(226, 232, 240, 0.6)',
                        },
                    },
                },
            },
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [distribution]);

    return (
        <div className="relative h-60 w-full">
            <canvas ref={canvasRef} />
        </div>
    );
}

/**
 * Bar Chart: Konsistensi Wasit (Mean Score vs Standard Deviation)
 */
export function RefereeConsistencyChart({ referees = [] }) {
    const canvasRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        const activeJudges = referees.filter((r) => r.matches_judged_count > 0).slice(0, 10);
        if (activeJudges.length === 0) return;

        const labels = activeJudges.map((r) => {
            const shortName = r.name.length > 15 ? r.name.substring(0, 13) + '...' : r.name;
            return shortName;
        });

        const stdDevs = activeJudges.map((r) => Number(r.std_dev || 0));
        const trimmedRates = activeJudges.map((r) => Number(r.trimmed_rate || 0));

        const ctx = canvasRef.current.getContext('2d');
        chartInstanceRef.current = new ChartJS(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Standar Deviasi (σ)',
                        data: stdDevs,
                        backgroundColor: 'rgba(239, 68, 68, 0.85)',
                        borderColor: '#dc2626',
                        borderWidth: 1,
                        borderRadius: 4,
                        yAxisID: 'y',
                    },
                    {
                        label: '% Skor Terbuang (Trimmed)',
                        data: trimmedRates,
                        backgroundColor: 'rgba(245, 158, 11, 0.85)',
                        borderColor: '#d97706',
                        borderWidth: 1,
                        borderRadius: 4,
                        yAxisID: 'y1',
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            font: { size: 10, weight: 'bold' },
                        },
                    },
                    tooltip: {
                        backgroundColor: '#17120f',
                        titleFont: { size: 12, weight: 'bold' },
                        bodyFont: { size: 11 },
                        padding: 10,
                        cornerRadius: 8,
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10, weight: 'bold' } },
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Std Dev (σ)',
                            font: { size: 10, weight: 'bold' },
                        },
                        ticks: { font: { size: 9 } },
                        grid: { color: 'rgba(226, 232, 240, 0.5)' },
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        title: {
                            display: true,
                            text: '% Trimmed',
                            font: { size: 10, weight: 'bold' },
                        },
                        ticks: {
                            font: { size: 9 },
                            callback: (v) => `${v}%`,
                        },
                        grid: { drawOnChartArea: false },
                    },
                },
            },
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [referees]);

    return (
        <div className="relative h-60 w-full">
            <canvas ref={canvasRef} />
        </div>
    );
}

/**
 * Bar Chart: Analisis Deviasi Kedaerahan Kontingen (Regional Delta Δ)
 */
export function ContingentDeltaChart({ contingents = [] }) {
    const canvasRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        const validContingents = contingents.slice(0, 10);
        if (validContingents.length === 0) return;

        const labels = validContingents.map((c) => {
            const name = c.contingent_city || c.contingent_name;
            return name.length > 16 ? name.substring(0, 14) + '...' : name;
        });

        const deltas = validContingents.map((c) => Number(c.regional_delta || 0));

        const backgroundColors = deltas.map((d) => {
            if (d >= 3.0) return 'rgba(239, 68, 68, 0.9)'; // Critical Red
            if (d >= 1.5) return 'rgba(245, 158, 11, 0.85)'; // Warning Amber
            if (d <= -1.5) return 'rgba(59, 130, 246, 0.85)'; // Blue (Lower than peers)
            return 'rgba(16, 185, 129, 0.85)'; // Normal Emerald
        });

        const ctx = canvasRef.current.getContext('2d');
        chartInstanceRef.current = new ChartJS(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Deviasi Juri Sedaerah (Δ)',
                        data: deltas,
                        backgroundColor: backgroundColors,
                        borderWidth: 1,
                        borderRadius: 4,
                        barPercentage: 0.65,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#17120f',
                        titleFont: { size: 12, weight: 'bold' },
                        bodyFont: { size: 11 },
                        padding: 10,
                        cornerRadius: 8,
                        borderColor: '#d4a843',
                        borderWidth: 1,
                        callbacks: {
                            label: (context) => {
                                const c = validContingents[context.dataIndex];
                                return [
                                    ` Deviasi Asal: ${c.regional_delta > 0 ? '+' : ''}${c.regional_delta} Poin`,
                                    ` Rata-rata Skor: ${c.average_score}`,
                                    ` Status: ${c.status_label}`,
                                ];
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10, weight: 'bold' } },
                    },
                    y: {
                        ticks: {
                            callback: (v) => `${v > 0 ? '+' : ''}${v}`,
                            font: { size: 9 },
                        },
                        grid: { color: 'rgba(226, 232, 240, 0.6)' },
                    },
                },
            },
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [contingents]);

    return (
        <div className="relative h-60 w-full">
            <canvas ref={canvasRef} />
        </div>
    );
}

