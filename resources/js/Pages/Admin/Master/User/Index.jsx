import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import MasterDataTransfer from '@/Components/Admin/MasterDataTransfer';
import { Modal, Pagination, Input, Combobox, Button } from '@/Components/UI';

export default function UserIndex({
    users = { data: [], links: [], from: 1, to: 1, total: 0, current_page: 1, last_page: 1 },
    stats = { total_users: 0, admin_users: 0, contingent_users: 0, referee_users: 0 },
    rolesList = [],
    filters = { search: '', role: 'all' },
    auth = {},
}) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedRole, setSelectedRole] = useState(filters.role || 'all');

    // Modals state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [deletingUser, setDeletingUser] = useState(null);

    // Form for Create & Edit
    const {
        data,
        setData,
        post,
        put,
        processing,
        errors,
        reset,
        clearErrors,
    } = useForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: rolesList[0]?.name || 'kontingen',
    });

    const handleFilter = (newFilters = {}) => {
        const queryParams = {
            search: newFilters.search !== undefined ? newFilters.search : searchTerm,
            role: newFilters.role !== undefined ? newFilters.role : selectedRole,
        };

        router.get('/admin/master/user', queryParams, { preserveState: true, replace: true });
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        handleFilter({ search: searchTerm });
    };

    const handlePageChange = (page) => {
        router.get(
            '/admin/master/user',
            {
                search: searchTerm,
                role: selectedRole,
                page,
            },
            { preserveState: true, replace: true }
        );
    };

    const openCreateModal = () => {
        reset();
        clearErrors();
        setEditingUser(null);
        if (rolesList.length > 0) {
            setData('role', rolesList[0].name);
        }
        setIsCreateModalOpen(true);
    };

    const openEditModal = (user) => {
        clearErrors();
        setEditingUser(user);
        setData({
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            password: '',
            role: user.primary_role || 'kontingen',
        });
        setIsCreateModalOpen(true);
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (editingUser) {
            put(`/admin/master/user/${editingUser.id}`, {
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                    setEditingUser(null);
                    reset();
                },
            });
        } else {
            post('/admin/master/user', {
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                    reset();
                },
            });
        }
    };

    const confirmDelete = (e) => {
        e.preventDefault();
        if (!deletingUser) return;
        router.delete(`/admin/master/user/${deletingUser.id}`, {
            onSuccess: () => setDeletingUser(null),
        });
    };

    const getRoleBadge = (roleName) => {
        switch (roleName?.toLowerCase()) {
            case 'super admin':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-[#c0392b] text-white shadow-2xs whitespace-nowrap">
                        <i className="fa-solid fa-shield-halved text-[9px]"></i>
                        Super Admin
                    </span>
                );
            case 'admin':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#0f0d0b] text-[#f0c060] border border-white/10 whitespace-nowrap">
                        <i className="fa-solid fa-user-tie text-[9px]"></i>
                        Admin
                    </span>
                );
            case 'penanggung jawab event':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 whitespace-nowrap">
                        <i className="fa-solid fa-user-shield text-[9px]"></i>
                        Penanggung Jawab Event
                    </span>
                );
            case 'wasit':
            case 'arbitrase':
            case 'perwasitan':
            case 'panitera':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                        <i className="fa-solid fa-gavel text-[9px]"></i>
                        {roleName}
                    </span>
                );
            case 'kontingen':
            case 'contingent':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                        <i className="fa-solid fa-flag text-[9px]"></i>
                        Kontingen
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-medium bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                        {roleName || 'Pengguna'}
                    </span>
                );
        }
    };

    return (
        <AdminLayout auth={auth} title="Master Pengguna & Role">
            <Head title="Pengguna & Hak Akses — Smart Perkemi" />

            {/* ════ HEADER SECTION ════ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    {/* <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <i className="fa-solid fa-users text-[9px] text-[#c0392b]" />
                            Pengguna & Otorisasi
                        </span>
                    </div> */}
                    <h1 className="font-sans text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Manajemen Pengguna & Hak Akses
                    </h1>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Kelola akun administrator, manajer kontingen, wasit, dan hak akses otorisasi sistem Smart Perkemi.
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                    <MasterDataTransfer type="user" label="Pengguna & Role" supportsLogin requiresLogin />
                    <Button variant="unstyled" size="none"
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-transparent bg-[#c0392b] hover:bg-[#a93226] text-white font-semibold text-xs md:text-sm shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
                    >
                        <i className="fa-solid fa-user-plus text-xs" />
                        <span>Tambah Pengguna Baru</span>
                    </Button>
                </div>
            </div>

            {/* ════ 4 POLISHED STAT CARDS ════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                {/* 1. Total Pengguna */}
                <div className="p-4 sm:p-5 rounded-2xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Total Pengguna
                        </span>
                        <div className="size-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-[#c0392b] flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/30">
                            <i className="fa-solid fa-users text-xs" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                            {stats.total_users}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] border border-slate-200 dark:border-slate-700">
                                <i className="fa-solid fa-database text-[9px] text-[#c0392b]" />
                                Akun terdaftar
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Administrator */}
                <div className="p-4 sm:p-5 rounded-2xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Administrator
                        </span>
                        <div className="size-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-[#b8860b] flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-900/30">
                            <i className="fa-solid fa-shield-halved text-xs" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                            {stats.admin_users}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] border border-slate-200 dark:border-slate-700">
                                <i className="fa-solid fa-key text-[9px]" />
                                Akses penuh sistem
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. Akun Kontingen */}
                <div className="p-4 sm:p-5 rounded-2xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Akun Kontingen
                        </span>
                        <div className="size-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/30">
                            <i className="fa-solid fa-flag text-xs" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                            {stats.contingent_users}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium text-[11px] border border-emerald-200 dark:border-emerald-800">
                                <i className="fa-solid fa-user-check text-[9px]" />
                                Manajer dojo/cabang
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Wasit & Juri */}
                <div className="p-4 sm:p-5 rounded-2xl border border-[#ede9e1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Wasit & Perangkat
                        </span>
                        <div className="size-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/30">
                            <i className="fa-solid fa-gavel text-xs" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                            {stats.referee_users}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium text-[11px] border border-blue-200 dark:border-blue-800">
                                <i className="fa-solid fa-whistle text-[9px]" />
                                Petugas tatami
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ════ FILTER & SEARCH BAR ════ */}
            <div className="p-3.5 mb-6 rounded-2xl bg-white border border-[#ede9e1] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-[#8c827a] whitespace-nowrap">
                        Role Akses:
                    </label>
                    <div className="w-48 sm:w-56">
                        <Combobox
                            size="sm"
                            placeholder="Semua Role Akses"
                            searchPlaceholder="Cari role..."
                            options={[
                                { value: 'all', label: 'Semua Role Akses' },
                                ...rolesList.map((r) => ({ value: r.name, label: r.name })),
                            ]}
                            value={selectedRole}
                            onChange={(val) => {
                                const nextVal = val || 'all';
                                setSelectedRole(nextVal);
                                handleFilter({ role: nextVal });
                            }}
                        />
                    </div>
                </div>

                <form onSubmit={handleSearchSubmit} className="w-full sm:w-72">
                    <Input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Cari nama, email, nomor HP..."
                        iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                        clearable
                        onClear={() => {
                            setSearchTerm('');
                            handleFilter({ search: '' });
                        }}
                        size="sm"
                    />
                </form>
            </div>

            {/* ════ TABLE VIEW (ELEVATED & TIDY) ════ */}
            {users.data.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-[#ede9e1] bg-white shadow-xs">
                    <div className="w-14 h-14 rounded-2xl bg-[#c0392b]/10 text-[#c0392b] flex items-center justify-center mx-auto mb-3 text-xl">
                        <i className="fa-solid fa-user-gear"></i>
                    </div>
                    <h3 className="font-sans text-sm font-bold text-slate-900 dark:text-white">
                        Tidak Ada Data Pengguna Ditemukan
                    </h3>
                    <p className="text-xs text-[#706860] mt-1 max-w-sm mx-auto">
                        Belum ada pengguna yang sesuai dengan kriteria pencarian ini.
                    </p>
                </div>
            ) : (
                <div className="mb-6 rounded-2xl border border-[#ede9e1] bg-white shadow-xs overflow-hidden">
                    <TableContainer ariaLabel="Tabel data">
                        <table className="responsive-data-table whitespace-nowrap w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#faf8f5] border-b border-[#ede9e1] text-[#8c827a] uppercase text-[10px] font-semibold tracking-wider whitespace-nowrap">
                                    <th className="py-3 px-4">Nama Pengguna</th>
                                    <th className="py-3 px-3">Alamat Email</th>
                                    <th className="py-3 px-3">Nomor HP Login</th>
                                    <th className="py-3 px-3">Role Otorisasi</th>
                                    <th className="py-3 px-3">Entitas Terhubung</th>
                                    <th className="py-3 px-3">Tanggal Terdaftar</th>
                                    <th className="py-3 px-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ede9e1]">
                                {users.data.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="transition-colors hover:bg-[#fcfaf7]"
                                    >
                                        {/* Column 1: Nama Pengguna & Avatar */}
                                        <td className="py-3.5 px-4 min-w-[200px]">
                                            <div className="flex items-center gap-2.5">
                                                <div className="size-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#b92f24] font-bold text-xs flex items-center justify-center shrink-0">
                                                    {(user.name || 'U').substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="font-semibold text-xs md:text-[13px] text-[#0f0d0b] leading-snug">
                                                    {user.name}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Column 2: Email */}
                                        <td className="py-3.5 px-3 whitespace-nowrap font-mono text-xs text-[#706860]">
                                            {user.email}
                                        </td>

                                        <td className="py-3.5 px-3 whitespace-nowrap font-mono text-xs text-[#706860]">
                                            {user.phone || '—'}
                                        </td>

                                        {/* Column 3: Role Otorisasi */}
                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                            {getRoleBadge(user.primary_role)}
                                        </td>

                                        {/* Column 4: Entitas Terhubung */}
                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                            {user.contingent ? (
                                                <div className="flex items-center gap-1.5 text-xs text-[#0f0d0b] font-medium">
                                                    <i className="fa-solid fa-flag text-[10px] text-[#d4a843]"></i>
                                                    <span>{user.contingent.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[#8c827a] text-[11px]">—</span>
                                            )}
                                        </td>

                                        {/* Column 5: Tanggal Terdaftar */}
                                        <td className="py-3.5 px-3 whitespace-nowrap text-xs text-[#706860]">
                                            {user.created_at}
                                        </td>

                                        {/* Column 6: Aksi */}
                                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center justify-end gap-1.5">
                                                <Button variant="unstyled" size="none"
                                                    type="button"
                                                    onClick={() => openEditModal(user)}
                                                    className="w-7 h-7 rounded-lg border border-[#ede9e1] bg-white hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 text-[#706860] flex items-center justify-center transition-all cursor-pointer"
                                                    title="Edit Data & Role Pengguna"
                                                >
                                                    <i className="fa-solid fa-pen text-xs"></i>
                                                </Button>
                                                {auth.user?.id !== user.id && (
                                                    <Button variant="unstyled" size="none"
                                                        type="button"
                                                        onClick={() => setDeletingUser(user)}
                                                        className="w-7 h-7 rounded-lg border border-[#ede9e1] bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-[#706860] flex items-center justify-center transition-all cursor-pointer"
                                                        title="Hapus Pengguna"
                                                    >
                                                        <i className="fa-solid fa-trash-can text-xs"></i>
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table></TableContainer>

                    {/* Pagination Controls */}
                    {users.total > 0 && (
                        <Pagination
                            pagination={users}
                            label="pengguna"
                            onPageChange={handlePageChange}
                        />
                    )}
                </div>
            )}

            {/* ════ MODAL CREATE / EDIT USER ════ */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title={editingUser ? 'Perbarui Pengguna & Role' : 'Tambah Pengguna Baru'}
                subtitle="Kelola kredensial akun dan hak akses di sistem Smart Perkemi"
                size="md"
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCreateModalOpen(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            loading={processing}
                            onClick={handleFormSubmit}
                        >
                            {editingUser ? 'Simpan Perubahan' : 'Tambah Pengguna'}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <Input
                        label="Nama Lengkap"
                        required
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="Contoh: Sensei Bambang Sutrisno"
                        error={errors.name}
                    />

                    <Input
                        label="Alamat Email"
                        required
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="nama@perkemi.org"
                        error={errors.email}
                    />

                    <Input
                        label="Nomor HP Login (Opsional)"
                        value={data.phone}
                        onChange={(e) => setData('phone', e.target.value)}
                        placeholder="Contoh: 081234567890"
                        error={errors.phone}
                        autoComplete="tel"
                    />

                    <Input
                        label={editingUser ? 'Password Baru (Kosongkan jika tidak diubah)' : 'Password Masuk'}
                        required={!editingUser}
                        type="password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        placeholder={editingUser ? '••••••••' : 'Minimal 8 karakter'}
                        error={errors.password}
                    />

                    <Combobox
                        label="Role / Hak Akses Otorisasi"
                        required
                        options={rolesList.map((r) => ({ value: r.name, label: r.name }))}
                        value={data.role}
                        onChange={(val) => setData('role', val)}
                        clearable={false}
                        searchPlaceholder="Pilih role akses..."
                        error={errors.role}
                    />
                </form>
            </Modal>

            {/* ════ MODAL DELETE CONFIRMATION ════ */}
            <Modal
                isOpen={!!deletingUser}
                onClose={() => setDeletingUser(null)}
                title="Hapus Pengguna"
                size="sm"
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingUser(null)}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            iconLeft={<i className="fa-solid fa-trash-can"></i>}
                            onClick={confirmDelete}
                        >
                            Ya, Hapus
                        </Button>
                    </div>
                }
            >
                <div className="text-xs text-[#706860] space-y-2">
                    <p>
                        Apakah Anda yakin ingin menghapus akun <strong className="text-[#0f0d0b]">{deletingUser?.name}</strong>?
                    </p>
                    <p className="text-[11px] text-[#8c827a] bg-red-500/10 text-red-700 p-2.5 rounded-lg border border-red-500/20">
                        Pengguna tidak akan dapat masuk ke sistem setelah dihapus.
                    </p>
                </div>
            </Modal>
        </AdminLayout>
    );
}
