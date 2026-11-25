import React, { useState, useMemo } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Modal, Button, Input, Textarea, Combobox, Checkbox, Pagination } from '@/Components/UI';
import TableContainer from '@/Components/UI/DataDisplay/TableContainer';

export default function RundownTab({
    event,
    rundowns = [],
    courts = [],
}) {
    const itemsPerPage = 10;
    const [rundownSearch, setRundownSearch] = useState('');
    const [rundownPage, setRundownPage] = useState(1);
    const [isRundownModalOpen, setIsRundownModalOpen] = useState(false);
    const [editingRundown, setEditingRundown] = useState(null);
    const [deletingRundown, setDeletingRundown] = useState(null);

    const rundownTypeOptions = [
        { value: 'ceremony', label: 'Upacara / Pembukaan' },
        { value: 'match', label: 'Pertandingan' },
        { value: 'break', label: 'Istirahat / Jeda' },
        { value: 'evaluation', label: 'Evaluasi / Briefing' },
        { value: 'awarding', label: 'Upacara Penghargaan (UPP)' },
    ];

    const rundownForm = useForm({
        date: event.start_date || '',
        time: '08:00',
        end_time: '12:00',
        name: '',
        type: 'Pertandingan',
        description: '',
        order: (rundowns.length || 0) + 1,
        is_match_session: true,
    });

    const openCreateRundownModal = () => {
        setEditingRundown(null);
        rundownForm.reset();
        rundownForm.clearErrors();
        rundownForm.setData({
            date: event.start_date || '',
            time: '08:00',
            end_time: '12:00',
            name: '',
            type: 'Pertandingan',
            description: '',
            order: (rundowns.length || 0) + 1,
            is_match_session: true,
        });
        setIsRundownModalOpen(true);
    };

    const openEditRundownModal = (rd) => {
        setEditingRundown(rd);
        rundownForm.clearErrors();
        rundownForm.setData({
            date: rd.date_only || event.start_date || '',
            time: rd.time_only || '08:00',
            end_time: rd.end_time_only || '',
            name: rd.name || '',
            type: rd.type || 'Pertandingan',
            description: rd.description || '',
            order: rd.order ?? 0,
            is_match_session: Boolean(rd.is_match_session),
        });
        setIsRundownModalOpen(true);
    };

    const submitRundown = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (editingRundown) {
            rundownForm.put(`/admin/master/event/${event.id}/rundown/${editingRundown.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsRundownModalOpen(false);
                    setEditingRundown(null);
                },
            });
        } else {
            rundownForm.post(`/admin/master/event/${event.id}/rundown`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsRundownModalOpen(false);
                    rundownForm.reset();
                },
            });
        }
    };

    const confirmDeleteRundown = () => {
        if (!deletingRundown) return;
        router.delete(`/admin/master/event/${event.id}/rundown/${deletingRundown.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingRundown(null),
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            }).format(date);
        } catch {
            return dateString;
        }
    };

    const filteredRundowns = useMemo(() => {
        if (!rundownSearch) return rundowns;
        const q = rundownSearch.toLowerCase();
        return rundowns.filter((rd) => {
            return (
                rd.name?.toLowerCase().includes(q) ||
                rd.description?.toLowerCase().includes(q) ||
                rd.type?.toLowerCase().includes(q) ||
                rd.date?.toLowerCase().includes(q)
            );
        });
    }, [rundowns, rundownSearch]);

    const paginatedRundowns = useMemo(() => {
        return filteredRundowns.slice(
            (rundownPage - 1) * itemsPerPage,
            rundownPage * itemsPerPage
        );
    }, [filteredRundowns, rundownPage, itemsPerPage]);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#ede9e1] dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Table Header / Toolbar */}
            <div className="p-5 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#ede9e1] dark:border-slate-800">
                <div>
                    <div className="flex items-center gap-3">
                        <h3 className="font-sans text-base md:text-lg font-bold text-[#0f0d0b] dark:text-white tracking-tight">
                            Sesi Acara & Rundown
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#c0392b]/10 text-[#c0392b] dark:bg-[#c0392b]/20 dark:text-[#f0c060] border border-[#c0392b]/20">
                            {rundowns.length} Total
                        </span>
                    </div>
                    <p className="text-xs text-[#b5afa6] dark:text-slate-400 mt-1">
                        Jadwal kronologis pelaksanaan kegiatan kejuaraan dari upacara pembukaan hingga babak final
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Search Input Bar */}
                    <Input
                        type="search"
                        size="sm"
                        value={rundownSearch}
                        onChange={(event) => {
                            setRundownSearch(event.target.value);
                            setRundownPage(1);
                        }}
                        placeholder="Cari sesi rundown..."
                        iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                        clearable
                        onClear={() => {
                            setRundownSearch('');
                            setRundownPage(1);
                        }}
                        containerClassName="w-56 sm:w-64"
                    />

                    <Button
                        variant="unstyled"
                        size="none"
                        type="button"
                        onClick={openCreateRundownModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#c0392b] to-[#96281b] hover:from-[#a93226] hover:to-[#7b1f14] shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
                        title="Tambah Sesi Rundown"
                    >
                        <i className="fa-solid fa-plus text-xs"></i>
                        <span>Tambah Sesi Rundown</span>
                    </Button>
                </div>
            </div>

            {/* Table Content */}
            <TableContainer ariaLabel="Tabel data rundown">
                <table className="responsive-data-table whitespace-nowrap w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[#f7f4ef] dark:bg-slate-800/70 border-b border-[#ede9e1] dark:border-slate-800 text-[10px] uppercase font-semibold text-[#8c827a] dark:text-slate-400 tracking-wider whitespace-nowrap">
                            <th scope="col" className="py-3 px-4 text-center w-14">#</th>
                            <th scope="col" className="py-3 px-4 min-w-[200px]">Waktu Pelaksanaan</th>
                            <th scope="col" className="py-3 px-4 min-w-[240px]">Nama Sesi Acara</th>
                            <th scope="col" className="py-3 px-4 min-w-[160px]">Kategori / Tipe</th>
                            <th scope="col" className="py-3 px-4 min-w-[240px]">Deskripsi / Lokasi</th>
                            <th scope="col" className="py-3 px-4 text-center w-24">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ede9e1]/80 dark:divide-slate-800/80 text-xs">
                        {paginatedRundowns.length > 0 ? (
                            paginatedRundowns.map((rd, idx) => (
                                <tr key={rd.id || idx} className="hover:bg-[#faf8f4] dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-500">
                                        {(rundownPage - 1) * itemsPerPage + idx + 1}
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <div className="font-semibold text-slate-900 dark:text-white">
                                            {formatDate(rd.date)}
                                        </div>
                                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                            <i className="fa-regular fa-clock text-[10px]" />
                                            <span>{rd.time || '-'}</span>
                                            {rd.end_time && <span>- {rd.end_time}</span>}
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <div className="font-bold text-slate-900 dark:text-white">
                                            {rd.name}
                                        </div>
                                        {rd.court?.name && (
                                            <span className="inline-block mt-0.5 text-[11px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 rounded-md">
                                                {rd.court.name}
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                            {rd.type || 'Umum'}
                                        </span>
                                        {rd.is_match_session && (
                                            <span className="ml-1.5 inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400">
                                                Sesi Pertandingan
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-xs">
                                        <span className="truncate block max-w-xs">{rd.description || '-'}</span>
                                    </td>
                                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <Button
                                                variant="unstyled"
                                                size="none"
                                                type="button"
                                                onClick={() => openEditRundownModal(rd)}
                                                className="w-8 h-8 rounded-xl border border-[#ede9e1] bg-white text-slate-600 hover:bg-[#c0392b] hover:text-white hover:border-[#c0392b] transition-all inline-flex items-center justify-center cursor-pointer shadow-xs hover:scale-105 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                                                title="Edit Sesi Rundown"
                                            >
                                                <i className="fa-solid fa-pen-to-square text-xs"></i>
                                            </Button>
                                            <Button
                                                variant="unstyled"
                                                size="none"
                                                type="button"
                                                onClick={() => setDeletingRundown(rd)}
                                                className="w-8 h-8 rounded-xl border border-[#ede9e1] bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all inline-flex items-center justify-center cursor-pointer shadow-xs hover:scale-105 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                                                title="Hapus Sesi Rundown"
                                            >
                                                <i className="fa-solid fa-trash-can text-xs"></i>
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-[#b5afa6] italic text-xs">
                                    <i className="fa-solid fa-clock-rotate-left text-3xl mb-2 block opacity-40"></i>
                                    Belum ada data sesi rundown yang sesuai.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </TableContainer>

            {/* Table Footer with Pagination Controls */}
            {filteredRundowns.length > 0 && (
                <Pagination
                    currentPage={rundownPage}
                    totalPages={Math.ceil(filteredRundowns.length / itemsPerPage) || 1}
                    total={filteredRundowns.length}
                    from={(rundownPage - 1) * itemsPerPage + 1}
                    to={Math.min(rundownPage * itemsPerPage, filteredRundowns.length)}
                    onPageChange={(p) => setRundownPage(p)}
                    label="sesi acara"
                    variant="footer"
                />
            )}

            {/* Modal Tambah / Edit Sesi Rundown */}
            <Modal
                isOpen={isRundownModalOpen}
                onClose={() => setIsRundownModalOpen(false)}
                title={editingRundown ? 'Edit Sesi Rundown' : 'Tambah Sesi Rundown Baru'}
                description="Tentukan waktu pelaksanaan, nama kegiatan, dan jenis sesi acara."
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsRundownModalOpen(false)}
                            disabled={rundownForm.processing}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={submitRundown}
                            loading={rundownForm.processing}
                            className="bg-[#141210] hover:bg-black text-amber-400 font-semibold"
                        >
                            {editingRundown ? 'Simpan Perubahan' : 'Tambahkan Sesi'}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={submitRundown} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            label="Tanggal Sesi"
                            type="date"
                            required
                            value={rundownForm.data.date}
                            onChange={(e) => rundownForm.setData('date', e.target.value)}
                            error={rundownForm.errors.date}
                        />
                        <Input
                            label="Jam Mulai"
                            type="time"
                            required
                            value={rundownForm.data.time}
                            onChange={(e) => rundownForm.setData('time', e.target.value)}
                            error={rundownForm.errors.time}
                        />
                        <Input
                            label="Jam Selesai"
                            type="time"
                            value={rundownForm.data.end_time}
                            onChange={(e) => rundownForm.setData('end_time', e.target.value)}
                            error={rundownForm.errors.end_time}
                        />
                    </div>

                    <Checkbox
                        id="rundown-is-match-session"
                        checked={rundownForm.data.is_match_session}
                        onChange={(event) => rundownForm.setData('is_match_session', event.target.checked)}
                        label="Gunakan sebagai sesi pertandingan"
                        description="Generator hanya menempatkan partai pada rundown yang dicentang dan berada dalam rentang jam mulai–selesai."
                        className="rounded-xl border border-[#e5ddd3] bg-[#faf8f4] p-3.5 dark:border-slate-800 dark:bg-slate-950/40"
                    />

                    <Input
                        label="Nama Kegiatan / Sesi"
                        required
                        value={rundownForm.data.name}
                        onChange={(e) => rundownForm.setData('name', e.target.value)}
                        error={rundownForm.errors.name}
                        placeholder="e.g. Babak Penyisihan Randori Remaja A"
                    />

                    <Combobox
                        label="Kategori / Tipe Sesi"
                        required
                        value={rundownForm.data.type}
                        onChange={(val) => rundownForm.setData('type', val)}
                        options={rundownTypeOptions}
                        clearable={false}
                        error={rundownForm.errors.type}
                    />

                    <Textarea
                        label="Deskripsi / Catatan Petunjuk"
                        rows={3}
                        value={rundownForm.data.description}
                        onChange={(e) => rundownForm.setData('description', e.target.value)}
                        error={rundownForm.errors.description}
                        placeholder="e.g. Bertempat di Tatami 1 & Tatami 2"
                    />

                    <Input
                        label="Nomor Urut Sesi"
                        type="number"
                        min="0"
                        value={rundownForm.data.order}
                        onChange={(e) => rundownForm.setData('order', e.target.value)}
                        error={rundownForm.errors.order}
                    />
                </form>
            </Modal>

            {/* DELETE RUNDOWN CONFIRMATION */}
            <Modal
                isOpen={!!deletingRundown}
                onClose={() => setDeletingRundown(null)}
                title="Konfirmasi Hapus Sesi Rundown"
                description={`Apakah Anda yakin ingin menghapus '${deletingRundown?.name}' dari susunan acara?`}
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button variant="outline" onClick={() => setDeletingRundown(null)}>
                            Batal
                        </Button>
                        <Button variant="danger" onClick={confirmDeleteRundown}>
                            Hapus Sesi
                        </Button>
                    </div>
                }
            />
        </div>
    );
}
