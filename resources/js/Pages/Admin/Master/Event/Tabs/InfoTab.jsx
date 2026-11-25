import React, { useEffect, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Button, Input, Textarea, Combobox, Checkbox, Modal } from '@/Components/UI';

export default function InfoTab({
    event,
    allEvents = [],
    users = [],
    eventUsers = [],
}) {
    const [copiedUrlType, setCopiedUrlType] = useState(null);
    const [generalSaveFeedback, setGeneralSaveFeedback] = useState(null);
    const [accessSaveFeedback, setAccessSaveFeedback] = useState(null);
    const [selectedEventUserId, setSelectedEventUserId] = useState('');
    const [selectedEventUserRole, setSelectedEventUserRole] = useState('responsible');

    const [localUsers, setLocalUsers] = useState(users);
    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
    const [createUserData, setCreateUserData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'Viewer',
        autoAssignToEvent: true,
    });
    const [createUserErrors, setCreateUserErrors] = useState({});
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        setLocalUsers(users);
    }, [users]);

    const generateRandomPassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
        let pass = '';
        for (let i = 0; i < 10; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return pass;
    };

    const openCreateUserModal = (initialName = '') => {
        setCreateUserData({
            name: typeof initialName === 'string' ? initialName : '',
            email: '',
            phone: '',
            password: 'User@Perkemi2026',
            role: selectedEventUserRole === 'viewer' ? 'Viewer' : 'kontingen',
            autoAssignToEvent: true,
        });
        setCreateUserErrors({});
        setShowPassword(false);
        setIsCreateUserModalOpen(true);
    };

    const submitCreateUser = async (e) => {
        if (e) e.preventDefault();
        setCreateUserErrors({});
        setIsCreatingUser(true);

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
            || decodeURIComponent(document.cookie.split('; ').find((row) => row.startsWith('XSRF-TOKEN='))?.split('=')[1] || '');

        try {
            const response = await fetch(`/admin/master/event/${event.id}/users/quick-create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    name: createUserData.name,
                    email: createUserData.email,
                    phone: createUserData.phone,
                    password: createUserData.password,
                    role: createUserData.role,
                    access_role: createUserData.autoAssignToEvent ? selectedEventUserRole : null,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                if (response.status === 422 && result.errors) {
                    setCreateUserErrors(result.errors);
                } else {
                    setCreateUserErrors({ general: result.message || 'Gagal membuat pengguna baru.' });
                }
                setIsCreatingUser(false);
                return;
            }

            const newUser = result.user;

            // Add to local users list for combobox
            setLocalUsers((prev) => [newUser, ...prev.filter((u) => u.id !== newUser.id)]);

            // If auto-assign was chosen, add directly to accessForm.data.users
            if (createUserData.autoAssignToEvent) {
                accessForm.setData('users', [
                    ...accessForm.data.users.filter((u) => u.id !== newUser.id),
                    {
                        id: newUser.id,
                        name: newUser.name,
                        email: newUser.email,
                        access_role: selectedEventUserRole,
                    },
                ]);
                setSelectedEventUserId('');
            } else {
                setSelectedEventUserId(newUser.id);
            }

            setIsCreateUserModalOpen(false);
            setAccessSaveFeedback({
                type: 'success',
                message: `Pengguna baru "${newUser.name}" berhasil dibuat${createUserData.autoAssignToEvent ? ` dan ditugaskan sebagai ${eventAccessRoleOptions.find((o) => o.value === selectedEventUserRole)?.label || selectedEventUserRole}` : ''}. Klik "Simpan Penanggung Jawab & Akses" untuk mempermanenkan seluruh susunan.`,
            });
        } catch (err) {
            setCreateUserErrors({ general: 'Terjadi kesalahan jaringan saat membuat pengguna.' });
        } finally {
            setIsCreatingUser(false);
        }
    };

    const handleCopyUrl = (url, type) => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(url);
            setCopiedUrlType(type);
            setTimeout(() => setCopiedUrlType(null), 2000);
        }
    };

    const coverForm = useForm({ cover_image: null });

    const generalForm = useForm({
        name: event.name || '',
        edition: event.edition || '',
        organizer: event.organizer || '',
        venue: event.venue || '',
        city: event.city || '',
        province: event.province || '',
        description: event.description || '',
        contact_person: event.contact_person || '',
        contact_phone: event.contact_phone || '',
        slug: event.slug || '',
        tenant_subdomain: event.tenant_subdomain || '',
        max_match_categories_per_athlete: event.max_match_categories_per_athlete || 1,
        allow_cross_age_group_embu: Boolean(event.allow_cross_age_group_embu),
        status: event.status || 'open_registration',
        is_active: event.is_active || false,
    });

    const accessForm = useForm({ users: eventUsers });

    const statusOptions = [
        { value: 'draft', label: 'Draft (Konsep)' },
        { value: 'open_registration', label: 'Pendaftaran Dibuka' },
        { value: 'ongoing', label: 'Sedang Berlangsung' },
        { value: 'completed', label: 'Selesai' },
        { value: 'closed', label: 'Ditutup' },
    ];

    const userOptions = localUsers.map((user) => ({
        value: user.id,
        label: user.name,
        sublabel: `${user.email}${user.roles?.length ? ` · ${user.roles.map((r) => (typeof r === 'string' ? r : r.name)).filter(Boolean).join(', ')}` : ''}`,
    }));

    const eventAccessRoleOptions = [
        { value: 'responsible', label: 'Penanggung Jawab Event' },
        { value: 'admin', label: 'Admin Event' },
        { value: 'staff', label: 'Staf Event' },
        { value: 'viewer', label: 'Viewer (Hanya Melihat)' },
    ];

    const submitCoverImage = (e) => {
        e.preventDefault();
        coverForm.post(`/admin/master/event/${event.id}/cover`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => coverForm.reset(),
        });
    };

    const removeCoverImage = () => {
        router.delete(`/admin/master/event/${event.id}/cover`, { preserveScroll: true });
    };

    const submitGeneral = (e) => {
        e.preventDefault();
        setGeneralSaveFeedback(null);
        generalForm.put(`/admin/master/event/${event.id}/general`, {
            preserveScroll: true,
            onSuccess: () => setGeneralSaveFeedback({ type: 'success', message: 'Informasi event berhasil disimpan.' }),
            onError: () => setGeneralSaveFeedback({ type: 'error', message: 'Informasi event belum tersimpan. Periksa kolom yang ditandai di bawah.' }),
        });
    };

    const submitEventUsers = (e) => {
        e.preventDefault();
        setAccessSaveFeedback(null);
        accessForm.put(`/admin/master/event/${event.id}/users`, {
            preserveScroll: true,
            onSuccess: () => setAccessSaveFeedback({ type: 'success', message: 'Penanggung jawab dan akses event berhasil disimpan.' }),
            onError: () => setAccessSaveFeedback({ type: 'error', message: 'Akses pengguna belum tersimpan. Periksa pilihan pengguna dan hak akses.' }),
        });
    };

    const addEventUser = () => {
        if (!selectedEventUserId || accessForm.data.users.some((user) => user.id === selectedEventUserId)) return;
        const user = (localUsers || []).find((item) => item.id === selectedEventUserId) || (users || []).find((item) => item.id === selectedEventUserId);
        if (!user) return;
        accessForm.setData('users', [...accessForm.data.users, { id: user.id, name: user.name, email: user.email, access_role: selectedEventUserRole }]);
        setSelectedEventUserId('');
        setSelectedEventUserRole('responsible');
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#ede9e1] dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Cover Image Section */}
            <div className="grid gap-5 border-b border-[#ede9e1] p-5 md:grid-cols-[240px_1fr] md:p-6 dark:border-slate-800">
                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[#ded8ce] bg-[#17120f] dark:border-slate-800">
                    {event.cover_image_url ? (
                        <img src={event.cover_image_url} alt={`Gambar utama ${event.name}`} className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 px-5 text-center">
                            <i className="fa-solid fa-image text-3xl text-slate-400 dark:text-slate-500 mb-2" />
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Belum Ada Banner</span>
                            <span className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Gunakan format JPG, PNG, atau WebP</span>
                        </div>
                    )}
                </div>
                <form onSubmit={submitCoverImage} className="flex flex-col justify-center">
                    <h3 className="font-sans text-base font-bold text-slate-900 dark:text-white">Gambar Utama Event</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#706860] dark:text-slate-400">
                        Opsional. Gambar digunakan pada landing event dan beranda bila event dipilih sebagai landing utama. Maksimal 5 MB.
                    </p>
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => coverForm.setData('cover_image', e.target.files?.[0] || null)}
                        className="mt-4 block w-full rounded-xl border border-[#ded8ce] bg-[#faf8f5] px-3 py-2 text-xs text-[#504840] file:mr-3 file:rounded-lg file:border-0 file:bg-[#17120f] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#f0c060] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                    />
                    {coverForm.errors.cover_image && <p className="mt-1.5 text-xs font-medium text-rose-600">{coverForm.errors.cover_image}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                            variant="unstyled"
                            size="none"
                            type="submit"
                            disabled={!coverForm.data.cover_image || coverForm.processing}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#c0392b] px-4 py-2 text-xs font-semibold text-white hover:bg-[#a93226] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <i className="fa-solid fa-cloud-arrow-up"></i>
                            {coverForm.processing ? 'Mengunggah...' : 'Unggah Gambar'}
                        </Button>
                        {event.cover_image_url && (
                            <Button
                                variant="unstyled"
                                size="none"
                                type="button"
                                onClick={removeCoverImage}
                                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900/50 dark:bg-slate-800 dark:text-rose-400"
                            >
                                <i className="fa-solid fa-trash-can"></i>
                                Hapus Gambar
                            </Button>
                        )}
                    </div>
                </form>
            </div>

            {/* General Info Form */}
            <form onSubmit={submitGeneral}>
                <div className="p-5 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#ede9e1] dark:border-slate-800">
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="font-sans text-base md:text-lg font-bold text-[#0f0d0b] dark:text-white tracking-tight">
                                Informasi Umum Kejuaraan
                            </h3>
                        </div>
                        <p className="text-xs text-[#b5afa6] dark:text-slate-400 mt-1">
                            Perbarui nama acara, edisi, lokasi venue, penyelenggara, dan kontak narahubung
                        </p>
                        {event.updated_at_formatted && (
                            <p className="mt-1 text-xs text-[#706860] dark:text-slate-400">
                                Terakhir tersimpan: {event.updated_at_formatted} WIB
                            </p>
                        )}
                    </div>
                    <Button
                        variant="unstyled"
                        size="none"
                        type="submit"
                        disabled={generalForm.processing}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#c0392b] to-[#96281b] hover:from-[#a93226] hover:to-[#7b1f14] shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
                    >
                        <i className="fa-solid fa-check text-xs"></i>
                        <span>{generalForm.processing ? 'Menyimpan...' : 'Simpan Informasi Event'}</span>
                    </Button>
                </div>

                {generalSaveFeedback && (
                    <div
                        role={generalSaveFeedback.type === 'error' ? 'alert' : 'status'}
                        className={`mx-5 mt-5 rounded-xl border px-4 py-3 text-sm font-medium md:mx-6 ${
                            generalSaveFeedback.type === 'success'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                                : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
                        }`}
                    >
                        {generalSaveFeedback.message}
                    </div>
                )}

                <div className="p-6 md:p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Input
                            label="Nama Event / Kejuaraan"
                            required
                            value={generalForm.data.name}
                            onChange={(e) => generalForm.setData('name', e.target.value)}
                            error={generalForm.errors.name}
                            placeholder="e.g. Kejurda Shorinji Kempo Jawa Timur"
                        />

                        <Input
                            label="Edisi Kejuaraan"
                            value={generalForm.data.edition}
                            onChange={(e) => generalForm.setData('edition', e.target.value)}
                            error={generalForm.errors.edition}
                            placeholder="e.g. Edisi Ke-XVIII 2026"
                        />

                        <Input
                            label="Maks. Nomor Pertandingan per Atlet"
                            type="number"
                            min="1"
                            max="20"
                            required
                            value={generalForm.data.max_match_categories_per_athlete}
                            onChange={(e) => generalForm.setData('max_match_categories_per_athlete', e.target.value)}
                            error={generalForm.errors.max_match_categories_per_athlete}
                            placeholder="1"
                        />

                        <div className="flex items-center pt-6">
                            <Checkbox
                                id="allow_cross_age_group_embu"
                                checked={generalForm.data.allow_cross_age_group_embu}
                                onChange={(event) => generalForm.setData('allow_cross_age_group_embu', event.target.checked)}
                                label="Bolehkan Embu Lintas Kelompok Umur"
                                description="Bila dicentang, atlet dapat didaftarkan pada nomor Embu dari kelompok umur yang lebih tinggi."
                                className="rounded-xl border border-[#ede9e1] bg-[#fbf9f5] p-3.5 dark:border-slate-800 dark:bg-slate-950/40"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <Input
                                label="Slug Event (Alamat Web)"
                                required
                                value={generalForm.data.slug}
                                onChange={(e) => generalForm.setData('slug', e.target.value)}
                                error={generalForm.errors.slug}
                                placeholder="e.g. kejurda-jatim-2026"
                            />

                            <div className="mt-2.5 rounded-xl border border-dashed border-[#d4a843]/60 bg-[#fffdfa] p-4 text-xs dark:border-[#d4a843]/40 dark:bg-slate-950">
                                <div className="flex items-center gap-2 font-bold text-[#141210] dark:text-white mb-2">
                                    <i className="fa-solid fa-link text-[#d4a843]"></i>
                                    <span>Tautan Langsung Event (Direct Access):</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {/* Public URL */}
                                    <div className="p-3 rounded-lg bg-white dark:bg-black/20 border border-black/5 dark:border-white/5 flex flex-col justify-between gap-2">
                                        <div>
                                            <span className="text-[11px] font-bold text-[#706860] dark:text-slate-400 block">
                                                Halaman Publik & Pendaftaran
                                            </span>
                                            <span className="text-xs font-mono font-semibold text-[#c0392b] break-all block mt-0.5">
                                                {typeof window !== 'undefined' ? `${window.location.origin}/event/${generalForm.data.slug || event.slug}` : `/event/${generalForm.data.slug || event.slug}`}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 pt-1 border-t border-black/5 dark:border-white/5">
                                            <Button
                                                variant="unstyled"
                                                size="none"
                                                type="button"
                                                onClick={() => handleCopyUrl(`${window.location.origin}/event/${generalForm.data.slug || event.slug}`, 'public')}
                                                className="text-xs font-semibold text-[#706860] hover:text-[#141210] dark:text-slate-300 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                                            >
                                                <i className="fa-regular fa-copy text-[11px]"></i>
                                                <span>{copiedUrlType === 'public' ? 'Tersalin!' : 'Salin'}</span>
                                            </Button>
                                            <span className="text-gray-300">&middot;</span>
                                            <a
                                                href={`/event/${generalForm.data.slug || event.slug}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs font-semibold text-[#c0392b] hover:underline flex items-center gap-1"
                                            >
                                                <span>Buka Publik</span>
                                                <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                                            </a>
                                        </div>
                                    </div>

                                    {/* Admin Tenant URL */}
                                    <div className="p-3 rounded-lg bg-white dark:bg-black/20 border border-black/5 dark:border-white/5 flex flex-col justify-between gap-2">
                                        <div>
                                            <span className="text-[11px] font-bold text-[#706860] dark:text-slate-400 block">
                                                Panel Panitia / Admin Event
                                            </span>
                                            <span className="text-xs font-mono font-semibold text-[#d4a843] break-all block mt-0.5">
                                                {typeof window !== 'undefined' ? `${window.location.origin}/event/${generalForm.data.slug || event.slug}/admin` : `/event/${generalForm.data.slug || event.slug}/admin`}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 pt-1 border-t border-black/5 dark:border-white/5">
                                            <Button
                                                variant="unstyled"
                                                size="none"
                                                type="button"
                                                onClick={() => handleCopyUrl(`${window.location.origin}/event/${generalForm.data.slug || event.slug}/admin`, 'admin')}
                                                className="text-xs font-semibold text-[#706860] hover:text-[#141210] dark:text-slate-300 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                                            >
                                                <i className="fa-regular fa-copy text-[11px]"></i>
                                                <span>{copiedUrlType === 'admin' ? 'Tersalin!' : 'Salin'}</span>
                                            </Button>
                                            <span className="text-gray-300">&middot;</span>
                                            <a
                                                href={`/event/${generalForm.data.slug || event.slug}/admin`}
                                                className="text-xs font-semibold text-[#d4a843] hover:underline flex items-center gap-1"
                                            >
                                                <span>Masuk Panel</span>
                                                <i className="fa-solid fa-arrow-right text-[9px]"></i>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Combobox
                            label="Status Publikasi Event"
                            required
                            value={generalForm.data.status}
                            onChange={(val) => generalForm.setData('status', val)}
                            options={statusOptions}
                            clearable={false}
                            error={generalForm.errors.status}
                        />

                        <Input
                            label="Nama Gedung / Gelanggang (Venue)"
                            required
                            value={generalForm.data.venue}
                            onChange={(e) => generalForm.setData('venue', e.target.value)}
                            error={generalForm.errors.venue}
                            placeholder="e.g. GOR Kertajaya Surabaya"
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label="Kota Pelaksanaan"
                                required
                                value={generalForm.data.city}
                                onChange={(e) => generalForm.setData('city', e.target.value)}
                                error={generalForm.errors.city}
                                placeholder="e.g. Surabaya"
                            />
                            <Input
                                label="Provinsi"
                                value={generalForm.data.province}
                                onChange={(e) => generalForm.setData('province', e.target.value)}
                                error={generalForm.errors.province}
                                placeholder="e.g. Jawa Timur"
                            />
                        </div>

                        <Input
                            label="Narahubung (Contact Person)"
                            value={generalForm.data.contact_person}
                            onChange={(e) => generalForm.setData('contact_person', e.target.value)}
                            error={generalForm.errors.contact_person}
                            placeholder="e.g. Sensei Bambang Supriyadi"
                        />

                        <Input
                            label="Nomor WhatsApp Narahubung"
                            value={generalForm.data.contact_phone}
                            onChange={(e) => generalForm.setData('contact_phone', e.target.value)}
                            error={generalForm.errors.contact_phone}
                            placeholder="e.g. 0812-3456-7890"
                        />
                    </div>

                    <Textarea
                        label="Deskripsi & Petunjuk Teknis Acara"
                        rows={4}
                        value={generalForm.data.description}
                        onChange={(e) => generalForm.setData('description', e.target.value)}
                        error={generalForm.errors.description}
                        placeholder="Tuliskan gambaran umum kejuaraan, tata tertib, atau informasi penting lainnya..."
                    />

                    <Checkbox
                        id="is_active_toggle"
                        checked={generalForm.data.is_active}
                        onChange={(event) => generalForm.setData('is_active', event.target.checked)}
                        label="Aktifkan Event untuk Operasional"
                        description="Event aktif tersedia di menu registrasi dan pertandingan. Event aktif lain tetap berjalan secara terpisah."
                        className="rounded-xl border border-[#ede9e1] bg-[#fbf9f5] p-4 dark:border-slate-800 dark:bg-slate-950/40"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ede9e1] pt-5 dark:border-slate-800">
                        <p className="text-xs text-[#706860] dark:text-slate-400">
                            Tombol ini menyimpan seluruh kolom Informasi Umum Kejuaraan di atas.
                        </p>
                        <Button
                            variant="unstyled"
                            size="none"
                            type="submit"
                            disabled={generalForm.processing}
                            className="rounded-xl bg-[#a93226] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#8f281e] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {generalForm.processing ? 'Menyimpan...' : 'Simpan Informasi Event'}
                        </Button>
                    </div>

                    {/* Penanggung Jawab & Akses Event */}
                    <div className="rounded-2xl border border-[#ede9e1] bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-start gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400">
                                <i className="fa-solid fa-user-shield" />
                            </span>
                            <div>
                                <h4 className="text-sm font-bold text-[#141210] dark:text-white">Penanggung Jawab & Akses Event</h4>
                                <p className="mt-0.5 text-xs text-[#706860] dark:text-slate-400">
                                    Atur penanggung jawab, administrator, staf, dan pengamat (viewer) event. Pengguna dengan hak akses Viewer hanya dapat melihat rekapitulasi laporan dan dashboard event (seluruh menu operasional dan administrasi disembunyikan).
                                </p>
                            </div>
                        </div>
                        <p className="mt-3 text-xs text-[#706860] dark:text-slate-400">
                            Tambahkan seluruh penanggung jawab dan petugas event, kemudian simpan daftar akses di bawah ini.
                        </p>
                        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_230px_auto] md:items-end">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-[#141210] dark:text-white">
                                        Pengguna
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => openCreateUserModal()}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a93226] hover:text-[#8f281e] transition-colors cursor-pointer dark:text-rose-400"
                                        title="Buka form modal buat user baru langsung"
                                    >
                                        <i className="fa-solid fa-user-plus text-[10.5px]" />
                                        <span>+ User Baru</span>
                                    </button>
                                </div>
                                <Combobox
                                    value={selectedEventUserId}
                                    onChange={setSelectedEventUserId}
                                    options={userOptions.filter((user) => !accessForm.data.users.some((eventUser) => eventUser.id === user.value))}
                                    placeholder="Pilih pengguna..."
                                    searchPlaceholder="Cari pengguna atau ketik nama baru..."
                                    emptyMessage="Pengguna tidak ditemukan."
                                    onCreate={(searchVal) => openCreateUserModal(searchVal)}
                                    createLabel="Tambah User Baru"
                                />
                            </div>
                            <Combobox
                                label="Hak Akses"
                                value={selectedEventUserRole}
                                onChange={setSelectedEventUserRole}
                                options={eventAccessRoleOptions}
                                clearable={false}
                            />
                            <Button type="button" onClick={addEventUser} disabled={!selectedEventUserId}>
                                <i className="fa-solid fa-plus mr-2" />
                                Tambahkan
                            </Button>
                        </div>
                        <div className="mt-4 divide-y divide-[#ede9e1] rounded-xl border border-[#ede9e1] dark:divide-slate-800 dark:border-slate-800">
                            {accessForm.data.users.length ? (
                                accessForm.data.users.map((user) => (
                                    <div key={user.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold text-[#141210] dark:text-white">{user.name}</p>
                                                {user.access_role === 'viewer' && (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300">
                                                        <i className="fa-solid fa-eye text-[9px]" />
                                                        Viewer
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-[#706860] dark:text-slate-400">{user.email}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-56">
                                                <Combobox
                                                    value={user.access_role}
                                                    onChange={(value) =>
                                                        accessForm.setData(
                                                            'users',
                                                            accessForm.data.users.map((item) =>
                                                                item.id === user.id ? { ...item, access_role: value } : item
                                                            )
                                                        )
                                                    }
                                                    options={eventAccessRoleOptions}
                                                    clearable={false}
                                                    size="sm"
                                                />
                                            </div>
                                            <Button
                                                variant="unstyled"
                                                size="none"
                                                type="button"
                                                onClick={() =>
                                                    accessForm.setData(
                                                        'users',
                                                        accessForm.data.users.filter((item) => item.id !== user.id)
                                                    )
                                                }
                                                className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                aria-label={`Hapus akses ${user.name}`}
                                            >
                                                <i className="fa-solid fa-trash" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="p-4 text-sm text-[#706860] dark:text-slate-400">
                                    Belum ada penanggung jawab atau pengguna khusus untuk event ini.
                                </p>
                            )}
                        </div>
                        {accessForm.errors.users && <p className="mt-2 text-xs font-medium text-rose-500">{accessForm.errors.users}</p>}
                        {accessSaveFeedback && (
                            <p
                                role={accessSaveFeedback.type === 'error' ? 'alert' : 'status'}
                                className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${
                                    accessSaveFeedback.type === 'success'
                                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                        : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                                }`}
                            >
                                {accessSaveFeedback.message}
                            </p>
                        )}
                        <div className="mt-4 flex justify-end">
                            <Button type="button" onClick={submitEventUsers} loading={accessForm.processing}>
                                <i className="fa-solid fa-user-check mr-2" />
                                Simpan Penanggung Jawab & Akses
                            </Button>
                        </div>
                    </div>
                </div>
            </form>

            {/* Modal Tambah User Baru Langsung */}
            <Modal
                isOpen={isCreateUserModalOpen}
                onClose={() => !isCreatingUser && setIsCreateUserModalOpen(false)}
                title="Tambah Pengguna Baru"
                subtitle="Buat akun pengguna baru langsung tanpa meninggalkan halaman event"
                size="md"
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => setIsCreateUserModalOpen(false)}
                            disabled={isCreatingUser}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            loading={isCreatingUser}
                            onClick={submitCreateUser}
                            className="bg-[#c0392b] hover:bg-[#a93226] text-white"
                        >
                            <i className="fa-solid fa-user-check mr-1.5" />
                            Simpan & Pilih Pengguna
                        </Button>
                    </div>
                }
            >
                <form onSubmit={submitCreateUser} className="space-y-4">
                    {createUserErrors.general && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                            <i className="fa-solid fa-triangle-exclamation mr-1.5" />
                            {createUserErrors.general}
                        </div>
                    )}

                    <Input
                        label="Nama Lengkap"
                        required
                        value={createUserData.name}
                        onChange={(e) => setCreateUserData((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Contoh: Sensei Bambang Sutrisno"
                        error={createUserErrors.name?.[0] || createUserErrors.name}
                        autoFocus
                    />

                    <Input
                        label="Alamat Email (Login)"
                        required
                        type="email"
                        value={createUserData.email}
                        onChange={(e) => setCreateUserData((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="nama@smart-perkemi.id"
                        error={createUserErrors.email?.[0] || createUserErrors.email}
                    />

                    <Input
                        label="Nomor WhatsApp / HP (Opsional)"
                        value={createUserData.phone}
                        onChange={(e) => setCreateUserData((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="081234567890"
                        error={createUserErrors.phone?.[0] || createUserErrors.phone}
                    />

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-[#141210] dark:text-white">
                                Password Akun <span className="text-rose-500">*</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setCreateUserData((prev) => ({ ...prev, password: generateRandomPassword() }))}
                                className="text-[11px] font-semibold text-[#a93226] hover:underline dark:text-rose-400"
                            >
                                <i className="fa-solid fa-dice mr-1" />
                                Acak Password
                            </button>
                        </div>
                        <div className="relative">
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={createUserData.password}
                                onChange={(e) => setCreateUserData((prev) => ({ ...prev, password: e.target.value }))}
                                placeholder="Minimal 8 karakter"
                                error={createUserErrors.password?.[0] || createUserErrors.password}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                            >
                                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                            </button>
                        </div>
                        <p className="text-[10.5px] text-[#706860] dark:text-slate-400">
                            Default: <code className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">User@Perkemi2026</code> (dapat diubah sesuai kebutuhan).
                        </p>
                    </div>

                    <Combobox
                        label="Role Otorisasi Sistem (Global)"
                        required
                        value={createUserData.role}
                        onChange={(val) => setCreateUserData((prev) => ({ ...prev, role: val }))}
                        options={[
                            { value: 'Viewer', label: 'Viewer (Hanya Melihat)' },
                            { value: 'kontingen', label: 'kontingen (Official / Manajer)' },
                            { value: 'Wasit', label: 'Wasit / Juri' },
                            { value: 'Panitera', label: 'Panitera Meja' },
                            { value: 'Koordinator Lapangan', label: 'Koordinator Lapangan' },
                            { value: 'Admin', label: 'Admin Event' },
                        ]}
                        clearable={false}
                        error={createUserErrors.role?.[0] || createUserErrors.role}
                    />

                    <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                        <Checkbox
                            id="auto_assign_event"
                            checked={createUserData.autoAssignToEvent}
                            onChange={(e) => setCreateUserData((prev) => ({ ...prev, autoAssignToEvent: e.target.checked }))}
                            label={`Langsung masukkan ke susunan event sebagai "${eventAccessRoleOptions.find((o) => o.value === selectedEventUserRole)?.label || selectedEventUserRole}"`}
                            description="Pengguna baru akan langsung ditambahkan ke tabel penugasan di bawah ini tanpa perlu memilih ulang."
                        />
                    </div>
                </form>
            </Modal>
        </div>
    );
}
