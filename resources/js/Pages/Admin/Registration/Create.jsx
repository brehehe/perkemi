import AdminLayout from '@/Layouts/AdminLayout';
import Button from '@/Components/UI/Elements/Button';
import Combobox from '@/Components/UI/Forms/Combobox';
import Input from '@/Components/UI/Forms/Input';
import Textarea from '@/Components/UI/Forms/Textarea';
import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const fields = [
    ['city', 'Kabupaten / Kota'], ['name', 'Nama Kontingen'], ['manager_name', 'Manager Kontingen'],
    ['phone', 'Nomor HP / WA Manager'], ['email', 'Email'], ['address', 'Alamat'],
];

export default function RegistrationCreate({ events = [], contingents = [], selectedEventId = '', isAdmin = false }) {
    const [mode, setMode] = useState(!isAdmin && contingents.length ? 'existing' : 'new');
    const form = useForm({ event_id: selectedEventId || '', contingent_id: !isAdmin && contingents.length === 1 ? contingents[0].id : '',
        city: '', name: '', manager_name: '', phone: '', email: '', address: '', notes: '' });
    const contingent = contingents.find((item) => item.id === form.data.contingent_id);
    const selectedEvent = events.find((item) => item.id === form.data.event_id);
    const steps = ['Data Kontingen', 'Official Pendamping', 'Atlet & Nomor', selectedEvent?.is_paid === false ? 'Konfirmasi Gratis' : 'Biaya & Pembayaran', 'Review'];
    useEffect(() => {
        if (mode === 'existing' && contingent) {
            form.setData((data) => ({ ...data, city: contingent.city || '', name: contingent.name || '', manager_name: contingent.manager_name || '',
                phone: contingent.phone || '', email: contingent.email || '', address: contingent.address || '' }));
        }
    }, [form.data.contingent_id, mode]);
    const submit = (event) => {
        event.preventDefault();
        form.post('/admin/pendaftaran/registrasi');
    };
    const input = (key, label) => key === 'address'
        ? <Textarea key={key} id={key} label={label} required rows={3} value={form.data[key]} disabled={mode === 'existing'}
            onChange={(event) => form.setData(key, event.target.value)} error={form.errors[key]} containerClassName="md:col-span-2" />
        : <Input key={key} id={key} label={label} required type={key === 'email' ? 'email' : 'text'} value={form.data[key]} disabled={mode === 'existing'}
            onChange={(event) => form.setData(key, event.target.value)} error={form.errors[key]} />;

    return <AdminLayout title="Buat Registrasi Kontingen">
        <Head title="Buat Registrasi Kontingen | Smart Perkemi" />
        <div className="w-full max-w-full space-y-6">
            <div><Link href={`/admin/pendaftaran/registrasi?event_id=${form.data.event_id || selectedEventId}`} className="text-sm font-medium text-[#8a631c] hover:underline">← Kembali ke registrasi</Link>
                <h1 className="mt-3 font-cinzel text-2xl font-bold text-[#17120f]">Wizard Registrasi Kontingen</h1>
                <p className="mt-1 text-sm text-[#706860]">Langkah 1 dari 5 · Data Kontingen. Data tersimpan saat melanjutkan ke langkah berikutnya.</p></div>
            <ol className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0" aria-label="Langkah registrasi">{steps.map((label, i) =>
                <li key={label} className={`min-w-40 rounded-xl border px-3 py-3 text-sm font-semibold sm:min-w-0 ${i === 0 ? 'border-[#b63729] bg-[#fff4f0] text-[#9f2e22]' : 'border-[#e8e1d7] bg-white text-slate-500'}`}>{i + 1}. {label}</li>)}</ol>
            <form onSubmit={submit} className="space-y-6 rounded-2xl border border-[#e8e1d7] bg-white p-5 shadow-sm md:p-8">
                <div className="grid gap-5 md:grid-cols-2">
                    <Combobox label="Event yang Diikuti" required value={form.data.event_id} onChange={(value) => form.setData('event_id', value)}
                        options={events.map((item) => ({ value: item.id, label: item.name, sublabel: item.is_paid ? `Berbayar · ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.fee_per_athlete || 0)} per atlet` : 'Gratis · tanpa pembayaran' }))} error={form.errors.event_id} />
                    <div><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">Sumber Kontingen</span>
                        <div className="flex flex-wrap gap-2">
                            {(isAdmin || contingents.length > 0) && <Button variant={mode === 'existing' ? 'primary' : 'outline'} size="sm" type="button" onClick={() => setMode('existing')}>Pilih yang sudah ada</Button>}
                            <Button variant={mode === 'new' ? 'primary' : 'outline'} size="sm" type="button" onClick={() => { setMode('new'); form.setData((data) => ({ ...data, contingent_id: '', city: '', name: '', manager_name: '', phone: '', email: '', address: '' })); }}>Buat kontingen baru</Button>
                        </div>
                    </div>
                </div>
                {selectedEvent && <div className={`rounded-xl border p-4 text-sm ${selectedEvent.is_paid ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
                    <p className="font-semibold"><i className={`fa-solid ${selectedEvent.is_paid ? 'fa-wallet' : 'fa-gift'} mr-2`} />{selectedEvent.is_paid ? 'Event berbayar' : 'Event gratis'}</p>
                    <p className="mt-1 text-xs opacity-80">{selectedEvent.is_paid ? 'Tagihan akhir dihitung dari biaya kontingen, atlet yang mengikuti nomor pertandingan, dan kode unik.' : 'Tidak ada biaya, kode unik, atau metode pembayaran. Setelah data atlet selesai, Anda dapat langsung meninjau registrasi.'}</p>
                </div>}
                {mode === 'existing' && <Combobox label="Kontingen" required value={form.data.contingent_id} onChange={(value) => form.setData('contingent_id', value)}
                    options={contingents.map((item) => ({ value: item.id, label: `${item.name} · ${item.city || 'Tanpa kota'}${item.event_id !== form.data.event_id ? ` · ${item.event?.name || 'event lain'}` : ''}` }))}
                    error={form.errors.contingent_id} />}
                {mode === 'existing' && contingent?.event_id !== form.data.event_id && <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">Profil, official, dan atlet akan disalin ke event ini. Anda dapat meninjau dan mengubahnya pada langkah berikutnya.</p>}
                {(mode === 'new' || contingent) && <div className="grid gap-5 border-t border-[#eee8df] pt-5 md:grid-cols-2">{fields.map(([key, label]) => input(key, label))}</div>}
                <div className="flex justify-end border-t border-[#eee8df] pt-5"><Button type="submit" loading={form.processing}
                    disabled={!form.data.event_id || (mode === 'existing' ? !form.data.contingent_id : !form.data.city || !form.data.name || !form.data.manager_name || !form.data.phone || !form.data.email || !form.data.address)}>
                    Simpan & Lanjut ke Official →</Button></div>
            </form>
        </div>
    </AdminLayout>;
}
