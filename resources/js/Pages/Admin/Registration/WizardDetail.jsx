import SchoolFields, { schoolDefaults, schoolData } from '@/Components/UI/Forms/SchoolFields';
import SchoolVerification from './SchoolVerification';
import AlertConfirm from '@/Components/UI/Feedback/AlertConfirm';
import AdminLayout from '@/Layouts/AdminLayout';
import Button from '@/Components/UI/Elements/Button';
import Checkbox from '@/Components/UI/Forms/Checkbox';
import Combobox from '@/Components/UI/Forms/Combobox';
import Input from '@/Components/UI/Forms/Input';
import Textarea from '@/Components/UI/Forms/Textarea';
import { CategoryPanel } from './Detail';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const registrationSteps = (isPaid) => ['Data Kontingen', 'Official Pendamping', 'Atlet & Nomor', isPaid ? 'Biaya & Pembayaran' : 'Konfirmasi Gratis', 'Review'];
const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));
const dateOnly = (value) => value ? String(value).slice(0, 10) : '';
const agesAtEvent = (date, eventDate) => {
    if (!date || !eventDate) return null;
    const born = new Date(dateOnly(date) + 'T00:00:00');
    const event = new Date(dateOnly(eventDate) + 'T00:00:00');
    let years = event.getFullYear() - born.getFullYear();
    if (event.getMonth() < born.getMonth() || (event.getMonth() === born.getMonth() && event.getDate() < born.getDate())) years--;
    return years;
};

function Field({ label, name, form, required = false, type = 'text', className = '', ...props }) {
    return <Input id={name} label={label} type={type} required={required} value={form.data[name] ?? ''}
        onChange={(event) => form.setData(name, event.target.value)} error={form.errors[name]}
        containerClassName={className || 'w-full'} {...props} />;
}

function ContingentStep({ registration, next, readOnly = false }) {
    const contingent = registration.contingent;
    const form = useForm({ city: contingent.city || '', name: contingent.name || '', manager_name: contingent.manager_name || '',
        phone: contingent.phone || '', email: contingent.email || '', address: contingent.address || '' });
    const submit = (event) => { event.preventDefault(); form.patch(`/admin/pendaftaran/registrasi/${registration.id}/contingent`, { preserveScroll: true, onSuccess: next }); };
    return <form onSubmit={submit} className="space-y-5">
        <p className="rounded-xl bg-[#fcf6ed] p-4 text-sm text-[#654d33]">Event: <strong>{registration.event.name}</strong>. Profil kontingen ini dipakai untuk registrasi event tersebut.</p>
        <fieldset disabled={readOnly} className="grid gap-5 disabled:opacity-75 md:grid-cols-2">
            <Field label="Kabupaten / Kota" name="city" form={form} required disabled={readOnly} />
            <Field label="Nama Kontingen" name="name" form={form} required disabled={readOnly} />
            <Field label="Manager Kontingen" name="manager_name" form={form} required disabled={readOnly} />
            <Field label="Nomor HP / WA Manager" name="phone" form={form} required disabled={readOnly} />
            <Field label="Email" name="email" form={form} type="email" required disabled={readOnly} />
            <Textarea id="address" label="Alamat" required rows={3} value={form.data.address}
                onChange={(event) => form.setData('address', event.target.value)} error={form.errors.address}
                containerClassName="md:col-span-2" disabled={readOnly} />
        </fieldset>
        <div className="flex justify-end">{readOnly
            ? <Button type="button" onClick={next}>Lihat Official →</Button>
            : <Button type="submit" loading={form.processing}>Simpan & Lanjut ke Official →</Button>}</div>
    </form>;
}

