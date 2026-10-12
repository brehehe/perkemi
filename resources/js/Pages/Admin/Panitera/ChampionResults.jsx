import Badge from '@/Components/UI/Elements/Badge';
import Button from '@/Components/UI/Elements/Button';
import AlertConfirm from '@/Components/UI/Feedback/AlertConfirm';
import Combobox from '@/Components/UI/Forms/Combobox';
import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessage from './Partials/FlashMessage';
import PaniteraHeader from './Partials/PaniteraHeader';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const rankDetails = {
    1: { label: 'Juara 1', medal: 'Emas', icon: 'fa-trophy', color: 'border-amber-300 bg-amber-50 text-amber-800' },
    2: { label: 'Juara 2', medal: 'Perak', icon: 'fa-medal', color: 'border-slate-300 bg-slate-50 text-slate-700' },
    3: { label: 'Juara 3', medal: 'Perunggu', icon: 'fa-medal', color: 'border-orange-300 bg-orange-50 text-orange-800' },
    4: { label: 'Juara 3 Bersama', medal: 'Perunggu', icon: 'fa-medal', color: 'border-orange-300 bg-orange-50 text-orange-800' },
};

function ClassificationBadge({ isExhibition, participantCount, hasDrawing = true }) {
    if (!hasDrawing || isExhibition === null) {
        return (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-700">
                <span className="h-2 w-2 rounded-full bg-slate-400" aria-hidden="true" />
                Drawing belum dibuat
            </span>
        );
    }

    return (
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${isExhibition ? 'border-amber-300 bg-amber-100 text-amber-800' : 'border-emerald-300 bg-emerald-100 text-emerald-800'}`}>
            <span className={`h-2 w-2 rounded-full ${isExhibition ? 'bg-amber-500' : 'bg-emerald-500'}`} aria-hidden="true" />
            {isExhibition ? 'Ekshibisi' : 'Non-ekshibisi'} · {participantCount} peserta
        </span>
    );
}

function CategoryDirectory({ activeEvent, categories, selectedCategory, canManage, errors, onSelect }) {
    const [generateTarget, setGenerateTarget] = useState(null);
    const [generatingId, setGeneratingId] = useState(null);

    const generateChampions = () => {
        if (!generateTarget) return;

        setGeneratingId(generateTarget.id);
        router.post(`/admin/panitera/scoring/champions/${generateTarget.id}/generate`, { event_id: activeEvent.id }, {
            preserveScroll: true,
            onSuccess: () => setGenerateTarget(null),
            onFinish: () => setGeneratingId(null),
        });
    };

    return (
        <>
            <section className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm" aria-labelledby="all-categories-title">
                <div className="border-b border-[#e9e2d8] bg-[#faf8f5] p-4 sm:p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 id="all-categories-title" className="text-lg font-black text-[#17120f]">Semua Nomor Pertandingan</h2>
                            <p className="mt-1 max-w-3xl text-xs leading-5 text-[#746b63]">Seluruh kategori aktif event ditampilkan sekaligus. Generate hanya aktif setelah hasil resmi memenuhi flow Embu atau bagan akhir Randori.</p>
                        </div>
                        <Badge variant="gold" className="w-fit">{categories.length} kategori</Badge>
                    </div>

                    <div className="mt-4 grid gap-3 rounded-xl border border-[#e8e1d8] bg-white p-4 sm:grid-cols-2">
                        <div className="flex gap-3"><span className="mt-0.5 h-3 w-3 shrink-0 rounded-full bg-amber-500" aria-hidden="true" /><div><p className="text-xs font-black text-amber-800">Kuning · Ekshibisi</p><p className="mt-1 text-[11px] leading-5 text-[#6f665e]">Nomor pertandingan dengan maksimal 3 peserta.</p></div></div>
                        <div className="flex gap-3"><span className="mt-0.5 h-3 w-3 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" /><div><p className="text-xs font-black text-emerald-800">Hijau · Non-ekshibisi</p><p className="mt-1 text-[11px] leading-5 text-[#6f665e]">Nomor pertandingan dengan lebih dari 3 peserta.</p></div></div>
                    </div>
                </div>

                {categories.length > 0 ? (
                    <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2 2xl:grid-cols-3">
                        {categories.map((category, index) => {
                            const isSelected = category.id === selectedCategory;
                            const status = category.is_confirmed
                                ? { label: 'Sudah dikonfirmasi', variant: 'green', icon: 'fa-circle-check' }
                                : category.generation_ready
                                    ? { label: 'Siap generate', variant: 'blue', icon: 'fa-wand-magic-sparkles' }
                                    : { label: 'Menunggu hasil', variant: 'yellow', icon: 'fa-clock' };

                            return (
                                <article key={category.id} className={`flex min-w-0 flex-col rounded-2xl border p-4 transition-shadow ${isSelected ? 'border-[#d4a843] bg-[#fffaf0] shadow-md ring-2 ring-[#d4a843]/15' : 'border-[#e5ded4] bg-white shadow-xs hover:shadow-md'}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9a6b20]">Nomor {index + 1}</p>
                                            <h3 className="mt-1 break-words text-sm font-black leading-5 text-[#17120f]">{category.name}</h3>
                                        </div>
                                        <Badge variant={category.type === 'embu' ? 'blue' : 'red'} size="sm">{category.type.toUpperCase()}</Badge>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <ClassificationBadge isExhibition={category.is_exhibition} participantCount={category.participant_count} hasDrawing={category.has_drawing} />
                                        <Badge variant={status.variant} size="sm"><i className={`fa-solid ${status.icon} mr-1`} aria-hidden="true" />{status.label}</Badge>
                                    </div>

                                    <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                        <div className="rounded-xl bg-[#fbfaf8] p-3"><dt className="text-[9px] font-black uppercase text-[#8b8178]">Peserta</dt><dd className="mt-1 font-black text-[#17120f]">{category.participant_count}</dd></div>
                                        <div className="rounded-xl bg-[#fbfaf8] p-3"><dt className="text-[9px] font-black uppercase text-[#8b8178]">Posisi Juara</dt><dd className="mt-1 font-black text-[#17120f]">{category.required_champion_count}</dd></div>
                                    </dl>

                                    <div className={`mt-3 rounded-xl border p-3 text-[11px] leading-5 ${category.generation_ready ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                                        <p className="font-bold">{category.generation_message}</p>
                                        {category.generation_candidates?.length > 0 && (
                                            <ol className="mt-2 space-y-1 border-t border-current/10 pt-2">
                                                {category.generation_candidates.map((candidate) => <li key={candidate.rank}><span className="font-black">#{candidate.rank}</span> {candidate.label}</li>)}
                                            </ol>
                                        )}
                                    </div>

                                    <div className="mt-auto grid gap-2 pt-4 sm:grid-cols-2">
                                        <Button variant="outline" className="w-full" disabled={generatingId !== null} iconLeft={<i className="fa-solid fa-sliders" aria-hidden="true" />} onClick={() => onSelect(category.id)}>{isSelected ? 'Sedang Dibuka' : 'Lihat & Atur'}</Button>
                                        <Button variant="gold" className="w-full" disabled={!canManage || !category.generation_ready || generatingId !== null} loading={generatingId === category.id} iconLeft={<i className="fa-solid fa-trophy" aria-hidden="true" />} onClick={() => setGenerateTarget(category)}>{category.is_confirmed ? 'Generate Ulang' : 'Generate Juara'}</Button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <p className="p-10 text-center text-sm text-[#7a746e]">Belum ada nomor pertandingan aktif pada event ini.</p>
                )}
            </section>

            <AlertConfirm
                isOpen={Boolean(generateTarget)}
                title={`Generate juara ${generateTarget?.name || ''}?`}
                message={generateTarget?.type === 'embu'
                    ? 'Sistem akan menyimpan peringkat dari akumulasi Penyisihan + Final serta aturan tie-break Juri 1. Hasil lama kategori ini akan diganti.'
                    : 'Sistem akan menyimpan Juara 1–4 dari hasil akhir bagan Randori. Hasil lama kategori ini akan diganti.'}
                confirmText="Generate & Simpan Juara"
                cancelText="Periksa Lagi"
                variant="warning"
                isLoading={generatingId !== null}
                error={errors.category || ''}
                onCancel={() => setGenerateTarget(null)}
                onConfirm={generateChampions}
            />
        </>
    );
}

function ChampionEditor({ activeEvent, championship, canManage }) {
    const { errors = {} } = usePage().props;
    const [confirmation, setConfirmation] = useState(null);
    const [generating, setGenerating] = useState(false);
    const draftByRank = useMemo(() => Object.fromEntries((championship.draft_champions || []).map((champion) => [Number(champion.rank), champion.participant_key])), [championship.draft_champions]);
    const initialChampions = Array.from({ length: championship.required_champion_count }, (_, index) => ({
        rank: index + 1,
        participant_key: draftByRank[index + 1] || '',
    }));
    const form = useForm({
        event_id: activeEvent.id,
        champions: initialChampions,
    });
    const selectedKeys = form.data.champions.map((champion) => champion.participant_key).filter(Boolean);
    const isComplete = championship.required_champion_count > 0
        && form.data.champions.every((champion) => champion.participant_key)
        && new Set(selectedKeys).size === championship.required_champion_count;
    const optionsForRank = (rank) => championship.participants
        .filter((participant) => !selectedKeys.includes(participant.key) || form.data.champions.find((champion) => champion.rank === rank)?.participant_key === participant.key)
        .map((participant) => ({ value: participant.key, label: participant.label, sublabel: participant.sublabel || participant.contingent_name || 'Peserta nomor pertandingan' }));
    const updateParticipant = (rank, participantKey) => {
        form.setData('champions', form.data.champions.map((champion) => champion.rank === rank
            ? { ...champion, participant_key: participantKey }
            : champion));
    };
    const generateChampions = () => {
        setGenerating(true);
        router.post(`/admin/panitera/scoring/champions/${championship.id}/generate`, { event_id: activeEvent.id }, {
            preserveScroll: true,
            onFinish: () => {
                setGenerating(false);
                setConfirmation(null);
            },
        });
    };
    const saveChampions = () => {
        form.put(`/admin/panitera/scoring/champions/${championship.id}`, {
            preserveScroll: true,
            onSuccess: () => setConfirmation(null),
        });
    };

    return (
        <>
            <section id="champion-editor" className="scroll-mt-4 overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm">
                <div className="border-b border-[#e8dfd2] bg-[linear-gradient(135deg,#17120f,#33261f)] p-4 text-white sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={championship.type === 'embu' ? 'blue' : 'red'}>{championship.type.toUpperCase()}</Badge>
                                <ClassificationBadge isExhibition={championship.is_exhibition} participantCount={championship.participant_count} hasDrawing={championship.has_drawing} />
                            </div>
                            <h2 className="mt-3 text-xl font-black sm:text-2xl">{championship.name}</h2>
                            <p className="mt-1 text-xs text-white/65">{championship.format?.replaceAll('_', ' ') || 'Format belum tersedia'} · {championship.current_champions.length ? 'Hasil sudah dikonfirmasi dan masih dapat disesuaikan' : 'Belum ada hasil juara tersimpan'}</p>
                        </div>
                        <Badge variant={championship.current_champions.length ? 'green' : 'yellow'} className="w-fit">{championship.current_champions.length ? 'Terkonfirmasi' : 'Belum dikonfirmasi'}</Badge>
                    </div>
                </div>

                <div className="space-y-5 p-4 sm:p-5">
                    <div className={`rounded-xl border p-4 text-xs leading-5 ${championship.generation.ready ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                        <p className="font-black"><i className={`fa-solid ${championship.generation.ready ? 'fa-circle-check' : 'fa-triangle-exclamation'} mr-2`} aria-hidden="true" />Status generate otomatis</p>
                        <p className="mt-1">{championship.generation.message}</p>
                    </div>

                    {championship.generation.champions.length > 0 && (
                        <div>
                            <h3 className="text-sm font-black text-[#17120f]">Kandidat dari hasil pertandingan</h3>
                            <p className="mt-1 text-xs text-[#7a746e]">Gunakan sebagai acuan. Panitera tetap dapat memilih ulang susunan di bawah sebelum menyimpan.</p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                {championship.generation.champions.map((champion) => {
                                    const rank = rankDetails[champion.rank];
                                    return (
                                        <article key={champion.rank} className={`rounded-xl border p-3 ${rank.color}`}>
                                            <p className="text-[10px] font-black uppercase"><i className={`fa-solid ${rank.icon} mr-1.5`} aria-hidden="true" />{rank.label} · {rank.medal}</p>
                                            <p className="mt-2 text-sm font-black text-[#17120f]">{champion.label}</p>
                                            <p className="mt-1 text-[10px] font-semibold opacity-80">{champion.basis}</p>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="rounded-2xl border border-[#e5ded4] bg-[#fbfaf8] p-4 sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h3 className="font-black text-[#17120f]">Susunan Juara yang Disimpan</h3>
                                <p className="mt-1 text-xs leading-5 text-[#7a746e]">Pilih peserta secara manual bila hasil generate perlu diperbaiki. Setiap peserta hanya dapat dipilih satu kali.</p>
                            </div>
                            <span className="text-[10px] font-bold uppercase text-[#9a6b20]">{championship.required_champion_count} posisi juara</span>
                        </div>

                        {(form.errors.champions || errors.category) && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{form.errors.champions || errors.category}</p>}

                        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {form.data.champions.map((champion) => {
                                const rank = rankDetails[champion.rank];
                                return (
                                    <div key={champion.rank} className={`rounded-xl border p-3 ${rank.color}`}>
                                        <p className="mb-3 text-xs font-black uppercase"><i className={`fa-solid ${rank.icon} mr-1.5`} aria-hidden="true" />{rank.label} · {rank.medal}</p>
                                        <Combobox
                                            ariaLabel={`Pilih peserta ${rank.label}`}
                                            value={champion.participant_key}
                                            options={optionsForRank(champion.rank)}
                                            onChange={(value) => updateParticipant(champion.rank, value)}
                                            placeholder="Pilih peserta"
                                            searchPlaceholder="Cari atlet, tim, atau kontingen..."
                                            clearable
                                            disabled={!canManage || form.processing || generating}
                                            error={form.errors[`champions.${champion.rank - 1}.participant_key`]}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-[#eee8e0] pt-4 sm:flex-row sm:justify-end">
                        <Button variant="outline" className="w-full sm:w-auto" disabled={!canManage || !championship.generation.ready || generating || form.processing} loading={generating} onClick={() => setConfirmation('generate')} iconLeft={<i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />}>Generate Otomatis dari Hasil</Button>
                        <Button variant="gold" className="w-full sm:w-auto" disabled={!canManage || !isComplete || generating} loading={form.processing} onClick={() => setConfirmation('save')} iconLeft={<i className="fa-solid fa-floppy-disk" aria-hidden="true" />}>Simpan Penyesuaian Juara</Button>
                    </div>
                </div>
            </section>

            <AlertConfirm
                isOpen={confirmation === 'generate'}
                title="Generate ulang hasil juara?"
                message="Susunan juara yang tersimpan pada nomor pertandingan ini akan diganti dengan hasil otomatis terbaru dari klasemen atau bagan pertandingan. Setelah itu hasil masih dapat disesuaikan manual."
                confirmText="Generate & Simpan"
                cancelText="Periksa Lagi"
                variant="warning"
                isLoading={generating}
                error={errors.category || ''}
                onCancel={() => setConfirmation(null)}
                onConfirm={generateChampions}
            />
            <AlertConfirm
                isOpen={confirmation === 'save'}
                title="Simpan penyesuaian juara?"
                message="Susunan peringkat pada nomor pertandingan ini akan menggantikan hasil juara sebelumnya dan langsung memperbarui data perolehan medali."
                confirmText="Simpan Susunan"
                cancelText="Periksa Lagi"
                variant="warning"
                isLoading={form.processing}
                error={form.errors.champions || ''}
                onCancel={() => setConfirmation(null)}
                onConfirm={saveChampions}
            />
        </>
    );
}

export default function ChampionResults({ activeEvent, events = [], categories = [], selectedCategory, championship, summary = {}, canManage = false }) {
    const { flash = {}, errors = {} } = usePage().props;
    const changeCategory = (value) => router.get('/admin/panitera/scoring/champions', { event_id: activeEvent.id, category: value }, {
        preserveState: false,
        preserveScroll: true,
        onSuccess: () => requestAnimationFrame(() => document.getElementById('champion-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })),
    });

    return (
        <AdminLayout title="Hasil Juara">
            <Head title="Hasil Juara | Smart Perkemi" />
            <div className="space-y-5">
                <PaniteraHeader title="Hasil Juara per Nomor Pertandingan" description="Generate juara dari hasil resmi Embu atau Randori, periksa kandidat, lalu sesuaikan manual bila routing atau hasil pertandingan perlu dikoreksi." activeEvent={activeEvent} events={events} path="/admin/panitera/scoring/champions" icon="fa-trophy" />
                <FlashMessage flash={flash} errors={errors} />

                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Ringkasan hasil juara">
                    {[
                        ['total_categories', 'Nomor Pertandingan', 'fa-list-ol', 'bg-slate-100 text-slate-700'],
                        ['ready_categories', 'Siap Generate', 'fa-wand-magic-sparkles', 'bg-blue-100 text-blue-700'],
                        ['confirmed_categories', 'Sudah Dikonfirmasi', 'fa-circle-check', 'bg-emerald-100 text-emerald-700'],
                        ['exhibition_categories', 'Ekshibisi', 'fa-star', 'bg-amber-100 text-amber-800'],
                        ['non_exhibition_categories', 'Non-ekshibisi', 'fa-trophy', 'bg-emerald-100 text-emerald-700'],
                    ].map(([key, label, icon, color]) => (
                        <article key={key} className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-wide text-[#7a746e]">{label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}><i className={`fa-solid ${icon}`} aria-hidden="true" /></span></div>
                            <p className="mt-3 text-3xl font-black text-[#17120f]">{summary[key] || 0}</p>
                        </article>
                    ))}
                </section>

                <CategoryDirectory activeEvent={activeEvent} categories={categories} selectedCategory={selectedCategory} canManage={canManage} errors={errors} onSelect={changeCategory} />

                {championship ? (
                    <ChampionEditor key={`${championship.id}-${championship.current_champions.map((champion) => champion.id).join('-') || 'baru'}`} activeEvent={activeEvent} championship={championship} canManage={canManage} />
                ) : (
                    <div className="rounded-2xl border border-dashed border-[#d9d3c9] bg-white p-10 text-center text-sm text-[#7a746e]">Pilih nomor pertandingan dari daftar untuk melihat detail susunan juara.</div>
                )}
            </div>
        </AdminLayout>
    );
}
