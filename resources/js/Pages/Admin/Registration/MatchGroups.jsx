import Button from "@/Components/UI/Elements/Button";
import AdminLayout from '@/Layouts/AdminLayout';
import Combobox from '@/Components/UI/Forms/Combobox';
import Input from '@/Components/UI/Forms/Input';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { CategoryPanel } from './Detail';

const baseUrl = '/admin/pendaftaran/nomor-pertandingan';

export default function MatchGroups({ activeEvent, eventOptions = [], registrations = [], registration = null, athletes = [], categories = [], teamTechniques = [], techniques = [], ageCategories = [] }) {
    const [search, setSearch] = useState('');
    const [type, setType] = useState('all');
    const listedRegistrations = registrations.filter((item) =>
        `${item.contingent?.name || ''} ${item.contingent?.city || ''} ${item.registration_number}`
            .toLocaleLowerCase('id-ID').includes(search.toLocaleLowerCase('id-ID')));
    const usedCategoryIds = new Set(athletes.flatMap((athlete) =>
        (athlete.match_category_entries || []).map((entry) => entry.event_match_category_id)));
    const usedCategories = categories.filter((category) => usedCategoryIds.has(category.id));
    const shownCategories = usedCategories.filter((category) => type === 'all' || category.type === type);
    const embuCount = usedCategories.filter((category) => category.type === 'embu').length;
    const randoriCount = usedCategories.filter((category) => category.type === 'randori').length;
    const threeNumberAthletes = athletes.filter((athlete) => (athlete.match_category_entries || []).length === 3);
    const teamCount = new Set(athletes.flatMap((athlete) => (athlete.match_category_entries || [])
        .filter((entry) => usedCategories.some((category) => category.id === entry.event_match_category_id && category.type === 'embu'))
        .map((entry) => `${entry.event_match_category_id}:${entry.team_number || 1}`))).size;

    const selectEvent = (eventId) => router.get(baseUrl, { event_id: eventId });
    const selectRegistration = (id) => router.get(baseUrl, { event_id: activeEvent.id, registration_id: id });

    return <AdminLayout title="Nomor dan Kelompok Pertandingan">
        <Head title="Nomor dan Kelompok Pertandingan | Smart Perkemi" />
        <div className="w-full max-w-full space-y-6">
            <header className="rounded-2xl border border-[#e8e1d7] bg-white p-5 shadow-sm md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-5">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#ad7e2a]">Pendaftaran · Pengaturan pertandingan</p>
                        <h1 className="mt-2 font-cinzel text-2xl font-bold text-[#17120f] md:text-3xl">Nomor dan Kelompok Pertandingan</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#706860]">Pilih kontingen untuk mengatur susunan tim Embu dan teknik yang digunakan. Nomor Randori dan berat atlet ditampilkan sebagai acuan.</p>
                    </div>
                    {eventOptions.length > 1 && <div className="w-full sm:w-72">
                        <Combobox label="Event" value={activeEvent.id} onChange={selectEvent} placeholder=""
                            options={eventOptions.map((event) => ({ value: event.id, label: event.name, sublabel: event.option_description }))} />
                    </div>}
                </div>
                {eventOptions.length <= 1 && <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#faf4e9] px-3 py-1.5 text-xs font-semibold text-[#74521f]">
                    <i className="fa-solid fa-trophy" aria-hidden="true" />{activeEvent.name}
                </div>}
            </header>

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(260px,300px)_minmax(0,1fr)]">
                <aside className="rounded-2xl border border-[#e8e1d7] bg-white shadow-sm xl:sticky xl:top-5">
                    <div className="border-b border-[#eee8df] p-4">
                        <h2 className="font-semibold text-[#17120f]">Kontingen Terdaftar</h2>
                        <p className="mt-1 text-xs text-[#706860]">{registrations.length} kontingen pada event ini</p>
                        <Input id="search-contingent-match" type="search" value={search} onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari kontingen..." aria-label="Cari kontingen" iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                            containerClassName="mt-4 w-full" />
                    </div>
                    <div className="max-h-[32rem] space-y-1 overflow-y-auto p-2">
                        {listedRegistrations.map((item) => <Button variant="unstyled" size="none" key={item.id} type="button" onClick={() => selectRegistration(item.id)}
                            aria-current={registration?.id === item.id ? 'page' : undefined}
                            className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${registration?.id === item.id ? 'bg-[#f9eee9] text-[#8f2b20]' : 'text-[#332b24] hover:bg-[#faf7f2]'}`}>
                            <span className="block text-sm font-semibold">{item.contingent?.name || 'Kontingen'}</span>
                            <span className="mt-1 block text-xs text-[#706860]">{item.contingent?.city || 'Kota belum diisi'} · {item.registration_number}</span>
                        </Button>)}
                        {listedRegistrations.length === 0 && <p className="px-3 py-6 text-center text-sm text-[#706860]">
                            {registrations.length ? 'Kontingen tidak ditemukan.' : 'Belum ada kontingen terdaftar pada event ini.'}
                        </p>}
                    </div>
                </aside>

                <main className="min-w-0 space-y-5">
                    {registration ? <>
                        <section className="rounded-2xl border border-[#e8e1d7] bg-white p-5 shadow-sm md:p-6">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-[#ad7e2a]">Kontingen terpilih</p>
                                    <h2 className="mt-1 font-cinzel text-xl font-bold text-[#17120f]">{registration.contingent.name}</h2>
                                    <p className="mt-1 text-sm text-[#706860]">{registration.registration_number} · {registration.contingent.city}</p>
                                </div>
                                <Link href={`/admin/pendaftaran/registrasi/${registration.id}/detail?step=3&section=matches&event_id=${activeEvent.id}`}
                                    className="rounded-xl border border-[#d9c7af] px-4 py-2.5 text-sm font-semibold text-[#815a20] hover:bg-[#faf4e9]">
                                    Kelola atlet dan nomor <span aria-hidden="true">↗</span>
                                </Link>
                            </div>
                            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="rounded-xl bg-[#faf7f2] p-3"><p className="text-xs text-[#706860]">Atlet terdaftar</p><p className="mt-1 text-xl font-bold text-[#17120f]">{athletes.length}</p></div>
                                <div className="rounded-xl bg-[#faf7f2] p-3"><p className="text-xs text-[#706860]">Nomor Embu</p><p className="mt-1 text-xl font-bold text-[#17120f]">{embuCount}</p></div>
                                <div className="rounded-xl bg-[#faf7f2] p-3"><p className="text-xs text-[#706860]">Tim Embu</p><p className="mt-1 text-xl font-bold text-[#17120f]">{teamCount}</p></div>
                                <div className="rounded-xl bg-[#faf7f2] p-3"><p className="text-xs text-[#706860]">Nomor Randori</p><p className="mt-1 text-xl font-bold text-[#17120f]">{randoriCount}</p></div>
                            </div>
                        </section>

                        {threeNumberAthletes.length > 0 && <section className="rounded-2xl border border-[#ead9b9] bg-[#fffaf0] p-4 md:p-5">
                            <h2 className="text-sm font-bold text-[#75501b]">Atlet mengikuti 3 nomor pertandingan</h2>
                            <p className="mt-1 text-xs text-[#706860]">Nomor Embu dan Randori yang dipilih untuk atlet yang sama.</p>
                            <ul className="mt-3 grid gap-3 lg:grid-cols-2">
                                {threeNumberAthletes.map((athlete) => <li key={athlete.id} className="rounded-xl border border-[#eadfcf] bg-white p-3">
                                    <p className="text-sm font-semibold text-[#17120f]">{athlete.name}</p>
                                    <ul className="mt-2 space-y-1 text-xs text-[#5a5047]">
                                        {athlete.match_category_entries.map((entry) => <li key={entry.id}>
                                            <span className="mr-1 font-bold text-[#a93226]">{entry.match_category?.type === 'randori' ? 'Randori' : 'Embu'}:</span>
                                            {entry.match_category?.name || 'Nomor pertandingan'}
                                        </li>)}
                                    </ul>
                                </li>)}
                            </ul>
                        </section>}

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div><h2 className="font-cinzel text-lg font-bold text-[#17120f]">Nomor yang Diikuti</h2>
                                <p className="mt-1 text-sm text-[#706860]">Pindahkan atlet melalui pilihan Tim pada baris atlet. Buka Edit Teknik untuk mengubah komposisi Embu.</p></div>
                            <div className="flex gap-1 rounded-xl border border-[#e8e1d7] bg-white p-1" aria-label="Filter jenis pertandingan">
                                {[['all', 'Semua'], ['embu', 'Embu'], ['randori', 'Randori']].map(([value, label]) =>
                                    <Button variant="unstyled" size="none" key={value} type="button" onClick={() => setType(value)} aria-pressed={type === value}
                                        className={`rounded-lg px-3 py-2 text-xs font-semibold ${type === value ? 'bg-[#a93226] text-white' : 'text-[#706860] hover:bg-[#faf4e9]'}`}>{label}</Button>)}
                            </div>
                        </div>

                        {shownCategories.length ? shownCategories.map((category) => <CategoryPanel key={category.id}
                            registration={registration} category={category} athletes={athletes} teamTechniques={teamTechniques}
                            techniques={techniques} ageCategories={ageCategories} canManage showAdd={false} />)
                            : <div className="rounded-2xl border border-dashed border-[#d6c8b6] bg-white px-6 py-12 text-center">
                                <p className="font-semibold text-[#17120f]">{usedCategories.length ? 'Tidak ada nomor pada filter ini.' : 'Belum ada nomor pertandingan untuk kontingen ini.'}</p>
                                {!usedCategories.length && <Link href={`/admin/pendaftaran/registrasi/${registration.id}/detail?step=3&section=matches&event_id=${activeEvent.id}`}
                                    className="mt-3 inline-block text-sm font-semibold text-[#a93226] hover:underline">Pilih atlet dan nomor pertandingan →</Link>}
                            </div>}
                    </> : <div className="rounded-2xl border border-dashed border-[#d6c8b6] bg-white px-6 py-16 text-center text-sm text-[#706860]">
                        Pilih kontingen yang sudah terdaftar untuk mengelola nomor dan tim pertandingan.
                    </div>}
                </main>
            </div>
        </div>
    </AdminLayout>;
}
