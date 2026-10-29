import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import ActionMenuDropdown from '@/Components/UI/Elements/ActionMenuDropdown';
import Button from '@/Components/UI/Elements/Button';
import Combobox from '@/Components/UI/Forms/Combobox';
import Input from '@/Components/UI/Forms/Input';
import Modal from '@/Components/UI/Overlays/Modal';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

export default function WeighIn({
    activeEvent = null,
    event = null,
    events = [],
    categories = [],
    selectedCategory = null,
    entries = [],
    categoryStats = null,
    overallStats = null,
    filters = {},
    canManageWeighIn = true,
    isSuperOrAdmin = false,
}) {
    const { flash = {} } = usePage().props;
    const currentEvent = activeEvent || event;

    const [selectedCategoryId, setSelectedCategoryId] = useState(filters.category_id || selectedCategory?.id || '');
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [weights, setWeights] = useState({});
    const [notes, setNotes] = useState({});
    const [savingId, setSavingId] = useState(null);
    const [lockModalOpen, setLockModalOpen] = useState(false);
    const [unlockModalOpen, setUnlockModalOpen] = useState(false);
    const [isLocking, setIsLocking] = useState(false);

    const stats = categoryStats || overallStats || {
        total: 0,
        weighed: 0,
        passed: 0,
        overweight: 0,
        underweight: 0,
        disqualified: 0,
        failed_total: 0,
        pending: 0,
    };

    const visit = (overrides = {}) => {
        const params = {
            event_id: currentEvent?.id,
            category_id: selectedCategoryId,
            search: searchTerm,
            status: statusFilter,
            ...overrides,
        };

        if (!params.category_id) delete params.category_id;
        if (!params.search) delete params.search;
        if (!params.status) delete params.status;

        router.get('/admin/pertandingan/timbang-badan', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleCategoryChange = (catId) => {
        setSelectedCategoryId(catId);
        visit({ category_id: catId });
    };

    const handleSearch = (e) => {
        e.preventDefault();
        visit({ search: searchTerm });
    };

    const handleStatusFilterChange = (status) => {
        setStatusFilter(status);
        visit({ status });
    };

    const getRowWeight = (entry) => {
        if (weights[entry.id] !== undefined) {
            return weights[entry.id];
        }
        return entry.actual_weight !== null ? String(entry.actual_weight) : '';
    };

    const getRowNotes = (entry) => {
        if (notes[entry.id] !== undefined) {
            return notes[entry.id];
        }
        return entry.weigh_in_notes || '';
    };

    const calculatePreviewStatus = (val, min, max) => {
        if (!val || isNaN(val)) return null;
        const num = parseFloat(val);
        if (max !== null && num > max) return 'overweight';
        if (min !== null && min > 0 && num < min) return 'underweight';
        return 'passed';
    };

    const handleSaveEntry = (entry) => {
        const rawWeight = getRowWeight(entry);
        if (!rawWeight || isNaN(rawWeight)) {
            alert('Masukkan berat badan kenshi yang valid (dalam kg).');
            return;
        }

        const weightNum = parseFloat(rawWeight);
        if (weightNum < 20 || weightNum > 200) {
            alert('Berat badan harus antara 20 kg dan 200 kg.');
            return;
        }

        setSavingId(entry.id);
        router.post(
            `/admin/pertandingan/timbang-badan/entry/${entry.id}`,
            {
                actual_weight: weightNum,
                weigh_in_notes: getRowNotes(entry),
            },
            {
                preserveScroll: true,
                onFinish: () => setSavingId(null),
            }
        );
    };

    const handleToggleLock = () => {
        if (!selectedCategory) return;
        setIsLocking(true);

        const routeUrl = selectedCategory.is_locked
            ? `/admin/pertandingan/timbang-badan/category/${selectedCategory.id}/unlock`
            : `/admin/pertandingan/timbang-badan/category/${selectedCategory.id}/lock`;

        router.post(routeUrl, {}, {
            preserveScroll: true,
            onFinish: () => {
                setIsLocking(false);
                setLockModalOpen(false);
                setUnlockModalOpen(false);
            },
        });
    };

    const isCategoryLocked = selectedCategory?.is_locked;

    const categoryOptions = useMemo(() => [
        { value: '', label: 'Semua Nomor Randori' },
        ...categories.map((cat) => ({
            value: cat.id,
            label: cat.name,
            sublabel: `${cat.min_weight ? `${cat.min_weight} - ` : ''}${cat.max_weight || 'Bebas'} kg${cat.is_locked ? ' · [Terkunci]' : ''}`,
        })),
    ], [categories]);

    return (
        <AdminLayout title="Penimbangan Badan Hari-H">
            <Head title={`Penimbangan Badan Hari-H · ${currentEvent?.name || 'Smart Perkemi'}`} />

            <div className="space-y-6 pb-12">
                {/* Header Banner */}
                <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#0f0d0b] via-[#1a1714] to-[#0f0d0b] p-5 text-[#f7f4ef] shadow-xl md:p-6">
                    <div className="absolute -top-12 -right-12 h-48 w-48 bg-[radial-gradient(circle,rgba(212,168,67,0.25)_0%,transparent_70%)] pointer-events-none" />
                    <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                        <div className="max-w-2xl">
                            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#e1b94e]">
                                <i className="fa-solid fa-weight-scale" aria-hidden="true" /> Pertandingan · Operasional Hari-H
                            </p>
                            <h1 className="mt-2 font-cinzel text-xl md:text-2xl font-bold tracking-tight text-white">
                                Penimbangan Badan Hari-H (Weigh-In)
                            </h1>
                            <p className="mt-2 text-sm leading-relaxed text-white/70">
                                Pencatatan dan verifikasi berat badan aktual kenshi Randori sesuai toleransi batas kelas berat PB Perkemi. Kenshi yang tidak lolos timbang otomatis dinyatakan Walkover (WO) pada bagan Drawing.
                            </p>
                            {currentEvent && (
                                <p className="mt-3 flex w-full items-start gap-2 rounded-xl border border-[#d4a843]/30 bg-[#d4a843]/10 px-3 py-2 text-xs font-semibold leading-relaxed text-[#f0c060] sm:inline-flex sm:w-auto sm:items-center sm:rounded-full sm:py-1">
                                    <i className="fa-solid fa-trophy mt-0.5 shrink-0 sm:mt-0" aria-hidden="true" />
                                    <span>{currentEvent.name} {currentEvent.city ? `· ${currentEvent.city}` : ''}</span>
                                </p>
                            )}
                        </div>

                        <div className="w-full space-y-2.5 md:w-96">
                            <Combobox
                                label="Event dipilih"
                                labelClassName="text-white/60"
                                containerClassName="w-full"
                                value={currentEvent?.id || ''}
                                clearable={false}
                                onChange={(value) => router.get('/admin/pertandingan/timbang-badan', { event_id: value })}
                                options={events.map((evt) => ({
                                    value: evt.id,
                                    label: evt.name,
                                    sublabel: [evt.status_label, evt.date_label, evt.city].filter(Boolean).join(' · '),
                                }))}
                            />
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                {currentEvent && (
                                    <Link
                                        href={`/admin/pertandingan/drawing?event_id=${currentEvent.id}`}
                                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-[#d4a843] px-3 text-xs font-bold text-[#17120f] transition hover:bg-[#e3ba52]"
                                    >
                                        <span>Bagan Drawing</span>
                                        <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden="true" />
                                    </Link>
                                )}
                                <ActionMenuDropdown
                                    label="Menu Aksi"
                                    theme="gold"
                                    menuHeader="Aksi Penimbangan"
                                    icon={<i className="fa-solid fa-sliders text-xs" />}
                                    items={[
                                        selectedCategory ? {
                                            label: `Cetak Berita Acara (${selectedCategory.name})`,
                                            description: 'Unduh Berita Acara resmi PDF kelas ini',
                                            icon: <i className="fa-solid fa-file-pdf text-rose-600" />,
                                            href: `/admin/pertandingan/timbang-badan/export?event_id=${currentEvent?.id || ''}&category_id=${selectedCategory.id}`,
                                            target: '_blank',
                                            tone: 'default',
                                            badge: 'PDF',
                                        } : null,
                                        {
                                            label: 'Cetak Seluruh Berita Acara',
                                            description: 'Unduh seluruh berita acara semua kelas randori',
                                            icon: <i className="fa-solid fa-print text-[#d4a843]" />,
                                            href: `/admin/pertandingan/timbang-badan/export?event_id=${currentEvent?.id || ''}`,
                                            target: '_blank',
                                            tone: 'default',
                                            badge: 'PDF',
                                        },
                                        { divider: true },
                                        {
                                            label: 'Bagan Drawing',
                                            description: 'Buka bagan pertandingan & cek status WO timbang',
                                            icon: <i className="fa-solid fa-sitemap text-amber-600" />,
                                            href: `/admin/pertandingan/drawing?event_id=${currentEvent?.id || ''}`,
                                            isLink: true,
                                            tone: 'default',
                                        },
                                        {
                                            label: 'Jadwal Pertandingan',
                                            description: 'Buka penjadwalan & susunan court',
                                            icon: <i className="fa-solid fa-calendar-days text-blue-600" />,
                                            href: `/admin/pertandingan/jadwal?event_id=${currentEvent?.id || ''}`,
                                            isLink: true,
                                            tone: 'default',
                                        },
                                        {
                                            label: 'Penggabungan (Merge)',
                                            description: 'Kelola nomor tanding kurang kuota',
                                            icon: <i className="fa-solid fa-object-group text-[#d4a843]" />,
                                            href: `/admin/pertandingan/merge?event_id=${currentEvent?.id || ''}`,
                                            isLink: true,
                                            tone: 'default',
                                        },
                                        {
                                            label: 'Penugasan Wasit',
                                            description: 'Kelola court & kehadiran wasit event',
                                            icon: <i className="fa-solid fa-user-shield text-emerald-600" />,
                                            href: `/admin/pertandingan/wasit?event_id=${currentEvent?.id || ''}`,
                                            isLink: true,
                                            tone: 'default',
                                        },
                                        {
                                            label: 'Verifikasi Berkas Kenshi',
                                            description: 'Pemeriksaan KTA & surat dokter',
                                            icon: <i className="fa-solid fa-user-check text-violet-600" />,
                                            href: `/admin/pendaftaran/verifikasi?event_id=${currentEvent?.id || ''}`,
                                            isLink: true,
                                            tone: 'default',
                                        },
                                    ].filter(Boolean)}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Flash Messages */}
                {(flash.success || flash.error) && (
                    <div
                        role="status"
                        className={`rounded-xl border px-4 py-3 text-sm ${
                            flash.error
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}
                    >
                        {flash.error || flash.success}
                    </div>
                )}

                {/* Stat Cards */}
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan timbang badan">
                    <article className="rounded-2xl border border-[#e5ded4] bg-white p-5 shadow-sm">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <i className="fa-solid fa-users" aria-hidden="true" />
                        </div>
                        <p className="mt-4 font-cinzel text-2xl font-black text-[#17120f]">{stats.total || 0}</p>
                        <p className="mt-0.5 text-xs text-[#7a746e]">Total Kenshi Randori</p>
                    </article>

                    <article className="rounded-2xl border border-[#e5ded4] bg-white p-5 shadow-sm">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <i className="fa-solid fa-clipboard-check" aria-hidden="true" />
                        </div>
                        <p className="mt-4 font-cinzel text-2xl font-black text-emerald-800">{stats.weighed || 0}</p>
                        <p className="mt-0.5 text-xs text-[#7a746e]">
                            Sudah Ditimbang ({stats.total > 0 ? `${Math.round((stats.weighed / stats.total) * 100)}%` : '0%'})
                        </p>
                    </article>

                    <article className="rounded-2xl border border-[#e5ded4] bg-white p-5 shadow-sm">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                            <i className="fa-solid fa-circle-check" aria-hidden="true" />
                        </div>
                        <p className="mt-4 font-cinzel text-2xl font-black text-teal-800">{stats.passed || 0}</p>
                        <p className="mt-0.5 text-xs text-[#7a746e]">Sah / Memenuhi Kelas Berat</p>
                    </article>

                    <article className="rounded-2xl border border-[#e5ded4] bg-white p-5 shadow-sm">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                        </div>
                        <p className="mt-4 font-cinzel text-2xl font-black text-rose-700">
                            {stats.failed_total !== undefined ? stats.failed_total : (stats.overweight || 0) + (stats.underweight || 0)}
                        </p>
                        <p className="mt-0.5 text-xs text-[#7a746e]">
                            Gagal Timbang / WO ({stats.overweight || 0} Over · {stats.underweight || 0} Under)
                        </p>
                    </article>
                </section>

                {/* Operations & Table Container */}
                <section className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm" aria-labelledby="weighin-list-title">
                    <div className="flex flex-col gap-4 border-b border-[#e9e2d8] bg-[#faf8f5] p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#9b7125]">Stasiun Penimbangan Hari-H</p>
                            <h2 id="weighin-list-title" className="mt-1 font-cinzel text-lg font-bold text-[#17120f]">
                                {selectedCategory ? selectedCategory.name : 'Semua Nomor Tanding Randori'}
                            </h2>
                            <p className="mt-1 text-xs text-[#7a746e]">
                                {selectedCategory ? (
                                    <>
                                        Batas Kelas: <strong className="text-[#17120f]">{selectedCategory.min_weight ? `${selectedCategory.min_weight} kg` : '0 kg'} – {selectedCategory.max_weight ? `${selectedCategory.max_weight} kg` : 'Bebas'}</strong>
                                        {selectedCategory.gender && <span> · Gender: <strong>{selectedCategory.gender === 'male' ? 'Putra' : 'Putri'}</strong></span>}
                                        {isCategoryLocked && (
                                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                                                <i className="fa-solid fa-lock text-[9px]" /> Sesi Terkunci
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    'Pilih salah satu kelas berat randori untuk memfilter kenshi atau mengunci sesi timbang.'
                                )}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {selectedCategory && (
                                <Link
                                    href={`/admin/pertandingan/timbang-badan/export?event_id=${currentEvent?.id || ''}&category_id=${selectedCategory.id}`}
                                    target="_blank"
                                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[#d8d1c8] bg-white px-3 text-xs font-bold text-[#625b54] hover:bg-[#f5f1eb]"
                                >
                                    <i className="fa-solid fa-file-pdf text-rose-600" aria-hidden="true" />
                                    <span>Berita Acara</span>
                                </Link>
                            )}

                            {selectedCategory && (
                                isCategoryLocked ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setUnlockModalOpen(true)}
                                        className="border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                                    >
                                        <i className="fa-solid fa-lock-open mr-1.5 text-amber-700" aria-hidden="true" />
                                        <span>Buka Kunci Sesi</span>
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setLockModalOpen(true)}
                                        className="border-[#d8d1c8] bg-white text-[#17120f] hover:bg-[#f5f1eb]"
                                    >
                                        <i className="fa-solid fa-lock mr-1.5 text-[#8a631c]" aria-hidden="true" />
                                        <span>Kunci Sesi Kelas</span>
                                    </Button>
                                )
                            )}
                        </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="space-y-3.5 border-b border-[#e9e2d8] p-4 sm:p-5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="w-full lg:max-w-md">
                                <Combobox
                                    label="Pilih Kelas Randori"
                                    value={selectedCategoryId}
                                    onChange={handleCategoryChange}
                                    options={categoryOptions}
                                    clearable={false}
                                />
                            </div>

                            <form onSubmit={handleSearch} className="flex w-full items-end gap-2 lg:max-w-sm">
                                <div className="flex-1">
                                    <Input
                                        label="Pencarian Kenshi"
                                        placeholder="Cari nama kenshi atau kontingen..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        iconLeft={<i className="fa-solid fa-magnifying-glass" />}
                                    />
                                </div>
                                <Button type="submit" className="min-h-11 bg-[#17120f] text-white hover:bg-[#2b2520]">
                                    Cari
                                </Button>
                            </form>
                        </div>

                        {/* Status Filter Pills */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-xs font-bold text-[#7a746e]">Status:</span>
                            {[
                                { id: '', label: 'Semua Status' },
                                { id: 'passed', label: 'Sah (Lolos)' },
                                { id: 'overweight', label: 'Overweight' },
                                { id: 'underweight', label: 'Underweight' },
                                { id: 'pending', label: 'Belum Ditimbang' },
                            ].map((btn) => (
                                <button
                                    key={btn.id}
                                    type="button"
                                    onClick={() => handleStatusFilterChange(btn.id)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                        statusFilter === btn.id
                                            ? 'bg-[#17120f] text-[#f0c060] shadow-xs'
                                            : 'border border-[#d8d1c8] bg-white text-[#625b54] hover:bg-[#f5f1eb]'
                                    }`}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    {entries.length ? (
                        <TableContainer ariaLabel="Tabel Penimbangan Kenshi Randori">
                            <table className="responsive-data-table responsive-data-table--cards w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-[#e9e2d8] bg-[#f8f5f0] text-[10px] font-bold uppercase tracking-wider text-[#817970]">
                                        <th className="px-5 py-3.5">No</th>
                                        <th className="px-5 py-3.5">Kenshi & Kontingen</th>
                                        <th className="px-5 py-3.5">Tingkatan & Kelas</th>
                                        <th className="px-5 py-3.5 text-center">Batas Kelas</th>
                                        <th className="px-5 py-3.5 text-center">Berat Hari-H</th>
                                        <th className="px-5 py-3.5 text-center">Status</th>
                                        <th className="px-5 py-3.5">Petugas & Catatan</th>
                                        <th className="px-5 py-3.5 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#eee8e0]">
                                    {entries.map((entry, idx) => {
                                        const currentVal = getRowWeight(entry);
                                        const previewStatus = calculatePreviewStatus(currentVal, entry.min_weight, entry.max_weight);
                                        const effectiveStatus = previewStatus || entry.weigh_in_status;
                                        const isLockedRow = entry.is_locked;

                                        return (
                                            <tr key={entry.id} className="hover:bg-[#fcfaf7] transition-colors">
                                                <td data-label="No" className="px-5 py-4 text-xs font-semibold text-[#817970]">
                                                    {idx + 1}
                                                </td>

                                                {/* Kenshi & Kontingen */}
                                                <td data-label="Kenshi & Kontingen" className="px-5 py-4">
                                                    <p className="font-bold text-[#17120f]">{entry.name}</p>
                                                    <p className="mt-0.5 text-xs text-[#7a746e]">
                                                        {entry.contingent_name} {entry.contingent_city ? `· ${entry.contingent_city}` : ''}
                                                    </p>
                                                </td>

                                                {/* Tingkatan & Kelas */}
                                                <td data-label="Tingkatan & Kelas" className="px-5 py-4">
                                                    <p className="font-semibold text-[#3d3732]">{entry.kyu_dan}</p>
                                                    <p className="mt-0.5 text-xs text-[#7a746e]">{entry.category_name}</p>
                                                </td>

                                                {/* Batas Kelas */}
                                                <td data-label="Batas Kelas" className="px-5 py-4 text-center">
                                                    <span className="inline-block rounded-md border border-[#e5ded4] bg-[#faf8f5] px-2 py-0.5 font-mono text-xs font-bold text-[#625b54]">
                                                        {entry.min_weight ? `${entry.min_weight}` : '0'} – {entry.max_weight ? `${entry.max_weight}` : '∞'} kg
                                                    </span>
                                                </td>

                                                {/* Berat Hari-H */}
                                                <td data-label="Berat Hari-H" className="px-5 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <input
                                                            type="number"
                                                            step="0.05"
                                                            min="20"
                                                            max="200"
                                                            disabled={isLockedRow}
                                                            placeholder="0.00"
                                                            value={currentVal}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setWeights((prev) => ({ ...prev, [entry.id]: val }));
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleSaveEntry(entry);
                                                                }
                                                            }}
                                                            className={`w-24 rounded-lg border px-2 py-1.5 text-center font-mono text-sm font-bold transition-all ${
                                                                previewStatus === 'passed'
                                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                                                                    : previewStatus === 'overweight'
                                                                    ? 'border-rose-500 bg-rose-50 text-rose-900'
                                                                    : previewStatus === 'underweight'
                                                                    ? 'border-amber-500 bg-amber-50 text-amber-900'
                                                                    : 'border-[#dcd4ca] bg-white text-[#17120f]'
                                                            } ${isLockedRow ? 'cursor-not-allowed opacity-60' : 'focus:border-[#b8872d] focus:ring-2 focus:ring-[#d4a843]/25'}`}
                                                        />
                                                        <span className="text-xs font-bold text-[#7a746e]">kg</span>
                                                    </div>
                                                </td>

                                                {/* Status Badge */}
                                                <td data-label="Status" className="px-5 py-4 text-center">
                                                    {effectiveStatus === 'passed' && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-800">
                                                            <i className="fa-solid fa-check text-[9px]" /> Sah (Lolos)
                                                        </span>
                                                    )}
                                                    {effectiveStatus === 'overweight' && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold uppercase text-rose-800">
                                                            <i className="fa-solid fa-triangle-exclamation text-[9px]" /> Overweight
                                                        </span>
                                                    )}
                                                    {effectiveStatus === 'underweight' && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-800">
                                                            <i className="fa-solid fa-arrow-down text-[9px]" /> Underweight
                                                        </span>
                                                    )}
                                                    {(!effectiveStatus || effectiveStatus === 'pending') && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#eeeae4] px-2.5 py-1 text-[10px] font-bold uppercase text-[#7a746e]">
                                                            <i className="fa-solid fa-clock text-[9px]" /> Belum Timbang
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Petugas & Catatan */}
                                                <td data-label="Petugas & Catatan" className="px-5 py-4">
                                                    <input
                                                        type="text"
                                                        placeholder="Catatan timbang badan..."
                                                        disabled={isLockedRow}
                                                        value={getRowNotes(entry)}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setNotes((prev) => ({ ...prev, [entry.id]: val }));
                                                        }}
                                                        className="w-full rounded-lg border border-[#dcd4ca] bg-white px-2.5 py-1 text-xs text-[#17120f] placeholder:text-[#a0988e] focus:border-[#b8872d] focus:outline-none focus:ring-1 focus:ring-[#d4a843] disabled:opacity-50"
                                                    />
                                                    {entry.weigh_in_at && (
                                                        <p className="mt-1 text-[10px] text-[#817970]">
                                                            <i className="fa-regular fa-clock mr-1" />
                                                            {entry.weigh_in_at} {entry.weighed_by_name ? `· Petugas: ${entry.weighed_by_name}` : ''}
                                                        </p>
                                                    )}
                                                </td>

                                                {/* Aksi */}
                                                <td data-label="Aksi" className="px-5 py-4 text-right">
                                                    <Button
                                                        size="sm"
                                                        disabled={isLockedRow || savingId === entry.id}
                                                        onClick={() => handleSaveEntry(entry)}
                                                        className="min-h-9 bg-[#17120f] text-white hover:bg-[#2b2520] disabled:opacity-40"
                                                    >
                                                        {savingId === entry.id ? (
                                                            <>
                                                                <i className="fa-solid fa-spinner animate-spin mr-1.5" />
                                                                <span>Simpan...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="fa-solid fa-floppy-disk mr-1.5" />
                                                                <span>Simpan</span>
                                                            </>
                                                        )}
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </TableContainer>
                    ) : (
                        <div className="rounded-b-2xl p-10 text-center text-sm text-[#7a746e]">
                            <i className="fa-solid fa-weight-scale mb-3 block text-3xl text-[#d4a843]" aria-hidden="true" />
                            <p className="font-bold text-[#17120f]">Tidak ada kenshi randori yang cocok dengan kriteria.</p>
                            <p className="mt-1 text-xs">Pilih nomor randori lain atau periksa kembali kata kunci pencarian Anda.</p>
                        </div>
                    )}
                </section>
            </div>

            {/* Lock Confirmation Modal */}
            <Modal
                isOpen={lockModalOpen}
                onClose={() => setLockModalOpen(false)}
                title="Kunci Sesi Penimbangan Kelas"
                subtitle={`Nomor: ${selectedCategory?.name || 'Nomor Terpilih'}`}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setLockModalOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            disabled={isLocking}
                            onClick={handleToggleLock}
                            className="bg-[#17120f] text-white hover:bg-[#2b2520]"
                        >
                            {isLocking ? 'Mengunci...' : 'Ya, Kunci Sesi Ini'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="rounded-xl border border-[#e8e1d8] bg-[#faf8f5] p-4 text-sm leading-6 text-[#625b54]">
                        <p className="font-bold text-[#17120f]">Data penimbangan kelas ini akan dibekukan (freeze).</p>
                        <p className="mt-1">
                            Setelah dikunci, data berat badan kenshi tidak dapat diubah oleh operator penimbangan kecuali dibuka kembali oleh Administrator atau Panitia Utama.
                        </p>
                    </div>
                    <p className="text-xs text-[#7a746e]">
                        Gunakan fitur ini setelah sesi penimbangan kelas selesai untuk memastikan integritas data sebelum bagan drawing resmi dijalankan.
                    </p>
                </div>
            </Modal>

            {/* Unlock Confirmation Modal */}
            <Modal
                isOpen={unlockModalOpen}
                onClose={() => setUnlockModalOpen(false)}
                title="Buka Kunci Penimbangan"
                subtitle={`Nomor: ${selectedCategory?.name || 'Nomor Terpilih'}`}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setUnlockModalOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            disabled={isLocking}
                            onClick={handleToggleLock}
                            className="bg-amber-700 text-white hover:bg-amber-800"
                        >
                            {isLocking ? 'Membuka...' : 'Buka Kunci Sekarang'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                        <p className="font-bold">Membuka kunci sesi penimbangan atlet.</p>
                        <p className="mt-1">
                            Membuka kunci memungkinkan perubahan kembali data berat badan atlet. Pastikan tindakan ini dilakukan atas otorisasi Delegasi Teknis atau Dewan Wasit.
                        </p>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}