function OfficialStep({ registration, officials, availableOfficials, next, readOnly = false }) {
    const [deletingOfficial, setDeletingOfficial] = useState(null);
    const [deleteError, setDeleteError] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [editingId, setEditingId] = useState('');
    const [copyId, setCopyId] = useState('');
    const [copyError, setCopyError] = useState('');
    const form = useForm({ name: '', role: '', phone: '', gender: 'L' });
    const base = `/admin/pendaftaran/registrasi/${registration.id}/officials`;
    const edit = (official) => { setEditingId(official.id); form.setData({ name: official.name, role: official.role, phone: official.phone || '', gender: official.gender || 'L' }); };
    const reset = () => { setEditingId(''); form.setData({ name: '', role: '', phone: '', gender: 'L' }); form.clearErrors(); };
    const deleteOfficial = () => {
        if (!deletingOfficial || deleting) return;
        setDeleting(true);
        setDeleteError('');
        router.delete(`${base}/${deletingOfficial.id}`, {
            preserveScroll: true,
            onSuccess: () => { if (editingId === deletingOfficial.id) reset(); setDeletingOfficial(null); },
            onError: (errors) => setDeleteError(Object.values(errors).flat().join(' ')),
            onFinish: () => setDeleting(false),
        });
    };
    const submit = (event) => { event.preventDefault(); form.post(editingId ? `${base}/${editingId}` : base, { preserveScroll: true, onSuccess: reset }); };
    return <div className="space-y-6">
        <p className="text-sm text-slate-600">{readOnly ? 'Official pendamping ditampilkan sebagai arsip registrasi yang telah diverifikasi.' : 'Pilih official yang sudah tercatat di bawah ini untuk mengubahnya, atau tambahkan official baru. Anda dapat mendaftarkan lebih dari satu pendamping.'}</p>
        {!readOnly && availableOfficials.length > 0 && <div className="flex flex-col gap-3 rounded-xl border border-[#e8e1d7] bg-[#fcfaf7] p-4 md:flex-row md:items-end">
            <div className="flex-1"><Combobox label="Ambil Official dari Master" value={copyId} onChange={setCopyId}
                options={availableOfficials.map((item) => ({ value: item.id, label: `${item.name} · ${item.role} · ${item.contingent?.name || 'Kontingen lain'}` }))} error={copyError} /></div>
            <Button type="button" disabled={!copyId} onClick={() => { setCopyError(''); router.post(`${base}/copy`, { official_id: copyId },
                { preserveScroll: true, onError: (errors) => setCopyError(errors.official_id || 'Official belum dapat diambil.'), onSuccess: () => setCopyId('') }); }}>Ambil Official</Button>
        </div>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{officials.map((official) => <div key={official.id} className="rounded-xl border border-[#e8e1d7] p-4">
            <p className="font-semibold text-[#17120f]">{official.name}</p><p className="mt-1 text-sm text-slate-600">{official.role} · {official.phone || 'Kontak belum diisi'}</p>
            {!readOnly && <div className="mt-3 flex gap-3 text-xs font-semibold"><Button variant="unstyled" size="none" type="button" onClick={() => edit(official)} className="text-[#a93226] hover:underline">Edit</Button>
                <Button variant="unstyled" size="none" type="button" onClick={() => { setDeleteError(''); setDeletingOfficial(official); }} className="text-rose-700 hover:underline">Hapus</Button></div>
            }
        </div>)}</div>
        {!readOnly && <form onSubmit={submit} className="rounded-xl border border-[#e8e1d7] bg-[#fcfaf7] p-4 md:p-5">
            <h3 className="mb-4 font-semibold text-[#17120f]">{editingId ? 'Ubah Official' : 'Tambah Official'}</h3>
            <div className="grid gap-4 md:grid-cols-3"><Field label="Nama Official" name="name" form={form} required />
                <Field label="Jabatan" name="role" form={form} required placeholder="Pelatih, Pendamping, Medis..." />
                <Field label="Kontak HP" name="phone" form={form} required /></div>
            <div className="mt-4 flex gap-2"><Button type="submit" loading={form.processing}>{editingId ? 'Simpan Perubahan' : '+ Tambah Official'}</Button>
                {editingId && <Button variant="unstyled" size="none" type="button" onClick={reset} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600">Batal</Button>}</div>
        </form>}
        <div className="flex justify-end"><Button type="button" onClick={next}>{readOnly ? 'Lihat Atlet' : 'Lanjut ke Atlet'} →</Button></div>
        {!readOnly && <AlertConfirm isOpen={Boolean(deletingOfficial)} title="Hapus official?" message={`${deletingOfficial?.name || 'Official'} akan dihapus dari kontingen ini.`}
            confirmText="Hapus official" isLoading={deleting} error={deleteError} onConfirm={deleteOfficial} onCancel={() => { if (!deleting) setDeletingOfficial(null); }} />
        }
    </div>;
}

const emptyAthlete = { ...schoolDefaults, school_document: null, name: '', nik: '', kenshi_number: '', gender: 'male', birth_place: '', birth_date: '', blood_type: '',
    dojo_name: '', event_age_category_id: '', joined_age_category_id: '', kyu_dan: '', bpjs_number: '', bpjs_status: '', weight: '', photo: null, category_ids: [], promoted_category_ids: [] };

function AthleteStep({ registration, athletes, categories, techniques, teamTechniques, kyus, ageCategories, next, canManage, focusedCategoryId, readOnly = false }) {
    const [editingId, setEditingId] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [joinOtherAgeGroup, setJoinOtherAgeGroup] = useState(false);
    const [selectedAthleteId, setSelectedAthleteId] = useState('');
    const formRef = useRef(null);
    const form = useForm(emptyAthlete);
    useEffect(() => { if (showForm) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [editingId, showForm]);
    const event = registration.event;
    const age = agesAtEvent(form.data.birth_date, event.start_date);
    const originalGroup = ageCategories.find((group) => group.id === form.data.event_age_category_id);
    const existingPromotedIds = athletes.find((athlete) => athlete.id === editingId)?.match_category_entries
        ?.filter((entry) => entry.age_group_promotion).map((entry) => entry.event_match_category_id) || [];
    const existingTargetGroupIds = [...new Set(existingPromotedIds.map((id) => categories.find((category) => category.id === id)?.age_category_id).filter(Boolean))];
    const mayJoinOtherAgeGroup = Boolean(event.allow_cross_age_group_embu) || existingPromotedIds.length > 0;
    const selectedRandori = categories.some((category) => category.type !== 'embu' && form.data.category_ids.includes(category.id));
    const maxCategories = Number(event.max_match_categories_per_athlete || 1);
    const isOlderEmbu = (category, group) => category.type === 'embu' && group?.max_age != null
        && category.age_category?.min_age != null && group.max_age < category.age_category.min_age;
    const otherAgeCategories = originalGroup ? categories.filter((category) => isOlderEmbu(category, originalGroup)
        && (event.allow_cross_age_group_embu || existingPromotedIds.includes(category.id))) : [];
    const targetAgeGroups = ageCategories.filter((group) => otherAgeCategories.some((category) => category.age_category_id === group.id));
    const visibleCategories = originalGroup ? categories.filter((category) => !category.age_category_id
        || category.age_category_id === originalGroup.id
        || (joinOtherAgeGroup && category.age_category_id === form.data.joined_age_category_id && otherAgeCategories.some((item) => item.id === category.id))) : [];
    const edit = (athlete) => {
        const promotedEntries = (athlete.match_category_entries || []).filter((entry) => entry.age_group_promotion);
        const savedTargetGroupIds = [...new Set(promotedEntries.map((entry) => categories.find((category) => category.id === entry.event_match_category_id)?.age_category_id).filter(Boolean))];
        const joinedGroupId = savedTargetGroupIds.length === 1 ? savedTargetGroupIds[0] : '';
        setEditingId(athlete.id);
        setJoinOtherAgeGroup(promotedEntries.length > 0);
        form.setData({ ...emptyAthlete, ...schoolData(athlete), name: athlete.name || '', nik: athlete.nik || '', kenshi_number: athlete.kenshi_number || '', gender: athlete.gender || 'male',
            birth_place: athlete.birth_place || '', birth_date: dateOnly(athlete.birth_date), blood_type: athlete.blood_type || '', dojo_name: athlete.dojo_name || '',
            event_age_category_id: athlete.event_age_category_id || '',
            joined_age_category_id: joinedGroupId,
            kyu_dan: athlete.kyu_dan || '', bpjs_number: athlete.bpjs_number || '', bpjs_status: athlete.bpjs_status || '', weight: athlete.weight || '',
            category_ids: (athlete.match_category_entries || []).map((entry) => entry.event_match_category_id),
            promoted_category_ids: promotedEntries.map((entry) => entry.event_match_category_id) });
        form.clearErrors(); setShowForm(true);
    };
    const fresh = () => { setEditingId(''); setJoinOtherAgeGroup(false); form.setData(emptyAthlete); form.clearErrors(); setShowForm(true); };
    const selectAgeGroup = (value) => {
        setJoinOtherAgeGroup(false);
        form.setData((data) => ({ ...data, event_age_category_id: value, joined_age_category_id: '',
            category_ids: data.category_ids.filter((id) => {
                const category = categories.find((item) => item.id === id);
                return category && (!category.age_category_id || category.age_category_id === value);
            }),
            promoted_category_ids: [] }));
    };
    const toggleOtherAgeGroup = (checked) => {
        setJoinOtherAgeGroup(checked);
        if (!checked) form.setData((data) => ({ ...data, joined_age_category_id: '',
            category_ids: data.category_ids.filter((id) => {
                const category = categories.find((item) => item.id === id);
                return category && (!category.age_category_id || category.age_category_id === data.event_age_category_id);
            }),
            promoted_category_ids: [] }));
    };
    const selectJoinedGroup = (value) => form.setData((data) => ({ ...data, joined_age_category_id: value,
        category_ids: data.category_ids.filter((id) => {
            const category = categories.find((item) => item.id === id);
            return category && (!category.age_category_id || category.age_category_id === data.event_age_category_id || category.age_category_id === value);
        }),
        promoted_category_ids: data.promoted_category_ids.filter((id) => categories.find((category) => category.id === id)?.age_category_id === value) }));
    const toggleCategory = (id) => {
        const chosen = form.data.category_ids.includes(id) ? form.data.category_ids.filter((item) => item !== id) : [...form.data.category_ids, id];
        const category = categories.find((item) => item.id === id);
        const joiningOtherGroup = category?.age_category_id && category.age_category_id !== originalGroup?.id;
        form.setData((data) => ({ ...data, category_ids: chosen,
            promoted_category_ids: joiningOtherGroup && chosen.includes(id)
                ? [...data.promoted_category_ids.filter((item) => item !== id), id]
                : data.promoted_category_ids.filter((item) => chosen.includes(item)) }));
    };
    const save = (event) => {
        event.preventDefault();
        form.post(`/admin/pendaftaran/registrasi/${registration.id}/athletes${editingId ? `/${editingId}` : ''}`,
            { preserveScroll: true, forceFormData: true, onError: () => requestAnimationFrame(() => formRef.current?.querySelector('[role=alert]')?.focus()), onSuccess: () => { setShowForm(false); setEditingId(''); setJoinOtherAgeGroup(false); form.setData(emptyAthlete); } });
    };
    const activeCategories = categories.filter((category) => athletes.some((athlete) => (athlete.match_category_entries || []).some((entry) => entry.event_match_category_id === category.id)));
    const orderedCategories = [...activeCategories].sort((first, second) => Number(second.id === focusedCategoryId) - Number(first.id === focusedCategoryId));
    return <div className="space-y-10">
        <section id="data-atlet" className="scroll-mt-24 space-y-6">
            <div className="rounded-2xl border border-[#eadfd5] bg-[#fcfaf7] p-4 md:p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#a93226]">Bagian 1</p>
                <h3 className="mt-1 font-cinzel text-lg font-bold text-[#17120f]">Informasi Data Atlet</h3>
                <p className="mt-1 text-sm text-slate-600">{readOnly ? 'Profil atlet dan nomor pertandingan ditampilkan sebagai arsip registrasi yang telah diverifikasi.' : 'Kelola profil atlet dan pilih nomor pertandingan yang diikuti pada formulir yang sama.'}</p>
            </div>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-[#17120f]">Atlet Kontingen ({athletes.length})</h3>
            <p className="text-sm text-slate-600">{readOnly ? 'Data atlet terkunci setelah registrasi diverifikasi.' : `Simpan profil dan pilih maksimal ${maxCategories} nomor pertandingan per atlet.`}</p></div>
            {!readOnly && <Button type="button" onClick={fresh}>+ Tambah Atlet Baru</Button>}</div>
        {!readOnly && athletes.length > 0 && <div className="flex flex-col gap-3 rounded-xl border border-[#e8e1d7] bg-[#fcfaf7] p-4 md:flex-row md:items-end">
            <div className="flex-1"><Combobox label={`Pilih Atlet ${registration.contingent.name}`} value={selectedAthleteId} onChange={setSelectedAthleteId}
                options={athletes.map((item) => ({ value: item.id, label: `${item.name} · ${item.kyu_dan || 'Tingkatan belum diisi'}` }))} /></div>
            <Button type="button" disabled={!selectedAthleteId} onClick={() => { const selected = athletes.find((item) => item.id === selectedAthleteId); if (selected) edit(selected); }}>Buka Data Atlet</Button>
        </div>}
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{athletes.map((athlete) => <Button variant="unstyled" size="none" key={athlete.id} type="button" disabled={readOnly} onClick={() => edit(athlete)}
            className={`flex items-start gap-3 rounded-xl border p-4 text-left disabled:cursor-default disabled:opacity-100 ${readOnly ? 'border-[#e8e1d7] bg-[#fcfaf7]' : `hover:border-[#bd6b5d] ${editingId === athlete.id && showForm ? 'border-[#b63729] bg-[#fff8f5]' : 'border-[#e8e1d7] bg-white'}`}`}>
            {athlete.profile_photo_path ? <img src={`/admin/pendaftaran/registrasi/${registration.id}/athletes/${athlete.id}/photo`} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                : <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f5e5dc] text-sm font-bold text-[#9f2e22]">{athlete.name.slice(0, 2).toUpperCase()}</span>}
            <span><span className="block font-semibold text-[#17120f]">{athlete.name}</span>
                <span className="mt-1 block text-xs text-slate-600">{ageCategories.find((group) => group.id === athlete.event_age_category_id)?.name || 'Kelompok usia belum dipilih'} · {athlete.kyu_dan || 'Tingkatan belum diisi'} · {(athlete.match_category_entries || []).length}/{maxCategories} nomor · {readOnly ? 'Data terkunci' : 'Edit profil / nomor'}</span></span>
        </Button>)}</div>
        {showForm && !readOnly && <form ref={formRef} onSubmit={save} className="space-y-5 rounded-2xl border border-[#d9c6b9] bg-[#fffdfb] p-4 md:p-6">
            <div className="flex justify-between gap-3"><div><h3 className="font-cinzel text-lg font-bold text-[#17120f]">{editingId ? 'Edit Data Atlet' : 'Tambah Atlet'}</h3>
                <p className="text-sm text-slate-600">{event.participant_rules?.enabled ? 'Tanggal lahir, kelas, tahun masuk, dan nomor pertandingan diperiksa sesuai persyaratan event.' : 'Kelompok usia atlet dipilih sendiri. Untuk Embu, pilihan Gabung Kelompok Usia Lain dapat digunakan jika tersedia.'}</p></div>
                <Button variant="unstyled" size="none" type="button" onClick={() => setShowForm(false)} aria-label="Tutup formulir atlet" className="self-start rounded-lg px-2 text-xl text-slate-600">×</Button></div>
            {form.hasErrors && <div role="alert" tabIndex={-1} className="rounded-lg bg-rose-50 p-4 text-sm text-rose-800">{Object.values(form.errors).join(' ')}</div>}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Nama Lengkap" name="name" form={form} required />
                <Field label="NIK" name="nik" form={form} inputMode="numeric" maxLength={16} />
                <Field label="Nomor Induk Kenshi" name="kenshi_number" form={form} />
                <Combobox label="Jenis Kelamin" value={form.data.gender} onChange={(value) => form.setData('gender', value)} options={[{ value: 'male', label: 'Putra' }, { value: 'female', label: 'Putri' }]} error={form.errors.gender} />
                <Field label="Tempat Lahir" name="birth_place" form={form} />
                <Field label="Tanggal Lahir" name="birth_date" form={form} type="date" required />
                <Combobox label="Golongan Darah (Opsional)" value={form.data.blood_type} onChange={(value) => form.setData('blood_type', value)} options={['A', 'B', 'AB', 'O']} />
                <Field label="Asal Dojo" name="dojo_name" form={form} />
                <div><Combobox label="Kelompok Usia" required value={form.data.event_age_category_id} onChange={selectAgeGroup}
                    options={ageCategories.map((group) => ({ value: group.id, label: `${group.name}${group.min_age !== null ? ` · ${group.min_age}–${group.max_age ?? '∞'} tahun` : ''}` }))}
                    placeholder="Pilih kelompok usia..." error={form.errors.event_age_category_id} />
                    <p className="mt-1 text-xs text-slate-500">{age === null ? 'Pilih kelompok usia secara manual.' : `Usia saat event: ${age} tahun.${event.participant_rules?.enabled ? ' Batas usia dan kelas mengikuti persyaratan event.' : ' Kelompok usia mengikuti pilihan Anda.'}`}</p>
                    {mayJoinOtherAgeGroup && <><Checkbox id="join-other-age-group" checked={joinOtherAgeGroup} disabled={!originalGroup || !otherAgeCategories.length}
                        onChange={(event) => toggleOtherAgeGroup(event.target.checked)} className="mt-3 rounded-xl border border-[#e8e1d7] bg-[#fcfaf7] p-3"
                        label="Gabung Kelompok Usia Lain" description={!originalGroup ? 'Pilih Kelompok Usia terlebih dahulu.' : otherAgeCategories.length
                            ? 'Pilih satu kelompok usia tujuan untuk menampilkan nomor Embu. Kelompok asal atlet tetap tersimpan.'
                            : 'Belum ada nomor Embu dari kelompok lebih tua pada event ini.'} />
                    {joinOtherAgeGroup && <div className="mt-3"><Combobox label="Kelompok Usia Tujuan" required value={form.data.joined_age_category_id} onChange={selectJoinedGroup}
                        options={targetAgeGroups.map((group) => ({ value: group.id, label: group.name }))}
                        placeholder="Pilih kelompok tujuan..." error={form.errors.joined_age_category_id} />
                        {existingTargetGroupIds.length > 1 && !form.data.joined_age_category_id && <p role="alert" className="mt-2 text-xs text-amber-800">Data lama memakai beberapa kelompok tujuan. Pilih satu; nomor dari kelompok tujuan lain akan dilepas saat disimpan.</p>}
                        {!event.allow_cross_age_group_embu && <p className="mt-1 text-xs text-amber-800">Fitur ini telah dimatikan untuk event. Nomor gabung yang sudah tersimpan dapat ditinjau atau dihapus.</p>}</div>}</>}</div>
                <Combobox label="Tingkatan (Rank)" required value={form.data.kyu_dan} onChange={(value) => form.setData('kyu_dan', value)}
                    options={kyus.map((name) => ({ value: name, label: name }))} error={form.errors.kyu_dan} />
                <Field label="Nomor BPJS" name="bpjs_number" form={form} />
                <Combobox label="Status BPJS" value={form.data.bpjs_status} onChange={(value) => form.setData('bpjs_status', value)}
                    options={[{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Tidak Aktif' }, { value: 'none', label: 'Tidak Memiliki' }]} />
                <Field label={selectedRandori ? 'Berat Badan (kg) · wajib untuk Randori' : 'Berat Badan (kg)'} name="weight" form={form} type="number" min="20" max="200" step="0.01" />
                <Input id="athlete-photo" label="Foto Profil (Opsional)" type="file" accept="image/*"
                    onChange={(event) => form.setData('photo', event.target.files?.[0] || null)} error={form.errors.photo} />
            </div>
            <SchoolFields form={form} rules={event.participant_rules} />
            {event.participant_rules?.enabled && <div className="space-y-2">
                <Input id="school_document" label={`Surat keterangan sekolah aktif / rapor (${event.participant_rules.require_school_document ? 'wajib sebelum verifikasi' : 'opsional'}; PDF, JPG, PNG; maksimal 5 MB)`} type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => form.setData('school_document', e.target.files?.[0] || null)} error={form.errors.school_document} />
                <p className="text-xs leading-6 text-slate-600 dark:text-slate-300">
                    {event.participant_rules.require_school_document
                        ? 'Unggah dokumen yang memuat identitas siswa, kelas, dan tahun masuk sebelum verifikasi.'
                        : 'Boleh dikosongkan. Admin atau penanggung jawab event tetap dapat memverifikasi data sekolah tanpa dokumen.'}
                    {' '}Jika tidak mengganti dokumen, berkas sebelumnya tetap digunakan.
                </p>
            </div>}
            <fieldset className="space-y-3 border-t border-[#e8e1d7] pt-5"><legend className="font-semibold text-[#17120f]">Nomor Pertandingan <span className="text-sm font-normal text-slate-600">({form.data.category_ids.length}/{maxCategories})</span></legend>
                {form.errors.category_ids && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{form.errors.category_ids}</p>}
                {form.errors.promoted_category_ids && <p role="alert" className="text-sm text-rose-700">{form.errors.promoted_category_ids}</p>}
                {!originalGroup && <p className="rounded-xl border border-dashed border-[#d6c8b6] bg-[#fcfaf7] p-4 text-sm text-slate-600">Pilih Kelompok Usia terlebih dahulu untuk menampilkan nomor pertandingan.</p>}
                {joinOtherAgeGroup && !form.data.joined_age_category_id && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Pilih Kelompok Usia Tujuan agar nomor Embu dari kelompok tersebut muncul.</p>}
                {originalGroup && visibleCategories.length === 0 && <p className="rounded-xl border border-dashed border-[#d6c8b6] bg-[#fcfaf7] p-4 text-sm text-slate-600">Belum ada nomor pertandingan untuk pilihan kelompok usia ini.</p>}
                {originalGroup && visibleCategories.length > 0 && <div className="grid gap-2 md:grid-cols-2">{visibleCategories.map((category) => {
                    const picked = form.data.category_ids.includes(category.id);
                    const joiningOtherGroup = category.age_category_id && category.age_category_id !== originalGroup.id;
                    const ageLabel = category.age_category ? `${category.age_category.name}${category.age_category.min_age !== null ? ` (${category.age_category.min_age}–${category.age_category.max_age ?? '∞'} tahun)` : ''}` : 'Semua usia';
                    return <div key={category.id} className={`rounded-xl border p-3 ${picked ? 'border-[#b63729] bg-[#fff7f3]' : 'border-[#e8e1d7] bg-white'}`}>
                        <Checkbox id={`match-category-${category.id}`} checked={picked} disabled={!picked && form.data.category_ids.length >= maxCategories}
                            onChange={() => toggleCategory(category.id)} label={<span><strong className="block text-sm text-[#17120f]">{category.name}</strong>
                                <span className="block text-xs font-normal text-slate-600">{category.type === 'embu' ? 'Embu' : 'Randori'} · {ageLabel}</span></span>} />
                        {joiningOtherGroup && <p className="mt-2 border-t border-[#ead7ca] pt-2 text-xs font-semibold text-[#87501b]">Gabung Kelompok Usia Lain · {originalGroup.name} → {category.age_category.name}</p>}
                    </div>;
                })}</div>}
            </fieldset>
            <div className="flex justify-end gap-2"><Button variant="unstyled" size="none" type="button" onClick={() => setShowForm(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600">Batal</Button>
                <Button type="submit" loading={form.processing}>Simpan Atlet & Nomor</Button></div>
        </form>}</section>
        <section id="nomor-pertandingan" className="scroll-mt-24 space-y-5 border-t border-[#e8e1d7] pt-8">
            <div className="rounded-2xl border border-[#eadfd5] bg-[#fcfaf7] p-4 md:p-5"><div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#a93226]">Bagian 2</p>
                <h3 className="mt-1 font-cinzel text-lg font-bold text-[#17120f]">Nomor dan Kelompok Pertandingan</h3>
                <p className="mt-1 max-w-3xl text-sm text-slate-600">{readOnly ? 'Susunan nomor pertandingan, tim Embu, dan teknik ditampilkan dalam mode baca saja.' : 'Atur atlet di setiap nomor, pindahkan anggota Embu antar tim, dan edit urutan teknik masing-masing tim.'}</p>
            </div></div>
            {orderedCategories.length ? orderedCategories.map((category) => <div key={category.id} className={category.id === focusedCategoryId ? 'rounded-2xl ring-2 ring-[#c97b4c] ring-offset-2' : ''}>
                <CategoryPanel registration={registration} category={category} athletes={athletes} teamTechniques={teamTechniques}
                    techniques={techniques} ageCategories={ageCategories} canManage={canManage && !readOnly}
                    onEditAthlete={readOnly ? undefined : edit} />
            </div>) : <div className="rounded-xl border border-dashed border-[#d6c8b6] bg-[#fcfaf7] p-6 text-sm text-slate-600">
                Belum ada nomor pertandingan yang dipilih. Pilih nomor pada formulir data atlet di atas.
            </div>}
        </section>
        <div className="flex justify-end"><Button type="button" onClick={next}>Lanjut ke {registration.event.is_paid ? 'Biaya & Pembayaran' : 'Konfirmasi Gratis'} →</Button></div>
    </div>;
}

function PaymentStep({ registration, athletes, paymentMethods, next, readOnly = false }) {
    const event = registration.event;
    const isPaid = event.is_paid !== false;
    const registeredCount = athletes.filter((athlete) => athlete.match_category_entries?.length).length;
    const base = Number(event.fee_per_contingent || 0);
    const athleteFee = registeredCount * Number(event.fee_per_athlete || 0);
    const code = Number(registration.verification_code || 0);
    const total = base + athleteFee + code;
    const form = useForm({ payment_method_id: registration.payment_method_id || '', payment_amount: total, payment_reference: registration.payment_reference || '', payment_proof: null, payment_note: '' });
    const recalculateStarted = useRef(false);
    useEffect(() => {
        if (!readOnly && isPaid && !registration.verification_code && !recalculateStarted.current) {
            recalculateStarted.current = true;
            router.post(`/admin/pendaftaran/registrasi/${registration.id}/recalculate`, {}, { preserveScroll: true });
        }
    }, [isPaid, readOnly, registration.id, registration.verification_code]);
    useEffect(() => { form.setData('payment_amount', total); }, [total]);
    const submit = (event) => { event.preventDefault(); form.post(`/admin/pendaftaran/registrasi/${registration.id}/payment`, { preserveScroll: true, forceFormData: true, onSuccess: next }); };

    if (!isPaid) {
        return <div className="space-y-5">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl text-emerald-700"><i className="fa-solid fa-gift" /></span>
                <h3 className="mt-4 font-cinzel text-xl font-bold">Event Gratis</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-700">Registrasi ini tidak memiliki biaya kontingen maupun biaya atlet. Kode unik, metode pembayaran, dan bukti transfer tidak diperlukan.</p>
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div className="rounded-xl bg-white p-4"><dt className="text-emerald-700">Total biaya</dt><dd className="mt-1 text-lg font-bold">Gratis</dd></div><div className="rounded-xl bg-white p-4"><dt className="text-emerald-700">Status pembayaran</dt><dd className="mt-1 font-bold">Tidak diperlukan</dd></div></dl>
            </div>
            <div className="flex justify-end"><Button type="button" onClick={next}>Lanjut ke Review →</Button></div>
        </div>;
    }

    return <div className="space-y-6">{registration.payment_status === 'rejected' && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        {registration.payment_note || 'Nominal pembayaran perlu diperiksa dan diajukan ulang.'}</p>}
        <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#e8e1d7] bg-[#fcfaf7] p-5"><h3 className="font-semibold text-[#17120f]">Ringkasan Biaya</h3>
            {!registration.verification_code && <p role="status" className="mt-2 text-sm text-amber-800">Kode unik dan total sedang dihitung ulang.</p>}
            <dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt>Pendaftaran kontingen</dt><dd>{money(base)}</dd></div>
                <div className="flex justify-between"><dt>{registeredCount} atlet × {money(event.fee_per_athlete)}</dt><dd>{money(athleteFee)}</dd></div>
                <div className="flex justify-between"><dt>Kode unik verifikasi</dt><dd>{money(code)}</dd></div>
                <div className="flex justify-between border-t border-[#ded5c8] pt-3 text-lg font-bold text-[#17120f]"><dt>Total</dt><dd>{money(total)}</dd></div></dl>
            {!readOnly && <Button variant="unstyled" size="none" type="button" onClick={() => router.post(`/admin/pendaftaran/registrasi/${registration.id}/recalculate`, {}, { preserveScroll: true })}
                className="mt-4 text-xs font-semibold text-[#a93226] hover:underline">Perbarui perhitungan biaya</Button>}
        </div>
        {readOnly ? <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
            <div className="flex items-start gap-3"><span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700"><i className="fa-solid fa-lock" /></span>
                <div><h3 className="font-semibold">Pembayaran terkunci</h3><p className="mt-1 text-sm leading-6 text-emerald-800">Data pembayaran mengikuti registrasi yang telah diverifikasi.</p></div></div>
            <dl className="space-y-2 rounded-xl bg-white p-4 text-sm"><div className="flex justify-between gap-3"><dt>Metode</dt><dd className="text-right font-semibold">{paymentMethods.find((method) => method.id === registration.payment_method_id)?.name || 'Belum dipilih'}</dd></div>
                <div className="flex justify-between gap-3"><dt>Nominal dibayar</dt><dd className="font-semibold">{money(registration.payment_amount)}</dd></div>
                <div className="flex justify-between gap-3"><dt>Referensi</dt><dd className="text-right font-semibold">{registration.payment_reference || 'Tidak dicantumkan'}</dd></div></dl>
            <Button type="button" onClick={next}>Lihat Review →</Button>
        </div> : <form onSubmit={submit} className="space-y-4 rounded-xl border border-[#e8e1d7] p-5"><h3 className="font-semibold text-[#17120f]">Pembayaran</h3>
            <Combobox label="Metode Pembayaran" required value={form.data.payment_method_id} onChange={(value) => form.setData('payment_method_id', value)}
                options={paymentMethods.map((method) => ({ value: method.id, label: `${method.name}${method.account_number ? ` · ${method.account_number}` : ''}` }))}
                error={form.errors.payment_method_id} />
            {paymentMethods.length === 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Belum ada metode pembayaran aktif untuk event ini.</p>}
            <Field label="Nominal Dibayar" name="payment_amount" form={form} type="number" min="0" required />
            <Field label="Referensi / Nomor Transfer (Opsional)" name="payment_reference" form={form} />
            <Input id="payment-proof" label="Upload Bukti (Opsional)" type="file" accept=".jpg,.jpeg,.png,.pdf"
                onChange={(event) => form.setData('payment_proof', event.target.files?.[0] || null)} error={form.errors.payment_proof} />
            <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!registration.verification_code || !form.data.payment_method_id || !paymentMethods.length} loading={form.processing}>Simpan Pembayaran & Review →</Button>
                <Button variant="unstyled" size="none" type="button" onClick={next} className="rounded-xl px-4 py-2 text-sm font-semibold text-[#8a631c] hover:underline">Lewati dulu</Button></div>
        </form>}</div></div>;
}

function ReviewCategoryCard({ category, members, teamTechniques, ageCategories, onEdit }) {
    const isEmbu = category.type === 'embu';
    const teams = [...new Set(members.map(({ entry }) => Number(entry.team_number || 1)))].sort((first, second) => first - second);
    const ageName = (athlete) => ageCategories.find((group) => group.id === athlete.event_age_category_id)?.name || 'Kelompok belum dipilih';
    return <article className="overflow-hidden rounded-2xl border border-[#e8e1d7] bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#eee8df] bg-[#fcfaf7] px-4 py-4 md:px-5">
            <div className="flex min-w-0 items-start gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${isEmbu ? 'bg-[#b63729] text-white' : 'bg-[#f3e5d0] text-[#775016]'}`}>{isEmbu ? 'EM' : 'RA'}</span>
                <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-[#8a631c]">{isEmbu ? 'Embu' : 'Randori'} · {members.length} atlet</p>
                    <h4 className="mt-1 text-base font-bold leading-snug text-[#17120f]">{category.name}</h4></div>
            </div>
            {onEdit && <Button variant="unstyled" size="none" type="button" onClick={() => onEdit(category.id)} className="rounded-xl border border-[#d9c6b9] bg-white px-3.5 py-2 text-xs font-bold text-[#9f2e22] hover:border-[#b63729] hover:bg-[#fff7f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                {isEmbu ? 'Edit Tim & Teknik' : 'Edit Nomor'} →
            </Button>}
        </div>
        {isEmbu ? <div className="grid gap-4 p-4 xl:grid-cols-2 md:p-5">{teams.map((team) => {
            const teamMembers = members.filter(({ entry }) => Number(entry.team_number || 1) === team);
            const assignedTechniques = teamTechniques.filter((item) => item.event_match_category_id === category.id && Number(item.team_number) === team)
                .sort((first, second) => Number(first.order || 0) - Number(second.order || 0));
            return <section key={team} className="overflow-hidden rounded-xl border border-[#e8e1d7]">
                <div className="flex items-center justify-between bg-[#f8f3ec] px-4 py-3"><h5 className="font-bold text-[#17120f]">Tim {team}</h5>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#775016]">{teamMembers.length}/{category.max_athletes_per_team} atlet</span></div>
                <ol className="divide-y divide-[#f0ebe5]">{teamMembers.map(({ athlete, entry }, index) => <li key={entry.id} className="flex gap-3 px-4 py-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f5e5dc] text-xs font-bold text-[#9f2e22]">{index + 1}</span>
                    <div className="min-w-0"><p className="font-semibold text-[#17120f]">{athlete.name}</p><p className="mt-0.5 text-xs text-slate-600">{ageName(athlete)} · {athlete.kyu_dan || 'Tingkatan belum diisi'}</p>
                        {entry.age_group_promotion && <p className="mt-1 text-xs font-semibold text-[#9f5820]">Gabung ke {category.age_category?.name || 'kelompok nomor ini'}</p>}</div>
                </li>)}</ol>
                <div className="border-t border-[#eee8df] bg-[#fffdfb] px-4 py-3"><p className="text-xs font-bold uppercase tracking-wide text-[#706860]">Komposisi Teknik</p>
                    {assignedTechniques.length ? <ol className="mt-2 space-y-1.5">{assignedTechniques.map((item, index) => <li key={item.id} className="flex gap-2 text-xs text-[#3c332c]"><span className="font-bold text-[#a93226]">{index + 1}.</span>{item.technique?.name || 'Teknik tidak tersedia'}</li>)}</ol>
                        : <p className="mt-2 text-xs text-amber-800">Teknik belum dipilih untuk tim ini.</p>}
                </div>
            </section>;
        })}</div> : <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 md:p-5">{members.map(({ athlete, entry }) => <li key={entry.id} className="rounded-xl border border-[#e8e1d7] bg-[#fffdfb] px-4 py-3">
            <p className="font-semibold text-[#17120f]">{athlete.name}</p><p className="mt-1 text-xs text-slate-600">{ageName(athlete)} · {athlete.weight ? `${athlete.weight} kg` : 'Berat belum diisi'}</p>
        </li>)}</ul>}
    </article>;
}

function ReviewStep({ registration, athletes, officials, categories, ageCategories, paymentMethods, teamTechniques, go, readOnly = false }) {
    const grouped = categories.map((category) => ({ category, members: athletes.flatMap((athlete) => (athlete.match_category_entries || [])
        .filter((entry) => entry.event_match_category_id === category.id).map((entry) => ({ athlete, entry }))) })).filter((row) => row.members.length);
    const registeredAthletes = athletes.filter((item) => item.match_category_entries?.length).length;
    const isPaid = registration.event.is_paid !== false;
    const method = paymentMethods.find((item) => item.id === registration.payment_method_id);
    const paymentStatus = !isPaid ? 'Tidak perlu pembayaran' : registration.payment_status === 'submitted' ? 'Menunggu verifikasi' : registration.payment_status === 'verified' ? 'Terverifikasi'
        : registration.payment_status === 'rejected' ? 'Perlu diajukan ulang' : 'Belum dibayar';
    const isComplete = grouped.length > 0 && (!isPaid || Boolean(method && registration.verification_code));
    return <div className="space-y-6 text-sm text-[#3c332c]">
        <div className="rounded-2xl border border-[#e8d9c6] bg-[#fcf8f2] p-5 md:p-6"><p className="text-xs font-bold uppercase tracking-widest text-[#9f2e22]">Pemeriksaan Akhir</p>
            <h3 className="mt-1 font-cinzel text-xl font-bold text-[#17120f]">Periksa data sebelum menyelesaikan registrasi</h3>
            <p className="mt-1 text-slate-600">{readOnly ? 'Registrasi telah diverifikasi. Seluruh data berikut ditampilkan dalam mode baca saja.' : 'Perubahan atlet, tim, dan teknik dapat dilakukan dari bagian yang sesuai di bawah ini.'}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-600">Atlet terdaftar</p><p className="mt-1 text-xl font-bold text-[#17120f]">{registeredAthletes}</p></div>
                <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-600">Nomor pertandingan</p><p className="mt-1 text-xl font-bold text-[#17120f]">{grouped.length}</p></div>
                <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-600">Total pembayaran</p><p className="mt-1 text-lg font-bold text-[#17120f]">{isPaid ? money(registration.final_amount) : 'Gratis'}</p></div></div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-2xl border border-[#e8e1d7] p-5"><div className="flex justify-between gap-3"><h3 className="font-bold text-[#17120f]">Data Kontingen</h3>
            {!readOnly && <Button variant="unstyled" size="none" type="button" onClick={() => go(1)} className="text-xs font-bold text-[#a93226] hover:underline">Edit</Button>}</div>
            <p className="mt-3 text-base font-bold text-[#17120f]">{registration.contingent.name}</p><p className="mt-1 text-slate-600">{registration.contingent.city} · {registration.contingent.manager_name}</p>
            <p className="mt-1 text-slate-600">{registration.contingent.phone} · {registration.contingent.email || 'Email belum diisi'}</p>
            <p className="mt-3 border-t border-[#eee8df] pt-3 text-slate-600">{registration.contingent.address || 'Alamat belum diisi'}</p></section>
            <section className="rounded-2xl border border-[#e8e1d7] p-5"><div className="flex justify-between gap-3"><h3 className="font-bold text-[#17120f]">Event & {isPaid ? 'Pembayaran' : 'Biaya'}</h3>
                {!readOnly && <Button variant="unstyled" size="none" type="button" onClick={() => go(4)} className="text-xs font-bold text-[#a93226] hover:underline">Edit</Button>}</div>
                <p className="mt-3 font-semibold text-[#17120f]">{registration.event.name}</p>
                <dl className="mt-3 space-y-2 text-slate-600"><div className="flex justify-between gap-3"><dt>Biaya tercatat</dt><dd className="font-bold text-[#17120f]">{isPaid ? money(registration.final_amount) : 'Gratis'}</dd></div>
                    {isPaid && <div className="flex justify-between gap-3"><dt>Metode</dt><dd className="text-right">{method?.name || 'Belum dipilih'}</dd></div>}
                    <div className="flex justify-between gap-3"><dt>Status</dt><dd className="font-semibold">{paymentStatus}</dd></div></dl>
                {isPaid && registration.payment_status === 'rejected' && <p className="mt-3 text-amber-800">{registration.payment_note}</p>}</section></div>
        <section className="rounded-2xl border border-[#e8e1d7] p-5"><div className="flex justify-between gap-3"><h3 className="font-bold text-[#17120f]">Official Pendamping ({officials.length})</h3>
            {!readOnly && <Button variant="unstyled" size="none" type="button" onClick={() => go(2)} className="text-xs font-bold text-[#a93226] hover:underline">Edit</Button>}</div>
            <div className="mt-3 flex flex-wrap gap-2">{officials.length ? officials.map((item) => <span key={item.id} className="rounded-lg border border-[#e8e1d7] bg-[#fcfaf7] px-3 py-2 text-xs font-medium text-[#4f4438]">{item.name} · {item.role}</span>)
                : <p className="text-slate-600">Belum ada official pendamping.</p>}</div></section>
        <section className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-cinzel text-lg font-bold text-[#17120f]">Nomor dan Kelompok Pertandingan</h3>
            <p className="mt-1 text-sm text-slate-600">{registeredAthletes} atlet pada {grouped.length} nomor. Setiap tim Embu memiliki komposisi teknik tersendiri.</p></div>
            {!readOnly && <Button variant="unstyled" size="none" type="button" onClick={() => go(3, 'matches')} className="rounded-xl border border-[#d9c6b9] px-4 py-2.5 text-sm font-bold text-[#9f2e22] hover:border-[#b63729] hover:bg-[#fff7f3]">Edit Nomor, Tim & Teknik →</Button>}</div>
            {grouped.length ? grouped.map(({ category, members }) => <ReviewCategoryCard key={category.id} category={category} members={members}
                teamTechniques={teamTechniques} ageCategories={ageCategories} onEdit={readOnly ? null : (categoryId) => go(3, 'matches', categoryId)} />)
                : <div className="rounded-xl border border-dashed border-[#d6c8b6] bg-[#fcfaf7] p-6 text-slate-600">Belum ada atlet yang dipilih untuk nomor pertandingan.</div>}
        </section>
        {!isComplete && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <p className="font-semibold">Lengkapi registrasi sebelum selesai.</p>
            {!readOnly && !grouped.length && <Button variant="unstyled" size="none" type="button" onClick={() => go(3, 'athletes')} className="mt-2 block font-semibold underline">Pilih nomor pertandingan untuk minimal satu atlet →</Button>}
            {!readOnly && isPaid && (!method || !registration.verification_code) && <Button variant="unstyled" size="none" type="button" onClick={() => go(4)} className="mt-2 block font-semibold underline">Lengkapi biaya dan pilih metode pembayaran →</Button>}
        </div>}
        <div className="flex justify-end border-t border-[#eee8df] pt-5"><Link href={`/admin/pendaftaran/registrasi?event_id=${registration.event.id}`} aria-disabled={!isComplete} onClick={(event) => { if (!isComplete) event.preventDefault(); }}
            className={`rounded-xl px-5 py-3 font-semibold text-white ${isComplete ? 'bg-[#b63729] hover:bg-[#982c22]' : 'cursor-not-allowed bg-slate-400'}`}>Selesai & Kembali ke Registrasi</Link></div>
    </div>;
}

export default function WizardDetail({ registration, athletes = [], categories = [], techniques = [], teamTechniques = [], officials = [], availableOfficials = [], kyus = [], ageCategories = [], paymentMethods = [], canManage = false, canVerifySchool = false, participantRequirements = [], registrationLocked = false }) {
    const initialParams = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
    const initial = Number(initialParams.get('step') || 1);
    const [step, setStep] = useState(initial >= 1 && initial <= 5 ? initial : 1);
    const steps = registrationSteps(registration.event.is_paid !== false);
    const [focusedCategoryId, setFocusedCategoryId] = useState(initialParams.get('category') || '');
    const go = (number, section = null, categoryId = '') => {
        setFocusedCategoryId(categoryId);
        setStep(number);
        const params = new URLSearchParams({ step: String(number) });
        if (number === 3 && section === 'matches') {
            params.set('section', 'matches');
            if (categoryId) params.set('category', categoryId);
        }
        window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params}`);
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const targetId = number === 3 && section ? (section === 'matches' ? 'nomor-pertandingan' : 'data-atlet') : '';
            const target = targetId ? document.getElementById(targetId) : null;

            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }));
    };
    useEffect(() => {
        if (step !== 3 || initialParams.get('section') !== 'matches') {
            return;
        }

        requestAnimationFrame(() => document.getElementById('nomor-pertandingan')?.scrollIntoView({ block: 'start' }));
    }, []);
    return <AdminLayout title="Wizard Registrasi Kontingen"><Head title={`Registrasi ${registration.contingent.name} | Smart Perkemi`} />
        <div className="w-full max-w-full space-y-6"><div><Link href={`/admin/pendaftaran/registrasi?event_id=${registration.event.id}`} className="text-sm font-semibold text-[#8a631c] hover:underline">← Kembali ke registrasi</Link>
            <h1 className="mt-3 font-cinzel text-2xl font-bold text-[#17120f]">Registrasi {registration.contingent.name}</h1>
            <p className="mt-1 text-sm text-slate-600">{registration.registration_number} · Langkah {step} dari 5 · {registration.event.name}</p></div>
            {registrationLocked && <div role="status" className="flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm md:p-5">
                <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700"><i className="fa-solid fa-lock" /></span>
                <div><h2 className="font-semibold">Registrasi telah diverifikasi</h2><p className="mt-1 text-sm leading-6 text-emerald-800">Data telah dikunci dan tidak dapat diubah oleh kontingen. Hubungi admin atau penyelenggara event jika diperlukan koreksi.</p></div>
            </div>}
            <ol className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0" aria-label="Langkah registrasi">{steps.map((label, index) => <li key={label} className="min-w-40 sm:min-w-0"><Button variant="unstyled" size="none" type="button" onClick={() => go(index + 1)}
                aria-current={step === index + 1 ? 'step' : undefined} className={`h-full w-full rounded-xl border px-3 py-3 text-left text-sm font-semibold ${step === index + 1 ? 'border-[#b63729] bg-[#fff4f0] text-[#9f2e22]' : 'border-[#e8e1d7] bg-white text-slate-600 hover:border-[#b63729]'}`}>
                {index + 1}. {label}</Button></li>)}</ol>
            <section className="rounded-2xl border border-[#e8e1d7] bg-white p-5 shadow-sm md:p-8"><div className="mb-6 border-b border-[#eee8df] pb-5">
                <p className="text-xs font-bold uppercase tracking-widest text-[#a93226]">Langkah {step} dari 5</p>
                <h2 className="mt-1 font-cinzel text-xl font-bold text-[#17120f]">{steps[step - 1]}</h2></div>
                {step === 1 && <ContingentStep registration={registration} next={() => go(2)} readOnly={registrationLocked} />}
                {step === 2 && <OfficialStep registration={registration} officials={officials} availableOfficials={availableOfficials} next={() => go(3)} readOnly={registrationLocked} />}
                {step === 3 && participantRequirements.length > 0 && <div className="mb-6 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950"><h3 className="font-semibold">Persyaratan peserta event ini</h3><ul className="mt-2 list-disc pl-5">{participantRequirements.map((line) => <li key={line}>{line}</li>)}</ul></div>}
                {step === 3 && <AthleteStep registration={registration} athletes={athletes} categories={categories} techniques={techniques} teamTechniques={teamTechniques}
                    kyus={kyus} ageCategories={ageCategories} next={() => go(4)} canManage={canManage}
                    focusedCategoryId={focusedCategoryId} readOnly={registrationLocked} />}
                {(step === 3 || step === 5) && <div className="mt-6"><SchoolVerification registration={registration} athletes={athletes} canVerify={canVerifySchool} /></div>}
                {step === 4 && <PaymentStep registration={registration} athletes={athletes} paymentMethods={paymentMethods} next={() => go(5)} readOnly={registrationLocked} />}
                {step === 5 && <ReviewStep registration={registration} athletes={athletes} officials={officials} categories={categories} ageCategories={ageCategories} paymentMethods={paymentMethods} teamTechniques={teamTechniques} go={go} readOnly={registrationLocked} />}
            </section>
            {step > 1 && <Button variant="unstyled" size="none" type="button" onClick={() => go(step - 1)} className="text-sm font-semibold text-[#8a631c] hover:underline">← Kembali ke langkah sebelumnya</Button>}
        </div>
    </AdminLayout>;
}
