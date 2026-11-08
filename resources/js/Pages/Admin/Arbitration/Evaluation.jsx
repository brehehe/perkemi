import Combobox from '@/Components/UI/Forms/Combobox';
import Modal from '@/Components/UI/Overlays/Modal';
import Tabs from '@/Components/UI/Navigation/Tabs';
import { Button, Input } from '@/Components/UI';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    RefereeRankingChart,
    RefereeObjectivityDoughnut,
    ScoreDistributionChart,
    RefereeConsistencyChart,
    ContingentDeltaChart,
} from '@/Components/Charts/ArbitrationCharts';

const formatNumber = (value, decimals = 2) => {
    const num = Number(value || 0);
    return num.toFixed(num % 1 === 0 ? 0 : decimals);
};

function MetricCard({ icon, label, value, helper, tone = 'slate' }) {
    const toneStyles = {
        slate: 'bg-slate-100 text-slate-700',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        rose: 'bg-rose-50 text-rose-700 border-rose-200',
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        gold: 'bg-amber-500/10 text-[#d4a843] border-amber-400/30',
    };

    return (
        <article className="relative overflow-hidden rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold text-[#766e66]">{label}</p>
                    <p className="mt-1 text-2xl font-black tracking-tight text-[#17120f] sm:text-3xl">{value}</p>
                    <p className="mt-1 text-xs text-[#958c83]">{helper}</p>
                </div>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${toneStyles[tone] || toneStyles.slate}`}>
                    <i className={`fa-solid ${icon} text-lg`} aria-hidden="true" />
                </span>
            </div>
        </article>
    );
}

function StatusBadge({ status, label }) {
    if (status === 'anomaly' || status === 'flagged') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                {label}
            </span>
        );
    }
    if (status === 'warning') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                {label}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            <i className="fa-solid fa-circle-check" aria-hidden="true" />
            {label}
        </span>
    );
}

function GradeBadge({ grade, label }) {
    const styles = {
        'A+': 'bg-emerald-100 text-emerald-900 border-emerald-300',
        'A': 'bg-blue-100 text-blue-900 border-blue-300',
        'B': 'bg-cyan-100 text-cyan-900 border-cyan-300',
        'C': 'bg-amber-100 text-amber-900 border-amber-300',
        'D': 'bg-rose-100 text-rose-900 border-rose-300',
        '-': 'bg-slate-100 text-slate-700 border-slate-200',
    };

    return (
        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-black ${styles[grade] || styles['-']}`}>
            <span className="font-mono text-xs">{grade}</span>
            {label && <span className="font-medium text-[10px] hidden sm:inline">· {label}</span>}
        </span>
    );
}

