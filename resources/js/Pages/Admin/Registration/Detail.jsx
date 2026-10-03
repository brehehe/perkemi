import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import AdminLayout from '@/Layouts/AdminLayout';
import Button from '@/Components/UI/Elements/Button';
import Combobox from '@/Components/UI/Forms/Combobox';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);

const categoryRequirements = (category) => {
    const requirements = [];
    if (category.min_weight !== null || category.max_weight !== null) requirements.push(`berat ${category.min_weight || 0}–${category.max_weight || '∞'} kg`);
    return requirements.join(' · ');
};

function TechniquePanel({ registration, category, teamNumber, assignments, techniques, canManage, hasAthletes }) {
    const [editing, setEditing] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const form = useForm({ technique_id: '' });
    const url = '/admin/pendaftaran/registrasi/' + registration.id + '/match-category/' + category.id + '/teams/' + teamNumber + '/techniques';
    const chosen = new Set(assignments.map((item) => item.technique_id));
    const available = techniques.filter((item) => !chosen.has(item.id));
    const add = (event) => {
        event.preventDefault();
        form.post(url, { preserveScroll: true, onSuccess: () => form.reset() });
    };
    const createAndAdd = (name) => {
        if (creating) return;
        setCreateError('');
        router.post(url, { technique_name: name }, {
            preserveScroll: true,
            onStart: () => setCreating(true),
            onFinish: () => setCreating(false),
            onError: (errors) => setCreateError(errors.technique_name || errors.technique_id || 'Teknik belum dapat ditambahkan.'),
            onSuccess: () => form.reset(),
        });
    };

    return <div className="min-w-0 border-t border-[#eee8df] p-4 lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between gap-3">
            <div><h4 className="text-xs font-bold uppercase tracking-wide text-[#706860]">Komposisi / Teknik</h4><p className="mt-1 text-xs text-[#706860]">Urutan teknik Tim {teamNumber}</p></div>
            {canManage && hasAthletes && <Button variant="unstyled" size="none" type="button" onClick={() => setEditing(!editing)} aria-expanded={editing}
                className="rounded-lg bg-[#8747a5] px-3 py-2 text-xs font-semibold text-white hover:bg-[#703889] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                {editing ? 'Selesai' : 'Edit Teknik'}
            </Button>}
        </div>
        {assignments.length ? <ol className="mt-4 space-y-2">
            {assignments.map((item, index) => <li key={item.id} className="flex justify-between gap-3 rounded-lg bg-[#fbf8f4] px-3 py-2 text-sm text-[#17120f]">
                <span><strong className="mr-2 text-[#a93226]">{index + 1}.</strong>{item.technique?.name || 'Teknik tidak tersedia'}</span>
                {canManage && editing && <Button variant="unstyled" size="none" type="button" onClick={() => router.delete(url + '/' + item.id, { preserveScroll: true })}
                    aria-label={'Hapus teknik ' + (item.technique?.name || '') + ' dari Tim ' + teamNumber}
                    className="rounded px-2 text-xs font-semibold text-rose-700 hover:bg-rose-100">Hapus</Button>}
            </li>)}
        </ol> : <p className="mt-4 text-sm text-[#706860]">Belum ada teknik untuk tim ini.</p>}
        {canManage && editing && <form onSubmit={add} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1"><Combobox label="Tambah Teknik" value={form.data.technique_id}
                onChange={(value) => form.setData('technique_id', value)}
                onCreate={createAndAdd} createLabel="Buat dan tambahkan teknik"
                disabled={creating}
                options={available.map((item) => ({ value: item.id, label: item.name }))}
                placeholder={available.length ? 'Cari atau ketik teknik baru...' : 'Ketik nama teknik baru...'} error={form.errors.technique_id || createError} /></div>
            <Button type="submit" size="sm" loading={form.processing || creating} disabled={!form.data.technique_id || creating}>Tambah</Button>
        </form>}
    </div>;
}

