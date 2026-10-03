import { useEffect, useRef, useState } from 'react';
import ChartJS from 'chart.js/auto';

export default function MedalBarChart({ labels = [], gold = [], silver = [], bronze = [] }) {
    const canvasRef = useRef(null);
    const chartInstanceRef = useRef(null);
    const [chartMode, setChartMode] = useState('stacked'); // 'stacked' | 'grouped'

    // Format long labels to 2 lines (Name on top, City on bottom) without diagonal tilt
    const formatLabels = (rawLabels) => {
        return rawLabels.map((rawName) => {
            const clean = rawName.replace(/^Dojo\s+/i, '');
            const words = clean.split(' ');
            if (words.length <= 1) return clean;

            // Put last word (usually city) on second line
            const city = words[words.length - 1];
            const name = words.slice(0, words.length - 1).join(' ');
            return [name, city];
        });
    };

    useEffect(() => {
        if (!canvasRef.current) return;

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        const ctx = canvasRef.current.getContext('2d');
        const formattedLabels = formatLabels(
            labels.length > 0 ? labels : ['Garuda Sakti Surabaya', 'Macan Putih Malang', 'Rajawali Sidoarjo']
        );

        const isStacked = chartMode === 'stacked';

        chartInstanceRef.current = new ChartJS(ctx, {
            type: 'bar',
            data: {
                labels: formattedLabels,
                datasets: [
                    {
                        label: 'Emas (Juara 1)',
                        data: gold,
                        backgroundColor: 'rgba(212, 168, 67, 0.92)',
                        borderColor: '#b8860b',
                        borderWidth: 1,
                        borderRadius: isStacked ? 0 : 5,
                        borderSkipped: isStacked ? false : 'bottom',
                        categoryPercentage: isStacked ? 0.55 : 0.82,
                        barPercentage: isStacked ? 0.75 : 0.9,
                    },
                    {
                        label: 'Perak (Juara 2)',
                        data: silver,
                        backgroundColor: 'rgba(149, 165, 166, 0.88)',
                        borderColor: '#7f8c8d',
                        borderWidth: 1,
                        borderRadius: isStacked ? 0 : 5,
                        borderSkipped: isStacked ? false : 'bottom',
                        categoryPercentage: isStacked ? 0.55 : 0.82,
                        barPercentage: isStacked ? 0.75 : 0.9,
                    },
                    {
                        label: 'Perunggu (Juara 3)',
                        data: bronze,
                        backgroundColor: 'rgba(175, 96, 52, 0.85)',
                        borderColor: '#8b4513',
                        borderWidth: 1,
                        borderRadius: isStacked ? { topLeft: 6, topRight: 6 } : 5,
                        borderSkipped: isStacked ? false : 'bottom',
                        categoryPercentage: isStacked ? 0.55 : 0.82,
                        barPercentage: isStacked ? 0.75 : 0.9,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        bottom: 4,
                    },
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                family: 'DM Sans, sans-serif',
                                size: 11,
                                weight: 600,
                            },
                            color: '#4a443c',
                            boxWidth: 13,
                            boxHeight: 13,
                            borderRadius: 3,
                            useBorderRadius: true,
                            padding: 16,
                        },
                    },
                    tooltip: {
                        backgroundColor: '#0f0d0b',
                        titleFont: { family: 'Cinzel, serif', size: 12, weight: 700 },
                        bodyFont: { family: 'DM Sans, sans-serif', size: 11 },
                        padding: 12,
                        cornerRadius: 8,
                        borderColor: 'rgba(212, 168, 67, 0.4)',
                        borderWidth: 1,
                        callbacks: {
                            title: function (context) {
                                const index = context[0].dataIndex;
                                return labels[index] || '';
                            },
                            footer: function (context) {
                                if (isStacked) {
                                    const index = context[0].dataIndex;
                                    const g = Number(gold[index] || 0);
                                    const s = Number(silver[index] || 0);
                                    const b = Number(bronze[index] || 0);
                                    return `Total: ${g + s + b} Medali`;
                                }
                                return '';
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        stacked: isStacked,
                        grid: {
                            display: false,
                        },
                        ticks: {
                            font: {
                                family: 'DM Sans, sans-serif',
                                size: 10.5,
                                weight: 500,
                            },
                            color: '#524b42',
                            maxRotation: 0, // Keep text completely horizontal!
                            minRotation: 0,
                            autoSkip: false,
                        },
                    },
                    y: {
                        stacked: isStacked,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            borderDash: [3, 3],
                        },
                        ticks: {
                            font: {
                                family: 'DM Sans, sans-serif',
                                size: 10,
                            },
                            color: '#8a8277',
                            stepSize: 1,
                            precision: 0,
                        },
                        beginAtZero: true,
                    },
                },
            },
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [labels, gold, silver, bronze, chartMode]);

    return (
        <div className="w-full h-full flex flex-col justify-between">
            {/* Mode Switcher Buttons */}
            <div className="flex items-center justify-end gap-1.5 mb-2">
                <button
                    type="button"
                    onClick={() => setChartMode('stacked')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        chartMode === 'stacked'
                            ? 'bg-[#0f0d0b] text-[#f5d77f] shadow-xs'
                            : 'bg-[#ede9e1] text-[#777] hover:text-[#0f0d0b] hover:bg-[#e4dfd5]'
                    }`}
                    title="Tampilkan total medali per dojo secara bertumpuk (stacked)"
                >
                    <i className="fa-solid fa-layer-group text-[10px] mr-1"></i>
                    Akumulasi (Stacked)
                </button>
                <button
                    type="button"
                    onClick={() => setChartMode('grouped')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        chartMode === 'grouped'
                            ? 'bg-[#0f0d0b] text-[#f5d77f] shadow-xs'
                            : 'bg-[#ede9e1] text-[#777] hover:text-[#0f0d0b] hover:bg-[#e4dfd5]'
                    }`}
                    title="Tampilkan medali emas, perak, dan perunggu terpisah (grouped)"
                >
                    <i className="fa-solid fa-chart-column text-[10px] mr-1"></i>
                    Terpisah (Grouped)
                </button>
            </div>

            {/* Canvas Container */}
            <div className="w-full flex-1 min-h-[250px] relative">
                <canvas ref={canvasRef} />
            </div>
        </div>
    );
}
