import { useEffect, useRef } from 'react';
import ChartJS from 'chart.js/auto';

export default function StatusDoughnutChart({ verified = 0, pending = 0, rejected = 0 }) {
    const canvasRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        const ctx = canvasRef.current.getContext('2d');
        const total = verified + pending + rejected;

        chartInstanceRef.current = new ChartJS(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Verified', 'Pending', 'Rejected'],
                datasets: [
                    {
                        data: total > 0 ? [verified, pending, rejected] : [1, 0, 0],
                        backgroundColor: ['#27ae60', '#f59e0b', '#e74c3c'],
                        borderWidth: 2,
                        borderColor: '#ffffff',
                        hoverOffset: 6,
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
                        backgroundColor: '#0f0d0b',
                        titleFont: { family: 'Cinzel, serif', size: 12 },
                        bodyFont: { family: 'DM Sans, sans-serif', size: 11 },
                        padding: 10,
                        cornerRadius: 8,
                        borderColor: 'rgba(212, 168, 67, 0.4)',
                        borderWidth: 1,
                    },
                },
                cutout: '70%',
            },
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [verified, pending, rejected]);

    return (
        <div className="w-full h-full min-h-[140px] flex items-center justify-center relative">
            <canvas ref={canvasRef} />
        </div>
    );
}