export function CategoryPanel({ registration, category, athletes, teamTechniques, techniques, ageCategories = [], canManage, showAdd = true, onEditAthlete }) {
    const [teamError, setTeamError] = useState('');
    const [athleteId, setAthleteId] = useState('');
    const [teamNumber, setTeamNumber] = useState(1);
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);
    const [notice, setNotice] = useState('');
    const [swapEntryId, setSwapEntryId] = useState('');
    const [swapPartnerId, setSwapPartnerId] = useState('');
    const [swapError, setSwapError] = useState('');
    const [swapping, setSwapping] = useState(false);
    const embu = category.type === 'embu';
    const limit = Number(registration.event.max_match_categories_per_athlete || 1);
    const rows = athletes.flatMap((athlete) => (athlete.match_category_entries || [])
        .filter((entry) => entry.event_match_category_id === category.id).map((entry) => ({ athlete, entry })));
    const highest = Math.max(1, ...rows.map((row) => Number(row.entry.team_number || 1)));
    const teamOptions = Array.from({ length: Math.min(20, highest + 1) }, (_, index) => index + 1);
    const teamCount = (number) => rows.filter((row) => Number(row.entry.team_number || 1) === number).length;
    const openTeams = teamOptions.filter((number) => teamCount(number) < category.max_athletes_per_team);
    const selectedTeam = openTeams.includes(teamNumber) ? teamNumber : openTeams[0];
    const teams = embu ? [...new Set([1, ...rows.map((row) => Number(row.entry.team_number || 1))])].sort((a, b) => a - b) : [1];
    const available = athletes.filter((athlete) => category.eligible_athlete_ids?.includes(athlete.id)
        && !(athlete.match_category_entries || []).some((entry) => entry.event_match_category_id === category.id)
        && (athlete.match_category_entries || []).length < limit);
    const hasRoom = embu ? openTeams.length > 0 : rows.length < category.max_athletes_per_team;
    const base = '/admin/pendaftaran/registrasi/' + registration.id + '/athletes/';
    const add = (event) => {
        event.preventDefault();
        if (!athleteId || !selectedTeam || processing) return;

        setErrors({});
        setNotice('');
        router.post(base + athleteId + '/match-category', {
            event_match_category_id: category.id,
            team_number: selectedTeam,
        }, {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onError: setErrors,
            onSuccess: () => {
                setAthleteId('');
                setNotice('Atlet berhasil ditambahkan ke nomor ini.');
            },
        });
    };
    const remove = (row) => router.delete(base + row.athlete.id + '/match-category/' + row.entry.id, { preserveScroll: true });
    const move = (row, number) => {
        setTeamError('');
        router.patch('/admin/pendaftaran/registrasi/' + registration.id + '/entries/' + row.entry.id + '/team', { team_number: number },
            { preserveScroll: true, onError: (errors) => setTeamError(errors.team_number || 'Tim atlet belum dapat diperbarui.') });
    };
    const swapEntry = rows.find((row) => row.entry.id === swapEntryId);
    const swapPartners = swapEntry ? rows.filter((row) => Number(row.entry.team_number || 1) !== Number(swapEntry.entry.team_number || 1)) : [];
    const swapPartner = swapPartners.find((row) => row.entry.id === swapPartnerId);
    const swap = (event) => {
        event.preventDefault();
        if (!swapEntry || !swapPartner || swapping) return;
        setSwapError('');
        router.patch('/admin/pendaftaran/registrasi/' + registration.id + '/entries/' + swapEntry.entry.id + '/team', {
            team_number: Number(swapPartner.entry.team_number || 1),
            swap_entry_id: swapPartner.entry.id,
        }, {
            preserveScroll: true,
            onStart: () => setSwapping(true),
            onFinish: () => setSwapping(false),
            onError: (errors) => setSwapError(errors.swap_entry_id || errors.team_number || 'Tim atlet belum dapat ditukar.'),
            onSuccess: () => { setSwapEntryId(''); setSwapPartnerId(''); setNotice('Dua atlet berhasil ditukar antartim.'); },
        });
    };

    return <article className="overflow-hidden rounded-2xl border border-[#e8e1d7] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eee8df] p-4 md:p-5">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#b63729] text-xs font-bold text-white">{embu ? 'EM' : 'RA'}</span>
                <div className="min-w-0"><h3 className="font-semibold text-[#17120f]">{category.name}</h3><p className="mt-0.5 text-sm text-[#706860]">{embu ? 'Embu' : 'Randori'} · {rows.length} atlet terdaftar</p>
                    {categoryRequirements(category) && <p className="mt-1 text-xs text-[#706860]">Syarat: {categoryRequirements(category)}</p>}</div>
            </div>
            <span className="rounded-full bg-[#faf4e9] px-3 py-1 text-xs font-semibold text-[#79541c]">
                Maks. {category.max_athletes_per_team} atlet per {embu ? 'tim' : 'kontingen'}
            </span>
        </div>
        {notice && <p role="status" className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 md:px-5">{notice}</p>}
        {canManage && showAdd && available.length > 0 && hasRoom && <form onSubmit={add} className="grid gap-3 border-b border-[#eee8df] bg-[#fcfaf7] p-4 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-end md:p-5">
            <Combobox label="Pilih Atlet" value={athleteId} onChange={(value) => { setAthleteId(value); setErrors({}); }}
                options={available.map((athlete) => ({ value: athlete.id, label: athlete.name + ' · ' + (athlete.kyu_dan || 'Tingkatan belum diisi') }))}
                error={errors.event_match_category_id || errors.athlete_id} />
            {embu ? <Combobox label="Pilih Tim" value={selectedTeam} onChange={(value) => { setTeamNumber(Number(value)); setErrors({}); }}
                options={openTeams.map((team) => ({ value: team, label: 'Tim ' + team + ' · ' + teamCount(team) + '/' + category.max_athletes_per_team + ' atlet' }))}
                error={errors.team_number} /> : <div />}
            <Button type="submit" size="sm" loading={processing} disabled={!athleteId || processing}>Tambahkan</Button>
        </form>}
        {canManage && showAdd && rows.length === 0 && (!available.length || !hasRoom) && <p className="border-b border-[#eee8df] bg-[#fcfaf7] px-4 py-3 text-sm text-[#706860] md:px-5">
            {!hasRoom ? 'Kuota nomor pertandingan untuk kontingen ini sudah penuh.'
                : rows.length > 0 ? 'Semua atlet yang memenuhi syarat saat ini sudah terdaftar pada nomor ini.'
                    : 'Belum ada atlet yang memenuhi syarat nomor ini. Periksa data atlet atau sesuaikan syarat nomor pada event.'}
        </p>}
        {canManage && embu && teams.length > 1 && <form onSubmit={swap} className="grid gap-3 border-b border-[#eee8df] bg-[#fcfaf7] p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end md:p-5">
            <Combobox label="Tukar atlet antartim" value={swapEntryId} onChange={(value) => { setSwapEntryId(value); setSwapPartnerId(''); setSwapError(''); }}
                options={rows.map((row) => ({ value: row.entry.id, label: `${row.athlete.name} · Tim ${row.entry.team_number || 1}` }))}
                placeholder="Pilih atlet pertama..." />
            <Combobox label="Dengan atlet" value={swapPartnerId} onChange={(value) => { setSwapPartnerId(value); setSwapError(''); }}
                options={swapPartners.map((row) => ({ value: row.entry.id, label: `${row.athlete.name} · Tim ${row.entry.team_number || 1}` }))}
                placeholder="Pilih atlet dari tim lain..." disabled={!swapEntryId} error={swapError} />
            <Button type="submit" size="sm" loading={swapping} disabled={!swapPartner || swapping}>Tukar Tim</Button>
        </form>}
        {teamError && <p role="alert" className="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{teamError}</p>}
        {rows.length > 0 && teams.map((number) => {
            const teamRows = rows.filter((row) => Number(row.entry.team_number || 1) === number);
            const assignments = teamTechniques.filter((item) => item.event_match_category_id === category.id && Number(item.team_number) === number);
            return <div key={number} className="border-b border-[#eee8df] last:border-b-0">
                {embu && <div className="flex items-center justify-between bg-[#fcfaf7] px-4 py-2.5 md:px-5">
                    <h4 className="text-sm font-bold text-[#17120f]">Tim {number}</h4>
                    <span className="text-xs text-[#706860]">{teamRows.length}/{category.max_athletes_per_team} atlet</span>
                </div>}
                <div className={embu ? 'grid lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,1fr)]' : ''}>
                    <TableContainer className="min-w-0" ariaLabel="Tabel data">
                        {teamRows.length ? <table className="responsive-data-table whitespace-nowrap w-full min-w-[520px] text-left text-sm">
                            <thead className="bg-[#fbf9f6] text-xs font-semibold uppercase tracking-wide text-[#706860]">
                                <tr><th className="w-12 px-4 py-3">#</th><th className="px-4 py-3">Nama Atlet</th><th className="px-4 py-3">Tingkat</th>{!embu && <th className="px-4 py-3">Berat</th>}{canManage && <th className="px-4 py-3 text-right">Aksi</th>}</tr>
                            </thead>
                            <tbody className="divide-y divide-[#eee8df]">{teamRows.map((row, index) => <tr key={row.entry.id}>
                                <td className="px-4 py-3 text-[#706860]">{index + 1}</td>
                                <td className="px-4 py-3">{onEditAthlete
                                    ? <Button variant="unstyled" size="none" type="button" onClick={() => onEditAthlete(row.athlete)} className="font-semibold text-[#17120f] hover:text-[#a93226] hover:underline">{row.athlete.name}</Button>
                                    : <Link href={'/admin/master/athlete/' + row.athlete.id + '/detail'} className="font-semibold text-[#17120f] hover:text-[#a93226] hover:underline">{row.athlete.name}</Link>}
                                    <span className="block text-xs text-[#8c827a]">{row.athlete.nik || row.athlete.kenshi_number || 'NIK belum diisi'}</span>
                                    {row.entry.age_group_promotion && <span className="mt-1 block text-xs font-semibold text-[#9f5820]">Gabung Kelompok Usia Lain · Asal {ageCategories.find((group) => group.id === row.athlete.event_age_category_id)?.name || 'kelompok asal'} → {category.age_category?.name || 'kelompok nomor'}</span>}
                                </td>
                                <td className="px-4 py-3 text-[#4f4438]">{row.athlete.kyu_dan || '—'}</td>
                                {!embu && <td className="px-4 py-3 text-[#4f4438]">{row.athlete.weight ? `${row.athlete.weight} kg` : '—'}</td>}
                                {canManage && <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-2">
                                    {embu && <Combobox value={row.entry.team_number || 1} onChange={(value) => move(row, Number(value))}
                                        ariaLabel={'Tim untuk ' + row.athlete.name} size="sm" clearable={false} containerClassName="w-28"
                                        options={teamOptions.filter((team) => team === number || teamCount(team) < category.max_athletes_per_team)
                                            .map((team) => ({ value: team, label: `Tim ${team}` }))} />}
                                    {showAdd && <Button variant="unstyled" size="none" type="button" onClick={() => remove(row)} aria-label={'Hapus ' + row.athlete.name + ' dari ' + category.name}
                                        className="rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">Hapus</Button>
                                    }
                                </div></td>}
                            </tr>)}</tbody>
                        </table> : <p className="p-5 text-sm text-[#706860]">Belum ada atlet pada {embu ? 'tim ini' : 'nomor pertandingan ini'}.</p>}
                    </TableContainer>
                    {embu && <TechniquePanel registration={registration} category={category} teamNumber={number}
                        assignments={assignments} techniques={techniques} canManage={canManage} hasAthletes={teamRows.length > 0} />}
                </div>
            </div>;
        })}
    </article>;
}

export default function RegistrationDetail({ registration, athletes = [], categories = [], techniques = [], teamTechniques = [], canManage = false }) {
    const [showAllCategories, setShowAllCategories] = useState(false);
    const event = registration.event;
    const contingent = registration.contingent;
    const unassigned = athletes.filter((athlete) => !athlete.match_category_entries?.length);
    const relevantCategories = categories.filter((category) =>
        athletes.some((athlete) => (athlete.match_category_entries || []).some((entry) => entry.event_match_category_id === category.id))
        || category.eligible_athlete_ids?.length > 0);
    const otherCount = categories.length - relevantCategories.length;
    const displayedCategories = showAllCategories || !relevantCategories.length ? categories : relevantCategories;
    return <AdminLayout title="Detail Registrasi Kontingen">
        <Head title={'Detail ' + registration.registration_number + ' | Smart Perkemi'} />
        <div className="w-full max-w-full space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div><Link href={`/admin/pendaftaran/registrasi?event_id=${event.id}`} className="text-sm font-medium text-[#8a631c] hover:underline">← Kembali ke registrasi</Link>
                    <h1 className="mt-3 font-cinzel text-2xl font-bold text-[#17120f]">{contingent.name}</h1>
                    <p className="mt-1 text-sm text-[#706860]">{registration.registration_number} · {event.name}</p></div>
                <span className="rounded-full border border-[#d6c8b6] bg-[#faf4e9] px-3 py-1.5 text-xs font-semibold text-[#6a4b1b]">
                    {registration.status === 'verified' ? 'Terverifikasi' : registration.status === 'rejected' ? 'Ditolak' : 'Menunggu Verifikasi'}
                </span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-[#e8e1d7] bg-white p-4"><p className="text-xs uppercase tracking-wide text-[#706860]">Event</p>
                    <p className="mt-1 font-semibold text-[#17120f]">{event.name}</p>
                    <p className="mt-1 text-xs text-[#706860]">Maksimal {event.max_match_categories_per_athlete} nomor per atlet</p>
                    {canManage && <Link href={'/admin/master/event/' + event.id + '/detail'} className="mt-2 inline-block text-xs font-semibold text-[#a93226] hover:underline">Atur batas event ini →</Link>}</div>
                <div className="rounded-xl border border-[#e8e1d7] bg-white p-4"><p className="text-xs uppercase tracking-wide text-[#706860]">Kontingen</p>
                    <p className="mt-1 font-semibold text-[#17120f]">{contingent.name}</p>
                    <p className="mt-1 text-xs text-[#706860]">{contingent.city} · {contingent.manager_name}</p></div>
                <div className="rounded-xl border border-[#e8e1d7] bg-white p-4"><p className="text-xs uppercase tracking-wide text-[#706860]">Biaya Tercatat</p>
                    <p className="mt-1 font-semibold text-[#17120f]">{event.is_paid === false ? 'Gratis' : money(registration.final_amount)}</p>
                    <p className="mt-1 text-xs text-[#706860]">{athletes.length} atlet dalam kontingen</p></div>
            </div>
            {registration.notes && <p className="rounded-xl border border-[#e8e1d7] bg-white p-4 text-sm text-[#4f4438]">Catatan: {registration.notes}</p>}
            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3"><div>
                    <h2 className="font-cinzel text-lg font-bold text-[#17120f]">Daftarkan Atlet ke Nomor Pertandingan</h2>
                    <p className="mt-1 text-sm text-[#706860]">Nomor yang sesuai dengan data atlet ditampilkan lebih dulu.</p>
                </div><Link href={'/admin/master/athlete?contingent_id=' + contingent.id}
                    className="rounded-xl bg-[#c0392b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a82e22]">Kelola / Tambah Atlet</Link></div>
                <ol className="flex flex-wrap gap-2 text-xs font-semibold text-[#6d5942]">
                    <li className="rounded-full bg-[#f4eadc] px-3 py-2">1. Pilih nomor</li>
                    <li className="rounded-full bg-[#f4eadc] px-3 py-2">2. Pilih atlet dan tim</li>
                    <li className="rounded-full bg-[#f4eadc] px-3 py-2">3. Atur teknik Embu</li>
                </ol>
                {otherCount > 0 && relevantCategories.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e8e1d7] bg-white px-4 py-3 text-sm text-[#4f4438]">
                    <span>{relevantCategories.length} nomor cocok dengan atlet kontingen · {otherCount} nomor lainnya</span>
                    <Button variant="unstyled" size="none" type="button" onClick={() => setShowAllCategories(!showAllCategories)} aria-expanded={showAllCategories}
                        className="font-semibold text-[#a93226] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                        {showAllCategories ? 'Tampilkan yang cocok saja' : 'Lihat semua nomor'}
                    </Button>
                </div>}
                {displayedCategories.length ? displayedCategories.map((category) => <CategoryPanel key={category.id} registration={registration}
                    category={category} athletes={athletes} techniques={techniques} teamTechniques={teamTechniques} canManage={canManage} />)
                    : <div className="rounded-xl border border-dashed border-[#d6c8b6] bg-[#fbf8f2] p-8 text-center text-sm text-[#706860]">Belum ada nomor pertandingan aktif untuk event ini.</div>}
            </section>
            {unassigned.length > 0 && <details className="rounded-xl border border-[#e8e1d7] bg-white p-4 md:p-5">
                <summary className="cursor-pointer font-semibold text-[#17120f]">Atlet belum mengikuti nomor pertandingan ({unassigned.length})</summary>
                <div className="mt-3 flex flex-wrap gap-2">{unassigned.map((athlete) => <Link key={athlete.id}
                    href={'/admin/master/athlete/' + athlete.id + '/detail'}
                    className="rounded-lg border border-[#e8e1d7] px-3 py-2 text-sm text-[#4f4438] hover:border-[#c0392b] hover:text-[#a93226]">{athlete.name}</Link>)}</div>
            </details>}
        </div>
    </AdminLayout>;
}
