import AdminLayout from '@/Layouts/AdminLayout';
import Button from '@/Components/UI/Elements/Button';
import Input from '@/Components/UI/Forms/Input';
import Combobox from '@/Components/UI/Forms/Combobox';
import Textarea from '@/Components/UI/Forms/Textarea';
import { Head, Link, useForm } from '@inertiajs/react';

export default function AthleteDetail({ athlete, contingents = [], kyus = [], rankHistory = [], eventHistory = [], historyScopedToEvent = false }) {
    const form = useForm({
        contingent_id: athlete.contingent_id,
        name: athlete.name || '',
        nik: athlete.nik || '',
        kenshi_number: athlete.kenshi_number || '',
        gender: athlete.gender || 'male',
        birth_place: athlete.birth_place || '',
        birth_date: athlete.birth_date || '',
        blood_type: athlete.blood_type || '',
        home_address: athlete.home_address || '',
        dojo_name: athlete.dojo_name || '',
        kyu_dan: athlete.kyu_dan || '',
        weight: athlete.weight || '',
        height: athlete.height || '',
    });
    const photoForm = useForm({ profile_photo: null });

    const save = (event) => {
        event.preventDefault();
        form.put(`/admin/master/athlete/${athlete.id}`, { preserveScroll: true });
    };

    const uploadPhoto = (event) => {
        event.preventDefault();
        photoForm.post(`/admin/master/athlete/${athlete.id}/photo`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => photoForm.reset(),
        });
    };

    return (
        <AdminLayout title="Profil Kenshi">
            <Head title={`${athlete.name} | Profil Kenshi`} />
            <div className="space-y-6">
                <div>
                    <Link href="/admin/master/athlete" className="text-sm font-medium text-[#8a631c] hover:underline">← Kembali ke Master Data Atlet</Link>
                    <div className="mt-4 flex flex-wrap items-center gap-4">
                        {athlete.profile_photo_url ? (
                            <img src={athlete.profile_photo_url} alt={`Foto ${athlete.name}`} className="h-20 w-20 rounded-2xl border border-[#e7ded0] object-cover" />
                        ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#2d2420] font-cinzel text-2xl font-bold text-[#e3bd69]" aria-hidden="true">
                                {athlete.name?.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h1 className="font-cinzel text-2xl font-bold text-[#17120f]">{athlete.name}</h1>
                            <p className="mt-1 text-sm text-[#706860]">{athlete.contingent?.name} · {athlete.kyu_dan || 'Tingkatan belum diisi'}</p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,1fr)]">
                    <div className="space-y-6">
                        <form onSubmit={save} className="space-y-5 rounded-2xl border border-[#e8e1d7] bg-white p-5 shadow-sm md:p-7">
                            <div>
                                <h2 className="font-cinzel text-lg font-bold text-[#17120f]">Informasi Kenshi</h2>
                                <p className="mt-1 text-xs text-[#706860]">Data identitas, domisili, dojo, dan tingkatan atlet.</p>
                            </div>
                            <Input label="Nama Lengkap" required value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} />
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Input label="NIK" required inputMode="numeric" maxLength={16} value={form.data.nik} onChange={(e) => form.setData('nik', e.target.value)} error={form.errors.nik} />
                                <Input label="Nomor Induk Kenshi" required value={form.data.kenshi_number} onChange={(e) => form.setData('kenshi_number', e.target.value)} error={form.errors.kenshi_number} />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Combobox label="Jenis Kelamin" required value={form.data.gender} onChange={(value) => form.setData('gender', value)} options={[{ value: 'male', label: 'Putra' }, { value: 'female', label: 'Putri' }]} error={form.errors.gender} />
                                <Combobox label="Golongan Darah (Opsional)" value={form.data.blood_type} onChange={(value) => form.setData('blood_type', value)} options={[{ value: '', label: 'Tidak diisi' }, 'A', 'B', 'AB', 'O']} placeholder="" error={form.errors.blood_type} />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Input label="Tempat Lahir" required value={form.data.birth_place} onChange={(e) => form.setData('birth_place', e.target.value)} error={form.errors.birth_place} />
                                <Input label="Tanggal Lahir" type="date" required value={form.data.birth_date} onChange={(e) => form.setData('birth_date', e.target.value)} error={form.errors.birth_date} />
                            </div>
                            <Textarea label="Alamat Rumah" required rows={3} value={form.data.home_address} onChange={(e) => form.setData('home_address', e.target.value)} error={form.errors.home_address} />
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Input label="Asal Dojo" required value={form.data.dojo_name} onChange={(e) => form.setData('dojo_name', e.target.value)} error={form.errors.dojo_name} />
                                <Combobox label="Kontingen (Relasi)" required value={form.data.contingent_id} onChange={(value) => form.setData('contingent_id', value)} options={contingents.map((item) => ({ value: item.id, label: item.name }))} error={form.errors.contingent_id} />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <Combobox label="Tingkatan" required value={form.data.kyu_dan} onChange={(value) => form.setData('kyu_dan', value)} options={kyus.includes(form.data.kyu_dan) ? kyus : [form.data.kyu_dan, ...kyus].filter(Boolean)} error={form.errors.kyu_dan} />
                                <Input label="Berat Badan (kg)" type="number" step="0.1" value={form.data.weight} onChange={(e) => form.setData('weight', e.target.value)} error={form.errors.weight} />
                                <Input label="Tinggi Badan (cm)" type="number" step="0.1" value={form.data.height} onChange={(e) => form.setData('height', e.target.value)} error={form.errors.height} />
                            </div>
                            <div className="flex justify-end border-t border-[#eee8df] pt-5">
                                <Button type="submit" loading={form.processing}>Simpan Data Kenshi</Button>
                            </div>
                        </form>

                        <form onSubmit={uploadPhoto} className="rounded-2xl border border-[#e8e1d7] bg-white p-5 shadow-sm md:p-7">
                            <h2 className="font-cinzel text-lg font-bold text-[#17120f]">Foto Profil</h2>
                            <p className="mt-1 text-xs text-[#706860]">Opsional. JPG, PNG, atau WebP, maksimal 2 MB.</p>
                            <div className="mt-4 flex flex-wrap items-end gap-3">
                                <div className="min-w-0 flex-1">
                                    <Input label="Pilih Foto" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => photoForm.setData('profile_photo', e.target.files?.[0] || null)} error={photoForm.errors.profile_photo} />
                                </div>
                                <Button type="submit" size="sm" loading={photoForm.processing} disabled={!photoForm.data.profile_photo}>Unggah Foto</Button>
                            </div>
                        </form>
                    </div>

                    <div className="space-y-6">
                        <section className="rounded-2xl border border-[#e8e1d7] bg-white p-5 shadow-sm md:p-6">
                            <h2 className="font-cinzel text-lg font-bold text-[#17120f]">Riwayat Tingkatan</h2>
                            {rankHistory.length ? (
                                <ol className="mt-4 space-y-4 border-l-2 border-[#e6d5b6] pl-4">
                                    {rankHistory.map((item) => (
                                        <li key={item.id}>
                                            <p className="text-sm font-semibold text-[#17120f]">{item.previous_rank || 'Awal'} → {item.new_rank}</p>
                                            <p className="mt-0.5 text-xs text-[#706860]">{item.changed_at}{item.changed_by ? ` · oleh ${item.changed_by}` : ''}</p>
                                            {item.event && <p className="mt-0.5 text-xs text-[#8a631c]">{item.event}</p>}
                                        </li>
                                    ))}
                                </ol>
                            ) : <p className="mt-4 text-sm text-[#706860]">Belum ada perubahan tingkatan yang tercatat.</p>}
                        </section>

                        <section className="rounded-2xl border border-[#e8e1d7] bg-white p-5 shadow-sm md:p-6">
                            <h2 className="font-cinzel text-lg font-bold text-[#17120f]">Event & Prestasi</h2>
                            <p className="mt-1 text-xs text-[#706860]">{historyScopedToEvent ? 'Riwayat untuk event yang sedang Anda kelola.' : 'Riwayat ditautkan melalui NIK atau Nomor Induk Kenshi yang sama.'}</p>
                            {eventHistory.length ? (
                                <div className="mt-4 space-y-4">
                                    {eventHistory.map((item) => (
                                        <article key={item.id} className="rounded-xl border border-[#eee8df] bg-[#fbf9f5] p-4">
                                            <h3 className="font-semibold text-[#17120f]">{item.name}</h3>
                                            <p className="mt-0.5 text-xs text-[#706860]">{item.city} · {item.start_date || 'Tanggal belum tersedia'}</p>
                                            <p className="mt-2 text-xs text-[#4f4438]">Nomor: {item.match_categories.length ? item.match_categories.join(', ') : 'Belum tercatat'}</p>
                                            {item.results.length > 0 && (
                                                <ul className="mt-2 space-y-1">
                                                    {item.results.map((result, index) => (
                                                        <li key={index} className="text-xs font-semibold text-[#8a631c]">{result.rank} · {result.match_category || 'Nomor pertandingan'}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            ) : <p className="mt-4 text-sm text-[#706860]">Belum ada riwayat event atau prestasi yang tercatat.</p>}
                        </section>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
