import Combobox from '@/Components/UI/Forms/Combobox';
import Modal from '@/Components/UI/Overlays/Modal';
import Tabs from '@/Components/UI/Navigation/Tabs';
import { Button, Input } from '@/Components/UI';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

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
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9b8e81]">Total Partai</p>
                            <p className="font-mono text-2xl font-black text-[#17120f]">{referee.matches_judged_count}</p>
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
                    <div className={`rounded-xl p-2.5 ${referee.trimmed_rate >= 40 ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-[#f7f4ef]'}`}>
                        <p className="text-[10px] font-bold uppercase text-[#91877e]">% Terbuang</p>
                        <p className={`mt-0.5 font-mono text-lg font-black ${referee.trimmed_rate >= 40 ? 'text-amber-700' : 'text-[#17120f]'}`}>
                            {referee.matches_judged_count > 0 ? `${formatNumber(referee.trimmed_rate, 1)}%` : '—'}
                        </p>
                    </div>
                </div>

                {/* Secondary Metrics */}
                <div className="space-y-2 p-4 text-xs text-[#625a53]">
                    <div className="flex items-center justify-between">
                        <span className="text-[#877e74]">Rentang Skor:</span>
                        <span className="font-mono font-bold text-[#17120f]">
                            {referee.matches_judged_count > 0 ? `${formatNumber(referee.min_score)} – ${formatNumber(referee.max_score)} (Δ ${formatNumber(referee.score_range)})` : '—'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[#877e74]">Partai Asal Daerah:</span>
                        <span className="font-bold text-[#17120f]">
                            {referee.same_origin_count} partai
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[#877e74]">Deviasi Asal vs Rekan (Δ):</span>
                        <span className={`font-mono font-black ${referee.regional_delta >= 3.0 ? 'text-rose-600' : referee.regional_delta >= 1.5 ? 'text-amber-600' : 'text-emerald-700'}`}>
                            {referee.same_origin_count > 0
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
                            <span className="rounded-md bg-[#17120f] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#d4a843]">
                                {referee.certification_level}
                            </span>
                            <h3 className="mt-1.5 text-lg font-black text-[#17120f]">{referee.name}</h3>
                            <p className="text-xs text-[#756d65]">
                                {referee.dan_grade || 'Kenshi'} · Lisensi: #{referee.license_number || '—'} · Daerah: <strong>{referee.region}</strong>
                            </p>
                        </div>
                        <StatusBadge status={referee.status} label={referee.status_label} />
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
                        <span>Selisih Deviasi (Δ): <strong className={referee.regional_delta >= 3.0 ? 'text-rose-700' : 'text-emerald-700'}>{referee.regional_delta > 0 ? `+${formatNumber(referee.regional_delta)}` : formatNumber(referee.regional_delta)}</strong></span>
                    </div>
                </div>

                {/* Section 4: Rekomendasi Dewan Wasit */}
                <div className="rounded-2xl border border-[#d4a843]/40 bg-[#fffdf7] p-4 sm:p-5 shadow-sm">
                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#8a631c]">
                        <i className="fa-solid fa-gavel text-[#d4a843]" aria-hidden="true" />
                        4. Rekomendasi Resmi Dewan Wasit & Arbitrase
                    </h4>
                    <p className="mt-2 text-xs font-medium leading-relaxed text-[#2a241e] sm:text-sm">
                        {narrative.recommendation || 'Wasit memenuhi standar operasional penugasan kejuaraan.'}
                    </p>
                </div>
            </div>
        </Modal>
    );
}

function HeatmapMatrix({ heatmap }) {
    const cities = heatmap?.contingent_cities || [];
    const rows = heatmap?.rows || [];

    if (!cities.length || !rows.length) {
        return (
            <div className="rounded-2xl border border-dashed border-[#d8d0c5] bg-white px-5 py-12 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5efe5] text-xl text-[#b8872d]">
                    <i className="fa-solid fa-table-cells-large" aria-hidden="true" />
                </span>
                <p className="mt-3 font-bold text-[#17120f]">Data Matriks Heatmap Belum Cukup</p>
                <p className="mx-auto mt-1 max-w-md text-xs text-[#766e66]">
                    Heatmap korelasi kedaerahan akan otomatis tersusun setelah juri melakukan penilaian pada atlet dari berbagai kota/kontingen.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-[#e5ded4] bg-[#fbfaf8] p-4 text-xs text-[#625a53]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-circle-info text-[#8a631c]" aria-hidden="true" />
                        <span className="font-semibold text-[#17120f]">Petunjuk Pembacaan Matriks Heatmap:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px]">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded bg-rose-100 border border-rose-300" />
                            Δ ≥ +3.0 (Indikasi Bias Tinggi)
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded bg-amber-100 border border-amber-300" />
                            Δ ≥ +1.5 (Perlu Diperhatikan)
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded bg-emerald-50 border border-emerald-300" />
                            Objektif / Selaras Rekan
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="inline-block rounded bg-[#17120f] px-1 text-[9px] font-black text-amber-300">ASAL</span>
                            Kesamaan Daerah
                        </span>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#e5ded4] bg-white shadow-sm">
                <table className="min-w-full divide-y divide-[#eee8e0] text-left text-xs">
                    <thead className="bg-[#f7f4ef] text-[11px] font-black uppercase tracking-wider text-[#6b6257]">
                        <tr>
                            <th scope="col" className="sticky left-0 z-10 bg-[#f7f4ef] px-4 py-3 border-r border-[#eee8e0]">
                                Wasit & Asal
                            </th>
                            {cities.map((city) => (
                                <th key={city} scope="col" className="px-3 py-3 text-center whitespace-nowrap min-w-[120px]">
                                    {city}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eee8e0] bg-white font-medium text-[#2d2722]">
                        {rows.map((row) => (
                            <tr key={row.referee_id} className="hover:bg-[#fcfbf9]">
                                <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-3 font-semibold border-r border-[#eee8e0] whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)]">
                                    <div className="font-bold text-[#17120f]">{row.referee_name}</div>
                                    <div className="text-[10px] text-[#837a70]">Asal: {row.referee_region}</div>
                                </th>
                                {cities.map((city) => {
                                    const cell = row.cells?.[city] || { count: 0, bias_level: 'none' };
                                    const isSameOrigin = cell.is_same_origin;

                                    let cellBg = 'bg-white';
                                    let textColor = 'text-[#6e665d]';

                                    if (cell.bias_level === 'danger') {
                                        cellBg = 'bg-rose-100 text-rose-900 border-rose-300 font-bold';
                                        textColor = 'text-rose-900';
                                    } else if (cell.bias_level === 'warning') {
                                        cellBg = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
                                        textColor = 'text-amber-900';
                                    } else if (cell.count > 0 && isSameOrigin) {
                                        cellBg = 'bg-emerald-50 text-emerald-900 border-emerald-200';
                                        textColor = 'text-emerald-900';
                                    }

                                    return (
                                        <td key={city} className={`px-2 py-2.5 text-center transition ${cellBg}`}>
                                            {cell.count > 0 ? (
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <span className="font-mono text-xs font-black">{formatNumber(cell.avg_score)}</span>
                                                        {isSameOrigin && (
                                                            <span className="rounded bg-[#17120f] px-1 text-[8px] font-black uppercase text-amber-300" title="Wasit dan Atlet berasal dari daerah yang sama">
                                                                ASAL
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-opacity-80">
                                                        {cell.count} partai · Δ {cell.delta > 0 ? `+${formatNumber(cell.delta)}` : formatNumber(cell.delta)}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[#c7bfb5]">—</span>
                                            )}
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
    heatmap = {},
    certificationOptions = [],
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [selectedCert, setSelectedCert] = useState(filters.certification || '');
    const [activeTab, setActiveTab] = useState('cards'); // 'cards' | 'table' | 'heatmap'
    const [selectedReferee, setSelectedReferee] = useState(null);

    const activeStatus = filters.status || 'all';

    const visitFilters = (next = {}) => {
        router.get(
            '/admin/arbitrase/evaluasi',
            {
                event_id: activeEvent?.id,
                search,
                certification: selectedCert,
                status: activeStatus,
                ...next,
            },
            { preserveScroll: true, preserveState: true, replace: true }
        );
    };

    const statusTabs = [
        { key: 'all', label: 'Semua Wasit', count: summary.total_referees ?? 0 },
        { key: 'flagged_only', label: 'Anomali / Perhatian', count: (summary.flagged_count ?? 0) + (summary.needs_attention_count ?? 0) },
        { key: 'normal_only', label: 'Objektif & Normal', count: Math.max(0, (summary.total_referees ?? 0) - (summary.flagged_count ?? 0) - (summary.needs_attention_count ?? 0)) },
    ];

    const exportUrl = useMemo(() => {
        const params = new URLSearchParams();
        if (activeEvent?.id) params.set('event_id', activeEvent.id);
        if (search) params.set('search', search);
        if (selectedCert) params.set('certification', selectedCert);
        if (activeStatus && activeStatus !== 'all') params.set('status', activeStatus);
        return `/admin/arbitrase/evaluasi/export?${params.toString()}`;
    }, [activeEvent?.id, search, selectedCert, activeStatus]);

    return (
        <AdminLayout title="Evaluasi Perwasitan & Anti-Bias">
            <Head title="Evaluasi & Analisis Perwasitan (Anti-Bias) | Smart Perkemi" />

            <div className="space-y-5 pb-10 sm:space-y-6">
                {/* Header Banner */}
                <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#0f0d0b] via-[#211b16] to-[#0f0d0b] p-5 text-white shadow-xl sm:p-6 print:hidden">
                    <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#d4a843]/15 blur-3xl" />
                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-3xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#e1b94e]">
                                    <i className="fa-solid fa-scale-unbalanced" aria-hidden="true" />
                                    Arbitrase & Dewan Wasit
                                </p>
                                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300 border border-emerald-400/30">
                                    Modul Anti-Bias Aktif
                                </span>
                            </div>
                            <h1 className="mt-2 text-2xl font-bold md:text-3xl">
                                Evaluasi & Analisis Perwasitan
                            </h1>
                            <p className="mt-2 text-sm leading-6 text-white/70">
                                Matriks statistik performa wasit (x̄, σ, rentang skor), deteksi anomali nilai terbuang (trimmed-out),
                                audit independensi kedaerahan kontingen, serta evaluasi naratif otomatis dewan arbitrase.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 w-full xl:w-96">
                            <Combobox
                                label="Event Kejuaraan"
                                labelClassName="text-white/60"
                                containerClassName="w-full"
                                value={activeEvent?.id || ''}
                                onChange={(value) => router.get('/admin/arbitrase/evaluasi', { event_id: value })}
                                clearable={false}
                                options={events.map((ev) => ({
                                    value: ev.id,
                                    label: ev.name,
                                    sublabel: [ev.status_label, ev.date_label, ev.city].filter(Boolean).join(' · '),
                                }))}
                            />
                            <div className="flex items-center justify-end gap-2">
                                <Link
                                    href="/admin/arbitrase/scoring"
                                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 text-xs font-semibold text-white/90 hover:bg-white/10"
                                >
                                    <i className="fa-solid fa-chart-column" aria-hidden="true" />
                                    Hasil Nilai
                                </Link>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.print()}
                                    className="border-white/20 bg-white/5 text-xs text-white hover:bg-white/10"
                                    iconLeft={<i className="fa-solid fa-print" aria-hidden="true" />}
                                >
                                    Cetak A4
                                </Button>
                                <a
                                    href={exportUrl}
                                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white shadow hover:bg-emerald-700"
                                >
                                    <i className="fa-solid fa-file-excel" aria-hidden="true" />
                                    Excel (.xlsx)
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Print Header (Visible ONLY on print) */}
                <div className="hidden print:block mb-6 border-b-2 border-black pb-4 text-center">
                    <h1 className="text-xl font-black uppercase">Laporan Evaluasi & Analisis Perwasitan (Anti-Bias)</h1>
                    <p className="text-xs font-bold">PENGURUS BESAR PERSAUDARAAN BELADIRI SHORINJI KEMPO INDONESIA (PB PERKEMI)</p>
                    <p className="text-[11px] text-gray-600">
                        Kejuaraan: {activeEvent?.name || '—'} · Lokasi: {activeEvent?.city || '—'} · Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}
                    </p>
                </div>

                {/* KPI Metrics Cards */}
                <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4 print:grid-cols-4">
                    <MetricCard
                        icon="fa-user-shield"
                        label="Wasit Terdaftar"
                        value={summary.total_referees ?? 0}
                        helper={`${summary.active_judged_referees ?? 0} wasit telah menilai partai`}
                        tone="blue"
                    />
                    <MetricCard
                        icon="fa-calculator"
                        label="Rata-rata Skor Event (x̄)"
                        value={formatNumber(summary.average_score ?? 0)}
                        helper={`Dari total ${summary.total_scores_recorded ?? 0} penilaian Embu`}
                        tone="gold"
                    />
                    <MetricCard
                        icon="fa-chart-pie"
                        label="Rata-rata Std Dev (σ̄)"
                        value={formatNumber(summary.average_std_dev ?? 0)}
                        helper="Toleransi deviasi acuan: ≤ 6.00"
                        tone="slate"
                    />
                    <MetricCard
                        icon="fa-scale-unbalanced-flip"
                        label="Perhatian & Anomali"
                        value={(summary.flagged_count ?? 0) + (summary.needs_attention_count ?? 0)}
                        helper={`${summary.flagged_count ?? 0} anomali · ${summary.needs_attention_count ?? 0} perlu perhatian`}
                        tone={(summary.flagged_count ?? 0) > 0 ? 'rose' : (summary.needs_attention_count ?? 0) > 0 ? 'amber' : 'emerald'}
                    />
                </section>

                {/* Filter & View Control Bar */}
                <section className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5 print:hidden">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        {/* Tab Mode: Cards vs Table vs Heatmap */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab('cards')}
                                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${activeTab === 'cards' ? 'bg-[#17120f] text-white shadow' : 'bg-[#f7f4ef] text-[#6b6257] hover:bg-[#eee8e0]'}`}
                            >
                                <i className="fa-solid fa-address-card" aria-hidden="true" />
                                Kartu Wasit ({referees.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('table')}
                                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${activeTab === 'table' ? 'bg-[#17120f] text-white shadow' : 'bg-[#f7f4ef] text-[#6b6257] hover:bg-[#eee8e0]'}`}
                            >
                                <i className="fa-solid fa-table-list" aria-hidden="true" />
                                Tabel Komparasi Statistik
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('heatmap')}
                                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${activeTab === 'heatmap' ? 'bg-[#17120f] text-white shadow' : 'bg-[#f7f4ef] text-[#6b6257] hover:bg-[#eee8e0]'}`}
                            >
                                <i className="fa-solid fa-network-wired" aria-hidden="true" />
                                Heatmap Bias Kedaerahan
                            </button>
                        </div>

                        {/* Status Pills */}
                        <Tabs
                            tabs={statusTabs}
                            activeTab={activeStatus}
                            onChange={(status) => visitFilters({ status })}
                            variant="pills"
                        />
                    </div>

                    {/* Search & Certification Filter Form */}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            visitFilters({ search, certification: selectedCert });
                        }}
                        className="mt-4 flex flex-col gap-3 pt-4 border-t border-[#eee8e0] sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div className="flex flex-wrap items-center gap-2 flex-1">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari nama wasit, daerah asal, lisensi..."
                                iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                                size="sm"
                                clearable
                                onClear={() => {
                                    setSearch('');
                                    visitFilters({ search: '', certification: selectedCert });
                                }}
                                containerClassName="w-full sm:w-72"
                            />

                            <div className="w-full sm:w-48">
                                <select
                                    value={selectedCert}
                                    onChange={(e) => {
                                        setSelectedCert(e.target.value);
                                        visitFilters({ search, certification: e.target.value });
                                    }}
                                    className="w-full rounded-xl border border-[#d8cfc4] bg-[#fbfaf8] py-2 pl-3 pr-8 text-xs font-semibold text-[#2d2722] focus:border-[#d4a843] focus:outline-none focus:ring-1 focus:ring-[#d4a843]"
                                >
                                    <option value="">Semua Sertifikasi</option>
                                    {certificationOptions.map((opt) => (
                                        <option key={opt} value={opt}>
                                            Sertifikasi: {opt}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <Button type="submit" variant="dark" size="sm">
                                Filter
                            </Button>

                            {(search || selectedCert || activeStatus !== 'all') && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch('');
                                        setSelectedCert('');
                                        visitFilters({ search: '', certification: '', status: 'all' });
                                    }}
                                    className="text-xs font-bold text-[#b92f24] hover:underline"
                                >
                                    Reset Filter
                                </button>
                            )}
                        </div>

                        <p className="text-[11px] text-[#867e75]">
                            Menampilkan <strong>{referees.length}</strong> wasit terdaftar
                        </p>
                    </form>
                </section>

                {/* Main Content Area */}
                {activeTab === 'heatmap' ? (
                    <section className="space-y-4">
                        <HeatmapMatrix heatmap={heatmap} />
                    </section>
                ) : referees.length === 0 ? (
                    <section className="rounded-2xl border border-dashed border-[#d8d0c5] bg-white px-5 py-16 text-center shadow-sm">
                        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5efe5] text-2xl text-[#b8872d]">
                            <i className="fa-solid fa-user-xmark" aria-hidden="true" />
                        </span>
                        <h2 className="mt-4 text-lg font-bold text-[#17120f]">Data Wasit Tidak Ditemukan</h2>
                        <p className="mx-auto mt-1 max-w-md text-xs text-[#766e66]">
                            Tidak ada data wasit yang cocok dengan kriteria filter saat ini. Coba sesuaikan kata kunci pencarian atau sertifikasi.
                        </p>
                    </section>
                ) : activeTab === 'table' ? (
                    /* Table View */
                    <section className="overflow-x-auto rounded-2xl border border-[#e5ded4] bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-[#eee8e0] text-left text-xs">
                            <thead className="bg-[#f7f4ef] text-[11px] font-black uppercase tracking-wider text-[#6b6257]">
                                <tr>
                                    <th scope="col" className="px-4 py-3">No.</th>
                                    <th scope="col" className="px-4 py-3">Nama Wasit / Asal</th>
                                    <th scope="col" className="px-3 py-3">Sertifikasi & Dan</th>
                                    <th scope="col" className="px-3 py-3 text-center">Partai (N)</th>
                                    <th scope="col" className="px-3 py-3 text-center">Rata-rata (x̄)</th>
                                    <th scope="col" className="px-3 py-3 text-center">Std Dev (σ)</th>
                                    <th scope="col" className="px-3 py-3 text-center">Rentang (Min–Max)</th>
                                    <th scope="col" className="px-3 py-3 text-center">% Terbuang</th>
                                    <th scope="col" className="px-3 py-3 text-center">Deviasi Asal (Δ)</th>
                                    <th scope="col" className="px-3 py-3 text-center">Status</th>
                                    <th scope="col" className="px-4 py-3 text-right print:hidden">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#eee8e0] bg-white font-medium text-[#2d2722]">
                                {referees.map((ref, idx) => (
                                    <tr key={ref.id} className="hover:bg-[#fcfbf9]">
                                        <td className="px-4 py-3 text-[#877e74]">{idx + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-[#17120f]">{ref.name}</div>
                                            <div className="text-[10px] text-[#837a70]">
                                                {ref.region} {ref.license_number ? `· #${ref.license_number}` : ''}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="inline-block rounded bg-[#17120f] px-2 py-0.5 text-[9px] font-black uppercase text-[#d4a843]">
                                                {ref.certification_level}
                                            </div>
                                            <div className="text-[10px] text-[#8a7f74]">{ref.dan_grade || '—'}</div>
                                        </td>
                                        <td className="px-3 py-3 text-center font-mono font-bold">{ref.matches_judged_count}</td>
                                        <td className="px-3 py-3 text-center font-mono font-bold text-[#17120f]">
                                            {ref.matches_judged_count > 0 ? formatNumber(ref.average_score) : '—'}
                                        </td>
                                        <td className={`px-3 py-3 text-center font-mono font-bold ${ref.std_dev > 6 ? 'text-rose-600' : 'text-[#17120f]'}`}>
                                            {ref.matches_judged_count > 0 ? formatNumber(ref.std_dev) : '—'}
                                        </td>
                                        <td className="px-3 py-3 text-center font-mono text-[11px]">
                                            {ref.matches_judged_count > 0 ? `${formatNumber(ref.min_score)} – ${formatNumber(ref.max_score)}` : '—'}
                                        </td>
                                        <td className={`px-3 py-3 text-center font-mono font-bold ${ref.trimmed_rate >= 40 ? 'text-amber-600' : 'text-[#17120f]'}`}>
                                            {ref.matches_judged_count > 0 ? `${formatNumber(ref.trimmed_rate, 1)}%` : '—'}
                                        </td>
                                        <td className="px-3 py-3 text-center font-mono font-black">
                                            {ref.same_origin_count > 0 ? (
                                                <span className={ref.regional_delta >= 3.0 ? 'text-rose-700' : ref.regional_delta >= 1.5 ? 'text-amber-700' : 'text-emerald-700'}>
                                                    {ref.regional_delta > 0 ? `+${formatNumber(ref.regional_delta)}` : formatNumber(ref.regional_delta)}
                                                </span>
                                            ) : (
                                                <span className="text-[#a8a096]">0</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <StatusBadge status={ref.status} label={ref.status_label} />
                                        </td>
                                        <td className="px-4 py-3 text-right print:hidden">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedReferee(ref)}
                                                className="text-xs"
                                                iconLeft={<i className="fa-solid fa-file-waveform" aria-hidden="true" />}
                                            >
                                                Rapor
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                ) : (
                    /* Cards Grid View */
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {referees.map((referee) => (
                            <RefereeCard
                                key={referee.id}
                                referee={referee}
                                onOpenNarrative={setSelectedReferee}
                            />
                        ))}
                    </section>
                )}
            </div>

            {/* Modal Detail & Analisis Naratif */}
            <NarrativeModal
                referee={selectedReferee}
                isOpen={Boolean(selectedReferee)}
                onClose={() => setSelectedReferee(null)}
            />
        </AdminLayout>
    );
}