function FlagPill({ flag }) {
    const config = {
        high_std_dev: {
            label: 'Std Dev Tinggi (>6.0)',
            icon: 'fa-chart-line',
            cls: 'bg-rose-100 text-rose-800 border-rose-200',
        },
        high_trimmed_rate: {
            label: 'Trimmed Rate ≥40%',
            icon: 'fa-scissors',
            cls: 'bg-amber-100 text-amber-800 border-amber-200',
        },
        regional_bias: {
            label: 'Indikasi Bias Daerah (Δ ≥ 3.0)',
            icon: 'fa-scale-unbalanced',
            cls: 'bg-rose-100 text-rose-800 border-rose-200',
        },
        slight_regional_bias: {
            label: 'Perhatian Daerah (Δ ≥ 1.5)',
            icon: 'fa-magnifying-glass-chart',
            cls: 'bg-amber-100 text-amber-800 border-amber-200',
        },
    };

    const code = typeof flag === 'string' ? flag : (flag?.code || '');
    const item = config[code] || { label: flag?.label || code, icon: 'fa-tag', cls: 'bg-slate-100 text-slate-800 border-slate-200' };

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${item.cls}`}>
            <i className={`fa-solid ${item.icon} text-[10px]`} aria-hidden="true" />
            {item.label}
        </span>
    );
}

function RefereeCard({ referee, onOpenNarrative }) {
    return (
        <article className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm transition hover:border-[#cfc4b4] hover:shadow-md">
            <div>
                {/* Header */}
                <div className="border-b border-[#eee8e0] bg-[#fbfaf8] p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                {referee.rank && (
                                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                        referee.rank === 1 ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                        referee.rank === 2 ? 'bg-slate-200 text-slate-800 border border-slate-300' :
                                        referee.rank === 3 ? 'bg-orange-100 text-orange-900 border border-orange-300' :
                                        'bg-slate-100 text-slate-700'
                                    }`}>
                                        {referee.rank === 1 ? '🥇 Juara 1' : referee.rank === 2 ? '🥈 Juara 2' : referee.rank === 3 ? '🥉 Juara 3' : `#${referee.rank}`}
                                    </span>
                                )}
                                <span className="rounded-md bg-[#17120f] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#d4a843]">
                                    {referee.certification_level}
                                </span>
                                {referee.dan_grade && (
                                    <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                        {referee.dan_grade}
                                    </span>
                                )}
                                <StatusBadge status={referee.status} label={referee.status_label} />
                            </div>
                            <h3 className="mt-2 text-base font-bold text-[#17120f] sm:text-lg">
                                {referee.name}
                            </h3>
                            <p className="mt-0.5 text-xs text-[#756d65]">
                                <i className="fa-solid fa-location-dot mr-1.5 text-[#b92f24]" aria-hidden="true" />
                                Asal: <strong className="text-[#3b3530]">{referee.region}</strong>
                                {referee.license_number && (
                                    <span className="ml-2 border-l border-[#dcd4c8] pl-2 text-[#8b8277]">
                                        Lisensi: #{referee.license_number}
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className="rounded-xl border border-[#eadfcd] bg-white px-3.5 py-2 text-right">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9b8e81]">Indeks Kualitas</p>
                            <p className="font-mono text-2xl font-black text-[#d4a843]">
                                {referee.matches_judged_count > 0 ? Number(referee.quality_index || 0).toFixed(1) : '—'}
                            </p>
                        </div>
                    </div>

                    {/* Flags */}
                    {referee.flags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#eee8e0] pt-3">
                            {referee.flags.map((flag) => (
                                <FlagPill key={flag} flag={flag} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 border-b border-[#eee8e0] p-4 text-center sm:gap-3">
                    <div className="rounded-xl bg-[#f7f4ef] p-2.5">
                        <p className="text-[10px] font-bold uppercase text-[#91877e]">Partai (N)</p>
                        <p className="mt-0.5 font-mono text-lg font-black text-[#17120f]">
                            {referee.matches_judged_count}
                        </p>
                    </div>
                    <div className="rounded-xl bg-[#f7f4ef] p-2.5">
                        <p className="text-[10px] font-bold uppercase text-[#91877e]">Rata-rata (x̄)</p>
                        <p className="mt-0.5 font-mono text-lg font-black text-[#17120f]">
                            {referee.matches_judged_count > 0 ? formatNumber(referee.average_score) : '—'}
                        </p>
                    </div>
                    <div className={`rounded-xl p-2.5 ${referee.std_dev > 6 ? 'bg-rose-50 text-rose-900 border border-rose-200' : 'bg-[#f7f4ef]'}`}>
                        <p className="text-[10px] font-bold uppercase text-[#91877e]">Std Dev (σ)</p>
                        <p className={`mt-0.5 font-mono text-lg font-black ${referee.std_dev > 6 ? 'text-rose-700' : 'text-[#17120f]'}`}>
                            {referee.matches_judged_count > 0 ? formatNumber(referee.std_dev) : '—'}
                        </p>
                    </div>
                </div>

                {/* Secondary Metrics */}
                <div className="space-y-2 p-4 text-xs text-[#625a53]">
                    <div className="flex items-center justify-between">
                        <span className="text-[#877e74]">Predikat Wasit:</span>
                        <GradeBadge grade={referee.grade} label={referee.grade_label} />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[#877e74]">Rentang Skor:</span>
                        <span className="font-mono font-bold text-[#17120f]">
                            {referee.matches_judged_count > 0 ? `${formatNumber(referee.min_score)} – ${formatNumber(referee.max_score)} (Δ ${formatNumber(referee.score_range)})` : '—'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[#877e74]">% Nilai Terbuang:</span>
                        <span className={`font-mono font-bold ${referee.trimmed_rate >= 40 ? 'text-amber-700' : 'text-[#17120f]'}`}>
                            {referee.matches_judged_count > 0 ? `${formatNumber(referee.trimmed_rate, 1)}%` : '—'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[#877e74]">Deviasi Asal vs Rekan (Δ):</span>
                        <span className={`font-mono font-black ${referee.regional_delta >= 3.0 ? 'text-rose-600' : referee.regional_delta >= 1.5 ? 'text-amber-600' : 'text-emerald-700'}`}>
                            {referee.same_origin_count > 0 && referee.has_peer_comparison
                                ? (referee.regional_delta > 0 ? `+${formatNumber(referee.regional_delta)}` : formatNumber(referee.regional_delta))
                                : '0 (Netral)'}
                        </span>
                    </div>

                    {/* Headline snippet */}
                    {referee.narrative?.headline && (
                        <div className="mt-3 rounded-lg bg-[#faf7f2] p-2.5 text-[11px] leading-relaxed text-[#5c544c]">
                            <strong className="text-[#8a631c]">Catatan Evaluasi: </strong>
                            {referee.narrative.headline}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Footer */}
            <div className="border-t border-[#eee8e0] bg-[#fcfbf9] p-3 text-right">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenNarrative(referee)}
                    className="w-full justify-center text-xs font-bold"
                    iconLeft={<i className="fa-solid fa-file-waveform" aria-hidden="true" />}
                >
                    Lihat Analisis Naratif Lengkap
                </Button>
            </div>
        </article>
    );
}

function PodiumCard({ place, referee, onOpenNarrative }) {
    if (!referee) {
        return (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e5ded4] bg-[#fcfbf9] p-6 text-center opacity-60">
                <span className="text-3xl text-slate-300">
                    <i className="fa-solid fa-medal" aria-hidden="true" />
                </span>
                <p className="mt-2 text-xs font-bold text-slate-400">Podium #{place}</p>
                <p className="text-[10px] text-slate-400">Menunggu penilaian wasit berikutnya</p>
            </div>
        );
    }

    const configs = {
        1: {
            title: 'Juara 1 — Wasit Terbaik I',
            icon: 'fa-trophy',
            badgeBg: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-white shadow-amber-200',
            border: 'border-2 border-[#d4a843] bg-gradient-to-b from-[#fffcf2] via-white to-white shadow-lg',
            medalColor: 'text-[#d4a843]',
            rankText: 'Juara 1 (Emas)',
        },
        2: {
            title: 'Juara 2 — Wasit Terbaik II',
            icon: 'fa-medal',
            badgeBg: 'bg-gradient-to-r from-slate-400 to-gray-400 text-white shadow-slate-200',
            border: 'border border-slate-300 bg-white shadow-md',
            medalColor: 'text-slate-500',
            rankText: 'Juara 2 (Perak)',
        },
        3: {
            title: 'Juara 3 — Wasit Terbaik III',
            icon: 'fa-medal',
            badgeBg: 'bg-gradient-to-r from-amber-700 to-amber-600 text-white shadow-amber-900/20',
            border: 'border border-amber-200 bg-white shadow-md',
            medalColor: 'text-amber-700',
            rankText: 'Juara 3 (Perunggu)',
        },
    };

    const cfg = configs[place] || configs[1];

    return (
        <article className={`relative flex flex-col justify-between overflow-hidden rounded-2xl p-5 sm:p-6 transition hover:shadow-xl ${cfg.border}`}>
            <div>
                {/* Badge Place Header */}
                <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider shadow ${cfg.badgeBg}`}>
                        <i className={`fa-solid ${cfg.icon}`} aria-hidden="true" />
                        {cfg.rankText}
                    </span>
                    <GradeBadge grade={referee.grade} label={referee.grade_label} />
                </div>

                {/* Score & Name */}
                <div className="mt-4 flex items-baseline justify-between border-b border-[#eee8e0] pb-3">
                    <div>
                        <h3 className="text-lg font-black text-[#17120f] sm:text-xl">{referee.name}</h3>
                        <p className="mt-0.5 text-xs text-[#756d65]">
                            <i className="fa-solid fa-location-dot mr-1 text-[#b92f24]" aria-hidden="true" />
                            {referee.region} · {referee.certification_level}
                            {referee.dan_grade && <strong className="ml-1 text-[#17120f]">({referee.dan_grade})</strong>}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-bold uppercase text-[#9c8e80]">Indeks Wasit</span>
                        <p className="font-mono text-3xl font-black text-[#17120f]">
                            {Number(referee.quality_index || 0).toFixed(1)}
                            <span className="text-xs font-semibold text-[#8a7f74]">/100</span>
                        </p>
                    </div>
                </div>

                {/* Metrics Breakdown */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-[#f7f4ef] p-2.5">
                        <p className="text-[10px] font-bold uppercase text-[#8a7f74]">Partai</p>
                        <p className="font-mono text-base font-black text-[#17120f]">{referee.matches_judged_count}</p>
                    </div>
                    <div className="rounded-xl bg-[#f7f4ef] p-2.5">
                        <p className="text-[10px] font-bold uppercase text-[#8a7f74]">Rata-rata</p>
                        <p className="font-mono text-base font-black text-[#17120f]">{formatNumber(referee.average_score)}</p>
                    </div>
                    <div className="rounded-xl bg-[#f7f4ef] p-2.5">
                        <p className="text-[10px] font-bold uppercase text-[#8a7f74]">Std Dev (σ)</p>
                        <p className="font-mono text-base font-black text-[#17120f]">{formatNumber(referee.std_dev)}</p>
                    </div>
                </div>

                <p className="mt-3 text-xs italic text-[#6e6459] leading-relaxed">
                    "{referee.narrative?.headline || 'Performa wasit terverifikasi konsisten dan memenuhi standar PB Perkemi.'}"
                </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#eee8e0]">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenNarrative(referee)}
                    className="w-full justify-center text-xs font-bold"
                    iconLeft={<i className="fa-solid fa-file-waveform" aria-hidden="true" />}
                >
                    Lihat Rapor Evaluasi Lengkap
                </Button>
            </div>
        </article>
    );
}

function NarrativeModal({ referee, isOpen, onClose }) {
    if (!referee) return null;

    const narrative = referee.narrative || {};

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Analisis Naratif & Rapor Evaluasi Wasit"
            subtitle={`${referee.name} · Sertifikasi: ${referee.certification_level} · Asal: ${referee.region}`}
            size="3xl"
            footer={
                <div className="flex w-full items-center justify-between">
                    <Button
                        type="button"
                        variant="dark"
                        size="sm"
                        onClick={() => window.print()}
                        iconLeft={<i className="fa-solid fa-print" aria-hidden="true" />}
                    >
                        Cetak Rapor A4
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={onClose}>
                        Tutup
                    </Button>
                </div>
            }
        >
            <div className="space-y-5 text-sm text-[#3b3530]">
                {/* Header Profile Box */}
                <div className="rounded-2xl border border-[#e5ded4] bg-[#fbfaf8] p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                {referee.rank && (
                                    <span className="rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-black uppercase text-amber-900">
                                        Peringkat #{referee.rank}
                                    </span>
                                )}
                                <span className="rounded-md bg-[#17120f] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#d4a843]">
                                    {referee.certification_level}
                                </span>
                                <GradeBadge grade={referee.grade} label={referee.grade_label} />
                            </div>
                            <h3 className="mt-1.5 text-lg font-black text-[#17120f]">{referee.name}</h3>
                            <p className="text-xs text-[#756d65]">
                                {referee.dan_grade || 'Kenshi'} · Lisensi: #{referee.license_number || '—'} · Daerah: <strong>{referee.region}</strong>
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-bold uppercase text-[#9c8e80]">Indeks Kualitas</span>
                            <p className="font-mono text-2xl font-black text-[#d4a843]">
                                {Number(referee.quality_index || 0).toFixed(1)} / 100
                            </p>
                            <StatusBadge status={referee.status} label={referee.status_label} />
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 text-center">
                        <div className="rounded-xl border border-[#eae2d5] bg-white p-2.5">
                            <p className="text-[10px] font-bold uppercase text-[#8a7f74]">Partai</p>
                            <p className="font-mono text-lg font-black">{referee.matches_judged_count}</p>
                        </div>
                        <div className="rounded-xl border border-[#eae2d5] bg-white p-2.5">
                            <p className="text-[10px] font-bold uppercase text-[#8a7f74]">Rata-rata</p>
                            <p className="font-mono text-lg font-black">{formatNumber(referee.average_score)}</p>
                        </div>
                        <div className="rounded-xl border border-[#eae2d5] bg-white p-2.5">
                            <p className="text-[10px] font-bold uppercase text-[#8a7f74]">Std Dev (σ)</p>
                            <p className="font-mono text-lg font-black">{formatNumber(referee.std_dev)}</p>
                        </div>
                        <div className="rounded-xl border border-[#eae2d5] bg-white p-2.5">
                            <p className="text-[10px] font-bold uppercase text-[#8a7f74]">% Terbuang</p>
                            <p className="font-mono text-lg font-black">{formatNumber(referee.trimmed_rate, 1)}%</p>
                        </div>
                    </div>
                </div>

                {/* Section 1: Ringkasan & Konsistensi */}
                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 sm:p-5">
                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-900">
                        <i className="fa-solid fa-chart-line text-blue-600" aria-hidden="true" />
                        1. Evaluasi Konsistensi & Deviasi Penilaian
                    </h4>
                    <p className="mt-2 text-xs leading-relaxed text-blue-950 sm:text-sm">
                        {narrative.consistency || 'Data penilaian belum mencukupi untuk analisis konsistensi.'}
                    </p>
                </div>

                {/* Section 2: Trimmed-Out Analysis */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5">
                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-900">
                        <i className="fa-solid fa-scissors text-amber-600" aria-hidden="true" />
                        2. Analisis Nilai Terbuang (Trimmed Out Rate)
                    </h4>
                    <p className="mt-2 text-xs leading-relaxed text-amber-950 sm:text-sm">
                        {narrative.trimmed_analysis || 'Tidak ada catatan nilai terbuang.'}
                    </p>
                </div>

                {/* Section 3: Bias Kedaerahan */}
                <div className={`rounded-2xl border p-4 sm:p-5 ${referee.flags?.some((f) => (typeof f === 'string' ? f : f?.code) === 'regional_bias') ? 'border-rose-300 bg-rose-50/70' : 'border-[#e5ded4] bg-white'}`}>
                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#17120f]">
                        <i className="fa-solid fa-scale-unbalanced text-[#b92f24]" aria-hidden="true" />
                        3. Pemeriksaan Konflik Kepentingan Kedaerahan (Anti-Bias)
                    </h4>
                    <p className="mt-2 text-xs leading-relaxed text-[#4a423a] sm:text-sm">
                        {narrative.regional_bias || 'Tidak terdeteksi potensi konflik kepentingan kedaerahan.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-[#6e6459]">
                        <span>Partai Kontingen Asal ({referee.region}): <strong>{referee.same_origin_count}</strong></span>
                        <span>Deviasi Rata-rata Terhadap Juri Lain: <strong className={referee.regional_delta >= 1.5 ? 'text-rose-600' : 'text-emerald-700'}>{referee.regional_delta > 0 ? `+${referee.regional_delta}` : referee.regional_delta}</strong></span>
                    </div>
                </div>

                {/* Section 4: Rekomendasi Dewan Wasit */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 sm:p-5">
                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-900">
                        <i className="fa-solid fa-gavel text-emerald-600" aria-hidden="true" />
                        4. Rekomendasi Penugasan Dewan Arbitrase
                    </h4>
                    <p className="mt-2 text-xs font-medium leading-relaxed text-emerald-950 sm:text-sm">
                        {narrative.recommendation || 'Wasit dapat ditugaskan sesuai rotasi tatami biasa.'}
                    </p>
                </div>

                {/* Section 5: Riwayat Partai Lengkap */}
                <div>
                    <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-[#756d65]">
                        Riwayat Penilaian Partai ({referee.matches?.length || 0})
                    </h4>
                    {referee.matches && referee.matches.length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-[#eee8e0]">
                            <table className="min-w-full divide-y divide-[#eee8e0] text-left text-xs">
                                <thead className="bg-[#f7f4ef] text-[10px] font-black uppercase tracking-wider text-[#6b6257]">
                                    <tr>
                                        <th scope="col" className="px-3 py-2">Partai</th>
                                        <th scope="col" className="px-3 py-2">Nomor & Babak</th>
                                        <th scope="col" className="px-3 py-2">Kontingen / Peserta</th>
                                        <th scope="col" className="px-3 py-2 text-center">Nilai Wasit</th>
                                        <th scope="col" className="px-3 py-2 text-center">Rerata 4 Juri Lain</th>
                                        <th scope="col" className="px-3 py-2 text-center">Deviasi (Δ)</th>
                                        <th scope="col" className="px-3 py-2 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#eee8e0] bg-white">
                                    {referee.matches.map((m, idx) => (
                                        <tr key={idx} className="hover:bg-[#fcfbf9]">
                                            <td className="px-3 py-2 font-mono font-bold text-[#8a7f74]">#{m.sequence || idx + 1}</td>
                                            <td className="px-3 py-2">
                                                <div className="font-bold text-[#17120f]">{m.category}</div>
                                                <div className="text-[10px] text-[#8a7f74]">{m.round} · {m.court}</div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="font-semibold text-[#17120f]">{m.participant}</div>
                                                {m.is_same_region && (
                                                    <span className="inline-block mt-0.5 rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-black text-amber-800">
                                                        Daerah Asal
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-center font-mono font-black text-[#17120f]">
                                                {formatNumber(m.score)}
                                            </td>
                                            <td className="px-3 py-2 text-center font-mono text-[#6e6459]">
                                                {formatNumber(m.peer_average)}
                                            </td>
                                            <td className={`px-3 py-2 text-center font-mono font-bold ${Math.abs(m.peer_deviation) >= 3 ? 'text-rose-600' : Math.abs(m.peer_deviation) >= 1.5 ? 'text-amber-600' : 'text-[#6e6459]'}`}>
                                                {m.peer_deviation > 0 ? `+${formatNumber(m.peer_deviation)}` : formatNumber(m.peer_deviation)}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                {m.is_trimmed ? (
                                                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">
                                                        Trimmed Out
                                                    </span>
                                                ) : (
                                                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                                                        Sah
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="rounded-xl border border-dashed border-[#e5ded4] p-4 text-center text-xs text-[#8a7f74]">
                            Belum ada riwayat partai yang dicatat untuk wasit ini.
                        </p>
                    )}
                </div>
            </div>
        </Modal>
    );
}

function HeatmapMatrix({ heatmap }) {
    const { cities = [], rows = [] } = heatmap;

    if (!cities.length || !rows.length) {
        return (
            <div className="rounded-2xl border border-dashed border-[#d8d0c5] bg-white p-12 text-center text-[#766e66]">
                <i className="fa-solid fa-network-wired mb-2 text-3xl text-[#d4a843]" aria-hidden="true" />
                <h3 className="text-base font-bold text-[#17120f]">Data Heatmap Belum Terbentuk</h3>
                <p className="mt-1 text-xs">Diperlukan minimal satu pertandingan Embu yang dinilai wasit untuk membentuk matriks korelasi kedaerahan.</p>
            </div>
        );
    }

    const intensityStyles = {
        high_positive: 'bg-rose-500 text-white font-black',
        med_positive: 'bg-amber-400 text-[#17120f] font-bold',
        neutral: 'bg-emerald-50 text-emerald-800 font-medium',
        med_negative: 'bg-blue-100 text-blue-900 font-semibold',
        high_negative: 'bg-indigo-300 text-indigo-950 font-bold',
    };

    return (
        <div className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm">
            <div className="border-b border-[#eee8e0] bg-[#fbfaf8] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base font-bold text-[#17120f]">
                            Matriks Korelasi Kedaerahan Wasit vs Kontingen
                        </h3>
                        <p className="text-xs text-[#766e66]">
                            Menampilkan deviasi rata-rata skor wasit terhadap juri lain ketika menilai kontingen dari kota/kabupaten tertentu.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#5c544c]">
                        <span className="flex items-center gap-1">
                            <span className="h-3 w-3 rounded bg-rose-500" /> Δ ≥ +3.0 (Kritikal)
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="h-3 w-3 rounded bg-amber-400" /> Δ ≥ +1.5 (Perhatian)
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="h-3 w-3 rounded bg-emerald-100 border border-emerald-300" /> Normal (±0.0)
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="h-3 w-3 rounded border-2 border-red-600 bg-white" /> Daerah Asal
                        </span>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#eee8e0] text-xs">
                    <thead className="bg-[#f7f4ef] text-[10px] font-black uppercase tracking-wider text-[#6b6257]">
                        <tr>
                            <th scope="col" className="sticky left-0 z-10 bg-[#f7f4ef] px-4 py-3 text-left">
                                Wasit / Asal
                            </th>
                            {cities.map((city) => (
                                <th key={city} scope="col" className="px-3 py-3 text-center whitespace-nowrap">
                                    {city}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eee8e0] bg-white">
                        {rows.map((r) => (
                            <tr key={r.referee_id} className="hover:bg-[#fcfbf9]">
                                <td className="sticky left-0 z-10 bg-white px-4 py-3 text-left font-bold text-[#17120f] border-r border-[#eee8e0]">
                                    <div>{r.referee_name}</div>
                                    <div className="text-[10px] font-normal text-[#867e74]">{r.referee_region}</div>
                                </td>
                                {cities.map((city) => {
                                    const cell = r.cells[city];
                                    if (!cell) {
                                        return (
                                            <td key={city} className="px-3 py-3 text-center text-[#c2b9ae]">
                                                —
                                            </td>
                                        );
                                    }

                                    const isSame = cell.is_same_origin;
                                    const dev = cell.deviation;
                                    const devStr = dev > 0 ? `+${dev}` : `${dev}`;
                                    const cls = intensityStyles[cell.intensity] || 'bg-slate-50 text-slate-800';

                                    return (
                                        <td key={city} className="px-2 py-2 text-center">
                                            <div
                                                className={`mx-auto flex h-9 w-14 flex-col items-center justify-center rounded-lg font-mono text-[11px] transition ${cls} ${isSame ? 'ring-2 ring-red-600 ring-offset-1' : ''}`}
                                                title={`Wasit: ${r.referee_name}\nKontingen: ${city}\nJumlah Partai: ${cell.count}\nRata-rata Skor: ${cell.avg_score}\nDeviasi vs Juri Lain: ${devStr}${isSame ? ' (Daerah Asal Wasit)' : ''}`}
                                            >
                                                <span>{devStr}</span>
                                                <span className="text-[9px] opacity-75">{cell.count}x</span>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function Evaluation({
    activeEvent,
    events = [],
    filters = {},
    summary = {},
    referees = [],
    ranking = { podium: [], leaderboard: [] },
    scoreDistribution = [],
    contingentAnalysis = [],
    arbitrationRecommendations = {
        final_candidates: [],
        supervision_list: [],
        contingent_alerts: [],
        overall_statement: '',
    },
    heatmap = {},
    certificationOptions = [],
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [selectedCert, setSelectedCert] = useState(filters.certification || '');
    const [activeView, setActiveView] = useState('overview');
    const [selectedReferee, setSelectedReferee] = useState(null);
    const activeStatus = filters.status || 'all';

    const visitFilters = (next = {}) => {
        router.get('/admin/arbitrase/evaluasi', {
            event_id: activeEvent?.id,
            search,
            certification: selectedCert,
            status: activeStatus,
            ...next,
        }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const exportUrl = useMemo(() => {
        const params = new URLSearchParams();
        if (activeEvent?.id) params.set('event_id', activeEvent.id);
        if (search) params.set('search', search);
        if (selectedCert) params.set('certification', selectedCert);
        if (activeStatus !== 'all') params.set('status', activeStatus);

        return `/admin/arbitrase/evaluasi/export?${params.toString()}`;
    }, [activeEvent?.id, activeStatus, search, selectedCert]);

    const statusTabs = [
        { key: 'all', label: 'Semua Wasit', count: summary.total_referees ?? 0 },
        {
            key: 'flagged_only',
            label: 'Anomali / Perhatian',
            count: (summary.flagged_count ?? 0) + (summary.needs_attention_count ?? 0),
        },
        {
            key: 'normal_only',
            label: 'Objektif & Normal',
            count: summary.normal_count ?? 0,
        },
    ];

    const viewOptions = [
        ['overview', 'Ringkasan Analitik', 'fa-chart-pie'],
        ['cards', `Kartu Wasit (${referees.length})`, 'fa-address-card'],
        ['table', 'Tabel Komparasi', 'fa-table-list'],
        ['heatmap', 'Heatmap Kedaerahan', 'fa-network-wired'],
    ];

    const podiumByRank = new Map((ranking.podium || []).map((referee) => [referee.rank, referee]));

    return (
        <AdminLayout title="Evaluasi Perwasitan & Anti-Bias">
            <Head title="Evaluasi & Analisis Perwasitan (Anti-Bias) | Smart Perkemi" />

            <div className="space-y-5 pb-10 sm:space-y-6">
                <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#0f0d0b] via-[#211b16] to-[#0f0d0b] p-5 text-white shadow-xl sm:p-6 print:hidden">
                    <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#d4a843]/15 blur-3xl" />
                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-3xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#e1b94e]">
                                    <i className="fa-solid fa-scale-unbalanced" aria-hidden="true" />
                                    Arbitrase & Dewan Wasit
                                </p>
                                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                                    Modul Anti-Bias Aktif
                                </span>
                            </div>
                            <h1 className="mt-2 text-2xl font-bold md:text-3xl">Evaluasi & Analisis Perwasitan</h1>
                            <p className="mt-2 text-sm leading-6 text-white/70">
                                Peringkat kualitas wasit, konsistensi skor, nilai terbuang, dan audit independensi kedaerahan dalam satu rapor evaluasi.
                            </p>
                        </div>

                        <div className="flex w-full flex-col gap-3 xl:w-96">
                            <Combobox
                                label="Event Kejuaraan"
                                labelClassName="text-white/60"
                                value={activeEvent?.id || ''}
                                onChange={(value) => router.get('/admin/arbitrase/evaluasi', { event_id: value })}
                                clearable={false}
                                options={events.map((event) => ({
                                    value: event.id,
                                    label: event.name,
                                    sublabel: [event.status_label, event.date_label, event.city].filter(Boolean).join(' · '),
                                }))}
                            />
                            <div className="flex flex-wrap justify-end gap-2">
                                <Link href="/admin/arbitrase/scoring" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 text-xs font-semibold text-white/90 hover:bg-white/10">
                                    <i className="fa-solid fa-chart-column" aria-hidden="true" />
                                    Hasil Nilai
                                </Link>
                                <Button type="button" variant="outline" size="sm" onClick={() => window.print()} className="border-white/20 bg-white/5 text-xs text-white hover:bg-white/10" iconLeft={<i className="fa-solid fa-print" aria-hidden="true" />}>
                                    Cetak
                                </Button>
                                <a href={exportUrl} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white shadow hover:bg-emerald-700">
                                    <i className="fa-solid fa-file-excel" aria-hidden="true" />
                                    Excel
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="hidden border-b-2 border-black pb-4 text-center print:block">
                    <h1 className="text-xl font-black uppercase">Laporan Evaluasi & Analisis Perwasitan</h1>
                    <p className="text-xs font-bold">PENGURUS BESAR PERSAUDARAAN BELADIRI SHORINJI KEMPO INDONESIA</p>
                    <p className="text-[11px] text-gray-600">Kejuaraan: {activeEvent?.name || '—'} · {activeEvent?.city || '—'}</p>
                </div>

                <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 print:grid-cols-4">
                    <MetricCard icon="fa-user-shield" label="Wasit Terdaftar" value={summary.total_referees ?? 0} helper={`${summary.active_judged_referees ?? 0} wasit telah menilai`} tone="blue" />
                    <MetricCard icon="fa-ranking-star" label="Wasit Terbaik" value={summary.top_referee?.name || '—'} helper={summary.top_referee ? `Indeks ${formatNumber(summary.top_referee.quality_index, 1)} · ${summary.top_referee.grade}` : 'Belum ada peringkat'} tone="gold" />
                    <MetricCard icon="fa-chart-line" label="Rata-rata Skor" value={formatNumber(summary.average_score ?? 0)} helper={`${summary.total_scores_recorded ?? 0} lembar nilai masuk`} tone="slate" />
                    <MetricCard icon="fa-shield-halved" label="Objektivitas" value={`${formatNumber(summary.objectivity_rate ?? 100, 1)}%`} helper={`${summary.flagged_count ?? 0} anomali · ${summary.needs_attention_count ?? 0} perhatian`} tone={(summary.flagged_count ?? 0) > 0 ? 'rose' : 'emerald'} />
                </section>

                {arbitrationRecommendations.overall_statement && (
                    <section className="flex items-start gap-3 rounded-2xl border border-[#dfd4c5] bg-[#fffcf6] p-4 text-sm text-[#51483f] shadow-sm sm:p-5">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#17120f] text-[#d4a843]">
                            <i className="fa-solid fa-gavel" aria-hidden="true" />
                        </span>
                        <div>
                            <h2 className="font-black text-[#17120f]">Kesimpulan Dewan Arbitrase</h2>
                            <p className="mt-1 leading-relaxed">{arbitrationRecommendations.overall_statement}</p>
                        </div>
                    </section>
                )}

                <section className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5 print:hidden">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex flex-wrap gap-2">
                            {viewOptions.map(([key, label, icon]) => (
                                <button key={key} type="button" onClick={() => setActiveView(key)} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${activeView === key ? 'bg-[#17120f] text-white shadow' : 'bg-[#f7f4ef] text-[#6b6257] hover:bg-[#eee8e0]'}`}>
                                    <i className={`fa-solid ${icon}`} aria-hidden="true" />
                                    {label}
                                </button>
                            ))}
                        </div>
                        <Tabs tabs={statusTabs} activeTab={activeStatus} onChange={(status) => visitFilters({ status })} variant="pills" />
                    </div>

                    <form onSubmit={(event) => { event.preventDefault(); visitFilters({ search, certification: selectedCert }); }} className="mt-4 flex flex-col gap-3 border-t border-[#eee8e0] pt-4 sm:flex-row sm:items-center">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari nama, daerah, atau lisensi..."
                            iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                            size="sm"
                            clearable
                            onClear={() => { setSearch(''); visitFilters({ search: '' }); }}
                            containerClassName="w-full sm:w-80"
                        />
                        <select value={selectedCert} onChange={(event) => { setSelectedCert(event.target.value); visitFilters({ certification: event.target.value }); }} className="min-h-9 rounded-xl border border-[#d8cfc4] bg-[#fbfaf8] px-3 text-xs font-semibold text-[#2d2722] focus:border-[#d4a843] focus:outline-none sm:w-52">
                            <option value="">Semua Sertifikasi</option>
                            {certificationOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                        <Button type="submit" variant="dark" size="sm">Terapkan Filter</Button>
                        {(search || selectedCert || activeStatus !== 'all') && (
                            <button type="button" onClick={() => { setSearch(''); setSelectedCert(''); visitFilters({ search: '', certification: '', status: 'all' }); }} className="text-xs font-bold text-[#b92f24] hover:underline">
                                Reset
                            </button>
                        )}
                    </form>
                </section>

                {activeView === 'overview' && (
                    <div className="space-y-5">
                        <section>
                            <div className="mb-3">
                                <p className="text-xs font-black uppercase tracking-[.12em] text-[#9a6b20]">Peringkat Evaluasi</p>
                                <h2 className="mt-1 text-xl font-black text-[#17120f]">Podium Wasit Terbaik</h2>
                            </div>
                            <div className="grid gap-4 lg:grid-cols-3">
                                {[1, 2, 3].map((place) => <PodiumCard key={place} place={place} referee={podiumByRank.get(place)} onOpenNarrative={setSelectedReferee} />)}
                            </div>
                        </section>

                        <section className="grid gap-4 xl:grid-cols-2">
                            <article className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5">
                                <h3 className="font-black text-[#17120f]">Peringkat Indeks Kualitas</h3>
                                <p className="mb-4 text-xs text-[#766e66]">Sepuluh wasit dengan indeks kualitas dan objektivitas tertinggi.</p>
                                <RefereeRankingChart data={ranking.leaderboard || []} />
                            </article>
                            <article className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5">
                                <h3 className="font-black text-[#17120f]">Proporsi Objektivitas</h3>
                                <p className="mb-4 text-xs text-[#766e66]">Komposisi status normal, perhatian, dan anomali.</p>
                                <RefereeObjectivityDoughnut normal={summary.normal_count ?? 0} warning={summary.warning_count ?? 0} flagged={summary.flagged_count ?? 0} rate={summary.objectivity_rate ?? 100} />
                            </article>
                            <article className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5">
                                <h3 className="font-black text-[#17120f]">Distribusi Skor Penilaian</h3>
                                <p className="mb-4 text-xs text-[#766e66]">Frekuensi nilai yang masuk pada setiap rentang skor.</p>
                                <ScoreDistributionChart distribution={scoreDistribution} />
                            </article>
                            <article className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5">
                                <h3 className="font-black text-[#17120f]">Konsistensi Wasit</h3>
                                <p className="mb-4 text-xs text-[#766e66]">Perbandingan standar deviasi dan persentase nilai terbuang.</p>
                                <RefereeConsistencyChart referees={ranking.leaderboard || referees} />
                            </article>
                            <article className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5 xl:col-span-2">
                                <h3 className="font-black text-[#17120f]">Deviasi Kedaerahan per Kontingen</h3>
                                <p className="mb-4 text-xs text-[#766e66]">Selisih rata-rata nilai juri sedaerah dibanding juri dari daerah lain.</p>
                                <ContingentDeltaChart contingents={contingentAnalysis} />
                            </article>
                        </section>
                    </div>
                )}

                {activeView === 'heatmap' && <HeatmapMatrix heatmap={heatmap} />}

                {activeView === 'cards' && (
                    referees.length > 0 ? (
                        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {referees.map((referee) => <RefereeCard key={referee.id} referee={referee} onOpenNarrative={setSelectedReferee} />)}
                        </section>
                    ) : (
                        <section className="rounded-2xl border border-dashed border-[#d8d0c5] bg-white px-5 py-16 text-center shadow-sm">
                            <i className="fa-solid fa-user-xmark text-3xl text-[#b8872d]" aria-hidden="true" />
                            <h2 className="mt-3 text-lg font-bold text-[#17120f]">Data Wasit Tidak Ditemukan</h2>
                            <p className="mt-1 text-xs text-[#766e66]">Sesuaikan kata kunci, sertifikasi, atau status objektivitas.</p>
                        </section>
                    )
                )}

                {activeView === 'table' && (
                    <section className="overflow-x-auto rounded-2xl border border-[#e5ded4] bg-white shadow-sm">
                        <table className="min-w-[1100px] w-full divide-y divide-[#eee8e0] text-left text-xs">
                            <thead className="bg-[#f7f4ef] text-[10px] font-black uppercase tracking-wider text-[#6b6257]">
                                <tr>
                                    <th className="px-4 py-3">Peringkat</th>
                                    <th className="px-4 py-3">Wasit / Asal</th>
                                    <th className="px-3 py-3 text-center">Indeks</th>
                                    <th className="px-3 py-3 text-center">Partai</th>
                                    <th className="px-3 py-3 text-center">Rata-rata</th>
                                    <th className="px-3 py-3 text-center">Std Dev</th>
                                    <th className="px-3 py-3 text-center">Terbuang</th>
                                    <th className="px-3 py-3 text-center">Deviasi Asal</th>
                                    <th className="px-3 py-3 text-center">Status</th>
                                    <th className="px-4 py-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#eee8e0]">
                                {referees.map((referee) => (
                                    <tr key={referee.id} className="hover:bg-[#fcfbf9]">
                                        <td className="px-4 py-3"><GradeBadge grade={referee.grade} label={referee.rank ? `#${referee.rank}` : null} /></td>
                                        <td className="px-4 py-3"><strong className="text-[#17120f]">{referee.name}</strong><div className="text-[10px] text-[#837a70]">{referee.region} · {referee.certification_level}</div></td>
                                        <td className="px-3 py-3 text-center font-mono font-black">{formatNumber(referee.quality_index, 1)}</td>
                                        <td className="px-3 py-3 text-center font-mono">{referee.matches_judged_count}</td>
                                        <td className="px-3 py-3 text-center font-mono">{formatNumber(referee.average_score)}</td>
                                        <td className="px-3 py-3 text-center font-mono">{formatNumber(referee.std_dev)}</td>
                                        <td className="px-3 py-3 text-center font-mono">{formatNumber(referee.trimmed_rate, 1)}%</td>
                                        <td className="px-3 py-3 text-center font-mono">{referee.regional_delta > 0 ? '+' : ''}{formatNumber(referee.regional_delta)}</td>
                                        <td className="px-3 py-3 text-center"><StatusBadge status={referee.status} label={referee.status_label} /></td>
                                        <td className="px-4 py-3 text-right"><Button type="button" variant="outline" size="sm" onClick={() => setSelectedReferee(referee)}>Rapor</Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                )}
            </div>

            <NarrativeModal referee={selectedReferee} isOpen={Boolean(selectedReferee)} onClose={() => setSelectedReferee(null)} />
        </AdminLayout>
    );
}
